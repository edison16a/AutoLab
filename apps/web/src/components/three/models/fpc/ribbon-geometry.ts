/**
 * Geometry for a flat flex cable. The ribbon keeps its width along the
 * scene's Z axis the whole way, because both of its sockets (the camera's
 * edge connector and the Pi's CSI slot) hold it that way, and a real flat
 * cable only bends across its width, never twists on a short run.
 */
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Matrix4, Quaternion, Uint16BufferAttribute, Vector3 } from "three";
import type { Vec3 } from "../../types";
import { blendAt, type Blend, type Ride } from "../machine/wiring/harness-rig";

/** Where a ribbon end sits: its tip, and a rotation whose +X points out of the cable. */
export interface RibbonEnd {
  position: Vec3;
  quaternion: [number, number, number, number];
}

const WIDTH_AXIS = new Vector3(0, 0, 1);

/** The width direction at a point: the Z axis with any lean along the tangent removed. */
function sideAt(tangent: Vector3) {
  return WIDTH_AXIS.clone().addScaledVector(tangent, -WIDTH_AXIS.dot(tangent)).normalize();
}

/** A rotation for an end: X out of the cable, Z across its width, Y off its face. */
function endFrame(point: Vector3, outward: Vector3): RibbonEnd {
  const side = sideAt(outward);
  const face = new Vector3().crossVectors(side, outward);
  const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(outward, face, side));
  return { position: [point.x, point.y, point.z], quaternion: [q.x, q.y, q.z, q.w] };
}

/**
 * A closed flat strip, `width` across and `thickness` thick, through the
 * points on a centripetal Catmull-Rom curve (no overshoot at tight bends).
 * Four faces with their own normals so the edges stay crisp. Indexed, so
 * the selection outline builds its own copy instead of editing this one.
 */
export function ribbonGeometry(points: Vec3[], width: number, thickness: number, samples = 120, ride?: Ride[]) {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, "centripetal");
  const length = curve.getLength();
  const frames = Array.from({ length: samples + 1 }, (_, i) => {
    const u = i / samples;
    const tangent = curve.getTangentAt(u).normalize();
    const side = sideAt(tangent);
    const blend: Blend = blendAt(ride, curve.getUtoTmapping(u, u * length) * (points.length - 1), { a: 0, b: 0, weight: 0 });
    return { point: curve.getPointAt(u), side, face: new Vector3().crossVectors(tangent, side), blend };
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  // Which rigs each vertex moves with, for a ribbon whose ends ride different parts (see harness-rig.ts).
  const bones: number[] = [];
  const weights: number[] = [];
  const corner = new Vector3();

  // Each face is a strip between two long edges: [offset along side, offset along face] for both.
  const faces: [number, number, number, number, "face" | "side", number][] = [
    [-1, 1, 1, 1, "face", 1],
    [1, -1, -1, -1, "face", -1],
    [1, 1, 1, -1, "side", 1],
    [-1, -1, -1, 1, "side", -1],
  ];
  for (const [s0, f0, s1, f1, axis, sign] of faces) {
    const base = positions.length / 3;
    for (const { point, side, face, blend } of frames) {
      for (const [s, f] of [[s0, f0], [s1, f1]]) {
        corner.copy(point).addScaledVector(side, (s * width) / 2).addScaledVector(face, (f * thickness) / 2);
        positions.push(corner.x, corner.y, corner.z);
        const n = (axis === "face" ? face : side).clone().multiplyScalar(sign);
        normals.push(n.x, n.y, n.z);
        bones.push(blend.a, blend.b, 0, 0);
        weights.push(1 - blend.weight, blend.weight, 0, 0);
      }
    }
    // Wound so the right hand rule agrees with the normals; the ribbon material is double sided and flips lighting on back faces.
    for (let i = 0; i < samples; i += 1) {
      const a = base + i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(bones, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
  geometry.setIndex(indices);

  const first = frames[0].point;
  const last = frames[samples].point;
  const ends: [RibbonEnd, RibbonEnd] = [
    endFrame(first, curve.getTangentAt(0).normalize().negate()),
    endFrame(last, curve.getTangentAt(1).normalize()),
  ];
  return { geometry, ends };
}
