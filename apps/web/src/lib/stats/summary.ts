/**
 * The headline numbers for the tiles at the top of the Statistics screen.
 */
import type { Photo } from "@/model/types";
import { mean, median, percent } from "./math";
import { captureTime, startOfDay } from "./range";
import { inferenceSamples } from "./sources";
import type { Summary } from "./types";

export function summarize(photos: Photo[], now: number): Summary {
  const midnight = startOfDay(now);
  const labels = new Set<string>();
  let today = 0;
  let analyzed = 0;
  let detections = 0;
  let bytes = 0;
  let unsized = 0;

  for (const p of photos) {
    if (captureTime(p) >= midnight) today++;
    if (typeof p.bytes === "number") bytes += p.bytes;
    else unsized++;
    if (!p.analysis) continue;
    analyzed++;
    detections += p.analysis.detections.length;
    p.analysis.detections.forEach((d) => labels.add(d.label));
  }

  const times = inferenceSamples(photos).map((s) => s.ms);
  return {
    captures: photos.length,
    today,
    analyzed,
    analyzedPercent: percent(analyzed, photos.length),
    detections,
    labels: labels.size,
    perImage: analyzed ? detections / analyzed : null,
    medianMs: median(times),
    meanMs: mean(times),
    bytes,
    unsized,
  };
}
