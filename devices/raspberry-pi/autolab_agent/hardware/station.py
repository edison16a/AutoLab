"""All the hardware the agent drives, checked every few seconds in one thread.

Serial, I2C and GPIO calls block, so they stay off the agent's event loop.
The heartbeat only reads the latest component list, which is quick. A part
that isn't there is retried now and then, so plugging it in later works.
"""

import logging
import threading
import time
from typing import Any

from . import components as parts
from .config import HardwareSettings
from .environment import ControlSettings, Environment, EnvironmentController, Outputs, open_bus
from .motion import Marlin, MotionError
from .pico import PicoClient, PicoError

log = logging.getLogger("agent")

POLL_EVERY = 5.0
RETRY_EVERY = 30.0
PICO_IDS = ("pico", "addition_pump", "aspiration_pump", "addition_valve", "aspiration_valve", "hepa_filter", "waste_container")
SENSOR_IDS = ("sht85", "co2_sensor", "ph_sensor")


class Station:
    def __init__(self, settings: HardwareSettings, clock: Any = time.time) -> None:
        self.settings = settings
        self.clock = clock
        self.pico: PicoClient | None = None
        self.marlin: Marlin | None = None
        self.environment: Environment | None = None
        self.outputs: Outputs | None = None
        self.controller = EnvironmentController(ControlSettings(
            target_c=settings.target_c, target_co2_percent=settings.target_co2_percent,
        ))
        self.tracker = parts.ComponentTracker()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._retry_at: dict[str, float] = {}

    @classmethod
    def start(cls, settings: HardwareSettings | None = None) -> "Station | None":
        """None when no hardware is configured, so the agent runs as before."""
        settings = settings or HardwareSettings.from_env()
        if not settings.enabled:
            return None
        station = cls(settings)
        station.open_outputs()
        if settings.control and station.outputs is None:
            log.warning("Environment control needs AUTOLAB_ENV_OUTPUTS=1; it stays off")
        station.poll()
        station._thread = threading.Thread(target=station._loop, daemon=True, name="hardware")
        station._thread.start()
        return station

    def components(self) -> list[dict]:
        with self._lock:
            return self.tracker.components()

    def close(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=POLL_EVERY + 2)
        if self.outputs:
            self.outputs.close()
        if self.pico:
            self.pico.close()
        if self.marlin:
            self.marlin.close()
        if self.environment and hasattr(self.environment.bus, "close"):
            self.environment.bus.close()

    def _loop(self) -> None:
        while not self._stop.wait(POLL_EVERY):
            try:
                self.poll()
            except Exception:
                log.exception("Hardware check failed")

    def _due(self, name: str) -> bool:
        now = time.monotonic()
        if now < self._retry_at.get(name, 0):
            return False
        self._retry_at[name] = now + RETRY_EVERY
        return True

    def open_outputs(self) -> None:
        if not self.settings.outputs:
            return
        try:
            self.outputs = Outputs()
        except Exception as exc:
            log.warning("Can't drive the environment outputs (%s)", exc)

    def poll(self) -> None:
        """One round: ask every part how it is, run the control loop, update the list."""
        reports: list[dict] = []
        checked: list[str] = []
        if self.settings.pico_port:
            checked += PICO_IDS
            reports += self._poll_pico()
        if self.settings.i2c_bus is not None:
            checked += SENSOR_IDS
            readings = self._poll_sensors()
            if readings is not None:
                reports += parts.environment_components(readings)
                self._control(readings)
        if self.outputs:
            reports += parts.output_components(self.outputs.state(), self.settings.control, self.clock())
        if self.settings.marlin_port:
            checked.append("printer_controller")
            reports += self._poll_marlin()
        with self._lock:
            self.tracker.update(checked, reports)

    def _poll_pico(self) -> list[dict]:
        if self.pico is None:
            if not self._due("pico"):
                return []
            try:
                self.pico = PicoClient(self.settings.pico_port).open()
                log.info("Pico on %s: %s %s", self.pico.port, self.pico.hello.get("firmware"), self.pico.hello.get("version"))
            except Exception as exc:
                log.info("No Pico yet (%s)", exc)
                self.pico = None
                return []
        try:
            status = self.pico.status()
        except PicoError as exc:
            log.warning("Lost the Pico (%s)", exc)
            self.pico.close()
            self.pico = None
            return []
        return parts.pico_components(self.pico.hello or {}, status, self.clock())

    def _poll_sensors(self) -> Any:
        if self.environment is None:
            if not self._due("i2c"):
                return None
            try:
                self.environment = Environment(open_bus(self.settings.i2c_bus))
            except Exception as exc:
                log.info("Can't open I2C bus %s (%s)", self.settings.i2c_bus, exc)
                return None
        return self.environment.read()

    def _control(self, readings: Any) -> None:
        if not (self.settings.control and self.outputs):
            return
        self.outputs.circulation_fan.on()
        heat = self.controller.heater(readings.temperature_c)
        self.outputs.heater.value = heat
        dose = self.controller.co2_pulse(readings.co2_percent, time.monotonic())
        if dose:
            log.info("CO2 at %.2f%%, dosing for %.1f s", readings.co2_percent, dose)
            self.outputs.pulse_co2(dose)

    def _poll_marlin(self) -> list[dict]:
        if self.marlin is None:
            if not self._due("marlin"):
                return []
            try:
                self.marlin = Marlin(self.settings.marlin_port, self.settings.marlin_baud).open()
                log.info("Marlin on %s: %s", self.settings.marlin_port, self.marlin.firmware)
            except Exception as exc:
                log.info("No Marlin board yet (%s)", exc)
                self.marlin = None
                return []
        try:
            self.marlin.send("M105")  # cheap, and harmless mid-idle
        except (MotionError, OSError) as exc:
            log.warning("Lost the Marlin board (%s)", exc)
            self.marlin.close()
            self.marlin = None
            return []
        return [parts.printer_component(self.marlin.firmware, self.clock())]
