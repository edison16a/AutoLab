import type { CameraFocus } from "@/components/three/camera/focus-math";
import type { Vec3 } from "@/components/three/types";
import { partCenter, partRadius, type PartDefinition } from "@/data/hardware-parts";

/** Front right, a little above: the three quarter view of the sketch. */
const OVERVIEW_DIRECTION: Vec3 = [0.95, 0.55, 1.5];
const PART_DIRECTION: Vec3 = [0.55, 0.42, 1];
/** Alone on the stage nothing can block the view, so every part gets the same three quarter angle. */
const INSPECT_DIRECTION: Vec3 = [0.75, 0.5, 1];

/**
 * Share of the view the part's bounding sphere spans. The sphere is loose
 * around most parts, so 0.6 lands the part itself at roughly 40 to 55
 * percent of the view, which is what the brief asks for.
 */
const PART_FILL = 0.6;
/** Tiny boards would otherwise put the camera inside the frame. */
const MIN_RADIUS = 0.32;

/** Orbit targets can't leave this box, so panning never loses the machine. */
export const MACHINE_BOUNDS = { min: [-3, 0, -2.6] as Vec3, max: [4.4, 4.9, 2.6] as Vec3 };

/**
 * The whole machine: the enclosure plus the Pi platform beside it on the
 * right. Exploded, the walls stand a metre or so out on every side and the
 * roof lifts, so the view centres on the opened chamber and backs off to
 * take in the right panel, which moves furthest, past the Pi platform.
 */
export function overviewFocus(exploded: boolean): CameraFocus {
  if (exploded) return { target: [0.45, 2.4, 0.05], radius: 4.25, direction: OVERVIEW_DIRECTION, fill: 0.84 };
  return { target: [0.7, 2.05, 0.1], radius: 3.55, direction: OVERVIEW_DIRECTION, fill: 0.84 };
}

/** One part, in place on the machine, with everything else still visible. */
export function partFocus(part: PartDefinition, exploded: boolean): CameraFocus {
  return {
    target: partCenter(part, exploded),
    radius: Math.max(MIN_RADIUS, partRadius(part)),
    direction: part.view ?? PART_DIRECTION,
    fill: PART_FILL,
  };
}

/** The isolated part at the origin, a little closer than in context. */
export function inspectFocus(center: Vec3, radius: number): CameraFocus {
  return { target: center, radius: Math.max(0.2, radius), direction: INSPECT_DIRECTION, fill: 0.72 };
}
