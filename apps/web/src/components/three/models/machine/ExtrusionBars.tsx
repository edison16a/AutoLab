"use client";
import { useMemo } from "react";
import { Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { PROFILE } from "./layout";
import { extrusionGeometry, type ProfileKind } from "./profile";

/** One straight bar: its centre, length and the axis it runs along. */
export interface Bar {
  position: Vec3;
  length: number;
  axis: "x" | "y" | "z";
}

export interface ExtrusionBarsProps {
  /** Pass a module constant or a memo, so the batch is only rebuilt when the layout changes. */
  bars: Bar[];
  profile?: ProfileKind;
  /** Black plastic caps on both ends, for bars whose ends are on show. */
  caps?: boolean;
}

/**
 * Turns the Z-aligned unit bar onto each axis. A 2040 stays deep along Y
 * when it lies along X or Z, and deep along Z when it stands along Y,
 * which is how the Ender uprights and beam are oriented.
 */
const TURN: Record<Bar["axis"], Vec3> = {
  x: [0, Math.PI / 2, 0],
  y: [-Math.PI / 2, 0, 0],
  z: [0, 0, 0],
};

const CAP_DEPTH = 0.014;

/** Where the two ends of a bar are, nudged out so the caps sit on the cut faces. */
function ends({ position: [x, y, z], length, axis }: Bar): Vec3[] {
  const reach = length / 2 + CAP_DEPTH / 2;
  const i = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  return [-1, 1].map((side) => {
    const end: Vec3 = [x, y, z];
    end[i] += side * reach;
    return end;
  });
}

/**
 * Black anodised V-slot bars, all of one profile in one instanced draw.
 * The frame is dozens of bars, so batching them keeps the machine cheap.
 */
export function ExtrusionBars({ bars, profile = "2020", caps = false }: ExtrusionBarsProps) {
  const deep = profile === "2040" ? PROFILE * 2 : PROFILE;
  const { items, capItems } = useMemo(() => {
    const items: RepeatItem[] = bars.map((bar) => ({ position: bar.position, rotation: TURN[bar.axis], scale: [1, 1, bar.length] }));
    const capItems: RepeatItem[] = caps
      ? bars.flatMap((bar) => ends(bar).map((position) => ({ position, rotation: TURN[bar.axis], scale: [PROFILE + 0.006, deep + 0.006, CAP_DEPTH] as Vec3 })))
      : [];
    return { items, capItems };
  }, [bars, caps, deep]);

  return (
    <>
      <Repeat items={items} geometry={extrusionGeometry(profile)} material="graphite" />
      {capItems.length ? <Repeat items={capItems} material="plasticBlack" /> : null}
    </>
  );
}
