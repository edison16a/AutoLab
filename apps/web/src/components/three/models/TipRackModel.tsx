"use client";
import { castsShadow, getMaterial } from "../materials";
import { Block, Repeat, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { TIP_RACK, USED_TIPS, tipSocket } from "./deck/labware-layout";
import { perforatedPlate, type PlateHole } from "./geometry/shapes";

const BOX = TIP_RACK.box;
const DECK_Y = TIP_RACK.deckY;
const SOCKET_RADIUS = 0.041;
const USED = new Set(USED_TIPS);

const SOCKETS: PlateHole[] = Array.from({ length: TIP_RACK.cols * TIP_RACK.rows }, (_, i) => {
  const [x, z] = tipSocket(i);
  return { x, z, radius: SOCKET_RADIUS };
});
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
