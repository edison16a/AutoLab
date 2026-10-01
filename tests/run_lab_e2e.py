"""Lab mode end to end: the real web UI and a simulated Pi against a local Supabase.

Start Supabase first with `npx supabase start` (needs Docker). This script
reads its URL and public key from `npx supabase status`, runs the web app in
lab mode and a simulated Pi in lab mode, and drives the browser through
tests/e2e/lab.cjs. The Pi signs in to Supabase by itself, the same way a real
one does after Bluetooth setup. Each run uses new accounts and a new Pi.
"""

import json
import os
import subprocess
import sys
import tempfile
import time
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
    status = subprocess.run(["npx", "--yes", "supabase", "status", "-o", "json"], cwd=ROOT, capture_output=True, text=True)
    if status.returncode:
        sys.exit("Local Supabase isn't running. Start it with: npx supabase start")
    info = json.loads(status.stdout[status.stdout.index("{") :])
    return info["API_URL"], info["ANON_KEY"]


processes = []


def start(args, cwd, env=None, out=subprocess.DEVNULL, err=subprocess.PIPE):
    p = subprocess.Popen(args, cwd=cwd, env=env, stdout=out, stderr=err)
    processes.append(p)
    return p


def wait_until(check, what, tries=240):
    for _ in range(tries):
        try:
            if check():
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    raise RuntimeError(f"{what} did not start")


try:
    supabase_url, anon_key = local_supabase()
    with tempfile.TemporaryDirectory() as d:
        web = {**os.environ, "NEXT_PUBLIC_AUTOLAB_MODE": "lab", "NEXT_PUBLIC_SUPABASE_URL": supabase_url, "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon_key}
        # Dev server, so the demo mode production build in .next stays as it is.
        start(["node", "../../node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"], ROOT / "apps/web", web)
        wait_until(lambda: httpx.get("http://127.0.0.1:3000/login").is_success, "The web app")
        printed = Path(d) / "agent.out"
        with printed.open("w") as out:
            agent = start(
                [sys.executable, "-m", "autolab_agent.main", "--simulate", "--credentials", str(Path(d) / "credentials.json"),
                 "--supabase-url", supabase_url, "--supabase-key", anon_key],
                # Its log goes in the same file, so a long run can't fill a pipe and stall it.
                ROOT / "devices/raspberry-pi", out=out, err=subprocess.STDOUT,
            )
            wait_until(lambda: "Setup code:" in printed.read_text(), "The Pi")
        code = printed.read_text().split("Setup code:")[1].split()[0]
        env = {**os.environ, "TEST_SETUP_CODE": code, "TEST_PI_PID": str(agent.pid)}
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
