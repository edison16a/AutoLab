"use client";
import type { CSSProperties } from "react";
import { Webcam } from "lucide-react";
import { ImageView } from "../../ui/ImageView";
import { Chip, StageChips } from "../StageChips";
import { StageMessage } from "../StageMessage";
import type { ComputerCameraModel } from "./use-computer-camera";

/**
 * The computer camera stage. The video element stays mounted even when
 * hidden, so the stream always has somewhere to attach and a stop can
 * always detach it. While detecting, the analyzed still replaces the video
 * so boxes line up with the frame they were found in.
 */
export function WebcamStage({ camera }: { camera: ComputerCameraModel }) {
  const { videoRef, state, size, snapshot, detect, uploading } = camera;
  const running = state === "running";
  const still = (running && detect && snapshot?.origin === "live") || (!running && snapshot?.origin === "upload") ? snapshot : null;
  const showVideo = running && !still;
  const shown = still ?? (showVideo ? size : null);
  const ratio = size ? `${size.width} / ${size.height}` : "4 / 3";

  return (
    <div className="live-stage webcam-stage" role="region" aria-label="Computer camera view">
      {shown ? (
        <StageChips
          start={running ? <Chip live>Live</Chip> : <Chip>{uploading ? "Analyzing" : "Upload"}</Chip>}
          end={
            <Chip>
              {shown.width} × {shown.height}
            </Chip>
          }
        />
      ) : null}
      <div
        className={`live-stage__view ${shown ? "" : "live-stage__view--hidden"}`}
        style={shown ? ({ "--view-ratio": `${shown.width} / ${shown.height}` } as CSSProperties) : undefined}
      >
        <video
          ref={videoRef}
          className={`live-stage__video ${showVideo ? "" : "live-stage__video--hidden"}`}
          style={{ "--ratio": ratio } as CSSProperties}
          muted
          playsInline
          aria-label="Computer camera feed"
        />
        {still ? (
          <ImageView
            url={still.url}
            width={still.width}
            height={still.height}
            analysis={still.analysis}
            alt={still.origin === "upload" ? "Uploaded image" : "Latest analyzed camera frame"}
          />
        ) : null}
      </div>
      {shown ? null : <IdleMessage starting={state === "starting"} uploading={uploading} />}
    </div>
  );
}

function IdleMessage({ starting, uploading }: { starting: boolean; uploading: boolean }) {
  if (starting) return <StageMessage icon={Webcam} busy title="Starting camera" />;
  if (uploading) return <StageMessage icon={Webcam} busy title="Reading image" />;
  return <StageMessage icon={Webcam} title="Camera off" text="Start the camera or upload an image." />;
}
