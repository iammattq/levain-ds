#!/bin/sh
# T72: FabMenu open in the button's colour (openFill, openScheme="light"), before and after, in one PC job.
#   ringmaster heavy t72 --kind capture --on pc --out <out> sh demo/e2e/fab-fill.sh <out> [<before-ref>]
# The after is this tree's demo; the before is <before-ref>'s (default: the merge base with main), in a detached worktree,
# captured by this tree's script (the script is new here). Frames: <width>-<combo>-<frame>-{before,after}.png.
set -eu
out=${1:-captures/T72}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
ref=${2:-$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD origin/main)}
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
before=$(mktemp -d /tmp/levain-t72-before.XXXXXX)
git worktree add --detach "$before" "$ref" >/dev/null
port=${DEMO_PORT:-$((5200 + $$ % 700))}
bport=$((port + 1))
vite=; bvite=
cleanup() { kill $vite $bvite 2>/dev/null || true; git -C "$root" worktree remove --force "$before" 2>/dev/null || true; }
trap cleanup EXIT
(cd "$before" && pnpm install --frozen-lockfile --silent --prefer-offline)
(cd demo && exec pnpm exec vite --port $port --strictPort >/tmp/levain-t72-vite.log 2>&1) & vite=$!
(cd "$before/demo" && exec pnpm exec vite --port $bport --strictPort >/tmp/levain-t72-bvite.log 2>&1) & bvite=$!
for p in $port $bport; do
  i=0
  until curl -sf "http://localhost:$p/" >/dev/null; do i=$((i + 1)); [ $i -lt 90 ] || { cat /tmp/levain-t72-vite.log /tmp/levain-t72-bvite.log; exit 1; }; sleep 0.5; done
done
echo "before: $ref ($(git rev-parse --short "$ref")), after: $(git rev-parse --short HEAD)"
PW_DIR="$pw" node demo/e2e/fab-fill-capture.mjs "http://localhost:$bport/" "http://localhost:$port/" "$out"
