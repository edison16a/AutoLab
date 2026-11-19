"use client";
import { useRef } from "react";
import type { Mesh } from "three";
import { unitGeometry } from "../../geometries";
import { getMaterial } from "../../materials";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { Block, Chip, Cylinder, Repeat, Ring, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { LINE_INDEX, type FlowLine } from "./flow";
import { SMC10 } from "./pump-spec";

const { length: L, width: W, pcb: PCB, standoff: STANDOFF } = SMC10;
const TOP = STANDOFF + PCB;
/** The three screw terminals down the +Z edge, as on the quick start guide: supply, coil A, coil B. */
const TERMINAL_X = [-0.2, 0, 0.2];
const TERMINAL = { z: L / 2 - 0.07, width: 0.16, height: 0.11, depth: 0.12 } as const;
/** The 2 x 6 I/O header along the +X edge, and the three pin speed input beside it. */
const HEADER = { x: W / 2 - 0.07, z: -0.05, pitch: 0.0314 } as const;
const HEADER_PINS: RepeatItem[] = [0, 1].flatMap((row) =>
  Array.from({ length: 6 }, (_, i) => ({ position: [HEADER.x - row * HEADER.pitch, TOP + 0.05, HEADER.z + (i - 2.5) * HEADER.pitch] as Vec3 })),
);
const POT_PINS: RepeatItem[] = [0, 1, 2].map((i) => ({ position: [HEADER.x, TOP + 0.05, HEADER.z - 0.18 + (i - 1) * HEADER.pitch] as Vec3 }));
const PIN_SCALE: Vec3 = [0.008, 0.1, 0.008];
const STANDOFFS: RepeatItem[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ position: [sx * (W / 2 - 0.05), STANDOFF / 2, sz * (L / 2 - 0.05)] as Vec3 })));
const STANDOFF_SCALE: Vec3 = [0.022, STANDOFF, 0.022];
/** The power stage: eight MOSFETs in two rows, the way a 10 A dual H bridge is laid out. */
const MOSFETS: Vec3[] = [-1, 1].flatMap((row) => [-0.15, -0.05, 0.05, 0.15].map((x) => [x - 0.06, TOP + 0.012, 0.12 + row * 0.07] as Vec3));

/**
 * Where cables meet the board, in its own space: the mouths of the supply
 * and coil terminals (wires come in from +Z), and the header pins the
 * Pico's interface plugs onto (enable, direction, speed and ground).
 */
export const SMC10_PORTS = {
  supply: [TERMINAL_X[0], TOP + TERMINAL.height / 2, L / 2 + 0.01] as Vec3,
  coilA: [TERMINAL_X[1], TOP + TERMINAL.height / 2, L / 2 + 0.01] as Vec3,
  coilB: [TERMINAL_X[2], TOP + TERMINAL.height / 2, L / 2 + 0.01] as Vec3,
  header: [HEADER.x - HEADER.pitch / 2, TOP + 0.17, HEADER.z] as Vec3,
};

/** The board's status LED: lit while its pump runs in the Home demo, dark otherwise. */
function RunLight({ line }: { line: FlowLine }) {
  const led = useRef<Mesh>(null);
  const index = LINE_INDEX[line];
  usePoseFrame(
    (pose) => {
      if (led.current) led.current.material = getMaterial(pose.flowing[index] ? "ledGreen" : "ledGreenOff");
    },
    () => {
      if (led.current) led.current.material = getMaterial("ledGreenOff");
    },
  );
  return <mesh ref={led} geometry={unitGeometry("box")} material={getMaterial("ledGreenOff")} position={[W / 2 - 0.08, TOP + 0.008, L / 2 - 0.2]} scale={[0.03, 0.016, 0.02]} dispose={null} />;
}

/**
 * Simply Pumps SMC10 stepper motor controller, one per pump: a 2.565" x
 * 2.250" board on brass standoffs, laid out like its quick start guide.
 * Three green screw terminals for the 6 to 30 V supply and the motor's two
 * coils, the bulk capacitor, the power stage and microcontroller, and the
 * 2 x 6 I/O header with the three pin speed input. The Pico drives it
 * through that header: an enable input, a forward/reverse input and a 0 to
 * 5 V speed voltage in place of the guide's 10k pot. Its status LED lights
 * while its pump runs in the Home demo. Origin at the middle of the
 * underside, terminals toward +Z.
 */
function SMC10Board({ line }: { line: FlowLine }) {
  return (
    <group>
      <Repeat items={STANDOFFS} shape="cylinderLow" material="brass" scale={STANDOFF_SCALE} />
      <Block position={[0, STANDOFF + PCB / 2, 0]} size={[W, PCB, L]} radius={0.006} material="pcbGreen" />
      {TERMINAL_X.map((x) => (
        <group key={x} position={[x, TOP + TERMINAL.height / 2, TERMINAL.z]}>
          <Block size={[TERMINAL.width, TERMINAL.height, TERMINAL.depth]} radius={0.006} material="terminalGreen" />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Cylinder position={[side * 0.04, TERMINAL.height / 2 + 0.002, -0.015]} radius={0.022} height={0.006} low material="tin" />
              <Block position={[side * 0.04, 0, TERMINAL.depth / 2 + 0.001]} size={[0.045, 0.045, 0.004]} material="plasticBlack" />
            </group>
          ))}
        </group>
      ))}
      {/* The bulk capacitor, in its black sleeve with the vented aluminium top. */}
      <Cylinder position={[-0.12, TOP + 0.1, -0.12]} radius={0.075} height={0.2} material="plasticBlack" />
      <Ring position={[-0.12, TOP + 0.2, -0.12]} radius={0.06} thin material="aluminium" />
      <Cylinder position={[-0.12, TOP + 0.201, -0.12]} radius={0.06} height={0.002} material="aluminium" />
      {MOSFETS.map((position) => (
        <Block key={position.join()} position={position} size={[0.05, 0.022, 0.05]} material="plasticBlack" />
      ))}
      <Chip position={[0.12, TOP + 0.01, -0.2]} size={[0.12, 0.02, 0.12]} />
      <Block position={[HEADER.x - HEADER.pitch / 2, TOP + 0.015, HEADER.z]} size={[0.07, 0.03, 0.2]} material="plasticBlack" />
      <Repeat items={HEADER_PINS} shape="cylinderLow" material="gold" scale={PIN_SCALE} />
      <Block position={[HEADER.x, TOP + 0.015, HEADER.z - 0.18]} size={[0.04, 0.03, 0.11]} material="plasticBlack" />
      <Repeat items={POT_PINS} shape="cylinderLow" material="gold" scale={PIN_SCALE} />
      <RunLight line={line} />
      <TextDecal text="SMC10" position={[0.02, TOP + 0.001, -0.33]} width={0.2} height={0.05} ink="light" weight={700} />
    </group>
  );
}

/** The controller that drives the addition pump. */
export function AdditionControllerModel() {
  return <SMC10Board line="addHead" />;
}

/** The controller that drives the aspiration pump. */
export function AspirationControllerModel() {
  return <SMC10Board line="aspHead" />;
}
