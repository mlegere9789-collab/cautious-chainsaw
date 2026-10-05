# Deploy checklist: one train, one page

For the owner. Once per train, in the order **R0, R1a, R1b, R1c**, one production deploy each. Run every command from `C:\Users\mlege\gettysburg-map` (PowerShell or Git Bash). `<T>` = the train, `<PREV>` = the train deployed before it (none for R0), `<rid>` = the 8-character id the build prints. **Any step whose output is not what it says it must be: stop, deploy nothing, tell the AI.** Reasons: `ops/RELEASE-RUNBOOK.md`; what a train changes and what was tested: `ops/release-notes/<T>.md`. Nothing here has been run against a real Netlify deploy by this tooling: steps marked [unverified] use Netlify screens or CLI behaviour nobody has checked (labels move).

**0. Before the day**
- [ ] Day: Tue, Wed or Thu, morning US Eastern; not 2026-11-15..20; never a Friday after 12:00; one production deploy per train. Targets: R0 Tue 2026-10-13 (staging by Sun 10-11), R1a 10-20, R1b 10-27, R1c 11-03.
- [ ] The decisions in the table at the bottom are made. `git status --short` shows nothing under `tools/t0`, `tests/t0`, `ops`, `baseline`; `git log -1 --oneline` is the commit you mean to ship.
- [ ] `node --version` (20+), `python --version` (3.11), `netlify --version`, `netlify status` (logged in); you have the production and the `gbg-staging` site IDs; credits cover 15 per production deploy (runbook 7.3).

**1. Confirm the baseline against Netlify itself** (R0 only; recommended once, not required: owner decision 2026-10-04). The trains are built from `baseline/dist`, a byte-proved copy of what production serves; this adds `netlify.toml`, which is never served.
- [ ] Netlify > production site > **Deploys** > the deploy marked **Published** (its ID must start `6abd6d62`) > **Download deploy** [unverified labels]; keep the zip in `C:\Users\mlege\gettysburg-archive\zips`.
- [ ] `python tools/t0/baseline.py compare-zip "<path of the zip>"` expect `IDENTICAL: the zip holds exactly the 119 files of baseline/dist, byte for byte (netlify.toml included)`. `DIFFERENT`: stop, runbook section 15.

**2. Is production still what we think? Run it now, and again right before step 6.**
- [ ] **R0:** `python tools/t0/baseline.py verify-live` expect `IDENTICAL: live == baseline/dist (119 files checked ...)`, exit 0 (10-15 s). `DRIFTED`: stop, runbook section 15.
- [ ] **R1a, R1b, R1c** (`verify-live` says DRIFTED from the day R0 ships, by design): `node ops/sha-list.mjs verify-url release/<PREV>/served-list.tsv https://gettysburginteractivemap.com --tree release/<PREV>/dist --expect-missing netlify.toml,_headers,_redirects,diagnostics.html` expect `0 differ, 0 missing, 0 config file(s) publicly served, 0 errors`. (`served-list.tsv` was written by step 7.2 of the previous deploy; `release/<PREV>/dist/version.json` must show the rid in your log, else rebuild from tag `<PREV>-<rid>`.)

**3. Build and prove it**
- [ ] `python tools/t0/build.py --train <T>` ends `OK: <T>=<rid>` (the gates run inside); write the rid down. A `--with PG-legal` build has the same rid and a different tree digest.
- [ ] `python tools/t0/determinism.py --train <T>` prints `PASS <T> identical`.
- [ ] The suites of this exact tree are green in `ops/release-notes/<T>.md`. Built from another commit than the notes say: ask the AI to re-run `node tools/t0/run_suites.mjs --port-base 8760` (about 3 hours) first.

**4. Stage**
- [ ] `node ops/sha-list.mjs stage release/<T>/dist release/staging/<T> --force` expect `differs from the source ONLY in: _headers (X-Robots-Tag: noindex)`.
- [ ] `cd release\staging\<T>` then `netlify deploy --dir . --prod --site <STAGING_SITE_ID> --message "<T> <rid> staging"` (draft alternative: `ops/STAGING-SETUP.md` section 5) [unverified]. The CLI may print a "Configuration path" line [unverified]: it must name the `netlify.toml` inside this folder.
- [ ] `node ops/staging-verify.mjs --train <T> --staging-url https://gbg-staging.netlify.app` expect the last line `GREEN: every automatic step passed` (any `FAIL`: stop; its manual list S11 is yours).

**5. Soak and look**
- [ ] R0 48 hours on staging, the others 24; run the `staging-verify` line again at the end.
- [ ] Clean Chrome profile on the staging URL: `tests/t0/journeys-manual.md` part A (the map is blank on `netlify.app`: expected); R1b also part C (phones). R1c: the Walkthrough on a real phone.

**6. Deploy** (inside the window of step 0)
- [ ] Write down the **rollback target**: the ID of the currently Published deploy (R0: `6abd6d62...`). Step 2 again, now.
- [ ] `cd release\<T>\dist` then `netlify deploy --dir . --prod --site <PRODUCTION_SITE_ID> --message "<T> <rid>"` from INSIDE the dist (the CLI takes `netlify.toml` from the working directory) [unverified]; write down the deploy ID it prints. There is no undo except step 8.
- [ ] Drag and drop instead of the CLI (runbook 7.2; the caveat there applies, [unverified]): `python tools/ship/pack_zip.py --train <T> --out deliver/<T>-<rid>.zip` must end `OK ... manifest.json agrees`; drop that zip on the Deploys page of the production site (staging: add `--staging` and drop it on `gbg-staging`), then do step 7 unchanged.

**7. First 60 minutes**
- [ ] `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train <T> --expect-release <rid> --dist release/<T>/dist` every line `PASS` or `KNOWN`, 0 `FAIL`. A `FAIL` in the first 10 minutes: step 8 now. Exit 2 = it could not run: run it again.
- [ ] `node ops/sha-list.mjs list release/<T>/dist --out release/<T>/served-list.tsv` then `node ops/sha-list.mjs verify-url release/<T>/served-list.tsv https://gettysburginteractivemap.com --tree release/<T>/dist --expect-missing netlify.toml,_headers,_redirects,diagnostics.html` expect 0 differ, 0 missing. Keep both files: they are the next train's step 2.
- [ ] Fresh Chrome profile or Incognito: one page load, no "Try again" box, no console errors; one real phone on mobile data.
- [ ] Log: a row in `ops/RELEASE-LOG.md` (date, train, rid, `git rev-parse --short HEAD`, method, deploy ID, rollback target, soak hours, the last line of step 2 and the `staging-verify` verdict); `git tag <T>-<rid>`; `python tools/t0/ledger.py record --dist release/<T>/dist --train <T> --rid <rid>`; `tools/commit.sh "release: <T> <rid> deployed" ops/RELEASE-LOG.md ops/used-names.txt`.
- [ ] Repeat the probe at +15, +30 and +60 minutes (then 6-hourly for 14 days: runbook 8.1).

**8. Rollback, any time, free. Roll back first, ask afterwards.**
- **L1 (2 minutes):** Netlify > Deploys > the rollback target > **Publish deploy**; then `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train <PREV, or legacy after R0> --expect-release <its rid>`; add a `rollback` row to the log.
- **L2 (a bad service worker only; 10 minutes, one deploy = 15 credits):** `Remove-Item -Recurse -Force release/kill -ErrorAction SilentlyContinue; Copy-Item -Recurse release\<T>\dist release\kill; Copy-Item ops\sw-kill.js release\kill\sw.js -Force`, deploy `release\kill` like step 6, check `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train <T> --kill`.
- **Never:** edit a file inside a `dist`; deploy anything from `release/staging/`; run `netlify link` or `netlify init` here; put `netlify.app` into the Mapbox token.

| Train | Decide before staging (everything else is settled or documented in `ops/T0-DEVIATIONS.md`) |
|---|---|
| R0 | sign O-T0-3 (the intro goes; fewer units after an unplayed jump until R1c); keep or delete `tools/t0/patches/R0+mapbox-precompile.json` (kept: lab mobile 94, deleted: 85, the plan's floor; deleting changes the id: rebuild); keyboard-only visitors cannot pass the legacy layout chooser during R0's solo week (as today; fixed from R1a); Lighthouse and RUM export before/after |
| R1a | the headed real-mouse drag and wheel check on the live R0 site; `/icons/icon-192.png` twice (keep or drop one link) |
| R1b | devices: iPhone SE, a mid-range Android, Samsung Internet, landscape, back-swipe (`tests/t0/journeys-manual.md` part C); the 834 px layout threshold |
| R1c | X-Frame-Options DENY vs the plan's SAMEORIGIN (`ops/header-decisions.md`); legal text: ship it (set `legal.effective_date` in `tools/t0/trains.json` to the deploy day, build with `--with PG-legal`, read `ops/legal-drafts/OWNER-SIGNOFF.md`) or not; Netlify primary-domain setting; the two provisional Turning Points anchors need the historian reviewer |

Already decided (2026-10-04, `docs/decisions/OWNER-DECISIONS-2026-10-04.md`): keyboard model approved; the Street View sensor delegation stays; legal text stays opt-in until you have read it; the monument stars come back later as a map-tracking layer (group `MON`, not in these trains); archiving the `6abd6d62` zip is recommended, not required.

Build ids at the 2026-10-04 integration (a later commit may change them; the build prints the real ones): R0 `54e21b2e`, R1a `a267d0ed`, R1b `3a00b7d6`, R1c `2531699e`.
