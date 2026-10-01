# Lab mode

Lab mode is for a lab that keeps one computer next to the Autolab. That computer is the **lab station**. It runs the small gateway program and keeps your Autolab site open in Chrome. The site itself is hosted on Vercel, the same address for every screen. The Pi joins the lab Wi-Fi and talks only to the station, never to the internet.

The station saves every photo, the Autolab's status and a log of every command to Supabase, signed in as you. Any other phone or laptop signed in to the same account sees all of it and can take photos too. Those commands go through Supabase to the station, which runs them on the Autolab.

Nothing in lab mode holds a Supabase secret key. The browser only has the public anon key, and row level security limits every read and write to the signed in person's own rows.

## What runs where

| Part | Runs on | Talks to |
| --- | --- | --- |
| Pi agent | The Raspberry Pi | The station's gateway, over the lab Wi-Fi |
| Gateway | The station, in demo mode | The Pi and the station's browser |
| Autolab site | Vercel | Opened by every screen |
| The site on the station | Chrome or Edge on the station | The gateway at `ws://localhost:8000` and Supabase |
| The site anywhere else | Any browser | Supabase only |
| Database, files, sign in | Supabase | Every signed in browser |

## The database

`supabase/migrations/001_autolab.sql` and `002_lab_mode.sql` make these:

| Table | What it holds |
| --- | --- |
| `profiles` | One row per account, made at sign up |
| `devices` | Each Autolab, the account that owns it, and the status the station last reported |
| `images` | One row per photo, pointing at its JPEG in the private `autolab-images` bucket |
| `image_analysis` | Object detection results for a photo |
| `actions` | The command log: every photo, preview start and stop and analysis, who sent it and how it ended |

The rules, enforced by Postgres itself:

- You only ever see your own rows and files.
- An Autolab belongs to the first account that adds it. Nobody else can add it, see it or send it commands.
- Photos go in a folder named after your user ID, and only for Autolabs you own.
- The command log can't be deleted. Once a command has ended, it can't be changed. The database stamps every time on it, so a computer with a wrong clock can't skew it.

## 1. Set up Supabase

1. Sign in at [supabase.com](https://supabase.com) and create a project. Pick the region nearest the lab and keep the database password somewhere safe.
2. Open **SQL Editor**, paste all of `supabase/migrations/001_autolab.sql` and run it. Then do the same with `002_lab_mode.sql`. Both must run, in that order.
3. Open **Authentication**, then **Sign In / Providers**, and check that **Email** is on.
4. Decide about **Confirm email** on the same page. Turned off, a new account can sign in at once, which is the simplest for a lab. Turned on, people click a link in an email first, so set **Authentication**, then **URL Configuration**, then **Site URL** to the address people open the app at.
5. Open **Project Settings**, then **API Keys**. Copy the **Project URL** and the **anon public** key. Newer projects call it the **publishable** key, and either works. Never copy the **service_role** or **secret** key anywhere in lab mode.

If you use the Supabase CLI, `npx supabase link --project-ref YOUR_REF` and then `npx supabase db push` apply both migrations instead of step 2.

## 2. Put the site on Vercel

1. In Vercel, import the repository and set the **Root Directory** to `apps/web`.
2. Under **Settings**, then **Environment Variables**, add:

```bash
NEXT_PUBLIC_AUTOLAB_MODE=lab
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=the key from step 1
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:8000
```

3. Redeploy, since these are read when the site is built.
4. In Supabase, open **Authentication**, then **URL Configuration**. Set **Site URL** to your Vercel address, for example `https://your-app.vercel.app`, and add it under **Redirect URLs** too.

`ws://localhost:8000` points each browser at a gateway on its own computer. Only the station has one, and only the station uses it. Other screens never connect to it.

## 3. Set up the lab station

The station needs Python 3.11 or newer, Chrome or Edge, and Bluetooth. It doesn't need Node.js or a build: it only runs the gateway. Clone the repository on it, then:

```bash
cd services/gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

On Windows, use `py -m venv .venv`, then `.venv\Scripts\activate`, then `copy .env.example .env`.

Edit `services/gateway/.env` and put your Vercel address in `ALLOWED_ORIGINS`, with no slash at the end:

```bash
AUTOLAB_MODE=demo
ALLOWED_ORIGINS=https://your-app.vercel.app
```

The gateway only answers pages from these addresses. Then start it, listening on the whole network so the Pi can reach it:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

Let other machines on the lab network reach port 8000. macOS and Windows ask the first time; say yes. Leave this window running. To start it again later, open a terminal in `services/gateway`, activate `.venv` and run the last command.

Open your Vercel address in Chrome or Edge, create your account and sign in. Chrome may ask whether the site may connect to devices on your local network or apps on this computer. Allow it, since that is how the site reaches the gateway. Leave the tab open whenever people should be able to use the Autolab.

## 4. Prepare the Pi

Do this once per Pi. [Bluetooth setup](bluetooth-provisioning.md) has the details.

1. Flash Raspberry Pi OS Bookworm (64-bit, Lite) with Raspberry Pi Imager. Set a user, and turn on SSH so you can reach it this one time.
2. With the Pi off, connect the camera ribbon to the **CSI camera** connector.
3. On the Pi:

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/edison16a/AutoLab.git
~/AutoLab/devices/raspberry-pi/install.sh
```

It prints the **Device ID** and a six digit **setup PIN**. Write the PIN on a sticker on the machine.

## 5. Connect it over Bluetooth

1. Power the Pi on near the station. Setup stays open for 10 minutes after every start.
2. On the station, in the Vercel site, click **Connect device** and follow the steps. Click **Find Autolab** and pick `Autolab-XXXX`.
3. Enter the lab Wi-Fi name and password and the sticker PIN.
4. The app hands the Pi the station's network address along with the Wi-Fi details. The Pi joins the Wi-Fi, connects to the station, and the app shows **Ready** once the camera reports in.

The Autolab is now saved to your account, and this computer is its station. **Settings**, then **Connection**, then **Lab computer** shows that, and you can switch it there.

## 6. Use it from other devices

Open the same Vercel address on any phone or laptop and sign in with the same account. You get:

- The Autolab's status, as the station last reported it. The station reports every 30 seconds, and a screen shows offline after 75 seconds without a report.
- Every photo, analysis and deletion, live, from any screen.
- **Take photo** on Home, Live and Hardware. The station takes it and it shows up a moment later.
- **Activity** on Home: the newest commands, where each came from and how it ended.

The live preview only runs on the station, since frames never leave the lab network. A command the station doesn't pick up within 20 seconds expires, and the screen that sent it says so.

## Day to day

- Keep the station awake with the app open. If it sleeps, other screens show the Autolab offline and their commands expire.
- To move a Pi to a new station, power cycle it and run **Connect device** on the new computer within 10 minutes.
- The station runs commands for the Autolab it has selected. A second Autolab needs its own station, or a switch of the selected device on this one.
- To give an Autolab to another account, delete its row in **Table Editor**, then **devices**. Its photo records and log go with it, while the files stay in Storage until you delete them there. The new owner then adds it with **Connect device**.

## When something is off

| What you see | What to check |
| --- | --- |
| "The lab computer didn't pick this up" | The station's tab is open, signed in to the same account, and **Lab computer** is on in Settings |
| "This Autolab is linked to another account" | Someone else added it first. Remove it from their account as above |
| Setup stops after "Wi-Fi connected" | The Pi can't reach port 8000 on the station. Check the firewall and that both are on the same network |
| "Start the gateway on this computer" | The gateway isn't running, or `ALLOWED_ORIGINS` in its `.env` doesn't match your Vercel address exactly. Restart the gateway after editing `.env` |
| The station stays on "Connecting" | Same as above, or Chrome was told not to let the site reach this computer. Allow it in the site settings next to the address bar |
| "The web app and gateway are running in different modes" | Set `AUTOLAB_MODE=demo` in the gateway's `.env`. Lab mode's gateway runs in demo mode |
| Remote screens show offline | The station is closed, asleep or offline |

## Test it without hardware

With Docker running, start a local copy of Supabase with both migrations applied, then run the lab browser test. It starts the gateway, the app in lab mode and a simulated Pi, then drives a station, a remote screen and a stranger's account:

```bash
npx supabase start
.venv/bin/python tests/run_lab_e2e.py
```

The access rules have their own test, which CI runs on every push against a plain Postgres:

```bash
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash supabase/tests/rls.sh
```

## Security notes

- The gateway on the station has no login, like demo mode. Anyone who can reach its port on the lab network can watch the camera. Keep it on a network you trust.
- The Pi uses plain `ws://` on the lab network, so traffic between the Pi and the station isn't encrypted.
- Everything that leaves the lab goes to Supabase over https, as the signed in person.
