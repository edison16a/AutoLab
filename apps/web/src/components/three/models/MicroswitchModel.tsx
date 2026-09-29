"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { mm } from "./details/units";

/** A KW11 lever switch: 20 x 10 x 6.4 mm, broad faces toward ±Z, lever on +Y. */
export const SWITCH = { length: mm(20), height: mm(10), depth: mm(6.4) } as const;

const { length: L, height: H, depth: D } = SWITCH;
/** COM, NC and NO solder tabs along the bottom. */
const TABS: RepeatItem[] = [-mm(7.3), 0, mm(7.3)].map((x) => ({ position: [x, -H / 2 - mm(2), 0] as Vec3 }));
const TAB_SCALE: Vec3 = [mm(3.2), mm(4), mm(0.5)];
/** The two 2.3 mm mounting holes, 9.5 mm apart. */
const HOLES = [-mm(4.75), mm(4.75)];
const LEVER_ANGLE = 0.2;

/**
 * A lever microswitch: black body with its two mounting holes, the grey
 * plunger near one end, a steel lever hinged at the other end lying over
 * it, and three tabs. Used for the pipette home switch and on each endstop
 * board. Origin at the middle of the body.
 */
export function MicroswitchModel() {
  const hinge: Vec3 = [-L / 2 + mm(1.5), H / 2 + mm(0.6), 0];
  return (
    <group>
      <Block size={[L, H, D]} radius={mm(0.4)} material="plasticBlack" />
      {HOLES.map((x) => (
        <group key={x}>
          {[-1, 1].map((side) => (
            <Cylinder key={side} position={[x, -mm(1.2), side * (D / 2 + 0.0003)]} rotation={[Math.PI / 2, 0, 0]} radius={mm(1.15)} height={0.001} low material="graphite" />
          ))}
        </group>
      ))}
      <Block position={[mm(3), H / 2 + mm(0.7), 0]} size={[mm(2.2), mm(1.4), mm(2.8)]} material="plasticGrey" />
      <Repeat items={TABS} material="steel" scale={TAB_SCALE} />
      <group position={hinge} rotation={[0, 0, LEVER_ANGLE]}>
        <Block position={[L * 0.52, 0, 0]} size={[L * 1.05, mm(0.5), mm(4)]} material="steel" />
        <Block position={[L * 1.03, mm(0.8), 0]} size={[mm(1.2), mm(2), mm(4)]} radius={mm(0.4)} material="steel" />
      </group>
      <Cylinder position={hinge} rotation={[Math.PI / 2, 0, 0]} radius={mm(0.9)} height={mm(4.4)} low material="steel" />
      <TextDecal text="KW11-3Z" position={[mm(2), mm(1.8), D / 2 + 0.0004]} rotation={[0, 0, 0]} width={mm(9)} height={mm(1.8)} weight={500} />
    </group>
  );
}
