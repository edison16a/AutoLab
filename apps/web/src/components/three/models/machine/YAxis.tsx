"use client";
import { Block, Cylinder } from "../../primitives";
import { Rig } from "../../motion/Rig";
import { StepperMotorModel } from "../StepperMotorModel";
import { CHAMBER_FLOOR, GANTRY, MOTION, Y_RAIL_Y } from "./layout";
import { Belt, Pulley } from "./motion-parts";

const { halfX: X, z: Z } = GANTRY;
/** Rod ends: from behind the gantry's rearmost stop to just short of the bottles. */
const ROD = { back: -1.6, front: 0.74 } as const;
const ROD_LENGTH = ROD.front - ROD.back;
const FOOT = { depth: 0.62, thickness: 0.04 } as const;
/** Inner edge of each foot plate; the Z motor sits on this half. */
const FOOT_INNER = MOTION.screwX - 0.3;
/** The Y belt runs flat beside the right rod, on a pulley under a shaft-down motor. */
const BELT = { x: 1.6, y: CHAMBER_FLOOR + 0.14, back: -1.38, front: 0.64 } as const;

/** An SK8 style rod support: a clamp block on a wider foot. */
function RodSupport({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, CHAMBER_FLOOR + 0.02, 0]} size={[0.34, 0.04, 0.1]} radius={0.01} material="aluminium" />
      <Block position={[0, Y_RAIL_Y, 0]} size={[0.16, 0.17, 0.1]} radius={0.015} material="aluminium" />
    </group>
  );
}

/** One side's fixed rail: the rod and its two supports. */
function Rail({ side }: { side: 1 | -1 }) {
  const x = side * X;
  return (
    <group>
      <Cylinder position={[x, Y_RAIL_Y, (ROD.back + ROD.front) / 2]} rotation={[Math.PI / 2, 0, 0]} radius={0.034} height={ROD_LENGTH} material="steel" />
      <RodSupport x={x} z={ROD.back} />
      <RodSupport x={x} z={ROD.front} />
    </group>
  );
}

/** What rolls along one rail with the gantry: two bearing blocks and the foot plate on top. */
function Carriage({ side }: { side: 1 | -1 }) {
  const x = side * X;
  const footTop = MOTION.footTop;
  const footX = side * ((X + 0.1 + FOOT_INNER) / 2);
  return (
    <group>
      {[-0.19, 0.19].map((dz) => (
        <Block key={dz} position={[x, (Y_RAIL_Y - 0.08 + footTop - FOOT.thickness) / 2, Z + dz]} size={[0.24, footTop - FOOT.thickness - Y_RAIL_Y + 0.08, 0.2]} radius={0.015} material="aluminium" />
      ))}
      <Block position={[footX, footTop - FOOT.thickness / 2, Z]} size={[X + 0.1 - FOOT_INNER, FOOT.thickness, FOOT.depth]} material="blackAnodised" />
    </group>
  );
}

/**
 * The Y axis on the chamber floor: a steel rod each side carrying the foot
 * plates the uprights stand on, and a belt down the right side driven by a
 * motor standing shaft down in the back right corner. Rod supports and
 * bearing blocks are bare aluminium, the foot plates are black anodised
 * like the Ender's, and the brackets added for the conversion are printed
 * in light grey PLA.
 */
export function YAxis() {
  const motorY = BELT.y + 0.1 + 0.245 + 0.06;
  return (
    <group>
      <Rail side={-1} />
      <Rail side={1} />
      <group position={[BELT.x, motorY, BELT.back]} rotation={[Math.PI, 0, 0]}>
        <StepperMotorModel />
      </group>
      {/* Printed bracket that holds the motor up off the floor. */}
      <Block position={[BELT.x, (CHAMBER_FLOOR + motorY - 0.245) / 2, BELT.back - 0.29]} size={[0.5, motorY - 0.245 - CHAMBER_FLOOR, 0.04]} radius={0.01} material="plaGrey" />
      <Block position={[BELT.x, motorY - 0.265, BELT.back - 0.03]} size={[0.56, 0.04, 0.56]} radius={0.01} material="plaGrey" />
      <Pulley position={[BELT.x, BELT.y, BELT.back]} rotation={[Math.PI, 0, 0]} />
      <Pulley position={[BELT.x, BELT.y, BELT.front]} />
      <Block position={[BELT.x, CHAMBER_FLOOR + (BELT.y - CHAMBER_FLOOR) / 2 - 0.03, BELT.front]} size={[0.12, BELT.y - CHAMBER_FLOOR - 0.06, 0.12]} radius={0.01} material="plaGrey" />
      <Belt from={[BELT.x, BELT.y, BELT.back]} to={[BELT.x, BELT.y, BELT.front]} axle="y" />
      <Rig rig="gantry">
        <Carriage side={-1} />
        <Carriage side={1} />
        {/* Clamp that ties the right foot plate to the belt. */}
        <Block position={[BELT.x, (BELT.y + MOTION.footTop) / 2, Z]} size={[0.2, MOTION.footTop - BELT.y, 0.16]} radius={0.01} material="plaGrey" />
      </Rig>
    </group>
  );
}
