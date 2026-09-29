"use client";
import { useEffect, useMemo } from "react";
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from "three";
import { getMaterial } from "../materials";
import type { Vec3 } from "../types";
import type { PartModelProps } from "./model-props";

/**
 * The ribbon's route relative to the part's position: out of the camera's
 * connector, over and down the right wall inside the chamber, through the
 * wall near the floor and into the Pi's CSI connector in the electronics box.
 */
const ROUTE: Vec3[] = [
  [-0.48, 1.06, 0],
  [-0.2, 1.1, 0],
  [-0.08, 0.8, 0],
  [-0.07, -0.1, 0],
  [0.1, -0.58, 0],
  [0.35, -0.7, 0.02],
  [0.6, -0.86, 0.08],
  [0.75, -0.93, 0.1],
];
/** 16 mm wide ribbon. */
const HALF_WIDTH = 0.1;

/** A flat strip following the route, one quad per step. Owned here, so disposed here. */
function ribbonGeometry(points: Vec3[]) {
  const smooth = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))).getPoints(48);
  const vertices: number[] = [];
  const indices: number[] = [];
  smooth.forEach(({ x, y, z }, i) => {
    vertices.push(x, y, z - HALF_WIDTH, x, y, z + HALF_WIDTH);
    if (i < smooth.length - 1) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The HBv RPi 160 FPC camera ribbon. */
export function FPCModel({ points = ROUTE }: PartModelProps & { points?: Vec3[] }) {
  const geometry = useMemo(() => ribbonGeometry(points), [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={getMaterial("ribbon")} castShadow receiveShadow dispose={null} />;
}
