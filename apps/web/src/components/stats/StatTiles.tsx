import { formatBytes } from "@/lib/format";
import { formatCount, formatDecimal, formatMs, plural } from "@/lib/stats/format";
import type { Summary } from "@/lib/stats/types";

interface Tile {
  label: string;
  value: string;
  /** Nothing counted or measured yet. The value is drawn faint so a zero reads as a resting state. */
  zero: boolean;
  sub: string;
}

/** Six headline numbers, each with one short line that is true for the current filter. */
function tiles(s: Summary): Tile[] {
  return [
    { label: "Captures", value: formatCount(s.captures), zero: !s.captures, sub: `${formatCount(s.today)} today` },
    {
      label: "Analyzed",
      value: formatCount(s.analyzed),
      zero: !s.analyzed,
      sub: s.captures ? `${s.analyzedPercent}% of captures` : "No captures",
    },
    { label: "Objects detected", value: formatCount(s.detections), zero: !s.detections, sub: plural(s.labels, "label") },
    {
      label: "Objects per image",
      value: formatDecimal(s.perImage ?? 0),
      zero: !s.perImage,
      sub: s.analyzed ? `${plural(s.analyzed, "image")} analyzed` : "Nothing analyzed",
    },
    {
      label: "Median inference",
      value: formatMs(s.medianMs ?? 0),
      zero: s.medianMs === null,
      sub: s.meanMs === null ? "No timings yet" : `Average ${formatMs(s.meanMs)}`,
    },
    {
      // Cloud images take no room in this browser, so an all cloud library honestly uses 0 B here.
      label: "Storage used",
      value: formatBytes(s.bytes),
      zero: !s.bytes,
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
          <dd className={`stats-tile__value ${tile.zero && !loading ? "stats-tile__value--zero" : ""}`}>
            {loading ? <span className="skeleton stats-tile__skeleton" /> : tile.value}
          </dd>
          <dd className="stats-tile__sub">{loading ? "\u00a0" : tile.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
