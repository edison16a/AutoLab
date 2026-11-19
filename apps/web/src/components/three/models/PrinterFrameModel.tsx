"use client";
import { FallingTip } from "./deck/FallingTip";
import { FlowDriver } from "./fluidics/FlowTube";
import { ChamberFixtures } from "./machine/ChamberFixtures";
import { FluidicsPlatform } from "./machine/FluidicsPlatform";
import { PiPlatform } from "./machine/PiPlatform";
import { Enclosure } from "./machine/Enclosure";
import { Gantry } from "./machine/Gantry";
import { ToolCarriage } from "./machine/ToolCarriage";
import { Wiring } from "./machine/wiring/Wiring";

/**
 * Everything on the machine that isn't a selectable part: the enclosure
 * around the converted Ender-3 V3 SE, its gantry and the dispense head's
 * backplate, the brackets inside the chamber, the white platforms outside
 * (the Pi and pH board on the right, the fluidics on the left), and the
 * wiring and tubing between them. Laid out like the system design sketch
 * and the fluidics sketch. Parts are drawn on top of this by the scene,
 * each at its registry position.
 */
export function PrinterFrameModel() {
  return (
    <group>
      <Enclosure />
      <Gantry />
      <ToolCarriage />
      <ChamberFixtures />
      <PiPlatform />
      <FluidicsPlatform />
      <Wiring />
      <FallingTip />
      <FlowDriver />
    </group>
  );
}
