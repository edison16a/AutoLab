"""The HEPA fan filter unit: PWM duty out, speed from the tach.

Speed is worked out once a second from the tach pulses. Until the first
second has passed, or with no tach wired, rpm is None, never a guess.
"""

from .errors import FluidicsError

WINDOW_MS = 1000


class Fan:
    def __init__(self, hal, cfg):
        self.hal = hal
        self.driver = hal.fan(cfg["pwm"], cfg.get("tach"), cfg.get("freq", 25000))
        self.pulses_per_rev = cfg.get("pulses_per_rev", 2)
        self.invert = cfg.get("invert", False)
        self.duty = 0.0
        self.rpm = None
        self._mark = None
        self.set_duty(cfg.get("boot_duty", 0.0))

    def set_duty(self, duty):
        if isinstance(duty, bool) or not isinstance(duty, (int, float)):
            raise FluidicsError("duty must be a number from 0 to 1")
        if not 0 <= duty <= 1:
            raise FluidicsError("duty must be from 0 to 1")
        self.duty = float(duty)
        self.driver.set_duty(1 - self.duty if self.invert else self.duty)

    def tick(self, now):
        pulses = self.driver.pulses()
        if pulses is None:
            return
        if self._mark is None:
            self._mark = (now, pulses)
            return
        start, counted = self._mark
        elapsed = self.hal.ticks_diff(now, start)
        if elapsed >= WINDOW_MS:
            delta = (pulses - counted) & 0x3FFFFFFF
            self.rpm = int(delta * 60000 / (self.pulses_per_rev * elapsed))
            self._mark = (now, pulses)

    def state(self):
        return {"duty": round(self.duty, 3), "rpm": self.rpm}
