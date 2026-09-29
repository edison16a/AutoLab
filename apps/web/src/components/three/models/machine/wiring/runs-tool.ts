/**
 * The pipette tool's cables. The Pico drives the pipette motor and reads
 * the AS5600, the home switch and the HX711, so everything on the tool
 * gathers at the top of the pipette drive, rides the X chain, climbs the
 * left upright, crosses the gantry behind the top crossbar, comes down
 * the right upright and leaves through a grommet in the side panel to
 * the Pico's breadboard outside.
 */
import type { MaterialKey } from "../../../materials";
import type { RepeatItem } from "../../../primitives";
import type { Vec3 } from "../../../types";
import { fanOut } from "./fan-out";
import type { WireRun } from "./harness-geometry";
import { X_CHAIN } from "./XChain";

const TOOL: MaterialKey[] = ["wireRed", "wireBlack", "wireBlue", "wireGreen", "wireYellow", "wireWhite"];
/** The HX711's output header in the order it is printed: GND, DT, SCK, VCC. */
const HX711: MaterialKey[] = ["wireBlack", "wireYellow", "wireWhite", "wireRed"];
const TIES = 0.36;
const UPPER = X_CHAIN.y + X_CHAIN.radius * 2;
/** The front lane on each upright's outer face, and the lane behind the top crossbar. */
const FACE = 1.975;
const LANE = -0.46;
const CROSSBAR = { y: 4.12, z: -0.665 } as const;

/** Where the tool's cables leave the side panel, just above the foot plates. */
export const TOOL_GROMMET: Vec3 = [2.2, 0.8, LANE];

/** From the top of the pipette motor's lead sleeve, back behind the crossbar's front edge and into the chain. */
const INTO_CHAIN: WireRun = {
  wires: TOOL,
  ties: TIES,
  points: [
    [0.11, 4.27, -0.1],
    [0.11, 4.315, -0.16],
    [0.07, 4.3, -0.3],
    [-0.1, 4.05, -0.42],
    [-0.28, 3.88, -0.47],
    [-0.31, 3.76, -0.52],
    [X_CHAIN.moving - 0.05, UPPER, X_CHAIN.z],
  ],
};

/** Out of the chain's fixed end, over the X motor, up the left upright, across and down the right one. */
const TO_PICO: WireRun = {
  wires: TOOL,
  ties: TIES,
  points: [
    [X_CHAIN.fixed - 0.06, X_CHAIN.y, X_CHAIN.z],
    [X_CHAIN.fixed - 0.16, X_CHAIN.y, X_CHAIN.z],
    [-0.74, 3.6, -0.62],
    [-0.8, 3.76, -0.85],
    [-1.1, 3.78, -1.0],
    [-1.55, 3.72, -0.98],
    [-1.86, 3.66, -0.9],
    [-FACE, 3.6, -0.72],
    [-FACE, 3.72, LANE],
    [-FACE, 3.95, LANE],
    [-1.972, 4.08, -0.52],
    [-1.96, CROSSBAR.y, -0.64],
    [-1.85, CROSSBAR.y, CROSSBAR.z],
    [1.85, CROSSBAR.y, CROSSBAR.z],
    [1.96, CROSSBAR.y, -0.64],
    [1.972, 4.08, -0.52],
    [FACE, 3.95, LANE],
    [FACE, 1.2, LANE],
    [1.98, 0.95, LANE],
    [2.06, 0.82, LANE],
    TOOL_GROMMET,
    [2.34, 0.78, -0.44],
    [2.46, 0.62, -0.32],
    [2.54, 0.44, -0.05],
    [2.58, 0.42, 0.3],
    [2.59, 0.42, 0.42],
  ],
};

/** Six jumpers into the breadboard's outer left column, beside the Pico's pins. */
const BREADBOARD = { x: 2.655, top: 0.163 } as const;
const HOLES: [number, number][] = [1, 2, 3, 4, 5, 6].map((row) => [BREADBOARD.x, 0.86 + (row - 11.5) * 0.0314]);
const TO_BREADBOARD = fanOut([2.59, 0.42, 0.42], TOOL, HOLES, BREADBOARD.top);

/**
 * The HX711's four leads: jumpers pushed onto its output pins, which stick
 * out sideways at the bottom of the board, gathered into a bundle that
 * climbs the right side of the tool to the top of the drive.
 */
const HX711_PINS = [0, 1, 2, 3].map((i) => 0.05 + (i - 1.5) * 0.0314);
const HX711_HOUSINGS: RepeatItem[] = HX711_PINS.map((z) => ({ position: [0.008, 2.015, z], rotation: [0, 0, Math.PI / 2] }));
const HX711_JUMPERS: WireRun[] = HX711.map((material, i) => ({
  wires: [material],
  twist: 0,
  points: [
    [0.08, 2.015, HX711_PINS[i]],
    [0.13, 2.02, HX711_PINS[i]],
    [0.18, 2.1, 0.05 + (i - 1.5) * 0.01],
    [0.2, 2.2, 0.05],
  ],
}));
const HX711_UP: WireRun = {
  wires: HX711,
  ties: TIES,
  points: [
    [0.2, 2.2, 0.05],
    [0.2, 2.4, 0.04],
    [0.2, 3.3, 0.0],
    [0.19, 3.8, -0.06],
    [0.15, 4.12, -0.1],
    [0.12, 4.22, -0.1],
  ],
};

export const TOOL_RUNS: WireRun[] = [INTO_CHAIN, TO_PICO, ...TO_BREADBOARD.runs, ...HX711_JUMPERS, HX711_UP];
export const TOOL_JUMPERS: RepeatItem[] = [...TO_BREADBOARD.housings, ...HX711_HOUSINGS];
