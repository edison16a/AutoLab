"use client";
import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs`. The 7 day window has to
 * roll over at midnight and "12s ago" has to keep counting even when no new
 * data arrives to trigger a render.
 */
export function useClock(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
