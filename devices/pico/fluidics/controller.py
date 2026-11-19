"""The fluidics controller: commands in, safety checks, events out.

Rules it always keeps:
- A pump runs only while its valve has a port open, and the valve can't
  change under a running pump.
- "from_head" flows into the bottle the valve selects, so it is allowed only
  into waste. "to_head" draws from that bottle, so never from waste.
- Nothing flows to waste while the waste bottle is full. A run that is going
  when it fills is stopped.
- With no command or ping for WATCHDOG_MS while a pump runs, every pump
  stops and every valve closes.
- Flow above a pump's max is refused, not quietly lowered, and so is any
  speed above the PMST100's 75 rpm.
- A pump's direction changes only while it is stopped.
"""

from . import config as default_config
from .errors import FluidicsError
from .fan import Fan
from .pumps import DIRECTIONS, FROM_HEAD, TO_HEAD, Pump
from .valves import Valve


def _number(request, key):
    value = request.get(key)
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise FluidicsError("%s must be a number" % key)
    if value != value or value in (float("inf"), float("-inf")):
        raise FluidicsError("%s must be a finite number" % key)
    return float(value)


class Controller:
    def __init__(self, hal, cfg=None, calibration_path=None):
        cfg = cfg or default_config
        self.cfg = cfg
        self.hal = hal
        self.calibration_path = calibration_path or cfg.CALIBRATION_FILE
        self.calibration = cfg.load_calibration(self.calibration_path)
        self.events = []
        self.started = hal.ticks_ms()
        self.last_command = self.started

        # Valves first, so every pinch valve is driven closed before anything else.
        self.valves = {}
        for name, ports in cfg.VALVES.items():
            self.valves[name] = Valve(name, hal, ports)
        self.pumps = {}
        limits = {"max_rpm": cfg.MAX_RPM, "input_max_v": cfg.SMC10_INPUT_MAX_V, "pwm_freq": cfg.SPEED_PWM_FREQ}
        for name, pump_cfg in cfg.PUMPS.items():
            pins = (pump_cfg.get("enable"), pump_cfg.get("dir"), pump_cfg.get("speed"))
            if None in pins or pump_cfg.get("valve") not in self.valves:
                continue
            self.pumps[name] = Pump(name, hal, pump_cfg, limits, self.calibration.get(name))
        self.fan = Fan(hal, cfg.FAN) if cfg.FAN and cfg.FAN.get("pwm") is not None else None
        waste = cfg.WASTE or {}
        self.waste_pin = hal.input_pullup(waste["pin"]) if waste.get("pin") is not None else None
        self.waste_full_level = waste.get("full_when", 0)
        self.waste_clear_ms = waste.get("clear_after_ms", 1000)
        self.waste_full = False
        self._waste_clear_since = None
        self.led = hal.output(cfg.LED, 0) if cfg.LED is not None else None
        self.events.append({"event": "ready", "firmware": cfg.FIRMWARE, "version": cfg.VERSION})
        self._read_waste(self.started)

    # Commands

    def handle(self, cmd, request):
        """Run one command and return the reply fields. Raises FluidicsError to refuse."""
        now = self.hal.ticks_ms()
        self.last_command = now
        handler = {
            "hello": self.hello,
            "status": self.status,
            "ping": self.ping,
            "pump": self.pump,
            "stop": self.stop,
            "valve": self.valve,
            "fan": self.set_fan,
            "calibrate": self.calibrate,
        }.get(cmd)
        if handler is None:
            raise FluidicsError("unknown command %r" % (cmd,))
        return handler(request, now)

    def hello(self, _request, _now):
        pumps = {}
        for name, pump in self.pumps.items():
            pumps[name] = pump.info()
            pumps[name]["controller"] = "SMC10"
            pumps[name]["calibrated"] = self._calibrated(name)
        valves = {}
        for name, valve in self.valves.items():
            valves[name] = valve.names()
        return {
            "firmware": self.cfg.FIRMWARE,
            "version": self.cfg.VERSION,
            "pumps": pumps,
            "valves": valves,
            "fan": self.fan is not None,
            "waste_sensor": self.waste_pin is not None,
            "watchdog_s": self.cfg.WATCHDOG_MS / 1000,
        }

    def status(self, _request, now):
        self._read_waste(now)
        pumps = {}
        for name, pump in self.pumps.items():
            pumps[name] = pump.state(now)
        valves = {}
        for name, valve in self.valves.items():
            valves[name] = valve.state()
        return {
            "pumps": pumps,
            "valves": valves,
            "fan": self.fan.state() if self.fan else None,
            "waste_full": self.waste_full if self.waste_pin is not None else None,
            "uptime_s": self.hal.ticks_diff(now, self.started) // 1000,
        }

    def ping(self, _request, _now):
        return {"pong": True}

    def pump(self, request, now):
        name = request.get("pump")
        pump = self.pumps.get(name)
        if pump is None:
            raise FluidicsError("unknown pump %r" % (name,))
        direction = request.get("direction")
        if direction not in DIRECTIONS:
            raise FluidicsError("direction must be to_head or from_head")
        if pump.running:
            raise FluidicsError("the %s pump is already running; stop it first" % name)
        volume = _number(request, "volume_ul")
        seconds = _number(request, "seconds")
        if (volume is None) == (seconds is None):
            raise FluidicsError("give exactly one of volume_ul or seconds")
        if (volume is not None and volume <= 0) or (seconds is not None and seconds <= 0):
            raise FluidicsError("volume_ul and seconds must be above 0")
        flow = _number(request, "flow_ul_s")
        if flow is None:
            flow = pump.max_flow
        if flow <= 0:
            raise FluidicsError("flow_ul_s must be above 0")
        if flow > pump.max_flow:
            raise FluidicsError(
                "flow_ul_s %g is above the %s pump's max of %g" % (flow, name, pump.max_flow)
            )

        port = self.valves[pump.valve].port
        if port is None:
            raise FluidicsError("open the %s valve first; the line is shut" % pump.valve)
        if direction == FROM_HEAD and port != "waste":
            raise FluidicsError(
                "from_head would push into the %s bottle; set the %s valve to waste"
                % (port, pump.valve)
            )
        if direction == TO_HEAD and port == "waste":
            raise FluidicsError("to_head would draw from the waste bottle")
        self._read_waste(now)
        if direction == FROM_HEAD and self.waste_full:
            raise FluidicsError("the waste bottle is full; empty it first")

        rpm, volts, _duty = pump.speed_for(flow)
        if seconds is None:
            seconds = volume / flow
        if seconds > self.cfg.MAX_RUN_S:
            raise FluidicsError("a single run is limited to %d s" % self.cfg.MAX_RUN_S)
        if seconds < self.cfg.MIN_RUN_S:
            raise FluidicsError("that run is shorter than %g s" % self.cfg.MIN_RUN_S)

        run = pump.start(direction, seconds, flow, now)
        self._update_led()
        return {
            "pump": name,
            "direction": direction,
            "rpm": round(rpm, 2),
            "speed_v": round(volts, 3),
            "flow_ul_s": flow,
            "volume_ul": round(flow * run["duration_ms"] / 1000, 1),
            "seconds": round(run["duration_ms"] / 1000, 2),
        }

    def stop(self, request, now):
        name = request.get("pump")
        if name is None:
            names = list(self.pumps)
        elif name in self.pumps:
            names = [name]
        else:
            raise FluidicsError("unknown pump %r" % (name,))
        stopped = []
        for n in names:
            if self._stop_pump(n, now, "stop"):
                stopped.append(n)
        return {"stopped": stopped}

    def valve(self, request, now):
        name = request.get("valve")
        valve = self.valves.get(name)
        if valve is None:
            raise FluidicsError("unknown valve %r" % (name,))
        port = request.get("port")
        if not isinstance(port, str):
            raise FluidicsError("port must be a port name or \"closed\"")
        if port == valve.state():
            return {"valve": name, "port": port}
        for pump in self.pumps.values():
            if pump.valve == name and pump.running:
                raise FluidicsError("the %s pump is running; stop it before moving its valve" % pump.name)
        valve.set(port)
        return {"valve": name, "port": valve.state()}

    def set_fan(self, request, _now):
        if self.fan is None:
            raise FluidicsError("no fan is configured")
        self.fan.set_duty(request.get("duty"))
        return self.fan.state()

    def calibrate(self, request, _now):
        """Set ul_per_rev directly or from a weighed run, and optionally rpm_at_5v.

        From a run: commanded_ul is what the Pico was asked for, measured_ul
        what came out. Delivering less than asked means fewer uL per turn.
        """
        name = request.get("pump")
        pump = self.pumps.get(name)
        if pump is None:
            raise FluidicsError("unknown pump %r" % (name,))
        if pump.running:
            raise FluidicsError("stop the %s pump before calibrating it" % name)
        ul_per_rev = _number(request, "ul_per_rev")
        rpm_at_5v = _number(request, "rpm_at_5v")
        commanded = _number(request, "commanded_ul")
        measured = _number(request, "measured_ul")
        if commanded is not None or measured is not None:
            if ul_per_rev is not None:
                raise FluidicsError("give ul_per_rev, or commanded_ul and measured_ul, not both")
            if commanded is None or measured is None or commanded <= 0 or measured <= 0:
                raise FluidicsError("give both commanded_ul and measured_ul above 0")
            ul_per_rev = pump.ul_per_rev * measured / commanded
        if ul_per_rev is None and rpm_at_5v is None:
            raise FluidicsError("give ul_per_rev, or commanded_ul and measured_ul, and/or rpm_at_5v")
        entry = dict(self.calibration.get(name) or {})
        for key, value in (("ul_per_rev", ul_per_rev), ("rpm_at_5v", rpm_at_5v)):
            if value is None:
                continue
            low, high = self.cfg.CALIBRATION_RANGES[key]
            if not low <= value <= high:
                raise FluidicsError("%s %g is out of range (%g to %g)" % (key, value, low, high))
            entry[key] = value
        saved = dict(self.calibration)
        saved[name] = entry
        try:
            self.cfg.save_calibration(saved, self.calibration_path)
        except OSError as exc:
            raise FluidicsError("could not save the calibration (%s)" % exc) from None
        self.calibration = saved
        pump.ul_per_rev = entry.get("ul_per_rev", pump.ul_per_rev)
        pump.rpm_at_5v = entry.get("rpm_at_5v", pump.rpm_at_5v)
        return {
            "pump": name,
            "ul_per_rev": pump.ul_per_rev,
            "rpm_at_5v": pump.rpm_at_5v,
            "calibrated": self._calibrated(name),
        }

    # Safety and housekeeping, run every few milliseconds

    def tick(self):
        now = self.hal.ticks_ms()
        for name, pump in self.pumps.items():
            if pump.finished(now):
                summary = pump.complete(now)
                event = {"event": "pump_done", "pump": name}
                event.update(summary)
                self.events.append(event)
        self._read_waste(now)
        if self._any_running() and self.hal.ticks_diff(now, self.last_command) > self.cfg.WATCHDOG_MS:
            for name in list(self.pumps):
                self._stop_pump(name, now, "watchdog")
            for valve in self.valves.values():
                valve.close()
            self.events.append({"event": "watchdog", "detail": "no command from the host; pumps stopped, valves closed"})
        if self.fan:
            self.fan.tick(now)
        self._update_led()

    def emergency_stop(self, reason):
        """Stop every pump and close every valve. Used when something unexpected breaks."""
        now = self.hal.ticks_ms()
        for name in list(self.pumps):
            self._stop_pump(name, now, reason)
        for valve in self.valves.values():
            valve.close()
        self._update_led()

    def pop_events(self):
        events, self.events = self.events, []
        return events

    def _calibrated(self, name):
        """ul_per_rev measured by weighing. rpm_at_5v alone isn't a flow calibration."""
        return "ul_per_rev" in (self.calibration.get(name) or {})

    def _any_running(self):
        for pump in self.pumps.values():
            if pump.running:
                return True
        return False

    def _stop_pump(self, name, now, reason):
        summary = self.pumps[name].stop(now)
        if summary is None:
            return False
        event = {"event": "pump_stopped", "pump": name, "reason": reason}
        event.update(summary)
        self.events.append(event)
        return True

    def _read_waste(self, now):
        if self.waste_pin is None:
            return
        if self.waste_pin.value() == self.waste_full_level:
            self._waste_clear_since = None
            if not self.waste_full:
                self.waste_full = True
                self.events.append({"event": "waste_full"})
            for name, pump in self.pumps.items():
                if pump.running and pump.run["direction"] == FROM_HEAD:
                    self._stop_pump(name, now, "waste_full")
        elif self.waste_full:
            if self._waste_clear_since is None:
                self._waste_clear_since = now
            elif self.hal.ticks_diff(now, self._waste_clear_since) >= self.waste_clear_ms:
                self.waste_full = False
                self._waste_clear_since = None
                self.events.append({"event": "waste_ok"})

    def _update_led(self):
        if self.led is not None:
            self.led.value(1 if self._any_running() else 0)
