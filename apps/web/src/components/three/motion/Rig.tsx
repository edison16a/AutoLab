"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Vector3 } from "three";
import { useMachinePose } from "./MachineMotion";
import type { MachinePose } from "./pose";

/**
 * What a piece of the machine is carried by. The gantry rolls on Y, the
 * beam rides it up and down on Z, the carriage runs along the beam on X,
 * and the plunger drive moves down the carriage as the plunger is pressed.
 * Each rides everything above it in that list.
 */
export type RigName = "gantry" | "beam" | "carriage" | "plunger";

/** How far the plunger drive moves down at full blowout, in scene units (about 8 mm). */
export const PLUNGER_STROKE = 0.1;

/** Writes how far something on `rig` has moved from rest, in scene axes. */
export function rigOffset(pose: MachinePose, rig: RigName, out: Vector3) {
  const beam = rig === "gantry" ? 0 : pose.z;
  const along = rig === "carriage" || rig === "plunger" ? pose.x : 0;
  const press = rig === "plunger" ? pose.plunger * PLUNGER_STROKE : 0;
  return out.set(along, beam - press, pose.y);
}

/**
 * A group that carries its children with `rig` while the Home demo runs,
 * and sits at rest everywhere else. Children are placed in machine space,
 * as if the machine were at rest. Rigs don't nest: each offset already
 * includes everything its rig rides on. The group is the same element
 * either way, so the demo starting or stopping never remounts it.
 */
export function Rig({ rig, children }: { rig: RigName; children: ReactNode }) {
  const pose = useMachinePose();
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (pose || !group.current) return;
    group.current.position.set(0, 0, 0);
    invalidate();
  }, [pose, invalidate]);

  useFrame(() => {
    if (pose && group.current) rigOffset(pose, rig, group.current.position);
  });
  return <group ref={group}>{children}</group>;
}
