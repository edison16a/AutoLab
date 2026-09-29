"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useMachinePose } from "./MachineMotion";
import type { MachinePose } from "./pose";

/**
 * Runs `apply` every frame with the live pose while the Home demo runs, and
 * `reset` once when it stops (or never started), to put the scene back at
 * rest. Both only touch three.js objects, never React state.
 */
export function usePoseFrame(apply: (pose: MachinePose) => void, reset?: () => void) {
  const pose = useMachinePose();
  const invalidate = useThree((state) => state.invalidate);
  const latest = useRef({ apply, reset });
  latest.current = { apply, reset };

  useEffect(() => {
    if (pose) return;
    latest.current.reset?.();
    invalidate();
  }, [pose, invalidate]);

  useFrame(() => {
    if (pose) latest.current.apply(pose);
  });
}
