import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { componentById, componentPosition } from "./registry/componentRegistry";
export default function SceneCamera({
  selected,
  exploded,
  reset,
  isolated = false,
}: {
  selected: string | null;
  exploded: boolean;
  reset: number;
  isolated?: boolean;
}) {
  const controls = useRef<Controls>(null),
    { camera, invalidate } = useThree(),
    moving = useRef(false),
    target = useRef(new Vector3()),
    eye = useRef(new Vector3());
  useEffect(() => {
    const c = selected ? componentById[selected] : null;
    target.current.set(
      ...(c
        ? componentPosition(c, exploded)
        : ([0.3, 1.9, 0] as [number, number, number])),
    );
    eye.current
      .copy(target.current)
      .add(
        c
          ? isolated
            ? new Vector3(
                1.3,
                c.id === "camera" ? -1.1 : 1.25,
                1.5,
              ).multiplyScalar(Math.max(...c.size) * 1.15)
            : new Vector3(3.2, 2.3, 4.6)
          : new Vector3(exploded ? 9.5 : 7, 4.8, 8.6),
      );
    moving.current = true;
    invalidate();
  }, [selected, exploded, reset, isolated, invalidate]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || !moving.current) return;
    const t = 1 - Math.exp(-6 * dt);
    camera.position.lerp(eye.current, t);
    c.target.lerp(target.current, t);
    c.update();
    if (camera.position.distanceTo(eye.current) < 0.015) {
      moving.current = false;
    } else invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minDistance={isolated ? 0.35 : 2.5}
      maxDistance={20}
      minPolarAngle={0.15}
      maxPolarAngle={isolated ? Math.PI - 0.1 : Math.PI / 2 - 0.03}
      onStart={() => {
        moving.current = false;
      }}
      onChange={() => {
        const c = controls.current;
        if (c) {
          c.target.x = Math.max(-4, Math.min(4, c.target.x));
          c.target.y = Math.max(0.3, Math.min(5, c.target.y));
          c.target.z = Math.max(-3, Math.min(3, c.target.z));
        }
      }}
    />
  );
}
