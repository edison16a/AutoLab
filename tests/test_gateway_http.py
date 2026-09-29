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


def test_image_list_is_not_found_in_demo_mode(client):
    # Used to fail with a 500 because the cloud adapter was read before the mode check.
    response = client.get("/devices/7b2d5f7c-3a6e-4b43-9c52-7c6a1f0f9d10/images")
    assert response.status_code == 404
