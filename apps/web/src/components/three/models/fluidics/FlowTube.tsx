"use client";
import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { castsShadow, getMaterial, type MaterialKey } from "../../materials";
import { usePoseFrame } from "../../motion/use-pose-frame";
import type { Vec3 } from "../../types";
import { CORE_RADIUS, FLOW_PERIOD, getFlowMaterial, showFlow, stillFlow, type FlowLine } from "./flow";

export interface FlowTubeProps {
  /** Control points in the parent's space. */
  points: Vec3[];
  line: FlowLine;
  /** True when the points run toward the head, so the bands move the right way. */
  towardHead: boolean;
  radius: number;
  /** The tubing itself, drawn round the liquid. */
  shell?: MaterialKey;
  segments?: number;
}

/**
 * A short length of tubing with its liquid core: the pump head's loop and
 * the stubs through the pinch valves. Long runs that ride the gantry are
 * drawn by the harness instead (wiring/FlowHarness).
 */
export function FlowTube({ points, line, towardHead, radius, shell = "tygon", segments = 32 }: FlowTubeProps) {
  const key = points.map((p) => p.join(",")).join(";");
  const { tube, core } = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, "centripetal");
    const tube = new TubeGeometry(curve, segments, radius, 10, false);
    const core = new TubeGeometry(curve, segments, Math.min(CORE_RADIUS, radius * 0.6), 8, false);
    // Measure U in band periods along the tube, pointing toward the head.
    const scale = (curve.getLength() / FLOW_PERIOD) * (towardHead ? 1 : -1);
    const uv = core.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * scale);
    uv.needsUpdate = true;
    return { tube, core };
  }, [key, radius, segments, towardHead]);
  useEffect(
    () => () => {
      tube.dispose();
      core.dispose();
    },
    [tube, core],
  );
  return (
    <group>
      <mesh geometry={core} material={getFlowMaterial(line)} dispose={null} />
      <mesh geometry={tube} material={getMaterial(shell)} castShadow={castsShadow(shell)} receiveShadow renderOrder={1} dispose={null} />
    </group>
  );
}

/** Moves the liquid in every line with the Home demo, and stills it everywhere else. Mount once per machine. */
export function FlowDriver() {
  usePoseFrame(showFlow, stillFlow);
  return null;
}
