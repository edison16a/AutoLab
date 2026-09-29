import type { Analysis } from "@/model/types";

interface DetectionSummaryProps {
  analysis: Analysis;
  /** Inference time helps next to a single image. On a live feed it's noise. */
  showTiming?: boolean;
  /**
   * Read the result aloud when it changes. Only for one-off results: a live
   * feed updates twice a second and would talk over everything else.
   */
  announce?: boolean;
}

/** One line like "3 objects: cup, bottle", each label listed once. */
export function DetectionSummary({ analysis, showTiming = true, announce = false }: DetectionSummaryProps) {
  const count = analysis.detections.length;
  const labels = [...new Set(analysis.detections.map((d) => d.label))];
  const text = `${count} ${count === 1 ? "object" : "objects"}${labels.length ? `: ${labels.join(", ")}` : ""}`;
  const ms = showTiming && analysis.inference_ms != null ? Math.round(analysis.inference_ms) : null;

  return (
    <p className="detection-result" aria-live={announce ? "polite" : "off"}>
      <span className="detection-result__text" title={text}>
        {text}
      </span>{" "}
      {ms != null ? <span className="detection-result__ms num">{ms} ms</span> : null}
    </p>
  );
}
