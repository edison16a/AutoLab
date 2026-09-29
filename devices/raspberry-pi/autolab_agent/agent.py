"""The agent's life: load its identity, register in cloud mode, then stay connected."""

import argparse
import asyncio
import json
import logging

from websockets.asyncio.client import connect

from .camera import Camera
from .credentials import load_or_create
from .endpoints import device_socket_url
from .link import DeviceLink
from .protocol import hello_message
from .registration import register

log = logging.getLogger("agent")

MAX_RETRY_DELAY = 30
# Fits a full-resolution still. max_queue=2 below caps how many unread gateway
# messages wait in memory.
MAX_MESSAGE_BYTES = 16 * 1024 * 1024


async def run(args: argparse.Namespace) -> None:
    creds = load_or_create(args.credentials)
    camera = Camera(args.simulate)
    print(f"Device ID: {creds['device_id']}", flush=True)
    try:
        if args.mode == "cloud":
            await register(args.gateway, creds, args.credentials)
        await stay_connected(args, creds, camera)
    finally:
        camera.close()


async def stay_connected(
    args: argparse.Namespace, creds: dict, camera: Camera
) -> None:
    """Reconnect forever. The Pi only dials out, so it must never give up.

    The retry delay doubles up to 30 s and resets once a hello goes through.
    """
    delay = 1
    while True:
        try:
            async with connect(
                device_socket_url(args.gateway, creds["device_id"]),
                max_size=MAX_MESSAGE_BYTES,
                max_queue=2,
                write_limit=65536,
                ping_interval=10,
                ping_timeout=20,
            ) as ws:
                await ws.send(json.dumps(hello_message(creds, camera, args.simulate)))
                delay = 1
                await DeviceLink(ws, camera).serve()
        except Exception as exc:
            log.warning("Disconnected (%s). Retrying in %ss", type(exc).__name__, delay)
        await asyncio.sleep(delay)
        delay = min(MAX_RETRY_DELAY, delay * 2)
