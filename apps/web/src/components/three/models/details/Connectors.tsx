"use client";
import { useMemo } from "react";
import { Block, Cylinder, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { mm } from "./units";

export interface JstProps {
  /** Centre of the footprint on the board's top face. */
  position: Vec3;
  count: number;
  /** XH is 2.5 mm pitch and taller, PH is 2.0 mm. */
  kind?: "xh" | "ph";
  /** Which way the opening faces, turning the housing about Y. */
  rotation?: number;
}

/**
 * A white JST wire to board socket: the housing with its open mouth and
 * the pins inside, facing +Z unless turned.
 */
export function Jst({ position, count, kind = "xh", rotation = 0 }: JstProps) {
  const pitch = mm(kind === "xh" ? 2.5 : 2);
  const height = mm(kind === "xh" ? 7 : 6);
  const depth = mm(kind === "xh" ? 5.75 : 4.5);
  const width = pitch * count + mm(2.4);
  const pins = useMemo<RepeatItem[]>(
    () => Array.from({ length: count }, (_, i) => ({ position: [(i - (count - 1) / 2) * pitch, height * 0.45, mm(0.4)] as Vec3, scale: [mm(0.64), height * 0.7, mm(0.64)] as Vec3 })),
    [count, pitch, height],
  );
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block position={[0, height / 2, 0]} size={[width, height, depth]} material="plasticWhite" />
      <Block position={[0, height * 0.55, depth / 2 - mm(1.5) + 0.0005]} size={[width - mm(1.4), height * 0.72, mm(3)]} material="plasticGrey" />
      <Repeat items={pins} material="steel" />
    </group>
  );
}

/** A micro USB B socket at a board edge, mouth facing +Z. */
export function MicroUsb({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block position={[0, mm(1.4), 0]} size={[mm(7.5), mm(2.8), mm(5.5)]} radius={mm(0.4)} material="steel" />
      <Block position={[0, mm(1.4), mm(2.76)]} size={[mm(6), mm(1.6), mm(0.1)]} material="plasticBlack" />
    </group>
  );
}

export interface ScrewTerminalProps {
  position: Vec3;
  count: number;
  /** Which way the wire entries face, turning the block about Y. */
  rotation?: number;
}

/**
 * A 5 mm pitch screw terminal block: moulded body, a screw on top of each
 * way and the square wire entries on the front. Drawn in the grey of the
 * palette rather than the usual green.
 */
export function ScrewTerminal({ position, count, rotation = 0 }: ScrewTerminalProps) {
  const pitch = mm(5);
  const { screws, mouths } = useMemo(() => {
    const xs = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * pitch);
    return {
      screws: xs.map((x) => ({ position: [x, mm(10) + 0.0008, -mm(1)] as Vec3, scale: [mm(1.7), mm(0.6), mm(1.7)] as Vec3 })),
      mouths: xs.map((x) => ({ position: [x, mm(3.5), mm(3.8)] as Vec3, scale: [mm(3.2), mm(3), mm(0.3)] as Vec3 })),
    };
  }, [count, pitch]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Block position={[0, mm(5), 0]} size={[pitch * count, mm(10), mm(7.6)]} material="plasticGrey" />
      <Repeat items={screws} shape="cylinderLow" material="steel" />
      <Repeat items={mouths} material="plasticBlack" />
    </group>
  );
}

/** An aluminium electrolytic capacitor standing on the board, with its dark sleeve and scored top. */
export function Electrolytic({ position, radius = mm(4), height = mm(10) }: { position: Vec3; radius?: number; height?: number }) {
  return (
    <group position={position}>
      <Cylinder position={[0, height / 2, 0]} radius={radius} height={height} material="plasticBlack" />
      <Cylinder position={[0, height + 0.0005, 0]} radius={radius * 0.92} height={0.001} material="aluminium" />
      <Block position={[0, height + 0.0012, 0]} size={[radius * 1.2, 0.0006, mm(0.3)]} material="graphite" />
    </group>
  );
}
