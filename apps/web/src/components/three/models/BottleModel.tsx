"use client";
import { getMaterial, type MaterialKey } from "../materials";
import { Cylinder, Repeat, Ring, TextDecal, Tube, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { wrapBand } from "./geometry/shapes";

/** Both bottles share one silhouette: body, shoulder, neck and a GL45 style cap. Heights from the base. */
const R = 0.27;
const Y = { shoulder: 0.62, neck: 0.74, cap: 0.8, top: 0.92 } as const;
const CAP_R = 0.145;
// Grip ribs round the cap, one instanced batch.
const RIBS: RepeatItem[] = Array.from({ length: 28 }, (_, i) => {
  const a = (i * Math.PI * 2) / 28;
  return { position: [Math.sin(a) * CAP_R, (Y.cap + Y.top) / 2, Math.cos(a) * CAP_R] as Vec3, rotation: [0, a, 0] as Vec3 };
});
const RIB_SCALE: Vec3 = [0.012, Y.top - Y.cap - 0.02, 0.01];
/** White enamel volume marks up the media bottle, just to the right of the label. */
const MARK_ANGLE = 0.9;
const MARKS: RepeatItem[] = [0.14, 0.24, 0.34, 0.44, 0.54].map((y, i) => ({
  position: [Math.sin(MARK_ANGLE) * (R + 0.001), y, Math.cos(MARK_ANGLE) * (R + 0.001)] as Vec3,
  rotation: [0, MARK_ANGLE, 0] as Vec3,
  scale: [i % 2 ? 0.05 : 0.08, 0.006, 0.002] as Vec3,
}));
/** The vent line from the cap to a syringe filter, which keeps the media sterile as it's drawn down. */
const VENT: Vec3[] = [
  [0.07, Y.top, 0],
  [0.08, Y.top + 0.08, 0],
  [0.14, Y.top + 0.12, 0],
  [0.2, Y.top + 0.1, 0],
];

/** Neck, pouring ring and ribbed screw cap, shared by both bottles. */
function Cap({ body, cap }: { body: MaterialKey; cap: MaterialKey }) {
  return (
    <group>
      <Cylinder position={[0, (Y.shoulder + Y.neck) / 2, 0]} radius={R} taper={0.46} height={Y.neck - Y.shoulder} material={body} />
      <Cylinder position={[0, (Y.neck + Y.cap) / 2, 0]} radius={0.12} height={Y.cap - Y.neck} material={body} />
      <Ring position={[0, Y.neck + 0.015, 0]} radius={0.13} material={cap} />
      <Cylinder position={[0, (Y.cap + Y.top) / 2, 0]} radius={CAP_R} height={Y.top - Y.cap} material={cap} />
      <Repeat items={RIBS} material={cap} scale={RIB_SCALE} />
    </group>
  );
}

/** A white paper label wrapped round the front of the body. */
function Label({ text }: { text: string }) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh geometry={wrapBand(R + 0.003, 0.14, 1.2)} material={getMaterial("labelWhite")} receiveShadow dispose={null} />
      <TextDecal text={text} position={[0, 0, R + 0.006]} rotation={[0, 0, 0]} width={0.22} height={0.07} ink="dark" weight={600} />
    </group>
  );
}

/**
 * The fresh media supply: a clear glass lab bottle two thirds full of pink
 * media, with white enamel volume marks, a label, and the blue screw cap
 * and pouring ring these bottles ship with. The cap has two ports: the
 * access port the pipette tip goes through, and a vent line to a sterile
 * syringe filter. Origin at the base.
 */
export function MediaBottleModel() {
  return (
    <group>
      <Cylinder position={[0, Y.shoulder / 2, 0]} radius={R} height={Y.shoulder} material="glass" />
      <Cylinder position={[0, 0.22, 0]} radius={R - 0.015} height={0.42} material="mediaPink" />
      <Repeat items={MARKS} material="plasticWhite" />
      <Label text="Media" />
      <Cap body="glass" cap="capBlue" />
      <Cylinder position={[0, Y.top + 0.012, 0]} radius={0.045} height={0.024} material="steel" />
      <Cylinder position={[0, Y.top + 0.02, 0]} radius={0.028} height={0.012} material="rubber" />
      <Cylinder position={[0.07, Y.top + 0.01, 0]} radius={0.018} height={0.02} low material="steel" />
      <Tube points={VENT} radius={0.012} material="tubing" segments={24} />
      <group position={[0.24, Y.top + 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Cylinder radius={0.06} height={0.03} material="plasticWhite" />
        <Cylinder position={[0, 0.03, 0]} radius={0.012} height={0.04} low material="plasticWhite" />
      </group>
    </group>
  );
}

/**
 * The waste container: a milky natural HDPE bottle, a third full of spent
 * media gone amber, with a red cap to mark it as waste and a wide funnel
 * the pipette dispenses into. Origin at the base.
 */
export function WasteContainerModel() {
  return (
    <group>
      <Cylinder position={[0, Y.shoulder / 2, 0]} radius={R} height={Y.shoulder} material="hdpeThin" />
      <Cylinder position={[0, 0.13, 0]} radius={R - 0.015} height={0.24} material="wasteAmber" />
      {[0.06, Y.shoulder - 0.06].map((y) => (
        <Ring key={y} position={[0, y, 0]} radius={R} thin material="hdpeThin" />
      ))}
      <Label text="Waste" />
      <Cap body="hdpeThin" cap="capRed" />
      <Cylinder position={[0, Y.top + 0.06, 0]} radius={0.05} taper={3.2} height={0.12} material="hdpeNatural" />
      <Ring position={[0, Y.top + 0.12, 0]} radius={0.16} thin material="hdpeNatural" />
    </group>
  );
}
