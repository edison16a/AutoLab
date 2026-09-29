"use client";
import { Block, Bolt, Cylinder, Repeat, Ring, type RepeatItem } from "../primitives";

const SIZE = 0.8;
const DEPTH = 0.2;
// Seven pitched blades around the hub. Each is twisted about its own length, then swung into place (ZYX order).
const BLADES: RepeatItem[] = Array.from({ length: 7 }, (_, i) => {
  const a = (i * Math.PI * 2) / 7;
  return { position: [Math.cos(a) * 0.23, Math.sin(a) * 0.23, 0], rotation: [0, 0.5, a - Math.PI / 2] };
});
const CORNERS: [number, number][] = [-1, 1].flatMap((x) => [-1, 1].map((y) => [x * 0.33, y * 0.33] as [number, number]));

/** An 80 mm class circulation fan with a wire finger guard, blowing along +Z. */
export function FanModel() {
  const half = SIZE / 2;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (half - 0.04), 0, 0]} size={[0.08, SIZE, DEPTH]} radius={0.02} material="plasticBlack" />
          <Block position={[0, side * (half - 0.04), 0]} size={[SIZE, 0.08, DEPTH]} radius={0.02} material="plasticBlack" />
        </group>
      ))}
      <Ring position={[0, 0, 0]} rotation={[0, 0, 0]} radius={0.37} material="plasticBlack" />
      <Cylinder position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.12} height={DEPTH * 0.9} material="plasticBlack" />
      <Repeat items={BLADES} material="plasticBlack" scale={[0.13, 0.22, 0.012]} order="ZYX" />
      {/* Finger guard on the intake face. */}
      {[0.14, 0.26, 0.36].map((r) => (
        <Ring key={r} position={[0, 0, DEPTH / 2 + 0.02]} rotation={[0, 0, 0]} radius={r} thin material="steel" />
      ))}
      <Block position={[0, 0, DEPTH / 2 + 0.02]} size={[0.74, 0.012, 0.012]} material="steel" />
      <Block position={[0, 0, DEPTH / 2 + 0.02]} size={[0.012, 0.74, 0.012]} material="steel" />
      {CORNERS.map(([x, y]) => (
        <group key={`${x}${y}`} position={[x, y, DEPTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <Bolt radius={0.03} />
        </group>
      ))}
    </group>
  );
}
