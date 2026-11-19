"""Media change routines: aspiration, addition and cleaning.

Each routine is first a plan, a list of steps, so a dry run can show exactly
what would happen. run_plan then carries the steps out against a gantry and
the Pico, or fakes of them in tests. The order follows the team's notes:

ASPIRATION, per well: fresh tip, into the well, valve to waste, aspiration
pump from_head for a set time, away from the plate, eject the tip. Then away
from the plate and 10 s of suction into waste.

ADDITION: valve to media, then per well: needle over the well, addition pump
to_head for the volume. Then 10 s of suction (from_head into waste) so the
needle doesn't drip.

CLEANING: over the bin, each line pushes cleaner out to_head, then pulls the
spent cleaner back into waste from_head.

Without a flow, each pump step runs at that line's gentle default (30 uL/s
for addition, 50 uL/s for aspiration), the suction steps included.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

from .motion import parse_well

log = logging.getLogger("agent")

SUCTION_S = 10.0
ADDITION, ASPIRATION = "addition", "aspiration"
TO_HEAD, FROM_HEAD = "to_head", "from_head"

# Both pumps are Simply Pumps PMST100s with 1/16" ID tubing: 65 uL per
# revolution and 75 rpm at most, so 81.25 uL/s flat out. The Pico has the
# calibrated figures and refuses anything faster than a pump's max.
PMST100_UL_PER_REV = 65.0
PMST100_MAX_RPM = 75.0
PMST100_MAX_FLOW_UL_S = PMST100_MAX_RPM * PMST100_UL_PER_REV / 60
# Gentle on the neurons, and well under the pump's max.
DEFAULT_FLOW_UL_S = {ADDITION: 30.0, ASPIRATION: 50.0}


class Motion(Protocol):
    def pick_tip(self, index: int) -> None: ...
    def tip_into_well(self, well: str) -> None: ...
    def needle_over_well(self, well: str) -> None: ...
    def away_from_plate(self) -> None: ...
    def eject_tip(self) -> None: ...
    def over_bin(self) -> None: ...


class Fluidics(Protocol):
    def valve(self, valve: str, port: str) -> Any: ...
    def run(self, pump: str, direction: str, **amount: float | None) -> Any: ...
    def stop(self, pump: str | None = None) -> Any: ...
    def status(self) -> dict: ...


@dataclass(frozen=True)
class Step:
    action: str
    args: dict = field(default_factory=dict)

    @property
    def moves(self) -> bool:
        return self.action not in ("valve", "pump", "wait")

    def describe(self) -> str:
        a = self.args
        if self.action == "valve":
            return f"{a['valve']} valve -> {a['port']}"
        if self.action == "pump":
            amount = f"{a['volume_ul']:g} uL" if a.get("volume_ul") else f"{a['seconds']:g} s"
            flow = f" at {a['flow_ul_s']:g} uL/s" if a.get("flow_ul_s") else " at max flow"
            return f"{a['pump']} pump {a['direction']} for {amount}{flow}"
        if self.action == "wait":
            return f"wait {a['seconds']:g} s"
        detail = ", ".join(f"{k}={v}" for k, v in a.items())
        return self.action.replace("_", " ") + (f" ({detail})" if detail else "")


def parse_wells(text: str, rows: int = 4, columns: int = 6) -> list[str]:
    """'A1-A6', 'A1,B2,C3' or a whole row like 'A'. Ranges stay within one row."""
    wells: list[str] = []
    for part in (p.strip().upper() for p in text.split(",") if p.strip()):
        if part.isalpha() and len(part) == 1:
            parse_well(part + "1", rows, columns)
            wells += [f"{part}{c}" for c in range(1, columns + 1)]
        elif "-" in part:
            first, last = (s.strip() for s in part.split("-", 1))
            r1, c1 = parse_well(first, rows, columns)
            r2, c2 = parse_well(last, rows, columns)
            if r1 != r2 or c2 < c1:
                raise ValueError(f"{part!r}: a range runs left to right along one row")
            wells += [f"{first[0]}{c}" for c in range(c1 + 1, c2 + 2)]
        else:
            parse_well(part, rows, columns)
            wells.append(part)
    if not wells:
        raise ValueError("No wells given")
    if len(set(wells)) != len(wells):
        raise ValueError("A well is listed twice")
    return wells


def flow_for(pump: str, flow_ul_s: float | None) -> float:
    """The flow a step runs at: the one given, or the pump's gentle default."""
    flow = DEFAULT_FLOW_UL_S[pump] if flow_ul_s is None else flow_ul_s
    if not 0 < flow <= PMST100_MAX_FLOW_UL_S:
        raise ValueError(f"Flow must be above 0 and at most {PMST100_MAX_FLOW_UL_S:g} uL/s (the PMST100's max)")
    return flow


def _pump(pump: str, direction: str, *, volume_ul: float | None = None,
          seconds: float | None = None, flow_ul_s: float | None = None) -> Step:
    args: dict[str, Any] = {"pump": pump, "direction": direction}
    if volume_ul is not None:
        args["volume_ul"] = volume_ul
    if seconds is not None:
        args["seconds"] = seconds
    args["flow_ul_s"] = flow_for(pump, flow_ul_s)
    return Step("pump", args)


def _valve(valve: str, port: str) -> Step:
    return Step("valve", {"valve": valve, "port": port})


def aspiration_plan(
    wells: list[str], seconds: float, flow_ul_s: float | None = None,
    first_tip: int = 0, suction_s: float = SUCTION_S,
) -> list[Step]:
    """A fresh tip for every well, so nothing carries over between wells."""
    steps: list[Step] = []
    for i, well in enumerate(wells):
        steps += [
            Step("pick_tip", {"index": first_tip + i}),
            Step("tip_into_well", {"well": well}),
            _valve(ASPIRATION, "waste"),
            _pump(ASPIRATION, FROM_HEAD, seconds=seconds, flow_ul_s=flow_ul_s),
            Step("away_from_plate"),
            Step("eject_tip"),
        ]
    steps += [
        Step("away_from_plate"),
        _valve(ASPIRATION, "waste"),
        _pump(ASPIRATION, FROM_HEAD, seconds=suction_s),
        _valve(ASPIRATION, "closed"),
    ]
    return steps


def addition_plan(
    wells: list[str], volume_ul: float, flow_ul_s: float | None = None,
    suction_s: float = SUCTION_S, prime_ul: float = 0.0,
) -> list[Step]:
    """prime_ul refills the line over the bin first, since the last suction left it empty."""
    steps: list[Step] = [_valve(ADDITION, "media")]
    if prime_ul > 0:
        steps += [Step("over_bin"), _pump(ADDITION, TO_HEAD, volume_ul=prime_ul, flow_ul_s=flow_ul_s)]
    for well in wells:
        steps += [
            Step("needle_over_well", {"well": well}),
            _pump(ADDITION, TO_HEAD, volume_ul=volume_ul, flow_ul_s=flow_ul_s),
        ]
    steps += [
        _valve(ADDITION, "waste"),
        _pump(ADDITION, FROM_HEAD, seconds=suction_s),
        _valve(ADDITION, "closed"),
        Step("away_from_plate"),
    ]
    return steps


def cleaning_plan(
    volume_ul: float = 1000.0, flow_ul_s: float | None = None,
    suction_s: float = SUCTION_S, dwell_s: float = 0.0,
) -> list[Step]:
    """Both lines, over the bin: cleaner out through the head, then the spent cleaner to waste."""
    steps: list[Step] = [Step("over_bin")]
    for line in (ASPIRATION, ADDITION):
        steps += [_valve(line, "cleaner"), _pump(line, TO_HEAD, volume_ul=volume_ul, flow_ul_s=flow_ul_s)]
        if dwell_s > 0:
            steps.append(Step("wait", {"seconds": dwell_s}))
        steps += [_valve(line, "waste"), _pump(line, FROM_HEAD, seconds=suction_s), _valve(line, "closed")]
    steps.append(Step("away_from_plate"))
    return steps


def run_plan(steps: list[Step], motion: Motion, fluidics: Fluidics, sleep: Any = time.sleep) -> None:
    """Carry the steps out in order. On any failure, stop the pumps and shut the valves."""
    if any(s.action == "pump" and s.args["direction"] == FROM_HEAD for s in steps):
        if fluidics.status().get("waste_full"):
            raise RuntimeError("The waste bottle is full. Empty it before a media change.")
    try:
        for number, step in enumerate(steps, 1):
            log.info("Step %d/%d: %s", number, len(steps), step.describe())
            if step.action == "valve":
                fluidics.valve(**step.args)
            elif step.action == "pump":
                fluidics.run(**step.args)
            elif step.action == "wait":
                sleep(step.args["seconds"])
            else:
                getattr(motion, step.action)(**step.args)
    except BaseException:
        _make_safe(fluidics, steps)
        raise


def _make_safe(fluidics: Fluidics, steps: list[Step]) -> None:
    try:
        fluidics.stop()
    except Exception as exc:
        log.warning("Could not stop the pumps (%s)", exc)
    for valve in sorted({s.args["valve"] for s in steps if s.action == "valve"}):
        try:
            fluidics.valve(valve, "closed")
        except Exception as exc:
            log.warning("Could not close the %s valve (%s)", valve, exc)
