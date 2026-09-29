"use client";
import { memo, useRef } from "react";
import type { Group } from "three";
import { PART_MODELS, PrinterFrameModel } from "@/components/three/models";
import { HARDWARE_PARTS } from "@/data/hardware-parts";
import { useOnePass } from "./use-one-pass";

/** The Pi and camera have just proven themselves, so their LEDs are lit. */
const LIVE_PARTS = new Set(["raspberry_pi", "camera"]);
/** Radians the machine turns through while settling, ending square to the three quarter view. */
const TURN = 0.45;

/** Every part in its place on the machine. Nothing here changes, so it never re-renders. */
const MachineParts = memo(function MachineParts() {
  return (
    <>
      {HARDWARE_PARTS.map((part) => {
        const Model = PART_MODELS[part.model];
        return (
          <group key={part.id} position={part.position} rotation={part.rotation}>
            <Model live={LIVE_PARTS.has(part.id)} />
          </group>
        );
      })}
    </>
  );
});

/**
 * The Ready step: the whole Autolab, assembled, with the Pi and camera
 * lit. It turns slowly into place once, then rests.
 */
export function ReadyMachine() {
  const turn = useRef<Group>(null);

  useOnePass({
    duration: 4,
    delay: 0.3,
    apply: (progress) => {
      if (turn.current) turn.current.rotation.y = -TURN * (1 - progress);
    },
  });

  return (
    <group ref={turn}>
      <PrinterFrameModel />
      <MachineParts />
    </group>
  );
}
