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

## Lab mode data

In lab mode there is no gateway. The Pi signs in to Supabase as its own anonymous login, which its owner links to their Autolab. It reports its status every 15 seconds; the database stamps the time, and screens judge freshness by when they last saw the report change, so neither clock can mislead. A photo command is an `actions` row that starts as pending. The screen also sends "wake" on the Autolab's private Realtime channel, `device:<id>`, and the Pi checks every 3 seconds as well. The Pi claims the command with an update that only matches a pending row, takes the still, uploads it into its owner's folder, files the row and closes the command. One nobody claims within 20 seconds expires. While a screen has Live open it sends "watch" every 4 seconds on the same channel, and the Pi streams 2 base64 JPEG frames a second there until 12 seconds after the last one. Only the owner and the Pi can join that channel. The database stamps every time on the log and refuses changes to an entry that has ended.

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

`devices/raspberry-pi/autolab_agent` holds the camera agent (`cli`, `agent`, `link`, `preview`, `commands`, `camera`, `telemetry`, `credentials`, `registration`), the optional Bluetooth setup service under `provisioning/`, and the hardware drivers under `hardware/`: the Pico client, the I²C sensors and GPIO outputs, the Marlin client and the media change routines. `python -m autolab_agent.main` and `python -m autolab_agent.provisioning` are unchanged.

`devices/pico` is the Pico's MicroPython firmware for the fluidics: both pump steppers, the pinch valves, the HEPA fan and the waste float switch, behind a line based JSON protocol over USB serial with its own safety rules. See [firmware](firmware.md).

`workers/ml/autolab_worker` is the optional ML worker for cloud mode (`cli`, `worker`, `auth`, `detector`), started with `python main.py`.

## Scope

Today the live hardware is the Pi and its camera. The 3D model shows the whole machine from the design (gantry, dispense head and pump fluidics, HEPA unit, sensors, environment control), and every part that hasn't reported says "Not installed" instead of showing made up readings. The Pico firmware and the Pi's drivers for the fluidics, sensors, outputs and gantry are written and tested against fakes, and stay off until `.env` turns them on; none of it has run on the real hardware yet (see [firmware](firmware.md)). The media change animation on Home is a demo drawn in the browser; it sends nothing to the machine. The real camera uses whichever sensor Picamera2 finds; check sensor support and memory use on the 1 GB Pi.

The object detector is a general COCO model. It proves the capture, analyze and review loop, and it does not measure cells.

## References

- https://datasheets.raspberrypi.com/camera/picamera2-manual.pdf
- https://github.com/raspberrypi/picamera2/blob/main/examples/capture_to_buffer.py
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/reference/javascript/auth-getuser
