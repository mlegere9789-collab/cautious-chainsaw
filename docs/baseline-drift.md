# Baseline drift: production no longer equals `legacy/dist`

Written 2026-09-30 by the baseline re-anchoring work (owner of `baseline/`, `tools/t0/`). Every number below comes from a command that was run on 2026-09-30 against `https://gettysburginteractivemap.com` or against this repository; where something could not be verified it says so (section 9).

## 0. Summary

* **What happened.** `legacy/dist` is the byte-exact copy of Netlify deploy `6aa16d61` (entry bundle md5 `7ef75b95f4c02700430b8aa91e3a7459`). Production is now served by a **later deploy, `6abd6d62...`** (the id is inside the Real User Metrics token that Netlify injects into every page; it was `6abd6d6248919c2f4d7b7c02` when measured). It differs from `legacy/dist` in **exactly two files**: `index.html` (three changes to inline scripts, and the whole file now has CRLF line endings) and `data/terrain.json` (eight key locations moved, the file re-formatted with CRLF). The other **117 of 119** files (the entry bundle, both lazy chunks, the stylesheet, `sw.js`, `site-nav.*`, `manifest.json`, `sitemap.xml`, `robots.txt`, every other page, all other data, icons) are byte-identical once Netlify's post-processing of HTML is undone. Response headers are unchanged (`ops/headers-probe.mjs --profile baseline`: 19/19 as expected).
* **Neither live file exists in any of the 127 archived zips** (re-checked: 125 `index.html` and 125 `data/terrain.json` candidates, source-level and line-ending-insensitive; no match). The owner should download and archive deploy `6abd6d62...` from the Netlify Deploys page (action in section 9).
* **Consequence before this work.** All four trains (R0 `fb14ab00`, R1a `740deb52`, R1b `8ad6d7cd`, R1c `9feb2ee6`) were built from `legacy/dist`; a deploy of any of them would have silently reverted both live files (an old star-overlay script would have come back, the live reveal/collision fixes and the mobile hide-bar block would have vanished, eight locations would have jumped back by 166-734 m).
* **What was done.** The live site was mirrored (`baseline/live-2026-09-30/`), its source-level tree was reconstructed into **`baseline/dist`** and the reconstruction was **proved byte-exact** (the Netlify post-processing model applied to `baseline/dist` reproduces all 27 served HTML pages in both URL forms and all 91 non-HTML files; `netlify.toml` is not served and cannot be compared). `tools/t0/baseline.lock.json` pins every file; `build.py` builds from `baseline/dist` and refuses a baseline that differs from the lock; `python tools/t0/baseline.py verify-live` re-checks production against `baseline/dist` at any time. All four trains were rebuilt on the new baseline: **no anchor moved** (the rebuilt trains keep every patch count: R0 22, R1a 242, R1b 376, R1c 426; R1b and R1c have one more patch than before, the removal of the superseded hide-bar block); `legacy/` was never touched.
* **Decisions.** The live `terrain.json` is kept as is (T0 rule 5: no `/data` edits). The live reveal/collision fixes in `index.html` are kept in every train. The live block that hides the legacy desktop timeline bar in Mobile mode is **kept in R0 and R1a** (there the legacy bar IS mounted in Mobile mode) and **removed from R1b on**, because group C never mounts that bar and the block's anchor (the credit `mailto:` link) does not exist in the mobile shell (evidence in section 5). The live removal of the monuments star overlay is inherited (section 5 asks the owner whether it was intended).

## 1. Method and evidence

```
python tools/t0/baseline.py mirror        # 119 seeded paths + the pretty URL of every page + a 404 probe = 147 requests, curl, identity encoding, cache-busted
python tools/t0/baseline.py reconstruct   # raw responses -> baseline/dist
python tools/t0/baseline.py prove         # model(baseline/dist) == every served response
python tools/t0/baseline.py lock          # tools/t0/baseline.lock.json
python tools/t0/baseline.py verify-live   # (any time) live vs baseline/dist: IDENTICAL or DRIFTED with a per-file diff
```

(`mirror` refuses to overwrite an existing mirror folder without `--force`, and `reconstruct` refuses to replace the locked `baseline/dist` without `--replace`, so the evidence cannot be lost by accident.)

* **Mirror** (`baseline/live-2026-09-30/`): every path of the `legacy/dist` file list, both URL forms of every page (`/x.html` and `/x`, `/index.html` and `/`), everything the served pages, scripts, manifest, sitemap and `robots.txt` reference that the tree does not contain (crawl; only a dead string `/data/oob/` turned up, answering 404), and one unknown path for the 404 page. Each request is `curl --http1.1` with `Accept-Encoding: identity`, `Cache-Control: no-cache` and a `?t0cb=<ms>` query (Netlify ignores the query for static files; a request with and without it returned identical bytes). **147 requests: 144 answered 200 and three answered 404** (`/netlify.toml`, the forced-404 spelling `/diagnostics.html`, the probe). Raw bodies and headers are under `baseline/live-2026-09-30/raw/` (git-ignored: they carry Netlify's signed RUM token); `SHA256.tsv` (committed) lists the hash of every response; `headers.key.json` (committed) snapshots the non-volatile response headers of 17 key URLs; `MIRROR.json`, `RECONSTRUCTION.json` and `PROOF.json` are the machine-readable results.
* **No new hashed asset exists.** The live `index.html` still loads `/assets/index-Cg8FAMXN.js`; the bundle, both chunks, the orphan worker and the stylesheet are byte-identical to `legacy/dist` (sha256 pins in `tools/t0/trains.json`). The used-names ledger is unaffected.
* **Reconstruction:** non-HTML files are taken as served (`data/terrain.json` differs from `legacy/dist`, the other 90 are identical); HTML files have Netlify's post-processing undone (section 2). `index.html` is the only page whose source differs. `netlify.toml` is kept from `legacy/dist`: Netlify does not serve it, so a byte comparison is impossible (section 9).
* **Proof** (`python tools/t0/baseline.py prove`, `PROOF.json`): 119 files, 27 HTML pages each checked in both URL forms: **118 ok, 1 config** (`netlify.toml`), **0 differences**. `/diagnostics.html` is a forced 404 by the `netlify.toml` rule while `/diagnostics` still serves the page; the check expects exactly that.
* **Live check any time:** `verify-live` took 6.4 s and 147 requests on 2026-09-30 and printed `IDENTICAL` (after the reconstruction). It is also exercised against a local fake of Netlify in `tools/t0/tests/baseline_selftest.py` (identical, drifted file, changed page with diff, new page on live, changed post-processing, exposed dev page).

## 2. The Netlify post-processing model (measured)

| What Netlify does to the uploaded file | Evidence |
|---|---|
| Non-HTML files are served byte-for-byte | 90 of 91 identical to `legacy/dist`; the 91st (`data/terrain.json`) is real drift, not processing |
| Every HTML page gets `"\n" + <script async id="netlify-rum-container" ... data-netlify-cwv-token="..."></script> + "\n"` inserted immediately before `</body>` (525 bytes, the same on every page of one deploy; the token is a JWT naming the deploy, so it changes with each deploy) | removing exactly that restored 15 pages byte-for-byte |
| "Pretty URLs": an `<a ...>` start tag outside script/style/comments whose `href` is a local path ending `.html` is rewritten (`/index.html` becomes `/`, `/x.html` becomes `/x`) **and re-serialised with its attributes sorted by name, each single-quoted**: `<a class="back" href="/index.html">` becomes `<a class='back' href='/'>`; `<a class="gtbg-historian-pin" href="/historian.html" title=".." aria-label="..">` becomes `<a aria-label='..' class='gtbg-historian-pin' href='/historian' title='..'>` | restored the other 10 pages and the 19 links of `index.html` byte-for-byte; `<a href="/">`, `mailto:` and absolute links are not touched; the same text inside `<script>` (for example a template literal in `education.html`) is not touched; line endings are preserved |
| `/x.html` and `/x` serve identical bytes (no redirect); `netlify.toml`, `_headers`, `_redirects` are not served; a forced-404 redirect makes `/diagnostics.html` answer 404 while `/diagnostics` answers 200 | mirror, `headers-probe` HP-13 |

The model is code (`tools/t0/t0build/netlify.py`, JS mirror `forwardModel` in `ops/sha-list.mjs`; `baseline_selftest.py` case 16 proves the two give the same bytes on all 27 pages). It raises `Unmodelled` for anything it has no evidence for (a `.html` link with `#` or `?`, a bare attribute, an `&` inside a rewritten tag), so a mismatch is loud. `inverse()` restores rewritten tags from a reference source file (here `legacy/dist`) and reports any tag it had to infer; for `index.html` all 19 rewritten links had a reference (0 inferred).

## 3. Every live change versus `legacy/dist`

119 files compared (`python tools/t0/baseline.py compare-legacy`): **117 identical, 2 differ.** Listing of the two:

| file | legacy | live source | what differs |
|---|---|---|---|
| `index.html` | 39,638 B, LF, 760 lines | 39,991 B, **CRLF**, 738 lines | three inline-script changes (3.1); every line ending changed LF to CRLF (a whole-file rewrite on a Windows machine) |
| `data/terrain.json` | 13,470 B, LF, compact rows | 17,517 B, **CRLF**, pretty-printed | eight key locations re-coordinated (3.2); 6-decimal coordinates; all other values equal |

### 3.1 `index.html`: three changes (line numbers are in the live source)

The diff was taken at source level (post-processing undone; line endings normalised) and read in full. The release verifier's canonical-event diff (`tmp/verify-release/live-drift.py`) reports "9 differing regions" for `legacy/dist/index.html` against live (re-run on 2026-09-30: 9); several of those are text nodes (the JSON-LD block, the `<style>` block, scripts) that differ only because every line ending changed from LF to CRLF. The source-level diff with line endings normalised has **three logical changes** (four unified-diff hunks), and **nothing in the JSON-LD, the `<style>` block or any other script changed**. Cross-check: the same verifier script run on `baseline/dist/index.html` against the served page reports **0 differing regions**.

| # | live lines | change | what it does |
|---|---|---|---|
| A | 476-486 (+11) | `overlay.addEventListener('animationend', function (e) { if (e.animationName === 'gtbg-force-reveal') reveal(); });` with a comment | The Extra Features button (`#extra-features`) has a pure-CSS 5-second force-reveal fallback. That path never called `reveal()`, so the overlay became visible without the class `gtbg-visible` and without the collision-avoidance reposition (it could sit on top of onboarding content). Now the fallback's own `animationend` calls `reveal()`. |
| B | 568-582 (comment) and 591-605 (code) | `collisionCount(pos)` now also counts every visible leaf element with at least 2 characters of text (`document.querySelectorAll('body *')`), de-duplicated with a `Set`, not only interactive elements | The repositioning of the Extra Features button avoids overlapping plain text (caught on the "Mobile" card of the old layout chooser). Cost measured on the desktop page: a reposition takes 0.6 ms median on live (0.4 ms on legacy), 496 DOM nodes, 108 text leaves. |
| C | 639-692 | The 107-line script "Wires the app's own real Monuments toolbar button ... to a star-marker overlay" (legacy lines 608-714) is **replaced** by a 55-line script "Hides the legacy desktop-style bottom timeline bar when the app's own Mobile mode is active" | (1) **Removed:** the star overlay (`#gtbg-monuments-overlay`, fetching `/data/monuments.json`, 8 stars on the old layout). (2) **Added:** every 800 ms, if a button whose text ends with "Tools" exists (Mobile mode), find the bar through the first `a[href^="mailto:gettysburginteractivemap"]` (climbing at most 8 ancestors to a `position: fixed` or `absolute` element) and set `display: none`; otherwise set `display: ''`. |

The two rewritten `<a>` hunks that a raw diff of served bytes shows (line 288 and lines 722-739) are Netlify's pretty-URL rewriting, not source changes; the source keeps `href="/historian.html"` etc. Sitemap, `site-nav.js`, `site-nav.css` and all other pages did not change.

### 3.2 `data/terrain.json`: eight locations corrected

The JSON value diff has **16 changes, all numeric latitude/longitude of eight `key_locations`** (`metadata`, `roads`, `structures`, `terrain_features` and the other 22 locations are equal). The moves are 166 m to 734 m (median about 260 m; distances use 111,320 m per degree of latitude and the cosine of 39.81 degrees for longitude):

| # | id | name | legacy lat, lng | live lat, lng | moved |
|---|---|---|---|---|---|
| 0 | LOC-001 | Cemetery Hill | 39.8183, -77.2258 | 39.821763, -77.228873 | 467 m |
| 1 | LOC-002 | Culp's Hill | 39.8142, -77.2167 | 39.820096, -77.22054 | 734 m |
| 2 | LOC-003 | Little Round Top | 39.7933, -77.2394 | 39.789472, -77.236139 | 509 m |
| 4 | LOC-005 | Devil's Den | 39.7956, -77.2428 | 39.791506, -77.242386 | 457 m |
| 5 | LOC-006 | The Wheatfield | 39.7983, -77.2406 | 39.797319, -77.24304 | 236 m |
| 6 | LOC-007 | Peach Orchard | 39.8006, -77.2478 | 39.800833, -77.249722 | 166 m |
| 8 | LOC-009 | The Angle (High Water Mark) | 39.8117, -77.235 | 39.81343, -77.2364 | 227 m |
| 11 | LOC-012 | McPherson's Ridge | 39.8306, -77.25 | 39.837, -77.2514 | 722 m |

### 3.3 What did not change, and what cannot be seen

* Identical: entry bundle, `HelpModal`, `BookmarkPanel`, `InterpolationWorker`, stylesheet, `sw.js` (still the old worker), `site-nav.js`, `site-nav.css`, `manifest.json`, `sitemap.xml`, `robots.txt`, `favicon.ico`, `icons.svg`, icons, screenshots, `user-guide.pdf`, all 26 other pages (incl. `diagnostics.html` via its pretty URL and `unit-rendering-reference.html`) and all other `data/` files.
* Not serveable, so not comparable by bytes: `netlify.toml`. Indirect evidence that it did not change: the 17-URL header snapshot and the 19-probe header run match the state recorded on 2026-09-29/30.

## 4. What live does today (harness measurements)

Run with the t0 harness on `baseline/dist` (= live source) and `legacy/dist` (control), headless Chrome 153, Mapbox tiles blocked (nothing left the machine), scripts in `tmp/baseline-agent/` and, as a proper suite, `tools/t0/tests/baseline-drift.spec.mjs` (T0-BL-01..09):

| probe | `legacy/dist` | `baseline/dist` (live today) |
|---|---|---|
| 375x812 phone, choose "Select Mobile", after 1.5 s | desktop timeline bar shown: 1 range input, 6 "July 1/2/3" pills (mobile's 3 plus the desktop bar's 3), the bar is a 375x127 box at y=685 with 14 buttons | bar `display:none`: 0 range inputs, 3 pills, Tools button present |
| 1440x900, click the "Monuments" button | `#gtbg-monuments-overlay` with 8 star markers | no overlay, no stars (the button opens only whatever the React app itself does) |
| 1440x900 first visit (no stored onboarding), chooser screen at t=6 s | Extra Features visible by the CSS fallback only (class empty, `y=60`) | class `gtbg-visible`, repositioned to `y=431` |
| desktop, the legacy bar's inline `display` set to `none` | stays hidden | reset to `''` within 1.7 s (the block's `sync()` every 800 ms) |
| page errors, console errors | 0 | 0 |

## 5. Relation to Tranche 0: decision per change

| change | decision | evidence |
|---|---|---|
| **C (2)** hide the legacy desktop bar in Mobile mode: a partial fix of audit item C1 | **Group C supersedes it. Kept in R0 and R1a, removed from R1b on** by patch `C:live-hide-legacy-bar-superseded` (`tools/t0/patches/C+baseline.json`, `expect: 1`, exact text of the whole block) | In R0/R1a (no group C) the legacy bar is mounted in Mobile mode (T0-BL-06: R1a behaves like live, bar hidden, 3 pills), so dropping the block there would revert a live fix. In R1b/R1c group C never mounts the desktop overlays in the mobile layout (HF-1a), so there is no bar: measured on the built trains at 375x812 (T0-BL-05) `data-layout=mobile`, 0 range inputs, **0 `mailto:gettysburginteractivemap` links** (before and with the Tools sheet open), so the block's anchor does not exist and the block is dead code that still wakes every 800 ms; on desktop it only force-resets the bar's inline `display` (table in section 4). |
| **C (1)** monuments star overlay removed | inherited (T0 builds on the new baseline, so R1b/R1c no longer ship the overlay script they shipped before) | The desktop verifier's regression "monument stars no longer track the map now that it can move" concerned this overlay (it projected from the default view only); it disappears with it. The Monuments toolbar button is inert on live today (T0-BL-02). **Owner question: was removing the stars intended? T0 does not restore them; restoring a tracking version belongs to a later train.** |
| **A** animationend reveal | kept in every train | benign, independent of T0; T0-BL-03 shows the effect on the chooser screen. R1b/R1c have no chooser, the handler is then a no-op on the normal path. |
| **B** text-aware collision count | kept in every train | 0.6 ms per reposition on the desktop DOM; the AX skip links / hidden `h1` (1x1 px, text of 2+ characters) count as "text" for the top-left corner candidate: a possible, cosmetic nudge of the Extra Features button, not seen in the suites (section 7). |
| **`terrain.json`** | kept exactly as live (T0 rule 5) | T0-BL-08: all four trains ship the live file byte for byte. `gate.mjs` `data-untouched` now compares against `baseline/dist`. |

## 6. How the build is anchored now

* `trains.json` has a `base` section (`dir: baseline/dist`, `lock: tools/t0/baseline.lock.json`, `mirror`, `origin`); the old `legacy` section still carries the bundle pins and the pinned digest of the immutable `legacy/dist` (tree `90d819d0...5253905d`, 119 files).
* `baseline.lock.json`: per-file sha256 of the 119 baseline files, tree digest `d2b126e99a88cbd9d708c0db237d2fd1dfbe7a3bf8c8d41c473536d3f727be6d`, the live deploy id at capture, and `changed_vs_legacy: [data/terrain.json, index.html]`. `build.py` refuses (exit 2, names the file) when `baseline/dist` differs from the lock in any byte, file or digest; the gate `baseline-pinned` and `verify_release.mjs` V8 re-check it, and every `manifest.json` records the baseline tree it was built from.
* **CRLF:** the live `index.html` is CRLF, while every patch anchor and mechanism template is authored with LF. A string that contains only LF is converted to CRLF when the target file is pure CRLF (`t0build/util.py eol_adapt`); a string with an explicit CRLF (the existing page patches for the CRLF pages) is left alone; the anchor count stays strict. Result: all four trains ship `index.html` with CRLF only (no bare LF; T0-BL-07) and the diff between a train's `index.html` and the baseline is exactly the patches.
* **Overlay merge guard:** an overlay file may not replace a file production changed (`changed_vs_legacy`); it would fail with "merge it with a patch instead". Today no overlay file touches `index.html` or `terrain.json` (the replaced files are `manifest.json`, `screenshots/day1.png`, `day3.png`, which production did not change).
* **What was re-anchored:** nothing had to be re-derived. After the rebase every anchor of R0 (16 `R0M` rows on `index.html`, 22 records in all), R1a (242), R1b and R1c matched with its asserted count unchanged: the 37 `index.html` anchors of R1c (16 mechanism rows, 4 group C, 7 AX, 1 CP, 7 PG-core, 2 PG-maps) sit outside the three live hunks. One patch was added (`C:live-hide-legacy-bar-superseded`). Release ids did not change (they hash the bundle texts, which did not change): R0 `fb14ab00`, R1a `740deb52`, R1b `8ad6d7cd`, R1c `9feb2ee6`; the four trees changed only in `index.html` (and `data/terrain.json` in all four): R0 `a9f581de...`, R1a `ce424be1...`, R1b `395216b6...`, R1c `e414f302...`.
* **Consequences for other tooling:** `run_suites.mjs` keeps its red-first proofs on `legacy/dist` (the specs decide "legacy" by that path); the proof that the suites discriminate is unchanged. Red behaviour of the live drift itself is covered by the new suite T0-BL.

## 7. The pre-deploy check and the "live drifted" procedure

The runbook (`ops/RELEASE-RUNBOOK.md` sections 4.1, 7.0 and 15) requires `python tools/t0/baseline.py verify-live` immediately before every production deploy (and before promoting staging): `IDENTICAL` and exit 0, or stop. On `DRIFTED` (exit 1): re-mirror, reconstruct, read the diff, re-anchor and re-decide each change (as in section 5), rebuild, re-run the suites, re-lock, record the new deploy id. Exit 2 means the check could not run (network, or the local baseline was altered).

## 8. Downstream effects to know about

* `tools/data` (`emit_legacy.mjs`, `baseline.json`, `data-src/legacy-manifest.tsv`) pins the legacy `terrain.json`. The deployed one is now `baseline/dist/data/terrain.json` (sha256 `97d0f3a00d466a019bed373db46fa469fcc0bb825392f529c1770e30eeecff45`). Data parity checks that must equal what is deployed should compare against `baseline/dist`. **This work did not touch those tools.**
* `ops/sha-list.mjs verify-url --html-warn` used to demote any HTML difference with a post-processing signature to a warning, which hid real content drift. `--html-warn` is now ignored; `--tree <source dir>` lets the model explain the rewriting and any other HTML difference is a `DIFF`.
* Verifier finding 1 (production no longer equals the baseline) and finding 2 (the warn demotion) are closed by this work; the owner action in section 9 is still open.

## 9. Not verified, and live drift that could not be reconstructed with certainty

* **`netlify.toml`** (and any `_headers` / `_redirects`): not served by Netlify. `baseline/dist/netlify.toml` is the file from `legacy/dist`; the header snapshot and the 19/19 probe are indirect evidence only. A changed `netlify.toml` would only show as a header difference (`verify-live` prints `HEADERS:` lines for that), never as a file difference.
* **Netlify dashboard settings** (Pretty URLs, RUM, post-processing, branch settings, environment, redirects entered in the UI): invisible to byte comparison except through their effect on served bytes and headers.
* **The true uploaded source of `index.html` and `terrain.json`:** reconstructed, not downloaded. For `index.html` the reconstruction is exact except where two different sources give the same served bytes (source `<a href='/x.html'>` and `<a href="/x.html">` serve identically); all 19 rewritten links matched legacy source references, so none is inferred. For `terrain.json` and all non-HTML files the served bytes are the source. **Owner action:** in the Netlify Deploys list open the deploy whose id starts `6abd6d62...`, use Download deploy, file it in `C:/Users/mlege/gettysburg-archive/zips`, and compare it with `node ops/sha-list.mjs list <unzipped> --out a.tsv` and `node ops/sha-list.mjs compare a.tsv tmp/baseline-agent/base.tsv` (HTML differences are expected to be exactly the two files above; the zip also carries `netlify.toml`).
* **History between 6aa16d61 and 6abd6d62:** only the two end states are known. Intermediate deploys (if any) were not seen; the "no ad-hoc redeploys" rule of the runbook was evidently broken or the drift predates it.
* **Behaviour measurements** are headless Chrome 153 on Windows against `127.0.0.1` with tiles blocked; no real device, no WebKit/Firefox.
* **Network dependence:** `verify-live` needs the live site and `curl`; its result is a snapshot of one moment (Netlify edge caches answer per request; the cache-busting query makes stale answers unlikely but not impossible).
