/**
 * Where everything stands on the fluidics platform, as plain numbers so the
 * parts registry, the platform and the tubing and wiring can share them.
 * Front to back: the pump panel with the pumps through it and their valves
 * under the motors, the two SMC10 controllers, the Pico and its interface
 * board, and the cleaner and waste bottles.
 */
import { PMST100, SMC10 } from "../fluidics/pump-spec";
import { FLUIDICS } from "./layout";

/**
 * The aluminium panel the PMST100s mount through, as they're designed to:
 * flanges and heads in front, motors behind. It stands on two legs, with
 * room under it for the lines from the fittings to pass back to the valves.
 * `z` is its front face; the shaft axes are at `axisY`.
 */
export const PUMP_PANEL = { z: FLUIDICS.z + 1.25, thickness: 0.037, bottom: 0.45, top: 1.33, axisY: 0.85 } as const;

/** Each pump's column across the platform: addition nearest the enclosure, aspiration on the left. */
export const PUMP_X = { addition: FLUIDICS.x + 0.45, aspiration: FLUIDICS.x - 0.45 } as const;

/** The selector valves stand under their pump's motor. */
export const VALVE_Z = PUMP_PANEL.z - 0.45;

/** The SMC10s lie behind the motors, terminals toward them. Their centres. */
export const CONTROLLER_Z = PUMP_PANEL.z - PMST100.motor.length - 0.12 - SMC10.length / 2;

/**
 * The mini breadboard the Pico is pushed into, lying across the platform
 * behind the controllers, so the Pico's USB end faces the platform's left
 * edge.
 */
export const BREADBOARD = { x: FLUIDICS.x - 0.05, z: CONTROLLER_Z - SMC10.length / 2 - 0.3, length: 0.74, width: 0.4, top: 0.163 } as const;

/**
 * The interface board beside the Pico: transistors that pull each SMC10's
 * enable and direction inputs low, the filtered PWM and op-amp that make
 * each one's 0 to 5 V speed voltage, the MOSFETs that switch the pinch
 * valves and the HEPA fan, and the 24 V input that feeds the controllers.
 */
export const DRIVER_BOARD = { x: FLUIDICS.x + 0.6, z: BREADBOARD.z, width: 0.28, depth: 0.38, top: 0.11 } as const;

/** The cleaner and waste bottles at the back. */
export const BOTTLE_Z = BREADBOARD.z - 0.55;

/** The 24 V supply that powers both controllers, a brick on the bench behind the platform. */
export const POWER_SUPPLY = { x: DRIVER_BOARD.x, z: FLUIDICS.z - FLUIDICS.depth / 2 - 0.3, width: 0.5, height: 0.14, depth: 0.26 } as const;
