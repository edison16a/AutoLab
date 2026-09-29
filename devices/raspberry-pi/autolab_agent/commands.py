"""Commands from the gateway, handled one at a time in arrival order."""

from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING

from .protocol import packet

if TYPE_CHECKING:
    from .link import DeviceLink


async def handle(link: DeviceLink) -> None:
    """Answer each command. A failed command is reported, and the session goes on.

    A message that is not valid JSON ends the session instead, since the
    gateway never sends one.
    """
    async for raw in link.ws:
        cmd = json.loads(raw)
        kind = cmd.get("type")
        try:
            await _run(link, kind, cmd)
        except Exception as exc:
            await link.send(
                {
                    "type": "error",
                    "request_id": cmd.get("request_id"),
                    "message": str(exc),
                }
            )


async def _run(link: DeviceLink, kind: str | None, cmd: dict) -> None:
    if kind == "start_preview":
        link.preview = True
    elif kind == "stop_preview":
        link.preview = False
    elif kind == "capture_photo":
        await _capture(link, cmd)
    elif kind in ("camera_status", "ping"):
        await link.send(
            {
                "type": "pong" if kind == "ping" else "camera_status",
                "camera_online": link.camera.online,
            }
        )
    elif kind == "error":
        # The gateway sends this right before it closes the socket.
        raise RuntimeError(cmd.get("message", "Gateway rejected connection"))


async def _capture(link: DeviceLink, cmd: dict) -> None:
    """A full-resolution still, tagged with the request id the viewer is waiting on."""
    data, w, h = await asyncio.to_thread(link.camera.capture, True)
    await link.send(
        packet(
            {
                "type": "capture",
                "request_id": cmd["request_id"],
                "width": w,
                "height": h,
            },
            data,
        )
    )
