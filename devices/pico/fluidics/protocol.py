"""Line-based JSON over USB serial: one object per line, each way.

A request is {"id": 7, "cmd": "pump", ...}. The reply echoes the id with
"ok": true and the command's fields, or "ok": false and an "error" string.
Lines the Pico sends on its own carry "event" and no id.
"""

import json

from .errors import FluidicsError

MAX_LINE = 512
# What LineReader.feed returns for a line it had to drop for being too long.
OVERFLOW = object()


def encode(message):
    return json.dumps(message)


def reply(request_id, ok, fields=None, error=None):
    message = {"id": request_id, "ok": ok}
    if fields:
        message.update(fields)
    if error is not None:
        message["error"] = error
    return encode(message)


def handle_line(controller, line):
    """Answer one line. Returns the reply line, or None for a blank line."""
    line = line.strip()
    if not line:
        return None
    if len(line) > MAX_LINE:
        return reply(None, False, error="line too long")
    try:
        request = json.loads(line)
    except ValueError:
        return reply(None, False, error="bad JSON")
    if not isinstance(request, dict):
        return reply(None, False, error="expected a JSON object")
    request_id = request.get("id")
    try:
        fields = controller.handle(request.get("cmd"), request)
    except FluidicsError as exc:
        return reply(request_id, False, error=str(exc))
    except Exception as exc:  # a bug: stop everything rather than guess
        controller.emergency_stop("error")
        return reply(request_id, False, error="internal error: %s" % exc)
    return reply(request_id, True, fields)


class LineReader:
    """Collects characters into lines. An overlong line is dropped whole."""

    def __init__(self, limit=MAX_LINE):
        self.limit = limit
        self.chars = []
        self.overflow = False

    def feed(self, ch):
        """Returns a finished line, OVERFLOW for a dropped one, or None while waiting."""
        if ch in ("\n", "\r"):
            if self.overflow:
                self.overflow = False
                self.chars = []
                return OVERFLOW
            line = "".join(self.chars)
            self.chars = []
            return line if line else None
        if self.overflow:
            return None
        if len(self.chars) >= self.limit:
            self.overflow = True
            self.chars = []
            return None
        self.chars.append(ch)
        return None
