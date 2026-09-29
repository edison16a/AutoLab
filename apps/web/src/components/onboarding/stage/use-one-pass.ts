"use client";
import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useShadowRefresh } from "@/components/three";

interface OnePassOptions {
  /** Seconds the move takes once it starts. */
  duration: number;
  /** Seconds to hold the start pose first, so the eye can find the parts. */
  delay?: number;
  /** False shows the end pose at once. Later steps show earlier work as done. */
  play?: boolean;
  /** Puts the scene at an eased progress between 0 and 1. Runs every frame while moving. */
  apply: (progress: number) => void;
  /** Called once when the end pose is reached, including when it's skipped to. */
  onDone?: () => void;
  /** False for things that cast no shadow, such as a line drawing in. */
  shadows?: boolean;
}

/** Slow at both ends, so a part settles into place instead of stopping dead. */
export function easeInOut(t: number) {
  return 0.5 - Math.cos(Math.PI * t) / 2;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays one eased move, then holds the last pose. The canvas only renders
 * on demand, so this asks for a frame while the move runs and stops asking
 * the moment it ends. Shadows redraw alongside. Reduced motion skips
 * straight to the end. Remount the component (change its key) to replay.
 *
 * Progress follows the wall clock from the first frame, not summed frame
 * deltas, so a slow machine shows fewer frames of the same move instead of
 * a slow motion one.
 */
export function useOnePass({ duration, delay = 0, play = true, apply, onDone, shadows = true }: OnePassOptions) {
  const invalidate = useThree((state) => state.invalidate);
  const refreshShadows = useShadowRefresh();
  const started = useRef<number | null>(null);
  const running = useRef(false);
  // The callbacks are usually inline, so read the newest ones without restarting.
  const latest = useRef({ apply, onDone });
  latest.current = { apply, onDone };

  useLayoutEffect(() => {
    const skip = !play || prefersReducedMotion();
    started.current = null;
    running.current = !skip;
    latest.current.apply(skip ? 1 : 0);
    if (skip) latest.current.onDone?.();
    if (shadows) refreshShadows();
    invalidate();
  }, [play, shadows, refreshShadows, invalidate]);

  useFrame(() => {
    if (!running.current) return;
    const now = performance.now();
    started.current ??= now;
    const seconds = (now - started.current) / 1000;
    const t = Math.min(1, Math.max(0, (seconds - delay) / duration));
    latest.current.apply(easeInOut(t));
    // Nothing moves during the delay, so the frozen shadows are still right.
    if (shadows && t > 0) refreshShadows();
    if (t < 1) {
      invalidate();
      return;
    }
    running.current = false;
    latest.current.onDone?.();
  });
}
