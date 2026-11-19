"""The only module that touches the Pico's hardware.

Everything else takes the objects made here, so the logic runs under CPython
with a fake `machine` module in tests. `machine` is imported when a part is
made, never at import time.
"""

import time


def ticks_ms():
    if hasattr(time, "ticks_ms"):
        return time.ticks_ms()
    return int(time.monotonic() * 1000)


def ticks_diff(newer, older):
    """Milliseconds from older to newer, safe across the MicroPython tick wrap."""
    if hasattr(time, "ticks_diff"):
        return time.ticks_diff(newer, older)
    return newer - older


def sleep_ms(ms):
    if hasattr(time, "sleep_ms"):
        time.sleep_ms(ms)
    else:
        time.sleep(ms / 1000)


class Output:
    def __init__(self, pin, value=0):
        from machine import Pin

        self._pin = Pin(pin, Pin.OUT, value=value)

    def value(self, v=None):
        if v is None:
            return self._pin.value()
        self._pin.value(1 if v else 0)


class Input:
    """A digital input with the internal pull-up on."""

    def __init__(self, pin):
        from machine import Pin

        self._pin = Pin(pin, Pin.IN, Pin.PULL_UP)

    def value(self):
        return self._pin.value()


class PwmOutput:
    """A PWM output, duty from 0 to 1. Starts at 0.

    Used for each SMC10's SPEED signal: an RC filter and an op-amp turn the
    duty into a steady voltage on the controller's speed input.
    """

    def __init__(self, pin, freq):
        from machine import PWM, Pin

        self._pwm = PWM(Pin(pin))
        self._pwm.freq(freq)
        self._pwm.duty_u16(0)
        self.duty = 0.0

    def set_duty(self, duty):
        duty = min(1.0, max(0.0, duty))
        self._pwm.duty_u16(int(duty * 65535 + 0.5))
        self.duty = duty


class FanDriver:
    """PWM out, tach pulses counted in an interrupt."""

    def __init__(self, pwm_pin, tach_pin, freq):
        from machine import PWM, Pin

        self._pwm = PWM(Pin(pwm_pin))
        self._pwm.freq(freq)
        self._pwm.duty_u16(0)
        self._count = 0
        self._tach = None
        if tach_pin is not None:
            self._tach = Pin(tach_pin, Pin.IN, Pin.PULL_UP)
            self._tach.irq(trigger=Pin.IRQ_FALLING, handler=self._pulse)

    def _pulse(self, _pin):
        # Kept small and allocation free: it runs in an interrupt.
        self._count = (self._count + 1) & 0x3FFFFFFF

    def set_duty(self, duty):
        self._pwm.duty_u16(int(duty * 65535))

    def pulses(self):
        return self._count if self._tach is not None else None


class PicoHal:
    """Makes the parts. Tests swap in a fake with the same methods."""

    def output(self, pin, value=0):
        return Output(pin, value)

    def input_pullup(self, pin):
        return Input(pin)

    def pwm(self, pin, freq):
        return PwmOutput(pin, freq)

    def fan(self, pwm_pin, tach_pin, freq):
        return FanDriver(pwm_pin, tach_pin, freq)

    def ticks_ms(self):
        return ticks_ms()

    def ticks_diff(self, newer, older):
        return ticks_diff(newer, older)
