"use client";
import { Cylinder, Ring } from "../../primitives";
import type { Vec3 } from "../../types";

export interface GrommetProps {
  /** Centre of the hole, halfway through the wall. */
  position: Vec3;
  /** The wall's normal: which way the cable passes through. */
  axis: "x" | "y" | "z";
  /** Wall thickness, so a lip shows on both faces. */
  wall: number;
  radius?: number;
}

/** Turns the flat ring and the upright cylinder so both face along the axis. */
const RING_TURN: Record<GrommetProps["axis"], Vec3> = { x: [0, Math.PI / 2, 0], y: [-Math.PI / 2, 0, 0], z: [0, 0, 0] };
const TUBE_TURN: Record<GrommetProps["axis"], Vec3> = { x: [0, 0, Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };

/**
 * A black rubber grommet where a cable passes through a panel: a rolled lip
 * on each face and a sleeve lining the hole, so the cable never chafes on
 * the cut edge.
 */
export function Grommet({ position, axis, wall, radius = 0.032 }: GrommetProps) {
  const i = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const lip = (side: number): Vec3 => {
    const at: Vec3 = [...position];
    at[i] += side * (wall / 2 + 0.004);
    return at;
  };
  return (
    <group>
      <Ring position={lip(-1)} rotation={RING_TURN[axis]} radius={radius} material="rubber" />
      <Ring position={lip(1)} rotation={RING_TURN[axis]} radius={radius} material="rubber" />
      <Cylinder position={position} rotation={TUBE_TURN[axis]} radius={radius * 0.95} height={wall + 0.004} low material="rubber" />
    </group>
  );
}
