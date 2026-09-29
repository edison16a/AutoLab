"use client";
import { StepFrame } from "./StepFrame";

/** Step 2: wall power over USB-C. The Pi never needs a cable to the computer. */
export function PowerStep({ onDone }: { onDone: () => void }) {
  return (
    <StepFrame
      title="Power on the Pi"
      lead="Plug the USB-C power supply into the Pi."
      actions={
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onDone}>
          Raspberry Pi is powered on
        </button>
      }
    >
      <p className="onboarding-step__note">The power light turns on. No cable to your computer is needed.</p>
    </StepFrame>
  );
}
