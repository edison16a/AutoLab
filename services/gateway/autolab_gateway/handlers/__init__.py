"""Per-role socket handling. Each role module exposes the same three hooks.

Handlers signal protocol violations by raising. The socket route turns that into
one error event and closes the connection, so a misbehaving peer never gets a
second chance to confuse the room.
"""

from collections.abc import Awaitable, Callable
from typing import Any, NamedTuple

from ..connection import Connection
from . import client, device, worker


class RoleHandlers(NamedTuple):
    join: Callable[[Connection, dict], Awaitable[None]]
    on_text: Callable[[Connection, Any, dict], Awaitable[None]]
    on_binary: Callable[[Connection, Any, dict, bytes], Awaitable[None]]


HANDLERS: dict[str, RoleHandlers] = {
    "device": RoleHandlers(device.join, device.on_text, device.on_binary),
    "client": RoleHandlers(client.join, client.on_text, client.on_binary),
    "worker": RoleHandlers(worker.join, worker.on_text, worker.on_binary),
}
