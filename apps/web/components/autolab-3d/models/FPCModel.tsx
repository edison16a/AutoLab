import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  CatmullRomCurve3,
  Vector3,
} from "three";
import type { Vec3 } from "../registry/componentRegistry";
const DEFAULT_POINTS: Vec3[] = [
  [-0.73, 0.78, 0],
  [-0.1, 0.8, 0.05],
  [0.9, 0.4, 0.13],
  [0.95, -0.97, 0.13],
];
export default function FPCModel({
  points = DEFAULT_POINTS,
}: {
  points?: Vec3[];
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry(),
      v: number[] = [],
      indices: number[] = [];
    const smooth = new CatmullRomCurve3(
      points.map((p) => new Vector3(...p)),
    ).getPoints(40);
    smooth.forEach(({ x, y, z }, i) => {
      v.push(x, y, z - 0.13, x, y, z + 0.13);
      if (i < smooth.length - 1) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    });
    g.setAttribute("position", new Float32BufferAttribute(v, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#d3d9dd" side={DoubleSide} roughness={0.6} />
    </mesh>
  );
}
