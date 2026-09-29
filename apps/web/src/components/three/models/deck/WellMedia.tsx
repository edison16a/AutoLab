"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Object3D, type InstancedMesh } from "three";
import { unitGeometry } from "../../geometries";
import { castsShadow, getMaterial } from "../../materials";
import { WELL_COUNT } from "../../motion/pose";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { mm } from "../details/units";
import { WELL_LEVELS, WELL_PLATE, wellCentre } from "./labware-layout";

const RADIUS = WELL_PLATE.wellRadius - mm(0.2);
const scratch = new Object3D();
const RESTING = new Float32Array(WELL_COUNT).fill(1);

/**
 * The media in the 24 wells, one instanced draw. Each well's column of
 * media stands on the well floor at its own level: all at the usual 1 mL
 * on the still machine, and rising and falling as the Home demo takes
 * media off and gives it back.
 */
export function WellMedia() {
  const mesh = useRef<InstancedMesh>(null);
  const shown = useRef(new Float32Array(WELL_COUNT).fill(-1));

  const show = useCallback((levels: Float32Array) => {
    const target = mesh.current;
    if (!target) return;
    let changed = false;
    for (let i = 0; i < WELL_COUNT; i++) {
      if (Math.abs(levels[i] - shown.current[i]) < 1e-4) continue;
      shown.current[i] = levels[i];
      const depth = WELL_LEVELS.depth * Math.max(levels[i], 0.02);
      const [x, z] = wellCentre(i);
      scratch.position.set(x, WELL_LEVELS.floor + depth / 2, z);
      scratch.scale.set(RADIUS, depth, RADIUS);
      scratch.updateMatrix();
      target.setMatrixAt(i, scratch.matrix);
      changed = true;
    }
    if (!changed) return;
    target.instanceMatrix.needsUpdate = true;
    target.computeBoundingSphere();
  }, []);

  useLayoutEffect(() => show(RESTING), [show]);
  usePoseFrame(
    (pose) => show(pose.wells),
    () => show(RESTING),
  );
  useEffect(() => {
    const target = mesh.current;
    return () => target?.dispose();
  }, []);

  return (
    <instancedMesh
      ref={mesh}
      args={[unitGeometry("cylinder"), getMaterial("mediaPink"), WELL_COUNT]}
      castShadow={castsShadow("mediaPink")}
      receiveShadow
      dispose={null}
    />
  );
}
