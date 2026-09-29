"use client";
import { Block, Ring } from "../../primitives";
import { ExtrusionBars, type Bar } from "./ExtrusionBars";
import { GasLines } from "./GasLines";
import { ENCLOSURE, GANTRY, PROFILE, SENSOR_RAIL_Y } from "./layout";
import { WaterTray } from "./WaterTray";

const { halfX: X, halfZ: Z, top: TOP } = ENCLOSURE;
/** A 2020 rail across the back wall at sensor height; the SHT85 and CO₂ board mount on it. */
const SENSOR_RAIL: Bar[] = [{ position: [0, SENSOR_RAIL_Y, -Z], length: X * 2 - PROFILE, axis: "x" }];
const RAIL_FRONT = -Z + PROFILE / 2;
/** The CO₂ board is taller than the rail, so it sits on a printed adapter plate. */
const CO2_PLATE = { x: -1.0, y: 3.4, width: 0.74, height: 0.7, thickness: 0.016 } as const;
/** The pH probe hangs in a clip off the back left post, level with its registry position. */
const PROBE = { x: -1.96, y: 1.95, z: -1.55, radius: 0.092 } as const;
/** The camera dock hangs off the right upright's front face, under the camera board. */
const DOCK = { x: 1.35, y: 2.26, z: -0.05, rail: 0.27, back: GANTRY.z + PROFILE, board: 0.6 } as const;

/** Printed probe clip: an arm off the post's front face and a ring round the body, twice. */
function ProbeClip() {
  const armZ = (RAIL_FRONT + PROBE.z) / 2;
  return (
    <>
      {[0.24, -0.12].map((dy) => (
        <group key={dy} position={[0, PROBE.y + dy, 0]}>
          <Block position={[-X + 0.04, 0, armZ]} size={[0.06, 0.05, PROBE.z - RAIL_FRONT + 0.02]} radius={0.012} material="plaGrey" />
          <Block position={[(-X + 0.04 + PROBE.x - PROBE.radius) / 2, 0, PROBE.z]} size={[PROBE.x - PROBE.radius - (-X + 0.04) + 0.03, 0.05, 0.06]} radius={0.012} material="plaGrey" />
          <Ring position={[PROBE.x, 0, PROBE.z]} radius={PROBE.radius} material="plaGrey" />
        </group>
      ))}
    </>
  );
}

/** Two rails under the camera board's edges and a crossbar back to the upright. */
function CameraDock() {
  const { x, y, z, rail, back, board } = DOCK;
  const front = z + board / 2;
  const railLength = front - back;
  return (
    <group>
      {[-rail, rail].map((dx) => (
        <Block key={dx} position={[x + dx, y, (front + back) / 2]} size={[0.05, 0.04, railLength]} radius={0.012} material="aluminium" />
      ))}
      <Block position={[(x - rail + GANTRY.halfX) / 2, y, back + 0.03]} size={[GANTRY.halfX - x + rail + 0.05, 0.05, 0.06]} radius={0.015} material="aluminium" />
    </group>
  );
}

/**
 * Brackets inside and on the chamber that hold parts in place: the sensor
 * rail and the CO₂ adapter plate on the back wall, the pH probe clip, the
 * camera dock on the right upright, the CO₂ valve's plate on the roof
 * with its gas lines, and the humidity tray on the floor. The printed ones
 * are light grey PLA, the rest bare aluminium or stainless.
 */
export function ChamberFixtures() {
  return (
    <group>
      <ExtrusionBars bars={SENSOR_RAIL} />
      <Block position={[CO2_PLATE.x, CO2_PLATE.y, RAIL_FRONT + CO2_PLATE.thickness / 2]} size={[CO2_PLATE.width, CO2_PLATE.height, CO2_PLATE.thickness]} material="plaGrey" />
      <ProbeClip />
      <CameraDock />
      {/* The valve plate spans the roof's front left corner, resting on both top rails. */}
      <Block position={[-X + 0.24, TOP + 0.005, Z - 0.26]} size={[0.64, 0.01, 0.6]} material="aluminium" />
      <GasLines />
      <WaterTray />
    </group>
  );
}
