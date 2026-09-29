"use client";
import { useMemo } from "react";
import { Block, Cylinder, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";

const WHEEL_SCALE: Vec3 = [0.07, 0.05, 0.07];
const HUB_SCALE: Vec3 = [0.032, 0.066, 0.032];

/**
 * Delrin V-wheels with their steel bearings, all in two instanced draws.
 * Wheels stand on Y like the unit cylinder; pass a rotation to turn the
 * axle onto X or Z.
 */
export function VWheels({ items }: { items: RepeatItem[] }) {
  return (
    <>
      <Repeat items={items} shape="cylinder" material="plasticBlack" scale={WHEEL_SCALE} />
      <Repeat items={items} shape="cylinderLow" material="steel" scale={HUB_SCALE} />
    </>
  );
}

/** A GT2 pulley or smooth idler: a toothed barrel between two flanges, axle along Y. */
export function Pulley({ position, rotation }: { position: Vec3; rotation?: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder radius={0.05} height={0.07} material="aluminium" />
      {[-1, 1].map((side) => (
        <Cylinder key={side} position={[0, side * 0.04, 0]} radius={0.068} height={0.012} material="aluminium" />
      ))}
      <Cylinder position={[0, -0.075, 0]} radius={0.045} height={0.07} material="aluminium" />
    </group>
  );
}

export interface BeltProps {
  /** Centres of the two pulleys the belt wraps. They must differ along exactly one axis. */
  from: Vec3;
  to: Vec3;
  /** The axis the pulleys' axles point along, which is also the belt's width. */
  axle: "x" | "y" | "z";
}

const PITCH_RADIUS = 0.056;
const BELT: Vec3 = [0.012, 0.06, 0];

/**
 * An open GT2 belt loop between two pulleys, as its two straight runs. The
 * pulley flanges hide where it wraps, so the loop ends don't need drawing.
 */
export function Belt({ from, to, axle }: BeltProps) {
  const runs = useMemo(() => {
    const along = from.findIndex((value, i) => value !== to[i]);
    const width = axle === "x" ? 0 : axle === "y" ? 1 : 2;
    // The runs sit either side of the pulley centres, on the axis that is neither the run nor the axle.
    const offsetAxis = [0, 1, 2].find((i) => i !== along && i !== width) ?? 1;
    const length = Math.abs(to[along] - from[along]);
    return [-1, 1].map((side) => {
      const position: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
      position[offsetAxis] += side * PITCH_RADIUS;
      const size: Vec3 = [0, 0, 0];
      size[along] = length;
      size[width] = BELT[1];
      size[offsetAxis] = BELT[0];
      return { position, size };
    });
  }, [from, to, axle]);
  return (
    <>
      {runs.map((run) => (
        <Block key={run.position.join()} position={run.position} size={run.size} material="rubber" />
      ))}
    </>
  );
}

export interface LeadScrewProps {
  /** Centre of the bottom end of the screw. */
  base: Vec3;
  length: number;
  radius?: number;
}

const THREAD_PITCH = 0.045;

/**
 * A T8 lead screw standing on Y: a steel rod with its thread drawn as a
 * stack of fine rings, one instanced draw per screw.
 */
export function LeadScrew({ base, length, radius = 0.026 }: LeadScrewProps) {
  const [x, y, z] = base;
  const threads = useMemo<RepeatItem[]>(() => {
    const ring = radius * 0.9;
    return Array.from({ length: Math.floor(length / THREAD_PITCH) }, (_, i) => ({
      position: [x, y + (i + 0.5) * THREAD_PITCH, z] as Vec3,
      rotation: [Math.PI / 2, 0, 0] as Vec3,
      scale: [ring, ring, ring] as Vec3,
    }));
  }, [x, y, z, length, radius]);
  return (
    <>
      <Cylinder position={[x, y + length / 2, z]} radius={radius * 0.86} height={length} low material="steel" />
      <Repeat items={threads} shape="torus" material="steel" />
    </>
  );
}
