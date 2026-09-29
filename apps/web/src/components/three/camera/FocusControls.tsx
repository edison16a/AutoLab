"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { Box3, Vector3, type PerspectiveCamera } from "three";
import type { Vec3 } from "../types";
import { eyeFor, type CameraFocus } from "./focus-math";

export interface FocusControlsProps {
  focus: CameraFocus;
  /**
   * Change this to fly to `focus`. While it stays the same the camera is
   * left wherever the person dragged it, even if `focus` is recomputed.
   */
  focusKey: string;
  minDistance?: number;
  maxDistance?: number;
  /** The orbit target can't be panned outside this box. */
  bounds?: { min: Vec3; max: Vec3 };
  /**
   * Pixels on the right edge covered by a floating panel. Framing centres
   * on the uncovered part of the canvas instead of the whole of it.
   */
  insetRight?: number;
}

/**
 * About 750 ms to settle. camera-controls eases with a critically damped
 * spring rather than a fixed curve, which keeps a move smooth when a new
 * one starts halfway through.
 */
const SMOOTH_TIME = 0.25;
/** Stops the camera sliding below the floor. */
const MAX_POLAR = Math.PI / 2 - 0.04;

/** Film offset (three.js skew, in mm) that moves the image centre left by `fraction` of the canvas width. */
function skewFor(camera: PerspectiveCamera, fraction: number) {
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360);
  return fraction * 2 * camera.aspect * halfHeight * camera.getFilmWidth();
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Orbit, pan and zoom, plus smooth flights to a focus. The first focus is
 * applied instantly so the view never opens with a swoop. Grabbing the
 * view during a flight stops the flight where it is.
 */
export function FocusControls({ focus, focusKey, minDistance = 0.4, maxDistance = 30, bounds, insetRight = 0 }: FocusControlsProps) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const first = useRef(true);
  // Read the latest focus and canvas shape inside the key effect without re-running it.
  // Fit against the uncovered width, so a part never ends up under the panel.
  const aspect = Math.max(1, size.width - insetRight) / Math.max(1, size.height);
  const latest = useRef({ focus, aspect });
  latest.current = { focus, aspect };
  const shift = useRef({ current: 0, aspect: 0 });

  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    const { focus: next, aspect } = latest.current;
    const [ex, ey, ez] = eyeFor(next, camera.fov, aspect);
    const [tx, ty, tz] = next.target;
    const animate = !first.current && !prefersReducedMotion();
    first.current = false;
    void control.setLookAt(ex, ey, ez, tx, ty, tz, animate);
    invalidate();
  }, [focusKey, camera, invalidate]);

  // Ease the framing shift when the panel opens or closes, rather than jumping.
  useFrame(() => {
    const wanted = insetRight / 2 / Math.max(1, size.width);
    const state = shift.current;
    if (Math.abs(state.current - wanted) < 1e-4 && state.aspect === camera.aspect) return;
    const reduce = prefersReducedMotion();
    state.current = reduce || Math.abs(state.current - wanted) < 1e-3 ? wanted : state.current + (wanted - state.current) * 0.2;
    state.aspect = camera.aspect;
    camera.filmOffset = skewFor(camera, state.current);
    camera.updateProjectionMatrix();
    invalidate();
  });

  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    control.setBoundary(bounds ? new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max)) : undefined);
  }, [bounds]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      smoothTime={SMOOTH_TIME}
      draggingSmoothTime={0.08}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={MAX_POLAR}
      onControlStart={() => controls.current?.stop()}
    />
  );
}
