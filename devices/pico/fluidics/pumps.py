"""A reversible peristaltic pump: a stepper on a TMC2209 in STEP/DIR mode.

Directions are named for the line, not the motor: "to_head" pushes liquid
toward the gantry head, "from_head" pulls it back toward the bottles. Set
"invert" in config.py if a pump turns the wrong way. The driver is enabled
only while the pump runs.
"""

TO_HEAD = "to_head"
FROM_HEAD = "from_head"
DIRECTIONS = (TO_HEAD, FROM_HEAD)


class Pump:
    def __init__(self, name, hal, cfg, steps_per_ul):
        self.name = name
        self.hal = hal
        self.valve = cfg["valve"]
        self.max_flow = float(cfg["max_flow_ul_s"])
        self.steps_per_ul = float(steps_per_ul)
        self.invert = bool(cfg.get("invert", False))
        self.enable = hal.output(cfg["enable"], 1)  # EN is active low: 1 = off
        self.dir = hal.output(cfg["dir"], 0)
        self.steps = hal.step_generator(cfg["pio"], cfg["step"])
        self.run = None

    @property
    def running(self):
        return self.run is not None

    def start(self, direction, steps, flow, now):
        rate = flow * self.steps_per_ul
        level = 1 if direction == TO_HEAD else 0
        if self.invert:
            level = 1 - level
        self.dir.value(level)
        self.enable.value(0)
        self.steps.start(steps, rate)
        self.run = {
            "direction": direction,
            "steps": steps,
            "rate": rate,
            "flow": flow,
            "started": now,
            "duration_ms": int(steps * 1000 / rate),
        }

    def finished(self):
        return self.run is not None and self.steps.done()

    def stop(self, now):
        """Stop at once. Returns what the run did, as far as it can be known."""
        self.steps.stop()
        self.enable.value(1)
        run, self.run = self.run, None
        if run is None:
            return None
        done = min(run["steps"], self._steps_so_far(run, now))
        return {
            "direction": run["direction"],
            "volume_ul": round(done / self.steps_per_ul, 1),
            "seconds": round(self.hal.ticks_diff(now, run["started"]) / 1000, 2),
        }

    def complete(self, now):
        """The burst ended by itself, so every step went out."""
        run = self.run
        self.steps.stop()
        self.enable.value(1)
        self.run = None
        return {
            "direction": run["direction"],
            "volume_ul": round(run["steps"] / self.steps_per_ul, 1),
            "seconds": round(self.hal.ticks_diff(now, run["started"]) / 1000, 2),
        }

    def _steps_so_far(self, run, now):
        elapsed = max(0, self.hal.ticks_diff(now, run["started"]))
        return int(elapsed * run["rate"] / 1000)

    def state(self, now):
        if self.run is None:
            return {"running": False, "direction": None}
        run = self.run
        left_steps = max(0, run["steps"] - self._steps_so_far(run, now))
        return {
            "running": True,
            "direction": run["direction"],
            "flow_ul_s": round(run["flow"], 2),
            "remaining_s": round(left_steps / run["rate"], 2),
            "remaining_ul": round(left_steps / self.steps_per_ul, 1),
        }
