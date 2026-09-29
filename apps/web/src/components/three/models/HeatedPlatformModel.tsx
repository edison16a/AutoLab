"use client";
import { Block, Cylinder, Repeat, type RepeatItem } from "../primitives";

/** Floor of the chamber relative to the platform's origin. */
const FLOOR = -0.15;
const LEGS: RepeatItem[] = [-0.95, 0.95].flatMap((x) => [-0.66, 0.66].map((z) => ({ position: [x, -0.05, z] })));
const LEG_SCALE: [number, number, number] = [0.05, 0.2, 0.05];
// Inside of the nest matches the plate's footprint with a little clearance.
const NEST = { w: 1.64, d: 1.12, bar: 0.06, y: 0.175 } as const;

/**
 * The heated platform: an aluminium plate on four legs with the heater pad
 * underneath and the fixed plate nest on top that locates the 24-well plate.
 */
export function HeatedPlatformModel() {
  const { w, d, bar, y } = NEST;
  return (
    <group>
      <Repeat items={LEGS} shape="cylinderLow" material="aluminium" scale={LEG_SCALE} />
      {LEGS.map((leg) => (
        <Cylinder key={leg.position.join()} position={[leg.position[0], FLOOR + 0.01, leg.position[2]]} radius={0.08} height={0.02} material="rubber" />
      ))}
      <Block position={[0, 0.045, 0]} size={[2.0, 0.02, 1.4]} radius={0.008} material="plasticBlack" />
      <Block position={[0, 0.1, 0]} size={[2.2, 0.1, 1.6]} radius={0.03} material="aluminium" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (w / 2 + bar / 2), y, 0]} size={[bar, 0.05, d + bar * 2]} radius={0.012} material="graphite" />
          <Block position={[0, y, side * (d / 2 + bar / 2)]} size={[w, 0.05, bar]} radius={0.012} material="graphite" />
        </group>
      ))}
    </group>
  );
}
