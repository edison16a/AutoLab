"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { BREADBOARD, DRIVER_BOARD, POWER_SUPPLY, PUMP_PANEL } from "./fluidics-layout";
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
/** The panel runs the platform's width, less a margin, with a leg at each end. */
const PANEL = { ...PUMP_PANEL, half: WIDTH / 2 - 0.04 } as const;

/** A DIP chip on the interface board: the ULN2003 for the SMC10s' enable and direction inputs, the dual op-amp for their speed voltages. */
function Dip({ position, pins }: { position: Vec3; pins: number }) {
  const length = (pins / 2) * 0.0314;
  return (
    <group position={position}>
      <Block position={[0, 0.018, 0]} size={[0.08, 0.025, length]} material="plasticBlack" />
      {[-1, 1].map((side) => (
        <Block key={side} position={[side * 0.045, 0.008, 0]} size={[0.01, 0.016, length - 0.01]} material="tin" />
      ))}
    </group>
  );
}

/**
 * The aluminium panel the pumps mount through, on two angle legs, with the
 * two round cut-outs behind the pumps' flanges. It stops short of the
 * platform, so the lines from the pumps' fittings run back under it.
 */
function PumpPanel() {
  const { z, thickness, bottom, top, half } = PANEL;
  const height = top - bottom;
  return (
    <group>
      <Block position={[X, (bottom + top) / 2, z - thickness / 2]} size={[half * 2, height, thickness]} radius={0.008} material="aluminiumBlasted" />
      {[-1, 1].map((side) => (
        <group key={side} position={[X + side * (half - 0.03), 0, z - thickness - 0.03]}>
          {/* An L leg: one face against the panel's back, one facing sideways, and its foot screwed to the platform. */}
          <Block position={[0, (TOP + top) / 2, 0.015]} size={[0.06, top - TOP, 0.008]} material="aluminiumBlasted" />
          <Block position={[side * 0.026, (TOP + top) / 2, -0.01]} size={[0.008, top - TOP, 0.06]} material="aluminiumBlasted" />
          <Block position={[0, TOP + 0.004, -0.06]} size={[0.06, 0.008, 0.16]} material="aluminiumBlasted" />
        </group>
      ))}
    </group>
  );
}

/**
 * The white plate outside the enclosure on the left, mirroring the Pi's
 * platform on the right, that the fluidics stand on: the pumps, valves,
 * controllers and bottles are registry parts placed on it. It carries the
 * pump panel, the mini breadboard for the Pico and the interface board
 * beside it, and stands on four rubber feet.
 */
export function FluidicsPlatform() {
  const plateHeight = TOP - FEET_HEIGHT;
  const board = DRIVER_BOARD;
  return (
    <group>
      <Block position={[X, FEET_HEIGHT + plateHeight / 2, Z]} size={[WIDTH, plateHeight, DEPTH]} radius={0.018} material="plasticWhite" />
      <Repeat items={FEET} shape="cylinderLow" material="rubber" scale={FOOT_SCALE} />
      <PumpPanel />
      {/* The 24 V supply on the bench behind the platform, with its rating label. */}
      <Block position={[POWER_SUPPLY.x, POWER_SUPPLY.height / 2 + 0.006, POWER_SUPPLY.z]} size={[POWER_SUPPLY.width, POWER_SUPPLY.height, POWER_SUPPLY.depth]} radius={0.03} material="plasticBlack" />
      <TextDecal text="24 V  6.25 A" position={[POWER_SUPPLY.x, POWER_SUPPLY.height + 0.007, POWER_SUPPLY.z]} width={0.3} height={0.05} ink="light" weight={600} />
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
      <Dip position={[board.x - 0.07, board.top + 0.006, board.z + 0.08]} pins={16} />
      <Dip position={[board.x - 0.07, board.top + 0.006, board.z - 0.1]} pins={8} />
      {/* The speed filters: a resistor and a capacitor for each pump, ahead of the op-amp. */}
      {[-0.03, 0.03].map((dx) => (
        <group key={dx}>
          <Block position={[board.x - 0.07 + dx, board.top + 0.016, board.z - 0.17]} size={[0.012, 0.012, 0.04]} radius={0.004} material="ceramicTan" />
          <Cylinder position={[board.x - 0.07 + dx, board.top + 0.03, board.z - 0.02]} radius={0.012} height={0.04} low material="usbBlue" />
        </group>
      ))}
      {/* The MOSFETs: black TO-220 bodies with their tabs, one for each valve and the fan. */}
      {MOSFETS.map((position) => (
        <group key={position[2]} position={position}>
          <Block position={[0, 0.045, 0]} size={[0.035, 0.07, 0.03]} material="plasticBlack" />
          <Block position={[0.02, 0.06, 0]} size={[0.006, 0.09, 0.03]} material="aluminium" />
        </group>
      ))}
      {/* 24 V input terminal at the board's back edge, which also feeds both controllers. */}
      <Block position={[board.x + 0.05, board.top + 0.035, board.z - board.depth / 2 + 0.03]} size={[0.12, 0.06, 0.05]} radius={0.005} material="terminalGreen" />
    </group>
  );
}
