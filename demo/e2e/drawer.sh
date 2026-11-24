#!/bin/sh
# T36's capture in one PC job: the Drawer at 390 and 1024 px, Sage and Cobalt Mono, light and dark, closed, open,
# mid-slide and under Reduce Motion, with its behaviour checked in the browser (focus, Escape, scrim, swipe, scroll lock).
#   ringmaster heavy t36 --kind capture --on pc --out <out> sh demo/e2e/drawer.sh <out>
set -eu
out=${1:-captures/T36}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t36-vite.log 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t36-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/drawer-capture.mjs "http://localhost:$port/" "$out"
