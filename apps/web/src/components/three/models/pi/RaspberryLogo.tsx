"use client";
import { useEffect, useMemo } from "react";
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from "three";
import { unitGeometry } from "../../geometries";
import type { Placement } from "../../types";

/** Laser etching on a tin shield reads as a slightly darker grey, never as ink. */
const ETCH = "rgba(62, 64, 70, 0.72)";
const SIZE = 256;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Drupelet centres of the berry, in a unit box centred on the canvas. */
const BERRY: [number, number][] = [
  [0, -0.06],
  [-0.24, -0.1],
  [0.24, -0.1],
  [-0.3, 0.15],
  [0, 0.14],
  [0.3, 0.15],
  [-0.16, 0.37],
  [0.16, 0.37],
  [0, 0.54],
];

/** The raspberry mark as an outline: two leaves over a cluster of drupelets. */
function drawLogo(ctx: CanvasRenderingContext2D) {
  const unit = SIZE * 0.78;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.translate(SIZE / 2, SIZE * 0.47);
  ctx.strokeStyle = ETCH;
  ctx.lineWidth = SIZE * 0.035;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * unit * 0.17, -unit * 0.35, unit * 0.19, unit * 0.075, side * -0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const [x, y] of BERRY) {
    ctx.beginPath();
    ctx.arc(x * unit, y * unit, unit * 0.115, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The etched Raspberry Pi logo on the wireless module's shield. Drawn to a
 * small canvas locally, like the kit's TextDecal, and freed on unmount.
 */
export function RaspberryLogo({ size = 0.1, position, rotation = FLAT }: Placement & { size?: number }) {
  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx) drawLogo(ctx);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      toneMapped: false,
    });
    return { texture, material };
  }, []);

  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material],
  );

  return (
    <mesh
      geometry={unitGeometry("plane")}
      material={material}
      position={position}
      rotation={rotation}
      scale={[size, size, 1]}
      userData={{ noOutline: true }}
      dispose={null}
    />
  );
}
