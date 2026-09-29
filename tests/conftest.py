"""Shared pytest setup for the Python services.

The gateway and the Pi agent are not installed packages, so their source roots
go on sys.path here, once, instead of at the top of every test module.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
for source in ("services/gateway", "devices/raspberry-pi"):
    path = str(ROOT / source)
    if path not in sys.path:
        sys.path.insert(0, path)


@pytest.fixture
def client(monkeypatch):
    """A demo-mode gateway with empty rooms and fresh rate limits.

    Imported lazily so the Pi tests still run where only the agent's
    dependencies are installed.
    """
    from autolab_gateway import state
    from autolab_gateway.app import app
    from fastapi.testclient import TestClient

    monkeypatch.setattr(state, "cloud", None)
    state.rooms.clear()
    state.limits.clear()
    with TestClient(app) as c:
        yield c
