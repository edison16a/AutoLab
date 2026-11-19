"use client";
import { useEffect, useMemo, type ReactNode } from "react";
import { getMaterial } from "../../../materials";
import { Rig } from "../../../motion/Rig";
import { Repeat } from "../../../primitives";
import { getFlowMaterial } from "../../fluidics/flow";
import { harnessGeometries, tiePlacements, type FlowRun, type WireRun } from "./harness-geometry";
import type { Carrier } from "./harness-rig";
import { useRigSkeleton } from "./use-rig-skeleton";

/** Ties ride their carrier like any other part; the frame's stay put. */
function Carried({ carrier, children }: { carrier: Carrier; children: ReactNode }) {
  return carrier === "fixed" ? <group>{children}</group> : <Rig rig={carrier}>{children}</Rig>;
}

/**
 * Draws a set of wire runs: one merged skinned mesh per wire colour, and
 * every cable tie in two instanced draws per carrier. The skeleton has one
 * bone per rig, placed each frame at that rig's offset, so in the Home demo
 * a lead follows the part it is plugged into and flexes where it crosses a
 * moving joint; at rest every bone sits at the origin and nothing moves.
 * Pass a module constant so the buffers are built once; they belong to
 * this component and are freed with it.
 */
export function Harness({ runs }: { runs: WireRun[] }) {
  const parts = useMemo(() => harnessGeometries(runs), [runs]);
  const ties = useMemo(() => tiePlacements(runs), [runs]);
  const bind = useRigSkeleton();
  useEffect(() => () => parts.forEach(({ geometry }) => geometry.dispose()), [parts]);

  return (
    <group>
      {parts.map(({ material, geometry }) => (
        // Skinned vertices move away from the static bounds, and the whole harness is cheap to draw, so skip culling.
        <skinnedMesh key={material} ref={bind} geometry={geometry} material={getMaterial(material)} castShadow receiveShadow frustumCulled={false} dispose={null} />
      ))}
      {ties.map(({ carrier, bands, heads }) => (
        <Carried key={carrier} carrier={carrier}>
          <Repeat items={bands} shape="cylinderLow" material="plasticBlack" />
          <Repeat items={heads} material="plasticBlack" />
        </Carried>
      ))}
    </group>
  );
}

/**
 * The liquid inside the fluid lines that run with the harness: one skinned
 * core per line, bound to the same rig bones as the tubing round it, in the
 * line's flow material, whose bands move with the Home demo (see
 * fluidics/flow.ts).
 */
export function FlowHarness({ runs }: { runs: FlowRun[] }) {
  const parts = useMemo(() => harnessGeometries(runs), [runs]);
  const bind = useRigSkeleton();
  useEffect(() => () => parts.forEach(({ geometry }) => geometry.dispose()), [parts]);
  return (
    <group>
      {parts.map(({ material: line, geometry }) => (
        <skinnedMesh key={line} ref={bind} geometry={geometry} material={getFlowMaterial(line)} frustumCulled={false} dispose={null} />
      ))}
    </group>
  );
}
