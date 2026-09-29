"use client";
import { useEffect, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { unitGeometry } from "../geometries";
import { getHiddenMaterial } from "../materials";
import type { Vec3 } from "../types";

export interface HitBoxProps {
  size: Vec3;
  /** Centre of the box relative to the parent. */
  center?: Vec3;
  onOver?: () => void;
  onOut?: () => void;
  onPick?: () => void;
}

/** A click that travelled further than this (in pixels) was a drag to orbit, not a pick. */
const DRAG_TOLERANCE = 4;

/**
 * An invisible box that owns a part's pointer events. Picking against one
 * steady box instead of dozens of small meshes keeps hover from flickering
 * as the pointer crosses gaps between a part's pieces.
 */
export function HitBox({ size, center, onOver, onOut, onPick }: HitBoxProps) {
  const gl = useThree((state) => state.gl);
  const hovered = useRef(false);
  const leave = useRef(onOut);
  leave.current = onOut;

  // If the part disappears under the pointer, don't leave a stale cursor or hover behind.
  useEffect(
    () => () => {
      if (!hovered.current) return;
      gl.domElement.style.cursor = "";
      leave.current?.();
    },
    [gl],
  );

  return (
    <mesh
      geometry={unitGeometry("box")}
      material={getHiddenMaterial()}
      position={center}
      scale={size}
      userData={{ hitBox: true, noOutline: true }}
      dispose={null}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        hovered.current = true;
        gl.domElement.style.cursor = "pointer";
        onOver?.();
      }}
      onPointerOut={() => {
        hovered.current = false;
        gl.domElement.style.cursor = "";
        onOut?.();
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta > DRAG_TOLERANCE) return;
        onPick?.();
      }}
    />
  );
}
