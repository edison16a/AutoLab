"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  CatmullRomCurve3,
  Vector3,
} from "three";
import type { Line2 } from "three-stdlib";
import SceneLabel from "../SceneLabel";
import { WebGLScene } from "../AutolabScene";
import { Box, Cylinder } from "../models/Primitives";
import RaspberryPiModel from "../models/RaspberryPiModel";
import CameraModel from "../models/CameraModel";
import PrinterFrameModel from "../models/PrinterFrameModel";
function useProgress(duration = 4) {
  const value = useRef(0),
    invalidate = useThree((s) => s.invalidate),
    reduce = useRef(false);
  useEffect(() => {
    reduce.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    value.current = reduce.current ? 1 : 0;
    invalidate();
  }, [invalidate]);
  useFrame((_, dt) => {
    if (value.current < 1) {
      value.current = Math.min(1, value.current + dt / duration);
      invalidate();
    }
  });
  return value;
}
function Tag({
  position,
  text,
}: {
  position: [number, number, number];
  text: string;
}) {
  return (
    <SceneLabel position={position} text={text} className="assembly-tag" />
  );
}
export function CameraConnectionAnimation() {
  const p = useProgress(5);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(new Array(33 * 6).fill(0), 3),
    );
    const indices: number[] = [];
    for (let i = 0; i < 32; i++) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
    g.setIndex(indices);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const first = Math.min(1, p.current * 2),
      last = Math.max(0, (p.current - 0.5) * 2);
    const points = [
      [-0.55, 0.28 + (1 - first) * 1.2, 0.18],
      [0.4, 0.9, 0.05],
      [1.8, 0.9, -0.6],
      [2.77, 0.17 + (1 - last) * 1.4, -1.2],
    ];
    const a = geometry.getAttribute("position");
    const smooth = new CatmullRomCurve3(
      points.map(([x, y, z]) => new Vector3(x, y, z)),
    ).getPoints(32);
    smooth.forEach(({ x, y, z }, i) => {
      a.setXYZ(i * 2, x, y, z - 0.14);
      a.setXYZ(i * 2 + 1, x, y, z + 0.14);
    });
    a.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  });
  return (
    <group>
      <group scale={2.2}>
        <RaspberryPiModel highlight="csi" />
      </group>
      <group position={[2.35, 0, -1.2]} scale={1.8}>
        <CameraModel />
      </group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#b0b9b0" side={DoubleSide} />
      </mesh>
      <Tag position={[-1.3, 0.65, 0.65]} text="CSI camera connector" />
      <Tag position={[2.5, 0.4, -1.4]} text="RP HQ Camera" />
      <Tag position={[0.9, 1.35, 0.15]} text="FPC ribbon / Pi powered off" />
    </group>
  );
}
export function PowerConnectionAnimation() {
  const p = useProgress(4),
    cable = useRef<Line2>(null),
    plug = useRef<Group>(null),
    led = useRef<Group>(null);
  useFrame(() => {
    if (plug.current)
      plug.current.position.x = -3.4 + Math.min(1, p.current / 0.8) * 2.17;
    if (led.current) led.current.visible = p.current > 0.8;
    if (cable.current && plug.current) {
      const curve = new CatmullRomCurve3([
        new Vector3(-4.2, 0.08, 1.5),
        new Vector3(-3.5, 0.08, 1.5),
        new Vector3(-2.8, 0.08, 0.8),
        new Vector3(plug.current.position.x - 0.52, 0.11, 0.46),
      ]);
      cable.current.geometry.setPositions(
        curve.getPoints(24).flatMap((v) => [v.x, v.y, v.z]),
      );
    }
  });
  return (
    <group>
      <group scale={2.2}>
        <RaspberryPiModel highlight="power" />
      </group>
      <group ref={plug} position={[-3.4, 0.11, 0.46]}>
        <Box size={[0.28, 0.14, 0.2]} color="metal" />
        <Box position={[-0.3, 0, 0]} size={[0.45, 0.22, 0.28]} color="rubber" />
      </group>
      <Line
        ref={cable}
        points={[
          [-4.2, 0.08, 1.5],
          [-3, 0.08, 1.5],
          [-2.1, 0.08, 0.48],
        ]}
        color="#343934"
        lineWidth={6}
      />
      <Box position={[-4.2, 0, 1.5]} size={[0.75, 0.55, 1]} color="white" />
      <group ref={led} position={[-0.81, 0.085, -0.48]}>
        <Cylinder radius={0.04} height={0.04} color="led" />
      </group>
      <Tag position={[-1.25, 0.6, 0.7]} text="USB-C power port" />
      <Tag position={[-4.2, 0.7, 1.5]} text="Wall power adapter" />
      <Tag position={[0.3, 0.8, -0.4]} text="Power only, no computer cable" />
    </group>
  );
}
function Laptop() {
  return (
    <group>
      <Box size={[1.5, 0.08, 1]} color="metal" />
      <Box
        position={[0, 0.63, -0.44]}
        size={[1.5, 1.2, 0.08]}
        color="dark"
        rotation={[-0.1, 0, 0]}
      />
      <Box
        position={[0, 0.63, -0.38]}
        size={[1.3, 0.96, 0.02]}
        color="blue"
        rotation={[-0.1, 0, 0]}
      />
    </group>
  );
}
export function BluetoothConnectionAnimation({
  connected = false,
}: {
  connected?: boolean;
}) {
  return (
    <group>
      <group position={[-2.2, 0, 0]}>
        <Laptop />
      </group>
      <group position={[1.2, 0.1, 0]} scale={2.2}>
        <RaspberryPiModel powered />
      </group>
      <Line
        points={[
          [-1.3, 0.5, 0],
          [0.1, 0.5, 0],
        ]}
        color={connected ? "#31c48d" : "#607084"}
        dashed={!connected}
        dashSize={0.12}
        gapSize={0.1}
      />
      <Tag
        position={[-0.7, 1.1, 0]}
        text={connected ? "Bluetooth connected" : "Optional Bluetooth setup"}
      />
      <Tag position={[1.2, -0.3, 0.8]} text="Pi provisioning service" />
    </group>
  );
}
export function WifiConnectionAnimation({
  wifi = false,
  gateway = false,
}: {
  wifi?: boolean;
  gateway?: boolean;
}) {
  return (
    <group>
      <group position={[-2, 0, 0]} scale={1.7}>
        <RaspberryPiModel powered />
      </group>
      <Box position={[0.2, 0.1, 0]} size={[0.9, 0.2, 0.7]} color="white" />
      <Cylinder
        position={[-0.1, 0.55, -0.2]}
        radius={0.035}
        height={0.8}
        color="dark"
      />
      <Cylinder
        position={[0.5, 0.55, -0.2]}
        radius={0.035}
        height={0.8}
        color="dark"
      />
      <group position={[2.5, 0.3, 0]}>
        <Box size={[1, 0.65, 0.65]} color="blue" />
        <Box
          position={[0, -0.25, 0.34]}
          size={[0.7, 0.08, 0.03]}
          color="white"
        />
      </group>
      <Line
        points={[
          [-1.1, 0.2, 0],
          [-0.3, 0.2, 0],
        ]}
        color={wifi ? "#31c48d" : "#607084"}
        dashed={!wifi}
      />
      <Line
        points={[
          [0.8, 0.2, 0],
          [2, 0.3, 0],
        ]}
        color={gateway ? "#31c48d" : "#607084"}
        dashed={!gateway}
      />
      <Tag
        position={[0.2, 1.25, 0]}
        text={wifi ? "Wi-Fi connected" : "Wi-Fi network"}
      />
      <Tag
        position={[2.5, 1, 0]}
        text={gateway ? "Gateway reachable" : "WSS / HTTPS gateway"}
      />
    </group>
  );
}
export function ReadyAnimation() {
  const group = useRef<Group>(null),
    p = useProgress(1.8);
  useFrame(() => {
    if (group.current) {
      const s = 0.75 + 0.25 * p.current;
      group.current.scale.setScalar(s);
    }
  });
  return (
    <group ref={group}>
      <PrinterFrameModel />
      <group position={[2.8, 1.5, 0.4]}>
        <RaspberryPiModel powered />
      </group>
      <group position={[0.65, 3.3, 0.35]}>
        <CameraModel online />
      </group>
    </group>
  );
}
export default function AssemblyScene({
  step,
  bluetoothConnected,
  wifiConnected,
  gatewayConnected,
}: {
  step: number;
  bluetoothConnected: boolean;
  wifiConnected: boolean;
  gatewayConnected: boolean;
}) {
  return (
    <WebGLScene camera={step === 4 ? [8, 6, 10] : [5, 5.5, 7]}>
      <OrbitControls
        makeDefault
        target={step === 4 ? [0, 1.8, 0] : [-0.2, 0.3, 0]}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.25}
        maxPolarAngle={1.45}
        enablePan={false}
      />
      {step === 0 ? (
        <CameraConnectionAnimation />
      ) : step === 1 ? (
        <PowerConnectionAnimation />
      ) : step === 2 ? (
        <BluetoothConnectionAnimation connected={bluetoothConnected} />
      ) : step === 3 ? (
        <WifiConnectionAnimation
          wifi={wifiConnected}
          gateway={gatewayConnected}
        />
      ) : (
        <ReadyAnimation />
      )}
    </WebGLScene>
  );
}
