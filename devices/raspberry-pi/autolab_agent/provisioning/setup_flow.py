"""What happens after a valid request: join Wi-Fi, reach the gateway, share the claim."""

import httpx

from ..endpoints import http_base
from .handoff import wait_for_claim
from .session import ProvisioningSession
from .wifi import connect_wifi

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
