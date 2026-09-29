/**
 * Cross sections for the black V-slot extrusions. Each profile is extruded
 * once to unit length along Z and cached, so every bar in the machine is
 * the same buffer scaled along its length. Scaling only the length never
 * distorts the slots, so a whole frame draws as one instanced batch.
 */
import { ExtrudeGeometry, Path, Shape, Vector2, type BufferGeometry } from "three";
import { cachedGeometry } from "../../geometries";
import { PROFILE } from "./layout";

export type ProfileKind = "2020" | "2040";

type Point = [number, number];

// Slot sizes as fractions of the 20 mm cell: 6.2 mm opening, 1.8 mm lip, 11 mm cavity.
const OPENING = PROFILE * 0.31;
const LIP = PROFILE * 0.09;
const CAVITY = PROFILE * 0.55;
const CAVITY_DEPTH = PROFILE * 0.2;
const FLOOR = PROFILE * 0.3;
const CHAMFER = PROFILE * 0.06;
const BORE = PROFILE * 0.1;

/**
 * One T-slot along a face, as (along, inward) pairs walked in the face's
 * direction: in through the opening, out to the cavity, down its sloped
 * floor and back up.
 */
const SLOT: Point[] = [
  [-OPENING / 2, 0],
  [-OPENING / 2, LIP],
  [-CAVITY / 2, LIP],
  [-FLOOR / 2, LIP + CAVITY_DEPTH],
  [FLOOR / 2, LIP + CAVITY_DEPTH],
  [CAVITY / 2, LIP],
  [OPENING / 2, LIP],
  [OPENING / 2, 0],
];

/**
 * Walks the outline counter clockwise: bottom, right, top, left. Each face
 * maps its (along, inward) slot points into the XY plane, and each corner
 * gets a small chamfer so the bar catches a highlight on its edges.
 */
function outline(width: number, height: number, cells: number): Point[] {
  const w = width / 2;
  const h = height / 2;
  const longSlots = Array.from({ length: cells }, (_, i) => (i - (cells - 1) / 2) * PROFILE);
  const faces: { extent: number; slots: number[]; map: (t: number, n: number) => Point }[] = [
    { extent: w, slots: [0], map: (t, n) => [t, -h + n] },
    { extent: h, slots: longSlots, map: (t, n) => [w - n, t] },
    { extent: w, slots: [0], map: (t, n) => [-t, h - n] },
    { extent: h, slots: longSlots, map: (t, n) => [-w + n, -t] },
  ];
  const points: Point[] = [];
  for (const { extent, slots, map } of faces) {
    points.push(map(-(extent - CHAMFER), 0));
    for (const centre of slots) for (const [t, n] of SLOT) points.push(map(centre + t, n));
    points.push(map(extent - CHAMFER, 0));
  }
  return points;
}

function profileGeometry(kind: ProfileKind): BufferGeometry {
  const cells = kind === "2040" ? 2 : 1;
  const shape = new Shape(outline(PROFILE, PROFILE * cells, cells).map(([x, y]) => new Vector2(x, y)));
  // The centre bore of each cell shows on cut ends.
  for (let i = 0; i < cells; i++) {
    const bore = new Path();
    bore.absarc(0, (i - (cells - 1) / 2) * PROFILE, BORE / 2, 0, Math.PI * 2, true);
    shape.holes.push(bore);
  }
  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 8 });
  geometry.translate(0, 0, -0.5);
  return geometry;
}

/**
 * The cached unit length bar for a profile, lying along Z. A 2040 is two
 * cells stacked along Y, so it stands deep along Y until it's rotated.
 */
export function extrusionGeometry(kind: ProfileKind) {
  return cachedGeometry(`extrusion:${kind}`, () => profileGeometry(kind));
}
