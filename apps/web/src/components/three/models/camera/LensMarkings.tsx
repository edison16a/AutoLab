"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, CylinderGeometry, MeshBasicMaterial, SRGBColorSpace } from "three";
import { cachedGeometry, unitGeometry } from "../../geometries";
import type { Vec3 } from "../../types";
import { drawFrontRing, drawScaleBand } from "./lens-markings";

/**
 * Builds a canvas, its texture and a decal material, runs `draw` and
 * redraws once the web font lands. Made once per lens and freed on unmount.
 */
function useCanvasDecal(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const invalidate = useThree((state) => state.invalidate);
  const decal = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      draw(ctx);
      texture.needsUpdate = true;
    };
    paint();
    if (document.fonts?.status !== "loaded")
      document.fonts?.ready.then(() => {
        paint();
        invalidate();
      });
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      toneMapped: false,
    });
    return { texture, material };
    // Each call site draws the same picture every time, so `draw` is left out on purpose.
  }, [width, height, invalidate]);
  useEffect(
    () => () => {
      decal.texture.dispose();
      decal.material.dispose();
    },
    [decal],
  );
  return decal.material;
}

/** The front half of an open tube, facing +Z, for printing around a barrel. */
function frontHalfBand() {
  return cachedGeometry("camera:lens-band", () => new CylinderGeometry(1, 1, 1, 48, 1, true, -Math.PI / 2, Math.PI));
}

export interface LensMarkingsProps {
  /** Lens front face height and the radii of its name ring. */
  front: { y: number; inner: number; outer: number };
  /** The fixed band the scales are printed on, as centre height, height and radius. */
  band: { y: number; height: number; radius: number };
}

const FACING_DOWN: Vec3 = [Math.PI / 2, 0, 0];
const FRONT_RING_TEXT = 0.017;

/**
 * The lens's white markings: the name ring around the front element, read
 * face on with the lens pointing at you, and the aperture and distance
 * scales around the barrel, facing the enclosure door.
 */
export function LensMarkings({ front, band }: LensMarkingsProps) {
  const radius = (front.inner + front.outer) / 2;
  const ring = useCanvasDecal(512, 512, (ctx) => drawFrontRing(ctx, front.outer, radius, FRONT_RING_TEXT));
  const scale = useCanvasDecal(2048, Math.round((2048 * band.height) / (Math.PI * band.radius)), drawScaleBand);
  const ringScale: Vec3 = [front.outer * 2, front.outer * 2, 1];
  const bandScale: Vec3 = [band.radius + 0.0008, band.height, band.radius + 0.0008];
  return (
    <group>
      <mesh geometry={unitGeometry("plane")} material={ring} position={[0, front.y, 0]} rotation={FACING_DOWN} scale={ringScale} userData={{ noOutline: true }} dispose={null} />
      <mesh geometry={frontHalfBand()} material={scale} position={[0, band.y, 0]} scale={bandScale} userData={{ noOutline: true }} dispose={null} />
    </group>
  );
}
