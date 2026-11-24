#!/bin/sh
# T27's capture in one PC job: the pieces that named undefined colours or classes, before (the base ref's sources) and
# after (this tree's), Sage and Cobalt Mono, light and dark.
#   ringmaster heavy t27 --kind capture --on pc --out <abs-out> sh demo/e2e/colours.sh <abs-out> [before-ref]
# before-ref: the commit whose ui-react and shared.css make "before" (default main; on the PC pass a SHA). Only the
# non-test files under packages/ that differ from it are swapped; the demo section is this tree's in both runs. The
# files are put back before "after" all the same.
set -eu
out=${1:-captures/T27}
ref=${2:-main}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
files=$(git diff --name-only "$ref" HEAD -- packages | grep -v -e '/tests/' -e '\.test\.' || true)
[ -n "$files" ] || { echo "no source differs from $ref"; exit 1; }
echo "before swaps: $files"
port=${DEMO_PORT:-$((5200 + $$ % 700))}
log=/tmp/levain-demo-vite-$port.log
vite=
stop() { [ -z "$vite" ] || { kill "$vite" 2>/dev/null || true; wait "$vite" 2>/dev/null || true; vite=; }; }
trap 'stop; git checkout -q HEAD -- $files' EXIT
serve() {
  (cd demo && exec pnpm exec vite --port $port --strictPort --force >"$log" 2>&1) &
  vite=$!
  i=0
  until curl -sf "http://localhost:$port/" >/dev/null; do
    i=$((i + 1))
    kill -0 $vite 2>/dev/null || { echo "vite exited (port $port taken?)"; cat "$log"; exit 1; }
    [ $i -lt 60 ] || { cat "$log"; exit 1; }
    sleep 0.5
  done
}
git checkout -q "$ref" -- $files
serve
PW_DIR="$pw" node demo/e2e/colours-capture.mjs "http://localhost:$port/" "$out" before
stop
git checkout -q HEAD -- $files
serve
PW_DIR="$pw" node demo/e2e/colours-capture.mjs "http://localhost:$port/" "$out" after compare
