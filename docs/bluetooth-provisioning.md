# Bluetooth setup

In lab mode the Pi never talks to the internet. A computer in the lab, the lab station, runs the gateway and keeps the Autolab app open. The Pi joins the lab Wi-Fi and connects to the gateway on that computer over the local network. Bluetooth is how the Pi learns the Wi-Fi details and the station's address. After setup, camera commands and the preview run over Wi-Fi.

Bluetooth setup needs Chrome or Edge. Other browsers get the manual path: set up Wi-Fi yourself and paste the Device ID.

## Prepare a Pi once

Flash Raspberry Pi OS Bookworm (64-bit, Lite) with Raspberry Pi Imager. Set a user, and turn on SSH or plug in Ethernet so you can reach it this one time. Then on the Pi:

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/edison16a/AutoLab.git
~/AutoLab/devices/raspberry-pi/install.sh
```

Run it as your normal user. It asks for sudo when it needs it. It installs everything and creates the Pi's identity. Then it enables two services, the camera agent and setup on boot. It never connects to a gateway.

At the end it prints the **Device ID** and the **setup PIN**. Write the PIN on a sticker on the machine. It lives in `/etc/autolab/setup-pin`, readable by root only, and stays the same when you run the installer again. If the installer says Wi-Fi is off, set the Wi-Fi country in `sudo raspi-config` first.

The installer is safe to run again after a `git pull`. It keeps what it made the first time, PIN included, and restarts the agent on the new code.

## Prepare the lab station

The station runs the gateway in demo mode, listening on the LAN:

```bash
cd services/gateway
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

Its `ALLOWED_ORIGINS` must include the origin of the web app you open. The firewall must let other machines on the LAN reach port 8000.

The app asks the local gateway for the station's address with `GET /lan`. It answers `{"urls": ["ws://192.168.1.20:8000"]}`, best guess first. Inside Docker the gateway only sees the container's own address, so set `LAN_URLS=ws://YOUR_LAN_IP:8000` there. Do the same with a `.local` name if the lab network uses public IP addresses, since the Pi only uses plain `ws://` on local addresses.

## Set up a Pi

1. Power the Pi on near the lab computer. Setup opens for 10 minutes after every start. While the Pi has no network it keeps reopening.
2. In the app, click **Connect device**, then **Find Autolab**, and pick `Autolab-XXXX` in the browser's chooser. Allow pairing if the computer asks.
3. Enter the Wi-Fi name, the Wi-Fi password and the PIN from the sticker.
4. The app sends these together with the station's address. The Pi joins the Wi-Fi and checks that the gateway answers. Then it saves the address and restarts the camera agent, which connects to the station.

Only WPA personal networks work. Enterprise Wi-Fi and captive portals need the manual path.

## Move a Pi to another computer

Power cycle the Pi and run **Connect device** from the new computer within 10 minutes. Over SSH, `sudo systemctl restart autolab-setup` opens a new window without a reboot.

## Where the agent's gateway comes from

The camera agent uses the first of these it finds:

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
{"ssid": "Lab Wi-Fi", "password": "wifi password", "pin": "123456", "gateway": "ws://192.168.1.20:8000"}
```

`gateway` is optional. Without it the Pi keeps the gateway it has. When present it must be a `ws://` or `wss://` URL with a host and an optional port, at most 200 characters. Nothing else is allowed, such as a path or a login. A bad value rejects the request with a message, like a bad SSID or password does. The whole request may be at most 2048 bytes.

Status moves through `ready`, `connecting`, `wifi_connected`, then `gateway_connected` or `error`. Only one request runs at a time. Five wrong PINs lock setup until the Pi restarts. Renewed windows do not reset that count.

## Security

Pairing encrypts the Bluetooth link, and the sticker PIN shows the person is at the machine. This does not protect against an active Bluetooth man in the middle, so setup only opens for short windows after boot or while the Pi is offline. The setup service never prints a PIN from the sticker file.

NetworkManager stores the Wi-Fi password. It never reaches logs or the gateway. A failed join deletes the new profile and brings back the old connection. A successful one deletes older Autolab Wi-Fi profiles.

With plain `ws://` the device secret crosses the lab network unencrypted. Use `wss://` if you do not trust that network.

## Cloud mode

Cloud mode still works. The camera agent writes its latest claim result to `credentials.setup.json` beside its credentials. Setup reads it after Wi-Fi connects, and only the browser that sent the right PIN gets the claim code. Restart the camera agent before an unclaimed cloud setup, so the code is current.

## Without setup on boot

To open one window by hand, run `sudo .venv/bin/python -m autolab_agent.provisioning` in `devices/raspberry-pi`. It uses the sticker PIN if `/etc/autolab/setup-pin` exists, and prints a random one otherwise. `systemd/autolab-provisioning.service` does the same as a service you start yourself. It cannot run alongside `autolab-setup`.

## Still to test on hardware

Unit tests cannot cover the radio or the OS. On a real Pi, check discovery, pairing, a wrong PIN, joining Wi-Fi and reaching the station. Also check setup on boot, the agent restart and a power cycle onto a new computer.

References: [Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth), [BlueZ GATT](https://bluez.readthedocs.io/en/latest/gatt-api/), [BlueZ advertising](https://bluez.readthedocs.io/en/latest/advertising-api/), [NetworkManager D-Bus](https://networkmanager.dev/docs/api/latest/gdbus-org.freedesktop.NetworkManager.html).
