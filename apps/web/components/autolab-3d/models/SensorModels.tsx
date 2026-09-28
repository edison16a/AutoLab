import {
  Board,
  Box,
  Cylinder,
  Pins,
  Chip,
  Ring,
  Bolt,
  Marking,
} from "./Primitives";
export function SHT85Model() {
  return (
    <group>
      <Box size={[0.14, 0.4, 0.1]} color="green" />
      <Box position={[0, 0.19, 0]} size={[0.18, 0.13, 0.16]} color="white" />
      {[-0.05, -0.025, 0, 0.025, 0.05].map((x) => (
        <Box
          key={x}
          position={[x, 0.21, 0.081]}
          size={[0.012, 0.065, 0.004]}
          color="dark"
        />
      ))}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Marking
          text="SHT85"
          position={[0, 0.052, -0.02]}
          width={0.11}
          height={0.03}
        />
      </group>
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
      <Box position={[0, 0.14, 0]} size={[0.56, 0.23, 0.35]} color="gold" />
      <Marking
        text="Senseair K33"
        position={[0, 0.263, -0.12]}
        width={0.39}
        height={0.04}
        color="#33382f"
      />
      {[-0.24, 0.24].flatMap((x) =>
        [-0.14, 0.14].map((z) => (
          <Bolt key={`${x}${z}`} position={[x, 0.26, z]} radius={0.018} />
        )),
      )}
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
      <Marking
        text="EZO pH"
        position={[0, 0.12, 0]}
        width={0.19}
        height={0.048}
      />
      <group position={[-0.23, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Cylinder radius={0.055} height={0.15} />
        <Ring position={[0, 0.08, 0]} radius={0.045} color="gold" />
      </group>
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
      {[0.18, 0.22, 0.26].map((y) => (
        <Ring key={y} position={[0, y, 0]} radius={0.066} color="frame" />
      ))}
      <mesh position={[0, -0.445, 0]}>
        <sphereGeometry args={[0.037, 20, 12]} />
        <meshPhysicalMaterial
          color="#b2ccc2"
          roughness={0.12}
          transparent
          opacity={0.7}
        />
      </mesh>
      <group position={[0, 0.03, 0.066]} rotation={[Math.PI / 2, 0, 0]}>
        <Marking text="pH" position={[0, 0, 0]} width={0.07} height={0.045} />
      </group>
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
      <Chip position={[0, 0.06, 0]} size={[0.15, 0.04, 0.15]} />
      <Marking
        text="RP2040"
        position={[0, 0.082, 0]}
        width={0.13}
        height={0.027}
      />
      <Marking
        text="PICO"
        position={[0, 0.02, -0.23]}
        width={0.16}
        height={0.055}
      />
      <Box
        position={[0, 0.046, 0.17]}
        size={[0.07, 0.045, 0.075]}
        color="white"
      />
      <Box position={[0, 0.07, 0.33]} size={[0.16, 0.1, 0.12]} />
      <Box
        position={[0, 0.07, 0.391]}
        size={[0.12, 0.052, 0.004]}
        color="dark"
      />
      {[-0.14, 0.14].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Pins count={20} length={0.6} />
        </group>
      ))}
    </group>
  );
}
export function AS5600Model() {
  return (
    <group>
      <Board size={[0.3, 0.03, 0.3]} />
      <Chip position={[0, 0.045, 0]} size={[0.085, 0.04, 0.075]} />
      <Cylinder position={[0, 0.15, 0]} radius={0.052} height={0.04} />
      <Ring position={[0, 0.174, 0]} radius={0.04} color="dark" />
      <group position={[0, 0, -0.12]}>
        <Pins count={4} length={0.18} />
      </group>
      <Marking
        text="AS5600"
        position={[0, 0.017, 0.095]}
        width={0.18}
        height={0.03}
      />
    </group>
  );
}
export function LoadCellModel() {
  return (
    <group>
      <Box size={[0.18, 0.56, 0.18]} />
      {[-0.21, 0.21].map((y) => (
        <group key={y} position={[0, y, 0.093]} rotation={[Math.PI / 2, 0, 0]}>
          <Ring radius={0.031} color="dark" />
        </group>
      ))}
      <Box
        position={[-0.092, 0, 0]}
        size={[0.004, 0.17, 0.115]}
        color="white"
      />
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
      <Chip position={[0, 0.045, 0]} size={[0.15, 0.035, 0.1]} />
      <Marking
        text="HX711"
        position={[0, 0.066, 0]}
        width={0.13}
        height={0.03}
      />
      <group position={[0, 0, -0.1]}>
        <Pins count={6} length={0.25} />
      </group>
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
      {[-0.095, 0.095].map((x) => (
        <group key={x} position={[x, 0, 0.064]} rotation={[Math.PI / 2, 0, 0]}>
          <Ring radius={0.023} color="metal" />
        </group>
      ))}
      {[-0.09, 0, 0.09].map((x) => (
        <Box
          key={x}
          position={[x, -0.105, 0]}
          size={[0.022, 0.065, 0.012]}
          color="gold"
        />
      ))}
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
      <Chip position={[0, 0.065, 0]} size={[0.23, 0.07, 0.23]} />
      <Marking
        text="MOTION CONTROL"
        position={[0, 0.023, 0.19]}
        width={0.6}
        height={0.05}
      />
      {[-0.3, 0, 0.3].map((x) => (
        <group key={x} position={[x, 0.19, -0.2]}>
          {[-0.055, -0.018, 0.018, 0.055].map((z) => (
            <Box
              key={z}
              position={[0, 0, z]}
              size={[0.14, 0.055, 0.013]}
              color="metal"
            />
          ))}
        </group>
      ))}
      {[-0.38, 0.38].map((x) => (
        <Cylinder
          key={x}
          position={[x, 0.085, 0.07]}
          radius={0.04}
          height={0.12}
          color="dark"
        />
      ))}
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
      <Box
        position={[-0.12, 0.045, 0]}
        size={[0.07, 0.065, 0.1]}
        color="white"
      />
      <group position={[0, 0.09, 0]} scale={0.65}>
        <MicroswitchModel />
      </group>
    </group>
  );
}
