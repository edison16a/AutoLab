"""Messages the agent sends to the gateway (see docs/protocol.md)."""

import json
import struct

from .camera import Camera
from .telemetry import metadata


def packet(header: dict, data: bytes) -> bytes:
    """Binary envelope: 4-byte big-endian header length, JSON header, then JPEG.

    Header and image share one WebSocket message so they can never arrive apart.
    """
    b = json.dumps(header).encode()
    return struct.pack("!I", len(b)) + b + data


def hello_message(creds: dict, camera: Camera, simulated: bool) -> dict:
    """First message on every connection. Simulated agents say so, and viewers see it."""
    return {
        "type": "hello",
        "secret": creds["secret"],
        "camera_online": camera.online,
        "simulated": simulated,
        **metadata(),
    }


def heartbeat_message(camera: Camera, components: list[dict] | None = None) -> dict:
    """Sent every few seconds. The gateway drops a Pi that goes quiet.

    Components go in only when hardware is configured. Leaving the key out
    lets the gateway keep whatever list it had.
    """
    message = {"type": "heartbeat", "camera_online": camera.online, **metadata()}
    if components is not None:
        message["components"] = components
    return message
