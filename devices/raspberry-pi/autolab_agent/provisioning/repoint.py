"""Point the camera agent at the gateway the lab station handed over."""

import asyncio
import logging

from ..settings import load_gateway, save_gateway

log = logging.getLogger("setup")
AGENT_UNIT = "autolab-agent"


async def repoint_agent(credentials_path: str, gateway: str) -> None:
    """Save the new gateway, then restart the agent so it dials there now.

    Nothing happens when the gateway is already saved. The running agent
    reconnects by itself, and in cloud mode a restart would issue a new claim
    code that replaces the one setup is about to read.
    """
    if load_gateway(credentials_path) == gateway:
        return
    save_gateway(credentials_path, gateway)
    await restart_agent()


async def restart_agent() -> None:
    """Best effort. A Pi without the systemd unit still finishes setup.

    --no-block queues the restart and returns, so a slow shutdown of the old
    agent does not hold up the status the browser is waiting for.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "systemctl",
            "--no-block",
            "restart",
            AGENT_UNIT,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, error = await asyncio.wait_for(process.communicate(), 30)
    except (OSError, TimeoutError) as exc:
        log.warning("Could not restart %s (%s)", AGENT_UNIT, type(exc).__name__)
        return
    if process.returncode:
        reason = error.decode(errors="replace").strip()
        log.warning("Could not restart %s: %s", AGENT_UNIT, reason)
    else:
        log.info("Restarted %s for the new gateway", AGENT_UNIT)
