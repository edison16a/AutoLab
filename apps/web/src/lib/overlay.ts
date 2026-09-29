/**
 * Draws detection boxes, masks and labels onto a canvas that sits exactly on
 * top of the image. Everything uses the one accent colour, so labels carry the
 * meaning and colour never has to.
 */
import type { Analysis } from "@/model/types";
import { placeChips } from "./overlay-labels";

const ACCENT = "#2684FF";

/** Canvas size matches the image's pixel size, so detection coordinates map one to one. */
export function drawDetections(canvas: HTMLCanvasElement, width: number, height: number, analysis?: Analysis) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (!analysis) return;

  // Scale strokes and text with the image so a 4K still reads like a 640px frame.
  const scale = Math.max(1, width / 640);
  ctx.lineWidth = 2 * scale;
  ctx.font = `600 ${12 * scale}px ui-sans-serif, system-ui, sans-serif`;
  ctx.strokeStyle = ACCENT;

  for (const d of analysis.detections) {
    if (d.polygon?.length) {
      ctx.fillStyle = "rgba(38, 132, 255, 0.14)";
      ctx.beginPath();
      d.polygon.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
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
    ctx.fillStyle = ACCENT;
    ctx.fillRect(chip.x, chip.y, chip.width, chip.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(texts[i], chip.x + 6 * scale, chip.y + 14 * scale);
  });
}
