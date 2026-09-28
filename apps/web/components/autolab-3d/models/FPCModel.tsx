import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, DoubleSide } from "three";
import type { Vec3 } from "../registry/componentRegistry";
const DEFAULT_POINTS:Vec3[]=[[-.73,.78,0],[-.1,.8,.05],[.9,.4,.13],[.95,-.97,.13]];
export default function FPCModel({
  points = DEFAULT_POINTS,
}: {
  points?: Vec3[];
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry(),
      v: number[] = [],
      indices: number[] = [];
    points.forEach(([x, y, z], i) => {
      v.push(x - 0.09, y, z, x + 0.09, y, z);
      if (i < points.length - 1) {
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
