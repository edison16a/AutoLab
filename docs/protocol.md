# Wire protocol v1

Endpoints:

- `/ws/device/{device_uuid}`: Pi
- `/ws/client/{device_uuid}`: browser
- `/ws/worker/{device_uuid}`: local ML worker

First message, within ten seconds: `{"type":"hello"}`. In cloud mode, device hello includes `secret`, client/worker hello includes a user `token`. Device hello includes `camera_online` and `simulated`. Server sends `ready` with `mode`. Demo accepts unauthenticated channels with a valid UUID; IDs are not access control.

## JSON control events

| Sender          | Type                            | Fields                                                               |
| --------------- | ------------------------------- | -------------------------------------------------------------------- |
| Client          | `capture_photo`                 | `request_id` UUID                                                    |
| Client          | `start_preview`, `stop_preview` | optional `request_id`                                                |
| Client          | `live_ml`                       | `enabled` boolean                                                    |
| Client          | `camera_status`, `ping`         | `request_id` UUID                                                    |
| Device          | `heartbeat`, `camera_status`    | `camera_online` boolean                                              |
| Device          | `error`                         | `request_id`, `message`                                              |
| Gateway         | `status`                        | `online`, `camera_online`, `worker_online`, `last_seen`, `simulated` |
| Gateway         | `preview`                       | `active` boolean                                                     |
| Worker          | `analysis`                      | `image_id` or `frame_id`, `model`, `width`, `height`, `detections`   |
| Any server path | `error`                         | `message`, optional `request_id` or `image_id`                       |

## Binary JPEG envelope

Four bytes, unsigned big-endian header byte length, followed by UTF-8 JSON header, followed by JPEG bytes. A complete image is one WebSocket message, so headers cannot get separated from their image. No base64 expansion.

Header types:

- Pi preview: `{"type":"frame","frame_id":"...","width":640,"height":480}`.
- Pi still: `{"type":"capture","request_id":"UUID","width":W,"height":H}`.
- Gateway still adds `image_id`, `captured_at`, validated dimensions. Image ID equals capture request ID.
- Browser saved inference: `{"type":"analyze","image_id":"UUID"}`.

The gateway checks pending capture and analysis IDs instead of accepting unsolicited results. Saved analysis data is routed to its requesting browser. Live analysis is routed only to viewers with ML enabled. Worker output includes pixel-coordinate `bbox: [x1,y1,x2,y2]`, `polygon: [[x,y],...]`, `label`, and `confidence` for each detection.

Live preview and live inference are never written to Supabase. Still capture and saved analysis are persisted only in cloud mode.
