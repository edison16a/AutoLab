"use client";
import { useCallback, useState } from "react";
import { errorText } from "@/lib/errors";
import { useAutolab } from "@/providers/autolab-context";
import type { Photo } from "@/model/types";

/**
 * Deleting, bulk downloading and paging for the library. Deletes go through
 * a confirm step, so this holds the IDs waiting on that answer.
 */
export function useLibraryActions() {
  const { photos, removePhotos, download, loadMore, notify } = useAutolab();
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const askDelete = useCallback((ids: string[]) => {
    if (ids.length) setPendingDelete(ids);
  }, []);
  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  const confirmDelete = useCallback(async () => {
    const ids = pendingDelete;
    setPendingDelete(null);
    if (!ids) return;
    setBusy(true);
    try {
      await removePhotos(ids);
    } catch (error) {
      notify(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  }, [pendingDelete, removePhotos, notify]);

  /** One at a time, so the browser sees separate downloads rather than a burst it may block. */
  const downloadMany = useCallback(
    async (ids: string[]) => {
      const targets = ids.map((id) => photos.find((p) => p.id === id)).filter((p): p is Photo => !!p);
      setBusy(true);
      try {
        for (const photo of targets) await download(photo);
      } catch (error) {
        notify(errorText(error), "error");
      } finally {
        setBusy(false);
      }
    },
    [photos, download, notify],
  );

  const more = useCallback(async () => {
    setLoadingMore(true);
    try {
      await loadMore();
    } catch (error) {
      notify(errorText(error), "error");
    } finally {
      setLoadingMore(false);
    }
  }, [loadMore, notify]);

  return { pendingDelete, askDelete, cancelDelete, confirmDelete, downloadMany, busy, more, loadingMore };
}
