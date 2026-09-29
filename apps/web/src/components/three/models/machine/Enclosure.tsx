"use client";
import { Block, Cylinder, TextDecal } from "../../primitives";
import { Extrusion } from "./Extrusion";

/** Post centres and heights, in scene units. The chamber floor is the top of the base. */
export const ENCLOSURE = { halfX: 2.2, halfZ: 1.8, floor: 0.44, top: 4.4 } as const;

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
const HEIGHT = TOP - FLOOR;
const MID = (TOP + FLOOR) / 2;
const SPAN_X = X * 2 - 0.16;
const SPAN_Z = Z * 2 - 0.16;
const CORNERS: [number, number][] = [
  [-X, -Z],
  [X, -Z],
  [-X, Z],
  [X, Z],
];

/** The gasketed front door: a clear panel in a slim frame, hinged on the left, with a bar handle. */
function Door() {
  const z = Z + 0.1;
  return (
    <group>
      <Block position={[0, MID, z]} size={[SPAN_X, HEIGHT - 0.12, 0.02]} material="acrylic" />
      {/* Frame and the rubber gasket just inside it. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (SPAN_X / 2 - 0.03), MID, z]} size={[0.06, HEIGHT - 0.06, 0.04]} material="graphite" />
          <Block position={[0, MID + side * (HEIGHT / 2 - 0.06), z]} size={[SPAN_X, 0.06, 0.04]} material="graphite" />
          <Block position={[side * (SPAN_X / 2 - 0.075), MID, z - 0.025]} size={[0.03, HEIGHT - 0.2, 0.02]} material="rubber" />
          <Block position={[0, MID + side * (HEIGHT / 2 - 0.105), z - 0.025]} size={[SPAN_X - 0.12, 0.03, 0.02]} material="rubber" />
        </group>
      ))}
      {[FLOOR + 0.6, TOP - 0.6].map((y) => (
        <Cylinder key={y} position={[-SPAN_X / 2 - 0.02, y, z]} radius={0.035} height={0.3} material="aluminium" />
      ))}
      <Block position={[SPAN_X / 2 - 0.14, MID, z + 0.09]} size={[0.05, 1.3, 0.05]} radius={0.02} material="aluminium" />
      {[-0.5, 0.5].map((dy) => (
        <Block key={dy} position={[SPAN_X / 2 - 0.14, MID + dy, z + 0.045]} size={[0.04, 0.04, 0.07]} material="aluminium" />
      ))}
    </group>
  );
}

/**
 * The insulated enclosure around the printer: white base with the Autolab
 * name on the front, a black extrusion frame, clear acrylic side, back and
 * top panels, and the front door.
 */
export function Enclosure() {
  return (
    <group>
      {CORNERS.map(([x, z]) => (
        <Cylinder key={`foot${x}${z}`} position={[x * 0.93, 0.05, z * 0.94]} radius={0.14} height={0.1} material="rubber" />
      ))}
      <Block position={[0, 0.27, 0]} size={[X * 2 + 0.26, 0.34, Z * 2 + 0.36]} radius={0.05} material="plasticWhite" />
      <TextDecal text="Autolab" position={[-1.35, 0.27, Z + 0.181]} rotation={[0, 0, 0]} width={1.1} height={0.24} ink="dark" weight={700} />
      <Block position={[0, FLOOR + 0.01, 0]} size={[SPAN_X, 0.02, SPAN_Z]} material="aluminium" />
      {CORNERS.map(([x, z]) => (
        <Extrusion key={`post${x}${z}`} position={[x, MID, z]} length={HEIGHT} />
      ))}
      {[FLOOR + 0.08, TOP - 0.08].map((y) => (
        <group key={y}>
          {[-Z, Z].map((z) => (
            <Extrusion key={`x${z}`} position={[0, y, z]} length={SPAN_X} axis="x" />
          ))}
          {[-X, X].map((x) => (
            <Extrusion key={`z${x}`} position={[x, y, 0]} length={SPAN_Z} axis="z" />
          ))}
        </group>
      ))}
      <Block position={[-X, MID, 0]} size={[0.02, HEIGHT, SPAN_Z]} material="acrylic" />
      <Block position={[X, MID, 0]} size={[0.02, HEIGHT, SPAN_Z]} material="acrylic" />
      <Block position={[0, MID, -Z]} size={[SPAN_X, HEIGHT, 0.02]} material="acrylic" />
      <Block position={[0, TOP + 0.005, 0]} size={[SPAN_X, 0.02, SPAN_Z]} material="acrylic" />
      <Door />
    </group>
  );
}
