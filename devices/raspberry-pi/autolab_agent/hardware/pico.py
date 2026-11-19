"""Client for the Pico fluidics controller over USB serial (docs/firmware.md).

One JSON object per line each way. Requests carry an id and wait for the reply
with that id. Lines the Pico sends on its own are events, kept in a short
buffer and passed to listeners. While a pump runs a background thread pings
every second, because the Pico stops everything after 5 s without a word.
"""

import itertools
import json
import logging
import threading
from collections import deque
from collections.abc import Callable
from typing import Any

log = logging.getLogger("agent")

PICO_VID = 0x2E8A  # Raspberry Pi; the MicroPython firmware uses this vendor id
BAUD = 115200  # ignored by USB CDC, but pyserial wants one
PING_EVERY = 1.0
EVENT_BUFFER = 64
# A run may take this much longer than the Pico said before the client gives up on it.
RUN_MARGIN_S = 5.0


class PicoError(RuntimeError):
    """The Pico refused a command, or a run ended early. The message says why."""


class PicoTimeout(PicoError):
    """No reply in time."""


def find_port() -> str | None:
    """The first serial port whose USB vendor is Raspberry Pi, if any."""
    from serial.tools import list_ports

    for info in sorted(list_ports.comports(), key=lambda p: p.device):
        if info.vid == PICO_VID:
            return info.device
    return None


def open_serial(port: str) -> Any:
    """Exclusive, so a second program can't talk over the agent on the same port."""
    import serial

    return serial.Serial(port, BAUD, timeout=0.1, write_timeout=2, exclusive=True)


class PicoClient:
    def __init__(self, port: str = "auto", timeout: float = 2.0, connection: Any = None) -> None:
        self.port = port
        self.timeout = timeout
        self.hello: dict | None = None
        self.error: str | None = None
        self._serial = connection
        self._ids = itertools.count(1)
        self._write_lock = threading.Lock()
        self._pending: dict[int, dict] = {}
        self._events: deque[tuple[int, dict]] = deque(maxlen=EVENT_BUFFER)
        self._seq = 0
        self._cond = threading.Condition()
        self._listeners: list[Callable[[dict], None]] = []
        self._running: set[str] = set()
        self._closed = threading.Event()
        self._threads: list[threading.Thread] = []

    # Connection

    def open(self) -> "PicoClient":
        if self._serial is None:
            port = find_port() if self.port in ("", "auto") else self.port
            if not port:
                raise PicoError("No Pico found on USB")
            self._serial = open_serial(port)
            self.port = port
        for job in (self._read_lines, self._keepalive):
            thread = threading.Thread(target=job, daemon=True, name=f"pico-{job.__name__}")
            thread.start()
            self._threads.append(thread)
        try:
            self.hello = self.request("hello")
        except PicoError:
            self.close()
            raise
        return self

    def close(self) -> None:
        self._closed.set()
        for thread in self._threads:
            thread.join(timeout=1)
        if self._serial is not None:
            try:
                self._serial.close()
            except Exception:
                pass

    def __enter__(self) -> "PicoClient":
        return self.open()

    def __exit__(self, *_exc: object) -> None:
        self.close()

    @property
    def connected(self) -> bool:
        return self._serial is not None and self.error is None and not self._closed.is_set()

    def on_event(self, listener: Callable[[dict], None]) -> None:
        self._listeners.append(listener)

    # Requests

    def request(self, cmd: str, timeout: float | None = None, **fields: Any) -> dict:
        """Send one command and return its reply. Raises PicoError when refused."""
        if self.error:
            raise PicoError(self.error)
        request_id = next(self._ids)
        slot: dict[str, Any] = {"done": threading.Event(), "reply": None}
        self._pending[request_id] = slot
        line = json.dumps({"id": request_id, "cmd": cmd, **fields}) + "\n"
        try:
            with self._write_lock:
                self._serial.write(line.encode())
            if not slot["done"].wait(self.timeout if timeout is None else timeout):
                raise PicoTimeout(f"The Pico did not answer {cmd!r}")
        finally:
            self._pending.pop(request_id, None)
        reply = slot["reply"]
        if reply is None:
            raise PicoError(self.error or "The Pico disconnected")
        if not reply.get("ok"):
            raise PicoError(str(reply.get("error") or "The Pico refused the command"))
        return reply

    def ping(self) -> dict:
        return self.request("ping")

    def status(self) -> dict:
        return self.request("status")

    def valve(self, valve: str, port: str) -> dict:
        return self.request("valve", valve=valve, port=port)

    def fan(self, duty: float) -> dict:
        return self.request("fan", duty=duty)

    def stop(self, pump: str | None = None) -> dict:
        reply = self.request("stop", **({"pump": pump} if pump else {}))
        self._running.difference_update(reply.get("stopped", []))
        return reply

    def calibrate(self, pump: str, **fields: float) -> dict:
        return self.request("calibrate", pump=pump, **fields)

    def pump(
        self, pump: str, direction: str, *, volume_ul: float | None = None,
        seconds: float | None = None, flow_ul_s: float | None = None,
    ) -> dict:
        """Start a run and return at once. The Pico sends pump_done when it ends."""
        fields: dict[str, Any] = {"pump": pump, "direction": direction}
        for key, value in (("volume_ul", volume_ul), ("seconds", seconds), ("flow_ul_s", flow_ul_s)):
            if value is not None:
                fields[key] = value
        # Marked running first: a short run's pump_done can beat the reply here.
        # A pump that was already running stays marked, so its pings go on.
        was_running = pump in self._running
        self._running.add(pump)
        try:
            return self.request("pump", **fields)
        except PicoError:
            if not was_running:
                self._running.discard(pump)
            raise

    def run(
        self, pump: str, direction: str, *, volume_ul: float | None = None,
        seconds: float | None = None, flow_ul_s: float | None = None,
        on_start: Callable[[dict], None] | None = None,
    ) -> dict:
        """Start a run and wait for it to finish. Raises if it stops early.

        on_start gets the Pico's reply to the start (rpm, speed_v, seconds).
        """
        with self._cond:
            mark = self._seq
        started = self.pump(pump, direction, volume_ul=volume_ul, seconds=seconds, flow_ul_s=flow_ul_s)
        if on_start is not None:
            on_start(started)

        def ends_run(event: dict) -> bool:
            return event.get("pump") == pump or event.get("event") in ("watchdog", "ready")

        try:
            event = self.wait_event(ends_run, started["seconds"] + RUN_MARGIN_S, after=mark)
        except PicoTimeout:
            self.stop(pump)
            raise PicoTimeout(f"The {pump} pump did not report the end of its run") from None
        if event.get("event") != "pump_done":
            reason = event.get("reason") or event.get("event")
            raise PicoError(f"The {pump} pump stopped early ({reason})")
        return event

    def wait_event(self, match: Callable[[dict], bool], timeout: float, after: int | None = None) -> dict:
        """The first event after sequence number `after` that matches."""
        with self._cond:
            start = self._seq if after is None else after
            found: list[dict] = []

            def ready() -> bool:
                found[:] = [e for seq, e in self._events if seq > start and match(e)][:1]
                return bool(found) or self.error is not None

            if not self._cond.wait_for(ready, timeout):
                raise PicoTimeout("No event from the Pico in time")
            if not found:
                raise PicoError(self.error or "The Pico disconnected")
            return found[0]

    # Background threads

    def _read_lines(self) -> None:
        while not self._closed.is_set():
            try:
                raw = self._serial.readline()
            except Exception as exc:
                self._fail(f"Lost the Pico ({type(exc).__name__})")
                return
            if not raw:
                continue
            text = raw.decode(errors="replace").strip()
            try:
                message = json.loads(text)
            except ValueError:
                # The MicroPython banner or a traceback. Worth seeing in the log.
                log.debug("Pico: %s", text)
                continue
            if not isinstance(message, dict):
                continue
            if "event" in message:
                self._on_event(message)
            elif message.get("id") in self._pending:
                slot = self._pending[message["id"]]
                slot["reply"] = message
                slot["done"].set()

    def _on_event(self, event: dict) -> None:
        kind = event.get("event")
        if kind in ("pump_done", "pump_stopped"):
            self._running.discard(event.get("pump"))
        elif kind in ("watchdog", "ready"):
            self._running.clear()
        if kind in ("pump_stopped", "watchdog", "waste_full"):
            log.warning("Pico: %s", event)
        with self._cond:
            self._seq += 1
            self._events.append((self._seq, event))
            self._cond.notify_all()
        for listener in self._listeners:
            try:
                listener(event)
            except Exception:
                log.exception("Pico event listener failed")

    def _fail(self, reason: str) -> None:
        self.error = reason
        for slot in list(self._pending.values()):
            slot["done"].set()
        with self._cond:
            self._cond.notify_all()

    def _keepalive(self) -> None:
        while not self._closed.wait(PING_EVERY):
            if self._running and self.error is None:
                try:
                    self.ping()
                except PicoError as exc:
                    log.warning("Pico keepalive failed (%s)", exc)
