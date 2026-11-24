#!/bin/sh
# T19's captures in one PC job: the demo's dialog stack (StatusCardDialogStack) in light and dark at phone and desktop
# width, its geometry against the board's pile (numbers.json), and recordings of Next / Back, normal and reduced motion.
#   ringmaster heavy t19 --kind capture --on pc --out <out> sh demo/e2e/stack.sh <out> [script]
# script: the capture to run, in demo/e2e (default stack-capture.mjs; pile-measure.mjs for T23's pile geometry).
set -eu
out=${1:-captures/T19}
script=${2:-stack-capture.mjs}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
# a port of its own per run: several PC slots run captures at once, and a fixed port let one job screenshot another's
# demo (its vite failed on --strictPort and the curl below found the other job's server)
port=${DEMO_PORT:-$((5200 + $$ % 700))}
log=/tmp/levain-demo-vite-$port.log
cd demo
pnpm exec vite --port $port --strictPort >"$log" 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do
  i=$((i + 1))
  kill -0 $vite 2>/dev/null || { echo "vite exited (port $port taken?)"; cat "$log"; exit 1; }
  [ $i -lt 60 ] || { cat "$log"; exit 1; }
  sleep 0.5
done
PW_DIR="$pw" node "e2e/$script" "http://localhost:$port/" "$out"
