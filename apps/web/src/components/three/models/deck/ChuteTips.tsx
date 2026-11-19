"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import { taperGeometry } from "../../geometries";
import { castsShadow, getMaterial } from "../../materials";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { CHUTE_SLOTS } from "./chute-slots";
import { TIP_SHAPE } from "./labware-layout";

const COUNT = CHUTE_SLOTS.length;
const { length, point, taper } = TIP_SHAPE;

const slot = new Matrix4();
const local = new Matrix4();
const turn = new Quaternion();
const euler = new Euler();
const at = new Vector3();
const size = new Vector3();

/** One copy per slot: the cone placed on the tip lying there, or nothing past `count`. */
function place(mesh: InstancedMesh, count: number, centre: number, scale: [number, number, number]) {
  CHUTE_SLOTS.forEach(({ point: [x, y, z], tilt, yaw }, i) => {
    const shown = i < count ? 1 : 0;
    slot.compose(at.set(x, y, z), turn.setFromEuler(euler.set(tilt, yaw, 0, "YXZ")), size.set(shown, shown, shown));
    local.makeScale(scale[0], scale[1], scale[2]).setPosition(0, centre, 0);
    mesh.setMatrixAt(i, slot.multiply(local));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/**
 * Used tips lying in the disposal bin, in the heated platform's space. The
 * still machine's bin is empty; in the Home demo each stripped tip lands in
 * the next slot, and the bin is emptied when the tip rack is refilled.
 */
export function ChuteTips() {
  const cones = useRef<InstancedMesh>(null);
  const shown = useRef(-1);

  const show = useCallback((count: number) => {
    if (count === shown.current || !cones.current) return;
    shown.current = count;
    place(cones.current, count, length / 2, [point, length, point]);
  }, []);

  useLayoutEffect(() => show(0), [show]);
  usePoseFrame(
    (pose) => show(pose.chuteTips),
    () => show(0),
  );
  useEffect(() => {
    const mesh = cones.current;
    return () => mesh?.dispose();
  }, []);

  return <instancedMesh ref={cones} args={[taperGeometry(taper), getMaterial("tipBlue"), COUNT]} castShadow={castsShadow("tipBlue")} receiveShadow dispose={null} />;
}
