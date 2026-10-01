"""GET /lan: the lab station's own addresses, readable by the web app's origin."""

import socket

from autolab_gateway import http_routes, lan

WEB = "http://localhost:3000"


def test_lan_lists_websocket_urls_for_the_web_origin(client, monkeypatch):
    found = ["192.168.1.20", "10.0.0.5"]
    monkeypatch.setattr(http_routes, "lan_addresses", lambda: found)
    response = client.get("/lan", headers={"Origin": WEB})
    assert response.json() == {
        "urls": ["ws://192.168.1.20:8000", "ws://10.0.0.5:8000"]
    }
    assert response.headers["access-control-allow-origin"] == WEB


def test_lan_uses_the_port_the_browser_called(client, monkeypatch):
    monkeypatch.setattr(http_routes, "lan_addresses", lambda: ["192.168.1.20"])
    assert client.get("http://testserver:9000/lan").json() == {
        "urls": ["ws://192.168.1.20:9000"]
    }


def test_a_hosted_web_app_may_reach_the_local_gateway(client):
    # Chrome sends this preflight before a public page calls a private address.
    response = client.options(
        "/lan",
        headers={
            "Origin": WEB,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Private-Network": "true",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-private-network"] == "true"


def test_real_lookup_skips_loopback():
    addresses = lan.lan_addresses()
    assert all(not ip.startswith("127.") for ip in addresses)


def test_offline_computer_gets_an_empty_list(monkeypatch):
    def offline(*args, **kwargs):
        raise OSError("Network is unreachable")

    monkeypatch.setattr(socket, "socket", offline)
    monkeypatch.setattr(socket, "gethostbyname_ex", offline)
    monkeypatch.setattr(socket, "if_nameindex", offline)
    assert lan.lan_addresses() == []


def test_lan_urls_setting_replaces_detection(client, monkeypatch):
    # Inside Docker the gateway only sees the container's own address.
    monkeypatch.setattr(http_routes, "LAN_URLS", ["ws://lab-computer.local:8000"])
    monkeypatch.setattr(http_routes, "lan_addresses", lambda: ["172.18.0.2"])
    assert client.get("/lan").json() == {"urls": ["ws://lab-computer.local:8000"]}
