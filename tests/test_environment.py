"""Environment sensors (checksums and parsing) and the heater and CO2 control logic."""

import pytest

from autolab_agent.hardware import environment as env
from autolab_agent.hardware.environment import (
    ControlSettings, EnvironmentController, SensorError, parse_ezo, parse_k33, parse_sht85, sht_crc,
)


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    monkeypatch.setattr(env.time, "sleep", lambda s: None)


def sht_frame(temperature, humidity):
    raw_t = round((temperature + 45) * 65535 / 175)
    raw_rh = round(humidity * 65535 / 100)
    t, rh = raw_t.to_bytes(2, "big"), raw_rh.to_bytes(2, "big")
    return t + bytes([sht_crc(t)]) + rh + bytes([sht_crc(rh)])


def k33_frame(count, status=0x21):
    body = bytes([status]) + count.to_bytes(2, "big")
    return body + bytes([sum(body) & 0xFF])


def test_sht_crc_matches_the_sensirion_example():
    assert sht_crc(b"\xbe\xef") == 0x92


def test_sht85_reading_is_converted():
    t, rh = parse_sht85(sht_frame(37.0, 90.0))
    assert t == pytest.approx(37.0, abs=0.01) and rh == pytest.approx(90.0, abs=0.01)


@pytest.mark.parametrize("flip", [2, 5, 0, 4])
def test_sht85_drops_a_reading_with_a_bad_checksum(flip):
    frame = bytearray(sht_frame(37.0, 90.0))
    frame[flip] ^= 0x01
    with pytest.raises(SensorError, match="checksum"):
        parse_sht85(bytes(frame))


def test_k33_reads_co2_in_percent():
    assert env.K33_READ_CO2 == bytes([0x22, 0x00, 0x08, 0x2A])
    assert parse_k33(k33_frame(5000), ppm_per_count=10) == pytest.approx(5.0)
    assert parse_k33(k33_frame(450), ppm_per_count=1) == pytest.approx(0.045)


def test_k33_refuses_bad_or_unfinished_reads():
    bad = bytearray(k33_frame(5000))
    bad[3] ^= 0xFF
    with pytest.raises(SensorError, match="checksum"):
        parse_k33(bytes(bad), 10)
    with pytest.raises(SensorError, match="not finished"):
        parse_k33(k33_frame(5000, status=0x20), 10)


def test_ezo_ph_parsing():
    assert parse_ezo(b"\x01" + b"7.312\x00" + b"\x00" * 25) == pytest.approx(7.312)
    for code, message in ((254, "still measuring"), (2, "rejected"), (255, "code 255")):
        with pytest.raises(SensorError, match=message):
            parse_ezo(bytes([code]) + b"\x00" * 30)
    with pytest.raises(SensorError, match="out of range"):
        parse_ezo(b"\x0115.2\x00")


class FakeBus:
    def __init__(self, answers):
        self.answers = answers  # address -> bytes, or an exception, or a list of those
        self.writes = []

    def write(self, address, data):
        self.writes.append((address, bytes(data)))
        answer = self.answers.get(address)
        if answer is None:
            raise OSError(121, "Remote I/O error")

    def read(self, address, length):
        answer = self.answers[address]
        if isinstance(answer, list):
            answer = answer.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer[:length]


def test_each_sensor_is_asked_the_right_way():
    bus = FakeBus({0x44: sht_frame(36.5, 88.0), 0x68: k33_frame(4800), 0x63: b"\x017.40\x00"})
    readings = env.Environment(bus).read()
    assert bus.writes == [(0x44, b"\x24\x00"), (0x68, env.K33_READ_CO2), (0x63, b"R")]
    assert readings.temperature_c == pytest.approx(36.5, abs=0.01)
    assert readings.co2_percent == pytest.approx(4.8)
    assert readings.ph == pytest.approx(7.40)


def test_the_k33_gets_a_second_try_when_asleep():
    bus = FakeBus({0x68: [OSError(121, "nack"), k33_frame(5000)]})
    assert env.K33(bus).read() == pytest.approx(5.0)


def test_a_missing_sensor_has_no_reading_at_all():
    readings = env.Environment(FakeBus({0x44: sht_frame(37.0, 90.0)})).read()
    assert readings.sht85_at is not None
    assert (readings.co2_percent, readings.co2_at, readings.ph, readings.ph_at) == (None, None, None, None)


def test_heater_bang_bang_with_hysteresis():
    control = EnvironmentController(ControlSettings(target_c=37.0, hysteresis_c=0.3))
    temps = [35.0, 36.8, 37.2, 37.31, 37.1, 36.71, 36.69, 37.0]
    states = [control.heater(t) for t in temps]
    assert states == [True, True, True, False, False, False, True, True]


def test_heater_stays_off_without_a_reading_or_when_too_hot():
    control = EnvironmentController(ControlSettings(max_c=39.0))
    assert control.heater(30.0) is True
    assert control.heater(None) is False
    assert control.heater(30.0) is True
    assert control.heater(39.5) is False


def test_co2_doses_in_pulses_with_a_gap_between_them():
    control = EnvironmentController(ControlSettings(target_co2_percent=5.0, co2_band_percent=0.2, pulse_s=0.5, min_pulse_interval_s=60))
    assert control.co2_pulse(4.0, now=100.0) == 0.5
    assert control.co2_pulse(4.0, now=130.0) == 0.0  # still mixing
    assert control.co2_pulse(4.0, now=160.0) == 0.5
    assert control.co2_pulse(4.9, now=300.0) == 0.0  # close enough
    assert control.co2_pulse(None, now=400.0) == 0.0
    assert control.co2_pulse(9.0, now=500.0) == 0.0


class FakeDevice:
    def __init__(self, pin, initial_value=False):
        self.pin, self.value, self.blinks, self.closed = pin, initial_value, [], False

    def on(self):
        self.value = True

    def off(self):
        self.value = False

    def blink(self, **kwargs):
        self.blinks.append(kwargs)

    def close(self):
        self.closed = True


def test_outputs_start_off_and_end_off():
    outputs = env.Outputs(factory=FakeDevice)
    assert (outputs.heater.pin, outputs.circulation_fan.pin, outputs.co2_valve.pin) == (17, 27, 22)
    assert outputs.state() == {"heated_platform": False, "circulation_fan": False, "co2_valve": False}
    outputs.heater.on()
    outputs.pulse_co2(0.5)
    assert outputs.co2_valve.blinks == [{"on_time": 0.5, "off_time": 0, "n": 1, "background": True}]
    outputs.close()
    assert outputs.heater.value is False and outputs.heater.closed
