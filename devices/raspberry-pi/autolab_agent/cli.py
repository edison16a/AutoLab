"""Command line for the agent. Flags default to the AUTOLAB_* variables in .env.

The gateway can also come from gateway.json, which Bluetooth setup writes.
"""

import argparse
import asyncio
import logging
import os

from dotenv import load_dotenv

from .agent import run
from .endpoints import allowed_gateway
from .settings import resolve_gateway


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    # None, so main() can tell a typed flag from the saved file and .env.
    p.add_argument("--gateway", default=None)
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    p.add_argument(
        "--credentials",
        default=os.getenv("AUTOLAB_CREDENTIALS", "~/.config/autolab/credentials.json"),
    )
    p.add_argument("--simulate", action="store_true")
    return p


def main() -> None:
    # .env has to load before the parser reads its defaults from the environment.
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = build_parser()
    args = parser.parse_args()
    args.gateway = resolve_gateway(args.gateway, args.credentials)
    logging.getLogger("agent").info("Gateway: %s", args.gateway)
    if not allowed_gateway(args.gateway):
        parser.error(
            "Use wss:// unless the gateway is on this machine or the local network"
        )
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
