import { Line } from "@react-three/drei";
import SceneLabel from "./SceneLabel";
import {
  componentById,
  componentPosition,
  connectionDefinitions,
  type Vec3,
} from "./registry/componentRegistry";
export default function ComponentConnections({
  selected,
  exploded,
  online,
}: {
  selected: string | null;
  exploded: boolean;
  online: boolean;
}) {
  const pi = componentPosition(componentById.raspberry_pi, exploded),
    network: Vec3 = [5.3, 3.3, -0.9];
  return (
    <group>
      {connectionDefinitions
        .filter((c) => !selected || c.from === selected || c.to === selected)
        .map((c) => {
          const a = componentPosition(componentById[c.from], exploded),
            b = componentPosition(componentById[c.to], exploded);
          const middle = a.map(
            (n, i) => (n + b[i]) / 2 + (i === 1 ? 0.4 : 0),
          ) as Vec3;
          return (
            <group key={c.from}>
              <Line
                points={[a, middle, b]}
                color={c.planned ? "#667c91" : "#569fff"}
                lineWidth={1}
                dashed={c.planned}
                dashSize={0.12}
                gapSize={0.08}
              />
              <SceneLabel
                position={middle}
                text={c.label.replace(" · ", ": ")}
                className="connection-label"
              />
            </group>
          );
        })}
      <Line
        points={[pi, network]}
        color={online ? "#4e9eea" : "#546274"}
        lineWidth={1}
        dashed={!online}
      />
      <SceneLabel
        position={network}
        text={`Internet / gateway\nWSS ${online ? "connected" : "not connected"}`}
        className="connection-label"
      />
    </group>
  );
}
