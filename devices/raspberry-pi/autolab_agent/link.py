"""One live connection to the gateway and the tasks that run while it is up."""

import asyncio
import json
from typing import Any

from websockets.asyncio.client import ClientConnection

from . import commands, preview
from .camera import Camera
from .protocol import heartbeat_message

HEARTBEAT_INTERVAL = 10
SEND_TIMEOUT = 10


class DeviceLink:
    """State shared by the heartbeat, preview and command tasks.

    All three write to one socket, so sends go through a lock. Each send also
    has a timeout, so a stalled network ends the session instead of hanging it.
    """

    def __init__(self, ws: ClientConnection, camera: Camera) -> None:
        self.ws = ws
        self.camera = camera
        self.preview = False  # set by the gateway when a viewer wants frames
        self._send_lock = asyncio.Lock()

    async def send(self, value: Any) -> None:
        """Bytes go out as a binary packet. Anything else is sent as JSON."""
        async with self._send_lock:
            await asyncio.wait_for(
                self.ws.send(value if isinstance(value, bytes) else json.dumps(value)),
                SEND_TIMEOUT,
            )

    async def heartbeat(self) -> None:
        while True:
            await self.send(heartbeat_message(self.camera))
            await asyncio.sleep(HEARTBEAT_INTERVAL)

    async def serve(self) -> None:
        """Run until any task stops, then stop the rest. Its error, if any, propagates."""
        tasks = [
            asyncio.create_task(job)
            for job in (self.heartbeat(), preview.stream(self), commands.handle(self))
        ]
        try:
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
