"""The Pi's side of a room: joining, leaving, heartbeats and errors."""

from contextlib import suppress
from typing import Any

from .. import state
from ..connection import Connection
from ..models import ComponentReport
from ..protocol import error_event, now
from .device_images import forward_frame, store_capture

MAX_COMPONENTS = 32


def device_metadata(data: dict) -> dict[str, str]:
    """Only what the agent actually reported, trimmed so a Pi cannot bloat status."""
    return {
        key: str(data[key])[:80]
        for key in ("agent_version", "network")
        if data.get(key)
    }


async def join(conn: Connection, hello: dict) -> None:
    room = conn.room
    room.device = conn.peer
    room.camera = bool(hello.get("camera_online"))
    room.simulated = bool(hello.get("simulated"))
    room.heartbeat_at = now()
    room.metadata = device_metadata(hello)
    # A Pi that reconnects mid-preview has to resume streaming for waiting viewers.
    room.sync_preview()
    if state.cloud:
        await state.cloud.call(
            "PATCH",
            f"/rest/v1/devices?id=eq.{conn.device_id}",
            {
                "status": "online",
                "camera_online": room.camera,
                "last_seen_at": now(),
            },
        )


async def leave(conn: Connection) -> None:
    """Captures in flight can never finish now, so their viewers hear it right away."""
    room = conn.room
    room.device = None
    room.camera = False
    for rid, (target, _) in list(room.pending.items()):
        target.emit(error_event("Device disconnected", request_id=rid))
    room.pending.clear()
    if state.cloud:
        # Best effort: the socket is already gone and the sweep has nothing to retry.
        with suppress(Exception):
            await state.cloud.call(
                "PATCH",
                f"/rest/v1/devices?id=eq.{conn.device_id}",
                {"status": "offline", "camera_online": False},
            )


async def on_binary(conn: Connection, kind: Any, header: dict, jpeg: bytes) -> None:
    if kind == "frame":
        forward_frame(conn, header, jpeg)
    elif kind == "capture":
        await store_capture(conn, header, jpeg)
    else:
        raise ValueError("Unsupported binary message")


async def on_text(conn: Connection, kind: Any, data: dict) -> None:
    """Unknown kinds from the Pi are ignored, unlike from browsers, which get closed."""
    if kind in ("heartbeat", "camera_status"):
        await _heartbeat(conn, data)
    elif kind == "error":
        _relay_error(conn, data)
    elif kind == "pong":
        conn.room.broadcast({"type": "pong"})


async def _heartbeat(conn: Connection, data: dict) -> None:
    room = conn.room
    room.camera = bool(data.get("camera_online"))
    room.heartbeat_at = now()
    room.metadata.update(device_metadata(data))
    # Components are optional so agents without sensor support keep the last list.
    if "components" in data:
        room.components = [
            ComponentReport.model_validate(c).model_dump()
            for c in data["components"][:MAX_COMPONENTS]
        ]
    room.broadcast(room.status())
    if state.cloud:
        await state.cloud.call(
            "PATCH",
            f"/rest/v1/devices?id=eq.{conn.device_id}",
            {"last_seen_at": now(), "camera_online": room.camera},
        )


def _relay_error(conn: Connection, data: dict) -> None:
    """Errors tied to a capture go to the viewer who asked. The rest go to everyone."""
    rid = str(data.get("request_id", ""))
    message = str(data.get("message", "Device error"))[:300]
    entry = conn.room.pending.pop(rid, None)
    if entry:
        entry[0].emit(error_event(message, request_id=rid))
    else:
        conn.room.broadcast(error_event(message))
