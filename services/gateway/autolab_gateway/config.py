"""Deploy settings, read once from the environment when the gateway starts.

Only values a deploy is expected to change live here. Protocol limits and
timeouts stay next to the code that enforces them.
"""

import os

from dotenv import load_dotenv

load_dotenv()

# demo keeps nothing: no accounts, no storage, no image history.
# cloud turns on Supabase auth, ownership checks and persistence.
MODE = os.getenv("AUTOLAB_MODE", "demo")
if MODE not in ("demo", "cloud"):
    raise RuntimeError("AUTOLAB_MODE must be demo or cloud")

# One list serves CORS and the WebSocket origin check. Browsers do not apply CORS
# to sockets, so the socket route has to enforce it by hand. The default covers
# local development and the hosted site, so a lab computer needs no settings.
DEFAULT_ORIGINS = "http://localhost:3000,https://auto-lab-web.vercel.app"
ORIGINS = [
    origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
]

# What /lan reports instead of the detected addresses, as comma separated
# ws:// URLs. For a gateway that cannot see the computer's real LAN address,
# like one inside Docker.
LAN_URLS = [url.strip() for url in os.getenv("LAN_URLS", "").split(",") if url.strip()]
