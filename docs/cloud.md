# Supabase setup (cloud mode)

Demo mode is the default: any email and password signs in, and images stay in that browser. Cloud mode adds real Supabase accounts, one-time device claiming, private image storage and saved analyses. Nothing switches to cloud until you set the mode flags below.

You need three things running in cloud mode: the **web app**, the **gateway** (Python, holds the Supabase service key), and the **Pi agent**. The browser never talks to Supabase storage or tables directly for writes; the gateway checks ownership first.

## 1. Create the database

1. Create a project at [supabase.com](https://supabase.com). Note the region and database password.
2. Open **SQL Editor → New query**, paste all of [`supabase/migrations/001_autolab.sql`](../supabase/migrations/001_autolab.sql) and click **Run** once. It creates:
   - tables `devices`, `device_credentials`, `device_claims`, `images`, `image_analysis`, `commands`
   - row-level security (users can only read their own rows)
   - the private storage bucket `autolab-images`
   - the one-use `claim_device` function (gateway only)
3. Check **Table Editor** shows the six tables and **Storage** shows `autolab-images` (private).

Running the file twice fails on "already exists". That's harmless; it only needs to succeed once.

## 2. Turn on email sign-in

1. **Authentication → Sign In / Providers → Email**: enabled (default).
2. **Authentication → URL Configuration**:
   - **Site URL**: your web app URL (`http://localhost:3000` for local testing, your Vercel URL in production).
   - **Redirect URLs**: add the same URL(s).
3. Email confirmation is on by default, so new accounts must click the link in the email before signing in. For quick local testing you can turn off **Confirm email** under the Email provider. Supabase's built-in mailer is rate-limited; set up custom SMTP before inviting real users.

## 3. Copy the keys

**Project Settings → API Keys** (older dashboards: **Project Settings → API**):

| Value | Where it goes | Secret? |
| --- | --- | --- |
| Project URL `https://<ref>.supabase.co` | web + gateway + ML worker | No |
| `anon` public key (**Legacy API keys** tab) | web + ML worker | No, safe in the browser |
| `service_role` key (**Legacy API keys** tab) | gateway only | **Yes. Never put it in the web app, the Pi, or git.** |

Use the legacy JWT keys (`eyJ...`). The gateway sends the service key as both `apikey` and `Authorization: Bearer`, which is how legacy keys work. The newer `sb_publishable_…` / `sb_secret_…` keys were not tested with this gateway.

## 4. Environment variables

### Gateway: `services/gateway/.env`

```dotenv
AUTOLAB_MODE=cloud
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
# Every web origin that will open the app, comma-separated, no trailing slash
ALLOWED_ORIGINS=http://localhost:3000,https://YOUR_APP.vercel.app
```

### Web app: `apps/web/.env.local` (and the same in Vercel → Settings → Environment Variables)

```dotenv
NEXT_PUBLIC_AUTOLAB_MODE=cloud
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:8000          # production: wss://YOUR_GATEWAY_HOST
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...
```

`NEXT_PUBLIC_` values are baked in at build time. Restart `npm run dev`, or redeploy on Vercel, after changing them.

### Raspberry Pi: `devices/raspberry-pi/.env`

```dotenv
AUTOLAB_MODE=cloud
AUTOLAB_GATEWAY=ws://YOUR_COMPUTER_LAN_IP:8000   # production: wss://YOUR_GATEWAY_HOST
AUTOLAB_CREDENTIALS=/home/YOUR_USER/.config/autolab/credentials.json
```

No Supabase keys on the Pi. It authenticates with its own generated device secret.

### Optional ML worker: `workers/ml/.env`

```dotenv
AUTOLAB_MODE=cloud
AUTOLAB_GATEWAY=ws://localhost:8000
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=eyJ...anon...
AUTOLAB_EMAIL=you@example.com        # the account that owns the device
AUTOLAB_PASSWORD=...
```

Not needed for detection in the app, which runs in the browser. The worker only saves analyses to Supabase.

## 5. Run it locally

Three terminals from the repository root:

```bash
# 1. Gateway
cd services/gateway
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
# check: curl http://localhost:8000/health  ->  {"ok":true,"mode":"cloud"}
```

```bash
# 2. Web app
npm ci
npm run dev        # http://localhost:3000
```

```bash
# 3. Pi agent (on the Pi, or add --simulate to try it on your computer)
cd devices/raspberry-pi
python3 -m venv --system-site-packages .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m autolab_agent.main            # or: python -m autolab_agent.main --simulate
```

The agent registers with the gateway and prints a **six-digit claim code** (valid 10 minutes). Restart the agent for a new code.

## 6. Sign in and claim the device

1. Open the app, click **Create an account** on the sign-in page, then confirm the email (unless you turned confirmation off) and **Sign in**.
2. Click **Connect device**, step through the guide, choose **Use manual Wi-Fi setup**, enter the **six-digit claim code** and a device name, then **Connect device**.
3. The gateway links the device to your account once. After that the Pi reconnects on its own every boot; no code is needed again.
4. Take a photo, refresh, and check it still appears in **Data** (it now lives in Supabase Storage).
5. Optional: sign in with a second account and confirm it can't see or control the first account's device.

## Deploying

- **Gateway**: any always-on host with WebSockets and HTTPS (Fly.io, Railway, Render, a VPS). One replica, one worker. See [deployment](deployment.md). Vercel can't run it.
- **Web**: Vercel, root directory `apps/web`, with the four `NEXT_PUBLIC_` variables above (`wss://` gateway URL).
- Add the final Vercel URL to the gateway's `ALLOWED_ORIGINS` and to Supabase **URL Configuration**.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "The web app and gateway are running in different modes" | `NEXT_PUBLIC_AUTOLAB_MODE` and the gateway's `AUTOLAB_MODE` must both be `cloud`. |
| WebSocket 403 in the browser console | Add the exact page origin (scheme + host + port) to `ALLOWED_ORIGINS`, restart the gateway. |
| "Invalid or expired session" | Sign out and in again; check the gateway's `SUPABASE_URL` matches the web app's. |
| "Cloud storage/database operation failed" | Migration not applied, or the gateway has the anon key instead of `service_role`. |
| "Code expired or already used" | Restart the Pi agent for a fresh code. Already-claimed devices print "Already claimed". |
| Sign-up email never arrives | Check Supabase **Authentication → Logs**, configure SMTP, or turn off **Confirm email** for testing. |

## Security notes

The gateway validates user tokens with Supabase Auth, checks device ownership before opening a channel, and authenticates the Pi against a SHA-256 hash of its device secret. Claims are one-use, expire in 10 minutes and are rate-limited. RLS blocks cross-account reads; all writes go through the gateway. Signed image URLs expire after an hour (refresh the page to renew). Revoke a device by setting `device_credentials.revoked_at`, then restart the gateway. Keep one gateway replica until shared routing exists. Back up the database and storage before real use.
