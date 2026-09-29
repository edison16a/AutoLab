/**
 * How the parts are wired, from the controls architecture sketch. Only the
 * camera link carries data today; everything else is planned.
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
  { from: "pipette_motor", to: "pico", label: "Stepper driver", live: false },
  { from: "as5600", to: "pico", label: "I²C", live: false },
  { from: "pipette_home", to: "pico", label: "Digital input", live: false },
  { from: "hx711", to: "pico", label: "Digital", live: false },
  { from: "load_cell", to: "hx711", label: "Bridge", live: false },
  { from: "x_endstop", to: "printer_controller", label: "Endstop", live: false },
  { from: "y_endstop", to: "printer_controller", label: "Endstop", live: false },
  { from: "z_endstop", to: "printer_controller", label: "Endstop", live: false },
];

/** Connections that touch a part, for emphasis when it's selected. */
export function connectionsFor(partId: string) {
  return PART_CONNECTIONS.filter((link) => link.from === partId || link.to === partId);
}
