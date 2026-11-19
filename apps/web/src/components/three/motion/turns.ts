/**
 * How far each rotating part has turned for a pose. Belts and screws are
 * geared to the axis they drive, so every angle follows from the travel.
 */
import type { MachinePose } from "./pose";

/** GT2 pulley pitch radius, the same as the belts in motion-parts.tsx. */
const PULLEY_RADIUS = 0.056;
/** A T8 lead screw advances 8 mm a turn. */
const Z_LEAD = 8 / 81;
const TURN = Math.PI * 2;

export const fanAngle = (pose: MachinePose) => pose.fan;
export const xPulleyAngle = (pose: MachinePose) => pose.x / PULLEY_RADIUS;
export const yPulleyAngle = (pose: MachinePose) => pose.y / PULLEY_RADIUS;
export const zScrewAngle = (pose: MachinePose) => (pose.z / Z_LEAD) * TURN;
/** The peristaltic pumps' rotors, which sit straight on their motor shafts. */
export const additionPumpAngle = (pose: MachinePose) => pose.additionPump;
export const aspirationPumpAngle = (pose: MachinePose) => pose.aspirationPump;
