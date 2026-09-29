"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from "three";
import { unitGeometry } from "../../geometries";
import type { Placement } from "../../types";

/** One printed line. `size` is its share of the decal height, so lines can differ. */
export interface MarkingLine {
  text: string;
  size?: number;
  weight?: 400 | 500 | 600 | 700;
}

export interface ChipMarkingProps extends Placement {
  lines: MarkingLine[];
  width: number;
  height: number;
  /**
   * Laser marking on black epoxy reads as a soft grey, never pure white.
   * Etching on a metal lid reads as a darker grey.
   */
  ink?: "laser" | "etch";
}

const INK = { laser: "rgba(214, 216, 220, 0.78)", etch: "rgba(58, 60, 66, 0.8)" } as const;
const PIXELS_PER_UNIT = 2400;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

function fontFamily() {
  return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
}

/**
 * The markings on a chip: maker, part number and date code as a few lines
 * in one small canvas, so a marked chip costs one draw instead of one per
 * line. Lies flat facing +Y, reading along +X.
 */
export function ChipMarking({ lines, width, height, ink = "laser", position, rotation = FLAT }: ChipMarkingProps) {
  const invalidate = useThree((state) => state.invalidate);
  // Lines usually arrive as a fresh literal, so key the texture on their content.
  const key = lines.map((line) => `${line.text}|${line.size ?? 1}|${line.weight ?? 500}`).join("\n");
  const { texture, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(512, Math.max(64, Math.round(width * PIXELS_PER_UNIT)));
    canvas.height = Math.max(32, Math.round((canvas.width * height) / width));
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const total = lines.reduce((sum, line) => sum + (line.size ?? 1), 0);
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = INK[ink];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let y = 0;
      for (const line of lines) {
        const band = (canvas.height * (line.size ?? 1)) / total;
        ctx.font = `${line.weight ?? 500} ${Math.round(band * 0.72)}px ${fontFamily()}`;
        ctx.fillText(line.text, canvas.width / 2, y + band / 2, canvas.width - 4);
        y += band;
      }
      texture.needsUpdate = true;
    };
    draw();
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
    // `key` stands in for `lines`, which is a new array on every render.
  }, [key, width, height, ink, invalidate]);

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
