"""A reversible peristaltic pump: a PMST100 on its own SMC10 controller.

The Pico doesn't step the motor. The SMC10 does, at a speed set by the
voltage on its speed input, in the direction its DIR input says, while its
EN input says enabled. So a volume is a timed run at a steady speed:

    rpm   = speed_v / 5 V x rpm_at_5v    (how the SMC10 maps its input)
    flow  = rpm / 60 x ul_per_rev        (uL/s; ul_per_rev depends on the tubing)
    time  = volume / flow

Directions are named for the line, not the motor: "to_head" pushes liquid
toward the gantry head, "from_head" pulls it back toward the bottles.
`to_head_level` in config.py says which DIR level is which. The SMC10 is
enabled only while the pump runs, and DIR changes only while it is disabled.
"""

from .errors import FluidicsError

TO_HEAD = "to_head"
FROM_HEAD = "from_head"
DIRECTIONS = (TO_HEAD, FROM_HEAD)


class Pump:
    def __init__(self, name, hal, cfg, limits, calibration=None):
        """limits: max_rpm, input_max_v and pwm_freq, from config.py."""
        calibration = calibration or {}
        self.name = name
        self.hal = hal
        self.valve = cfg["valve"]
        self.max_flow = float(cfg["max_flow_ul_s"])
        self.max_rpm = float(limits["max_rpm"])
        self.input_max_v = float(limits["input_max_v"])
        self.full_scale_v = float(cfg["speed_full_scale_v"])
        self.ul_per_rev = float(calibration.get("ul_per_rev", cfg["ul_per_rev"]))
        self.rpm_at_5v = float(calibration.get("rpm_at_5v", cfg["rpm_at_5v"]))
        self.enable_level = 1 if cfg.get("enable_level", 1) else 0
        self.to_head_level = 1 if cfg.get("to_head_level", 0) else 0
        # Disabled first, then DIR at rest, then the speed at 0.
        self.enable = hal.output(cfg["enable"], 1 - self.enable_level)
        self.dir = hal.output(cfg["dir"], 0)
        self.speed = hal.pwm(cfg["speed"], limits["pwm_freq"])
        self.speed.set_duty(0.0)
        self.speed_v = 0.0
        self.run = None

    @property
    def running(self):
        return self.run is not None

    @property
    def enabled(self):
        return self.enable.value() == self.enable_level

    def speed_for(self, flow):
        """rpm, volts on the SMC10's speed input and PWM duty for a flow in uL/s.

        Refuses, never clamps: above the PMST100's 75 rpm, above the SMC10's
        5 V input, or above what the speed output can reach.
        """
        rpm = flow * 60.0 / self.ul_per_rev
        if rpm > self.max_rpm + 1e-9:
            raise FluidicsError(
                "%g uL/s needs %.1f rpm; the PMST100's max is %g rpm"
                % (flow, rpm, self.max_rpm)
            )
        volts = rpm / self.rpm_at_5v * 5.0
        if volts > self.input_max_v + 1e-9:
            raise FluidicsError(
                "%g uL/s needs %.2f V on the SMC10's speed input; it takes %g V at most"
                % (flow, volts, self.input_max_v)
            )
        if volts > self.full_scale_v + 1e-9:
            raise FluidicsError(
                "%g uL/s needs %.2f V on the SMC10's speed input; the speed output tops out at %.2f V"
                % (flow, volts, self.full_scale_v)
            )
        return rpm, volts, volts / self.full_scale_v

    def start(self, direction, seconds, flow, now):
        """Speed first, then DIR, then enable. Only ever called while stopped."""
        if self.run is not None:
            raise FluidicsError("the %s pump is running; stop it before changing direction" % self.name)
        rpm, volts, duty = self.speed_for(flow)
        level = self.to_head_level if direction == TO_HEAD else 1 - self.to_head_level
        self.speed.set_duty(duty)
        self.speed_v = volts
        self.dir.value(level)
        self.enable.value(self.enable_level)
        self.run = {
            "direction": direction,
            "flow": flow,
            "rpm": rpm,
            "started": now,
            "duration_ms": int(seconds * 1000 + 0.5),
        }
        return self.run

    def finished(self, now):
        run = self.run
        return run is not None and self.hal.ticks_diff(now, run["started"]) >= run["duration_ms"]

    def _halt(self):
        """Disable first, then the speed to 0."""
        self.enable.value(1 - self.enable_level)
        self.speed.set_duty(0.0)
        self.speed_v = 0.0

    def stop(self, now):
        """Stop at once. Returns what the run did, as far as it can be known."""
        self._halt()
        run, self.run = self.run, None
        if run is None:
            return None
        elapsed = min(run["duration_ms"], self._elapsed(run, now))
        return {
            "direction": run["direction"],
            "volume_ul": round(run["flow"] * elapsed / 1000, 1),
            "seconds": round(self.hal.ticks_diff(now, run["started"]) / 1000, 2),
        }

    def complete(self, now):
        """The run's time is up."""
        run = self.run
        self._halt()
        self.run = None
        return {
            "direction": run["direction"],
            "volume_ul": round(run["flow"] * run["duration_ms"] / 1000, 1),
            "seconds": round(self.hal.ticks_diff(now, run["started"]) / 1000, 2),
        }

    def _elapsed(self, run, now):
        return max(0, self.hal.ticks_diff(now, run["started"]))

    def info(self):
        return {
            "valve": self.valve,
            "max_flow_ul_s": self.max_flow,
            "max_rpm": self.max_rpm,
            "ul_per_rev": self.ul_per_rev,
            "rpm_at_5v": self.rpm_at_5v,
            "speed_full_scale_v": round(self.full_scale_v, 3),
        }

    def state(self, now):
        base = {"enabled": self.enabled, "speed_v": round(self.speed_v, 3)}
        if self.run is None:
            base.update({"running": False, "direction": None})
            return base
        run = self.run
        left_ms = max(0, run["duration_ms"] - self._elapsed(run, now))
        base.update({
            "running": True,
            "direction": run["direction"],
            "rpm": round(run["rpm"], 2),
            "flow_ul_s": round(run["flow"], 2),
            "remaining_s": round(left_ms / 1000, 2),
            "remaining_ul": round(run["flow"] * left_ms / 1000, 1),
        })
        return base
