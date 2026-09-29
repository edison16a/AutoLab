"""The one WebSocket route shared by the Pi, browsers and the ML worker."""

import asyncio
import json
import logging
import time
from contextlib import suppress

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from .config import ORIGINS
from .connection import Connection
from .handlers import HANDLERS
from .lifecycle import enter, leave, open_connection
from .protocol import error_event, uid, unpack

router = APIRouter()
log = logging.getLogger("autolab")

HELLO_TIMEOUT = 10
MAX_TEXT_BYTES = 1024 * 1024


async def admit(ws: WebSocket, role: str, device_id: str) -> str | None:
    """Turn away bad requests before accepting, so they never cost a room slot.

    Returns the normalized device id, or None after closing the socket.
    Browsers skip CORS for sockets, so the origin is checked here by hand.
    """
    if role not in HANDLERS:
        await ws.close(code=1008)
        return None
    try:
        device_id = uid(device_id)
    except HTTPException:
        await ws.close(code=1008)
        return None
    if ws.headers.get("origin") and ws.headers["origin"] not in ORIGINS:
        await ws.close(code=1008)
        return None
    return device_id


@router.websocket("/ws/{role}/{device_id}")
async def socket(ws: WebSocket, role: str, device_id: str):
    device_id = await admit(ws, role, device_id)
    if device_id is None:
        return
    await ws.accept()
    conn: Connection | None = None
    sender: asyncio.Task | None = None
    receiver: asyncio.Task | None = None
    try:
        hello = await asyncio.wait_for(ws.receive_json(), HELLO_TIMEOUT)
        if hello.get("type") != "hello":
            raise ValueError("Expected hello")
        conn = await open_connection(ws, role, device_id, hello)
        sender = asyncio.create_task(conn.peer.send())
        await enter(conn, hello)
        receiver = asyncio.create_task(receive(conn))
        # Whichever side fails first ends the connection. result() re-raises
        # its error so the peer is told why.
        done, _ = await asyncio.wait(
            [receiver, sender], return_when=asyncio.FIRST_COMPLETED
        )
        for task in done:
            task.result()
    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as exc:
        log.info("Connection ended: %s", type(exc).__name__)
        with suppress(Exception):
            await ws.send_json(
                error_event(
                    exc.detail if isinstance(exc, HTTPException) else str(exc)[:200]
                )
            )
    finally:
        for task in (receiver, sender):
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError, Exception):
                    await task
        if conn:
            await leave(conn)
        with suppress(Exception):
            await ws.close()


async def receive(conn: Connection) -> None:
    """Read until the socket closes, handing each message to the role's handlers.

    Any exception here ends the connection. That is how protocol violations
    are enforced.
    """
    handlers = HANDLERS[conn.role]
    while True:
        message = await conn.ws.receive()
        if message["type"] == "websocket.disconnect":
            break
        conn.peer.last_seen = time.monotonic()
        if message.get("bytes") is not None:
            header, jpeg = unpack(message["bytes"])
            await handlers.on_binary(conn, header.get("type"), header, jpeg)
            continue
        raw = message.get("text", "")
        if len(raw) > MAX_TEXT_BYTES:
            raise ValueError("Message too large")
        data = json.loads(raw)
        await handlers.on_text(conn, data.get("type"), data)
