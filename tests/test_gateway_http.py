"""Packet validation, demo-mode HTTP routes and the uvicorn entry point."""

import pytest

from autolab_gateway.protocol import unpack


def test_invalid_packets_and_cloud_disabled(client):
    with pytest.raises(ValueError):
        unpack(b"abcd")
    assert client.get("/devices").status_code == 404
    assert client.get("/health").json()["mode"] == "demo"


def test_entry_point_serves_the_package_app():
    # Docker, compose, CI and the docs all run `uvicorn main:app`.
    import main
    from autolab_gateway.app import app

    assert main.app is app
