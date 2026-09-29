"use client";
import { roundedBoxGeometry, unitGeometry } from "../geometries";
import { castsShadow, getMaterial, type MaterialKey } from "../materials";
import type { Placement, Vec3 } from "../types";

export interface BlockProps extends Placement {
  /** Width, height, depth in scene units. */
  size?: Vec3;
  /** Edge radius in scene units. Zero keeps sharp edges and shares one unit box. */
  radius?: number;
  material?: MaterialKey;
}

/**
 * A box, optionally with rounded edges. The workhorse for housings, brackets
 * and frames. Sharp boxes are one shared unit cube scaled into place, so
 * hundreds of them cost a single vertex buffer.
 */
export function Block({ size = [1, 1, 1], radius = 0, material = "plasticGrey", position, rotation }: BlockProps) {
  const rounded = radius > 0;
  return (
    <mesh
      geometry={rounded ? roundedBoxGeometry(size[0], size[1], size[2], radius) : unitGeometry("box")}
      material={getMaterial(material)}
      position={position}
      rotation={rotation}
      scale={rounded ? 1 : size}
      castShadow={castsShadow(material)}
      receiveShadow
      // Geometry and material are shared, so React must never dispose them.
      dispose={null}
    />
  );
}
