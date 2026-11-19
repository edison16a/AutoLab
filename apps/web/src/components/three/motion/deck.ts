/**
 * Where the dispense head works, as gantry offsets from the rest pose.
 * Everything comes from the parts registry and the models' own layouts, so
 * moving a part in the registry moves the spot the demo reaches for.
 */
import { partById } from "@/data/hardware-parts";
import { NEEDLE, NOSE_TIP, STRIPPER, TIP_TOP, TROUGHS, WELL_LEVELS, tipSocket, wellCentre } from "../models/deck/labware-layout";
import { TOOL } from "../models/machine/layout";

/** Gantry offsets that put the head's axis over a point on the deck. */
export interface Spot {
  x: number;
  y: number;
}

/** The head's axis at rest, the nose's centre line, from the registry. */
export const HEAD_AXIS = { x: TOOL.x, y: partById.dispense_head.position[1], z: TOOL.z } as const;

function over(worldX: number, worldZ: number): Spot {
  return { x: worldX - HEAD_AXIS.x, y: worldZ - HEAD_AXIS.z };
}

/** The beam offset that puts a carried tip's point at `height`. */
export function tipAt(height: number) {
  return height - (HEAD_AXIS.y + NOSE_TIP.end);
}

/** The beam offset that puts the addition needle's end at `height`. */
export function needleAt(height: number) {
  return height - (HEAD_AXIS.y + NEEDLE.end);
}

export const HOME: Spot = { x: 0, y: 0 };

const rack = partById.tip_rack.position;

/**
 * The sockets the head can reach, in the order it uses them. The gantry's
 * left foot plate stops just short of the rack, so only its back two rows
 * are in reach, and the carriage runs out of beam past the third column.
 */
export const TIP_ORDER = [1, 5, 2, 6, 3, 7];

export function socketSpot(index: number): Spot {
  const [dx, dz] = tipSocket(index);
  return over(rack[0] + dx, rack[2] + dz);
}

/** Beam offset where the bare nose meets the top edge of a waiting tip. */
export const TIP_SEAT = rack[1] + TIP_TOP - (HEAD_AXIS.y + NOSE_TIP.top);

const plate = partById.well_plate.position;

/** Heights of a well in world space. */
export const WELL = {
  floor: plate[1] + WELL_LEVELS.floor,
  depth: WELL_LEVELS.depth,
  top: plate[1] + WELL_LEVELS.top,
} as const;

/** The camera dock on the right upright stops the tool short of the sixth column. */
export const REACHABLE_WELLS = Array.from({ length: 24 }, (_, index) => index).filter((index) => index % 6 < 5);

/** The nose over a well, for aspirating through a tip. */
export function wellSpot(index: number): Spot {
  const [dx, dz] = wellCentre(index);
  return over(plate[0] + dx, plate[2] + dz);
}

/** The addition needle over a well: the head sits to its left by the needle's offset. */
export function needleSpot(index: number): Spot {
  const [dx, dz] = wellCentre(index);
  return over(plate[0] + dx - NEEDLE.dx, plate[2] + dz);
}

const platform = partById.heated_platform.position;
const troughRim = platform[1] + TROUGHS.top + TROUGHS.height;

/** The wash station: an empty trough where the head parks while a line runs its suction. */
export const WASH = {
  spot: over(platform[0] + TROUGHS.x, platform[2] + TROUGHS.wash.z),
  rim: troughRim,
} as const;

const binZ = platform[2] + TROUGHS.chute.z - STRIPPER.back;

/**
 * The tip stripper over the disposal bin: where the head lines up in front
 * of the slot, where the nose sits at the slot's end, and the beam offset
 * that puts a carried tip's rim just under the plate.
 */
export const BIN = {
  approach: over(platform[0] + TROUGHS.x, binZ + STRIPPER.approach),
  slot: over(platform[0] + TROUGHS.x, binZ),
  under: tipAt(platform[1] + STRIPPER.under - 0.015 - (NOSE_TIP.top - NOSE_TIP.end)),
} as const;
