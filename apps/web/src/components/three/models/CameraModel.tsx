"use client";
import { Block, Board, Bolt, Cylinder, Repeat, Ring, TextDecal, type RepeatItem } from "../primitives";
import type { PartModelProps } from "./model-props";

// The knurled focus ring, as one instanced batch instead of 32 meshes.
const KNURLS: RepeatItem[] = Array.from({ length: 32 }, (_, i) => {
  const a = (i * Math.PI * 2) / 32;
  return { position: [Math.sin(a) * 0.195, -0.235, Math.cos(a) * 0.195], rotation: [0, a, 0] };
});
const CORNERS: [number, number][] = [-0.24, 0.24].flatMap((x) => [-0.24, 0.24].map((z) => [x, z] as [number, number]));

/**
 * Raspberry Pi HQ camera: the square board with the C/CS mount and lens
 * hanging below it (lens toward -Y), the ribbon connector on +X. The
 * status LED lights in the accent while the camera is streaming.
 */
export function CameraModel({ live = false }: PartModelProps) {
  return (
    <group>
      <Board size={[0.6, 0.028, 0.6]} />
      <Block position={[0, -0.042, 0]} size={[0.36, 0.06, 0.36]} material="plasticBlack" />
      <Cylinder position={[0, -0.1, 0]} radius={0.235} height={0.1} material="aluminium" />
      <Cylinder position={[0, -0.24, 0]} radius={0.195} height={0.23} material="plasticBlack" />
      {[-0.145, -0.2, -0.29, -0.345].map((y) => (
        <Ring key={y} position={[0, y, 0]} radius={0.19} material="graphite" thin />
      ))}
      <Repeat items={KNURLS} material="graphite" scale={[0.009, 0.085, 0.012]} />
      <Cylinder position={[0, -0.365, 0]} radius={0.148} height={0.025} material="plasticBlack" />
      <Cylinder position={[0, -0.38, 0]} radius={0.128} height={0.006} material="glass" />
      <Ring position={[0, -0.38, 0]} radius={0.139} material="graphite" thin />
      {CORNERS.map(([x, z]) => (
        <Bolt key={`${x}${z}`} position={[x, 0.026, z]} radius={0.022} />
      ))}
      <Block position={[0.23, 0.052, 0]} size={[0.065, 0.073, 0.3]} material="plasticWhite" />
      <Block position={[0.23, 0.092, 0]} size={[0.018, 0.008, 0.27]} material="plasticBlack" />
      <TextDecal text="HQ CAMERA" position={[-0.06, 0.016, 0.22]} width={0.27} height={0.042} />
      <Block position={[-0.15, 0.04, -0.12]} size={[0.13, 0.035, 0.12]} material="plasticBlack" />
      <Cylinder position={[-0.24, 0.025, 0.15]} radius={0.012} height={0.014} low material={live ? "ledOn" : "ledOff"} />
    </group>
  );
}
