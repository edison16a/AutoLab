"""Open the Bluetooth Wi-Fi setup window on this Pi for 10 minutes.

Needs root, a running BlueZ and NetworkManager, and the device credentials
the agent created on its first run.
"""

import argparse
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    p = argparse.ArgumentParser(
        prog="python -m autolab_agent.provisioning", description=__doc__
    )
    p.add_argument("--gateway", default=os.getenv("AUTOLAB_GATEWAY", ""))
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    p.add_argument(
        "--credentials",
        default=os.getenv("AUTOLAB_CREDENTIALS", "~/.config/autolab/credentials.json"),
    )
    p.add_argument("--adapter", default="/org/bluez/hci0")
    args = p.parse_args()
    # Setup trusts the gateway's answers, so plain ws:// is refused.
    if not args.gateway.startswith("wss://"):
        p.error(
            "Set AUTOLAB_GATEWAY to your trusted wss:// gateway before provisioning"
        )
    if not Path(args.credentials).expanduser().is_file():
        p.error("Initialize device credentials using the normal agent first")
    # Imported late: the BlueZ side needs dbus-next, and --help should not.
    from .server import run

    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
