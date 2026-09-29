"use client";
import { castsShadow, getMaterial } from "../materials";
import { Block, Repeat, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { perforatedPlate, type PlateHole } from "./geometry/shapes";

/** 4 x 6 sockets on a 0.12 unit pitch, a compact rack sized to the space beside the platform. */
const PITCH = 0.12;
const COLS = 4;
const ROWS = 6;
const BOX = { width: 0.56, depth: 0.78, height: 0.5, wall: 0.02 } as const;
const DECK_Y = BOX.height + 0.015;
const SOCKET_RADIUS = 0.041;
/** Two tips already used, so their sockets stand empty. */
const USED = new Set([0, 1]);
const SOCKETS: PlateHole[] = Array.from({ length: COLS * ROWS }, (_, i) => ({
  x: ((i % COLS) - (COLS - 1) / 2) * PITCH,
  z: (Math.floor(i / COLS) - (ROWS - 1) / 2) * PITCH,
  radius: SOCKET_RADIUS,
}));
const TIPS = SOCKETS.filter((_, i) => !USED.has(i));
/** Each tip hangs in the box from its collar; only the collar shows above the deck. */
const COLLARS: RepeatItem[] = TIPS.map(({ x, z }) => ({ position: [x, DECK_Y + 0.03, z] as Vec3 }));
const COLLAR_SCALE: Vec3 = [0.04, 0.05, 0.04];
/** The white filter plug inside each tip, which shows through its open top. */
const FILTERS: RepeatItem[] = TIPS.map(({ x, z }) => ({ position: [x, DECK_Y + 0.045, z] as Vec3 }));
const FILTER_SCALE: Vec3 = [0.03, 0.012, 0.03];

/**
 * A rack of sterile filtered P1000 tips: the blue box that marks a 1000 µL
 * rack, its white tip plate, and the see through blue collars of the tips
 * hanging in the sockets, each with its white filter showing. Two sockets
 * are already empty. Origin at the base.
 */
export function TipRackModel() {
  const { width: w, depth: d, height: h, wall } = BOX;
  return (
    <group>
      <Block position={[0, 0.01, 0]} size={[w, 0.02, d]} material="tipRackBlue" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (w / 2 - wall / 2), h / 2, 0]} size={[wall, h, d]} material="tipRackBlue" />
          <Block position={[0, h / 2, side * (d / 2 - wall / 2)]} size={[w - wall * 2, h, wall]} material="tipRackBlue" />
        </group>
      ))}
      <mesh
        geometry={perforatedPlate("tiprack", w + 0.04, d + 0.04, 0.03, 0.02, SOCKETS)}
        material={getMaterial("plasticWhite")}
        position={[0, DECK_Y, 0]}
        castShadow={castsShadow("plasticWhite")}
        receiveShadow
        dispose={null}
      />
      <Repeat items={FILTERS} shape="cylinderLow" material="plasticWhite" scale={FILTER_SCALE} />
      <Repeat items={COLLARS} shape="cylinder" material="tipBlue" scale={COLLAR_SCALE} />
    </group>
  );
}
