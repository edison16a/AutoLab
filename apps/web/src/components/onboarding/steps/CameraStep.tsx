"use client";
import { StepFrame } from "./StepFrame";

/** Step 1: seat the HQ camera's ribbon in the Pi's CSI port while the Pi is off. */
export function CameraStep({ onDone }: { onDone: () => void }) {
  return (
    <StepFrame
      title="Connect the camera"
      lead="Do this with the Pi powered off."
      actions={
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onDone}>
          Camera connected
        </button>
      }
    >
      <ol className="onboarding-list">
        <li>Lift the clip on the Pi&apos;s CSI camera port.</li>
        <li>Slide the ribbon in with its contacts facing the HDMI ports.</li>
        <li>Press the clip down. Do the same on the camera.</li>
      </ol>
    </StepFrame>
  );
}
