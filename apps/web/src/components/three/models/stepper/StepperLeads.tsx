"use client";
import { Block, Cylinder, Tube } from "../../primitives";
import type { Vec3 } from "../../types";

/** The team's motor has red, blue, green and black leads, in that order across the plug. */
const LEADS = ["wireRed", "wireBlue", "wireGreen", "wireBlack"] as const;
const PITCH = 0.03;
const RADIUS = 0.0085;

export interface StepperLeadsProps {
  /** Centre of the socket's mouth on the motor's side, in motor space. */
  socket: Vec3;
}

/**
 * The motor cable: a white JST plug pushed into the socket, its four
 * coloured leads bending back along the motor, and the black sleeve that
 * gathers them into one cable heading off to the driver.
 */
export function StepperLeads({ socket: [x, y, z] }: StepperLeadsProps) {
  const out = x + 0.07;
  const drop = out + 0.07;
  return (
    <group>
      <Block position={[x + 0.035, y, z]} size={[0.07, 0.05, 0.16]} radius={0.006} material="plasticWhite" />
      {LEADS.map((material, i) => {
        const dz = (i - 1.5) * PITCH;
        const points: Vec3[] = [
          [out - 0.005, y, z + dz],
          [out + 0.04, y, z + dz],
          [drop, y - 0.05, z + dz * 0.85],
          [drop, y - 0.15, z + dz * 0.55],
          [drop, y - 0.21, z + dz * 0.4],
        ];
        return <Tube key={material} points={points} radius={RADIUS} material={material} segments={20} />;
      })}
      <Cylinder position={[drop, y - 0.26, z]} radius={0.034} height={0.12} material="rubber" />
    </group>
  );
}
