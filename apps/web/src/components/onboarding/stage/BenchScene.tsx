"use client";
import { useState } from "react";
import { RaspberryPiModel } from "@/components/three/models/RaspberryPiModel";
import { STEP, type StepIndex } from "../wizard-steps";
import { PI_POSITION } from "./bench-layout";
import { CameraAssembly } from "./CameraAssembly";
import { NetworkLinks } from "./NetworkLinks";
import { PowerAssembly } from "./PowerAssembly";

interface BenchSceneProps {
  /** Camera, Power, Discover or Device. */
  step: StepIndex;
  wifi: boolean;
  gateway: boolean;
}

/**
 * The setup bench for the first four steps. Each step adds its piece to
 * what earlier steps built, so the Pi keeps its camera and power cable as
 * the network appears. Only the current step's piece animates. Remount it
 * (change its key) to replay.
 */
export function BenchScene({ step, wifi, gateway }: BenchSceneProps) {
  // The power light comes on when the plug lands, and stays on after that step.
  const [powered, setPowered] = useState(step > STEP.power);

  return (
    <group>
      <group position={PI_POSITION}>
        <RaspberryPiModel live={powered} />
      </group>
      <CameraAssembly play={step === STEP.camera} emphasize={step === STEP.camera} />
      {step >= STEP.power ? (
        <PowerAssembly play={step === STEP.power} emphasize={step === STEP.power} onSeated={() => setPowered(true)} />
      ) : null}
      {step >= STEP.discover ? (
        <NetworkLinks reach={step === STEP.device ? "gateway" : "router"} play wifi={wifi} gateway={gateway} />
      ) : null}
    </group>
  );
}
