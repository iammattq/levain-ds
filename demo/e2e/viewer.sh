#!/bin/sh
# T61's capture in one PC job: the demo's ImageViewer section at 390 and 1280, Sage and Cobalt Mono, light and dark: one
# image and a before/after pair, at rest and zoomed (a real touch pinch and double tap through CDP at 390, the wheel and
# keys at 1280), and opened over an open Modal; with the behaviour checked in the browser.
#   ringmaster heavy t61 --kind capture --on pc --out <out> sh demo/e2e/viewer.sh <out>
set -eu
out=${1:-captures/T61}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
log=/tmp/levain-t61-vite.log
(cd demo && exec pnpm exec vite --port $port --strictPort >"$log" 2>&1) &
vite=$!
trap 'kill $vite 2>/dev/null || true; wait $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat "$log"; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node demo/e2e/viewer-capture.mjs "http://localhost:$port/" "$out"
