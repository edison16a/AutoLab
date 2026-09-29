"""Images from the Pi: live preview frames and requested still captures."""

import io
import logging
import time

from PIL import Image

from .. import state
from ..connection import Connection
from ..protocol import error_event, now, pack, uid

log = logging.getLogger("autolab")

# Live detection is best effort. One frame in flight at most, and no more
# often than this, keeps a slow worker from falling behind the stream.
LIVE_ML_INTERVAL = 0.8


def forward_frame(conn: Connection, header: dict, jpeg: bytes) -> None:
    """Fan a preview frame out to viewers, and sometimes to the worker.

    The header is rebuilt from known fields so a Pi cannot smuggle extra data
    to browsers.
    """
    room = conn.room
    header = {
        "type": "frame",
        "frame_id": str(header.get("frame_id", ""))[:64],
        "width": int(header["width"]),
        "height": int(header["height"]),
    }
    packet = pack(header, jpeg)
    for viewer in room.clients:
        if viewer.preview:
            viewer.emit(packet)
    worker = room.worker
    if (
        worker
        and not worker.live_busy
        and any(p.ml and p.preview for p in room.clients)
        and time.monotonic() - room.last_live > LIVE_ML_INTERVAL
    ):
        room.last_live = time.monotonic()
        worker.live_busy = True
        worker.emit(packet)


async def store_capture(conn: Connection, header: dict, jpeg: bytes) -> None:
    """Deliver a still to the viewer who asked for it, saving it first in cloud mode.

    Only captures with a pending request are accepted, so a Pi cannot push
    unsolicited images into anyone's library.
    """
    room = conn.room
    rid = uid(header.get("request_id"))
    entry = room.pending.pop(rid, None)
    if not entry:
        return
    target, _ = entry
    try:
        # Trust the decoded size, not the size the Pi claimed.
        with Image.open(io.BytesIO(jpeg)) as im:
            width, height = im.size
            im.verify()
        header = {
            "type": "capture",
            "request_id": rid,
            "image_id": rid,
            "width": width,
            "height": height,
            "captured_at": now(),
        }
        if state.cloud:
            await state.cloud.save(conn.device_id, rid, jpeg, header)
        if target in room.clients:
            target.emit(pack(header, jpeg))
        if state.cloud:
            await state.cloud.call(
                "PATCH",
                f"/rest/v1/commands?id=eq.{rid}",
                {"status": "completed", "completed_at": now()},
            )
    except Exception:
        log.exception("Capture persistence failed")
        target.emit(error_event("Capture could not be saved", request_id=rid))
