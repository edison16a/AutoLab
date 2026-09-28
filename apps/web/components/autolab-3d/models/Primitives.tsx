"use client";
import { createContext, useContext, useEffect, useMemo } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
} from "three";
import type { Vec3 } from "../registry/componentRegistry";
const palette = {
  frame: "#27313b",
  metal: "#b5bfca",
  dark: "#101820",
  green: "#246f51",
  blue: "#2684ff",
  gold: "#c4a664",
  white: "#e1e9ef",
  glass: "#94b8cb",
  red: "#b54444",
  rubber: "#15191e",
  pcb: "#39795b",
  led: "#31c48d",
};
type Color = keyof typeof palette;
function resources() {
  return {
    box: new BoxGeometry(1, 1, 1),
    cylinder: new CylinderGeometry(1, 1, 1, 20),
    sphere: new SphereGeometry(1, 12, 8),
    materials: Object.fromEntries(
      Object.entries(palette).map(([k, v]) => [
        k,
        new MeshStandardMaterial({
          color: v,
          roughness: k === "metal" ? 0.28 : 0.65,
          metalness: k === "metal" ? 0.75 : 0.18,
          transparent: k === "glass",
          opacity: k === "glass" ? 0.09 : 1,
          depthWrite: k !== "glass",
        }),
      ]),
    ) as Record<Color, MeshStandardMaterial>,
  };
}
const Context = createContext<ReturnType<typeof resources> | null>(null);
export function ModelResources({ children }: { children: React.ReactNode }) {
  const value = useMemo(resources, []);
  useEffect(
    () => () => {
      value.box.dispose();
      value.cylinder.dispose();
      value.sphere.dispose();
      Object.values(value.materials).forEach((m) => m.dispose());
    },
    [value],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = "metal",
  rotation = [0, 0, 0],
}: {
  position?: Vec3;
  size?: Vec3;
  color?: Color;
  rotation?: Vec3;
}) {
  const r = useContext(Context)!;
  return (
    <mesh
      position={position}
      scale={size}
      rotation={rotation}
      geometry={r.box}
      material={r.materials[color]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
export function Cylinder({
  position = [0, 0, 0],
  radius = 0.1,
  height = 0.2,
  color = "metal",
  rotation = [0, 0, 0],
}: {
  position?: Vec3;
  radius?: number;
  height?: number;
  color?: Color;
  rotation?: Vec3;
}) {
  const r = useContext(Context)!;
  return (
    <mesh
      position={position}
      scale={[radius, height, radius]}
      rotation={rotation}
      geometry={r.cylinder}
      material={r.materials[color]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
export function Pins({
  count = 10,
  length = 0.6,
}: {
  count?: number;
  length?: number;
}) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          position={[(i / (count - 1) - 0.5) * length, 0.07, 0]}
          size={[0.025, 0.14, 0.025]}
          color="gold"
        />
      ))}
    </group>
  );
}
export function Board({ size = [0.5, 0.04, 0.4] }: { size?: Vec3 }) {
  return (
    <>
      <Box size={size} color="green" />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Cylinder
            key={`${x}${z}`}
            position={[
              x * (size[0] / 2 - 0.055),
              0.025,
              z * (size[2] / 2 - 0.055),
            ]}
            radius={0.025}
            height={0.015}
            color="gold"
          />
        )),
      )}
    </>
  );
}
