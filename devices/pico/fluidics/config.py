"""Pins, limits and the saved pump calibration.

Set a pin to None to leave that part out: the firmware then neither drives it
nor lists it in `hello`. Calibration lives in calibration.json on the Pico's
flash and survives a reboot. Everything else is edited here and copied over.
"""

import json

try:
    import os
except ImportError:  # very old MicroPython builds
    import uos as os

FIRMWARE = "autolab-fluidics"
VERSION = "0.1.0"
CALIBRATION_FILE = "calibration.json"

# Placeholder: 200 full steps x 16 microsteps per revolution and roughly
# 200 uL per revolution of the pump head. Calibrate every pump (see README).
DEFAULT_STEPS_PER_UL = 16.0

PUMPS = {
    "addition": {
        "step": 2,
        "dir": 3,
        "enable": 4,  # TMC2209 EN, active low
        "valve": "addition",
        "max_flow_ul_s": 30.0,  # gentle on neurons; never raise without the biologists
        "steps_per_ul": DEFAULT_STEPS_PER_UL,  # calibrate
        "invert": False,  # flip if to_head runs the wrong way
        "pio": 0,  # state machine id
    },
    "aspiration": {
        "step": 6,
        "dir": 7,
        "enable": 8,
        "valve": "aspiration",
        "max_flow_ul_s": 50.0,
        "steps_per_ul": DEFAULT_STEPS_PER_UL,  # calibrate
        "invert": False,
        "pio": 1,
    },
}

# Each port is a normally closed pinch valve. At most one per valve is open.
VALVES = {
    "addition": {"media": 10, "cleaner": 11, "waste": 12},
    "aspiration": {"waste": 13, "cleaner": 14},
}

FAN = {
    "pwm": 15,
    "tach": 16,
    "freq": 25000,
    "pulses_per_rev": 2,
    "boot_duty": 0.0,  # the Pi turns the HEPA fan on when it wants laminar flow
    "invert": False,  # True if the PWM wire goes through an inverting transistor stage
}

WASTE = {
    "pin": 18,
    "full_when": 0,  # input level that means full (float switch to ground, pull-up)
    "clear_after_ms": 1000,  # sloshing can bounce the float, so "full" clears slowly
}

LED = "LED"

WATCHDOG_MS = 5000  # no command or ping for this long while pumping stops everything
MAX_RUN_S = 600  # longest single pump run
MAX_STEP_RATE = 20000  # steps per second the PIO program is asked for, at most
MIN_STEPS_PER_UL = 0.01
MAX_STEPS_PER_UL = 10000.0


def load_calibration(path=CALIBRATION_FILE):
    """Saved steps per uL by pump name. Missing or broken files mean no calibration."""
    try:
        with open(path) as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    result = {}
    for name, value in data.items():
        if name in PUMPS and isinstance(value, (int, float)) and not isinstance(value, bool):
            if MIN_STEPS_PER_UL <= value <= MAX_STEPS_PER_UL:
                result[name] = float(value)
    return result


def save_calibration(values, path=CALIBRATION_FILE):
    """Write to a temp file first, so a power cut can't leave half a file."""
    temp = path + ".tmp"
    with open(temp, "w") as f:
        json.dump(values, f)
    try:
        os.remove(path)
    except OSError:
        pass
    os.rename(temp, path)
