"use client";
import { Block } from "../../primitives";
import type { Vec3 } from "../../types";

export interface ExtrusionProps {
  /** Centre of the bar. */
  position: Vec3;
  length: number;
  axis?: "x" | "y" | "z";
  /** Cross section: 2020 is 0.16 x 0.16. 2040 is 0.16 x 0.32, deep along Z when standing and along Y when lying. */
  profile?: "2020" | "2040";
}

const WIDTH = 0.16;
const SLOT = 0.045;

/**
 * A black anodised aluminium extrusion with a dark slot down each face.
 * Built from a few scaled unit boxes, so a whole frame costs almost nothing.
 */
export function Extrusion({ position, length, axis = "y", profile = "2020" }: ExtrusionProps) {
  const deep = profile === "2040" ? WIDTH * 2 : WIDTH;
  // Maps (width side, deep side, length) onto world (x, y, z) for the bar's axis.
  const along = (a: number, b: number, c: number): Vec3 => (axis === "x" ? [c, b, a] : axis === "z" ? [a, b, c] : [a, c, b]);
  const inset = length - 0.03;
  return (
    <group position={position}>
      <Block size={along(WIDTH, deep, length)} radius={0.012} material="graphite" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={along(side * (WIDTH / 2 + 0.001), 0, 0)} size={along(0.004, SLOT, inset)} material="plasticBlack" />
          <Block position={along(0, side * (deep / 2 + 0.001), 0)} size={along(SLOT, 0.004, inset)} material="plasticBlack" />
        </group>
      ))}
    </group>
  );
}
