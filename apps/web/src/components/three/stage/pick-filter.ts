import { Vector3, type Intersection, type Mesh } from "three";

const local = new Vector3();

/**
 * Pointer hits arrive sorted nearest first. When a small part's hit box
 * sits inside a bigger one (a plate on its platform), the ray enters the
 * big box first and the small part could never be picked. If the next hit
 * starts inside the current best box, the inner part wins instead.
 */
export function preferInnerHits(hits: Intersection[]): Intersection[] {
  if (hits.length < 2) return hits;
  let best = 0;
  for (let i = 1; i < hits.length; i += 1) {
    const outer = hits[best].object as Mesh;
    if (!outer.userData.hitBox) break;
    const bounds = outer.geometry.boundingBox ?? (outer.geometry.computeBoundingBox(), outer.geometry.boundingBox);
    if (!bounds) break;
    local.copy(hits[i].point);
    outer.worldToLocal(local);
    if (!bounds.containsPoint(local)) break;
    best = i;
  }
  if (best === 0) return hits;
  return [hits[best], ...hits.slice(0, best), ...hits.slice(best + 1)];
}
