/**
 * Measurements of the labware the pipette works with, shared by the models
 * that draw it and the Home demo that moves the pipette to it. Plain
 * numbers only, so the demo's timeline can use them without React.
 */
import { mm } from "../details/units";

/** 4 x 6 sockets on a 0.12 unit pitch, a compact rack sized to the space beside the platform. */
export const TIP_RACK = {
  pitch: 0.12,
  cols: 4,
  rows: 6,
  /** Tall enough that a tip on the pipette, carried at full height, lifts clear of the collars. */
  box: { width: 0.56, depth: 0.78, height: 0.6, wall: 0.02 },
  deckY: 0.615,
} as const;

/** Socket `index` counted from the back left, row by row: its centre across the rack, in rack space. */
export function tipSocket(index: number): [number, number] {
  const { pitch, cols, rows } = TIP_RACK;
  return [((index % cols) - (cols - 1) / 2) * pitch, (Math.floor(index / cols) - (rows - 1) / 2) * pitch];
}

/** The first column, at the back left, is already used, so its two back sockets stand empty. */
export const USED_TIPS = [0, 4];

/** A bit for every socket but the used first column: the rack as it arrives. */
export const FULL_RACK = Array.from({ length: TIP_RACK.cols * TIP_RACK.rows }, (_, i) => i)
  .filter((i) => !USED_TIPS.includes(i))
  .reduce((mask, i) => mask | (1 << i), 0);

/** Height of a waiting tip's top edge above the rack's base, where the pipette's nose seats in it. */
export const TIP_TOP = TIP_RACK.deckY + 0.055;

/** ANSI/SLAS footprint: 127.76 x 85.48 mm, 20 mm tall, with 24 wells 15.6 mm across on a 19.3 mm pitch. */
export const WELL_PLATE = {
  width: mm(127.76),
  depth: mm(85.48),
  height: mm(20),
  pitch: mm(19.3),
  wellRadius: mm(7.8),
  skirt: mm(4),
  columns: 6,
  rows: 4,
  /** About 1 mL of media in every well, which fills a 15.6 mm well to 5 mm. */
  mediaDepth: mm(5),
} as const;

/** Well `index`, counted A1 to A6 then on down the rows: its centre on the plate. */
export function wellCentre(index: number): [number, number] {
  const { pitch, columns } = WELL_PLATE;
  return [((index % columns) - 2.5) * pitch, (Math.floor(index / columns) - 1.5) * pitch];
}

/** Heights on the plate's own axis: a well's floor, its usual media depth and the plate's top face. */
export const WELL_LEVELS = {
  floor: -WELL_PLATE.height / 2 + WELL_PLATE.skirt,
  depth: WELL_PLATE.mediaDepth,
  top: WELL_PLATE.height / 2,
} as const;

/** The P1000 tip on the pipette's axis: its point, and the top edge that sits on the nose. */
export const PIPETTE_TIP = { end: -0.42, top: -0.09 } as const;

/**
 * A P1000 tip measured from its point: a see through cone that widens to its
 * open top, with a white filter plug near the top.
 */
export const TIP_SHAPE = { length: 0.34, point: 0.006, taper: 6.4, filter: { at: 0.3, radius: 0.03, height: 0.03 } } as const;

/**
 * The two troughs on the heated plate's left margin, beside the plate nest
 * and inside the pipette's reach. Positions are in the heated platform's
 * own space, whose origin sits 0.15 above the chamber floor; `top` is the
 * plate's top face they stand on.
 */
export const TROUGHS = {
  x: -0.99,
  top: 0.1665,
  width: 0.18,
  height: 0.12,
  wall: 0.01,
  reservoir: { z: -0.25, length: 0.44 },
  chute: { z: 0.2, length: 0.34 },
} as const;

/** Fresh media fills the reservoir this deep when it is topped up. */
export const RESERVOIR_DEPTH = 0.085;
