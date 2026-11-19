"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Vector3, type Group } from "three";
import { Block } from "../../primitives";
import { ChipMarking } from "../details/ChipMarking";

const LINES = [
  { text: "STEPPING MOTOR", size: 0.8 },
  { text: "17HS4401S", size: 1.3, weight: 700 as const },
  { text: "1.7A  1.8° / STEP", size: 0.8 },
];
// Scratch vector for the one orientation check each label makes on mount.
const axis = new Vector3();

/**
 * The white rating label stuck across the stator on the -Z face, over the
 * lamination ridges. The same motor stands shaft up on the Z axis and lies
 * on its side behind each pump, so on mount the label checks which way the
 * motor points in the scene and turns its print to read upright.
 */
export function StepperLabel({ z }: { z: number }) {
  const ref = useRef<Group>(null);
  const [shaftDown, setShaftDown] = useState(true);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.updateWorldMatrix(true, false);
    axis.setFromMatrixColumn(group.matrixWorld, 1);
    setShaftDown(axis.y < 0);
  }, []);
  return (
    <group ref={ref} position={[0, 0, z]}>
      <Block size={[0.32, 0.2, 0.004]} material="labelWhite" />
      <ChipMarking lines={LINES} position={[0, 0, -0.0025]} rotation={[0, Math.PI, shaftDown ? Math.PI : 0]} width={0.28} height={0.15} ink="etch" />
    </group>
  );
}
