# Main site: status of the master plan, 2026-11-13

Merged from `items-A.json` (chapters 01 to 08b, 513 items) and `items-B.json` (chapters 09 to 16, 579 items) by `python3 docs/plan/STATUS/merge_status.py`; the work list is `backlog.json` (one entry per open item) and the rules for candidates are in `candidates/r1h/README.md`. Nothing in this file is a claim about the live site: **nothing is deployed** (ops/RELEASE-LOG.md has no deploy row, production still serves deploy 6abd6d62); every SHIPPED item is in the release candidate, train R1g (release id 52cec836), only.

## Where it stands

| Status | Items | Meaning |
|---|---:|---|
| SHIPPED | 186 | Present in the release candidate, train R1g (and the trains named), with the patch group and the test that prove it. No train has been deployed: ops/RELEASE-LOG.md has no row and production still serves deploy 6abd6d62. |
| BUILT_NOT_SHIPPED | 73 | Exists in src/, historian-src/, data-src/, candidates/ or as an opt-in patch group, but is in no train; the evidence says what is missing. |
| OPEN_BUILDABLE | 446 | Not built, or built in part; the remaining work can be done in this container. |
| OPEN_NEEDS_DECISION | 186 | Waits for a decision that the owner delegated on 2026-11-11; next_step carries the conservative proposal and the alternative that stays selectable. |
| OWNER_ONLY | 175 | Needs a legal act, an account, a key, a DNS change, a payment, a deployment, real hardware or a third party; owner_step is the exact step. |
| SUPERSEDED | 26 | Overtaken by a later owner decision or standing constraint. |
| **Total** | **1092** | A 513 + B 579 |

Items overlap (a roadmap node, its work packages and an ADR can name the same work), so the counts are items, not days of work; the de-duplicated effort is in `docs/plan/FINAL/15-roadmap.json` (729 to 1,236 AI-assisted person-days for the whole programme, P50 982).

Ground facts (from the two surveys; run results quoted there are in their `ground_facts`):

- Nothing is deployed: ops/RELEASE-LOG.md has no deploy row; every item marked SHIPPED is in the candidate zip only (deliver/gettysburg-R1g-52cec836-PRODUCTION.zip), and deployment is an owner act.
- Acceptance: 0 of 8 consecutive clean passes on R1g (docs/accept/R1G-STATUS.md); the best streak on R1f was 1.
- The zips packed in this container carry a stand-in 1863 tile pyramid (96 of 1,885 files equal the original); the final zip must be packed where the original pyramid is.
- Source rebuild: src/ holds the time module only (10 files); there is no rebuilt app, no parity harness, no site generator. data-src/ (63 files) and historian-src/ (299 files) are built and tested but served by no train.
- Run by this survey on 2026-11-13, long suites through the machine lock: T0-J7 on R1g and on frozen R1f (red on both, tmp/r1h-cand/statusA/j7.log); node --test tests/time/*.test.mjs: 638 tests, 638 pass, 0 fail; npm run time:check: exit 0; node --test tests/data/*.test.mjs: 207 tests, 206 pass, 0 fail, 1 skipped; npm run data:check: exit 0. Run directly (under 5 s CPU, no browser): node tools/environment/validate.mjs and node tools/ledger/validate.mjs: 0 errors, 0 warnings each; HDR-11 alone (see VER-HDR-11). node --test tests/historian/*.test.mjs: under the default node of this container (22.23.4) every file fails to load, because tools/historian/ingest/times.mjs uses a regular-expression modifier group (?-i:...) that needs V8 12.5 or later (it is a build-time tool, not shipped to browsers). Under /opt/node24/bin/node (24.22.1) tests/historian/atime.test.mjs alone passes 23 of 23 (run directly, 8 s CPU, log tmp/r1h-cand/statusA/historian-atime-node24.log). The full suite under Node 24 was queued through the machine lock at 19:31 UTC on 2026-11-13 and had not started when this file was written: no result is claimed for the other files. Its log will be tmp/r1h-cand/statusA/historian-test3.log (summary hist-summary.log).
- Not run by this survey: any other browser suite, the eight acceptance passes, Lighthouse (no runner in the repository), any real device. The default node of this container is 22.23.4; /opt/node24/bin/node is 24.22.1.
- Run by this workstream on 2026-11-13: node tools/data/manifest.mjs verify (71 of 71 files, 0 changed); node tools/data/emit_legacy.mjs --verify (0 patch files, 0 changed); node tools/data/validate.mjs --data-dir release/R1g/dist/data --no-site (exit 1: the ratchet baseline describes the legacy tree; R001 10 found against 102, R002 0 against 10, R003 44 and R004 36 unchanged, X001 915 against 1,724, D001 1 and D002 70 new); node ops/legal-drafts/verify-facts.mjs on a scratch build of R1g with PG-legal (no FAIL, 0 WARN); node --test tests/historian/atime.test.mjs under Node v22.23.4 (SyntaxError at tools/historian/ingest/times.mjs:26); curl to epqs.nationalmap.gov (HTTP 000: blocked, not worked around).
- Recorded earlier the same day by the interrupted run of this workstream in this container (tmp/r1h-cand/status-B/runs.json): tests/t0/headers.spec.mjs --no-browser on R1g (13 pass, 4 skipped, 1 failed: HDR-11, the stand-in tile folder); tests/t0/seo.spec.mjs 17 of 17; tests/data 207 tests, 206 pass; tests/time 638 of 638; tests/copy 17 failures (stale anchor-state assertions); tests/historian under Node 24: 474 tests, 387 pass, 0 fail, 87 skipped.
- Not run by this survey: any browser suite, Lighthouse (no runner in the repository), any real device or assistive technology, the eight acceptance passes, any live-site check, Firefox or WebKit.

## By chapter

| Chapter | Title | SHIPPED | BUILT_NOT_SHIPPED | OPEN_BUILDABLE | OPEN_NEEDS_DECISION | OWNER_ONLY | SUPERSEDED | Total | Open for building or decision |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 01 | Decision Register (34 ADRs) for gettysburginteractivemap.com | 10 | 2 | 19 | 8 | 32 | 6 | 77 | 29 |
| 02 | Tranche 0: the scripted hotfix runbook (no rebuild) | 31 | 0 | 8 | 4 | 11 | 2 | 56 | 12 |
| 03 | Source of Truth and Strangler Rebuild (WP-ARCH) | 3 | 2 | 42 | 7 | 3 | 2 | 59 | 51 |
| 04 | Time model and historical accuracy: the clock and history programme | 12 | 3 | 17 | 11 | 4 | 0 | 47 | 31 |
| 05 | Performance to Green (WP-PERF-01 .. 28) | 6 | 0 | 25 | 9 | 3 | 0 | 43 | 34 |
| 06 | UX, UI, Mobile and Desktop Fit-and-Finish (WP-UX-01 .. WP-UX-34) | 6 | 0 | 32 | 14 | 7 | 0 | 59 | 46 |
| 07 | Accessibility (WCAG 2.2 AA everywhere, AAA where cheap), desktop and mobile | 4 | 4 | 25 | 11 | 4 | 1 | 49 | 40 |
| 08a | Static sub-pages A/B: Dashboard, Search, Report, Regiment, Compare, Camera, Documentary, Students, Aftermath, Sandbox, High Ground, Ground Remembers, and the shared site-nav layer | 8 | 3 | 40 | 13 | 3 | 2 | 69 | 56 |
| 08b | Static sub-pages C: Historian UI, Labs pages, Turning Points, Find Ancestor, Living Ledger, policy and utility pages | 7 | 2 | 20 | 19 | 5 | 1 | 54 | 41 |
| 09 | Infrastructure, Security, Privacy, PWA and Operations (WP-INFRA-01..34) | 12 | 1 | 25 | 9 | 22 | 3 | 72 | 35 |
| 10 | SEO, Discovery and Growth (WP-SEO-NN) | 8 | 2 | 18 | 19 | 11 | 3 | 61 | 39 |
| 11 | Copy, Documentation and Content (WP-CONTENT-01..27) | 8 | 12 | 23 | 9 | 3 | 0 | 55 | 44 |
| 12 | Quality System and Release Engineering: keeping A+ at A+ (WP-QA-01 .. WP-QA-25) | 16 | 3 | 20 | 5 | 7 | 0 | 51 | 28 |
| 13 | Data quality, provenance and rights (WP-DATA-01..24) | 4 | 15 | 35 | 7 | 5 | 1 | 67 | 57 |
| 14 | Ask the Historian: The Database Expansion Plan | 1 | 21 | 16 | 17 | 11 | 0 | 66 | 54 |
| 15 | Integrated roadmap: one WBS, one critical path, honest calendars | 0 | 0 | 9 | 13 | 25 | 4 | 51 | 22 |
| 16 | Audit corrections and new findings (annex) | 50 | 3 | 72 | 11 | 19 | 1 | 156 | 86 |
| **All** | | **186** | **73** | **446** | **186** | **175** | **26** | **1092** | **705** |

Chapters 08a and 08b are the two halves of the sub-page chapter (08a Tier-1 pages and shared page work, 08b Tier-2 and Labs pages).

## The backlog (`backlog.json`)

705 entries, one per open item. 432 are build entries (a candidate patch group, source-rebuild work or a request to the release workstream); 99 are decision records (the delegated row exists, the consequence is carried by other entries); 174 are umbrellas that close with their children. Done now: 99 (none of the build entries: candidates/r1h/ holds no finished candidate yet).

| Route | Entries | Open |
|---|---:|---:|
| candidate patch group (candidates/r1h/<id>/) | 260 | 260 |
| source-rebuild (src/, historian-src/, data-src/) | 166 | 166 |
| request to the release workstream | 6 | 6 |
| closes with its children | 174 | 174 |
| decision record | 99 | 0 |

Open build entries by size: S 117, M 193, L 122 (an L entry must be sliced to M or smaller before it is dispatched; `split_hint` quotes the plan's own steps).

### Wave 1: the first dispatch batch (30 entries)

Authored against the repository; pairwise independent (disjoint write sets, no dependency between them; the few shared files are changed by small edits only and named in `shared_files`).

| # | Id | Route | Size | Why it is first | Check (short) |
|---:|---|---|---|---|---|
| 1 | `ver-hist-node` | source-rebuild | S | Unblocks every historian verification under the default node of the container; all later historian items are checked with it. | Red: under default node 22.23.4 tests/historian files fail to load (times.mjs modifier group). Done: no modifier group, same readings (new pinned test); the full tests/historian run under node 22 equals the node 24 totals; atime 23/23 on both; no test loosened. |
| 2 | `wp-arch-09` | source-rebuild | M | Foundation of the whole rebuild chain (WP-ARCH-10..33): until a workspace, layout and config module exist, nothing else of the rebuild can start. | Rebuild foundation under src/: layout mapping (packages->src/lib, apps/web->src/app, tests beside code), src/STACK.md with register choices and "not decided" rows, one Mapbox token config module with test, strict tsconfig base, src/package.json; root package.json by request note. |
| 3 | `wp-infra-28b` | candidate-group | S | Closes the last open security items of Live Sync (guessable room codes, unbounded host connections, unvalidated guest messages). | Group on watch-together.html with a node:vm test: 6-char codes from crypto.getRandomValues (28-char alphabet, no Math.random), host closes connections 21+, guest accepts only {goto, tick int 1..675, note<=280}; 20 fuzz payloads rejected. Red on R1g, green with the group. |
| 4 | `wp-content-09b` | candidate-group | S | Removes the claims the site cannot back ("minute by minute", "real time", "tick") from pages a visitor reads; rule A47 and A35. | Group removing "minute by minute", "real time" and "tick" wording from living-ledger, site-nav.js, index (non-meta), immersive, watch-together; copy_lint REALTIME,TICK = 0 on touched files (R1g: 12 and 9); names and meta of index untouched. |
| 5 | `wp-time-05` | source-rebuild | M | Permanent moment ids are irreversible once shipped; six hand-kept moment lists disagree today. | tools/time/build-moments.mjs builds data-src/time/moments.v1.json (permanent ids; v0 ids unchanged; every moment_refs reference placed or listed unplaced) and tick-migrations.json; TM-V5/V19/V20 pass; shuffled input gives same ids; deleting a hand-kept list breaks the build. |
| 6 | `wp-infra-23b` | candidate-group | S | The installed-app manifest still carries three retired claims; adds lang, a tagged start URL and shortcuts. | Group on manifest.json: description equals the home meta description (no "real time", "five-minute", "467"), lang en-US, start_url /?source=pwa, three shortcuts that resolve; id, name, short_name, icons unchanged; copy_lint 0. Red on R1g, green with group. |
| 7 | `wp-hist-01b` | candidate-group | S | The shipped Ask the Historian page is the only front door of the Historian: unlabelled 15 px input, no live region, no retry, persona wording. | Group on historian.html: 16 px labelled input, polite live region, inline Retry on a failed load (node:vm test with a rejecting fetch), persona wording replaced; copy_lint AIPERSONA = 0 on the file (R1g: 2). Head tags untouched. Red on R1g, green with group. |
| 8 | `wp-data-23a` | source-rebuild | S | No claim of "Reviewed" is checkable today: no decisions file, no rule H001, no coverage figure. | Create empty data-src/review/decisions.jsonl with schema; rule H001 (no "Reviewed"/"accurate to the minute" without a signed decision; seeded red, green with a row); coverage report 0% stated; validator baseline not loosened; data:check and tests/data stay green. |
| 9 | `wp-pagec-30` | candidate-group | S | The 404 page is a dead end today (no navigation, no landmark, no search). | Group on 404.html: skip link, nav with resolving links, <main id=main>, labelled search form whose parameter search.html reads, noindex and title/h1 unchanged, 44 px rules kept, copy_lint 0. Red on R1g (no nav, main, form), green with group. |
| 10 | `audit-h5` | candidate-group | S | A visible defect on the main map: the Follow Ancestor list sorts designations as text ("102nd" before "10th"). | Bundle group R1H-audit-h5: one asserted-once patch makes the Follow Ancestor list sort numerically ("10th" before "102nd"); test sorts 12 real designations (red on R1g, green with group) and proves no other bundle byte changed. Walkthrough guard run is for the full build. |
| 11 | `wp-pagec-24` | candidate-group | S | Cinematic Export promises a "narrated flyover video" it cannot produce (no audio) and calls MediaRecorder without checking it exists. | Group on cinematic-export.html: no "narrated flyover" claim (description = og:description), MediaRecorder existence and mime check with a role=alert message and disabled Record (node:vm test), TICK words replaced, copy_lint 0. Red on R1g, green with group. |
| 12 | `wp-pagec-33` | candidate-group | S | The embed widget is iframed on other sites: no h1, three data fetches for one vignette. | Group on embed.html: headline is the single h1, one vignettes part fetched per view (3 on R1g; fallback only when the id is missing), loading role=status, error role=alert, CTA unchanged; node:vm test counts fetches. Payload vs the 15 KB limit reported, not claimed. |
| 13 | `wp-seo-04b` | candidate-group | S | Share previews and crawlers see a different description than the page says on 10 of 21 pages; no og:site_name anywhere; privacy and terms have no cards. | Generator + group: on the 23 described pages add og:site_name, og:locale, og:type/title/url/image, twitter:card (also privacy, terms) and make og:description equal the meta description (10 differ on R1g). No canonical/title/description change. Test walks every page; red on R1g. |
| 14 | `wp-page-18` | candidate-group | S | The Casualty Dashboard chart has no text alternative and no loading or error state; it is the page every figure of the site points at. | Group on dashboard.html: a <details><table> alternative with caption and scoped headers whose totals equal the chart's, loading role=status and error role=alert with Retry (node:vm tests), existing chart markers kept. Red on R1g, green with group; re-layout not claimed. |
| 15 | `wp-time-06` | candidate-group | S | The shipped data schema still states "430,000+" records and 600-700 units per tick; chronology still carries a typed tick formula. | relabel-data.mjs --group-out writes a data patch group against R1g: placement_schema.json loses "430,000+" and "600-700" and gets the model's day spans; chronology tick_formula becomes a pointer; no chronology time changes; TM-V3/V4/V13 clean; tests/time stay 638/638. |
| 16 | `wp-data-05b` | candidate-group | S | Shipped data still carries authoring notes and one string naming a video channel; derived strengths carry no basis. | Data group on R1g: authoring keys flag, flag_notes, data_correction, supplements_file (4/60/1/11 today) and the one video-channel string removed, all else equal in parsed form; facts-only basis only where data-src/authorities says so; exclusions file, seeded-leak test. |
| 17 | `wp-infra-21b` | candidate-group | S | No security.txt is published; a reporter has no documented way to reach the owner about a vulnerability. | Overlay well-known/security.txt (RFC 9116: Contact = the drafted security@ role address, Expires 60..366 days ahead, Canonical, Preferred-Languages); test fails under 60 days; HANDOFF gates registration on the owner making the alias work; request note for rewrite and text/plain. |
| 18 | `wp-data-16` | source-rebuild | M | The 16 tour stops, tutorial steps and 20 timeline markers live as literals in the bundle with wrong ticks; moving them into data is the prerequisite for the rebuild to read them. | tools/data/embedded.mjs extracts 16 tour stops, tutorial steps and timeline markers from the R1g bundle into data-src/embedded/*.json with a schema; marker ticks come from moments.json (unmatched listed, tick 17 "First shot" kept as a conflict); --check byte-exact; nothing shipped. |
| 19 | `wp-data-15a` | source-rebuild | M | 512 monuments exist only inside the bundle with no sources; one dataset with separated provenance is the base for every monuments claim (the Monuments section itself is untouched). | tools/data/monuments_extract.mjs writes data-src/monuments/monuments.json (512 rows, id_src and coord_src separate, coord_basis unverified unless cited, rev none) and a cleaning list as data; M001 passes, L001 rows kept; bundle and shipped monuments untouched. |
| 20 | `wp-data-14a` | source-rebuild | M | The 49 off-map approach rows and the stacked units break geometry rules; place coordinates disagree by up to 2.1 km between six lists. | tools/data/geo_build.mjs writes data-src/geo/map_extent.json (east edge ~-77.15, off-map rows listed by id) and places.json merging the six place lists with per-place spread and chosen:null until a reviewer confirms; G004 pairs proposed, shipped data untouched; --check byte-exact. |
| 21 | `wp-data-08d` | source-rebuild | M | The Ledger and Dashboard totals cannot be reconciled per minute: no per-tick casualty series exists, rule N008 is deferred. | tools/data/casualty_timeline.mjs spreads each unit's casualties over its combat ticks by one declared rule (largest remainder), labelled modelled; per-unit and grand totals equal the declared totals exactly; N008 activated and passing; --check byte-exact; no conflicting figure picked. |
| 22 | `wp-time-18` | source-rebuild | M | Per-minute intensity is the number every "how fierce" claim and Ledger curve should come from; today there is none. | src/lib/time/intensity.js: pure per-battle-minute intensity/rate over a window, typed; test on real data: Pickett's Charge >= 10x Culp's Hill, additive over adjacent windows, zero-length throws, Ledger total = Dashboard total; tests/time stay green. No number invented. |
| 23 | `wp-arch-06` | source-rebuild | M | A golden frame set from the reference rule is the parity anchor for the rebuilt unit engine (WP-ARCH-14) and the renderer. | src/spec/golden: goldens for 675 ticks from R1g data by the shipped rules (ANIM engine read-only), content-hashed, --check byte-exact; test: tick 1 has 71 units, seeded random walks equal cold computation, fingerprint cross-check, mutation flips the expected tests, under 30 s. |
| 24 | `wp-hist-36` | source-rebuild | S | Nothing re-checks the Historian corpus or its source links after the build; a silent change would go unseen. | tools/historian/ops: corpus-integrity (sha256 of the 3 Official Records items vs the manifest, flipped-byte red) and monthly-links (dry-run list; --run at most 1 req/s/host, never retries blocked hosts, appends a dated JSON log line); tests use a local server only. |
| 25 | `wp-data-04a` | source-rebuild | S | The rights audit describes legacy/dist, not the data that ships (R1g); counsel and owner must judge what visitors get. | rights_audit.mjs --data-dir/--csv/--md: audit the data that R1g ships (row per data file and bundle dataset, closed action set, diff against the legacy audit listed, nothing applied); defaults unchanged so data:check still reproduces the old outputs byte for byte. |
| 26 | `wp-dec-12` | candidate-group | S | No documented browser floor, no syntax gate: nothing stops a build from shipping syntax an older supported browser cannot parse. | Candidate docs/BROWSERS.md, browserslist, tools/es-check.mjs (acorn over every dist .js, seeded newer syntax = red) and a WebGL2 gate stub; floor numbers from the register only; passes on release/R1g/dist assets; nothing ships. |
| 27 | `wp-content-01b` | candidate-group | S | The home page and the nav still describe the Historian as a "search-and-answer assistant"; one data row carries database wording; two gaps are phrased as facts about the past. | Group removing "search-and-answer assistant" (index.html, site-nav.js), the alias stub's database wording (alias_for kept) and two absence-as-fact strings; copy_lint AIPERSONA,ALIAS,ABSENCE = 0 on touched files (R1g: 4/1/2); historian.html left to wp-hist-01b; no title or meta change. |
| 28 | `wp-time-08` | candidate-group | S | Two quotations in the chronology (t525, t530) have no matched primary wording; Law 4 forbids shipping a quote that cannot be matched. | Research + data patch: find the primary wording for the t525/t530 quotations in local OR27/ws9 (verbatim, confirmed by or27_find --verify) or record the lookup as failed and remove the quote marks; evidence.json lists every search; only those two rows change. |
| 29 | `wp-hist-22` | source-rebuild | M | Unit pages, Ask the Historian and the SEO pages all need one export of what the corpus says per unit, with citations and rights fields. | historian-src/export/units.mjs: one units/<slug>.json per unit with <=3 excerpts of <=120 words, each verbatim from a cited corpus page with citation, scan address, licence id, reviewer null; no file for the alias stub; deterministic; schema, verbatim and tier checks in the test. |
| 30 | `wp-pagec-12` | candidate-group | S | The hidden AR page asks for the camera before motion permission and leaves the camera and position watch running after a failure. | Group on ar.html with a node:vm test and fake media/orientation/geolocation: motion permission requested first; after any denial no live track and clearWatch called; Exit stops both; distinct role=alert message per error code; page stays noindex and hidden. Red on R1g. |

## Delegated decisions

`docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md` holds 88 rows (A: 68, B: 20, C: 0). Every OPEN_NEEDS_DECISION item of both files is governed by at least one row (checked by the merge); the C rows record the decisions this merge itself needed (route, layout, closing rules). An override by the owner in writing replaces any row.

## OWNER_ONLY: every step only the owner can take

175 items need a legal act, an account, a key, a DNS change, a payment, a deployment, real hardware or a third party. The step is quoted from the item; nothing here is done by Claude. Items under a roadmap node are listed with it.

### Chapter 01: Decision Register (34 ADRs) for gettysburginteractivemap.com (32)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `D-ORDER` | Hard chain: archive, then R0 mechanism, then everything else | S | Publish the accepted production zip on Netlify (drag-and-drop) and log the deploy id. |
| `D-CONTINUITY` | Backups, delegate, vendor triggers, operations ceiling | M | Name a delegate; add a second remote; keep credentials in a password manager; run the restore drill once. |
| `D-EVIDENCE` | How an A+ claim is earned (non-author artefacts) | L | Commission an independent accessibility evaluation and run the real-device checks (iPhone SE, mid-range Android, Chromebook). |
| `D-UNIT-RENDER` | Owned canvas renderer; symbol layers only if the device gate fails | S | Run the playback benchmark on a real mid-range Android phone and report the frame rate. |
| `D-NETLIFY-DOMAIN` | Duplicate netlify.app host and stale deploys | S | Netlify: Domain management, set gettysburginteractivemap.com as primary; Deploys, delete all but the two last known-good. |
| `D-HIST-REVIEW` | Named historical reviewer and editorial standard | S | Name the reviewer and second reader; send the charter. |
| `D-CWSS` | Ancestor lookup: link-out only until NPS confirms | S | Send the drafted permission email to the NPS Civil War Soldiers and Sailors contact. |
| `D-LICENSE` | Content and data licence, crawler policy | S | Answer Action 10 (provenance of positions and texts) and choose the data licence. |
| `D-VIEWSHED` | Rename "What They Could See" to High Ground; correct elevations | M | Copy the 3DEP DEM raster that the 1863 base-map build used (fetched by docs/basemap1863/modern/scripts/fetch/fetch_dem.py) from the Windows machine into tmp/b1863/dem/ of this working tree, or allow the host elevation.nationalmap.gov for this environment, and say which file it is. |
| `D-LEGAL` | Interim privacy and terms; counsel later | S | Read and approve the interim privacy and terms text (legal act). |
| `WP-DEC-03` | Unit-render benchmark on a real Android | S | Open the staging build on a mid-range Android phone, play at 8x for one minute, report smoothness. |
| `WP-DEC-05` | Netlify routing spike on a deploy preview | S | Create the staging site and upload deliver/gettysburg-R1g-52cec836-STAGING-noindex.zip (or its successor). |
| `WP-DEC-07` | Interim privacy correction and data inventory | S | Approve the interim text. |
| `WP-DEC-08` | Legal and rights pack with counsel | M | One-time attorney review of the merged privacy and terms drafts. |
| `WP-DEC-10` | Reviewer recruitment, charter, second reader | S | Name and invite the reviewer. |
| `WP-DEC-11` | Time-anchor review packet | S | Give the packet to the named reviewer. |
| `WP-DEC-13` | Continuity pack | M | Delegate, second remote, restore drill. |
| `WP-DEC-15` | Key hygiene (Mapbox scopes, Google key, one config module) | S | Mapbox: confirm the URL allow-list and scopes, create dev and preview tokens; Google Cloud: restrict the Maps Embed key by referrer. |
| `WP-DEC-16` | Verification-debt burn-down with devices | M | Run Part B (real mouse) and Part C (phones) of tests/t0/journeys-manual.md on the staging site. |
| `OWNER-ACTION-01` | Archive every zip; record hashes; contain secrets | S | Copy the gettysburg zips from Downloads to an external disk and one encrypted cloud folder. |
| `OWNER-ACTION-02` | Verify Search Console and Bing by DNS TXT | S | Netlify DNS: add the Google and Bing TXT records; export the first baseline. |
| `OWNER-ACTION-03` | Mapbox token review | S | Mapbox account: screenshot the token URL list and scopes; enable usage notifications. |
| `OWNER-ACTION-04` | Google Cloud key restriction | S | Google Cloud: restrict the Maps Embed key to the site referrers and the Embed API; add a budget alert. |
| `OWNER-ACTION-05` | Netlify plan and credits | S | Netlify: record plan, credit balance, set the 70 percent alert. |
| `OWNER-ACTION-06` | Accounts, recovery, domain renewal, TLS | S | Passkeys or 2FA on every account; renew the domain multi-year; name a delegate. |
| `OWNER-ACTION-08` | Name a reviewer; send the three permission emails | S | Send the three drafted permission emails (NPS CWSS, Gettysburg NMP Research Center, ACHS). |
| `OWNER-ACTION-10` | Answer the rights questions | S | Answer in writing: did any position or text come from the paid app or the YouTube channel; is the non-affiliation sentence true; any registered mark. |
| `OWNER-ACTION-12` | Two real-hardware checks | S | Drag and scroll-zoom the live map with a real mouse; block /.netlify/scripts/rum in the test profile. |
| `RM-01` | Owner console, accounts, keys, archive and capacity statement | M | See OWNER-ACTION-01..12. |
| `RM-04` | Reviewer and second-reader recruitment, charter, permission emails, provenance answers | S | Name the reviewer; send the three permission emails. |
| `RM-19` | Interim privacy correction and data-flow inventory | S | Approve the interim privacy text. |
| `RM-29` | Continuity and vendor register: backups, second remote, delegate letter, vendor triggers, lite snapshot | M | Delegate, second remote, restore drill. |

### Chapter 02: Tranche 0: the scripted hotfix runbook (no rebuild) (11)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-T0-01` | Archive, baseline of record, secrets containment | S | Copy the zips to cold storage (external disk and one encrypted cloud copy). |
| `WP-T0-02` | Repository, publish isolation, staging site, rollback rehearsal | S | Create a free second Netlify site, upload the STAGING zip, practise a rollback once. |
| `WP-T0-17` | Owner account and console actions | S | Work through ops/owner-console-actions.md. |
| `WP-T0-19` | Release, monitoring and rollback runbook | S | Dry-run the runbook on the staging site; run the probe after each deploy. |
| `O-T0-9` | Devices: iPhone SE, Android, Samsung Internet checks | S | Run Part C on an iPhone SE, a mid-range Android and Samsung Internet against staging. |
| `T0-DEV-14` | Deviation: layout threshold 834 px instead of 820 px | S | Try an iPad mini in portrait on staging and say whether the phone shell is wanted there. |
| `PROV-WAIVERS-B` | Basis-B regression waivers need the owner yes | S | Say yes or no to the documented visible changes against the published build. |
| `VER-HDR-11` | HDR-11 (fixed-name files never immutable) red in the container | S | Pack the final deploy zip on the machine that holds the original tile pyramid (see VER-TILES), then run node tests/t0/headers.spec.mjs --dist <that dist> there. |
| `VER-R1G-ACCEPT` | Eight consecutive clean acceptance passes on the candidate | L | Leave the Windows acceptance machine free and run node tools/accept/run_eight.mjs on the packed final zip (with the owner's tile pyramid); send docs/accept/EIGHT-PASS-LOG.md. |
| `VER-TILES` | Tile pyramid in zips packed in the container is a stand-in | S | Pack the deploy zip on the machine that holds the original tile pyramid. |
| `RM-21` | Release pipeline: production fast-forward, rollback drill, versioning, Netlify environments, runbooks | S | Deploy to staging, rehearse rollback, then production. |

### Chapter 03: Source of Truth and Strangler Rebuild (WP-ARCH) (3)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-ARCH-01` | Archive, lineage manifest, bundle identity record | S | Run the zip scan on the PC that holds the zips, or copy them to cold storage and point the tool at it. |
| `ARCH-OD-03` | Owner decision: GitHub plan: Pro, public after a secret scan, or a workflow guard | S | On GitHub open Settings > General and read the repository visibility. Choose one: keep it private on the free plan with a workflow guard (no cost); upgrade to GitHub Pro for protected branches on a private repository (a payment); or make it public after a secret scan (a publication). Tell the session which. |
| `ARCH-OD-06` | Owner decision: real hardware: mid-range Android, iPhone SE, 4 GB Chromebook | S | Run Part B (real mouse) and Part C (phones) of tests/t0/journeys-manual.md and the 8x playback check on an iPhone SE, a mid-range Android phone and a 4 GB Chromebook, and send the results. |

### Chapter 04: Time model and historical accuracy: the clock and history programme (4)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-TIME-04` | Review programme: charter, queue, states, public surfaces | S | Name the reviewer and second reader. |
| `RM-42` | Reviewer programme: queue, review states, public surfaces, review packets, decisions.jsonl | S | Name the reviewer. |
| `TIME-OD-01` | Owner decision: name the reviewer and second reader; weekly hours | S | Name a historical reviewer and a second reader and agree the hours (the charter proposes 5 to 6 hours a week for 8 to 10 weeks, then 3 to 4). |
| `TIME-OD-02` | Owner decision: sign the three design anchors (t100, t226, t675) and the time conventions | S | A named historian signs the three design anchors and the conventions, or the owner says in writing that they stand as unsigned design choices. |

### Chapter 05: Performance to Green (WP-PERF-01 .. 28) (3)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `PROV-R1G-Z4` | Self-hosting mapbox-gl.js and its stylesheet | S | Ask Mapbox whether the GL JS files may be served from the site origin. |
| `WP-PERF-17` | INP harness and real devices | S | Run the input matrix on a Moto G Power-class Android, an iPhone SE and a 4 GB Chromebook. |
| `PERF-OD-03` | Owner decision: provide a Moto G Power-class Android, an iPhone SE and a 4 GB Chromebook | S | Provide the three devices and run the 8x playback check and the first-tap input check (tools/accept/checks/c4_input.mjs scenarios) on each; send the numbers. |

### Chapter 06: UX, UI, Mobile and Desktop Fit-and-Finish (WP-UX-01 .. WP-UX-34) (7)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `PROV-R1D-ATTRIB` | No Mapbox attribution text on the 1863 base (only glyphs come from Mapbox) | S | Read the Mapbox terms on attribution when only glyphs are used, or ask Mapbox. |
| `VER-LAYOUT-TIMING` | Layout-contract and timing suites red on R1g in the container | M | Leave the Windows machine free for the regression run, or run node tools/t0/run_suites.mjs --r1-dist release/R1g/dist there. |
| `WP-UX-33` | Measurement and research | M | Recruit participants for the card sort, tree test and the moderated rounds. |
| `UX-OD-09` | Owner decision: confirm the non-affiliation sentence is true | S | Confirm in writing that the site is not affiliated with the NPS, the American Battlefield Trust or any publisher. |
| `RM-71` | UX research programme (card sort, tree test, usability rounds) and UX governance | M | Recruit participants. |
| `UX-OD-07` | Owner decision: classroom pilot teachers (two or three) and the sensitivity stance | S | Name two or three pilot teachers and say whether the content note stays on by default. |
| `UX-OD-10` | Owner decision: test devices and participant incentives including one paid assistive-technology session per round | S | Supply the test devices, set the participant incentive and the budget for one paid assistive-technology session per research round. |

### Chapter 07: Accessibility (WCAG 2.2 AA everywhere, AAA where cheap), desktop and mobile (4)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-A11Y-30` | Manual assistive-technology programme | L | Run the 22 tasks with NVDA, JAWS, VoiceOver and TalkBack, or commission them. |
| `WP-A11Y-32` | Independent evaluation, user sessions, dossier | M | Commission an independent WCAG 2.2 AA evaluation and two or three assistive-technology user sessions. |
| `RM-89` | Proof: manual AT programme, independent accessibility evaluation, real-device runs, user sessions, dossier | L | Manual assistive-technology rounds, independent evaluation, real devices, user sessions. |
| `A11Y-OD-02` | Owner decision: budget for the independent evaluation and two or three paid assistive-technology sessions | S | Commission an independent accessibility evaluation and two or three paid assistive-technology sessions, or recruit volunteers and say which route. |

### Chapter 08a: Static sub-pages A/B: Dashboard, Search, Report, Regiment, Compare, Camera, Documentary, Students, Aftermath, Sandbox, High Ground, Ground Remembers, and the shared site-nav layer (3)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-PAGE-15` | USGS 3DEP DEM and hillshade build; coordinate QA | M | Copy the 3DEP DEM raster that the 1863 base-map build used (fetched by docs/basemap1863/modern/scripts/fetch/fetch_dem.py) from the Windows machine into tmp/b1863/dem/ of this working tree, or allow the host elevation.nationalmap.gov for this environment, and say which file it is. |
| `WP-PAGE-17` | Casualty data reconciliation and sign-off | S | Name the reviewer who signs the casualty figures. |
| `WP-PAGE-44` | High Ground: rename and corrected elevations | M | Copy the 3DEP DEM raster that the 1863 base-map build used (fetched by docs/basemap1863/modern/scripts/fetch/fetch_dem.py) from the Windows machine into tmp/b1863/dem/ of this working tree, or allow the host elevation.nationalmap.gov for this environment, and say which file it is. |

### Chapter 08b: Static sub-pages C: Historian UI, Labs pages, Turning Points, Find Ancestor, Living Ledger, policy and utility pages (5)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-PAGEC-29` | Privacy and Terms: shell, sitemap, conformity | S | Approve the interim text. |
| `RM-36` | Legal pack: merged Privacy and Terms, counsel packet, data controls, Privacy-and-data panel wiring | M | Attorney review. |
| `PAGEC-OD-06` | Owner decision: Turning Points: a historian signs the nine anchors; reviewer and second reader; fallback badge | S | Name the historical reviewer and second reader (the same people as TIME-OD-01). |
| `PAGEC-OD-07` | Owner decision: Find Ancestor stays link-out only; send the NPS Civil War Soldiers and Sailors email now; rename at S2 | S | Send the drafted permission email to the NPS Civil War Soldiers and Sailors System contact. |
| `PAGEC-OD-12` | Owner decision: is Netlify Web Analytics enabled (the privacy text must say so) | S | In Netlify open the site, then Analytics and RUM settings, and say whether Web Analytics and RUM are enabled. |

### Chapter 09: Infrastructure, Security, Privacy, PWA and Operations (WP-INFRA-01..34) (22)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-INFRA-01` | Accounts, recovery, domain hardening (owner-executed) | M | In ops/owner-console-actions.md Action 6: turn on passkeys or TOTP with offline recovery codes for the mailbox, Netlify, Name.com, Mapbox, Google Cloud, GitHub, Search Console and Bing; move account recovery to a private mailbox that is never published; set Name.com auto-renew and renew the domain to 2031-06-13 or later; confirm the TLS certificate renewed; name a delegate with emergency access; tick the box and write the date. |
| `WP-INFRA-02` | Netlify plan, credits, deploy discipline | S | Netlify > Team > Billing: write the plan name, the credit balance and the number of production deploys this month into ops/owner-console-actions.md Action 5; set a usage alert at 70 percent; after every production deploy, rollback or kill-switch deploy add one row to ops/RELEASE-LOG.md the same day. |
| `WP-INFRA-20` | DNS records, search-console verification, CAA, HSTS preload | S | Netlify DNS: add the Google Search Console TXT record for a Domain property and verify; import the site into Bing Webmaster Tools; after the certificate has renewed add the account-bound CAA record described in ops/legal-drafts/contact-architecture.md section 6 and force one renewal; submit the domain to hstspreload.org only after the URL form is final (train S1) and you accept that removal takes months. |
| `WP-INFRA-29` | Bot and traffic-quality strategy | S | Do ops/owner-console-actions.md Action 12b (block /.netlify/scripts/rum in your own test profile), run the E1 probe of ops/RUM-hygiene.md section 6 once, and record what Netlify Analytics counted so the human share of traffic can be estimated. |
| `WP-INFRA-33` | Security evidence dossier | M | After the next train is live: run MDN Observatory and securityheaders.com on /, one text page, /embed and the app page and save the reports with their dates; ask one outside reviewer to read the header and CSP set; file everything under docs/evidence/security/<date>/. |
| `WP-INFRA-03a` | Mapbox token programme: dashboard allow-list, scopes, dev and preview tokens, usage alerts, rotation | S | Mapbox account > Tokens: confirm the production token allow-list is exactly gettysburginteractivemap.com with scopes styles:tiles, styles:read, fonts:read (never netlify.app or localhost); create gtbg-dev (URL localhost) and gtbg-preview (URL netlify.app, minimum scopes); enable usage notifications at 50, 70 and 90 percent of 50,000 map loads; save the screenshots outside the repository and tick Action 3. |
| `WP-INFRA-04a` | Google Maps Embed key: referrer and API restriction, budget alert | S | Google Cloud console > APIs and services > Credentials: restrict the Maps Embed key to HTTP referrers https://gettysburginteractivemap.com/* and https://www.gettysburginteractivemap.com/*, API restriction Maps Embed API only, every other API off; create a USD 1 budget alert; test from a non-allowed origin in a real browser; tick Action 4. |
| `WP-INFRA-06a` | Backup, restore, continuity: second remote, encrypted bundles, delegate letter, drills | M | Create a second private remote (another git host or a bare repository on an external disk) and push a mirror; store a monthly encrypted git bundle in cloud storage you control; write the continuity letter (where everything is, who may do what, how to renew the domain) and give your delegate emergency access; run the restore drill once on an empty machine and log it in ops/drills.md. |
| `WP-INFRA-07b` | Vendor alerts (Mapbox usage, Netlify credits) fired once as a test | S | Set a Mapbox usage notification and a Netlify credit alert (70 percent), trigger or simulate one of each, and note the date in ops/vendors.yaml once that file exists. |
| `WP-INFRA-09b` | Staging site gbg-staging and the rollback rehearsal | S | Create a second Netlify site named gbg-staging (ops/STAGING-SETUP.md section 2), drag deliver/gettysburg-<train>-<id>-STAGING-noindex.zip onto it, run node ops/staging-verify.mjs --train <train> --staging-url <its URL>, then rehearse "Publish deploy" of the previous deploy once (section 8) and note the time it took. |
| `WP-INFRA-13b` | Stale Netlify deploys deleted (old permalinks still serve old pages) | S | After the zips are archived (Action 1) and a train is live: Netlify > Deploys, delete every deploy except the current one and the two previous known-good ones, so that old permalinks stop serving the old pricing and diagnostics pages. |
| `WP-INFRA-27a` | Legal pack: merged Privacy and Terms drafts and the counsel packet | L | Send counsel the merged drafts and ops/legal-drafts/data-inventory.md with the questions of chapter 09 WP-INFRA-27 step 2; state the operator identity and governing law; confirm or correct the non-affiliation sentence and the licence wording in tools/copy/trust-config.json; publish age or licence wording only after counsel has signed. |
| `WP-INFRA-30b` | Web-filter vendor categorisation requests | S | When the student and teacher pages are live, submit gettysburginteractivemap.com to the categorisation forms of the school filter vendors you care about (category Education or Reference) and log each submission with its date in ops/filters.tsv. |
| `VD09-1` | Netlify facts: plan, credits, preview metering, pretty_urls, header precedence, Forms, Functions, Blobs, rate limits, rollback API, primary-domain rule | S | Do Action 5 of ops/owner-console-actions.md and the staging routine of ops/STAGING-SETUP.md; write down what Netlify shows for pretty URLs, preview metering and the primary domain. |
| `VD09-2` | Mapbox allow-list, scopes, spend cap, Product Terms of 2026-07-21, behaviour with events.mapbox.com blocked, worker tile fetches; Google key restrictions and enabled APIs | S | Do Actions 3 and 4 of ops/owner-console-actions.md and read the Mapbox Product Terms on caching, self-hosting and recordings. |
| `VD09-3` | DNS and mail: forwarder terms, DMARC for forwarded mail, Netlify-managed apex records, CAA account URI; Terms clauses | S | See WP-INFRA-20 and WP-INFRA-27a. |
| `VD09-4` | Browsers and devices: Permissions-Policy console warnings, Clear-Site-Data in Safari, frame-block signals in Firefox and WebKit, installability without a fetch handler, iOS worker eviction and install | M | See V18 and WP-QA-21a. |
| `VD09-5` | Schools and traffic: filter vendor processes, events.mapbox.com and WebRTC blocking, whether Netlify counts HEAD, RUM spike correlation, account 2FA, GitHub minutes | S | See WP-INFRA-29, 30b and 01. |
| `INFRA-OD-1` | Netlify plan, credits, this month's deploys (action 5) | S | Do Action 5 of ops/owner-console-actions.md. |
| `INFRA-OD-2` | Mapbox dashboard evidence; dev and preview tokens; netlify.app on the preview token or not | S | Do Action 3 of ops/owner-console-actions.md. |
| `INFRA-OD-4` | Contact plan (forwarder, role names, send-as, DMARC ladder), private recovery mailbox, delegate | S | Do Action 6 of ops/owner-console-actions.md (private recovery mailbox, delegate with emergency access). |
| `INFRA-OD-5` | Legal: operator identity, governing law, is the non-affiliation sentence true, any registered mark, counsel budget | M | See WP-INFRA-27a. |

### Chapter 10: SEO, Discovery and Growth (WP-SEO-NN) (11)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-SEO-01` | Search Console, Bing and IndexNow verification, baseline of record | S | Search Console: add the Domain property with the DNS TXT record (or use the published HTML file for a URL-prefix property), submit https://gettysburginteractivemap.com/sitemap.xml, run URL Inspection on / and one sub-page; Bing Webmaster Tools: import from Search Console and create an IndexNow key; export the Performance, Pages and Links reports and note the date as day 0 of the 28-day baseline. |
| `WP-SEO-26` | Open dataset with a DOI (tier 3, gated) | M | After counsel has cleared it: choose the licence for a facts-only dataset (the plan proposes CC BY 4.0, no positions, no Busey and Martin derived per-regiment numbers), create the record on a DOI repository under your account, and approve the changed Terms sentence. |
| `WP-SEO-27` | Search intelligence: keyword map, competitor and assistant logs | M | After 30 days of Search Console data: approve the keyword map (at least 60 rows from chapter 10 Appendix C, re-scored with the real queries) and keep a monthly log of 30 searches and 10 assistant prompts. |
| `WP-SEO-28` | Outreach programme | L | Send one personal message and at most one follow-up per target (teachers, libraries, round tables, genealogy societies), disclose that you built the site, never pay for or trade links, and log every send with its date and reply. |
| `WP-SEO-02b` | Weekly KPI rows, bot probe and before/after exports per train | S | Every Monday enter one row in the KPI ledger (search referrals by engine, clicks and impressions for the brand queries, indexed versus submitted URLs, 404 rate, the field vitals) and save a Search Console export before and after each published train. |
| `VD10-1` | Older Search Console or Bing property, DNS-token versus URL-prefix properties, June to September history | S | See WP-SEO-01. |
| `VD10-2` | WP-DEC-05: pretty_urls=false, forced /x.html to /x without loop, query strings kept, primary-domain redirect, query-matched redirect rows | S | Before train S1, drop the S1 staging zip on the staging site and run the redirect matrix of WP-INFRA-12 against it. |
| `VD10-3` | Do Netlify analytics count bots (E1 probe); path and country filtering | S | See WP-INFRA-29. |
| `VD10-6` | Outreach targets marked unverified; archives; standards codes; commemoration dates | S | See WP-SEO-28. |
| `OD-SEO-7` | Confirm the non-affiliation sentence is true; any registered mark | S | Confirm or correct the non-affiliation sentence and any registered mark in docs/content/OWNER-INPUTS.md. |
| `OD-SEO-10` | Outreach (about 60 personal emails and round-table talks); video channel after cutover | L | See WP-SEO-28. |

### Chapter 11: Copy, Documentation and Content (WP-CONTENT-01..27) (3)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-CONTENT-27` | Documentation and voice evidence pack | M | Ask one person who did not build the site to read the guide with a screen reader and five readers (teachers or students) to try the Students, Help and Sources pages; have an outside editor read the key strings and trust pages; file each dated result under docs/evidence/. |
| `VD11-6` | Owner facts: the non-affiliation sentence is true (V14); Netlify Forms limits and pricing (V12) | S | Confirm the non-affiliation sentence in docs/content/OWNER-INPUTS.md; read the Netlify Forms terms if a form is wanted. |
| `CD-5` | About text and photo | S | Give a photo (a real one of yourself) for the About page or write that the page goes without one. |

### Chapter 12: Quality System and Release Engineering: keeping A+ at A+ (WP-QA-01 .. WP-QA-25) (7)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-QA-21a` | Real-device and assistive-technology programme | M | On an iPhone SE-class phone, a 4 GB Android (Chrome and Samsung Internet), an iPad and a 4 GB Chromebook: open the staging site, follow tests/t0/journeys-manual.md (pan, zoom, tap a unit, every Tools row, rotate, background and return ten times) and write the result with date and device into the file. |
| `WP-QA-24b` | Manual programmes and the verification dossier | M | Commission an independent accessibility evaluation of six flows, one outside review of the headers and CSP, a one-hour UX critique, and 8 to 10 user sessions; name the historical reviewer; link each dated result from docs/evidence/index.md before any public "A+" wording. |
| `VD12-3` | Preview commit-status behaviour, restore and unlock API, previews injecting RUM, pretty_urls on the real deploy path, GitHub plan features and minutes | S | See VD09-1 and QA-OD-1. |
| `QA-OD-1` | GitHub plan (Pro, public after a clean secret scan, or Free with convention) | S | Choose the GitHub plan (a payment) or confirm the free plan with convention-only checks; if public, run the secret scan on history first (WP-INFRA-05). |
| `QA-OD-2` | Real devices | M | See WP-QA-21a. |
| `QA-OD-4` | Evidence dossier budget and who | M | See WP-QA-24b. |
| `QA-OD-8` | Named historian reviewer and second reader | S | See WP-DATA-23b. |

### Chapter 13: Data quality, provenance and rights (WP-DATA-01..24) (5)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-DATA-05a` | Rights dispositions: Busey and Martin figures, open-dataset policy, the paid-app and video derivation question | M | Answer in writing (docs/content/OWNER-INPUTS.md or a decision file): did any keyframe, note or text of the map data come from the paid animated-map application or from the video channel named in the four data strings, and where did the 512 monument list come from; then send counsel the rights audit (docs/data/rights-audit.md) with the Busey and Martin and imagery questions of chapter 13 WP-DATA-05. |
| `WP-DATA-23b` | A named reviewer and second reader; backlog burn-down | M | Ask a historian (or two) to accept the one-page charter in docs/editorial/reviewer-charter.md, record the name and the credit wording in docs/content/OWNER-INPUTS.md, and give them docs/editorial/anchor-review-packet.md; or write that the labelled fallback stands. |
| `VD13-3` | Source terms: HMDB, Stone Sentinels, NPS contractor reports, CC BY-SA and ODbL duties | S | See WP-DATA-05a. |
| `VD13-7` | Counsel scope and cost; owner answers to register action 10; device benchmark of 478 moving features; no browser was used for the DOM criteria | S | See WP-DATA-05a and WP-DEC-03. |
| `Q-DATA-7` | Provenance answers (paid app or video channel derivation, origin of the 512 list, atlases) | S | See WP-DATA-05a. |

### Chapter 14: Ask the Historian: The Database Expansion Plan (11)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `WP-HIST-30` | Soldier rosters (CWSS), blocked on the Park Service reply | L | Send the permission emails of register action 8 (including the National Park Service about the soldier-roster data) from your own address, and save any reply in docs/legal/; no roster data is fetched or stored before a written confirmation. |
| `WP-HIST-35` | Reviewer programme and hours ledger | S | Same step as WP-DATA-23b: name the historical reviewer and second reader, or write that the labelled fallback stands; the reviewer records hours in docs/editorial/ (a table is enough). |
| `VD14-1` | Netlify plan, file limits, .bin compression, Range | S | See VD09-1. |
| `VD14-3` | Phone latencies (modelled x6) on a real Android | S | See WP-QA-21a. |
| `VD14-8` | Counsel: public domain before 1931, Busey and Martin figures, AI-disclosure duty, minors policy | S | See WP-INFRA-27a. |
| `VD14-9` | NPS on the soldier roster data; contractor authorship of NPS reports; Bachelder maps; the weather primary | S | See WP-HIST-30. |
| `HIST-OD-1` | Name a historical reviewer and second reader; credit; weekly budget | S | See WP-DATA-23b. |
| `HIST-OD-4` | Netlify plan and credits | S | See INFRA-OD-1. |
| `HIST-OD-5` | Send the three permission emails; confirm the site stays non-commercial | S | See WP-HIST-30. |
| `HIST-OD-10` | A real mid-tier Android for the Historian gate | S | See WP-QA-21a. |
| `HIST-OD-16` | Action 10 answers (provenance of the video-channel notes; Busey and Martin facts-only) | S | See WP-DATA-05a. |

### Chapter 15: Integrated roadmap: one WBS, one critical path, honest calendars (25)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `MS-R0` | Milestone R0: the R0 mechanism release shipped | S | Follow ops/DEPLOY-CHECKLIST.md: run python tools/t0/baseline.py verify-live, drop the staging zip first, run node ops/staging-verify.mjs, then the production zip, and add one row to ops/RELEASE-LOG.md the same day. |
| `MS-M1` | Milestone M1: survival complete (R0, pan and zoom, mobile shell core, date fix, deep links, privacy, contact, page core) | S | Deploy as for MS-R0, after reading ops/legal-drafts/OWNER-SIGNOFF.md if the interim privacy text is to ship. |
| `MS-M2` | Milestone M2: Tranche 0 complete (P0 to P2) | L | Run the eight-pass acceptance (tools/accept/run_eight.mjs) on the Windows acceptance machine against deliver/gettysburg-R1g-52cec836-PRODUCTION.zip packed there with the original tile pyramid, then deploy. |
| `MS-CLOCK` | Milestone CLOCK: clock bridge live | S | Deploy a train from R1d onwards; the clock pill and "about" wording stay until a reviewer signs the anchors. |
| `MS-M5` | Milestone M5: full A+ path complete with evidence | L | Commission the independent evaluations listed under WP-QA-24b and link each dated result from docs/evidence/index.md before any public "A+" wording. |
| `V1` | Real-mouse drag and wheel on the live map (headed desktop browser) | S | Do Action 12a of ops/owner-console-actions.md: drag and wheel on the live map in a headed browser with a real mouse and write the verdict. |
| `V3` | Netlify plan, credits, preview metering, pretty_urls=false, header precedence | S | Do Action 5 of ops/owner-console-actions.md and run the staging verifier (ops/STAGING-SETUP.md). |
| `V4` | Mapbox allow-list, scopes, spend cap, Product Terms, raster tiles outside the SDK, webglcontextlost | S | Do Action 3 of ops/owner-console-actions.md and read the Mapbox Product Terms of 2026-07-21 on map tile caching and self-hosting. |
| `V5` | Google key restriction, enabled APIs, account security | S | Do Actions 4 and 6 of ops/owner-console-actions.md. |
| `V6` | Traffic quality: do probes count in analytics, RUM pollution | S | See WP-INFRA-29. |
| `V7` | Devices: iPhone SE, mid-range Android, Samsung Internet, Chromebook; Street View pano ids; Documentary nav row | M | See WP-QA-21a. |
| `V8` | iOS AR gesture chain, Safari MediaRecorder, canvas memory, in-app browsers | M | Run the AR page and Cinematic Export on an iPhone and record the result in tests/t0/journeys-manual.md. |
| `V9` | Assistive technology never run; landmark reconciliation; overlap thresholds | M | Run one NVDA and one VoiceOver pass over the six flows of chapter 07 and file the dated log under docs/evidence/. |
| `V10` | History: five R anchors, 45 low-confidence rows, unread primary sources, Confederate casualty authority, 22 cavalry commanders | M | See WP-DATA-23b. |
| `V11` | Rights: roster redistribution, atlases, paid-app and video provenance, site terms, share-alike duties, counsel scope | M | See WP-DATA-05a. |
| `V14` | SEO method: keyword map, monitoring design, older Search Console or Bing property, vendor token spellings | S | See WP-SEO-01 and WP-SEO-27. |
| `V15` | Research and feature proposals needing user tests (UX flows, page proposals, Sandbox) | M | Run one round of five user sessions on the phone shell and record the findings. |
| `V18` | New patch code with no prior run; Bookmarks in the upgrade drill; Safari service-worker upgrade; Firefox and WebKit | M | Run node tests/t0/r0.mjs on a machine with Firefox and WebKit installed, and the upgrade drill on an iPhone. |
| `V20` | Reviewer capacity (155 to 226 hours against 3 to 4 hours a week) | S | See WP-DATA-23b. |
| `OD-3` | Historical reviewer and second reader | S | See WP-DATA-23b. |
| `OD-4` | D-TIME: historian decides the five R anchors, owner signs the three design anchors and conventions | S | Read docs/editorial/anchor-review-packet.md and the conventions in docs/editorial/sign-off-states.md; sign the three design anchors in a decision file; hand the five historian anchors to the reviewer. |
| `OD-6` | Legal: interim facts-only privacy now; operator identity, governing law, counsel before licence, model, Classroom | M | See WP-INFRA-26 and WP-INFRA-27a. |
| `OD-7` | Rights answers, licence, permission emails | M | See WP-DATA-05a and WP-HIST-30. |
| `OD-8` | Continuity: delegate, second remote, operations ceiling | M | See WP-INFRA-06a. |
| `OD-14` | Real devices and who runs the checks | M | See WP-QA-21a. |

### Chapter 16: Audit corrections and new findings (annex) (19)

| Item | Title | Size | Owner step |
|---|---|---|---|
| `AUDIT-P1` | RUM Poor for LCP, INP, CLS, FCP; spikes | S | After the deploy, read Netlify RUM (field vitals per page) for 30 days with your own visits blocked (ops/RUM-hygiene.md) and record the figures. |
| `AUDIT-T1` | Only about 8 percent of referrals come from search | S | See WP-SEO-01 and WP-SEO-02b. |
| `AUDIT-T2` | About 18 percent of views likely bots; scanner 404s | S | See WP-INFRA-29. |
| `AUDIT-X1` | Mapbox token looks unrestricted | S | Do Action 3 of ops/owner-console-actions.md (token allow-list and scopes, dev and preview tokens, usage alerts). |
| `AUDIT-X2` | Google Maps key restriction unknown | S | Do Action 4 of ops/owner-console-actions.md. |
| `NF-16` | Search Console and Bing ownership lapsed | S | See WP-SEO-01. |
| `NF-18` | No backups or continuity; public Gmail as recovery identity; domain expiry | M | See WP-INFRA-01 and WP-INFRA-06a. |
| `NF-53` | No named historical reviewer or second reader | S | See WP-DATA-23b. |
| `NF-54` | Rights exposure already live (B and M numbers, 18 coordinates, video strings, derived imagery) | M | See WP-DATA-05a. |
| `CORR-01` | The Mapbox token IS URL-restricted (tiles 403 off-origin); allow-list unknown | S | Do Action 3 of ops/owner-console-actions.md. |
| `CORR-05` | RUM Poor badges for FCP, INP, CLS are outlier-driven | S | See AUDIT-P1. |
| `CORR-21` | Search share is a domain-age and thin-page problem; Bing and DuckDuckGo out-refer Google | S | See AUDIT-T1. |
| `CORR-22` | The human share of traffic is unknown; measure, do not block | S | See WP-INFRA-29. |
| `EXIT-16-5` | X-5: the conditional grades are re-graded after the real-mouse test, the device matrix and one assistive-technology pass | M | See V1, V7 and V9. |
| `VER16-1` | Annex verification 1: headed real-mouse test of NF-01 | S | See V1. |
| `VER16-2` | Annex verification 2: real devices for the mobile grades and NF-02, 03, 35, 36, 37 | M | See V7. |
| `VER16-3` | Annex verification 3: one screen-reader pass | M | See V9. |
| `VER16-7` | Annex verification 7: iOS-only behaviours (AR gestures, canvas memory, Safari MediaRecorder) | M | See V8. |
| `O-16-3` | Run the ten-minute headed real-mouse test on the live site | S | See V1. |

### Owner steps attached to items that are not OWNER_ONLY (23)

These items have buildable or decidable work too; the owner part is:

| Item | Status | Title | Owner step |
|---|---|---|---|
| `D-URL` | OPEN_BUILDABLE | Extensionless canonical URLs (train S1) | Verify Search Console by DNS TXT first (Action 2). |
| `D-SCHOOLS` | OPEN_BUILDABLE | Classroom readiness | Submit the domain to the web-filter vendors and name two or three pilot teachers. |
| `WP-ARCH-31` | OPEN_BUILDABLE | App CI gates, promotion, definition of done | Enable GitHub Actions on the repository. |
| `WP-ARCH-32` | OPEN_BUILDABLE | Cutover, rollback drills, go/no-go automation | Publish the cutover build and rehearse the rollback. |
| `WP-PERF-01` | OPEN_BUILDABLE | Measurement foundation and baseline of record | Export the Netlify RUM panels (All, Mobile, Desktop) before the first deploy. |
| `WP-PERF-04` | OPEN_NEEDS_DECISION | RUM operations | Export Netlify RUM weekly after the deploy. |
| `WP-UX-30` | OPEN_BUILDABLE | Classroom, Present, Teach | Name two or three pilot teachers. |
| `WP-UX-31` | OPEN_NEEDS_DECISION | On-site mode | On-site test with an iPhone and an Android at three stops. |
| `WP-PAGE-41` | OPEN_BUILDABLE | Students reading level | Have a teacher read the student texts. |
| `WP-PAGEC-13` | OPEN_NEEDS_DECISION | AR heading engine | On-site test with an iPhone and an Android. |
| `WP-PAGEC-18` | OPEN_BUILDABLE | Turning Points: moment ids, corrected anchors | Reviewer signs the nine anchors. |
| `RM-02` | OPEN_BUILDABLE | Private repo, publish-dir isolation, staging site, Git-deploy byte-identity, CI skeleton, registries, gitleaks, ADR files | Create the staging site; enable Actions. |
| `RM-39` | BUILT_NOT_SHIPPED | Trust pages: About, Sources and Methods, Corrections, Contact, Accessibility statement, FAQ, changelog | Supply the five inputs. |
| `RM-46` | OPEN_BUILDABLE | Performance budgets, ratchet, lab gates, INP harness and real-device runs | Real-device runs. |
| `RM-50` | OPEN_BUILDABLE | Spikes: map-engine facade (O1/O2/O3), unit-render benchmark on a real Android, verification-debt burn-down | Android benchmark. |
| `RM-70` | OPEN_BUILDABLE | Cutover mechanics: /next beta, flags, go/no-go automation, rollback drills, decommission legacy | Cutover deploy. |
| `RM-85` | OPEN_BUILDABLE | Classroom mode, school-network readiness, in-app browser and hostile-environment matrix | Pilot teachers; filter-vendor forms. |
| `RM-91` | OPEN_NEEDS_DECISION | AR keep: heading engine, markers, on-site test (only if funded) | On-site test. |
| `RM-95` | OPEN_NEEDS_DECISION | On-site mode, map-mode convergence, offline pack | Tile-rights answer; field test. |
| `PERF-OD-04` | OPEN_NEEDS_DECISION | Owner decision: approve the vitals event fields and privacy sentence (D-TELEMETRY) and reading CrUX | If CrUX field data is wanted: create a Google Cloud API key restricted to the Chrome UX Report API and give it to the session through the credential form. |
| `RM-88` | OPEN_BUILDABLE | CSP enforcement by class, end state, security evidence dossier | After a train is live: run the header scans and ask one outside reviewer (see WP-INFRA-33). |
| `RM-35` | OPEN_BUILDABLE | Rights: source registry, tier gate, provenance retro-audit, dispositions, counsel questions | Answer the provenance question of register action 10 and engage counsel with docs/data/rights-audit.md (see WP-DATA-05a). |
| `AUDIT-C4` | OPEN_BUILDABLE | Clock versus history versus the app's own narrative | Name a historian reviewer (WP-DATA-23b); sign the design anchors (OD-4). |

## Regenerate and check

```
python3 docs/plan/STATUS/merge_status.py            # rewrite STATUS.md and backlog.json from items-A.json, items-B.json and the repository
python3 docs/plan/STATUS/merge_status.py --check    # exit 1 when they are stale
python3 docs/plan/STATUS/check_backlog.py           # validate backlog.json and every done claim
python3 docs/plan/STATUS/check_backlog.py --rerun <id>   # re-run the recorded check of one entry
```

