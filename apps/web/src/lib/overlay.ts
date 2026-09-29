/**
 * Draws detection boxes, masks and labels onto a canvas that sits exactly on
 * top of the image. Everything uses the one accent colour, so labels carry the
 * meaning and colour never has to.
 */
import type { Analysis } from "@/model/types";
import { placeChips } from "./overlay-labels";

export interface OverlayStyle {
  /** Image pixels per CSS pixel as shown, so labels read the same size on a phone and a monitor. */
  scale: number;
  accent: string;
  /** Text on the accent chips. */
  ink: string;
  font: string;
}

/**
 * The look comes from the page (the accent token and the UI font), read off
 * the canvas element, and the size from how wide the image is drawn now.
 */
export function overlayStyle(canvas: HTMLCanvasElement, imageWidth: number): OverlayStyle {
  const css = getComputedStyle(canvas);
  const shown = canvas.getBoundingClientRect().width;
  return {
    scale: shown > 0 ? imageWidth / shown : 1,
    accent: css.getPropertyValue("--accent").trim() || "#2684ff",
    ink: css.getPropertyValue("--on-accent").trim() || "#ffffff",
    font: css.fontFamily || "sans-serif",
  };
}

/** Canvas size matches the image's pixel size, so detection coordinates map one to one. */
export function drawDetections(canvas: HTMLCanvasElement, width: number, height: number, analysis: Analysis | undefined, style: OverlayStyle) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!analysis) return;

  const { scale, accent, ink } = style;
  ctx.lineWidth = 2 * scale;
  ctx.font = `600 ${12 * scale}px ${style.font}`;
  ctx.strokeStyle = accent;

  for (const d of analysis.detections) {
    if (d.polygon?.length) {
      ctx.beginPath();
      d.polygon.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
    const [x1, y1, x2, y2] = d.bbox;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  // Labels go on after every box, so no outline is drawn across a label.
  // The most confident detections are placed first and get the best spots.
  const ordered = [...analysis.detections].sort((a, b) => b.confidence - a.confidence);
  const texts = ordered.map((d) => `${d.label} ${Math.round(d.confidence * 100)}%`);
  const widths = texts.map((text) => ctx.measureText(text).width + 12 * scale);
  const chips = placeChips(
    ordered.map((d) => d.bbox),
    widths,
    20 * scale,
    width,
    height,
  );
  chips.forEach((chip, i) => {
    ctx.fillStyle = accent;
    ctx.fillRect(chip.x, chip.y, chip.width, chip.height);
    ctx.fillStyle = ink;
    ctx.fillText(texts[i], chip.x + 6 * scale, chip.y + 14 * scale);
  });
}
