/**
 * The chamber sensors' cables to the Raspberry Pi. The SHT85 (I²C, 3.3 V)
 * and the K33 CO₂ sensor (UART, 5 V) both sit on the back wall's rail;
 * their leads run along the wall under the rail, down the back right
 * corner, out through a grommet in the side panel and onto the Pi's GPIO
 * header as loose jumpers.
 */
import type { MaterialKey } from "../../../materials";
import type { RepeatItem } from "../../../primitives";
import type { Vec3 } from "../../../types";
import { fanOut } from "./fan-out";
import type { WireRun } from "./harness-geometry";
import type { PlugPart } from "./Plugs";

/** VDD, GND, SDA and SCL. */
const SHT85: MaterialKey[] = ["wireRed", "wireBlack", "wireYellow", "wireGreen"];
/** 5 V, GND, TX and RX. */
const K33: MaterialKey[] = ["wireRed", "wireBlack", "wireBlue", "wireWhite"];
const TIES = 0.34;
/** Along the back wall, below the sensor rail, and down the back right corner. */
const WALL_Z = -1.665;
const CORNER_X = 2.07;

export const SENSOR_GROMMET: Vec3 = [2.2, 0.84, -1.275];
/** The two cables pass the grommet side by side. */
const SHT85_LANE = -0.025;
const K33_LANE = 0.025;

/**
 * GPIO pins in the scene: column 0 is pin 1's end, the inner row holds the
 * odd pins and the outer row, along the board edge, the even ones.
 */
const PIN_1_X = 2.6784;
const PITCH = 0.0314;
const ODD_Z = -0.3787;
const EVEN_Z = -0.4113;
const pin = (n: number): [number, number] => [PIN_1_X + Math.floor((n - 1) / 2) * PITCH, n % 2 ? ODD_Z : EVEN_Z];
/** The header's plastic base, which the jumper housings sit on. */
const HEADER_BASE = 0.284;

/** Out through the side panel and down onto the back edge of the Pi, behind its header. */
function outside(lane: number): Vec3[] {
  return [
    [CORNER_X + 0.01, 0.9, -1.4 + lane],
    [SENSOR_GROMMET[0], SENSOR_GROMMET[1], SENSOR_GROMMET[2] + lane],
    [2.32, 0.82, -1.24 + lane],
    [2.46, 0.7, -1.0 + lane],
    [2.6, 0.6, -0.72 + lane],
    [2.7, 0.56, -0.52 + lane],
  ];
}
const SHT85_OUT = outside(SHT85_LANE);
const K33_OUT = outside(K33_LANE);

/** SHT85: out of the PH plug under its carrier, straight back to the wall and right to the corner. */
const SHT85_RUN: WireRun = {
  wires: SHT85,
  ties: TIES,
  points: [
    [1.45, 3.33, -1.593],
    [1.45, 3.25, -1.61],
    [1.5, 3.16, WALL_Z],
    [1.85, 3.12, WALL_Z],
    [CORNER_X, 3.06, -1.66],
    [CORNER_X, 2.4, -1.66],
    [CORNER_X, 1.1, -1.66],
    ...SHT85_OUT,
  ],
};

/** K33: out of the jumpers on its UART header, down below the adapter plate and along the wall. */
const K33_PINS = [0, 1, 2, 3].map((i) => -0.827 + (i - 1.5) * PITCH);
const K33_JUMPERS: WireRun[] = K33.map((material, i) => ({
  wires: [material],
  twist: 0,
  points: [
    [K33_PINS[i], 3.122, -1.43],
    [K33_PINS[i], 3.12, -1.39],
    [-0.83 + (i - 1.5) * 0.01, 3.04, -1.42],
    [-0.8, 2.99, -1.5],
  ],
}));
const K33_RUN: WireRun = {
  wires: K33,
  ties: TIES,
  points: [
    [-0.8, 2.99, -1.5],
    [-0.7, 2.97, WALL_Z],
    [0.5, 2.97, WALL_Z],
    [1.8, 2.97, WALL_Z],
    [CORNER_X - 0.005, 2.93, -1.615],
    [CORNER_X, 2.4, -1.615],
    [CORNER_X, 1.1, -1.615],
    ...K33_OUT,
  ],
};

const SHT85_PINS = fanOut(SHT85_OUT[SHT85_OUT.length - 1], SHT85, [pin(1), pin(9), pin(3), pin(5)], HEADER_BASE);
const K33_PI_PINS = fanOut(K33_OUT[K33_OUT.length - 1], K33, [pin(4), pin(6), pin(8), pin(10)], HEADER_BASE);

export const SENSOR_RUNS: WireRun[] = [SHT85_RUN, K33_RUN, ...K33_JUMPERS, ...SHT85_PINS.runs, ...K33_PI_PINS.runs];

export const SENSOR_JUMPERS: RepeatItem[] = [
  ...SHT85_PINS.housings,
  ...K33_PI_PINS.housings,
  // The K33's jumpers lie flat along its pins, which point into the chamber.
  ...K33_PINS.map((x): RepeatItem => ({ position: [x, 3.122, -1.5], rotation: [Math.PI / 2, 0, 0] })),
];

/** The SHT85's white PH plug, pushed up into the socket under its carrier. */
export const SENSOR_PLUGS: PlugPart[] = [{ position: [1.45, 3.357, -1.593], size: [0.13, 0.06, 0.07], material: "plasticWhite", radius: 0.006 }];
