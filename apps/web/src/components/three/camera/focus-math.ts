import type { Vec3 } from "../types";

/** What the camera should frame: a sphere seen from a direction. */
export interface CameraFocus {
  /** The point to look at. */
  target: Vec3;
  /** Radius of the sphere that should fill the view, in scene units. */
  radius: number;
  /** From the target toward the camera. Doesn't need to be normalised. */
  direction: Vec3;
  /** Share of the view the sphere's diameter should fill, 0 to 1. */
  fill: number;
}

/**
 * Distance at which a sphere fills `fill` of the view. Uses the narrower of
 * the two field of view angles, so a tall part on a phone still fits across.
 */
export function fitDistance(radius: number, fill: number, fovDegrees: number, aspect: number) {
  const vertical = (fovDegrees * Math.PI) / 360;
  const horizontal = Math.atan(Math.tan(vertical) * aspect);
  const half = Math.min(vertical, horizontal);
  return radius / (Math.tan(half) * fill);
}

/** Camera position for a focus, given the current lens and canvas shape. */
export function eyeFor(focus: CameraFocus, fovDegrees: number, aspect: number): Vec3 {
  const [dx, dy, dz] = focus.direction;
  const length = Math.hypot(dx, dy, dz) || 1;
  const distance = fitDistance(focus.radius, focus.fill, fovDegrees, aspect);
  const [tx, ty, tz] = focus.target;
  return [tx + (dx / length) * distance, ty + (dy / length) * distance, tz + (dz / length) * distance];
}
