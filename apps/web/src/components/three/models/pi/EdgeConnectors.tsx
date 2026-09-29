"use client";
import { getMaterial, type MaterialKey } from "../../materials";
import { Block, Cylinder, Ring } from "../../primitives";
import type { Vec3 } from "../../types";
import { at, mmX, mmY, mmZ, PI_BOARD, PI_PARTS, TOP } from "./layout";
import { Port } from "./Port";
import { stadiumShellGeometry, type PortHole } from "./port-geometry";

/** Ports on the front edge poke about 1 mm past the board, as on the real Pi. */
const FRONT = PI_BOARD.depth / 2 + mmZ(1);
/** Turns a port built facing +X so it faces +Z, out of the front edge. */
const FACE_FRONT: Vec3 = [0, -Math.PI / 2, 0];

const HDMI_SIZE: Vec3 = [mmZ(7.5), mmY(3), mmX(6.5)];
const HDMI_RECESS = 0.05;
const HDMI_HOLES: PortHole[] = [{ y: 0.001, height: 0.021, width: 0.068 }];

/** A micro-HDMI socket with its thin centre tongue. */
function MicroHdmi({ drawingX }: { drawingX: number }) {
  const [x] = at(drawingX, 0);
  return (
    <Port position={[x, TOP + HDMI_SIZE[1] / 2, FRONT - HDMI_SIZE[0] / 2]} rotation={FACE_FRONT} size={HDMI_SIZE} holes={HDMI_HOLES} recess={HDMI_RECESS}>
      <Block position={[HDMI_SIZE[0] / 2 - 0.028, 0.001, 0]} size={[0.042, 0.005, 0.05]} material="plasticBlack" />
    </Port>
  );
}

const USBC = { width: mmX(8.94), height: mmY(3.26), depth: mmZ(7.35), wall: 0.0045 } as const;

/**
 * The USB-C power socket: a hollow stadium shell, a dark insulator at the
 * back and the flat tongue in the middle. `emphasis` paints the shell in
 * the accent so onboarding can point at the power input.
 */
function UsbC({ emphasis }: { emphasis: boolean }) {
  const [x] = at(PI_PARTS.usbC[0], 0);
  const shell: MaterialKey = emphasis ? "accent" : "tin";
  return (
    <group position={[x, TOP + USBC.height / 2, FRONT - USBC.depth / 2]}>
      <mesh geometry={stadiumShellGeometry(USBC.width, USBC.height, USBC.depth, USBC.wall)} material={getMaterial(shell)} castShadow receiveShadow dispose={null} />
      <Block position={[0, 0, -USBC.depth / 2 + 0.025]} size={[USBC.width - 0.012, USBC.height - 0.01, 0.05]} radius={0.012} material="plasticBlack" />
      <Block position={[0, 0, 0.002]} size={[0.07, 0.007, 0.08]} material="plasticBlack" />
      {/* Solder tabs on each side, down to the board. */}
      {[-1, 1].map((side) => (
        <Block key={side} position={[side * (USBC.width / 2 + 0.004), -USBC.height / 2 + 0.006, -0.02]} size={[0.008, 0.012, 0.03]} material="tin" />
      ))}
    </group>
  );
}

/** The 3.5 mm AV jack: a black body with the round socket standing past the edge. */
function AudioJack() {
  const [x] = at(PI_PARTS.audio[0], 0);
  const axisY = TOP + mmY(3.1);
  const barrel = { start: PI_BOARD.depth / 2 - 0.012, end: PI_BOARD.depth / 2 + mmZ(2.2) };
  return (
    <group position={[x, 0, 0]}>
      <Block position={[0, TOP + mmY(6) / 2, PI_BOARD.depth / 2 - mmZ(12.5) / 2 - 0.004]} size={[mmX(7), mmY(6), mmZ(12.5)]} radius={0.006} material="plasticBlack" />
      <Cylinder
        position={[0, axisY, (barrel.start + barrel.end) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        radius={0.031}
        height={barrel.end - barrel.start}
        material="plasticBlack"
      />
      <Ring position={[0, axisY, barrel.end + 0.004]} rotation={[0, 0, 0]} radius={0.025} material="plasticBlack" />
      <Cylinder position={[0, axisY, barrel.end + 0.0005]} rotation={[Math.PI / 2, 0, 0]} radius={0.02} height={0.001} material="rubber" />
    </group>
  );
}

/** Power, both micro-HDMI outputs and the AV jack along the front edge. */
export function EdgeConnectors({ emphasisePower = false }: { emphasisePower?: boolean }) {
  return (
    <group>
      <UsbC emphasis={emphasisePower} />
      <MicroHdmi drawingX={PI_PARTS.hdmi0[0]} />
      <MicroHdmi drawingX={PI_PARTS.hdmi1[0]} />
      <AudioJack />
    </group>
  );
}
