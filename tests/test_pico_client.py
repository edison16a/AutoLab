"""The Pi's serial client for the Pico, against the real firmware on a fake serial pair."""

import threading
import time
import types

import pytest

from pico_support import PicoOnSerial
from autolab_agent.hardware import pico as pico_module
from autolab_agent.hardware.pico import PicoClient, PicoError, PicoTimeout, find_port


@pytest.fixture
def wire(tmp_path):
    return PicoOnSerial(tmp_path)


@pytest.fixture
def client(wire):
    c = PicoClient(connection=wire, timeout=1).open()
    yield c
    c.close()


def in_background(job):
    result = {}

    def go():
        try:
            result["value"] = job()
        except Exception as exc:
            result["error"] = exc

    thread = threading.Thread(target=go)
    thread.start()
    return thread, result


def wait_for(condition, timeout=2.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if condition():
            return True
        time.sleep(0.01)
    return False


def test_open_says_hello_and_replies_match_their_ids(client, wire):
    assert client.hello["firmware"] == "autolab-fluidics"
    assert client.ping() == {"id": 2, "ok": True, "pong": True}
    assert wire.sent[0] == {"id": 1, "cmd": "hello"}
    assert client.status()["valves"] == {"addition": "closed", "aspiration": "closed"}


def test_a_refusal_raises_with_the_pico_reason(client):
    with pytest.raises(PicoError, match="open the addition valve first"):
        client.pump("addition", "to_head", volume_ul=100)


def test_run_waits_for_the_end_of_the_run(client, wire):
    client.valve("addition", "media")
    starts = []
    thread, result = in_background(lambda: client.run("addition", "to_head", volume_ul=200, flow_ul_s=20,
                                                      on_start=starts.append))
    assert wait_for(lambda: "pump" in wire.commands())
    assert thread.is_alive()
    wire.finish("addition")
    thread.join(2)
    assert result["value"]["event"] == "pump_done" and result["value"]["volume_ul"] == 200.0
    assert result["value"]["seconds"] == 10.0
    assert starts[0]["rpm"] == 18.46 and starts[0]["speed_v"] == 1.231 and starts[0]["seconds"] == 10.0
    assert wire.sent[-1] == {"id": 3, "cmd": "pump", "pump": "addition", "direction": "to_head",
                             "volume_ul": 200, "flow_ul_s": 20}


def test_run_raises_when_the_pico_stops_the_pump(client, wire):
    client.valve("aspiration", "waste")
    thread, result = in_background(lambda: client.run("aspiration", "from_head", seconds=20))
    assert wait_for(lambda: "pump" in wire.commands())
    wire.hal.inputs[18].v = 0  # waste fills up mid-run
    wire.tick()
    thread.join(2)
    assert isinstance(result["error"], PicoError) and "waste_full" in str(result["error"])


def test_pings_keep_the_pico_watchdog_fed_while_a_pump_runs(wire, monkeypatch):
    monkeypatch.setattr(pico_module, "PING_EVERY", 0.05)
    fresh = PicoClient(connection=wire, timeout=1).open()
    try:
        assert not wait_for(lambda: "ping" in wire.commands(), timeout=0.2)
        fresh.valve("addition", "media")
        fresh.pump("addition", "to_head", seconds=30)
        assert wait_for(lambda: wire.commands().count("ping") >= 2)
        wire.finish("addition")
        assert wait_for(lambda: not fresh._running)
        count = wire.commands().count("ping")
        time.sleep(0.2)
        assert wire.commands().count("ping") <= count + 1
    finally:
        fresh.close()


def test_silence_times_out(tmp_path):
    quiet = PicoOnSerial(tmp_path, answer=False)
    with pytest.raises(PicoTimeout, match="did not answer 'hello'"):
        PicoClient(connection=quiet, timeout=0.1).open()


def test_noise_on_the_line_is_ignored(wire):
    wire.push("MicroPython v1.24.1 on 2024-11-29; Raspberry Pi Pico with RP2040")
    wire.push("[1, 2, 3]")
    with PicoClient(connection=wire, timeout=1) as c:
        assert c.hello["version"]


def test_a_lost_port_fails_waiting_requests(client, wire):
    wire.answer = False
    thread, result = in_background(client.status)
    assert wait_for(lambda: "status" in wire.commands())
    wire.push(OSError("device disconnected"))
    thread.join(2)
    assert isinstance(result["error"], PicoError) and "Lost the Pico" in str(result["error"])
    assert not client.connected
    with pytest.raises(PicoError, match="Lost the Pico"):
        client.ping()


def test_find_port_picks_the_raspberry_pi_vendor(monkeypatch):
    ports = [
        types.SimpleNamespace(device="/dev/ttyACM1", vid=0x2E8A),
        types.SimpleNamespace(device="/dev/ttyACM0", vid=0x1D50),  # a Marlin board
        types.SimpleNamespace(device="/dev/ttyAMA0", vid=None),
    ]
    from serial.tools import list_ports

    monkeypatch.setattr(list_ports, "comports", lambda: ports)
    assert find_port() == "/dev/ttyACM1"
    monkeypatch.setattr(list_ports, "comports", lambda: ports[1:])
    assert find_port() is None


def test_a_refused_second_start_keeps_the_running_pump_pinged(client):
    client.valve("addition", "media")
    client.pump("addition", "to_head", seconds=30)
    with pytest.raises(PicoError, match="already running"):
        client.pump("addition", "to_head", seconds=30)
    assert "addition" in client._running
    client.stop()
    assert not client._running


def test_calibrate_sends_ul_per_rev_and_rpm_at_5v(client, wire):
    reply = client.calibrate("aspiration", commanded_ul=1000, measured_ul=1100, rpm_at_5v=70)
    assert reply["ul_per_rev"] == 71.5 and reply["rpm_at_5v"] == 70.0 and reply["calibrated"] is True
    assert wire.sent[-1] == {"id": 2, "cmd": "calibrate", "pump": "aspiration", "commanded_ul": 1000,
                             "measured_ul": 1100, "rpm_at_5v": 70}
    client.calibrate("aspiration", ul_per_rev=10)
    client.valve("aspiration", "waste")
    with pytest.raises(PicoError, match="300.0 rpm; the PMST100's max is 75 rpm"):
        client.pump("aspiration", "from_head", seconds=1, flow_ul_s=50)
    assert "aspiration" not in client._running
