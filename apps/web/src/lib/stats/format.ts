/**
 * Wording for statistics: counts, hours, bucket names and durations. Uses
 * the browser locale like the rest of the app.
 */
import { addDays } from "./range";
import type { TimeBucket } from "./types";

export function formatCount(value: number) {
  return value.toLocaleString();
}

/** One decimal, dropping a trailing ".0" so 3 reads as "3" and 2.5 as "2.5". */
export function formatDecimal(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function formatMs(ms: number) {
  return `${Math.round(ms).toLocaleString()} ms`;
}

export function formatPercent(fraction: number) {
  return `${Math.round(fraction * 100)}%`;
}

/** "2 PM" or "14:00", whichever the locale prefers. */
export function formatHour(hour: number) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" });
}

export function formatDay(time: number) {
  return new Date(time).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatWeekday(time: number) {
  return new Date(time).toLocaleDateString([], { weekday: "short" });
}

/** Full name for a tooltip or table row: "Tue, Sep 23", or "Sep 15 to Sep 21" for a week. */
export function bucketName(bucket: TimeBucket) {
  if (bucket.days === 1) {
    return new Date(bucket.start).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }
  return `${formatDay(bucket.start)} to ${formatDay(addDays(bucket.start, bucket.days - 1))}`;
}

/** "1 capture", "3 captures". Keeps every count in the UI grammatical. */
export function plural(count: number, one: string, many = `${one}s`) {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}
