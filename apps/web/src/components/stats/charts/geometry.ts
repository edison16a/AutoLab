/**
 * Shapes and measurements shared by the SVG charts.
 */

/** Rounded data end. The baseline end stays square so bars read as growing from it. */
const END_RADIUS = 4;

/** A column from `bottom` up to `top`, rounded at the top only. */
export function columnPath(x: number, top: number, width: number, bottom: number) {
  const r = Math.min(END_RADIUS, width / 2, bottom - top);
  return [
    `M${x},${bottom}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${bottom}`,
    "Z",
  ].join("");
}

/** A bar from `left` out to `right`, rounded at the right end only. */
export function barPath(left: number, y: number, right: number, height: number) {
  const r = Math.min(END_RADIUS, height / 2, right - left);
  return [
    `M${left},${y}`,
    `H${right - r}`,
    `Q${right},${y} ${right},${y + r}`,
    `V${y + height - r}`,
    `Q${right},${y + height} ${right - r},${y + height}`,
    `H${left}`,
    "Z",
  ].join("");
}

/**
 * Rough width of UI text at a given size. Close enough to size margins and
 * keep labels apart without measuring the DOM on every render.
 */
export function textWidth(text: string, size = 11) {
  return text.length * size * 0.58;
}

/** Anchors a label so it stays inside [0, width] instead of spilling past the edge. */
export function edgeAnchor(x: number, label: string, width: number) {
  const half = textWidth(label) / 2;
  if (x - half < 0) return { x: 0, anchor: "start" as const };
  if (x + half > width) return { x: width, anchor: "end" as const };
  return { x, anchor: "middle" as const };
}

/** Thickness caps: marks stay thin and the space between them does the separating. */
export const MAX_BAR = 24;
export const MIN_GAP = 2;

/** Column width for a slot: about two thirds of it, capped, always leaving a gap. */
export function columnWidth(band: number) {
  return Math.max(1, Math.min(MAX_BAR, band * 0.62, band - MIN_GAP));
}
