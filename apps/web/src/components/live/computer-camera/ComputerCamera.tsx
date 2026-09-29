"use client";
import { useMemo } from "react";
import { CircleAlert } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { CaptureGrid } from "../CaptureGrid";
import { FactList } from "../FactList";
import { useSpaceShortcut } from "../use-space-shortcut";
import { useComputerCamera } from "./use-computer-camera";
import { WebcamControls } from "./WebcamControls";
import { WebcamStage } from "./WebcamStage";

const RECENT_LIMIT = 8;

/**
 * The computer camera source: this computer's webcam or an uploaded image,
 * with detection running in the browser. Nothing here needs an Autolab.
 */
export function ComputerCamera() {
  const { photos, detectorStatus } = useAutolab();
  const camera = useComputerCamera();

  const recent = useMemo(
    () => photos.filter((photo) => photo.source === "computer" || photo.source === "upload").slice(0, RECENT_LIMIT),
    [photos],
  );

  useSpaceShortcut(camera.takePhoto, camera.state === "running");

  return (
    <div className="live__body" role="tabpanel" aria-label="Computer camera">
      <div className="live__main">
        <WebcamStage camera={camera} />
        <WebcamControls camera={camera} />
        {camera.error ? (
          <p className="live-notice" role="alert">
            <CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />
            {camera.error}
          </p>
        ) : null}
      </div>
      <aside className="live__side" aria-label="Computer camera details">
        <CaptureGrid title="Recent captures" photos={recent} emptyText="Photos and uploads from this computer appear here." />
        <FactList
          title="Detector"
          facts={[
            { label: "Model", value: "YOLOv10n" },
            { label: "Runs in", value: "This browser" },
            { label: "Status", value: detectorStatus },
          ]}
        />
      </aside>
    </div>
  );
}
