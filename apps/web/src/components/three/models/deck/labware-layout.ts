/**
 * Measurements of the labware the dispense head works with, shared by the
 * models that draw it and the Home demo that moves the head to it. Plain
 * numbers only, so the demo's timeline can use them without React.
 */
import { mm } from "../details/units";

/** 4 x 6 sockets on a 0.12 unit pitch, a compact rack sized to the space beside the platform. */
export const TIP_RACK = {
  pitch: 0.12,
  cols: 4,
  rows: 6,
  /** Tall enough that a tip on the head's nose, carried at full height, lifts clear of the collars. */
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

/** Height of a waiting tip's top edge above the rack's base, where the head's nose seats in it. */
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

/**
 * A tip on the head's nose, on the head's axis and relative to its origin:
 * its point, and the top edge that sits on the nose.
 */
export const NOSE_TIP = { end: -0.42, top: -0.09 } as const;

/**
 * A 1000 µL tip measured from its point: a see through cone that widens to
 * its open top. The aspiration line draws media up through it, so it has no
 * filter plug, which would stop the liquid.
 */
export const TIP_SHAPE = { length: 0.34, point: 0.006, taper: 6.4 } as const;

/**
 * The addition line's blunt stainless needle, beside the nose: how far it
 * sits to the right of the head's axis, and the height of its end relative
 * to the head's origin. Its end stays a little above a carried tip's top
 * edge, and it sits halfway between two rack columns, so it never touches
 * the tips beside the one being picked up.
 */
export const NEEDLE = { dx: 0.18, end: -0.06, radius: 0.011 } as const;

/**
 * The two troughs on the heated plate's left margin, beside the plate nest
 * and inside the head's reach: the wash station, where the head purges and
 * runs its suction, and the tip disposal bin in front of it. Positions are
 * in the heated platform's own space, whose origin sits 0.15 above the
 * chamber floor; `top` is the plate's top face they stand on.
 */
export const TROUGHS = {
  x: -0.99,
  top: 0.1665,
  width: 0.18,
  height: 0.12,
  wall: 0.01,
  wash: { z: -0.25, length: 0.44 },
  chute: { z: 0.2, length: 0.34 },
} as const;

/**
 * The tip stripper over the disposal bin, in the same space: a stainless
 * plate on two posts at the bin's back, with a slot open toward the door.
 * The head brings a used tip in under the plate, slides the nose into the
 * slot and lifts, and the plate holds the tip back so it drops into the bin.
 * Its top stays just under a tip carried at full height.
 */
export const STRIPPER = {
  /** Underside of the plate, above the platform's origin. */
  under: 0.53,
  thickness: 0.012,
  /** Half the slot's width: wider than the nose, narrower than a tip's rim. */
  slot: 0.034,
  /** Where the slot ends, the nose's axis while it strips, as an offset from the bin's centre toward the back. */
  back: 0.02,
  /** How far in front of that the head lines up before sliding in. */
  approach: 0.2,
} as const;

/** How full each bottle is on the still machine, as a share of its body. The Home demo starts each fresh rack from the same levels. */
export const BOTTLE_REST = { media: 0.72, cleaner: 0.62, waste: 0.38 } as const;
