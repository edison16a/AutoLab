"use client";
import { Block, Board, Chip, Pins, TextDecal } from "../primitives";

/** Raspberry Pi Pico: RP2040, micro USB at one end and a castellated header down each side. */
export function PicoModel() {
  return (
    <group>
      <Board size={[0.34, 0.035, 0.72]} />
      <Chip position={[0, 0.06, 0]} size={[0.15, 0.04, 0.15]} />
      <TextDecal text="RP2040" position={[0, 0.082, 0]} width={0.13} height={0.027} />
      <TextDecal text="PICO" position={[0, 0.02, -0.23]} width={0.16} height={0.055} />
      <Block position={[0, 0.046, 0.17]} size={[0.07, 0.045, 0.075]} material="plasticWhite" />
      <Block position={[0, 0.07, 0.33]} size={[0.16, 0.1, 0.12]} radius={0.01} material="steel" />
      <Block position={[0, 0.07, 0.391]} size={[0.12, 0.052, 0.004]} material="plasticBlack" />
      {[-0.14, 0.14].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Pins count={20} length={0.6} />
        </group>
      ))}
    </group>
  );
}
