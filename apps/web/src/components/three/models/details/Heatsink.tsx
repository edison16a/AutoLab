"use client";
import { useMemo } from "react";
import { Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { mm } from "./units";

/** The 9 mm stick-on sinks sold for stepper drivers: a thin base and five fins. */
const SINK = { side: mm(9), base: mm(1.5), fin: mm(0.9), fins: 5, height: mm(5) } as const;

/**
 * Bare aluminium heatsinks stuck on driver chips. Each spot is the centre
 * of a chip's top face, and every base and fin across the row is one
 * instanced draw.
 */
export function Heatsinks({ spots }: { spots: Vec3[] }) {
  const parts = useMemo<RepeatItem[]>(
    () =>
      spots.flatMap(([x, y, z]) => {
        const base: RepeatItem = { position: [x, y + SINK.base / 2, z], scale: [SINK.side, SINK.base, SINK.side] };
        const fins = Array.from({ length: SINK.fins }, (_, i): RepeatItem => ({
          position: [x + (i / (SINK.fins - 1) - 0.5) * (SINK.side - SINK.fin), y + SINK.base + SINK.height / 2, z],
          scale: [SINK.fin, SINK.height, SINK.side],
        }));
        return [base, ...fins];
      }),
    [spots],
  );
  return <Repeat items={parts} material="aluminium" />;
}
