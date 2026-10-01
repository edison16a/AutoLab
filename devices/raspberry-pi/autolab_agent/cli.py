"""Command line for the agent. Flags default to the AUTOLAB_* variables in .env.

Lab mode talks to Supabase directly. It starts when Supabase settings are
given or Bluetooth setup saved a login in supabase.json. Otherwise the agent
dials a gateway, which can also come from gateway.json.
"""

import argparse
import asyncio
import logging
import os

from dotenv import load_dotenv

from .agent import run
from .endpoints import allowed_gateway
from .lab.start import run_lab, wanted
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
    # Lab mode. Only the public anon key: Supabase's row level security does the rest.
    p.add_argument("--supabase-url", default=os.getenv("AUTOLAB_SUPABASE_URL", ""))
    p.add_argument("--supabase-key", default=os.getenv("AUTOLAB_SUPABASE_KEY", ""))
    return p


def main() -> None:
    # .env has to load before the parser reads its defaults from the environment.
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    # httpx logs every request at INFO, which would bury the agent's own lines.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    parser = build_parser()
    args = parser.parse_args()
    if wanted(args):
        try:
            asyncio.run(run_lab(args))
        except KeyboardInterrupt:
            pass
        return
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
