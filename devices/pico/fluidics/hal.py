"""The only module that touches the Pico's hardware.

Everything else takes the objects made here, so the logic runs under CPython
with fake `machine` and `rp2` modules in tests. `machine` and `rp2` are
imported when a part is made, never at import time.
"""

import time

# The PIO state machines count at 1 MHz, so one instruction is 1 us.
PIO_FREQ = 1000000
# Instructions per step besides the two delay loops (see step_program).
STEP_OVERHEAD = 7

_program = None


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


def step_program():
    """A PIO program that sends a counted burst of STEP pulses, then says so.

    It pulls two words: the step count minus one, then the delay loop count
    for each half period. When the burst ends it pushes a word to the RX FIFO,
    which the CPU polls, and waits for the next pair.
    """
    global _program
    if _program is None:
        import rp2

        @rp2.asm_pio(set_init=rp2.PIO.OUT_LOW)
        def burst():
            pull(block)  # noqa: F821 - names come from rp2.asm_pio
            mov(x, osr)  # noqa: F821
            pull(block)  # noqa: F821
            label("step")  # noqa: F821
            set(pins, 1)  # noqa: F821
            mov(y, osr)  # noqa: F821
            label("high")  # noqa: F821
            jmp(y_dec, "high")  # noqa: F821
            set(pins, 0)  # noqa: F821
            mov(y, osr)  # noqa: F821
            label("low")  # noqa: F821
            jmp(y_dec, "low")  # noqa: F821
            jmp(x_dec, "step")  # noqa: F821
            push(noblock)  # noqa: F821

        _program = burst
    return _program


def half_period_loops(rate):
    """Delay loop count for a step rate in steps per second (at least 0)."""
    cycles = PIO_FREQ / rate
    return max(0, int((cycles - STEP_OVERHEAD) / 2))


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


class StepGenerator:
    """STEP pulses from one PIO state machine. start() returns at once."""

    def __init__(self, sm_id, step_pin):
        from machine import Pin

        self.sm_id = sm_id
        self.step_pin = step_pin
        Pin(step_pin, Pin.OUT, value=0)
        self._sm = None

    def start(self, steps, rate):
        import rp2
        from machine import Pin

        # A fresh init also clears both FIFOs of anything left from a stopped run.
        self._sm = rp2.StateMachine(
            self.sm_id, step_program(), freq=PIO_FREQ, set_base=Pin(self.step_pin)
        )
        self._sm.put(steps - 1)
        self._sm.put(half_period_loops(rate))
        self._sm.active(1)

    def done(self):
        if self._sm is None:
            return True
        if self._sm.rx_fifo() > 0:
            self._sm.get()
            self.stop()
            return True
        return False

    def stop(self):
        if self._sm is not None:
            self._sm.active(0)
            self._sm.exec("set(pins, 0)")
            self._sm = None


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

    def step_generator(self, sm_id, step_pin):
        return StepGenerator(sm_id, step_pin)

    def fan(self, pwm_pin, tach_pin, freq):
        return FanDriver(pwm_pin, tach_pin, freq)

    def ticks_ms(self):
        return ticks_ms()

    def ticks_diff(self, newer, older):
        return ticks_diff(newer, older)
