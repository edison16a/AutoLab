"use client";
import { ExplodeShift } from "../../explode/ExplodeContext";
import { Block } from "../../primitives";
import { Grommet } from "./Grommet";
import { ENCLOSURE, PROFILE, WALL_EXPLODE } from "./layout";
import { MEDIA_GROMMET, TUBE_GROMMET } from "./wiring/runs-fluidics";
import { SENSOR_GROMMET } from "./wiring/runs-sensors";

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
const MID = (TOP + FLOOR) / 2;
/** Panels sit in the slots, so they reach a little past the bar faces into the frame. */
const SLOT_DEPTH = 0.03;
const SHEET = 0.02;
const HEIGHT = TOP - FLOOR - PROFILE * 2 + SLOT_DEPTH * 2;
const SPAN_Z = Z * 2 - PROFILE + SLOT_DEPTH * 2;
const SPAN_X = X * 2 - PROFILE + SLOT_DEPTH * 2;
/** The roof panel sits in the top rails' slots, a little under their top face. */
const ROOF_Y = TOP - PROFILE / 2;
/** The hole in the roof the HEPA unit's diffuser fills, a little inside its flange. */
const HEPA_HOLE = { x: 0, z: -0.2, width: 1.78, depth: 1.28 } as const;
/** Where the CO₂ dosing line passes down through the roof (see GasLines). */
const DOSING_GROMMET = [-1.615, ROOF_Y, 1.48] as const;

/**
 * Where the camera ribbon leaves the chamber: a rubber slot in the right
 * panel near the floor, lined up with the FPC route in FPCModel.
 */
const RIBBON_SLOT = { y: 0.72, z: -0.05 } as const;

/**
 * The roof: a clear sheet round the HEPA unit's opening, drawn as the four
 * strips that frame it.
 */
function Roof() {
  const { x, z, width, depth } = HEPA_HOLE;
  const left = -SPAN_X / 2;
  const right = SPAN_X / 2;
  const back = -SPAN_Z / 2;
  const front = SPAN_Z / 2;
  const strips: [number, number, number, number][] = [
    [left, right, back, z - depth / 2],
    [left, right, z + depth / 2, front],
    [left, x - width / 2, z - depth / 2, z + depth / 2],
    [x + width / 2, right, z - depth / 2, z + depth / 2],
  ];
  return (
    <>
      {strips.map(([x0, x1, z0, z1]) => (
        <Block key={`${x0}${z0}`} position={[(x0 + x1) / 2, ROOF_Y, (z0 + z1) / 2]} size={[x1 - x0, SHEET, z1 - z0]} material="acrylic" />
      ))}
      <Grommet position={[...DOSING_GROMMET]} axis="y" wall={SHEET} radius={0.04} />
    </>
  );
}

/**
 * The enclosure's clear acrylic panels, held in the slots of the frame
 * around them: the right viewing panel with the camera ribbon slot and the
 * sensor cable grommet, the left panel with the grommets the fluid lines
 * pass through to the fluidics platform, the back panel, and the roof round
 * the HEPA unit. With the door shut the chamber is closed, so the HEPA
 * unit's filtered air leaves it only through the gaps at the bottom.
 */
export function Panels() {
  return (
    <>
      <ExplodeShift offset={[WALL_EXPLODE.right, 0, 0]}>
        <Block position={[X, MID, 0]} size={[SHEET, HEIGHT, SPAN_Z]} material="acrylic" />
        <group position={[X, RIBBON_SLOT.y, RIBBON_SLOT.z]}>
          <Block size={[0.06, 0.1, 0.3]} radius={0.02} material="rubber" />
          <Block size={[0.07, 0.012, 0.22]} material="plasticBlack" />
        </group>
        {/* Where the sensors' cables pass out to the Pi beside the enclosure. */}
        <Grommet position={SENSOR_GROMMET} axis="x" wall={SHEET} radius={0.06} />
      </ExplodeShift>
      <ExplodeShift offset={[-WALL_EXPLODE.left, 0, 0]}>
        <Block position={[-X, MID, 0]} size={[SHEET, HEIGHT, SPAN_Z]} material="acrylic" />
        <Grommet position={TUBE_GROMMET} axis="x" wall={SHEET} radius={0.075} />
        <Grommet position={MEDIA_GROMMET} axis="x" wall={SHEET} radius={0.045} />
      </ExplodeShift>
      <ExplodeShift offset={[0, 0, -WALL_EXPLODE.back]}>
        <Block position={[0, MID, -Z]} size={[SPAN_X, HEIGHT, SHEET]} material="acrylic" />
      </ExplodeShift>
      <ExplodeShift offset={[0, WALL_EXPLODE.roof, 0]}>
        <Roof />
      </ExplodeShift>
    </>
  );
}
