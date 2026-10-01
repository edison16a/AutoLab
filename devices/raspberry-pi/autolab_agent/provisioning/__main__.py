"""Open the Bluetooth Wi-Fi setup window on this Pi for 10 minutes.

Needs root, a running BlueZ and NetworkManager, and the device credentials
the agent created on its first run.
"""

import argparse
import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from ..endpoints import allowed_gateway
from ..settings import DEFAULT_GATEWAY, resolve_gateway


def main() -> None:
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    p = argparse.ArgumentParser(
        prog="python -m autolab_agent.provisioning", description=__doc__
    )
    # Used when a request carries no gateway. Resolved like the agent's.
    p.add_argument("--gateway", default=None)
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    p.add_argument(
        "--credentials",
        default=os.getenv("AUTOLAB_CREDENTIALS", "~/.config/autolab/credentials.json"),
    )
    p.add_argument("--adapter", default="/org/bluez/hci0")
    args = p.parse_args()
    if not Path(args.credentials).expanduser().is_file():
        p.error("Initialize device credentials using the normal agent first")
    args.gateway = resolve_gateway(args.gateway, args.credentials)
    # Setup trusts the gateway's answers, so plain ws:// must stay on the LAN.
    # A bad value must not stop setup, since a request can bring a new gateway.
    if not allowed_gateway(args.gateway):
        print(f"Ignoring {args.gateway}. Use wss:// or a LAN address.", flush=True)
        args.gateway = DEFAULT_GATEWAY
    # Imported late: the BlueZ side needs dbus-next, and --help should not.
    from .server import run

    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
