"""The FastAPI application: CORS, both routers and the background sweeper."""

import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import http_routes, socket_routes
from .config import ORIGINS
from .sweeper import sweep


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run the sweeper for exactly as long as the app is serving."""
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
    # A hosted web app reaching the gateway on the lab computer is a public page
    # calling a private address. Chrome asks first, and the origin check still applies.
    allow_private_network=True,
)
app.include_router(http_routes.router)
app.include_router(socket_routes.router)
