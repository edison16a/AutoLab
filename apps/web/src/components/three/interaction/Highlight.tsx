"use client";
import { useLayoutEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { InstancedMesh, Mesh, SkinnedMesh, type BufferGeometry, type Material, type Object3D } from "three";
import { creasedGeometry, hullMaterial, maskMaterial, setOutlineViewport, type HighlightVariant } from "./outline-materials";

export interface HighlightProps {
  /** The group whose meshes make up the part. */
  target: RefObject<Object3D | null>;
  /** Null draws nothing. */
  variant: HighlightVariant | null;
  /** Change this when the part's meshes are rebuilt, so the outline follows. */
  version?: unknown;
}

/** Mask and hull draw after everything else, in this order. */
const MASK_ORDER = 900;
const HULL_ORDER = 901;

function isOutlined(object: Object3D): object is Mesh {
  const mesh = object as Mesh;
  if (!mesh.isMesh || object.userData.noOutline) return false;
  const material = mesh.material as Material;
  return !Array.isArray(material) && material.visible;
}

/** A child copy of `source` that follows it exactly, drawn with another material. */
function companion(source: Mesh, geometry: BufferGeometry, material: Material, order: number) {
  let copy: Mesh;
  if (source instanceof InstancedMesh) {
    const instanced = new InstancedMesh(geometry, material, source.count);
    instanced.instanceMatrix = source.instanceMatrix;
    copy = instanced;
  } else if (source instanceof SkinnedMesh) {
    // A cable that flexes in the Home demo: the outline bends with it on the same bones.
    const skinned = new SkinnedMesh(geometry, material);
    skinned.bind(source.skeleton, source.bindMatrix);
    copy = skinned;
  } else copy = new Mesh(geometry, material);
  copy.renderOrder = order;
  // Its bounds would be the copy's own, which can be wrong for instances. It's cheap to always draw.
  copy.frustumCulled = false;
  copy.castShadow = false;
  copy.receiveShadow = false;
  copy.raycast = () => undefined;
  copy.userData.noOutline = true;
  return copy;
}

/**
 * Draws the accent outline around a whole part (see outline-materials.ts
 * for how). It adds mask and hull copies as children of the part's own
 * meshes, so they follow any animation for free, and removes them again
 * when the variant changes or the part unmounts.
 */
export function Highlight({ target, variant, version }: HighlightProps) {
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);

  useLayoutEffect(() => {
    setOutlineViewport(size.width * dpr, size.height * dpr, dpr);
    invalidate();
  }, [size, dpr, invalidate]);

  useLayoutEffect(() => {
    const root = target.current;
    if (!root || !variant) return;
    const sources: Mesh[] = [];
    root.traverse((object) => {
      if (isOutlined(object)) sources.push(object);
    });
    const added = sources.map((source) => {
      const mask = companion(source, source.geometry, maskMaterial(variant), MASK_ORDER);
      const hull = companion(source, creasedGeometry(source.geometry), hullMaterial(variant), HULL_ORDER);
      source.add(mask, hull);
      return { source, mask, hull };
    });
    invalidate();
    return () => {
      for (const { source, mask, hull } of added) source.remove(mask, hull);
      invalidate();
    };
  }, [target, variant, version, invalidate]);

  return null;
}
