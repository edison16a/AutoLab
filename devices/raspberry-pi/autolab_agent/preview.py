"""Live preview frames, sent only while a viewer has preview on."""

from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING

from .protocol import packet

if TYPE_CHECKING:
    from .link import DeviceLink

FRAME_INTERVAL = 0.25


async def stream(link: DeviceLink) -> None:
    while True:
        if link.preview and link.camera.online:
            # Capturing blocks, so it runs in a thread and heartbeats keep flowing.
            data, w, h = await asyncio.to_thread(link.camera.capture)
            await link.send(
                packet(
                    {
                        "type": "frame",
                        "frame_id": str(time.time_ns()),
                        "width": w,
                        "height": h,
                    },
                    data,
                )
            )
        await asyncio.sleep(FRAME_INTERVAL)
