"use client";
import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { castsShadow, getMaterial, receivesShadow, type MaterialKey } from "../materials";
import type { Vec3 } from "../types";

export interface TubeProps {
  /** Control points the tube passes through, in the parent's space. */
  points: Vec3[];
  radius?: number;
  material?: MaterialKey;
  /** Segments along the length. More for long, curvy runs. */
  segments?: number;
}

/**
 * A round tube along a smooth curve through the points: cables, gas lines,
 * media tubing. The geometry is unique to its path, so this component owns
 * and disposes it.
 */
export function Tube({ points, radius = 0.025, material = "plasticWhite", segments = 48 }: TubeProps) {
  // Points usually arrive as a fresh array literal, so key the memo on the values.
  const key = points.map((p) => p.join(",")).join(";");
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, "centripetal");
    return new TubeGeometry(curve, segments, radius, 10, false);
  }, [key, radius, segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} material={getMaterial(material)} castShadow={castsShadow(material)} receiveShadow={receivesShadow(material)} dispose={null} />
  );
}
