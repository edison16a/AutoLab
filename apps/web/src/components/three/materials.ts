/**
 * The kit's material library: physical neutrals (white, grey and black
 * plastics, brushed metal, clear panels) plus the real world colours in
 * material-colors.ts, so each part looks like the hardware it stands for.
 * The accent stays reserved for selection, which the interaction layer
 * draws on top, and for emphasised connectors.
 *
 * Materials are created on first use and shared by every mesh and every
 * view, so the renderer compiles each shader once. They are disposed with
 * the rest of the kit when the last Stage unmounts (see resources.ts).
 */
import { DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from "three";
import { registerDisposer } from "./resources";
import { accentColor } from "./tokens";
import { COLOR_RECIPES, type ColorKey } from "./material-colors";

export type MaterialKey =
  | ColorKey
  | "plasticWhite"
  | "plasticGrey"
  | "plasticBlack"
  | "graphite"
  | "pcbGraphite"
  | "pcbWhite"
  | "ribbon"
  | "aluminium"
  | "steel"
  | "rubber"
  | "acrylic"
  | "glass"
  | "liquid"
  | "silkscreen"
  | "ledOff"
  | "ledOn"
  | "accent";

function standard(color: string, roughness: number, metalness = 0) {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * Clear materials skip transmission on purpose: it needs an extra render
 * pass per frame, which is too slow on software GL. A low opacity plus the
 * environment reflection reads as acrylic or glass at a fraction of the cost.
 */
function clear(color: string, opacity: number, roughness: number) {
  return new MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
  });
}

const RECIPES: Record<MaterialKey, () => Material> = {
  ...COLOR_RECIPES,
  plasticWhite: () => standard("#f0f0ef", 0.42),
  plasticGrey: () => standard("#a9abb0", 0.48),
  plasticBlack: () => standard("#1c1c1f", 0.5),
  // Black anodised aluminium, used for the frame extrusions and gantry.
  graphite: () => standard("#2e2f33", 0.36, 0.55),
  pcbGraphite: () => standard("#2a2b2f", 0.58, 0.08),
  pcbWhite: () => standard("#e7e7e5", 0.55),
  // Flat cables are a single sheet, so both faces must render.
  ribbon: () => new MeshStandardMaterial({ color: "#e4e4e2", roughness: 0.5, side: DoubleSide }),
  aluminium: () => standard("#c9cbcf", 0.3, 1),
  steel: () => standard("#a2a5aa", 0.2, 1),
  rubber: () => standard("#151516", 0.9),
  // A dark body colour, so the sheet dims what is behind it a touch, like real acrylic, instead of
  // laying a lit grey haze over it. That haze read as a grey sheet in dark mode. Reflections still show.
  acrylic: () => clear("#1c2023", 0.08, 0.04),
  glass: () => clear("#f4f5f6", 0.2, 0.06),
  liquid: () => clear("#dadbdf", 0.55, 0.2),
  silkscreen: () => standard("#f4f4f4", 0.7),
  ledOff: () => standard("#3a3b3f", 0.3),
  ledOn: () => {
    const accent = accentColor();
    return new MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.3, toneMapped: false });
  },
  accent: () => standard(accentColor(), 0.4),
};

const cache = new Map<MaterialKey, Material>();
let hidden: MeshBasicMaterial | null = null;

/** The shared material for a key. Never dispose it yourself. */
export function getMaterial(key: MaterialKey): Material {
  let material = cache.get(key);
  if (!material) {
    material = RECIPES[key]();
    material.name = key;
    cache.set(key, material);
  }
  return material;
}

/**
 * For hit boxes. Invisible materials are skipped by the renderer but still
 * raycast, so a part can have a steady, simple pick volume.
 */
export function getHiddenMaterial(): MeshBasicMaterial {
  hidden ??= new MeshBasicMaterial({ visible: false });
  return hidden;
}

/** Transparent materials never cast shadows; a clear panel shouldn't darken the floor. */
export function castsShadow(key: MaterialKey) {
  return !getMaterial(key).transparent;
}

registerDisposer(() => {
  cache.forEach((material) => material.dispose());
  cache.clear();
  hidden?.dispose();
  hidden = null;
});
