#!/bin/sh
# T17's morph capture in one PC job: a Decide StatusCard with actions opening into its dialog and closing back, light
# Sage. A webm, a frame strip (a frame every 60 ms, when ffmpeg is there) and the row's geometry on every frame
# (geometry.json).
#   ringmaster heavy t17-morph --kind capture --on pc --out <out> sh demo/e2e/decide.sh <out>
set -eu
out=${1:-captures/T17}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
# playwright-core lives outside the repo: the demo has no browser dependency of its own
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=5198
cd demo
pnpm exec vite --port $port --strictPort >/tmp/levain-t17-vite.log 2>&1 &
vite=$!
trap 'kill $vite 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t17-vite.log; exit 1; }; sleep 0.5; done
PW_DIR="$pw" node e2e/decide-capture.mjs "http://localhost:$port/" "$out"
# the strip: one frame every 60 ms from each recording, in rows of 8
if command -v ffmpeg >/dev/null; then
  for v in "$out"/video-*/*.webm; do
    name=$(basename "$(dirname "$v")")
    ffmpeg -loglevel error -y -i "$v" -vf "fps=1000/60,scale=500:-1,tile=8x6:padding=4:color=gray" -frames:v 1 "$out/strip-$name.png"
  done
else
  echo "no ffmpeg on this machine: no strip, the webm and geometry.json only"
fi
