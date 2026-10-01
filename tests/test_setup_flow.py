"""After a valid request: the Pi checks the handed over gateway, then keeps it."""

import asyncio
import importlib.util
import sys
import types

import httpx
import pytest

from autolab_agent.provisioning import ProvisioningSession

# wifi.py needs dbus-next, which only the Pi's provisioning install has. These
# tests replace Wi-Fi anyway, so a stand-in module is enough to import the flow.
if importlib.util.find_spec("dbus_next") is None:
    sys.modules["dbus_next"] = types.ModuleType("dbus_next")
    sys.modules["dbus_next"].Variant = None

from autolab_agent.provisioning import setup_flow  # noqa: E402

OLD = "ws://192.168.1.10:8000"
NEW = "ws://192.168.1.20:8000"


@pytest.fixture
def network(monkeypatch):
    """Fake Wi-Fi and a gateway answering /health, recording what the Pi did."""
    seen = {"hosts": [], "repointed": []}

    async def join(bus, ssid, password):
        pass

    async def repoint_agent(credentials, gateway):
        seen["repointed"].append(gateway)

    def health(request):
        seen["hosts"].append(f"{request.url.host}:{request.url.port}")
        status = seen.get("status", 200)
        return httpx.Response(status, json={"ok": True, "mode": "demo"})

    real = httpx.AsyncClient
    monkeypatch.setattr(setup_flow, "connect_wifi", join)
    monkeypatch.setattr(setup_flow, "repoint_agent", repoint_agent)
    monkeypatch.setattr(
        setup_flow.httpx,
        "AsyncClient",
        lambda **kw: real(transport=httpx.MockTransport(health), **kw),
    )
    return seen


def run(gateway):
    session = ProvisioningSession("id", "123456")
    session.gateway = gateway
    asyncio.run(setup_flow.provision(session, None, "lab", "password", OLD, "demo", "c"))
    return session


def test_the_pi_checks_and_keeps_the_handed_over_gateway(network):
    session = run(NEW)
    assert session.status["state"] == "gateway_connected"
    assert network["hosts"] == ["192.168.1.20:8000"]
    assert network["repointed"] == [NEW]


def test_without_a_handed_over_gateway_the_old_one_is_used(network):
    assert run(None).status["state"] == "gateway_connected"
    assert network["hosts"] == ["192.168.1.10:8000"]
    assert network["repointed"] == []


def test_an_unreachable_gateway_is_never_saved(network):
    network["status"] = 503
    assert run(NEW).status["state"] == "error"
    assert network["repointed"] == []
