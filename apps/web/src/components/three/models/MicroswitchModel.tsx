"use client";
import { Block, Ring } from "../primitives";

/** A lever microswitch: black body, two mounting holes, three tabs and a steel lever. */
export function MicroswitchModel() {
  return (
    <group>
      <Block size={[0.28, 0.15, 0.12]} radius={0.01} material="plasticBlack" />
      {[-0.095, 0.095].map((x) => (
        <group key={x} position={[x, 0, 0.064]} rotation={[Math.PI / 2, 0, 0]}>
          <Ring radius={0.023} material="aluminium" />
        </group>
      ))}
      {[-0.09, 0, 0.09].map((x) => (
        <Block key={x} position={[x, -0.105, 0]} size={[0.022, 0.065, 0.012]} material="steel" />
      ))}
      <Block position={[0.04, 0.12, 0]} size={[0.35, 0.025, 0.09]} rotation={[0, 0, -0.25]} material="steel" />
      <Block position={[0.1, 0.08, 0]} size={[0.04, 0.07, 0.05]} material="plasticGrey" />
    </group>
  );
}
