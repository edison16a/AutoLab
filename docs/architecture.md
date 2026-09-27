# Architecture and limits

The browser and Pi each make outbound WebSocket connections to a persistent FastAPI gateway. An optional worker joins the same device channel. A browser selects one device at a time. Multiple viewers may share a device; preview runs while at least one viewer requests it. Capture responses are sent to the requesting browser only.

## Demo lifetime

React memory holds the current selection, photos, detections, and activity. Blob URLs are revoked when images are removed, evicted or the device changes. The library retains at most 40 captures and about 100 MB of JPEG data; oldest images are evicted. Preview retains at most 16 recent frames so inference results can be aligned with their source image. Live ML displays the latest analyzed frame while waiting for the next inference result, instead of drawing old coordinates over an unrelated frame.

The gateway holds only connections, short-lived pending request IDs and bounded transport queues. It never archives JPEGs in demo mode. Refreshing closes the browser channel and starts an empty session. The Pi's credential file is intentionally persistent, independent of image data.

## Backpressure and failure handling

- Binary packet ceiling: 16 MiB. Header ceiling: 8 KiB.
- Per-peer outgoing queue: 8 messages. Live frames are disposable; overloaded reliable peers are disconnected with code 1013.
- WebSocket writes have deadlines. Pi preview captures one frame at a time and awaits send before producing another.
- Still captures use one Picamera2 still buffer and a camera lock. Preview resumes after capture.
- Device heartbeat every 10 seconds; gateway considers connections stale after 35 seconds without traffic.
- Capture timeout: 60 seconds. Saved analysis timeout: 120 seconds.
- Reconnect grows from 1 to 30 seconds. Browser remembers preview intent within the current session.
- At most 3 outstanding captures and 8 saved analyses per device. At most 10 viewers per device and 200 active device rooms per gateway.
- Live inference is sampled at most about once per second, with one live job in flight per worker.

## Scope

This is an imaging MVP with an optional generic computer-vision pipeline. It does not perform validated cell analysis, environmental regulation, pipetting or motor actuation. Hardware drivers beyond the camera need their own protocol and safety design. The real camera uses whichever sensor Picamera2 discovers and full still configuration; sensor compatibility and memory pressure must be checked on the target 1 GB Pi.

The current frontend uses in-app workspace sections so switching between camera and library does not reload demo memory. It is intentionally not a collection of hard-navigation pages that discard each other's session state.

## Primary implementation references

- https://datasheets.raspberrypi.com/camera/picamera2-manual.pdf
- https://github.com/raspberrypi/picamera2/blob/main/examples/capture_to_buffer.py
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://vercel.com/docs/functions
