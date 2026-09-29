"use client";
import { roundedBoxGeometry } from "../../geometries";
import { Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { ExtrusionBars, type Bar } from "./ExtrusionBars";
import { ENCLOSURE, PROFILE } from "./layout";

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
const MID = (TOP + FLOOR) / 2;
const RAIL_Y = [FLOOR + PROFILE / 2, TOP - PROFILE / 2];
const SIDES = [-1, 1] as const;

/** Four posts, then a rail along each edge at the top and bottom. Rails stop at the post faces. */
const BARS: Bar[] = [
  ...SIDES.flatMap((sx) => SIDES.map((sz): Bar => ({ position: [sx * X, MID, sz * Z], length: TOP - FLOOR, axis: "y" }))),
  ...RAIL_Y.flatMap((y) => [
    ...SIDES.map((sz): Bar => ({ position: [0, y, sz * Z], length: X * 2 - PROFILE, axis: "x" })),
    ...SIDES.map((sx): Bar => ({ position: [sx * X, y, 0], length: Z * 2 - PROFILE, axis: "z" })),
  ]),
];

/** Printed three-way corner blocks that cap the top of each post, the rounded knobs in the sketch. */
const CORNER_SIZE = 0.24;
const CORNERS: RepeatItem[] = SIDES.flatMap((sx) => SIDES.map((sz) => ({ position: [sx * X, TOP - PROFILE / 2 + 0.02, sz * Z] as Vec3 })));

const LEG = 0.3;
const PLATE = 0.014;
const WIDTH = 0.11;

/**
 * Flat L gussets on the inside of every rail to post joint. Each is two
 * plates crossing over the joint, one along the rail and one along the
 * post, on the frame face that looks into the chamber. One bolt per leg.
 */
function gussets() {
  const plates: RepeatItem[] = [];
  const bolts: RepeatItem[] = [];
  for (const sx of SIDES)
    for (const sz of SIDES)
      for (const [level, y] of RAIL_Y.entries()) {
        const up = level === 0 ? 1 : -1;
        // One gusset on the front or back face (rail along X) and one on the side face (rail along Z).
        for (const along of ["x", "z"] as const) {
          const onX = along === "x";
          // Move toward the chamber off the face, and along the rail toward the middle.
          const inset = PROFILE / 2 + PLATE / 2;
          const x = onX ? sx * X : sx * (X - inset);
          const z = onX ? sz * (Z - inset) : sz * Z;
          const reach = (d: number): Vec3 => (onX ? [x - sx * d, y, z] : [x, y, z - sz * d]);
          const plate = (along: number, tall: number): Vec3 => (onX ? [along, tall, PLATE] : [PLATE, tall, along]);
          plates.push({ position: reach(LEG / 2 - WIDTH / 2), scale: plate(LEG, WIDTH) });
          plates.push({ position: [x, y + up * (LEG / 2 - WIDTH / 2), z], scale: plate(WIDTH, LEG) });
          // Bolt heads stand proud of the plate, facing into the chamber.
          const turn: Vec3 = onX ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
          const head = PLATE / 2 + 0.007;
          const railBolt = reach(LEG - WIDTH);
          const postBolt: Vec3 = [x, y + up * (LEG - WIDTH), z];
          for (const bolt of [railBolt, postBolt]) {
            if (onX) bolt[2] -= sz * head;
            else bolt[0] -= sx * head;
            bolts.push({ position: bolt, rotation: turn });
          }
        }
      }
  return { plates, bolts };
}

const { plates: GUSSETS, bolts: GUSSET_BOLTS } = gussets();
const BOLT_SCALE: Vec3 = [0.026, 0.014, 0.026];

/**
 * The enclosure's skeleton: black 2020 V-slot posts and rails, printed
 * corner blocks on top and gusset plates bolted inside every joint.
 */
export function EnclosureFrame() {
  return (
    <group>
      <ExtrusionBars bars={BARS} />
      <Repeat items={CORNERS} geometry={roundedBoxGeometry(CORNER_SIZE, CORNER_SIZE, CORNER_SIZE, 0.05)} material="plasticBlack" />
      <Repeat items={GUSSETS} material="graphite" />
      <Repeat items={GUSSET_BOLTS} shape="cylinderLow" material="steel" scale={BOLT_SCALE} />
    </group>
  );
}
