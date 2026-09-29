"""Background sweep for every timeout the message handlers cannot enforce.

Handlers only run when a message arrives. A silent Pi, a stuck worker or an
unanswered capture would otherwise wait forever, so this loop checks the clock.
"""

import asyncio
import time
from contextlib import suppress

from fastapi import HTTPException

from . import state
from .limits import prune
from .protocol import error_event
from .rooms import Room

INTERVAL = 5
DEVICE_SILENCE = 35  # the Pi sends a heartbeat every 10 s
LIVE_ML_STALL = 120  # a worker holding one live frame this long is stuck
SESSION_RECHECK = 300  # cloud sessions can be revoked, so tokens are rechecked


async def sweep() -> None:
    while True:
        await asyncio.sleep(INTERVAL)
        await sweep_once(time.monotonic())


async def sweep_once(t: float) -> None:
    prune(t)
    for room in list(state.rooms.values()):
        await _close_stalled(room, t)
        if state.cloud:
            await _recheck_sessions(room, t)
        _expire_pending(room, t)


async def _close_stalled(room: Room, t: float) -> None:
    """Closing is enough: each socket's own cleanup then updates the room."""
    if room.device and t - room.device.last_seen > DEVICE_SILENCE:
        with suppress(Exception):
            await room.device.ws.close(code=1001)
    if room.worker and room.worker.live_busy and t - room.last_live > LIVE_ML_STALL:
        with suppress(Exception):
            await room.worker.ws.close(code=1013)


async def _recheck_sessions(room: Room, t: float) -> None:
    """Drop viewers and workers whose account session was signed out or expired."""
    peers = list(room.clients) + ([room.worker] if room.worker else [])
    for peer in peers:
        if t - peer.checked_at <= SESSION_RECHECK:
            continue
        peer.checked_at = t
        try:
            await state.cloud.user(peer.auth_token)
        except HTTPException:
            with suppress(Exception):
                await peer.ws.close(code=1008)


def _expire_pending(room: Room, t: float) -> None:
    for pending in (room.pending, room.analysis):
        for rid, (peer, deadline) in list(pending.items()):
            if t > deadline:
                peer.emit(error_event("Request timed out", request_id=rid))
                pending.pop(rid, None)
