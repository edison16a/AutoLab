"use client";
import { Download, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useAutolab } from "@/providers/autolab-context";
import type { Photo } from "@/model/types";
import { AnalysisSection } from "./AnalysisSection";
import { ImageFacts } from "./ImageFacts";

interface ImagePanelProps {
  photo: Photo;
  overlays: boolean;
  onOverlays: (on: boolean) => void;
  onDelete: () => void;
}

/** Everything beside the viewer: when it was taken, actions, analysis and details. */
export function ImagePanel({ photo, overlays, onOverlays, onDelete }: ImagePanelProps) {
  const { analyze, analyzing, download } = useAutolab();

  return (
    <aside className="image-panel" aria-label="Image details">
      <header className="image-panel__section image-panel__header">
        <h1 className="image-panel__date">{formatDateTime(photo.captured_at)}</h1>
        <div className="image-panel__actions">
          <button type="button" className="btn" onClick={() => void download(photo)}>
            <Download size={16} strokeWidth={1.8} aria-hidden="true" />
            Download
          </button>
          <button type="button" className="btn" onClick={onDelete}>
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
            Delete
          </button>
        </div>
      </header>
      <AnalysisSection
        photo={photo}
        analyzing={analyzing.includes(photo.id)}
        overlays={overlays}
        onOverlays={onOverlays}
        onAnalyze={() => void analyze(photo)}
      />
      <ImageFacts photo={photo} />
    </aside>
  );
}
