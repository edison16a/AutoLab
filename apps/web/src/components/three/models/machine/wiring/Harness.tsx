"use client";
import { useEffect, useMemo, type ReactNode } from "react";
import { Bone, Matrix4, Skeleton, type SkinnedMesh } from "three";
import { getMaterial } from "../../../materials";
import { Rig, rigOffset } from "../../../motion/Rig";
import { usePoseFrame } from "../../../motion/use-pose-frame";
import { Repeat } from "../../../primitives";
import { harnessGeometries, tiePlacements, type WireRun } from "./harness-geometry";
import { CARRIERS, type Carrier } from "./harness-rig";

const BIND = new Matrix4();

/** Ties ride their carrier like any other part; the frame's stay put. */
function Carried({ carrier, children }: { carrier: Carrier; children: ReactNode }) {
  return carrier === "fixed" ? <group>{children}</group> : <Rig rig={carrier}>{children}</Rig>;
}

/**
 * Draws a set of wire runs: one merged skinned mesh per wire colour, and
 * every cable tie in two instanced draws per carrier. The skeleton has one
 * bone per rig, placed each frame at that rig's offset, so in the Home demo
 * a lead follows the part it is plugged into and flexes where it crosses a
 * moving joint; at rest every bone sits at the origin and nothing moves.
 * Pass a module constant so the buffers are built once; they belong to
 * this component and are freed with it.
 */
export function Harness({ runs }: { runs: WireRun[] }) {
  const parts = useMemo(() => harnessGeometries(runs), [runs]);
  const ties = useMemo(() => tiePlacements(runs), [runs]);
  const skeleton = useMemo(() => new Skeleton(CARRIERS.map(() => new Bone())), []);
  useEffect(() => () => parts.forEach(({ geometry }) => geometry.dispose()), [parts]);
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

  const bind = (mesh: SkinnedMesh | null) => {
    if (mesh && mesh.skeleton !== skeleton) mesh.bind(skeleton, BIND);
  };

  return (
    <group>
      {parts.map(({ material, geometry }) => (
        // Skinned vertices move away from the static bounds, and the whole harness is cheap to draw, so skip culling.
        <skinnedMesh key={material} ref={bind} geometry={geometry} material={getMaterial(material)} castShadow receiveShadow frustumCulled={false} dispose={null} />
      ))}
      {ties.map(({ carrier, bands, heads }) => (
        <Carried key={carrier} carrier={carrier}>
          <Repeat items={bands} shape="cylinderLow" material="plasticBlack" />
          <Repeat items={heads} material="plasticBlack" />
        </Carried>
      ))}
    </group>
  );
}
