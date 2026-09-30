# Keeping your own testing out of the real-user numbers (Netlify RUM hygiene)

For the site owner. WP-T0-17 (action 12b) and the RUM part of WP-T0-19; register action 12(b); finding infra-netlify-32. Written 2026-09-30.

"Measured" = a command was run and its output is in the report. "Unverified" = nothing has proved it. Facts about Netlify come from Netlify's documentation pages read on 2026-09-30 and from a saved copy of the RUM script; where they conflict with what you see in the web app, trust the web app and tell the AI.

---

## 1. Why this matters

Netlify's Real User Monitoring (RUM) is the only real-user evidence of how fast the site is for visitors, and the plan's speed target (X9: p75 LCP <= 2.5 s, FCP <= 1.8 s, CLS <= 0.1, INP <= 200 ms over a 30-day window after the last Tranche-0 deploy) is judged on it. The site has only about **51 visitors and 113 page views a day** (chapter 01 / infra-netlify-32), so a handful of your own Lighthouse runs, DevTools sessions or screenshots can move a percentile. The RUM charts already show spikes on Sep 7-8, 18 and 26 that the audit believes are not code; compare them with your own testing days (section 5).

## 2. What the RUM script does (facts)

* Netlify **injects** `<script async id="netlify-rum-container" src="/.netlify/scripts/rum" ...>` before `</body>` of the HTML it serves **on production deploys only** (documentation: not on deploy previews or branch deploys). Measured 2026-09-30: production's pages carry it, 525 bytes, with the site id and a signed token in its attributes (do not copy that token into notes or chats).
* The script (11,141 bytes; the facts here were read from a saved copy of it, which is not part of the repo) is the `web-vitals` library, version 3, **without attribution**: it says a metric is bad, never why. It reports when the page becomes hidden or is left (`visibilitychange`, `pagehide`) with a `fetch` POST to **`ingesteer.services-prod.nsvcs.net/rum_collection`**.
* It runs only in the top window (framed embeds are not measured), on **every** top-level HTML document: 404 pages and developer pages included. It has **no bot filter** and the RUM pages offer no path or user-agent filter, only a device selector (per the exported PDFs and the documentation).
* Today a first visit produces **two** RUM rows because the page reloads itself; R0 removes that.
* Retention: **7 days on the Personal credit plan, 30 days on Pro** (documentation). Data is not back-filled. Your plan is unknown (`ops/RELEASE-RUNBOOK.md` section 7.3): if it is Personal you must export weekly and a 30-day window exists only in your own exports.
* The documentation says ad blockers do **not** stop RUM: the default filter lists do not block a same-site path. A rule you write yourself, or DevTools blocking, does.

## 3. Block RUM in your own test profile (do this before any audit of the live site)

Use a **dedicated Chrome profile** for testing the live site (Chrome > profile picker > Add). Do all the steps below in that profile, and never use it for anything else. There are three independent blocks; use the first two together.

**Block 1: block the collector host for the whole profile (no DevTools needed, measured to work).** Start that profile's Chrome with a flag that makes the collector's name unresolvable:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\Users\mlege\gbg-test-profile" --host-resolver-rules="MAP ingesteer.services-prod.nsvcs.net ~NOTFOUND" https://gettysburginteractivemap.com/
```

Make a desktop shortcut with exactly that line and always start the test browser from it. Measured: with the same flag form on another host (`MAP example.com ~NOTFOUND`) a page's `fetch` failed with `net::ERR_NAME_NOT_RESOLVED`, while the same request without the flag succeeded. That the real collector is still `ingesteer.services-prod.nsvcs.net` was read from the saved script copy; Netlify may change it, so re-check with Block 3 after any Netlify change.

**Block 2: block the script itself while DevTools is open.**
1. Press `F12` (DevTools), open the **Network** tab.
2. Press `Ctrl+Shift+P`, type `Show Network request blocking`, press Enter.
3. In the drawer tick **Enable network request blocking**, click **+**, type `*/.netlify/scripts/rum*` and press Enter.
4. Leave DevTools open while you test: DevTools blocking is only active while it is open.

**Block 2b (alternative): a content-blocker rule in the test profile.** In uBlock Origin: Dashboard > **My filters**, add `||gettysburginteractivemap.com/.netlify/scripts/rum$script`, Apply changes (this is the rule the audit recommended; not run here).

**Lighthouse from the command line:** if you run it yourself (`npx lighthouse ...`), add `--blocked-url-patterns="*/.netlify/scripts/rum*"` (a documented Lighthouse option; not run here, nothing in this repo runs Lighthouse yet). PageSpeed Insights, WebPageTest, GTmetrix and similar online tools cannot be blocked: they load the live page in a real browser and **do** count. Do not use them on production; test staging (`ops/STAGING-SETUP.md`) or localhost instead.

**Block 3: prove the block worked (every time you set it up, and once after each Netlify change).**
1. DevTools > Network > reload the live page.
2. Find `rum` in the filter box: the request must read `(blocked:devtools)` (Block 2) or be absent, and you must see **no** POST to `ingesteer.services-prod.nsvcs.net` (Block 1 shows it as `net::ERR_NAME_NOT_RESOLVED`).
3. If a POST to that host succeeds, the block failed: stop, and write the date and time in the log below.

## 4. Where automated testing runs (so it cannot pollute RUM)

* The browser suites (`tests/t0/*.mjs`) serve the built files from `127.0.0.1` (or, for staging runs, `gbg-staging.netlify.app`). RUM is injected only into production HTML, and a local server never injects it, so **they cannot feed RUM.** Their Mapbox telemetry is stubbed with a 204 (`events.mapbox.com`), so they do not touch the Mapbox usage counter either.
* `tests/t0/prod-probe.mjs` and `ops/sha-list.mjs verify-url` send plain HTTP requests and **never execute JavaScript**, so the RUM script cannot run. They send `User-Agent: gbg-prod-probe/1` / `gbg-sha-list/1`.
* Any test that opens the **production** address in a real browser would count. The suites do not; if someone adds one it must use the blocks in section 3.

## 5. Your own-testing log (fill it in; it explains spikes later)

Write a line every time you open the live site in a browser **without** the blocks, or run an online speed test against it. Use the time zone you read Netlify's charts in.

| Date and time (with time zone) | What you did (Lighthouse, PageSpeed Insights, DevTools session, screenshots, showed it to a friend...) | Blocked? (yes/no) | Approx. duration |
|---|---|---|---|
| | | | |

When a RUM or Analytics spike appears, look here first. The plan asks specifically for the dates Sep 7-8, Sep 18 and Sep 26 to be checked against your memory of testing.

## 6. Probes and Analytics: what to measure, once (verification item V6)

Netlify **Web Analytics** counts page views on the server side (from request logs). Whether it counts the probe's HEAD requests or its two HTML GETs is unknown (chapter 15 V6). The scheduled probe therefore runs with `--no-content`: **zero** HTML page requests (HEAD requests plus small text files only). Do this measurement once:

1. Before the scheduled probe starts, screenshot Web Analytics for the last 14 days (page views per day, unique visitors).
2. Start the scheduled probe (`ops/RELEASE-RUNBOOK.md` section 8.1).
3. After 14 days compare the daily page views with the 14 days before. A rise of more than the usual day-to-day wobble (the baseline is about 113 a day) means Analytics counts something the probe does; tell the AI which pages rose.
4. Full probe runs by hand (`tests/t0/prod-probe.mjs` without `--no-content`) make 2 HTML GETs each; do them after deploys, not on a schedule.

## 7. Reading RUM responsibly

* **Windows of at least 7 days.** An hourly bucket holds a few visits at this traffic: ignore it in the first days after a deploy.
* **Annotate deploy dates** on every export (train, rid, time), and your own-testing log dates.
* **Device selector only.** There is no path, browser or bot filter; do not invent conclusions the chart cannot support.
* **Do not block or geo-block real visitors to "improve" a number.** About 18 percent of views come from China, Singapore, Hong Kong and Germany (the audit's figure); the audit could not tell how many are people (the human share is unknown), and cloud crawlers are also how search and AI engines discover the site. Measure; do not filter.
* **If Netlify's RUM says red and the lab says green** (or the reverse), suspect pollution or bots first (sections 5 and 2), then real conditions (slow phones, real tiles: lab runs with a 403 tile server or a harness-injected Referer are upper bounds).
* **INP** has never been diagnosed on this site; do not promise a number for it before the rebuild.
* **The 30-day rule for X9:** the official verdict needs 30 days after the last Tranche-0 deploy (earliest 2026-12-03 if that deploy is 2026-11-03). On a plan that keeps 7 days you can only assemble it from your weekly exports. A first-party collector that would measure humans with attribution belongs to the rebuild (register D-TELEMETRY), not to Tranche 0.

## 8. The weekly export (10 minutes; more often if your retention is 7 days)

1. Netlify web app > the production site > **Analytics & metrics** > **Real User Monitoring** (menu label per Netlify's documentation on 2026-09-30; unverified in your account).
2. Set the timeframe to 7 days, device "All devices" (then once for Mobile and once for Desktop), percentiles 75/95/99 as shown.
3. Save as PDF (browser Print > Save as PDF) or screenshot. Name it `rum-YYYY-MM-DD-<all|mobile|desktop>`.
4. Do the same for **Web Analytics** (page views, visitors, top pages, "not found" list) and the Mapbox usage page.
5. Write the train, rid and deploy time on the printout (or in a sidecar text file), plus any lines from your own-testing log that fall inside the range.
6. File them with the baseline evidence (`docs/baseline-2026-09-30/` in the plan). Keep the two originals you already have (the RUM and Analytics PDFs of 2026-09-29) untouched.

## 9. Switching RUM on or off

RUM is a site setting: **Site overview > Analytics & metrics > Real User Monitoring**, **Enable Real User Monitoring** (or **Disable Real User Monitoring** at the bottom of that page). Data collection starts on the next visit after enabling and is not back-filled. **Leave production RUM on** (it is the plan's external witness); keep it **off on the staging site**. Do not disable production RUM to clean the numbers: that destroys the series.
