"use client";
import { Block } from "../../primitives";
import { Grommet } from "./Grommet";
import { ENCLOSURE, FOAM, PROFILE } from "./layout";

const { halfX: X, halfZ: Z, top: TOP } = ENCLOSURE;
const TUCK = 0.02;
const HALF_X = X - PROFILE / 2 + TUCK;
const HALF_Z = Z - PROFILE / 2 + TUCK;
const Y = TOP - PROFILE / 2;
/**
 * The viewing window cut into the roof board. It sits over the gantry, so
 * the crossbar, the pipette drive and the sensors on the back rail stay in
 * sight from the usual three quarter view.
 */
const WINDOW = { halfX: 1.62, halfZ: 1.2 } as const;
const SHEET = 0.016;
/** Where the CO₂ dosing line drops through the roof, under the valve. */
const GAS_PORT = { x: -1.613, z: 1.47 } as const;
const TRIM = { width: 0.05, height: 0.012 } as const;

/** Four strips of board round the window: front and back run the full width, the sides fill between. */
const STRIPS = [
  { x: 0, z: (WINDOW.halfZ + HALF_Z) / 2, w: HALF_X * 2, d: HALF_Z - WINDOW.halfZ },
  { x: 0, z: -(WINDOW.halfZ + HALF_Z) / 2, w: HALF_X * 2, d: HALF_Z - WINDOW.halfZ },
  { x: (WINDOW.halfX + HALF_X) / 2, z: 0, w: HALF_X - WINDOW.halfX, d: WINDOW.halfZ * 2 },
  { x: -(WINDOW.halfX + HALF_X) / 2, z: 0, w: HALF_X - WINDOW.halfX, d: WINDOW.halfZ * 2 },
];

/**
 * The roof: a pink foam board with a clear acrylic window let into a
 * rebate just under its top face, edged with a slim aluminium trim that
 * hides the cut foam. The CO₂ line passes through a grommet in the front
 * left corner. The board casts no shadow: the studio key light comes from
 * above, and a shaded chamber would hide the very parts the view is for.
 */
export function Roof() {
  const trimY = Y + FOAM / 2 + TRIM.height / 2;
  return (
    <group>
      {STRIPS.map((strip) => (
        <Block key={`${strip.x}:${strip.z}`} position={[strip.x, Y, strip.z]} size={[strip.w, FOAM, strip.d]} material="foamPink" castShadow={false} />
      ))}
      <Block position={[0, Y + FOAM / 2 - SHEET, 0]} size={[WINDOW.halfX * 2 + 0.06, SHEET, WINDOW.halfZ * 2 + 0.06]} material="acrylic" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[0, trimY, side * WINDOW.halfZ]} size={[WINDOW.halfX * 2 + TRIM.width, TRIM.height, TRIM.width]} material="aluminium" />
          <Block position={[side * WINDOW.halfX, trimY, 0]} size={[TRIM.width, TRIM.height, WINDOW.halfZ * 2 + TRIM.width]} material="aluminium" />
        </group>
      ))}
      <Grommet position={[GAS_PORT.x, Y, GAS_PORT.z]} axis="y" wall={FOAM} radius={0.034} />
    </group>
  );
}
