#!/bin/sh
# T32's captures in one PC job: the demo on main (before) and on this tree (after), every base theme, light and dark,
# compared pixel for pixel and by every colour variable, plus the board's sequence, system mode and colour before JS.
#   ringmaster heavy t32 --kind capture --on pc --out <out> sh demo/e2e/themes.sh <out> [before-ref]
# before-ref: the commit to compare against (default main's e2ccc17, where T32 started).
set -eu
out=${1:-captures/T32}
before_ref=${2:-e2ccc17}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0

# the before tree: a worktree of before_ref beside this one, its own install (the lockfile is the same, so the store has it)
before=$(mktemp -d /tmp/levain-t32-before-XXXXXX)
rmdir "$before"
git worktree add --detach "$before" "$before_ref" >/dev/null
port_a=${DEMO_PORT:-$((5200 + $$ % 700))}
port_b=$((port_a + 1))
log_a=/tmp/levain-t32-after-$port_a.log
log_b=/tmp/levain-t32-before-$port_b.log
vite_a=''
vite_b=''
cleanup() {
  [ -n "$vite_a" ] && kill "$vite_a" 2>/dev/null || true
  [ -n "$vite_b" ] && kill "$vite_b" 2>/dev/null || true
  git -C "$root" worktree remove --force "$before" 2>/dev/null || rm -rf "$before"
}
trap cleanup EXIT
(cd "$before" && pnpm install --frozen-lockfile --offline --silent 2>/dev/null || pnpm install --frozen-lockfile --silent)

(cd demo && exec pnpm exec vite --port $port_a --strictPort >"$log_a" 2>&1) &
vite_a=$!
(cd "$before/demo" && exec pnpm exec vite --port $port_b --strictPort >"$log_b" 2>&1) &
vite_b=$!
for p in $port_a $port_b; do
  i=0
  until curl -sf "http://localhost:$p/" >/dev/null; do
    i=$((i + 1))
    [ $i -lt 90 ] || { echo "vite on $p did not start"; cat "$log_a" "$log_b"; exit 1; }
    sleep 0.5
  done
done
PW_DIR="$pw" node demo/e2e/themes-capture.mjs "http://localhost:$port_b/" "http://localhost:$port_a/" "$out" \
  packages/tokens/generated/themes.css packages/tokens/generated/themesV2.json
