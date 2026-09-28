# Autolab

Remote Raspberry Pi imaging with a Next.js dashboard, persistent Python WebSocket gateway, Pi camera agent, and optional local segmentation worker.

**The default is a public, account-free demo.** Captures and analyses live only in the current browser tab. Refreshing clears them, the selected device, and connection settings. There is no browser database or gateway image archive in demo mode. Download images before leaving. A device ID is a routing address, not an authentication credential: anyone with it can control that demo camera.

Cloud mode is implemented separately and disabled by default. It adds Supabase email/password accounts, one-time device claiming, ownership enforcement, private image storage, durable image history, and saved analyses.

## Included

- Interactive Three.js digital twin with 16 selectable component nodes, linked details, exploded view, connection lines and an accessible component list.
- Animated camera/power onboarding with optional Bluetooth Wi-Fi provisioning and manual fallback. See [digital twin](docs/digital-twin.md) and [Bluetooth setup](docs/bluetooth-provisioning.md).

- Blue/black responsive dashboard, live camera, device status and heartbeat, capture library, detail viewer, download, delete, device naming, setup guide, and connection settings.
- 640 × 480 binary JPEG preview at about 4 FPS, enabled only while a viewer requests it.
- Separate high-resolution still capture, camera locking, reconnect/backoff, and bounded queues.
- Saved-image and sampled live ML, browser canvas boxes/polygons, optional YOLO segmentation worker on your computer.
- Raspberry Pi Picamera2 agent with camera discovery, persistent credentials and systemd unit.
- Explicit camera and ML simulators for testing without hardware or model downloads.
- Supabase migration, RLS, private bucket, gateway-only credentials, atomic expiring claim codes, and cloud activation instructions.
- Docker gateway deployment, Vercel frontend configuration, protocol tests, browser end-to-end checks and CI.

The implementation covers the imaging phase in the supplied spec. Motors, pumps, environmental sensors, heating and CO2 control are not represented as working hardware controls.

## Repository

| Path                   | Runs on                                     |
| ---------------------- | ------------------------------------------- |
| `apps/web`             | Vercel or local Node.js                     |
| `services/gateway`     | Persistent Python host                      |
| `devices/raspberry-pi` | Raspberry Pi 4, 1 GB, or simulator computer |
| `workers/ml`           | Your computer, optional                     |
| `supabase/migrations`  | Supabase SQL Editor, cloud mode only        |
| `tests`                | Developer machine / CI                      |

## Fastest local demo

Prerequisites: Node.js 22+, Python 3.11+, Git. Run each component in a separate terminal. All commands below start at the repository root unless a `cd` is shown.

### 1. Web dashboard

```bash
npm ci
cp apps/web/.env.example apps/web/.env.local
npm run dev
```

Open http://localhost:3000. Do not set Supabase variables for the demo.

### 2. Gateway

```bash
cd services/gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --ws-max-size 16777216 --ws-max-queue 4
```

Alternatively, from the root: `docker compose up --build gateway`.

### 3. Camera simulator

```bash
cd devices/raspberry-pi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m autolab_agent.main --simulate --gateway ws://localhost:8000
```

Copy the **Device ID** printed in the terminal. Click **Connect device**, advance through the camera and power guide, choose **Use manual Wi-Fi setup**, and paste it. The guide is illustrative when you are using the simulator. Click **Start preview**, then **Take photo**. The simulator is visibly labeled and does not imply a physical camera is connected.

### 4. Optional ML simulator

To exercise the analysis pipeline without downloading a model:

```bash
cd workers/ml
python3 -m venv .venv
source .venv/bin/activate
pip install 'websockets>=14,<17' pillow python-dotenv httpx
python main.py --simulate --device YOUR_DEVICE_UUID --gateway ws://localhost:8000
```

Open an image and click **Analyze image**, or enable **Live ML** during preview. Simulated detections are labeled `simulator (not ML)`.

For real inference install `workers/ml/requirements.txt` and omit `--simulate`. The first run downloads `yolo11n-seg.pt`. Internet and sufficient disk/RAM are required. Use `--model /path/to/model.pt` for another model. The generic model demonstrates computer vision plumbing, not medically or biologically validated measurements. Review the selected model's license before commercial use.

## Real Raspberry Pi setup

1. Flash Raspberry Pi OS Lite 64-bit. Configure your username, Wi-Fi, SSH and hostname in Raspberry Pi Imager.
2. Power off the Pi before attaching the camera ribbon to the **CSI camera** connector. Align exposed cable contacts with connector contacts. Do not assume the sensor model from the label.
3. Boot, SSH in, then install and test camera support:

```bash
sudo apt update
sudo apt install -y git python3-venv python3-pip python3-picamera2 python3-pil rpicam-apps
rpicam-hello --list-cameras
rpicam-still --nopreview -o test.jpg
```

4. Clone and run the agent:

```bash
git clone https://github.com/edison16a/AutoLab.git
cd AutoLab/devices/raspberry-pi
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`: set `AUTOLAB_GATEWAY` to the public `wss://` gateway URL, `AUTOLAB_MODE=demo`, and replace `YOUR_USER` in `AUTOLAB_CREDENTIALS`. Then:

```bash
python -m autolab_agent.main
```

No Bluetooth, USB connection to your computer, inbound Pi port, or router port forwarding is required for normal operation. Bluetooth is optional for initial Wi-Fi provisioning. Only the gateway needs a public address. Test detection and a capture with the actual camera before enabling boot startup.

### Start on boot

Replace every `YOUR_USER` and, if needed, the repository path in `systemd/autolab-agent.service`. The user must have access to the camera device, normally through the `video` group on Raspberry Pi OS.

```bash
sudo cp systemd/autolab-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now autolab-agent
sudo journalctl -u autolab-agent -f
```

The device identity is created once with file mode `0600`. Keep that file when updating the agent. Never copy a Supabase service key to the Pi.

## Deploy

See [deployment instructions](docs/deployment.md). The web frontend and gateway are separate deployments. Setting only Vercel variables does not deploy the Python gateway.

## Enable Supabase later

See [cloud activation](docs/cloud.md). Apply the SQL migration, configure email confirmation, set the cloud variables on both services, redeploy, then claim the Pi. Environment variables alone cannot create the database or bucket. No cloud UI or Supabase connection is used while mode remains `demo`.

## Verification

```bash
npm ci
npm run build
python3 -m venv .venv
.venv/bin/pip install -r services/gateway/requirements.txt -r devices/raspberry-pi/requirements.txt
.venv/bin/pytest tests/test_gateway.py tests/test_provisioning.py -q
npx playwright install chromium
.venv/bin/python tests/run_e2e.py
```

End-to-end checks start the gateway, production web app, camera simulator and ML simulator. They cover capture, preview, saved/live analysis, deletion, mobile overflow, refresh reset, absence of browser persistence, and browser runtime errors. Ports 3000 and 8000 must be free.

Real CSI hardware and a live Supabase project must be verified in the target environment. These checks do not claim to validate either. See [architecture and limits](docs/architecture.md) and [wire protocol](docs/protocol.md).
