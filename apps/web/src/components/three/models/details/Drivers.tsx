"use client";
import { useMemo } from "react";
import { Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { Heatsinks } from "./Heatsink";
import { Ic } from "./Ic";
import { mm } from "./units";

/** TMC2208 class drivers come in a 5 mm QFN. */
const CHIP = { side: mm(5), height: mm(0.9) } as const;
/** Each driver has two 1206 current sense resistors beside it. */
const SENSE = { length: mm(3.2), width: mm(1.6), height: mm(0.6), cap: mm(0.5) } as const;

export interface OnboardDriversProps {
  /** Centres of each driver chip on the mainboard's top face. */
  spots: Vec3[];
  /** Axis letters silkscreened in front of each driver. */
  labels?: string[];
}

/**
 * Stepper drivers soldered straight to the mainboard, the way Creality
 * builds its boards: the QFN chip under a small aluminium heatsink, with
 * its pair of sense resistors alongside. Resistors across the row share
 * two instanced draws, the heatsinks another.
 */
export function OnboardDrivers({ spots, labels = [] }: OnboardDriversProps) {
  const { bodies, ends, sinks } = useMemo(() => {
    const bodies: RepeatItem[] = [];
    const ends: RepeatItem[] = [];
    for (const [x, y, z] of spots)
      for (const dz of [-mm(1.4), mm(1.4)]) {
        const at: Vec3 = [x + mm(7), y + SENSE.height / 2, z + dz];
        bodies.push({ position: at, scale: [SENSE.length - SENSE.cap * 2, SENSE.height, SENSE.width] });
        for (const side of [-1, 1])
          ends.push({ position: [at[0] + side * (SENSE.length / 2 - SENSE.cap / 2), at[1], at[2]], scale: [SENSE.cap, SENSE.height, SENSE.width] });
      }
    const sinks = spots.map(([x, y, z]): Vec3 => [x, y + CHIP.height, z]);
    return { bodies, ends, sinks };
  }, [spots]);
  return (
    <>
      {spots.map((spot, i) => (
        <group key={`${spot[0]}${spot[2]}`}>
          <Ic position={spot} body={[CHIP.side, CHIP.side]} height={CHIP.height} style="qfn" />
          {labels[i] ? (
            <TextDecal text={labels[i]} position={[spot[0], spot[1] + 0.0004, spot[2] + mm(7.5)]} width={mm(3)} height={mm(3)} weight={700} />
          ) : null}
        </group>
      ))}
      <Repeat items={bodies} material="plasticBlack" />
      <Repeat items={ends} material="tin" />
      <Heatsinks spots={sinks} />
    </>
  );
}
