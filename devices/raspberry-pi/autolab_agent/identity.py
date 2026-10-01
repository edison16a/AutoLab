"""Print this Pi's Device ID, creating its identity on first use. Connects nowhere.

install.sh runs this so the Device ID is known before the Pi ever goes
online. Run it as the normal user, never with sudo, so the agent and setup
share one identity.
"""

import argparse
import os

from dotenv import load_dotenv

from .credentials import load_or_create


def main() -> None:
    load_dotenv()
    p = argparse.ArgumentParser(
        prog="python -m autolab_agent.identity", description=__doc__
    )
    p.add_argument(
        "--credentials",
        default=os.getenv("AUTOLAB_CREDENTIALS", "~/.config/autolab/credentials.json"),
    )
    args = p.parse_args()
    print(load_or_create(args.credentials)["device_id"])


if __name__ == "__main__":
    main()
