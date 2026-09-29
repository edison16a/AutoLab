"""The device identity file, and the setup hand-off file that sits beside it."""

import json
import os
import secrets
import uuid
from pathlib import Path


def load_or_create(path: str | Path) -> dict:
    """Read this Pi's id and secret, creating them once on first run.

    O_EXCL with mode 0600 means the secret is never readable by other users,
    not even for a moment, and two agents starting together cannot both write one.
    """
    path = Path(path).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return json.loads(path.read_text())
    data = {"device_id": str(uuid.uuid4()), "secret": secrets.token_urlsafe(32)}
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(data, f)
    return data


def setup_info_path(credentials_path: str | Path) -> Path:
    """Where the agent leaves its latest claim result for Bluetooth provisioning."""
    return Path(credentials_path).expanduser().with_suffix(".setup.json")


def write_setup_info(credentials_path: str | Path, info: dict) -> None:
    """Replace the hand-off file atomically, readable by the owner only.

    It holds a live claim code, and the provisioning service may read it at
    any moment, so it must never be seen half written.
    """
    info_path = setup_info_path(credentials_path)
    temp = info_path.with_suffix(".tmp")
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as output:
        json.dump(info, output)
    os.replace(temp, info_path)
