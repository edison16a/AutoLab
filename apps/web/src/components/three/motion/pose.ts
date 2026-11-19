/**
 * The machine's moving state at one instant, as the Home demo drives it.
 * Every value is an offset or a fill from the rest pose the parts registry
 * draws, so a pose of all zeros is the still machine on the Hardware screen.
 *
 * Axes follow the printer, not the scene: `x` slides the carriage along the
 * beam (scene X), `y` rolls the whole gantry toward the door (scene +Z) and
 * `z` lifts the beam (scene Y, negative is down). All in scene units.
 */
import { BOTTLE_REST } from "../models/deck/labware-layout";

export interface MachinePose {
  x: number;
  y: number;
  z: number;
  /** A tip is on the head's nose. */
  tip: boolean;
  /** Share of the tip holding spent media while the aspiration line draws through it. */
  fill: number;
  /** One bit per tip rack socket that still holds a tip. */
  rack: number;
  /** Media in each of the 24 wells, 1 being the usual level. */
  wells: Float32Array;
  /** Fresh media left in the media bottle and spent media in the waste bottle, as shares of what each holds. */
  media: number;
  waste: number;
  /** Used tips lying in the disposal bin. */
  chuteTips: number;
  /** A tip on its way down into the bin: 0 to 1 while it falls, -1 otherwise. */
  drop: number;
  /** Where the falling tip let go: its axis in scene X and Z, and its top edge's height. */
  dropAt: [number, number, number];
  /** Rotor angles of the two peristaltic pumps, in radians. */
  additionPump: number;
  aspirationPump: number;
  /** Which port each selector valve has open: an index into its ports, or -1 when every pinch valve is shut. */
  additionValve: number;
  aspirationValve: number;
  /** Media leaving the addition needle: 0 none, 1 a full stream. */
  stream: number;
  /** Fan blade angle in radians. */
  fan: number;
  /** Camera status LED, 0 dark to 1 fully lit for a capture. */
  flash: number;
}

export const WELL_COUNT = 24;

/** The addition valve's ports, in the order its pinch valves sit, and the aspiration valve's. */
export const ADDITION_PORTS = ["media", "cleaner", "waste"] as const;
export const ASPIRATION_PORTS = ["waste", "cleaner"] as const;

/** A still machine: at rest, nothing on the nose, every well at its usual level, every valve shut. */
export function createPose(): MachinePose {
  return {
    x: 0,
    y: 0,
    z: 0,
    tip: false,
    fill: 0,
    rack: 0,
    wells: new Float32Array(WELL_COUNT).fill(1),
    media: BOTTLE_REST.media,
    waste: BOTTLE_REST.waste,
    chuteTips: 0,
    drop: -1,
    dropAt: [0, 0, 0],
    additionPump: 0,
    aspirationPump: 0,
    additionValve: -1,
    aspirationValve: -1,
    stream: 0,
    fan: 0,
    flash: 0,
  };
}
