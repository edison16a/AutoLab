"""Command line for the agent. Flags default to the AUTOLAB_* variables in .env."""

import argparse
import asyncio
import logging
import os

from dotenv import load_dotenv

from .agent import run
from .endpoints import allowed_gateway


def build_parser() -> argparse.ArgumentParser:
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
    return p


def main() -> None:
    # .env has to load before the parser reads its defaults from the environment.
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = build_parser()
    args = parser.parse_args()
    if not allowed_gateway(args.gateway):
        parser.error("Use WSS for remote gateways")
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
