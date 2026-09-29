/**
 * Canvas drawings for the white markings on the 6 mm lens. The real lens
 * has its name ring engraved around the front element and the aperture
 * and distance scales printed around the barrel, all in white paint that
 * sits in the engraving. Drawn locally, so there is nothing to download.
 */

const INK = "rgba(240, 240, 238, 0.92)";

export function fontFamily() {
  return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
}

/**
 * Text set around a circle, centred on the top (`top`) or the bottom of
 * the ring, always upright when the ring is seen face on. `radius` is the
 * baseline circle in pixels from the canvas centre.
 */
function arcText(ctx: CanvasRenderingContext2D, text: string, radius: number, top: boolean) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) / radius;
  let angle = top ? -total / 2 : total / 2;
  const { width, height } = ctx.canvas;
  [...text].forEach((ch, i) => {
    const step = widths[i] / radius;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(top ? angle + step / 2 : angle - step / 2);
    ctx.fillText(ch, 0, top ? -radius : radius);
    ctx.restore();
    angle += top ? step : -step;
  });
}

/**
 * The name ring on the lens front. The canvas spans `outer` scene units
 * across and the text runs on a circle of `radius` scene units.
 */
export function drawFrontRing(ctx: CanvasRenderingContext2D, outer: number, radius: number, textHeight: number) {
  const { width, height } = ctx.canvas;
  const px = width / (outer * 2);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = `600 ${Math.round(textHeight * px)}px ${fontFamily()}`;
  ctx.textBaseline = "middle";
  arcText(ctx, "6mm  1:1.2", radius * px, true);
  arcText(ctx, "3MP  CS MOUNT", radius * px, false);
}

/** Aperture stops and focus distances as printed on the lens, left to right. */
const APERTURE = ["1.2", "2", "2.8", "4", "5.6", "8", "11", "16", "C"];
const DISTANCE = ["∞", "3", "1", ".5", ".3", ".2m"];

/**
 * The scale band: aperture stops along the top edge, focus distances
 * along the bottom, and ticks between the two where the index line meets
 * them. The canvas wraps the front half of the barrel, so the scales sit
 * in its middle third, where the real ones face the operator.
 */
export function drawScaleBand(ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(height * 0.3)}px ${fontFamily()}`;
  const row = (labels: string[], y: number, span: number) =>
    labels.forEach((label, i) => {
      const x = width / 2 + (i / (labels.length - 1) - 0.5) * span;
      ctx.fillText(label, x, y);
    });
  row(APERTURE, height * 0.2, width * 0.42);
  row(DISTANCE, height * 0.82, width * 0.3);
  // Short ticks under each stop, so the rows read as scales and not loose numbers.
  for (let i = 0; i < APERTURE.length; i += 1) {
    const x = width / 2 + (i / (APERTURE.length - 1) - 0.5) * width * 0.42;
    ctx.fillRect(x - 1.5, height * 0.38, 3, height * 0.1);
  }
  // The index dot on the fixed barrel that both rings are set against.
  ctx.beginPath();
  ctx.arc(width / 2, height * 0.57, height * 0.07, 0, Math.PI * 2);
  ctx.fill();
}
