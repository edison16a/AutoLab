/**
 * Liquid moving through the fluid lines. Every tube has a liquid core in
 * the colour of what fills it, with faint bands along it. While the Home
 * demo runs a pump, the bands in every line that pump is moving liquid
 * through travel along at the speed the liquid really would, and glow a
 * little, so you can follow media from the bottle through the pump and out
 * of the needle, or spent media from the tip into the waste.
 *
 * One material per line, shared by every piece of that line (the cores in
 * the harness, the loop inside the pump head, the stubs in the valves), so
 * moving one texture moves the whole line. Tube geometry measures its U
 * coordinate in band periods along the tube, pointing toward the head.
 */
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { registerDisposer } from "../../resources";
import type { MachinePose } from "../../motion/pose";
import { PMST100 } from "./pump-spec";

/**
 * The lines of the combined system: each pump's line to the head and its
 * common line to its valve, and each valve's line to a bottle.
 */
export const FLOW_LINES = ["addHead", "addCommon", "addMedia", "addCleaner", "addWaste", "aspHead", "aspCommon", "aspWaste", "aspCleaner"] as const;
export type FlowLine = (typeof FLOW_LINES)[number];
export const LINE_INDEX = Object.fromEntries(FLOW_LINES.map((line, i) => [line, i])) as Record<FlowLine, number>;

/** What usually fills each line: fresh media on the addition side, spent media to waste, cleaner from the cleaner bottle. */
const LIQUID: Record<FlowLine, string> = {
  addHead: "#e2607f",
  addCommon: "#e2607f",
  addMedia: "#e2607f",
  addCleaner: "#7fcf9f",
  addWaste: "#e2607f",
  aspHead: "#d39443",
  aspCommon: "#d39443",
  aspWaste: "#d39443",
  aspCleaner: "#7fcf9f",
};

/** Distance between bands along a line, in scene units. */
export const FLOW_PERIOD = 0.1;
/** The liquid core's radius: the bore of the tubing, drawn a little fuller than the true 1/16" so the liquid reads at a distance. */
export const CORE_RADIUS = PMST100.tubeRadius * 0.72;

/**
 * How far liquid moves along a 1/16" ID line per radian the rotor turns:
 * 65 µL a revolution through a bore of about 1.98 mm² is 32.8 mm of tube.
 */
const BORE_MM2 = Math.PI * (25.4 / 32) ** 2;
export const FLOW_PER_RADIAN = PMST100.ulPerRev / BORE_MM2 / 81 / (Math.PI * 2);

/** A band texture: one soft bright streak per period over a darker base, so moving liquid reads at a glance. */
function bandTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 2;
  const context = canvas.getContext("2d");
  if (context) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const streak = Math.exp(-(((u - 0.3) / 0.12) ** 2));
      const level = Math.round(255 * (0.55 + 0.45 * streak));
      context.fillStyle = `rgb(${level},${level},${level})`;
      context.fillRect(x, 0, 1, canvas.height);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

const materials = new Map<FlowLine, MeshStandardMaterial>();

/** The shared liquid material for a line. Never dispose it yourself. */
export function getFlowMaterial(line: FlowLine): MeshStandardMaterial {
  let material = materials.get(line);
  if (!material) {
    const map = bandTexture();
    material = new MeshStandardMaterial({ color: LIQUID[line], map, emissive: LIQUID[line], emissiveMap: map, emissiveIntensity: 0, roughness: 0.25 });
    material.name = `flow:${line}`;
    materials.set(line, material);
  }
  return material;
}

/** Moves each line's bands to where the pose's liquid has got to, and lights the lines that are flowing. */
export function showFlow(pose: MachinePose) {
  materials.forEach((material, line) => {
    const i = LINE_INDEX[line];
    if (material.map) material.map.offset.x = -pose.flow[i] / FLOW_PERIOD;
    material.emissiveIntensity = pose.flowing[i] ? 0.6 : 0;
  });
}

/** Every line still, as on the Hardware screen. */
export function stillFlow() {
  materials.forEach((material) => {
    if (material.map) material.map.offset.x = 0;
    material.emissiveIntensity = 0;
  });
}

registerDisposer(() => {
  materials.forEach((material) => {
    material.map?.dispose();
    material.dispose();
  });
  materials.clear();
});
