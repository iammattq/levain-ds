#!/bin/sh
# T9's capture in one PC job: the career Timeline before (main's Timeline.tsx) and after (rebuilt on TimelineList),
# Sage and Cobalt Mono, light and dark, plus the new release history.
#   ringmaster heavy t9 --kind capture --on pc --out <out> sh demo/e2e/timeline.sh <out> [before-ref]
# before-ref: the commit whose Timeline.tsx makes "before" (default main; on the PC pass a SHA, as only the job's
# commit is fetched there). Only that file is swapped: the demo section and TimelineList.tsx are this tree's in both runs
# (main's Timeline.tsx doesn't import TimelineList). The PC's checkout is a throwaway copy; the file is put back before
# "after" all the same.
set -eu
out=${1:-captures/T9}
ref=${2:-main}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
files="packages/ui-react/src/patterns/Timeline.tsx"
port=5199
vite=
stop() { [ -z "$vite" ] || { kill "$vite" 2>/dev/null || true; wait "$vite" 2>/dev/null || true; vite=; }; }
trap 'stop; git checkout -q HEAD -- $files' EXIT
serve() {
  (cd demo && exec pnpm exec vite --port $port --strictPort >/tmp/levain-t9-vite.log 2>&1) &
  vite=$!
  i=0
  until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t9-vite.log; exit 1; }; sleep 0.5; done
}
git checkout -q "$ref" -- $files
serve
PW_DIR="$pw" node demo/e2e/timeline-capture.mjs "http://localhost:$port/" "$out" before
stop
git checkout -q HEAD -- $files
serve
PW_DIR="$pw" node demo/e2e/timeline-capture.mjs "http://localhost:$port/" "$out" after compare
