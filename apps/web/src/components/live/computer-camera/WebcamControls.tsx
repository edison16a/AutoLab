"use client";
import type { ChangeEvent } from "react";
import { Camera, Loader2, Square, Upload, Webcam, X } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { Switch } from "../../ui/Switch";
import { DetectionSummary } from "../DetectionSummary";
import type { ComputerCameraModel } from "./use-computer-camera";

const ICON = { size: 18, strokeWidth: 1.8, "aria-hidden": true } as const;

/**
 * The bar under the computer camera stage. Whichever action comes next is
 * the primary button: starting the camera when it's off, taking a photo
 * once it's on.
 */
export function WebcamControls({ camera }: { camera: ComputerCameraModel }) {
  const { detectorStatus } = useAutolab();
  const { state, snapshot, detect, uploading, saving, start, stop, toggleDetect, takePhoto, upload } = camera;
  const running = state === "running";
  const starting = state === "starting";

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still fires a change.
    event.target.value = "";
    if (file) void upload(file);
  }

  return (
    <div className="live-controls">
      <div className="live-controls__actions">
        <button
          type="button"
          className={`btn btn--lg ${running || starting ? "" : "btn--primary"}`}
          onClick={running || starting ? stop : start}
          disabled={uploading}
        >
          {starting ? <X {...ICON} /> : running ? <Square {...ICON} /> : <Webcam {...ICON} />}
          {starting ? "Cancel" : running ? "Stop camera" : "Start computer camera"}
        </button>
        <button
          type="button"
          className={`btn btn--lg ${running ? "btn--primary" : ""}`}
          onClick={() => void takePhoto()}
          disabled={!running || saving}
          aria-busy={saving}
          aria-keyshortcuts="Space"
          title="Take photo (Space)"
        >
          {saving ? <Loader2 {...ICON} className="spin" /> : <Camera {...ICON} />}
          Take photo
        </button>
        <label className="btn btn--lg live-controls__upload">
          {uploading ? <Loader2 {...ICON} className="spin" /> : <Upload {...ICON} />}
          {uploading ? "Analyzing" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="visually-hidden"
            aria-label="Upload image"
            disabled={uploading || starting}
            onChange={onPick}
          />
        </label>
      </div>
      <div className="live-controls__summary">
        {snapshot?.analysis ? (
          <DetectionSummary
            analysis={snapshot.analysis}
            showTiming={snapshot.origin === "upload"}
            announce={snapshot.origin === "upload"}
          />
        ) : null}
      </div>
      <label className="live-controls__detect">
        <span className="live-controls__detect-text">
          Detect objects
          {detect || uploading ? <span className="live-controls__status">{detectorStatus}</span> : null}
        </span>
        <Switch label="Detect objects" checked={detect} onChange={toggleDetect} />
      </label>
    </div>
  );
}
