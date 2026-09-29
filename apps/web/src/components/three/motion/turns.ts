/**
 * How far each rotating part has turned for a pose. Belts and screws are
 * geared to the axis they drive, so every angle follows from the travel.
 */
import type { MachinePose } from "./pose";
import { PLUNGER_STROKE } from "./Rig";

/** GT2 pulley pitch radius, the same as the belts in motion-parts.tsx. */
const PULLEY_RADIUS = 0.056;
/** A T8 lead screw advances 8 mm a turn. */
const Z_LEAD = 8 / 81;
/** The pipette drive's finer screw advances 2 mm a turn. */
const PLUNGER_LEAD = 2 / 81;
const TURN = Math.PI * 2;

export const fanAngle = (pose: MachinePose) => pose.fan;
export const xPulleyAngle = (pose: MachinePose) => pose.x / PULLEY_RADIUS;
export const yPulleyAngle = (pose: MachinePose) => pose.y / PULLEY_RADIUS;
export const zScrewAngle = (pose: MachinePose) => (pose.z / Z_LEAD) * TURN;
export const plungerScrewAngle = (pose: MachinePose) => ((pose.plunger * PLUNGER_STROKE) / PLUNGER_LEAD) * TURN;
