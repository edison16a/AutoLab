/**
 * Shared geometry cache. Most primitives are a unit shape scaled into place,
 * so the whole machine needs only a handful of vertex buffers. Shapes that
 * can't be scaled without distortion (rounded corners, tapers, boards with
 * holes) are cached by their exact dimensions instead.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { registerDisposer } from "./resources";

/** Unit shapes: 1 x 1 x 1 box, radius 1 height 1 cylinders, radius 1 sphere and tori, 1 x 1 plane. */
export type UnitShape = "box" | "cylinder" | "cylinderLow" | "sphere" | "torus" | "torusThin" | "plane";

const UNIT: Record<UnitShape, () => BufferGeometry> = {
  box: () => new BoxGeometry(1, 1, 1),
  cylinder: () => new CylinderGeometry(1, 1, 1, 40),
  // Pins, legs and screws are small on screen, so 12 sides is plenty.
  cylinderLow: () => new CylinderGeometry(1, 1, 1, 12),
  sphere: () => new SphereGeometry(1, 24, 16),
  torus: () => new TorusGeometry(1, 0.22, 10, 32),
  torusThin: () => new TorusGeometry(1, 0.055, 8, 48),
  plane: () => new PlaneGeometry(1, 1),
};

const cache = new Map<string, BufferGeometry>();

/** Returns the cached geometry for a key, building it the first time. */
export function cachedGeometry(key: string, make: () => BufferGeometry): BufferGeometry {
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = make();
    cache.set(key, geometry);
  }
  return geometry;
}

export function unitGeometry(shape: UnitShape) {
  return cachedGeometry(`unit:${shape}`, UNIT[shape]);
}

/** A box with rounded edges. Radius is clamped so it never exceeds half the thinnest side. */
export function roundedBoxGeometry(width: number, height: number, depth: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2, depth / 2);
  return cachedGeometry(`rbox:${width}:${height}:${depth}:${r}`, () => new RoundedBoxGeometry(width, height, depth, 3, r));
}

/**
 * A tapered cylinder of height 1 and bottom radius 1, for tips,
 * bottle shoulders and nozzles. Scale it like the unit cylinder.
 */
export function taperGeometry(topRatio: number, segments = 32) {
  const ratio = Math.round(topRatio * 1000) / 1000;
  return cachedGeometry(`taper:${ratio}:${segments}`, () => new CylinderGeometry(ratio, 1, 1, segments));
}

registerDisposer(() => {
  cache.forEach((geometry) => geometry.dispose());
  cache.clear();
});
