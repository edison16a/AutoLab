"use client";
import { Loader2, ScanSearch } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { Analysis, Photo } from "@/model/types";
import { Switch } from "../../ui/Switch";
import { DetectionList } from "./DetectionList";

interface AnalysisSectionProps {
  photo: Photo;
  analyzing: boolean;
  overlays: boolean;
  onOverlays: (on: boolean) => void;
  onAnalyze: () => void;
}

/** "just now" reads better mid sentence. Dates and "5m ago" keep their case. */
function analyzedWhen(iso: string) {
  const when = relativeTime(iso);
  return when === "Just now" ? "just now" : when;
}

/** Model facts as a row of small tiles. Backend and timing are optional in older rows. */
function ModelFacts({ analysis }: { analysis: Analysis }) {
  const facts = [
    { label: "Model", value: analysis.model },
    analysis.backend ? { label: "Backend", value: analysis.backend } : null,
    analysis.inference_ms != null ? { label: "Inference", value: `${Math.round(analysis.inference_ms)} ms` } : null,
  ].filter((f): f is { label: string; value: string } => !!f);

  return (
    <dl className="model-facts">
      {facts.map((f) => (
        <div key={f.label} className="model-facts__item">
          <dt className="label">{f.label}</dt>
          <dd className="model-facts__value num">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Detection results for one image, or the button that runs detection. The
 * button keeps its place while the model works so the panel doesn't jump.
 */
export function AnalysisSection({ photo, analyzing, overlays, onOverlays, onAnalyze }: AnalysisSectionProps) {
  const analyzed = !!photo.analysis;
  const button = (
    <button
      type="button"
      className={`btn ${analyzed ? "" : "btn--primary"} btn--block`}
      disabled={analyzing}
      onClick={onAnalyze}
    >
      {analyzing ? (
        <Loader2 className="spin" size={16} strokeWidth={1.8} aria-hidden="true" />
      ) : (
        <ScanSearch size={16} strokeWidth={1.8} aria-hidden="true" />
      )}
      {analyzing ? "Analyzing" : analyzed ? "Analyze again" : "Analyze image"}
    </button>
  );

  return (
    <section className="image-panel__section" aria-labelledby="analysis-title">
      <div className="image-panel__head">
        <h2 id="analysis-title">Analysis</h2>
        {analyzed ? (
          <label className="image-panel__toggle">
            <span>Show overlay</span>
            <Switch label="Show overlay" checked={overlays} onChange={onOverlays} />
          </label>
        ) : null}
      </div>
      {photo.analysis ? (
        <>
          <ModelFacts analysis={photo.analysis} />
          <DetectionList detections={photo.analysis.detections} />
          {photo.analyzed_at ? <p className="muted small">Analyzed {analyzedWhen(photo.analyzed_at)}</p> : null}
        </>
      ) : (
        <p className="muted small">Not analyzed yet.</p>
      )}
      {button}
    </section>
  );
}
