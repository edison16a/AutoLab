"use client";
import type { MaterialKey } from "../../materials";
import type { MachinePose } from "../../motion/pose";
import { Spin } from "../../motion/Spin";
import { additionPumpAngle, aspirationPumpAngle } from "../../motion/turns";
import { Block, Cylinder, Repeat, Ring, TextDecal, Tube, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { StepperMotorModel } from "../StepperMotorModel";

/** The motor's and rotor's shared axis, which points out of the pump's front (+Z). */
const AXIS_Y = 0.36;
/** The pump head: a black housing with a clear front cover over the rotor. */
const HEAD = { half: 0.28, depth: 0.18, cover: 0.24, coverDepth: 0.14 } as const;
const ROTOR_Z = 0.25;
const ROLLER_RADIUS = 0.13;
/** The tube lies round the top half of the rotor, pinched against the cover's track by the rollers. */
const TRACK = 0.2;
const TUBE_RADIUS = 0.024;
/** Where each end of the tube leaves the housing: the head side is on the right (+X), facing the enclosure. */
const PORT_Y = AXIS_Y - 0.09;
const PORT_X = 0.34;

/** Where the pump's tube ends, in the pump's space. The head line joins on the right, the valve line on the left. */
export const PUMP_PORTS = { head: [PORT_X, PORT_Y, ROTOR_Z] as Vec3, valve: [-PORT_X, PORT_Y, ROTOR_Z] as Vec3 };

const ROLLERS: RepeatItem[] = [0, 1, 2].map((i) => {
  const a = (i * Math.PI * 2) / 3;
  return { position: [Math.cos(a) * ROLLER_RADIUS, Math.sin(a) * ROLLER_RADIUS, 0] as Vec3, rotation: [Math.PI / 2, 0, 0] as Vec3 };
});
const ROLLER_SCALE: Vec3 = [0.045, 0.09, 0.045];
const PINS: RepeatItem[] = ROLLERS.map(({ position }) => ({ position: [position[0], position[1], 0.05] as Vec3, rotation: [Math.PI / 2, 0, 0] as Vec3 }));
const PIN_SCALE: Vec3 = [0.012, 0.02, 0.012];

/** Over the top of the rotor from one side to the other, then straight out through the housing to each barb. */
function trackPoints(): Vec3[] {
  const arc: Vec3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + 0.35 - (i / 12) * (Math.PI + 0.7);
    arc.push([Math.cos(a) * TRACK, AXIS_Y + Math.sin(a) * TRACK, ROTOR_Z]);
  }
  return [[-PORT_X + 0.02, PORT_Y, ROTOR_Z], [-0.26, PORT_Y + 0.005, ROTOR_Z], ...arc, [0.26, PORT_Y + 0.005, ROTOR_Z], [PORT_X - 0.02, PORT_Y, ROTOR_Z]];
}
const TRACK_POINTS = trackPoints();

/** The rotor: two plates on a hub carrying three steel rollers. It turns with the motor shaft in the Home demo. */
function Rotor({ angle }: { angle: (pose: MachinePose) => number }) {
  return (
    <group position={[0, AXIS_Y, ROTOR_Z]}>
      <Spin axis="z" angle={angle}>
        <Cylinder rotation={[Math.PI / 2, 0, 0]} radius={0.06} height={0.13} material="plasticBlack" />
        {[-0.05, 0.05].map((z) => (
          <Cylinder key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} radius={0.165} height={0.012} material="aluminium" />
        ))}
        <Repeat items={ROLLERS} shape="cylinder" material="steel" scale={ROLLER_SCALE} />
        <Repeat items={PINS} shape="cylinderLow" material="tin" scale={PIN_SCALE} />
      </Spin>
    </group>
  );
}

/** A white barbed fitting where the tube leaves the housing, pointing along X. */
function Barb({ side }: { side: 1 | -1 }) {
  return (
    <group position={[side * (HEAD.half + 0.02), PORT_Y, ROTOR_Z]} rotation={[0, 0, (side * Math.PI) / 2]}>
      <Cylinder radius={0.03} height={0.04} low material="plasticWhite" />
      <Ring position={[0, -0.02, 0]} radius={0.03} material="plasticWhite" />
    </group>
  );
}

interface PumpProps {
  label: string;
  angle: (pose: MachinePose) => number;
  tube: MaterialKey;
}

/**
 * A stepper driven peristaltic pump, like the reversible pumps in the
 * fluidics sketch: a NEMA 17 behind an aluminium L bracket, and in front of
 * it the pump head, a black housing with a clear cover over a three roller
 * rotor that squeezes the silicone tube against its track. Turning one way
 * pushes liquid toward the dispense head, the other way draws it back. The
 * rotor turns while the pump runs in the Home demo. Origin at the middle of
 * the bracket's foot, on the platform.
 */
function PeristalticPump({ label, angle, tube }: PumpProps) {
  const { half, depth, cover, coverDepth } = HEAD;
  return (
    <group>
      {/* L bracket: a foot screwed to the platform and an upright the motor and head bolt through. */}
      <Block position={[0, 0.01, -0.28]} size={[0.56, 0.02, 0.6]} radius={0.004} material="aluminiumBlasted" />
      <Block position={[0, 0.33, -0.01]} size={[0.56, 0.64, 0.02]} radius={0.004} material="aluminiumBlasted" />
      <group position={[0, AXIS_Y, -0.275]} rotation={[Math.PI / 2, 0, 0]}>
        <StepperMotorModel shaft={angle} leadReach={0.08} />
      </group>
      {/* The head's housing and its clear cover. */}
      <Block position={[0, AXIS_Y, depth / 2]} size={[half * 2, half * 2, depth]} radius={0.04} material="plasticBlack" />
      <Cylinder position={[0, AXIS_Y, depth + coverDepth / 2]} rotation={[Math.PI / 2, 0, 0]} radius={cover} height={coverDepth} material="polystyrene" />
      <Ring position={[0, AXIS_Y, depth + coverDepth]} rotation={[0, 0, 0]} radius={cover} material="plasticBlack" />
      <Ring position={[0, AXIS_Y, depth + 0.005]} rotation={[0, 0, 0]} radius={cover} material="plasticBlack" />
      {/* Thumb screw that holds the cover shut. */}
      <Cylinder position={[0, AXIS_Y - cover + 0.02, depth + coverDepth + 0.02]} rotation={[Math.PI / 2, 0, 0]} radius={0.03} height={0.04} low material="steel" />
      <Rotor angle={angle} />
      <Tube points={TRACK_POINTS} radius={TUBE_RADIUS} material={tube} segments={48} />
      <Barb side={1} />
      <Barb side={-1} />
      <TextDecal text={label} position={[0, AXIS_Y + half + 0.001, depth / 2]} width={0.4} height={0.07} ink="light" weight={600} />
    </group>
  );
}

/** Pump 1 in the sketch: pushes fresh media out of the needle, and runs back to send leftovers to waste. */
export function AdditionPumpModel() {
  return <PeristalticPump label="Addition" angle={additionPumpAngle} tube="tubeMedia" />;
}

/** Pump 2 in the sketch: draws spent media up through the tip to waste, and runs the other way to flush the line with cleaner. */
export function AspirationPumpModel() {
  return <PeristalticPump label="Aspiration" angle={aspirationPumpAngle} tube="tubeSpent" />;
}
