import type { Detection } from "@/model/types";

interface LabelSummary {
  label: string;
  count: number;
  /** Mean confidence across this label's detections, from 0 to 1. */
  confidence: number;
}

/** Most common labels first. Ties go to the more confident label. */
function summarize(detections: Detection[]): LabelSummary[] {
  const byLabel = new Map<string, { count: number; total: number }>();
  for (const d of detections) {
    const entry = byLabel.get(d.label) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += d.confidence;
    byLabel.set(d.label, entry);
  }
  return [...byLabel.entries()]
    .map(([label, { count, total }]) => ({ label, count, confidence: total / count }))
    .sort((a, b) => b.count - a.count || b.confidence - a.confidence);
}

/** Detected objects grouped by label, each with a thin confidence bar. */
export function DetectionList({ detections }: { detections: Detection[] }) {
  if (!detections.length) return <p className="muted small">No objects found.</p>;

  return (
    <div className="detections">
      <div className="detections__row detections__head" aria-hidden="true">
        <span>{detections.length === 1 ? "1 object" : `${detections.length} objects`}</span>
        <span className="detections__count">Count</span>
        <span className="detections__confidence">Confidence</span>
      </div>
      <ul className="detections__list" aria-label="Detected objects">
        {summarize(detections).map(({ label, count, confidence }) => {
          const percent = Math.round(confidence * 100);
          return (
            <li key={label} className="detections__row">
              <span className="detections__label">{label}</span>
              <span className="detections__count num">
                {count}
                <span className="visually-hidden"> found</span>
              </span>
              <span className="detections__bar" aria-hidden="true">
                <span className="detections__fill" style={{ width: `${percent}%` }} />
              </span>
              <span className="detections__percent num">
                {percent}%<span className="visually-hidden"> confidence</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
