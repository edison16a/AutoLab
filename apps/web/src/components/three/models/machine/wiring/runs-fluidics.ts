/**
 * The fluidics' tubing and cables, laid out like the "combined system" in
 * the fluidics sketch.
 *
 * Tubing is 1/16" ID Tygon, each line drawn as its clear shell and the
 * liquid core inside it (see fluidics/flow.ts). The dispense head's two
 * lines climb its spine, ride the X chain, run down the left upright and
 * leave through a grommet in the left panel, pass the end of the pump
 * panel and come up onto the head side fitting of each PMST100. From each
 * pump's other fitting a common line runs back under the panel to its
 * selector valve, under the motor, and from the valves the bottle lines
 * go to the media bottle in the chamber (back in through a second
 * grommet), the cleaner and the waste.
 *
 * Cables: each pump's motor cable to its SMC10's coil terminals, 24 V to
 * each SMC10, each SMC10's enable, direction, speed and ground jumpers from
 * the interface board, the pinch valves' leads, the HEPA unit's fan cable
 * and the waste float switch, and the 24 V supply into the interface board.
 *
 * Positions are world space at rest, worked out from the registry and each
 * model's own port positions, so moving a part moves the ends of its lines.
 */
import { partById } from "@/data/hardware-parts";
import type { MaterialKey } from "../../../materials";
import type { RepeatItem } from "../../../primitives";
import type { Vec3 } from "../../../types";
import { BOTTLE_PORTS } from "../../BottleModel";
import { HEAD_PORTS } from "../../fluidics/DispenseHeadModel";
import { CORE_RADIUS, type FlowLine } from "../../fluidics/flow";
import { MOTOR_CABLE, PUMP_PORTS } from "../../fluidics/PeristalticPumpModel";
import { valvePorts } from "../../fluidics/PinchValveModel";
import { PMST100 } from "../../fluidics/pump-spec";
import { SMC10_PORTS } from "../../fluidics/SMC10Model";
import { DRIVER_BOARD, PUMP_PANEL, POWER_SUPPLY } from "../fluidics-layout";
import type { FlowRun, WireRun } from "./harness-geometry";
import { ridesOn, type Ride } from "./harness-rig";
import { X_CHAIN } from "./XChain";

const TUBE = PMST100.tubeRadius;
const UPPER = X_CHAIN.y + X_CHAIN.radius * 2;
/** The front lane on the left upright's outer face. */
const FACE = 1.975;
const LANE = -0.46;
/** Where the head's lines pass the right end of the pump panel, clear of the addition pump's flange. */
const PANEL_END_X = -2.44;

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
/** Behind the motors, where a bottle line can rise once it has passed under one. */
const MOTOR_BACK = PUMP_PANEL.z - PMST100.motor.length - 0.04;

/** A fluid line: its clear Tygon shell, and its liquid core keyed by the line it belongs to. Points run from the head's end toward the bottles. */
interface FluidLine {
  shell: WireRun;
  core: FlowRun;
}
function fluid(line: FlowLine, points: Vec3[], ride?: Ride[]): FluidLine {
  return {
    shell: { wires: ["tygon"], radius: TUBE, twist: 0, points, ride },
    core: { wires: [line], radius: CORE_RADIUS, twist: 0, points, ride, towardHead: false },
  };
}

/** Straight up off a port before bending away, so every line meets its fitting square on. */
const above = (port: Vec3, rise = 0.04): Vec3 => [port[0], port[1] + rise, port[2]];
/** Straight back out of a valve port (its lines leave toward the back) before bending away. */
const behind = (port: Vec3, run = 0.08): Vec3 => [port[0], port[1] + 0.01, port[2] - run];
/** Straight down off a pump's barb, which points down. */
const below = (port: Vec3, drop = 0.12): Vec3 => [port[0], port[1] - drop, port[2]];

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
 * its outer face and out through the grommet, then forward past the right
 * end of the pump panel, where the two lines part for their pumps.
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
  [-2.34, 0.88, -0.3],
  [PANEL_END_X + 0.01, 0.8, 0.5],
  [PANEL_END_X, 0.7, 1.3],
  [PANEL_END_X, 0.6, PUMP_PANEL.z + 0.14],
];
// The chain's fixed end rides the beam; the run hangs slack over the X motor
// to the upright, rides the gantry down it, and swings off to the grommet in the fixed panel.
const PLATFORM_RIDE: Ride[] = [
  { from: 0, carrier: "beam" },
  { from: 7, carrier: "gantry", span: 5 },
  { from: 13, carrier: "fixed", span: 4 },
];

const splitAddition = offset(TO_PLATFORM, 1).at(-1)!;
const splitAspiration = offset(TO_PLATFORM, -1).at(-1)!;
/** Along the front of the platform, under the pumps' fittings, at the height a line lies on the plate. */
const FLOOR_Y = 0.09;
const FRONT_LANE = PUMP_PANEL.z + 0.14;

const LINES: FluidLine[] = [
  fluid("aspHead", [...ASPIRATION_SPINE, ...offset(OVER_THE_BEAM, -1)], ridesOn("carriage")),
  fluid("addHead", [...ADDITION_SPINE, ...offset(OVER_THE_BEAM, 1)], ridesOn("carriage")),
  fluid("aspHead", offset(TO_PLATFORM, -1), PLATFORM_RIDE),
  fluid("addHead", offset(TO_PLATFORM, 1), PLATFORM_RIDE),
  // Down onto each pump's head side fitting: the addition pump is nearest; the aspiration line runs along the front, under the addition pump's fittings.
  fluid("addHead", [splitAddition, [-2.5, 0.35, ADD_PUMP.head[2] - 0.03], [ADD_PUMP.head[0] + 0.12, 0.12, ADD_PUMP.head[2] + 0.01], [ADD_PUMP.head[0] + 0.02, 0.11, ADD_PUMP.head[2]], below(ADD_PUMP.head), ADD_PUMP.head]),
  fluid("aspHead", [
    splitAspiration,
    [-2.48, 0.3, FRONT_LANE - 0.02],
    [-2.65, FLOOR_Y, FRONT_LANE],
    [ASP_PUMP.head[0] + 0.22, FLOOR_Y, FRONT_LANE],
    [ASP_PUMP.head[0] + 0.03, 0.1, ASP_PUMP.head[2] - 0.03],
    below(ASP_PUMP.head),
    ASP_PUMP.head,
  ]),
];

/** From a pump's valve side fitting, down, back under the panel and up to the front of its valve's manifold. */
function toValve(line: FlowLine, from: Vec3, common: Vec3): FluidLine {
  return fluid(line, [
    from,
    below(from),
    [from[0] + 0.01, 0.17, from[2] - 0.15],
    [(from[0] + common[0]) / 2, common[1] - 0.07, PUMP_PANEL.z - 0.08],
    [common[0], common[1], common[2] + 0.04],
    common,
  ]);
}

/** From a valve port back under its motor, up behind it, over the controllers and down onto a bottle's cap. */
function toBottle(line: FlowLine, port: Vec3, cap: Vec3, peak: number, bend: Vec3 = [0, 0, 0]): FluidLine {
  return fluid(line, [
    port,
    behind(port),
    [port[0] + bend[0] * 0.3, 0.45, MOTOR_BACK],
    [port[0] + (cap[0] - port[0]) * 0.4 + bend[0], (0.45 + peak) / 2, MOTOR_BACK - 0.35],
    [cap[0] + (port[0] - cap[0]) * 0.1 + bend[0], peak + bend[1], (MOTOR_BACK + cap[2]) / 2 + bend[2]],
    [cap[0], cap[1] + 0.1, cap[2] + 0.08],
    above(cap),
    cap,
  ]);
}

const VALVE_LINES: FluidLine[] = [
  toValve("addCommon", ADD_PUMP.valve, ADD_COMMON),
  toValve("aspCommon", ASP_PUMP.valve, ASP_COMMON),
  // Media: out from under the motor, up past its side and back into the chamber through the left panel, down into the media bottle's dip tube.
  fluid("addMedia", [
    ADD_MEDIA,
    behind(ADD_MEDIA),
    [ADD_MEDIA[0] + 0.15, 0.48, ADD_MEDIA[2] - 0.12],
    [-2.49, 0.9, ADD_MEDIA[2] - 0.02],
    [-2.36, 1.15, 1.15],
    MEDIA_GROMMET,
    [-2.02, 1.34, 1.38],
    [-1.72, 1.5, 1.42],
    [MEDIA_IN[0] - 0.02, MEDIA_IN[1] + 0.07, MEDIA_IN[2]],
    above(MEDIA_IN),
    MEDIA_IN,
  ]),
  toBottle("addCleaner", ADD_CLEANER, CLEANER_RIGHT, 1.12),
  toBottle("addWaste", ADD_WASTE, WASTE_RIGHT, 1.18, [-0.05, 0, 0]),
  toBottle("aspWaste", ASP_WASTE, WASTE_LEFT, 1.1),
  // The aspiration valve's cleaner line crosses over the waste lines to the cleaner bottle.
  toBottle("aspCleaner", ASP_CLEANER, CLEANER_LEFT, 1.32, [0.05, 0, 0.05]),
];

const ALL_LINES = [...LINES, ...VALVE_LINES];

/** The Simply Pumps 4 wire motor's leads: A2 green, A1 black, B1 red, B2 blue. */
const COIL_A: MaterialKey[] = ["wireGreen", "wireBlack"];
const COIL_B: MaterialKey[] = ["wireRed", "wireBlue"];
const SUPPLY: MaterialKey[] = ["wireRed", "wireBlack"];
/** Enable, direction, speed and ground, onto the SMC10's I/O header. */
const CONTROL: MaterialKey[] = ["wireYellow", "wireGreen", "wireWhite", "wireBlack"];

const boardAt = (id: string, local: Vec3) => at(id, local);
const terminalTop = (port: Vec3): Vec3 => [port[0], port[1], port[2] - 0.04];
/** The interface board's 24 V terminal at its back edge, and the transistor and op-amp side it sends control signals from. */
const BOARD_24V: Vec3 = [DRIVER_BOARD.x + 0.05, DRIVER_BOARD.top + 0.04, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 + 0.03];
const BOARD_SIGNALS: Vec3 = [DRIVER_BOARD.x - 0.1, DRIVER_BOARD.top + 0.04, DRIVER_BOARD.z + DRIVER_BOARD.depth / 2 - 0.02];
/** High enough to clear the SMC10s' capacitors on the way over them. */
const OVER_BOARDS = 0.45;

/** A pump's motor cable: out of the gland on the motor's side, down to its controller, splitting into its two coil pairs. */
function motorCables(pump: string, controller: string): WireRun[] {
  const gland = at(pump, MOTOR_CABLE);
  const coilA = boardAt(controller, SMC10_PORTS.coilA);
  const coilB = boardAt(controller, SMC10_PORTS.coilB);
  const split: Vec3 = [(coilA[0] + coilB[0]) / 2, coilA[1] + 0.04, coilA[2] + 0.12];
  return [
    { wires: ["wireBlack"], radius: 0.016, twist: 0, points: [gland, [gland[0] - 0.06, gland[1] - 0.05, gland[2]], [gland[0] - 0.05, 0.4, gland[2] - 0.05], [split[0] - 0.1, 0.3, split[2] + 0.04], split] },
    { wires: COIL_A, twist: 2, points: [split, [coilA[0], coilA[1] + 0.03, coilA[2] + 0.06], terminalTop(coilA)] },
    { wires: COIL_B, twist: 2, points: [split, [coilB[0], coilB[1] + 0.03, coilB[2] + 0.06], terminalTop(coilB)] },
  ];
}

/** 24 V from the interface board over the controllers to a controller's supply terminal. */
function supplyCable(controller: string, via: number): WireRun {
  const supply = boardAt(controller, SMC10_PORTS.supply);
  return {
    wires: SUPPLY,
    twist: 1.5,
    points: [BOARD_24V, [BOARD_24V[0], BOARD_24V[1] + 0.12, BOARD_24V[2] - 0.05], [via, OVER_BOARDS, DRIVER_BOARD.z + 0.25], [supply[0] + 0.05, OVER_BOARDS, supply[2] - 0.15], [supply[0], supply[1] + 0.06, supply[2] + 0.07], terminalTop(supply)],
  };
}

/** Enable, direction, speed and ground from the interface board, over the boards, down onto a controller's header. */
function controlCable(controller: string, via: number): WireRun {
  const header = boardAt(controller, SMC10_PORTS.header);
  return {
    wires: CONTROL,
    twist: 0,
    points: [BOARD_SIGNALS, [BOARD_SIGNALS[0], OVER_BOARDS - 0.05, BOARD_SIGNALS[2] + 0.1], [via, OVER_BOARDS, header[2] - 0.25], [header[0] + 0.02, OVER_BOARDS, header[2] - 0.05], header],
  };
}

const CONTROLLER_CABLES: WireRun[] = [
  ...motorCables("addition_pump", "addition_controller"),
  ...motorCables("aspiration_pump", "aspiration_controller"),
  supplyCable("addition_controller", DRIVER_BOARD.x - 0.05),
  supplyCable("aspiration_controller", DRIVER_BOARD.x - 0.4),
  controlCable("addition_controller", DRIVER_BOARD.x + 0.05),
  controlCable("aspiration_controller", DRIVER_BOARD.x - 0.3),
];

/** Where the valves' lead pairs gather: behind the valves, between the two controllers, then back to the interface board. */
const GATHER: Vec3 = [(partById.addition_controller.position[0] + partById.aspiration_controller.position[0]) / 2, 0.08, partById.addition_valve.position[2] - 0.22];
const VALVE_HARNESS: WireRun = {
  wires: ["wireRed", "wireBlack", "wireRed", "wireBlack", "wireRed"],
  ties: 0.3,
  points: [GATHER, [GATHER[0], 0.08, partById.addition_controller.position[2]], [GATHER[0] + 0.05, 0.08, DRIVER_BOARD.z + DRIVER_BOARD.depth / 2 + 0.1], [DRIVER_BOARD.x - 0.15, 0.08, DRIVER_BOARD.z + DRIVER_BOARD.depth / 2 + 0.08], [DRIVER_BOARD.x + 0.09, DRIVER_BOARD.top + 0.05, DRIVER_BOARD.z + 0.1]],
};

/** Each solenoid's red and black pair, out of its coil's back, along the plate to the gathering point. */
function valveLeads(id: string): WireRun[] {
  const base = partById[id].position;
  const { ports } = valvePorts(id === "addition_valve" ? "addition" : "aspiration");
  return ports.map(([dx]) => {
    const x = base[0] + dx;
    return { wires: ["wireRed", "wireBlack"], twist: 2, points: [[x, 0.09, base[2] - 0.13], [x, 0.08, base[2] - 0.18], [(x + GATHER[0]) / 2, 0.08, GATHER[2] + 0.02], GATHER] };
  });
}

const HEPA = partById.hepa_filter.position;
/** The HEPA unit's fan cable: 12 V, ground, PWM and tach, off its back left corner, down the outside of the back left post to the interface board. */
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
    [-2.6, 0.075, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 - 0.2],
    [DRIVER_BOARD.x + 0.11, DRIVER_BOARD.top + 0.04, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 + 0.04],
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
    [FLOAT[0] + 0.15, 0.7, FLOAT[2] + 0.22],
    [FLOAT[0] + 0.3, 0.075, FLOAT[2] + 0.24],
    [DRIVER_BOARD.x - 0.13, 0.075, FLOAT[2] + 0.25],
    [DRIVER_BOARD.x - 0.04, DRIVER_BOARD.top + 0.03, DRIVER_BOARD.z - DRIVER_BOARD.depth / 2 + 0.05],
  ],
};

/** The Pico's jumpers to the interface board: enable, direction and speed for each controller plus the valve and fan gates, as one short bundle. */
const PICO_JUMPERS: WireRun = {
  wires: ["wireYellow", "wireGreen", "wireBlue", "wireWhite", "wireRed", "wireBlack"],
  twist: 0,
  points: [
    [DRIVER_BOARD.x - DRIVER_BOARD.width / 2 - 0.17, 0.2, DRIVER_BOARD.z - 0.04],
    [DRIVER_BOARD.x - DRIVER_BOARD.width / 2 - 0.11, 0.27, DRIVER_BOARD.z - 0.04],
    [DRIVER_BOARD.x - DRIVER_BOARD.width / 2 - 0.03, 0.22, DRIVER_BOARD.z - 0.04],
    [DRIVER_BOARD.x - DRIVER_BOARD.width / 2 + 0.02, DRIVER_BOARD.top + 0.02, DRIVER_BOARD.z - 0.04],
  ],
};

/** The 24 V supply's output lead, from the brick behind the platform up into the interface board's terminal. */
const POWER_LEAD: WireRun = {
  wires: ["wireBlack"],
  radius: 0.016,
  twist: 0,
  points: [
    [POWER_SUPPLY.x, 0.06, POWER_SUPPLY.z + POWER_SUPPLY.depth / 2 + 0.02],
    [POWER_SUPPLY.x, 0.03, POWER_SUPPLY.z + POWER_SUPPLY.depth / 2 + 0.15],
    [BOARD_24V[0] + 0.02, 0.04, -1.2],
    [BOARD_24V[0] + 0.02, 0.09, BOARD_24V[2] - 0.15],
    [BOARD_24V[0], BOARD_24V[1] + 0.02, BOARD_24V[2] - 0.05],
  ],
};

export const FLUIDICS_RUNS: WireRun[] = [
  ...ALL_LINES.map((line) => line.shell),
  ...CONTROLLER_CABLES,
  ...valveLeads("addition_valve"),
  ...valveLeads("aspiration_valve"),
  VALVE_HARNESS,
  HEPA_CABLE,
  FLOAT_CABLE,
  PICO_JUMPERS,
  POWER_LEAD,
];
/** The liquid in every line, for the flow harness. */
export const FLUIDICS_FLOW: FlowRun[] = ALL_LINES.map((line) => line.core);

/** Dupont housings on each controller's header, where the control jumpers plug in. */
export const FLUIDICS_JUMPERS: RepeatItem[] = ["addition_controller", "aspiration_controller"].flatMap((id) => {
  const header = boardAt(id, SMC10_PORTS.header);
  return [-1.5, -0.5, 0.5, 1.5].map((i) => ({ position: [header[0], header[1] - 0.075, header[2] + i * 0.0314] as Vec3 }));
});
