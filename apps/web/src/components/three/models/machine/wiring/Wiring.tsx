"use client";
import { HideWhenExploded } from "../../../explode/ExplodeContext";
import { FlowHarness, Harness } from "./Harness";
import { Plugs } from "./Plugs";
import { MOTOR_PLUGS, MOTOR_RUNS } from "./runs-motors";
import { POWER_PLUGS, POWER_RUNS } from "./runs-power";
import { SENSOR_JUMPERS, SENSOR_PLUGS, SENSOR_RUNS } from "./runs-sensors";
import { FLUIDICS_FLOW, FLUIDICS_JUMPERS, FLUIDICS_RUNS } from "./runs-fluidics";

/** Every wire run in the machine, in one harness so each colour is a single draw. */
const RUNS = [...MOTOR_RUNS, ...FLUIDICS_RUNS, ...SENSOR_RUNS, ...POWER_RUNS];
const PLUGS = [...MOTOR_PLUGS, ...SENSOR_PLUGS, ...POWER_PLUGS];
const JUMPERS = [...SENSOR_JUMPERS, ...FLUIDICS_JUMPERS];

/**
 * The machine's wiring and plumbing: stepper leads to the mainboard, the
 * dispense head's fluid lines through the X chain and out to the pumps,
 * the valves' bottle lines, the fluidics cables to the driver board, the
 * sensor cables out to the Pi, and the Pi's own power and USB leads. The
 * grommets they pass through belong to the panels (Panels). It all stays
 * fastened to the frame, so it hides while the exploded view is open.
 */
export function Wiring() {
  return (
    <HideWhenExploded>
      <Harness runs={RUNS} />
      <FlowHarness runs={FLUIDICS_FLOW} />
      <Plugs parts={PLUGS} jumpers={JUMPERS} />
    </HideWhenExploded>
  );
}
