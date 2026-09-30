# Release runbook: build a train, prove it on staging, deploy it, watch it, roll it back

For the site owner. Plain language, copy-paste commands. Written 2026-09-30 for Tranche 0 (chapter 02 of the plan: `docs/plan/FINAL/02-tranche0-hotfix-runbook.md`, work packages WP-T0-02 and WP-T0-19).
Companion files: `ops/STAGING-SETUP.md` (the second Netlify site), `ops/owner-console-actions.md` (account and console chores), `ops/RUM-hygiene.md` (keeping your own testing out of the real-user numbers), `ops/RELEASE-LOG.md` (the one-row-per-deploy record), `tests/README.md` (what every test is), `tests/t0/journeys-manual.md` (the by-hand checks).

Where this text says **measured**, a command was run on 2026-09-30 and its output is in the report that came with this file. Where it says **unverified**, nothing has proved it yet and the step that would prove it is named. Nothing in this runbook has been run against a real deploy: no train has ever been deployed by this tooling.

---

## 0. The ten rules

1. **Nothing under `legacy/` is ever edited.** It is the byte-exact copy of the live site (main bundle md5 `7ef75b95f4c02700430b8aa91e3a7459`). Every release is *built from it* by `python tools/t0/build.py` into `release/<train>/dist`. `release/` is git-ignored output; rebuild it at will.
2. **Deploy only a folder that the build wrote** (`release/<train>/dist`) or the staging copy of one (`release/staging/<train>`). Never the downloaded "deploy" zip, never the repo root.
3. **One production deploy per train**, Tuesday to Thursday only, never inside a freeze (section 2). Rolling back is always allowed.
4. **Staging first.** Every train sits on the staging site for 24 hours (R0: 48 hours) and passes the probe there before it goes to production.
5. **Never reuse an asset file name for different bytes.** The build enforces it (the used-names ledger, `ops/used-names.txt`); do not bypass the build to hand-edit a file in `dist`.
6. **If something looks wrong after a deploy, roll back first (section 11, two minutes, free) and investigate afterwards.**
7. **Write the row in `ops/RELEASE-LOG.md` the same day.** The probe reads it.
8. **Secrets stay out of files, chat and commits:** the Netlify login token, any Mapbox or Google key you create. `netlify login` keeps its own token; do not copy it anywhere.
9. **Do not run `netlify link` or `netlify init` inside this repo.** They write a `.netlify/` folder that `.gitignore` does not cover. Always pass `--site <id>` instead.
10. **No ad-hoc redeploys of the live site until R0 ships** (register action 5). Each production deploy costs credits and the old deploys are the only rollback material.

---

## 1. Words used here

| Word | Meaning |
|---|---|
| **Train** | one cumulative release: `R0` (mechanism), `R1a` (crash and input fixes, page fixes), `R1b` (mobile shell, accessibility), `R1c` (clock and data, deep links, copy, headers). Each contains everything before it. |
| **rid** | release id, 8 hex characters (example `fb14ab00`), a hash of the patched bytes. It is in every hashed file name and in `version.json`. |
| **dist** | the folder that is the website: `release/<train>/dist`. |
| **gate** | the build's own automatic checks (`gate.json`). A build with a red gate leaves no deployable claim; do not deploy it. |
| **staging** | the second Netlify site `gbg-staging` (`ops/STAGING-SETUP.md`). Its copy of a train is a byte-identical dist plus one extra file, `_headers`, that makes it `noindex`. |
| **probe** | `node tests/t0/prod-probe.mjs`: HEAD and small GET requests that check headers, redirects, `version.json`, the service worker file and asset caching. |
| **L1 / L2 / L3** | rollback levels (section 11): publish the previous deploy / deploy the kill switch / fix forward. |

---

## 2. Calendar, windows and freezes

Chapter 02 sections 4 and 8; register section 4.3. Dates are **targets that assume the hours per week you state (register action 7)**; the "latest" dates are decision dates, not delivery promises. If R0 has not shipped by **2026-10-21**, stop and re-plan (chapter 02 section 9).

| Train | Target (Tuesday) | Latest | What must be true first | Rollback |
|---|---|---|---|---|
| R0 | 2026-10-13 | 2026-10-21 | archive done; plan and credits known; 48 h staging soak (start by Sun 2026-10-11); X1-X3 probes and R0 suite green; Lighthouse mobile >= 85 and desktop >= 95 measured with production-Referer tiles (there is no Lighthouse runner in the repo yet, so this gate is open until one exists: chapter 05 WP-PERF-01); sign-off O-T0-3 on file | Publish previous deploy (this restores the old reload band-aid; acceptable) |
| R1a | 2026-10-20 | (with R1) | R0 stable 3 days; headed real-mouse drag and wheel check done on the R0 site; journeys J1-J8 green (automated against the built dist, then by hand on staging: `tests/t0/journeys-manual.md` part A) | Publish previous |
| R1b | 2026-10-27 | (with R1) | iPhone SE, one mid-range Android and Samsung Internet pass (`tests/t0/journeys-manual.md` part C); landscape matrix; screenshots of dense panels | Publish previous |
| R1c | 2026-11-03 | 2026-11-05 | O-T0-3 signed; header check on staging; deep-link matrix; probe HP-06/07/13/15 | Publish previous |
| R1d (optional) | Tue 2026-11-24 | - | only if capacity forced items out of R1a-R1c; after the freeze | Publish previous |

* **Windows:** Tuesday, Wednesday, Thursday. Deploy in the morning US Eastern time so the 60 minutes of watching happen while you are awake (traffic is small: about 113 page views and 51 visitors a day, so nothing shows fast).
* **Freezes (no production promotion):** 2026-11-15 to 2026-11-20; 2027-06-25 to 2027-07-05; 2027-11-15 to 2027-11-20; **and every Friday after 12:00 ET**. Rollback is exempt.
* **Identity changes** (URL forms, titles, product name) are not part of Tranche 0. The first such train (S1) may not start within 48 hours of R1c (earliest 2026-11-05, latest 2026-11-10).
* **Other dates that matter:** the TLS certificate shows an expiry of 2026-11-10 (Netlify renews it itself; check it renewed by 2026-10-25, `ops/owner-console-actions.md` action 6); domain expiry 2027-06-13.
* Date check (done): 2026-10-13, 10-20, 10-27, 11-03, 11-24 are Tuesdays; 2026-10-21 is a Wednesday; 2026-11-05 is a Thursday.

---

## 3. What you need on the machine

| Need | Check | Notes |
|---|---|---|
| Node 20+ (this machine: 24) | `node --version` | the probe and `ops/sha-list.mjs` need Node 18+ |
| Python 3.11 | `python --version` | the build |
| Repo dependencies | `npm ci` (only on a fresh checkout) | `node_modules/` already exists here |
| Chrome (for the browser tests) | `"C:/Program Files/Google/Chrome/Application/chrome.exe" --version` | tests use system Chrome |
| Netlify CLI (only for Route A) | `netlify --version` | section 7.1 installs it |
| Two Netlify sites | production, and `gbg-staging` | staging is created in `ops/STAGING-SETUP.md` |

Windows note: in PowerShell, `curl` is an alias of a different program. Type **`curl.exe`** wherever this runbook says `curl`. Git Bash is fine with plain `curl`.

---

## 4. Build a train

```
python tools/t0/build.py --train R0          # writes release/R0/   (dist/, anchors.json, gate.json, manifest.json)
python tools/t0/build.py --all               # R0, R1a, R1b, R1c
node tools/t0/gate.mjs --train R1a           # re-run the gates on an existing build
```

* **Exit codes of `build.py`:** `0` fine; `2` a precondition, anchor, overlay or ledger check failed (nothing shipped: read the message, it names the patch id); `3` a gate failed (the dist is kept so you can look; **do not deploy it**).
* **Measured 2026-09-30:** an R0 build takes about 5 seconds and ends `OK: R0=fb14ab00`, tree sha256 `12b1e64c...9fe9c4c`, 122 files, 3.56 MB. Building it twice into two different folders and comparing with `ops/sha-list.mjs compare` printed `IDENTICAL: 122 files` (the build is deterministic: same input, same bytes, no timestamps).
* **What is in a build:** `release/<train>/dist/` (deploy this), `anchors.json` (every patch and how many times it matched), `gate.json` (the gate results: `"ok": true` is what you want), `manifest.json` (every file with size and sha256, and the tree digest).
* **Identity of a build:** `release/<train>/dist/version.json` = `{release, train, entry, help, bookmark, css, groups, source_entry_md5}`. The `release` value is the rid you write in the log.
* **Reproducibility check (run it once per train before staging):**
  ```
  python tools/t0/build.py --train R1a --out release/check/R1a
  node ops/sha-list.mjs list release/R1a/dist --out release/check/R1a-a.tsv
  node ops/sha-list.mjs list release/check/R1a/dist --out release/check/R1a-b.tsv
  node ops/sha-list.mjs compare release/check/R1a-a.tsv release/check/R1a-b.tsv     # must print IDENTICAL
  ```
* **The baseline never moves:** `node ops/sha-list.mjs list legacy/dist` must print `119 files, tree 90d819d0...5253905d` (measured: it does, and it equals the digest the build pins).
* Which groups each train contains is in `tools/t0/README.md` and `tools/t0/trains.json`.

---

## 5. Test on your own machine first

`tests/README.md` lists every suite, its default target and the exact command. For the release path (build the train first; each command takes `--dist release/<train>/dist`):

```
python tools/t0/build.py --train R1a
node tests/t0/r0.mjs --dist release/R1a/dist                    # R0 mechanism: first visit, upgrade drill, kill drill, loader retry (every later train must keep passing it)
node tests/t0/journeys-desktop.spec.mjs --dist release/R1a/dist # J1-J8 journeys, input, keys, sound, monuments, storage; clock/data tests (R1c)
node tests/t0/pages-maps.spec.mjs --dist release/R1a/dist       # sub-pages, map pages, OG card, manifest (R1a)
node tests/t0/mobile-matrix.spec.mjs --dist release/R1b/dist    # mobile shell over the viewport matrix (R1b)
node tests/t0/headers.spec.mjs --dist release/R1c/dist          # generated headers/redirects, framing in a real browser (R1c)
npm run t0:test                                                 # build self-test + browser harness self-test + R0 suite
```

They open system Chrome on `127.0.0.1` and use Mapbox tiles only through the harness (production Referer injected, capped per run; the cap and the ports are set by environment variables described in `tests/README.md`). Run them **one after the other**, not at the same time, unless you give each its own `T0_PORT_BASE`. Results are written next to the dist (`release/<train>/test-*.json`) or under `tmp/<agent>/`. **A train whose suite is missing or red has no automatic proof: say so in the log row.** The by-hand checks that no automation can do (real mouse, real phones) are in `tests/t0/journeys-manual.md`.

---

## 6. Stage it and prove it (details in `ops/STAGING-SETUP.md`)

```
# 1. staging copy = the train's dist + a _headers file that adds "X-Robots-Tag: noindex"
node ops/sha-list.mjs stage release/R1a/dist release/staging/R1a --force
# 2. deploy that folder to gbg-staging (Route A or B below, using the STAGING site id)
# 3. probe it
node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train R1a --staging --dist release/R1a/dist
# 4. prove the headers match production (R0, R1a, R1b must not change any header; R1c changes them on purpose: see ops/STAGING-SETUP.md section 7)
node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train R1a --staging --parity https://gettysburginteractivemap.com --staging-vs
# 5. prove every file arrived intact
node ops/sha-list.mjs list release/R1a/dist --out release/staging/R1a.tsv
node ops/sha-list.mjs verify-url release/staging/R1a.tsv https://gbg-staging.netlify.app --html-warn
```

**Ship-blockers on staging:** any `FAIL` line in step 3; any `FAIL PARITY` line in step 4 (for R0, R1a, R1b; for R1c read `ops/STAGING-SETUP.md` section 7); any `DIFF` or `MISS` in step 5 for a non-HTML file. Soak: **48 h for R0, 24 h for the others.** During the soak open the staging URL yourself (a clean Chrome profile) and do the smoke list in `tests/t0/journeys-manual.md` part A. **On a `netlify.app` address the map tiles answer 403 (the Mapbox token only allows your real domain, and you must never add `netlify.app` to it), so the map area is blank on staging: that is expected.** The automated suites get real tiles through the Referer-injecting harness; for a human look at maps see `ops/STAGING-SETUP.md` section 9.

---

## 7. Deploy to production

Do this only when: the calendar allows it (section 2), the train's "what must be true first" list is done, staging soaked, you have the **previous deploy's id** written down (it is the rollback target), and the credit balance is known (7.3).

### 7.1 Route A: Netlify CLI (the default, owner decision O-T0-4)

You have no CLI installed yet. One-time setup:

```
node --version                      # netlify-cli needs Node 18.14 or newer; this machine has 24
npm install -g netlify-cli          # installs the "netlify" command (no admin rights needed with the standard Node installer)
netlify --version                   # if "not recognised": close the terminal and open a new one so the PATH refreshes
netlify login                       # a browser tab opens; click Authorize. The CLI keeps the token in its own config file: never copy it
netlify status                      # shows the account you are logged in as
netlify sites:list                  # lists your projects with their names and IDs
```

Write the two IDs (production site, `gbg-staging`) in your password manager. They are identifiers, not passwords, but keep them out of chat anyway. You can also find a site's ID in the Netlify web app: open the site, then **Site configuration > General > Site information** ("Project ID" or "Site ID" depending on the day's label).

**Deploy the staging copy (draft or production of the staging site: see `ops/STAGING-SETUP.md` section 5 for which):**

```
cd release/staging/R1a
netlify deploy --dir . --site <STAGING_SITE_ID> --message "R1a <rid> staging"
```

**Deploy production (one per train):**

```
cd release/R1a/dist
netlify deploy --dir . --prod --site <PRODUCTION_SITE_ID> --message "R1a <rid>"
```

* Always `--site <id>`: without it the CLI asks which site to use, or offers to create one.
* Always run it from **inside** the folder you are deploying (`--dir .`). Reason: for trains R0, R1a and R1b the folder's `netlify.toml` (a copy of the legacy file) is the only source of the site's security headers, cache headers and the `/diagnostics.html` redirect, and **the CLI takes `netlify.toml` from the working directory, not from `--dir`** (`tools/t0/README.md`, "Kill switch and rollback"). Deploying from the repo root would send no headers at all unless a `netlify.toml` exists in the repo root (none does today). From R1c on the headers and redirects are generated into `_headers` and `_redirects` inside the folder (`tools/t0/config/gen.mjs`; its `netlify.toml` holds comments only, and a repo-root `netlify.toml` with header or redirect tables must **not** be added because Netlify does not document how the two combine); Netlify documents `_headers` as belonging in the publish directory, which does not depend on the working directory.
* **Unverified:** that the CLI, run this way, really uploads the folder's `netlify.toml` rules and honours a `_headers` file. It also might treat the git root, not the current folder, as its base. Two safeguards: (1) as far as the author remembers, the CLI prints a "Configuration path" line naming the `netlify.toml` it will use (unverified): it must be the one inside the folder you deploy, and if it names another file or none, stop and deploy a copy of the dist from a folder outside the repo (for example `C:\Users\mlege\gbg-deploy\R1a`, then prove the copy is identical: `node ops/sha-list.mjs list release/R1a/dist --out release/R1a/list.tsv` and `node ops/sha-list.mjs verify-dir release/R1a/list.tsv <that folder>`); (2) **the staging header parity check in section 6 step 4 is the real proof, and it is mandatory.** If parity fails on staging, do not deploy to production by this route.
* The CLI prints the deploy URL (and, with `--json`, the deploy id); the id is also in the Deploys list. Copy it into `ops/RELEASE-LOG.md`.
* `--prod` publishes immediately. There is no undo except section 11.

### 7.2 Route B: drag and drop in the Netlify web app (fallback)

1. Open <https://app.netlify.com>, choose the correct **site** (check the site name at the top: production or `gbg-staging`), open **Deploys**.
2. Scroll to the box that says to drag and drop the site output folder there.
3. In File Explorer open `release/R1a/` and drag the **`dist`** folder (or, for staging, `release/staging/R1a`) onto the box. Wait for "Published".
4. Click the new deploy in the list; the id is the last part of its address bar URL. Copy it into `ops/RELEASE-LOG.md`.

**Drag-and-drop caveat (unverified for this site):** Netlify's documentation says a manually created deploy runs no build and treats `netlify.toml`, `_headers` and `_redirects` as plain files, and does not say clearly whether a dropped folder's `netlify.toml` rules or its `_headers` file take effect (the `_headers` documentation only says it belongs in the publish directory). This site's live headers and its redirect rule for `/diagnostics.html` DO work today (measured 2026-09-30: `X-Frame-Options: DENY` and the Report-Only CSP come back on `/`; `/diagnostics.html` answers 404), but how the current deploy was made is not recorded, so it proves nothing about a new drop. **Therefore: a train may go to production by drag and drop only after the same folder, dropped on staging, passed the header parity check (section 6 step 4).** The plan retires drag and drop when the Git deploy pipeline exists (register D-CI-HOST); record which route each deploy used.

### 7.3 Credits and plan (unknown for this account)

* **Known from Netlify's documentation (read 2026-09-30):** on credit-based plans a **production deploy costs 15 credits**; Deploy Previews and branch deploys cost 0; **rolling back to a previous production deploy costs nothing**; Free = 300 credits a month with a **hard limit** (when they run out every project on the account is paused and visitors see "Site not available"); Personal 1,000; Pro 3,000 or more. Netlify e-mails and shows an in-app notice at 50, 75, 90 and 100 percent of the month's credits (the plan's "alert at 70 percent" is therefore the 75 percent notice).
* **Unverified:** which plan you are on, your balance, and whether a CLI *draft* deploy of the staging site costs credits (the documentation lists previews and branch deploys as free but does not name CLI drafts).
* **Do before R0:** Netlify team page > **Usage & billing** > **Credit balance**; write the plan, balance and this month's production deploys in `ops/RELEASE-LOG.md` notes. After the first staging deploy look again to see whether it moved.
* **Budget for Tranche 0:** four production deploys (R0, R1a, R1b, R1c) = 60 credits, plus R1d 15, plus one emergency L2/L3 deploy 15-30. If you use production-type deploys on the staging site (for the rollback rehearsal, `ops/STAGING-SETUP.md` section 8) count 15 credits each until the balance shows otherwise. On the Free plan (300 a month) this is comfortable if you do not redeploy ad hoc.

---

## 8. Right after a production deploy (first 60 minutes)

Do these in order; total about 20 minutes plus watching.

1. **Probe:**
   ```
   node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train R1a --expect-release <rid> --dist release/R1a/dist
   ```
   Every line must be `PASS` or `KNOWN` (a `KNOWN` line is a check that is red on purpose until a later train; it names that train). Any `FAIL` inside the first 10 minutes: **roll back now (section 11)**. Exit code `2` means the probe could not run (network), not that the site is bad: run it again.
2. **Byte proof of the files that matter** (non-HTML must be identical; production rewrites the HTML it serves, see `ops/STAGING-SETUP.md` section 4):
   ```
   node ops/sha-list.mjs list release/R1a/dist --out release/R1a/served-list.tsv
   node ops/sha-list.mjs verify-url release/R1a/served-list.tsv https://gettysburginteractivemap.com --kinds nonhtml
   ```
3. **First visit as a stranger:** a fresh Chrome profile (or an Incognito window) with the RUM block on (`ops/RUM-hygiene.md` section 3): open the live site; it must load once (no second page load), no "Try again" box, no console errors. Then `tests/t0/journeys-manual.md` part A, items A1 to A6.
4. **One real phone** on mobile data (not Wi-Fi if you can): open the site, note the time to first paint and whether the page reloaded itself.
5. **Log it:** add the row to `ops/RELEASE-LOG.md` (rid, deploy id, rollback target, method). Then:
   ```
   git tag R1a-<rid>                                   # marks the source commit that produced this deploy
   python tools/t0/ledger.py record --dist release/R1a/dist --train R1a --rid <rid>     # adds the new asset names to ops/used-names.txt
   tools/commit.sh "release: R1a <rid> deployed" ops/RELEASE-LOG.md ops/used-names.txt
   ```
   (The ledger step is what stops a future build from reusing a name; `tools/t0/README.md` "The used-names ledger".)
6. **Watch for 60 minutes:** re-run step 1 at +15, +30 and +60 minutes; keep the Netlify **Deploys** page open (a failed publish shows there). Do not start anything else that changes the site.

### 8.1 Scheduled probe for the next 14 days (every 6 hours)

The plan wants the probe every 6 hours for 14 days after each train. On Windows, once per train (adjust the date format to your regional settings: run `schtasks /Create /?` to see it):

```
schtasks /Create /TN "gbg-prod-probe" /SC HOURLY /MO 6 /ST 06:00 /TR "node C:\Users\mlege\gettysburg-map\tests\t0\prod-probe.mjs --no-content --log C:\Users\mlege\gettysburg-map\release\probe.log" /F
schtasks /Delete /TN "gbg-prod-probe" /F          # when the 14 days are over
```

* `--no-content` makes the scheduled run send no HTML page requests at all (only HEAD and small text files), so it cannot inflate your Analytics page-view count (`ops/RUM-hygiene.md` section 6). `--train` is read from the last row of `ops/RELEASE-LOG.md`.
* Each run appends one line to `release/probe.log`: time, `GREEN` / `RED` / `PROBE-ERROR`, counts, and the failing check ids. **Open that file after each deploy day and every Monday.** The computer must be on and you logged in for the task to run; there is no e-mail or phone alert (the plan's "owner alert channel" is still undecided, register D-CI-HOST). If you want a phone alert, a free external uptime monitor that checks `/version.json` (HEAD) is the simplest option; signing up for one is your decision.
* **Unverified:** the `schtasks` line was not run by the author (it changes the machine's scheduled tasks); the probe command inside it was run.

---

## 9. What to watch in Netlify RUM and Analytics

Both live in the Netlify web app: open the site, then **Analytics & metrics** in the site overview menu (labels move around; Netlify's documentation names **Real User Monitoring** there and lists **Web Analytics** next to it under monitoring: the exact click path for Web Analytics is unverified). Netlify keeps RUM history for only **7 days on the Personal credit plan and 30 days on Pro** (documentation), so **export a PDF or screenshot every week** and file it with the baseline evidence (`docs/baseline-2026-09-30/` per the plan).

**Weekly routine (10 minutes):** open RUM, set the range to 7 days, device "All", read p75 for LCP, FCP, CLS, INP; screenshot with the deploy dates written on it. Open Web Analytics: page views per day, unique visitors, top pages, the "not found" list. Also look at the Mapbox usage page (map loads per day) and the credit balance.

| Number | Baseline (before R0) | After R0 (expected, lab upper bounds) | Sign of trouble |
|---|---|---|---|
| RUM LCP p75 | bimodal: about a third of hourly p75 buckets over 4 s | should stop being bimodal; official "green" (2.5 s) needs a 30-day window after the last T0 deploy: earliest 2026-12-03 if the last deploy is 2026-11-03 | still over 4 s a week after R0 |
| RUM FCP p75 | "Poor" badge, outlier driven | drops toward 1 to 2 s | up after a deploy |
| RUM CLS p75 | lab value 0.073 (the RUM figure is in your exported PDF; its badge is outlier driven) | at or below 0.05 | above 0.1 |
| RUM INP p75 | never diagnosed | measure only; do not promise | above 200 ms is expected until the rebuild |
| RUM rows per visit | two per first visit (the reload) | one | still two |
| Page views per day | about 113 (51 visitors) | about the same | a sustained drop below half for several days |
| "Not found" list | about 63 scanner hits a day (noise) | same | many hits on `/assets/...` (a broken deploy or stale tabs) |
| Mapbox map loads per day | small (upper bound about 3.4 thousand a month) | R0 should roughly halve first-visit map sessions | a jump |

With this little traffic (about 5 views an hour) **hourly RUM buckets mean nothing in the first day**; use the probe and your own eyes for that. Do not react to RUM before a week of data. Do not interpret spikes without checking `ops/RUM-hygiene.md` section 5 (your own test sessions).

---

## 10. What a bad deploy looks like

| You see | Likely cause | Do |
|---|---|---|
| Probe `FAIL` in the first hour: `/version.json` missing or the wrong `release`; `sw.js` not the R0 worker; assets not immutable | wrong folder deployed, or headers not processed | **L1** now |
| The site shows a white page, or a box saying "Try again" that stays after clicking it | entry or chunk missing/renamed wrongly (probe HP-09 and T0-BYTES show it) | **L1** |
| The page reloads by itself twice on a fresh visit | the reload guard broke | **L1** |
| Help (`?`) or Bookmarks blank the app | a chunk name mismatch (the R0 rename must cover entry and both chunks) | **L1** |
| Old visitors are stuck on an old page, or the map never updates after a deploy | a bad or cached service worker | **L2** (kill switch), then fix forward |
| A rise of `/assets/...` entries in the Netlify "not found" list | tabs left open across a train (a few is normal) or a missing file (many is not) | check `verify-url`; if files are missing **L1** |
| Every page lost its security headers, or `X-Robots-Tag: noindex` appears on production (probe `T0-06`) | the staging copy (or a wrong toml) went live | **L1 immediately**; noindex on production removes the site from search |
| Pan or zoom dead, tiles blank on the REAL domain, or a JavaScript error on load | a bundle patch problem the tests did not catch | **L1**, then reproduce on staging |
| Credits notice at 90 or 100 percent | too many production deploys | stop deploying; check the Usage page; a paused site is an outage |

Rule of thumb: any of the above within 60 minutes of a deploy means L1 first, questions after. Do not debug on the live site.

---

## 11. Rollback

### L1: publish the previous deploy (default, about 2 minutes, free, atomic)

1. Netlify web app > the production site > **Deploys**.
2. Click the deploy that was live before yours (its id is in your log row, "Rollback target").
3. Click **Publish deploy**. (Netlify's documentation calls this instantaneous: no rebuild, no new deploy is created, and rolling back to a previous production deploy costs no credits. The rehearsal in `ops/STAGING-SETUP.md` section 8 measures how long it really takes.)
4. Verify: `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train <the train you rolled back to> --expect-release <its rid>` (use `--train legacy` when you rolled all the way back to the original site, which has no `version.json`).
5. Add a `rollback` row to `ops/RELEASE-LOG.md`.

Notes: old asset names still exist inside old deploys, which is why every train uses new names. Rolling **R0** back restores the old reload band-aid and the old service worker; visitors who already received R0's worker get the old one back on their next visit. R1a to R1c roll back cleanly. Time the first rehearsal (`ops/STAGING-SETUP.md` section 8): the target is 2 minutes or less.

### L2: kill switch (about 10 minutes, one production deploy = 15 credits)

Use after a bad service worker or a caching incident that L1 does not cure. It removes the worker and every `gbg-*` cache from returning visitors on their next navigation (Mapbox's own `mapbox-tiles` cache is left alone).

Make a copy of the dist that is live now (below, `R1a` stands for the live train) and overwrite exactly one file in the copy, `sw.js`, with `ops/sw-kill.js`:

```
# Git Bash
rm -rf release/kill && cp -r release/R1a/dist release/kill && cp ops/sw-kill.js release/kill/sw.js
# PowerShell
Remove-Item -Recurse -Force release/kill -ErrorAction SilentlyContinue; Copy-Item -Recurse release/R1a/dist release/kill; Copy-Item ops/sw-kill.js release/kill/sw.js -Force
```

Then deploy `release/kill` exactly like a train (Route A from inside `release/kill`, or Route B) and verify:

```
node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train R1a --kill
```

Do **not** build the kill copy with `ops/sha-list.mjs stage`: that command adds a `noindex` header that must never reach production. Write a `kill` row in the log. Afterwards fix forward under a new rid (L3): the next train carries the normal `sw.js` again. The kill file was tested by `tests/t0/r0.mjs` test `T0-R0-06`, including "no reload loop when the page re-registers it". `release/<train>/dist/_ops/sw-kill.js` is the same file (probe T0-04 checks that it is identical to `ops/sw-kill.js`).

### L3: fix forward

Fix the cause, build a new train under a new rid (the build gives one automatically), stage it, deploy it. Never patch a file inside an existing `dist` by hand.

---

## 12. Probe and check commands (cheat sheet)

```
# the whole probe, production, with the expectations of the train in the last log row
node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com
# explicit train, expected release, byte comparison against the build
node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train R0 --expect-release <rid> --dist release/R0/dist
# staging, with header parity against production and a JSON result
node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train R0 --staging --parity https://gettysburginteractivemap.com --staging-vs --json release/staging/probe-R0.json
# what each probe checks and from which train it must be green
node tests/t0/prod-probe.mjs --list

# by hand (use curl.exe in PowerShell)
curl -sI https://gettysburginteractivemap.com/                       # security headers, cache-control
curl -s  https://gettysburginteractivemap.com/version.json           # which release is live
curl -sI https://gettysburginteractivemap.com/sw.js                  # must say no-store
curl -sI https://gettysburginteractivemap.com/embed                  # from R1c: no x-frame-options, frame-ancestors *
curl -sI https://gettysburginteractivemap.com/diagnostics            # from R1a: 404 (today 200)
curl -sI https://friendly-lolly-da85c0.netlify.app/                  # from R1c: 301 to the real domain (today 200)
```

Probe exit codes: `0` nothing unexpected failed; `1` at least one `FAIL`; `2` the probe could not run. `KNOWN` means "red on purpose until a later train" and never fails a run; the table is `--list`. **Measured 2026-09-30 against production with `--train legacy`:** 9 pass (including the `HEADERS` line), 0 FAIL, 15 known-red, one skipped (`T0-BYTES`, which needs `--dist`). The known-red set contains exactly the audit's "10 of 15 header probes fail today" (HP-01, 02, 03, 06, 07, 10, 11, 12, 13 (developer pages) and 15) plus the Tranche-0 probes that only later trains satisfy.

Two deviations from the plan's wording, both deliberate: (1) the plan's R1c gate says "15/15 probes minus the CSP rows", but HP-10, HP-11 and HP-12 (the `/index.html` and `/x.html` 301s, privacy and terms in the sitemap) belong to the later identity train S1 (chapter 01 section 4.2, chapter 02 rule 5: Tranche 0 changes no URL form), so they stay `KNOWN` until S1; (2) HP-13 is split into a scanner-path part (green today) and a developer-pages part (green from R1a, both spellings).

`ops/headers-probe.mjs` (the infra work's own HP-01..15 + E-01..E-04 probe, about 45 requests) runs automatically as the last `HEADERS` line unless you pass `--no-content` or `--headers-probe off`; the profile is chosen from the train (R0, R1a, R1b: `baseline`, meaning a probe that passed on 2026-09-29 must not regress; R1c: `t0`; S1: `s1`). Measured 2026-09-30 on production with `--train legacy`: `19/19 as expected, 0 unexpected FAIL`. It can also check a built tree locally without any deploy: `node ops/headers-probe.mjs --dist release/R1c/dist --profile t0` (it starts `tools/t0/config/emulate.mjs`; that proves the generated rules, not Netlify's own matching, which only a deploy to staging proves).

---

## 13. Sign-offs per train (who does what)

| Train | Automated (AI or you run) | Device (D) | Owner (O) |
|---|---|---|---|
| R0 | T0-R0-01..12 (Chrome); loader with the bundle blocked; `version.json`; probe; Lighthouse x5 median, production-Referer tiles. **Not yet done anywhere:** Firefox and WebKit runs | iPhone SE and an Android phone: first visit loads once, no white flash | export RUM before and after; sign O-T0-3; approve the deploy day |
| R1a | input, crash, sound, keys, monuments, storage suites; page suites; duplicate-id sweeps; before/after screenshots of the pages | - | the headed real-mouse drag and wheel check on the live R0 site **before** shipping; D-SOUND decided |
| R1b | mobile shell, viewport matrix, accessibility (axe); dense-panel screenshots at 4 widths | iPhone SE, mid-range Android, Samsung Internet, landscape, back-swipe (photos or video) | who runs the devices and when (O-T0-9) |
| R1c | clock, data, minimap, deep links, copy suites; moments lint; header matrix; cross-origin framing page; probe HP-06/07/13/15 | - | sign O-T0-3 (if not yet); reviewer glance at the provisional Turning Points anchors |

The owner defaults the plan lists as "in force unless you object in writing" (chapter 02 section 13): sound removed, dead heatmap deleted, gold trail deleted with a truthful caption, error boundary not built (proposal only), AR hidden, Watch Together security fix only, Immersive pause fix only, the "played-through state" clock rule accepted, capacity 24 hours a week with slippage allowed. To change one, tell the AI before that train is built.

---

## 14. Things this runbook could not verify

* Any real deploy: nothing here has been run against a real Netlify deploy by this tooling. Section 6 step 4 (header parity) and the byte proof (`verify-url`) exist to close that gap on staging.
* The Netlify CLI's handling of `netlify.toml` and `_headers` (7.1), drag-and-drop handling of the same (7.2), whether a CLI draft costs credits, your plan and balance (7.3).
* The exact Netlify menu labels (the web app changes them); the documentation pages consulted on 2026-09-30 are named in `ops/owner-console-actions.md`.
* Windows Task Scheduler behaviour (8.1).
* The Lighthouse gates (mobile >= 85, desktop >= 95 with production-Referer tiles): the repo has no Lighthouse runner yet, so nothing here measures them.
* Everything that needs hardware or other browsers: iOS and WebKit, Firefox, Samsung Internet, real touch, real tiles at scale, screen readers, 30 days of RUM.
* That "Publish deploy" takes 2 minutes or less: the rehearsal has not been done.
