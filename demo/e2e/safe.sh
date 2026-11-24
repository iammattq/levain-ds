#!/bin/sh
# T12's capture in one PC job: the phone sheet before (main's Sheet.tsx and shared.css, hand-written env()) and after
# (the safe-area utilities), on an emulated iPhone 14, Sage light.
#   ringmaster heavy t12 --kind capture --on pc --out <out> sh demo/e2e/safe.sh <out> [before-ref]
# before-ref: the commit whose two files make "before" (default main). The PC's checkout is a throwaway copy; the files
# are put back before "after" all the same.
set -eu
out=${1:-captures/T12}
ref=${2:-main}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
files="packages/ui-react/src/patterns/Sheet.tsx packages/tokens/src/styles/shared.css"
port=5198
vite=
stop() { [ -z "$vite" ] || { kill "$vite" 2>/dev/null || true; wait "$vite" 2>/dev/null || true; vite=; }; }
trap 'stop; git checkout -q HEAD -- $files' EXIT
serve() {
  (cd demo && exec pnpm exec vite --port $port --strictPort >/tmp/levain-t12-vite.log 2>&1) &
  vite=$!
  i=0
  until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t12-vite.log; exit 1; }; sleep 0.5; done
}
# before: the two files as they are at <ref>
git checkout -q "$ref" -- $files
serve
PW_DIR="$pw" node demo/e2e/safe-capture.mjs "http://localhost:$port/" "$out" before
stop
# after: this tree's
git checkout -q HEAD -- $files
serve
PW_DIR="$pw" node demo/e2e/safe-capture.mjs "http://localhost:$port/" "$out" after compare
