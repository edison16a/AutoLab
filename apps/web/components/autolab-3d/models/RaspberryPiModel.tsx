import { Board, Box, Cylinder, Pins } from "./Primitives";
export default function RaspberryPiModel({
  powered = false,
  highlight,
}: {
  powered?: boolean;
  highlight?: "csi" | "power";
}) {
  return (
    <group>
      <Board size={[1.05, 0.045, 0.72]} />
      <Box position={[-0.1, 0.09, 0]} size={[0.28, 0.12, 0.28]} color="metal" />
      <Box position={[0.3, 0.13, -0.18]} size={[0.22, 0.22, 0.27]} />
      <Box position={[0.3, 0.13, 0.13]} size={[0.22, 0.22, 0.27]} />
      <Box position={[0.39, 0.13, 0.35]} size={[0.32, 0.24, 0.24]} />
      <Box
        position={[-0.2, 0.06, -0.31]}
        size={[0.5, 0.08, 0.075]}
        color="dark"
      />
      <group position={[-0.2, 0.09, -0.31]}>
        <Pins count={20} length={0.46} />
      </group>
      <Box
        position={[-0.45, 0.045, 0.21]}
        size={[0.19, 0.08, 0.12]}
        color={highlight === "power" ? "blue" : "metal"}
      />
      <Box
        position={[-0.25, 0.075, 0.08]}
        size={[0.08, 0.11, 0.36]}
        color={highlight === "csi" ? "blue" : "dark"}
      />
      <Box
        position={[-0.245, 0.13, 0.08]}
        size={[0.03, 0.02, 0.36]}
        color="white"
      />
      <Box
        position={[-0.18, 0.025, 0.34]}
        size={[0.15, 0.045, 0.075]}
        color="metal"
      />
      <Cylinder
        position={[-0.37, 0.035, -0.22]}
        radius={0.017}
        height={0.025}
        color={powered ? "led" : "dark"}
      />
    </group>
  );
}
