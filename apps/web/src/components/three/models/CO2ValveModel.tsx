"use client";
import { Block, Cylinder, Tube } from "../primitives";
import type { Vec3 } from "../types";

/**
 * Gas lines relative to the valve, which sits on the enclosure roof at the
 * front left corner. The supply comes up the outside of the left wall; the
 * dosing line drops through the roof and down the inside of the front left
 * post to a diffuser just above the floor.
 */
const SUPPLY: Vec3[] = [
  [-0.24, 0.08, 0],
  [-0.4, 0.06, 0],
  [-0.47, -0.25, 0],
  [-0.47, -2.2, 0.02],
  [-0.47, -4.1, 0.05],
  [-0.44, -4.32, 0.2],
];
const DOSING: Vec3[] = [
  [0.24, 0.08, 0],
  [0.34, 0.02, 0],
  [0.3, -0.3, 0.06],
  [0.05, -0.8, 0.12],
  [-0.05, -1.5, 0.15],
  [-0.05, -3.2, 0.15],
  [-0.03, -3.62, 0.12],
];

/** CO₂ solenoid valve: aluminium manifold, black coil, connector and both gas lines. */
export function CO2ValveModel() {
  return (
    <group>
      <Block position={[0, 0.08, 0]} size={[0.34, 0.16, 0.2]} radius={0.02} material="aluminium" />
      <Cylinder position={[0, 0.26, 0]} radius={0.1} height={0.2} material="plasticBlack" />
      <Cylinder position={[0, 0.38, 0]} radius={0.035} height={0.04} low material="steel" />
      <Block position={[0, 0.27, 0.12]} size={[0.1, 0.12, 0.08]} radius={0.015} material="plasticGrey" />
      {[-1, 1].map((side) => (
        <Cylinder key={side} position={[side * 0.2, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.04} height={0.08} low material="steel" />
      ))}
      <Tube points={SUPPLY} radius={0.028} material="plasticWhite" segments={64} />
      <Tube points={DOSING} radius={0.028} material="plasticWhite" segments={64} />
      <Cylinder position={[-0.03, -3.68, 0.12]} radius={0.05} height={0.1} material="aluminium" />
    </group>
  );
}
