"use client";
import { taperGeometry, unitGeometry } from "../geometries";
import { castsShadow, getMaterial, type MaterialKey } from "../materials";
import type { Placement } from "../types";

export interface CylinderProps extends Placement {
  radius?: number;
  height?: number;
  /** Top radius as a fraction of the bottom one. 1 is straight, 0 is a cone. */
  taper?: number;
  /** Twelve sides instead of forty, for pins, legs and screws. */
  low?: boolean;
  material?: MaterialKey;
}

/** A cylinder standing along Y, centred on its position. */
export function Cylinder({ radius = 0.1, height = 0.2, taper = 1, low = false, material = "aluminium", position, rotation }: CylinderProps) {
  const geometry = taper === 1 ? unitGeometry(low ? "cylinderLow" : "cylinder") : taperGeometry(taper, low ? 12 : 32);
  return (
    <mesh
      geometry={geometry}
      material={getMaterial(material)}
      position={position}
      rotation={rotation}
      scale={[radius, height, radius]}
      castShadow={castsShadow(material)}
      receiveShadow
      dispose={null}
    />
  );
}
