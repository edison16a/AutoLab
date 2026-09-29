"use client";
import { Check } from "lucide-react";
import { StepFrame } from "./StepFrame";

/**
 * Step 5. Only reached once the new device's heartbeat and camera have both
 * been seen, so each check here is something the Pi actually reported.
 */
export function ReadyStep({ onOpen }: { onOpen: () => void }) {
  return (
    <StepFrame
      title="Your Autolab is ready"
      lead="It is online and the camera is working."
      actions={
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onOpen}>
          Open Autolab
        </button>
      }
    >
      <ul className="onboarding-checks">
        <li>
          <Check size={16} strokeWidth={1.8} aria-hidden="true" />
          Pi heartbeat received
        </li>
        <li>
          <Check size={16} strokeWidth={1.8} aria-hidden="true" />
          Camera detected
        </li>
      </ul>
    </StepFrame>
  );
}
