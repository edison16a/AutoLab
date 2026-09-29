"use client";
import { useMemo } from "react";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { mm, PITCH } from "./units";

export interface HeaderProps {
  /** Centre of the header's footprint on the board's top face. */
  position: Vec3;
  count: number;
  rows?: 1 | 2;
  /** The direction the pins are spread along. */
  along?: "x" | "z";
  /** Pins standing above the spacer. Zero for a bare row of plated holes. */
  pinLength?: number;
  /** Solder tails below the board, or pins pointing down when the header is fitted underneath. */
  tailLength?: number;
  /** Board thickness, so the tails start under the board. */
  board?: number;
  /** Female sockets instead of male pins: a taller black housing with holes. */
  female?: boolean;
  /** Hobby headers come gold flashed or tinned. Gold unless the board says otherwise. */
  plating?: "gold" | "tin";
}

const PIN = mm(0.64);
const SPACER = mm(2.5);
const SOCKET = mm(8.5);

/**
 * A 0.1 inch header: the black moulded spacer and the square posts above
 * it, plus tails under the board, in two instanced draws.
 */
export function Header({
  position,
  count,
  rows = 1,
  along = "x",
  pinLength = mm(6),
  tailLength = mm(2.5),
  board = mm(1.6),
  female = false,
  plating = "gold",
}: HeaderProps) {
  const { pins, tails } = useMemo(() => {
    const spots: [number, number][] = [];
    for (let row = 0; row < rows; row++)
      for (let i = 0; i < count; i++) spots.push([(i - (count - 1) / 2) * PITCH, (row - (rows - 1) / 2) * PITCH]);
    const place = ([a, b]: [number, number], y: number, length: number): RepeatItem => ({
      position: along === "x" ? [a, y, b] : [b, y, a],
      scale: [PIN, length, PIN],
    });
    const housing = female ? SOCKET : SPACER;
    return {
      pins: pinLength > 0 && !female ? spots.map((spot) => place(spot, housing + pinLength / 2, pinLength)) : [],
      tails: tailLength > 0 ? spots.map((spot) => place(spot, -board - tailLength / 2, tailLength)) : [],
    };
  }, [count, rows, along, pinLength, tailLength, board, female]);
  const length = count * PITCH;
  const width = rows * PITCH;
  const height = female ? SOCKET : SPACER;
  const size: Vec3 = along === "x" ? [length, height, width] : [width, height, length];
  return (
    <group position={position}>
      <Block position={[0, height / 2, 0]} size={size} material="plasticBlack" />
      {pins.length ? <Repeat items={pins} material={plating} /> : null}
      {tails.length ? <Repeat items={tails} material={plating} /> : null}
    </group>
  );
}
