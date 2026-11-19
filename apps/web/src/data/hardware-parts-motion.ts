/**
 * The printer's motion endstops. The gantry and the dispense head it
 * carries are drawn by the frame and hardware-parts-fluidics.ts.
 */
import type { PartDefinition } from "./hardware-parts-types";

export const MOTION_PARTS: PartDefinition[] = [
  {
    id: "x_endstop",
    name: "X-axis endstop",
    shortName: "X endstop",
    category: "Motion",
    purpose: "X-axis homing reference. Integration has not been verified.",
    connection: "Printer controller",
    model: "endstop",
    liveNow: false,
    position: [-1.5, 3.225, -0.26],
    size: [0.42, 0.24, 0.22],
    center: [0, 0.1, 0],
    rig: "beam",
    exploded: [0, 0.35, 0],
    view: [0.4, 0.5, 1],
  },
  {
    id: "y_endstop",
    name: "Y-axis endstop",
    shortName: "Y endstop",
    category: "Motion",
    purpose: "Y-axis homing reference. Integration has not been verified.",
    connection: "Printer controller",
    model: "endstop",
    liveNow: false,
    position: [-1.55, 0.47, -1.4],
    // Lever toward the front, where the left foot plate comes back to meet it.
    rotation: [0, -Math.PI / 2, 0],
    size: [0.22, 0.24, 0.42],
    center: [0, 0.1, 0],
    exploded: [0, 0.35, 0],
    // From inside the chamber along the back wall: from the front the gantry's left foot plate covers it.
    view: [1, 0.45, 0.2],
  },
  {
    id: "z_endstop",
    name: "Z-axis endstop",
    shortName: "Z endstop",
    category: "Motion",
    purpose: "Z-axis homing reference. Integration has not been verified.",
    connection: "Printer controller",
    model: "endstop",
    liveNow: false,
    position: [-1.76, 1.5, -0.55],
    // Standing on the left upright's inner face, below the Z carriage, board facing the chamber.
    rotation: [-Math.PI / 2, 0, -Math.PI / 2],
    size: [0.24, 0.2, 0.42],
    center: [0.1, 0, 0],
    rig: "gantry",
    // Off the upright, into the chamber.
    exploded: [0.4, 0, 0],
    // From the front right, clear of the Z lead screw and the Z carriage beside it.
    view: [0.6, 0.3, 1],
    inspectRotation: [0, 0, 0],
  },
];
