"use client";
import { Block, Bolt, Cylinder, Repeat, Tube, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { mm } from "./details/units";

/** Chamber floor and the top of the heated plate, relative to the platform's origin. */
const FLOOR = -0.15;
const TOP = 0.1665;
const PLATE = { width: 2.2, depth: 1.6, thickness: 0.08 } as const;
const PLATE_BOTTOM = TOP - PLATE.thickness;
const LEG_SPOTS: [number, number][] = [-0.95, 0.95].flatMap((x) => [-0.66, 0.66].map((z) => [x, z] as [number, number]));
const LEGS: RepeatItem[] = LEG_SPOTS.map(([x, z]) => ({ position: [x, (FLOOR + PLATE_BOTTOM) / 2, z] as Vec3 }));
const LEG_SCALE: Vec3 = [0.04, PLATE_BOTTOM - FLOOR, 0.04];
/** The nest's opening: the plate footprint plus half a millimetre all round. */
const NEST = { width: mm(128.8), depth: mm(86.5), bar: 0.05, height: mm(4) } as const;
const BOLTS: Vec3[] = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x * (PLATE.width / 2 - 0.08), TOP, z * (PLATE.depth / 2 - 0.08)] as Vec3));
/** Heater and thermistor leads, from the pad's edge back to the wall. */
const LEADS: Vec3[] = [
  [0.7, PLATE_BOTTOM - 0.02, -0.66],
  [0.72, PLATE_BOTTOM - 0.06, -0.86],
  [0.74, FLOOR + 0.04, -0.98],
  [0.76, FLOOR + 0.02, -1.2],
];

/** The fixed nest that locates the plate: four rails, three corner stops and a leaf spring on the fourth. */
function Nest() {
  const { width: w, depth: d, bar, height } = NEST;
  const y = TOP + height / 2;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (w / 2 + bar / 2), y, 0]} size={[bar, height, d * 0.7]} radius={mm(0.8)} material="graphite" />
          <Block position={[0, y, side * (d / 2 + bar / 2)]} size={[w * 0.7, height, bar]} radius={mm(0.8)} material="graphite" />
        </group>
      ))}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
      ].map(([sx, sz]) => (
        <Block key={`${sx}${sz}`} position={[sx * (w / 2 + bar / 2 - 0.01), y + mm(1), sz * (d / 2 + bar / 2 - 0.01)]} size={[bar + 0.04, height + mm(2), bar + 0.04]} radius={mm(1)} material="graphite" />
      ))}
      {/* The spring pushes the plate back into the opposite corner. */}
      <group position={[w / 2 - 0.02, y, d / 2 - 0.02]} rotation={[0, Math.PI / 4, 0]}>
        <Block position={[0, 0, 0.05]} size={[0.14, height + mm(2), 0.03]} radius={mm(1)} material="graphite" />
        <Block position={[0, mm(0.5), 0.02]} size={[0.1, height, 0.006]} material="steel" />
      </group>
    </group>
  );
}

/**
 * The heated platform: an aluminium plate on four standoffs with the
 * silicone heater pad and its thermistor underneath, and the fixed nest on
 * top that holds the 24-well plate at 37 °C. Origin at the platform's
 * centre, 0.15 above the chamber floor.
 */
export function HeatedPlatformModel() {
  return (
    <group>
      <Repeat items={LEGS} shape="cylinderLow" material="aluminium" scale={LEG_SCALE} />
      {LEG_SPOTS.map(([x, z]) => (
        <Cylinder key={`${x}${z}`} position={[x, FLOOR + 0.012, z]} radius={0.075} height={0.024} material="rubber" />
      ))}
      <Block position={[0, PLATE_BOTTOM - 0.006, 0]} size={[1.9, 0.012, 1.3]} material="rubber" />
      <Cylinder position={[0.7, PLATE_BOTTOM - 0.016, -0.5]} radius={0.035} height={0.012} material="steel" />
      <Block position={[0, TOP - PLATE.thickness / 2, 0]} size={[PLATE.width, PLATE.thickness, PLATE.depth]} material="aluminium" />
      {BOLTS.map((position) => (
        <Bolt key={position.join()} position={position} radius={0.03} />
      ))}
      <Nest />
      {[0, 1].map((i) => (
        <Tube key={i} points={LEADS.map(([x, y, z]) => [x + i * 0.035, y, z] as Vec3)} radius={0.012} material={i ? "plasticWhite" : "plasticBlack"} segments={24} />
      ))}
    </group>
  );
}
