"use client";
import { useRef, type ReactNode } from "react";
import type { Group } from "three";
import { Block, Cylinder, TextDecal } from "../primitives";
import { PLUNGER_STROKE } from "../motion/Rig";
import { usePoseFrame } from "../motion/use-pose-frame";
import { CarriedTip } from "./deck/CarriedTip";
import { PIPETTE_TIP, TIP_SHAPE } from "./deck/labware-layout";

/** Heights along the pipette's axis, from the tip up to the plunger button. */
const Y = {
  tipEnd: PIPETTE_TIP.end,
  tipTop: PIPETTE_TIP.top - 0.01,
  nose: -0.05,
  sleeve: 0.02,
  shaft: 0.2,
  handleTop: 0.78,
  knob: 0.84,
  button: 0.93,
} as const;
const HANDLE = { bottom: 0.1, top: 0.098 } as const;

/** The plunger rod and button, pressed down by the load cell's pusher as the Home demo works the plunger. */
function Plunger({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  usePoseFrame(
    (pose) => {
      if (group.current) group.current.position.y = -pose.plunger * PLUNGER_STROKE;
    },
    () => {
      if (group.current) group.current.position.y = 0;
    },
  );
  return <group ref={group}>{children}</group>;
}

/**
 * The team's P1000 air displacement pipette, coloured like the one in
 * their photo: a dark slate handle with the volume display and finger
 * hook, the blue plunger button that marks a 1000 µL pipette, a light
 * grey shaft and ejector, and a blue filtered tip. Origin on the axis,
 * about a third of the way up; the plunger button's top meets the load
 * cell's pusher.
 */
export function PipetteModel() {
  const handleHeight = Y.handleTop - Y.shaft;
  const shaftHeight = Y.shaft - Y.sleeve;
  return (
    <group>
      {/* Plunger and its button, then the volume knob. */}
      <Plunger>
        <Cylinder position={[0, Y.button - 0.018, 0]} radius={0.058} height={0.036} material="pipetteBlue" />
        <Cylinder position={[0, (Y.knob + Y.button) / 2 - 0.02, 0]} radius={0.024} height={Y.button - Y.knob} low material="plasticWhite" />
      </Plunger>
      <Cylinder position={[0, (Y.handleTop + Y.knob) / 2, 0]} radius={0.074} height={Y.knob - Y.handleTop} material="pipetteNavy" />
      {/* Tip ejector button beside the plunger. */}
      <Cylinder position={[0.072, Y.handleTop + 0.05, 0]} radius={0.016} height={0.1} low material="plasticWhite" />
      <Block position={[0.078, Y.handleTop + 0.1, 0]} size={[0.06, 0.024, 0.05]} radius={0.01} material="plasticGrey" />
      <Cylinder position={[0, Y.shaft + handleHeight / 2, 0]} radius={HANDLE.bottom} height={handleHeight} taper={HANDLE.top / HANDLE.bottom} material="pipetteNavy" />
      {/* Finger hook near the top of the handle. */}
      <Block position={[-0.12, Y.handleTop - 0.07, 0]} size={[0.1, 0.07, 0.09]} radius={0.03} material="pipetteNavy" />
      {/* Volume display: a white window with the setting in it. */}
      <Block position={[0, 0.54, HANDLE.bottom - 0.004]} size={[0.1, 0.16, 0.02]} radius={0.008} material="plasticWhite" />
      <TextDecal text="1000" position={[0, 0.54, HANDLE.bottom + 0.0072]} rotation={[0, 0, 0]} width={0.08} height={0.034} ink="dark" weight={700} />
      <Cylinder position={[0, Y.sleeve + shaftHeight / 2, 0]} radius={0.05} height={shaftHeight} taper={1.5} material="plasticWhite" />
      {/* Ejector arm running down the shaft to the sleeve. */}
      <Cylinder position={[0.074, Y.sleeve + shaftHeight / 2, 0]} radius={0.012} height={shaftHeight} low material="plasticGrey" />
      <Cylinder position={[0, (Y.nose + Y.sleeve) / 2, 0]} radius={0.05} height={Y.sleeve - Y.nose} material="plasticGrey" />
      <Cylinder position={[0, (Y.tipTop + Y.nose) / 2, 0]} radius={0.022} height={Y.nose - Y.tipTop} taper={1.45} material="plasticWhite" />
      {/* The filtered tip: see through blue, with its white filter plug near the top. */}
      <group position={[0, PIPETTE_TIP.top - TIP_SHAPE.length, 0]}>
        <CarriedTip />
      </group>
    </group>
  );
}
