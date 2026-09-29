"use client";
import { Block, Cylinder, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";

/** The open box outside the enclosure, bottom right. Centre and outside size in scene units. */
const BOX = { x: 3.1, z: 0.35, width: 1.3, depth: 2.0, height: 0.48, wall: 0.05, floor: 0.06 } as const;
const LEFT = BOX.x - BOX.width / 2;
const RIGHT = BOX.x + BOX.width / 2;
const BACK = BOX.z - BOX.depth / 2;
const FRONT = BOX.z + BOX.depth / 2;
/** Opening in the right wall for the Pi's USB and Ethernet ports. */
const PORTS = { back: -0.46, front: 0.3, sill: 0.2 } as const;
/** Hex standoffs under the Pi's four mounting holes (see pi/layout.ts), up to the board's underside. */
const PI = { x: 3.1, z: -0.08, underside: 0.2275 } as const;
const PI_HOLES: [number, number][] = [-0.4818, 0.2346].flatMap((x) => [-0.315, 0.315].map((z) => [PI.x + x, PI.z + z] as [number, number]));
/** A mini breadboard the Pico is pushed into, under its registry position. */
const BREADBOARD = { x: 2.82, z: 0.86, width: 0.4, depth: 0.74, top: 0.163 } as const;
const BB_HOLES: RepeatItem[] = [-1, 1].flatMap((side) =>
  [0.165, 0.135].flatMap((dx) =>
    Array.from({ length: 24 }, (_, i) => ({ position: [BREADBOARD.x + side * dx, BREADBOARD.top + 0.0005, BREADBOARD.z + (i - 11.5) * 0.0314] as Vec3 })),
  ),
);
const BB_HOLE_SCALE: Vec3 = [0.012, 0.001, 0.012];
/** Vent slots along the front wall. */
const VENTS: RepeatItem[] = Array.from({ length: 9 }, (_, i) => ({ position: [BOX.x + (i - 4) * 0.1, 0.28, FRONT + 0.001] as Vec3 }));
const VENT_SCALE: Vec3 = [0.045, 0.2, 0.004];

/** A wall piece from `from` to `to` in X and Z, standing from the floor up to `top`. */
function Wall({ from, to, bottom = BOX.floor, top = BOX.height }: { from: [number, number]; to: [number, number]; bottom?: number; top?: number }) {
  const size: Vec3 = [Math.max(BOX.wall, Math.abs(to[0] - from[0])), top - bottom, Math.max(BOX.wall, Math.abs(to[1] - from[1]))];
  return <Block position={[(from[0] + to[0]) / 2, (bottom + top) / 2, (from[1] + to[1]) / 2]} size={size} radius={0.015} material="plasticWhite" />;
}

/**
 * The electronics box beside the enclosure: an open white tray holding the
 * Raspberry Pi on standoffs (its ports out through a cut in the right
 * wall), the Pico in a mini breadboard and the pH carrier. Open on top so
 * the boards stay in view, with vents along the front.
 */
export function ElectronicsBox() {
  const w = BOX.wall / 2;
  return (
    <group>
      <Block position={[BOX.x, BOX.floor / 2, BOX.z]} size={[BOX.width, BOX.floor, BOX.depth]} radius={0.02} material="plasticWhite" />
      <Wall from={[LEFT + w, BACK]} to={[LEFT + w, FRONT]} />
      <Wall from={[LEFT + BOX.wall, BACK + w]} to={[RIGHT - BOX.wall, BACK + w]} />
      <Wall from={[LEFT + BOX.wall, FRONT - w]} to={[RIGHT - BOX.wall, FRONT - w]} />
      <Wall from={[RIGHT - w, BACK]} to={[RIGHT - w, PORTS.back]} />
      <Wall from={[RIGHT - w, PORTS.front]} to={[RIGHT - w, FRONT]} />
      <Wall from={[RIGHT - w, PORTS.back]} to={[RIGHT - w, PORTS.front]} top={PORTS.sill} />
      <Repeat items={VENTS} material="plasticGrey" scale={VENT_SCALE} />
      {PI_HOLES.map(([x, z]) => (
        <Cylinder key={`${x}${z}`} position={[x, (BOX.floor + PI.underside) / 2, z]} radius={0.03} height={PI.underside - BOX.floor} low material="steel" />
      ))}
      <Block position={[BREADBOARD.x, (BOX.floor + BREADBOARD.top) / 2, BREADBOARD.z]} size={[BREADBOARD.width, BREADBOARD.top - BOX.floor, BREADBOARD.depth]} radius={0.01} material="plasticWhite" />
      <Block position={[BREADBOARD.x, BREADBOARD.top, BREADBOARD.z]} size={[0.03, 0.004, BREADBOARD.depth - 0.04]} material="plasticGrey" />
      <Repeat items={BB_HOLES} material="graphite" scale={BB_HOLE_SCALE} />
    </group>
  );
}
