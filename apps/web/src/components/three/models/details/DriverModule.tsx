"use client";
import { useMemo } from "react";
import { Block, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { Header } from "./Header";
import { mm } from "./units";

/** A StepStick module is 15.2 x 20.3 mm with its two pin rows 0.6 inch apart. */
const BOARD = { width: mm(15.2), length: mm(20.3), thickness: mm(1.6) } as const;
const ROW = mm(7.62);
const SOCKET = mm(8.5);
const SINK = { side: mm(9), base: mm(1.5), fin: mm(0.9), fins: 5, height: mm(5) } as const;

export interface DriverModulesProps {
  /** Centres of each module's footprint on the mainboard's top face. */
  spots: Vec3[];
  /** Axis letters silkscreened in front of each socket. */
  labels?: string[];
}

/**
 * Plug-in stepper driver modules standing on their sockets, each with a
 * finned aluminium heatsink on the driver chip. Every heatsink across the
 * row is one instanced draw.
 */
export function DriverModules({ spots, labels = [] }: DriverModulesProps) {
  const sinks = useMemo<RepeatItem[]>(() => {
    const top = SOCKET + BOARD.thickness;
    return spots.flatMap(([x, y, z]) => {
      const base: RepeatItem = { position: [x, y + top + SINK.base / 2, z], scale: [SINK.side, SINK.base, SINK.side] };
      const fins = Array.from({ length: SINK.fins }, (_, i): RepeatItem => ({
        position: [x + (i / (SINK.fins - 1) - 0.5) * (SINK.side - SINK.fin), y + top + SINK.base + SINK.height / 2, z],
        scale: [SINK.fin, SINK.height, SINK.side],
      }));
      return [base, ...fins];
    });
  }, [spots]);
  return (
    <>
      {spots.map(([x, y, z], i) => (
        <group key={`${x}${z}`} position={[x, y, z]}>
          {[-1, 1].map((side) => (
            <Header key={side} position={[side * ROW, 0, 0]} count={8} along="z" female tailLength={0} />
          ))}
          <Block position={[0, SOCKET + BOARD.thickness / 2, 0]} size={[BOARD.width, BOARD.thickness, BOARD.length]} radius={mm(0.4)} material="pcbWhite" />
          {labels[i] ? <TextDecal text={labels[i]} position={[0, 0.0004, BOARD.length / 2 + mm(2.6)]} width={mm(3)} height={mm(3)} weight={700} /> : null}
        </group>
      ))}
      <Repeat items={sinks} material="aluminium" />
    </>
  );
}
