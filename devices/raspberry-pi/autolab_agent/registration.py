"""Cloud mode: register this Pi with the gateway and show its claim code."""

import time

import httpx

from .credentials import write_setup_info
from .endpoints import http_base


async def register(gateway: str, creds: dict, credentials_path: str) -> None:
    """Register on every start, which also issues a fresh claim code if unclaimed.

    The local provisioning service reads the saved, short-lived result instead
    of registering again, which would replace and invalidate this code.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            http_base(gateway) + "/devices/register",
            json={"device_id": creds["device_id"], "secret": creds["secret"]},
        )
        r.raise_for_status()
        result = r.json()
        write_setup_info(
            credentials_path,
            {
                **result,
                "device_id": creds["device_id"],
                "created_at": time.time(),
                "gateway": gateway,
            },
        )
        print(
            "Already claimed"
            if result.get("claimed")
            else f"Pairing code: {result['code']} (valid for 10 minutes)",
            flush=True,
        )
