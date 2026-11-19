"use client";
import { useRef } from "react";
import type { Mesh } from "three";
import { unitGeometry } from "../geometries";
import { getMaterial, receivesShadow, type MaterialKey } from "../materials";
import type { MachinePose } from "../motion/pose";
import { usePoseFrame } from "../motion/use-pose-frame";
import { Cylinder, Repeat, Ring, TextDecal, Tube, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { BOTTLE_REST } from "./deck/labware-layout";
import { wrapBand } from "./geometry/shapes";

/** Every bottle shares one silhouette: body, shoulder, neck and a GL45 style cap. Heights from the base. */
const R = 0.27;
const Y = { shoulder: 0.62, neck: 0.74, cap: 0.8, top: 0.92 } as const;
const CAP_R = 0.145;
/**
 * The see through bodies stand a hair off the floor. Clear materials don't
 * write depth, so a base flush with the floor flickers against it in a
 * star of wedges.
 */
const LIFT = 0.002;
/** The tallest the liquid stands, just under the shoulder. */
const FULL = Y.shoulder - 0.03;
// Grip ribs round the cap, one instanced batch.
const RIBS: RepeatItem[] = Array.from({ length: 28 }, (_, i) => {
  const a = (i * Math.PI * 2) / 28;
  return { position: [Math.sin(a) * CAP_R, (Y.cap + Y.top) / 2, Math.cos(a) * CAP_R] as Vec3, rotation: [0, a, 0] as Vec3 };
});
const RIB_SCALE: Vec3 = [0.012, Y.top - Y.cap - 0.02, 0.01];
/** White enamel volume marks up the glass bottles, just to the right of the label. */
const MARK_ANGLE = 0.9;
const MARKS: RepeatItem[] = [0.14, 0.24, 0.34, 0.44, 0.54].map((y, i) => ({
  position: [Math.sin(MARK_ANGLE) * (R + 0.001), y, Math.cos(MARK_ANGLE) * (R + 0.001)] as Vec3,
  rotation: [0, MARK_ANGLE, 0] as Vec3,
  scale: [i % 2 ? 0.05 : 0.08, 0.006, 0.002] as Vec3,
}));

/** Top of a port fitting on the cap, where a line pushes on. */
const PORT_TOP = Y.top + 0.035;
const PAIR = 0.06;

/**
 * Where the fluid lines join each bottle's cap, in the bottle's space. The
 * media bottle has one dip tube; the cleaner feeds both selector valves and
 * the waste takes a line from each, so they have two.
 */
export const BOTTLE_PORTS = {
  media: [[0, PORT_TOP, 0]] as Vec3[],
  cleaner: [[-PAIR, PORT_TOP, 0], [PAIR, PORT_TOP, 0]] as Vec3[],
  waste: [[-PAIR, PORT_TOP, 0], [PAIR, PORT_TOP, 0]] as Vec3[],
};

/** The vent line on the media bottle, from the cap to a syringe filter, which keeps the media sterile as it's drawn down. */
const MEDIA_VENT: Vec3[] = [
  [0.09, Y.top, 0],
  [0.1, Y.top + 0.08, 0],
  [0.16, Y.top + 0.12, 0],
  [0.22, Y.top + 0.1, 0],
];
/** The vent line toward the back of the other caps, ending in a filter disc. */
const BACK_VENT: Vec3[] = [
  [0, Y.top, -0.08],
  [0, Y.top + 0.08, -0.09],
  [0, Y.top + 0.13, -0.15],
  [0, Y.top + 0.12, -0.21],
];

/** Neck, pouring ring and ribbed screw cap, shared by every bottle. */
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

/** A stainless port through the cap, with the dip tube that hangs from it to near the bottle's floor. */
function Port({ at: [x, , z] }: { at: Vec3 }) {
  return (
    <group position={[x, 0, z]}>
      <Cylinder position={[0, Y.top + 0.012, 0]} radius={0.026} height={0.024} low material="steel" />
      <Cylinder position={[0, PORT_TOP - 0.008, 0]} radius={0.016} height={0.022} low material="steel" />
      <Cylinder position={[0, (0.03 + Y.cap) / 2, 0]} radius={0.01} height={Y.cap - 0.03} low material="tubing" />
    </group>
  );
}

/** A filter disc on the end of a vent line: 0.2 µm on the media and cleaner, a hydrophobic trap filter on the waste. */
function VentFilter({ points, turn }: { points: Vec3[]; turn: Vec3 }) {
  const end = points[points.length - 1];
  return (
    <group>
      <Tube points={points} radius={0.012} material="tubing" segments={24} />
      <group position={end} rotation={turn}>
        <Cylinder radius={0.06} height={0.03} material="plasticWhite" />
        <Cylinder position={[0, 0.03, 0]} radius={0.012} height={0.04} low material="plasticWhite" />
      </group>
    </group>
  );
}

/** A white paper label wrapped round the front of the body. */
function Label({ text }: { text: string }) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh geometry={wrapBand(R + 0.003, 0.14, 1.2)} material={getMaterial("labelWhite")} receiveShadow dispose={null} />
      <TextDecal text={text} position={[0, 0, R + 0.006]} rotation={[0, 0, 0]} width={0.26} height={0.07} ink="dark" weight={600} />
    </group>
  );
}

/**
 * The liquid in a bottle, a hair inside its wall, standing `rest` full on
 * the still machine. In the Home demo it follows `read`: the media goes down
 * as the wells are fed and the waste comes up as they are emptied.
 */
function Liquid({ material, rest, read }: { material: MaterialKey; rest: number; read?: (pose: MachinePose) => number }) {
  const mesh = useRef<Mesh>(null);
  const fill = (level: number) => {
    if (!mesh.current) return;
    const height = FULL * Math.min(1, Math.max(level, 0.02));
    mesh.current.scale.y = height;
    mesh.current.position.y = LIFT + 0.01 + height / 2;
  };
  usePoseFrame(
    (pose) => fill(read ? read(pose) : rest),
    () => fill(rest),
  );
  const height = FULL * rest;
  return (
    <mesh
      ref={mesh}
      geometry={unitGeometry("cylinder")}
      material={getMaterial(material)}
      position={[0, LIFT + 0.01 + height / 2, 0]}
      scale={[R - 0.015, height, R - 0.015]}
      receiveShadow={receivesShadow(material)}
      dispose={null}
    />
  );
}

const mediaLevel = (pose: MachinePose) => pose.media;
const wasteLevel = (pose: MachinePose) => pose.waste;

/**
 * The fresh media supply: a clear glass lab bottle of pink media inside the
 * chamber, kept at 37 °C, with white enamel volume marks, a label, and the
 * blue screw cap these bottles ship with. A dip tube through the cap feeds
 * the media line to the addition valve, and a vent line to a sterile
 * syringe filter lets air in as it's drawn down. Origin at the base.
 */
export function MediaBottleModel() {
  return (
    <group>
      <Cylinder position={[0, (Y.shoulder + LIFT) / 2, 0]} radius={R} height={Y.shoulder - LIFT} material="glass" />
      <Liquid material="mediaPink" rest={BOTTLE_REST.media} read={mediaLevel} />
      <Repeat items={MARKS} material="plasticWhite" />
      <Label text="Media" />
      <Cap body="glass" cap="capBlue" />
      {BOTTLE_PORTS.media.map((at) => (
        <Port key={at.join()} at={at} />
      ))}
      <Cylinder position={[0.09, Y.top + 0.01, 0]} radius={0.018} height={0.02} low material="steel" />
      <VentFilter points={MEDIA_VENT} turn={[0, 0, Math.PI / 2]} />
    </group>
  );
}

/**
 * The cleaner: a clear glass bottle of 70% ethanol disinfectant with a
 * white cap, outside on the fluidics platform. Both selector valves draw
 * from it through their own dip tube to flush the lines. Origin at the base.
 */
export function CleanerBottleModel() {
  return (
    <group>
      <Cylinder position={[0, (Y.shoulder + LIFT) / 2, 0]} radius={R} height={Y.shoulder - LIFT} material="glass" />
      <Liquid material="cleanerGreen" rest={BOTTLE_REST.cleaner} />
      <Repeat items={MARKS} material="plasticWhite" />
      <Label text="Cleaner" />
      <Cap body="glass" cap="plasticWhite" />
      {BOTTLE_PORTS.cleaner.map((at) => (
        <Port key={at.join()} at={at} />
      ))}
      <VentFilter points={BACK_VENT} turn={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

/**
 * The waste bottle and bleach trap: a milky natural HDPE bottle with a red
 * cap, primed with bleach so spent media is disinfected as it arrives, which
 * turns it a pale amber. Both pumps' waste lines come in through the cap, a
 * hydrophobic filter on the vent stops aerosols getting out, and a float
 * switch on a stem tells the Pico when it is nearly full, so the pumps stop
 * before it can overflow. Origin at the base.
 */
export function WasteContainerModel() {
  return (
    <group>
      <Cylinder position={[0, (Y.shoulder + LIFT) / 2, 0]} radius={R} height={Y.shoulder - LIFT} material="hdpeThin" />
      <Liquid material="wasteAmber" rest={BOTTLE_REST.waste} read={wasteLevel} />
      {[0.06, Y.shoulder - 0.06].map((y) => (
        <Ring key={y} position={[0, y, 0]} radius={R} thin material="hdpeThin" />
      ))}
      <Label text="Waste · bleach" />
      <Cap body="hdpeThin" cap="capRed" />
      {BOTTLE_PORTS.waste.map((at) => (
        <Port key={at.join()} at={at} />
      ))}
      <VentFilter points={BACK_VENT} turn={[Math.PI / 2, 0, 0]} />
      {/* Float switch: a stem through the cap with its float near the top, and its lead out of the cap. */}
      <Cylinder position={[0, (0.44 + Y.top) / 2, 0.08]} radius={0.008} height={Y.top - 0.44} low material="plasticWhite" />
      <Cylinder position={[0, 0.5, 0.08]} radius={0.035} height={0.07} material="plasticWhite" />
      <Cylinder position={[0, Y.top + 0.015, 0.08]} radius={0.022} height={0.03} low material="plasticBlack" />
    </group>
  );
}
