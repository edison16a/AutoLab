/**
 * ExtrudeGeometry and hand built strips come out non-indexed. The kit's
 * selection outline rebuilds normals in place on non-indexed geometry,
 * which would round off every edge of a shared mesh while its part is
 * selected. Welding identical vertices gives the geometry an index, so the
 * outline works on its own copy. Flat faces stay flat: vertices are only
 * merged when their normals and UVs match too.
 */
import type { BufferGeometry } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function welded(geometry: BufferGeometry) {
  const result = mergeVertices(geometry);
  geometry.dispose();
  return result;
}
