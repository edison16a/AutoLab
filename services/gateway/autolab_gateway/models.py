"""Schemas for everything the gateway accepts from outside, validated at the edge."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class ComponentReport(BaseModel):
    """One hardware component in a Pi heartbeat.

    Viewers render these as they arrive, so unknown fields, NaN and infinity are
    rejected rather than passed through to the browser.
    """

    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    id: str = Field(pattern=r"^[a-z0-9_]{1,50}$")
    installed: bool
    online: bool = False
    status: str = Field(max_length=80)
    telemetry: dict[str, str | float | bool] | None = None
    lastUpdated: str | None = None


class Registration(BaseModel):
    device_id: uuid.UUID
    secret: str = Field(min_length=32, max_length=256)


class Claim(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")
    name: str = Field(min_length=1, max_length=80)


class Rename(BaseModel):
    name: str = Field(min_length=1, max_length=80)
