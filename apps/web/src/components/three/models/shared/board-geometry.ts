/**
 * Circuit board outlines for the detailed models: a rounded rectangle with
 * mounting holes wherever the real board has them, extruded to thickness
 * and welded (see welded.ts) so it keeps crisp edges while selected. The
 * kit's Board centres its holes in the corners and isn't welded, which is
 * fine for small modules but not for boards people inspect up close.
 */
import { ExtrudeGeometry, Path, Shape } from "three";
import { cachedGeometry } from "../../geometries";
import { welded } from "./welded";

export interface BoardOutline {
  /** Cache key; one per distinct board. */
  key: string;
  width: number;
  depth: number;
  thickness: number;
  corner: number;
  /** Hole centres as scene [x, z]. */
  holes: readonly (readonly [number, number])[];
  holeRadius: number;
}

/** The board centred on the origin, lying flat with its component side facing +Y. */
export function boardGeometry({ key, width: w, depth: d, thickness: h, corner: c, holes, holeRadius }: BoardOutline) {
  return cachedGeometry(`board:${key}`, () => {
    const shape = new Shape();
    shape.moveTo(-w / 2 + c, -d / 2);
    shape.lineTo(w / 2 - c, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + c);
    shape.lineTo(w / 2, d / 2 - c);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - c, d / 2);
    shape.lineTo(-w / 2 + c, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - c);
    shape.lineTo(-w / 2, -d / 2 + c);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + c, -d / 2);
    // The shape is drawn in X/Y and laid flat below, which turns Y into -Z.
    for (const [x, z] of holes) shape.holes.push(new Path().absarc(x, -z, holeRadius, 0, Math.PI * 2, true));
    const geometry = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 10 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -h / 2, 0);
    return welded(geometry);
  });
}
