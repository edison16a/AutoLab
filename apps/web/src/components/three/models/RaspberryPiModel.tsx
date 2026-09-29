"use client";
import { Block, Board, Chip, Cylinder, Pins, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { PartModelProps } from "./model-props";

// Passive components scattered near the SoC, drawn as one batch.
const PASSIVES: RepeatItem[] = Array.from({ length: 10 }, (_, i) => ({
  position: [-0.42 + (i % 5) * 0.06, 0.022, -0.21 + Math.floor(i / 5) * 0.04],
}));
const USB_CONTACTS: RepeatItem[] = [-0.038, -0.012, 0.012, 0.038].map((z) => ({ position: [0.01, -0.002, z] }));

/** One double USB stack on the +X edge. */
function UsbStack({ z }: { z: number }) {
  return (
    <group position={[0.43, 0.13, z]}>
      <Block size={[0.24, 0.24, 0.18]} material="steel" />
      {[0.06, -0.06].map((y) => (
        <group key={y} position={[0.122, y, 0]}>
          <Block size={[0.004, 0.084, 0.142]} material="plasticBlack" />
          <Block position={[0.004, -0.016, 0]} size={[0.008, 0.025, 0.11]} material="plasticGrey" />
          <Repeat items={USB_CONTACTS} material="steel" scale={[0.006, 0.008, 0.006]} />
        </group>
      ))}
    </group>
  );
}

/**
 * Raspberry Pi 4 Model B, component side up, ports facing +X. The power
 * LED lights in the accent while the Pi is online.
 */
export function RaspberryPiModel({ live = false }: PartModelProps) {
  return (
    <group>
      <Board size={[1.05, 0.025, 0.72]} />
      <Chip position={[-0.09, 0.044, 0.005]} size={[0.23, 0.055, 0.23]} />
      <Block position={[-0.09, 0.075, 0.005]} size={[0.19, 0.009, 0.19]} radius={0.004} material="aluminium" />
      <TextDecal text="BCM2711" position={[-0.09, 0.081, 0.005]} width={0.17} height={0.03} ink="dark" />
      <Chip position={[0.18, 0.038, 0]} size={[0.14, 0.04, 0.19]} />
      <Chip position={[-0.33, 0.034, -0.13]} size={[0.13, 0.028, 0.12]} />
      <UsbStack z={-0.21} />
      <UsbStack z={0.01} />
      {/* Ethernet jack. */}
      <group position={[0.4, 0.15, 0.255]}>
        <Block size={[0.28, 0.27, 0.2]} material="steel" />
        <Block position={[0.142, 0, 0]} size={[0.006, 0.18, 0.16]} material="plasticBlack" />
        <Block position={[0.147, -0.072, 0]} size={[0.008, 0.055, 0.072]} material="rubber" />
      </group>
      {/* GPIO header. */}
      <Block position={[-0.13, 0.044, -0.303]} size={[0.64, 0.055, 0.085]} material="plasticBlack" />
      {[-0.025, 0.025].map((z) => (
        <group key={z} position={[-0.13, 0.035, -0.303 + z]}>
          <Pins count={20} length={0.6} />
        </group>
      ))}
      {/* USB-C power. */}
      <group position={[-0.45, 0.042, 0.21]}>
        <Block size={[0.15, 0.07, 0.105]} radius={0.02} material="steel" />
      </group>
      {/* Micro HDMI pair. */}
      {[-0.26, -0.065].map((x) => (
        <Block key={x} position={[x, 0.029, 0.327]} size={[0.12, 0.047, 0.07]} radius={0.01} material="steel" />
      ))}
      {/* CSI camera connector, where the ribbon lands. */}
      <Block position={[-0.25, 0.056, 0.08]} size={[0.06, 0.085, 0.31]} material="plasticWhite" />
      <Block position={[-0.251, 0.1, 0.08]} size={[0.02, 0.008, 0.27]} material="plasticBlack" />
      <Cylinder position={[0.18, 0.034, 0.285]} rotation={[Math.PI / 2, 0, 0]} radius={0.05} height={0.14} material="plasticBlack" />
      <Repeat items={PASSIVES} material="steel" scale={[0.029, 0.018, 0.014]} />
      <TextDecal text="Raspberry Pi 4" position={[0.02, 0.014, 0.2]} width={0.28} height={0.044} />
      <TextDecal text="GPIO" position={[-0.17, 0.014, -0.235]} width={0.13} height={0.028} />
      <Cylinder position={[-0.47, 0.025, -0.19]} radius={0.014} height={0.018} low material={live ? "ledOn" : "ledOff"} />
      <Block position={[-0.4, -0.047, 0]} size={[0.22, 0.04, 0.19]} material="steel" />
    </group>
  );
}
