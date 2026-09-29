"use client";
import { CameraBoard } from "./camera/CameraBoard";
import { Lens } from "./camera/Lens";
import { LensMount } from "./camera/LensMount";
import type { PartModelProps } from "./model-props";

export interface CameraModelProps extends PartModelProps {
  /** Lights the status LED. Defaults to `live`, which is what the parts registry passes. */
  online?: boolean;
}

/**
 * Raspberry Pi HQ Camera with the 6 mm CS lens, hanging lens down (-Y) as
 * it sits in the dock. The board is centred on the origin with the ribbon
 * socket on its +X edge and the tripod block toward -Z, so the inspect
 * view (lens toward you) shows the tripod underneath like a real camera.
 */
export function CameraModel({ live = false, online = live }: CameraModelProps) {
  return (
    <group>
      <CameraBoard online={online} />
      <LensMount />
      <Lens />
    </group>
  );
}
