"use client";
import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs`. Relative labels like
 * "12s ago" and rolling windows like "this week" need it: when a device goes
 * quiet nothing else re-renders, and the label would freeze.
 */
export function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
