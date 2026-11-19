/**
 * Shapes for the parts registry. Coordinates are machine space in scene
 * units: 1 unit is about 81 mm, Y is up, the floor is y = 0, +X is to the
 * right of the enclosure and +Z comes out of the front door toward you.
 */
import type { RigName } from "@/components/three/motion/Rig";
import type { Vec3 } from "@/components/three/types";

export type { Vec3 };

export type PartCategory = "Computer" | "Imaging" | "Environment" | "Control" | "Fluidics" | "Motion" | "Labware";

/** Which 3D model draws the part. Several parts can share one (the three endstops). */
export type PartModelKey =
  | "raspberry_pi"
  | "camera"
  | "fpc"
  | "sht85"
  | "co2_sensor"
  | "ph_sensor"
  | "ph_probe"
  | "pico"
  | "printer_controller"
  | "endstop"
  | "heated_platform"
  | "well_plate"
  | "fan"
  | "co2_valve"
  | "hepa_filter"
  | "dispense_head"
  | "addition_pump"
  | "aspiration_pump"
  | "addition_valve"
  | "aspiration_valve"
  | "media_bottle"
  | "cleaner_bottle"
  | "waste_container"
  | "disposal_bin"
  | "tip_rack";

/** A pick volume, in machine axes relative to the part's position. */
export interface PartHitBox {
  center: Vec3;
  size: Vec3;
  /** For a part that is only partly carried, like a cable: what this pick volume moves with. */
  rig?: RigName;
}

export interface PartDefinition {
  /** Stable id. The Pi agent reports components by this id. */
  id: string;
  name: string;
  shortName: string;
  category: PartCategory;
  /** What the part is for, from the owner's parts list. The details panel stays terse and doesn't show it. */
  purpose: string;
  /** How it's wired. Empty for labware and purely mechanical parts. */
  connection: string;
  model: PartModelKey;
  /** Reports live state today. Only the Pi and camera do. */
  liveNow: boolean;
  /** Where the model's origin sits on the machine. */
  position: Vec3;
  /** Orientation of the model on the machine. */
  rotation?: Vec3;
  /** Bounding size in machine axes. Drives focus distance and the default hit box. */
  size: Vec3;
  /** Centre of that bounding box relative to `position`. Defaults to the origin. */
  center?: Vec3;
  /** Several smaller pick volumes for long thin parts like the camera ribbon. */
  hits?: PartHitBox[];
  /** What carries the part when the machine moves (the gantry, the beam or the carriage). Fixed parts leave it out. */
  rig?: RigName;
  /** How far the part moves out in the exploded view. */
  exploded: Vec3;
  /** Direction the camera looks from when the part is focused. */
  view?: Vec3;
  /** Orientation in the isolated inspect view, when the mounted one hides its best side. */
  inspectRotation?: Vec3;
}

/** A wire, bus or cable between two parts. */
export interface PartConnection {
  from: string;
  to: string;
  label: string;
  /** True only for links that carry data today. */
  live: boolean;
}
