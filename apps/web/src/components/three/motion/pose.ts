/**
 * The machine's moving state at one instant, as the Home demo drives it.
 * Every value is an offset or a fill from the rest pose the parts registry
 * draws, so a pose of all zeros is the still machine on the Hardware screen.
 *
 * Axes follow the printer, not the scene: `x` slides the carriage along the
 * beam (scene X), `y` rolls the whole gantry toward the door (scene +Z) and
 * `z` lifts the beam (scene Y, negative is down). All in scene units.
 */
export interface MachinePose {
  x: number;
  y: number;
  z: number;
  /** Plunger travel: 0 released, 0.8 the first stop, 1 blowout, a little past that ejects the tip. */
  plunger: number;
  /** A tip is on the pipette's nose. */
  tip: boolean;
  /** Share of the tip holding liquid, and whether that liquid is spent media rather than fresh. */
  fill: number;
  spent: boolean;
  /** One bit per tip rack socket that still holds a tip. */
  rack: number;
  /** Media in each of the 24 wells, 1 being the usual level. */
  wells: Float32Array;
  /** Fresh media left in the reservoir, 1 when topped up. */
  reservoir: number;
  /** Used tips lying in the chute. */
  chuteTips: number;
  /** A tip on its way down into the chute: 0 to 1 while it falls, -1 otherwise. */
  drop: number;
  /** Where the falling tip let go: its axis in scene X and Z, and its top edge's height. */
  dropAt: [number, number, number];
  /** Fan blade angle in radians. */
  fan: number;
  /** Camera status LED, 0 dark to 1 fully lit for a capture. */
  flash: number;
}

export const WELL_COUNT = 24;

/** A still machine: at rest, nothing on the nose, every well at its usual level. */
export function createPose(): MachinePose {
  return {
    x: 0,
    y: 0,
    z: 0,
    plunger: 0,
    tip: false,
    fill: 0,
    spent: false,
    rack: 0,
    wells: new Float32Array(WELL_COUNT).fill(1),
    reservoir: 1,
    chuteTips: 0,
    drop: -1,
    dropAt: [0, 0, 0],
    fan: 0,
    flash: 0,
  };
}
