"use client";
import { Block, Bolt, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { StepperMotorModel } from "../StepperMotorModel";
import { ExtrusionBars, type Bar } from "./ExtrusionBars";
import { GANTRY, MOTION, PROFILE, TOOL } from "./layout";
import { Belt, Pulley, VWheels } from "./motion-parts";

const { beamY: BEAM_Y, beamZ: BEAM_Z } = GANTRY;
const BEAM: Bar[] = [{ position: [0, BEAM_Y, BEAM_Z], length: MOTION.beamHalf * 2, axis: "x" }];
const BEAM_BACK = BEAM_Z - PROFILE / 2;
const BEAM_TOP = BEAM_Y + PROFILE;
/** Motor pulley on the left, idler on the right, both above the beam on its centre plane. */
const DRIVE: Vec3 = [-1.05, MOTION.beltY, BEAM_Z];
const IDLER: Vec3 = [1.45, MOTION.beltY, BEAM_Z];
const MOTOR_HALF = 0.245;

/** The carriage plate sits just proud of the beam's front face. */
const CARRIAGE = { z: BEAM_Z + PROFILE / 2 + 0.03, width: 0.62, height: 0.66 } as const;
/** Four wheels, two rolling on the beam's top face and two on its bottom, axles along Z. */
const WHEELS: RepeatItem[] = [-0.2, 0.2].flatMap((dx) =>
  [-1, 1].map((side) => ({
    position: [TOOL.x + dx, BEAM_Y + side * (PROFILE + 0.058), BEAM_Z] as Vec3,
    rotation: [Math.PI / 2, 0, 0] as Vec3,
  })),
);
const CARRIAGE_BOLTS: Vec3[] = [-0.2, 0.2].flatMap((dx) => [-1, 1].map((side) => [TOOL.x + dx, BEAM_Y + side * (PROFILE + 0.058), CARRIAGE.z + 0.02] as Vec3));

/**
 * The X axis: the 2040 beam between the Z carriages, the motor behind its
 * left end, a GT2 belt above it to the tensioned idler on the right, and
 * the wheeled carriage the pipette tool hangs from. The plates and the
 * tensioner are the Ender's own, black anodised; the pulleys are bare
 * aluminium.
 */
export function XAxis() {
  const motorZ = BEAM_BACK - 0.02 - MOTOR_HALF;
  return (
    <group>
      <ExtrusionBars bars={BEAM} profile="2040" />
      <group position={[DRIVE[0], DRIVE[1], motorZ]} rotation={[Math.PI / 2, 0, 0]}>
        <StepperMotorModel />
      </group>
      {/* Motor plate bolted to the back of the beam. */}
      <Block position={[DRIVE[0], (BEAM_Y + DRIVE[1] + 0.3) / 2, BEAM_BACK - 0.01]} size={[0.6, DRIVE[1] + 0.3 - BEAM_Y, 0.02]} material="blackAnodised" />
      <Pulley position={DRIVE} rotation={[Math.PI / 2, 0, 0]} />
      <Pulley position={IDLER} rotation={[Math.PI / 2, 0, 0]} />
      {/* Tensioner: a block on the beam with two cheeks either side of the idler. */}
      <Block position={[IDLER[0] + 0.05, BEAM_TOP + 0.05, BEAM_Z]} size={[0.3, 0.1, 0.2]} radius={0.015} material="blackAnodised" />
      {[-1, 1].map((side) => (
        <Block key={side} position={[IDLER[0], (BEAM_TOP + IDLER[1]) / 2 + 0.05, BEAM_Z + side * 0.07]} size={[0.2, IDLER[1] - BEAM_TOP + 0.1, 0.02]} radius={0.008} material="blackAnodised" />
      ))}
      <Belt from={DRIVE} to={IDLER} axle="z" />
      <Block position={[TOOL.x, BEAM_Y, CARRIAGE.z]} size={[CARRIAGE.width, CARRIAGE.height, 0.03]} material="blackAnodised" />
      <VWheels items={WHEELS} />
      {CARRIAGE_BOLTS.map((position) => (
        <group key={position.join()} position={position} rotation={[Math.PI / 2, 0, 0]}>
          <Bolt radius={0.03} />
        </group>
      ))}
      {/* Belt clamp on the carriage's top edge, gripping the lower run. */}
      <Block position={[TOOL.x, MOTION.beltY - 0.056, BEAM_Z + 0.04]} size={[0.3, 0.06, 0.16]} radius={0.012} material="plasticBlack" />
    </group>
  );
}
