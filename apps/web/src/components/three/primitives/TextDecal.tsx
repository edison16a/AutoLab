"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from "three";
import { unitGeometry } from "../geometries";
import type { Placement } from "../types";

export interface TextDecalProps extends Placement {
  text: string;
  /** Size of the printed area in scene units. */
  width?: number;
  height?: number;
  /** Light print for dark boards, dark print for light plastics. */
  ink?: "light" | "dark";
  weight?: 400 | 500 | 600 | 700;
}

const INK = { light: "#f2f2f2", dark: "#2b2c30" } as const;
/** Canvas pixels per scene unit, so small print doesn't cost a full size texture. */
const PIXELS_PER_UNIT = 1400;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Uses the app's own typeface so printed labels match the interface. */
function fontFamily() {
  return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
}

/**
 * Printed text: silkscreen, nameplates, bottle labels. Drawn to a canvas
 * locally, so there are no font or texture downloads. Lies flat facing +Y
 * like silkscreen on a board; rotate it for vertical faces.
 */
export function TextDecal({ text, width = 0.4, height = 0.08, ink = "light", weight = 600, position, rotation = FLAT }: TextDecalProps) {
  const invalidate = useThree((state) => state.invalidate);
  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(512, Math.max(64, Math.round(width * PIXELS_PER_UNIT)));
    canvas.height = Math.max(24, Math.round((canvas.width * height) / width));
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = INK[ink];
      ctx.font = `${weight} ${Math.round(canvas.height * 0.62)}px ${fontFamily()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 8);
      texture.needsUpdate = true;
    };
    draw();
    // The web font may still be loading on first paint. Redraw once it lands.
    if (document.fonts?.status !== "loaded")
      document.fonts?.ready.then(() => {
        draw();
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
  }, [text, width, height, ink, weight, invalidate]);

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
      scale={[width, height, 1]}
      userData={{ noOutline: true }}
      dispose={null}
    />
  );
}
