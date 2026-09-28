import { Box, Cylinder } from "./Primitives";
export function PipetteModel() {
  return (
    <group>
      <Cylinder
        position={[0, 0.4, 0]}
        radius={0.12}
        height={0.65}
        color="white"
      />
      <Cylinder
        position={[0, 0.78, 0]}
        radius={0.14}
        height={0.14}
        color="blue"
      />
      <Cylinder
        position={[0, -0.02, 0]}
        radius={0.055}
        height={0.25}
        color="white"
      />
      <mesh position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.055, 0.25, 16]} />
        <meshStandardMaterial color="#d9e6e8" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
export default function PrinterFrameModel() {
  return (
    <group>
      <Box position={[0, 0.05, 0]} size={[4.8, 0.25, 4.1]} color="dark" />
      <Box position={[0, 0.2, 0]} size={[4.35, 0.05, 3.7]} color="metal" />
      {[-2.2, 2.2].flatMap((x) =>
        [-1.8, 1.8].map((z) => (
          <group key={`${x}${z}`}>
            <Box
              position={[x, 2.15, z]}
              size={[0.14, 4.05, 0.14]}
              color="frame"
            />
            <Box
              position={[x, 2.15, z + 0.075]}
              size={[0.035, 3.9, 0.01]}
              color="metal"
            />
            <Box
              position={[x, -0.15, z]}
              size={[0.38, 0.25, 0.38]}
              color="rubber"
            />
          </group>
        )),
      )}
      {[0.35, 4.1].map((y) => (
        <group key={y}>
          {[-1.8, 1.8].map((z) => (
            <Box
              key={z}
              position={[0, y, z]}
              size={[4.5, 0.14, 0.14]}
              color="frame"
            />
          ))}
          {[-2.2, 2.2].map((x) => (
            <Box
              key={x}
              position={[x, y, 0]}
              size={[0.14, 0.14, 3.65]}
              color="frame"
            />
          ))}
        </group>
      ))}
      <Box position={[-2.2, 2.2, 0]} size={[0.025, 3.5, 3.5]} color="glass" />
      <Box position={[0, 2.2, -1.82]} size={[4.35, 3.5, 0.025]} color="glass" />
      <Box position={[2.2, 2.2, 0]} size={[0.025, 3.5, 3.5]} color="glass" />
      <Box position={[0, 3.4, -0.25]} size={[4.1, 0.18, 0.22]} color="metal" />
      <Cylinder
        position={[0, 3.6, -0.3]}
        radius={0.035}
        height={4}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Box
        position={[-0.6, 3.35, 0.05]}
        size={[0.72, 0.42, 0.55]}
        color="dark"
      />
      <Box
        position={[-0.6, 3.35, 0.34]}
        size={[0.5, 0.23, 0.035]}
        color="blue"
      />
      <Cylinder position={[-1.95, 2.1, -1.4]} radius={0.035} height={3.5} />
      <Cylinder position={[1.95, 2.1, -1.4]} radius={0.035} height={3.5} />
      <group position={[-0.6, 1.8, 0.15]}>
        <PipetteModel />
      </group>
      <Box position={[0.65, 3.6, 0]} size={[0.1, 0.1, 0.9]} color="frame" />
      <Box position={[0.65, 3.45, 0.35]} size={[0.1, 0.3, 0.1]} color="frame" />
      <Box position={[0, 0.42, 0.35]} size={[1.95, 0.15, 1.45]} color="dark" />
      <Box position={[0, 0.53, 0.35]} size={[1.72, 0.12, 1.15]} color="white" />
      {Array.from({ length: 24 }, (_, i) => (
        <Cylinder
          key={i}
          position={[
            ((i % 6) - 2.5) * 0.25,
            0.605,
            (Math.floor(i / 6) - 1.5) * 0.25 + 0.35,
          ]}
          radius={0.083}
          height={0.015}
          color="dark"
        />
      ))}
      <group position={[-1.48, 0.75, 0.8]}>
        <Cylinder radius={0.32} height={0.95} color="white" />
        <Cylinder
          position={[0, 0.52, 0]}
          radius={0.24}
          height={0.12}
          color="blue"
        />
        <Box position={[0, 0, 0.325]} size={[0.36, 0.32, 0.01]} color="blue" />
      </group>
      <group position={[1.5, 0.7, 1]}>
        <Cylinder radius={0.32} height={0.85} color="white" />
        <Cylinder
          position={[0, 0.46, 0]}
          radius={0.25}
          height={0.12}
          color="dark"
        />
        <Box position={[0, 0, 0.325]} size={[0.32, 0.25, 0.01]} color="red" />
      </group>
      <Box position={[2.7, 0.55, 0.4]} size={[1.25, 0.1, 1.8]} color="frame" />
      <Box position={[2.7, 1.26, 0.4]} size={[1.25, 0.06, 1]} color="dark" />
      <Box position={[0, 0.12, 2.065]} size={[1.5, 0.16, 0.025]} color="blue" />
    </group>
  );
}
