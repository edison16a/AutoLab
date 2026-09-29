"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { drawDetections } from "@/lib/overlay";
import type { Analysis } from "@/model/types";

interface ImageViewProps {
  url: string;
  width: number;
  height: number;
  analysis?: Analysis;
  /** Hide boxes without throwing the analysis away. */
  overlays?: boolean;
  alt?: string;
  /** "cover" fills a thumbnail frame. Overlays are skipped there, the crop would misalign them. */
  fit?: "contain" | "cover";
  className?: string;
}

/** An image with its detections drawn on a pixel aligned canvas. */
export function ImageView({
  url,
  width,
  height,
  analysis,
  overlays = true,
  alt = "Autolab capture",
  fit = "contain",
  className = "",
}: ImageViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const showBoxes = overlays && fit === "contain";

  useEffect(() => {
    if (showBoxes && canvas.current) drawDetections(canvas.current, width, height, analysis);
  }, [width, height, analysis, showBoxes]);

  return (
    <div
      className={`image-view ${fit === "cover" ? "image-view--cover" : ""} ${className}`}
      style={{ "--ratio": `${width} / ${height}` } as CSSProperties}
    >
      <img src={url} alt={alt} draggable={false} />
      {/* Thumbnails skip the canvas: a full resolution canvas per card adds up fast. */}
      {showBoxes ? <canvas ref={canvas} aria-hidden="true" /> : null}
    </div>
  );
}
