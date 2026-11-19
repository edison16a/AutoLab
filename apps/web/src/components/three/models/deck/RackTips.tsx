"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Object3D, type InstancedMesh } from "three";
import { unitGeometry } from "../../geometries";
import { castsShadow, getMaterial, receivesShadow } from "../../materials";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { FULL_RACK, TIP_RACK, tipSocket } from "./labware-layout";

const COUNT = TIP_RACK.cols * TIP_RACK.rows;
/** Each tip hangs in the box from its collar; only the collar shows above the deck. */
const COLLAR = { y: TIP_RACK.deckY + 0.03, scale: [0.04, 0.05, 0.04] } as const;

const scratch = new Object3D();

/** Places a copy on every socket, shrunk to nothing where the socket is empty. */
function place(mesh: InstancedMesh, mask: number, { y, scale }: typeof COLLAR) {
  for (let i = 0; i < COUNT; i++) {
    const [x, z] = tipSocket(i);
    const size = mask & (1 << i) ? 1 : 0;
    scratch.position.set(x, y, z);
    scratch.scale.set(scale[0] * size, scale[1] * size, scale[2] * size);
    scratch.updateMatrix();
    mesh.setMatrixAt(i, scratch.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/**
 * The tips standing in the rack, one instanced draw for their collars. On
 * the still machine the rack is full bar the first column; in the Home demo
 * a tip vanishes as the head takes it, and the rack is refilled when the
 * reachable ones run out.
 */
export function RackTips() {
  const collars = useRef<InstancedMesh>(null);
  const shown = useRef(-1);

  const show = useCallback((mask: number) => {
    if (mask === shown.current || !collars.current) return;
    shown.current = mask;
    place(collars.current, mask, COLLAR);
  }, []);

  useLayoutEffect(() => show(FULL_RACK), [show]);
  usePoseFrame(
    (pose) => show(pose.rack),
    () => show(FULL_RACK),
  );
  useEffect(() => {
    const mesh = collars.current;
    return () => mesh?.dispose();
  }, []);

  return <instancedMesh ref={collars} args={[unitGeometry("cylinder"), getMaterial("tipBlue"), COUNT]} castShadow={castsShadow("tipBlue")} receiveShadow={receivesShadow("tipBlue")} dispose={null} />;
}
