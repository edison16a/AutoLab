"use client";
import { unitGeometry } from "../geometries";
import { getMaterial, receivesShadow, type MaterialKey } from "../materials";
import type { Placement } from "../types";

export interface RingProps extends Placement {
  radius?: number;
  /** A fine wire instead of a chunky washer. */
  thin?: boolean;
  material?: MaterialKey;
}

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** A torus lying flat by default: washers, plated holes, lens rings. */
export function Ring({ radius = 0.05, thin = false, material = "aluminium", position, rotation = FLAT }: RingProps) {
  return (
    <mesh
      geometry={unitGeometry(thin ? "torusThin" : "torus")}
      material={getMaterial(material)}
      position={position}
      rotation={rotation}
      scale={radius}
      receiveShadow={receivesShadow(material)}
      dispose={null}
    />
  );
}

export interface SphereProps extends Placement {
  radius?: number;
  material?: MaterialKey;
}

export function Sphere({ radius = 0.05, material = "plasticGrey", position, rotation }: SphereProps) {
  return (
    <mesh
      geometry={unitGeometry("sphere")}
      material={getMaterial(material)}
      position={position}
      rotation={rotation}
      scale={radius}
      castShadow
      receiveShadow={receivesShadow(material)}
      dispose={null}
    />
  );
}
