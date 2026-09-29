"use client";
import { useRef } from "react";
import type { Group } from "three";
import { partById } from "@/data/hardware-parts";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { CHUTE_SLOTS } from "./chute-slots";
import { TIP_SHAPE } from "./labware-layout";
import { TipBody } from "./TipBody";

/** The chute's slots are in the heated platform's space; this draws in the machine's. */
const PLATFORM = partById.heated_platform.position;
/** Share of the fall spent dropping straight down before the tip topples onto its side. */
const DROP = 0.55;

/**
 * A tip on its way from the nose into the chute after an eject, in the Home
 * demo only. It drops straight down onto its point, then topples into the
 * next free slot, where the chute's own copy takes over as it lands.
 */
export function FallingTip() {
  const group = useRef<Group>(null);
  usePoseFrame(
    (pose) => {
      const node = group.current;
      if (!node) return;
      node.visible = pose.drop >= 0;
      if (!node.visible) return;
      const [x0, top, z0] = pose.dropAt;
      const y0 = top - TIP_SHAPE.length;
      const slot = CHUTE_SLOTS[Math.min(pose.chuteTips, CHUTE_SLOTS.length - 1)];
      const floor = PLATFORM[1] + slot.point[1];
      if (pose.drop < DROP) {
        const fall = (pose.drop / DROP) ** 2;
        node.position.set(x0, y0 + (floor - y0) * fall, z0);
        node.rotation.set(0, 0, 0);
        return;
      }
      const v = (pose.drop - DROP) / (1 - DROP);
      const settle = 1 - (1 - v) ** 3;
      node.position.set(
        x0 + (PLATFORM[0] + slot.point[0] - x0) * settle,
        floor,
        z0 + (PLATFORM[2] + slot.point[2] - z0) * settle,
      );
      node.rotation.set(slot.tilt * settle, slot.yaw * settle, 0, "YXZ");
    },
    () => {
      if (group.current) group.current.visible = false;
    },
  );
  return (
    <group ref={group} visible={false}>
      <TipBody />
    </group>
  );
}
