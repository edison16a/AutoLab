"use client";
import { Block, Cylinder, Ring } from "../../primitives";
import { LeadScrew } from "./motion-parts";
import { GANTRY, PROFILE, TOOL } from "./layout";

const { x: X, z: Z, driveZ: DRIVE_Z } = TOOL;
/** Front face of the X carriage plate, which the tool's backplate is bolted to. */
const MOUNT_Z = GANTRY.beamZ + PROFILE / 2 + 0.045;
const PLATE = { thickness: 0.03, bottom: 1.86, top: 3.485, half: 0.26 } as const;
const PLATE_Z = MOUNT_Z + PLATE.thickness / 2;
const PLATE_FRONT = MOUNT_Z + PLATE.thickness;
/** Underside of the pipette motor, which sits shaft down on the shelf. */
const MOTOR_FACE = 3.525;
/** The plunger drive at rest: where the nut block rides on the screw and guide. */
const NUT_Y = 3.2;
const GUIDE_X = X + 0.17;
const COLLARS = [1.96, 2.34];

/** The printed parts that hold the pipette: two collars round its body, a spine and the HX711 side plate. */
function PipetteMount() {
  return (
    <group>
      {COLLARS.map((y) => (
        <group key={y} position={[X, y, Z]}>
          <Ring radius={0.13} material="plaGrey" />
          <Block position={[0, 0, -0.14]} size={[0.16, 0.08, 0.1]} radius={0.015} material="plaGrey" />
        </group>
      ))}
      <Block position={[X, (COLLARS[0] + COLLARS[1]) / 2, PLATE_FRONT + 0.03]} size={[0.2, COLLARS[1] - COLLARS[0] + 0.1, 0.06]} radius={0.02} material="plaGrey" />
      <Block position={[X + 0.2, 2.2, Z - 0.02]} size={[0.02, 0.5, 0.32]} radius={0.008} material="plaGrey" />
      <Block position={[X + 0.17, 2.2, PLATE_FRONT + 0.03]} size={[0.08, 0.5, 0.06]} radius={0.01} material="plaGrey" />
    </group>
  );
}

/** Motor shelf, coupler and lead screw, the linear guide with its block, and the nut block that pushes the load cell. */
function PlungerDrive() {
  return (
    <group>
      <Block position={[X, MOTOR_FACE - 0.02, DRIVE_Z]} size={[0.58, 0.04, 0.56]} material="plaGrey" />
      <Cylinder position={[X, MOTOR_FACE - 0.19, DRIVE_Z]} radius={0.055} height={0.17} material="aluminium" />
      {[-0.04, 0.04].map((dy) => (
        <Ring key={dy} position={[X, MOTOR_FACE - 0.19 + dy, DRIVE_Z]} radius={0.056} thin material="plasticBlack" />
      ))}
      <LeadScrew base={[X, 2.92, DRIVE_Z]} length={MOTOR_FACE - 0.28 - 2.92} radius={0.024} />
      <Block position={[GUIDE_X, 3.18, PLATE_FRONT + 0.02]} size={[0.05, 0.66, 0.04]} material="steel" />
      <Block position={[GUIDE_X, NUT_Y, PLATE_FRONT + 0.06]} size={[0.11, 0.15, 0.06]} radius={0.012} material="steel" />
      {/* Nut block: bridges the screw and the guide, and reaches forward over the load cell. */}
      <Block position={[X + 0.05, NUT_Y, (PLATE_FRONT + Z + 0.07) / 2 + 0.005]} size={[0.38, 0.1, Z + 0.07 - PLATE_FRONT]} radius={0.02} material="plaGrey" />
      <Cylinder position={[X, NUT_Y - 0.085, DRIVE_Z]} radius={0.045} height={0.07} material="brass" />
      {/* Flag that trips the home switch at the top of travel. */}
      <Block position={[X + 0.3, NUT_Y + 0.06, DRIVE_Z + 0.02]} size={[0.2, 0.02, 0.06]} material="aluminium" />
      {/* Pusher under the load cell, resting on the pipette's plunger button. */}
      <Cylinder position={[X, 2.555, Z]} radius={0.07} height={0.03} material="plaGrey" />
    </group>
  );
}

/**
 * The fixed structure of the motorized pipette tool, as in the pipette
 * deep dive sketch: a printed backplate on the X carriage, the motor
 * shelf, lead screw, linear guide and nut block, and the printed mount
 * that holds the pipette. The printed parts are light grey PLA; the guide
 * is bare steel and the lead screw nut brass. The selectable parts (motor,
 * AS5600, home switch, load cell, HX711, pipette) are placed on this by
 * the registry.
 */
export function ToolCarriage() {
  const { bottom, top, half, thickness } = PLATE;
  return (
    <group>
      <Block position={[X, (bottom + top) / 2, PLATE_Z]} size={[half * 2, top - bottom, thickness]} material="plaGrey" />
      {/* Tab the home switch is screwed to. */}
      <Block position={[X + half + 0.1, 3.44, PLATE_Z]} size={[0.24, 0.2, thickness]} radius={0.015} material="plaGrey" />
      <PlungerDrive />
      <PipetteMount />
    </group>
  );
}
