"use client";
import { Block, Cylinder, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { StepperMotorModel } from "../StepperMotorModel";
import { GANTRY, MOTION, PROFILE } from "./layout";
import { LeadScrew, VWheels } from "./motion-parts";

const { halfX: X, z: Z, top: TOP, beamY: BEAM_Y } = GANTRY;
const MOTOR_HALF = 0.245;
const SCREW_BASE = MOTION.footTop + MOTOR_HALF * 2 + 0.16;
const SCREW_TOP = TOP - 0.07;
/** The Z carriage plate rides on the inside face of each upright. */
const PLATE = { x: X - PROFILE / 2 - 0.03, thickness: 0.03, height: 0.66, back: Z - 0.24, front: GANTRY.beamZ + 0.1 } as const;
/** Front and back faces of the 2040 upright, which the wheels roll on. */
const UPRIGHT_FRONT = Z + PROFILE;
const UPRIGHT_BACK = Z - PROFILE;

/** Two wheels on the upright's front face and two on its back, axles along X. */
const WHEELS: RepeatItem[] = [-1, 1].flatMap((side) =>
  [UPRIGHT_FRONT + 0.06, UPRIGHT_BACK - 0.06].flatMap((z) =>
    [-0.22, 0.22].map((dy) => ({ position: [side * X, BEAM_Y + dy, z] as Vec3, rotation: [0, 0, Math.PI / 2] as Vec3 })),
  ),
);

/** One side's drive: motor on the foot plate, coupler, screw, top bearing, carriage plate and nut. */
function Side({ side }: { side: 1 | -1 }) {
  const screwX = side * MOTION.screwX;
  const plateX = side * PLATE.x;
  const plateDepth = PLATE.front - PLATE.back;
  const nutY = BEAM_Y - 0.2;
  return (
    <group>
      <group position={[screwX, MOTION.footTop + MOTOR_HALF, Z]} rotation={[0, side === 1 ? Math.PI : 0, 0]}>
        <StepperMotorModel />
      </group>
      <Cylinder position={[screwX, SCREW_BASE - 0.05, Z]} radius={0.06} height={0.16} material="aluminium" />
      <LeadScrew base={[screwX, SCREW_BASE, Z]} length={SCREW_TOP - SCREW_BASE} />
      {/* Flange bearing hung under the crossbar. */}
      <Block position={[screwX, TOP - 0.035, Z]} size={[0.24, 0.07, 0.14]} radius={0.015} material="aluminium" />
      <Cylinder position={[screwX, TOP - 0.08, Z]} radius={0.045} height={0.03} material="steel" />
      {/* Carriage plate, with the nut arm reaching back to the screw. */}
      <Block position={[plateX, BEAM_Y, (PLATE.back + PLATE.front) / 2]} size={[PLATE.thickness, PLATE.height, plateDepth]} material="blackAnodised" />
      <Block position={[(plateX + screwX) / 2, nutY, Z]} size={[Math.abs(plateX - screwX) + 0.04, 0.08, 0.2]} radius={0.015} material="blackAnodised" />
      <Cylinder position={[screwX, nutY, Z]} radius={0.05} height={0.14} material="brass" />
      <Cylinder position={[screwX, nutY + 0.075, Z]} radius={0.075} height={0.02} material="brass" />
    </group>
  );
}

/**
 * The Z axis, doubled like the Ender-3 V3 SE: a motor on each foot plate
 * turns a lead screw that lifts a carriage plate riding the upright on
 * V-wheels. The X beam spans between the two plates. As on the Ender, the
 * plates and nut arms are black anodised and the lead screw nuts are brass.
 */
export function ZAxis() {
  return (
    <group>
      <Side side={-1} />
      <Side side={1} />
      <VWheels items={WHEELS} />
    </group>
  );
}
