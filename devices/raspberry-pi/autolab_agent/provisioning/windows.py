"""How many setup windows to open: one when started by hand, maybe more at boot.

With --on-boot the service opens one window after every start, so a lab can
point the Pi at a new computer by power cycling it. While the Pi has no
network it keeps opening new ones, since nothing else can reach it.
"""

import asyncio
import json
import os
from pathlib import Path

from .pin import PIN_FILE, setup_pin
from .session import MAX_PIN_ATTEMPTS, ProvisioningSession


async def open_setup(args, serve) -> None:
    """Serve windows through `serve(args, session)` until no more are needed."""
    creds = json.loads(Path(args.credentials).expanduser().read_text())
    pin, fixed = setup_pin()
    # A fixed PIN lasts for years, so it is kept out of the journal.
    shown = f"the one on the sticker ({PIN_FILE})" if fixed else pin
    print(f"Setup PIN: {shown}", flush=True)
    attempts = 0
    while True:
        session = ProvisioningSession(creds["device_id"], pin)
        # Wrong guesses carry over, so a new window gives no fresh tries.
        session.attempts = attempts
        await serve(args, session)
        attempts = session.attempts
        if not args.on_boot or await network_online():
            return
        if attempts >= MAX_PIN_ATTEMPTS:
            print("Too many wrong setup PINs. Restart the Pi to try again.", flush=True)
            return
        print("Still offline. Opening setup again.", flush=True)


async def network_online() -> bool:
    """True when NetworkManager has any connection, even one without internet.

    A lab network may have no internet at all, and the Pi only needs the LAN.
    LC_ALL=C keeps nmcli's answer in English so it can be read here.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "nmcli",
            "-t",
            "-f",
            "STATE",
            "general",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
            env={**os.environ, "LC_ALL": "C"},
        )
        output, _ = await asyncio.wait_for(process.communicate(), 15)
    except (OSError, TimeoutError):
        return False
    return output.decode(errors="replace").strip().startswith("connected")
