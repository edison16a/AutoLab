"use client";
import { Block, Cylinder } from "../../primitives";

/** The open electronics box outside the enclosure, bottom right. Centre and inside size in scene units. */
const BOX = { x: 3.1, z: 0.35, width: 1.3, depth: 2.0, height: 0.42 } as const;
const WALL = 0.05;
// Steel standoffs under the Pi's four mounting holes.
const PI_STANDOFFS: [number, number][] = [2.63, 3.57].flatMap((x) => [-0.385, 0.225].map((z) => [x, z] as [number, number]));

/** Holds the Raspberry Pi, Pico and pH module, open on top so the boards stay visible. */
export function ElectronicsBox() {
  const { x, z, width: w, depth: d, height: h } = BOX;
  const wallY = (h + 0.06) / 2;
  return (
    <group>
      <Block position={[x, 0.03, z]} size={[w, 0.06, d]} radius={0.02} material="plasticWhite" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[x + side * (w / 2 - WALL / 2), wallY, z]} size={[WALL, h - 0.06, d]} radius={0.015} material="plasticWhite" />
          <Block position={[x, wallY, z + side * (d / 2 - WALL / 2)]} size={[w - WALL * 2, h - 0.06, WALL]} radius={0.015} material="plasticWhite" />
        </group>
      ))}
      {PI_STANDOFFS.map(([sx, sz]) => (
        <Cylinder key={`${sx}${sz}`} position={[sx, 0.14, sz]} radius={0.03} height={0.16} low material="steel" />
      ))}
    </group>
  );
}
