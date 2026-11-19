"""The heartbeat's components list: only parts that answered, in the format the app reads."""

import asyncio
import json
import re
import time

import pytest

from pico_support import FakeHal
from autolab_agent.hardware import components as parts
from autolab_agent.hardware.config import HardwareSettings
from autolab_agent.hardware.environment import Readings
from autolab_agent.hardware.pico import PicoError
from autolab_agent.hardware.station import Station
from autolab_agent.lab.api import SupabaseError
from autolab_agent.lab.runner import LabAgent
from autolab_agent.protocol import heartbeat_message
from fluidics import protocol
from fluidics.controller import Controller

AT = 1790000000.0  # 2026-09-21T14:13:20Z
ISO = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")


def firmware(tmp_path):
    import json

    controller = Controller(FakeHal(), calibration_path=str(tmp_path / "c.json"))
    ask = lambda cmd, **f: json.loads(protocol.handle_line(controller, json.dumps({"id": 1, "cmd": cmd, **f})))
    return controller, ask


def validate(component):
    """Exactly what the gateway accepts from a heartbeat."""
    from autolab_gateway.models import ComponentReport

    assert ComponentReport.model_validate(component).model_dump() == component
    assert set(component) == {"id", "installed", "online", "status", "telemetry", "lastUpdated"}
    assert ISO.match(component["lastUpdated"])


def test_the_pico_and_its_parts_come_from_hello_and_status(tmp_path):
    _, ask = firmware(tmp_path)
    ask("valve", valve="aspiration", port="waste")
    ask("pump", pump="aspiration", direction="from_head", seconds=10, flow_ul_s=40)
    ask("fan", duty=0.5)
    reports = parts.pico_components(ask("hello"), ask("status"), AT)
    by_id = {r["id"]: r for r in reports}
    assert list(by_id) == ["pico", "addition_pump", "aspiration_pump", "addition_controller", "aspiration_controller",
                           "addition_valve", "aspiration_valve", "hepa_filter", "waste_container"]
    for report in reports:
        validate(report)
    assert by_id["pico"]["telemetry"] == {"firmware": "autolab-fluidics 0.2.0"}
    assert by_id["aspiration_pump"]["status"] == "Running from head"
    # 40 uL/s at 65 uL per revolution is 36.92 rpm.
    assert by_id["aspiration_pump"]["telemetry"] == {
        "running": True, "direction": "from_head", "rpm": 36.92, "flow_ul_s": 40.0,
        "remaining_s": 10.0, "ul_per_rev": 65.0, "calibrated": False,
    }
    assert by_id["addition_pump"]["status"] == "Idle"
    assert by_id["addition_pump"]["telemetry"] == {
        "running": False, "rpm": 0.0, "flow_ul_s": 0.0, "ul_per_rev": 65.0, "calibrated": False,
    }
    # 36.92 rpm of the SMC10's 75 rpm at 5 V is 2.46 V on its speed input.
    assert by_id["aspiration_controller"]["status"] == "Enabled"
    assert by_id["aspiration_controller"]["telemetry"] == {"enabled": True, "speed_v": 2.462, "rpm_at_5v": 75.0}
    assert by_id["addition_controller"]["status"] == "Disabled"
    assert by_id["addition_controller"]["telemetry"] == {"enabled": False, "speed_v": 0.0, "rpm_at_5v": 75.0}
    assert by_id["aspiration_valve"]["telemetry"] == {"port": "waste"}
    assert by_id["addition_valve"]["status"] == "Closed"
    assert by_id["waste_container"]["telemetry"] == {"full": False}
    # rpm needs a second of tach pulses first, so the fan isn't claimed to be running yet.
    assert by_id["hepa_filter"]["online"] is False and by_id["hepa_filter"]["status"] == "Starting"
    assert by_id["pico"]["lastUpdated"] == "2026-09-21T14:13:20Z"


@pytest.mark.parametrize(
    "fan, online, status",
    [({"duty": 0.0, "rpm": None}, False, "Off"), ({"duty": 0.6, "rpm": 0}, False, "No tach signal"),
     ({"duty": 0.6, "rpm": 1450}, True, "Running")],
)
def test_the_hepa_fan_is_only_online_when_its_tach_says_so(fan, online, status):
    hello = {"firmware": "f", "version": "v", "fan": True}
    (_, hepa) = parts.pico_components(hello, {"fan": fan}, AT)
    assert (hepa["online"], hepa["status"]) == (online, status)
    validate(hepa)


def test_a_part_the_firmware_leaves_out_is_not_reported():
    hello = {"firmware": "f", "version": "v", "pumps": {}, "valves": {}, "fan": False, "waste_sensor": False}
    status = {"pumps": {}, "valves": {}, "fan": None, "waste_full": None}
    assert [r["id"] for r in parts.pico_components(hello, status, AT)] == ["pico"]


def test_a_controller_is_listed_only_with_its_pump(tmp_path):
    import types

    from fluidics import config

    cfg = types.SimpleNamespace(**{k: getattr(config, k) for k in dir(config) if not k.startswith("__")})
    cfg.PUMPS = {"aspiration": dict(config.PUMPS["aspiration"]), "addition": {**config.PUMPS["addition"], "speed": None}}
    controller = Controller(FakeHal(), cfg, str(tmp_path / "c.json"))
    ask = lambda cmd: json.loads(protocol.handle_line(controller, json.dumps({"id": 1, "cmd": cmd})))
    ids = [r["id"] for r in parts.pico_components(ask("hello"), ask("status"), AT)]
    assert "aspiration_controller" in ids and "aspiration_pump" in ids
    assert "addition_controller" not in ids and "addition_pump" not in ids


def test_only_sensors_with_a_good_reading_are_listed():
    readings = Readings(temperature_c=37.123, humidity_percent=91.44, sht85_at=AT, ph=7.314, ph_at=AT)
    reports = parts.environment_components(readings)
    assert [r["id"] for r in reports] == ["sht85", "ph_sensor"]
    assert reports[0]["telemetry"] == {"temperature_c": 37.12, "humidity_percent": 91.4}
    assert reports[1]["telemetry"] == {"ph": 7.31}
    for report in reports:
        validate(report)
    co2 = parts.environment_components(Readings(co2_percent=5.0123, co2_at=AT))
    assert co2[0]["telemetry"] == {"co2_percent": 5.012}


def test_outputs_and_the_printer_board():
    reports = parts.output_components({"heated_platform": True, "circulation_fan": False, "co2_valve": False}, True, AT)
    assert [(r["id"], r["status"]) for r in reports] == [("heated_platform", "Heating"), ("circulation_fan", "Off"), ("co2_valve", "Closed")]
    assert reports[0]["telemetry"] == {"on": True, "automatic": True}
    printer = parts.printer_component("Marlin 2.1.2.1", AT)
    assert printer["telemetry"] == {"firmware": "Marlin 2.1.2.1"}
    for report in [*reports, printer]:
        validate(report)


def test_a_part_that_stops_answering_says_so_and_one_never_seen_stays_out():
    tracker = parts.ComponentTracker()
    sht = parts.component("sht85", AT, "Online", {"temperature_c": 37.0})
    tracker.update(["sht85", "co2_sensor"], [sht])
    assert [c["id"] for c in tracker.components()] == ["sht85"]
    tracker.update(["sht85", "co2_sensor"], [])
    (gone,) = tracker.components()
    assert gone == {**sht, "online": False, "status": "Not responding", "telemetry": {}}
    validate(gone)


def test_the_heartbeat_has_components_only_when_hardware_is_configured():
    class Camera:
        online = True

    assert "components" not in heartbeat_message(Camera())
    sht = parts.component("sht85", AT, "Online", {"temperature_c": 37.0})
    assert heartbeat_message(Camera(), [sht])["components"] == [sht]
    assert heartbeat_message(Camera(), [])["components"] == []


def test_nothing_is_configured_by_default(monkeypatch):
    for name in ("AUTOLAB_PICO_PORT", "AUTOLAB_MARLIN_PORT", "AUTOLAB_I2C_BUS", "AUTOLAB_ENV_OUTPUTS", "AUTOLAB_ENV_CONTROL"):
        monkeypatch.delenv(name, raising=False)
    assert HardwareSettings.from_env().enabled is False
    assert Station.start() is None
    monkeypatch.setenv("AUTOLAB_I2C_BUS", "1")
    monkeypatch.setenv("AUTOLAB_PICO_PORT", "auto")
    settings = HardwareSettings.from_env()
    assert settings.enabled and settings.i2c_bus == 1 and settings.pico_port == "auto"


class FakePico:
    def __init__(self, ask):
        self.ask = ask
        self.hello = ask("hello")
        self.fail = False

    def status(self):
        if self.fail:
            raise PicoError("The Pico did not answer 'status'")
        return self.ask("status")

    def close(self):
        pass


class FakeEnvironment:
    def __init__(self, readings):
        self.readings = readings
        self.bus = object()

    def read(self):
        return self.readings


def test_a_station_round_lists_what_answered_and_marks_what_went_quiet(tmp_path):
    _, ask = firmware(tmp_path)
    station = Station(HardwareSettings(pico_port="auto", i2c_bus=1), clock=lambda: AT)
    station.pico = FakePico(ask)
    station.environment = FakeEnvironment(Readings(temperature_c=37.0, humidity_percent=90.0, sht85_at=AT))
    station.poll()
    ids = [c["id"] for c in station.components()]
    assert ids == ["pico", "addition_pump", "aspiration_pump", "addition_controller", "aspiration_controller",
                   "addition_valve", "aspiration_valve", "hepa_filter", "waste_container", "sht85"]

    station.pico.fail = True
    station.poll()
    listed = {c["id"]: c for c in station.components()}
    assert station.pico is None
    assert listed["pico"]["status"] == "Not responding" and listed["pico"]["online"] is False
    assert listed["addition_controller"]["status"] == "Not responding"
    assert listed["sht85"]["online"] is True
    for component in listed.values():
        validate(component)


def test_the_control_loop_drives_the_heater_from_the_reading():
    from test_environment import FakeDevice

    from autolab_agent.hardware.environment import Outputs

    station = Station(HardwareSettings(i2c_bus=1, outputs=True, control=True), clock=lambda: AT)
    station.outputs = Outputs(factory=FakeDevice)
    station.environment = FakeEnvironment(Readings(temperature_c=35.0, humidity_percent=90.0, sht85_at=AT, co2_percent=3.0, co2_at=AT))
    station.poll()
    assert station.outputs.heater.value is True and station.outputs.circulation_fan.value is True
    assert len(station.outputs.co2_valve.blinks) == 1
    station.environment.readings = Readings()  # sensors gone: heat off
    station.poll()
    assert station.outputs.heater.value is False


class FakeApi:
    def __init__(self, refuse_components):
        from autolab_agent.lab import session as auth

        self.session = auth.Session("https://abc.supabase.co", "key", "pi", "r1", "a1", time.time() + 3600)
        self.refuse = refuse_components
        self.reports = []

    async def report(self, device_id, fields):
        if self.refuse and "components" in fields:
            raise SupabaseError("Could not find the 'components' column of 'devices' in the schema cache")
        self.reports.append(fields)


class FakeStation:
    def components(self):
        return [parts.component("sht85", AT, "Online", {"temperature_c": 37.0})]


class LabCamera:
    online, simulate = True, False


def test_lab_mode_reports_components_and_copes_with_an_older_database():
    async def go(api, hardware):
        agent = LabAgent(api, LabCamera(), "device", hardware)
        await agent.report_status()
        await agent.report_status()
        return agent

    plain = FakeApi(refuse_components=False)
    asyncio.run(go(plain, None))
    assert "components" not in plain.reports[0]

    with_parts = FakeApi(refuse_components=False)
    asyncio.run(go(with_parts, FakeStation()))
    assert with_parts.reports[0]["components"][0]["id"] == "sht85"

    old_db = FakeApi(refuse_components=True)
    agent = asyncio.run(go(old_db, FakeStation()))
    assert agent.send_components is False
    assert len(old_db.reports) == 2 and all("components" not in r for r in old_db.reports)
    assert old_db.reports[0]["status"] == "online"
