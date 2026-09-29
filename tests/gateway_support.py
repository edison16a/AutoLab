"""Small helpers for driving the gateway's sockets from tests."""

import io

from PIL import Image


def opened(c, role, device):
    return c.websocket_connect(f"/ws/{role}/{device}")


def hello(ws, **kw):
    ws.send_json({"type": "hello", **kw})


def until(ws, kind):
    """Skip unrelated events, like status broadcasts, until `kind` arrives."""
    for _ in range(20):
        data = ws.receive_json()
        if data.get("type") == kind:
            return data
    raise AssertionError(f"No {kind} received")


def jpeg():
    out = io.BytesIO()
    Image.new("RGB", (64, 48), "blue").save(out, format="JPEG")
    return out.getvalue()
