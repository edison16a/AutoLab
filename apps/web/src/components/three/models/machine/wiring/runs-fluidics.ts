/**
 * The fluidics' tubing and cables, laid out like the "combined system" in
 * the fluidics sketch.
 *
 * Tubing: the dispense head's two lines (pink addition, amber aspiration)
 * climb its spine, ride the X chain, run down the left upright and leave
 * through a grommet in the left panel to their pumps on the fluidics
 * platform. Behind each pump a common line runs to its selector valve, and
 * from the valves the bottle lines go to the media bottle in the chamber
 * (back in through a second grommet), the cleaner and the waste.
 *
 * Cables: each pump's stepper lead, each pinch valve's two leads, the HEPA
 * unit's fan cable down the back left post and the waste float switch all
 * end on the driver board beside the Pico.
 *
 * Positions are world space at rest, worked out from the registry and each
 * model's own port positions, so moving a part moves the ends of its lines.
 */
import { partById } from "@/data/hardware-parts";
import type { MaterialKey } from "../../../materials";
import type { Vec3 } from "../../../types";
import { BOTTLE_PORTS } from "../../BottleModel";
import { HEAD_PORTS } from "../../fluidics/DispenseHeadModel";
import { PUMP_PORTS } from "../../fluidics/PeristalticPumpModel";
import { valvePorts } from "../../fluidics/PinchValveModel";
import { DRIVER_BOARD, onPlatform } from "../fluidics-layout";
import type { WireRun } from "./harness-geometry";
import { ridesOn } from "./harness-rig";
import { X_CHAIN } from "./XChain";

const TUBE = 0.022;
const STEPPER: MaterialKey[] = ["wireRed", "wireBlue", "wireGreen", "wireBlack"];
const UPPER = X_CHAIN.y + X_CHAIN.radius * 2;
/** The front lane on the left upright's outer face. */
const FACE = 1.975;
const LANE = -0.46;

/** Where the head's lines leave the chamber through the left panel, and where the media line comes back in. */
export const TUBE_GROMMET: Vec3 = [-2.2, 0.92, LANE];
export const MEDIA_GROMMET: Vec3 = [-2.2, 1.24, 1.25];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** A port in a part's own space, in world space. None of these parts are rotated. */
const at = (id: string, local: Vec3): Vec3 => add(partById[id].position, local);

const HEAD_ASPIRATION = at("dispense_head", HEAD_PORTS.aspiration);
const HEAD_ADDITION = at("dispense_head", HEAD_PORTS.addition);
const ADD_PUMP = { head: at("addition_pump", PUMP_PORTS.head), valve: at("addition_pump", PUMP_PORTS.valve) };
const ASP_PUMP = { head: at("aspiration_pump", PUMP_PORTS.head), valve: at("aspiration_pump", PUMP_PORTS.valve) };
const ADD_VALVE = valvePorts("addition");
const ASP_VALVE = valvePorts("aspiration");
const ADD_COMMON = at("addition_valve", ADD_VALVE.common);
const ASP_COMMON = at("aspiration_valve", ASP_VALVE.common);
/** The addition valve's ports are media, cleaner, waste; the aspiration valve's are waste, cleaner. */
const [ADD_MEDIA, ADD_CLEANER, ADD_WASTE] = ADD_VALVE.ports.map((port) => at("addition_valve", port));
const [ASP_WASTE, ASP_CLEANER] = ASP_VALVE.ports.map((port) => at("aspiration_valve", port));
const MEDIA_IN = at("media_bottle", BOTTLE_PORTS.media[0]);
const [CLEANER_LEFT, CLEANER_RIGHT] = BOTTLE_PORTS.cleaner.map((port) => at("cleaner_bottle", port));
const [WASTE_LEFT, WASTE_RIGHT] = BOTTLE_PORTS.waste.map((port) => at("waste_container", port));

const tube = (material: MaterialKey, points: Vec3[], ride?: WireRun["ride"]): WireRun => ({ wires: [material], radius: TUBE, twist: 0, points, ride });

/** Straight up off a port before bending away, so every line meets its fitting square on. */
const above = (port: Vec3, rise = 0.04): Vec3 => [port[0], port[1] + rise, port[2]];
/** Straight back out of a valve port (its lines leave toward the back) before bending away. */
const behind = (port: Vec3, run = 0.08): Vec3 => [port[0], port[1] + 0.01, port[2] - run];

/** Up the head's spine through its clip and on up the backplate through another, to where both lines turn back over the beam. */
const ASPIRATION_SPINE: Vec3[] = [
  HEAD_ASPIRATION,
  above(HEAD_ASPIRATION, 0.08),
  [-0.33, 1.95, -0.02],
  [-0.31, 2.04, -0.06],
  [-0.31, 2.3, -0.085],
  [-0.31, 2.9, -0.11],
  [-0.3, 3.3, -0.11],
];
const ADDITION_SPINE: Vec3[] = [
  HEAD_ADDITION,
  above(HEAD_ADDITION, 0.08),
  [-0.2, 1.97, -0.02],
  [-0.235, 2.04, -0.06],
  [-0.235, 2.3, -0.085],
  [-0.235, 2.9, -0.11],
  [-0.235, 3.3, -0.11],
];

/** The two lines run side by side from here on, offset either way from one centre line. */
const SIDE: Vec3 = [0, 0.025, 0.025];
const offset = (points: Vec3[], side: number) => points.map((p) => add(p, [SIDE[0] * side, SIDE[1] * side, SIDE[2] * side]));

/** Over the top of the backplate and back over the belt into the chain's moving end. */
const OVER_THE_BEAM: Vec3[] = [
  [-0.27, 3.47, -0.11],
  [-0.25, 3.6, -0.16],
  [-0.23, 3.66, -0.3],
  [-0.21, 3.7, -0.44],
  [X_CHAIN.moving - 0.05, UPPER, X_CHAIN.z],
];

/**
 * Out of the chain's fixed end, over the X motor to the left upright, down
 * its outer face and out through the grommet to the platform, where the
 * two lines part for their pumps.
 */
const TO_PLATFORM: Vec3[] = [
  [X_CHAIN.fixed - 0.06, X_CHAIN.y, X_CHAIN.z],
  [X_CHAIN.fixed - 0.16, X_CHAIN.y, X_CHAIN.z],
  [-0.74, 3.6, -0.62],
  [-0.8, 3.76, -0.85],
  [-1.1, 3.78, -1.0],
  [-1.55, 3.72, -0.98],
  [-1.86, 3.66, -0.9],
  [-FACE, 3.6, -0.72],
  [-FACE, 3.45, LANE],
  [-FACE, 2.6, LANE],
  [-FACE, 1.4, LANE],
  [-1.985, 1.08, LANE],
  [-2.08, 0.96, LANE],
  TUBE_GROMMET,
  [-2.36, 0.88, -0.3],
  [-2.55, 0.84, 0.2],
  onPlatform([-2.6, 0.82, 0.25]),
];
// The chain's fixed end rides the beam; the run hangs slack over the X motor
// to the upright, rides the gantry down it, and swings off to the grommet in the fixed panel.
const PLATFORM_RIDE: WireRun["ride"] = [
  { from: 0, carrier: "beam" },
  { from: 7, carrier: "gantry", span: 5 },
  { from: 13, carrier: "fixed", span: 4 },
];

const splitAddition = offset(TO_PLATFORM, 1).at(-1)!;
const splitAspiration = offset(TO_PLATFORM, -1).at(-1)!;

const HEAD_LINES: WireRun[] = [
  tube("tubeSpent", [...ASPIRATION_SPINE, ...offset(OVER_THE_BEAM, -1)], ridesOn("carriage")),
  tube("tubeMedia", [...ADDITION_SPINE, ...offset(OVER_THE_BEAM, 1)], ridesOn("carriage")),
  tube("tubeSpent", offset(TO_PLATFORM, -1), PLATFORM_RIDE),
  tube("tubeMedia", offset(TO_PLATFORM, 1), PLATFORM_RIDE),
  // To the head side of each pump: the addition pump is nearest; the aspiration line arches over it.
  tube("tubeMedia", [splitAddition, onPlatform([-2.5, 0.75, 0.75]), [ADD_PUMP.head[0] + 0.03, 0.55, ADD_PUMP.head[2] - 0.1], [ADD_PUMP.head[0] + 0.03, 0.42, ADD_PUMP.head[2]], [ADD_PUMP.head[0] + 0.015, ADD_PUMP.head[1], ADD_PUMP.head[2]], ADD_PUMP.head]),
  tube("tubeSpent", [splitAspiration, onPlatform([-2.85, 0.92, 0.6]), onPlatform([-3.13, 0.82, 1.05]), [ASP_PUMP.head[0] - 0.01, 0.5, ASP_PUMP.head[2] - 0.03], [ASP_PUMP.head[0] + 0.01, ASP_PUMP.head[1] + 0.04, ASP_PUMP.head[2]], ASP_PUMP.head]),
];

/** From each pump's valve side back past its motor to the front of its valve's manifold. */
function toValve(material: MaterialKey, from: Vec3, common: Vec3): WireRun {
  const lane = from[0] - 0.03;
  return tube(material, [
    from,
    [from[0] - 0.03, from[1] - 0.02, from[2] - 0.12],
    [lane, from[1] - 0.03, from[2] - 0.5],
    [lane, from[1] - 0.02, common[2] + 0.12],
    [(lane + common[0]) / 2, common[1] - 0.01, common[2] + 0.04],
    [common[0], common[1], common[2] + 0.02],
    common,
  ]);
}

const COMMON_LINES: WireRun[] = [toValve("tubeMedia", ADD_PUMP.valve, ADD_COMMON), toValve("tubeSpent", ASP_PUMP.valve, ASP_COMMON)];

/** From a valve port up and back over the Pico to a bottle's cap, peaking at `peak`. */
function toBottle(material: MaterialKey, port: Vec3, cap: Vec3, peak: number, bend: Vec3 = [0, 0, 0]): WireRun {
  const mid: Vec3 = [(port[0] + cap[0]) / 2 + bend[0], peak + bend[1], (port[2] + cap[2]) / 2 + bend[2]];
  return tube(material, [port, behind(port), [port[0] + (mid[0] - port[0]) * 0.3, (port[1] + peak) / 2, port[2] - 0.3], mid, [cap[0], cap[1] + 0.1, cap[2] + 0.08], above(cap), cap]);
}

const BOTTLE_LINES: WireRun[] = [
  // Media: up and forward, back into the chamber through the left panel, and down into the media bottle's dip tube.
  tube("tubeMedia", [
    ADD_MEDIA,
    behind(ADD_MEDIA),
    [ADD_MEDIA[0] + 0.03, 0.62, ADD_MEDIA[2] - 0.12],
    [ADD_MEDIA[0] + 0.1, 1.0, ADD_MEDIA[2] + 0.13],
    [-2.38, 1.18, 1.05],
    MEDIA_GROMMET,
    [-2.02, 1.34, 1.38],
    [-1.72, 1.5, 1.42],
    [MEDIA_IN[0] - 0.02, MEDIA_IN[1] + 0.07, MEDIA_IN[2]],
    above(MEDIA_IN),
    MEDIA_IN,
  ]),
  toBottle("tubeCleaner", ADD_CLEANER, CLEANER_RIGHT, 1.12),
  toBottle("tubeSpent", ADD_WASTE, WASTE_RIGHT, 1.16, [0.05, 0, 0]),
  toBottle("tubeSpent", ASP_WASTE, WASTE_LEFT, 1.1),
  // The aspiration valve's cleaner line crosses over the waste lines to the cleaner bottle.
  toBottle("tubeCleaner", ASP_CLEANER, CLEANER_LEFT, 1.3, [-0.05, 0, 0.05]),
];

const BOARD_EDGE = { x: DRIVER_BOARD.x - DRIVER_BOARD.width / 2 + 0.02, y: DRIVER_BOARD.top + 0.02 } as const;
const STEPPER_SLEEVE: Vec3 = [0.4, 0.36, -0.8];

/** A pump's stepper cable, from the end of its lead sleeve behind the motor down to a driver. */
function pumpCable(id: string, to: Vec3): WireRun {
  const [x, y, z] = at(id, STEPPER_SLEEVE);
  return { wires: STEPPER, points: [[x, y, z + 0.03], [x, y - 0.12, z - 0.1], [x, 0.1, z - 0.22], [(x + to[0]) / 2, 0.085, onPlatform([0, 0, -0.035])[2]], [to[0] - 0.04, 0.1, to[2] + 0.04], to] };
}

const PUMP_CABLES: WireRun[] = [
  pumpCable("addition_pump", [DRIVER_BOARD.x - 0.06, DRIVER_BOARD.top + 0.1, DRIVER_BOARD.z + 0.09]),
  pumpCable("aspiration_pump", [DRIVER_BOARD.x - 0.06, DRIVER_BOARD.top + 0.1, DRIVER_BOARD.z - 0.09]),
];

/** Each solenoid's red and black pair, out of its coil's back, along the platform in front of the breadboard to a MOSFET. */
function valveCables(id: string, xs: number[], first: number): WireRun[] {
  const base = partById[id].position;
  return xs.map((dx, i) => {
    const x = base[0] + dx;
    const lane = onPlatform([0, 0, -0.03])[2] - (first + i) * 0.006;
    const y = 0.07 + (first + i) * 0.004;
    const pin: Vec3 = [DRIVER_BOARD.x + 0.09, DRIVER_BOARD.top + 0.03, DRIVER_BOARD.z + 0.12 - (first + i) * 0.06];
    return {
      wires: ["wireRed", "wireBlack"],
      twist: 2,
      points: [[x, 0.09, base[2] - 0.13], [x, y, lane + 0.03], [x + 0.06, y, lane], [BOARD_EDGE.x - 0.04, y, lane], [BOARD_EDGE.x, BOARD_EDGE.y, pin[2] + 0.04], pin],
    };
  });
}

const VALVE_CABLES: WireRun[] = [
  ...valveCables("aspiration_valve", ASP_VALVE.ports.map((p) => p[0]), 0),
  ...valveCables("addition_valve", ADD_VALVE.ports.map((p) => p[0]).filter((x) => partById.addition_valve.position[0] + x < BOARD_EDGE.x), 2),
  // The media valve stands under the board's edge, so its pair goes straight back to it.
  ...ADD_VALVE.ports
    .map((p) => p[0])
    .filter((x) => partById.addition_valve.position[0] + x >= BOARD_EDGE.x)
    .map((dx): WireRun => {
      const x = partById.addition_valve.position[0] + dx;
      return { wires: ["wireRed", "wireBlack"], twist: 2, points: [[x, 0.09, partById.addition_valve.position[2] - 0.13], [x, 0.08, onPlatform([0, 0, -0.03])[2]], [x, DRIVER_BOARD.top + 0.04, DRIVER_BOARD.z + DRIVER_BOARD.depth / 2 - 0.02]] };
    }),
];

const HEPA = partById.hepa_filter.position;
/** The HEPA unit's fan cable: 12 V, ground, PWM and tach, off its back left corner, down the outside of the back left post. */
const HEPA_CABLE: WireRun = {
  wires: ["wireRed", "wireBlack", "wireBlue", "wireYellow"],
  ties: 0.4,
  points: [
    [HEPA[0] - 0.95, HEPA[1] + 0.15, HEPA[2] - 0.55],
    [-1.3, HEPA[1] + 0.16, -1.25],
    [-2.0, HEPA[1] + 0.12, -1.78],
    [-2.32, 4.3, -1.92],
    [-2.32, 2.4, -1.92],
    [-2.32, 0.6, -1.92],
    [-2.42, 0.25, -1.7],
    [-2.55, 0.08, -1.1],
    [-2.55, 0.075, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 - 0.25],
    [-2.52, DRIVER_BOARD.top + 0.04, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 + 0.04],
  ],
};

const FLOAT = at("waste_container", [0, 0.95, 0.08]);
/** The float switch's lead from the waste cap, down between the bottles and the breadboard to the board. */
const FLOAT_CABLE: WireRun = {
  wires: ["wireWhite", "wireBlack"],
  twist: 2,
  points: [
    FLOAT,
    [FLOAT[0], FLOAT[1] + 0.08, FLOAT[2] + 0.06],
    [FLOAT[0] + 0.15, 0.7, FLOAT[2] + 0.25],
    [FLOAT[0] + 0.3, 0.075, FLOAT[2] + 0.26],
    [DRIVER_BOARD.x - 0.13, 0.075, FLOAT[2] + 0.27],
    [DRIVER_BOARD.x - 0.04, DRIVER_BOARD.top + 0.03, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 + 0.05],
  ],
};

/** The Pico's jumpers to the driver board: step, dir and enable for each pump plus the valve and fan gates, as one short bundle. */
const PICO_JUMPERS: WireRun = {
  wires: ["wireYellow", "wireGreen", "wireBlue", "wireWhite", "wireRed", "wireBlack"],
  twist: 0,
  points: [onPlatform([-2.92, 0.2, -0.3]), onPlatform([-2.86, 0.27, -0.3]), onPlatform([-2.78, 0.22, -0.3]), [BOARD_EDGE.x, BOARD_EDGE.y, onPlatform([0, 0, -0.3])[2]]],
};

export const FLUIDICS_RUNS: WireRun[] = [...HEAD_LINES, ...COMMON_LINES, ...BOTTLE_LINES, ...PUMP_CABLES, ...VALVE_CABLES, HEPA_CABLE, FLOAT_CABLE, PICO_JUMPERS];
