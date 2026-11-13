#!/bin/bash
# Scratch checks of wp-arch-09 that need the npm registry or a second Node version. Nothing here touches the repository except the evidence files.
#
#   tools/horde/bench.sh bash candidates/r1h/wp-arch-09/scratch-checks.sh        (from the repository root; needs network for the npm registry)
#
# It builds its trees under tmp/r1h-cand/wp-arch-09/scratch (git-ignored), runs four checks, writes the evidence files
# candidates/r1h/wp-arch-09/evidence/{npm-workspaces,vite-bundle,typescript-strict,registry-readings}.txt, deletes the trees (KEEP=1 keeps them),
# and exits 1 when any check fails. Node 22 and Node 24 are taken from /opt/node22/bin and /opt/node24/bin (the container's installs).
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
W="${SCRATCH_DIR:-$ROOT/tmp/r1h-cand/wp-arch-09/scratch}"
EV="${EVIDENCE_DIR:-$ROOT/candidates/r1h/wp-arch-09/evidence}"
PARTS="${PARTS:-A B C D}"
ORIG_PATH="$PATH"
FAILS=0
mkdir -p "$EV"; rm -rf "$W"; mkdir -p "$W"

say() { printf '%s\n' "$*" | tee -a "$OUT"; }
ok() { say "PASS: $*"; }
bad() { say "FAIL: $*"; FAILS=$((FAILS + 1)); }
use_node() { export PATH="/opt/node$1/bin:$ORIG_PATH"; }

part_a() {
# ---------------------------------------------------------------------------------------------------------------- A. npm workspaces
OUT="$EV/npm-workspaces.txt"; : > "$OUT"
say "# npm workspaces: how the root wires src/ (wp-arch-09). Run $(date -u +%Y-%m-%dT%H:%M:%SZ)"
for N in 22 24; do
  use_node "$N"
  say ""; say "## Node $(node --version), npm $(npm --version)"
  # A1. nested control: a root that lists src does not see the workspaces src/package.json lists
  D="$W/nested$N"; mkdir -p "$D/src/lib/a" "$D/src/app"
  printf '{ "name": "nested-root", "private": true, "version": "0.0.0", "type": "module", "workspaces": ["src"] }\n' > "$D/package.json"
  cp "$ROOT/src/package.json" "$D/src/package.json"
  printf '{ "name": "@gtbg/a", "version": "0.0.0", "private": true, "type": "module" }\n' > "$D/src/lib/a/package.json"
  printf '{ "name": "@gtbg/app", "version": "0.0.0", "private": true, "type": "module" }\n' > "$D/src/app/package.json"
  (cd "$D" && npm install --offline --no-audit --no-fund --ignore-scripts >/dev/null 2>&1)
  if [ -L "$D/node_modules/gtbg-rebuild" ] && [ ! -e "$D/node_modules/@gtbg" ]; then ok "A1 root listing src links only src/package.json; its nested workspaces (lib/a, app) are not linked (no nested workspaces in npm $(npm --version))"; else bad "A1 nested control behaved differently"; fi

  # A2. the real files: only the rebuild foundation, so the count of tests is stable
  T="$W/ws$N"; mkdir -p "$T/src/config" "$T/src/lib" "$T/src/app" "$T/docs/battle-theatre/GOVERNANCE/horde/requests"
  cp "$ROOT/package.json" "$ROOT/package-lock.json" "$T/"
  for f in package.json tsconfig.base.json .nvmrc STACK.md README.md foundation.test.mjs; do cp "$ROOT/src/$f" "$T/src/$f"; done
  cp "$ROOT/src/app/README.md" "$T/src/app/"; cp "$ROOT/src/lib/README.md" "$T/src/lib/"
  cp "$ROOT/src/config/"{mapbox.js,mapbox.d.ts,tokens.test.mjs} "$T/src/config/"
  cp -r "$ROOT/src/lib/time" "$T/src/lib/time"
  cp "$ROOT/docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md" "$T/docs/battle-theatre/GOVERNANCE/horde/requests/"
  cp "$T/package.json" "$T/package.json.orig"; cp "$T/package-lock.json" "$T/package-lock.json.orig"

  # A3. red first: before the two lines the root script does not exist, and the foundation test already passes
  (cd "$T" && npm run src:test >"$T/red.txt" 2>&1); RC=$?
  if [ "$RC" -ne 0 ] && grep -q 'Missing script' "$T/red.txt"; then ok "A3 before the edit 'npm run src:test' exits $RC with: $(grep -m1 'Missing script' "$T/red.txt")"; else bad "A3 expected a missing script before the edit (exit $RC)"; fi
  (cd "$T" && node --test src/foundation.test.mjs >"$T/found-before.txt" 2>&1); RC=$?
  if [ "$RC" -eq 0 ]; then ok "A3 before the edit src/foundation.test.mjs passes (the root check applies only once the root lists workspaces)"; else bad "A3 foundation test failed before the edit (exit $RC)"; tail -30 "$T/found-before.txt" | tee -a "$OUT"; fi

  # A4. apply exactly the two lines of the request note
  python3 - "$T/package.json" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
a = '  "type": "module",\n'
b = '  "scripts": {\n'
assert s.count(a) == 1 and s.count(b) == 1
s = s.replace(a, a + '  "workspaces": ["src/lib/*", "src/app"],\n')
s = s.replace(b, b + '    "src:test": "npm test --prefix src",\n')
open(p, 'w', encoding='utf-8').write(s)
PY
  CHANGED=$(diff "$T/package.json.orig" "$T/package.json" | grep -c '^[<>]')
  if [ "$CHANGED" -eq 2 ] && diff "$T/package.json.orig" "$T/package.json" | grep -q '^> *"workspaces": \["src/lib/\*", "src/app"\],$' && diff "$T/package.json.orig" "$T/package.json" | grep -q '^> *"src:test": "npm test --prefix src",$'; then ok "A4 the edit adds exactly the two lines of the request note"; else bad "A4 the edit is not exactly two lines"; fi
  grep -q '"workspaces": \["src/lib/\*", "src/app"\],' "$ROOT/docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md" && grep -q '"src:test": "npm test --prefix src",' "$ROOT/docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md" && ok "A4 both lines appear verbatim in the request note"

  # A5. the lock file delta is the four-line workspaces array and nothing else
  (cd "$T" && npm install --package-lock-only --offline --no-audit --no-fund --ignore-scripts >"$T/lockonly.txt" 2>&1); RC=$?
  diff "$T/package-lock.json.orig" "$T/package-lock.json" > "$T/lock.diff"
  EXPECTED=$'9a10,13\n>       "workspaces": [\n>         "src/lib/*",\n>         "src/app"\n>       ],'
  if [ "$RC" -eq 0 ] && [ "$(cat "$T/lock.diff")" = "$EXPECTED" ]; then ok "A5 'npm install --package-lock-only' changes only the four-line workspaces array of the root lock entry"; else bad "A5 lock file delta differs (exit $RC)"; cat "$T/lock.diff" | tee -a "$OUT"; fi

  # A6. npm ci: dry run, then real; no workspace link is created, 27 packages as before
  (cd "$T" && npm ci --dry-run --no-audit --no-fund --ignore-scripts >"$T/ci-dry.txt" 2>&1); RC=$?
  ADDS=$(grep -c '^add ' "$T/ci-dry.txt")
  if [ "$RC" -eq 0 ] && [ "$ADDS" -eq 27 ]; then ok "A6 'npm ci --dry-run' exits 0 and lists $ADDS packages"; else bad "A6 npm ci --dry-run exit $RC, $ADDS packages"; fi
  (cd "$T" && npm ci --no-audit --no-fund --ignore-scripts >"$T/ci.txt" 2>&1); RC=$?
  LINKS=$(find "$T/node_modules" -maxdepth 2 -type l -not -path '*/.bin/*' | wc -l)
  if [ "$RC" -eq 0 ] && grep -q 'added 27 packages' "$T/ci.txt" && [ "$LINKS" -eq 0 ]; then ok "A6 'npm ci' added 27 packages and created $LINKS workspace links outside node_modules/.bin (no workspace has a package.json yet)"; else bad "A6 npm ci exit $RC, links $LINKS: $(tail -2 "$T/ci.txt")"; fi

  # A7. the new script runs the tests of src/
  (cd "$T" && npm run src:test >"$T/src-test.txt" 2>&1); RC=$?
  TESTS=$(grep -E -m1 '(# |ℹ )tests [0-9]+' "$T/src-test.txt" | grep -o '[0-9]*$'); FAILED=$(grep -E -m1 '(# |ℹ )fail [0-9]+' "$T/src-test.txt" | grep -o '[0-9]*$')
  if [ "$RC" -eq 0 ] && [ "$TESTS" = "23" ] && [ "$FAILED" = "0" ]; then ok "A7 'npm run src:test' exits 0: $TESTS tests, $FAILED failed (13 in tokens.test.mjs, 10 in foundation.test.mjs)"; else bad "A7 npm run src:test exit $RC, tests '$TESTS', fail '$FAILED'"; tail -40 "$T/src-test.txt" | tee -a "$OUT"; fi
  # A8. 'workspaces' listed with `npm ls` works and the folder without package.json is skipped
  (cd "$T" && npm ls --workspaces >"$T/ls.txt" 2>&1); say "INFO: 'npm ls --workspaces' at the wired root prints: $(head -1 "$T/ls.txt")"
done
}

part_b() {
# ---------------------------------------------------------------------------------------------------------------- B. Vite bundles the real module
OUT="$EV/vite-bundle.txt"; : > "$OUT"
use_node 22
say "# Vite 8.3.8 bundling the real src/config/mapbox.js (wp-arch-09). Run $(date -u +%Y-%m-%dT%H:%M:%SZ), Node $(node --version)"
V="$W/vite"; mkdir -p "$V"
printf '{"name":"vite-check","private":true,"version":"0.0.0","type":"module"}\n' > "$V/package.json"
(cd "$V" && npm install --no-audit --no-fund --ignore-scripts vite@8.3.8 >"$V/install.txt" 2>&1)
if [ -x "$V/node_modules/.bin/vite" ]; then ok "B0 installed $("$V/node_modules/.bin/vite" --version)"; else bad "B0 vite did not install"; fi
printf "export { getMapboxToken, isProductionBuild, MapboxTokenError } from '%s/src/config/mapbox.js';\n" "$ROOT" > "$V/entry.js"
cat > "$V/vite.config.js" <<'EOF'
import { defineConfig } from 'vite';
export default defineConfig({
  envPrefix: process.env.GTBG_PREFIX ?? 'PUBLIC_',
  logLevel: 'warn',
  build: { minify: false, outDir: process.env.GTBG_OUT, emptyOutDir: true, lib: { entry: 'entry.js', formats: ['iife'], name: 'Cfg', fileName: 'cfg' } },
});
EOF
cat > "$V/probe.mjs" <<'EOF'
// Runs a built iife in a context that has no process (like a browser) and reports what the module does there.
import fs from 'node:fs';
import vm from 'node:vm';
const [file, secret] = process.argv.slice(2);
const code = fs.readFileSync(file, 'utf8');
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const out = { hasProcess: vm.runInContext('typeof process', ctx), production: vm.runInContext('Cfg.isProductionBuild()', ctx) };
try { out.token = vm.runInContext('Cfg.getMapboxToken()', ctx); } catch (e) { out.error = { name: e.name, code: e.code, mentionsSecret: secret ? String(e.message).includes(secret) : false }; }
console.log(JSON.stringify(out));
EOF
build() { # name, prefix, mode, env assignments...
  local name="$1" prefix="$2" mode="$3"; shift 3
  (cd "$V" && env -u PUBLIC_MAPBOX_TOKEN GTBG_PREFIX="$prefix" GTBG_OUT="$V/dist-$name" "$@" ./node_modules/.bin/vite build --mode "$mode" >"$V/build-$name.txt" 2>&1)
}
FIX_PUB="pk.fixture-vite-token"; FIX_SEC="sk.fixture-vite-secret"
build b1 PUBLIC_ production PUBLIC_MAPBOX_TOKEN="$FIX_PUB"
build b2 PUBLIC_ production
build b3 VITE_ production PUBLIC_MAPBOX_TOKEN="$FIX_PUB"
build b4 PUBLIC_ staging
build b5 PUBLIC_ production PUBLIC_MAPBOX_TOKEN="$FIX_SEC"
R1=$(node "$V/probe.mjs" "$V/dist-b1/cfg.iife.js"); R2=$(node "$V/probe.mjs" "$V/dist-b2/cfg.iife.js"); R3=$(node "$V/probe.mjs" "$V/dist-b3/cfg.iife.js"); R4=$(node "$V/probe.mjs" "$V/dist-b4/cfg.iife.js"); R5=$(node "$V/probe.mjs" "$V/dist-b5/cfg.iife.js" "$FIX_SEC")
say "b1 PUBLIC_ prefix, production, token set:      $R1"; say "b2 PUBLIC_ prefix, production, token unset:    $R2"; say "b3 VITE_ prefix (default), token set:         $R3"
say "b4 PUBLIC_ prefix, staging mode, token unset:  $R4"; say "b5 PUBLIC_ prefix, production, secret token:   $R5"
[ "$(grep -c "$FIX_PUB" "$V/dist-b1/cfg.iife.js")" = "1" ] && ok "B1 the value is embedded exactly once when the PUBLIC_ prefix is exposed" || bad "B1 embedded count differs"
[ "$R1" = '{"hasProcess":"undefined","production":true,"token":"'"$FIX_PUB"'"}' ] && ok "B1 browser route (no process): PROD is true and the token is returned" || bad "B1 probe differs"
[ "$(grep -c "$FIX_PUB" "$V/dist-b2/cfg.iife.js")" = "0" ] && echo "$R2" | grep -q '"code":"MAPBOX_TOKEN_MISSING"' && ok "B2 token unset in a production bundle: nothing embedded, the call throws MapboxTokenError MAPBOX_TOKEN_MISSING" || bad "B2 differs"
[ "$(grep -c "$FIX_PUB" "$V/dist-b3/cfg.iife.js")" = "0" ] && echo "$R3" | grep -q '"code":"MAPBOX_TOKEN_MISSING"' && ok "B3 without the PUBLIC_ prefix the value is not embedded and a production bundle fails closed at the call" || bad "B3 differs"
echo "$R4" | grep -q '"production":true' && echo "$R4" | grep -q '"code":"MAPBOX_TOKEN_MISSING"' && ok "B4 a staging mode of a production build keeps PROD true (the call throws when the token is unset)" || bad "B4 differs"
echo "$R5" | grep -q '"code":"MAPBOX_TOKEN_SECRET"' && echo "$R5" | grep -q '"mentionsSecret":false' && ok "B5 a secret token in the bundle environment is refused and never echoed" || bad "B5 differs"
if grep -rq 'pk\.eyJ' "$V"/dist-b*/ 2>/dev/null; then bad "B6 a bundle holds a token-shaped literal"; else ok "B6 no bundle holds a token-shaped literal"; fi
}

part_c() {
# ---------------------------------------------------------------------------------------------------------------- C. TypeScript strictness
OUT="$EV/typescript-strict.txt"; : > "$OUT"
use_node 22
say "# TypeScript compiling a strict consumer of src/config/mapbox.d.ts against src/tsconfig.base.json (wp-arch-09). Run $(date -u +%Y-%m-%dT%H:%M:%SZ)"
for TSV in 5.9 7.0.2; do
  D="$W/ts-$TSV"; mkdir -p "$D"
  printf '{"name":"tsc-check","private":true,"version":"0.0.0"}\n' > "$D/package.json"
  (cd "$D" && npm install --no-audit --no-fund --ignore-scripts "typescript@$TSV" >"$D/install.txt" 2>&1)
  TSC="$D/node_modules/.bin/tsc"
  [ -x "$TSC" ] || { bad "C0 typescript@$TSV did not install"; continue; }
  REL="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' "$ROOT/src/config/mapbox.js" "$D")"
  cat > "$D/consumer.ts" <<EOF
import { getMapboxToken, isProductionBuild, MapboxTokenError, TOKEN_ENV_NAME, type MapboxEnv, type MapboxTokenErrorCode } from '$REL';

const env: MapboxEnv = { PUBLIC_MAPBOX_TOKEN: 'pk.fixture', PROD: true };
export const token: string | null = getMapboxToken(env);
export const prod: boolean = isProductionBuild({ MODE: 'production' });
export const name: 'PUBLIC_MAPBOX_TOKEN' = TOKEN_ENV_NAME;
const processLike: Record<string, string | undefined> = {};
export const fromProcessLike: string | null = getMapboxToken(processLike);
export function code(): MapboxTokenErrorCode | null {
  try {
    getMapboxToken();
    return null;
  } catch (e) {
    return e instanceof MapboxTokenError ? e.code : null;
  }
}
const err = new MapboxTokenError('MAPBOX_TOKEN_MISSING', 'm');
export const errName: 'MapboxTokenError' = err.name;
EOF
  cat > "$D/bad.ts" <<EOF
import { getMapboxToken } from '$REL';
import { MapboxEnv } from '$REL';

const arr: string[] = ['a'];
export const first: string = arr[0];
interface Opt { a?: number }
export const o: Opt = { a: undefined };
export function f(x) { return x; }
export const t: string = getMapboxToken();
export const e: MapboxEnv = {};
EOF
  printf '{ "extends": "%s/src/tsconfig.base.json", "files": ["consumer.ts"] }\n' "$ROOT" > "$D/tsconfig.good.json"
  printf '{ "extends": "%s/src/tsconfig.base.json", "files": ["bad.ts"] }\n' "$ROOT" > "$D/tsconfig.bad.json"
  say ""; say "## $("$TSC" --version)"
  (cd "$D" && "$TSC" -p tsconfig.good.json --pretty false >"$D/good.txt" 2>&1); RC=$?
  [ "$RC" -eq 0 ] && [ ! -s "$D/good.txt" ] && ok "C1 strict consumer compiles with 0 errors on $("$TSC" --version)" || { bad "C1 consumer failed on $("$TSC" --version) (exit $RC)"; cat "$D/good.txt" | tee -a "$OUT"; }
  (cd "$D" && "$TSC" -p tsconfig.bad.json --pretty false >"$D/bad.txt" 2>&1); RC=$?
  sed -E "s#$ROOT#<repo>#g; s#^$D/##" "$D/bad.txt" | tee -a "$OUT"
  [ "$RC" -ne 0 ] && [ "$(grep -c 'error TS' "$D/bad.txt")" -eq 5 ] && grep -q 'bad.ts(2,.*TS1484' "$D/bad.txt" && grep -q 'bad.ts(5,.*TS2322' "$D/bad.txt" && grep -q 'bad.ts(7,.*TS2375' "$D/bad.txt" && grep -q 'bad.ts(8,.*TS7006' "$D/bad.txt" && grep -q 'bad.ts(9,.*TS2322' "$D/bad.txt" \
    && ok "C2 five deliberate violations are each rejected on $("$TSC" --version): verbatimModuleSyntax (TS1484), noUncheckedIndexedAccess (TS2322), exactOptionalPropertyTypes (TS2375), noImplicitAny (TS7006), strictNullChecks (TS2322)" \
    || bad "C2 the violations were not all rejected on $("$TSC" --version)"
done
}

part_d() {
# ---------------------------------------------------------------------------------------------------------------- D. registry readings
OUT="$EV/registry-readings.txt"; : > "$OUT"
use_node 22
say "# Registry readings of 2026-11-13 behind src/STACK.md section 5, re-read $(date -u +%Y-%m-%dT%H:%M:%SZ). A later reading may differ; the table in STACK.md is dated."
SEMVER="$(npm root -g)/npm/node_modules/semver"
for pv in react@18.3.1 react-dom@18.3.1 mapbox-gl@3.24.1 zustand@latest typescript@latest typescript-eslint@latest eslint@latest vite@latest astro@latest vitest@latest size-limit@latest; do
  p="${pv%@*}"; v="${pv##*@}"
  curl -sS --max-time 30 "https://registry.npmjs.org/$p/$v" | node -e '
const fs = require("fs"); const semver = require(process.argv[1]);
let d; try { d = JSON.parse(fs.readFileSync(0, "utf8")); } catch (e) { console.log("lookup failed: " + e.message); process.exit(0); }
if (!d.version) { console.log("lookup failed: " + JSON.stringify(d).slice(0, 120)); process.exit(0); }
const node = d.engines && d.engines.node;
const fit = node ? ["22.23.4", "24.22.1"].map((n) => n + (semver.satisfies(n, node) ? " ok" : " NOT ACCEPTED")).join(", ") : "no engines.node";
console.log(JSON.stringify({ name: d.name, version: d.version, license: d.license, engines: d.engines, peerDependencies: d.peerDependencies && Object.fromEntries(Object.entries(d.peerDependencies).filter(([k]) => ["react", "typescript", "eslint", "vite"].includes(k))) }) + "\n    node: " + fit);
' "$SEMVER" | tee -a "$OUT"
  sleep 1.2
done
for p in typescript vite; do
  printf '%s dist-tags: ' "$p" | tee -a "$OUT"; curl -sS --max-time 30 "https://registry.npmjs.org/-/package/$p/dist-tags" | tee -a "$OUT"; echo | tee -a "$OUT"; sleep 1.2
done
}

# ---------------------------------------------------------------------------------------------------------------- end
for P in $PARTS; do case "$P" in A) part_a ;; B) part_b ;; C) part_c ;; D) part_d ;; esac; done
if [ "${KEEP:-0}" != "1" ]; then rm -rf "$W"; fi
echo
if [ "$FAILS" -eq 0 ]; then echo "scratch-checks: all checks passed"; else echo "scratch-checks: $FAILS check(s) FAILED"; fi
exit $((FAILS > 0))
