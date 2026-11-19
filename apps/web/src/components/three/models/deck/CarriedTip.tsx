"use client";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import { taperGeometry } from "../../geometries";
import { getMaterial } from "../../materials";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { TIP_SHAPE } from "./labware-layout";
import { TipBody } from "./TipBody";

const { length, point, taper } = TIP_SHAPE;

/**
 * Spent media passing up through a carried tip while the aspiration pump
 * draws: the tip's own cone, a little narrower, scaled about the point. A
 * cone scaled evenly keeps its shape, so the liquid always fits the tip;
 * its height goes with the cube root of the volume.
 */
function TipLiquid() {
  const scaler = useRef<Group>(null);
  const liquid = useRef<Mesh>(null);
  usePoseFrame(
    (pose) => {
      const group = scaler.current;
      if (!group || !liquid.current) return;
      group.visible = pose.tip && pose.fill > 0.005;
      group.scale.setScalar(Math.cbrt(Math.max(pose.fill, 0.001)));
    },
    () => {
      if (scaler.current) scaler.current.visible = false;
    },
  );
  return (
    <group ref={scaler} visible={false}>
      {/* Drawn after the tip: the tip writes no depth, so its tinted wall would otherwise wash the colour out. */}
      <mesh
        ref={liquid}
        renderOrder={2}
        geometry={taperGeometry(taper)}
        material={getMaterial("wasteAmber")}
        position={[0, (length * 0.88) / 2 + 0.004, 0]}
        scale={[point * 0.7, length * 0.88, point * 0.7]}
        dispose={null}
      />
    </group>
  );
}

/**
 * The tip on the dispense head's nose, origin at its point. It is always
 * there on the still machine; in the Home demo it comes and goes as tips are
 * picked up and stripped, and shows the spent media the aspiration line
 * draws through it.
 */
export function CarriedTip() {
  const group = useRef<Group>(null);
  usePoseFrame(
    (pose) => {
      if (group.current) group.current.visible = pose.tip;
    },
    () => {
      if (group.current) group.current.visible = true;
    },
  );
  return (
    <group ref={group}>
      <TipBody />
      <TipLiquid />
    </group>
  );
}
