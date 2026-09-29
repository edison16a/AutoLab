"use client";
import { useMemo } from "react";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { at, mmX, mmY, mmZ, PI_PARTS, TOP } from "./layout";

/** 0.1 inch, the pitch of every Pi header. */
const PITCH = 2.54;
const BASE_HEIGHT = mmY(2.5);
/** Square posts stand 8.5 mm over the board, with short solder tails underneath. */
const PIN_SCALE: Vec3 = [0.008, mmY(8.5), 0.008];
const TAIL_SCALE: Vec3 = [0.008, mmY(2.8), 0.008];

/** Pin centres in drawing millimetres for a two row header of `columns`. */
function pinGrid(centre: readonly [number, number], columns: number): [number, number][] {
  const span = (columns - 1) * PITCH;
  return Array.from({ length: columns }, (_, i) => centre[0] - span / 2 + i * PITCH).flatMap((x) => [
    [x, centre[1] - PITCH / 2] as [number, number],
    [x, centre[1] + PITCH / 2] as [number, number],
  ]);
}

/**
 * A two row male header: one black moulded strip, the gold plated posts in
 * one instanced draw and their solder tails under the board in another.
 */
function Header({ centre, columns }: { centre: readonly [number, number]; columns: number }) {
  const { pins, tails } = useMemo(() => {
    const grid = pinGrid(centre, columns).map(([x, y]) => at(x, y));
    return {
      pins: grid.map(([x, z]) => ({ position: [x, TOP + PIN_SCALE[1] / 2, z] as Vec3 })) satisfies RepeatItem[],
      tails: grid.map(([x, z]) => ({ position: [x, -TOP - TAIL_SCALE[1] / 2, z] as Vec3 })) satisfies RepeatItem[],
    };
  }, [centre, columns]);
  const [x, z] = at(centre[0], centre[1]);
  return (
    <group>
      <Block position={[x, TOP + BASE_HEIGHT / 2, z]} size={[mmX(columns * PITCH), BASE_HEIGHT, mmZ(PITCH * 2)]} material="plasticBlack" />
      <Repeat items={pins} material="gold" scale={PIN_SCALE} />
      <Repeat items={tails} material="gold" scale={TAIL_SCALE} />
    </group>
  );
}

/** The 40 pin GPIO header along the back edge and the 4 pin PoE header beside the Ethernet jack. */
export function PinHeaders() {
  return (
    <group>
      <Header centre={PI_PARTS.gpio} columns={20} />
      <Header centre={PI_PARTS.poe} columns={2} />
    </group>
  );
}
