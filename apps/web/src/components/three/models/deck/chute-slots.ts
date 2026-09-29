/**
 * Where used tips come to rest in the chute, in the heated platform's own
 * space. The chute is a little shorter than a tip, so each one lies at a
 * slant with its point on the floor and its top against the far end,
 * alternating ends and nudged sideways so a handful pile up untidily.
 */
import { TIP_SHAPE, TROUGHS } from "./labware-layout";

export interface ChuteSlot {
  /** The tip's point, on the chute floor. */
  point: [number, number, number];
  /** Tilt from upright, about X; positive leans the top toward the door. */
  tilt: number;
  /** A small turn about the vertical, so the pile isn't perfectly aligned. */
  yaw: number;
}

const FLOOR = TROUGHS.top + TROUGHS.wall + TIP_SHAPE.point;
const SIDEWAYS = [-0.035, 0.035, 0, -0.05, 0.05, 0.012];

export const CHUTE_SLOTS: ChuteSlot[] = SIDEWAYS.map((dx, i) => {
  const lean = i % 2 ? -1 : 1;
  const tilt = lean * (0.98 + i * 0.02);
  const reach = TIP_SHAPE.length * Math.sin(Math.abs(tilt));
  return { point: [TROUGHS.x + dx, FLOOR, TROUGHS.chute.z - (lean * reach) / 2], tilt, yaw: (i - 2.5) * 0.05 };
});
