# Architecture and limits

The browser and the Pi each open an outbound WebSocket to one FastAPI gateway. The gateway pairs them up by device ID and never needs an inbound port on the Pi. An optional ML worker can join the same device channel. A browser talks to one device at a time. Several people can watch one device, and the preview runs while at least one of them asks for it. A capture goes back only to the browser that asked for it.

## Web app

`apps/web` is a Next.js app router project. `app/` holds thin routes only. Everything else lives in `src/`:

| Folder | What's in it |
| --- | --- |
| `src/providers` | `AuthProvider` (demo login or Supabase Auth) and `AutolabProvider`, which every screen reads through `useAutolab()` |
| `src/hooks` | The provider's pieces: devices, the device channel, the frame buffer, captures, the photo library, live detection, notices, theme |
| `src/lib` | Plain functions: the binary envelope, storage, cloud calls, detection, formatting, downloads |
| `src/components/<feature>` | One folder per screen (`home`, `live`, `data`, `stats`, `hardware`, `settings`, `onboarding`, `auth`, `shell`) plus `ui` for shared pieces |
| `src/components/three` | The 3D kit: the stage, materials, primitives, camera controls and every model |
| `src/data` | The hardware parts list, the logo path and the demo account |
| `src/styles` | Design tokens for light and dark mode, then one stylesheet per area |

Screens never touch the socket, storage or gateway directly. They call the actions on `useAutolab()`, which keeps the rules for reconnecting, cleanup and persistence in one place.

## Demo data

Demo mode has one fixed login (see `src/data/demo-account.ts`). Images and their analyses are saved in the browser's IndexedDB, keyed by the signed in user, so they survive a reload. The library keeps at most 150 images or about 400 MB and drops the oldest first. The device list, selected device, gateway URL and theme are small settings in localStorage. Signing out keeps the images; **Settings, Clear local images** removes them.

The gateway holds only live connections, short lived request IDs and bounded send queues. It never stores JPEGs in demo mode. The Pi's credential file persists on purpose, apart from any image data.

Every image and live frame in the browser is a blob URL owned by one hook, which revokes them when images are deleted, evicted or the app unmounts. The live view keeps the last 8 frames alive so detection can finish reading a frame before it's released, and shows the newest analyzed frame rather than drawing old boxes over a newer picture.

## Backpressure and failure handling

- Binary packets are capped at 16 MiB and headers at 8 KiB.
- Each peer has an outgoing queue of 8 messages. Live frames are disposable. A reliable peer that falls behind is disconnected with code 1013.
- WebSocket writes have deadlines. The Pi captures one preview frame at a time and waits for it to send before taking the next.
- Stills use one Picamera2 still buffer and a camera lock. The preview resumes after the capture.
- The Pi sends a heartbeat every 10 seconds. The gateway treats a connection as stale after 35 seconds without traffic.
- Captures time out after 60 seconds and saved analyses after 120 seconds.
- Reconnects back off from 1 to 30 seconds. The browser remembers whether the preview was on and resumes it.
- Each device allows 3 outstanding captures, 8 saved analyses and 10 viewers. A gateway serves at most 200 device rooms.

## Python services

`services/gateway/autolab_gateway` is split by job: `config`, `protocol` (the binary envelope), `peers` and `rooms` (connections and their queues), `limits`, `sweeper` (timeouts), `http_routes`, `socket_routes` with one module per role under `handlers/`, and `cloud` (the Supabase adapter, the only code that holds the service key). `main.py` stays a thin entry point, so `uvicorn main:app` works as before.

`devices/raspberry-pi/autolab_agent` holds the camera agent (`cli`, `agent`, `link`, `preview`, `commands`, `camera`, `telemetry`, `credentials`, `registration`) and the optional Bluetooth setup service under `provisioning/`. `python -m autolab_agent.main` and `python -m autolab_agent.provisioning` are unchanged.

`workers/ml/autolab_worker` is the optional ML worker for cloud mode (`cli`, `worker`, `auth`, `detector`), started with `python main.py`.

## Scope

Today the live hardware is the Pi and its camera. The 3D model shows the whole machine from the design (gantry, pipette tool, sensors, environment control), and every part that has no driver yet says "Not installed" instead of showing made up readings. Motion, pipetting and environment control need their own protocol and safety design before they're wired in. The pipetting animation on Home is a demo drawn in the browser; it sends nothing to the machine. The real camera uses whichever sensor Picamera2 finds; check sensor support and memory use on the 1 GB Pi.

The object detector is a general COCO model. It proves the capture, analyze and review loop, and it does not measure cells.

## References

- https://datasheets.raspberrypi.com/camera/picamera2-manual.pdf
- https://github.com/raspberrypi/picamera2/blob/main/examples/capture_to_buffer.py
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/reference/javascript/auth-getuser
