#!/usr/bin/env bash
# Install Autolab on a Raspberry Pi so it can be set up over Bluetooth.
#
# Expects Raspberry Pi OS Lite (64-bit), Bookworm or later, this repository cloned on
# the Pi, and a normal user with sudo rights. Run it as that user:
#
#   ~/AutoLab/devices/raspberry-pi/install.sh
#
# It is safe to run again, for example after a git pull. It keeps an existing
# .env, identity and setup PIN. It never connects to a gateway. The lab
# computer hands its address over during Bluetooth setup.
set -euo pipefail

if [[ $EUID -eq 0 ]]; then
  echo "Run this as your normal user. It asks for sudo when it needs it." >&2
  exit 1
fi

# Everything is found from this script, so the repository can live anywhere.
PI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$PI_DIR/.venv/bin/python"
RUN_USER="$(id -un)"
UNITS=(autolab-agent.service autolab-setup.service)

# systemd splits ExecStart on spaces, so the units would break on such a path.
if [[ $PI_DIR =~ [[:space:]] ]]; then
  echo "Move the repository to a path without spaces: $PI_DIR" >&2
  exit 1
fi

echo "Installing system packages"
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  git python3-venv python3-pip python3-picamera2 python3-pil rpicam-apps \
  bluez network-manager rfkill

echo "Installing Python packages"
# picamera2 only comes from apt, so the venv has to see system packages.
if [[ ! -x $PYTHON ]]; then
  python3 -m venv --system-site-packages "$PI_DIR/.venv"
fi
"$PI_DIR/.venv/bin/pip" install --quiet --disable-pip-version-check \
  -r "$PI_DIR/requirements-provisioning.txt"

# No gateway in here. It arrives over Bluetooth and is saved beside the
# credentials, where it wins over .env anyway.
if [[ ! -f $PI_DIR/.env ]]; then
  printf 'AUTOLAB_MODE=demo\nAUTOLAB_CREDENTIALS=%s\n' \
    "$HOME/.config/autolab/credentials.json" > "$PI_DIR/.env"
fi

# Made now and as this user, so the ID can be shown and root never makes a
# second identity.
DEVICE_ID="$(cd "$PI_DIR" && "$PYTHON" -m autolab_agent.identity)"

# Asks the same code the setup service uses, so the two always agree. -B keeps
# root from leaving cache files it owns in this checkout.
read_pin() {
  (cd "$PI_DIR" && sudo "$PYTHON" -B -c \
    'from autolab_agent.provisioning.pin import read_pin_file; print(read_pin_file() or "")' \
    2> /dev/null)
}

# The PIN goes on a sticker, so a valid one is never replaced.
PIN="$(read_pin)"
if [[ -z $PIN ]]; then
  echo "Creating the setup PIN"
  sudo install -d -m 0755 -o root -g root /etc/autolab
  # Created empty and private first, so the PIN is never readable by others.
  sudo install -m 0600 -o root -g root /dev/null /etc/autolab/setup-pin
  "$PYTHON" -c 'import secrets; print(f"{secrets.randbelow(10**6):06d}")' \
    | sudo tee /etc/autolab/setup-pin > /dev/null
  PIN="$(read_pin)"
fi

echo "Installing the services"
sed_escape() { printf '%s' "$1" | sed -e 's/[\\|&]/\\&/g'; }
DIR_TEXT="$(sed_escape "$PI_DIR")"
USER_TEXT="$(sed_escape "$RUN_USER")"
for unit in "${UNITS[@]}"; do
  # The templates name /home/YOUR_USER/AutoLab. Point them at this copy and user.
  sed -e "s|/home/YOUR_USER/AutoLab/devices/raspberry-pi|$DIR_TEXT|g" \
    -e "s|YOUR_USER|$USER_TEXT|g" \
    "$PI_DIR/systemd/$unit" | sudo tee "/etc/systemd/system/$unit" > /dev/null
done
sudo systemctl daemon-reload
sudo systemctl enable "${UNITS[@]}"
# Restart rather than start, so a run after git pull picks up the new code.
sudo systemctl restart autolab-agent.service

# Raspberry Pi OS keeps Wi-Fi switched off until a country is set.
WIFI_NOTE=""
if [[ "$(sudo rfkill list wifi 2> /dev/null || true)" == *"Soft blocked: yes"* ]]; then
  WIFI_NOTE="Wi-Fi stays off until its country is set. Set it in sudo raspi-config,
under Localisation Options, then WLAN Country."
fi

# A fresh image can have Bluetooth blocked too, and then BlueZ cannot switch it
# on. BlueZ restarts after the unblock, so it starts over with the adapter. The
# setup service also unblocks it each time it starts.
if [[ "$(sudo rfkill list bluetooth 2> /dev/null || true)" == *"Soft blocked: yes"* ]]; then
  sudo rfkill unblock bluetooth
  sudo systemctl restart bluetooth.service
fi

echo "Opening Bluetooth setup"
# Open the first window now, not at the next boot. reset-failed clears the
# start limit in case earlier starts used it up.
sudo systemctl reset-failed autolab-setup.service
sudo systemctl restart autolab-setup.service

cat << EOF

Autolab is installed.

Device ID: $DEVICE_ID
Setup PIN: $PIN
Write this PIN on a sticker on the machine. Bluetooth setup asks for it.
${WIFI_NOTE:+
$WIFI_NOTE
}
Next steps:
1. Nearby, open the Autolab site in Chrome and click Connect device.
2. Click Find Autolab and pick Autolab-${DEVICE_ID:0:4}. Enter the PIN, and the Wi-Fi
   details if the Pi isn't on Wi-Fi yet.

Setup is open now for 10 minutes. After that, restart the Pi or run
sudo systemctl restart autolab-setup to open it again.
EOF
