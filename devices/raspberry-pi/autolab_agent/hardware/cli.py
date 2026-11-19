"""Bench commands for the hardware, run with the agent service stopped:

    python -m autolab_agent.main fluidics status
    python -m autolab_agent.main fluidics prime --pump addition --volume-ul 500
    python -m autolab_agent.main media-change aspirate --wells A1-A6 --seconds 20 --dry-run

The agent holds the serial ports while it runs, so stop it first with
sudo systemctl stop autolab-agent.
"""

import argparse
import json
import os
from typing import Any

from . import media_change
from .config import HardwareSettings
from .motion import Gantry, Marlin, MotionError
from .pico import PicoClient, PicoError


def add_commands(sub: Any) -> None:
    fluidics = sub.add_parser("fluidics", help="talk to the Pico fluidics controller")
    fluidics.add_argument("--port", default=None, help="serial port, or auto (default: AUTOLAB_PICO_PORT or auto)")
    actions = fluidics.add_subparsers(dest="action", required=True)
    actions.add_parser("status", help="firmware, pumps, valves, fan and waste")
    actions.add_parser("stop", help="stop both pumps")

    prime = actions.add_parser("prime", help="fill a line from a bottle, with the head over the bin")
    prime.add_argument("--pump", choices=["addition", "aspiration"], default="addition")
    prime.add_argument("--bottle", default=None, help="bottle to draw from (default: media, or cleaner for aspiration)")
    prime.add_argument("--volume-ul", type=float, required=True)
    prime.add_argument("--flow", type=float, default=None, help="uL/s (default: the pump's max)")

    pump = actions.add_parser("pump", help="one run, for calibration and testing")
    pump.add_argument("pump", choices=["addition", "aspiration"])
    pump.add_argument("direction", choices=["to_head", "from_head"])
    amount = pump.add_mutually_exclusive_group(required=True)
    amount.add_argument("--volume-ul", type=float)
    amount.add_argument("--seconds", type=float)
    pump.add_argument("--flow", type=float, default=None)

    valve = actions.add_parser("valve", help="set a valve: media, cleaner, waste or closed")
    valve.add_argument("valve", choices=["addition", "aspiration"])
    valve.add_argument("position")

    fan = actions.add_parser("fan", help="HEPA fan duty from 0 to 1")
    fan.add_argument("duty", type=float)

    calibrate = actions.add_parser("calibrate", help="save steps per uL for a pump")
    calibrate.add_argument("pump", choices=["addition", "aspiration"])
    calibrate.add_argument("--steps-per-ul", type=float)
    calibrate.add_argument("--commanded-ul", type=float, help="what the run asked for")
    calibrate.add_argument("--measured-ul", type=float, help="what came out (weigh it: 1 mg is 1 uL of water)")

    change = sub.add_parser("media-change", help="run or preview a media change routine")
    change.add_argument("routine", choices=["aspirate", "add", "clean"])
    change.add_argument("--wells", default="A1-A6", help="e.g. A1-A6, A1,B2 or A (default: A1-A6)")
    change.add_argument("--seconds", type=float, default=20.0, help="aspiration time per well")
    change.add_argument("--volume-ul", type=float, default=500.0, help="per well for add, per line for clean")
    change.add_argument("--flow", type=float, default=None, help="uL/s (default: the pump's max)")
    change.add_argument("--first-tip", type=int, default=0, help="rack index of the next unused tip")
    change.add_argument("--prime-ul", type=float, default=0.0, help="refill the addition line over the bin first")
    change.add_argument("--dwell", type=float, default=0.0, help="seconds to leave cleaner in the lines")
    change.add_argument("--no-home", action="store_true", help="skip homing before the routine")
    change.add_argument("--dry-run", action="store_true", help="print the steps and move nothing")


def plan(args: argparse.Namespace) -> list[media_change.Step]:
    if args.routine == "clean":
        return media_change.cleaning_plan(args.volume_ul, args.flow, dwell_s=args.dwell)
    wells = media_change.parse_wells(args.wells)
    if args.routine == "aspirate":
        return media_change.aspiration_plan(wells, args.seconds, args.flow, first_tip=args.first_tip)
    return media_change.addition_plan(wells, args.volume_ul, args.flow, prime_ul=args.prime_ul)


def run(args: argparse.Namespace) -> int:
    try:
        return _run(args)
    except (PicoError, MotionError, ValueError, RuntimeError) as exc:
        print(f"Error: {exc}")
        return 1


def _run(args: argparse.Namespace) -> int:
    if args.command == "media-change":
        steps = plan(args)
        if args.dry_run:
            for number, step in enumerate(steps, 1):
                print(f"{number:3d}. {step.describe()}")
            return 0
        return _media_change(args, steps)
    port = args.port or os.getenv("AUTOLAB_PICO_PORT") or "auto"
    with PicoClient(port) as pico:
        print(json.dumps(_fluidics(pico, args), indent=2))
    return 0


def _fluidics(pico: PicoClient, args: argparse.Namespace) -> dict:
    if args.action == "status":
        return {"hello": pico.hello, "status": pico.status()}
    if args.action == "stop":
        return pico.stop()
    if args.action == "valve":
        return pico.valve(args.valve, args.position)
    if args.action == "fan":
        return pico.fan(args.duty)
    if args.action == "calibrate":
        fields = {k: v for k, v in (("steps_per_ul", args.steps_per_ul), ("commanded_ul", args.commanded_ul),
                                     ("measured_ul", args.measured_ul)) if v is not None}
        return pico.calibrate(args.pump, **fields)
    if args.action == "pump":
        valve = pico.status()["valves"].get(args.pump)
        print(f"{args.pump} valve is {valve}")
        return pico.run(args.pump, args.direction, volume_ul=args.volume_ul, seconds=args.seconds, flow_ul_s=args.flow)
    # prime
    bottle = args.bottle or ("media" if args.pump == "addition" else "cleaner")
    pico.valve(args.pump, bottle)
    try:
        return pico.run(args.pump, "to_head", volume_ul=args.volume_ul, flow_ul_s=args.flow)
    finally:
        pico.valve(args.pump, "closed")


def _media_change(args: argparse.Namespace, steps: list[media_change.Step]) -> int:
    settings = HardwareSettings.from_env()
    if not settings.marlin_port:
        raise SystemExit("Set AUTOLAB_MARLIN_PORT in .env to the Marlin board's serial port")
    marlin = Marlin(settings.marlin_port, settings.marlin_baud).open()
    try:
        with PicoClient(settings.pico_port or "auto") as pico:
            gantry = Gantry(marlin)
            if not args.no_home:
                gantry.home()
            media_change.run_plan(steps, gantry, pico)
    finally:
        marlin.close()
    print(f"Done: {len(steps)} steps")
    return 0
