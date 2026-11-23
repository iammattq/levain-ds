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
# the strips: from each press (open, close), from 0.4 s before it, a frame every 60 ms for 1.44 s, cropped to the cards and the dialog, in
# rows of 4, read left to right
if command -v ffmpeg >/dev/null; then
  for motion in no-preference reduce; do
    v=$(ls "$out/video-$motion"/*.webm | head -1)
    for step in open close; do
      at=$(node -e "const r=require(process.argv[1]).result; console.log(Math.max(0, r[process.argv[2]+'-'+process.argv[3]+'AtSec'] - 0.4))" "$out/geometry.json" "$motion" "$step")
      ffmpeg -loglevel error -y -ss "$at" -i "$v" -vf "fps=1000/60,crop=1000:420:0:200,scale=600:-1,tile=4x6:padding=6:color=gray" -frames:v 1 "$out/strip-$step-$motion.png"
    done
  done
else
  echo "no ffmpeg on this machine: no strips, the webm and geometry.json only"
fi
