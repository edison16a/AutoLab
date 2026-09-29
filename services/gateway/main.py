"""Single-process, bounded-memory imaging gateway. No image history in demo mode."""

import asyncio
from contextlib import asynccontextmanager, suppress

from autolab_gateway import http_routes, socket_routes
from autolab_gateway.config import ORIGINS
from autolab_gateway.protocol import pack, unpack  # noqa: F401 (tests use these)
from autolab_gateway.sweeper import sweep
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(sweep())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="Autolab gateway", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(http_routes.router)
app.include_router(socket_routes.router)
