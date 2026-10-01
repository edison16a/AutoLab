"""The Pi's own Supabase login, saved as supabase.json beside the credentials.

The Pi signs in as an anonymous user once, during setup. Its owner then links
that user to their Autolab, and row level security gives it that Autolab and
nothing else. Only the public anon key is ever used. The file keeps the
refresh token, which Supabase replaces on every refresh, so each new one is
saved straight away.
"""

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import httpx

from ..settings import write_private_json

# Refresh this long before the access token runs out.
REFRESH_MARGIN = 120


class SignInError(RuntimeError):
    """Supabase refused the sign in, with its reason."""


@dataclass
class Session:
    url: str
    key: str
    user_id: str
    refresh_token: str
    access_token: str = ""
    expires_at: float = 0.0

    def headers(self) -> dict[str, str]:
        return {"apikey": self.key, "Authorization": f"Bearer {self.access_token}"}

    @property
    def stale(self) -> bool:
        return time.time() > self.expires_at - REFRESH_MARGIN


def session_path(credentials_path: str | Path) -> Path:
    return Path(credentials_path).expanduser().parent / "supabase.json"


def load(credentials_path: str | Path) -> Session | None:
    """The saved login, or None when there is none yet."""
    try:
        data = json.loads(session_path(credentials_path).read_text())
        return Session(data["url"], data["key"], data["user_id"], data["refresh_token"])
    except FileNotFoundError:
        return None
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise SignInError(f"supabase.json is unreadable ({type(exc).__name__})") from exc


def save(credentials_path: str | Path, session: Session) -> None:
    # The access token lasts an hour and is fetched again on start, so only the long lived parts are kept.
    data = {k: v for k, v in asdict(session).items() if k not in ("access_token", "expires_at")}
    write_private_json(session_path(credentials_path), data)


async def sign_in(client: httpx.AsyncClient, url: str, key: str) -> Session:
    """A new anonymous user. Fails when the project has anonymous sign ins turned off."""
    response = await client.post(f"{url}/auth/v1/signup", headers={"apikey": key}, json={"data": {}})
    return _session(url, key, response)


async def refresh(client: httpx.AsyncClient, session: Session) -> Session:
    response = await client.post(
        f"{session.url}/auth/v1/token",
        params={"grant_type": "refresh_token"},
        headers={"apikey": session.key},
        json={"refresh_token": session.refresh_token},
    )
    return _session(session.url, session.key, response)


def _session(url: str, key: str, response: httpx.Response) -> Session:
    try:
        body = response.json()
    except ValueError:
        body = {}
    if response.status_code != 200 or "access_token" not in body:
        reason = body.get("msg") or body.get("error_description") or body.get("message")
        raise SignInError(reason or f"Supabase answered {response.status_code}")
    return Session(
        url, key, body["user"]["id"], body["refresh_token"], body["access_token"],
        time.time() + float(body.get("expires_in", 3600)),
    )
