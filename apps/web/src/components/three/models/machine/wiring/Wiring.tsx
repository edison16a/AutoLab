"use client";
import { Grommet } from "../Grommet";
import { Harness } from "./Harness";
import { Plugs } from "./Plugs";
import { MOTOR_PLUGS, MOTOR_RUNS } from "./runs-motors";
import { TOOL_GROMMET, TOOL_JUMPERS, TOOL_RUNS } from "./runs-tool";

/** Every wire run in the machine, in one harness so each colour is a single draw. */
const RUNS = [...MOTOR_RUNS, ...TOOL_RUNS];
const PLUGS = [...MOTOR_PLUGS];
const JUMPERS = [...TOOL_JUMPERS];
/** The side panel is a 2 mm sheet at this scale. */
const PANEL = 0.02;

/**
 * The machine's wiring: stepper leads to the mainboard, the pipette tool's
 * cables through the X chain and out to the Pico, the sensor cables out to
 * the Pi, and the Pi's own power and USB leads.
 */
export function Wiring() {
  return (
    <group>
      <Harness runs={RUNS} />
      <Plugs parts={PLUGS} jumpers={JUMPERS} />
      <Grommet position={TOOL_GROMMET} axis="x" wall={PANEL} radius={0.042} />
    </group>
  );
}
