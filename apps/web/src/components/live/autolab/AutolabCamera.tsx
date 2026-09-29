"use client";
import { useCallback, useMemo } from "react";
import { useAutolab } from "@/providers/autolab-context";
import { CaptureGrid } from "../CaptureGrid";
import { useSpaceShortcut } from "../use-space-shortcut";
import { DeviceFacts } from "./DeviceFacts";
import { LiveControls } from "./LiveControls";
import { LiveStage } from "./LiveStage";
import { stageState } from "./stage-state";
import { useAutoPreview } from "./use-auto-preview";

/** How many recent captures the side panel shows. Two rows of four on a phone. */
const RECENT_LIMIT = 8;

/** The Autolab camera source: live stage, controls and the side panel. */
export function AutolabCamera() {
  const { device, connection, status, preview, liveFrame, photos, capture, notify } = useAutolab();
  const { ready, pause, resume } = useAutoPreview();
  const state = stageState({ device, connection, status, preview, frame: liveFrame });

  const recent = useMemo(
    () => (device ? photos.filter((photo) => photo.device_id === device.id).slice(0, RECENT_LIMIT) : []),
    [photos, device],
  );

  const takePhoto = useCallback(async () => {
    const photo = await capture();
    if (photo) notify("Photo saved", "success");
  }, [capture, notify]);

  useSpaceShortcut(takePhoto, ready);

  return (
    <div className="live__body">
      <div className="live__main">
        <LiveStage state={state} onResume={resume} />
        <LiveControls ready={ready} onTakePhoto={takePhoto} onPause={pause} onResume={resume} />
      </div>
      <aside className="live__side" aria-label="Autolab details">
        <CaptureGrid title="Recent captures" photos={recent} emptyText="Photos you take appear here." />
        <DeviceFacts />
      </aside>
    </div>
  );
}
