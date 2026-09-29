/**
 * What the detector found: counts per label and how sure it was.
 */
import type { Detection, Photo } from "@/model/types";
import { median } from "./math";
import type { ConfidenceBin, LabelCount } from "./types";

/** The detector drops anything below this, so bins start here unless older data goes lower. */
const DETECTOR_THRESHOLD = 0.4;
const BIN_WIDTH = 0.05;

export function allDetections(photos: Photo[]): Detection[] {
  return photos.flatMap((p) => p.analysis?.detections ?? []);
}

/**
 * Detections per label, most common first. Past `top` labels the tail folds
 * into one "Other" row, because a long list of tiny bars reads as noise.
 */
export function labelCounts(photos: Photo[], top = 8): LabelCount[] {
  const counts = new Map<string, number>();
  for (const d of allDetections(photos)) counts.set(d.label, (counts.get(d.label) ?? 0) + 1);
  const sorted = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  if (sorted.length <= top) return sorted;
  const rest = sorted.slice(top).reduce((sum, row) => sum + row.count, 0);
  return [...sorted.slice(0, top), { label: "Other", count: rest, other: true }];
}

/**
 * Confidence in five point bins up to 100%. Integer bin math keeps float
 * error from pushing 0.45 into the 0.4 bin.
 */
export function confidenceHistogram(photos: Photo[]): ConfidenceBin[] {
  const scores = allDetections(photos)
    .map((d) => d.confidence)
    .filter((c) => Number.isFinite(c));
  if (!scores.length) return [];
  const steps = Math.round(1 / BIN_WIDTH);
  const lowest = Math.min(DETECTOR_THRESHOLD, ...scores);
  const firstBin = Math.max(0, Math.floor(lowest * steps + 1e-9));
  const bins: ConfidenceBin[] = [];
  for (let i = firstBin; i < steps; i++) bins.push({ from: i / steps, to: (i + 1) / steps, count: 0 });
  for (const score of scores) {
    const index = Math.min(steps - 1, Math.max(firstBin, Math.floor(score * steps + 1e-9))) - firstBin;
    bins[index].count++;
  }
  return bins;
}

export function medianConfidence(photos: Photo[]) {
  return median(allDetections(photos).map((d) => d.confidence));
}
