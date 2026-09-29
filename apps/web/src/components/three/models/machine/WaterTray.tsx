"use client";
import { Block } from "../../primitives";
import { CHAMBER_FLOOR } from "./layout";

/**
 * The humidity tray along the front of the chamber floor, between the two
 * bottles and just inside the door, where it can be topped up without
 * reaching past the plate. Sized to clear the platform in front and the
 * bottom rail behind the door.
 */
const TRAY = { z: 1.42, width: 2.1, depth: 0.44, height: 0.14, wall: 0.012 } as const;
/** Filled a little over half way. */
const WATER_LEVEL = 0.62;
const RIM = 0.022;

/**
 * A shallow stainless pan with a rolled rim and a layer of water. The
 * water evaporates into the warm chamber air and the circulation fan
 * carries it round, which is what keeps the cultures at 85 to 95% RH.
 */
export function WaterTray() {
  const { z, width: w, depth: d, height: h, wall } = TRAY;
  const floor = CHAMBER_FLOOR;
  const mid = floor + h / 2;
  return (
    <group position={[0, 0, z]}>
      <Block position={[0, floor + wall / 2, 0]} size={[w, wall, d]} material="stainless" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[0, mid, side * (d / 2 - wall / 2)]} size={[w, h, wall]} material="stainless" />
          <Block position={[side * (w / 2 - wall / 2), mid, 0]} size={[wall, h, d]} material="stainless" />
          <Block position={[0, floor + h, side * (d / 2)]} size={[w + RIM, RIM, RIM]} radius={RIM / 2} material="stainless" />
          <Block position={[side * (w / 2), floor + h, 0]} size={[RIM, RIM, d + RIM]} radius={RIM / 2} material="stainless" />
        </group>
      ))}
      <Block position={[0, floor + h * WATER_LEVEL, 0]} size={[w - wall * 2, 0.006, d - wall * 2]} material="water" />
    </group>
  );
}
