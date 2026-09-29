"use client";
import { Block, Cylinder, Ring } from "../../primitives";

/** The pipette axis and the drive axis just behind it, matching the parts data. */
const TOOL = { x: -0.35, z: 0.05, driveZ: -0.1 } as const;

/**
 * The fixed structure of the motorized pipette tool: the printed backplate
 * on the X carriage, the motor shelf, linear guide, lead screw and nut
 * block, and the clamp that holds the pipette. The selectable parts (motor,
 * encoder, switch, load cell, HX711, pipette) mount onto this.
 */
export function ToolCarriage() {
  const { x, z, driveZ } = TOOL;
  return (
    <group>
      {/* X carriage plate and the printed backplate. */}
      <Block position={[x, 3.05, -0.2]} size={[0.62, 0.62, 0.04]} radius={0.02} material="aluminium" />
      <Block position={[x, 2.7, -0.15]} size={[0.5, 1.7, 0.06]} radius={0.03} material="plasticGrey" />
      <Block position={[x, 3.54, driveZ]} size={[0.58, 0.04, 0.58]} radius={0.02} material="plasticGrey" />
      {/* Linear guide rail and its block. */}
      <Block position={[x + 0.23, 2.95, -0.1]} size={[0.06, 1.1, 0.05]} material="steel" />
      <Block position={[x + 0.23, 3.19, -0.05]} size={[0.14, 0.16, 0.08]} radius={0.015} material="aluminium" />
      {/* Lead screw and coupler, then the nut block that pushes the load cell. */}
      <Cylinder position={[x, 3.26, driveZ]} radius={0.028} height={0.58} low material="steel" />
      <Cylinder position={[x, 3.47, driveZ]} radius={0.06} height={0.1} material="aluminium" />
      <Block position={[x + 0.05, 3.2, -0.03]} size={[0.4, 0.1, 0.3]} radius={0.02} material="aluminium" />
      {/* Little bracket the home switch sits on, at the top of the travel. */}
      <Block position={[x + 0.36, 3.315, -0.1]} size={[0.26, 0.05, 0.1]} radius={0.015} material="plasticGrey" />
      {/* Printed pipette clamp: a spine, two bands round the body and a side plate for the HX711. */}
      <Block position={[x, 2.2, -0.08]} size={[0.3, 0.5, 0.1]} radius={0.03} material="plasticGrey" />
      {[2.0, 2.36].map((y) => (
        <Ring key={y} position={[x, y, z]} radius={0.12} material="plasticGrey" />
      ))}
      <Block position={[x + 0.2, 2.2, z - 0.02]} size={[0.04, 0.46, 0.3]} radius={0.015} material="plasticGrey" />
    </group>
  );
}
