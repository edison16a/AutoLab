"use client";
import { Block } from "../../primitives";
import { ENCLOSURE, PROFILE } from "./layout";

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
const MID = (TOP + FLOOR) / 2;
/** Panels sit in the slots, so they reach a little past the bar faces into the frame. */
const SLOT_DEPTH = 0.03;
const SHEET = 0.02;
const HEIGHT = TOP - FLOOR - PROFILE * 2 + SLOT_DEPTH * 2;
const SPAN_X = X * 2 - PROFILE + SLOT_DEPTH * 2;
const SPAN_Z = Z * 2 - PROFILE + SLOT_DEPTH * 2;

/**
 * Where the camera ribbon leaves the chamber: a rubber grommet in the right
 * panel near the floor, lined up with the FPC route in FPCModel.
 */
const GROMMET = { y: 0.72, z: -0.05 } as const;

/**
 * The clear acrylic walls: both sides, the back and the roof, each held in
 * the slots of the frame around it. The front is the door.
 */
export function Panels() {
  const railY = [FLOOR + PROFILE / 2, TOP - PROFILE / 2];
  return (
    <group>
      {[-X, X].map((x) => (
        <Block key={x} position={[x, MID, 0]} size={[SHEET, HEIGHT, SPAN_Z]} material="acrylic" />
      ))}
      <Block position={[0, MID, -Z]} size={[SPAN_X, HEIGHT, SHEET]} material="acrylic" />
      <Block position={[0, railY[1], 0]} size={[SPAN_X, SHEET, SPAN_Z]} material="acrylic" />
      <group position={[X, GROMMET.y, GROMMET.z]}>
        <Block size={[0.06, 0.1, 0.3]} radius={0.02} material="rubber" />
        <Block size={[0.07, 0.012, 0.22]} material="plasticBlack" />
      </group>
    </group>
  );
}
