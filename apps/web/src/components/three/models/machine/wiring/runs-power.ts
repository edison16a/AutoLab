/**
 * The leads on the Pi platform: the Pi's USB-C power from a socket on the
 * side of the base, where the supply lives.
 */
import type { Vec3 } from "../../../types";
import type { WireRun } from "./harness-geometry";
import type { PlugPart } from "./Plugs";

const CABLE = 0.02;

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

export const POWER_RUNS: WireRun[] = [POWER];

const tin = (position: Vec3, size: Vec3): PlugPart => ({ position, size, material: "tin", radius: 0.004 });

export const POWER_PLUGS: PlugPart[] = [
  // USB-C at the Pi: steel shell in the socket, white overmould behind it.
  tin([PI_USBC.x, PI_USBC.y, PI_USBC.z + 0.015], [0.085, 0.03, 0.05]),
  { position: [PI_USBC.x, PI_USBC.y, PI_USBC.z + 0.08], size: [0.12, 0.06, 0.12], material: "plasticWhite", radius: 0.02 },
  // The panel socket's black bezel on the base, and the white plug pushed into it.
  { position: [BASE_USBC.x + 0.004, BASE_USBC.y, BASE_USBC.z], size: [0.012, 0.08, 0.15], material: "plasticBlack", radius: 0.004 },
  { position: [BASE_USBC.x + 0.07, BASE_USBC.y, BASE_USBC.z], size: [0.12, 0.06, 0.12], material: "plasticWhite", radius: 0.02 },
];
