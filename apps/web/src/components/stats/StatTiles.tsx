import { formatBytes } from "@/lib/format";
import { formatCount, formatDecimal, formatMs, plural } from "@/lib/stats/format";
import type { Summary } from "@/lib/stats/types";

interface Tile {
  label: string;
  /** Null means there's nothing to measure yet, which reads differently from zero. */
  value: string | null;
  /** Shown in place of a null value. */
  missing?: string;
  sub: string;
}

/** Six headline numbers, each with one short line that is true for the current filter. */
function tiles(s: Summary): Tile[] {
  const unsizedOnly = s.captures > 0 && s.unsized === s.captures;
  return [
    { label: "Captures", value: formatCount(s.captures), sub: `${formatCount(s.today)} today` },
    { label: "Analyzed", value: formatCount(s.analyzed), sub: `${s.analyzedPercent}% of captures` },
    { label: "Objects detected", value: formatCount(s.detections), sub: plural(s.labels, "label") },
    {
      label: "Objects per image",
      value: s.perImage === null ? null : formatDecimal(s.perImage),
      sub: s.analyzed ? `${plural(s.analyzed, "image")} analyzed` : "Nothing analyzed",
    },
    {
      label: "Median inference",
      value: s.medianMs === null ? null : formatMs(s.medianMs),
      sub: s.meanMs === null ? "No timings yet" : `Average ${formatMs(s.meanMs)}`,
    },
    {
      label: "Storage used",
      value: unsizedOnly ? null : formatBytes(s.bytes),
      missing: "Unknown",
      sub: s.unsized ? `${plural(s.unsized, "cloud image")} not counted` : "In this browser",
    },
  ];
}

interface StatTilesProps {
  summary: Summary;
  /** Shows placeholders while the library is still loading, so no number is ever a guess. */
  loading?: boolean;
}

export function StatTiles({ summary, loading }: StatTilesProps) {
  return (
    <dl className="stats-tiles" aria-busy={loading || undefined}>
      {tiles(summary).map((tile) => (
        <div key={tile.label} className="stats-tile">
          <dt className="stats-tile__label">{tile.label}</dt>
          <dd className={`stats-tile__value ${tile.value === null ? "stats-tile__value--none" : ""}`}>
            {loading ? <span className="skeleton stats-tile__skeleton" /> : (tile.value ?? tile.missing ?? "None")}
          </dd>
          <dd className="stats-tile__sub">{loading ? " " : tile.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
