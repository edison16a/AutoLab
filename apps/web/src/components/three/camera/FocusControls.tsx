"use client";
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
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
}

/**
 * About 750 ms to settle. camera-controls eases with a critically damped
 * spring rather than a fixed curve, which keeps a move smooth when a new
 * one starts halfway through.
 */
const SMOOTH_TIME = 0.25;
/** Stops the camera sliding below the floor. */
const MAX_POLAR = Math.PI / 2 - 0.04;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Orbit, pan and zoom, plus smooth flights to a focus. The first focus is
 * applied instantly so the view never opens with a swoop. Grabbing the
 * view during a flight stops the flight where it is.
 */
export function FocusControls({ focus, focusKey, minDistance = 0.4, maxDistance = 30, bounds }: FocusControlsProps) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const first = useRef(true);
  // Read the latest focus and canvas shape inside the key effect without re-running it.
  const latest = useRef({ focus, aspect: size.width / Math.max(1, size.height) });
  latest.current = { focus, aspect: size.width / Math.max(1, size.height) };

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
