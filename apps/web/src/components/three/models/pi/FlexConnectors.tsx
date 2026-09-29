"use client";
import type { MaterialKey } from "../../materials";
import { Block, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { at, FLEX_SLOT_OFFSET, mmX, mmY, mmZ, PI_PARTS, TOP } from "./layout";

const BODY: Vec3 = [mmX(5.5), mmY(3.6), mmZ(21)];
const LATCH: Vec3 = [0.03, 0.014, BODY[2] - 0.02];
/** Metal hold-down tabs at both ends, soldered to the board. */
const TABS: RepeatItem[] = [-1, 1].map((end) => ({ position: [0, TOP + 0.01, end * (BODY[2] / 2 + 0.005)], scale: [BODY[0] * 0.6, 0.02, 0.01] }));
/** Reads along the connector, lying flat on the board. */
const ALONG: Vec3 = [-Math.PI / 2, 0, Math.PI / 2];

interface FlexConnectorProps {
  drawing: readonly [number, number];
  label: string;
  /** Latch side: 1 puts it toward +X, -1 mirrors the connector. */
  side?: 1 | -1;
  /** Paints the body in the accent so onboarding can point at it. */
  emphasis?: boolean;
}

/**
 * A vertical entry flex connector (the CSI camera and DSI display ports):
 * a pale moulded body, the dark pull-up latch across the top, the open
 * slot the ribbon drops into, and metal hold-down tabs at both ends.
 */
function FlexConnector({ drawing, label, side = 1, emphasis = false }: FlexConnectorProps) {
  const [x, z] = at(drawing[0], drawing[1]);
  const body: MaterialKey = emphasis ? "accent" : "plasticWhite";
  const top = TOP + BODY[1];
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, TOP + BODY[1] / 2, 0]} size={BODY} radius={0.003} material={body} />
      <Block position={[side * 0.017, top + LATCH[1] / 2, 0]} size={LATCH} radius={0.003} material="plasticBlack" />
      <Block position={[side * FLEX_SLOT_OFFSET, top + 0.0005, 0]} size={[0.011, 0.002, BODY[2] - 0.05]} material="rubber" />
      <Repeat items={TABS} material="steel" />
      <TextDecal text={label} position={[-side * (BODY[0] / 2 + 0.028), TOP + 0.001, 0]} rotation={ALONG} width={0.12} height={0.022} />
    </group>
  );
}

/** The camera (CSI) and display (DSI) ports. `emphasiseCamera` lights the CSI body in the accent. */
export function FlexConnectors({ emphasiseCamera = false }: { emphasiseCamera?: boolean }) {
  return (
    <group>
      <FlexConnector drawing={PI_PARTS.csi} label="CAMERA" emphasis={emphasiseCamera} />
      <FlexConnector drawing={PI_PARTS.dsi} label="DISPLAY" side={-1} />
    </group>
  );
}
