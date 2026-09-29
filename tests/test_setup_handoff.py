"""The claim hand-off between the running agent and Bluetooth provisioning.

The two processes share only a file, so these tests guard that the agent
writes it where provisioning reads it, and that stale codes are refused.
"""

import asyncio
import time

import pytest

from autolab_agent.credentials import write_setup_info
from autolab_agent.provisioning import handoff

DEVICE = "44444444-2222-4333-8444-555555555555"
GATEWAY = "wss://gateway.example"


def claim(**changes):
    return {
        "code": "123456",
        "device_id": DEVICE,
        "created_at": time.time(),
        "gateway": GATEWAY,
        **changes,
    }


def test_provisioning_reads_the_claim_the_agent_wrote(tmp_path):
    credentials = tmp_path / "credentials.json"
    write_setup_info(credentials, claim())
    info = asyncio.run(handoff.wait_for_claim(DEVICE, GATEWAY, str(credentials)))
    assert info["code"] == "123456"


@pytest.mark.parametrize(
    "changes",
    [{"created_at": time.time() - 600}, {"gateway": "wss://other"}, {"device_id": "x"}],
)
def test_stale_or_foreign_claims_are_refused(tmp_path, monkeypatch, changes):
    async def no_wait(_):
        pass

    monkeypatch.setattr(handoff.asyncio, "sleep", no_wait)
    credentials = tmp_path / "credentials.json"
    write_setup_info(credentials, claim(**changes))
    with pytest.raises(RuntimeError, match="current claim code"):
        asyncio.run(handoff.wait_for_claim(DEVICE, GATEWAY, str(credentials)))
