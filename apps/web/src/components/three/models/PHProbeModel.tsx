"use client";
import { useMemo } from "react";
import { Cylinder, Repeat, Ring, Sphere, TextDecal, Tube, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";

/** A 12 mm lab probe, shortened to fit the chamber: body from the guard up to the cap. */
const R = 0.072;
const BODY = { bottom: -0.3, top: 0.36 } as const;
const GUARD = { bottom: -0.47, top: BODY.bottom } as const;
/** The guard is four ribs with open windows between them, so the bulb meets the liquid. */
const RIBS = 4;
/** The cable leaves the strain relief and runs to a grommet in the left wall behind the probe. */
const CABLE: Vec3[] = [
  [0, 0.46, 0],
  [0, 0.58, 0],
  [-0.04, 0.66, 0],
  [-0.16, 0.7, 0],
  [-0.24, 0.7, 0],
];

/**
 * A lab pH probe: the glass bulb inside an open ribbed guard, the
 * epoxy body with its fill line and printed label, the cap and the cable
 * strain relief, and the cable out through the left wall. Origin at the
 * body's middle.
 */
export function PHProbeModel() {
  const guardHeight = GUARD.top - GUARD.bottom;
  const ribs = useMemo<RepeatItem[]>(
    () =>
      Array.from({ length: RIBS }, (_, i) => {
        const a = (i / RIBS) * Math.PI * 2 + Math.PI / 4;
        return {
          position: [Math.sin(a) * (R - 0.008), GUARD.bottom + guardHeight / 2, Math.cos(a) * (R - 0.008)] as Vec3,
          rotation: [0, a, 0] as Vec3,
          scale: [0.034, guardHeight, 0.016] as Vec3,
        };
      }),
    [guardHeight],
  );
  return (
    <group>
      <Cylinder position={[0, (BODY.bottom + BODY.top) / 2, 0]} radius={R} height={BODY.top - BODY.bottom} material="plasticBlack" />
      <Repeat items={ribs} material="plasticBlack" />
      {/* The glass stem and bulb, seen through the windows. */}
      <Cylinder position={[0, GUARD.bottom + guardHeight * 0.6, 0]} radius={0.03} height={guardHeight * 0.6} material="glass" />
      <Sphere position={[0, GUARD.bottom + 0.05, 0]} radius={0.038} material="glass" />
      <Ring position={[0, GUARD.bottom + 0.012, 0]} radius={R * 0.86} material="plasticBlack" />
      <Ring position={[0, BODY.bottom + 0.03, 0]} radius={R * 1.01} thin material="plasticGrey" />
      <group position={[0, 0.02, R + 0.001]}>
        <TextDecal text="pH" position={[0, 0.03, 0]} rotation={[0, 0, 0]} width={0.06} height={0.045} weight={700} />
        <TextDecal text="0 to 14" position={[0, -0.02, 0]} rotation={[0, 0, 0]} width={0.08} height={0.026} weight={500} />
      </group>
      <Cylinder position={[0, BODY.top + 0.04, 0]} radius={R * 1.08} height={0.08} material="plasticGrey" />
      <Cylinder position={[0, BODY.top + 0.11, 0]} radius={0.034} taper={0.7} height={0.07} material="rubber" />
      <Tube points={CABLE} radius={0.018} material="plasticBlack" segments={32} />
    </group>
  );
}
