"use client";
import { useMemo } from "react";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import type { RibbonEnd } from "./ribbon-geometry";

/** A 15 way cable at 1 mm pitch. */
const CONTACTS = 15;

interface RibbonEndTabProps {
  end: RibbonEnd;
  width: number;
  thickness: number;
  /** How far back from the tip the stiffener and contacts run. */
  length: number;
}

/**
 * One end of the ribbon as it goes into a socket: the blue stiffener on one
 * face and fifteen bare tinned contact fingers on the other, like the real
 * camera cable. Built in the end's own frame (+X out of the cable, Z across
 * it, Y off its face).
 */
export function RibbonEndTab({ end, width, thickness, length }: RibbonEndTabProps) {
  const fingers = useMemo<RepeatItem[]>(() => {
    const pitch = width / CONTACTS;
    const reach = length * 0.86;
    return Array.from({ length: CONTACTS }, (_, i) => ({
      position: [-reach / 2 - 0.004, thickness / 2 + 0.0006, -width / 2 + pitch * (i + 0.5)] as Vec3,
      scale: [reach, 0.0012, pitch * 0.56] as Vec3,
    }));
  }, [width, thickness, length]);

  return (
    <group position={end.position} quaternion={end.quaternion}>
      <Block position={[-length / 2, -thickness / 2 - 0.004, 0]} size={[length, 0.008, width]} material="stiffenerBlue" />
      <Repeat items={fingers} material="tin" />
    </group>
  );
}
