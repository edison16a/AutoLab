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
# to sockets, so the socket route has to enforce it by hand.
ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]
