/**
 * Where the boards sit on the fluidics platform, as plain numbers so the
 * parts registry, the platform and the wiring can share them.
 */
import { FLUIDICS } from "./layout";

/**
 * The mini breadboard the Pico is pushed into, lying across the platform
 * between the valves and the bottles, so the Pico's USB end faces the
 * platform's left edge.
 */
export const BREADBOARD = { x: FLUIDICS.x, z: FLUIDICS.z - 0.31, length: 0.74, width: 0.4, top: 0.163 } as const;

/**
 * The driver board beside the Pico: a perfboard carrying the two TMC2209
 * stepper drivers for the pumps and the MOSFETs that switch the pinch
 * valves and the HEPA fan, with the 12 V input terminal. Every fluidics
 * cable ends on it; the Pico drives it over a short jumper bundle.
 */
export const DRIVER_BOARD = { x: FLUIDICS.x + 0.58, z: FLUIDICS.z - 0.31, width: 0.28, depth: 0.38, top: 0.11 } as const;

/** Moves a point laid out for the platform's first position (x -3.2, z 0.05) to wherever the platform is now. */
export function onPlatform([x, y, z]: [number, number, number]): [number, number, number] {
  return [x + FLUIDICS.x + 3.2, y, z + FLUIDICS.z - 0.05];
}
