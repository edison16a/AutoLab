"use client";
import { Block, Cylinder } from "../../primitives";
import { ENCLOSURE, PROFILE } from "./layout";

const { halfX: X, halfZ: Z, floor: FLOOR, top: TOP } = ENCLOSURE;
const MID = (TOP + FLOOR) / 2;
const WIDTH = X * 2;
const HEIGHT = TOP - FLOOR - 0.04;
const RIM = 0.085;
const DEPTH = 0.04;
/** The door closes against the front of the frame, with the gasket squeezed between. */
const GASKET = { thickness: 0.02, width: 0.06, proud: 0.02 } as const;
const Z_DOOR = Z + PROFILE / 2 + GASKET.thickness + DEPTH / 2;
/** Where each gasket strip runs: down both sides and across the top and bottom, a little proud of the door edge. */
const GASKET_Z = Z_DOOR - DEPTH / 2 - GASKET.thickness / 2;
const GASKET_EDGE = GASKET.width / 2 - GASKET.proud;
const HINGES = [FLOOR + 0.55, TOP - 0.55];

/** Barrel hinge on the left post: a knuckle and a leaf on the door and on the post. */
function Hinge({ y }: { y: number }) {
  const x = -X - 0.035;
  return (
    <group position={[x, y, Z_DOOR - 0.01]}>
      <Cylinder radius={0.032} height={0.32} material="aluminium" />
      <Block position={[0.07, 0, 0.012]} size={[0.12, 0.28, 0.012]} radius={0.004} material="aluminium" />
      <Block position={[0.02, 0, -0.045]} size={[0.012, 0.28, 0.08]} radius={0.004} material="aluminium" />
    </group>
  );
}

/**
 * The gasketed front door: a clear acrylic viewing panel in a slim black
 * frame, hinged on the left, with a bar handle on the right. An orange red
 * silicone gasket runs round the back of the frame and stands a little
 * proud of its edge, so the seal shows as a thin line round the door.
 */
export function Door() {
  const bars = [-1, 1];
  const handleX = X - RIM / 2;
  return (
    <group>
      <Block position={[0, MID, Z_DOOR]} size={[WIDTH - RIM, HEIGHT - RIM, 0.016]} material="acrylic" />
      {bars.map((side) => (
        <group key={side}>
          <Block position={[side * (WIDTH / 2 - RIM / 2), MID, Z_DOOR]} size={[RIM, HEIGHT, DEPTH]} radius={0.012} material="graphite" />
          <Block position={[0, MID + side * (HEIGHT / 2 - RIM / 2), Z_DOOR]} size={[WIDTH - RIM * 2 + 0.02, RIM, DEPTH]} radius={0.012} material="graphite" />
          <Block position={[side * (WIDTH / 2 - GASKET_EDGE), MID, GASKET_Z]} size={[GASKET.width, HEIGHT + GASKET.proud * 2, GASKET.thickness]} radius={0.008} material="siliconeGasket" />
          <Block position={[0, MID + side * (HEIGHT / 2 - GASKET_EDGE), GASKET_Z]} size={[WIDTH, GASKET.width, GASKET.thickness]} radius={0.008} material="siliconeGasket" />
        </group>
      ))}
      {HINGES.map((y) => (
        <Hinge key={y} y={y} />
      ))}
      {/* Bar handle on two standoffs. */}
      <Block position={[handleX, MID, Z_DOOR + 0.13]} size={[0.055, 1.25, 0.055]} radius={0.026} material="aluminium" />
      {[-0.45, 0.45].map((dy) => (
        <Cylinder key={dy} position={[handleX, MID + dy, Z_DOOR + 0.07]} rotation={[Math.PI / 2, 0, 0]} radius={0.022} height={0.11} low material="aluminium" />
      ))}
    </group>
  );
}
