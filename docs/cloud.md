# Supabase setup (cloud mode)

Autolab runs in demo mode by default. Demo mode has one fixed login (username `ntabuser`, password `ntabuser123`) and keeps images in the browser. Cloud mode swaps that for real Supabase accounts, one-time device claiming, private image storage and saved analyses. Nothing switches to cloud until you set the mode flags below.

Cloud mode needs three things running: the **web app**, the **gateway** (Python, the only place the Supabase service key lives) and the **Pi agent**. The browser never writes to Supabase tables or storage itself. Every write goes through the gateway, which checks ownership first.

## 1. Create the database

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor** and start a new query. Paste all of [`supabase/migrations/001_autolab.sql`](../supabase/migrations/001_autolab.sql) and click **Run** once. It creates:
   - the tables `devices`, `device_credentials`, `device_claims`, `images`, `image_analysis` and `commands`
   - row level security, so people can only read their own rows
   - the private storage bucket `autolab-images`
   - the one-use `claim_device` function, callable only by the gateway
3. Check that **Table Editor** shows the six tables and **Storage** shows `autolab-images` marked private.

Running the file a second time fails with "already exists". That's harmless. It only has to succeed once.

## 2. Turn on email sign in

1. Under **Authentication**, open **Sign In / Providers** and make sure **Email** is enabled (it is by default).
2. Under **Authentication**, open **URL Configuration**:
   - **Site URL**: your web app URL. Use `http://localhost:3000` while testing locally and your Vercel URL in production.
   - **Redirect URLs**: add the same URLs.
3. New accounts must click a confirmation email before they can sign in. For quick local testing you can turn off **Confirm email** in the Email provider settings. The built-in mailer is rate limited, so set up custom SMTP before inviting real users.

## 3. Copy the keys

Open **Project Settings** and then **API Keys** (older dashboards call the page **API**). You need three values:

| Value | Where it goes | Secret? |
| --- | --- | --- |
| Project URL, `https://<ref>.supabase.co` | web app, gateway, ML worker | No |
| `anon` public key (in the **Legacy API keys** tab) | web app, ML worker | No, it's safe in the browser |
| `service_role` key (in the **Legacy API keys** tab) | gateway only | **Yes.** Never put it in the web app, on the Pi, or in git. |

Use the legacy JWT keys (they start with `eyJ`). The gateway sends the service key as both `apikey` and `Authorization: Bearer`, which is how the legacy keys work. The newer `sb_publishable_` and `sb_secret_` keys haven't been tested with this gateway.

## 4. Environment variables

### Gateway: `services/gateway/.env`

```dotenv
AUTOLAB_MODE=cloud
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
# Every web origin that will open the app, comma separated, no trailing slash
ALLOWED_ORIGINS=http://localhost:3000,https://YOUR_APP.vercel.app
```

### Web app: `apps/web/.env.local`

Set the same four values in Vercel under **Settings**, **Environment Variables** when you deploy.

```dotenv
NEXT_PUBLIC_AUTOLAB_MODE=cloud
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...
```

In production the gateway URL is `wss://YOUR_GATEWAY_HOST`. `NEXT_PUBLIC_` values are baked in at build time, so restart `npm run dev` or redeploy after changing them.

### Raspberry Pi: `devices/raspberry-pi/.env`

```dotenv
AUTOLAB_MODE=cloud
AUTOLAB_GATEWAY=ws://YOUR_COMPUTER_LAN_IP:8000
AUTOLAB_CREDENTIALS=/home/YOUR_USER/.config/autolab/credentials.json
```

In production use `wss://YOUR_GATEWAY_HOST`. The Pi gets no Supabase keys. It signs in with its own generated device secret.

### ML worker (optional): `workers/ml/.env`

```dotenv
AUTOLAB_MODE=cloud
AUTOLAB_GATEWAY=ws://localhost:8000
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=eyJ...anon...
AUTOLAB_EMAIL=you@example.com
AUTOLAB_PASSWORD=...
```

Use the account that owns the device. You don't need the worker for detection in the app, which runs in the browser. The worker only exists to save analyses to Supabase.

## 5. Run it locally

Use three terminals, starting at the repository root.

The gateway:

```bash
cd services/gateway
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

Check it with `curl http://localhost:8000/health`. It should answer `{"ok":true,"mode":"cloud"}`.

The web app:

```bash
npm ci
npm run dev
```

Then open http://localhost:3000.

The Pi agent, on the Pi (or on your computer with `--simulate` to try it without hardware):

```bash
cd devices/raspberry-pi
python3 -m venv --system-site-packages .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m autolab_agent.main
```

The agent registers with the gateway and prints a **six-digit claim code** that's valid for 10 minutes. Restart the agent to get a new one.

## 6. Sign in and claim the device

1. On the sign in page, choose **Create an account**. Confirm the email (unless you turned confirmation off), then sign in.
2. Click **Connect device**, go through the guide, choose **Use manual Wi-Fi setup**, enter the six-digit code and a name, and press **Connect device**.
3. The gateway links the device to your account once. After that the Pi reconnects on its own every time it boots, with no code.
4. Take a photo, refresh the page and check that it's still in **Data**. It now lives in Supabase Storage.
5. Optionally, sign in with a second account and confirm it can't see or control the first account's device.

## Deploying

- **Gateway**: any always-on host with WebSockets and HTTPS, such as Fly.io, Railway, Render or a VPS. Run one replica with one worker. See [deployment](deployment.md). Vercel can't run it.
- **Web app**: Vercel with the root directory set to `apps/web` and the four `NEXT_PUBLIC_` variables (with a `wss://` gateway URL).
- Add the final Vercel URL to the gateway's `ALLOWED_ORIGINS` and to the Supabase URL Configuration.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "The web app and gateway are running in different modes." | `NEXT_PUBLIC_AUTOLAB_MODE` and the gateway's `AUTOLAB_MODE` must both be `cloud`. |
| WebSocket 403 in the browser console | Add the exact page origin (scheme, host and port) to `ALLOWED_ORIGINS` and restart the gateway. |
| "Invalid or expired session" | Sign out and back in. Check that the gateway and web app use the same `SUPABASE_URL`. |
| "Cloud storage/database operation failed" | The migration wasn't applied, or the gateway has the anon key instead of `service_role`. |
| "Code expired or already used" | Restart the Pi agent for a new code. A claimed device prints "Already claimed". |
| The sign up email never arrives | Check **Authentication**, **Logs** in Supabase, set up SMTP, or turn off **Confirm email** while testing. |

## Security notes

The gateway checks user tokens with Supabase Auth and confirms device ownership before opening a channel. It authenticates the Pi against a SHA-256 hash of the device secret. Claim codes work once, expire in 10 minutes and are rate limited. Row level security blocks reads across accounts, and all writes go through the gateway. Signed image URLs last an hour, so refresh the page to renew them. To revoke a device, set `device_credentials.revoked_at` and restart the gateway. Keep one gateway replica until connections can be routed across several. Back up the database and storage before real use.
