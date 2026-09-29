"""Launch all components in one test environment, then exercise the real web UI."""

import json
import hashlib
import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
if not os.environ.get("DETECTION_TEST_IMAGE"):
    fixture = ROOT / ".test-assets" / "city-streets.jpg"
    fixture.parent.mkdir(exist_ok=True)
    expected = "23138717208f27df044467fe56d660887e25072490f1ba0c80871860de836cc0"
    if not fixture.exists() or hashlib.sha256(fixture.read_bytes()).hexdigest() != expected:
        response = httpx.get("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/city-streets.jpg", follow_redirects=True, timeout=60)
        response.raise_for_status()
        if hashlib.sha256(response.content).hexdigest() != expected:
            raise RuntimeError("Detection fixture checksum mismatch")
        fixture.write_bytes(response.content)
    os.environ["DETECTION_TEST_IMAGE"] = str(fixture)
os.environ["NO_PROXY"] = "localhost,127.0.0.1"
os.environ["no_proxy"] = "localhost,127.0.0.1"
for key in (
    "ALL_PROXY",
    "all_proxy",
    "HTTPS_PROXY",
    "https_proxy",
    "HTTP_PROXY",
    "http_proxy",
):
    os.environ.pop(key, None)
processes = []


def start(args, cwd, env=None):
    p = subprocess.Popen(
        args, cwd=cwd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
    )
    processes.append(p)
    return p


try:
    with tempfile.TemporaryDirectory() as d:
        device = str(uuid.uuid4())
        cred = Path(d) / "credentials.json"
        cred.write_text(
            json.dumps(
                {
                    "device_id": device,
                    "secret": "test-only-secret-never-use-in-production",
                }
            )
        )
        start(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            ROOT / "services/gateway",
        )
        start(
            [
                "node",
                "../../node_modules/next/dist/bin/next",
                "start",
                "--hostname",
                "127.0.0.1",
            ],
            ROOT / "apps/web",
        )
        for _ in range(80):
            try:
                if (
                    httpx.get("http://127.0.0.1:8000/health").is_success
                    and httpx.get("http://127.0.0.1:3000").is_success
                ):
                    break
            except httpx.HTTPError:
                pass
            time.sleep(0.25)
        else:
            raise RuntimeError("Services did not start")
        start(
            [
                sys.executable,
                "-m",
                "autolab_agent.main",
                "--gateway",
                "ws://127.0.0.1:8000",
                "--simulate",
                "--credentials",
                str(cred),
            ],
            ROOT / "devices/raspberry-pi",
        )
        env = {**os.environ, "TEST_DEVICE_ID": device}
        result = subprocess.run(
            ["node", "tests/e2e/run.cjs"], cwd=ROOT, env=env, check=False
        )
        if result.returncode:
            raise RuntimeError("Browser checks failed")
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
