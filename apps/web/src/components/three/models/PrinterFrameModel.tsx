"use client";
import { ChamberFixtures } from "./machine/ChamberFixtures";
import { PiPlatform } from "./machine/PiPlatform";
import { Enclosure } from "./machine/Enclosure";
import { Gantry } from "./machine/Gantry";
import { ToolCarriage } from "./machine/ToolCarriage";

/**
 * Everything on the machine that isn't a selectable part: the enclosure
 * around the converted Ender-3 V3 SE, its gantry and the pipette tool's
 * frame, the brackets inside the chamber and the white platform outside
 * where the bare Pi, Pico and pH board sit. Laid out like the system
 * design sketch. Parts are drawn on top of this by the scene, each at its
 * registry position.
 */
export function PrinterFrameModel() {
  return (
    <group>
      <Enclosure />
      <Gantry />
      <ToolCarriage />
      <ChamberFixtures />
      <PiPlatform />
    </group>
  );
}
