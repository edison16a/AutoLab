# Optional Bluetooth Wi-Fi setup

Bluetooth is now an optional initial setup path. Camera commands, preview and ML continue over the existing internet WebSocket gateway. If the browser lacks Web Bluetooth, the wizard offers the same manual Wi-Fi/SSH path. No normal operation requires Bluetooth.

## Before first use

The Pi needs Raspberry Pi OS with BlueZ and NetworkManager, the Autolab code, a configured trusted gateway URL, and the camera agent. Bluetooth cannot install software on an unprepared Pi. Use Raspberry Pi Imager's Wi-Fi settings, temporary Ethernet or SSH to perform this initial installation.

```bash
cd ~/AutoLab/devices/raspberry-pi
sudo apt install -y bluez network-manager
source .venv/bin/activate
pip install -r requirements-provisioning.txt
```

Configure `.env` with the same mode and gateway as the web app:

```dotenv
AUTOLAB_GATEWAY=wss://YOUR_GATEWAY_HOST
AUTOLAB_MODE=demo
AUTOLAB_CREDENTIALS=/home/YOUR_USER/.config/autolab/credentials.json
```

Initialize credentials by running the normal agent once as your regular user. Install and start the camera agent systemd unit from the README so it reconnects independently after Wi-Fi changes. Do not generate a second identity as root.

## Start a physical setup session

From the Pi or an existing SSH/Ethernet connection:

```bash
cd ~/AutoLab/devices/raspberry-pi
sudo .venv/bin/python -m autolab_agent.provisioning
```

The service advertises `Autolab-XXXX` for ten minutes and prints a six-digit **setup PIN**. Keep that terminal visible. Administrator privileges are needed for BlueZ registration and NetworkManager changes. The process exits after the setup window and restores the prior adapter pairable state. It is not enabled at boot.

Alternatively replace `YOUR_USER` in `systemd/autolab-provisioning.service`, copy it to `/etc/systemd/system`, run `sudo systemctl daemon-reload`, then explicitly start it with `sudo systemctl start autolab-provisioning`. Read the PIN with `sudo journalctl -u autolab-provisioning -f`. The unit deliberately has no install/enable target and does not restart automatically.

In the web app:

1. Click Connect device and complete the camera and power steps.
2. Click Find Autolab, select the nearby Pi in the browser chooser, and allow OS pairing if requested.
3. Enter the Wi-Fi SSID, WPA personal password and setup PIN printed on the Pi.
4. Wait for actual NetworkManager activation and a successful gateway health check.
5. The browser connects to the device channel. In cloud mode it also claims the device with its authenticated account.
6. Open Autolab becomes available only after the device reports an online camera.

Supported provisioning networks use WPA personal credentials, such as a home router or personal hotspot. Enterprise Wi-Fi, captive portals, open networks and unusual authentication methods require the manual network setup path. The user's laptop must also retain internet access to the web app and gateway.

## Cloud mode

The running camera agent writes its latest claim response to `credentials.setup.json` beside its credential file, with owner-only permissions. The provisioning service reads that result after Wi-Fi connects instead of creating a competing claim code. The browser receives the short-lived claim code only on the Bluetooth peer that supplied the correct setup PIN. The six-digit **setup PIN** and six-digit **cloud claim code** serve different purposes.

Start or restart the camera agent when beginning an unclaimed cloud setup so it issues a current claim code. If the agent is stopped or the code expires, provisioning reports failure and the manual claim-code path remains available. Already claimed devices do not transfer ownership; the gateway requires the current owning account.

## Protocol and limits

- Service: `f7a10000-76b8-4f58-9b31-879c4e198a10`.
- Command: `f7a10001-76b8-4f58-9b31-879c4e198a10`, encrypted ATT writes.
- Status: `f7a10002-76b8-4f58-9b31-879c4e198a10`, encrypted ATT reads.
- Browser sends a UTF-8 JSON object with `ssid`, `password`, `pin`, followed by newline, in 20-byte writes with response.
- Per-peer framing is bounded at 2048 bytes. Five invalid PIN attempts close the setup opportunity until the service restarts.
- Only one validated request runs at a time. Successful sessions reject additional writes.
- Status progresses through ready, connecting, wifi_connected, gateway_connected or error, based on real operations.

The service uses NetworkManager D-Bus to activate the network. Passwords are not placed in shell commands, URLs, browser storage, gateway requests, or error messages. NetworkManager persists the network using its normal protected connection storage. Failed activation attempts remove the new profile and attempt to restore the previous connection.

ATT encryption uses OS pairing. The additional terminal PIN limits setup to someone with access to the Pi's setup session. The service does not claim protection against a sophisticated active Bluetooth man-in-the-middle. Use the short setup window in a trusted physical setting; stop provisioning when finished. Device secrets never leave the Pi through this protocol.

## Hardware smoke test still required

Test browser discovery, OS pairing, wrong-PIN rejection, Wi-Fi activation, gateway recovery, cloud claiming and service expiry on the actual Pi. Browser mocks and unit tests cannot verify radio/OS behavior.

References: [Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth), [BlueZ GATT](https://bluez.readthedocs.io/en/latest/gatt-api/), [BlueZ advertising](https://bluez.readthedocs.io/en/latest/advertising-api/), [NetworkManager D-Bus](https://networkmanager.dev/docs/api/latest/gdbus-org.freedesktop.NetworkManager.html).
