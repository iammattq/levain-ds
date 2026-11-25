#!/bin/sh
# T63's capture in one PC job: the image viewer's backdrop before (main's library) and after (this tree), same script,
# same frames, then the before/after composite.
#   ringmaster heavy t63 --kind capture --on pc --out <out> sh demo/e2e/solid.sh <out> <before-commit>
# The before runs <before-commit> (main) in a detached worktree beside the checkout, with this tree's demo/src/viewer.tsx
# copied over it: the demo page only (it adds the dark-scrim dialog frame), never the library.
set -eu
out=${1:?out}
before=${2:?before commit}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
mkdir -p "$out"
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
log=/tmp/levain-t63-vite.log
wt=$root/../levain-t63-before-$$
vite=
stop() { [ -z "$vite" ] || { kill $vite 2>/dev/null || true; pkill -f "vite --port $port" 2>/dev/null || true; wait $vite 2>/dev/null || true; }; vite=; }
trap 'stop; git -C "$root" worktree remove --force "$wt" 2>/dev/null || true' EXIT

# serve <tree> and shoot it as <label>
shoot() {
  (cd "$1/demo" && exec pnpm exec vite --port $port --strictPort >"$log" 2>&1) &
  vite=$!
  i=0
  until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat "$log"; exit 1; }; sleep 0.5; done
  PW_DIR="$pw" node "$root/demo/e2e/solid-capture.mjs" shoot "http://localhost:$port/" "$out" "$2"
  stop
}

git worktree add --detach "$wt" "$before" >/dev/null
cp demo/src/viewer.tsx "$wt/demo/src/viewer.tsx"
(cd "$wt" && pnpm install --frozen-lockfile --silent)
shoot "$wt" before
shoot "$root" after
PW_DIR="$pw" node demo/e2e/solid-capture.mjs compare "$out"
