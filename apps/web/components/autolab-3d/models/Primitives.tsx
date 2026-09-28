"use client";
import { createContext, useContext, useEffect, useMemo } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  TorusGeometry,
  Shape,
  Path,
  ExtrudeGeometry,
  CanvasTexture,
  SRGBColorSpace,
} from "three";
import type { Vec3 } from "../registry/componentRegistry";
const palette = {
  frame: "#343937",
  metal: "#bfc5c1",
  dark: "#242827",
  green: "#176448",
  blue: "#365e83",
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
    cylinder: new CylinderGeometry(1, 1, 1, 48),
    sphere: new SphereGeometry(1, 12, 8),
    ring: new TorusGeometry(1, 0.22, 8, 24),
    thinRing: new TorusGeometry(1, 0.055, 8, 48),
    boards: new Map<string, ExtrudeGeometry>(),
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
      value.ring.dispose();
      value.thinRing.dispose();
      value.boards.forEach((geometry) => geometry.dispose());
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
          position={[(i / Math.max(1, count - 1) - 0.5) * length, 0.07, 0]}
          size={[0.01, 0.105, 0.01]}
          color="gold"
        />
      ))}
    </group>
  );
}
export function Board({ size = [0.5, 0.04, 0.4] }: { size?: Vec3 }) {
  const r = useContext(Context)!;
  const key = size.join(",");
  let geometry = r.boards.get(key);
  if (!geometry) {
    const [w, h, d] = size,
      corner = Math.min(w, d) * 0.075;
    const shape = new Shape();
    shape.moveTo(-w / 2 + corner, -d / 2);
    shape.lineTo(w / 2 - corner, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + corner);
    shape.lineTo(w / 2, d / 2 - corner);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - corner, d / 2);
    shape.lineTo(-w / 2 + corner, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - corner);
    shape.lineTo(-w / 2, -d / 2 + corner);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + corner, -d / 2);
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        const hole = new Path();
        hole.absarc(
          x * (w / 2 - 0.055),
          z * (d / 2 - 0.055),
          0.019,
          0,
          Math.PI * 2,
          true,
        );
        shape.holes.push(hole);
      }
    geometry = new ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 8,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -h / 2, 0);
    r.boards.set(key, geometry);
  }
  return (
    <>
      <mesh
        geometry={geometry}
        material={r.materials.green}
        castShadow
        receiveShadow
        dispose={null}
      />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Ring
            key={`${x}${z}`}
            position={[
              x * (size[0] / 2 - 0.055),
              size[1] / 2 + 0.003,
              z * (size[2] / 2 - 0.055),
            ]}
            radius={0.024}
            color="gold"
          />
        )),
      )}
    </>
  );
}

export function Ring({
  position = [0, 0, 0],
  radius = 0.05,
  color = "metal",
  thin = false,
}: {
  position?: Vec3;
  radius?: number;
  color?: Color;
  thin?: boolean;
}) {
  const r = useContext(Context)!;
  return (
    <mesh
      geometry={thin ? r.thinRing : r.ring}
      material={r.materials[color]}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={radius}
      dispose={null}
    />
  );
}
export function Bolt({
  position = [0, 0, 0],
  radius = 0.035,
}: {
  position?: Vec3;
  radius?: number;
}) {
  return (
    <group position={position}>
      <Cylinder radius={radius} height={radius * 0.5} />
      <Box
        position={[0, radius * 0.26, 0]}
        size={[radius * 1.15, 0.002, radius * 0.22]}
        color="dark"
      />
    </group>
  );
}
export function Chip({
  position = [0, 0, 0],
  size = [0.16, 0.04, 0.16],
}: {
  position?: Vec3;
  size?: Vec3;
}) {
  return (
    <group position={position}>
      <Box size={size} color="dark" />
      {[-1, 1].flatMap((side) =>
        Array.from({ length: 6 }, (_, i) => (
          <Box
            key={`${side}-${i}`}
            position={[
              side * (size[0] / 2 + 0.012),
              -0.008,
              (i / 5 - 0.5) * size[2] * 0.8,
            ]}
            size={[0.032, 0.009, 0.012]}
            color="metal"
          />
        )),
      )}
    </group>
  );
}
/** Local silkscreen textures, no external font or asset requests. */
export function Marking({
  text,
  position,
  width = 0.4,
  height = 0.09,
  color = "#ecebdc",
}: {
  text: string;
  position: Vec3;
  width?: number;
  height?: number;
  color?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "500 54px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 48, 500);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}
