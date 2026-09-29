"use client";
import { useMemo } from "react";
import type { MaterialKey } from "../materials";
import type { Vec3 } from "../types";
import { Block } from "./Block";
import { Cylinder } from "./Cylinder";
import { Repeat, type RepeatItem } from "./Repeat";

const PIN_SCALE: Vec3 = [0.01, 0.105, 0.01];
const LEAD_SCALE: Vec3 = [0.032, 0.009, 0.012];

/** A straight header: `count` pins spread evenly along X over `length`. */
export function Pins({ count = 10, length = 0.6, material = "steel" }: { count?: number; length?: number; material?: MaterialKey }) {
  const items = useMemo<RepeatItem[]>(
    () => Array.from({ length: count }, (_, i) => ({ position: [(i / Math.max(1, count - 1) - 0.5) * length, 0.07, 0] as Vec3 })),
    [count, length],
  );
  return <Repeat items={items} material={material} scale={PIN_SCALE} />;
}

/** A surface mount IC: a black body with six leads down each long side. */
export function Chip({ position = [0, 0, 0], size = [0.16, 0.04, 0.16] }: { position?: Vec3; size?: Vec3 }) {
  const [w, , d] = size;
  const leads = useMemo<RepeatItem[]>(
    () =>
      [-1, 1].flatMap((side) =>
        Array.from({ length: 6 }, (_, i) => ({ position: [side * (w / 2 + 0.012), -0.008, (i / 5 - 0.5) * d * 0.8] as Vec3 })),
      ),
    [w, d],
  );
  return (
    <group position={position}>
      <Block size={size} material="plasticBlack" />
      <Repeat items={leads} material="steel" scale={LEAD_SCALE} />
    </group>
  );
}

/** A pan head screw seen from above: a short cylinder with a slot. */
export function Bolt({ position = [0, 0, 0], radius = 0.035 }: { position?: Vec3; radius?: number }) {
  return (
    <group position={position}>
      <Cylinder radius={radius} height={radius * 0.5} low material="steel" />
      <Block position={[0, radius * 0.26, 0]} size={[radius * 1.15, 0.002, radius * 0.22]} material="plasticBlack" />
    </group>
  );
}
