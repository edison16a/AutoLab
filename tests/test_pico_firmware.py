"""The Pico fluidics firmware, run under CPython with a fake HAL and fake machine/rp2."""

import copy
import json
import sys
import types

import pytest

from pico_support import FakeHal
from fluidics import config, hal, protocol, serve
from fluidics.controller import Controller


PINS = {"add_en": 2, "add_dir": 3, "asp_en": 6, "asp_dir": 7,
        "media": 10, "cleaner": 11, "add_waste": 12, "asp_waste": 13, "asp_cleaner": 14}
ADD_SPEED, ASP_SPEED = 4, 8


def speed(flow, ul_per_rev=65.0, rpm_at_5v=75.0, full_scale=3.3 * 1.5):
    """rpm, volts on the SMC10 input and PWM duty, worked out by hand."""
    rpm = flow * 60 / ul_per_rev
    volts = rpm / rpm_at_5v * 5
    return rpm, volts, volts / full_scale


def make_config(**pump_changes):
    """A copy of config.py with changes to every pump, for a controller under test."""
    cfg = types.SimpleNamespace(**{k: getattr(config, k) for k in dir(config) if not k.startswith("__")})
    cfg.PUMPS = copy.deepcopy(config.PUMPS)
    for pump in cfg.PUMPS.values():
        pump.update(pump_changes)
    return cfg


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


def test_boot_leaves_valves_closed_and_controllers_disabled_at_zero_speed(pico):
    fake, controller = pico
    for name in ("media", "cleaner", "add_waste", "asp_waste", "asp_cleaner"):
        assert pin(fake, name) == 0
    # enable_level is 1, so 0 leaves each SMC10's EN input open: disabled.
    assert pin(fake, "add_en") == 0 and pin(fake, "asp_en") == 0
    assert fake.outputs[2].history == [0] and fake.outputs[6].history == [0]
    assert fake.pwms[ADD_SPEED].duty == 0.0 and fake.pwms[ASP_SPEED].duty == 0.0
    assert fake.pwms[ADD_SPEED].freq == 20000
    assert not controller.pumps["addition"].enabled
    assert controller.pop_events()[0]["event"] == "ready"
    assert fake.fan_driver.duty == 0.0


def test_hello_lists_what_is_configured(pico):
    _, controller = pico
    reply = send(controller, "hello")
    assert reply["ok"] and reply["id"] == 1
    assert reply["firmware"] == "autolab-fluidics" and reply["version"] == config.VERSION
    assert reply["valves"] == {"addition": ["cleaner", "media", "waste"], "aspiration": ["cleaner", "waste"]}
    assert reply["pumps"]["addition"] == {
        "valve": "addition", "controller": "SMC10", "max_flow_ul_s": 30.0, "max_rpm": 75.0,
        "ul_per_rev": 65.0, "rpm_at_5v": 75.0, "speed_full_scale_v": 4.95, "calibrated": False,
    }
    assert reply["pumps"]["aspiration"]["max_flow_ul_s"] == 50.0
    assert reply["fan"] is True and reply["waste_sensor"] is True


def test_a_pump_refuses_to_run_against_a_shut_line(pico):
    fake, controller = pico
    reply = send(controller, "pump", pump="addition", direction="to_head", volume_ul=100)
    assert not reply["ok"] and "open the addition valve" in reply["error"]
    assert pin(fake, "add_en") == 0 and fake.pwms[ADD_SPEED].history == [0.0]


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


def test_dispense_is_a_timed_run_at_the_speed_for_the_flow(pico):
    fake, controller = pico
    send(controller, "valve", valve="addition", port="media")
    reply = send(controller, "pump", pump="addition", direction="to_head", volume_ul=300, flow_ul_s=20)
    rpm, volts, duty = speed(20)
    assert reply["ok"] and reply["seconds"] == 15.0 and reply["volume_ul"] == 300.0
    assert reply["rpm"] == round(rpm, 2) == 18.46 and reply["speed_v"] == round(volts, 3) == 1.231
    assert "steps" not in reply
    assert fake.pwms[ADD_SPEED].duty == pytest.approx(duty) == pytest.approx(0.24864, abs=1e-5)
    assert pin(fake, "add_en") == 1 and pin(fake, "add_dir") == 0
    status = send(controller, "status")
    assert status["pumps"]["addition"] == {
        "running": True, "direction": "to_head", "enabled": True, "speed_v": 1.231,
        "rpm": 18.46, "flow_ul_s": 20.0, "remaining_s": 15.0, "remaining_ul": 300.0,
    }
    assert status["pumps"]["aspiration"] == {"running": False, "direction": None, "enabled": False, "speed_v": 0.0}
    assert status["valves"] == {"addition": "media", "aspiration": "closed"}

    controller.pop_events()
    fake.now += 14999
    send(controller, "ping")  # the host keeps the watchdog fed
    controller.tick()
    assert controller.pop_events() == [] and pin(fake, "add_en") == 1
    fake.now += 1
    controller.tick()
    done = controller.pop_events()
    assert done == [{"event": "pump_done", "pump": "addition", "direction": "to_head", "volume_ul": 300.0, "seconds": 15.0}]
    assert pin(fake, "add_en") == 0 and fake.pwms[ADD_SPEED].duty == 0.0


def test_duty_without_the_op_amp_is_out_of_3_3_v(tmp_path):
    fake = FakeHal()
    controller = Controller(fake, make_config(speed_full_scale_v=3.3), str(tmp_path / "c.json"))
    send(controller, "valve", valve="addition", port="media")
    reply = send(controller, "pump", pump="addition", direction="to_head", seconds=2, flow_ul_s=30)
    rpm, volts, duty = speed(30, full_scale=3.3)
    assert reply["ok"] and reply["speed_v"] == round(volts, 3) == 1.846
    assert fake.pwms[ADD_SPEED].duty == pytest.approx(duty) == pytest.approx(0.55944, abs=1e-5)
    # With the op-amp the same flow needs less duty.
    assert speed(30)[2] == pytest.approx(duty / 1.5)
    assert send(controller, "hello")["pumps"]["addition"]["speed_full_scale_v"] == 3.3

    # If the SMC10 runs 50 rpm at 5 V, 3.3 V is 33 rpm: 40 uL/s would need 3.69 V.
    send(controller, "calibrate", pump="aspiration", rpm_at_5v=50)
    send(controller, "valve", valve="aspiration", port="waste")
    refused = send(controller, "pump", pump="aspiration", direction="from_head", seconds=2, flow_ul_s=40)
    assert not refused["ok"] and "tops out at 3.30 V" in refused["error"]
    assert fake.pwms[ASP_SPEED].history == [0.0] and pin(fake, "asp_en") == 0


def test_more_than_75_rpm_is_refused_not_clamped(pico):
    fake, controller = pico
    # 1/32" tubing (20 uL/rev) on an SMC10 that runs 100 rpm at 5 V, so the
    # speed output could go faster than the PMST100 should.
    send(controller, "calibrate", pump="aspiration", ul_per_rev=20, rpm_at_5v=100)
    send(controller, "valve", valve="aspiration", port="waste")
    reply = send(controller, "pump", pump="aspiration", direction="from_head", seconds=2, flow_ul_s=26)
    assert not reply["ok"] and "78.0 rpm" in reply["error"] and "max is 75 rpm" in reply["error"]
    assert fake.pwms[ASP_SPEED].history == [0.0] and pin(fake, "asp_en") == 0
    exactly = send(controller, "pump", pump="aspiration", direction="from_head", seconds=2, flow_ul_s=25)
    assert exactly["ok"] and exactly["rpm"] == 75.0 and exactly["speed_v"] == 3.75
    assert fake.pwms[ASP_SPEED].duty == pytest.approx(3.75 / 4.95)


def test_the_smc10_input_never_gets_more_than_5_v(tmp_path):
    controller = Controller(FakeHal(), make_config(speed_full_scale_v=6.6), str(tmp_path / "c.json"))
    send(controller, "calibrate", pump="aspiration", rpm_at_5v=40)
    send(controller, "valve", valve="aspiration", port="waste")
    reply = send(controller, "pump", pump="aspiration", direction="from_head", seconds=2, flow_ul_s=50)
    assert not reply["ok"] and "takes 5 V at most" in reply["error"]


def test_start_sets_speed_then_dir_then_enable_and_stop_disables_first(pico):
    fake, controller = pico
    send(controller, "valve", valve="aspiration", port="waste")
    mark = len(fake.log)
    send(controller, "pump", pump="aspiration", direction="from_head", seconds=10, flow_ul_s=40)
    duty = speed(40)[2]
    started = [entry for entry in fake.log[mark:] if entry[0] in (6, 7, ASP_SPEED)]
    assert started == [(ASP_SPEED, ("duty", pytest.approx(duty))), (7, 1), (6, 1)]
    mark = len(fake.log)
    fake.now += 1000
    send(controller, "stop", pump="aspiration")
    stopped = [entry for entry in fake.log[mark:] if entry[0] in (6, 7, ASP_SPEED)]
    assert stopped == [(6, 0), (ASP_SPEED, ("duty", 0.0))]


def test_direction_changes_only_while_stopped(pico):
    fake, controller = pico
    send(controller, "valve", valve="addition", port="waste")
    send(controller, "pump", pump="addition", direction="from_head", seconds=10)
    assert pin(fake, "add_dir") == 1
    dir_writes = list(fake.outputs[3].history)
    reply = send(controller, "pump", pump="addition", direction="to_head", seconds=10)
    assert not reply["ok"] and "already running" in reply["error"]
    from fluidics.errors import FluidicsError

    with pytest.raises(FluidicsError, match="stop it before changing direction"):
        controller.pumps["addition"].start("to_head", 10, 10, fake.now)
    assert fake.outputs[3].history == dir_writes and pin(fake, "add_en") == 1
    send(controller, "stop")
    send(controller, "valve", valve="addition", port="media")
    assert send(controller, "pump", pump="addition", direction="to_head", seconds=1)["ok"]
    assert pin(fake, "add_dir") == 0


def test_the_active_levels_come_from_the_config(tmp_path):
    fake = FakeHal()
    controller = Controller(fake, make_config(enable_level=0, to_head_level=1), str(tmp_path / "c.json"))
    assert pin(fake, "add_en") == 1  # disabled is high when enable_level is 0
    send(controller, "valve", valve="addition", port="media")
    send(controller, "pump", pump="addition", direction="to_head", seconds=1)
    assert pin(fake, "add_en") == 0 and pin(fake, "add_dir") == 1
    send(controller, "stop")
    assert pin(fake, "add_en") == 1


def test_a_run_too_short_to_get_up_to_speed_is_refused(pico):
    _, controller = pico
    send(controller, "valve", valve="addition", port="media")
    reply = send(controller, "pump", pump="addition", direction="to_head", volume_ul=2, flow_ul_s=30)
    assert not reply["ok"] and "shorter than 0.1 s" in reply["error"]


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
    assert pin(fake, "asp_en") == 0 and fake.pwms[ASP_SPEED].history == [0.0]
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
    assert pin(fake, "asp_en") == 0 and fake.pwms[ASP_SPEED].duty == 0.0
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
    assert pin(fake, "media") == 0 and pin(fake, "add_en") == 0


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
    # Asked for 1000 uL, weighed 800 mg: each turn moves 80% of what was assumed.
    reply = send(controller, "calibrate", pump="addition", commanded_ul=1000, measured_ul=800)
    assert reply == {"id": 1, "ok": True, "pump": "addition", "ul_per_rev": 52.0, "rpm_at_5v": 75.0, "calibrated": True}
    assert json.loads((tmp_path / "calibration.json").read_text()) == {"addition": {"ul_per_rev": 52.0}}

    rebooted = Controller(FakeHal(), calibration_path=path)
    hello = send(rebooted, "hello")
    assert hello["pumps"]["addition"]["ul_per_rev"] == 52.0 and hello["pumps"]["addition"]["calibrated"] is True
    assert hello["pumps"]["aspiration"]["calibrated"] is False
    # The new figure changes the speed for a flow: 30 uL/s is now 34.6 rpm.
    send(rebooted, "valve", valve="addition", port="media")
    assert send(rebooted, "pump", pump="addition", direction="to_head", seconds=1, flow_ul_s=30)["rpm"] == 34.62
    send(rebooted, "stop")

    assert "out of range" in send(rebooted, "calibrate", pump="addition", ul_per_rev=0)["error"]
    assert "not both" in send(rebooted, "calibrate", pump="addition", ul_per_rev=60, commanded_ul=1, measured_ul=1)["error"]
    assert not send(rebooted, "calibrate", pump="addition")["ok"]
    # rpm_at_5v alone is saved, but the pump still needs weighing.
    only_rpm = send(rebooted, "calibrate", pump="aspiration", rpm_at_5v=60)
    assert only_rpm["rpm_at_5v"] == 60.0 and only_rpm["ul_per_rev"] == 65.0 and only_rpm["calibrated"] is False
    assert send(rebooted, "calibrate", pump="aspiration", ul_per_rev=12.5)["calibrated"] is True
    assert json.loads((tmp_path / "calibration.json").read_text())["aspiration"] == {"rpm_at_5v": 60.0, "ul_per_rev": 12.5}


def test_a_broken_or_old_calibration_file_is_ignored(tmp_path):
    path = tmp_path / "calibration.json"
    path.write_text("{nope")
    assert config.load_calibration(str(path)) == {}
    # The STEP/DIR firmware saved bare steps per uL. Those mean nothing to an SMC10.
    path.write_text(json.dumps({"addition": 16.0, "aspiration": {"ul_per_rev": 1e9, "rpm_at_5v": "fast"}, "ghost": {"ul_per_rev": 3}}))
    assert config.load_calibration(str(path)) == {}
    path.write_text(json.dumps({"addition": {"ul_per_rev": 63, "rpm_at_5v": 0}}))
    assert config.load_calibration(str(path)) == {"addition": {"ul_per_rev": 63.0}}


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
    made = []

    def __init__(self, pin):
        self.pin, self.f, self.duty = pin, None, None
        MachinePWM.made.append(self)

    def freq(self, f):
        self.f = f

    def duty_u16(self, d):
        self.duty = d


@pytest.fixture
def fake_machine(monkeypatch):
    machine = types.SimpleNamespace(Pin=MachinePin, PWM=MachinePWM)
    monkeypatch.setitem(sys.modules, "machine", machine)
    MachinePin.made = []
    MachinePWM.made = []


def test_the_real_hal_boots_safe_and_drives_the_speed_pwm(fake_machine, tmp_path):
    controller = Controller(hal.PicoHal(), calibration_path=str(tmp_path / "c.json"))
    first = {}
    for p in MachinePin.made:
        first.setdefault(p.pin, p)
    assert all(first[n].v == 0 for n in (10, 11, 12, 13, 14))
    assert first[2].v == 0 and first[6].v == 0  # EN inputs left open: disabled
    assert first[18].mode == "in" and first[18].pull == "pull_up"
    pwms = {p.pin.pin: p for p in MachinePWM.made}
    assert pwms[ADD_SPEED].f == 20000 and pwms[ASP_SPEED].f == 20000 and pwms[15].f == 25000
    assert pwms[ADD_SPEED].duty == 0 and pwms[ASP_SPEED].duty == 0
    controller.tick()  # the pull-up reads None here, which isn't "full"

    send(controller, "valve", valve="addition", port="media")
    assert send(controller, "pump", pump="addition", direction="to_head", seconds=5, flow_ul_s=20)["ok"]
    assert pwms[ADD_SPEED].duty == int(speed(20)[2] * 65535 + 0.5)
    assert controller.pumps["addition"].enable.value() == 1
    controller.emergency_stop("halted")
    assert pwms[ADD_SPEED].duty == 0 and controller.pumps["addition"].enable.value() == 0


def test_each_pwm_pin_has_its_own_slice():
    """An RP2040 PWM slice is shared by two pins and has one frequency."""
    pins = [p["speed"] for p in config.PUMPS.values()] + [config.FAN["pwm"]]
    slices = [(pin >> 1) & 7 for pin in pins]
    assert len(set(slices)) == len(slices)
    assert (config.PUMPS["addition"]["speed"], config.PUMPS["aspiration"]["speed"]) == (4, 8)


def test_the_default_speed_range_suits_the_pmst100():
    assert config.SPEED_FULL_SCALE_V == pytest.approx(4.95)
    assert config.MAX_RPM * config.DEFAULT_UL_PER_REV / 60 == pytest.approx(81.25)
    for pump in config.PUMPS.values():
        assert pump["max_flow_ul_s"] < 81.25
