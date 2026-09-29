/**
 * Where each detection's label chip goes. In a busy scene the boxes overlap,
 * and chips drawn at each box's corner land on top of one another until none
 * can be read. This places them one at a time and moves a chip to the next
 * free spot when its first choice is taken.
 */

export interface Chip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** x1, y1, x2, y2 in image pixels, the same as a detection's bbox. */
type Box = readonly number[];

function overlaps(a: Chip, b: Chip) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * The spots worth trying, best first: above the box, inside its top edge, then
 * below it. The rest walk down the inside of the box, so a chip that can't
 * find room still stays next to the thing it names.
 */
function candidates(box: Box, height: number): number[] {
  const [, y1, , y2] = box;
  const spots = [y1 - height, y1, y2];
  for (let y = y1 + height; y + height <= y2; y += height) spots.push(y);
  return spots;
}

/**
 * One chip per box, in the order given. Callers pass the most confident
 * detections first, so those get the best spots. A chip that finds no free
 * spot keeps its first choice rather than wandering away from its box.
 */
export function placeChips(boxes: readonly Box[], widths: readonly number[], height: number, imageWidth: number, imageHeight: number) {
  const placed: Chip[] = [];
  boxes.forEach((box, i) => {
    const width = widths[i];
    // Clamp so a box at the right or bottom edge keeps its whole label on the image.
    const x = Math.max(0, Math.min(box[0], imageWidth - width));
    const fit = (y: number): Chip => ({ x, y: Math.max(0, Math.min(y, imageHeight - height)), width, height });
    const options = candidates(box, height).map(fit);
    placed.push(options.find((chip) => !placed.some((other) => overlaps(chip, other))) ?? options[0]);
  });
  return placed;
}
