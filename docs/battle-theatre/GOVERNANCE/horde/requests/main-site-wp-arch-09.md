# Request from main-site: wire the rebuild workspace into the root package.json (wp-arch-09)

Workstream: main-site (item wp-arch-09, "Toolchain, stack record, layout, config module"). Target owner: the release workstream, because `package.json`, `package-lock.json` and `tests/README.md` at the repository root are outside the main-site ownership. Nothing here is urgent and nothing here ships: no file of any train changes. The rebuild foundation itself is finished under `src/` (see `src/STACK.md` and `candidates/r1h/wp-arch-09/HANDOFF.md`); this note only asks for the wiring.

## 1. The two lines of the root package.json

File: `package.json`. Insert exactly these two lines and no others:

```diff
   "type": "module",
+  "workspaces": ["src/lib/*", "src/app"],
   "description": "Gettysburg Interactive Map: release tooling, tests and rebuild workspace (see docs/plan/FINAL/00-README.md)",
   "scripts": {
+    "src:test": "npm test --prefix src",
     "t0:build": "python tools/t0/build.py",
```

Why the entries are `src/lib/*` and `src/app` and not `src`: npm has no nested workspaces. A root that lists `src` links only `src/package.json` and ignores the `workspaces` list inside it (checked with npm 10.9.9). `src/package.json` lists `lib/*` and `app` relative to `src/`; the root lists the same two entries with the `src/` prefix. `src/foundation.test.mjs` fails if the root list ever differs from that prefix form.

Why a script: `npm test --prefix src` runs `node --test` inside `src/` and finds every test file under it, wherever it sits beside its code.

## 2. The lock file

Run `npm install --package-lock-only` at the root after the edit and commit `package-lock.json` with it. The only change is the root entry gaining the `workspaces` array:

```diff
       "name": "gettysburg-interactive-map",
       "version": "0.0.0",
+      "workspaces": [
+        "src/lib/*",
+        "src/app"
+      ],
       "devDependencies": {
```

Neither `src/lib/time` nor `src/app` has a `package.json` yet, and npm skips a workspace entry without one, so no workspace link is created and no package is added or removed: `npm ci` still installs the 27 packages of the current lock file.

## 3. One row for tests/README.md (rule 5 of that file: update it in the same commit)

In the table of "Data, time and historian tests" add:

```
| Source rebuild (`src/`) | `npm run src:test` (`npm test --prefix src`); `node --test src/config/tokens.test.mjs`; `node --test src/foundation.test.mjs` | the Mapbox token module and the scans that keep token literals and other readers out of `src/`; the workspace manifest, the strict TypeScript base, the stack record, the import rule for `mapbox-gl`. Tests of the rebuild sit beside the code under `src/` (see `src/README.md`) |
```

## 4. What is not requested

- No root `.nvmrc`. `src/.nvmrc` (24) states the toolchain target of the rebuild. Moving the rest of the repository (tools/t0, tests/t0, the Battle Theatre jobs, all run on Node 22.23.4 in the container) to Node 24 is a release decision this item cannot make.
- No dependency, no `packageManager` field, no CI file. The choices behind them are rows N5, N7, N9 and N12 of `src/STACK.md`.

## 5. The check the release workstream runs

Red first, before the edit: `npm run src:test` exits 1 with `Missing script: "src:test"`, and `node --test src/foundation.test.mjs` already passes (its root check applies only once the root lists workspaces).
After the edit and the lock file refresh:

```
npm run src:test                      expected: exit 0, 23 tests, 0 failed (13 in src/config/tokens.test.mjs, 10 in src/foundation.test.mjs)
npm ci --dry-run                      expected: exit 0, no workspace link, 27 packages
node --test src/foundation.test.mjs   expected: pass, with the root check now comparing ["src/lib/*", "src/app"] against src/package.json
```

## 6. What was run and what was not

Run: both lines were applied to a copy of the root `package.json` and `package-lock.json` in a scratch tree under `tmp/` (deleted afterwards) with the real `src/` beside it, on npm 10.9.9 (Node 22.23.4) and npm 11.19.1 (Node 24.22.1): `npm install --package-lock-only` produced exactly the four-line delta above, `npm ci` installed the 27 packages, `npm run src:test` passed. The script that does this is `candidates/r1h/wp-arch-09/scratch-checks.sh`; its saved output is `candidates/r1h/wp-arch-09/evidence/npm-workspaces.txt`.

Not run: the real root files were not edited (they are not this workstream's); no clean-install CI exists (it needs the owner-enabled CI); nothing was run on Windows or macOS.
