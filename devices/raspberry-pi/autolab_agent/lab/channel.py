"""The Autolab's private Realtime channel, device:<id>, spoken over plain websockets.

Screens send "watch" while someone has the live view open and "wake" after
sending a command. The Pi sends preview frames back. Only the owner and this
Pi may join, which the database checks on every join and message.
"""

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from websockets.asyncio.client import ClientConnection, connect

log = logging.getLogger("agent")

HEARTBEAT = 25
JOIN_TIMEOUT = 10
SEND_TIMEOUT = 10

Listener = Callable[[str, dict], None]


class ChannelRefused(RuntimeError):
    """Supabase would not let this login join, usually because it isn't linked yet."""


class DeviceChannel:
    def __init__(self, url: str, key: str, device_id: str, token: Callable[[], Awaitable[str]]) -> None:
        base = url.replace("https://", "wss://", 1).replace("http://", "ws://", 1)
        self.socket_url = f"{base}/realtime/v1/websocket?apikey={key}&vsn=1.0.0"
        self.topic = f"realtime:device:{device_id}"
        self.token = token
        self.ws: ClientConnection | None = None
        self._ref = 0
        self._lock = asyncio.Lock()

    @property
    def joined(self) -> bool:
        return self.ws is not None

    def _next(self) -> str:
        self._ref += 1
        return str(self._ref)

    async def _push(self, ws: ClientConnection, topic: str, event: str, payload: dict) -> None:
        message = json.dumps({"topic": topic, "event": event, "payload": payload, "ref": self._next(), "join_ref": "1"})
        async with self._lock:
            await asyncio.wait_for(ws.send(message), SEND_TIMEOUT)

    async def send(self, event: str, payload: dict[str, Any]) -> None:
        """Broadcast to the screens on this channel. Dropped while disconnected, which suits frames."""
        if self.ws:
            await self._push(self.ws, self.topic, "broadcast", {"type": "broadcast", "event": event, "payload": payload})

    async def run(self, listener: Listener) -> None:
        """Join and relay broadcasts until the connection drops, which raises."""
        async with connect(self.socket_url, max_size=4 * 1024 * 1024, ping_interval=None) as ws:
            config = {
                "broadcast": {"self": False, "ack": False},
                "presence": {"key": "", "enabled": False},
                "postgres_changes": [],
                "private": True,
            }
            join = {"topic": self.topic, "event": "phx_join", "ref": "1", "join_ref": "1",
                    "payload": {"config": config, "access_token": await self.token()}}
            await ws.send(json.dumps(join))
            await self._await_join(ws)
            self.ws = ws
            log.info("Joined the Autolab's live channel")
            keepalive = asyncio.create_task(self._keepalive(ws))
            try:
                async for raw in ws:
                    message = json.loads(raw)
                    if message.get("topic") != self.topic:
                        continue
                    if message.get("event") == "broadcast":
                        body = message.get("payload") or {}
                        listener(str(body.get("event")), body.get("payload") or {})
                    elif message.get("event") in ("phx_error", "phx_close"):
                        raise ConnectionError(f"Channel closed ({message.get('event')})")
            finally:
                self.ws = None
                keepalive.cancel()

    async def _await_join(self, ws: ClientConnection) -> None:
        async with asyncio.timeout(JOIN_TIMEOUT):
            async for raw in ws:
                message = json.loads(raw)
                if message.get("event") == "phx_reply" and message.get("ref") == "1":
                    payload = message.get("payload") or {}
                    if payload.get("status") == "ok":
                        return
                    reason = (payload.get("response") or {}).get("reason") or "refused"
                    raise ChannelRefused(str(reason))

    async def _keepalive(self, ws: ClientConnection) -> None:
        """Phoenix heartbeats, plus the fresh login token so the server keeps trusting the socket."""
        while True:
            await asyncio.sleep(HEARTBEAT)
            await self._push(ws, "phoenix", "heartbeat", {})
            await self._push(ws, self.topic, "access_token", {"access_token": await self.token()})
