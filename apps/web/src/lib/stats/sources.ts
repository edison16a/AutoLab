/**
 * Where images came from and how fast the detector ran on them.
 */
import type { Photo, PhotoSource } from "@/model/types";
import { percent } from "./math";
import type { InferenceSample, SourceCount } from "./types";

/** Only sources that have images, largest first. */
export function sourceBreakdown(photos: Photo[]): SourceCount[] {
  const counts = new Map<PhotoSource, number>();
  for (const p of photos) counts.set(p.source, (counts.get(p.source) ?? 0) + 1);
  return [...counts]
    .map(([source, count]) => ({ source, count, share: percent(count, photos.length) }))
    .sort((a, b) => b.count - a.count);
}

/**
 * One point per analysis that recorded a time, oldest first. Plotted at the
 * time the analysis ran, falling back to capture time for older rows.
 */
export function inferenceSamples(photos: Photo[]): InferenceSample[] {
  const samples: InferenceSample[] = [];
  for (const p of photos) {
    const ms = p.analysis?.inference_ms;
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) continue;
    samples.push({
      id: p.id,
      time: new Date(p.analyzed_at ?? p.captured_at).getTime(),
      ms,
      backend: p.analysis?.backend,
    });
  }
  return samples.sort((a, b) => a.time - b.time);
}
