#!/bin/sh
# T53's capture in one PC job: the demo's second form block (?only=forms, [data-demo="forms-2"]: TextInput, Select, Checkbox, RadioButton) before
# and after the form-input convention, at 390 and 1280 px, Sage and Cobalt Mono, light and dark, with a pixel diff of
# each pair and the composite.
#   ringmaster heavy t53 --kind capture --on pc --out <out> sh demo/e2e/forms2.sh <out> [<base>]
# "Before" is the four components at <base> (default ba01576, T53's base), put in place for the first pass and restored
# from HEAD on exit; the demo section takes only props both versions take.
set -eu
out=${1:-captures/T53}
base=${2:-ba01576}
root=$(cd "$(dirname "$0")/../.." && pwd)
case "$out" in /*) ;; *) out="$root/$out" ;; esac
cd "$root"
files="TextInput Select Checkbox RadioButton"
git cat-file -e "$base^{commit}" 2>/dev/null || { echo "forms2.sh: base $base is not in this checkout"; exit 1; }
pnpm install --frozen-lockfile --silent
pw=${PW_DIR:-$HOME/.cache/levain-pw}
[ -d "$pw/node_modules/playwright-core" ] || npm i --silent --prefix "$pw" playwright-core@1.65.0
port=${DEMO_PORT:-$((5200 + $$ % 700))}
log=/tmp/levain-t53-vite.log
restore() { for f in $files; do git checkout HEAD -- "packages/ui-react/src/components/$f.tsx"; done; }
(cd demo && exec pnpm exec vite --port $port --strictPort >"$log" 2>&1) &
vite=$!
# pnpm starts vite as its child: stop both, by the port's own command line too; put the components back
trap 'restore; kill $vite 2>/dev/null || true; pkill -f "vite --port $port" 2>/dev/null || true' EXIT
i=0
until curl -sf "http://localhost:$port/" >/dev/null; do i=$((i + 1)); [ $i -lt 60 ] || { cat "$log"; exit 1; }; sleep 0.5; done
for f in $files; do git show "$base:packages/ui-react/src/components/$f.tsx" > "packages/ui-react/src/components/$f.tsx"; done
sleep 2
PW_DIR="$pw" node demo/e2e/forms2-capture.mjs "http://localhost:$port/" "$out" before
restore
sleep 2
PW_DIR="$pw" node demo/e2e/forms2-capture.mjs "http://localhost:$port/" "$out" after
