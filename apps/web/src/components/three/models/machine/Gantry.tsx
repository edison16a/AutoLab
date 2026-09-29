"use client";
import { ExtrusionBars, type Bar } from "./ExtrusionBars";
import { GANTRY, MOTION, PROFILE } from "./layout";
import { XChain } from "./wiring/XChain";
import { XAxis } from "./XAxis";
import { YAxis } from "./YAxis";
import { ZAxis } from "./ZAxis";

export { GANTRY } from "./layout";

const { halfX: X, z: Z, top: TOP } = GANTRY;
const UPRIGHT_LENGTH = TOP - MOTION.footTop;

/** The two 2040 uprights, standing deep along Z like the Ender's. */
const UPRIGHTS: Bar[] = [-X, X].map((x) => ({ position: [x, MOTION.footTop + UPRIGHT_LENGTH / 2, Z], length: UPRIGHT_LENGTH, axis: "y" }));
/** The 2020 crossbar that ties the upright tops together. */
const CROSSBAR: Bar[] = [{ position: [0, TOP + PROFILE / 2, Z], length: X * 2 + PROFILE, axis: "x" }];

/**
 * The printer's motion system, reshaped as an arch over the fixed plate:
 * uprights on Y rods, a crossbar on top, and the X beam lifted between
 * them on twin lead screws, carrying the pipette tool, whose cables ride
 * in a drag chain behind the beam.
 */
export function Gantry() {
  return (
    <group>
      <ExtrusionBars bars={UPRIGHTS} profile="2040" caps />
      <ExtrusionBars bars={CROSSBAR} caps />
      <YAxis />
      <ZAxis />
      <XAxis />
      <XChain />
    </group>
  );
}
