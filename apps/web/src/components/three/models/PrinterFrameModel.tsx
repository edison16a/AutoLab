import { Box, Cylinder, Ring, Bolt, Marking } from "./Primitives";
import type { Vec3 } from "../types";

function Extrusion({
  position,
  length,
  axis = "y",
}: {
  position: Vec3;
  length: number;
  axis?: "x" | "y" | "z";
}) {
  return (
    <group
      position={position}
      rotation={
        axis === "x"
          ? [0, 0, Math.PI / 2]
          : axis === "z"
            ? [Math.PI / 2, 0, 0]
            : [0, 0, 0]
      }
    >
      <Box size={[0.16, length, 0.16]} color="frame" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            position={[0, 0, side * 0.081]}
            size={[0.045, length - 0.035, 0.003]}
            color="rubber"
          />
          <Box
            position={[side * 0.081, 0, 0]}
            size={[0.003, length - 0.035, 0.045]}
            color="rubber"
          />
        </group>
      ))}
    </group>
  );
}
function Motor({
  position,
  rotation = [0, 0, 0],
}: {
  position: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[0.4, 0.38, 0.4]} color="dark" />
      {[-0.19, 0.19].map((y) => (
        <Box key={y} position={[0, y, 0]} size={[0.41, 0.04, 0.41]} />
      ))}
      <Cylinder position={[0, 0.25, 0]} radius={0.055} height={0.14} />
      <Cylinder
        position={[0, 0.32, 0]}
        radius={0.09}
        height={0.08}
        color="gold"
      />
      {[-0.145, 0.145].flatMap((x) =>
        [-0.145, 0.145].map((z) => (
          <Bolt key={x + ":" + z} position={[x, 0.215, z]} radius={0.025} />
        )),
      )}
    </group>
  );
}
export function PipetteModel() {
  return (
    <group>
      <Cylinder
        position={[0, 0.48, 0]}
        radius={0.11}
        height={0.62}
        color="white"
      />
      <Cylinder
        position={[0, 0.84, 0]}
        radius={0.08}
        height={0.13}
        color="metal"
      />
      <Cylinder
        position={[0, 0.94, 0]}
        radius={0.145}
        height={0.065}
        color="blue"
      />
      <Box position={[0.12, 0.68, 0]} size={[0.16, 0.08, 0.17]} color="white" />
      <Box position={[0, 0.5, 0.106]} size={[0.13, 0.18, 0.022]} color="dark" />
      <group position={[0, 0.5, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <Marking
          text="1000"
          position={[0, 0.004, 0]}
          width={0.1}
          height={0.04}
        />
      </group>
      <Cylinder
        position={[0, 0.09, 0]}
        radius={0.069}
        height={0.19}
        color="white"
      />
      <Cylinder
        position={[0, -0.07, 0]}
        radius={0.044}
        height={0.16}
        color="metal"
      />
      <mesh position={[0, -0.27, 0]}>
        <cylinderGeometry args={[0.046, 0.009, 0.26, 24]} />
        <meshPhysicalMaterial
          color="#d8dfd7"
          transparent
          opacity={0.62}
          roughness={0.18}
          side={2}
        />
      </mesh>
      <Cylinder position={[0.08, 0.04, 0]} radius={0.016} height={0.42} />
    </group>
  );
}
function Bottle({
  position,
  waste = false,
}: {
  position: Vec3;
  waste?: boolean;
}) {
  return (
    <group position={position}>
      <Cylinder radius={0.27} height={0.69} color="white" />
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.15, 0.27, 0.14, 32]} />
        <meshStandardMaterial color="#e3e5df" roughness={0.4} />
      </mesh>
      <Cylinder
        position={[0, 0.53, 0]}
        radius={0.15}
        height={0.13}
        color={waste ? "dark" : "blue"}
      />
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i * Math.PI) / 10;
        return (
          <Box
            key={i}
            position={[Math.sin(a) * 0.151, 0.53, Math.cos(a) * 0.151]}
            rotation={[0, a, 0]}
            size={[0.013, 0.11, 0.009]}
            color={waste ? "frame" : "blue"}
          />
        );
      })}
      <Box position={[0, 0, 0.271]} size={[0.3, 0.31, 0.004]} color="white" />
      <group position={[0, 0, 0.275]} rotation={[Math.PI / 2, 0, 0]}>
        <Marking
          text={waste ? "WASTE" : "MEDIA"}
          position={[0, 0, 0]}
          width={0.24}
          height={0.075}
          color="#434c47"
        />
      </group>
      <Cylinder
        position={[0.045, 0.64, 0]}
        radius={0.025}
        height={0.12}
        color="metal"
      />
    </group>
  );
}
export default function PrinterFrameModel() {
  return (
    <group>
      <Box position={[0, 0.02, 0]} size={[4.65, 0.22, 3.95]} color="frame" />
      <Box position={[0, 0.145, 0]} size={[4.3, 0.028, 3.62]} color="metal" />
      {[-2.2, 2.2].flatMap((x) =>
        [-1.8, 1.8].map((z) => (
          <group key={x + ":" + z}>
            <Extrusion position={[x, 2.15, z]} length={4.05} />
            <Cylinder
              position={[x, -0.18, z]}
              radius={0.17}
              height={0.2}
              color="rubber"
            />
            <Ring position={[x, -0.09, z]} radius={0.13} color="metal" />
            {[0.4, 3.88].map((y) => (
              <group key={y} position={[x, y, z]}>
                <Box size={[0.3, 0.25, 0.035]} color="metal" />
                <group rotation={[Math.PI / 2, 0, 0]}>
                  <Bolt position={[0, 0.025, 0]} radius={0.04} />
                </group>
              </group>
            ))}
          </group>
        )),
      )}
      {[0.3, 4.1].map((y) => (
        <group key={y}>
          {[-1.8, 1.8].map((z) => (
            <Extrusion key={z} position={[0, y, z]} length={4.5} axis="x" />
          ))}
          {[-2.2, 2.2].map((x) => (
            <Extrusion key={x} position={[x, y, 0]} length={3.65} axis="z" />
          ))}
        </group>
      ))}
      <Box position={[-2.2, 2.2, 0]} size={[0.018, 3.5, 3.48]} color="glass" />
      <Box position={[0, 2.2, -1.82]} size={[4.3, 3.5, 0.018]} color="glass" />
      <Box position={[2.2, 2.2, 0]} size={[0.018, 3.5, 3.48]} color="glass" />
      {/* Paired Y rails carry the X bridge, with belt returns and drive motors. */}
      {[-1.94, 1.94].map((x) => (
        <group key={x}>
          <Cylinder
            position={[x, 3.55, 0]}
            radius={0.045}
            height={3.3}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <Box
            position={[x + 0.1, 3.51, 0]}
            size={[0.04, 0.045, 3.24]}
            color="rubber"
          />
          <Box
            position={[x, 3.53, -0.25]}
            size={[0.32, 0.15, 0.48]}
            color="dark"
          />
        </group>
      ))}
      <Extrusion position={[0, 3.43, -0.25]} length={4.08} axis="x" />
      <Cylinder
        position={[0, 3.58, -0.25]}
        radius={0.035}
        height={3.8}
        rotation={[0, 0, Math.PI / 2]}
      />
      <Box
        position={[0, 3.48, -0.12]}
        size={[3.8, 0.04, 0.045]}
        color="rubber"
      />
      <Motor position={[-1.88, 3.55, -1.5]} />
      <Motor position={[1.88, 3.55, -1.5]} />
      {/* Z stage physically joins the pipette to the carriage. */}
      <Box position={[-0.6, 2.85, 0]} size={[0.5, 1.5, 0.12]} color="metal" />
      {[-0.77, -0.43].map((x) => (
        <Cylinder
          key={x}
          position={[x, 2.83, 0.12]}
          radius={0.025}
          height={1.42}
        />
      ))}
      <Cylinder position={[-0.6, 2.88, 0.1]} radius={0.034} height={1.38} />
      {Array.from({ length: 26 }, (_, i) => (
        <Ring
          key={i}
          position={[-0.6, 2.23 + i * 0.046, 0.1]}
          radius={0.035}
          color="metal"
        />
      ))}
      <Motor position={[-0.6, 3.68, 0.08]} rotation={[Math.PI, 0, 0]} />
      <Box
        position={[-0.6, 2.45, 0.17]}
        size={[0.43, 0.33, 0.17]}
        color="dark"
      />
      <Box
        position={[-0.6, 2.28, 0.25]}
        size={[0.32, 0.08, 0.34]}
        color="metal"
      />
      <group position={[-0.6, 1.8, 0.32]}>
        <PipetteModel />
      </group>
      <Ring position={[-0.6, 2.29, 0.32]} radius={0.13} color="frame" />
      <Box
        position={[0.65, 3.56, 0.08]}
        size={[0.11, 0.09, 0.8]}
        color="metal"
      />
      <Box
        position={[0.65, 3.43, 0.35]}
        size={[0.11, 0.28, 0.08]}
        color="metal"
      />
      <Box
        position={[0.65, 3.31, 0.35]}
        size={[0.66, 0.035, 0.65]}
        color="dark"
      />
      {/* Fixed plate nest and wells, with hollow rims instead of painted dots. */}
      <Box position={[0, 0.29, 0.35]} size={[2, 0.23, 1.48]} color="frame" />
      <Box position={[0, 0.43, 0.35]} size={[1.8, 0.1, 1.23]} color="white" />
      {Array.from({ length: 24 }, (_, i) => (
        <group
          key={i}
          position={[
            ((i % 6) - 2.5) * 0.257,
            0.49,
            (Math.floor(i / 6) - 1.5) * 0.258 + 0.35,
          ]}
        >
          <Cylinder radius={0.091} height={0.02} color="dark" />
          <Ring position={[0, 0.015, 0]} radius={0.087} color="white" />
        </group>
      ))}
      <Marking
        text="1   2   3   4   5   6"
        position={[0, 0.485, 0.89]}
        width={1.48}
        height={0.05}
        color="#535b55"
      />
      <Bottle position={[-1.5, 0.53, 0.8]} />
      <Bottle position={[1.5, 0.53, 1]} waste />
      {/* Exterior electronics shelf with standoffs and controller mounting plate. */}
      <Box
        position={[2.8, 1.29, 0.4]}
        size={[1.26, 0.065, 1.45]}
        color="metal"
      />
      {[-0.43, 0.43].flatMap((x) =>
        [-0.27, 0.27].map((z) => (
          <Cylinder
            key={x + ":" + z}
            position={[2.8 + x, 1.4, 0.4 + z]}
            radius={0.028}
            height={0.2}
            color="gold"
          />
        )),
      )}
      <Box position={[2.7, 0.5, 0.4]} size={[1.25, 0.08, 1.8]} color="frame" />
      <group position={[0, 0.02, 1.99]} rotation={[Math.PI / 2, 0, 0]}>
        <Marking
          text="AUTOLAB"
          position={[0, 0, 0]}
          width={0.9}
          height={0.13}
        />
      </group>
    </group>
  );
}
