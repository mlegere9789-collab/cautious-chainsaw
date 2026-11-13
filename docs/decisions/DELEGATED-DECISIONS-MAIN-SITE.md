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


## 2026-11-13, status survey part A, continuation: the owner decisions of chapters 03 to 08b and the ratification nodes; per-item evidence in docs/plan/STATUS/items-A.json

Row A39 was never used. Rows below follow the same rule as above: taken conservatively from the evidence in the repository, reversible, alternative kept selectable, no gate lowered.

| # | DELEGATED DECISION | Choice and way back | Items it governs |
|---|---|---|---|
| A41 | Ratification of the class-B decisions | Delegated, conservative: of the 11 class-B ADRs, D-SCOPE-TIERS (A03) and D-NAME (A01) are decided here; D-TIME and D-CONTACT stand on recorded owner decisions (2026-10-05 item 2, 2026-10-04 item 5); D-SOUND and D-HEATMAP were carried out as the register defaults in group A and are confirmed here (way back: restore the rows removed by A-sound-remove-button and A-heatmap-*-remove); D-CONTINUITY, D-HIST-REVIEW, D-CWSS, D-LICENSE and D-LEGAL need an owner act and are not settled here. The capacity contract is superseded by the instruction to finish everything. | RM-03 |
| A42 | Contingent items | Delegated, conservative: each contingent item follows its own row: the AST split is not triggered (A32), July 4 becomes dated epilogue cards (A36), Labs accessibility is in scope because no page is retired (A03), CWSS rosters wait for written NPS confirmation (D-CWSS, owner act). | RM-98 |
| A43 | Beta banner | Delegated, conservative: no banner on any production page until a rebuilt build has passed the parity gate and been seen; the beta is then opt-in by URL, noindex, with a visible link back to the classic map and neutral copy that says what differs. A flag-controlled banner stays selectable. | ARCH-OD-09 |
| A44 | Carry-forward label | Delegated, conservative: keep "forever" (A05) and keep the glide the owner asked for (decision 2026-10-05 item 5); add one plain sentence to Help and the legend that positions between recorded moments are interpolated, as a candidate group. | ARCH-OD-04 |
| A45 | Time conventions and provisional launch | Delegated, conservative: keep local mean time, day tabs at first light 04:30 and "about" above a 20-minute bound as shipped; keep the provisional launch with the evidence class (Documented, Estimated, Contested); add no reviewed or unreviewed pill (A14 and the owner's DEC-006 for the Theatre point the same way); the pill stays a selectable flag. Signing the anchors is a human act and stays open. | TIME-OD-02, TIME-OD-04 |
| A46 | Triage scope | Delegated, conservative: t8 becomes a context card (no event is deleted); July 4 items become dated epilogue cards (A36). | TIME-OD-07 |
| A47 | Clock wording | Delegated, conservative: approve the ban list ("minute-by-minute", "real time", "five-minute snapshots") and the D-CLOCK sentence; "moment by moment" stays where it is true; applied through WP-TIME-16 (A35). | TIME-OD-11 |
| A48 | Lab performance gaps are carried, not accepted | Delegated, conservative: no lab shortfall is accepted and no exception semantics adopted; every gate stays at its full value; a measured miss is recorded as a gap with its number in docs/perf-exceptions.md, never as a pass; the owner alone may record an exception. The Track A splitter stays an open option. | PERF-OD-01, PERF-OD-02 |
| A49 | Vitals fields and CrUX | Delegated, conservative: draft the event fields and the privacy sentence only as an inert candidate; send nothing. Reading CrUX needs an API key that only the owner can create. | PERF-OD-04 |
| A50 | Entry removal | Delegated, conservative: the intro sweep and the layout chooser stay removed (shipped); the onboarding modal stays until the rebuilt entry exists; no fast-forward returns. | UX-OD-01 |
| A51 | Navigation labels | Delegated, conservative: keep today's navigation; build the five-destination header as a selectable candidate; adopt it only on a real card-sort and tree-test result (owner-only sessions). | UX-OD-03 |
| A52 | Education theme, PDF button, eye toggle | Delegated, conservative: fold the education page into the default theme and move the PDF button into the header More menu as a candidate; the eye toggle stays until the rebuilt header exists. | UX-OD-05 |
| A53 | On-site and AR order | Delegated, conservative: in scope in this order: Visit hub MVP, Near-me on the own 1863 tiles, then the AR heading engine and markers; the field test is owner-only (A37, A03). | UX-OD-08 |
| A54 | Accessibility target and wording | Delegated: accept WCAG 2.2 AA plus the cheap AAA items; the public wording is "partially conforms" until an independent evaluation exists; no A+ claim. | A11Y-OD-01 |
| A55 | Keyboard model and Data View defaults | Delegated: accept the plan defaults: unit cursor on fine pointers, Data View as the screen-reader default on touch, battle-event announcements off until the visitor turns them on. | A11Y-OD-04 |
| A56 | translate="no" scope | Delegated: only canvas labels, unit names and clocks; story text and the Chronicle stay translatable. | A11Y-OD-08 |
| A57 | Unit pages and Students URLs | Delegated, conservative: /report, /regiment and /education keep their URLs (no identity change before the Search Console baseline); build the shared unit view behind them; the one-page and /learn options stay for train S4. | PAGE-OD-01, PAGE-OD-10 |
| A58 | Idle activation flag | Delegated: MAP_IDLE_ACTIVATE is added off and stays off until the boot-contract and engine spikes (WP-DEC-01, WP-DEC-02) report. | PAGE-OD-06 |
| A59 | maxAge | Delegated, conservative: no maxAge; a hollow ring for a unit unseen for 24 moments is built as a selectable candidate, off by default. | PAGE-OD-07 |
| A60 | Aftermath and Students authoring | Delegated, conservative: write both from sourced text only, every claim cited; the student rewrite is not skipped for lack of a reviewer; no "reviewed" wording. | PAGE-OD-09 |
| A61 | Optional page packages | Delegated, conservative: WP-PAGE-28, 33, 37 and 39 stay in scope (leaving them out would be a scope reduction) and are built after the core packages. | PAGE-OD-11 |
| A62 | Embed framing | Delegated, conservative: keep frame-ancestors * on /embed and /embed.html only (as shipped); every other page stays none; oEmbed is built as a candidate; an allow-list stays a one-line change in the header generator. | PAGEC-OD-02 |
| A63 | Casualty model | Delegated, conservative: published totals are shown with their printed source and page; the documented model stays the default curve with sigma = width/6 and linear selectable, and a visible label says the curve between records is modelled; Busey and Martin figures only as facts with attribution after the owner answers the rights question (OWNER-ACTION-10). | PAGEC-OD-08 |
| A64 | Tour links in Classroom mode | Delegated: allowed, fragment only (no query string, no personal data). | PAGEC-OD-10 |
| A65 | Support page | Delegated: build /support (browser support, known problems, how to report; no data collection) as a candidate page for the next page train. | PAGEC-OD-11 |
| A66 | Items that follow an earlier row | A11Y-OD-05 follows A30; A11Y-OD-09, PAGE-OD-03 and PAGEC-OD-01 follow A03 (retire nothing); PAGE-OD-04 follows A33. | A11Y-OD-05, A11Y-OD-09, PAGE-OD-03, PAGE-OD-04, PAGEC-OD-01 |
| A67 | Day-data caching (stage 1 of WP-PERF-09) | Delegated, conservative: keep /data/* at max-age=3600 as shipped; do not add the plan's stage 1 (max-age=300, stale-while-revalidate=86400) because the DATA corrections keep their file names and the plan forbids fixed-name data fixes while stage 1 is on; per-day hashed names arrive with the data pipeline (stage 2). Way back: add one row to the header generator. | WP-PERF-09, RM-18 |
