/**
 * Shapes the statistics functions hand to the Statistics screen. Everything
 * here is plain data, already counted, so the charts only have to draw it.
 */
import type { PhotoSource } from "@/model/types";

export type StatsRange = "7d" | "30d" | "all";

/** "all" means every device, including images with no Autolab behind them. */
export interface StatsFilter {
  range: StatsRange;
  deviceId: string;
}

export const ALL_DEVICES = "all";

/** Start and end of the filtered window, in epoch ms. */
export interface Window {
  start: number;
  end: number;
}

export interface Summary {
  captures: number;
  /** Captures made since local midnight. */
  today: number;
  analyzed: number;
  /** Share of captures that have been analyzed, 0 to 100. */
  analyzedPercent: number;
  detections: number;
  /** How many different labels were found. */
  labels: number;
  /** Null when nothing has been analyzed, so the tile can say so instead of 0. */
  perImage: number | null;
  medianMs: number | null;
  meanMs: number | null;
  /** Sum of the sizes we know. Cloud rows don't report one. */
  bytes: number;
  /** Images whose size is unknown and so left out of `bytes`. */
  unsized: number;
}

/**
 * One column of the captures chart. A bucket is one local day, or a week
 * when the window is long enough that daily columns would be hairlines.
 */
export interface TimeBucket {
  start: number;
  days: number;
  count: number;
  analyzed: number;
}

export interface HourBucket {
  hour: number;
  count: number;
}

export interface LabelCount {
  label: string;
  count: number;
  /** True for the folded tail, which the chart draws in grey. */
  other?: boolean;
}

/** Confidence bin. `from` and `to` are fractions, 0.4 to 0.45 and so on. */
export interface ConfidenceBin {
  from: number;
  to: number;
  count: number;
}

export interface SourceCount {
  source: PhotoSource;
  count: number;
  /** 0 to 100. */
  share: number;
}

export interface InferenceSample {
  id: string;
  /** When the analysis ran, which is what inference speed depends on. */
  time: number;
  ms: number;
  backend?: string;
}
