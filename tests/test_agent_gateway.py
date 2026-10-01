"""Which gateway addresses the Pi agent will dial."""

import pytest

from autolab_agent.endpoints import allowed_gateway


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
