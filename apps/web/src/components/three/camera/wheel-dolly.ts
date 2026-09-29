/**
 * Zoom by moving the camera, aimed at whatever is under the pointer. Works
 * the same for a mouse wheel, a two finger trackpad scroll and a trackpad
 * pinch, which browsers report in very different units.
 */
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import type { CameraControls } from "@react-three/drei";

/** Share of the distance per pixel of scroll. About 20 percent per mouse wheel notch. */
const SCROLL_GAIN = 0.002;
/** A pinch reports small deltas, so it needs more gain to feel as direct. */
const PINCH_GAIN = 0.012;
/** One event never jumps more than this, so a fast flick can't overshoot the model. */
const MAX_STEP = 0.35;

/** Wheel deltas come in pixels, lines or pages depending on the device. This makes them all pixels. */
function wheelPixels(event: WheelEvent) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
  return event.deltaY * unit;
}

/** How much a wheel event scales the camera distance. Above 1 zooms out. */
export function wheelScale(event: WheelEvent) {
  const step = wheelPixels(event) * (event.ctrlKey ? PINCH_GAIN : SCROLL_GAIN);
  return Math.exp(MathUtils.clamp(step, -MAX_STEP, MAX_STEP));
}

const position = new Vector3();
const target = new Vector3();
const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();
const ray = new Vector3();
const pivot = new Vector3();

/**
 * Scales the distance to the target by `scale` while keeping the point under
 * the pointer (x and y from -1 to 1) where it is on screen. It works from the
 * camera's destination rather than where it is mid-glide, so quick scroll
 * events add up instead of each starting over from a half finished move.
 */
export function dollyTowardPointer(controls: CameraControls, camera: PerspectiveCamera, x: number, y: number, scale: number) {
  controls.getPosition(position, true);
  controls.getTarget(target, true);
  const distance = position.distanceTo(target);
  const next = MathUtils.clamp(distance * scale, controls.minDistance, controls.maxDistance);
  if (distance < 1e-6 || Math.abs(next - distance) < 1e-6) return;

  // The pointer's ray from the destination camera, built from its basis vectors.
  forward.subVectors(target, position).normalize();
  right.crossVectors(forward, camera.up).normalize();
  up.crossVectors(right, forward);
  const halfHeight = Math.tan(MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
  ray
    .copy(forward)
    .addScaledVector(right, x * halfHeight * camera.aspect)
    .addScaledVector(up, y * halfHeight)
    .normalize();

  // Where that ray meets the plane through the target that faces the camera.
  pivot.copy(position).addScaledVector(ray, distance / Math.max(1e-3, ray.dot(forward)));
  const ratio = next / distance;
  target.sub(pivot).multiplyScalar(ratio).add(pivot);
  position.sub(pivot).multiplyScalar(ratio).add(pivot);
  void controls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, true);
}
