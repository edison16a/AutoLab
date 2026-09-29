"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { CHAMBER_FLOOR, ENCLOSURE, PROFILE } from "./layout";

const { halfX: X, halfZ: Z, floor: FLOOR } = ENCLOSURE;
const PLINTH = { width: X * 2 + 0.26, depth: Z * 2 + 0.36, bottom: 0.1 } as const;
const PLINTH_HEIGHT = FLOOR - PLINTH.bottom;
const FRONT = PLINTH.depth / 2;

/** Rubber feet just inside the plinth corners. */
const FEET: [number, number][] = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x * (X - 0.1), z * (Z - 0.05)] as [number, number]));

/** Intake slots along the back of the plinth, for the heater and electronics below the floor. */
const VENTS: RepeatItem[] = Array.from({ length: 14 }, (_, i) => ({ position: [(i - 6.5) * 0.16, PLINTH.bottom + PLINTH_HEIGHT / 2, -FRONT - 0.001] }));
const VENT_SCALE: Vec3 = [0.05, 0.16, 0.006];

/** The recessed nameplate on the front left of the base, as in the sketch. */
function Nameplate() {
  const y = PLINTH.bottom + PLINTH_HEIGHT / 2;
  const x = -X + 0.95;
  return (
    <group position={[x, y, FRONT]}>
      <Block size={[1.16, 0.2, 0.014]} radius={0.006} material="plasticBlack" />
      <TextDecal text="Autolab" position={[0, 0, 0.008]} rotation={[0, 0, 0]} width={0.96} height={0.17} ink="light" weight={700} />
    </group>
  );
}

/**
 * The white insulated base the enclosure stands on: rubber feet, the
 * nameplate on the front and the aluminium floor plate that lines the
 * chamber inside the frame.
 */
export function Base() {
  const spanX = X * 2 - PROFILE;
  const spanZ = Z * 2 - PROFILE;
  return (
    <group>
      {FEET.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, PLINTH.bottom / 2, z]}>
          <Cylinder radius={0.15} height={PLINTH.bottom} taper={1.12} material="rubber" />
          <Cylinder position={[0, PLINTH.bottom / 2 - 0.004, 0]} radius={0.06} height={0.01} low material="steel" />
        </group>
      ))}
      <Block position={[0, PLINTH.bottom + PLINTH_HEIGHT / 2, 0]} size={[PLINTH.width, PLINTH_HEIGHT, PLINTH.depth]} radius={0.06} material="plasticWhite" />
      {/* A dark reveal where the frame meets the base, so the two read as separate pieces. */}
      <Block position={[0, FLOOR + 0.004, 0]} size={[X * 2 + PROFILE + 0.04, 0.008, Z * 2 + PROFILE + 0.04]} material="plasticBlack" />
      <Block position={[0, CHAMBER_FLOOR - 0.01, 0]} size={[spanX, 0.02, spanZ]} material="aluminium" />
      <Repeat items={VENTS} material="plasticBlack" scale={VENT_SCALE} />
      <Nameplate />
    </group>
  );
}
