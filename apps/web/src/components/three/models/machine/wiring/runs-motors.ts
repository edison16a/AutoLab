/**
 * The stepper leads from the X, Y and Z motors to the mainboard. Each is
 * the motor's own four wires, red, blue, green and black, lightly twisted
 * and tied every so often, routed along the frame and then flat along the
 * chamber floor to its socket.
 */
import type { MaterialKey } from "../../../materials";
import type { Vec3 } from "../../../types";
import type { WireRun } from "./harness-geometry";
import { ridesOn } from "./harness-rig";
import { MOTION } from "../layout";
import { LEAD_REACH } from "../ZAxis";
import { FLOOR_Y, PLUG_BACK, PLUG_Y, SOCKET_X } from "./mainboard-ports";
import { jstPlug, type PlugPart } from "./Plugs";

export const STEPPER: MaterialKey[] = ["wireRed", "wireBlue", "wireGreen", "wireBlack"];
const TIES = 0.34;
/** The outer face of the left upright, where the gantry's cables run. */
const LEFT_FACE = -1.975;

/** The last stretch into a socket: up off the floor and straight in from the front. */
function intoSocket(x: number, lane: number): Vec3[] {
  return [
    [x, FLOOR_Y, lane],
    [x, PLUG_Y - 0.035, (lane + PLUG_BACK) / 2],
    [x, PLUG_Y, PLUG_BACK - 0.012],
    [x, PLUG_Y, PLUG_BACK - 0.03],
  ];
}

/**
 * X motor: its leads trail back off the motor behind the beam, so the
 * cable swings left behind the motor and the left upright, runs down the
 * upright's outer face, along the back edge of the left foot plate and
 * onto the floor, then along the back of the chamber to the X socket.
 */
const X_RUN: WireRun = {
  wires: STEPPER,
  ties: TIES,
  // Off the motor it rides the beam, hangs slack behind the upright to its
  // face, and trails off the foot plate onto the floor.
  ride: [
    { from: 0, carrier: "beam" },
    { from: 7, carrier: "gantry", span: 5 },
    { from: 17, carrier: "fixed", span: 4 },
  ],
  points: [
    [-0.59, 3.42, -1.15],
    [-0.595, 3.43, -1.23],
    [-0.72, 3.45, -1.27],
    [-1.15, 3.45, -1.2],
    [-1.58, 3.42, -1.02],
    [-1.86, 3.38, -0.9],
    [LEFT_FACE, 3.26, -0.74],
    [LEFT_FACE, 3.05, -0.62],
    [LEFT_FACE, 1.2, -0.62],
    [-1.97, 0.93, -0.66],
    [-1.93, 0.775, -0.78],
    [-1.78, 0.762, -0.835],
    [-1.45, 0.762, -0.838],
    [-1.24, 0.755, -0.842],
    [-1.16, 0.62, -0.9],
    [-1.08, FLOOR_Y + 0.004, -0.95],
    [-0.8, FLOOR_Y, -0.9],
    [-0.3, FLOOR_Y, -0.79],
    [0.05, FLOOR_Y, -0.78],
    ...intoSocket(SOCKET_X.x, -0.78).slice(1),
  ],
};

/** Lifts a bundle over a lower one lying across its lane at `x`. */
function over(x: number, lane: number, width = 0.07): Vec3[] {
  return [
    [x + width, FLOOR_Y, lane],
    [x, FLOOR_Y + 0.056, lane],
    [x - width, FLOOR_Y, lane],
  ];
}

/** Where the red and black heater leads cross the floor lanes on their way to the board. */
const HEATER_X = 0.76;

/**
 * Y motor: it stands shaft down in the back right corner, so its leads
 * rise off the top. The cable turns over, drops down the corner in front
 * of the motor, passes under the Y rod and belt, and comes in along the
 * floor, over the heater leads, to the Y socket.
 */
const Y_RUN: WireRun = {
  wires: STEPPER,
  ties: TIES,
  points: [
    [2.06, 1.49, -1.38],
    [2.06, 1.575, -1.375],
    [2.065, 1.62, -1.29],
    [2.075, 1.52, -1.12],
    [2.08, 1.15, -1.05],
    [2.08, 0.66, -1.03],
    [2.03, 0.51, -1.01],
    [1.85, FLOOR_Y, -1.0],
    [1.6, FLOOR_Y, -1.0],
    [1.25, FLOOR_Y, -0.93],
    [1.08, FLOOR_Y, -0.76],
    [0.95, FLOOR_Y, -0.7],
    ...over(HEATER_X, -0.7),
    [0.45, FLOOR_Y, -0.7],
    ...intoSocket(SOCKET_X.y, -0.7).slice(1),
  ],
};

/**
 * The two Z motors share one driver, as on the Ender. Each lead drops off
 * its motor to the floor inboard of the foot plate and runs along the
 * lane behind the heated platform to a Y splitter in front of the board;
 * one short lead then lifts over the Y cable into the Z socket.
 */
const Z_LANE = -0.625;
const SPLITTER: Vec3 = [SOCKET_X.z, FLOOR_Y, Z_LANE];
const SPLIT = 0.04;

/** Where each Z motor's lead sleeve hangs: the socket's mouth plus the lead's reach, in from the screw. */
const SLEEVE_X = MOTION.screwX - (0.52 / 2 + 0.06) - LEAD_REACH;

/** Out of a Z motor's lead sleeve, which ends at the floor beside the foot plate. */
function offMotor(x: number): Vec3[] {
  return [
    [x, 0.52, -0.55],
    [x, FLOOR_Y + 0.006, -0.578],
    [x + Math.sign(-x) * 0.03, FLOOR_Y, Z_LANE],
  ];
}

/** Each Z lead's sleeve rolls with the gantry, and the lead drags along the floor behind it back to the lane. */
const Z_LEFT: WireRun = {
  wires: STEPPER,
  ties: TIES,
  ride: [...ridesOn("gantry"), { from: 3, carrier: "fixed", span: 3 }],
  points: [...offMotor(-SLEEVE_X), [-0.6, FLOOR_Y, Z_LANE], [SPLITTER[0] - SPLIT, FLOOR_Y, Z_LANE]],
};

const Z_RIGHT: WireRun = {
  wires: STEPPER,
  ties: TIES,
  ride: [...ridesOn("gantry"), { from: 4, carrier: "fixed", span: 4 }],
  points: [...offMotor(SLEEVE_X), [0.9, FLOOR_Y, Z_LANE], [SPLITTER[0] + SPLIT, FLOOR_Y, Z_LANE]],
};

const Z_MAIN: WireRun = {
  wires: STEPPER,
  points: [
    [SOCKET_X.z, FLOOR_Y, Z_LANE - SPLIT],
    [SOCKET_X.z, FLOOR_Y + 0.006, Z_LANE - 0.045],
    [SOCKET_X.z, FLOOR_Y + 0.056, -0.7],
    ...intoSocket(SOCKET_X.z, -0.76).slice(1),
  ],
};

export const MOTOR_RUNS: WireRun[] = [X_RUN, Y_RUN, Z_LEFT, Z_RIGHT, Z_MAIN];

export const MOTOR_PLUGS: PlugPart[] = [
  jstPlug(SOCKET_X.x, PLUG_Y, PLUG_BACK),
  jstPlug(SOCKET_X.y, PLUG_Y, PLUG_BACK),
  jstPlug(SOCKET_X.z, PLUG_Y, PLUG_BACK),
  { position: SPLITTER, size: [SPLIT * 2, 0.05, SPLIT * 2], material: "plasticBlack", radius: 0.01 },
];
