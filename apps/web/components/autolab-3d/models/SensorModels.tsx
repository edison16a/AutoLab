import { Board, Box, Cylinder, Pins } from "./Primitives";
export function SHT85Model() {
  return (
    <group>
      <Box size={[0.14, 0.4, 0.1]} color="green" />
      <Box position={[0, 0.19, 0]} size={[0.18, 0.13, 0.16]} color="white" />
      <group position={[0, -0.25, 0]} rotation={[0, 0, Math.PI]}>
        <Pins count={4} length={0.12} />
      </group>
    </group>
  );
}
export function CO2SensorModel() {
  return (
    <group>
      <Board size={[0.72, 0.04, 0.5]} />
      <Box position={[0, 0.14, 0]} size={[0.56, 0.23, 0.35]} color="metal" />
      {[-0.18, -0.06, 0.06, 0.18].map((x) => (
        <Box
          key={x}
          position={[x, 0.26, 0]}
          size={[0.045, 0.012, 0.23]}
          color="dark"
        />
      ))}
      <group position={[0, 0.05, 0.22]}>
        <Pins count={6} length={0.4} />
      </group>
    </group>
  );
}
export function PHModuleModel() {
  return (
    <group>
      <Board size={[0.5, 0.04, 0.35]} />
      <Box position={[0, 0.07, 0]} size={[0.22, 0.09, 0.18]} color="blue" />
      <group position={[0, 0.04, 0.16]}>
        <Pins count={6} length={0.4} />
      </group>
    </group>
  );
}
export function PHProbeModel() {
  return (
    <group>
      <Cylinder radius={0.065} height={0.6} color="dark" />
      <Cylinder
        position={[0, -0.35, 0]}
        radius={0.035}
        height={0.15}
        color="white"
      />
      <Cylinder
        position={[0, 0.35, 0]}
        radius={0.07}
        height={0.1}
        color="blue"
      />
    </group>
  );
}
export function PicoModel() {
  return (
    <group>
      <Board size={[0.34, 0.035, 0.72]} />
      <Box position={[0, 0.06, 0]} size={[0.17, 0.05, 0.17]} color="dark" />
      <Box position={[0, 0.07, 0.33]} size={[0.16, 0.1, 0.12]} />
      {[-0.14, 0.14].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Pins count={12} length={0.6} />
        </group>
      ))}
    </group>
  );
}
export function AS5600Model() {
  return (
    <group>
      <Board size={[0.3, 0.03, 0.3]} />
      <Box position={[0, 0.055, 0]} size={[0.1, 0.06, 0.1]} color="dark" />
      <Cylinder position={[0, 0.14, 0]} radius={0.065} height={0.045} />
    </group>
  );
}
export function LoadCellModel() {
  return (
    <group>
      <Box size={[0.18, 0.56, 0.18]} />
      <Cylinder
        position={[0, 0.05, 0.095]}
        radius={0.055}
        height={0.01}
        rotation={[Math.PI / 2, 0, 0]}
        color="dark"
      />
      <Box position={[0, -0.06, 0.1]} size={[0.09, 0.16, 0.01]} color="white" />
    </group>
  );
}
export function HX711Model() {
  return (
    <group>
      <Board size={[0.4, 0.03, 0.27]} />
      <Box position={[0, 0.055, 0]} size={[0.2, 0.06, 0.13]} color="dark" />
      <group position={[0, 0, 0.1]}>
        <Pins count={4} length={0.25} />
      </group>
    </group>
  );
}
export function MicroswitchModel() {
  return (
    <group>
      <Box size={[0.28, 0.15, 0.12]} color="dark" />
      <Box
        position={[0.04, 0.12, 0]}
        size={[0.35, 0.025, 0.09]}
        rotation={[0, 0, -0.25]}
      />
      <Box position={[0.1, 0.08, 0]} size={[0.04, 0.07, 0.05]} color="red" />
    </group>
  );
}
export function PrinterControllerModel() {
  return (
    <group>
      <Board size={[1, 0.04, 0.6]} />
      <Box position={[0, 0.075, 0]} size={[0.23, 0.08, 0.23]} color="dark" />
      {[-0.3, 0, 0.3].map((x) => (
        <Box
          key={x}
          position={[x, 0.11, -0.2]}
          size={[0.17, 0.14, 0.17]}
          color="blue"
        />
      ))}
      <group position={[0, 0, 0.25]}>
        <Pins count={16} length={0.85} />
      </group>
    </group>
  );
}
export function EndstopModel() {
  return (
    <group>
      <Board size={[0.3, 0.025, 0.2]} />
      <group position={[0, 0.09, 0]} scale={0.65}>
        <MicroswitchModel />
      </group>
    </group>
  );
}
