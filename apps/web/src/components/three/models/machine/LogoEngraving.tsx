"use client";
import { ShapeGeometry } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/data/logo";
import { cachedGeometry } from "../../geometries";
import { getMaterial, type MaterialKey } from "../../materials";
import type { Placement } from "../../types";

/**
 * The team logo as one flat mesh, one unit tall and centred on its origin,
 * facing +Z. The path is flipped inside the SVG itself because SVG runs y
 * down. Flipping there, before the shapes are built, means three sorts out
 * the winding and the faces still point at the viewer.
 */
function logoGeometry() {
  return cachedGeometry("logo-engraving", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}"><path transform="scale(1,-1)" fill="#000" fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`;
    const shapes = new SVGLoader().parse(svg).paths.flatMap((path) => SVGLoader.createShapes(path));
    // Six points per curve keeps the outline smooth at nameplate size with a light mesh.
    const geometry = new ShapeGeometry(shapes, 6);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const height = box.max.y - box.min.y;
    geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
    geometry.scale(1 / height, 1 / height, 1);
    return geometry;
  });
}

export interface LogoEngravingProps extends Placement {
  /** Height of the artwork in scene units. The width follows from its proportions. */
  height?: number;
  /** The colour filled into the cut. The logo's own blue by default. */
  material?: MaterialKey;
}

/**
 * The Autolab bear engraved into a surface and filled with colour, the way
 * a laser cut badge is paint filled. It lies flush on the face it's placed
 * on, so push it a hair proud of that face to keep it from flickering.
 */
export function LogoEngraving({ height = 0.25, material = "accent", position, rotation }: LogoEngravingProps) {
  return (
    <mesh
      geometry={logoGeometry()}
      material={getMaterial(material)}
      position={position}
      rotation={rotation}
      scale={[height, height, 1]}
      receiveShadow
      userData={{ noOutline: true }}
      dispose={null}
    />
  );
}
