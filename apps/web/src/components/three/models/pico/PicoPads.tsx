"use client";
import { useMemo } from "react";
import { Repeat, type RepeatItem } from "../../primitives";
import { mm, PITCH } from "../details/units";

export interface PicoPadsProps {
  /** Distance from the board's centre line to each row of pin holes. */
  row: number;
  /** Distance from the centre line to the long edges. */
  edge: number;
  /** The board's top face and thickness. */
  top: number;
  thickness: number;
}

const PINS = 20;
const PAD_ALONG = mm(1.7);
const PIN = mm(0.64);

/**
 * The Pico's forty edge pins. Each has a gold pad running from its hole
 * out to the edge, where the plated half hole (the castellation) shows as
 * a gold strip down the edge. A header pin is soldered through from
 * underneath: a solder dome with the solder coated pin tip poking out.
 * Every kind of copy is one instanced draw.
 */
export function PicoPads({ row, edge, top, thickness }: PicoPadsProps) {
  const { pads, halves, domes, tips } = useMemo(() => {
    const pads: RepeatItem[] = [];
    const halves: RepeatItem[] = [];
    const domes: RepeatItem[] = [];
    const tips: RepeatItem[] = [];
    const padWidth = edge - row + mm(0.9);
    for (const side of [-1, 1])
      for (let i = 0; i < PINS; i++) {
        const z = (i - (PINS - 1) / 2) * PITCH;
        pads.push({ position: [side * (edge - padWidth / 2), top + 0.0003, z], scale: [padWidth, 0.0006, PAD_ALONG] });
        halves.push({ position: [side * (edge + mm(0.05)), 0, z], scale: [mm(0.1), thickness + 0.0004, mm(1.1)] });
        domes.push({ position: [side * row, top + mm(0.15), z], scale: [mm(0.85), mm(0.45), mm(0.85)] });
        tips.push({ position: [side * row, top + mm(0.5), z], scale: [PIN, mm(1), PIN] });
      }
    return { pads, halves, domes, tips };
  }, [row, edge, top, thickness]);
  return (
    <>
      <Repeat items={pads} material="gold" />
      <Repeat items={halves} material="gold" />
      <Repeat items={domes} shape="sphere" material="tin" />
      <Repeat items={tips} material="tin" />
    </>
  );
}
