"use client";
import { getMaterial } from "../../materials";
import { Block, Bolt, Chip, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { boardGeometry, type BoardOutline } from "../shared/board-geometry";
import { BOARD, BOARD_BOTTOM, BOARD_TOP, CAMERA_FPC_ENTRY, mm } from "./layout";

const HOLE = BOARD.size / 2 - BOARD.holeInset;
const HOLES = [-HOLE, HOLE].flatMap((x) => [-HOLE, HOLE].map((z) => [x, z] as const));
const OUTLINE: BoardOutline = {
  key: "hq-camera",
  width: BOARD.size,
  depth: BOARD.size,
  thickness: BOARD.thickness,
  corner: mm(2),
  holes: HOLES,
  holeRadius: mm(1.35),
};
/** Gold plated pads on both faces of each hole, one draw. */
const PADS: RepeatItem[] = HOLES.flatMap(([x, z]) =>
  [BOARD_TOP + 0.001, BOARD_BOTTOM - 0.001].map((y) => ({ position: [x, y, z] as Vec3, rotation: [-Math.PI / 2, 0, 0] as Vec3 })),
);
const PAD_SCALE: Vec3 = [0.031, 0.031, 0.008];

const CONNECTOR: Vec3 = [0.075, 0.032, 0.3];
/** The connector's open face sits just inside the +X edge of the board. */
const CONNECTOR_X = BOARD.size / 2 - CONNECTOR[0] / 2 - 0.004;

/**
 * The ribbon socket: a cream body with its slot on the +X face and the dark
 * brown flip lock along the top, as on the real camera. The ribbon model
 * ends inside this slot (see CAMERA_FPC_ENTRY).
 */
function RibbonSocket() {
  const face = CONNECTOR_X + CONNECTOR[0] / 2;
  return (
    <group>
      <Block position={[CONNECTOR_X, BOARD_TOP + CONNECTOR[1] / 2, 0]} size={CONNECTOR} radius={0.003} material="connectorCream" />
      <Block position={[face - 0.017, BOARD_TOP + CONNECTOR[1] + 0.005, 0]} size={[0.032, 0.01, CONNECTOR[2] + 0.012]} radius={0.003} material="latchBrown" />
      <Block position={[face + 0.0006, CAMERA_FPC_ENTRY[1], 0]} size={[0.002, 0.009, 0.2]} material="rubber" />
      {[-1, 1].map((end) => (
        <Block key={end} position={[CONNECTOR_X, BOARD_TOP + 0.009, end * (CONNECTOR[2] / 2 + 0.006)]} size={[0.045, 0.018, 0.012]} material="tin" />
      ))}
    </group>
  );
}

/** Decoupling parts beside the socket and around the two ICs, one draw per material. */
const CAPS: RepeatItem[] = [
  ...Array.from({ length: 7 }, (_, i) => ({ position: [0.175, BOARD_TOP + 0.005, -0.12 + i * 0.04] as Vec3 })),
  ...Array.from({ length: 4 }, (_, i) => ({ position: [-0.19 + i * 0.035, BOARD_TOP + 0.005, 0.1] as Vec3 })),
];
const RESISTORS: RepeatItem[] = Array.from({ length: 4 }, (_, i) => ({ position: [0.07, BOARD_TOP + 0.005, -0.1 + i * 0.035] as Vec3 }));
const PASSIVE: Vec3 = [0.026, 0.01, 0.014];

/**
 * The camera's component side: the green square board with its four gold
 * ringed holes, the ribbon socket, a few chips and a crystal, the two
 * screws that hold the lens mount and the red status LED, which lights
 * while the camera streams.
 */
export function CameraBoard({ online }: { online: boolean }) {
  const top = BOARD_TOP + 0.0006;
  return (
    <group>
      <mesh geometry={boardGeometry(OUTLINE)} material={getMaterial("pcbGreen")} castShadow receiveShadow dispose={null} />
      <Repeat items={PADS} shape="torus" material="gold" scale={PAD_SCALE} />
      <RibbonSocket />
      <Chip position={[-0.05, BOARD_TOP + 0.009, -0.03]} size={[0.11, 0.018, 0.09]} />
      <Chip position={[0, BOARD_TOP + 0.007, 0.09]} size={[0.06, 0.014, 0.05]} />
      <Block position={[-0.2, BOARD_TOP + 0.007, -0.03]} size={[0.05, 0.014, 0.03]} radius={0.004} material="tin" />
      <Repeat items={CAPS} material="ceramicTan" scale={PASSIVE} />
      <Repeat items={RESISTORS} material="plasticBlack" scale={PASSIVE} />
      {[-0.1, 0.1].map((x) => (
        <Bolt key={x} position={[x, BOARD_TOP + 0.005, 0.2]} radius={0.02} />
      ))}
      {/* Screws for the tripod block underneath. */}
      {[-0.07, 0.07].map((x) => (
        <Bolt key={x} position={[x, BOARD_TOP + 0.004, -0.268]} radius={0.016} />
      ))}
      <Block position={[0.17, BOARD_TOP + 0.005, 0.2]} size={[0.024, 0.01, 0.014]} radius={0.002} material={online ? "ledRed" : "ledRedOff"} />
      <TextDecal text="Raspberry Pi" position={[-0.02, top, -0.2]} width={0.26} height={0.042} weight={600} />
      <TextDecal text="HQ Camera" position={[-0.02, top, -0.155]} width={0.2} height={0.032} weight={500} />
    </group>
  );
}
