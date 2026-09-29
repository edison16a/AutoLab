"""One connected socket and its bounded outbound queue."""

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket

from .protocol import is_frame

# Small on purpose: a peer that falls this far behind is either offline or too
# slow to be worth buffering for.
QUEUE_SIZE = 8
SEND_TIMEOUT = 5

# emit() is synchronous, so overload closes run as background tasks. Holding a
# reference here stops them from being garbage collected mid-close.
_closing: set[asyncio.Task] = set()


@dataclass(eq=False)
class Peer:
    """A device, browser or worker socket.

    Every peer has its own queue and sender task, so one slow browser never
    stalls the Pi or the other viewers. eq=False keeps identity semantics:
    peers live in sets and pending maps and are compared with `is`.
    """

    ws: WebSocket
    role: str
    owner: str | None = None
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(QUEUE_SIZE))
    preview: bool = False  # this viewer wants live frames
    ml: bool = False  # this viewer wants live detections
    live_busy: bool = False  # this worker still owes a result for a live frame
    last_seen: float = field(default_factory=time.monotonic)
    auth_token: str = ""  # kept so the sweeper can recheck the session later
    checked_at: float = field(default_factory=time.monotonic)

    def emit(self, data: Any) -> None:
        """Queue a message without ever blocking the caller."""
        if is_frame(data):
            # Viewers only care about the newest frame, so older unsent ones go.
            self._drop_queued_frames()
        if self.queue.full():
            # Live frames are disposable. A peer that cannot take a reliable
            # message is overloaded, so it gets closed instead of buffered.
            if is_frame(data):
                return
            self._close(1013)
            return
        self.queue.put_nowait(data)

    def _drop_queued_frames(self) -> None:
        reliable = []
        while not self.queue.empty():
            queued = self.queue.get_nowait()
            if not is_frame(queued):
                reliable.append(queued)
        for queued in reliable:
            self.queue.put_nowait(queued)

    def _close(self, code: int) -> None:
        task = asyncio.create_task(self.ws.close(code=code))
        _closing.add(task)
        task.add_done_callback(_closing.discard)

    async def send(self) -> None:
        """Drain the queue forever. A send stuck past the timeout ends the peer."""
        while True:
            data = await self.queue.get()
            if isinstance(data, bytes):
                await asyncio.wait_for(self.ws.send_bytes(data), SEND_TIMEOUT)
            else:
                await asyncio.wait_for(self.ws.send_json(data), SEND_TIMEOUT)
