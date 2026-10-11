# Bluetooth setup

Bluetooth is how a Pi learns the Wi-Fi details and where to connect. In lab mode that is your Supabase project: the site sends the project's address and public key, the Pi joins the Wi-Fi, signs in to Supabase as its own login and reports that login back, and the site links it to your Autolab. In demo mode it is a gateway on the local network instead. See [lab mode](lab-mode.md) for the whole setup.

Bluetooth setup needs Chrome or Edge on a computer, or Chrome on Android. Other browsers get the manual path: set up Wi-Fi yourself and paste what the Pi agent prints.

## Prepare a Pi once

Write Raspberry Pi OS Lite (64-bit), Bookworm or later, with Raspberry Pi Imager. Set a user, and turn on SSH or plug in Ethernet so you can reach it this one time. If you set the Wi-Fi there too, Bluetooth setup can keep it. [Prepare a Raspberry Pi, step by step](pi-setup.md) shows every screen. Then on the Pi:

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/edison16a/AutoLab.git
~/AutoLab/devices/raspberry-pi/install.sh
```

Run it as your normal user. It asks for sudo when it needs it. It installs everything and creates the Pi's identity. Then it enables two services, the camera agent and setup on boot, and opens the first 10 minute setup window right away. There's no need to restart the Pi first. It never connects anywhere; Bluetooth setup says where.

At the end it prints the **Device ID** and the **setup PIN**. Write the PIN on a sticker on the machine. It lives in `/etc/autolab/setup-pin`, readable by root only, and stays the same when you run the installer again. If the installer says Wi-Fi is off, set the Wi-Fi country in `sudo raspi-config` first.

The installer is safe to run again after a `git pull`. It keeps what it made the first time, PIN included, restarts the agent on the new code and opens a new setup window.

## Set up a Pi

1. Be near the Pi while setup is open. It opens for 10 minutes when the installer finishes and after every start. While the Pi has no network it keeps reopening.
2. On the site, click **Connect device**, then **Find Autolab**, and pick `Autolab-XXXX` in the browser's chooser. Allow pairing if the computer asks.
3. Enter the PIN from the sticker. If the Pi is already on Wi-Fi, for example the one set in Imager, the site says **This Autolab is already on** and the network's name, with **Keep this Wi-Fi** switched on. That's all it needs. To move the Pi to another network, turn **Keep this Wi-Fi** off and enter the Wi-Fi name and password. A Pi that isn't on Wi-Fi yet always asks for them. The eye button in the password and PIN fields shows what you typed.
4. The site sends these along with where to connect. In lab mode the Pi joins the new Wi-Fi if it got one, signs in to Supabase with a fresh login, saves it as `supabase.json` beside its credentials and restarts the camera agent. It reports the login's id, and the site links it to your Autolab. In demo mode the Pi checks that the gateway answers, saves its address as `gateway.json` and restarts the agent, which connects there.

Keep the current Wi-Fi when you can. Joining another network drops the one the Pi is on, and a phone hotspot may not let it back on. A Pi on Wi-Fi first checks that it can see the new network, so a mistyped name leaves it where it is. If the join fails, the Pi tries to go back to the network it had, and the site offers **Keep this Wi-Fi** again once it's there. If it ends up with none, setup keeps reopening, so you can retry.

Only WPA personal networks work. Enterprise Wi-Fi and captive portals need the manual path. A network that hides its name can only be joined while the Pi isn't on Wi-Fi, since the Pi can't see it first.

## Run setup again

Power cycle the Pi and run **Connect device** within 10 minutes, for example to change Wi-Fi or hand the Autolab to another account. To change Wi-Fi, turn off **Keep this Wi-Fi** and enter the new network. In lab mode each setup gives the Pi a fresh login, so whoever set it up before loses access. Over SSH, `sudo systemctl restart autolab-setup` opens a new window without a reboot.

## When something is off

When setup fails, the site shows a message that names the step. On the Pi, `journalctl -u autolab-setup -n 20` shows the same step and the error's type, like `Setup failed joining Wi-Fi (RuntimeError)`. It never logs passwords or keys.

| What you see | What to check |
| --- | --- |
| Chrome only says **Scanning**, even within the 10 minutes | Run `journalctl -u autolab-setup -n 20` on the Pi. `Bluetooth did not switch on` means BlueZ couldn't switch the radio on, usually because rfkill blocked it. Run `sudo rfkill unblock bluetooth` and `sudo systemctl restart bluetooth`, then `sudo systemctl reset-failed autolab-setup` and `sudo systemctl restart autolab-setup` |
| `Could not join "<ssid>". Check the Wi-Fi name and password, then retry.` | The Pi couldn't get on that network. If it was on Wi-Fi and couldn't see the network at all, it never left, and the journal says `NotInRange`. Otherwise it tried to go back to the one it had. Check the name and password with the eye button. Both are case sensitive. A phone hotspot must be on, and an iPhone often only lets new devices join while its Personal Hotspot screen is open |
| `The Pi's Wi-Fi is switched off, usually because no Wi-Fi country is set.` | Raspberry Pi OS keeps Wi-Fi off until its country is set. On the Pi, run `sudo raspi-config`, then Localisation Options, WLAN Country, and retry |
| `The Pi couldn't tell which Wi-Fi it's on, so it left its Wi-Fi alone. Retry in a moment.` | NetworkManager didn't say which network the Pi is on, twice. The Pi doesn't join a network it might already be on, since that would drop it. Retry, or turn **Keep this Wi-Fi** on if the site offers it |
| `This Autolab isn't on Wi-Fi yet. Enter a Wi-Fi name and password.` | You kept the current Wi-Fi, but the Pi was offline by the time setup ran. The form now asks for the Wi-Fi name and password. Enter them with the PIN and retry |
| `The Pi is on Wi-Fi but could not reach Supabase. Check that this network reaches the internet, then retry.` | Lab mode. The Wi-Fi has no internet, or needs a sign in page. Try another network |
| `The Pi is on Wi-Fi but could not reach the gateway. Check that this network reaches it and that both run in the same mode, then retry.` | Demo or cloud mode. The gateway isn't running, or this network can't reach it. A gateway that runs in another mode than the Pi ends here too |

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

To keep the Wi-Fi the Pi is on, send `ssid` and `password` both empty, as the site does, or leave both out:

```json
{"ssid": "", "password": "", "pin": "123456", "supabase_url": "https://abc.supabase.co", "supabase_key": "the public anon key"}
```

The Pi goes ahead only when it's online. Otherwise status becomes an `error` with `This Autolab isn't on Wi-Fi yet. Enter a Wi-Fi name and password.` A name without a password, or the other way round, rejects the request with `Enter both the Wi-Fi name and password, or leave both empty to keep the current Wi-Fi`. When both are there, the SSID must be 1 to 32 UTF-8 bytes and the WPA password 8 to 63 characters. If the SSID is the one the Pi is on and the Pi is online, it keeps that connection too. It adds no profile and doesn't rejoin, and goes straight on to Supabase or the gateway. For any other SSID, a Pi on Wi-Fi scans and only joins a network it can see, since NetworkManager drops the current connection as soon as a join starts. A Pi that isn't on Wi-Fi tries the name anyway, saved as a hidden network so it's found again after a restart.

Every status read also carries `online` and `wifi_ssid`:

```json
{"state": "ready", "device_id": "3f9c2a71-...", "online": true, "wifi_ssid": "Lab Wi-Fi"}
```

`online` is true when NetworkManager reports a connection, even one without internet. It's the same test that decides whether setup reopens. `wifi_ssid` is the Wi-Fi network the Pi is using right now, or `null` when it has none or is still joining. The Pi asks NetworkManager again before it answers a read, and waits at most 3 seconds for each. No answer about `online` counts as offline, so the site asks for Wi-Fi details as before. No answer about the Wi-Fi only leaves `wifi_ssid` out. Anyone nearby can read both, PIN or not, since a network broadcasts its name anyway. The site offers **Keep this Wi-Fi** only when `online` is true and `wifi_ssid` is set. After a failed join it reads status again every few seconds for up to 30 seconds, so the switch comes back once the Pi is on its old Wi-Fi. Older Pis leave both out and get the full form.

Status moves through `ready`, `connecting`, `wifi_connected`, then `gateway_connected` or `error`. A Pi that keeps its Wi-Fi skips `connecting`. In lab mode `gateway_connected` means the Pi signed in to Supabase, and carries `"mode": "lab"` and the login as `agent_id`. An `error` carries a `message` that names the step that failed, as listed under [When something is off](#when-something-is-off). When Supabase refuses the login, the message says why, for example that anonymous sign ins are off. Only one request runs at a time. Five wrong PINs lock setup until the Pi restarts. Renewed windows do not reset that count.

## Security

Pairing encrypts the Bluetooth link, and the sticker PIN shows the person is at the machine. This does not protect against an active Bluetooth man in the middle, so setup only opens for short windows after boot or while the Pi is offline. The setup service never prints a PIN from the sticker file.

NetworkManager stores the Wi-Fi password. It never reaches logs, Supabase or the gateway. A failed join deletes the new profile and brings back the old connection, and so does a join cut short when the setup window closes. A successful one deletes older Autolab Wi-Fi profiles. Keeping the current Wi-Fi changes nothing in NetworkManager.

In demo mode with plain `ws://`, the device secret crosses the lab network unencrypted. Use `wss://` if you do not trust that network. Lab mode talks to Supabase over https.

## Cloud mode

Cloud mode still works. The camera agent writes its latest claim result to `credentials.setup.json` beside its credentials. Setup reads it after Wi-Fi connects, and only the browser that sent the right PIN gets the claim code. Restart the camera agent before an unclaimed cloud setup, so the code is current.

## Without setup on boot

To open one window by hand, run `sudo .venv/bin/python -m autolab_agent.provisioning` in `devices/raspberry-pi`. It uses the sticker PIN if `/etc/autolab/setup-pin` exists, and prints a random one otherwise. `systemd/autolab-provisioning.service` does the same as a service you start yourself. It cannot run alongside `autolab-setup`.

## Still to test on hardware

Unit tests cannot cover the radio or the OS. On a real Pi, check discovery, pairing, a wrong PIN, joining Wi-Fi and signing in to Supabase. Check that a Pi already on Wi-Fi, a phone hotspot included, reports its network and keeps it, and that a misspelled network name leaves it there. Also check setup on boot, on a fresh image where rfkill blocks Bluetooth, the agent restart and setting it up again from another account.

References: [Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth), [BlueZ GATT](https://bluez.readthedocs.io/en/latest/gatt-api/), [BlueZ advertising](https://bluez.readthedocs.io/en/latest/advertising-api/), [NetworkManager D-Bus](https://networkmanager.dev/docs/api/latest/gdbus-org.freedesktop.NetworkManager.html).
