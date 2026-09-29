"""What happens after a valid request: join Wi-Fi, reach the gateway, share the claim."""

import asyncio
import json
import time

import httpx

from ..credentials import setup_info_path
from ..endpoints import http_base
from .session import ProvisioningSession
from .wifi import connect_wifi

CLAIM_WAIT = 40
# The gateway's claim codes last 10 minutes. Older results are not shown, so
# the phone never gets a code that is about to expire.
CLAIM_MAX_AGE = 540
FAILURE_MESSAGE = (
    "Could not finish Wi-Fi or gateway setup. Check credentials, gateway mode "
    "and reachability, then retry."
)


async def provision(
    session: ProvisioningSession,
    bus,
    ssid: str,
    password: str,
    gateway: str,
    mode: str,
    credentials_path: str,
) -> None:
    """Move `session.status` through each step, ending in gateway_connected or error.

    The phone polls the status characteristic, so progress is reported there
    rather than returned.
    """
    try:
        session.status = {"state": "connecting", "device_id": session.device_id}
        await connect_wifi(bus, ssid, password)
        session.status = {"state": "wifi_connected", "device_id": session.device_id}
        async with httpx.AsyncClient(timeout=20) as client:
            health = await client.get(http_base(gateway) + "/health")
            health.raise_for_status()
            if health.json().get("mode") != mode:
                raise RuntimeError("Gateway and Pi mode do not match")
            info = {}
            if mode == "cloud":
                info = await wait_for_claim(session.device_id, gateway, credentials_path)
        session.status = {
            "state": "gateway_connected",
            "device_id": session.device_id,
            "mode": mode,
            "claimed": bool(info.get("claimed")),
        }
        if info.get("code"):
            session.status["claim_code"] = info["code"]
        session.completed = True
    except Exception:
        # Never pass subprocess output or network secrets to the phone or logs.
        session.status = {
            "state": "error",
            "device_id": session.device_id,
            "message": FAILURE_MESSAGE,
        }
    finally:
        session.busy = False


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
