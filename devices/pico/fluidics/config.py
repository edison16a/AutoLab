"""Pins, limits and the saved pump calibration.

Each pump is a Simply Pumps PMST100 (a NEMA 17 stepper peristaltic pump)
driven by its own Simply Pumps SMC10 stepper controller. The Pico doesn't
step the motor. It gives each SMC10 three signals: EN and DIR through an NPN
transistor or ULN2003 channel that pulls the SMC10 input to GND, and SPEED as
PWM into an RC filter and an op-amp, which makes 0 to 5 V on the SMC10's
speed input where the potentiometer's wiper would go. See README.md.

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
VERSION = "0.2.0"
CALIBRATION_FILE = "calibration.json"

# PMST100: "75 maximum recommended RPM". The firmware never commands more.
MAX_RPM = 75.0
# PMST100 with 1/16" ID tubing: 0.065 mL per revolution, so 75 rpm is 81.25 uL/s.
# Calibrate every pump by weighing (see README).
DEFAULT_UL_PER_REV = 65.0
# The SMC10's speed input is 0 to 5 V. rpm_at_5v is the speed it runs at with
# 5 V there, with the speed in between in proportion. Placeholder: set it on
# the SMC10 (or have Simply Pumps program it) and calibrate.
SMC10_INPUT_MAX_V = 5.0
DEFAULT_RPM_AT_5V = 75.0

# The SPEED pin: PWM at 20 kHz into an RC low-pass filter, then a rail-to-rail
# op-amp with a gain of 1.5 powered from the SMC10's 5 V. Full duty gives
# 3.3 V x 1.5 = 4.95 V. Without the op-amp (the filter straight into the
# SMC10), set SPEED_OPAMP_GAIN = 1.0: the speed input then gets 0 to 3.3 V and
# the pump tops out at 3.3 / 5 of rpm_at_5v.
PICO_V = 3.3
SPEED_OPAMP_GAIN = 1.5
SPEED_FULL_SCALE_V = PICO_V * SPEED_OPAMP_GAIN
SPEED_PWM_FREQ = 20000

PUMPS = {
    "addition": {
        "enable": 2,  # to the SMC10's Enable/Disable header pin, via a transistor
        "dir": 3,  # to the SMC10's Forward/Reverse header pin, via a transistor
        "speed": 4,  # PWM, PWM slice 2
        # Pico level that enables the SMC10. 1 closes the EN input to GND.
        # Verify on the board: if the motor runs with the pin low, set 0.
        "enable_level": 1,
        # Pico level on DIR for to_head. Flip it if to_head runs the wrong way.
        "to_head_level": 0,
        "valve": "addition",
        "max_flow_ul_s": 30.0,  # gentle on neurons; never raise without the biologists
        "ul_per_rev": DEFAULT_UL_PER_REV,  # calibrate
        "rpm_at_5v": DEFAULT_RPM_AT_5V,  # set on the SMC10 and calibrate
        "speed_full_scale_v": SPEED_FULL_SCALE_V,
    },
    "aspiration": {
        "enable": 6,
        "dir": 7,
        "speed": 8,  # PWM slice 4, so it never shares a slice with GP4
        "enable_level": 1,
        "to_head_level": 0,
        "valve": "aspiration",
        "max_flow_ul_s": 50.0,
        "ul_per_rev": DEFAULT_UL_PER_REV,  # calibrate
        "rpm_at_5v": DEFAULT_RPM_AT_5V,  # set on the SMC10 and calibrate
        "speed_full_scale_v": SPEED_FULL_SCALE_V,
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
MIN_RUN_S = 0.1  # shorter runs are mostly the speed filter and the motor ramping up
MIN_UL_PER_REV = 1.0
MAX_UL_PER_REV = 1000.0
MIN_RPM_AT_5V = 1.0
MAX_RPM_AT_5V = 1000.0

CALIBRATION_RANGES = {
    "ul_per_rev": (MIN_UL_PER_REV, MAX_UL_PER_REV),
    "rpm_at_5v": (MIN_RPM_AT_5V, MAX_RPM_AT_5V),
}


def _in_range(key, value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    low, high = CALIBRATION_RANGES[key]
    return low <= value <= high


def load_calibration(path=CALIBRATION_FILE):
    """Saved {"ul_per_rev": ..., "rpm_at_5v": ...} by pump name.

    Missing or broken files mean no calibration. So does a file from the old
    STEP/DIR firmware, which saved a bare steps-per-uL number per pump.
    """
    try:
        with open(path) as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    result = {}
    for name, entry in data.items():
        if name not in PUMPS or not isinstance(entry, dict):
            continue
        values = {}
        for key in CALIBRATION_RANGES:
            if key in entry and _in_range(key, entry[key]):
                values[key] = float(entry[key])
        if values:
            result[name] = values
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
