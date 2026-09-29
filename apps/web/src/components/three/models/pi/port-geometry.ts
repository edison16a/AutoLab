/**
 * Connector shells with real openings. Rather than painting a dark shape
 * on a box (flat from any angle but straight on) or stacking boxes around
 * the hole (visible seams on the outer skin), each shell is one extruded
 * outline with its openings cut all the way through. Dark plugs inside
 * set how deep each opening looks.
 */
import { ExtrudeGeometry, Path, Shape } from "three";
import { cachedGeometry } from "../../geometries";
import type { Vec3 } from "../../types";
import { welded } from "../shared/welded";

/** One opening on the port's face, relative to the housing centre. */
export interface PortHole {
  y: number;
  z?: number;
  height: number;
  width: number;
}

/** Adds a rectangle to a path, clockwise when it is a hole. */
function rectangle(target: Shape | Path, cx: number, cy: number, width: number, height: number, hole: boolean) {
  const [x0, x1, y0, y1] = [cx - width / 2, cx + width / 2, cy - height / 2, cy + height / 2];
  target.moveTo(x0, y0);
  if (hole) {
    target.lineTo(x0, y1);
    target.lineTo(x1, y1);
    target.lineTo(x1, y0);
  } else {
    target.lineTo(x1, y0);
    target.lineTo(x1, y1);
    target.lineTo(x0, y1);
  }
  target.lineTo(x0, y0);
}

/**
 * A box `depth` long along X with each hole running straight through it,
 * centred on the origin, openings on +X. Cached by its exact layout, so
 * every Pi on screen shares the buffers.
 */
export function portShellGeometry([depth, height, width]: Vec3, holes: PortHole[]) {
  const key = `pi:port:${depth}:${height}:${width}:${holes.map((h) => `${h.y},${h.z ?? 0},${h.height},${h.width}`).join(";")}`;
  return cachedGeometry(key, () => {
    const outline = new Shape();
    rectangle(outline, 0, 0, width, height, false);
    for (const hole of holes) {
      const opening = new Path();
      // Shape X becomes -Z once the extrusion is turned to run along +X.
      rectangle(opening, -(hole.z ?? 0), hole.y, hole.width, hole.height, true);
      outline.holes.push(opening);
    }
    const geometry = new ExtrudeGeometry(outline, { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);
    geometry.rotateY(Math.PI / 2);
    return welded(geometry);
  });
}

/** Adds a stadium (a rectangle with round ends) to a path, clockwise when it is a hole. */
function stadium(target: Shape | Path, width: number, height: number, hole: boolean) {
  const r = height / 2;
  const reach = width / 2 - r;
  target.moveTo(-reach, -r);
  if (hole) {
    target.absarc(-reach, 0, r, -Math.PI / 2, -Math.PI * 1.5, true);
    target.lineTo(reach, r);
    target.absarc(reach, 0, r, Math.PI / 2, -Math.PI / 2, true);
  } else {
    target.lineTo(reach, -r);
    target.absarc(reach, 0, r, -Math.PI / 2, Math.PI / 2, false);
    target.lineTo(-reach, r);
    target.absarc(-reach, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  }
  target.lineTo(-reach, -r);
}

/**
 * The USB-C shell: an open stadium tube `depth` long, centred on the
 * origin, opening facing +Z. `wall` is the sheet thickness.
 */
export function stadiumShellGeometry(width: number, height: number, depth: number, wall: number) {
  return cachedGeometry(`pi:stadium:${width}:${height}:${depth}:${wall}`, () => {
    const outline = new Shape();
    stadium(outline, width, height, false);
    const opening = new Path();
    stadium(opening, width - wall * 2, height - wall * 2, true);
    outline.holes.push(opening);
    const geometry = new ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: 10 });
    geometry.translate(0, 0, -depth / 2);
    return welded(geometry);
  });
}
