#!/bin/sh
# T51's capture in one PC job: the Drawer in WebKit on an iPhone-sized viewport (390 px), Sage and Cobalt Mono, light and
# dark, on the elevated and the canvas surface; the viewport grown under the open drawer as a stand-in for the toolbar
# collapsing; the panel, scrim and overlay heights measured against the viewport and 100lvh; the edge's contrast sampled.
#   ringmaster heavy t51 --kind capture --on pc --out <out> sh demo/e2e/drawer-surface.sh <out>
set -eu
out=${1:-captures/T51}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t51-vite.log 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t51-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/drawer-surface-capture.mjs "http://localhost:$port/" "$out"
