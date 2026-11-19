/**
 * Geometry for the machine's wiring. Every run is a few wires laid round a
 * smooth centre line with a gentle twist, the way a real stepper or sensor
 * lead looks. All wires of one colour, across every run, are merged into
 * one buffer, so the whole harness costs one draw per colour. Each vertex
 * also carries the two rigs it moves with (see harness-rig.ts), so one
 * skinned buffer can flex wherever a run crosses a moving joint.
 */
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Quaternion, Euler, Uint16BufferAttribute, Vector3 } from "three";
import { FLOW_PERIOD, type FlowLine } from "../../fluidics/flow";
import type { MaterialKey } from "../../../materials";
import type { RepeatItem } from "../../../primitives";
import type { Vec3 } from "../../../types";
import { blendAt, CARRIERS, type Blend, type Carrier, type Ride } from "./harness-rig";

export interface WireRun {
  /** The bundle's centre line in world space. Ends should run straight into their plugs. */
  points: Vec3[];
  /** One material per wire. A single thick entry draws a round cable, like a USB lead. */
  wires: MaterialKey[];
  /** Radius of each wire. */
  radius?: number;
  /** Turns of twist per scene unit, so the colours wind round each other. */
  twist?: number;
  /** Distance between cable ties. Leave out for a run with none. */
  ties?: number;
  /** What each stretch is fastened to. Leave out for a run fixed to the frame all the way. */
  ride?: Ride[];
  /** For a fluid line: true when its points run toward the dispense head, so its liquid's bands move the right way. */
  towardHead?: boolean;
}

/** A fluid line's liquid core: the same as a wire run, keyed by the line instead of a material. */
export type FlowRun = Omit<WireRun, "wires"> & { wires: FlowLine[] };

/** Anything the harness can lay out: wires keyed by material, liquid cores keyed by line. */
type AnyRun = Omit<WireRun, "wires"> & { wires: readonly string[] };

const WIRE_RADIUS = 0.009;
const SIDES = 6;
const CABLE_SIDES = 10;
const STEP = 0.05;

const up = new Vector3(0, 1, 0);

function curveOf(points: Vec3[]) {
  return new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    "centripetal",
  );
}

/** How far each wire's centre sits from the bundle's, so neighbours just touch. */
function spread(count: number, radius: number) {
  return count > 1 ? radius / Math.sin(Math.PI / count) : 0;
}

interface Arrays {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  bones: number[];
  weights: number[];
}

const blend: Blend = { a: 0, b: 0, weight: 0 };

/** Appends one wire's tube, following the bundle's frames with its own offset and twist. */
function addWire(out: Arrays, run: AnyRun, index: number) {
  const curve = curveOf(run.points);
  const length = curve.getLength();
  const segments = Math.max(8, Math.ceil(length / STEP));
  const frames = curve.computeFrenetFrames(segments, false);
  const radius = run.radius ?? WIRE_RADIUS;
  const offset = spread(run.wires.length, radius);
  // Thick single cables (USB leads) need a rounder section than a hookup wire.
  const sides = radius > 0.012 ? CABLE_SIDES : SIDES;
  const base = out.positions.length / 3;
  const centre = new Vector3();
  const normal = new Vector3();
  const last = run.points.length - 1;
  // U runs along the wire in liquid band periods, pointing toward the head (see fluidics/flow.ts).
  const along = (run.towardHead === false ? -1 : 1) / FLOW_PERIOD;
  for (let j = 0; j <= segments; j++) {
    const u = j / segments;
    curve.getPointAt(u, centre);
    blendAt(run.ride, curve.getUtoTmapping(u, u * length) * last, blend);
    const n = frames.normals[j];
    const b = frames.binormals[j];
    const turn = (index / run.wires.length) * Math.PI * 2 + (run.twist ?? 1.4) * Math.PI * 2 * u * length;
    const cx = centre.x + offset * (Math.cos(turn) * n.x + Math.sin(turn) * b.x);
    const cy = centre.y + offset * (Math.cos(turn) * n.y + Math.sin(turn) * b.y);
    const cz = centre.z + offset * (Math.cos(turn) * n.z + Math.sin(turn) * b.z);
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      normal.set(0, 0, 0).addScaledVector(n, Math.cos(a)).addScaledVector(b, Math.sin(a));
      out.positions.push(cx + radius * normal.x, cy + radius * normal.y, cz + radius * normal.z);
      out.normals.push(normal.x, normal.y, normal.z);
      out.uvs.push(u * length * along, k / sides);
      out.bones.push(blend.a, blend.b, 0, 0);
      out.weights.push(1 - blend.weight, blend.weight, 0, 0);
    }
  }
  for (let j = 0; j < segments; j++)
    for (let k = 0; k < sides; k++) {
      const a = base + j * sides + k;
      const b = base + j * sides + ((k + 1) % sides);
      const c = a + sides;
      const d = b + sides;
      out.indices.push(a, c, b, b, c, d);
    }
}

/** One merged buffer per key (a wire's material, or a fluid line) for all the runs. */
export function harnessGeometries<K extends string>(runs: (Omit<WireRun, "wires"> & { wires: readonly K[] })[]): { material: K; geometry: BufferGeometry }[] {
  const byMaterial = new Map<K, Arrays>();
  for (const run of runs)
    run.wires.forEach((material, index) => {
      let arrays = byMaterial.get(material);
      if (!arrays) {
        arrays = { positions: [], normals: [], uvs: [], indices: [], bones: [], weights: [] };
        byMaterial.set(material, arrays);
      }
      addWire(arrays, run, index);
    });
  return [...byMaterial.entries()].map(([material, { positions, normals, uvs, indices, bones, weights }]) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute(bones, 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return { material, geometry };
  });
}

export interface Ties {
  bands: RepeatItem[];
  heads: RepeatItem[];
}

/**
 * Nylon cable ties along every run that asks for them: a thin band round
 * the bundle and the little square head on one side. Bands stand on Y, so
 * each is turned from Y onto the run's direction. Ties are grouped by what
 * carries them; none are put where a run flexes between two rigs.
 */
export function tiePlacements(runs: WireRun[]) {
  const byCarrier = new Map<Carrier, Ties>();
  const turn = new Quaternion();
  const euler = new Euler();
  const point = new Vector3();
  const tangent = new Vector3();
  const at: Blend = { a: 0, b: 0, weight: 0 };
  for (const run of runs) {
    if (!run.ties) continue;
    const curve = curveOf(run.points);
    const length = curve.getLength();
    const radius = run.radius ?? WIRE_RADIUS;
    const girth = spread(run.wires.length, radius) + radius + 0.003;
    const count = Math.floor(length / run.ties);
    const frames = curve.computeFrenetFrames(Math.max(1, count * 2), false);
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      blendAt(run.ride, curve.getUtoTmapping(u, u * length) * (run.points.length - 1), at);
      if (at.weight > 0.02 && at.weight < 0.98) continue;
      const carrier = CARRIERS[at.weight >= 0.98 ? at.b : at.a];
      let ties = byCarrier.get(carrier);
      if (!ties) {
        ties = { bands: [], heads: [] };
        byCarrier.set(carrier, ties);
      }
      curve.getPointAt(u, point);
      curve.getTangentAt(u, tangent);
      turn.setFromUnitVectors(up, tangent);
      euler.setFromQuaternion(turn, "XYZ");
      const rotation: Vec3 = [euler.x, euler.y, euler.z];
      ties.bands.push({ position: [point.x, point.y, point.z], rotation, scale: [girth, 0.016, girth] });
      const side = frames.normals[i * 2 + 1];
      ties.heads.push({ position: [point.x + side.x * girth, point.y + side.y * girth, point.z + side.z * girth], rotation, scale: [0.022, 0.024, 0.022] });
    }
  }
  return [...byCarrier.entries()].map(([carrier, ties]) => ({ carrier, ...ties }));
}
