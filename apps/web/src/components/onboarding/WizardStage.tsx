"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { StepIndex } from "./wizard-steps";

// three.js loads only once the wizard is open, and never on the server.
const AssemblyScene = dynamic(() => import("./stage/AssemblyScene"), {
  ssr: false,
  loading: () => <div className="stage3d onboarding-stage__canvas" aria-busy="true" />,
});

interface WizardStageProps {
  step: StepIndex;
  wifi: boolean;
  gateway: boolean;
}

/**
 * The left side of the wizard: the 3D illustration of the current step and
 * a button to play it again. When WebGL is missing the stage shows one
 * plain sentence instead, the Replay button hides, and the steps on the
 * right keep working.
 */
export function WizardStage({ step, wifi, gateway }: WizardStageProps) {
  const [replay, setReplay] = useState(0);
  return (
    <div className="onboarding-stage">
      <AssemblyScene step={step} replay={replay} wifi={wifi} gateway={gateway} />
      <button
        type="button"
        className="icon-btn onboarding-stage__replay"
        aria-label="Replay animation"
        title="Replay animation"
        onClick={() => setReplay((count) => count + 1)}
      >
        <RotateCcw size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
