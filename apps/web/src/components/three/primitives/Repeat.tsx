"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Object3D, type BufferGeometry, type EulerOrder, type InstancedMesh } from "three";
import { unitGeometry, type UnitShape } from "../geometries";
import { castsShadow, getMaterial, type MaterialKey } from "../materials";
import type { Vec3 } from "../types";

/** One copy of the repeated shape. Scale falls back to the shared `scale` prop. */
export interface RepeatItem {
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

export interface RepeatProps {
  items: RepeatItem[];
  /** A unit shape from the cache, or any geometry you own. */
  shape?: UnitShape;
  geometry?: BufferGeometry;
  material?: MaterialKey;
  /** Scale applied to every item that doesn't set its own. */
  scale?: Vec3;
  /**
   * Euler order for every item's rotation. "ZYX" turns a part about its own
   * axis first and then swings it into place, which is what fan blades and
   * other radial copies need.
   */
  order?: EulerOrder;
}

// One scratch object for every instance write, so updates never allocate.
const scratch = new Object3D();
const NO_ROTATION: Vec3 = [0, 0, 0];
const UNIT_SCALE: Vec3 = [1, 1, 1];

/**
 * Draws many copies of one shape in a single draw call: header pins, wells
 * in a plate, tips in a rack, fan blades. Pass a stable `items`
 * array (a module constant or a memo) so matrices are only written when the
 * layout actually changes.
 */
export function Repeat({ items, shape = "box", geometry, material = "plasticGrey", scale = UNIT_SCALE, order = "XYZ" }: RepeatProps) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, index) => {
      const size = item.scale ?? scale;
      scratch.position.set(item.position[0], item.position[1], item.position[2]);
      const turn = item.rotation ?? NO_ROTATION;
      scratch.rotation.set(turn[0], turn[1], turn[2], order);
      scratch.scale.set(size[0], size[1], size[2]);
      scratch.updateMatrix();
      mesh.setMatrixAt(index, scratch.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    // Without this the whole batch is culled by the bounds of one copy at the origin.
    mesh.computeBoundingSphere();
    invalidate();
  }, [items, scale, order, invalidate]);

  // Instance buffers belong to this mesh (unlike the shared geometry), so free them here.
  useEffect(() => {
    const mesh = ref.current;
    return () => mesh?.dispose();
  }, [items.length]);

  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry ?? unitGeometry(shape), getMaterial(material), items.length]}
      castShadow={castsShadow(material)}
      receiveShadow
      dispose={null}
    />
  );
}
