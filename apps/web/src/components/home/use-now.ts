"use client";
import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs`. "Last heartbeat" has to
 * keep counting up when a device goes quiet, and a quiet device is exactly
 * when nothing else would re-render the card.
 */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
