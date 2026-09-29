"use client";
import { castsShadow, getMaterial, type MaterialKey } from "../../materials";
import type { Vec3 } from "../../types";
import { knurlGeometry } from "./knurl-geometry";

interface KnurlProps {
  /** Centre of the ring on the Y axis. */
  y: number;
  radius: number;
  height: number;
  teeth: number;
  /** Groove depth as a fraction of the radius. */
  depth: number;
  material: MaterialKey;
}

/** A knurled grip ring standing on the Y axis, like the rings on a lens barrel. */
export function Knurl({ y, radius, height, teeth, depth, material }: KnurlProps) {
  const scale: Vec3 = [radius, height, radius];
  return (
    <mesh
      geometry={knurlGeometry(teeth, depth)}
      material={getMaterial(material)}
      position={[0, y, 0]}
      scale={scale}
      castShadow={castsShadow(material)}
      receiveShadow
      dispose={null}
    />
  );
}
