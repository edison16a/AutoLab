/**
 * The Autolab parts registry: every part the 3D views can show, where it
 * sits on the machine, and how it's wired. The original parts keep the ids
 * and names from the owner's parts list; the rest come from the system
 * design sketch, the fluidics sketch and the enclosure plan. Split by area
 * into the hardware-parts-*.ts files.
 */
import { CHAMBER_PARTS } from "./hardware-parts-chamber";
import { ELECTRONICS_PARTS } from "./hardware-parts-electronics";
import { FLUIDICS_PARTS } from "./hardware-parts-fluidics";
import { MOTION_PARTS } from "./hardware-parts-motion";
import type { PartCategory, PartDefinition, PartHitBox, Vec3 } from "./hardware-parts-types";

export type { PartCategory, PartConnection, PartDefinition, PartHitBox, PartModelKey } from "./hardware-parts-types";

/** List order on the Hardware screen: what's live first, then by area. */
export const PART_CATEGORIES: PartCategory[] = ["Computer", "Imaging", "Environment", "Fluidics", "Control", "Motion", "Labware"];

export const HARDWARE_PARTS: PartDefinition[] = [...ELECTRONICS_PARTS, ...CHAMBER_PARTS, ...FLUIDICS_PARTS, ...MOTION_PARTS];

export const partById: Record<string, PartDefinition> = Object.fromEntries(HARDWARE_PARTS.map((part) => [part.id, part]));

export function isPartId(id: string | null | undefined): id is string {
  return !!id && id in partById;
}

/** Where the part's origin is, with its exploded offset when that view is on. */
export function partPosition(part: PartDefinition, exploded: boolean): Vec3 {
  const [x, y, z] = part.position;
  if (!exploded) return [x, y, z];
  return [x + part.exploded[0], y + part.exploded[1], z + part.exploded[2]];
}

/** Centre of the part's bounds in machine space: what the camera frames and wires attach to. */
export function partCenter(part: PartDefinition, exploded: boolean): Vec3 {
  const [x, y, z] = partPosition(part, exploded);
  const [cx, cy, cz] = part.center ?? [0, 0, 0];
  return [x + cx, y + cy, z + cz];
}

/** Radius of the sphere around the part's bounds. */
export function partRadius(part: PartDefinition) {
  const [w, h, d] = part.size;
  return Math.hypot(w, h, d) / 2;
}

/** The pick volumes, falling back to one box around the whole part. */
export function partHitBoxes(part: PartDefinition): PartHitBox[] {
  return part.hits ?? [{ center: part.center ?? [0, 0, 0], size: part.size }];
}
