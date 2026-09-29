"use client";
import { Camera, Loader2, Pause, Play } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { Switch } from "../../ui/Switch";
import { DetectionSummary } from "../DetectionSummary";

interface LiveControlsProps {
  /** The Pi and its camera are reachable, so every control can work. */
  ready: boolean;
  onTakePhoto: () => void;
  onPause: () => void;
  onResume: () => void;
}

/** The bar under the Autolab stage: shutter, preview toggle and detection. */
export function LiveControls({ ready, onTakePhoto, onPause, onResume }: LiveControlsProps) {
  const { preview, capturing, liveDetect, setLiveDetect, detectorStatus, liveFrame } = useAutolab();
  const analysis = liveDetect ? liveFrame?.analysis : undefined;

  function toggleDetect(on: boolean) {
    // Detection needs frames, so turning it on also clears a pause.
    if (on) onResume();
    setLiveDetect(on);
  }

  return (
    <div className="live-controls">
      <div className="live-controls__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={onTakePhoto}
          disabled={!ready || capturing}
          aria-busy={capturing}
          aria-keyshortcuts="Space"
          title="Take photo (Space)"
        >
          {capturing ? (
            <Loader2 size={18} strokeWidth={1.8} className="spin" aria-hidden="true" />
          ) : (
            <Camera size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
          Take photo
        </button>
        <button type="button" className="btn btn--lg" onClick={preview ? onPause : onResume} disabled={!ready}>
          {preview ? (
            <Pause size={18} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Play size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
          {preview ? "Stop preview" : "Start preview"}
        </button>
      </div>
      <div className="live-controls__summary">{analysis ? <DetectionSummary analysis={analysis} showTiming={false} /> : null}</div>
      <label className="live-controls__detect">
        <span className="live-controls__detect-text">
          Detect objects
          {liveDetect ? <span className="live-controls__status">{detectorStatus}</span> : null}
        </span>
        <Switch label="Detect objects" checked={liveDetect} onChange={toggleDetect} disabled={!ready} />
      </label>
    </div>
  );
}
