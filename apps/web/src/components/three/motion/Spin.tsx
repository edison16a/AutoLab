"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { useMachinePose } from "./MachineMotion";
import type { MachinePose } from "./pose";

export interface SpinProps {
  /** The local axis to turn about, through the group's origin. */
  axis: "x" | "y" | "z";
  /** Reads the angle from the pose. Pass a module level function, not a new one each render. Leave out to hold still. */
  angle?: (pose: MachinePose) => number;
  children: ReactNode;
}

/**
 * Turns its children about one axis while the Home demo runs: fan blades,
 * lead screws, pulleys and motor shafts. Everywhere else it holds still.
 */
export function Spin({ axis, angle, children }: SpinProps) {
  const pose = useMachinePose();
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (pose || !group.current) return;
    group.current.rotation.set(0, 0, 0);
    invalidate();
  }, [pose, invalidate]);

  useFrame(() => {
    if (pose && angle && group.current) group.current.rotation[axis] = angle(pose);
  });
  return <group ref={group}>{children}</group>;
}
