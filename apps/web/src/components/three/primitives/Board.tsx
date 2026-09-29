"use client";
import { useMemo } from "react";
import { ExtrudeGeometry, Path, Shape } from "three";
import { cachedGeometry } from "../geometries";
import { castsShadow, getMaterial, type MaterialKey } from "../materials";
import type { Vec3 } from "../types";
import { Repeat, type RepeatItem } from "./Repeat";

export interface BoardProps {
  /** Width, thickness, depth. The board lies flat, components go on +Y. */
  size?: Vec3;
  material?: MaterialKey;
  /** Distance from each edge to the mounting hole centres. */
  inset?: number;
  holes?: boolean;
}

const HOLE_RADIUS = 0.019;
const PLATING_SCALE: Vec3 = [0.024, 0.024, 0.024];

/**
 * The rounded outline with four mounting holes cut through, extruded to
 * the board thickness. Cached by size so identical boards share a buffer.
 */
function boardGeometry([w, h, d]: Vec3, inset: number, holes: boolean) {
  return cachedGeometry(`board:${w}:${h}:${d}:${inset}:${holes}`, () => {
    const corner = Math.min(w, d) * 0.075;
    const shape = new Shape();
    shape.moveTo(-w / 2 + corner, -d / 2);
    shape.lineTo(w / 2 - corner, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + corner);
    shape.lineTo(w / 2, d / 2 - corner);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - corner, d / 2);
    shape.lineTo(-w / 2 + corner, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - corner);
    shape.lineTo(-w / 2, -d / 2 + corner);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + corner, -d / 2);
    if (holes) {
      for (const x of [-1, 1])
        for (const z of [-1, 1]) {
          const hole = new Path();
          hole.absarc(x * (w / 2 - inset), z * (d / 2 - inset), HOLE_RADIUS, 0, Math.PI * 2, true);
          shape.holes.push(hole);
        }
    }
    const geometry = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 8 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -h / 2, 0);
    return geometry;
  });
}

/** A printed circuit board with plated mounting holes, centred on its origin. */
export function Board({ size = [0.5, 0.04, 0.4], material = "pcbGraphite", inset = 0.055, holes = true }: BoardProps) {
  const [w, h, d] = size;
  const plating = useMemo<RepeatItem[]>(
    () =>
      holes
        ? [-1, 1].flatMap((x) =>
            [-1, 1].map((z) => ({
              position: [x * (w / 2 - inset), h / 2 + 0.002, z * (d / 2 - inset)] as Vec3,
              rotation: [-Math.PI / 2, 0, 0] as Vec3,
            })),
          )
        : [],
    [w, h, d, inset, holes],
  );
  return (
    <>
      <mesh
        geometry={boardGeometry(size, inset, holes)}
        material={getMaterial(material)}
        castShadow={castsShadow(material)}
        receiveShadow
        dispose={null}
      />
      {holes ? <Repeat items={plating} shape="torus" material="steel" scale={PLATING_SCALE} /> : null}
    </>
  );
}
