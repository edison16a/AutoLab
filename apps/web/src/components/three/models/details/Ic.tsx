"use client";
import { useMemo } from "react";
import type { MaterialKey } from "../../materials";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { ChipMarking, type MarkingLine } from "./ChipMarking";
import { mm } from "./units";

export interface IcProps {
  /** Centre of the package's footprint on the board's top face. */
  position: Vec3;
  /** Body width (X) and depth (Z), in scene units. */
  body: [number, number];
  height?: number;
  /** Leads per side. SOIC leads run down the two long sides; QFP has them on all four. */
  leads?: number;
  style?: "soic" | "qfp" | "qfn";
  label?: string;
  /** Several marking lines (maker, part number, date code) in place of a single label. */
  lines?: MarkingLine[];
  material?: MaterialKey;
}

const LEAD = { width: mm(0.4), reach: mm(1), height: mm(0.25) } as const;

/**
 * A packaged chip sitting on the board: a sharp edged body (rounded tops
 * this small catch a star shaped highlight), its tinned gull wing leads in
 * one instanced draw, and the part number laser marked on top in the soft
 * grey real markings have.
 */
export function Ic({ position, body: [w, d], height = mm(1.2), leads = 4, style = "soic", label, lines, material = "plasticBlack" }: IcProps) {
  const long = Math.max(w, d);
  const short = Math.min(w, d);
  const pins = useMemo<RepeatItem[]>(() => {
    if (style === "qfn") return [];
    const rows: RepeatItem[] = [];
    const spread = (i: number) => (leads === 1 ? 0 : (i / (leads - 1) - 0.5) * long * 0.8);
    // Leads come out of the long sides. For a body long along X that is the two Z facing sides.
    const alongX = w >= d;
    for (const side of [-1, 1])
      for (let i = 0; i < leads; i++) {
        const out = side * (short / 2 + LEAD.reach / 2);
        rows.push(
          alongX
            ? { position: [spread(i), LEAD.height / 2, out], scale: [LEAD.width, LEAD.height, LEAD.reach] }
            : { position: [out, LEAD.height / 2, spread(i)], scale: [LEAD.reach, LEAD.height, LEAD.width] },
        );
        if (style === "qfp")
          rows.push(
            alongX
              ? { position: [side * (long / 2 + LEAD.reach / 2), LEAD.height / 2, spread(i) * (short / long)], scale: [LEAD.reach, LEAD.height, LEAD.width] }
              : { position: [spread(i) * (short / long), LEAD.height / 2, side * (long / 2 + LEAD.reach / 2)], scale: [LEAD.width, LEAD.height, LEAD.reach] },
          );
      }
    return rows;
  }, [w, d, long, short, leads, style]);
  // Print along the package's long side, like the real marking.
  const turn: Vec3 = w >= d ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, Math.PI / 2];
  const marking = lines ?? (label ? [{ text: label }] : null);
  const markHeight = lines ? short * 0.7 : short * 0.3;
  return (
    <group position={position}>
      <Block position={[0, height / 2, 0]} size={[w, height, d]} material={material} />
      {pins.length ? <Repeat items={pins} material="tin" /> : null}
      {marking ? <ChipMarking lines={marking} position={[0, height + 0.0006, 0]} rotation={turn} width={long * 0.8} height={markHeight} /> : null}
    </group>
  );
}
