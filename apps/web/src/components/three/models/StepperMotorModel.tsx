"use client";
import { castsShadow, getMaterial, type MaterialKey } from "../materials";
import { Block, Cylinder, Repeat, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { chamferedPrism } from "./geometry/shapes";

/** NEMA 17: a 42.3 mm face (0.52 units) and a 40 mm body (0.49). */
const FACE = 0.52;
const BODY = 0.49;
const CAP = 0.085;
const CHAMFER = 0.07;
const STATOR = BODY - CAP * 2;
/** The four M3 holes sit on a 31 mm square. */
const HOLE = 0.19;
const CORNERS: [number, number][] = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x * HOLE, z * HOLE] as [number, number]));
const FACE_HOLES: RepeatItem[] = CORNERS.map(([x, z]) => ({ position: [x, BODY / 2 + 0.001, z] }));
const REAR_SCREWS: RepeatItem[] = CORNERS.map(([x, z]) => ({ position: [x, -BODY / 2 - 0.008, z] }));
const HOLE_SCALE: Vec3 = [0.02, 0.004, 0.02];
const SCREW_SCALE: Vec3 = [0.03, 0.018, 0.03];
// Fine ridges round the stator, where the laminations show between the end caps.
const RIDGES: RepeatItem[] = [-0.08, 0, 0.08].map((y) => ({ position: [0, y, 0] }));

/** The shared chamfered prism, scaled to a slice of the housing. */
function Housing({ y, height, inset = 0, material }: { y: number; height: number; inset?: number; material: MaterialKey }) {
  const size = FACE - inset;
  return (
    <mesh
      geometry={chamferedPrism(size, height, size, CHAMFER - inset / 2)}
      material={getMaterial(material)}
      position={[0, y, 0]}
      castShadow={castsShadow(material)}
      receiveShadow
      dispose={null}
    />
  );
}

/**
 * NEMA 17 stepper: two aluminium end caps with chamfered corners around the
 * black stator, the centring boss and D-cut shaft on +Y, four long screws
 * through the back, and the six pin connector on the side. Origin at the
 * middle of the body. Drives the pipette plunger and all three axes.
 */
export function StepperMotorModel() {
  const ridge = chamferedPrism(FACE - 0.012, 0.012, FACE - 0.012, CHAMFER - 0.006);
  return (
    <group>
      <Housing y={0} height={STATOR} inset={0.03} material="plasticBlack" />
      <Repeat items={RIDGES} geometry={ridge} material="graphite" />
      {[-1, 1].map((side) => (
        <Housing key={side} y={side * (BODY / 2 - CAP / 2)} height={CAP} material="aluminium" />
      ))}
      <Cylinder position={[0, BODY / 2 + 0.01, 0]} radius={0.137} height={0.02} material="aluminium" />
      <Repeat items={FACE_HOLES} shape="cylinderLow" material="plasticBlack" scale={HOLE_SCALE} />
      <Repeat items={REAR_SCREWS} shape="cylinderLow" material="steel" scale={SCREW_SCALE} />
      {/* The shaft, with the flat of the D ground along one side. */}
      <Cylinder position={[0, BODY / 2 + 0.15, 0]} radius={0.031} height={0.26} material="steel" />
      <Block position={[0.022, BODY / 2 + 0.19, 0]} size={[0.02, 0.18, 0.05]} material="steel" />
      {/* JST connector moulded into the back cap. */}
      <group position={[FACE / 2 + 0.03, -BODY / 2 + CAP / 2, 0]}>
        <Block size={[0.06, 0.07, 0.2]} radius={0.008} material="plasticWhite" />
        <Block position={[0.031, 0, 0]} size={[0.004, 0.035, 0.16]} material="plasticBlack" />
      </group>
    </group>
  );
}
