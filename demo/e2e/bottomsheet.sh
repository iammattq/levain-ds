#!/bin/sh
# T10's capture in one PC job: BottomSheet beside StatusCardDialog's phone sheet at 390 px, Sage and Cobalt Mono, light
# and dark, with its behaviour checked in the browser (drag, flick, spring back, Escape, scrim, focus, Reduce Motion).
#   ringmaster heavy t10 --kind capture --on pc --out <out> sh demo/e2e/bottomsheet.sh <out>
set -eu
out=${1:-captures/T10}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=5199
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t10-vite.log 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t10-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/bottomsheet-capture.mjs "http://localhost:$port/" "$out"
