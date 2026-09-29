/**
 * Draws detection boxes, masks and labels onto a canvas that sits exactly on
 * top of the image. Everything uses the one accent colour, so labels carry the
 * meaning and colour never has to.
 */
import type { Analysis } from "@/model/types";

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

    const text = `${d.label} ${Math.round(d.confidence * 100)}%`;
    const chipHeight = 20 * scale;
    // Keep the label inside the image when a box touches the top edge.
    const chipTop = y1 - chipHeight < 0 ? y1 : y1 - chipHeight;
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x1 - ctx.lineWidth / 2, chipTop, ctx.measureText(text).width + 12 * scale, chipHeight);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, x1 + 6 * scale, chipTop + 14 * scale);
  }
}
