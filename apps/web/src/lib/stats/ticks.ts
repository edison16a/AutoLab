/**
 * Where to put x axis labels so they never collide. Charts pass in how many
 * labels fit their measured width and get back a sparse, evenly spaced set.
 */
import { addDays, daySpan, startOfDay } from "./range";

/**
 * Indexes of the columns to label, counted back from the newest so today
 * (the column people look for first) always gets one.
 */
export function indexTicks(count: number, fit: number) {
  if (count <= 0) return [];
  const step = Math.max(1, Math.ceil(count / Math.max(1, fit)));
  const picked: number[] = [];
  for (let i = count - 1; i >= 0; i -= step) picked.push(i);
  return picked.reverse();
}

const DAY_STEPS = [1, 2, 7, 14, 28, 56, 91, 182, 364];

/** Local midnights between `start` and `end`, spaced by a round number of days. */
export function dayTicks(start: number, end: number, fit: number) {
  const span = daySpan(start, end);
  const step = DAY_STEPS.find((s) => span / s <= Math.max(1, fit)) ?? Math.ceil(span / Math.max(1, fit));
  const ticks: number[] = [];
  const last = startOfDay(end);
  for (let t = last; t >= startOfDay(start); t = addDays(t, -step)) ticks.push(t);
  return ticks.reverse();
}
