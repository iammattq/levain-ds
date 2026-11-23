#!/usr/bin/env bash
# T17: screenshots of the demo's decide section (a Decide StatusCard with answers beside the board's decide card), in Sage (the
# default theme, 0) and Cobalt Mono (7), light and dark, at 2x. Builds the demo, serves it, shoots it with headless
# Chromium. A browser job: run it on the PC, from the repo root:
#   ringmaster heavy t17 --kind capture --on pc --out <dir> bash demo/scripts/capture-decide.sh <dir>
set -euo pipefail
out="$(realpath -m "${1:-decide-out}")"
mkdir -p "$out"
root="$(cd "$(dirname "$0")/../.." && pwd)"
chrome="${CHROMIUM:-$(command -v chromium || command -v google-chrome || command -v chromium-browser)}"
(cd "$root/demo" && pnpm exec vite build --base ./ >/dev/null)
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
python3 -m http.server "$port" --bind 127.0.0.1 --directory "$root/demo/dist" >/dev/null 2>&1 &
srv=$!
trap 'kill $srv 2>/dev/null' EXIT
for _ in $(seq 50); do curl -fs "http://127.0.0.1:$port/" >/dev/null && break; sleep 0.1; done
for theme in 0:sage 7:cobalt-mono; do
  for mode in light dark; do
    f="$out/decide-${theme#*:}-$mode.png"
    "$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1000,900 \
      --virtual-time-budget=4000 --screenshot="$f" "http://127.0.0.1:$port/?only=decide&theme=${theme%%:*}&mode=$mode" 2>/dev/null
    echo "$f"
  done
done
