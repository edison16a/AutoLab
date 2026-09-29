"use client";
/**
 * Tracks photos that were requested but haven't arrived yet. The Pi answers a
 * capture with a binary message carrying the same ID, which resolves the
 * matching promise. Anything slower than the gateway's own timeout gives up.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo } from "@/model/types";
import type { Notify } from "./use-notices";

/** A little longer than the gateway's 60 second capture timeout. */
const CAPTURE_TIMEOUT_MS = 65_000;

interface Pending {
  resolve: (photo: Photo | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

export function useCaptureRequests(notify: Notify) {
  const pending = useRef(new Map<string, Pending>());
  const [capturing, setCapturing] = useState(false);
  const sync = useCallback(() => setCapturing(pending.current.size > 0), []);

  /** Resolves with the photo, or null when it failed or timed out. */
  const begin = useCallback(
    (requestId: string) =>
      new Promise<Photo | null>((resolve) => {
        const timer = setTimeout(() => {
          pending.current.delete(requestId);
          sync();
          notify("Capture timed out. Check the Pi agent.", "error");
          resolve(null);
        }, CAPTURE_TIMEOUT_MS);
        pending.current.set(requestId, { resolve, timer });
        sync();
      }),
    [notify, sync],
  );

  const settle = useCallback(
    (requestId: string, photo: Photo | null) => {
      const request = pending.current.get(requestId);
      if (!request) return;
      clearTimeout(request.timer);
      pending.current.delete(requestId);
      sync();
      request.resolve(photo);
    },
    [sync],
  );

  /** Called when the connection drops or the device changes. */
  const cancelAll = useCallback(() => {
    pending.current.forEach(({ resolve, timer }) => {
      clearTimeout(timer);
      resolve(null);
    });
    pending.current.clear();
    sync();
  }, [sync]);

  useEffect(() => () => cancelAll(), [cancelAll]);

  return { capturing, begin, settle, cancelAll };
}
