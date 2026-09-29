"use client";
import { useMemo } from "react";
import { Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { mm } from "./units";

/** A straight run of identical 0603 parts, positions in scene units on the board's top face. */
export interface PassiveRun {
  from: [number, number];
  step: [number, number];
  count: number;
  /** Capacitors are grey, resistors black. */
  kind: "cap" | "res";
  /** Turn the parts to lie along Z instead of X. */
  turned?: boolean;
}

const BODY: Vec3 = [mm(1.6), mm(0.5), mm(0.8)];
const END = mm(0.3);

/**
 * The small passives scattered round a board's chips: bodies in two
 * batches by kind and the tinned ends in a third, whatever the count.
 */
export function Passives({ runs, top }: { runs: PassiveRun[]; top: number }) {
  const { caps, resistors, ends } = useMemo(() => {
    const caps: RepeatItem[] = [];
    const resistors: RepeatItem[] = [];
    const ends: RepeatItem[] = [];
    for (const run of runs)
      for (let i = 0; i < run.count; i++) {
        const x = run.from[0] + run.step[0] * i;
        const z = run.from[1] + run.step[1] * i;
        const turned = run.turned ?? false;
        const size: Vec3 = turned ? [BODY[2], BODY[1], BODY[0]] : BODY;
        (run.kind === "cap" ? caps : resistors).push({ position: [x, top + BODY[1] / 2, z], scale: size });
        for (const side of [-1, 1]) {
          const offset = side * (BODY[0] / 2 - END / 2);
          ends.push({
            position: [x + (turned ? 0 : offset), top + BODY[1] / 2, z + (turned ? offset : 0)],
            scale: turned ? [BODY[2] + 0.0006, BODY[1] + 0.0006, END] : [END, BODY[1] + 0.0006, BODY[2] + 0.0006],
          });
        }
      }
    return { caps, resistors, ends };
  }, [runs, top]);
  return (
    <>
      {caps.length ? <Repeat items={caps} material="plasticGrey" /> : null}
      {resistors.length ? <Repeat items={resistors} material="plasticBlack" /> : null}
      {ends.length ? <Repeat items={ends} material="steel" /> : null}
    </>
  );
}
