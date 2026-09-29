/**
 * The time window and device filter every statistic is computed over. Days
 * are local calendar days, so "7 days" lines up with what the person sees on
 * their own clock, DST changes included.
 */
import type { Photo } from "@/model/types";
import { ALL_DEVICES, type StatsFilter, type StatsRange, type Window } from "./types";

const RANGE_DAYS: Record<Exclude<StatsRange, "all">, number> = { "7d": 7, "30d": 30 };

export function startOfDay(time: number) {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Steps by calendar date instead of adding 24h, because a day around a DST
 * change is 23 or 25 hours long.
 */
export function addDays(time: number, days: number) {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime();
}

/** Whole local days from `start` to `end`, counting both ends. */
export function daySpan(start: number, end: number) {
  return Math.round((startOfDay(end) - startOfDay(start)) / 86_400_000) + 1;
}

export function captureTime(photo: Photo) {
  return new Date(photo.captured_at).getTime();
}

/** Images from one device. Computer shots and uploads have no device, so they drop out. */
export function byDevice(photos: Photo[], deviceId: string) {
  return deviceId === ALL_DEVICES ? photos : photos.filter((p) => p.device_id === deviceId);
}

/**
 * The window for a range. "7 days" is today plus the six before it. "All
 * time" starts on the day of the oldest image, or today when there are none.
 * An image with an unreadable time is skipped here: one NaN would make the
 * whole window NaN and empty every chart.
 */
export function rangeWindow(range: StatsRange, photos: Photo[], now: number): Window {
  const today = startOfDay(now);
  if (range !== "all") return { start: addDays(today, 1 - RANGE_DAYS[range]), end: now };
  const oldest = photos.reduce((min, p) => {
    const time = captureTime(p);
    return Number.isFinite(time) ? Math.min(min, time) : min;
  }, now);
  return { start: startOfDay(oldest), end: now };
}

/**
 * Applies the device and time filters. Returns the window too so charts
 * share one x axis. There's no upper bound: a Pi clock a few seconds ahead
 * would otherwise hide the capture that was just taken.
 */
export function applyFilter(photos: Photo[], filter: StatsFilter, now: number) {
  const scoped = byDevice(photos, filter.deviceId);
  const window = rangeWindow(filter.range, scoped, now);
  return { photos: scoped.filter((p) => captureTime(p) >= window.start), window };
}
