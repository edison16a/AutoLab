"""The heartbeat's `components` list (see docs/digital-twin.md).

A part is listed only once it has actually answered: the Pico replied, a
sensor gave a reading that passed its checksum, Marlin replied to M115. A
part that answered before and has stopped is listed as not responding, with
no readings. Telemetry holds only flat numbers, strings and booleans, which
is all the gateway accepts.
"""

from datetime import datetime, timezone
from collections.abc import Iterable
from typing import Any

from .environment import Readings

# The order the parts are listed in.
ORDER = (
    "pico", "addition_pump", "aspiration_pump", "addition_controller", "aspiration_controller",
    "addition_valve", "aspiration_valve",
    "hepa_filter", "waste_container", "sht85", "co2_sensor", "ph_sensor",
    "heated_platform", "circulation_fan", "co2_valve", "printer_controller",
)
PUMP_IDS = {"addition": "addition_pump", "aspiration": "aspiration_pump"}
# Each PMST100 pump has its own Simply Pumps SMC10 stepper controller.
CONTROLLER_IDS = {"addition": "addition_controller", "aspiration": "aspiration_controller"}
VALVE_IDS = {"addition": "addition_valve", "aspiration": "aspiration_valve"}


def iso(at: float) -> str:
    return datetime.fromtimestamp(at, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def component(id: str, at: float, status: str, telemetry: dict[str, Any] | None = None, online: bool = True) -> dict:
    clean = {k: v for k, v in (telemetry or {}).items() if isinstance(v, (str, int, float, bool))}
    return {
        "id": id,
        "installed": True,
        "online": online,
        "status": status[:80],
        "telemetry": clean,
        "lastUpdated": iso(at),
    }


def _pump(id: str, info: dict, state: dict, at: float) -> dict:
    running = bool(state.get("running"))
    direction = state.get("direction")
    status = f"Running {direction.replace('_', ' ')}" if running and direction else "Idle"
    telemetry = {
        "running": running,
        "direction": direction if running else None,
        "rpm": state.get("rpm") if running else 0.0,
        "flow_ul_s": state.get("flow_ul_s") if running else 0.0,
        "remaining_s": state.get("remaining_s"),
        "ul_per_rev": info.get("ul_per_rev"),
        "calibrated": info.get("calibrated"),
    }
    return component(id, at, status, telemetry)


def _controller(id: str, info: dict, state: dict, at: float) -> dict:
    """What the Pico drives on the SMC10's inputs. Nothing comes back from the board."""
    enabled = bool(state.get("enabled"))
    telemetry = {
        "enabled": enabled,
        "speed_v": state.get("speed_v"),
        "rpm_at_5v": info.get("rpm_at_5v"),
    }
    return component(id, at, "Enabled" if enabled else "Disabled", telemetry)


def _fan(state: dict, at: float) -> dict:
    duty, rpm = state.get("duty") or 0, state.get("rpm")
    if not duty:
        return component("hepa_filter", at, "Off", {"duty": 0.0, "rpm": rpm}, online=False)
    if rpm is None:
        return component("hepa_filter", at, "Starting", {"duty": duty}, online=False)
    if rpm == 0:
        return component("hepa_filter", at, "No tach signal", {"duty": duty, "rpm": 0}, online=False)
    return component("hepa_filter", at, "Running", {"duty": duty, "rpm": rpm})


def pico_components(hello: dict, status: dict, at: float) -> list[dict]:
    """The Pico itself and every part it says is configured."""
    result = [component("pico", at, "Online", {"firmware": f"{hello.get('firmware')} {hello.get('version')}"})]
    pumps = status.get("pumps") or {}
    configured = [
        (name, info) for name, info in (hello.get("pumps") or {}).items() if name in PUMP_IDS and name in pumps
    ]
    for name, info in configured:
        result.append(_pump(PUMP_IDS[name], info, pumps[name], at))
    for name, info in configured:
        result.append(_controller(CONTROLLER_IDS[name], info, pumps[name], at))
    valves = status.get("valves") or {}
    for name in hello.get("valves") or {}:
        if name in VALVE_IDS and name in valves:
            port = valves[name]
            label = "Closed" if port == "closed" else f"Open to {port}"
            result.append(component(VALVE_IDS[name], at, label, {"port": port}))
    if hello.get("fan") and status.get("fan"):
        result.append(_fan(status["fan"], at))
    if hello.get("waste_sensor") and status.get("waste_full") is not None:
        full = bool(status["waste_full"])
        result.append(component("waste_container", at, "Full, empty it" if full else "OK", {"full": full}))
    return result


def environment_components(readings: Readings) -> list[dict]:
    result = []
    if readings.sht85_at is not None:
        result.append(component("sht85", readings.sht85_at, "Online", {
            "temperature_c": round(readings.temperature_c, 2),
            "humidity_percent": round(readings.humidity_percent, 1),
        }))
    if readings.co2_at is not None:
        result.append(component("co2_sensor", readings.co2_at, "Online", {"co2_percent": round(readings.co2_percent, 3)}))
    if readings.ph_at is not None:
        result.append(component("ph_sensor", readings.ph_at, "Online", {"ph": round(readings.ph, 2)}))
    return result


def output_components(state: dict[str, bool], control: bool, at: float) -> list[dict]:
    """The outputs can't sense their load, so this says what the Pi is driving, and says so."""
    labels = {
        "heated_platform": ("Heating", "Off"),
        "circulation_fan": ("Running", "Off"),
        "co2_valve": ("Open", "Closed"),
    }
    result = []
    for id, on in state.items():
        on_label, off_label = labels[id]
        telemetry = {"on": on, "automatic": control}
        result.append(component(id, at, on_label if on else off_label, telemetry))
    return result


def printer_component(firmware: str | None, at: float) -> dict:
    return component("printer_controller", at, "Online", {"firmware": firmware} if firmware else {})


class ComponentTracker:
    """Keeps the latest report of every part seen since the agent started."""

    def __init__(self) -> None:
        self._latest: dict[str, dict] = {}

    def update(self, checked: Iterable[str], reports: list[dict]) -> None:
        """This round's reports for the parts in `checked`.

        A part seen before with no report this round has stopped answering:
        it stays listed, offline and without readings, as of when it last answered.
        """
        fresh = {r["id"]: r for r in reports}
        self._latest.update(fresh)
        for id in checked:
            old = self._latest.get(id)
            if id not in fresh and old and old["status"] != "Not responding":
                self._latest[id] = {**old, "online": False, "status": "Not responding", "telemetry": {}}

    def components(self) -> list[dict]:
        rank = {id: i for i, id in enumerate(ORDER)}
        return [self._latest[id] for id in sorted(self._latest, key=lambda i: rank.get(i, len(ORDER)))]
