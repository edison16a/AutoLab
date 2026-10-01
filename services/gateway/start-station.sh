#!/usr/bin/env bash
# Starts the gateway on a lab computer, macOS or Linux, straight from a fresh
# download of the repository:
#
#   bash services/gateway/start-station.sh
#
# The Python that ships with macOS is too old for the gateway, so this uses uv,
# which fetches its own Python once and never touches the system one. Later
# runs reuse it and start in a second or two.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

UV="$(command -v uv || true)"
if [[ -z $UV ]]; then
  UV="$HOME/.local/bin/uv"
  if [[ ! -x $UV ]]; then
    echo "Installing uv, a one time download of about 30 MB"
    curl -LsSf https://astral.sh/uv/install.sh | env UV_NO_MODIFY_PATH=1 sh
  fi
fi

echo "Starting the Autolab gateway on port 8000. Keep this window open while the lab uses the Autolab."
exec "$UV" run --quiet --python 3.12 --with-requirements requirements.txt \
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
