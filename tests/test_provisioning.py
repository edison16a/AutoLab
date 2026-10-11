"""Bluetooth setup framing and validation, tested without a radio."""

import json

import pytest

from autolab_agent.provisioning import ProvisioningSession


def framed(**changes):
    return (
        json.dumps(
            {
                "ssid": "Autolab Wi-Fi",
                "password": "correct password",
                "pin": "123456",
                **changes,
            }
        )
        + "\n"
    ).encode()


def test_ble_chunks_and_peer_isolation():
    session = ProvisioningSession("id", "123456")
    data = framed()
    session.receive("other", b"{")
    result = None
    for offset in range(0, len(data), 20):
        result = session.receive("browser", data[offset : offset + 20])
    assert result == ("Autolab Wi-Fi", "correct password")
    assert session.authorized_peer == "browser"
    assert session.busy
    assert "password" not in json.dumps(session.status)


def test_wrong_pin_lockout():
    session = ProvisioningSession("id", "123456")
    for _ in range(5):
        with pytest.raises(ValueError, match="incorrect"):
            session.receive("browser", framed(pin="000000"))
    with pytest.raises(ValueError, match="Too many"):
        session.receive("browser", framed())


def test_expired_and_oversized_requests():
    session = ProvisioningSession("id", "123456", ttl=-1)
    with pytest.raises(ValueError, match="expired"):
        session.receive("browser", framed())
    session = ProvisioningSession("id", "123456")
    for _ in range(4):
        session.receive("browser", b"x" * 512)
    with pytest.raises(ValueError, match="too large"):
        session.receive("browser", b"x")
    assert "browser" not in session.buffers


@pytest.mark.parametrize(
    "changes",
    [{"ssid": ""}, {"ssid": "é" * 17}, {"password": "short"}, {"ssid": "name\x00"}],
)
def test_invalid_network_parameters(changes):
    session = ProvisioningSession("id", "123456")
    with pytest.raises(ValueError):
        session.receive("browser", framed(**changes))
    assert not session.busy


@pytest.mark.parametrize("wifi", [{}, {"ssid": "", "password": ""}])
def test_no_wifi_details_keeps_the_current_wifi(wifi):
    session = ProvisioningSession("id", "123456")
    request = (json.dumps({"pin": "123456", **wifi}) + "\n").encode()
    assert session.receive("browser", request) == ("", "")
    assert session.busy


@pytest.mark.parametrize(
    "wifi",
    [
        {"ssid": "Autolab Wi-Fi"},
        {"password": "correct password"},
        {"ssid": "Autolab Wi-Fi", "password": ""},
        {"ssid": "", "password": "correct password"},
    ],
)
def test_a_wifi_name_or_password_alone_is_rejected(wifi):
    session = ProvisioningSession("id", "123456")
    request = (json.dumps({"pin": "123456", **wifi}) + "\n").encode()
    with pytest.raises(ValueError, match="both the Wi-Fi name and password"):
        session.receive("browser", request)
    assert not session.busy
    assert session.attempts == 0


def test_status_says_whether_the_pi_is_online_and_where():
    session = ProvisioningSession("id", "123456")
    assert session.report() == {"state": "ready", "device_id": "id", "online": False, "wifi_ssid": None}
    session.online, session.wifi_ssid = True, "Edison"
    session.status = {"state": "error", "device_id": "id", "message": "x"}
    assert session.report()["online"] is True
    assert session.report()["wifi_ssid"] == "Edison"
    # Adding the facts never changes the status itself.
    assert "online" not in session.status


def test_gateway_is_optional():
    session = ProvisioningSession("id", "123456")
    session.receive("browser", framed())
    assert session.gateway is None


@pytest.mark.parametrize(
    "gateway",
    [
        "ws://192.168.1.20:8000",
        "ws://10.0.0.7",
        "ws://172.20.3.4:8000/",
        "ws://lab-computer.local:8000",
        "ws://localhost:8000",
        "wss://gateway.example.com",
        "wss://gateway.example.com:443",
    ],
)
def test_lab_station_hands_over_its_gateway(gateway):
    session = ProvisioningSession("id", "123456")
    assert session.receive("browser", framed(gateway=gateway))
    assert session.gateway == gateway


@pytest.mark.parametrize(
    "gateway",
    [
        "",
        8000,
        "192.168.1.20:8000",
        "http://192.168.1.20:8000",
        "ws://8.8.8.8:8000",
        "ws://gateway.example.com:8000",
        "ws://192.168.1.20:8000/ws/device",
        "ws://192.168.1.20:8000?next=1",
        "wss://gateway.example.com#top",
        "ws://admin:secret@192.168.1.20:8000",
        "ws://192.168.1.20:0",
        "ws://192.168.1.20:65536",
        "ws://192.168.1.20 :8000",
        "ws://192.168.1.20:8000\n",
        "ws://-lab.local:8000",
        "ws://lab..local:8000",
        "ws://[::1]:8000",
        "wss://" + "a" * 63 + "." + "b" * 63 + "." + "c" * 63 + ".example",
    ],
)
def test_invalid_gateway_is_rejected(gateway):
    session = ProvisioningSession("id", "123456")
    with pytest.raises(ValueError, match="Gateway must be"):
        session.receive("browser", framed(gateway=gateway))
    assert not session.busy
    assert session.attempts == 0


def test_longest_request_still_fits_the_frame():
    session = ProvisioningSession("id", "123456")
    gateway = "wss://" + "a" * 63 + "." + "b" * 63 + "." + "c" * 62 + ".lab"
    request = framed(ssid="é" * 16, password="é" * 63, gateway=gateway)
    assert len(gateway) == 200
    result = None
    for offset in range(0, len(request), 20):
        result = session.receive("browser", request[offset : offset + 20])
    assert result and session.gateway == gateway


ANON_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl"


def test_lab_mode_hands_over_the_supabase_project():
    session = ProvisioningSession("id", "123456")
    assert session.receive("browser", framed(supabase_url="https://abc.supabase.co/", supabase_key=ANON_KEY))
    assert session.supabase == ("https://abc.supabase.co", ANON_KEY)


@pytest.mark.parametrize(
    "url, key",
    [
        ("http://abc.supabase.co", ANON_KEY),  # plain http across the internet
        ("https://abc.supabase.co/rest/v1", ANON_KEY),  # a path
        ("https://user:pw@abc.supabase.co", ANON_KEY),  # a login
        ("https://abc.supabase.co", "has spaces in it, not a key"),
        ("https://abc.supabase.co", None),  # half the settings
        (None, ANON_KEY),
    ],
)
def test_bad_supabase_settings_are_rejected(url, key):
    session = ProvisioningSession("id", "123456")
    with pytest.raises(ValueError, match="Supabase settings"):
        session.receive("browser", framed(supabase_url=url, supabase_key=key))
    assert session.supabase is None


def test_a_local_test_project_may_use_plain_http():
    session = ProvisioningSession("id", "123456")
    assert session.receive("browser", framed(supabase_url="http://192.168.1.20:54321", supabase_key=ANON_KEY))


def test_a_lab_request_still_fits_the_frame():
    session = ProvisioningSession("id", "123456")
    url = "https://" + "a" * 40 + ".supabase.co"
    request = framed(ssid="é" * 16, password="é" * 63, supabase_url=url, supabase_key="k" * 900)
    assert len(request) <= 2048
    result = None
    for offset in range(0, len(request), 20):
        result = session.receive("browser", request[offset : offset + 20])
    assert result and session.supabase == (url, "k" * 900)
