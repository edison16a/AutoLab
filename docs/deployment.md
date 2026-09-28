# Deployment

## 1. Gateway

Use a persistent Docker host with HTTPS/WebSocket upgrade support, such as a container service or VPS. Build context: `services/gateway`, Dockerfile: `services/gateway/Dockerfile`. The container listens on `$PORT` (default 8000). Configure:

```dotenv
AUTOLAB_MODE=demo
ALLOWED_ORIGINS=https://YOUR_PROJECT.vercel.app
```

Use exactly one replica and one Uvicorn worker. Active connection maps are process-local. Multiple workers or replicas require a shared message broker and explicit routing, which this release does not include. Health check: `GET /health`. Configure reverse proxy WebSocket upgrades and an idle timeout longer than the 10-second heartbeat. Terminate TLS at the host. Do not expose unencrypted remote WebSockets.

## 2. Vercel

Import `edison16a/AutoLab`. Select **Next.js**, set **Root Directory** to `apps/web`, and keep the monorepo root lockfile available (enable files outside the root directory if requested).

- Install command: `npm ci` (Vercel detects npm workspaces).
- Build command: `npm run build`.
- Output: Next.js default.
- Node.js: 22 or newer supported by Vercel.

The build downloads a checksum-verified YOLOv10n model from Hugging Face and copies ONNX Runtime assets from npm into `public/inference`. Keep the default build script so these assets are included. A webcam or image-upload demonstration works without a gateway; Pi connections require the separate gateway deployment.

Environment:

```dotenv
NEXT_PUBLIC_AUTOLAB_MODE=demo
NEXT_PUBLIC_GATEWAY_URL=wss://YOUR_GATEWAY_HOST
```

Redeploy after changing any `NEXT_PUBLIC_` value because these values are baked into the web build. Add the final Vercel production domain to the gateway's `ALLOWED_ORIGINS`. For preview deployments, explicitly add each preview origin or use a dedicated stable preview domain; wildcard browser origins are not accepted.

## 3. Raspberry Pi

Set `AUTOLAB_GATEWAY=wss://YOUR_GATEWAY_HOST` on the Pi. Run the agent, copy its device UUID into the web app, and confirm a capture. The frontend connects through the gateway. Object detection runs in the browser and needs no Python ML worker.

## Deployment smoke check

1. `/health` returns `{"ok":true,"mode":"demo"}`.
2. Browser connects without CORS/origin errors.
3. Device shows online and a heartbeat.
4. Preview starts and stops, and a still photo appears.
5. Disconnecting the Pi changes its status to offline.
6. Reloading clears the demo library and selected device.

This repository includes configuration, not provisioned hosting accounts. No live gateway, Vercel project, or Supabase project is created by the code itself.
