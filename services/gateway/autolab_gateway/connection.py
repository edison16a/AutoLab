"""The context every socket handler receives."""

from dataclasses import dataclass

from fastapi import WebSocket

from .peers import Peer
from .rooms import Room


@dataclass(eq=False)
class Connection:
    """One socket whose hello was accepted, plus the room it joined.

    Handlers take this instead of a long argument list. `owner` is the signed-in
    user in cloud mode. It is None in demo mode and for the Pi itself.
    """

    ws: WebSocket
    role: str
    device_id: str
    room: Room
    peer: Peer
    owner: str | None
