"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import type { Analysis } from "@/lib/types";

/** Colors for detection overlays, cycled per label so repeated classes stay consistent. */
const overlayColors = ["#2684FF", "#31C48D", "#F5A524", "#A78BFA", "#F472B6", "#22D3EE"];
export function labelColor(label: string) {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return overlayColors[Math.abs(hash) % overlayColors.length];
}

/** An image with a pixel-aligned canvas overlay for boxes and masks. */
export default function ImageView({
  url,
  width,
  height,
  analysis,
  overlays = true,
  alt = "Autolab capture",
  className = "",
  fit = "contain",
}: {
  url: string;
  width: number;
  height: number;
  analysis?: Analysis;
  overlays?: boolean;
  alt?: string;
  className?: string;
  fit?: "contain" | "cover";
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!overlays || !analysis) return;
    const scale = Math.max(1, width / 640);
    ctx.lineWidth = 2 * scale;
    ctx.font = `600 ${12 * scale}px ui-sans-serif, system-ui, sans-serif`;
    for (const d of analysis.detections) {
      const color = labelColor(d.label);
      ctx.strokeStyle = color;
      if (d.polygon?.length) {
        ctx.fillStyle = `${color}22`;
        ctx.beginPath();
        d.polygon.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      const [x1, y1, x2, y2] = d.bbox;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const label = `${d.label} ${Math.round(d.confidence * 100)}%`;
      const tw = ctx.measureText(label).width,
        th = 20 * scale,
        ty = y1 - th < 0 ? y1 : y1 - th;
      ctx.fillStyle = color;
      ctx.fillRect(x1 - ctx.lineWidth / 2, ty, tw + 12 * scale, th);
      ctx.fillStyle = "#05070A";
      ctx.fillText(label, x1 + 6 * scale, ty + 14 * scale);
    }
  }, [width, height, analysis, overlays]);
  return (
    <div
      className={`image-view fit-${fit} ${className}`}
      style={{ "--ratio": `${width} / ${height}` } as CSSProperties}
    >
      <img src={url} alt={alt} draggable={false} />
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
