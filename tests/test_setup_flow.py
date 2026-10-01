"""After a valid request: Wi-Fi, then the handed over gateway is checked and kept."""

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

from autolab_agent.provisioning import setup_flow, wifi  # noqa: E402

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


def test_older_autolab_wifi_profiles_are_forgotten(monkeypatch):
    profiles = {"/new": "Autolab Wi-Fi", "/old": "Autolab Wi-Fi", "/home": "Home"}
    deleted = []

    class Settings:
        async def call_list_connections(self):
            return list(profiles)

    class Saved:
        def __init__(self, path):
            self.path = path

        async def call_get_settings(self):
            name = types.SimpleNamespace(value=profiles[self.path])
            return {"connection": {"id": name}}

        async def call_delete(self):
            deleted.append(self.path)

    async def proxy(bus, destination, path, interface):
        return Settings() if interface.endswith(".Settings") else Saved(path)

    monkeypatch.setattr(wifi, "proxy", proxy)
    asyncio.run(wifi._forget_older_profiles(None, "/new"))
    assert deleted == ["/old"]


def run_lab(monkeypatch, sign_in):
    monkeypatch.setattr(setup_flow, "sign_in_pi", sign_in)
    session = ProvisioningSession("id", "123456")
    session.supabase = ("https://abc.supabase.co", "public-key")
    asyncio.run(setup_flow.provision(session, None, "lab", "password", OLD, "demo", "c"))
    return session


def test_lab_mode_signs_the_pi_in_and_reports_its_login(network, monkeypatch):
    async def sign_in(credentials, url, key):
        assert (credentials, url, key) == ("c", "https://abc.supabase.co", "public-key")
        return "pi-login"

    session = run_lab(monkeypatch, sign_in)
    assert session.status == {"state": "gateway_connected", "device_id": "id", "mode": "lab", "agent_id": "pi-login"}
    assert session.completed and not session.busy
    # Lab mode never touches a gateway.
    assert network["hosts"] == [] and network["repointed"] == []


def test_supabase_says_why_it_refused_the_pi(network, monkeypatch):
    from autolab_agent.lab.session import SignInError

    async def sign_in(*args):
        raise SignInError("Anonymous sign-ins are disabled")

    session = run_lab(monkeypatch, sign_in)
    assert session.status["state"] == "error"
    assert session.status["message"] == "Supabase refused the Pi's login: Anonymous sign-ins are disabled"


def test_a_network_failure_in_lab_mode_points_at_the_internet(network, monkeypatch):
    async def sign_in(*args):
        raise httpx.ConnectError("no route")

    session = run_lab(monkeypatch, sign_in)
    assert session.status["message"] == setup_flow.LAB_FAILURE
