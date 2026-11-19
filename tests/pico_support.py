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
    def __init__(self, value=0):
        self.v = value
        self.history = [value]

    def value(self, v=None):
        if v is None:
            return self.v
        self.v = 1 if v else 0
        self.history.append(self.v)


class FakeSteps:
    def __init__(self):
        self.started = None
        self.finished = False
        self.stopped = 0

    def start(self, steps, rate):
        self.started = (steps, rate)
        self.finished = False

    def done(self):
        return self.finished

    def stop(self):
        self.stopped += 1


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
        self.steppers = {}
        self.fan_driver = FakeFanDriver()

    def output(self, pin, value=0):
        self.outputs[pin] = FakePin(value)
        return self.outputs[pin]

    def input_pullup(self, pin):
        self.inputs[pin] = FakePin(1)
        return self.inputs[pin]

    def step_generator(self, sm_id, pin):
        self.steppers[pin] = FakeSteps()
        return self.steppers[pin]

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

    def finish(self, pump_pin):
        """The PIO burst for the pump on this STEP pin ends."""
        self.hal.steppers[pump_pin].finished = True
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
