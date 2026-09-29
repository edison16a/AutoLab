"""Joining and leaving a room, the same for every role."""

from fastapi import WebSocket

from . import state
from .config import MODE
from .connection import Connection
from .handlers import HANDLERS, device, worker
from .peers import Peer
from .rooms import Room

# Hard caps so one small process stays within bounded memory.
MAX_ROOMS = 200
MAX_VIEWERS = 10


async def authenticate(role: str, device_id: str, hello: dict) -> str | None:
    """Cloud mode only: the Pi proves its secret, everyone else proves ownership.

    Returns the owner's user id for browsers and workers, otherwise None.
    """
    if not state.cloud:
        return None
    if role == "device":
        await state.cloud.device(device_id, str(hello.get("secret", "")))
        return None
    owner = await state.cloud.user(str(hello.get("token", "")))
    await state.cloud.owner(device_id, owner)
    return owner


def claim_room(role: str, device_id: str) -> Room:
    """Find or create the room, refusing a second Pi, a second worker or a crowd."""
    if len(state.rooms) >= MAX_ROOMS and device_id not in state.rooms:
        raise ValueError("Gateway at capacity")
    room = state.rooms.setdefault(device_id, Room())
    if role == "device" and room.device:
        raise ValueError("Device already connected")
    if role == "worker" and room.worker:
        raise ValueError("Worker already connected")
    if role == "client" and len(room.clients) >= MAX_VIEWERS:
        raise ValueError("Too many viewers")
    return room


async def open_connection(
    ws: WebSocket, role: str, device_id: str, hello: dict
) -> Connection:
    """Check the hello and reserve a place. Nothing in the room changes yet."""
    owner = await authenticate(role, device_id, hello)
    room = claim_room(role, device_id)
    # The token is kept so the sweeper can notice a revoked session later.
    peer = Peer(ws, role, owner, auth_token=str(hello.get("token", "")))
    return Connection(ws, role, device_id, room, peer, owner)


async def enter(conn: Connection, hello: dict) -> None:
    await HANDLERS[conn.role].join(conn, hello)
    conn.room.broadcast(conn.room.status())
    conn.peer.emit({"type": "ready", "mode": MODE})


async def leave(conn: Connection) -> None:
    """Undo everything this peer touched, then drop the room once it is empty."""
    room, peer = conn.room, conn.peer
    room.clients.discard(peer)
    # Answers owed to this peer have nowhere to go.
    for pending in (room.pending, room.analysis):
        for rid, (target, _) in list(pending.items()):
            if target is peer:
                pending.pop(rid, None)
    if room.device is peer:
        await device.leave(conn)
    if room.worker is peer:
        await worker.leave(conn)
    # A departing viewer may have been the last one watching the preview.
    room.sync_preview()
    room.broadcast(room.status())
    if not room.device and not room.worker and not room.clients:
        state.rooms.pop(conn.device_id, None)
