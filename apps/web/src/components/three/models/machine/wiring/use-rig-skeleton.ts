"use client";
import { useEffect, useMemo } from "react";
import { Bone, DetachedBindMode, Matrix4, Skeleton, type SkinnedMesh } from "three";
import { rigOffset } from "../../../motion/Rig";
import { usePoseFrame } from "../../../motion/use-pose-frame";
import { CARRIERS } from "./harness-rig";

const BIND = new Matrix4();

/**
 * A skeleton with one bone per carrier (see harness-rig.ts), each placed at
 * its rig's offset every frame of the Home demo and at the origin
 * otherwise. Returns the skeleton and a ref callback that binds a skinned
 * mesh to it, for cables whose ends ride different parts of the machine.
 */
export function useRigSkeleton() {
  const skeleton = useMemo(() => new Skeleton(CARRIERS.map(() => new Bone())), []);
  useEffect(() => () => skeleton.dispose(), [skeleton]);

  usePoseFrame(
    (pose) => {
      skeleton.bones.forEach((bone, i) => {
        const carrier = CARRIERS[i];
        if (carrier !== "fixed") rigOffset(pose, carrier, bone.position);
        bone.updateMatrixWorld();
      });
    },
    () => {
      for (const bone of skeleton.bones) {
        bone.position.set(0, 0, 0);
        bone.updateMatrixWorld();
      }
    },
  );

  const bind = useMemo(
    () => (mesh: SkinnedMesh | null) => {
      if (!mesh || mesh.skeleton === skeleton) return;
      // Detached: the bones move vertices in the mesh's own space, so a cable inside a part that
      // sits away from the origin (or flies out in the exploded view) keeps its place.
      mesh.bindMode = DetachedBindMode;
      mesh.bind(skeleton, BIND);
    },
    [skeleton],
  );
  return bind;
}
