"""Which gateway the Pi agent dials, and which addresses it will dial at all."""

import pytest

from autolab_agent.cli import build_parser
from autolab_agent.endpoints import allowed_gateway
from autolab_agent.settings import resolve_gateway, save_gateway

FLAG = "wss://typed.example.com"
SAVED = "ws://192.168.1.20:8000"
ENV = "wss://env.example.com"


@pytest.fixture
def credentials(tmp_path, monkeypatch):
    monkeypatch.delenv("AUTOLAB_GATEWAY", raising=False)
    return tmp_path / "credentials.json"


def test_flag_beats_the_saved_file_and_env(credentials, monkeypatch):
    monkeypatch.setenv("AUTOLAB_GATEWAY", ENV)
    save_gateway(credentials, SAVED)
    assert resolve_gateway(FLAG, credentials) == FLAG


def test_saved_file_beats_env(credentials, monkeypatch):
    monkeypatch.setenv("AUTOLAB_GATEWAY", ENV)
    save_gateway(credentials, SAVED)
    assert resolve_gateway(None, credentials) == SAVED


def test_env_then_the_default(credentials, monkeypatch):
    assert resolve_gateway(None, credentials) == "ws://localhost:8000"
    monkeypatch.setenv("AUTOLAB_GATEWAY", ENV)
    assert resolve_gateway(None, credentials) == ENV


def test_a_broken_saved_file_falls_back_to_env(credentials, monkeypatch):
    monkeypatch.setenv("AUTOLAB_GATEWAY", ENV)
    (credentials.parent / "gateway.json").write_text('{"gateway": "ws://8.8.8.8"}')
    assert resolve_gateway(None, credentials) == ENV


def test_the_flag_has_no_default_so_the_order_holds(monkeypatch):
    monkeypatch.setenv("AUTOLAB_GATEWAY", ENV)
    assert build_parser().parse_args([]).gateway is None


@pytest.mark.parametrize(
    "gateway",
    [
        "ws://localhost:8000",
        "ws://127.0.0.1:8000",
        "ws://192.168.1.20:8000",
        "ws://10.0.0.7:8000",
        "ws://172.20.3.4:8000",
        "ws://lab-computer.local:8000",
        "wss://gateway.example.com",
        "wss://gateway.example.com/autolab",
    ],
)
def test_wss_anywhere_and_ws_on_the_local_network(gateway):
    assert allowed_gateway(gateway)


@pytest.mark.parametrize(
    "gateway",
    [
        "ws://gateway.example.com:8000",
        "ws://8.8.8.8:8000",
        "ws://172.32.0.1:8000",
        "ws://localhost.example.com:8000",
        "http://192.168.1.20:8000",
        "wss://",
        "ws://[::1",
    ],
)
def test_plain_ws_never_leaves_the_local_network(gateway):
    assert not allowed_gateway(gateway)
