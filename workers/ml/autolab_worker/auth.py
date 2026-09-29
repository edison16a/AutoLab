"""The access token the worker presents in its hello."""

import os

import httpx


async def access_token(mode: str) -> str:
    """Sign in fresh on every reconnect in cloud mode, since tokens expire.

    The worker signs in as the account that owns the device, never with a
    service key. Otherwise it sends AUTOLAB_ACCESS_TOKEN as given. The gateway
    ignores tokens in demo mode.
    """
    token = os.getenv("AUTOLAB_ACCESS_TOKEN", "")
    if mode == "cloud" and os.getenv("AUTOLAB_EMAIL"):
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                os.environ["SUPABASE_URL"] + "/auth/v1/token?grant_type=password",
                headers={"apikey": os.environ["SUPABASE_ANON_KEY"]},
                json={
                    "email": os.environ["AUTOLAB_EMAIL"],
                    "password": os.environ["AUTOLAB_PASSWORD"],
                },
            )
            r.raise_for_status()
            token = r.json()["access_token"]
    return token
