"""Lab mode setup: give the Pi a fresh Supabase login and hand it to the camera agent.

A new login on every setup means a Pi passed to someone else stops working
for its previous owner. The new owner links the new login to their Autolab.
"""

import httpx

from ..lab import session as auth
from .repoint import restart_agent


async def sign_in_pi(credentials_path: str, url: str, key: str) -> str:
    """Signs in, saves the login where the agent reads it, restarts the agent. Returns the login's id."""
    async with httpx.AsyncClient(timeout=20) as client:
        session = await auth.sign_in(client, url, key)
    auth.save(credentials_path, session)
    await restart_agent()
    return session.user_id
