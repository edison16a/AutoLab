"""Autolab fluidics controller. Runs at boot on the Pico (MicroPython).

Talks line-based JSON over the USB serial port (see docs/firmware.md).
All valves start closed and both SMC10 pump controllers start disabled.
"""

import sys

import select

from fluidics.controller import Controller
from fluidics.hal import PicoHal
from fluidics.serve import run

_poll = select.poll()
_poll.register(sys.stdin, select.POLLIN)


def read_char():
    if _poll.poll(0):
        return sys.stdin.read(1)
    return None


def write(line):
    sys.stdout.write(line + "\n")


controller = Controller(PicoHal())
try:
    run(controller, read_char, write)
finally:
    # Ctrl-C from Thonny or mpremote lands here: leave everything safe.
    controller.emergency_stop("halted")
