"use client";
import { Block } from "../../primitives";
import { Grommet } from "./Grommet";
import { ENCLOSURE, FOAM, PROFILE, SENSOR_RAIL_Y } from "./layout";
import { Roof } from "./Roof";

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
/** Each board reaches a little into the bars around it, so no light leaks at the chamfers. */
const TUCK = 0.02;
const LOW = FLOOR + PROFILE - TUCK;
const HIGH = TOP - PROFILE + TUCK;
const SPAN_X = X * 2 - PROFILE + TUCK * 2;
const SPAN_Z = Z * 2 - PROFILE + TUCK * 2;
/** The back board is cut in two around the sensor rail. */
const RAIL_LOW = SENSOR_RAIL_Y - PROFILE / 2 + TUCK;
const RAIL_HIGH = SENSOR_RAIL_Y + PROFILE / 2 - TUCK;

/** Where the pH probe cable leaves through the left wall, behind the probe. */
const PROBE_PORT = { y: 2.65, z: -1.55 } as const;

/**
 * The insulated walls: pink XPS foam board in the back, left and roof
 * openings of the frame, as the design calls for rigid insulation. The
 * right side and the door stay clear acrylic, so the chamber can be seen
 * into from the front and from the right.
 */
export function FoamWalls() {
  return (
    <group>
      <Block position={[0, (LOW + RAIL_LOW) / 2, -Z]} size={[SPAN_X, RAIL_LOW - LOW, FOAM]} material="foamPink" />
      <Block position={[0, (RAIL_HIGH + HIGH) / 2, -Z]} size={[SPAN_X, HIGH - RAIL_HIGH, FOAM]} material="foamPink" />
      <Block position={[-X, (LOW + HIGH) / 2, 0]} size={[FOAM, HIGH - LOW, SPAN_Z]} material="foamPink" />
      <Grommet position={[-X, PROBE_PORT.y, PROBE_PORT.z]} axis="x" wall={FOAM} radius={0.03} />
      <Roof />
    </group>
  );
}
