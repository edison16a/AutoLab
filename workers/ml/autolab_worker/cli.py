"""Command line for the worker. Defaults come from the AUTOLAB_* variables in .env."""

import argparse
import asyncio
import os

from dotenv import load_dotenv

from .worker import run


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--gateway", default=os.getenv("AUTOLAB_GATEWAY", "ws://localhost:8000")
    )
    p.add_argument("--device", required=True)
    p.add_argument("--model", default="yolo11n-seg.pt")
    p.add_argument("--simulate", action="store_true")
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    return p


def main() -> None:
    # .env has to load before the parser reads its defaults from the environment.
    load_dotenv()
    parser = build_parser()
    args = parser.parse_args()
    # Plain ws:// is only for this machine. The hello carries an account token.
    if not args.gateway.startswith(("ws://localhost:", "ws://127.0.0.1:", "wss://")):
        parser.error("Use WSS for remote gateways")
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
