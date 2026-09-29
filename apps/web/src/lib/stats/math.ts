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

/** Share of a whole as a whole number percent. Zero when the whole is empty. */
export function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}
