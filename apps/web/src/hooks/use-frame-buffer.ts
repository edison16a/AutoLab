"use client";
/**
 * Holds the latest live preview frame and measures the real frame rate.
 * A few recent frames are kept alive (not just the newest) because live
 * detection reads a frame asynchronously, and revoking its URL mid read would
 * make the fetch fail.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Frame } from "@/model/types";
import type { ObjectUrls } from "./use-object-urls";

const KEEP_FRAMES = 8;
/** Frame rate is averaged over this window so the number doesn't jitter. */
const FPS_WINDOW_MS = 3000;

export function useFrameBuffer({ revoke }: ObjectUrls, measuring: boolean) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [fps, setFps] = useState(0);
  const recent = useRef<Frame[]>([]);
  const arrivals = useRef<number[]>([]);
  const latest = useRef<Frame | null>(null);

  const push = useCallback(
    (next: Frame) => {
      recent.current.push(next);
      while (recent.current.length > KEEP_FRAMES) revoke(recent.current.shift()?.url);
      arrivals.current.push(performance.now());
      latest.current = next;
      setFrame(next);
    },
    [revoke],
  );

  const clear = useCallback(() => {
    recent.current.forEach((f) => revoke(f.url));
    recent.current = [];
    arrivals.current = [];
    latest.current = null;
    setFrame(null);
    setFps(0);
  }, [revoke]);

  useEffect(() => {
    if (!measuring) return;
    const timer = setInterval(() => {
      const now = performance.now();
      arrivals.current = arrivals.current.filter((t) => now - t < FPS_WINDOW_MS);
      setFps(Math.round((arrivals.current.length / (FPS_WINDOW_MS / 1000)) * 10) / 10);
    }, 1000);
    return () => clearInterval(timer);
  }, [measuring]);

  return { frame, fps, latest, push, clear };
}
