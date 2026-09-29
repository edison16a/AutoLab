/**
 * Cached custom shapes the part models need and the kit's unit shapes
 * can't make: chamfered prisms (stepper housings) and flat plates with
 * round holes (well plate and tip rack decks). Built once per exact size
 * and freed with the rest of the kit's geometry when the last Stage goes.
 */
import { ExtrudeGeometry, Path, Shape, Vector2 } from "three";
import { cachedGeometry } from "../../geometries";

/** A hole through a plate, in plate space: x across, z toward the front. */
export interface PlateHole {
  x: number;
  z: number;
  radius: number;
}

/**
 * Lays an XY outline flat and extrudes it along Y, centred on the origin.
 * Extrude builds along +Z, so turning it onto Y maps shape y onto -Z;
 * callers pass shape points with z already negated.
 */
function extrudeFlat(shape: Shape, height: number, curveSegments: number) {
  const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -height / 2, 0);
  return geometry;
}

/**
 * A square prism with its four vertical edges cut at 45 degrees, standing
 * on Y. It's the silhouette that makes a NEMA housing read as a stepper.
 */
export function chamferedPrism(width: number, height: number, depth: number, chamfer: number) {
  return cachedGeometry(`chamfer:${width}:${height}:${depth}:${chamfer}`, () => {
    const w = width / 2;
    const d = depth / 2;
    const c = chamfer;
    const points = [
      [-w + c, -d],
      [w - c, -d],
      [w, -d + c],
      [w, d - c],
      [w - c, d],
      [-w + c, d],
      [-w, d - c],
      [-w, -d + c],
    ].map(([x, y]) => new Vector2(x, y));
    return extrudeFlat(new Shape(points), height, 1);
  });
}

/**
 * A rounded rectangle plate with round holes cut through, lying flat and
 * centred on the origin. The holes get real inner walls, so wells and tip
 * sockets read as openings from any angle. `key` names the layout; pass a
 * different key for a different hole pattern.
 */
export function perforatedPlate(key: string, width: number, depth: number, thickness: number, corner: number, holes: PlateHole[]) {
  return cachedGeometry(`plate:${key}:${width}:${depth}:${thickness}:${corner}`, () => {
    const w = width / 2;
    const d = depth / 2;
    const r = Math.min(corner, w, d);
    const shape = new Shape();
    shape.moveTo(-w + r, -d);
    shape.lineTo(w - r, -d);
    shape.quadraticCurveTo(w, -d, w, -d + r);
    shape.lineTo(w, d - r);
    shape.quadraticCurveTo(w, d, w - r, d);
    shape.lineTo(-w + r, d);
    shape.quadraticCurveTo(-w, d, -w, d - r);
    shape.lineTo(-w, -d + r);
    shape.quadraticCurveTo(-w, -d, -w + r, -d);
    for (const hole of holes) {
      const path = new Path();
      path.absarc(hole.x, -hole.z, hole.radius, 0, Math.PI * 2, true);
      shape.holes.push(path);
    }
    return extrudeFlat(shape, thickness, 20);
  });
}

/**
 * A bar with a load cell's binocular cut through it: two round holes
 * joined by a narrow slot. The profile is drawn in the XY plane (X across,
 * Y along the bar) and extruded along Z, so the cut shows on the front.
 */
export function binocularBar(width: number, length: number, depth: number, holeRadius: number, holeOffset: number, slotHalf: number) {
  return cachedGeometry(`binocular:${width}:${length}:${depth}:${holeRadius}:${holeOffset}:${slotHalf}`, () => {
    const w = width / 2;
    const l = length / 2;
    const shape = new Shape([new Vector2(-w, -l), new Vector2(w, -l), new Vector2(w, l), new Vector2(-w, l)]);
    // Where the slot's edges meet each circle, as an angle from the circle's centre.
    const beta = Math.atan2(Math.sqrt(holeRadius ** 2 - slotHalf ** 2), slotHalf);
    const cut = new Path();
    cut.absarc(0, holeOffset, holeRadius, -beta, Math.PI + beta, false);
    cut.absarc(0, -holeOffset, holeRadius, Math.PI - beta, Math.PI * 2 + beta, false);
    cut.closePath();
    shape.holes.push(cut);
    const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  });
}
