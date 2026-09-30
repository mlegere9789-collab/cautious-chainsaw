# ops/legal-drafts - legal text for review (DRAFT; not published; not legal advice)

Written 2026-09-30 for WP-DEC-07 (interim privacy correction), WP-INFRA-26, and the preparatory half of WP-DEC-08 / WP-INFRA-27 and WP-DEC-06. Nothing here is served by the site and nothing here was deployed, sent, or changed outside this folder and `tools/t0/patches/PG-legal.json`.

## What ships (train R1c, flagged) and what does not

| File | What it is | Ships? |
|---|---|---|
| `tools/t0/patches/PG-legal.json` | 10 asserted patches (7 on `privacy.html`, 3 on `terms.html`), page group, `"train": "R1c"` | **Yes in R1c, OWNER-REVIEW-REQUIRED.** Included by default (D-LEGAL step 1); to hold it back delete or rename the file (no other patch depends on it). The flag is in the file's `description` and in every patch `note`. |
| `preview/privacy.interim-R1c.html`, `preview/terms.interim-R1c.html` | byte-identical output of the patches applied to `legacy/dist` (open in a browser to read what R1c would publish) | No (generated) |
| `privacy.merged-draft.html`, `terms.merged-draft.html` | fuller merged Privacy + Terms for counsel (D-LEGAL step 2), visibly marked DRAFT, `noindex` | No |
| `contact-architecture.md` | role addresses, mail DNS, DMARC ladder, CAA, `security.txt` (D-CONTACT) - **do not act** | No |
| `data-inventory.json` / `.md` | the fact base: every origin, storage key, cache and permission with evidence (WP-DEC-07's `docs/data-inventory.md`; it lives here because `docs/` is not this task's path) | No |
| `verify-facts.mjs` | static check of a built tree against the inventory and the built `privacy.html` (see below) | tooling |
| `build_pg_legal.py` | generates `PG-legal.json`, the previews and `data-inventory.md` from readable text; every `find` is cut from `legacy/dist` | tooling |

## Regenerate and check

```
python ops/legal-drafts/build_pg_legal.py                       # rewrite PG-legal.json, previews, data-inventory.md
python tools/t0/build.py --train R1c --out tmp/<you>/build      # patches apply with 0 anchor failures (385 records on 2026-09-30, with PG-core and PG-maps present)
node ops/legal-drafts/verify-facts.mjs --dist tmp/<you>/build/dist
node ops/legal-drafts/verify-facts.mjs --dist legacy/dist       # RED on the current site: 30+ FAIL (the live privacy page misses every item)
```

`verify-facts.mjs` fails a tree that: references a host not in the inventory; uses a storage key or cache name not in the inventory; writes `document.cookie`; uses camera/location/orientation APIs outside `ar.html`; has an on-device page (`ar`, `historian`, `cinematic-export`, `immersive`) that fetches anything but same-origin `/data/*` or uses a beacon/socket/XHR; has a `privacy.html` that does not name every inventoried host, key, cache and permission; still shows `[OWNER TO CONFIRM` in visible text; or (coupling checks) says PeerJS is fetched only on Host/Join while `watch-together.html` still loads it at page load. It warns when the Terms embed sentence is not backed by a generated `_headers`. Negative test 2026-09-30: seeding a tracker host, a new key, a cookie write, a missing "compass", a visible marker and a static PeerJS tag into a copy of the R1c tree gave 7 FAIL.

## Owner sign-off list (what must be read or confirmed before R1c is deployed)

Markers are inside HTML comments in the patches, so they cannot leak into the page; each is listed by `verify-facts.mjs` as INFO. The visible text was written to be true whichever way they are resolved.

1. `privacy.html` date and `terms.html` effective date: **September 30, 2026** = the day the text was written and checked. The build has no date placeholder (outputs are deterministic). If the text changes before deploy, change the date in `build_pg_legal.py` (constants `DATE`) and re-run.
2. Netlify Web Analytics: the second sentence of the "Hosting and traffic statistics" item says Netlify's server-side analytics reports page views, unique visitors by IP address, referrers, countries and pages not found. The owner's PDFs (seo-growth G21) imply it is on; that is unverifiable from outside (register question O-12). If it is off, delete that sentence.
3. Netlify Real User Monitoring stays on (it is on today: Netlify injects the script into 27 of 27 live pages). If it is switched off, delete that item.
4. Terms: the sentence about embedding "its widget" is **not edited**. It is true only when the config agent's R1c headers free `/embed` and `/embed.html`; `verify-facts.mjs` checks the built `_headers` (PASS on the 2026-09-30 composed tree).
5. Terms: "the written vignette scripts are the creator's own work" (live, unchanged) cannot be confirmed from the repository (four data notes cite a "Gettysburg Animated YouTube vignette", register action 10a). Left as is; flagged.
6. Contact stays the Gmail address on purpose (role addresses do not exist yet: `contact-architecture.md`).

## What the interim patches change, and why (all facts-only)

`privacy.html` (before: 4 bullets): Street View is the Virtual Walkthrough frame, not "documentary and report pages" (`bundle.pretty.js:110661`; no static page embeds Google); adds Netlify hosting logs and analytics; Netlify RUM fields (from the live script); Mapbox map-library events with the fields captured from a real load; Google Maps links; the NPS Show Video frame (off by default); Watch Together live sync (PeerJS 1.5.4 defaults read from the file: broker `0.peerjs.com`, Google STUN, PeerJS TURN, jsDelivr); the camera/location/motion permissions of the AR page; on-device tools; every storage key and cache; the cookie statement narrowed to what was checked; the children paragraph without "collects no personal information"; a dated change log. Kept: owner's voice ("we"), title, canonical, structure, Gmail contact.

`terms.html` (3 edits): effective date; the sentence "this site notes the discrepancy rather than silently picking one number" is replaced by "does not yet flag every discrepancy" (the only visible discrepancy note is the Casualty Dashboard footnote, which the page-defect group deletes as a developer note: `PGC-dash-footnote`); a "Third-party services" paragraph (WP-INFRA-26 step 3). No warranty, liability, governing-law or licence text is added.

## Differences between the merged drafts and infra-netlify Appendix H (why they are not a copy)

* Referer: Appendix H says third parties receive "the address of the page you are on"; the site sends its origin only (`Referrer-Policy: strict-origin-when-cross-origin`).
* Street View is not click-to-load today (the frame opens with the Walkthrough); the click-to-load wording is bracketed `[[WHEN SHIPPED]]`. The NPS frame already is on-demand, so its bracket is removed.
* Cache Storage: after R0 only same-origin `/assets/*` files, not "data and pages"; plus the `mapbox-tiles` cache; plus sessionStorage keys `gtbg_layout` (R1b), `gtbg_chunk_reload`, `gtbg_boot_retry` (R0), missing from Appendix H.
* "PeerJS's public broker reports an EU location" was not verified and is dropped; PeerJS publishes no privacy policy we could find.
* `security.txt` and role addresses do not exist yet: bracketed.
* Under-13 / under-16 wording removed (register D-LEGAL); the CC BY-NC/BY licence recommendation replaced by the D-LICENSE default; warranty, liability and governing-law text is left for counsel (WP-CONTENT-24).
* Voice: the drafts keep "we" (Appendix H and the live pages); WP-CONTENT-24 (R2) is the neutral-voice pass.

## What could not be verified

Whether Netlify Web Analytics is on and the Netlify plan; whether Google sets cookies inside the Street View frame (headless Chrome's cookie jar stayed empty, which is not proof for real browsers); what Mapbox, PeerJS, jsDelivr and Netlify retain; the NPS frame's cookies; WebRTC IP exposure was taken from the protocol, not measured here; behaviour on iOS/WebKit, Firefox and real devices (all probes were headless Chrome 153 on Windows); real AR permission prompts (headless).
