"use client";
import { HideWhenExploded } from "../../../explode/ExplodeContext";
import { Rig } from "../../../motion/Rig";
import { Harness } from "./Harness";
import { Plugs } from "./Plugs";
import { MOTOR_PLUGS, MOTOR_RUNS } from "./runs-motors";
import { POWER_PLUGS, POWER_RUNS } from "./runs-power";
import { SENSOR_JUMPERS, SENSOR_PLUGS, SENSOR_RUNS } from "./runs-sensors";
import { CARRIAGE_JUMPERS, TOOL_JUMPERS, TOOL_RUNS } from "./runs-tool";

/** Every wire run in the machine, in one harness so each colour is a single draw. */
const RUNS = [...MOTOR_RUNS, ...TOOL_RUNS, ...SENSOR_RUNS, ...POWER_RUNS];
const PLUGS = [...MOTOR_PLUGS, ...SENSOR_PLUGS, ...POWER_PLUGS];
const JUMPERS = [...TOOL_JUMPERS, ...SENSOR_JUMPERS];

/**
 * The machine's wiring: stepper leads to the mainboard, the pipette tool's
 * cables through the X chain and out to the Pico, the sensor cables out to
 * the Pi, and the Pi's own power and USB leads. The grommets they pass
 * through belong to the side panel (Panels). It all stays fastened to the
 * frame, so it hides while the exploded view is open.
 */
export function Wiring() {
  return (
    <HideWhenExploded>
      <Harness runs={RUNS} />
      <Plugs parts={PLUGS} jumpers={JUMPERS} />
      <Rig rig="carriage">
        <Plugs parts={[]} jumpers={CARRIAGE_JUMPERS} />
      </Rig>
    </HideWhenExploded>
  );
}
