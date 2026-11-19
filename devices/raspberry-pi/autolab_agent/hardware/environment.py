"""The incubator's own sensors and outputs, read and driven by the Pi.

Sensors on I2C bus 1: SHT85 temperature and humidity (0x44), Senseair K33 ICB
CO2 (0x68) and Atlas EZO-pH (0x63). Outputs on GPIO through MOSFETs: heater
(BCM 17), circulation fan (27) and CO2 solenoid valve (22).

smbus2 and gpiozero are imported only when a bus or output is opened, so this
module loads anywhere. A reading that fails its checksum is dropped, never
patched up.
"""

import logging
import math
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

log = logging.getLogger("agent")

SHT85_ADDRESS = 0x44
K33_ADDRESS = 0x68
EZO_PH_ADDRESS = 0x63

HEATER_PIN = 17
CIRCULATION_FAN_PIN = 27
CO2_VALVE_PIN = 22


class SensorError(RuntimeError):
    """A sensor didn't answer, or answered with a bad checksum."""


class Bus(Protocol):
    def write(self, address: int, data: bytes) -> None: ...
    def read(self, address: int, length: int) -> bytes: ...


class SMBusWrapper:
    """Plain I2C writes and reads. None of these sensors use register addressing."""

    def __init__(self, number: int) -> None:
        from smbus2 import SMBus, i2c_msg

        self._bus = SMBus(number)
        self._msg = i2c_msg

    def write(self, address: int, data: bytes) -> None:
        self._bus.i2c_rdwr(self._msg.write(address, list(data)))

    def read(self, address: int, length: int) -> bytes:
        message = self._msg.read(address, length)
        self._bus.i2c_rdwr(message)
        return bytes(message)

    def close(self) -> None:
        self._bus.close()


# SHT85


def sht_crc(data: bytes) -> int:
    """Sensirion CRC-8: polynomial 0x31, start 0xFF. sht_crc(b"\\xbe\\xef") == 0x92."""
    crc = 0xFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = ((crc << 1) ^ 0x31) & 0xFF if crc & 0x80 else (crc << 1) & 0xFF
    return crc


def parse_sht85(data: bytes) -> tuple[float, float]:
    """Six bytes: temperature word, CRC, humidity word, CRC."""
    if len(data) != 6:
        raise SensorError("SHT85 sent the wrong number of bytes")
    if sht_crc(data[0:2]) != data[2] or sht_crc(data[3:5]) != data[5]:
        raise SensorError("SHT85 checksum mismatch")
    raw_t = data[0] << 8 | data[1]
    raw_rh = data[3] << 8 | data[4]
    return -45 + 175 * raw_t / 65535, 100 * raw_rh / 65535


class SHT85:
    # Single shot, high repeatability, no clock stretching. Takes up to 15.5 ms.
    MEASURE = bytes([0x24, 0x00])
    WAIT_S = 0.02

    def __init__(self, bus: Bus, address: int = SHT85_ADDRESS) -> None:
        self.bus = bus
        self.address = address

    def read(self) -> tuple[float, float]:
        """Temperature in deg C and relative humidity in percent."""
        self.bus.write(self.address, self.MEASURE)
        time.sleep(self.WAIT_S)
        return parse_sht85(self.bus.read(self.address, 6))


# Senseair K33 ICB


def k33_checksum(data: bytes) -> int:
    """Senseair I2C checksum: the low byte of the sum."""
    return sum(data) & 0xFF


# Read RAM, 2 bytes, from address 0x0008 (the CO2 value), then the checksum.
K33_READ_CO2 = bytes([0x22, 0x00, 0x08, k33_checksum(bytes([0x22, 0x00, 0x08]))])


def parse_k33(data: bytes, ppm_per_count: float) -> float:
    """Four bytes: status, CO2 high, CO2 low, checksum. Returns CO2 in percent."""
    if len(data) != 4:
        raise SensorError("K33 sent the wrong number of bytes")
    if k33_checksum(data[:3]) != data[3]:
        raise SensorError("K33 checksum mismatch")
    if not data[0] & 0x01:
        raise SensorError("K33 had not finished the read")
    count = int.from_bytes(data[1:3], "big", signed=True)
    if count < 0:
        raise SensorError("K33 reported a negative CO2 value")
    return count * ppm_per_count / 10000


class K33:
    WAIT_S = 0.02

    def __init__(self, bus: Bus, address: int = K33_ADDRESS, ppm_per_count: float = 10.0) -> None:
        # The 30% K33 ICB reports in units of 10 ppm, so 5% reads 5000.
        # Check this against calibration gas before trusting it.
        self.bus = bus
        self.address = address
        self.ppm_per_count = ppm_per_count

    def read(self) -> float:
        """CO2 in percent. The sensor sleeps between reads and may miss the first try."""
        for attempt in range(2):
            try:
                self.bus.write(self.address, K33_READ_CO2)
                time.sleep(self.WAIT_S)
                return parse_k33(self.bus.read(self.address, 4), self.ppm_per_count)
            except OSError:
                if attempt:
                    raise
                time.sleep(self.WAIT_S)
        raise SensorError("K33 did not answer")


# Atlas EZO-pH


def parse_ezo(data: bytes) -> float:
    """First byte is the response code (1 = done), then ASCII ending in a null."""
    if not data:
        raise SensorError("EZO-pH sent nothing")
    code = data[0]
    if code == 254:
        raise SensorError("EZO-pH was still measuring")
    if code == 2:
        raise SensorError("EZO-pH rejected the command")
    if code != 1:
        raise SensorError(f"EZO-pH answered code {code}")
    text = data[1:].split(b"\x00", 1)[0].decode("ascii", errors="replace").strip()
    try:
        value = float(text)
    except ValueError:
        raise SensorError(f"EZO-pH sent {text!r}") from None
    if not 0 <= value <= 14:
        raise SensorError(f"EZO-pH reading {value} is out of range")
    return value


class EzoPh:
    WAIT_S = 0.9  # Atlas: 900 ms for a reading

    def __init__(self, bus: Bus, address: int = EZO_PH_ADDRESS) -> None:
        self.bus = bus
        self.address = address

    def read(self) -> float:
        self.bus.write(self.address, b"R")
        time.sleep(self.WAIT_S)
        return parse_ezo(self.bus.read(self.address, 31))


# Outputs


class Outputs:
    """Heater, circulation fan and CO2 valve, all off until told otherwise."""

    def __init__(self, factory: Any = None) -> None:
        if factory is None:
            from gpiozero import DigitalOutputDevice as factory
        self.heater = factory(HEATER_PIN, initial_value=False)
        self.circulation_fan = factory(CIRCULATION_FAN_PIN, initial_value=False)
        self.co2_valve = factory(CO2_VALVE_PIN, initial_value=False)

    def pulse_co2(self, seconds: float) -> None:
        """Opens the valve and closes it again in the background."""
        self.co2_valve.blink(on_time=seconds, off_time=0, n=1, background=True)

    def state(self) -> dict[str, bool]:
        return {
            "heated_platform": bool(self.heater.value),
            "circulation_fan": bool(self.circulation_fan.value),
            "co2_valve": bool(self.co2_valve.value),
        }

    def all_off(self) -> None:
        for device in (self.heater, self.circulation_fan, self.co2_valve):
            device.off()

    def close(self) -> None:
        self.all_off()
        for device in (self.heater, self.circulation_fan, self.co2_valve):
            device.close()


# Control


@dataclass
class ControlSettings:
    target_c: float = 37.0
    hysteresis_c: float = 0.3
    # Above this the heater stays off whatever the target says.
    max_c: float = 39.0
    target_co2_percent: float = 5.0
    # Dose only when CO2 is this far under the target.
    co2_band_percent: float = 0.2
    # Never dose above this, in case the target is set wrong.
    max_co2_percent: float = 8.0
    pulse_s: float = 0.5
    # Time for a dose to mix before the next one.
    min_pulse_interval_s: float = 60.0


@dataclass
class EnvironmentController:
    """Heater bang-bang with hysteresis, and short CO2 doses with a gap between them.

    No reading means no heat and no CO2: a dead sensor must never leave an
    output running.
    """

    settings: ControlSettings = field(default_factory=ControlSettings)
    heater_on: bool = False
    last_pulse: float = -math.inf

    def heater(self, temperature_c: float | None) -> bool:
        s = self.settings
        if temperature_c is None or temperature_c >= s.max_c:
            self.heater_on = False
        elif temperature_c < s.target_c - s.hysteresis_c:
            self.heater_on = True
        elif temperature_c > s.target_c + s.hysteresis_c:
            self.heater_on = False
        return self.heater_on

    def co2_pulse(self, co2_percent: float | None, now: float) -> float:
        """Seconds to open the CO2 valve now, or 0."""
        s = self.settings
        if co2_percent is None or co2_percent >= s.max_co2_percent:
            return 0.0
        if co2_percent >= s.target_co2_percent - s.co2_band_percent:
            return 0.0
        if now - self.last_pulse < s.min_pulse_interval_s:
            return 0.0
        self.last_pulse = now
        return s.pulse_s


@dataclass
class Readings:
    """The latest good value from each sensor, with the time it was taken."""

    temperature_c: float | None = None
    humidity_percent: float | None = None
    sht85_at: float | None = None
    co2_percent: float | None = None
    co2_at: float | None = None
    ph: float | None = None
    ph_at: float | None = None


class Environment:
    """Reads every sensor it can. A sensor that fails this round has no value this round."""

    def __init__(self, bus: Bus) -> None:
        self.bus = bus
        self.sht85 = SHT85(bus)
        self.k33 = K33(bus)
        self.ph = EzoPh(bus)
        self._warned: set[str] = set()

    def read(self, with_ph: bool = True) -> Readings:
        now = time.time()
        result = Readings()
        try:
            result.temperature_c, result.humidity_percent = self.sht85.read()
            result.sht85_at = now
            self._warned.discard("sht85")
        except (OSError, SensorError) as exc:
            self._warn("sht85", exc)
        try:
            result.co2_percent = self.k33.read()
            result.co2_at = now
            self._warned.discard("co2_sensor")
        except (OSError, SensorError) as exc:
            self._warn("co2_sensor", exc)
        if with_ph:
            try:
                result.ph = self.ph.read()
                result.ph_at = now
                self._warned.discard("ph_sensor")
            except (OSError, SensorError) as exc:
                self._warn("ph_sensor", exc)
        return result

    def _warn(self, name: str, exc: Exception) -> None:
        # Once until it reads again, so an unplugged sensor doesn't flood the log.
        if name not in self._warned:
            self._warned.add(name)
            log.info("No reading from %s (%s)", name, exc)


def open_bus(number: int) -> SMBusWrapper:
    return SMBusWrapper(number)
