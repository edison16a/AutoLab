"use client";
import { Block, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { MicroUsb } from "./details/Connectors";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm, PITCH } from "./details/units";
import type { PartModelProps } from "./model-props";
import { PicoPads } from "./pico/PicoPads";

/** 51 x 21 x 1 mm, long along Z with the USB end toward +Z. */
const W = mm(21);
const L = mm(51);
const T = mm(1);
const TOP = T / 2;
/** 2.1 mm mounting holes on an 11.4 x 47 mm rectangle. */
const HOLES = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * mm(5.7), z: z * mm(23.5), radius: mm(1.05) })));
/** The pin rows are 0.7 inch apart. */
const ROW = mm(8.89);
/** The three SWD debug pads at the far end from the USB. */
const DEBUG: RepeatItem[] = [-1, 0, 1].map((i) => ({ position: [i * PITCH, TOP + 0.0004, -L / 2 + mm(1.6)] as Vec3 }));
const DEBUG_SCALE: Vec3 = [mm(0.8), 0.0008, mm(0.8)];
const RUNS: PassiveRun[] = [
  { from: [mm(-5.5), mm(-5)], step: [0, mm(1.8)], count: 6, kind: "cap", turned: true },
  { from: [mm(5.5), mm(-5)], step: [0, mm(1.8)], count: 5, kind: "cap", turned: true },
  { from: [mm(-2.5), mm(-7)], step: [mm(1.8), 0], count: 4, kind: "res" },
  { from: [mm(-7.5), mm(7)], step: [0, mm(1.8)], count: 3, kind: "res", turned: true },
];
/** What the B2 stepping of the RP2040 carries on its lid. */
const RP2040_MARKING = [{ text: "RP2-B2", weight: 600 as const }, { text: "21/32" }, { text: "P64M15.00" }];

/** Reads along the board from the USB end, like the real print. */
const ALONG: Vec3 = [-Math.PI / 2, 0, Math.PI / 2];

/** The BOOTSEL tact switch: a white body with its round white plunger. */
function Bootsel() {
  return (
    <group position={[mm(-5), TOP, mm(17.5)]}>
      <Block position={[0, mm(0.7), 0]} size={[mm(4.2), mm(1.4), mm(3.2)]} radius={mm(0.2)} material="plasticWhite" />
      <Block position={[0, mm(1.6), 0]} size={[mm(1.8), mm(0.5), mm(1.8)]} radius={mm(0.25)} material="labelWhite" />
    </group>
  );
}

/** White silkscreen: the name and year, and the button, LED and debug names. */
function Silkscreen() {
  const y = TOP + 0.0004;
  return (
    <>
      <TextDecal text="Raspberry Pi Pico ©2020" position={[mm(1), y, mm(-17)]} rotation={ALONG} width={mm(15)} height={mm(1.9)} weight={600} />
      <TextDecal text="BOOTSEL" position={[mm(-5), y, mm(14.6)]} width={mm(6)} height={mm(1.3)} weight={500} />
      <TextDecal text="LED" position={[mm(5.2), y, mm(16.7)]} width={mm(3)} height={mm(1.2)} weight={500} />
      <TextDecal text="DEBUG" position={[0, y, -L / 2 + mm(3.4)]} width={mm(5)} height={mm(1.1)} weight={500} />
    </>
  );
}

/**
 * Raspberry Pi Pico in its green solder mask: gold castellated pads down
 * both edges with the header pins soldered through, the marked RP2040 in
 * the middle, its QSPI flash and silver crystal, the buck converter and
 * its inductor, a nickel micro USB, the white BOOTSEL button, the green
 * LED on GP25 and the debug pads at the far end. It stands on headers
 * soldered underneath. Origin at the middle of the board.
 */
export function PicoModel({ live = false }: PartModelProps) {
  return (
    <group>
      <Pcb name="pico" size={[W, T, L]} holes={HOLES} material="pcbGreen" finish="gold" />
      <PicoPads row={ROW} edge={W / 2} top={TOP} thickness={T} />
      <Repeat items={DEBUG} shape="cylinderLow" material="gold" scale={DEBUG_SCALE} />
      <Ic position={[0, TOP, mm(-1)]} body={[mm(7), mm(7)]} height={mm(0.9)} style="qfn" lines={RP2040_MARKING} />
      <Ic position={[mm(-1.5), TOP, mm(8.5)]} body={[mm(3), mm(2)]} height={mm(0.55)} style="qfn" />
      {/* The 12 MHz crystal in its metal lid package. */}
      <Block position={[mm(-5), TOP + mm(0.4), mm(-9.5)]} size={[mm(3.2), mm(0.8), mm(2.5)]} radius={mm(0.15)} material="tin" />
      {/* Buck converter and its moulded inductor beside the VSYS pins. */}
      <Ic position={[mm(5.2), TOP, mm(11.5)]} body={[mm(3), mm(3)]} height={mm(0.8)} style="qfn" />
      <Block position={[mm(2.2), TOP + mm(0.6), mm(15)]} size={[mm(2.5), mm(1.2), mm(2)]} radius={mm(0.15)} material="plasticBlack" />
      <MicroUsb position={[0, TOP, L / 2 - mm(2.4)]} />
      <Bootsel />
      <Block position={[mm(5.2), TOP + mm(0.3), mm(18.6)]} size={[mm(1.6), mm(0.6), mm(0.8)]} material={live ? "ledGreen" : "ledGreenOff"} />
      <Passives runs={RUNS} top={TOP} />
      <Silkscreen />
      {[-1, 1].map((side) => (
        <Header key={side} position={[side * ROW, -T / 2 - mm(2.5), 0]} count={20} along="z" pinLength={0} tailLength={mm(8.5)} board={0} />
      ))}
    </group>
  );
}
