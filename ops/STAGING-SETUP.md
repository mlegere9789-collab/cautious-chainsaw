# Staging: the second Netlify site (`gbg-staging`)

For the site owner. WP-T0-02 (staging site, byte-identity proof, rollback rehearsal) and the staging half of WP-T0-19. Read `ops/RELEASE-RUNBOOK.md` first for the overall flow; this file is the detail behind its section 6.

"Measured" = a command was run on 2026-09-30 and its output is in the report. "Unverified" = nothing has proved it; the step that would is named. **No `gbg-staging` site exists yet and none of the staging steps below has been run against a real Netlify site.** What was run: the tools against production (read-only requests) and against a local copy.

---

## 1. Why a second site, and what it can and cannot prove

**Purpose:** a place where exactly the bytes and headers that will go to production can be served, probed and soaked before the real site changes, and where the rollback can be rehearsed without touching visitors.

| It proves | It cannot prove |
|---|---|
| the files arrive intact (sha256 of every served file) | Mapbox maps: the token only allows `gettysburginteractivemap.com`, so on a `netlify.app` address the tiles answer 403 and the map is blank (section 9 has the options) |
| the headers and redirects Netlify applies to that upload (parity with production, section 6) | real visitors, real devices, real load, RUM |
| `version.json`, the service-worker file, asset caching, both URL spellings | iOS/WebKit, Firefox, Samsung Internet behaviour |
| the rollback mechanics ("Publish deploy") and how long they take | anything about production's own settings unless you mirror them (section 4) |

---

## 2. Create the site

Pick one way. The site name **`gbg-staging`** gives the address `https://gbg-staging.netlify.app`; if the name is taken choose another (for example `gbg-staging-<your initials>`) and use that everywhere below.

**Way 1: web app (no CLI needed)**
1. Make the first upload folder: `node ops/sha-list.mjs stage legacy/dist release/staging/legacy --force` (section 3 explains what this folder is).
2. Open <https://app.netlify.com/drop> while logged in (or, in the team's **Projects** page, use the drag and drop area), and drag the folder `release/staging/legacy` onto the drop area. Netlify creates a new site with a random name and publishes the folder.
3. Open that site > **Site configuration** > **General** > **Site details** > **Change site name** (Netlify may call sites "projects"): set `gbg-staging`.
4. Note its **Project ID / Site ID** (same page, "Site information"). Store it with your other IDs.

**Way 2: CLI** (after the CLI setup in `ops/RELEASE-RUNBOOK.md` section 7.1)
```
netlify sites:create --name gbg-staging          # choose your team when asked; prints the site id and URL
cd release/staging/legacy
netlify deploy --dir . --prod --site <STAGING_SITE_ID> --message "legacy identity proof (staging)"
```

Do **not** connect the staging site to Git, add a custom domain, or link it from anywhere (the optional exception is section 9 option B).

---

## 3. Make it `noindex` (and prove it)

Staging must never appear in search. The mechanism is a `_headers` file in the deployed folder containing `X-Robots-Tag: noindex` for every path. `ops/sha-list.mjs stage` builds that folder:

```
node ops/sha-list.mjs stage release/R0/dist release/staging/R0 --force
```

* It copies the dist to `release/staging/R0` (only folders under `release/` or `tmp/` are accepted; it never writes inside `legacy/` or inside the dist you give it).
* It creates `_headers` with `/*` and `  X-Robots-Tag: noindex` (or inserts that line into the `/*` block of an existing `_headers`; it refuses if the file already sets `X-Robots-Tag`).
* It prints both tree digests and the line **`differs from the source ONLY in: _headers (X-Robots-Tag: noindex)`**. If it prints `UNEXPECTED differences`, do not deploy.
* Measured: `stage legacy/dist release/staging/legacy-test` printed exactly that line (120 files against the source's 119).

**Deliberate deviation from the plan's wording:** the plan says the identity proof deploys "untouched `legacy/dist`". The folder deployed here is `legacy/dist` plus the one config file `_headers`, so that the staging site is never indexable even for an hour. The 119 served files are compared exactly as planned; `_headers` is a configuration file, not one of the 119.

**Prove noindex after every staging deploy:** the probe's check `T0-06` with `--staging` fails unless `X-Robots-Tag: noindex` is on `/`:
```
node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train R0 --staging
curl -sI https://gbg-staging.netlify.app/ | findstr /i robots        # PowerShell: curl.exe -sI ... | Select-String -Pattern robots
```
Also confirm `https://gbg-staging.netlify.app/_headers` answers 404 (probe `HP-13a` checks it). If `noindex` does not come back at all, this route does not process `_headers`: keep the URL private, deploy nothing else to that site, and tell the AI (the plan's fallback is `[context]` rules via Git deploys, chapter 09).

**R1c note:** the config generator can also write the `noindex` line itself (`T0_CONTEXT=staging`), but then the built tree differs from the production tree in `_headers` at build time. Prefer `stage`, which keeps the tested dist untouched and adds the line to the `/*` block; `stage` refuses if `_headers` already sets `X-Robots-Tag`.

**Never let a staging copy reach production.** Probe `T0-06` (no `--staging`) fails if production ever sends `X-Robots-Tag: noindex`. Never deploy anything from `release/staging/` to the production site.

**Also:** the staging copy of `robots.txt` is production's permissive one, so the header is the only guard. Do not verify staging in Search Console and do not paste its address into public places.

---

## 4. Mirror production's site settings (or know how they differ)

**Measured 2026-09-30: production does not serve the HTML files as uploaded.** Comparing every file of `legacy/dist` with what `https://gettysburginteractivemap.com` serves (`node ops/sha-list.mjs verify-url ... --html-warn`, 119 requests, read-only):

* 91 of 91 non-HTML files are byte-identical (including the entry bundle, `sw.js`, data, icons);
* 15 HTML files are identical except that Netlify appends a 525-byte `<script id="netlify-rum-container" ...>` before `</body>` (Real User Metrics injection);
* 11 HTML pages differ further: Netlify rewrote their internal links (`/x.html` to `/x`) and re-quoted attributes (Pretty URLs post-processing);
* `diagnostics.html` answers 404 (the `netlify.toml` rule with `force = true` works on production).

So a new site's HTML will differ from production's unless the same post-processing is on. In the Netlify web app, on **both** sites: **Site configuration > Build & deploy > Post processing** (and the Real User Monitoring page under **Analytics & metrics**): screenshot production's settings (Pretty URLs, asset optimization/bundling/minification/image compression, snippet injection, RUM) into the baseline folder, then set staging the same. (Menu labels move; unverified.) Two phases: for the **byte-identity proof** (section 6) put staging with **all post-processing off and RUM off**, so HTML arrives exactly as uploaded; for the **parity check and every soak** switch staging to production's settings (Pretty URLs on, so that both `/dashboard` and `/dashboard.html` answer 200 as they do on production; RUM off), because that is what will actually be served to visitors. Note the settings used in the log row.

How to read the `verify-url` output on staging:

| Output | Meaning | Action |
|---|---|---|
| `OK` for every non-HTML file | files intact | good |
| `OK*` on an `.html` file | identical apart from the RUM snippet: RUM is ON for staging | turn RUM off for staging (it would also send staging traffic into its own RUM project) |
| `WARN`/`DIFF` on `.html` with "single-quoted attributes" | Pretty URLs (link rewriting) is ON | turn it off on staging, or accept and note it |
| `DIFF` on a `.js`/`.css`/image | asset optimization changed the bytes | turn it off; this is a real problem for cache-busting; do not ship until identical |
| `MISS` on `diagnostics.html` (legacy tree only) | the toml redirect rule was processed: this is GOOD evidence | pass `--expect-missing netlify.toml,_headers,_redirects,diagnostics.html` so it counts as expected |
| `PUB netlify.toml` or `PUB _headers` | a config file is publicly served | investigate; not expected on Netlify |

---

## 5. Deploy modes on the staging site (and credits)

Netlify documents that production deploys cost 15 credits, Deploy Previews and branch deploys cost nothing, and rollbacks to a previous production deploy cost nothing; it does not say what a CLI draft (a deploy without `--prod`) costs (unverified). Credits are shared by the whole team: if the Free plan's 300 credits run out, **every project, production included, is paused**. Check the balance first (`ops/RELEASE-RUNBOOK.md` section 7.3).

| Situation | Use | URL you probe |
|---|---|---|
| balance comfortably above the plan's 60 credits plus a margin (for example 200 left) | `netlify deploy --dir . --prod --site <STAGING_SITE_ID>` (or drag and drop) | `https://gbg-staging.netlify.app` |
| balance tight or unknown | a draft deploy with an alias: `netlify deploy --dir . --site <STAGING_SITE_ID> --alias r1a` | `https://r1a--gbg-staging.netlify.app` (unverified alias form: the CLI prints the real URL, use that) |
| the rollback rehearsal (section 8) | production-type deploys on staging (two of them) | `https://gbg-staging.netlify.app` |

After the first staging deploy, look at the credit balance again and write down whether it moved. Real User Monitoring is injected only on a site's production deploys (documentation), so drafts never feed RUM.

---

## 6. The byte-identity proof (do once, before R0: WP-T0-02 acceptance)

```
node ops/sha-list.mjs list legacy/dist --out release/staging/legacy.tsv
#   expect: "119 files, tree 90d819d0a948e0e0164333ab519f3941ab78ac147f4c93d8e18802dfb253905d"  (measured: it is)
node ops/sha-list.mjs stage legacy/dist release/staging/legacy --force
#   deploy release/staging/legacy to gbg-staging (section 2 or 5)
node ops/sha-list.mjs verify-url release/staging/legacy.tsv https://gbg-staging.netlify.app --expect-missing netlify.toml,_headers,_redirects,diagnostics.html --html-warn --out release/staging/identity-proof.json
```

**Acceptance (the plan's "119/119"):** every non-HTML file `OK`; every HTML file `OK` (or a documented section-4 difference); the exit code `0`; the two config files and `diagnostics.html` correctly not served. Keep `identity-proof.json` and the console output with the baseline evidence. The same command against production (measured) gives 91 identical, 15 identical apart from the RUM snippet, 11 rewritten HTML pages, `diagnostics.html` missing: the rewritten pages are production's post-processing, not a difference in the files you deploy.

**Header parity proof (every train, also once for `legacy`):**
```
node tests/t0/prod-probe.mjs --base https://gbg-staging.netlify.app --train legacy --staging --parity https://gettysburginteractivemap.com --staging-vs
```
It requests 16 representative URLs on both sites (`/`, `/privacy`, `/dashboard`, `/embed`, `/embed.html`, `/sw.js`, `/version.json`, a data file, `manifest.json`, `robots.txt`, `sitemap.xml`, the guide PDF, favicon, `icons.svg`, `site-nav.css`, the entry bundle) and compares status, cache-control, content-type, content-disposition, X-Frame-Options, both CSP headers, HSTS, Referrer-Policy, Permissions-Policy, nosniff, X-Permitted-Cross-Domain-Policies. **`X-Robots-Tag` is the only expected difference** (`--staging-vs` ignores it). This is what proves that `netlify.toml` (from a CLI deploy) or `_headers` (from either route) was processed for that upload: if the security headers are missing on staging, that route loses them and **must not be used for production**. It also settles the drag-and-drop question of `ops/RELEASE-RUNBOOK.md` section 7.2 for that route.

Reading a parity failure: `status 404 vs 200` on `/version.json` in a `legacy` run is fine (legacy has none). `status 200 vs 404` on `/privacy`, `/dashboard`, `/embed` means Pretty URLs are off on staging (production answers both spellings): switch it on for staging (section 4). A missing `strict-transport-security`, `x-frame-options`, `content-security-policy-report-only` or `cache-control: ...immutable` on the asset means the toml was not applied.

---

## 7. The per-train staging routine

For each train (R0: soak 48 h, start by the Sunday before the Tuesday; others 24 h):

1. Build and gate green (`ops/RELEASE-RUNBOOK.md` section 4) and run the local suites (section 5 there).
2. `node ops/sha-list.mjs stage release/<train>/dist release/staging/<train> --force`
3. Deploy that folder to `gbg-staging` (section 5).
4. `node tests/t0/prod-probe.mjs --base <staging url> --train <train> --staging --dist release/<train>/dist` (all `PASS`/`KNOWN`).
5. Parity (section 6). For **R0, R1a, R1b** it must be clean (no header changes are part of those trains). **R1c changes headers on purpose** (the generated `_headers`, `tools/t0/config/gen.mjs`: frame policy per page, an enforced `frame-ancestors`, per-page Report-Only host lists, Permissions-Policy per page, a shorter cache for `/icons/*`, `/embed` frameable): the parity command will show many differences by design, so for R1c read them against `release/R1c/dist/_ops/config-manifest.json` and the header comment of `gen.mjs`, and use these as the gate instead: `node ops/headers-probe.mjs <staging url> --profile t0` (exit 0), `node tests/t0/headers.spec.mjs --dist release/R1c/dist` (the rule and real-browser framing tests) and the probe's own `HP-06/07/13`.
6. `node ops/sha-list.mjs list release/<train>/dist --out release/staging/<train>.tsv` then `verify-url release/staging/<train>.tsv <staging url> --html-warn`: no `DIFF`/`MISS` on non-HTML files.
7. Do the by-hand smoke list `tests/t0/journeys-manual.md` part A on the staging URL (blank map expected).
8. Soak, then re-run steps 4 and 6 once more at the end of the soak (a deploy that decays is a finding).
9. Only then production (`ops/RELEASE-RUNBOOK.md` section 7).

---

## 8. Rollback rehearsal (WP-T0-02, once, before R0)

Goal: prove "Publish deploy" restores the previous site and time it. Target: **2 minutes or less** at Tranche 0.

1. Deploy `release/staging/legacy` to staging with `--prod` (this is deploy X).
2. Deploy `release/staging/R0` with `--prod` (deploy Y). Check `https://gbg-staging.netlify.app/version.json` now answers 200 (legacy has none).
3. Open **Deploys** for `gbg-staging`, click deploy **X**, get ready to click **Publish deploy**, start a stopwatch as you click.
4. Stop the stopwatch when the old site is back: `version.json` answers 404 again.
   ```
   # Git Bash
   until [ "$(curl -s -o /dev/null -w '%{http_code}' https://gbg-staging.netlify.app/version.json)" = 404 ]; do sleep 2; done; echo restored
   # PowerShell
   while ((curl.exe -s -o NUL -w "%{http_code}" https://gbg-staging.netlify.app/version.json) -ne "404") { Start-Sleep 2 }; "restored"
   ```
5. Record the seconds in `ops/RELEASE-LOG.md` notes (the row's rid may stay as the example). Run the parity and probe once more on the restored site.

Cost: two production-type deploys on the staging site, up to 30 credits if the balance shows they count; the publish itself is documented as free. Unverified until you do it.

---

## 9. Seeing the map on staging (Mapbox blocks `netlify.app`)

The Mapbox token in the site is restricted to your real domain (register action 3): tiles answer 403 elsewhere, and `netlify.app` must **never** be added to the token's URL list (that would authorise every Netlify site). Options:

* **A. Automated runs (default, already built):** the test harness (`tests/t0/lib.mjs`) adds the production `Referer` to Mapbox requests and caps them at 300 per run, so browser suites see real tiles on any origin. For a human, you get everything except the map imagery.
* **B. A `staging.` subdomain of your own domain (owner decision, unverified):** Mapbox's documentation says subdomains of an allowed URL are allowed, so the existing token should also work on `staging.gettysburginteractivemap.com`. That needs (1) a custom domain added to the staging site, (2) one DNS record in Netlify DNS (a CNAME `staging` pointing at the staging site's `.netlify.app` name, as the Netlify domain settings page instructs), (3) Netlify's certificate for it. Effects to accept first: your HSTS header is `includeSubDomains; preload`, so the subdomain must stay HTTPS-only forever; a domain-level Search Console property would list the staging pages (they are `noindex`); it is a DNS change, so it is yours to do. Prove it works by opening the staging page and looking at the map; nothing has tested it.
* **C. A low-value preview token** (register action 3 creates one) would need the staging copy's HTML and bundle edited to use it, which breaks the byte-identity proof; not recommended for release proofs.

---

## 10. Hygiene

* The staging site holds nothing secret. Its address is not private, only unlinked and `noindex`.
* Keep Real User Monitoring off on staging.
* Do not add the staging address to any Mapbox or Google key allow-list.
* Delete nothing on the production site's Deploys page until the archive exists and the plan says so (register: do not delete stale Netlify deploys first).
* A staging deploy is not a release: it gets no row in `ops/RELEASE-LOG.md` except the rehearsal note.
