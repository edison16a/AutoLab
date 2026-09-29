"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { CHAMBER_FLOOR, ENCLOSURE, PROFILE } from "./layout";
import { LogoEngraving } from "./LogoEngraving";

const { halfX: X, halfZ: Z, floor: FLOOR } = ENCLOSURE;
const PLINTH = { width: X * 2 + 0.26, depth: Z * 2 + 0.36, bottom: 0.1 } as const;
const PLINTH_HEIGHT = FLOOR - PLINTH.bottom;
const FRONT = PLINTH.depth / 2;

/** Rubber feet just inside the plinth corners. */
const FEET: [number, number][] = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x * (X - 0.1), z * (Z - 0.05)] as [number, number]));

/** Intake slots along the back of the plinth, for the heater and electronics below the floor. */
const VENTS: RepeatItem[] = Array.from({ length: 14 }, (_, i) => ({ position: [(i - 6.5) * 0.16, PLINTH.bottom + PLINTH_HEIGHT / 2, -FRONT - 0.001] }));
const VENT_SCALE: Vec3 = [0.05, 0.16, 0.006];

/**
 * The badge on the front left of the base, where the sketch writes the
 * name: the team logo engraved into the blue powder coat and filled black,
 * then the wordmark screen printed beside it in white.
 */
function Nameplate() {
  const y = PLINTH.bottom + PLINTH_HEIGHT / 2;
  return (
    <group position={[-X, y, FRONT]}>
      <LogoEngraving position={[0.22, 0, 0.002]} height={0.21} material="plasticBlack" />
      <TextDecal text="Autolab" position={[0.86, 0, 0.002]} rotation={[0, 0, 0]} width={0.96} height={0.2} ink="light" weight={700} />
    </group>
  );
}

/**
 * The insulated base the enclosure stands on, powder coated in the
 * Autolab blue: black rubber feet, the white nameplate on the front and
 * the aluminium floor plate that lines the chamber inside the frame.
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
      <Block position={[0, PLINTH.bottom + PLINTH_HEIGHT / 2, 0]} size={[PLINTH.width, PLINTH_HEIGHT, PLINTH.depth]} radius={0.06} material="powderBlue" />
      {/* A dark reveal where the frame meets the base, so the two read as separate pieces. */}
      <Block position={[0, FLOOR + 0.004, 0]} size={[X * 2 + PROFILE + 0.04, 0.008, Z * 2 + PROFILE + 0.04]} material="plasticBlack" />
      <Block position={[0, CHAMBER_FLOOR - 0.01, 0]} size={[spanX, 0.02, spanZ]} material="aluminiumBlasted" />
      <Repeat items={VENTS} material="plasticBlack" scale={VENT_SCALE} />
      <Nameplate />
    </group>
  );
}
