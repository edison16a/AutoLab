"use client";
import type { MachinePose } from "../../motion/pose";
import { Spin } from "../../motion/Spin";
import { additionPumpAngle, aspirationPumpAngle } from "../../motion/turns";
import { Block, Cylinder, Repeat, Ring, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import type { FlowLine } from "./flow";
import { FlowTube } from "./FlowTube";
import { PMST100 } from "./pump-spec";

const { flange: FLANGE, motor: MOTOR, head: HEAD, fittings: FITTINGS, tubeRadius: TUBE } = PMST100;
/** Front of the flange, front of the spacer boss and front of the head, from the flange's back face. */
const FLANGE_FRONT = FLANGE.thickness;
const HEAD_BACK = FLANGE_FRONT + HEAD.boss;
const HEAD_FRONT = HEAD_BACK + HEAD.depth;
/** The head's round top: as wide as the head, its top edge where the drawing puts it. */
const LOBE = { radius: HEAD.width / 2, y: HEAD.top - HEAD.width / 2 } as const;
/** The rotor's plane, a little behind the clear cover. */
const ROTOR_Z = HEAD_BACK + HEAD.depth * 0.55;
const ROLLER = { radius: 0.022, length: 0.08, at: 0.07 } as const;
/** The tube lies round the rollers, squeezed against the track. */
const TRACK = ROLLER.at + ROLLER.radius + TUBE;
const FITTING_TOP = -HEAD.bottom;
/** The opaque lower block of the head starts under the tube loop, so the whole rotor shows through the cover. */
const BLOCK_TOP = -(TRACK + TUBE + 0.02);
/** Where each external line pushes onto a fitting's barb: the head side on the right (+X), the valve side on the left. */
const BARB_Y = -FITTINGS.tip + 0.07;

/** Where each line joins the pump, in the pump's space. Both leave straight down off their barbs. */
export const PUMP_PORTS = {
  head: [FITTINGS.spacing, BARB_Y, ROTOR_Z] as Vec3,
  valve: [-FITTINGS.spacing, BARB_Y, ROTOR_Z] as Vec3,
};
/** Where the motor cable leaves its gland under the rear end bell, heading down to the controller. */
export const MOTOR_CABLE: Vec3 = [0, -MOTOR.bell / 2 - 0.06, -MOTOR.length + MOTOR.bellDepth + 0.05];

const ROLLERS: RepeatItem[] = Array.from({ length: PMST100.rollers }, (_, i) => {
  const a = (i * Math.PI * 2) / PMST100.rollers + Math.PI / 4;
  return { position: [Math.cos(a) * ROLLER.at, Math.sin(a) * ROLLER.at, 0] as Vec3, rotation: [Math.PI / 2, 0, 0] as Vec3 };
});
const ROLLER_SCALE: Vec3 = [ROLLER.radius, ROLLER.length, ROLLER.radius];
/** The four panel screws through the flange, on the drawing's 1.575" square. */
const PANEL_SCREWS: RepeatItem[] = [-1, 1].flatMap((sx) =>
  [-1, 1].map((sy) => ({ position: [sx * FLANGE.holes, sy * FLANGE.holes, FLANGE_FRONT + 0.006] as Vec3, rotation: [Math.PI / 2, 0, 0] as Vec3 })),
);
const SCREW_SCALE: Vec3 = [0.03, 0.012, 0.03];
/** The four motor screws on the rear plate, at the corners of its diamond. */
const MOTOR_SCREWS: RepeatItem[] = [0, 1, 2, 3].map((i) => {
  const a = (i * Math.PI) / 2;
  return { position: [Math.cos(a) * 0.2, Math.sin(a) * 0.2, -MOTOR.length - 0.012] as Vec3, rotation: [Math.PI / 2, 0, 0] as Vec3 };
});

/** Up from the valve side fitting, over the top of the rotor and down to the head side fitting. */
function trackPoints(): Vec3[] {
  const arc: Vec3[] = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + 0.38 - (i / 14) * (Math.PI + 0.76);
    arc.push([Math.cos(a) * TRACK, Math.sin(a) * TRACK, ROTOR_Z]);
  }
  return [[-FITTINGS.spacing, FITTING_TOP - 0.02, ROTOR_Z], [-FITTINGS.spacing - 0.01, -0.2, ROTOR_Z], ...arc, [FITTINGS.spacing + 0.01, -0.2, ROTOR_Z], [FITTINGS.spacing, FITTING_TOP - 0.02, ROTOR_Z]];
}
const TRACK_POINTS = trackPoints();

/** The motor behind the panel: two aluminium end bells round the black NEMA 17 stator, the rear plate with its screws, and the cable gland. */
function Motor() {
  const { length, bell, bellDepth, stator } = MOTOR;
  const statorLength = length - bellDepth * 2 - 0.04;
  return (
    <group>
      <Block position={[0, 0, -length + bellDepth / 2]} size={[bell, bell, bellDepth]} radius={0.03} material="aluminiumBlasted" />
      <Block position={[0, 0, -0.04 - bellDepth / 2]} size={[bell, bell, bellDepth]} radius={0.03} material="aluminiumBlasted" />
      <Block position={[0, 0, -length + bellDepth + statorLength / 2]} size={[stator, stator, statorLength]} radius={0.02} material="plasticBlack" />
      {[-0.12, 0, 0.12].map((dz) => (
        <Block key={dz} position={[0, 0, -length + bellDepth + statorLength / 2 + dz]} size={[stator + 0.01, stator + 0.01, 0.012]} radius={0.004} material="graphite" />
      ))}
      {/* Rear plate: a diamond with a screw in each corner and the bearing boss in the middle, as the drawing's back view. */}
      <Block position={[0, 0, -length - 0.004]} rotation={[0, 0, Math.PI / 4]} size={[0.34, 0.34, 0.008]} radius={0.004} material="aluminium" />
      <Repeat items={MOTOR_SCREWS} shape="cylinderLow" material="steel" scale={SCREW_SCALE} />
      <Cylinder position={[0, 0, -length - 0.012]} rotation={[Math.PI / 2, 0, 0]} radius={0.05} height={0.02} material="aluminium" />
      {/* Cable gland under the rear bell. */}
      <Cylinder position={[0, -bell / 2 - 0.03, MOTOR_CABLE[2]]} radius={0.028} height={0.06} low material="plasticBlack" />
    </group>
  );
}

/** The rotor: two plates on the shaft carrying four steel rollers. It turns at the pump's speed in the Home demo. */
function Rotor({ angle }: { angle: (pose: MachinePose) => number }) {
  return (
    <group position={[0, 0, ROTOR_Z]}>
      <Spin axis="z" angle={angle}>
        <Cylinder rotation={[Math.PI / 2, 0, 0]} radius={0.028} height={ROLLER.length + 0.03} material="steel" />
        {[-1, 1].map((side) => (
          <Cylinder key={side} position={[0, 0, (side * (ROLLER.length + 0.012)) / 2]} rotation={[Math.PI / 2, 0, 0]} radius={ROLLER.at + 0.012} height={0.01} material="aluminium" />
        ))}
        <Repeat items={ROLLERS} shape="cylinder" material="steel" scale={ROLLER_SCALE} />
      </Spin>
    </group>
  );
}

/** A tube fitting under the head: its hex body and the barb the line pushes onto. */
function Fitting({ x }: { x: number }) {
  return (
    <group position={[x, 0, ROTOR_Z]}>
      <Cylinder position={[0, FITTING_TOP - 0.05, 0]} radius={0.034} height={0.1} low material="plasticWhite" />
      <Cylinder position={[0, FITTING_TOP - 0.11, 0]} radius={0.04} height={0.025} low material="plasticWhite" />
      <Cylinder position={[0, (FITTING_TOP - 0.12 - FITTINGS.tip) / 2, 0]} radius={0.016} height={FITTINGS.tip + FITTING_TOP - 0.12} low material="plasticWhite" />
      <Cylinder position={[0, -FITTINGS.tip + 0.03, 0]} radius={0.022} height={0.04} taper={0.6} low material="plasticWhite" />
    </group>
  );
}

interface PumpProps {
  label: string;
  angle: (pose: MachinePose) => number;
  line: FlowLine;
}

/**
 * Simply Pumps PMST100 stepper peristaltic pump, from its dimensional
 * drawing: a round black flange that mounts through the fluidics panel,
 * the NEMA 17 (3 A a phase) behind the panel, and in front a four roller
 * head with a clear cover, its tube looped over the rotor and out through
 * two barbed fittings pointing down. On 1/16" ID tubing it moves 0.065 mL
 * a revolution, up to 75 RPM. The rotor turns, and the liquid in the loop
 * moves, while the pump runs in the Home demo. Origin on the shaft's axis,
 * on the flange's back face (the front of the panel), head toward +Z.
 */
function PMST100Pump({ label, angle, line }: PumpProps) {
  const lowerHeight = BLOCK_TOP + HEAD.bottom;
  return (
    <group>
      <Motor />
      <Cylinder position={[0, 0, FLANGE.thickness / 2]} rotation={[Math.PI / 2, 0, 0]} radius={FLANGE.radius} height={FLANGE.thickness} material="plasticBlack" />
      <Repeat items={PANEL_SCREWS} shape="cylinderLow" material="steel" scale={SCREW_SCALE} />
      {/* Spacer boss, then the head: a black back plate and lower block, a clear cover over the rotor, black rims. */}
      <Block position={[0, (HEAD.top - 0.03 - HEAD.bottom + 0.03) / 2, FLANGE_FRONT + HEAD.boss / 2]} size={[HEAD.width - 0.05, HEAD.top + HEAD.bottom - 0.06, HEAD.boss]} radius={0.02} material="plasticBlack" />
      <Cylinder position={[0, LOBE.y, HEAD_BACK + 0.02]} rotation={[Math.PI / 2, 0, 0]} radius={LOBE.radius} height={0.04} material="plasticBlack" />
      <Block position={[0, BLOCK_TOP - lowerHeight / 2, (HEAD_BACK + HEAD_FRONT) / 2]} size={[HEAD.width, lowerHeight, HEAD.depth]} radius={0.025} material="plasticBlack" />
      <Cylinder position={[0, LOBE.y, (HEAD_BACK + 0.04 + HEAD_FRONT) / 2]} rotation={[Math.PI / 2, 0, 0]} radius={LOBE.radius - 0.004} height={HEAD_FRONT - HEAD_BACK - 0.04} material="polystyrene" />
      <Ring position={[0, LOBE.y, HEAD_FRONT]} rotation={[0, 0, 0]} radius={LOBE.radius - 0.003} thin material="plasticBlack" />
      {/* The cover's two thumb screws. */}
      {[-1, 1].map((side) => (
        <Cylinder key={side} position={[side * (LOBE.radius - 0.035), LOBE.y - 0.06, HEAD_FRONT + 0.015]} rotation={[Math.PI / 2, 0, 0]} radius={0.024} height={0.03} low material="steel" />
      ))}
      <Rotor angle={angle} />
      <FlowTube points={TRACK_POINTS} line={line} towardHead radius={TUBE} segments={48} />
      <Fitting x={FITTINGS.spacing} />
      <Fitting x={-FITTINGS.spacing} />
      <TextDecal text="PMST100" position={[0, BLOCK_TOP - lowerHeight * 0.55, HEAD_FRONT + 0.001]} rotation={[0, 0, 0]} width={0.2} height={0.04} ink="light" weight={600} />
      <TextDecal text={label} position={[0, FLANGE.radius - 0.07, FLANGE_FRONT + 0.001]} rotation={[0, 0, 0]} width={0.26} height={0.05} ink="light" weight={600} />
    </group>
  );
}

/** Pump 1 in the sketch: pushes fresh media out of the needle, and runs back to send what's left in the line to waste. */
export function AdditionPumpModel() {
  return <PMST100Pump label="Addition" angle={additionPumpAngle} line="addHead" />;
}

/** Pump 2 in the sketch: draws spent media up through the tip to waste, and runs the other way to flush the line with cleaner. */
export function AspirationPumpModel() {
  return <PMST100Pump label="Aspiration" angle={aspirationPumpAngle} line="aspHead" />;
}
