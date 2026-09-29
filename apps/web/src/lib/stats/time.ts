/**
 * Captures over time: per day (or per week for long windows) and per hour
 * of the day. Both are zero filled so a quiet day still gets its column.
 */
import type { Photo } from "@/model/types";
import { addDays, captureTime, daySpan, startOfDay } from "./range";
import type { HourBucket, TimeBucket, Window } from "./types";

/** Past this many days, daily columns get too thin to read, so they become weeks. */
const DAILY_LIMIT = 92;

export function bucketDays(window: Window) {
  return daySpan(window.start, window.end) > DAILY_LIMIT ? 7 : 1;
}

/**
 * One bucket per day (or week) from the window start through today.
 * Anything stamped after today lands in the last bucket instead of vanishing.
 */
export function capturesByDay(photos: Photo[], window: Window): TimeBucket[] {
  const days = bucketDays(window);
  const first = startOfDay(window.start);
  const total = Math.ceil(daySpan(first, window.end) / days);
  const buckets: TimeBucket[] = Array.from({ length: total }, (_, i) => ({
    start: addDays(first, i * days),
    days,
    count: 0,
    analyzed: 0,
  }));

  for (const p of photos) {
    const offset = daySpan(first, captureTime(p)) - 1;
    const index = Math.min(total - 1, Math.max(0, Math.floor(offset / days)));
    buckets[index].count++;
    if (p.analysis) buckets[index].analyzed++;
  }
  return buckets;
}

/** Captures by local hour, 0 to 23, to show when the machine is used. */
export function capturesByHour(photos: Photo[]): HourBucket[] {
  const hours: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const p of photos) hours[new Date(captureTime(p)).getHours()].count++;
  return hours;
}

/** The first bucket with the most captures, or null when every bucket is empty. */
export function busiest<T extends { count: number }>(buckets: T[]): T | null {
  return buckets.reduce<T | null>((best, b) => (b.count > (best?.count ?? 0) ? b : best), null);
}
