"use client";
/**
 * Lab mode's photo library: the account's images in Supabase, newest first,
 * kept live across every signed in screen. A new photo shows at once from
 * this browser's copy while it uploads, and stays here if the upload fails.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/errors";
import * as lab from "@/lib/lab/images";
import { toJpeg } from "@/lib/lab/jpeg";
import type { Analysis, Device, Photo } from "@/model/types";
import type { Log, Notify } from "./use-notices";
import type { ObjectUrls } from "./use-object-urls";

/** Signed links last an hour, so they're renewed well before. */
const RENEW_MS = 45 * 60 * 1000;

const newestFirst = (a: Photo, b: Photo) => b.captured_at.localeCompare(a.captured_at);

// Same arguments as usePhotoLibrary so the provider can use either. The gateway and device list aren't needed here.
export function useLabLibrary(userId: string, _gateway: string, _devices: Device[], urls: ObjectUrls, notify: Notify, log: Log) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ready, setReady] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const current = useRef<Photo[]>([]);
  current.current = photos;
  /** Every upload this session started, so the action log can wait for a photo's row before pointing at it. */
  const uploads = useRef(new Map<string, Promise<boolean>>());
  const { revoke } = urls;

  /** Adds rows from Supabase. A full reload replaces stored photos but keeps any that never made it up. */
  const merge = useCallback(
    (rows: Photo[], reload: boolean) => {
      const fresh = new Set(rows.map((p) => p.id));
      const keep = (p: Photo) => !fresh.has(p.id) && !(reload && p.cloud);
      current.current.filter((p) => !keep(p)).forEach((p) => revoke(p.url));
      setPhotos((list) => [...list.filter(keep), ...rows].sort(newestFirst));
    },
    [revoke],
  );

  const reload = useCallback(
    async (count = lab.LAB_PAGE_SIZE) => {
      try {
        const page = await lab.listImages(0, count);
        merge(page.photos, true);
        setHasMore(page.hasMore);
      } catch (error) {
        notify(errorText(error), "error");
      } finally {
        setReady(true);
      }
    },
    [merge, notify],
  );

  useEffect(() => {
    void reload();
    // Renew every loaded link, not only the first page's.
    const timer = setInterval(() => void reload(Math.max(lab.LAB_PAGE_SIZE, current.current.length)), RENEW_MS);
    return () => clearInterval(timer);
  }, [userId, reload]);

  useEffect(
    () =>
      lab.watchImages({
        // This screen's own uploads are already listed.
        added: (id) => {
          if (current.current.some((p) => p.id === id)) return;
          void lab.fetchImage(id).then((photo) => photo && merge([photo], false), () => undefined);
        },
        removed: (id) => {
          revoke(current.current.find((p) => p.id === id)?.url);
          setPhotos((list) => list.filter((p) => p.id !== id));
        },
        analyzed: (id, analysis, at) =>
          setPhotos((list) => list.map((p) => (p.id === id ? { ...p, analysis, analyzed_at: at } : p))),
      }),
    [userId, merge, revoke],
  );

  /** Resolves true once the photo's row exists in Supabase. */
  const saved = useCallback(
    (id: string) => uploads.current.get(id) ?? Promise.resolve(current.current.some((p) => p.id === id && p.cloud)),
    [],
  );

  const addPhoto = useCallback(
    (photo: Photo, blob?: Blob) => {
      setPhotos((list) => [photo, ...list.filter((p) => p.id !== photo.id)].sort(newestFirst));
      if (photo.cloud || !blob) return;
      const upload = toJpeg(blob)
        .then((jpeg) => lab.uploadImage(userId, photo, jpeg))
        .then(() => {
          setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, cloud: true } : p)));
          return true;
        })
        .catch((error) => {
          notify(`Saved on this screen only. ${errorText(error)}`, "error");
          return false;
        });
      uploads.current.set(photo.id, upload);
    },
    [userId, notify],
  );

  const setAnalysis = useCallback(
    (id: string, analysis: Analysis) => {
      const analyzedAt = new Date().toISOString();
      setPhotos((list) => list.map((p) => (p.id === id ? { ...p, analysis, analyzed_at: analyzedAt } : p)));
      void saved(id)
        .then((stored) => (stored ? lab.saveAnalysis(id, analysis) : undefined))
        .catch((error) => notify(errorText(error), "error"));
    },
    [saved, notify],
  );

  const removePhotos = useCallback(
    async (ids: string[]) => {
      const targets = current.current.filter((p) => ids.includes(p.id));
      const removed = new Set<string>();
      for (const photo of targets) {
        try {
          // Waits out an upload still running, so its row can't come back afterwards.
          if (await saved(photo.id)) await lab.deleteImage(userId, photo);
          removed.add(photo.id);
        } catch (error) {
          notify(errorText(error), "error");
        }
      }
      setPhotos((list) => list.filter((p) => !removed.has(p.id)));
      targets.filter((p) => removed.has(p.id)).forEach((p) => revoke(p.url));
      if (removed.size) log(removed.size === 1 ? "Photo deleted" : `${removed.size} photos deleted`);
    },
    [userId, saved, notify, revoke, log],
  );

  const loadMore = useCallback(async () => {
    try {
      const page = await lab.listImages(current.current.filter((p) => p.cloud).length);
      merge(page.photos, false);
      setHasMore(page.hasMore);
    } catch (error) {
      notify(errorText(error), "error");
    }
  }, [merge, notify]);

  return {
    photos,
    photosReady: ready,
    hasMore,
    addPhoto,
    setAnalysis,
    removePhotos,
    loadMore,
    refreshPhotos: useCallback(() => reload(Math.max(lab.LAB_PAGE_SIZE, current.current.length)), [reload]),
    // Lab photos all live in Supabase, so there is nothing in this browser to clear.
    clearLocal: useCallback(async () => undefined, []),
    saved,
  };
}
