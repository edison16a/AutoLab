"use client";
import { useRef } from "react";
import type { Mesh } from "three";
import { unitGeometry } from "../../geometries";
import { getMaterial } from "../../materials";
import { ADDITION_PORTS, ASPIRATION_PORTS, type MachinePose } from "../../motion/pose";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { Block, Cylinder, Ring, TextDecal, Tube } from "../../primitives";
import type { Vec3 } from "../../types";
import type { FlowLine } from "./flow";
import { FlowTube } from "./FlowTube";
import { PMST100 } from "./pump-spec";

const PITCH = 0.2;
/** Height of the tubes as they pass through the pinch heads on top of the solenoids. */
const SLOT_Y = 0.34;
const BODY = { radius: 0.068, bottom: 0.03, top: 0.27 } as const;
const MANIFOLD_Z = 0.19;
/** The bottle lines leave the back of the pinch heads here. */
const BACK_Z = -0.13;
const COMMON_Z = 0.26;

const TUBE = PMST100.tubeRadius;
const PORT_LABEL: Record<string, string> = { media: "Media", cleaner: "Cleaner", waste: "Waste" };

/** Where each pinch valve stands across the block. The addition valve keeps media nearest the enclosure, on the right. */
const ADDITION_X = ADDITION_PORTS.map((_, i) => (1 - i) * PITCH);
const ASPIRATION_X = ASPIRATION_PORTS.map((_, i) => (i - 0.5) * PITCH);

/** The common line from the pump joins at the manifold's front; each bottle line leaves its pinch head at the back. In the valve's space. */
export function valvePorts(kind: "addition" | "aspiration") {
  const xs = kind === "addition" ? ADDITION_X : ASPIRATION_X;
  return { common: [0, SLOT_Y, COMMON_Z] as Vec3, ports: xs.map((x) => [x, SLOT_Y, BACK_Z] as Vec3) };
}

/** The open light on one solenoid: green while its port is open in the Home demo, dark otherwise. */
function OpenLight({ x, index, read }: { x: number; index: number; read: (pose: MachinePose) => number }) {
  const led = useRef<Mesh>(null);
  usePoseFrame(
    (pose) => {
      if (led.current) led.current.material = getMaterial(read(pose) === index ? "ledGreen" : "ledGreenOff");
    },
    () => {
      if (led.current) led.current.material = getMaterial("ledGreenOff");
    },
  );
  return <mesh ref={led} geometry={unitGeometry("box")} material={getMaterial("ledGreenOff")} position={[x, 0.2, BODY.radius + 0.004]} scale={[0.03, 0.02, 0.01]} dispose={null} />;
}

/** One normally closed pinch valve: a black solenoid with a white pinch head on top that the tube runs through. */
function Solenoid({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Cylinder position={[0, BODY.bottom - 0.012, 0]} radius={0.085} height={0.016} low material="aluminium" />
      <Cylinder position={[0, (BODY.bottom + BODY.top) / 2, 0]} radius={BODY.radius} height={BODY.top - BODY.bottom} material="plasticBlack" />
      <Ring position={[0, BODY.top, 0]} radius={0.055} material="steel" />
      <Block position={[0, SLOT_Y, 0]} size={[0.12, 0.09, 0.14]} radius={0.012} material="plasticWhite" />
      {/* The slot where the solenoid pinches the tube shut. */}
      <Block position={[0, SLOT_Y + 0.03, 0]} size={[0.125, 0.015, 0.145]} material="plasticGrey" />
      {/* Two leads out of the back of the coil, down to the platform. */}
      {(["wireRed", "wireBlack"] as const).map((wire, i) => (
        <Tube
          key={wire}
          points={[
            [(i - 0.5) * 0.03, 0.1, -BODY.radius + 0.01],
            [(i - 0.5) * 0.03, 0.08, -BODY.radius - 0.03],
            [(i - 0.5) * 0.03, 0.03, -BODY.radius - 0.06],
          ]}
          radius={0.008}
          material={wire}
          segments={12}
        />
      ))}
    </group>
  );
}

interface ValveProps {
  ports: readonly string[];
  xs: number[];
  /** The fluid line through the common stub, and through each port's stub. */
  common: FlowLine;
  lines: FlowLine[];
  read: (pose: MachinePose) => number;
}

/**
 * A selector valve built from normally closed pinch valves on one base
 * plate. The pump's line comes into a white manifold at the front, splits,
 * and each branch runs back through its own pinch head to a bottle, so
 * opening one solenoid picks which bottle the pump is connected to and
 * with all of them shut nothing flows. Each solenoid has a green light that
 * shows when its port is open. Origin at the middle of the base plate.
 */
function PinchValve({ ports, xs, common, lines, read }: ValveProps) {
  const width = ports.length * PITCH;
  return (
    <group>
      <Block position={[0, 0.01, 0]} size={[width, 0.02, 0.32]} radius={0.004} material="aluminium" />
      <Block position={[0, SLOT_Y, MANIFOLD_Z]} size={[width - 0.04, 0.07, 0.07]} radius={0.015} material="plasticWhite" />
      {/* Posts that hold the manifold up off the plate. */}
      {[-1, 1].map((side) => (
        <Block key={side} position={[side * (width / 2 - 0.05), (SLOT_Y + 0.02) / 2, MANIFOLD_Z]} size={[0.03, SLOT_Y - 0.04, 0.03]} material="plaGrey" />
      ))}
      <Cylinder position={[0, SLOT_Y, MANIFOLD_Z + 0.055]} rotation={[Math.PI / 2, 0, 0]} radius={0.02} height={0.05} low material="plasticWhite" />
      <FlowTube points={[[0, SLOT_Y, MANIFOLD_Z + 0.04], [0, SLOT_Y, COMMON_Z]]} line={common} towardHead radius={TUBE} segments={4} />
      {ports.map((port, i) => (
        <group key={port}>
          <Solenoid x={xs[i]} />
          <OpenLight x={xs[i]} index={i} read={read} />
          <FlowTube points={[[xs[i], SLOT_Y, MANIFOLD_Z - 0.02], [xs[i], SLOT_Y, 0.06], [xs[i], SLOT_Y, BACK_Z]]} line={lines[i]} towardHead={false} radius={TUBE} segments={8} />
          <TextDecal text={PORT_LABEL[port]} position={[xs[i], 0.021, 0.125]} width={0.17} height={0.04} ink="dark" weight={600} />
        </group>
      ))}
    </group>
  );
}

const additionPort = (pose: MachinePose) => pose.additionValve;
const aspirationPort = (pose: MachinePose) => pose.aspirationValve;

/** The "3-way valve" in the sketch: the addition pump's line to fresh media, cleaner or waste. */
export function AdditionValveModel() {
  return <PinchValve ports={ADDITION_PORTS} xs={ADDITION_X} common="addCommon" lines={["addMedia", "addCleaner", "addWaste"]} read={additionPort} />;
}

/** The "2-way valve" in the sketch: the aspiration pump's line to waste or cleaner. */
export function AspirationValveModel() {
  return <PinchValve ports={ASPIRATION_PORTS} xs={ASPIRATION_X} common="aspCommon" lines={["aspWaste", "aspCleaner"]} read={aspirationPort} />;
}
