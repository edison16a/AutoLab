import { Board, Box, Cylinder, Pins, Chip, Marking } from "./Primitives";
function USBStack({ z, blue = false }: { z: number; blue?: boolean }) {
  return (
    <group position={[0.43, 0.13, z]}>
      <Box size={[0.24, 0.24, 0.18]} />
      {[0.06, -0.06].map((y) => (
        <group key={y} position={[0.122, y, 0]}>
          <Box size={[0.004, 0.084, 0.142]} color="dark" />
          <Box
            position={[0.004, -0.016, 0]}
            size={[0.008, 0.025, 0.11]}
            color={blue ? "blue" : "rubber"}
          />
          {[-0.038, -0.012, 0.012, 0.038].map((z) => (
            <Box
              key={z}
              position={[0.01, -0.002, z]}
              size={[0.006, 0.008, 0.006]}
              color="gold"
            />
          ))}
        </group>
      ))}
    </group>
  );
}
export default function RaspberryPiModel({
  powered = false,
  highlight,
}: {
  powered?: boolean;
  highlight?: "csi" | "power";
}) {
  return (
    <group>
      <Board size={[1.05, 0.025, 0.72]} />
      <Chip position={[-0.09, 0.044, 0.005]} size={[0.23, 0.055, 0.23]} />
      <Box
        position={[-0.09, 0.075, 0.005]}
        size={[0.19, 0.009, 0.19]}
        color="metal"
      />
      <Marking
        text="BCM2711"
        position={[-0.09, 0.082, 0.005]}
        width={0.17}
        height={0.03}
        color="#454b46"
      />
      <Chip position={[0.18, 0.038, 0]} size={[0.14, 0.04, 0.19]} />
      <Chip position={[-0.33, 0.034, -0.13]} size={[0.13, 0.028, 0.12]} />
      <USBStack z={-0.21} blue />
      <USBStack z={0.01} />
      <group position={[0.4, 0.15, 0.255]}>
        <Box size={[0.28, 0.27, 0.2]} />
        <Box position={[0.142, 0, 0]} size={[0.006, 0.18, 0.16]} color="dark" />
        <Box
          position={[0.147, -0.072, 0]}
          size={[0.008, 0.055, 0.072]}
          color="rubber"
        />
        {[-0.075, 0.075].map((z) => (
          <Box
            key={z}
            position={[0.147, 0.098, z]}
            size={[0.005, 0.024, 0.02]}
            color="gold"
          />
        ))}
      </group>
      <Box
        position={[-0.13, 0.044, -0.303]}
        size={[0.64, 0.055, 0.085]}
        color="dark"
      />
      {[-0.025, 0.025].map((z) => (
        <group key={z} position={[-0.13, 0.035, -0.303 + z]}>
          <Pins count={20} length={0.6} />
        </group>
      ))}
      <group position={[-0.45, 0.042, 0.21]}>
        <Box
          size={[0.15, 0.07, 0.105]}
          color={highlight === "power" ? "blue" : "metal"}
        />
        <Box
          position={[-0.077, 0, 0]}
          size={[0.003, 0.043, 0.075]}
          color="dark"
        />
        <Box
          position={[-0.08, 0, 0]}
          size={[0.004, 0.012, 0.051]}
          color="rubber"
        />
      </group>
      {[-0.26, -0.065].map((x) => (
        <group key={x} position={[x, 0.029, 0.327]}>
          <Box size={[0.12, 0.047, 0.07]} />
          <Box
            position={[0, 0, 0.036]}
            size={[0.085, 0.023, 0.002]}
            color="dark"
          />
        </group>
      ))}
      <Box
        position={[-0.25, 0.056, 0.08]}
        size={[0.06, 0.085, 0.31]}
        color={highlight === "csi" ? "blue" : "white"}
      />
      <Box
        position={[-0.251, 0.1, 0.08]}
        size={[0.02, 0.008, 0.27]}
        color="dark"
      />
      <group position={[0.18, 0.034, 0.285]} rotation={[Math.PI / 2, 0, 0]}>
        <Cylinder radius={0.05} height={0.14} color="dark" />
      </group>
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          position={[
            -0.42 + (i % 5) * 0.06,
            0.022,
            -0.21 + Math.floor(i / 5) * 0.04,
          ]}
          size={[0.029, 0.018, 0.014]}
          color={i % 3 ? "metal" : "gold"}
        />
      ))}
      <Marking
        text="Raspberry Pi 4"
        position={[0, 0.014, 0.2]}
        width={0.28}
        height={0.044}
      />
      <Marking
        text="GPIO"
        position={[-0.17, 0.014, -0.235]}
        width={0.13}
        height={0.028}
      />
      <Cylinder
        position={[-0.47, 0.025, -0.19]}
        radius={0.014}
        height={0.018}
        color={powered ? "led" : "dark"}
      />
      <Box position={[-0.4, -0.047, 0]} size={[0.22, 0.04, 0.19]} />
    </group>
  );
}
