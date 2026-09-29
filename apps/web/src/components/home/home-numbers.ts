/**
 * The four headline numbers on Home. They cover every image in the library,
 * across devices, since Home answers "what have I got so far?". The
 * Statistics screen is where filtering happens.
 */
import { labelCounts } from "@/lib/stats/detections";
import { formatCount } from "@/lib/stats/format";
import { addDays, captureTime, startOfDay } from "@/lib/stats/range";
import { summarize } from "@/lib/stats/summary";
import type { Photo } from "@/model/types";

export interface HomeTile {
  label: string;
  /** Null when there is nothing to measure yet, which reads differently from zero. */
  value: string | null;
  /** One short line of context, or null when there's nothing true to add. */
  sub: string | null;
}

/**
 * Captures in the 7 days ending today, and in the 7 before that. Same local
 * calendar days as the Statistics "7 days" range, so the two screens agree.
 */
function weekCounts(photos: Photo[], now: number) {
  const weekStart = addDays(startOfDay(now), -6);
  const priorStart = addDays(weekStart, -7);
  let week = 0;
  let prior = 0;
  for (const photo of photos) {
    const time = captureTime(photo);
    if (time >= weekStart) week++;
    else if (time >= priorStart) prior++;
  }
  return { week, prior };
}

export function homeTiles(photos: Photo[], now: number): HomeTile[] {
  const summary = summarize(photos, now);
  const { week, prior } = weekCounts(photos, now);
  const top = labelCounts(photos, 1)[0];

  return [
    {
      label: "Captures",
      value: formatCount(summary.captures),
      sub: summary.today ? `${formatCount(summary.today)} today` : null,
    },
    {
      label: "This week",
      value: formatCount(week),
      // Only worth saying when there's a week to compare against.
      sub: prior ? `${formatCount(prior)} the week before` : null,
    },
    {
      label: "Objects detected",
      value: formatCount(summary.detections),
      sub: top && !top.other ? `Most common: ${top.label}` : null,
    },
    {
      label: "Analyzed",
      value: summary.captures ? `${summary.analyzedPercent}%` : null,
      sub: summary.captures ? `${formatCount(summary.analyzed)} of ${formatCount(summary.captures)}` : null,
    },
  ];
}
