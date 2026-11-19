"use client";
import { Block } from "../../primitives";
import type { MaterialKey } from "../../materials";
import { TROUGHS } from "./labware-layout";

/** An open topped box: a floor and four walls, all one material. In the heated platform's space. */
export function Tray({ z, length, material }: { z: number; length: number; material: MaterialKey }) {
  const { x, top, width, height, wall } = TROUGHS;
  const mid = top + height / 2;
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, top + wall / 2, 0]} size={[width, wall, length]} material={material} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (width / 2 - wall / 2), mid, 0]} size={[wall, height, length]} material={material} />
          <Block position={[0, mid, side * (length / 2 - wall / 2)]} size={[width - wall * 2, height, wall]} material={material} />
        </group>
      ))}
    </group>
  );
}

/**
 * The wash station: a clear trough on the heated plate's left margin where
 * the head parks while a line runs its suction or is flushed with cleaner,
 * so nothing drips on the plate. Low, so a tip carried at full height
 * clears it. The disposal bin in front of it is its own part.
 */
export function Troughs() {
  return <Tray z={TROUGHS.wash.z} length={TROUGHS.wash.length} material="polystyrene" />;
}
