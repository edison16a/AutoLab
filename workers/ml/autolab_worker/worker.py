"""The worker's connection to the gateway: receive images, answer with detections."""

import argparse
import asyncio
import json
import struct

from websockets.asyncio.client import ClientConnection, connect

from .auth import access_token
from .detector import Detector

MAX_RETRY_DELAY = 30
MAX_MESSAGE_BYTES = 16 * 1024 * 1024  # a full-resolution still fits in one message


async def run(args: argparse.Namespace) -> None:
    """Load the model once, then reconnect forever with a doubling delay."""
    detector = Detector(args.model, args.simulate)
    delay = 1
    while True:
        try:
            token = await access_token(args.mode)
            async with connect(
                f"{args.gateway.rstrip('/')}/ws/worker/{args.device}",
                max_size=MAX_MESSAGE_BYTES,
                max_queue=2,
                ping_interval=10,
            ) as ws:
                await ws.send(json.dumps({"type": "hello", "token": token}))
                delay = 1
                await serve(ws, detector)
        except Exception as exc:
            print(f"Worker disconnected: {exc}. Retrying in {delay}s", flush=True)
        await asyncio.sleep(delay)
        delay = min(delay * 2, MAX_RETRY_DELAY)


async def serve(ws: ClientConnection, detector: Detector) -> None:
    """Answer each image in order. A gateway error ends the session and reconnects."""
    async for raw in ws:
        if isinstance(raw, str):
            event = json.loads(raw)
            if event.get("type") == "error":
                raise RuntimeError(event.get("message"))
            continue
        header, jpeg = split_packet(raw)
        await ws.send(json.dumps(await analyze(detector, header, jpeg)))


def split_packet(raw: bytes) -> tuple[dict, bytes]:
    """Binary envelope: 4-byte big-endian header length, JSON header, then JPEG."""
    n = struct.unpack("!I", raw[:4])[0]
    return json.loads(raw[4 : n + 4]), raw[n + 4 :]


async def analyze(detector: Detector, header: dict, jpeg: bytes) -> dict:
    """Saved images carry an image_id and live frames a frame_id. Both are echoed back.

    Failures are reported for this image only, so one bad JPEG does not drop
    the connection.
    """
    try:
        result = await asyncio.to_thread(detector, jpeg)
        result.update(
            type="analysis",
            image_id=header.get("image_id"),
            frame_id=header.get("frame_id"),
        )
    except Exception as exc:
        result = {
            "type": "error",
            "image_id": header.get("image_id"),
            "message": str(exc)[:200],
        }
    return result
