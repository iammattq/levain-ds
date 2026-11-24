#!/bin/sh
# T40's capture in one PC job: the demo's ImageCompare slider section (?only=slider) at 390 and 1280, Sage and Cobalt
# Mono, light and dark, with the handle at 25, 50 and 75 %, a pointer and a touch drag, and a frame strip.
#   ringmaster heavy t40 --kind capture --on pc --out <out> sh demo/e2e/slider.sh <out> [<pair-dir>]
# <pair-dir> (relative to demo/public, default image-compare/t40) holds before-<theme>-<mode>.png and
# after-<theme>-<mode>.png; missing, the demo's own pair is used.
set -eu
out=${1:-captures/T40}
pair=${2:-image-compare/t40}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
log=/tmp/levain-t40-vite.log
(cd demo && exec pnpm exec vite --port $port --strictPort >"$log" 2>&1) &
vite=$!
# pnpm starts vite as its child: stop both, by the port's own command line too
trap 'kill $vite 2>/dev/null || true; pkill -f "vite --port $port" 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat "$log"; exit 1; }; sleep 0.5; done
[ -f "demo/public/$pair/before-sage-dark.png" ] || pair=
PW_DIR="$pw" node demo/e2e/slider-capture.mjs "http://localhost:$port/" "$out" "$pair"
