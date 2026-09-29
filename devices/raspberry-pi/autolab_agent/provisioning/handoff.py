"""The claim hand-off from the running agent, read from the file beside its credentials.

No D-Bus here, so the hand-off can be tested on any machine.
"""

import asyncio
import json
import time

from ..credentials import setup_info_path

CLAIM_WAIT = 40
# The gateway's claim codes last 10 minutes. Older results are not shown, so
# the phone never gets a code that is about to expire.
CLAIM_MAX_AGE = 540


async def wait_for_claim(device_id: str, gateway: str, credentials_path: str) -> dict:
    """Read the running agent's claim result instead of registering again.

    A second registration would issue a new code and silently invalidate the
    one the agent already printed.
    """
    info_path = setup_info_path(credentials_path)
    for _ in range(CLAIM_WAIT):
        try:
            info = json.loads(info_path.read_text())
            valid = info.get("device_id") == device_id and info.get("gateway") == gateway
            if valid and (
                info.get("claimed")
                or time.time() - info.get("created_at", 0) < CLAIM_MAX_AGE
            ):
                return info
        except (OSError, ValueError):
            pass
        await asyncio.sleep(1)
    raise RuntimeError(
        "Start or restart the cloud camera agent to issue a current claim code"
    )
