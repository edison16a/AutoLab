"use client";
import { useEffect, type RefObject } from "react";

/**
 * Lets a plain mouse wheel scroll the page while the pointer is over the
 * 3D view. Home is a scrolling page and the machine panel is big, so without
 * this the wheel zooms the model every time the pointer crosses it on the
 * way down to the captures. Ctrl or Cmd with the wheel, and trackpad pinch
 * (which browsers report as a wheel with ctrlKey), still zoom.
 *
 * It works by stopping the event on the way down, in the capture phase,
 * before it reaches the camera controls on the canvas. Nothing calls
 * preventDefault, so the browser still scrolls.
 */
export function usePageWheel(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
    };
    element.addEventListener("wheel", onWheel, { capture: true });
    return () => element.removeEventListener("wheel", onWheel, { capture: true });
  }, [ref]);
}
