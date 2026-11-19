"""A fake HAL for the Pico firmware, shared by the firmware and Pi client tests.

The firmware lives in devices/pico. Its folder is appended to sys.path, not
prepended, so the gateway's top-level main.py still wins `import main`.
"""

import json
import sys

from conftest import ROOT

if str(ROOT / "devices/pico") not in sys.path:
    sys.path.append(str(ROOT / "devices/pico"))


class FakePin:
    def __init__(self, value=0, pin=None, log=None):
        self.v = value
        self.history = [value]
        self.pin = pin
        self.log = log if log is not None else []

    def value(self, v=None):
        if v is None:
            return self.v
        self.v = 1 if v else 0
        self.history.append(self.v)
        self.log.append((self.pin, self.v))


class FakePwm:
    """A PWM output. Every duty it is given goes into the shared write log too."""

    def __init__(self, pin, freq, log):
        self.pin, self.freq, self.log = pin, freq, log
        self.duty = 0.0
        self.history = []

    def set_duty(self, duty):
        self.duty = duty
        self.history.append(duty)
        self.log.append((self.pin, ("duty", duty)))


class FakeFanDriver:
    def __init__(self):
        self.duty = None
        self.count = 0

    def set_duty(self, duty):
        self.duty = duty

    def pulses(self):
        return self.count


class FakeHal:
    def __init__(self):
        self.now = 1000
        self.outputs = {}
        self.inputs = {}
        self.pwms = {}
        self.log = []  # (pin, level) and (pin, ("duty", d)) in the order they were written
        self.fan_driver = FakeFanDriver()

    def output(self, pin, value=0):
        self.outputs[pin] = FakePin(value, pin, self.log)
        return self.outputs[pin]

    def input_pullup(self, pin):
        self.inputs[pin] = FakePin(1)
        return self.inputs[pin]

    def pwm(self, pin, freq):
        self.pwms[pin] = FakePwm(pin, freq, self.log)
        return self.pwms[pin]

    def fan(self, pwm, tach, freq):
        return self.fan_driver

    def ticks_ms(self):
        return self.now

    def ticks_diff(self, newer, older):
        return newer - older


class PicoOnSerial:
    """The Pi's end of a serial pair. The other end runs the real firmware controller."""

    def __init__(self, tmp_path, answer=True):
        import queue

        from fluidics.controller import Controller

        self.hal = FakeHal()
        self.controller = Controller(self.hal, calibration_path=str(tmp_path / "calibration.json"))
        self.controller.pop_events()
        self.answer = answer
        self.lines = queue.Queue()
        self.sent = []
        self.closed = False

    def write(self, data):
        from fluidics import protocol

        for line in data.decode().splitlines():
            self.sent.append(json.loads(line))
            if self.answer:
                self.lines.put(protocol.handle_line(self.controller, line))
                self._events()

    def readline(self):
        import queue

        try:
            item = self.lines.get(timeout=0.02)
        except queue.Empty:
            return b""
        if isinstance(item, Exception):
            raise item
        return (item + "\r\n").encode()

    def push(self, text):
        self.lines.put(text)

    def finish(self, pump):
        """Let the clock run to the end of that pump's timed run."""
        run = self.controller.pumps[pump].run
        self.hal.now = run["started"] + run["duration_ms"]
        self.tick()

    def tick(self):
        self.controller.tick()
        self._events()

    def _events(self):
        for event in self.controller.pop_events():
            self.lines.put(json.dumps(event))

    def commands(self):
        return [m["cmd"] for m in self.sent]

    def close(self):
        self.closed = True
