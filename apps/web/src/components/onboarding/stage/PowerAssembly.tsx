"use client";
import { useRef, useState } from "react";
import type { Group } from "three";
import { Block, Cylinder, SceneLabel, Tube, type Vec3 } from "@/components/three";
import { PLUG_SEATED_X, PLUG_START_X, PLUG_Y, PLUG_Z } from "./bench-layout";
import { useOnePass } from "./use-one-pass";

interface PowerAssemblyProps {
  /** Animate the plug in. False shows it already seated. */
  play: boolean;
  /** Name the plug. Only the power step does. */
  emphasize?: boolean;
  /** The plug is in, so the Pi can show its power light. */
  onSeated?: () => void;
}

/** The cable leaves the plug along -X, drops to the bench and runs off to the left. */
const CABLE: Vec3[] = [
  [-0.4, 0, 0],
  [-0.6, -0.04, 0.02],
  [-0.85, -0.085, 0.14],
  [-1.25, -0.085, 0.42],
  [-1.8, -0.085, 0.66],
];

/** Above the plug's body, in plug space. */
const PLUG_LABEL: Vec3 = [-0.24, 0.06, 0];

/**
 * A USB-C power plug with its cable, drawn in plug space: the tip's front
 * edge is at x = 0 and everything else trails off toward -X.
 */
function UsbCPlug() {
  return (
    <group>
      <Block position={[-0.06, 0, 0]} size={[0.12, 0.034, 0.078]} radius={0.015} material="steel" />
      <Block position={[-0.23, 0, 0]} size={[0.22, 0.085, 0.13]} radius={0.035} material="plasticWhite" />
      <Cylinder position={[-0.37, 0, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.032} height={0.08} taper={0.8} material="plasticWhite" />
      <Tube points={CABLE} radius={0.024} material="plasticWhite" />
    </group>
  );
}

/**
 * Power step: the USB-C plug slides into the Pi's power port. Once it's
 * in, the scene lights the Pi's power LED.
 */
export function PowerAssembly({ play, emphasize = false, onSeated }: PowerAssemblyProps) {
  const plug = useRef<Group>(null);
  const [seated, setSeated] = useState(!play);

  useOnePass({
    duration: 1.4,
    delay: 0.5,
    play,
    apply: (progress) => {
      if (plug.current) plug.current.position.x = PLUG_START_X + (PLUG_SEATED_X - PLUG_START_X) * progress;
    },
    onDone: () => {
      setSeated(true);
      onSeated?.();
    },
  });

  return (
    <group>
      <group ref={plug} position={[PLUG_SEATED_X, PLUG_Y, PLUG_Z]}>
        <UsbCPlug />
        {/* Riding on the plug keeps the pill off the port it's heading for. */}
        {emphasize ? <SceneLabel text="USB-C power" position={PLUG_LABEL} tone={seated ? "accent" : "plain"} /> : null}
      </group>
    </group>
  );
}
