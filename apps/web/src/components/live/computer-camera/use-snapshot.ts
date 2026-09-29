"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Analysis } from "@/model/types";

/**
 * A still on the stage. `live` comes from webcam detection and is replaced
 * every loop. `upload` is a picked file and stays until something else
 * takes the stage.
 */
export interface Snapshot {
  url: string;
  blob: Blob;
  width: number;
  height: number;
  origin: "live" | "upload";
  analysis?: Analysis;
}

/**
 * Holds the one still the stage shows and its blob URL. Showing another
 * still, clearing, or unmounting frees the old URL. Showing the same blob
 * again (an upload that just got its analysis) keeps its URL, so the
 * picture doesn't flicker.
 */
export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const current = useRef<Snapshot | null>(null);

  const put = useCallback((next: Snapshot | null) => {
    const old = current.current;
    current.current = next;
    setSnapshot(next);
    if (old && old.url !== next?.url) URL.revokeObjectURL(old.url);
  }, []);

  const show = useCallback(
    (still: Omit<Snapshot, "url">) => {
      const same = current.current?.blob === still.blob ? current.current : null;
      put({ ...still, url: same ? same.url : URL.createObjectURL(still.blob) });
    },
    [put],
  );

  const clear = useCallback(() => put(null), [put]);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current.url);
      current.current = null;
    },
    [],
  );

  return { snapshot, show, clear };
}
