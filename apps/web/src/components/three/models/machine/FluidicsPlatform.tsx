"use client";
import { Block, Cylinder, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { BREADBOARD, DRIVER_BOARD } from "./fluidics-layout";
import { FLUIDICS } from "./layout";

const { x: X, z: Z, width: WIDTH, depth: DEPTH, top: TOP } = FLUIDICS;
const FEET_HEIGHT = 0.012;

/** Rubber feet near each corner of the plate. */
const FEET: RepeatItem[] = [-1, 1].flatMap((sx) =>
  [-1, 1].map((sz) => ({ position: [X + sx * (WIDTH / 2 - 0.1), FEET_HEIGHT / 2, Z + sz * (DEPTH / 2 - 0.1)] as Vec3 })),
);
const FOOT_SCALE: Vec3 = [0.05, FEET_HEIGHT, 0.05];

const BB_HOLES: RepeatItem[] = [-1, 1].flatMap((side) =>
  [0.165, 0.135].flatMap((dz) =>
    Array.from({ length: 24 }, (_, i) => ({ position: [BREADBOARD.x + (i - 11.5) * 0.0314, BREADBOARD.top + 0.0005, BREADBOARD.z + side * dz] as Vec3 })),
  ),
);
const BB_HOLE_SCALE: Vec3 = [0.012, 0.001, 0.012];

const MOSFETS: Vec3[] = [-0.12, -0.06, 0, 0.06, 0.12].map((dz) => [DRIVER_BOARD.x + 0.09, DRIVER_BOARD.top, DRIVER_BOARD.z + dz]);

/** One TMC2209 driver: a purple module on two header rows with its finned heatsink. */
function StepperDriver({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block position={[0, 0.03, 0]} size={[0.1, 0.06, 0.18]} material="plasticBlack" />
      <Block position={[0, 0.065, 0]} size={[0.12, 0.012, 0.2]} material="pcbPurple" />
      {[-0.024, -0.008, 0.008, 0.024].map((dx) => (
        <Block key={dx} position={[dx, 0.09, 0]} size={[0.01, 0.04, 0.1]} material="aluminium" />
      ))}
    </group>
  );
}

/**
 * The white plate outside the enclosure on the left, mirroring the Pi's
 * platform on the right, that the fluidics stand on: the pumps and valves
 * are registry parts placed on it. It carries the mini breadboard for the
 * Pico and the driver board beside it, and stands on four rubber feet.
 */
export function FluidicsPlatform() {
  const plateHeight = TOP - FEET_HEIGHT;
  const board = DRIVER_BOARD;
  return (
    <group>
      <Block position={[X, FEET_HEIGHT + plateHeight / 2, Z]} size={[WIDTH, plateHeight, DEPTH]} radius={0.018} material="plasticWhite" />
      <Repeat items={FEET} shape="cylinderLow" material="rubber" scale={FOOT_SCALE} />
      <Block
        position={[BREADBOARD.x, (TOP + BREADBOARD.top) / 2, BREADBOARD.z]}
        size={[BREADBOARD.length, BREADBOARD.top - TOP, BREADBOARD.width]}
        radius={0.01}
        material="plasticWhite"
      />
      <Block position={[BREADBOARD.x, BREADBOARD.top, BREADBOARD.z]} size={[BREADBOARD.length - 0.04, 0.004, 0.03]} material="plasticGrey" />
      <Repeat items={BB_HOLES} material="plasticBlack" scale={BB_HOLE_SCALE} />
      {/* Driver board on brass standoffs. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cylinder key={`${sx}${sz}`} position={[board.x + sx * (board.width / 2 - 0.025), (TOP + board.top) / 2, board.z + sz * (board.depth / 2 - 0.025)]} radius={0.014} height={board.top - TOP} low material="brass" />
        )),
      )}
      <Block position={[board.x, board.top, board.z]} size={[board.width, 0.012, board.depth]} material="pcbGreen" />
      <StepperDriver position={[board.x - 0.06, board.top + 0.006, board.z - 0.09]} />
      <StepperDriver position={[board.x - 0.06, board.top + 0.006, board.z + 0.09]} />
      {/* The MOSFETs: black TO-220 bodies with their tabs, one for each valve and the fan. */}
      {MOSFETS.map((position) => (
        <group key={position[2]} position={position}>
          <Block position={[0, 0.045, 0]} size={[0.035, 0.07, 0.03]} material="plasticBlack" />
          <Block position={[0.02, 0.06, 0]} size={[0.006, 0.09, 0.03]} material="aluminium" />
        </group>
      ))}
      {/* 12 V input terminal at the board's back edge. */}
      <Block position={[board.x + 0.05, board.top + 0.035, board.z - board.depth / 2 + 0.03]} size={[0.12, 0.06, 0.05]} radius={0.005} material="terminalGreen" />
    </group>
  );
}
