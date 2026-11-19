/**
 * Model lookup for the parts registry. Each part names a model key in
 * src/data/hardware-parts*.ts; this maps the key to the component that
 * draws it. Models are built from the kit primitives, sit at their own
 * origin, and take only `live` (see model-props.ts).
 */
import type { ComponentType } from "react";
import type { PartModelKey } from "@/data/hardware-parts";
import { CleanerBottleModel, MediaBottleModel, WasteContainerModel } from "./BottleModel";
import { CameraModel } from "./CameraModel";
import { CO2SensorModel } from "./CO2SensorModel";
import { CO2ValveModel } from "./CO2ValveModel";
import { EndstopModel } from "./EndstopModel";
import { FanModel } from "./FanModel";
import { FPCModel } from "./FPCModel";
import { DispenseHeadModel } from "./fluidics/DispenseHeadModel";
import { DisposalBinModel } from "./fluidics/DisposalBinModel";
import { HepaFilterModel } from "./fluidics/HepaFilterModel";
import { AdditionPumpModel, AspirationPumpModel } from "./fluidics/PeristalticPumpModel";
import { AdditionValveModel, AspirationValveModel } from "./fluidics/PinchValveModel";
import { AdditionControllerModel, AspirationControllerModel } from "./fluidics/SMC10Model";
import { HeatedPlatformModel } from "./HeatedPlatformModel";
import type { PartModelProps } from "./model-props";
import { PHModuleModel } from "./PHModuleModel";
import { PHProbeModel } from "./PHProbeModel";
import { PicoModel } from "./PicoModel";
import { PrinterControllerModel } from "./PrinterControllerModel";
import { RaspberryPiModel } from "./RaspberryPiModel";
import { SHT85Model } from "./SHT85Model";
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
  printer_controller: PrinterControllerModel,
  endstop: EndstopModel,
  heated_platform: HeatedPlatformModel,
  well_plate: WellPlateModel,
  fan: FanModel,
  co2_valve: CO2ValveModel,
  hepa_filter: HepaFilterModel,
  dispense_head: DispenseHeadModel,
  addition_pump: AdditionPumpModel,
  aspiration_pump: AspirationPumpModel,
  addition_controller: AdditionControllerModel,
  aspiration_controller: AspirationControllerModel,
  addition_valve: AdditionValveModel,
  aspiration_valve: AspirationValveModel,
  media_bottle: MediaBottleModel,
  cleaner_bottle: CleanerBottleModel,
  waste_container: WasteContainerModel,
  disposal_bin: DisposalBinModel,
  tip_rack: TipRackModel,
};
