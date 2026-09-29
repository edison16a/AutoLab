"use client";
import { Block, TextDecal } from "../primitives";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";

/** The common 34 x 21 mm breakout, long along X. */
const L = mm(34);
const W = mm(21);
const T = mm(1.6);
const TOP = T / 2;
const RUNS: PassiveRun[] = [
  { from: [mm(-7), mm(-6)], step: [mm(2.2), 0], count: 5, kind: "cap" },
  { from: [mm(-7), mm(6)], step: [mm(2.2), 0], count: 4, kind: "res" },
  { from: [mm(9), mm(-4)], step: [0, mm(2)], count: 4, kind: "res", turned: true },
];

const CHIP_MARKING = [{ text: "HX711", weight: 600 as const }, { text: "2138A" }];

/**
 * The common green HX711 load cell amplifier: tinned pads, the marked
 * SOP-16 converter in the middle, the transistor and passives that power
 * the bridge, white print, and gold header pins, six for the bridge
 * (E+ E- A- A+ B- B+) on one end and four for the Pico on the other.
 * Origin at the middle of the board, parts on +Y.
 */
export function HX711Model() {
  return (
    <group>
      <Pcb name="hx711" size={[L, T, W]} corner={mm(0.8)} material="pcbGreen" finish="tin" />
      <Ic position={[0, TOP, 0]} body={[mm(10), mm(3.9)]} height={mm(1.5)} leads={8} lines={CHIP_MARKING} />
      {/* S8050 transistor that switches the bridge excitation. */}
      <Ic position={[mm(8), TOP, mm(5)]} body={[mm(2.9), mm(1.3)]} height={mm(1)} leads={2} />
      {/* The 10 uF bulk cap on the supply, a larger 1206 ceramic. */}
      <Block position={[mm(-11), TOP + mm(0.6), mm(-5)]} size={[mm(3.2), mm(1.2), mm(1.6)]} material="ceramicTan" />
      <Passives runs={RUNS} top={TOP} />
      <Header position={[-L / 2 + mm(2), TOP, 0]} count={6} along="z" board={T} />
      <Header position={[L / 2 - mm(2), TOP, 0]} count={4} along="z" board={T} />
      <TextDecal text="E+ E- A- A+ B- B+" position={[-L / 2 + mm(5.2), TOP + 0.0004, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={mm(16)} height={mm(1.5)} weight={500} />
      <TextDecal text="GND DT SCK VCC" position={[L / 2 - mm(5.2), TOP + 0.0004, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={mm(11)} height={mm(1.5)} weight={500} />
    </group>
  );
}
