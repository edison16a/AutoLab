"use client";
import { Block, Cylinder, getMaterial, type Vec3 } from "@/components/three";
import { roundedBoxGeometry, unitGeometry } from "@/components/three/geometries";

const ANTENNAS: { position: Vec3; tilt: number }[] = [
  { position: [-0.36, 0.44, -0.24], tilt: 0.12 },
  { position: [0.36, 0.44, -0.24], tilt: -0.12 },
];

/**
 * A plain home router: a white box with two antennas and one status light
 * on the front, lit once the Pi has joined its Wi-Fi.
 */
export function RouterShape({ linked }: { linked: boolean }) {
  return (
    <group>
      <Block position={[0, 0.09, 0]} size={[0.95, 0.16, 0.6]} radius={0.05} material="plasticWhite" />
      {ANTENNAS.map(({ position, tilt }) => (
        <Cylinder key={position[0]} position={position} rotation={[0, 0, tilt]} radius={0.026} height={0.56} taper={0.7} material="plasticBlack" />
      ))}
      <Cylinder position={[-0.34, 0.09, 0.301]} rotation={[Math.PI / 2, 0, 0]} radius={0.018} height={0.01} low material={linked ? "ledOn" : "ledOff"} />
    </group>
  );
}

/** Overlapping spheres on a flat base, the usual cloud outline, standing for the gateway. */
const PUFFS: { position: Vec3; radius: number }[] = [
  { position: [-0.34, -0.06, 0], radius: 0.24 },
  { position: [-0.06, 0.1, 0], radius: 0.33 },
  { position: [0.3, 0.02, 0], radius: 0.27 },
];

/**
 * The gateway, drawn as a cloud. Built from bare meshes rather than kit
 * primitives because it floats: a shadow under a cloud reads as a solid
 * object resting on the bench.
 */
export function CloudShape() {
  const material = getMaterial("plasticWhite");
  return (
    <group>
      {PUFFS.map(({ position, radius }) => (
        <mesh key={position[0]} geometry={unitGeometry("sphere")} material={material} position={position} scale={radius} dispose={null} />
      ))}
      <mesh geometry={roundedBoxGeometry(0.98, 0.24, 0.42, 0.12)} material={material} position={[-0.02, -0.12, 0]} dispose={null} />
    </group>
  );
}
