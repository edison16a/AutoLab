"""After a valid request: Wi-Fi if needed, then the handed over gateway is checked and kept."""

import asyncio
import importlib.util
import json
import logging
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
    """Fake Wi-Fi and a gateway answering /health, recording what the Pi did.

    `now` is what NetworkManager says: online, and the Wi-Fi the Pi is on.
    Each error in `lookup_errors` fails one Wi-Fi lookup, in order.
    """
    seen = {"hosts": [], "repointed": [], "joined": [], "now": (False, None), "lookup_errors": []}

    async def join(bus, ssid, password):
        if "join_error" in seen:
            raise seen["join_error"]
        seen["joined"].append(ssid)

    async def is_online(bus):
        return seen["now"][0]

    async def current_ssid(bus):
        if seen["lookup_errors"]:
            raise seen["lookup_errors"].pop(0)
        return seen["now"][1]

    async def repoint_agent(credentials, gateway):
        seen["repointed"].append(gateway)

    def health(request):
        seen["hosts"].append(f"{request.url.host}:{request.url.port}")
        status = seen.get("status", 200)
        return httpx.Response(status, json={"ok": True, "mode": "demo"})

    real = httpx.AsyncClient
    monkeypatch.setattr(setup_flow, "connect_wifi", join)
    monkeypatch.setattr(setup_flow, "is_online", is_online)
    monkeypatch.setattr(setup_flow, "current_ssid", current_ssid)
    monkeypatch.setattr(setup_flow, "repoint_agent", repoint_agent)
    monkeypatch.setattr(
        setup_flow.httpx,
        "AsyncClient",
        lambda **kw: real(transport=httpx.MockTransport(health), **kw),
    )
    return seen


def run(gateway, ssid="lab", password="password"):
    session = ProvisioningSession("id", "123456")
    session.gateway = gateway
    asyncio.run(setup_flow.provision(session, None, ssid, password, OLD, "demo", "c"))
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


def test_an_unreachable_gateway_is_never_saved(network, caplog):
    network["status"] = 503
    session = run(NEW)
    assert session.status["state"] == "error"
    assert session.status["message"].startswith(
        "The Pi is on Wi-Fi but could not reach the gateway."
    )
    assert "Setup failed reaching the gateway (HTTPStatusError)" in caplog.text
    assert network["repointed"] == []


def test_no_wifi_details_keep_the_wifi_the_pi_is_on(network):
    network["now"] = (True, "Edison")
    session = run(NEW, ssid="", password="")
    assert session.status["state"] == "gateway_connected"
    assert network["joined"] == []
    assert network["repointed"] == [NEW]
    assert session.report()["online"] is True
    assert session.report()["wifi_ssid"] == "Edison"


def test_no_wifi_details_while_offline_asks_for_them(network):
    session = run(NEW, ssid="", password="")
    assert session.report() == {
        "state": "error",
        "device_id": "id",
        "message": "This Autolab isn't on Wi-Fi yet. Enter a Wi-Fi name and password.",
        "online": False,
        "wifi_ssid": None,
    }
    assert network["joined"] == [] and network["hosts"] == []
    assert not session.busy and not session.completed


def test_the_wifi_the_pi_is_on_is_not_joined_again(network):
    # Joining again would drop the connection, and a phone hotspot may not let the Pi back on.
    network["now"] = (True, "lab")
    assert run(NEW).status["state"] == "gateway_connected"
    assert network["joined"] == []


@pytest.mark.parametrize(
    "now",
    [
        (True, "Edison"),  # online on another network
        (True, None),  # online over a cable
        (False, None),  # offline
        (False, "lab"),  # the right name, but not up yet
    ],
)
def test_another_wifi_is_still_joined(network, now):
    network["now"] = now
    assert run(NEW).status["state"] == "gateway_connected"
    assert network["joined"] == ["lab"]


def test_a_failed_join_names_the_network_and_logs_no_secrets(network, caplog):
    caplog.set_level(logging.INFO, logger="setup")
    network["join_error"] = RuntimeError("nmcli: psk wifi-secret-123 rejected")
    session = run(NEW, password="wifi-secret-123")
    assert session.status["message"] == (
        'Could not join "lab". Check the Wi-Fi name and password, then retry.'
    )
    assert "Setup failed joining Wi-Fi (RuntimeError)" in caplog.text
    assert "wifi-secret-123" not in caplog.text and "nmcli" not in caplog.text
    assert "wifi-secret-123" not in json.dumps(session.report())
    assert network["hosts"] == []


def test_a_dbus_error_is_logged_by_its_name(network, caplog):
    class DBusError(Exception):
        type = "org.freedesktop.NetworkManager.Device.Error.ConnectionActivationFailed"

    network["join_error"] = DBusError("details that stay out of the journal")
    run(NEW)
    assert f"Setup failed joining Wi-Fi ({DBusError.type})" in caplog.text
    assert "details" not in caplog.text


def test_a_wifi_lookup_that_fails_is_asked_again_before_any_join(network, caplog):
    network["now"] = (True, "lab")
    network["lookup_errors"] = [RuntimeError("the active connection vanished")]
    assert run(NEW).status["state"] == "gateway_connected"
    assert network["joined"] == []
    assert "Setup failed" not in caplog.text


def test_no_answer_about_the_wifi_leaves_it_alone(network, caplog):
    # Joining the network the Pi is on would drop it, so it never guesses.
    class DBusError(Exception):
        type = "org.freedesktop.DBus.Error.UnknownObject"

    network["now"] = (True, "lab")
    network["lookup_errors"] = [DBusError("gone"), DBusError("gone again")]
    session = run(NEW)
    assert session.status["message"] == (
        "The Pi couldn't tell which Wi-Fi it's on, so it left its Wi-Fi alone. "
        "Retry in a moment."
    )
    assert f"Setup failed checking the Wi-Fi ({DBusError.type})" in caplog.text
    assert network["joined"] == [] and network["hosts"] == []
    assert not session.busy


def test_wifi_that_is_switched_off_says_how_to_switch_it_on(network):
    network["join_error"] = wifi.WifiOff("The Wi-Fi adapter is unavailable")
    message = run(NEW).status["message"]
    assert message.startswith("The Pi's Wi-Fi is switched off")
    assert "sudo raspi-config" in message


def test_a_network_out_of_range_is_a_failed_join(network, caplog):
    network["now"] = (True, "Edison")
    network["join_error"] = wifi.NotInRange("The network is not in the scan list")
    assert run(NEW).status["message"].startswith('Could not join "lab".')
    assert "Setup failed joining Wi-Fi (NotInRange)" in caplog.text


def answers(monkeypatch, online, ssid):
    """Make NetworkManager answer the two questions with these, or raise them."""

    async def ask(answer):
        if answer == "slow":
            await asyncio.sleep(5)
        if isinstance(answer, Exception):
            raise answer
        return answer

    monkeypatch.setattr(setup_flow, "is_online", lambda bus: ask(online))
    monkeypatch.setattr(setup_flow, "current_ssid", lambda bus: ask(ssid))
    monkeypatch.setattr(setup_flow, "NETWORK_CHECK", 0.01)


def test_a_network_check_saves_what_networkmanager_said(monkeypatch):
    answers(monkeypatch, True, "Edison")
    session = ProvisioningSession("id", "123456")
    assert asyncio.run(setup_flow.refresh_network(session, None)) == (True, "Edison")
    assert session.report() == {"state": "ready", "device_id": "id", "online": True, "wifi_ssid": "Edison"}


@pytest.mark.parametrize("problem", [RuntimeError("NetworkManager is not running"), "slow"])
def test_a_network_check_without_an_answer_counts_as_offline(monkeypatch, problem):
    answers(monkeypatch, problem, problem)
    session = ProvisioningSession("id", "123456")
    session.online, session.wifi_ssid = True, "Edison"
    assert asyncio.run(setup_flow.refresh_network(session, None)) == (False, None)
    assert (session.online, session.wifi_ssid) == (False, None)


@pytest.mark.parametrize("problem", [RuntimeError("UnknownObject"), "slow"])
def test_a_failed_wifi_lookup_still_counts_as_online(monkeypatch, problem):
    answers(monkeypatch, True, problem)
    session = ProvisioningSession("id", "123456")
    assert asyncio.run(setup_flow.refresh_network(session, None)) == (True, None)
    assert session.report()["online"] is True


def fake_networkmanager(monkeypatch, state=70, wifi_state=100, active="/active", devices=("/eth0", "/wlan0")):
    """NetworkManager with a cable and a Wi-Fi adapter, the second on Edison."""
    values = {
        (wifi.NM_PATH, "State"): state,
        ("/eth0", "DeviceType"): 1,
        ("/wlan0", "DeviceType"): wifi.DEVICE_TYPE_WIFI,
        ("/wlan0", "ActiveConnection"): active,
        ("/wlan0", "State"): wifi_state,
        ("/active", "Connection"): "/profile",
    }

    class Properties:
        def __init__(self, path):
            self.path = path

        async def call_get(self, interface, name):
            return types.SimpleNamespace(value=values[self.path, name])

    class Manager:
        async def call_get_devices(self):
            return list(devices)

    class Saved:
        async def call_get_settings(self):
            ssid = types.SimpleNamespace(value=b"Edison")
            return {"802-11-wireless": {"ssid": ssid}}

    async def proxy(bus, destination, path, interface):
        if interface == wifi.PROPERTIES:
            return Properties(path)
        return Manager() if interface == wifi.NM else Saved()

    monkeypatch.setattr(wifi, "proxy", proxy)


@pytest.mark.parametrize(
    "changes, expected",
    [
        ({}, (True, "Edison")),
        ({"state": 50}, (True, "Edison")),  # connected without internet, like a lab LAN
        ({"wifi_state": 70}, (True, None)),  # Wi-Fi still getting an address
        ({"active": "/"}, (True, None)),  # online over the cable
        ({"devices": ("/eth0",)}, (True, None)),  # no Wi-Fi adapter at all
        ({"state": 20, "active": "/"}, (False, None)),  # disconnected
        ({"state": 40, "wifi_state": 50}, (False, None)),  # still connecting
    ],
)
def test_networkmanager_says_whether_the_pi_is_online_and_where(monkeypatch, changes, expected):
    fake_networkmanager(monkeypatch, **changes)
    assert (asyncio.run(wifi.is_online(None)), asyncio.run(wifi.current_ssid(None))) == expected


def fake_join(monkeypatch, on="/home", state=100, in_range=True, joining=None):
    """NetworkManager for connect_wifi: Wi-Fi adapter /wlan0, on `on` ("/" for none).

    Returns what NetworkManager was asked to do, in order.
    """
    asked = []

    class Manager:
        async def call_add_and_activate_connection(self, settings, device, specific):
            asked.append(("added", settings))
            return "/new", "/active"

        async def call_activate_connection(self, connection, device, specific):
            asked.append(("back to", connection))

    class Device:
        async def call_get(self, interface, name):
            return types.SimpleNamespace(value=state)

    class Saved:
        async def call_delete(self):
            asked.append("deleted")

    async def proxy(bus, destination, path, interface):
        if path == wifi.NM_PATH:
            return Manager()
        return Device() if path == "/wlan0" else Saved()

    async def wifi_device(bus, manager):
        return "/wlan0", on

    async def seen(bus, device, ssid):
        return in_range

    async def wait(bus, active):
        if joining:
            await joining()

    async def forget(bus, keep):
        pass

    monkeypatch.setattr(wifi, "proxy", proxy)
    monkeypatch.setattr(wifi, "_wifi_device", wifi_device)
    monkeypatch.setattr(wifi, "_in_range", seen)
    monkeypatch.setattr(wifi, "_wait_until_active", wait)
    monkeypatch.setattr(wifi, "_forget_older_profiles", forget)
    monkeypatch.setattr(wifi, "_settings", lambda ssid, password, hidden: {"hidden": hidden})
    return asked


@pytest.mark.parametrize("ending", ["fails", "window closes"])
def test_a_join_that_does_not_finish_puts_the_old_wifi_back(monkeypatch, ending):
    async def joining():
        if ending == "fails":
            raise RuntimeError("Wi-Fi activation failed")
        await asyncio.sleep(60)

    async def window():
        join = asyncio.create_task(wifi.connect_wifi(None, "lab", "password"))
        await asyncio.sleep(0.01)
        # What server.run does when the window ends with a setup under way.
        join.cancel()
        await asyncio.gather(join, return_exceptions=True)

    asked = fake_join(monkeypatch, joining=joining)
    asyncio.run(window())
    assert asked == [("added", {"hidden": False}), "deleted", ("back to", "/home")]


def test_a_pi_on_wifi_never_leaves_it_for_a_network_it_cannot_see(monkeypatch):
    # NetworkManager would drop the current Wi-Fi first, and only then find nothing.
    asked = fake_join(monkeypatch, in_range=False)
    with pytest.raises(wifi.NotInRange):
        asyncio.run(wifi.connect_wifi(None, "lab", "password"))
    assert asked == []


def test_an_offline_pi_tries_a_network_it_cannot_see_as_hidden(monkeypatch):
    asked = fake_join(monkeypatch, on="/", in_range=False)
    asyncio.run(wifi.connect_wifi(None, "lab", "password"))
    assert asked == [("added", {"hidden": True})]


def test_switched_off_wifi_is_reported_before_anything_changes(monkeypatch):
    asked = fake_join(monkeypatch, state=wifi.DEVICE_UNAVAILABLE)
    with pytest.raises(wifi.WifiOff):
        asyncio.run(wifi.connect_wifi(None, "lab", "password"))
    assert asked == []


@pytest.mark.parametrize(
    "ssid, expected",
    [
        ("Lab Wi-Fi", True),
        ("lab wi-fi", False),  # names are case sensitive
        ("Café", True),  # compared as UTF-8 bytes
        ("Edison", False),  # hidden networks show no name
    ],
)
def test_the_scan_list_says_which_networks_are_in_range(monkeypatch, ssid, expected):
    access_points = {"/ap/1": b"Lab Wi-Fi", "/ap/2": "Café".encode(), "/ap/3": b"", "/ap/gone": None}
    scans = []

    class Wireless:
        async def call_request_scan(self, options):
            scans.append(options)

        async def call_get_all_access_points(self):
            return list(access_points)

    class Properties:
        def __init__(self, path):
            self.path = path

        async def call_get(self, interface, name):
            if self.path == "/wlan0":
                return types.SimpleNamespace(value=len(scans))  # LastScan moves once a scan ran
            if access_points[self.path] is None:
                raise RuntimeError("org.freedesktop.DBus.Error.UnknownObject")
            return types.SimpleNamespace(value=access_points[self.path])

    async def proxy(bus, destination, path, interface):
        return Wireless() if interface == wifi.WIRELESS else Properties(path)

    async def no_wait(seconds):
        pass

    monkeypatch.setattr(wifi, "proxy", proxy)
    monkeypatch.setattr(wifi.asyncio, "sleep", no_wait)
    assert asyncio.run(wifi._in_range(None, "/wlan0", ssid)) is expected
    assert scans == [{}]


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


def run_lab(monkeypatch, sign_in, ssid="lab", password="password"):
    monkeypatch.setattr(setup_flow, "sign_in_pi", sign_in)
    session = ProvisioningSession("id", "123456")
    session.supabase = ("https://abc.supabase.co", "public-key")
    asyncio.run(setup_flow.provision(session, None, ssid, password, OLD, "demo", "c"))
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


def test_supabase_says_why_it_refused_the_pi(network, monkeypatch, caplog):
    from autolab_agent.lab.session import SignInError

    async def sign_in(*args):
        raise SignInError("Anonymous sign-ins are disabled")

    session = run_lab(monkeypatch, sign_in)
    assert session.status["state"] == "error"
    assert session.status["message"] == "Supabase refused the Pi's login: Anonymous sign-ins are disabled"
    assert "Setup failed signing in to Supabase (SignInError)" in caplog.text


def test_a_network_failure_in_lab_mode_points_at_the_internet(network, monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="setup")

    async def sign_in(*args):
        raise httpx.ConnectError("no route to https://abc.supabase.co with public-key")

    session = run_lab(monkeypatch, sign_in, password="wifi-secret-123")
    assert session.status["message"] == (
        "The Pi is on Wi-Fi but could not reach Supabase. Check that this network "
        "reaches the internet, then retry."
    )
    assert "Setup failed signing in to Supabase (ConnectError)" in caplog.text
    for secret in ["wifi-secret-123", "public-key", "no route"]:
        assert secret not in caplog.text


def test_lab_mode_on_the_wifi_it_has_signs_straight_in(network, monkeypatch):
    network["now"] = (True, "Edison")

    async def sign_in(*args):
        return "pi-login"

    session = run_lab(monkeypatch, sign_in, ssid="", password="")
    assert session.report() == {
        "state": "gateway_connected",
        "device_id": "id",
        "mode": "lab",
        "agent_id": "pi-login",
        "online": True,
        "wifi_ssid": "Edison",
    }
    assert network["joined"] == []
