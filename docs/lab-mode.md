# Lab mode

In lab mode the Autolab's Raspberry Pi talks to Supabase by itself, over the lab Wi-Fi. No computer has to stay on next to it, and nothing runs in a terminal. The site is hosted on Vercel at **https://auto-lab-web.vercel.app**. Any phone or laptop signed in there sees the Autolab's status, watches the live camera, takes photos and browses the results.

During Bluetooth setup the Pi gets its own Supabase login, an anonymous user, and the person setting it up links that login to their Autolab. Row level security then lets the Pi touch that one Autolab's rows and nothing else. Nothing in lab mode holds a Supabase secret key: the site and the Pi only ever have the public anon key.

## What runs where

| Part | Runs on | Talks to |
| --- | --- | --- |
| Pi agent | The Raspberry Pi | Supabase, over the lab Wi-Fi |
| Autolab site | Vercel | Opened by every screen |
| Database, files, sign in, live channel | Supabase | The site and the Pi |

The Pi needs internet on the lab Wi-Fi. Enterprise Wi-Fi and networks with a sign in page don't work for it.

## The database

`supabase/migrations/001_autolab.sql` and `002_lab_mode.sql` make these:

| Table | What it holds |
| --- | --- |
| `profiles` | One row per person, made at sign up |
| `devices` | Each Autolab, its owner, its Pi's login and the status the Pi last reported |
| `images` | One row per photo, pointing at its JPEG in the private `autolab-images` bucket |
| `image_analysis` | Object detection results for a photo |
| `actions` | The command log: every photo, preview start and stop and analysis, and how it ended |

The rules, enforced by Postgres itself:

- People only ever see their own rows and files.
- An Autolab belongs to the first account that adds it. Nobody else can add it, see it or send it commands.
- A Pi's login sees its own Autolab and the commands sent to it. It can report status, run those commands and file photos under its owner, in that Autolab's folder. It can't rename its Autolab, send commands, add Autolabs or see anyone else's.
- Live preview travels on a private Realtime channel that only the owner and the Pi can join.
- The command log can't be deleted. Once a command has ended, it can't be changed. The database stamps every time on it, so a wrong clock can't skew it.

## 1. Set up Supabase

1. Sign in at [supabase.com](https://supabase.com) and create a project. Pick the region nearest the lab and keep the database password somewhere safe.
2. Open **SQL Editor**, paste all of `supabase/migrations/001_autolab.sql` and run it. Then do the same with `002_lab_mode.sql`. Both must run, in that order.
3. Open **Authentication**, then **Sign In / Providers**:
   - check that **Email** is on;
   - turn on **Allow anonymous sign-ins**. Each Pi signs in this way. Anonymous logins can't add Autolabs or send commands, and can only use an Autolab once its owner links them;
   - decide about **Confirm email**. Off, a new account can sign in at once, which is simplest for a lab. On, people click a link in an email first.
4. Open **Authentication**, then **URL Configuration**. Set **Site URL** to `https://auto-lab-web.vercel.app` and add it under **Redirect URLs** too.
5. Leave CAPTCHA protection off under **Authentication**, then **Attack Protection**. The Pi can't solve one.
6. Open **Project Settings**, then **API Keys**. Copy the **Project URL** and the **anon public** key. Newer projects call it the **publishable** key, and either works. Never copy the **service_role** or **secret** key anywhere in lab mode.

If you use the Supabase CLI, `npx supabase link --project-ref YOUR_REF` and then `npx supabase db push` apply both migrations instead of step 2.

## 2. Point the site at Supabase

The site lives at `https://auto-lab-web.vercel.app`, with `apps/web` as the Vercel project's **Root Directory**.

1. In the Vercel project, open **Settings**, then **Environment Variables**, and add:

```bash
NEXT_PUBLIC_AUTOLAB_MODE=lab
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=the key from step 1
```

2. Redeploy, since these are read when the site is built. Until then the site stays in demo mode.
3. Open the site, click **Create an account** and sign in.

## 3. Prepare the Pi

Do this once per Pi. [Bluetooth setup](bluetooth-provisioning.md) has the details.

1. Flash Raspberry Pi OS Bookworm (64-bit, Lite) with Raspberry Pi Imager. Set a user, and turn on SSH so you can reach it this one time.
2. With the Pi off, connect the camera ribbon to the **CSI camera** connector.
3. On the Pi:

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/edison16a/AutoLab.git
~/AutoLab/devices/raspberry-pi/install.sh
```

While the repository is private, `git clone` asks for a username and password. Give your GitHub username and, as the password, a personal access token with read access to this repository.

The installer prints the **Device ID** and a six digit **setup PIN**. Write the PIN on a sticker on the machine. Nothing about your Supabase project goes on the Pi here; Bluetooth setup hands it over.

## 4. Connect it over Bluetooth

Use Chrome or Edge on any computer with Bluetooth, or Chrome on an Android phone. iPhones and Safari can't do Web Bluetooth.

1. Power the Pi on nearby. Setup stays open for 10 minutes after every start.
2. On the site, click **Connect device** and follow the steps. Click **Find Autolab** and pick `Autolab-XXXX`.
3. Enter the lab Wi-Fi name and password and the sticker PIN.
4. The site sends these along with your project's address and public key. The Pi joins the Wi-Fi, signs in to Supabase and reports its login, which the site links to your Autolab. **Ready** shows once the Pi reports its camera.

Without Bluetooth, set up the Pi's Wi-Fi with Raspberry Pi Imager instead, then choose **Use manual Wi-Fi setup**. The step shows the command to run on the Pi. It prints a **setup code** to paste back into the site.

## 5. Use it from anywhere

Open the site on any phone or laptop and sign in with the same account:

- **Home** shows the Autolab's status, the latest photos and **Activity**, the newest commands and how each ended.
- **Live** streams the camera at 2 frames a second and takes full resolution photos. Each screen gets its own view.
- **Data** has every photo, live from every screen. Analyses and deletes show everywhere at once.

The Pi reports its status every 15 seconds, and screens show it offline after 45 seconds without a report. A photo command the Pi doesn't pick up within 20 seconds expires, and the screen says so.

The preview only streams while a screen has Live open, and stops 12 seconds after the last one closes. Each frame is a Realtime message of roughly 20 to 60 KB, so an hour of watching uses about 100 to 400 MB of Supabase bandwidth. Keep an eye on **Usage** in the Supabase dashboard if you're on the free plan.

## Day to day

- The Pi starts by itself after a power cut and goes back online with the same login.
- To change Wi-Fi, power cycle the Pi and run **Connect device** again within 10 minutes.
- To give an Autolab to another account, that account runs **Connect device** on it. Setup gives the Pi a fresh login each time, so the previous owner's access ends there. They can then delete the old row in **Table Editor**, then **devices**.
- A second Autolab is just another **Connect device**. The menu at the top switches between them.

## When something is off

| What you see | What to check |
| --- | --- |
| "Supabase refused the Pi's login: Anonymous sign-ins are disabled" | Turn on **Allow anonymous sign-ins** (step 1), then run **Connect device** again |
| Setup stops after "On Wi-Fi, signing in" | The Wi-Fi has no internet, or needs a sign in page. Try another network |
| "The Autolab didn't pick this up" | The Pi is off, or lost its network. Home shows when it last reported |
| "This Autolab is linked to another account" | Someone else added it first. They can hand it over as above |
| The site says demo mode | The Vercel variables aren't set, or the site wasn't redeployed after setting them |

## Test it without hardware

With Docker running, start a local copy of Supabase with both migrations applied, then run the lab browser test. It runs the site in lab mode and a simulated Pi that signs in to Supabase by itself, then drives two screens and a stranger's account:

```bash
npx supabase start
.venv/bin/python tests/run_lab_e2e.py
```

The access rules have their own test, which CI runs on every push against a plain Postgres:

```bash
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash supabase/tests/rls.sh
```

## Security notes

- Only the public anon key is used, by the site and by the Pi. Row level security decides everything.
- Anyone with the anon key can create an anonymous login, but such a login can't add Autolabs or send commands, and sees nothing until an owner links it.
- The link happens over Bluetooth, which the sticker PIN protects, or with a setup code the owner copies from the Pi.
- Everything between the Pi, the screens and Supabase goes over https.
