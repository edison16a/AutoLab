"use client";
import { Block, Repeat, type RepeatItem } from "../../../primitives";
import type { MaterialKey } from "../../../materials";
import type { Vec3 } from "../../../types";

/** A plug body: its centre, size and moulding. Metal shells go in as their own entries. */
export interface PlugPart {
  position: Vec3;
  size: Vec3;
  material: MaterialKey;
  radius?: number;
}

/** A white JST XH motor plug, 4 way, pushed into a socket that opens toward +Z. */
export function jstPlug(x: number, y: number, back: number): PlugPart {
  return { position: [x, y, back - 0.035], size: [0.15, 0.072, 0.07], material: "plasticWhite", radius: 0.006 };
}

/** Dupont jumper housings are 2.54 mm square and 14 mm tall, standing on header pins. */
export const DUPONT_SCALE: Vec3 = [0.029, 0.15, 0.029];

/**
 * Every plug and jumper housing for the wiring. Rounded bodies are drawn one by one;
 * the many identical jumper housings go in one instanced draw.
 */
export function Plugs({ parts, jumpers }: { parts: PlugPart[]; jumpers: RepeatItem[] }) {
  return (
    <group>
      {parts.map((part) => (
        <Block key={part.position.join()} position={part.position} size={part.size} radius={part.radius ?? 0} material={part.material} />
      ))}
      {jumpers.length ? <Repeat items={jumpers} material="plasticBlack" scale={DUPONT_SCALE} /> : null}
    </group>
  );
}
