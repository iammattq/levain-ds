#!/bin/sh
# T19's captures in one PC job: the demo's dialog stack (StatusCardDialogStack) in light and dark at phone and desktop
# width, its geometry against the board's pile (numbers.json), and recordings of Next / Back, normal and reduced motion.
#   ringmaster heavy t19 --kind capture --on pc --out <out> sh demo/e2e/stack.sh <out>
set -eu
out=${1:-captures/T19}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=5197
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t19-vite.log 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t19-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/stack-capture.mjs "http://localhost:$port/" "$out"
