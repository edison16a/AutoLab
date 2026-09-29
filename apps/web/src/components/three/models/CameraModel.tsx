import { Board, Box, Cylinder, Ring, Bolt, Marking } from "./Primitives";
export default function CameraModel({ online = false }: { online?: boolean }) {
  return (
    <group>
      <Board size={[0.6, 0.028, 0.6]} />
      <Box position={[0, -0.042, 0]} size={[0.36, 0.06, 0.36]} color="dark" />
      <Cylinder
        position={[0, -0.1, 0]}
        radius={0.235}
        height={0.1}
        color="metal"
      />
      <Cylinder
        position={[0, -0.24, 0]}
        radius={0.195}
        height={0.23}
        color="rubber"
      />
      {[-0.145, -0.2, -0.29, -0.345].map((y) => (
        <Ring key={y} position={[0, y, 0]} radius={0.19} color="dark" thin />
      ))}
      {Array.from({ length: 32 }, (_, i) => {
        const a = (i * Math.PI * 2) / 32;
        return (
          <Box
            key={i}
            position={[Math.sin(a) * 0.195, -0.235, Math.cos(a) * 0.195]}
            rotation={[0, a, 0]}
            size={[0.009, 0.085, 0.012]}
            color="frame"
          />
        );
      })}
      <Cylinder
        position={[0, -0.365, 0]}
        radius={0.148}
        height={0.025}
        color="dark"
      />
      <mesh position={[0, -0.383, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.126, 40]} />
        <meshPhysicalMaterial
          color="#203b42"
          roughness={0.08}
          metalness={0.2}
          emissive="#18373d"
          emissiveIntensity={0.4}
          clearcoat={1}
        />
      </mesh>
      <Ring position={[0, -0.38, 0]} radius={0.139} color="dark" thin />
      {[-0.24, 0.24].flatMap((x) =>
        [-0.24, 0.24].map((z) => (
          <Bolt key={x + ":" + z} position={[x, 0.026, z]} radius={0.022} />
        )),
      )}
      <Box
        position={[0.23, 0.052, 0]}
        size={[0.065, 0.073, 0.3]}
        color="white"
      />
      <Box
        position={[0.23, 0.092, 0]}
        size={[0.018, 0.008, 0.27]}
        color="dark"
      />
      <Marking
        text="HQ CAMERA"
        position={[-0.06, 0.016, 0.22]}
        width={0.27}
        height={0.042}
      />
      <Box
        position={[-0.15, 0.04, -0.12]}
        size={[0.13, 0.035, 0.12]}
        color="dark"
      />
      <Cylinder
        position={[-0.24, 0.025, 0.15]}
        radius={0.012}
        height={0.014}
        color={online ? "led" : "dark"}
      />
    </group>
  );
}
