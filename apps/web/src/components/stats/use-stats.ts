"use client";
import { useEffect, useMemo, useState } from "react";
import { computeStats } from "@/lib/stats/compute";
import { ALL_DEVICES, type StatsFilter, type StatsRange } from "@/lib/stats/types";
import type { Device, Photo } from "@/model/types";
import { useNow } from "@/hooks/use-now";

const RANGE_KEY = "autolab:stats-range";
const RANGES: StatsRange[] = ["7d", "30d", "all"];

/** The last range picked, so coming back to the page keeps it. Storage can be blocked, so it's best effort. */
function savedRange(): StatsRange {
  try {
    const value = sessionStorage.getItem(RANGE_KEY);
    return RANGES.includes(value as StatsRange) ? (value as StatsRange) : "30d";
  } catch {
    return "30d";
  }
}

/**
 * Filter state for the Statistics screen and the numbers for it. The clock
 * ticks once a minute so the window rolls over at midnight without a reload.
 */
export function useStats(photos: Photo[], devices: Device[]) {
  const [filter, setFilter] = useState<StatsFilter>({ range: "30d", deviceId: ALL_DEVICES });
  const now = useNow(60_000);

  useEffect(() => {
    const range = savedRange();
    setFilter((f) => (f.range === range ? f : { ...f, range }));
  }, []);

  // A forgotten device can't stay selected, or every chart would sit empty with no way to tell why.
  const deviceId = devices.some((d) => d.id === filter.deviceId) ? filter.deviceId : ALL_DEVICES;
  const scoped = useMemo(() => ({ ...filter, deviceId }), [filter, deviceId]);
  const stats = useMemo(() => computeStats(photos, scoped, now), [photos, scoped, now]);

  const setRange = (range: StatsRange) => {
    setFilter((f) => ({ ...f, range }));
    try {
      sessionStorage.setItem(RANGE_KEY, range);
    } catch {
      // Remembering the range is a convenience. Nothing breaks without it.
    }
  };

  const setDevice = (id: string) => setFilter((f) => ({ ...f, deviceId: id }));

  return { filter: scoped, stats, now, setRange, setDevice };
}
