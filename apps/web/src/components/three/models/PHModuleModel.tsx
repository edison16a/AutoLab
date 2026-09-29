"use client";
import { Block, Board, Cylinder, Pins, Ring, TextDecal } from "../primitives";

/** Atlas Scientific EZO-pH carrier: the module, a BNC socket for the probe and a header. */
export function PHModuleModel() {
  return (
    <group>
      <Board size={[0.5, 0.04, 0.35]} />
      <Block position={[0, 0.07, 0]} size={[0.22, 0.09, 0.18]} radius={0.012} material="plasticWhite" />
      <TextDecal text="EZO pH" position={[0, 0.117, 0]} width={0.19} height={0.048} ink="dark" />
      <group position={[-0.23, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Cylinder radius={0.055} height={0.15} material="steel" />
        <Ring position={[0, 0.08, 0]} radius={0.045} material="steel" />
      </group>
      <group position={[0, 0.04, 0.16]}>
        <Pins count={6} length={0.4} />
      </group>
    </group>
  );
}
