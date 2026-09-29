"""Outbound-only Raspberry Pi agent. python -m autolab_agent.main --simulate"""

import argparse
import asyncio
import json
import logging
import os
import struct
import time

import httpx
from dotenv import load_dotenv
from websockets.asyncio.client import connect

from .camera import Camera
from .credentials import load_or_create, write_setup_info
from .telemetry import metadata

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("agent")


def packet(header, data):
    b = json.dumps(header).encode()
    return struct.pack("!I", len(b)) + b + data


async def run(args):
    creds = load_or_create(args.credentials)
    camera = Camera(args.simulate)
    print(f"Device ID: {creds['device_id']}", flush=True)
    if args.mode == "cloud":
        base = (
            args.gateway.replace("wss://", "https://")
            .replace("ws://", "http://")
            .rstrip("/")
        )
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                base + "/devices/register",
                json={"device_id": creds["device_id"], "secret": creds["secret"]},
            )
            r.raise_for_status()
            result = r.json()
            # The local provisioning service reads this protected, short-lived
            # result instead of registering again and invalidating this claim.
            write_setup_info(
                args.credentials,
                {
                    **result,
                    "device_id": creds["device_id"],
                    "created_at": time.time(),
                    "gateway": args.gateway,
                },
            )
            print(
                "Already claimed"
                if result.get("claimed")
                else f"Pairing code: {result['code']} (valid for 10 minutes)",
                flush=True,
            )
    delay = 1
    try:
        while True:
            try:
                async with connect(
                    f"{args.gateway.rstrip('/')}/ws/device/{creds['device_id']}",
                    max_size=16 * 1024 * 1024,
                    max_queue=2,
                    write_limit=65536,
                    ping_interval=10,
                    ping_timeout=20,
                ) as ws:
                    await ws.send(
                        json.dumps(
                            {
                                "type": "hello",
                                "secret": creds["secret"],
                                "camera_online": camera.online,
                                "simulated": args.simulate,
                                **metadata(),
                            }
                        )
                    )
                    preview = False
                    send_lock = asyncio.Lock()
                    delay = 1

                    async def send(value):
                        async with send_lock:
                            await asyncio.wait_for(
                                ws.send(
                                    value
                                    if isinstance(value, bytes)
                                    else json.dumps(value)
                                ),
                                10,
                            )

                    async def heartbeat():
                        while True:
                            await send(
                                {
                                    "type": "heartbeat",
                                    "camera_online": camera.online,
                                    **metadata(),
                                }
                            )
                            await asyncio.sleep(10)

                    async def stream():
                        while True:
                            if preview and camera.online:
                                data, w, h = await asyncio.to_thread(camera.capture)
                                await send(
                                    packet(
                                        {
                                            "type": "frame",
                                            "frame_id": str(time.time_ns()),
                                            "width": w,
                                            "height": h,
                                        },
                                        data,
                                    )
                                )
                            await asyncio.sleep(0.25)

                    async def commands():
                        nonlocal preview
                        async for raw in ws:
                            cmd = json.loads(raw)
                            kind = cmd.get("type")
                            try:
                                if kind == "start_preview":
                                    preview = True
                                elif kind == "stop_preview":
                                    preview = False
                                elif kind == "capture_photo":
                                    data, w, h = await asyncio.to_thread(
                                        camera.capture, True
                                    )
                                    await send(
                                        packet(
                                            {
                                                "type": "capture",
                                                "request_id": cmd["request_id"],
                                                "width": w,
                                                "height": h,
                                            },
                                            data,
                                        )
                                    )
                                elif kind in ("camera_status", "ping"):
                                    await send(
                                        {
                                            "type": "pong"
                                            if kind == "ping"
                                            else "camera_status",
                                            "camera_online": camera.online,
                                        }
                                    )
                                elif kind == "error":
                                    raise RuntimeError(
                                        cmd.get(
                                            "message", "Gateway rejected connection"
                                        )
                                    )
                            except Exception as exc:
                                await send(
                                    {
                                        "type": "error",
                                        "request_id": cmd.get("request_id"),
                                        "message": str(exc),
                                    }
                                )

                    tasks = [
                        asyncio.create_task(f()) for f in (heartbeat, stream, commands)
                    ]
                    try:
                        done, _ = await asyncio.wait(
                            tasks, return_when=asyncio.FIRST_COMPLETED
                        )
                        for task in done:
                            task.result()
                    finally:
                        for task in tasks:
                            task.cancel()
                        await asyncio.gather(*tasks, return_exceptions=True)
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
    if not args.gateway.startswith(("ws://localhost:", "ws://127.0.0.1:", "wss://")):
        p.error("Use WSS for remote gateways")
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
