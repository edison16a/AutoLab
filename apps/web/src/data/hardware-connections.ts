/**
 * How the parts are wired and plumbed, from the controls architecture
 * sketch and the fluidics sketch. Only the camera link carries data today;
 * everything else is planned.
 */
import type { PartConnection } from "./hardware-parts-types";

export const PART_CONNECTIONS: PartConnection[] = [
  { from: "camera", to: "raspberry_pi", label: "CSI", live: true },
  { from: "sht85", to: "raspberry_pi", label: "I²C", live: false },
  { from: "co2_sensor", to: "raspberry_pi", label: "To be configured", live: false },
  { from: "ph_sensor", to: "raspberry_pi", label: "I²C", live: false },
  { from: "ph_probe", to: "ph_sensor", label: "Probe", live: false },
  { from: "pico", to: "raspberry_pi", label: "USB serial", live: false },
  { from: "printer_controller", to: "raspberry_pi", label: "USB serial", live: false },
  { from: "heated_platform", to: "raspberry_pi", label: "Heater output", live: false },
  { from: "circulation_fan", to: "raspberry_pi", label: "Fan output", live: false },
  { from: "co2_valve", to: "raspberry_pi", label: "Valve output", live: false },
  { from: "hepa_filter", to: "pico", label: "Fan PWM", live: false },
  { from: "addition_pump", to: "pico", label: "Stepper driver", live: false },
  { from: "aspiration_pump", to: "pico", label: "Stepper driver", live: false },
  { from: "addition_valve", to: "pico", label: "Valve outputs", live: false },
  { from: "aspiration_valve", to: "pico", label: "Valve outputs", live: false },
  { from: "waste_container", to: "pico", label: "Float switch", live: false },
  { from: "dispense_head", to: "addition_pump", label: "Addition line", live: false },
  { from: "dispense_head", to: "aspiration_pump", label: "Aspiration line", live: false },
  { from: "addition_pump", to: "addition_valve", label: "Tubing", live: false },
  { from: "aspiration_pump", to: "aspiration_valve", label: "Tubing", live: false },
  { from: "addition_valve", to: "media_bottle", label: "Media line", live: false },
  { from: "addition_valve", to: "cleaner_bottle", label: "Cleaner line", live: false },
  { from: "addition_valve", to: "waste_container", label: "Waste line", live: false },
  { from: "aspiration_valve", to: "waste_container", label: "Waste line", live: false },
  { from: "aspiration_valve", to: "cleaner_bottle", label: "Cleaner line", live: false },
  { from: "x_endstop", to: "printer_controller", label: "Endstop", live: false },
  { from: "y_endstop", to: "printer_controller", label: "Endstop", live: false },
  { from: "z_endstop", to: "printer_controller", label: "Endstop", live: false },
];

/** Connections that touch a part, for emphasis when it's selected. */
export function connectionsFor(partId: string) {
  return PART_CONNECTIONS.filter((link) => link.from === partId || link.to === partId);
}
