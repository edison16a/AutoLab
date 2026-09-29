"use client";
import { useCallback, useRef } from "react";

/** The first frame of an ease moves this far, whatever the loop slept through before it. */
const FIRST_STEP = 1 / 60;
/** Never more than this in one frame, so a stalled frame can't make a part leap. */
const MAX_STEP = 0.25;

/**
 * Seconds to advance an ease this frame, by the wall clock. A fixed step per
 * frame would make a slow renderer crawl: at a frame or two a second a half
 * second ease took thirty heavy frames and kept the page busy long after the
 * click. The time the canvas sat idle before the ease began doesn't count,
 * so a move never starts with a jump.
 *
 * Call it once per frame with whether the thing is still moving.
 */
export function useEaseClock() {
  const last = useRef<number | null>(null);
  return useCallback((moving: boolean) => {
    if (!moving) {
      last.current = null;
      return 0;
    }
    const now = performance.now();
    const step = last.current === null ? FIRST_STEP : Math.min((now - last.current) / 1000, MAX_STEP);
    last.current = now;
    return step;
  }, []);
}
