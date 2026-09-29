"use client";
import type { CSSProperties } from "react";
import { CameraOff, Pause, Plug, WifiOff } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { ImageView } from "../../ui/ImageView";
import { Chip, StageChips } from "../StageChips";
import { StageMessage } from "../StageMessage";
import type { StageState } from "./stage-state";

interface LiveStageProps {
  state: StageState;
  onResume: () => void;
}

/** The Autolab camera feed, or a short note on why there isn't one. */
export function LiveStage({ state, onResume }: LiveStageProps) {
  const { liveFrame, liveDetect, status, fps } = useAutolab();
  const frame = state === "live" ? liveFrame : null;

  return (
    <div className="live-stage" role="region" aria-label="Autolab camera">
      {frame ? (
        <>
          <StageChips
            start={
              <>
                <Chip live>Live</Chip>
                {status.simulated ? <Chip>Simulator</Chip> : null}
              </>
            }
            end={
              <>
                {fps > 0 ? <Chip>{fps.toFixed(1)} fps</Chip> : null}
                <Chip>
                  {frame.width} × {frame.height}
                </Chip>
              </>
            }
          />
          <div className="live-stage__view" style={{ "--view-ratio": `${frame.width} / ${frame.height}` } as CSSProperties}>
            <ImageView
              url={frame.url}
              width={frame.width}
              height={frame.height}
              analysis={frame.analysis}
              overlays={liveDetect}
              alt="Live view from the Autolab camera"
            />
          </div>
        </>
      ) : (
        <StateMessage state={state} onResume={onResume} />
      )}
    </div>
  );
}

function StateMessage({ state, onResume }: LiveStageProps) {
  const { openConnect, connection } = useAutolab();
  switch (state) {
    case "no-device":
      return (
        <StageMessage
          icon={Plug}
          title="No device connected"
          text="Connect an Autolab to see its camera."
          action={
            <button type="button" className="btn btn--primary" onClick={openConnect}>
              Connect device
            </button>
          }
        />
      );
    case "connecting":
      return <StageMessage icon={Plug} busy title={connection === "reconnecting" ? "Reconnecting" : "Connecting"} />;
    case "offline":
      return <StageMessage icon={WifiOff} title="Autolab is offline" text="Check that the Pi has power and network." />;
    case "no-camera":
      return <StageMessage icon={CameraOff} title="Camera not detected" text="Check the camera cable on the Pi." />;
    case "paused":
      return (
        <StageMessage
          icon={Pause}
          title="Preview paused"
          action={
            <button type="button" className="btn" onClick={onResume}>
              Resume preview
            </button>
          }
        />
      );
    default:
      return <StageMessage icon={Plug} busy title="Waiting for frames" />;
  }
}
