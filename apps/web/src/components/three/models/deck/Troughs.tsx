"use client";
import { Block } from "../../primitives";
import type { MaterialKey } from "../../materials";
import { RESERVOIR_DEPTH, TROUGHS } from "./labware-layout";

/** An open topped box: a floor and four walls, all one material. */
function Tray({ z, length, material }: { z: number; length: number; material: MaterialKey }) {
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

/** The media in the reservoir, a hair inside its walls so the clear sides don't flicker against it. */
function ReservoirMedia() {
  const { x, top, width, wall, reservoir } = TROUGHS;
  return (
    <Block
      position={[x, top + wall + RESERVOIR_DEPTH / 2, reservoir.z]}
      size={[width - wall * 2 - 0.004, RESERVOIR_DEPTH, reservoir.length - wall * 2 - 0.004]}
      material="mediaPink"
    />
  );
}

/**
 * A clear reagent reservoir of fresh media, kept warm on the heated plate
 * so it goes into the wells at 37 °C, and a stainless chute in front of it that
 * takes spent media and used tips. Both are low, so a tip carried at full
 * height clears them.
 */
export function Troughs() {
  const { reservoir, chute } = TROUGHS;
  return (
    <group>
      <Tray z={reservoir.z} length={reservoir.length} material="polystyrene" />
      <ReservoirMedia />
      <Tray z={chute.z} length={chute.length} material="stainless" />
    </group>
  );
}
