"""Which hardware this Pi drives, from AUTOLAB_* variables in .env.

Nothing is on by default. With none of these set the agent behaves exactly as
it did before hardware support: no serial ports opened, no I2C, no GPIO and
no `components` in the heartbeat.
"""

import os
from dataclasses import dataclass


def _flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, ""))
    except ValueError:
        return default


@dataclass
class HardwareSettings:
    # "auto" finds the Pico by its USB vendor id. Empty means no Pico.
    pico_port: str = ""
    # The Marlin board's serial port, e.g. /dev/ttyACM1 or /dev/serial/by-id/...
    marlin_port: str = ""
    marlin_baud: int = 115200
    # I2C bus number for the SHT85, K33 and EZO-pH, or None to leave I2C alone.
    i2c_bus: int | None = None
    # Drive the heater, circulation fan and CO2 valve outputs.
    outputs: bool = False
    # Run the heater and CO2 loop. Needs outputs and the sensors.
    control: bool = False
    target_c: float = 37.0
    target_co2_percent: float = 5.0

    @property
    def enabled(self) -> bool:
        return bool(self.pico_port or self.marlin_port or self.i2c_bus is not None or self.outputs)

    @classmethod
    def from_env(cls) -> "HardwareSettings":
        bus = os.getenv("AUTOLAB_I2C_BUS", "").strip()
        return cls(
            pico_port=os.getenv("AUTOLAB_PICO_PORT", "").strip(),
            marlin_port=os.getenv("AUTOLAB_MARLIN_PORT", "").strip(),
            marlin_baud=int(_float("AUTOLAB_MARLIN_BAUD", 115200)),
            i2c_bus=int(bus) if bus.isdigit() else None,
            outputs=_flag("AUTOLAB_ENV_OUTPUTS"),
            control=_flag("AUTOLAB_ENV_CONTROL"),
            target_c=_float("AUTOLAB_TARGET_C", 37.0),
            target_co2_percent=_float("AUTOLAB_TARGET_CO2", 5.0),
        )
