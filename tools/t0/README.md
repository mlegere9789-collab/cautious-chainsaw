# tools/t0 - the Tranche-0 release build system

Turns the byte-exact baseline `legacy/dist` (Netlify deploy 6aa16d61, entry `assets/index-Cg8FAMXN.js`, md5 `7ef75b95f4c02700430b8aa91e3a7459`)
into the four cumulative release trains of chapter 02 (`docs/plan/FINAL/02-tranche0-hotfix-runbook.md`) **without ever touching `legacy/`**.
Output goes to `release/<train>/` (git-ignored). Everything is deterministic: two builds give the same bytes.

```
python tools/t0/build.py --train R0|R1a|R1b|R1c [--out release/<train>]     # one train (default R0)
python tools/t0/build.py --all                                             # R0, R1a, R1b, R1c
node   tools/t0/gate.mjs --train R1a                                       # re-run the gates on an existing build
python tools/t0/overlap.py                                                 # geometric overlap audit of the patch set
python tools/t0/ledger.py seed|check|record                                # used-names ledger (ops/used-names.txt)
node   tools/t0/serve.mjs release/R0/dist 8300                             # Netlify-like static server (npm run serve)
python tests/t0/build_selftest.py                                          # 9 properties of the build system (npm run t0:test:build)
node   tests/t0/lib_selftest.mjs                                            # the browser harness proves itself (npm run t0:test:lib)
node   tests/t0/r0.mjs                                                     # R0 acceptance in real Chrome (npm run t0:test:r0)
```
npm: `t0:build`, `t0:build:all`, `t0:gate`, `t0:overlap`, `t0:ledger:seed`, `t0:test:build`, `t0:test:lib`, `t0:test:r0`, `t0:test` (all three), `serve`.
Exit codes of `build.py`: 0 ok, 2 precondition / anchor / overlay / ledger failure (nothing shipped), 3 gate failure (dist kept for inspection).

## Trains (`trains.json`)

Trains are cumulative. Bundle groups always apply in the fixed order **R0, A, B, DL, C, AX, CP** (AX must follow C; the rest commute, see below).

| train | adds | overlay dirs | config hook |
|---|---|---|---|
| R0 | mechanism (hashed names, boot loader, no-reload SW, kill switch, version.json) + group R0 (`R0-intro-delete`) | `R0` | no |
| R1a | + group A (crash/input/storage, D-SOUND, D-HEATMAP) + page groups `PG-*.json` + assets overlay | `R0 common R1a` | no |
| R1b | + group C (mobile shell, 53 bundle + 3 `index.html` rows) + group AX (a11y bridge, 13) | `... R1b` | no |
| R1c | + group B (clock/data, 12) + DL (deep links) + CP (copy: 16 bundle + 2 Help rows) + config | `... R1c` | `config/gen.mjs` |

Optional, in no train: group **EB** (AMD-T0-1 error boundary): `python tools/t0/build.py --train R1a --with EB`.
Counts (anchor records in `release/<train>/anchors.json`, 21 of them are the R0 mechanism `R0M:*` rows): R0 22, R1a 46, R1b 115, R1c 146.

## Build order

1. **Input checks** - `legacy/dist` tree sha256 (119 files) and every pinned asset sha256, entry md5, and *no* `/*t0:` sentinel anywhere (refuses to patch its own output).
2. **Bundle groups** - every patch whose `target` is `js` (entry bundle), `help` (HelpModal chunk), `book` (BookmarkPanel chunk) or `css` (app stylesheet), in fixed group order. Each patch's `find` is counted against the CURRENT text and must equal `expect`; failures are all collected, listed with their ids and the build stops (only `anchors.json` is written).
3. **R0 rename / mechanism** (`t0build/mechanism.py`, templates in `mechanism/`) - release id `rid = sha256(entry' 0x00 help' 0x00 book')[:8]` over the patched texts with the three cross-references replaced by placeholders (B.7); writes `index-<rid>.js`, `HelpModal-<rid>.js`, `BookmarkPanel-<rid>.js`, `index-<sha256(css)[:8]>.css`, stamps `/*t0:<rid>*/` on the entry, deletes the five legacy assets (entry, both chunks, CSS, orphan `InterpolationWorker-*.js`), rewrites `index.html` (no `modulepreload`, plain stylesheet, only `preconnect https://api.mapbox.com`, `color-scheme` meta, splash fade removed, idle SW registration + chunk-error guard, `site-nav.js` deferred, boot-after-first-paint loader with one reload retry then a visible "Try again"), removes the body entrance animation from `site-nav.css`, writes the new `sw.js` and `_ops/sw-kill.js` (copy of `ops/sw-kill.js`).
4. **Page phase** - patches with a path `target` (`dashboard.html`, `site-nav.js`, `index.html` ...) from the fixed groups (e.g. C's three `index.html` rows), then the page groups `PG-*.json` (sorted), each with optional `delete` lists.
5. **Overlay** - `overlay/<dir>/**` for the train's dirs, copied over dist (paths relative to the dist root).
6. **Config hook** (R1c) - `node tools/t0/config/gen.mjs <dist> '<json>'`.
7. **Finalize** - `version.json`, `_ops/asset-manifest.json`, `_ops/used-names.txt`; ledger check.
8. **Gates** (`gate.mjs`) -> `release/<train>/gate.json`; then `release/<train>/manifest.json` (every file's bytes+sha256, tree hash).

Output layout: `release/<train>/dist/` (deploy this), `anchors.json`, `gate.json`, `manifest.json`. Nothing in `dist` is timestamped; `version.json` = `{release, train, entry, help, bookmark, css, groups, source_entry_md5}`.

## Plugin interface (other agents add files, they do not edit the build code)

### Patch data files: `tools/t0/patches/<GROUP>.json`
```json
{ "group": "A",
  "patches": [ { "id": "unique-across-all-files", "target": "js", "find": "exact text", "repl": "replacement",
                 "expect": 1, "regex": false, "note": "optional" } ],
  "delete": ["diagnostics.html"] }
```
* `target`: `js` | `help` | `book` | `css` (bundle files, applied **before** the rename, so the release id covers them) or a relative posix path inside dist (`dashboard.html`, `site-nav.js`, `data/x.json` ...). Not allowed: `sw.js`, `version.json`, `_ops/**`, `assets/**` (generated; use the templates in `mechanism/`, the overlay, or a bundle target).
* `expect` (>= 1) is asserted against the current text before the patch applies. `regex: true` uses Python `re` for `find` and `re.Match.expand` (`\1`, `\g<name>`) for `repl`; the count is `len(findall)`.
* Path-target patches may use `{{RID}} {{ENTRY}} {{HELP}} {{BOOK}} {{CSS}} {{TRAIN}}` in `repl` (e.g. `?v={{RID}}` on `site-nav.*` links). Bundle patches may not (no rid yet).
* `delete` removes files from dist after that group's patches (each must exist).
* Unknown keys, duplicate ids, a `group` that does not match the file name, a bundle target in a `PG-*` file: the build fails at load time with the file and patch id.
* **Fixed-order groups** are the ones named in `trains.json` (`R0 A B DL C AX CP`, optional `EB`). Add more patches to one without touching the main file with an **extension part** `A+<anything>.json` (`"group": "A"`), applied after the main file's patches, in filename order. New logical groups need a `trains.json` entry (owner of this file: t0-core).
* **Page groups** `PG-<name>.json`: path targets only, applied after all bundle groups' page-phase patches, sorted by file name; optional top-level `"train": "R1a"|"R1b"|"R1c"` = first train that includes it (default `R1a`, so R0 never contains page groups).
* Every patch (also the mechanism's own `R0M:*` rows) ends up in `anchors.json`; the gate fails on any count mismatch.

### What path-target patches see
Page-phase patches run on the tree AFTER the R0 mechanism, so anchor against that text, not against `legacy/dist`: `index.html` has no `modulepreload`, no CSS preload/`noscript`, only the `preconnect https://api.mapbox.com` hint, a `<meta name="color-scheme" content="dark" />` after `theme-color`, no `animation: boot-fade-in` in `#boot-splash`, the idle-registration script and the loader script (both from `mechanism/`), `<script defer src="/site-nav.js"></script>`, `<link rel="stylesheet" href="/assets/index-<css>.css" crossorigin />`; `site-nav.css` has no `body{animation}` fade; `sw.js`, `version.json` and `_ops/**` exist but are reserved.

### Overlay: `tools/t0/overlay/<dir>/**`
New or replacement files (binary ok), path relative to dist root. `R0` applies to every train, `R1a`/`R1b`/`R1c` to that train and later ones, `common` to R1a-R1c only (R0 is mechanism-only by D-ORDER; put a file in `overlay/R0` if it truly belongs there). Applied after the page phase, so an overlay file wins over a patched one; replacements are listed in `manifest.json` (`overlay[].replaced`). `README*` and `.gitkeep` are skipped. Overlay files under `assets/` are new asset names and go through the ledger.

### Config hook: `tools/t0/config/gen.mjs` (stub, R1c only)
Receives `argv[2]` = dist path, `argv[3]` = JSON `{rid, entry, help, bookmark, css}`, env `T0_TRAIN`. May write only `_headers`, `_redirects`, `netlify.toml`, `_ops/**`; the build diffs the tree and fails if anything else changed. Must be deterministic.

## Gates (`gate.mjs`, `release/<train>/gate.json`)

| id | checks |
|---|---|
| `parse` | acorn parse of every `.js` (module for `assets/`, script-then-module elsewhere) and every inline `<script>`; only NEW failures vs `legacy/dist` fail |
| `unresolved-globals` | eslint-scope: bare-name references that resolve to no declaration in entry/Help/Bookmark vs the legacy chunks. `setGoldUnit clearGoldTrail drawGoldTrailSegment CanvasRenderer` must be gone exactly when group A is in (R1a+) and untouched in R0; no other new names except the standard globals in `browser-globals.json` (`matchMedia`, `sessionStorage` ... are used by group C) |
| `anchors` | reads `anchors.json`: every patch found exactly `expect` times |
| `ledger` | every `assets/*` name vs `ops/used-names.txt` (case-insensitive): same name must keep its bytes, a new name must not collide with any archived name |
| `references` | every `/assets/x` string in any html/js/css/json/toml/_headers file, every relative `"./x.js"` import in assets, every local `<script src>/<link href>/<img src>` and manifest icon/screenshot resolves to a file; only NEW dangling refs fail |
| `no-legacy-asset-names` | none of the five legacy asset names is referenced or present (outside the ledger copy) |
| `r0-mechanism` | sentinel, `version.json` <-> files, `sw.js` (no `skipWaiting(`, claims, cache name, bails on navigations), `index.html` (loader names the entry, no `controllerchange`, no `modulepreload`, no fade, `site-nav.js` deferred), `asset-manifest.json` lists exactly `assets/`, `_ops/sw-kill.js` == `ops/sw-kill.js`, `node --check` of both workers |
| `legacy-pinned` | `legacy/dist` still hashes to the pinned tree digest (119 files) |
| `data-untouched` | no `data/*` file of the legacy tree is modified or removed (T0 rule 5); added files are listed, not failed |
| `bytes` | total / per-directory / biggest files, delta vs legacy, entry size + brotli size |

## The used-names ledger (`ops/used-names.txt`)

TSV `name  sha256  bytes  zips  first-source`, seeded by `python tools/t0/ledger.py seed` from **every** file that sits in an `assets/` folder inside the 127 archived zips (`C:/Users/mlege/gettysburg-archive/zips`, python `zipfile`) plus `legacy/dist` (157 name/bytes pairs; `index-Cg8FAMXN.js` carries 45 byte streams, as chapter 02 says). The build refuses to publish a name that was published with different bytes and any new name that collides with an archived one. `_ops/used-names.txt` in dist is the ledger plus that train's names (archive file names are replaced by the word `archive`; the dist is public). After a **deploy** (owner step) run `python tools/t0/ledger.py record --dist release/R1a/dist --train R1a --rid <rid>` and commit `ops/used-names.txt`; `build.py --record` does the same at build time.

## Kill switch and rollback

`ops/sw-kill.js` (also `release/<train>/dist/_ops/sw-kill.js`): deploy it AS `/sw.js` (level L2). Tested by `T0-R0-06` including "no reload loop when the page re-registers it". Level L1 is Netlify "Publish deploy" of the previous deploy; old asset names still exist in old deploys. Note for deploys: `dist/netlify.toml` is the legacy file (`publish = "."`, the current headers); the Netlify CLI takes the toml from the working directory, not from `--dir`, so a CLI deploy needs a repo-root `netlify.toml` (owner/WP-T0-02) or the R1c `_headers` output.

## Tests

* `tests/t0/build_selftest.py` - determinism, sentinel/md5 refusal, mutated anchor -> that patch id and no dist, injected undefined identifier -> gate exit 3, group-order independence, plugin interface (PG placeholders, delete, overlay new+replace, reserved targets, hook whitelist), ledger reuse/collision/idempotence, `legacy/` untouched.
* `tests/t0/lib.mjs` - `openSession()` (system Chrome headless, own profile under `tmp/t0-core/chrome-profile/<name>` and own CDP port; playwright-core over CDP) with a raw CDP side channel that injects `Referer: https://gettysburginteractivemap.com/` on `api.mapbox.com` / `*.tiles.mapbox.com` requests of pages **and** workers (cap `T0_TILE_CAP`, default 300 per session, then `BlockedByClient`), stubs `events.mapbox.com` with a 204, records every request of every target with tokens masked (`net`, `tileStats`), and a `collector` for `pageerror` / first-party `console.error` / worker exceptions that ignores Mapbox tile noise. Helpers: `createStaticServer` (root swap, `/sw.js` override, blocked paths, Netlify-like caching headers), `mouseDrag`, `wheel`, `touchTap/Swipe/Pinch` (CDP `Input.dispatchTouchEvent`), `emulateViewport`, `VIEWPORTS`/`ALL_VIEWPORTS` (`tests/t0/viewports.json`), `hitTest` (`elementFromPoint`), `screenshot`, `waitForApp`, `chooseLayout` (the legacy "Choose Your Experience" gate), `mapView` (camera read through React's fiber tree; the app exposes no map on `window`), `swState`, `cacheKeys`, `createSuite`. Env: `T0_PORT_BASE` (8300; server = base, CDP ports base+1..), `T0_TILE_CAP`, `T0_CHROME`, `T0_AGENT` (scratch dir name).
* `tests/t0/lib_selftest.mjs` - proves the harness (worker-issued Mapbox request gets the Referer and is counted, `block` mode and the run-wide budget keep requests local, collector kinds, real mouse/touch events, viewport emulation, `hitTest`, screenshot, `chooseLayout`/`mapView` on R1a vs R0). `npm run t0:test:lib`.
* Mapbox budget: `tileBudget` is shared by every session of one run (default 300, `T0_TILE_CAP`); sessions default to `tiles:'inject'`, tests that do not need a map open with `tiles:'block'` (nothing leaves the machine) and can switch with `session.setTiles()`. The R0 suite used 100 of 300.
* `tests/t0/r0.mjs` - `T0-R0-01` one Document, `-02` controller without navigation, `-03` one sku/one style request, `-04` upgrade drill (legacy tree + old `gbg-v5` worker, then R0 over it: one Document, new entry, old entry never requested, new worker waiting, 0 exceptions), `-05` Help (`?`) and Bookmarks open via the new chunks without remounting, `-06` kill drill, `-07` loader 404 -> one reload -> "Try again" -> recovery, `-08` version.json/sentinel, `-09` timing sanity (paint before boot, splash LCP, no fades, CLS, mount time), `-10` after all tabs close the waiting worker purges `gbg-v5` only, `-11` rename drill, `-12` first visit on a 375x812 touch viewport (one Document, controller without navigation, no exceptions). `--dist legacy/dist --expect-red --filter 'R0-0[1-3]'` proves X1 is red on the legacy tree. Results: `release/<train>/test-r0.json`.
* Every test that touches Mapbox goes through the harness: tile requests are the owner's token used with the production Referer, capped.

## Deliberate deviations from the scratch scripts / chapter 02 (all documented, none changes the R1c end state)

1. Group order is the one requested, `R0 A B DL C AX CP`; the scratch runner's constant and chapter 02 use `R0 A C AX B DL CP`. `--order runbook` builds the other order; `build_selftest` asserts identical shipped files.
2. The Help-chunk row for the deleted `H` key (copy row h09) is removed in group A together with the key and the tour row (D-HEATMAP), not in CP, so R1a/R1b never list a dead key. A = 23 bundle + 1 Help patch, CP = 16 bundle + 2 Help patches.
3. `HF-12a` (viewport): the `apple-mobile-web-app-*` metas are dropped (chapter 02 section 7) and so is its `color-scheme` meta, which the R0 mechanism already adds; `mobile-web-app-capable` is kept.
4. `overlay/common` starts at R1a (R0 = mechanism only).
5. `css` bundle target, `{{RID}}`-style placeholders, `delete`, extension parts and `train` on page groups are additions to the interface described in the task.
6. `gate.mjs` allows the standard Web globals listed in `browser-globals.json` as "new unresolved" names; the four known undefined names are still required to disappear with group A.
7. The ledger is `ops/used-names.txt` (committed) plus a per-train copy in `dist/_ops/`.
