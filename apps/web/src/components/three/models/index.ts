/**
 * Model lookup for the parts registry. Each part names a model key in
 * src/data/hardware-parts*.ts; this maps the key to the component that
 * draws it. Models are built from the kit primitives, sit at their own
 * origin, and take only `live` (see model-props.ts).
 */
import type { ComponentType } from "react";
import type { PartModelKey } from "@/data/hardware-parts";
import { AS5600Model } from "./AS5600Model";
import { MediaBottleModel, WasteContainerModel } from "./BottleModel";
import { CameraModel } from "./CameraModel";
import { CO2SensorModel } from "./CO2SensorModel";
import { CO2ValveModel } from "./CO2ValveModel";
import { EndstopModel } from "./EndstopModel";
import { FanModel } from "./FanModel";
import { FPCModel } from "./FPCModel";
import { HeatedPlatformModel } from "./HeatedPlatformModel";
import { HX711Model } from "./HX711Model";
import { LoadCellModel } from "./LoadCellModel";
import { MicroswitchModel } from "./MicroswitchModel";
import type { PartModelProps } from "./model-props";
import { PHModuleModel } from "./PHModuleModel";
import { PHProbeModel } from "./PHProbeModel";
import { PicoModel } from "./PicoModel";
import { PipetteModel } from "./PipetteModel";
import { PrinterControllerModel } from "./PrinterControllerModel";
import { RaspberryPiModel } from "./RaspberryPiModel";
import { SHT85Model } from "./SHT85Model";
import { StepperMotorModel } from "./StepperMotorModel";
import { TipRackModel } from "./TipRackModel";
import { WellPlateModel } from "./WellPlateModel";

export type { PartModelProps } from "./model-props";
export { PrinterFrameModel } from "./PrinterFrameModel";

export const PART_MODELS: Record<PartModelKey, ComponentType<PartModelProps>> = {
  raspberry_pi: RaspberryPiModel,
  camera: CameraModel,
  fpc: FPCModel,
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
  heated_platform: HeatedPlatformModel,
  well_plate: WellPlateModel,
  fan: FanModel,
  co2_valve: CO2ValveModel,
  stepper_motor: StepperMotorModel,
  media_bottle: MediaBottleModel,
  waste_container: WasteContainerModel,
  tip_rack: TipRackModel,
  pipette: PipetteModel,
};
