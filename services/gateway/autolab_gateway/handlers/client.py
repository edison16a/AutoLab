"""Browser viewers: preview control, capture requests and saved-image analysis."""

import time
from typing import Any

from .. import state
from ..connection import Connection
from ..limits import rate
from ..protocol import error_event, pack, uid

COMMANDS_PER_MINUTE = 60
ANALYSES_PER_MINUTE = 10
# The Pi captures one still at a time. A short queue is enough and keeps a
# viewer from tying up the camera for everyone else.
MAX_PENDING_CAPTURES = 3
MAX_PENDING_ANALYSES = 8
CAPTURE_TIMEOUT = 60
ANALYSIS_TIMEOUT = 120


async def join(conn: Connection, hello: dict) -> None:
    conn.room.clients.add(conn.peer)


async def on_binary(conn: Connection, kind: Any, header: dict, jpeg: bytes) -> None:
    """Browsers send one binary message: a saved image for the ML worker."""
    if kind != "analyze":
        raise ValueError("Unsupported binary message")
    room, peer = conn.room, conn.peer
    rate(("analysis", id(peer)), ANALYSES_PER_MINUTE)
    if not room.worker:
        peer.emit(error_event("Connect an ML worker first"))
        return
    rid = uid(header.get("image_id"))
    if state.cloud:
        # The image arrives from the browser, so ownership is checked, not assumed.
        rows = await state.cloud.call(
            "GET",
            f"/rest/v1/images?id=eq.{rid}&device_id=eq.{conn.device_id}&owner_id=eq.{conn.owner}",
        )
        if not rows:
            raise ValueError("Image not owned by this account")
    if len(room.analysis) >= MAX_PENDING_ANALYSES:
        raise ValueError("Analysis queue is full")
    room.analysis[rid] = (peer, time.monotonic() + ANALYSIS_TIMEOUT)
    room.worker.emit(pack({"type": "analyze", "image_id": rid}, jpeg))


async def on_text(conn: Connection, kind: Any, data: dict) -> None:
    """Every browser command counts toward the rate limit, even ones that fail."""
    peer = conn.peer
    rate(("command", id(peer)), COMMANDS_PER_MINUTE)
    if kind in ("start_preview", "stop_preview"):
        peer.preview = kind == "start_preview"
        conn.room.sync_preview()
        peer.emit({"type": "preview", "active": peer.preview})
    elif kind == "live_ml":
        peer.ml = bool(data.get("enabled"))
    elif kind in ("capture_photo", "camera_status", "ping"):
        await _forward_to_device(conn, kind, data)
    else:
        raise ValueError("Unsupported command")


async def _forward_to_device(conn: Connection, kind: str, data: dict) -> None:
    """Pass a command to the Pi. Captures are tracked so only answers get through."""
    room, peer = conn.room, conn.peer
    if not room.device:
        peer.emit(error_event("Device is offline"))
        return
    rid = uid(data.get("request_id"))
    if kind == "capture_photo":
        if len(room.pending) >= MAX_PENDING_CAPTURES:
            peer.emit(error_event("Camera is busy", request_id=rid))
            return
        if rid in room.pending:
            raise ValueError("Duplicate request")
        if state.cloud:
            await state.cloud.call(
                "POST",
                "/rest/v1/commands",
                {
                    "id": rid,
                    "device_id": conn.device_id,
                    "user_id": conn.owner,
                    "command": kind,
                    "status": "pending",
                },
            )
        room.pending[rid] = (peer, time.monotonic() + CAPTURE_TIMEOUT)
    room.device.emit({"type": kind, "request_id": rid})
