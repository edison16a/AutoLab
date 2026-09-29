/**
 * The drag chain's link and where each link sits. A link is two side
 * plates and two cross bars merged into one small buffer, so the whole
 * chain is a single instanced draw.
 */
import { BoxGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cachedGeometry } from "../../../geometries";

/** A 10 x 15 mm chain, drawn a little slimmer to sit with the shrunk frame. */
export const LINK = { pitch: 0.066, height: 0.08, width: 0.12, plate: 0.012 } as const;

/** One link lying along X, its height on Y and its width across Z. */
export function linkGeometry(): BufferGeometry {
  return cachedGeometry("chain:link", () => {
    const { pitch, height, width, plate } = LINK;
    const parts: BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      // Side plates, a hair short of the pitch so the joints show as fine lines.
      parts.push(new BoxGeometry(pitch * 0.94, height, plate).translate(0, 0, side * (width / 2 - plate / 2)));
      // Cross bars over the top and bottom that close the link round the cables.
      parts.push(new BoxGeometry(pitch * 0.55, plate, width - plate * 2).translate(0, side * (height / 2 - plate / 2), 0));
    }
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    return merged;
  });
}

export interface ChainPath {
  /** Where the lower run is fixed, and where the upper run meets the moving carriage, along X. */
  fixed: number;
  moving: number;
  /** The inside of the bend: the loop turns round this X. */
  loop: number;
  /** Centre height of the lower run, the bend's radius and the chain's plane. */
  y: number;
  radius: number;
  z: number;
}

/** Where one link sits: its centre in the chain's plane and its turn about Z. */
export interface LinkPlace {
  x: number;
  y: number;
  angle: number;
}

/** How many links make up the chain. Rolling the bend along never changes it. */
export function linkCount({ fixed, moving, loop, radius }: ChainPath) {
  return Math.floor((Math.abs(fixed - loop) + Math.PI * radius + Math.abs(moving - loop)) / LINK.pitch);
}

/**
 * Link `index` laid along the chain's path: the lower run from the fixed
 * end to the bend, half a turn up and over, then the upper run back to the
 * carriage. The bend may sit on either side of the ends. Writes into `out`
 * so a chain rolling every frame allocates nothing.
 */
export function placeLink({ fixed, loop, y, radius }: ChainPath, index: number, out: LinkPlace) {
  // Which way the lower run heads from the fixed end: toward -X when the bend is on the left.
  const dir = Math.sign(fixed - loop);
  const lower = Math.abs(fixed - loop);
  const bend = Math.PI * radius;
  const s = (index + 0.5) * LINK.pitch;
  if (s < lower) {
    out.x = fixed - dir * s;
    out.y = y;
    out.angle = dir > 0 ? Math.PI : 0;
  } else if (s < lower + bend) {
    // Round the far side of the bend, from the bottom to the top.
    const a = -Math.PI / 2 - (dir * (s - lower)) / radius;
    out.x = loop + Math.cos(a) * radius;
    out.y = y + radius + Math.sin(a) * radius;
    out.angle = a - (dir * Math.PI) / 2;
  } else {
    out.x = loop + dir * (s - lower - bend);
    out.y = y + radius * 2;
    out.angle = dir > 0 ? 0 : Math.PI;
  }
  return out;
}

/**
 * The same chain with its moving end carried `dx` along. The bend rolls
 * half as far, which is what keeps a real chain's length the same.
 */
export function rolled(path: ChainPath, dx: number, out: ChainPath) {
  Object.assign(out, path);
  out.moving = path.moving + dx;
  out.loop = path.loop + dx / 2;
  return out;
}
