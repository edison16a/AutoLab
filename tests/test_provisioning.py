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
