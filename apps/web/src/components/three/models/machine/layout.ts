/**
 * The machine's fixed dimensions in one place, so the frame, the gantry and
 * the parts registry (src/data/hardware-parts-*.ts) agree on where things
 * are. Scene units: 1 unit is about 81 mm, Y up, floor at y = 0, +Z out of
 * the front door.
 */

/**
 * Enclosure post centres and heights. The chamber floor is the top of the
 * white base; the frame's top rail sits just under `top`.
 */
export const ENCLOSURE = { halfX: 2.2, halfZ: 1.8, floor: 0.44, top: 4.4 } as const;

/**
 * The printer gantry, drawn at rest. Two uprights ride Y rails on the
 * chamber floor, a crossbar ties their tops, and the X beam rides up and
 * down between them on two lead screws.
 */
export const GANTRY = { halfX: 1.85, z: -0.55, top: 4.03, beamY: 3.05, beamZ: -0.29 } as const;

/**
 * Where the gantry's moving pieces sit. Each upright stands on a foot plate
 * that slides on its Y rod; the Z lead screws run just inboard of the
 * uprights; the X belt runs above the beam.
 */
export const MOTION = {
  /** Top of the foot plates the uprights stand on. */
  footTop: 0.74,
  /** Z lead screw distance from the centre line. */
  screwX: 1.5,
  /** Height of the X belt's pulley axis. */
  beltY: 3.42,
  /** Half length of the X beam, from the inside of one Z carriage to the other. */
  beamHalf: 1.725,
} as const;

/**
 * The dispense head on the X carriage: `x` and `z` are the nose's axis,
 * where a tip goes on. These match HEAD_X and HEAD_Z in
 * hardware-parts-fluidics.ts.
 */
export const TOOL = { x: -0.35, z: 0.05 } as const;

/**
 * The white plate outside the enclosure on the left, where the fluidics
 * live: the two pumps at the front, the two selector valves behind them,
 * the Pico and its driver board in the middle, and the cleaner and waste
 * bottles at the back. Its front edge lines up with the door, so the usual
 * front right view sees it beside the enclosure rather than behind it.
 * Centre and size in scene units; `top` is the height of its top face,
 * where those parts stand. Every fluidics position follows from it.
 */
export const FLUIDICS = { x: -3.25, z: 0.6, width: 1.5, depth: 2.7, top: 0.06 } as const;

/**
 * A 20 mm extrusion drawn 0.16 units wide (13 mm at scale). The enclosure
 * is a shrunk Ender-3, and true scale bars made it look heavy.
 */
export const PROFILE = 0.16;

/** Height of the 2020 rail across the back of the frame. The SHT85 and the CO₂ board mount on it. */
export const SENSOR_RAIL_Y = 3.45;

/** Top of the aluminium floor plate that lines the chamber. */
export const CHAMBER_FLOOR = ENCLOSURE.floor + 0.02;

/** Height of the Y rail centre line above the chamber floor. */
export const Y_RAIL_Y = CHAMBER_FLOOR + 0.1;

/**
 * How far the door and the panels move out in the exploded view, along
 * their own normals, so the chamber opens up around the parts. The side
 * panels go furthest, past the boards and fluidics lifting off the
 * platforms beside them. The roof panel and the CO₂ valve plate on the top
 * rails lift by `roof`.
 */
export const WALL_EXPLODE = { roof: 1, door: 1, right: 1.6, left: 1.9, back: 1 } as const;
