"use client";
import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControlsImpl, type CameraControls } from "@react-three/drei";
import type { PerspectiveCamera } from "three";
import { dollyTowardPointer, wheelScale } from "./wheel-dolly";

/** Safari's pinch gesture event. It isn't in the DOM typings. */
interface GestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

/**
 * Takes over wheel zoom from camera-controls. The library turns a trackpad
 * pinch into a lens zoom that lingers after a part is selected, and scales
 * scrolls differently per platform. Here every wheel, scroll and pinch moves
 * the camera toward the pointer at a consistent speed. Safari reports pinch
 * as gesture events instead of wheel events, so those are handled too.
 */
export function useWheelDolly(controls: RefObject<CameraControls | null>) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const element = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    const previous = control.mouseButtons.wheel;
    control.mouseButtons.wheel = CameraControlsImpl.ACTION.NONE;

    const pointer = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      return [((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1] as const;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const [x, y] = pointer(event.clientX, event.clientY);
      dollyTowardPointer(control, camera, x, y, wheelScale(event));
    };
    let lastScale = 1;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      lastScale = 1;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as GestureEvent;
      const [x, y] = pointer(gesture.clientX, gesture.clientY);
      // Fingers apart makes scale grow, which should bring the camera closer.
      dollyTowardPointer(control, camera, x, y, lastScale / gesture.scale);
      lastScale = gesture.scale;
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("gesturestart", onGestureStart);
    element.addEventListener("gesturechange", onGestureChange);
    return () => {
      control.mouseButtons.wheel = previous;
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("gesturestart", onGestureStart);
      element.removeEventListener("gesturechange", onGestureChange);
    };
  }, [controls, camera, element]);
}
