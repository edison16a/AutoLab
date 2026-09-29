/**
 * Everything the Statistics screen shows, computed in one pass over the
 * same filtered slice so every tile and chart agrees.
 */
import type { Photo } from "@/model/types";
import { confidenceHistogram, labelCounts, medianConfidence } from "./detections";
import { applyFilter } from "./range";
import { inferenceSamples, sourceBreakdown } from "./sources";
import { summarize } from "./summary";
import { capturesByDay, capturesByHour } from "./time";
import type { StatsFilter } from "./types";

export function computeStats(all: Photo[], filter: StatsFilter, now: number) {
  const { photos, window } = applyFilter(all, filter, now);
  return {
    window,
    photos,
    summary: summarize(photos, now),
    days: capturesByDay(photos, window),
    hours: capturesByHour(photos),
    labels: labelCounts(photos),
    confidence: confidenceHistogram(photos),
    medianConfidence: medianConfidence(photos),
    sources: sourceBreakdown(photos),
    inference: inferenceSamples(photos),
  };
}

export type Stats = ReturnType<typeof computeStats>;
