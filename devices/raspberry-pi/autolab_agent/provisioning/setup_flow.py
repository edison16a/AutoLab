"""What happens after a valid request: join Wi-Fi, then sign in to Supabase in lab
mode, or reach the gateway and share the claim otherwise."""

import httpx

from ..endpoints import http_base
from ..lab.session import SignInError
from .handoff import wait_for_claim
from .lab_login import sign_in_pi
from .repoint import repoint_agent
from .session import ProvisioningSession
from .wifi import connect_wifi

FAILURE_MESSAGE = (
    "Could not finish Wi-Fi or gateway setup. Check credentials, gateway mode "
    "and reachability, then retry."
)
LAB_FAILURE = (
    "Could not finish Wi-Fi or Supabase setup. Check the Wi-Fi details and that "
    "this network reaches the internet, then retry."
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
    rather than returned. `gateway` is the one the Pi already has. A gateway
    in the request replaces it, but only once the Pi has reached it, so a bad
    address never strands the agent.
    """
    handed_over = session.gateway
    target = handed_over or gateway
    try:
        session.status = {"state": "connecting", "device_id": session.device_id}
        await connect_wifi(bus, ssid, password)
        session.status = {"state": "wifi_connected", "device_id": session.device_id}
        if session.supabase:
            agent_id = await sign_in_pi(credentials_path, *session.supabase)
            session.status = {
                "state": "gateway_connected",
                "device_id": session.device_id,
                "mode": "lab",
                "agent_id": agent_id,
            }
            session.completed = True
            return
        async with httpx.AsyncClient(timeout=20) as client:
            health = await client.get(http_base(target) + "/health")
            health.raise_for_status()
            if health.json().get("mode") != mode:
                raise RuntimeError("Gateway and Pi mode do not match")
            if handed_over:
                await repoint_agent(credentials_path, handed_over)
            info = {}
            if mode == "cloud":
                info = await wait_for_claim(session.device_id, target, credentials_path)
        session.status = {
            "state": "gateway_connected",
            "device_id": session.device_id,
            "mode": mode,
            "claimed": bool(info.get("claimed")),
        }
        if info.get("code"):
            session.status["claim_code"] = info["code"]
        session.completed = True
    except SignInError as exc:
        # Supabase's own reason, such as anonymous sign ins being off, tells the person what to fix.
        session.status = {
            "state": "error",
            "device_id": session.device_id,
            "message": f"Supabase refused the Pi's login: {str(exc)[:160]}",
        }
    except Exception:
        # Never pass subprocess output or network secrets to the phone or logs.
        session.status = {
            "state": "error",
            "device_id": session.device_id,
            "message": LAB_FAILURE if session.supabase else FAILURE_MESSAGE,
        }
    finally:
        session.busy = False
