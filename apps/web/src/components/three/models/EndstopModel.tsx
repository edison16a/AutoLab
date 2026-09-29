"use client";
import { Block, Board } from "../primitives";
import { MicroswitchModel } from "./MicroswitchModel";

/** A printer endstop: small board, a connector and a scaled lever switch. Shared by X, Y and Z. */
export function EndstopModel() {
  return (
    <group>
      <Board size={[0.3, 0.025, 0.2]} />
      <Block position={[-0.12, 0.045, 0]} size={[0.07, 0.065, 0.1]} material="plasticWhite" />
      <group position={[0, 0.09, 0]} scale={0.65}>
        <MicroswitchModel />
      </group>
    </group>
  );
}
