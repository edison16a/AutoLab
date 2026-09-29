"""Uvicorn entry point: `uvicorn main:app`, run from services/gateway.

The Dockerfile, compose.yaml, CI and the docs all start the gateway this way,
so this file stays a thin shim. The gateway itself lives in autolab_gateway.
"""

from autolab_gateway.app import app

__all__ = ["app"]
