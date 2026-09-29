/**
 * The leads on the Pi platform: the Pi's USB-C power from a socket on the
 * side of the base, where the supply lives, and the Pico's USB lead to
 * one of the Pi's USB ports, which is how the Pi talks to it.
 */
import type { Vec3 } from "../../../types";
import type { WireRun } from "./harness-geometry";
import type { PlugPart } from "./Plugs";

const CABLE = 0.02;
const TABLE_Y = CABLE + 0.004;

/** The Pi's USB-C socket opens toward the door; the lead's plug sits in it. */
const PI_USBC = { x: 2.713, y: 0.273, z: 0.28 } as const;
/** A panel socket on the base's right side, halfway up, just behind the Pi platform's left edge. */
const BASE_USBC = { x: 2.336, y: 0.27, z: 0.45 } as const;

const POWER: WireRun = {
  wires: ["wireWhite"],
  radius: CABLE,
  twist: 0,
  points: [
    [PI_USBC.x, PI_USBC.y, PI_USBC.z + 0.14],
    [PI_USBC.x - 0.02, 0.245, 0.465],
    [2.6, 0.13, 0.465],
    [2.52, 0.19, 0.452],
    [2.49, 0.25, BASE_USBC.z],
    [BASE_USBC.x + 0.13, BASE_USBC.y, BASE_USBC.z],
  ],
};

/** The Pico's micro USB faces the front edge of the platform. */
const PICO_USB = { x: 2.82, y: 0.225, z: 1.175 } as const;
/** The upper port of the Pi's USB 2 pair, facing out over the platform's right edge. */
const PI_USB2 = { x: 3.655, y: 0.407, z: 0.164 } as const;

/** Off the front of the platform, along the table and round the right side, up into the Pi. */
const PICO_LINK: WireRun = {
  wires: ["wireBlack"],
  radius: CABLE,
  twist: 0,
  points: [
    [PICO_USB.x, PICO_USB.y, PICO_USB.z + 0.14],
    [PICO_USB.x, 0.2, 1.36],
    [2.86, 0.06, 1.42],
    [3.05, TABLE_Y, 1.46],
    [3.6, TABLE_Y, 1.46],
    [3.95, TABLE_Y, 1.25],
    [4.02, TABLE_Y, 0.7],
    [3.99, 0.1, 0.3],
    [3.93, 0.3, 0.19],
    [PI_USB2.x + 0.22, PI_USB2.y, PI_USB2.z],
  ],
};

export const POWER_RUNS: WireRun[] = [POWER, PICO_LINK];

const tin = (position: Vec3, size: Vec3): PlugPart => ({ position, size, material: "tin", radius: 0.004 });

export const POWER_PLUGS: PlugPart[] = [
  // USB-C at the Pi: steel shell in the socket, white overmould behind it.
  tin([PI_USBC.x, PI_USBC.y, PI_USBC.z + 0.015], [0.085, 0.03, 0.05]),
  { position: [PI_USBC.x, PI_USBC.y, PI_USBC.z + 0.08], size: [0.12, 0.06, 0.12], material: "plasticWhite", radius: 0.02 },
  // The panel socket's black bezel on the base, and the white plug pushed into it.
  { position: [BASE_USBC.x + 0.004, BASE_USBC.y, BASE_USBC.z], size: [0.012, 0.08, 0.15], material: "plasticBlack", radius: 0.004 },
  { position: [BASE_USBC.x + 0.07, BASE_USBC.y, BASE_USBC.z], size: [0.12, 0.06, 0.12], material: "plasticWhite", radius: 0.02 },
  // Micro USB at the Pico.
  tin([PICO_USB.x, PICO_USB.y, PICO_USB.z + 0.01], [0.06, 0.024, 0.04]),
  { position: [PICO_USB.x, PICO_USB.y, PICO_USB.z + 0.08], size: [0.1, 0.055, 0.11], material: "plasticBlack", radius: 0.018 },
  // USB-A at the Pi: the steel shell in the port and a black overmould.
  tin([PI_USB2.x + 0.01, PI_USB2.y, PI_USB2.z], [0.08, 0.052, 0.13]),
  { position: [PI_USB2.x + 0.12, PI_USB2.y, PI_USB2.z], size: [0.16, 0.085, 0.17], material: "plasticBlack", radius: 0.02 },
];
