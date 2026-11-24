#!/bin/sh
# T37's capture in one PC job: the scrim behind BottomSheet and Drawer at 390 px, Sage and Cobalt Mono, light and dark,
# before (Sheet.tsx as on <before-ref>: main's, or a commit with the same Sheet.tsx that the PC's checkout has, such as
# the branch's base) and after (this tree), then the comparison and composite.
#   ringmaster heavy t37 --kind capture --on pc --out <out> sh demo/e2e/scrim.sh <out> <before-ref>
# The before run swaps in that ref's Sheet.tsx and puts this tree's back afterwards (the checkout is a throwaway).
set -eu
out=${1:-captures/T37}
ref=$2
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
sheet=packages/ui-react/src/patterns/Sheet.tsx
cp "$sheet" /tmp/levain-t37-sheet.tsx
vite=
# pnpm starts vite as its child: stop both, by the port's own command line too
stop() { [ -z "$vite" ] || kill $vite 2>/dev/null || true; pkill -f "vite --port $port" 2>/dev/null || true; vite=; }
trap 'stop; cp /tmp/levain-t37-sheet.tsx "$root/$sheet"' EXIT
shoot() {
  (cd demo && exec pnpm exec vite --port $port --strictPort --force >/tmp/levain-t37-vite.log 2>&1) &
  vite=$!
  i=0
  until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat /tmp/levain-t37-vite.log; exit 1; }; sleep 0.5; done
  PW_DIR="$pw" node demo/e2e/scrim-capture.mjs shoot "http://localhost:$port/" "$out" "$1"
  stop
  port=$((port + 1))
}
shoot after
git show "$ref:$sheet" > "$sheet"
echo "before: $sheet from $ref ($(git rev-parse --short "$ref"))"
shoot before
cp /tmp/levain-t37-sheet.tsx "$sheet"
PW_DIR="$pw" node demo/e2e/scrim-capture.mjs compare "$out"
