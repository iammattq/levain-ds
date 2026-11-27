#!/bin/sh
# T70: FabMenu's capture in one PC job, at 390 and 1280 px, Sage and Cobalt Mono, light and dark: closed, mid-open,
# open, on a level, mid-close, Reduce Motion, the fill frame by frame, and the site's menu beside it.
#   ringmaster heavy t70 --kind capture --on pc --out <out> sh demo/e2e/fab.sh <out>
set -eu
out=${1:-captures/T70}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t70-vite.log 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t70-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/fab-capture.mjs "http://localhost:$port/" "$out"
