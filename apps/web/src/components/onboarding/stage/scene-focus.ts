import type { CameraFocus } from "@/components/three";
import { STEP, type StepIndex } from "../wizard-steps";

/**
 * What the camera frames on each step. The bench steps look at the part
 * being connected from the side it goes in; Ready pulls back to the whole
 * machine from the three quarter view of the design sketch.
 */
const FOCUS: Record<StepIndex, CameraFocus> = {
  [STEP.camera]: { target: [-0.4, 0.68, 0.05], radius: 1.1, direction: [0.3, 0.45, 1], fill: 0.88 },
  [STEP.power]: { target: [-0.45, 0.5, 0.1], radius: 1.2, direction: [-0.45, 0.7, 1], fill: 0.88 },
  [STEP.discover]: { target: [0.25, 0.42, -0.25], radius: 1.65, direction: [0.1, 0.55, 1], fill: 0.9 },
  [STEP.device]: { target: [0.85, 0.7, -0.5], radius: 2.35, direction: [0.1, 0.5, 1], fill: 0.92 },
  [STEP.ready]: { target: [-0.1, 2.2, 0.1], radius: 4.15, direction: [0.3, 0.5, 1.5], fill: 0.9 },
};

export function stepFocus(step: StepIndex): CameraFocus {
  return FOCUS[step];
}

/** The floor shadow only needs to cover what's on stage; smaller is crisper. */
export function stepShadowRadius(step: StepIndex) {
  if (step === STEP.ready) return 5.5;
  return step >= STEP.discover ? 3.6 : 2.2;
}
