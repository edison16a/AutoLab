/**
 * Shared shapes for the 3D kit. Everything is in scene units: 1 unit is
 * about 81 mm on the real machine, Y is up and the floor sits at y = 0.
 * Rotations are Euler angles in radians, XYZ order, like three.js.
 */
export type Vec3 = [number, number, number];

/** Where a primitive or model sits inside its parent. */
export interface Placement {
  position?: Vec3;
  rotation?: Vec3;
}
