"""The Pico fluidics firmware, run under CPython with a fake HAL and fake machine/rp2."""

import json
import sys
import types

import pytest

from pico_support import FakeHal
from fluidics import config, hal, protocol, serve
from fluidics.controller import Controller


PINS = {"add_step": 2, "add_dir": 3, "add_en": 4, "asp_step": 6, "asp_en": 8,
        "media": 10, "cleaner": 11, "add_waste": 12, "asp_waste": 13, "asp_cleaner": 14}


@pytest.fixture
def pico(tmp_path):
    fake = FakeHal()
    controller = Controller(fake, calibration_path=str(tmp_path / "calibration.json"))
    return fake, controller


def send(controller, cmd, **fields):
    line = protocol.handle_line(controller, json.dumps({"id": 1, "cmd": cmd, **fields}))
    return json.loads(line)


def pin(fake, name):
    return fake.outputs[PINS[name]].v


def test_boot_leaves_valves_closed_and_drivers_disabled(pico):
    fake, controller = pico
    for name in ("media", "cleaner", "add_waste", "asp_waste", "asp_cleaner"):
        assert pin(fake, name) == 0
    assert pin(fake, "add_en") == 1 and pin(fake, "asp_en") == 1
    assert controller.pop_events()[0]["event"] == "ready"
    assert fake.fan_driver.duty == 0.0


def test_hello_lists_what_is_configured(pico):
    _, controller = pico
    reply = send(controller, "hello")
    assert reply["ok"] and reply["id"] == 1
    assert reply["firmware"] == "autolab-fluidics" and reply["version"] == config.VERSION
    assert reply["valves"] == {"addition": ["cleaner", "media", "waste"], "aspiration": ["cleaner", "waste"]}
    assert reply["pumps"]["addition"]["max_flow_ul_s"] == 30.0
    assert reply["pumps"]["aspiration"]["max_flow_ul_s"] == 50.0
    assert reply["pumps"]["addition"]["calibrated"] is False
    assert reply["fan"] is True and reply["waste_sensor"] is True


def test_a_pump_refuses_to_run_against_a_shut_line(pico):
    fake, controller = pico
    reply = send(controller, "pump", pump="addition", direction="to_head", volume_ul=100)
    assert not reply["ok"] and "open the addition valve" in reply["error"]
    assert fake.steppers[2].started is None


def test_only_one_port_of_a_valve_is_ever_open(pico):
    fake, controller = pico
    assert send(controller, "valve", valve="addition", port="media")["port"] == "media"
    assert send(controller, "valve", valve="addition", port="waste")["port"] == "waste"
    assert (pin(fake, "media"), pin(fake, "cleaner"), pin(fake, "add_waste")) == (0, 0, 1)
    # Every port goes low before the new one opens, so two are never open together.
    assert fake.outputs[10].history[-1] == 0
    assert send(controller, "valve", valve="addition", port="closed")["port"] == "closed"
    assert pin(fake, "add_waste") == 0
    assert "no port" in send(controller, "valve", valve="aspiration", port="media")["error"]


def test_dispense_runs_the_steps_for_the_volume(pico):
    fake, controller = pico
    send(controller, "valve", valve="addition", port="media")
    reply = send(controller, "pump", pump="addition", direction="to_head", volume_ul=300, flow_ul_s=20)
    assert reply["ok"] and reply["steps"] == 300 * 16 and reply["seconds"] == 15.0
    assert fake.steppers[2].started == (4800, 320.0)
    assert pin(fake, "add_en") == 0 and pin(fake, "add_dir") == 1
    status = send(controller, "status")
    assert status["pumps"]["addition"]["running"] is True
    assert status["pumps"]["addition"]["remaining_s"] == 15.0
    assert status["valves"] == {"addition": "media", "aspiration": "closed"}

    controller.pop_events()
    fake.now += 15000
    fake.steppers[2].finished = True
    controller.tick()
    done = controller.pop_events()
    assert done == [{"event": "pump_done", "pump": "addition", "direction": "to_head", "volume_ul": 300.0, "seconds": 15.0}]
    assert pin(fake, "add_en") == 1


def test_the_valve_cannot_move_under_a_running_pump(pico):
    _, controller = pico
    send(controller, "valve", valve="addition", port="media")
    send(controller, "pump", pump="addition", direction="to_head", seconds=5)
    reply = send(controller, "valve", valve="addition", port="closed")
    assert not reply["ok"] and "stop it before" in reply["error"]
    assert not send(controller, "pump", pump="addition", direction="to_head", seconds=5)["ok"]


def test_from_head_only_flows_into_waste_and_to_head_never_draws_from_it(pico):
    _, controller = pico
    send(controller, "valve", valve="addition", port="media")
    reply = send(controller, "pump", pump="addition", direction="from_head", seconds=10)
    assert "set the addition valve to waste" in reply["error"]
    send(controller, "valve", valve="addition", port="waste")
    assert "draw from the waste" in send(controller, "pump", pump="addition", direction="to_head", seconds=1)["error"]
    assert send(controller, "pump", pump="addition", direction="from_head", seconds=10)["ok"]


def test_flow_above_the_cap_is_refused(pico):
    fake, controller = pico
    send(controller, "valve", valve="aspiration", port="waste")
    reply = send(controller, "pump", pump="aspiration", direction="from_head", seconds=5, flow_ul_s=51)
    assert not reply["ok"] and "max of 50" in reply["error"]
    assert fake.steppers[6].started is None
    # No flow given means the pump's max.
    assert send(controller, "pump", pump="aspiration", direction="from_head", seconds=5)["flow_ul_s"] == 50.0


def test_a_full_waste_bottle_refuses_and_stops_flow_to_waste(pico):
    fake, controller = pico
    send(controller, "valve", valve="aspiration", port="waste")
    assert send(controller, "pump", pump="aspiration", direction="from_head", seconds=30)["ok"]
    controller.pop_events()
    fake.inputs[18].v = 0  # float switch closes: full
    fake.now += 100
    controller.tick()
    events = controller.pop_events()
    assert events[0] == {"event": "waste_full"}
    assert events[1]["event"] == "pump_stopped" and events[1]["reason"] == "waste_full"
    assert events[1]["volume_ul"] == 5.0  # 0.1 s at 50 uL/s
    assert pin(fake, "asp_en") == 1
    reply = send(controller, "pump", pump="aspiration", direction="from_head", seconds=1)
    assert not reply["ok"] and "waste bottle is full" in reply["error"]
    assert send(controller, "status")["waste_full"] is True


def test_dispensing_media_still_works_with_waste_full(pico):
    fake, controller = pico
    fake.inputs[18].v = 0
    send(controller, "valve", valve="addition", port="media")
    assert send(controller, "pump", pump="addition", direction="to_head", volume_ul=10)["ok"]


def test_waste_full_clears_only_after_it_settles(pico):
    fake, controller = pico
    fake.inputs[18].v = 0
    controller.tick()
    fake.inputs[18].v = 1
    fake.now += 500
    controller.tick()
    fake.now += 400
    controller.tick()
    assert controller.waste_full
    fake.now += 600
    controller.tick()
    assert not controller.waste_full
    assert controller.pop_events()[-1] == {"event": "waste_ok"}


def test_the_watchdog_stops_pumps_and_closes_valves_when_the_host_goes_quiet(pico):
    fake, controller = pico
    send(controller, "valve", valve="addition", port="media")
    send(controller, "pump", pump="addition", direction="to_head", seconds=60)
    controller.pop_events()
    fake.now += 4000
    send(controller, "ping")
    fake.now += 4000
    controller.tick()
    assert controller.pumps["addition"].running
    fake.now += 1500
    controller.tick()
    events = controller.pop_events()
    assert events[0]["event"] == "pump_stopped" and events[0]["reason"] == "watchdog"
    assert events[1]["event"] == "watchdog"
    assert pin(fake, "media") == 0 and pin(fake, "add_en") == 1


def test_the_watchdog_sleeps_while_nothing_runs(pico):
    fake, controller = pico
    controller.pop_events()
    send(controller, "valve", valve="addition", port="media")
    fake.now += 60000
    controller.tick()
    assert controller.pop_events() == []
    assert pin(fake, "media") == 1


def test_stop_reports_what_was_delivered(pico):
    fake, controller = pico
    send(controller, "valve", valve="addition", port="media")
    send(controller, "pump", pump="addition", direction="to_head", seconds=10, flow_ul_s=10)
    controller.pop_events()
    fake.now += 2000
    assert send(controller, "stop")["stopped"] == ["addition"]
    event = controller.pop_events()[0]
    assert event == {"event": "pump_stopped", "pump": "addition", "reason": "stop",
                     "direction": "to_head", "volume_ul": 20.0, "seconds": 2.0}
    assert send(controller, "stop", pump="addition")["stopped"] == []


def test_calibration_is_saved_and_used_after_a_reboot(tmp_path):
    path = str(tmp_path / "calibration.json")
    controller = Controller(FakeHal(), calibration_path=path)
    reply = send(controller, "calibrate", pump="addition", commanded_ul=1000, measured_ul=800)
    assert reply["ok"] and reply["steps_per_ul"] == 20.0
    assert json.loads((tmp_path / "calibration.json").read_text()) == {"addition": 20.0}

    rebooted = Controller(FakeHal(), calibration_path=path)
    hello = send(rebooted, "hello")
    assert hello["pumps"]["addition"] == {"valve": "addition", "max_flow_ul_s": 30.0, "steps_per_ul": 20.0, "calibrated": True}
    assert hello["pumps"]["aspiration"]["calibrated"] is False
    assert not send(rebooted, "calibrate", pump="addition", steps_per_ul=0)["ok"]
    assert send(rebooted, "calibrate", pump="aspiration", steps_per_ul=12.5)["steps_per_ul"] == 12.5


def test_a_broken_calibration_file_is_ignored(tmp_path):
    path = tmp_path / "calibration.json"
    path.write_text("{nope")
    assert config.load_calibration(str(path)) == {}
    path.write_text(json.dumps({"addition": "fast", "aspiration": 1e9, "ghost": 3}))
    assert config.load_calibration(str(path)) == {}


@pytest.mark.parametrize(
    "line, error",
    [
        ("{not json", "bad JSON"),
        ("[1, 2]", "expected a JSON object"),
        ('{"id": 4, "cmd": "dance"}', "unknown command 'dance'"),
        ('{"id": 4, "cmd": "pump", "pump": "addition", "direction": "up", "seconds": 1}', "direction must be"),
        ('{"id": 4, "cmd": "pump", "pump": "addition", "direction": "to_head"}', "exactly one of"),
        ('{"id": 4, "cmd": "pump", "pump": "addition", "direction": "to_head", "seconds": true}', "must be a number"),
        ('{"id": 4, "cmd": "pump", "pump": "addition", "direction": "to_head", "seconds": NaN}', "finite"),
        ('{"id": 4, "cmd": "fan", "duty": 1.5}', "from 0 to 1"),
        ("x" * 600, "line too long"),
    ],
)
def test_bad_requests_get_an_error_reply(pico, line, error):
    _, controller = pico
    reply = json.loads(protocol.handle_line(controller, line))
    assert reply["ok"] is False and error in reply["error"]
    assert reply["id"] in (None, 4)


def test_an_unexpected_failure_stops_everything(pico, monkeypatch):
    fake, controller = pico
    send(controller, "valve", valve="addition", port="media")
    send(controller, "pump", pump="addition", direction="to_head", seconds=5)
    monkeypatch.setattr(controller, "status", lambda *a: 1 / 0)
    reply = send(controller, "status")
    assert reply["error"].startswith("internal error")
    assert not controller.pumps["addition"].running and pin(fake, "media") == 0


def test_fan_duty_and_rpm_from_the_tach(pico):
    fake, controller = pico
    assert send(controller, "fan", duty=0.6) == {"id": 1, "ok": True, "duty": 0.6, "rpm": None}
    assert fake.fan_driver.duty == 0.6
    controller.tick()
    fake.fan_driver.count += 50  # 25 revolutions in a second
    fake.now += 1000
    controller.tick()
    assert send(controller, "status")["fan"] == {"duty": 0.6, "rpm": 1500}


def test_the_serve_loop_answers_lines_and_sends_events(pico):
    fake, controller = pico
    incoming = list('{"id": 9, "cmd": "ping"}\n' + "y" * 700 + "\n")
    sent = []
    reader = protocol.LineReader()
    serve.step(controller, reader, lambda: incoming.pop(0) if incoming else None, sent.append)
    messages = [json.loads(s) for s in sent]
    assert messages[0] == {"id": 9, "ok": True, "pong": True}
    assert messages[1] == {"id": None, "ok": False, "error": "line too long"}
    assert messages[2]["event"] == "ready"


# The real HAL, against fake machine and rp2 modules.


class MachinePin:
    OUT, IN, PULL_UP, IRQ_FALLING = "out", "in", "pull_up", "falling"
    made = []

    def __init__(self, pin, mode=None, pull=None, value=None):
        self.pin, self.mode, self.pull, self.v = pin, mode, pull, value
        self.handler = None
        MachinePin.made.append(self)

    def value(self, v=None):
        if v is None:
            return self.v
        self.v = v

    def irq(self, trigger, handler):
        self.handler = handler


class MachinePWM:
    def __init__(self, pin):
        self.pin, self.f, self.duty = pin, None, None

    def freq(self, f):
        self.f = f

    def duty_u16(self, d):
        self.duty = d


class StateMachine:
    def __init__(self, sm_id, program, freq, set_base):
        self.sm_id, self.freq, self.words, self.active_state, self.rx = sm_id, freq, [], 0, 0
        self.execs = []

    def put(self, word):
        self.words.append(word)

    def active(self, on):
        self.active_state = on

    def rx_fifo(self):
        return self.rx

    def get(self):
        self.rx -= 1

    def exec(self, instruction):
        self.execs.append(instruction)


@pytest.fixture
def fake_machine(monkeypatch):
    machine = types.SimpleNamespace(Pin=MachinePin, PWM=MachinePWM)
    rp2 = types.SimpleNamespace(
        asm_pio=lambda **kw: (lambda f: f), PIO=types.SimpleNamespace(OUT_LOW=0), StateMachine=StateMachine
    )
    monkeypatch.setitem(sys.modules, "machine", machine)
    monkeypatch.setitem(sys.modules, "rp2", rp2)
    monkeypatch.setattr(hal, "_program", None)
    MachinePin.made = []


def test_the_real_hal_boots_safe_and_drives_the_pio(fake_machine, tmp_path):
    controller = Controller(hal.PicoHal(), calibration_path=str(tmp_path / "c.json"))
    first = {}
    for p in MachinePin.made:
        first.setdefault(p.pin, p)
    assert all(first[n].v == 0 for n in (10, 11, 12, 13, 14))
    assert first[4].v == 1 and first[8].v == 1
    assert first[18].mode == "in" and first[18].pull == "pull_up"
    controller.tick()  # the pull-up reads None here, which isn't "full"

    stepper = controller.pumps["addition"].steps
    stepper.start(100, 1000)
    sm = stepper._sm
    assert sm.sm_id == 0 and sm.freq == hal.PIO_FREQ and sm.active_state == 1
    assert sm.words == [99, hal.half_period_loops(1000)]
    assert not stepper.done()
    sm.rx = 1
    assert stepper.done() and sm.active_state == 0 and sm.execs == ["set(pins, 0)"]


def test_step_timing_matches_the_pio_program():
    loops = hal.half_period_loops(800)
    cycles = 2 * loops + hal.STEP_OVERHEAD
    assert abs(hal.PIO_FREQ / cycles - 800) < 2
