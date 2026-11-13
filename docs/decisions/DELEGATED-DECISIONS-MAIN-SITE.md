# Delegated decisions, main site (appended by engineers; newest block at the bottom)

The owner delegated the pending owner decisions on 2026-11-11. Each row is a DELEGATED DECISION: taken conservatively from the evidence in the repository, reversible, with the alternative kept selectable. The owner can override any row in writing. Owner-only acts (accounts, legal text, payments, third parties, deployment, real hardware) are not settled here.

## 2026-11-13, status survey part A (chapters 01 to 08b of docs/plan/FINAL); per-item evidence in docs/plan/STATUS/items-A.json

| # | DELEGATED DECISION | Choice and way back | Items it governs |
|---|---|---|---|
| A01 | Product name and titles (D-NAME) | Delegated, conservative: change no title or name until the owner approves; keep the optional group selectable. False descriptive words are handled under WP-TIME-16. | D-NAME, WP-UX-29, OWNER-ACTION-11, RM-25 |
| A02 | Landing at / and the app at /map (D-ROOT) | Delegated, conservative: do not move the app (no identity change without a Search Console baseline); build the landing page as an inert candidate; keep manifest id "/". Alternative kept: the S3 move as a later train. | D-ROOT, WP-PERF-27, RM-30 |
| A03 | Labs dispositions (D-SCOPE-TIERS) | Delegated, conservative: retire nothing (a retirement is a scope reduction only the owner may take); keep AR hidden with its notice; schedule the keep-gates of every Labs page (WP-PAGEC-09..17, 24, 25, WP-PAGE-43). Way back: the owner retires a page by a recorded decision. | D-SCOPE-TIERS, WP-A11Y-28, WP-PAGE-43, WP-PAGEC-10, WP-PAGEC-11, WP-PAGEC-13, WP-PAGEC-14, WP-PAGEC-25, WP-PAGEC-35, OWNER-ACTION-09, RM-79, RM-90, RM-91, RM-93 |
| A04 | First-party telemetry (D-TELEMETRY) | Delegated, conservative: ship no telemetry; keep Netlify RUM as the only field source; build the collector only as an inert candidate. Alternative kept: enable it after the owner approves the privacy text and a function deploy path. | D-TELEMETRY, WP-PERF-03, WP-PERF-04, RM-26 |
| A05 | Carry-forward rule sign-off | Delegated, conservative: keep the shipped rule (it removes ghost units, i.e. units drawn before their first record). Way back: drop B-i2 and keep the merge fix. | O-T0-3 |
| A06 | Gold trail | Delegated, conservative for completeness: keep the shipped caption and build AMD-T0-2 as a candidate so the trail returns as a real map line; selectable (group off = today). | O-T0-5 |
| A07 | Keep the precompile part in R0 | Delegated: keep (one guarded call, same pixels; deleting the file restores the older R0). | T0-DEV-22 |
| A08 | Overlay scripts | Delegated, conservative: keep the overlay working as shipped; removal waits for the rebuilt header. | A11Y-OD-03 |
| A09 | Toolbar target size | Delegated: keep 32 px on fine pointers (documented deviation), 44 px on touch. | A11Y-OD-06 |
| A10 | React version | Delegated: React 18.3.1 exact (what the shipped bundle runs); Preact stays a selectable build alias. | ARCH-OD-05 |
| A11 | Look change at cutover | Delegated, conservative: the rebuild keeps the R1g look pixel for pixel until the owner approves a redesign. | ARCH-OD-07 |
| A12 | Deferrals | Delegated, conservative: none may slip (the Walkthrough is protected by owner decision 2026-10-04 item 3). | ARCH-OD-08 |
| A13 | Map-page budget | Delegated, conservative: lower no gate; measure both states on a GPU machine and record them; claim no exception without the record. | PAGE-OD-05 |
| A14 | Casualty wording | Delegated: neutral sourced figures with their labels; no "reviewed" wording. | PAGE-OD-08 |
| A15 | Cinematic Record | Delegated, conservative: keep the feature; move it to the own 1863 base (WP-PAGEC-25) so the rights question disappears. Pausing stays selectable. | PAGEC-OD-03 |
| A16 | Live Sync | Delegated: keep it live; its third parties must be disclosed in the privacy text (owner approval, D-LEGAL). | PAGEC-OD-04 |
| A17 | Visual side effects | Delegated, conservative: ship no performance change that alters the settled picture. | PERF-OD-05 |
| A18 | About threshold | Delegated: keep 20 (no visible difference today); 10 stays a one-number change. | TIME-OD-05 |
| A19 | Night stretches | Delegated, conservative: keep the density (no data change). | TIME-OD-06 |
| A20 | Battle-time control | Delegated: build it as a visible, selectable control; Story playback stays the default. | TIME-OD-08 |
| A21 | Night tint | Delegated: keep the tint and add the toggle (WP-TIME-13). | TIME-OD-09 |
| A22 | Evidence publication | Delegated, conservative: publish ranges, evidence class and source keys only, with low-authority labels; no multi-sentence quotations. | TIME-OD-12 |
| A23 | Intro moment | Delegated: Pickett's Charge, only after a gesture, no clock text unless signed; First Shot stays selectable. | UX-OD-02 |
| A24 | Fonts | Delegated, conservative: no visible font change until the owner sees a comparison; build Spectral as a selectable candidate. | UX-OD-04 |
| A25 | Legend content | Delegated, conservative: keep the shipped legend "What the marks say" and add the disposition colours back as a selectable legend tab in a candidate group, so nothing the published site showed is lost. | PROV-R1D-LEGEND |
| A26 | Engine representation rule | Delegated, conservative: keep the rule unbroken (no slicing). | PROV-R1F-A6 |
| A27 | Roster find | Delegated: keep the virtual list and add a roster filter box as a candidate (restores the lost ability). | PROV-R1G-I2 |
| A28 | Patch the Walkthrough resize defect | Delegated, conservative: do not patch the Walkthrough (owner rule 2026-10-05 item 6); keep the defect reported. Alternative kept: a registered, guarded fix like PERF5-wt-*. | PROV-WG-17 |
| A29 | Home title wording | Delegated: no clock-implying wording in any future title; keep the neutral alternative "The Battle, July 1-3, 1863" selectable. | REG-FLAG-2 |
| A30 | Side colours (O-5) | Delegated, conservative: keep today's side hues and add the non-colour cue (hatch and letter) as the default; the luminance-separated pair stays a selectable high-contrast option. Add the tests. | WP-A11Y-19 |
| A31 | Patch the Walkthrough for accessibility | Delegated, conservative: report the remaining defects (100 identical link names, no h1), do not patch. Alternative kept: registered guarded edits. | WP-A11Y-22 |
| A32 | Whether the trigger is met | Delegated, conservative: not triggered; re-open only if field INP or blocking time is red after the owner deploys. | WP-ARCH-34 |
| A33 | Real viewshed | Delegated: keep in scope after the DEM exists; labelled "terrain only". | WP-PAGE-45 |
| A34 | Relay | Delegated, conservative: keep peer-to-peer Live Sync as shipped; relay stays a candidate. | WP-PAGEC-17, RM-92 |
| A35 | Truthful descriptions outside an SEO train | Delegated, conservative: fix the false words in manifest.json, site-nav.js and page body copy now as a candidate group; hold the meta description of index.html for the S2 train (identity). Add About the clock to Help. | WP-TIME-16 |
| A36 | Epilogue form | Delegated, conservative: no new ticks (ticks 1..675 stay permanent); July 4 items become dated epilogue cards. Alternative kept: ticks 676+. | WP-TIME-23 |
| A37 | On-site mode | Delegated, conservative for scope: keep it in scope and build Near-me and the visit hub on the own 1863 tiles (no Mapbox tile caching); the field test is owner-only. | WP-UX-31, RM-95 |
| A38 | Convergence | Delegated: keep in scope after the rebuild shell. | WP-UX-32 |
| A40 | Plan options | Delegated: stay in scope after the completion items. | RM-94 |

