"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { MicroUsb } from "./details/Connectors";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm, PITCH } from "./details/units";
import type { PartModelProps } from "./model-props";

/** 51 x 21 x 1 mm, long along Z with the USB end toward +Z. */
const W = mm(21);
const L = mm(51);
const T = mm(1);
const TOP = T / 2;
const EDGE = W / 2;
/** 2.1 mm mounting holes on an 11.4 x 47 mm rectangle. */
const HOLES = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * mm(5.7), z: z * mm(23.5), radius: mm(1.05) })));
/** Twenty castellated pads down each long edge, on the 0.1 inch grid. */
const PADS: RepeatItem[] = [-1, 1].flatMap((side) =>
  Array.from({ length: 20 }, (_, i) => ({ position: [side * (EDGE - mm(0.8)), TOP + 0.0004, (i - 9.5) * PITCH] as Vec3 })),
);
const PAD_SCALE: Vec3 = [mm(1.6), 0.0008, mm(1.5)];
/** The three SWD debug pads at the far end from the USB. */
const DEBUG: RepeatItem[] = [-1, 0, 1].map((i) => ({ position: [i * PITCH, TOP + 0.0004, -L / 2 + mm(1.6)] as Vec3 }));
const DEBUG_SCALE: Vec3 = [mm(0.8), 0.0008, mm(0.8)];
const RUNS: PassiveRun[] = [
  { from: [mm(-5.5), mm(-5)], step: [0, mm(1.8)], count: 6, kind: "cap", turned: true },
  { from: [mm(5.5), mm(-5)], step: [0, mm(1.8)], count: 5, kind: "cap", turned: true },
  { from: [mm(-2.5), mm(-7)], step: [mm(1.8), 0], count: 4, kind: "res" },
  { from: [mm(-7.5), mm(7)], step: [0, mm(1.8)], count: 3, kind: "res", turned: true },
];

/**
 * Raspberry Pi Pico: the castellated board with the RP2040 in the middle,
 * its QSPI flash and crystal, the buck converter, micro USB, BOOTSEL
 * button and LED at one end and the debug pads at the other. It stands on
 * headers soldered underneath. Origin at the middle of the board.
 */
export function PicoModel({ live = false }: PartModelProps) {
  return (
    <group>
      <Pcb name="pico" size={[W, T, L]} holes={HOLES} />
      <Repeat items={PADS} material="steel" scale={PAD_SCALE} />
      <Repeat items={DEBUG} shape="cylinderLow" material="steel" scale={DEBUG_SCALE} />
      <Ic position={[0, TOP, mm(-1)]} body={[mm(7), mm(7)]} height={mm(0.9)} style="qfn" label="RP2040" />
      <Ic position={[0, TOP, mm(8.5)]} body={[mm(5.3), mm(5.3)]} leads={4} label="W25Q16" />
      <Block position={[mm(-5), TOP + mm(0.4), mm(-9.5)]} size={[mm(3.2), mm(0.8), mm(2.5)]} material="aluminium" />
      {/* Buck converter and its inductor beside the VSYS pins. */}
      <Ic position={[mm(5), TOP, mm(11.5)]} body={[mm(3), mm(3)]} height={mm(0.8)} style="qfn" />
      <Block position={[mm(5), TOP + mm(1), mm(15.5)]} size={[mm(3), mm(2), mm(3)]} material="graphite" />
      <MicroUsb position={[0, TOP, L / 2 - mm(2.4)]} />
      {/* BOOTSEL: a tact switch with its white plunger. */}
      <group position={[mm(-5), TOP, mm(17.5)]}>
        <Block position={[0, mm(0.8), 0]} size={[mm(4.2), mm(1.6), mm(3.2)]} material="steel" />
        <Cylinder position={[0, mm(1.9), 0]} radius={mm(1)} height={mm(0.8)} low material="plasticWhite" />
      </group>
      <Block position={[mm(4.2), TOP + mm(0.3), mm(18.6)]} size={[mm(1.6), mm(0.6), mm(0.8)]} material={live ? "ledOn" : "ledOff"} />
      <Passives runs={RUNS} top={TOP} />
      <TextDecal text="Raspberry Pi Pico" position={[0, TOP + 0.0004, mm(-17.5)]} width={mm(16)} height={mm(2.6)} />
      <TextDecal text="BOOTSEL" position={[mm(-5), TOP + 0.0004, mm(14.4)]} width={mm(6)} height={mm(1.3)} weight={500} />
      {[-1, 1].map((side) => (
        <Header key={side} position={[side * (EDGE - mm(1.27)), -T / 2 - mm(2.5), 0]} count={20} along="z" pinLength={0} tailLength={mm(8.5)} board={0} />
      ))}
    </group>
  );
}
