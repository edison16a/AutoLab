/**
 * The drag chain's link and where each link sits. A link is two side
 * plates and two cross bars merged into one small buffer, so the whole
 * chain is a single instanced draw.
 */
import { BoxGeometry, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cachedGeometry } from "../../../geometries";
import type { RepeatItem } from "../../../primitives";
import type { Vec3 } from "../../../types";

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

/**
 * Links laid along the chain's path: the lower run from the fixed end to
 * the bend, half a turn up and over, then the upper run back to the
 * carriage. Each link is turned about Z to follow the path.
 */
export function linkPlacements({ fixed, moving, loop, y, radius, z }: ChainPath): RepeatItem[] {
  const lower = fixed - loop;
  const bend = Math.PI * radius;
  const upper = moving - loop;
  const total = lower + bend + upper;
  const count = Math.floor(total / LINK.pitch);
  const items: RepeatItem[] = [];
  for (let i = 0; i < count; i++) {
    const s = (i + 0.5) * LINK.pitch;
    let position: Vec3;
    let angle: number;
    if (s < lower) {
      position = [fixed - s, y, z];
      angle = Math.PI;
    } else if (s < lower + bend) {
      // Round the bend from the bottom, through the far side, to the top.
      const a = -Math.PI / 2 - (s - lower) / radius;
      position = [loop + Math.cos(a) * radius, y + radius + Math.sin(a) * radius, z];
      angle = a - Math.PI / 2;
    } else {
      position = [loop + (s - lower - bend), y + radius * 2, z];
      angle = 0;
    }
    items.push({ position, rotation: [0, 0, angle] });
  }
  return items;
}
