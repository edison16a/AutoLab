"""Media change routines follow the team's notes step for step, and the gantry speaks G-code."""

import pytest

from autolab_agent.hardware import media_change as mc
from autolab_agent.hardware.motion import Deck, Gantry, Marlin, MotionError

ROW_A = ["A1", "A2", "A3", "A4", "A5", "A6"]


def summary(steps):
    """Steps as short tuples, easy to compare with the notes."""
    out = []
    for s in steps:
        a = s.args
        if s.action == "valve":
            out.append(("valve", a["valve"], a["port"]))
        elif s.action == "pump":
            out.append(("pump", a["pump"], a["direction"], a.get("volume_ul") or a.get("seconds")))
        else:
            out.append((s.action, *a.values()))
    return out


def test_aspiration_uses_a_fresh_tip_per_well_and_ends_with_10_s_of_suction():
    steps = summary(mc.aspiration_plan(ROW_A, seconds=20))
    per_well = lambda i, well: [
        ("pick_tip", i),
        ("tip_into_well", well),
        ("valve", "aspiration", "waste"),
        ("pump", "aspiration", "from_head", 20),
        ("away_from_plate",),
        ("eject_tip",),
    ]
    expected = [step for i, well in enumerate(ROW_A) for step in per_well(i, well)]
    expected += [
        ("away_from_plate",),
        ("valve", "aspiration", "waste"),
        ("pump", "aspiration", "from_head", 10.0),
        ("valve", "aspiration", "closed"),
    ]
    assert steps == expected
    assert sum(1 for s in steps if s[0] == "pick_tip") == 6 == sum(1 for s in steps if s[0] == "eject_tip")


def test_aspiration_starts_from_the_next_unused_tip():
    steps = mc.aspiration_plan(["B1", "B2"], seconds=5, first_tip=10)
    assert [s.args["index"] for s in steps if s.action == "pick_tip"] == [10, 11]


def test_addition_dispenses_well_by_well_then_sucks_the_line_back():
    steps = summary(mc.addition_plan(["A1", "A2", "A3"], volume_ul=500))
    assert steps == [
        ("valve", "addition", "media"),
        ("needle_over_well", "A1"),
        ("pump", "addition", "to_head", 500),
        ("needle_over_well", "A2"),
        ("pump", "addition", "to_head", 500),
        ("needle_over_well", "A3"),
        ("pump", "addition", "to_head", 500),
        ("valve", "addition", "waste"),
        ("pump", "addition", "from_head", 10.0),
        ("valve", "addition", "closed"),
        ("away_from_plate",),
    ]


def test_addition_can_prime_the_line_over_the_bin_first():
    steps = summary(mc.addition_plan(["A1"], volume_ul=300, prime_ul=150))
    assert steps[:4] == [
        ("valve", "addition", "media"),
        ("over_bin",),
        ("pump", "addition", "to_head", 150),
        ("needle_over_well", "A1"),
    ]


def test_cleaning_flushes_each_line_and_pulls_the_cleaner_to_waste():
    steps = summary(mc.cleaning_plan(volume_ul=800, dwell_s=30))
    flush = lambda line: [
        ("valve", line, "cleaner"),
        ("pump", line, "to_head", 800),
        ("wait", 30),
        ("valve", line, "waste"),
        ("pump", line, "from_head", 10.0),
        ("valve", line, "closed"),
    ]
    assert steps == [("over_bin",), *flush("aspiration"), *flush("addition"), ("away_from_plate",)]


def test_every_flow_matches_the_arrows_in_the_notes():
    """from_head always goes to waste; to_head never draws from it."""
    for steps in (mc.aspiration_plan(ROW_A, 20), mc.addition_plan(ROW_A, 500, prime_ul=100), mc.cleaning_plan()):
        port = {}
        for s in steps:
            if s.action == "valve":
                port[s.args["valve"]] = s.args["port"]
            elif s.action == "pump":
                current = port[s.args["pump"]]
                assert (current == "waste") == (s.args["direction"] == "from_head"), s


def test_flow_is_passed_through_for_the_pico_to_cap():
    steps = mc.addition_plan(["A1"], volume_ul=100, flow_ul_s=15)
    pump = next(s for s in steps if s.action == "pump")
    assert pump.args["flow_ul_s"] == 15
    assert pump.describe() == "addition pump to_head for 100 uL at 15 uL/s"


def test_default_flows_are_gentle_and_under_the_pmst100_max():
    # PMST100 on 1/16" ID tubing: 65 uL per revolution, 75 rpm at most.
    assert mc.PMST100_MAX_FLOW_UL_S == 81.25
    flows = {}
    for steps in (mc.aspiration_plan(["A1"], 20), mc.addition_plan(["A1"], 500, prime_ul=100), mc.cleaning_plan()):
        for s in steps:
            if s.action == "pump":
                flows.setdefault(s.args["pump"], set()).add(s.args["flow_ul_s"])
    assert flows == {"addition": {30.0}, "aspiration": {50.0}}
    step = next(s for s in mc.addition_plan(["A1"], 100) if s.action == "pump")
    assert step.describe() == "addition pump to_head for 100 uL at 30 uL/s"


@pytest.mark.parametrize("flow", [0, -5, 82])
def test_a_flow_the_pump_cannot_give_is_refused_before_anything_moves(flow):
    with pytest.raises(ValueError, match="81.25 uL/s"):
        mc.addition_plan(["A1"], 100, flow_ul_s=flow)


@pytest.mark.parametrize(
    "text, wells",
    [("A1-A6", ROW_A), ("A", ROW_A), ("b2, C3", ["B2", "C3"]), ("D4-D6", ["D4", "D5", "D6"])],
)
def test_wells_are_read_like_a_lab_would_write_them(text, wells):
    assert mc.parse_wells(text) == wells


@pytest.mark.parametrize("text", ["A0", "E1", "A7", "A1-B2", "A3-A1", "A1,A1", "", "11"])
def test_bad_wells_are_refused(text):
    with pytest.raises(ValueError):
        mc.parse_wells(text)


class Log:
    def __init__(self, waste_full=False, fail_on=None):
        self.calls = []
        self.waste_full = waste_full
        self.fail_on = fail_on


class FakeMotion:
    def __init__(self, log):
        self.log = log

    def __getattr__(self, name):
        def move(**args):
            self.log.calls.append((name, *args.values()))
        return move


class FakeFluidics:
    def __init__(self, log):
        self.log = log

    def status(self):
        return {"waste_full": self.log.waste_full}

    def valve(self, valve, port):
        self.log.calls.append(("valve", valve, port))

    def run(self, pump, direction, **amount):
        if self.log.fail_on == (pump, direction):
            raise RuntimeError("The aspiration pump stopped early (waste_full)")
        self.log.calls.append(("pump", pump, direction, amount.get("volume_ul") or amount.get("seconds")))

    def stop(self, pump=None):
        self.log.calls.append(("stop",))


def run(plan, log):
    mc.run_plan(plan, FakeMotion(log), FakeFluidics(log), sleep=lambda s: log.calls.append(("wait", s)))
    return log.calls


def test_run_plan_carries_out_the_steps_in_order():
    plan = mc.aspiration_plan(["A1", "A2"], seconds=20)
    assert run(plan, Log()) == summary(plan)


def test_a_full_waste_bottle_stops_a_routine_before_it_moves():
    log = Log(waste_full=True)
    with pytest.raises(RuntimeError, match="waste bottle is full"):
        run(mc.aspiration_plan(["A1"], seconds=20), log)
    assert log.calls == []
    # Dispensing doesn't need the waste bottle until its final suction, so it is refused too.
    with pytest.raises(RuntimeError):
        run(mc.addition_plan(["A1"], 100), log)


def test_a_failure_mid_routine_stops_the_pumps_and_shuts_the_valves():
    log = Log(fail_on=("aspiration", "from_head"))
    with pytest.raises(RuntimeError, match="stopped early"):
        run(mc.aspiration_plan(["A1", "A2"], seconds=20), log)
    assert log.calls == [
        ("pick_tip", 0), ("tip_into_well", "A1"), ("valve", "aspiration", "waste"),
        ("stop",), ("valve", "aspiration", "closed"),
    ]


class FakeMarlinSerial:
    def __init__(self, replies=None):
        self.sent = []
        self.replies = replies or {}
        self.queue = []

    def write(self, data):
        line = data.decode().strip()
        self.sent.append(line)
        self.queue += self.replies.get(line.split()[0], ["ok"])

    def readline(self):
        return (self.queue.pop(0) + "\n").encode() if self.queue else b""

    def close(self):
        pass


def test_marlin_waits_through_busy_and_reads_the_firmware():
    wire = FakeMarlinSerial({
        "M115": ["FIRMWARE_NAME:Marlin 2.1.2.1 (Jun 13 2023) SOURCE_CODE_URL:github.com/MarlinFirmware/Marlin", "Cap:EEPROM:1", "ok"],
        "G28": ["echo:busy: processing", "echo:busy: processing", "ok"],
    })
    marlin = Marlin("/dev/null", connection=wire).open()
    assert marlin.firmware == "Marlin 2.1.2.1 (Jun 13 2023)"
    assert wire.sent == ["M115", "G21", "G90"]
    marlin.home()
    assert wire.sent[-1] == "G28"


def test_marlin_errors_and_silence_raise():
    wire = FakeMarlinSerial({"G1": ["Error:Printer halted. kill() called!"], "M999": []})
    marlin = Marlin("/dev/null", connection=wire, timeout=0.1)
    with pytest.raises(MotionError, match="Printer halted"):
        marlin.move(x=10)
    with pytest.raises(MotionError, match="did not answer"):
        marlin.send("M999")


def test_gantry_moves_end_with_m400_so_pumps_never_start_mid_move():
    wire = FakeMarlinSerial()
    deck = Deck(plate_a1=(100.0, 50.0), needle_offset=(25.0, -5.0), safe_z=60, dispense_z=30)
    gantry = Gantry(Marlin("/dev/null", connection=wire), deck)
    gantry.needle_over_well("B3")
    # B3 is one row and two columns from A1 at 19.3 mm pitch; the needle offset is taken off.
    assert wire.sent == ["G1 Z60.00 F600", "G1 X113.60 Y74.30 F3000", "G1 Z30.00 F600", "M400"]
    for move in (lambda: gantry.pick_tip(13), gantry.eject_tip, gantry.away_from_plate, lambda: gantry.tip_into_well("D6"), gantry.over_bin):
        wire.sent.clear()
        move()
        assert wire.sent[0].startswith("G1 Z60.00") and wire.sent[-1] == "M400"


def test_tips_are_taken_row_by_row_from_a1():
    deck = Deck(tip_a1=(10.0, 20.0), tip_pitch=9.0)
    assert deck.tip_xy(0) == (10.0, 20.0)
    assert deck.tip_xy(13) == (19.0, 29.0)
    with pytest.raises(ValueError):
        deck.tip_xy(96)
