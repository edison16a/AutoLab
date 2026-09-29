"use client";
import { CylinderGeometry } from "three";
import { cachedGeometry } from "../../geometries";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";

/**
 * The white plate outside the enclosure, bottom right, that the bare boards
 * sit on. Centre and size in scene units. It stands on four rubber feet, so
 * its top is where the old box floor was and the parts registry positions
 * still land on it.
 */
const PLATE = { x: 3.1, z: 0.35, width: 1.3, depth: 1.9, feet: 0.012, top: 0.06 } as const;

/** The Pi's four mounting holes (see pi/layout.ts) in world space, and the underside of its board. */
const PI = { x: 3.1, z: -0.08, underside: 0.2275, top: 0.2525 } as const;
const PI_HOLES: [number, number][] = [-0.4818, 0.2346].flatMap((x) => [-0.315, 0.315].map((z) => [PI.x + x, PI.z + z] as [number, number]));

/** M2.5 brass hex standoffs from the plate up to the board, one instanced draw. */
const STANDOFF_HEIGHT = PI.underside - PLATE.top;
const STANDOFFS: RepeatItem[] = PI_HOLES.map(([x, z]) => ({ position: [x, PLATE.top + STANDOFF_HEIGHT / 2, z] }));
const STANDOFF_SCALE: Vec3 = [0.034, STANDOFF_HEIGHT, 0.034];
/** Pan head screws through the Pi's holes into the standoffs. */
const SCREWS: RepeatItem[] = PI_HOLES.map(([x, z]) => ({ position: [x, PI.top + 0.008, z] }));
const SCREW_SCALE: Vec3 = [0.024, 0.016, 0.024];

/** Rubber feet near each corner of the plate. */
const FEET: RepeatItem[] = [-1, 1].flatMap((sx) =>
  [-1, 1].map((sz) => ({ position: [PLATE.x + sx * (PLATE.width / 2 - 0.1), PLATE.feet / 2, PLATE.z + sz * (PLATE.depth / 2 - 0.1)] as Vec3 })),
);
const FOOT_SCALE: Vec3 = [0.05, PLATE.feet, 0.05];

/** A mini breadboard the Pico is pushed into, under its registry position. */
const BREADBOARD = { x: 2.82, z: 0.86, width: 0.4, depth: 0.74, top: 0.163 } as const;
const BB_HOLES: RepeatItem[] = [-1, 1].flatMap((side) =>
  [0.165, 0.135].flatMap((dx) =>
    Array.from({ length: 24 }, (_, i) => ({ position: [BREADBOARD.x + side * dx, BREADBOARD.top + 0.0005, BREADBOARD.z + (i - 11.5) * 0.0314] as Vec3 })),
  ),
);
const BB_HOLE_SCALE: Vec3 = [0.012, 0.001, 0.012];

/** Six sides, so the standoffs read as the hex brass ones everyone uses for a Pi. */
function hexGeometry() {
  return cachedGeometry("machine:hex-standoff", () => new CylinderGeometry(1, 1, 1, 6));
}

/**
 * A clean white platform beside the enclosure for the bare Raspberry Pi,
 * the Pico in its breadboard and the pH carrier. No case, so every board
 * stays in view; the Pi stands on brass standoffs with its ports facing
 * out over the right edge, and the camera ribbon drops straight into it.
 */
export function PiPlatform() {
  const plateHeight = PLATE.top - PLATE.feet;
  return (
    <group>
      <Block
        position={[PLATE.x, PLATE.feet + plateHeight / 2, PLATE.z]}
        size={[PLATE.width, plateHeight, PLATE.depth]}
        radius={0.018}
        material="plasticWhite"
      />
      <Repeat items={FEET} shape="cylinderLow" material="rubber" scale={FOOT_SCALE} />
      <Repeat items={STANDOFFS} geometry={hexGeometry()} material="brass" scale={STANDOFF_SCALE} />
      <Repeat items={SCREWS} shape="cylinderLow" material="steel" scale={SCREW_SCALE} />
      <Block
        position={[BREADBOARD.x, (PLATE.top + BREADBOARD.top) / 2, BREADBOARD.z]}
        size={[BREADBOARD.width, BREADBOARD.top - PLATE.top, BREADBOARD.depth]}
        radius={0.01}
        material="plasticWhite"
      />
      <Block position={[BREADBOARD.x, BREADBOARD.top, BREADBOARD.z]} size={[0.03, 0.004, BREADBOARD.depth - 0.04]} material="plasticGrey" />
      <Repeat items={BB_HOLES} material="plasticBlack" scale={BB_HOLE_SCALE} />
    </group>
  );
}
