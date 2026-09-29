import { memo, useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { Group, Vector3 } from "three";
import {
  autolabComponents,
  componentPosition,
  type ComponentDefinition,
} from "./registry/componentRegistry";
import type { AutolabComponentState } from "./state/useAutolab3DState";
import ComponentLabel from "./ComponentLabel";
import RaspberryPiModel from "./models/RaspberryPiModel";
import CameraModel from "./models/CameraModel";
import FPCModel from "./models/FPCModel";
import PrinterFrameModel from "./models/PrinterFrameModel";
import {
  SHT85Model,
  CO2SensorModel,
  PHModuleModel,
  PHProbeModel,
  PicoModel,
  AS5600Model,
  LoadCellModel,
  HX711Model,
  MicroswitchModel,
  PrinterControllerModel,
  EndstopModel,
} from "./models/SensorModels";
const models: Record<string, React.ComponentType> = {
  sht85: SHT85Model,
  co2_sensor: CO2SensorModel,
  ph_sensor: PHModuleModel,
  ph_probe: PHProbeModel,
  pico: PicoModel,
  as5600: AS5600Model,
  load_cell: LoadCellModel,
  hx711: HX711Model,
  pipette_home: MicroswitchModel,
  printer_controller: PrinterControllerModel,
  endstop: EndstopModel,
};
function Part({
  definition: c,
  state,
  selected,
  exploded,
  onSelect,
}: {
  definition: ComponentDefinition;
  state: AutolabComponentState;
  selected: boolean;
  exploded: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<Group>(null),
    [hover, setHover] = useState(false),
    invalidate = useThree((s) => s.invalidate),
    gl = useThree((s) => s.gl);
  const target = useRef(new Vector3(...componentPosition(c, exploded)));
  useEffect(() => {
    target.current.set(...componentPosition(c, exploded));
    invalidate();
  }, [c, exploded, invalidate]);
  useEffect(
    () => () => {
      gl.domElement.style.cursor = "auto";
    },
    [gl],
  );
  useFrame((_, dt) => {
    if (
      group.current &&
      group.current.position.distanceTo(target.current) > 0.002
    ) {
      group.current.position.lerp(target.current, 1 - Math.exp(-dt * 8));
      invalidate();
    }
  });
  const Model = models[c.model];
  function over(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    setHover(true);
    gl.domElement.style.cursor = "pointer";
  }
  return (
    <group
      ref={group}
      position={c.position}
      name={c.id}
      userData={{ componentId: c.id }}
    >
      <mesh
        name={`hit-${c.id}`}
        position={c.id === "camera" ? [0, -0.15, 0] : [0, 0, 0]}
        onPointerOver={over}
        onPointerOut={() => {
          setHover(false);
          gl.domElement.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          setHover(false);
          gl.domElement.style.cursor = "auto";
          onSelect(c.id);
        }}
      >
        <boxGeometry args={c.size} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>
      {c.model === "raspberry_pi" ? (
        <RaspberryPiModel powered={state.online} />
      ) : c.model === "camera" ? (
        <CameraModel online={state.online} />
      ) : c.model === "fpc" ? (
        <FPCModel />
      ) : Model ? (
        <Model />
      ) : null}
      {(hover || selected) && (
        <mesh raycast={() => {}}>
          <boxGeometry
            args={c.size.map((n) => n + 0.1) as [number, number, number]}
          />
          <meshBasicMaterial visible={false} />
          <Edges
            raycast={() => {}}
            color={selected ? "#67835b" : "#788575"}
            linewidth={1}
          />
        </mesh>
      )}
      {hover && <ComponentLabel name={c.shortName} status={state.status} />}
    </group>
  );
}
export default memo(function AutolabModel({
  states,
  selected,
  exploded,
  onSelect,
  isolated = false,
}: {
  states: Record<string, AutolabComponentState>;
  selected: string | null;
  exploded: boolean;
  onSelect: (id: string) => void;
  isolated?: boolean;
}) {
  return (
    <group>
      {!isolated && <PrinterFrameModel />}
      {autolabComponents
        .filter((c) => !isolated || c.id === selected)
        .map((c) => (
          <Part
            key={c.id}
            definition={c}
            state={states[c.id]}
            selected={selected === c.id && !isolated}
            exploded={exploded}
            onSelect={onSelect}
          />
        ))}
    </group>
  );
});
