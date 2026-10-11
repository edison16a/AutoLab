# Bluetooth setup

Bluetooth is how a Pi learns the Wi-Fi details and where to connect. In lab mode that is your Supabase project: the site sends the project's address and public key, the Pi joins the Wi-Fi, signs in to Supabase as its own login and reports that login back, and the site links it to your Autolab. In demo mode it is a gateway on the local network instead. See [lab mode](lab-mode.md) for the whole setup.

Bluetooth setup needs Chrome or Edge on a computer, or Chrome on Android. Other browsers get the manual path: set up Wi-Fi yourself and paste what the Pi agent prints.

## Prepare a Pi once

Write Raspberry Pi OS Lite (64-bit), Bookworm or later, with Raspberry Pi Imager. Set a user, and turn on SSH or plug in Ethernet so you can reach it this one time. [Prepare a Raspberry Pi, step by step](pi-setup.md) shows every screen. Then on the Pi:

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/edison16a/AutoLab.git
~/AutoLab/devices/raspberry-pi/install.sh
```

Run it as your normal user. It asks for sudo when it needs it. It installs everything and creates the Pi's identity. Then it enables two services, the camera agent and setup on boot. It never connects anywhere; Bluetooth setup says where.

At the end it prints the **Device ID** and the **setup PIN**. Write the PIN on a sticker on the machine. It lives in `/etc/autolab/setup-pin`, readable by root only, and stays the same when you run the installer again. If the installer says Wi-Fi is off, set the Wi-Fi country in `sudo raspi-config` first.

The installer is safe to run again after a `git pull`. It keeps what it made the first time, PIN included, and restarts the agent on the new code.

## Set up a Pi

1. Power the Pi on nearby. Setup opens for 10 minutes after every start. While the Pi has no network it keeps reopening.
2. On the site, click **Connect device**, then **Find Autolab**, and pick `Autolab-XXXX` in the browser's chooser. Allow pairing if the computer asks.
3. Enter the Wi-Fi name, the Wi-Fi password and the PIN from the sticker.
4. The site sends these along with where to connect. In lab mode the Pi joins the Wi-Fi, signs in to Supabase with a fresh login, saves it as `supabase.json` beside its credentials and restarts the camera agent. It reports the login's id, and the site links it to your Autolab. In demo mode the Pi checks that the gateway answers, saves its address as `gateway.json` and restarts the agent, which connects there.

Only WPA personal networks work. Enterprise Wi-Fi and captive portals need the manual path.

## Run setup again

Power cycle the Pi and run **Connect device** within 10 minutes, for example to change Wi-Fi or hand the Autolab to another account. In lab mode each setup gives the Pi a fresh login, so whoever set it up before loses access. Over SSH, `sudo systemctl restart autolab-setup` opens a new window without a reboot.

## Where the agent connects

With `supabase.json` beside its credentials, or `--supabase-url` and `--supabase-key`, the camera agent runs in lab mode and talks to Supabase. It prints a **setup code**, the Device ID and its login together, which the manual path takes.

Otherwise it dials a gateway, the first of these it finds:

1. The `--gateway` flag.
2. `gateway.json` beside the credentials file, written by Bluetooth setup.
3. `AUTOLAB_GATEWAY` in `.env`.
4. `ws://localhost:8000`.

Plain `ws://` is only used for local addresses: `localhost`, names ending in `.local`, and private IPv4 ranges (10.x, 172.16 to 172.31, 192.168.x and 169.254.x). Anything else needs `wss://`.

## Protocol

- Service `f7a10000-76b8-4f58-9b31-879c4e198a10`.
- Command `f7a10001-76b8-4f58-9b31-879c4e198a10`, encrypted writes.
- Status `f7a10002-76b8-4f58-9b31-879c4e198a10`, encrypted reads.

The browser writes one UTF-8 JSON object followed by a newline, in 20 byte writes with response:

```json
{"ssid": "Lab Wi-Fi", "password": "wifi password", "pin": "123456", "supabase_url": "https://abc.supabase.co", "supabase_key": "the public anon key"}
```

`supabase_url` and `supabase_key` come together, for lab mode. The address must be `https://` with a host and an optional port, or plain `http://` on a local address, and the key must look like a public key. Never send a secret key; the Pi doesn't need one.

In demo mode the request carries `"gateway": "ws://192.168.1.20:8000"` instead. `gateway` is optional. Without it the Pi keeps the gateway it has. When present it must be a `ws://` or `wss://` URL with a host and an optional port, at most 200 characters. Nothing else is allowed, such as a path or a login. A bad value rejects the request with a message, like a bad SSID or password does. The whole request may be at most 2048 bytes.

Status moves through `ready`, `connecting`, `wifi_connected`, then `gateway_connected` or `error`. In lab mode `gateway_connected` means the Pi signed in to Supabase, and carries `"mode": "lab"` and the login as `agent_id`. When Supabase refuses the login, the error message says why, for example that anonymous sign ins are off. Only one request runs at a time. Five wrong PINs lock setup until the Pi restarts. Renewed windows do not reset that count.

## Security

Pairing encrypts the Bluetooth link, and the sticker PIN shows the person is at the machine. This does not protect against an active Bluetooth man in the middle, so setup only opens for short windows after boot or while the Pi is offline. The setup service never prints a PIN from the sticker file.

NetworkManager stores the Wi-Fi password. It never reaches logs, Supabase or the gateway. A failed join deletes the new profile and brings back the old connection. A successful one deletes older Autolab Wi-Fi profiles.

In demo mode with plain `ws://`, the device secret crosses the lab network unencrypted. Use `wss://` if you do not trust that network. Lab mode talks to Supabase over https.

## Cloud mode

Cloud mode still works. The camera agent writes its latest claim result to `credentials.setup.json` beside its credentials. Setup reads it after Wi-Fi connects, and only the browser that sent the right PIN gets the claim code. Restart the camera agent before an unclaimed cloud setup, so the code is current.

## Without setup on boot

To open one window by hand, run `sudo .venv/bin/python -m autolab_agent.provisioning` in `devices/raspberry-pi`. It uses the sticker PIN if `/etc/autolab/setup-pin` exists, and prints a random one otherwise. `systemd/autolab-provisioning.service` does the same as a service you start yourself. It cannot run alongside `autolab-setup`.

## Still to test on hardware

Unit tests cannot cover the radio or the OS. On a real Pi, check discovery, pairing, a wrong PIN, joining Wi-Fi and signing in to Supabase. Also check setup on boot, the agent restart and setting it up again from another account.

References: [Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth), [BlueZ GATT](https://bluez.readthedocs.io/en/latest/gatt-api/), [BlueZ advertising](https://bluez.readthedocs.io/en/latest/advertising-api/), [NetworkManager D-Bus](https://networkmanager.dev/docs/api/latest/gdbus-org.freedesktop.NetworkManager.html).
