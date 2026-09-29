"use client";
import type { PartModelProps } from "./model-props";
import { EdgeConnectors } from "./pi/EdgeConnectors";
import { FlexConnectors } from "./pi/FlexConnectors";
import { NetworkPorts } from "./pi/NetworkPorts";
import { PiBoard } from "./pi/PiBoard";
import { PinHeaders } from "./pi/PinHeaders";
import { Silicon } from "./pi/Silicon";
import { SmdParts } from "./pi/SmdParts";

export interface RaspberryPiModelProps extends PartModelProps {
  /** Lights the status and Ethernet LEDs. Defaults to `live`, which is what the parts registry passes. */
  powered?: boolean;
  /** Paints one connector in the accent, for setup steps that point at it. */
  highlight?: "csi" | "power";
}

/**
 * Raspberry Pi 4 Model B, component side up, network ports facing +X and
 * the micro-HDMI edge facing +Z. The board is 1.05 x 0.72 units centred
 * on the origin, which the parts registry's hit box is built around. The
 * layout follows the official drawing (see pi/layout.ts).
 */
export function RaspberryPiModel({ live = false, powered = live, highlight }: RaspberryPiModelProps) {
  return (
    <group>
      <PiBoard />
      <Silicon />
      <SmdParts powered={powered} />
      <PinHeaders />
      <FlexConnectors emphasiseCamera={highlight === "csi"} />
      <EdgeConnectors emphasisePower={highlight === "power"} />
      <NetworkPorts powered={powered} />
    </group>
  );
}
