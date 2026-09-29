"use client";
import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { getMaterial, type Vec3 } from "@/components/three";
import { useOnePass } from "./use-one-pass";

interface DrawLineProps {
  points: Vec3[];
  /** The link is confirmed: accent. Otherwise a neutral grey. */
  on: boolean;
  /** Draw from the first point to the last. False shows it whole. */
  play: boolean;
  delay?: number;
}

const SEGMENTS = 64;
const SIDES = 8;
/** TubeGeometry lists its triangles ring by ring, six indices per side per ring. */
const INDICES_PER_RING = SIDES * 6;

/**
 * A thin line that draws itself from start to end once, by growing the
 * geometry's draw range. Nothing is rebuilt per frame. It stays grey until
 * the link it stands for is confirmed, then turns the accent.
 */
export function DrawLine({ points, on, play, delay = 0.4 }: DrawLineProps) {
  // Points usually arrive as a fresh array literal, so key the memo on the values.
  const key = points.map((p) => p.join(",")).join(";");
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, "centripetal");
    return new TubeGeometry(curve, SEGMENTS, 0.014, SIDES, false);
  }, [key]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useOnePass({
    duration: 1.2,
    delay,
    play,
    shadows: false,
    apply: (progress) => geometry.setDrawRange(0, Math.round(progress * SEGMENTS) * INDICES_PER_RING),
  });

  return <mesh geometry={geometry} material={getMaterial(on ? "accent" : "plasticGrey")} dispose={null} />;
}
