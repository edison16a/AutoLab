/**
 * Small number helpers for the statistics: averages and axis scales.
 */

export function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Median rather than mean for timings, since one cold start run skews the average. */
export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface Scale {
  max: number;
  ticks: number[];
}

/**
 * An axis from 0 to a round number just above `max`, with ticks on steps of
 * 1, 2 or 5 times a power of ten. Counts pass `integer` so the axis never
 * shows half an image.
 */
export function niceScale(max: number, target = 4, integer = false): Scale {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const raw = max / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / power;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * power;
  if (integer) step = Math.max(1, Math.round(step));
  const top = Math.round(Math.ceil(max / step - 1e-9) * step * 1e6) / 1e6;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { max: top, ticks };
}

/**
 * Whole number percents for parts of one whole that add up to exactly 100.
 * Rounding each part alone can print 73% and 28% side by side, so the
 * leftover points go to the parts that lost the most in rounding.
 */
export function shares(counts: number[]) {
  const total = counts.reduce((sum, c) => sum + c, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((c) => (c / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((sum, f) => sum + f, 0);
  const order = exact.map((e, i) => ({ i, rest: e - floors[i] })).sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]++;
    left--;
  }
  return floors;
}

/** Share of a whole as a whole number percent. Zero when the whole is empty. */
export function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}
