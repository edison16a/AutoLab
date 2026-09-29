"use client";
import { Block, TextDecal } from "../primitives";
import { Jst } from "./details/Connectors";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";
import { MicroswitchModel, SWITCH } from "./MicroswitchModel";

/** A 32 x 16 mm endstop board, long along X, parts on +Y. */
const L = mm(32);
const W = mm(16);
const T = mm(1.6);
const TOP = T / 2;
const HOLES = [-1, 1].map((x) => ({ x: x * mm(12.5), z: mm(4.5), radius: mm(1.5) }));
const RUNS: PassiveRun[] = [{ from: [mm(-6), mm(4.5)], step: [mm(2.4), 0], count: 2, kind: "res" }];

/**
 * A printer endstop board, shared by X, Y and Z: the lever switch standing
 * on its tabs with the lever toward +X, the three pin JST socket for the
 * mainboard cable, the status LED and its resistor. The LED stays dark:
 * nothing reports the endstops yet. Origin at the middle of the board.
 */
export function EndstopModel() {
  return (
    <group>
      <Pcb name="endstop" size={[L, T, W]} holes={HOLES} corner={mm(1)} />
      <group position={[mm(3), TOP + mm(2.4) + SWITCH.height / 2, -mm(3)]}>
        <MicroswitchModel />
      </group>
      <Jst position={[-L / 2 + mm(5), TOP, -mm(2.5)]} count={3} rotation={-Math.PI / 2} />
      <Block position={[mm(-1), TOP + mm(0.4), mm(4.5)]} size={[mm(1.6), mm(0.8), mm(0.8)]} material="ledOff" />
      <Passives runs={RUNS} top={TOP} />
      <TextDecal text="SIG GND VCC" position={[-L / 2 + mm(9.5), TOP + 0.0004, -mm(2.5)]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={mm(9)} height={mm(1.3)} weight={500} />
    </group>
  );
}
