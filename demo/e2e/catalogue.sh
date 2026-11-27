#!/bin/sh
# T67's capture in one PC job: the demo's default page (before: the bench on main; after: the catalogue) at 390 and
# 1280 px, Sage and Cobalt Mono, light and dark, the ?only=tooltip frame, and after it the README shots, the checks and
# the composite (when the other side is already in <out>). The before runs this script against main's app:
#   ringmaster heavy t67 --kind capture --on pc --out <out> sh demo/e2e/catalogue.sh <out> before|after
set -eu
out=${1:-captures/T67}
side=${2:-after}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t67-vite.log 2>&1 &
vite=$!
# pnpm starts vite as its child: stop both, by the port's own command line too
trap 'kill $vite 2>/dev/null || true; pkill -f "vite --port $port" 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t67-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/catalogue-capture.mjs "http://localhost:$port/" "$out" "$side"
