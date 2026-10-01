"""Lab mode end to end: the real web UI against a local Supabase.

Start Supabase first with `npx supabase start` (needs Docker). This script
reads its URL and public key from `npx supabase status`, then runs the
gateway, the web app in lab mode and a simulated Pi, and drives two browsers
on one account through tests/e2e/lab.cjs. Each run uses new accounts and a new
device ID, so runs never clash.
"""

import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
for key in ("ALL_PROXY", "all_proxy", "HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"):
    os.environ.pop(key, None)
os.environ["NO_PROXY"] = os.environ["no_proxy"] = "localhost,127.0.0.1"


def local_supabase() -> tuple[str, str]:
    """The local stack's API URL and anon key, or the SUPABASE_URL and SUPABASE_ANON_KEY given."""
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_ANON_KEY")
    if url and key:
        return url, key
    status = subprocess.run(
        ["npx", "--yes", "supabase", "status", "-o", "json"], cwd=ROOT, capture_output=True, text=True
    )
    if status.returncode:
        sys.exit("Local Supabase isn't running. Start it with: npx supabase start")
    info = json.loads(status.stdout[status.stdout.index("{") :])
    return info["API_URL"], info["ANON_KEY"]


processes = []


def start(args, cwd, env=None):
    p = subprocess.Popen(args, cwd=cwd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    processes.append(p)
    return p


def wait_for(*urls, tries=240):
    for _ in range(tries):
        try:
            if all(httpx.get(url).is_success for url in urls):
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    raise RuntimeError("Services did not start")


try:
    supabase_url, anon_key = local_supabase()
    with tempfile.TemporaryDirectory() as d:
        device = str(uuid.uuid4())
        cred = Path(d) / "credentials.json"
        cred.write_text(json.dumps({"device_id": device, "secret": "test-only-secret-never-use-in-production"}))
        start([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"], ROOT / "services/gateway")
        # Dev server, so the demo mode production build in .next stays as it is.
        web = {
            **os.environ,
            "NEXT_PUBLIC_AUTOLAB_MODE": "lab",
            "NEXT_PUBLIC_SUPABASE_URL": supabase_url,
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon_key,
        }
        start(["node", "../../node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"], ROOT / "apps/web", web)
        wait_for("http://127.0.0.1:8000/health", "http://127.0.0.1:3000/login")
        start(
            [sys.executable, "-m", "autolab_agent.main", "--gateway", "ws://127.0.0.1:8000", "--simulate", "--credentials", str(cred)],
            ROOT / "devices/raspberry-pi",
        )
        env = {**os.environ, "TEST_DEVICE_ID": device}
        if subprocess.run(["node", "tests/e2e/lab.cjs"], cwd=ROOT, env=env, check=False).returncode:
            raise RuntimeError("Lab mode browser checks failed")
finally:
    for p in processes:
        p.terminate()
    for p in processes:
        try:
            _, err = p.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            p.kill()
            _, err = p.communicate()
        if p.returncode not in (0, -15) and err:
            print(err.decode()[-3000:])
