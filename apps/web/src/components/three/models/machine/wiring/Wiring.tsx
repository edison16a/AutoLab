"use client";
import { Harness } from "./Harness";
import { Plugs } from "./Plugs";
import { MOTOR_PLUGS, MOTOR_RUNS } from "./runs-motors";

/** Every wire run in the machine, in one harness so each colour is a single draw. */
const RUNS = [...MOTOR_RUNS];
const PLUGS = [...MOTOR_PLUGS];

/**
 * The machine's wiring: stepper leads to the mainboard, the pipette tool's
 * cables through the X chain and out to the Pico, the sensor cables out to
 * the Pi, and the Pi's own power and USB leads.
 */
export function Wiring() {
  return (
    <group>
      <Harness runs={RUNS} />
      <Plugs parts={PLUGS} jumpers={[]} />
    </group>
  );
}
