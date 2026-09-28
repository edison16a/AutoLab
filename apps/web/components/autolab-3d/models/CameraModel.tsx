import { Board, Box, Cylinder } from "./Primitives";
export default function CameraModel({ online = false }: { online?: boolean }) {
  return (
    <group>
      <Board size={[0.58, 0.05, 0.55]} />
      <Box position={[0, -0.06, 0]} size={[0.36, 0.1, 0.36]} color="dark" />
      <Cylinder
        position={[0, -0.18, 0]}
        radius={0.18}
        height={0.24}
        color="dark"
      />
      <Cylinder
        position={[0, -0.31, 0]}
        radius={0.14}
        height={0.04}
        color="blue"
      />
      <Cylinder
        position={[0, -0.34, 0]}
        radius={0.1}
        height={0.025}
        color="dark"
      />
      <Box
        position={[0.22, 0.065, 0]}
        size={[0.075, 0.08, 0.3]}
        color="white"
      />
      <Cylinder
        position={[-0.23, 0.04, 0.2]}
        radius={0.014}
        height={0.025}
        color={online ? "led" : "red"}
      />
    </group>
  );
}
