"""Wire format helpers shared by every role (see docs/protocol.md).

A binary packet is a 4-byte big-endian header length, a UTF-8 JSON header, then
JPEG bytes. Header and image travel in one WebSocket message, so they can never
arrive apart, and there is no base64 overhead.
"""

import json
import struct
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

# Matches uvicorn --ws-max-size, so a full-resolution still fits in one message.
MAX_PACKET_BYTES = 16 * 1024 * 1024
MAX_HEADER_BYTES = 8192


def uid(value: Any) -> str:
    """Normalize a UUID from a path or message, or reject it.

    IDs end up inside PostgREST filters, so anything that is not a real UUID
    stops here, before it gets near a query.
    """
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError):
        raise HTTPException(400, "Expected UUID")


def unpack(data: bytes) -> tuple[dict, bytes]:
    if len(data) < 5 or len(data) > MAX_PACKET_BYTES:
        raise ValueError("Invalid packet size")
    n = struct.unpack("!I", data[:4])[0]
    if n > MAX_HEADER_BYTES or n + 4 >= len(data):
        raise ValueError("Invalid packet header")
    header = json.loads(data[4 : 4 + n])
    jpeg = data[4 + n :]
    if not isinstance(header, dict) or not jpeg.startswith(b"\xff\xd8"):
        raise ValueError("Expected JPEG packet")
    return header, jpeg


def pack(header: dict, jpeg: bytes) -> bytes:
    body = json.dumps(header, separators=(",", ":")).encode()
    return struct.pack("!I", len(body)) + body + jpeg


def is_frame(data: Any) -> bool:
    """Live preview frames are disposable. Every other message must be delivered."""
    return isinstance(data, bytes) and unpack(data)[0].get("type") == "frame"


def error_event(message: str, **ids: str) -> dict:
    """An error event, optionally tied to a request_id or image_id."""
    return {"type": "error", **ids, "message": message}


def now() -> str:
    """Wire timestamps are ISO 8601 in UTC."""
    return datetime.now(timezone.utc).isoformat()
