# Header decisions for train R1c (record of what was decided, with the evidence)

Written 2026-09-30 for the release verifier's defect "R1c header deviations from the plan's acceptance text" and the desktop verifier's Permissions-Policy finding. Generator: `tools/t0/config/gen.mjs`; tests: `tests/t0/headers.spec.mjs` (`HDR-*`); probes: `ops/headers-probe.mjs`, `tests/t0/prod-probe.mjs`. "Plan" = `docs/plan/FINAL/02-tranche0-hotfix-runbook.md` WP-T0-15. **Everything below was run in headless Chrome 153.0.8010.54 on Windows against a local emulation of the generated rules; none of it has run on Netlify, on a real phone, in Safari or in Firefox.** The one place that touches the real Google Street View embed is marked.

Decisions that need the owner's yes are collected in section 6. Until the owner says otherwise the defaults below ship.

## 1. Framing: `X-Frame-Options: DENY` + `frame-ancestors 'none'` (the plan says SAMEORIGIN + `'self'`)

| | |
|---|---|
| Plan text | every page except `/embed*`: `frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN` |
| What R1c ships | every page except `/embed` and `/embed.html`: `X-Frame-Options: DENY` and an enforced `Content-Security-Policy: frame-ancestors 'none'`; `/embed` and `/embed.html`: `frame-ancestors *` and no `X-Frame-Options` |
| Decision | **keep the stricter DENY / `'none'`** (owner default: "stricter is fine") |

Evidence:

* **It is not a tightening of what is live.** The production `netlify.toml` already sends `X-Frame-Options = "DENY"` on `/*` (line 8 of `baseline/dist/netlify.toml`); `SAMEORIGIN` would LOOSEN the live behaviour. The legacy override for `/embed.html` never worked (production today: `/embed.html` answers `X-Frame-Options: DENY` together with `frame-ancestors *`, probe HP-06, `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train legacy`, 2026-09-30).
* **Nothing frames a page of this site from the same origin.** `grep -rl iframe baseline/dist` finds `assets/index-Cg8FAMXN.js`, `index.html` (a CSS comment about the Street View frame), `privacy.html` (text) and `netlify.toml`; none of the 27 HTML pages has an `<iframe>`. The entry bundle creates exactly two iframes, both third-party: the Google Street View embed (`https://www.google.com/maps/embed/v1/streetview...`) and the NPS video page (`https://www.nps.gov/media/video/view.htm...`).
* **Chrome honours it.** `node tests/t0/headers.spec.mjs` test `HDR-20`: a cross-origin page frames `/embed`, `/embed.html` and `/embed?vignette=...`; it cannot frame `/`, `/index.html`, `/privacy`, `/dashboard`, `/dashboard.html` or `/ar`; and a SAME-origin frame of `/privacy` is blocked too (`chrome-error`), which is the case where DENY differs from SAMEORIGIN.
* `/embed` is frameable by everyone (that is what the Terms invite: "embedding its widget on your own page"), including same-origin pages, so no in-site feature loses anything.

To switch to the plan's wording: in `gen.mjs` change `['X-Frame-Options', 'DENY']` (documents, directories, root files) to `SAMEORIGIN` and `"frame-ancestors 'none'"` to `"frame-ancestors 'self'"`, then update the expectations in `HDR-03`, `HDR-06`, `HDR-20` (the same-origin case), the `framingRefused` helper of `ops/headers-probe.mjs` (already accepts both) and probe HP-06 (accepts both). No other file depends on it. Browsers that understand `frame-ancestors` ignore `X-Frame-Options`; both are sent so older browsers behave the same.

## 2. Permissions-Policy: tightened, and scoped so the Virtual Walkthrough logs nothing

Plan: "No Permissions-Policy tightening". Legacy (`netlify.toml`, every page): `camera=(self), microphone=(), geolocation=(self), payment=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)`.

R1c ships (`gen.mjs`, one rule per document, both URL spellings):

| Page | Permissions-Policy |
|---|---|
| `/ar`, `/ar.html` (the hidden Battlefield AR page: the only page that calls `getUserMedia`, `geolocation` and the orientation events) | `accelerometer=(self), camera=(self), geolocation=(self), gyroscope=(self), magnetometer=(self), microphone=(), payment=()` |
| `/` and `/index.html` (the app; hosts the Virtual Walkthrough's Google Street View frame) | **delegated** (only when the next paragraph's two conditions hold): `accelerometer=(self "https://www.google.com"), camera=(), geolocation=(), gyroscope=(self "https://www.google.com"), magnetometer=(), microphone=(), payment=()`; otherwise all of them `()` |
| every other page, including `/embed` | `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=()` |

### The finding, reproduced (Chrome 153, `tmp/release-fix/wt-pp.mjs`, the app's Virtual Walkthrough opened, console recorded)

The Street View frame is `<iframe src="https://www.google.com/maps/embed/v1/streetview?...">` with **no `allow` attribute** (`assets/index-Cg8FAMXN.js`). Google's own script inside that frame reads the device motion sensors and logs when it is not allowed to.

| Variant (header on `/` / iframe attribute) | Console after opening the Walkthrough |
|---|---|
| no Permissions-Policy header at all / no attribute (this is what legacy does for the cross-origin frame: `accelerometer=(self)` does not name google.com) | **`[error] Permissions policy violation: accelerometer is not allowed in this document.`** and **`[warning] The deviceorientation events are blocked by permissions policy.`** (both from `maps.googleapis.com/.../main.js`, i.e. Google's code) |
| R1c as first built: `accelerometer=()` / no attribute | the same two messages |
| header names `https://www.google.com` / no attribute | the same two messages (a header alone cannot delegate: the iframe's own `allow` attribute is the other half) |
| `accelerometer=()` / `allow="accelerometer; gyroscope; magnetometer; fullscreen"` | the same two messages (the parent's header still blocks) |
| header `(self "https://www.google.com")` for accelerometer + gyroscope / `allow="accelerometer; gyroscope"` (magnetometer stays `()`) | **no message at all**; with the app's real Mapbox tiles injected (`--inject`) the console after opening the Walkthrough has **0 messages of any level** |
| header `("https://www.google.com")` WITHOUT `self` / the attribute | the same two messages again: Chrome 153 did not accept the delegation unless `self` is also in the list |

Two corrections to the desktop verifier's note: (1) R1c does **not** add the `deviceorientation` warning; it is logged by Google's frame in every variant that lacks the delegation, legacy included (the first row). (2) The `accelerometer` error is therefore not caused by the R1c header; it is a pre-existing third-party message that only the attribute + header pair can remove.

### What was decided

* **The pair is shipped, and only the pair.** Bundle patch `tools/t0/patches/CP+walkthrough-sensors.json` (`cp:walkthrough-streetview-allow`) adds `allow:"accelerometer; gyroscope"` to the Street View iframe and to nothing else (the NPS video frame stays without; magnetometer is not delegated because it was not needed). `gen.mjs` writes the delegation (`PP_APP`) for `/` and `/index.html`.
* **It is emitted only when it is disclosed.** The generator grants the header only if (a) the entry bundle contains the attribute and (b) `privacy.html` says the site lets that frame read the motion sensors ("This site allows that frame ... motion sensors"). That sentence is part of the opt-in legal group (`--with PG-legal`, section 5 of `ops/legal-drafts/README.md`). A default build keeps `/` fully off and warns in `_ops/config-manifest.json`; the Walkthrough then keeps logging Google's two messages exactly as the live site does today. So the headers can never grant a third party more than the published privacy text admits.
* **Tests:** `HDR-07` (matrix + the "attribute AND disclosure" rule recomputed independently), `HDR-13` (the attribute is on the Street View iframe only, the NPS frame has none, the header and the attribute name the same features for the same origin, no other page names google.com), `HDR-21` (26 pages load under their policies with 0 policy messages; `allowsFeature` per page), `HDR-24` (the default build is OFF and the generator warns), `HDR-23` with `--online` (REAL Google embed, loaded twice: as built it logs **no** policy/sensor message; the control without the attribute logs Google's accelerometer error, so the clean run is not vacuous), probe `E-03` (`/`: all off, or exactly the two features for exactly `https://www.google.com` AND `/privacy` discloses it; `/embed`, `/dashboard` off; `/ar` self only).
* **Why `self` is also in the list:** measured (last row of the table).

### Why the rest is tightened

Only `ar.html` uses `getUserMedia`, `navigator.geolocation` or the orientation events; the app's copies are the unused Mapbox `GeolocateControl` (`ops/legal-drafts/verify-facts.mjs` check 4; `node ops/legal-drafts/verify-facts.mjs --dist <dist>`). Legacy granted camera and location to `self` on every page for no page that needs them. R1c keeps AR working and removes the grant everywhere else. `microphone` and `payment` stay `()` as before.

### Not verified

Real phones (does the Street View frame use the motion sensors, and does Safari's permission prompt appear?), iOS/WebKit (Safari ignores unknown Permissions-Policy features and treats `allow` differently), Firefox, and Netlify's own handling of the header value with a quoted origin. The mobile Tools-sheet tile opens the same component; it was not re-run on a phone viewport for this finding.

## 3. Caching of files that keep their name

The release verifier asked whether files replaced under the same name could be cached "immutable". `screenshots/day1.png` and `day3.png` (replaced in R1a, 17,585 B one file before; two 1280x720 title cards now), `og/card-r1.png`, `manifest.json`, the favicon and the existing icons all keep a fixed name.

* `/assets/*` (hashed names) is the **only** immutable class; `HDR-11` asserts that no other file of the dist resolves to `immutable`, that every image named by the manifest or an `og:image`/`twitter:image` tag exists and has a class of at most one day, and that every file that exists in `baseline/dist` under the same name with different bytes (32 files, including `screenshots/day1.png`, `day3.png`, `manifest.json`) is not immutable.
* `gen.mjs` now states the class explicitly (`/screenshots/*` and `/og/*`: `public, max-age=0, must-revalidate`, identical to Netlify's default and to what production serves today) and refuses to generate if a fixed-name directory (`screenshots`, `og`, `icons`) is immutable or longer than a day. `/icons/*` stays at one day (legacy: one year immutable on un-fingerprinted names; the two new maskable icons have new names).
* Trains R0, R1a and R1b ship the legacy `netlify.toml`: it has no rule for `/screenshots/*` or `/og/*` (default revalidation) and keeps `/icons/*` immutable for a year, which is safe because no icon is replaced under an existing name (the maskable icons are new files; `icon-192.png` and `icon-512.png` keep their bytes). Probe `T0-08` checks the served classes on any site.
* Returning visitors: the OLD service worker precaches `/manifest.json` and the icons cache-first (WP-T0-14 risk note); the new manifest reaches them when the old worker is replaced.

## 4. What is publicly served that is not the app

* **The kill switch is no longer in the dist.** It used to be copied to `dist/_ops/sw-kill.js` and served at `/_ops/sw-kill.js`. It is now only `ops/sw-kill.js` in the repository plus an identical copy at `release/<train>/_ops/sw-kill.js` (outside `dist`, never deployed). Level L2 deploys `ops/sw-kill.js` AS `/sw.js` (`ops/RELEASE-RUNBOOK.md` section 11). Checks: gate `r0-mechanism` (fails if a `sw-kill.js` is inside the dist), `HDR-12`, `S2`/`S6` of `ops/staging-verify.mjs`, probe `T0-04` (the file is NOT served).
* **`_ops/` still ships three bookkeeping files** (`asset-manifest.json`: the names and hashes of the public `/assets/*` files; `used-names.txt`: the asset-name ledger; on R1c `config-manifest.json`: which rule class each page got). They contain nothing that is not derivable from the public site (they name the generator path `tools/t0/config/gen.mjs`); the gate and the tests read them from the dist. Making them non-public needs a forced 404 rule in every train, including R0-R1b which ship the legacy toml; left as is, documented here.
* `netlify.toml`, `_headers` and `_redirects` are processed by Netlify and not served (production: `/netlify.toml` answers 404, HP-13a). The local emulator used to serve `netlify.toml` as a file and was corrected (`tools/t0/config/emulate.mjs`).
* The manifest/overlay deviations from WP-T0-14 (screenshots kept as title cards instead of deleted, `form_factor: wide`, two maskable icons added, `purpose` of the existing icons narrowed to `any`, `id` added, `orientation` removed) are listed in `ops/T0-DEVIATIONS.md`.

## 5. Privacy and Terms statements against the final headers

The legal text is an OPT-IN group (`python tools/t0/build.py --train R1c --with PG-legal`); `ops/legal-drafts/verify-facts.mjs` checks the built tree. What each header-related statement rests on:

| Statement (privacy.html / terms.html) | Backed by | Checked by |
|---|---|---|
| Terms: "embedding its widget on your own page" | `/embed`, `/embed.html`: `frame-ancestors *`, no `X-Frame-Options`, no Report-Only | `verify-facts` check 7; `HDR-03`, `HDR-20`; probe HP-06/07 |
| Privacy: third parties receive this site's address as the referrer (origin only) | `Referrer-Policy: strict-origin-when-cross-origin` in `/*` | `verify-facts` check 9; `HDR-04` |
| Privacy: "This site allows that frame, and no other outside frame, to read your device's motion sensors" | the iframe `allow` attribute + `Permissions-Policy` naming `https://www.google.com` on `/` only | `verify-facts` check 8 (fails in both directions); `HDR-07/13/23`; probe E-03 |
| Privacy: Battlefield AR asks for camera, location, compass; "no other page of this site asks for your camera or location" | `Permissions-Policy` camera/geolocation/sensors `(self)` on `/ar*` only; `()` elsewhere | `verify-facts` check 4 + coverage; `HDR-07`; probe E-03 |
| Privacy: storage table, cookies, service worker "never handles pages or data files" | `sw.js` (gate `r0-mechanism`), inventory | `verify-facts` checks 2, 3 |

## 6. For the owner (defaults apply until you say otherwise)

1. **Framing:** keep DENY / `'none'` (default) or switch to the plan's SAMEORIGIN / `'self'` (section 1; one token each).
2. **Street View motion sensors:** keep the delegation (default; needs the legal opt-in so the privacy page says so) or drop it (delete `CP+walkthrough-sensors.json` and `PP_APP`; the Walkthrough then logs Google's two messages as it always did). Check it on a real phone either way.
3. **Legal text:** build with `--with PG-legal` only after reading `ops/legal-drafts/preview/*.html` and `ops/legal-drafts/OWNER-SIGNOFF.md`, and set `legal.effective_date` in `tools/t0/trains.json` to the deploy day.
