"use client";
import { ExplodeShift } from "../../explode/ExplodeContext";
import { Block } from "../../primitives";
import { Grommet } from "./Grommet";
import { ENCLOSURE, PROFILE, WALL_EXPLODE } from "./layout";
import { SENSOR_GROMMET } from "./wiring/runs-sensors";
import { TOOL_GROMMET } from "./wiring/runs-tool";

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
const MID = (TOP + FLOOR) / 2;
/** Panels sit in the slots, so they reach a little past the bar faces into the frame. */
const SLOT_DEPTH = 0.03;
const SHEET = 0.02;
const HEIGHT = TOP - FLOOR - PROFILE * 2 + SLOT_DEPTH * 2;
const SPAN_Z = Z * 2 - PROFILE + SLOT_DEPTH * 2;

/**
 * Where the camera ribbon leaves the chamber: a rubber slot in the right
 * panel near the floor, lined up with the FPC route in FPCModel.
 */
const RIBBON_SLOT = { y: 0.72, z: -0.05 } as const;

/**
 * The clear acrylic viewing panel on the right side, held in the slots of
 * the frame around it, with the ribbon slot and the cable grommets let into
 * it. With the door it is the way into the chamber for the eye; the other
 * walls are insulation board (FoamWalls).
 */
export function Panels() {
  return (
    <ExplodeShift offset={[WALL_EXPLODE.right, 0, 0]}>
      <Block position={[X, MID, 0]} size={[SHEET, HEIGHT, SPAN_Z]} material="acrylic" />
      <group position={[X, RIBBON_SLOT.y, RIBBON_SLOT.z]}>
        <Block size={[0.06, 0.1, 0.3]} radius={0.02} material="rubber" />
        <Block size={[0.07, 0.012, 0.22]} material="plasticBlack" />
      </group>
      {/* Where the pipette tool's and the sensors' cables pass out to the boards beside the enclosure. */}
      <Grommet position={TOOL_GROMMET} axis="x" wall={SHEET} radius={0.042} />
      <Grommet position={SENSOR_GROMMET} axis="x" wall={SHEET} radius={0.06} />
    </ExplodeShift>
  );
}
