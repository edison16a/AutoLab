"use client";
import type { MaterialKey } from "../../materials";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { at, mmX, mmZ, onTop, PI_PARTS, TOP } from "./layout";

/** A straight run of identical passives, in drawing millimetres. */
interface Run {
  from: [number, number];
  step: [number, number];
  count: number;
  kind: "cap" | "res";
}

/**
 * Decoupling and bias parts where the real board has them: ringing the
 * SoC and memory, beside the power chip, the USB controller, the Ethernet
 * PHY and the camera connector. Hand placed so nothing lands on a part.
 */
const RUNS: Run[] = [
  { from: [23, 22.8], step: [1.6, 0], count: 9, kind: "cap" },
  { from: [23, 42.2], step: [1.6, 0], count: 9, kind: "cap" },
  { from: [39.1, 26], step: [0, 1.6], count: 9, kind: "cap" },
  { from: [20.4, 29], step: [0, 1.6], count: 3, kind: "res" },
  { from: [41, 39.9], step: [1.5, 0], count: 7, kind: "res" },
  { from: [8.6, 9.8], step: [0, 1.6], count: 5, kind: "cap" },
  { from: [10.2, 18.3], step: [1.5, 0], count: 4, kind: "res" },
  { from: [55, 16.9], step: [1.5, 0], count: 5, kind: "cap" },
  { from: [63.2, 19], step: [0, 1.5], count: 5, kind: "cap" },
  { from: [61, 35], step: [0, 1.5], count: 4, kind: "res" },
  { from: [50.3, 15.8], step: [0, 1.5], count: 5, kind: "res" },
  { from: [4.4, 9.5], step: [0, 2.8], count: 2, kind: "res" },
];

/** An 0603 body: 1.6 by 0.8 mm, with its metal ends in a separate batch. */
const LONG = mmX(1.6);
const SHORT = mmZ(0.8);
const HEIGHT = 0.008;

function layout() {
  const caps: RepeatItem[] = [];
  const resistors: RepeatItem[] = [];
  const ends: RepeatItem[] = [];
  for (const run of RUNS) {
    // Parts sit side by side, so a run along X has its parts turned across it.
    const across = run.step[0] !== 0;
    const body: Vec3 = across ? [SHORT, HEIGHT, LONG] : [LONG, HEIGHT, SHORT];
    const cap: Vec3 = across ? [SHORT * 1.02, HEIGHT * 1.05, LONG * 0.2] : [LONG * 0.2, HEIGHT * 1.05, SHORT * 1.02];
    for (let i = 0; i < run.count; i += 1) {
      const [x, z] = at(run.from[0] + run.step[0] * i, run.from[1] + run.step[1] * i);
      const position: Vec3 = [x, TOP + HEIGHT / 2, z];
      (run.kind === "cap" ? caps : resistors).push({ position, scale: body });
      for (const end of [-1, 1]) {
        const offset = end * LONG * 0.4;
        ends.push({ position: across ? [x, position[1], z + offset] : [x + offset, position[1], z], scale: cap });
      }
    }
  }
  return { caps, resistors, ends };
}

const PARTS = layout();

/** Power inductors next to the PMIC, the only tall passives on the board. */
const INDUCTORS: [number, number][] = [
  [18.2, 13.5],
  [18.2, 8.8],
];
const INDUCTOR_SIZE: Vec3 = [mmX(4), 0.022, mmZ(4)];

/**
 * The power LED (red) sits nearest the USB-C corner and the activity LED
 * (green) just behind it, both on the left edge like the real board.
 */
const LEDS = [
  { dz: 0, on: "ledRed", off: "ledRedOff" },
  { dz: mmZ(2.8), on: "ledGreen", off: "ledGreenOff" },
] as const satisfies { dz: number; on: MaterialKey; off: MaterialKey }[];

/**
 * Small surface mount parts: tan ceramic capacitors, black resistors with
 * tinned ends, the shielded power inductors and the two status LEDs, which
 * light in their real colours while the Pi is powered.
 */
export function SmdParts({ powered }: { powered: boolean }) {
  const [ledX, ledZ] = at(PI_PARTS.leds[0], PI_PARTS.leds[1]);
  return (
    <group>
      <Repeat items={PARTS.caps} material="ceramicTan" />
      <Repeat items={PARTS.resistors} material="plasticBlack" />
      <Repeat items={PARTS.ends} material="tin" />
      {INDUCTORS.map(([x, y]) => (
        <Block key={`${x}:${y}`} position={onTop(x, y, INDUCTOR_SIZE[1] / 2)} size={INDUCTOR_SIZE} material="graphite" />
      ))}
      {LEDS.map(({ dz, on, off }) => (
        <Block key={dz} position={[ledX, TOP + 0.005, ledZ - dz]} size={[mmX(1.6), 0.01, mmZ(0.9)]} radius={0.002} material={powered ? on : off} />
      ))}
    </group>
  );
}
