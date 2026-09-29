/**
 * Where the pipette works, as gantry offsets from the rest pose. Everything
 * comes from the parts registry and the models' own layouts, so moving a
 * part in the registry moves the spot the demo reaches for.
 */
import { partById } from "@/data/hardware-parts";
import { PIPETTE_TIP, RESERVOIR_DEPTH, TIP_TOP, TROUGHS, WELL_LEVELS, tipSocket, wellCentre } from "../models/deck/labware-layout";
import { TOOL } from "../models/machine/layout";

/** Gantry offsets that put the pipette's axis over a point on the deck. */
export interface Spot {
  x: number;
  y: number;
}

/** The pipette's axis at rest, from the registry. */
export const PIPETTE_AXIS = { x: TOOL.x, y: partById.pipette.position[1], z: TOOL.z } as const;

function over(worldX: number, worldZ: number): Spot {
  return { x: worldX - PIPETTE_AXIS.x, y: worldZ - PIPETTE_AXIS.z };
}

/** The beam offset that puts a carried tip's point at `height`. */
export function tipAt(height: number) {
  return height - (PIPETTE_AXIS.y + PIPETTE_TIP.end);
}

export const HOME: Spot = { x: 0, y: 0 };

const rack = partById.tip_rack.position;

/**
 * The sockets the pipette can reach, in the order it uses them. The gantry's
 * left foot plate stops just short of the rack, so only its back two rows
 * are in reach, and the carriage runs out of beam past the third column.
 */
export const TIP_ORDER = [1, 5, 2, 6, 3, 7];

export function socketSpot(index: number): Spot {
  const [dx, dz] = tipSocket(index);
  return over(rack[0] + dx, rack[2] + dz);
}

/** Beam offset where the bare nose meets the top edge of a waiting tip. */
export const TIP_SEAT = rack[1] + TIP_TOP - (PIPETTE_AXIS.y + PIPETTE_TIP.top);

const plate = partById.well_plate.position;

/** Heights of a well in world space. */
export const WELL = {
  floor: plate[1] + WELL_LEVELS.floor,
  depth: WELL_LEVELS.depth,
  top: plate[1] + WELL_LEVELS.top,
} as const;

/** The camera dock on the right upright stops the tool short of the sixth column. */
export const REACHABLE_WELLS = Array.from({ length: 24 }, (_, index) => index).filter((index) => index % 6 < 5);

export function wellSpot(index: number): Spot {
  const [dx, dz] = wellCentre(index);
  return over(plate[0] + dx, plate[2] + dz);
}

const platform = partById.heated_platform.position;
const troughFloor = platform[1] + TROUGHS.top + TROUGHS.wall;
const troughRim = platform[1] + TROUGHS.top + TROUGHS.height;

export const RESERVOIR = {
  spot: over(platform[0] + TROUGHS.x, platform[2] + TROUGHS.reservoir.z),
  floor: troughFloor,
  rim: troughRim,
  depth: RESERVOIR_DEPTH,
  /** Millilitres when topped up, which is what its inside holds at this depth. */
  capacity: 3,
} as const;

export const CHUTE = {
  spot: over(platform[0] + TROUGHS.x, platform[2] + TROUGHS.chute.z),
  floor: troughFloor,
  rim: troughRim,
} as const;
