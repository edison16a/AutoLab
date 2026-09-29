/**
 * Materials for the selection outline. The outline is a silhouette of the
 * whole part, not of each mesh inside it, so a chip on a board doesn't get
 * its own ring. It works in two passes that share the stencil buffer:
 *
 * 1. A mask copy of every mesh writes the part's footprint into the
 *    stencil, ignoring depth so the full silhouette is known even where
 *    the frame hides it.
 * 2. A hull copy, pushed out along its normals by a few screen pixels,
 *    draws in the accent only where the mask didn't, leaving a clean ring.
 *
 * Both skip the depth test, so a selected part stays traceable behind
 * frame posts and panels.
 */
import {
  AlwaysStencilFunc,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector2,
  type BufferGeometry,
} from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { registerDisposer } from "../resources";
import { accentColor } from "../tokens";

export type HighlightVariant = "selected" | "hover";

/** Stencil values, so a hovered part and the selected part can both show at once. */
const STENCIL: Record<HighlightVariant, number> = { selected: 1, hover: 2 };
/** Line width in CSS pixels, and how strongly it reads. Hover stays quieter. */
const LOOK: Record<HighlightVariant, { width: number; opacity: number }> = {
  selected: { width: 2.5, opacity: 1 },
  hover: { width: 1.5, opacity: 0.6 },
};

const VERTEX = /* glsl */ `
uniform float thickness;
uniform vec2 size;
void main() {
  vec3 pos = position;
  vec3 nrm = normal;
  #ifdef USE_INSTANCING
    pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    nrm = mat3(instanceMatrix) * nrm;
  #endif
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vec2 dir = (projectionMatrix * vec4(normalMatrix * nrm, 0.0)).xy;
  float len = length(dir);
  // Faces pointing straight at the camera have no screen direction to grow in.
  if (len > 1e-5) clip.xy += dir / len * thickness / size * 2.0 * clip.w;
  gl_Position = clip;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 color;
uniform float opacity;
void main() {
  gl_FragColor = vec4(color, opacity);
  #include <colorspace_fragment>
}`;

const masks = new Map<HighlightVariant, MeshBasicMaterial>();
const hulls = new Map<HighlightVariant, ShaderMaterial>();

export function maskMaterial(variant: HighlightVariant) {
  let material = masks.get(variant);
  if (!material) {
    material = new MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilRef: STENCIL[variant],
      stencilFunc: AlwaysStencilFunc,
      stencilZPass: ReplaceStencilOp,
      stencilZFail: ReplaceStencilOp,
      stencilFail: ReplaceStencilOp,
    });
    masks.set(variant, material);
  }
  return material;
}

export function hullMaterial(variant: HighlightVariant) {
  let material = hulls.get(variant);
  if (!material) {
    material = new ShaderMaterial({
      uniforms: {
        color: { value: new Color(accentColor()) },
        opacity: { value: LOOK[variant].opacity },
        thickness: { value: LOOK[variant].width },
        size: { value: new Vector2(1, 1) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
      stencilWrite: true,
      stencilRef: STENCIL[variant],
      stencilFunc: NotEqualStencilFunc,
    });
    hulls.set(variant, material);
  }
  return material;
}

/** Keeps the line a fixed number of screen pixels wide at any canvas size. */
export function setOutlineViewport(width: number, height: number, pixelRatio: number) {
  for (const variant of Object.keys(LOOK) as HighlightVariant[]) {
    const uniforms = hullMaterial(variant).uniforms;
    (uniforms.size.value as Vector2).set(width, height);
    uniforms.thickness.value = LOOK[variant].width * pixelRatio;
  }
}

const creased = new WeakMap<BufferGeometry, BufferGeometry>();
const creasedList = new Set<BufferGeometry>();

/**
 * The hull needs one normal per corner, or a box's faces split apart when
 * pushed outwards. Built once per source geometry and dropped with it.
 */
export function creasedGeometry(source: BufferGeometry) {
  let geometry = creased.get(source);
  if (!geometry) {
    // Without an index, toCreasedNormals edits the geometry in place, which would reshade the shared original.
    const built = toCreasedNormals(source.index ? source : source.clone(), Math.PI);
    creased.set(source, built);
    creasedList.add(built);
    source.addEventListener("dispose", () => {
      built.dispose();
      creasedList.delete(built);
      creased.delete(source);
    });
    geometry = built;
  }
  return geometry;
}

registerDisposer(() => {
  masks.forEach((material) => material.dispose());
  hulls.forEach((material) => material.dispose());
  masks.clear();
  hulls.clear();
  creasedList.forEach((geometry) => geometry.dispose());
  creasedList.clear();
});
