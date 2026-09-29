"use client";
import { FocusControls, Stage } from "@/components/three";
import { STEP, type StepIndex } from "../wizard-steps";
import { BenchScene } from "./BenchScene";
import { ReadyMachine } from "./ReadyMachine";
import { stepFocus, stepShadowRadius } from "./scene-focus";

export interface AssemblySceneProps {
  step: StepIndex;
  /** Bumped by the Replay button: restarts the step's animation and reframes it. */
  replay: number;
  /** The Pi reported it joined Wi-Fi. */
  wifi: boolean;
  /** The Pi reported it reached the gateway. */
  gateway: boolean;
}

/**
 * The wizard's 3D stage: one canvas for the whole setup, so moving between
 * steps is a camera flight rather than a new WebGL context. Loaded on
 * demand, so the wizard's text shows before three.js arrives.
 */
export default function AssemblyScene({ step, replay, wifi, gateway }: AssemblySceneProps) {
  const ready = step === STEP.ready;
  return (
    <Stage label="3D setup illustration" className="onboarding-stage__canvas" fov={26} shadowRadius={stepShadowRadius(step)}>
      <FocusControls focus={stepFocus(step)} focusKey={`${step}:${replay}`} minDistance={0.8} maxDistance={ready ? 22 : 10} />
      {ready ? (
        <ReadyMachine key={replay} />
      ) : (
        <BenchScene key={`${step}:${replay}`} step={step} wifi={wifi} gateway={gateway} />
      )}
    </Stage>
  );
}
