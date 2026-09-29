"use client";
import { useEffect, useMemo } from "react";
import { getMaterial } from "../../../materials";
import { Repeat } from "../../../primitives";
import { harnessGeometries, tiePlacements, type WireRun } from "./harness-geometry";

/**
 * Draws a set of wire runs: one merged mesh per wire colour, and every
 * cable tie in two instanced draws. Pass a module constant so the buffers
 * are built once; they belong to this component and are freed with it.
 */
export function Harness({ runs }: { runs: WireRun[] }) {
  const parts = useMemo(() => harnessGeometries(runs), [runs]);
  const ties = useMemo(() => tiePlacements(runs), [runs]);
  useEffect(() => () => parts.forEach(({ geometry }) => geometry.dispose()), [parts]);
  return (
    <group>
      {parts.map(({ material, geometry }) => (
        <mesh key={material} geometry={geometry} material={getMaterial(material)} castShadow receiveShadow dispose={null} />
      ))}
      {ties.bands.length ? <Repeat items={ties.bands} shape="cylinderLow" material="plasticBlack" /> : null}
      {ties.heads.length ? <Repeat items={ties.heads} material="plasticBlack" /> : null}
    </group>
  );
}
