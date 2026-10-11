"""What happens after a valid request: join Wi-Fi unless the Pi is on it already,
then sign in to Supabase in lab mode, or reach the gateway and share the claim
otherwise."""

import asyncio
import logging

import httpx

from ..endpoints import http_base
from ..lab.session import SignInError
from .handoff import wait_for_claim
from .lab_login import sign_in_pi
from .repoint import repoint_agent
from .session import ProvisioningSession
from .wifi import WifiOff, connect_wifi, current_ssid, is_online

log = logging.getLogger("setup")
NETWORK_CHECK = 3  # seconds NetworkManager gets to answer
CHECKING = "checking the Wi-Fi"
JOINING = "joining Wi-Fi"
NO_WIFI = "This Autolab isn't on Wi-Fi yet. Enter a Wi-Fi name and password."
CHECK_FAILURE = (
    "The Pi couldn't tell which Wi-Fi it's on, so it left its Wi-Fi alone. "
    "Retry in a moment."
)
JOIN_FAILURE = 'Could not join "{}". Check the Wi-Fi name and password, then retry.'
WIFI_OFF = (
    "The Pi's Wi-Fi is switched off, usually because no Wi-Fi country is set. "
    "Set it in sudo raspi-config under Localisation Options, WLAN Country, "
    "then retry."
)
FAILURE_MESSAGE = (
    "The Pi is on Wi-Fi but could not reach the gateway. Check that this "
    "network reaches it and that both run in the same mode, then retry."
)
LAB_FAILURE = (
    "The Pi is on Wi-Fi but could not reach Supabase. Check that this network "
    "reaches the internet, then retry."
)


async def refresh_network(session: ProvisioningSession, bus) -> tuple[bool, str | None]:
    """Ask NetworkManager whether the Pi is online and on which Wi-Fi.

    Saves the answer on the session for the status and returns it. Never
    raises: without an answer the Pi counts as offline, so setup asks for
    Wi-Fi details as it always did. The two are asked apart, so a Wi-Fi
    lookup that fails only leaves the SSID out.
    """
    try:
        online = await asyncio.wait_for(is_online(bus), NETWORK_CHECK)
    except Exception:
        online = False
    try:
        ssid = await asyncio.wait_for(current_ssid(bus), NETWORK_CHECK)
    except Exception:
        ssid = None
    session.online, session.wifi_ssid = online, ssid
    return online, ssid


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

    An empty `ssid` keeps the Wi-Fi the Pi is on, and so does the SSID it is
    on already. Joining again would drop the connection, and a phone hotspot
    may not let the Pi back on.
    """
    handed_over = session.gateway
    target = handed_over or gateway
    step = CHECKING
    try:
        online, current = await refresh_network(session, bus)
        if not ssid and not online:
            log.warning("Setup got no Wi-Fi details, and the Pi is offline")
            session.status = {
                "state": "error",
                "device_id": session.device_id,
                "message": NO_WIFI,
            }
            return
        if ssid and online and ssid != current:
            # A lookup that failed reads as no Wi-Fi, and joining the network
            # the Pi is on would drop it. So ask once more, and stop if there
            # is still no answer.
            current = await asyncio.wait_for(current_ssid(bus), NETWORK_CHECK)
        if ssid and not (online and ssid == current):
            step = JOINING
            session.status = {"state": "connecting", "device_id": session.device_id}
            await connect_wifi(bus, ssid, password)
        else:
            log.info("Already online, keeping the current Wi-Fi")
        session.status = {"state": "wifi_connected", "device_id": session.device_id}
        if session.supabase:
            step = "signing in to Supabase"
            agent_id = await sign_in_pi(credentials_path, *session.supabase)
            session.status = {
                "state": "gateway_connected",
                "device_id": session.device_id,
                "mode": "lab",
                "agent_id": agent_id,
            }
            session.completed = True
            return
        step = "reaching the gateway"
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
    except Exception as exc:
        # The journal gets the step and the error's type, never the error's
        # text, which can hold subprocess output or network secrets.
        name = getattr(exc, "type", type(exc).__name__)
        log.warning("Setup failed %s (%s)", step, name)
        if isinstance(exc, SignInError):
            # Supabase's own reason, such as anonymous sign ins being off, tells the person what to fix.
            message = f"Supabase refused the Pi's login: {str(exc)[:160]}"
        elif isinstance(exc, WifiOff):
            message = WIFI_OFF
        elif step == CHECKING:
            message = CHECK_FAILURE
        elif step == JOINING:
            message = JOIN_FAILURE.format(ssid)
        else:
            message = LAB_FAILURE if session.supabase else FAILURE_MESSAGE
        session.status = {
            "state": "error",
            "device_id": session.device_id,
            "message": message,
        }
    finally:
        session.busy = False
