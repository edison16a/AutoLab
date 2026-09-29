"""Outbound-only Raspberry Pi agent. python -m autolab_agent.main --simulate"""

import argparse
import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from websockets.asyncio.client import connect

from .camera import Camera
from .credentials import load_or_create
from .endpoints import allowed_gateway, device_socket_url
from .link import DeviceLink
from .protocol import hello_message
from .registration import register

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("agent")


async def run(args):
    creds = load_or_create(args.credentials)
    camera = Camera(args.simulate)
    print(f"Device ID: {creds['device_id']}", flush=True)
    if args.mode == "cloud":
        await register(args.gateway, creds, args.credentials)
    delay = 1
    try:
        while True:
            try:
                async with connect(
                    device_socket_url(args.gateway, creds["device_id"]),
                    max_size=16 * 1024 * 1024,
                    max_queue=2,
                    write_limit=65536,
                    ping_interval=10,
                    ping_timeout=20,
                ) as ws:
                    await ws.send(json.dumps(hello_message(creds, camera, args.simulate)))
                    delay = 1
                    await DeviceLink(ws, camera).serve()
            except Exception as exc:
                log.warning(
                    "Disconnected (%s). Retrying in %ss", type(exc).__name__, delay
                )
            await asyncio.sleep(delay)
            delay = min(30, delay * 2)
    finally:
        camera.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument(
        "--gateway", default=os.getenv("AUTOLAB_GATEWAY", "ws://localhost:8000")
    )
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    p.add_argument(
        "--credentials",
        default=os.getenv("AUTOLAB_CREDENTIALS", "~/.config/autolab/credentials.json"),
    )
    p.add_argument("--simulate", action="store_true")
    args = p.parse_args()
    if not allowed_gateway(args.gateway):
        p.error("Use WSS for remote gateways")
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
