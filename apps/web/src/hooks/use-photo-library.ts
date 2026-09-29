"use client";
/**
 * Every image the signed in person can see, newest first, across devices.
 * Demo images come from IndexedDB and are written back as they change. Cloud
 * images are paged in from the gateway per device.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cloudEnabled } from "@/lib/cloud";
import { deleteCloudImage, fetchImagePage } from "@/lib/cloud-images";
import { errorText } from "@/lib/errors";
import { photoStore } from "@/lib/storage/photo-store";
import type { Analysis, Device, Photo } from "@/model/types";
import type { Log, Notify } from "./use-notices";
import type { ObjectUrls } from "./use-object-urls";

/** Browser storage is generous but not endless. The oldest demo images go first. */
const DEMO_MAX_PHOTOS = 150;
const DEMO_MAX_BYTES = 400 * 1024 * 1024;

const newestFirst = (a: Photo, b: Photo) => b.captured_at.localeCompare(a.captured_at);

export function usePhotoLibrary(userId: string, gateway: string, devices: Device[], urls: ObjectUrls, notify: Notify, log: Log) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ready, setReady] = useState(false);
  const [morePages, setMorePages] = useState<Record<string, boolean>>({});
  const current = useRef<Photo[]>([]);
  current.current = photos;
  const { makeUrl, revoke } = urls;

  /** Trims the demo library to its limits and drops evicted rows from storage. */
  const withinLimits = useCallback(
    (list: Photo[]) => {
      if (cloudEnabled) return list;
      const kept = [...list];
      let bytes = kept.reduce((sum, p) => sum + (p.bytes ?? 0), 0);
      const evicted: Photo[] = [];
      while (kept.length > DEMO_MAX_PHOTOS || bytes > DEMO_MAX_BYTES) {
        const oldest = kept.pop()!;
        bytes -= oldest.bytes ?? 0;
        evicted.push(oldest);
      }
      evicted.forEach((p) => revoke(p.url));
      void photoStore.remove(evicted.map((p) => p.id));
      return kept;
    },
    [revoke],
  );

  const loadCloudPage = useCallback(
    async (deviceId: string, offset: number) => {
      const page = await fetchImagePage(gateway, deviceId, offset);
      setMorePages((v) => ({ ...v, [deviceId]: page.hasMore }));
      const fresh = new Set(page.photos.map((p) => p.id));
      // A first page replaces that device's rows, which also renews their signed URLs.
      setPhotos((list) =>
        [...list.filter((p) => !fresh.has(p.id) && !(offset === 0 && p.cloud && p.device_id === deviceId)), ...page.photos].sort(newestFirst),
      );
    },
    [gateway],
  );

  const refresh = useCallback(async () => {
    try {
      if (cloudEnabled) {
        await Promise.all(devices.map((d) => loadCloudPage(d.id, 0)));
        return;
      }
      const rows = await photoStore.list(userId);
      current.current.forEach((p) => revoke(p.url));
      setPhotos(withinLimits(rows.map(({ blob, owner: _owner, ...meta }) => ({ ...meta, url: makeUrl(blob) }))));
    } catch (error) {
      notify(errorText(error), "error");
    } finally {
      setReady(true);
    }
  }, [userId, devices, loadCloudPage, makeUrl, revoke, withinLimits, notify]);

  // Demo loads once per user. Cloud reloads when the device list changes.
  const deviceKey = cloudEnabled ? devices.map((d) => d.id).join(",") : "";
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    void refreshRef.current();
  }, [userId, deviceKey, gateway]);

  /** Adds a new capture. Demo captures are also written to IndexedDB. */
  const addPhoto = useCallback(
    (photo: Photo, blob?: Blob) => {
      setPhotos((list) => withinLimits([photo, ...list.filter((p) => p.id !== photo.id)].sort(newestFirst)));
      if (photo.cloud || !blob) return;
      const { url: _url, cloud: _cloud, ...meta } = photo;
      void photoStore.put({ ...meta, owner: userId, blob, bytes: blob.size }).then((saved) => {
        if (!saved) notify("Saved for this session only. Browser storage is unavailable.", "error");
      });
    },
    [userId, withinLimits, notify],
  );

  const setAnalysis = useCallback((id: string, analysis: Analysis) => {
    const analyzedAt = new Date().toISOString();
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, analysis, analyzed_at: analyzedAt } : p)));
    if (!current.current.find((p) => p.id === id)?.cloud) void photoStore.setAnalysis(id, analysis, analyzedAt);
  }, []);

  /** Deletes photos. Cloud deletes that fail stay in the library and raise a toast. */
  const removePhotos = useCallback(
    async (ids: string[]) => {
      const targets = current.current.filter((p) => ids.includes(p.id));
      const removed = new Set<string>();
      for (const photo of targets) {
        try {
          if (photo.cloud) await deleteCloudImage(gateway, photo.id);
          removed.add(photo.id);
        } catch (error) {
          notify(errorText(error), "error");
        }
      }
      await photoStore.remove(targets.filter((p) => !p.cloud).map((p) => p.id));
      setPhotos((list) => list.filter((p) => !removed.has(p.id)));
      targets.filter((p) => removed.has(p.id)).forEach((p) => revoke(p.url));
      if (removed.size) log(removed.size === 1 ? "Photo deleted" : `${removed.size} photos deleted`);
    },
    [gateway, notify, revoke, log],
  );

  const loadMore = useCallback(async () => {
    const pending = Object.entries(morePages).filter(([, more]) => more);
    try {
      await Promise.all(pending.map(([id]) => loadCloudPage(id, current.current.filter((p) => p.cloud && p.device_id === id).length)));
    } catch (error) {
      notify(errorText(error), "error");
    }
  }, [morePages, loadCloudPage, notify]);

  /** Removes every image stored in this browser. Cloud images are left alone. */
  const clearLocal = useCallback(async () => {
    await photoStore.clear(userId);
    current.current.filter((p) => !p.cloud).forEach((p) => revoke(p.url));
    setPhotos((list) => list.filter((p) => p.cloud));
    log("Local images cleared");
  }, [userId, revoke, log]);

  return {
    photos,
    photosReady: ready,
    hasMore: Object.values(morePages).some(Boolean),
    addPhoto,
    setAnalysis,
    removePhotos,
    loadMore,
    refreshPhotos: refresh,
    clearLocal,
  };
}

export type PhotoLibrary = ReturnType<typeof usePhotoLibrary>;
