# 11 - Copy, Documentation and Content (WP-CONTENT-01..27)

Status: PLAN ONLY, 2026-09-30; nothing built, deployed or edited. Obeys `01-decision-register.md` (ADR ids `D-*`); disagreements are in section 9. Evidence tags: [V] re-checked by me (grep of `bundle.pretty.js`, DEPLOY_DIR, data, curl); [S id] specialist or verifier; [E] estimate; [U] unverified. `file:line` = DEPLOY_DIR; bare numbers = `bundle.pretty.js` lines. Scripts: `plan-work/tmp-docs-copy/` (`inventory.py`, `pdf_lint.py`, `copy_patch_table.json`, `seo_replacements.json`), `tmp-ux-flows/` (`fk.py`, `hist_undefined.js`). "dc x.y" = `docs-copy.md` section. Effort: S < 0.5 d, M 0.5-2, L 2-5, XL > 5 (person-days, AI-assisted; reviewer hours 30-50 h [E] and owner-written text 6-10 h [E] excluded).

Id convention (review 3): inside this chapter a bare `WP-NN` means `WP-CONTENT-NN`; other prefixes are written in full; "S2/S3/S4" are the register's release trains, "R1/R2/R3" this chapter's non-identity releases (R2 and R3 are not register trains).

**Five systems** (root cause: no single source of truth for text): `facts.json` (WP-04), `features.json` + glossary (WP-05), copy catalogue + standard disclaimers (WP-06, 13), style guide + Vale + `copy_lint` (WP-06), guide generator (WP-10, 11).

## 1. A+ exit criteria: documentation and voice (desktop AND mobile)

A+ = nothing a visitor reads is false, developer-voiced, inconsistent or unverifiable, and every claim of authority can be checked on the site. Feeds qa-ci "Documentation", "Privacy / legal pages", "Fit and finish".

| ID | Exit criterion (measurable) | Gate | Baseline |
|---|---|---|---|
| X-01 | `copy_lint` = 0 on the built tree (HTML, inline scripts, JS literals of app/Help/Bookmark chunks, manifest, public JSON rendered fields, guide HTML, PDF text); one tree serves desktop and mobile. | `copy_lint`, SL-20 | 356 hits/18 rules; data 1,938 raw ` -- ` [V/S] |
| X-02 | No typed counts: numbers before counted nouns equal `facts.json` everywhere. | `check_facts`, DV-11/23 | `467` x10, `445+`, `675` x30, `51,000` x6 [S] |
| X-03 | One name per thing: retired names 0 outside changelog; H1 = nav label; `<title>` <= 60; one brand string. | Vale `Terms`, SL-27 | 71 old-name uses; 12 feature conflicts; 5 long titles [S] |
| X-04 | Every self-description true: `docs/claims.json` (guide rows, 21 meta descriptions, Historian intro, FAQ, Help). | DOC-07, HC-13 | 11 guide rows wrong + 7 conditional [S] |
| X-05 | Guide: DOC-01..07; `pdf_lint --strict` (fill >= 55% except last page, 0 orphan headings, 0 spans < 4.5:1, >= 90% chars >= 10 pt, fonts embedded, outline >= 30, 12-14 pages, < 500 KB); veraPDF `ua1` 0 failed; NVDA/Acrobat/PAC log. Desktop: prints Letter and A4. Mobile: `/guide` passes axe; PDF opens inline, legible at 375 px. | pdf_lint, veraPDF | fill 5-100 %; 1.25:1; 95% < 10 pt; untagged [V/S] |
| X-06 | Trust pages live, in raw-HTML footer and sitemap: About, Sources, Method, Corrections, Accessibility, Contact, FAQ, Changelog, Press and Embed, Teach, Glossary, Guide, `security.txt`; each axe 0, Lighthouse a11y/SEO/BP 100, <= 30 KB, valid JSON-LD; Corrections >= 10 dated entries; 3-day acknowledgement drill passes. | axe, LHCI | all 404 [V] |
| X-07 | Sources visible and durable: Sources link on every unit panel, story, event card, sub-page (mobile <= 2 taps); `sources.yaml` valid; every cited external URL has `archive_url`; weekly link check green; disagreement register >= 8 rows. | DV-24/25 | 9 works in Help; 26 cited in data, on no page [S] |
| X-08 | Headline facts adjudicated (26th NC, Iverson, three casualty bases, Avery/Lincoln/Alexander quotes, Gottfried year, 165,000, monument subset): one value, basis, citation; quotation validator 0. | `check_quotes` | 714/800 vs 588/843; three totals [V/S] |
| X-09 | Voice: UI catalogue FK median <= 8.0 (p95 <= 10); each `student_summary` <= 8.0 and <= 60 words; first person only on About/Corrections/FAQ; `4:30 PM`; en/em dashes; sentence case; 0 emoji labels; axe `image-alt` 0 and `og:image:alt` everywhere. | `copy_lint`+`textstat` | 21/24 summaries above grade 8 [S]; 9 "we"; 17 emoji |
| X-10 | Inclusive history published, sourced, reviewed (WP-25); Explore: note + hide toggle; Classroom: collapsed. | sign-off | 0 mentions [V] |
| X-11 | Review stamps honest: no "Reviewed" without a `decisions.jsonl` entry; else "Unreviewed reconstruction"; reviewed % per dataset on Sources. | CI rule | none |
| X-12 | Mobile copy parity: no keyboard text on touch; strings fit at 320 px (buttons <= 3 words, card text <= 75 chars, legend chips full words); Help and "Report a problem" <= 2 taps from Tools. | layout-audit | keyboard hints on phones [S] |
| X-13 | Evidence: X-01..12 cite a non-author artefact where D-EVIDENCE requires (independent PDF/UA + AT check, outside copy edit, 5 non-author readers, reviewer sign-offs); until then capped A-. | dossier | none |
| X-14 | Reproducible/fresh: `npm run docs` from a clean clone repeats the text layer; version equal in footer, `version.json`, PDF, changelog (DOC-06); Accessibility and Sources review dates <= 100 days. | CI | no generator |

## 2. Verified current state (facts only)

| # | Fact | Evidence |
|---|---|---|
| F1 | 356 rule hits over 27 HTML files, `site-nav.js`, manifest, bundle, Help/Bookmark chunks, PDF; recall gap: dev diary on live `unit-rendering-reference.html`. | [S dc 2.1; verifier] |
| F2 | Public JSON is rendered verbatim: 1,938 raw ` -- ` (1,639 rendered strings), 61 KIA, 69 ALL-CAPS phrases (57 distinct), 20 clocks, 17 events with `US-`/`CS-` ids, 20 `flag` production notes; nothing in bundle or HTML reads `flag` or `units_involved`. | [V grep] |
| F3 | 467 regiment records (52+62+57+77+72+88+37+22) incl. alias stub `U-14BK` (strength 0; listed beside `U-84NY` at `union_oob_brigades.json:14`) and the battery `C-McClanahan-ART` (`confederate_cavalry.json`, `unit_type` horse_artillery [V]) + 103 batteries = 570 records, 569 distinct (465 regiments + 104 batteries); positions 217 own / 231 via brigade / 19 none; 222 lack a casualty rate, 27 a commander; Search, Biography, Fact Sheets, Find Ancestor, Historian never load artillery. Help: "445+", "675 five-minute ticks", "Primary Sources" = 9 works (2 primary). | [V; S app-bugs-15, dc 5.1] |
| F4 | Casualty bases: `total_casualties` fields sum 45,928 (22,803 + 23,125); `engagement_periods` sum 46,163 (23,138 + 23,025) = what Dashboard/Ledger show; chronology tick 650 "about 23,000 + 28,000 = 51,000"; NPS 23,049 + 28,063. | [V; NPS S] |
| F5 | Historian: 137/137 chronology answers end `undefined` (reads `e.title/e.description`; data has `event`); intro promises a source link per answer; persona strings; 5 of 15 loaded files lack `metadata.sources`. | [V historian.html:119-123; S pages-C-16] |
| F6 | `user-guide.pdf`: 6 pages, ReportLab OSS 5.0.1, no generator anywhere, `Content-Disposition: attachment` (`netlify.toml:201-204`) + `download` (113116); untagged, no outline, 0 links, 4 unembedded fonts, `(anonymous)`. | [V; S pdf_lint] |
| F7 | About, Sources, FAQ, Accessibility, Corrections, Changelog, Press, Teachers, Contact, Glossary, Guide, `version.json`, `security.txt`: all branded 404. | [V curl 2026-09-30] |
| F8 | 0 hits for slave, enslaved, emancipat, abolition, African American, free Black, contraband, USCT in HTML/JS/data; "civilian" twice (105057, 110600). | [V] |
| F9 | Only contact = Gmail mailto (`site-nav.js:194`, `privacy.html:47`, `terms.html:42`); timeline credit prints it (112361); no non-affiliation text; footer names the product. | [V] |
| F10 | 5 titles > 60, 10 og/description mismatches, 8 descriptions with `--`, 4 contradict their page; sitemap 21 `<loc>`, no privacy/terms; 71 "Animated Battlefield Map"; SEO nav lists 18 of 20 tools. | [S; verifier] |
| F11 | Students `panel_summary` FK median 10.9-11.2 (21/24 above 8), `full_script` about 7.1-7.4; `sw.js` never caches HTML; `embed.html` reads `?vignette=` and is a text card (V-017 = The Cannonade, V-018 = Cushing's Battery); 21.6-24.1 KB of comments ship. | [S; V] |

### Corrections applied (none is carried forward uncorrected)

| # | Statement | Corrected fact |
|---|---|---|
| K1 | "45,928 is the dashboard total" (dc G3, 3.3, 6.10, FAQ, Help); "165,000 should be 163,000" (dc G6) | 46,163 is the total; 45,928 sums summary fields; ~51,000 is a third basis [V]. 165,000 is correct (NPS 93,921 + 71,699) and stays [S] |
| K2 | Guide row 17 "stop 16 has no NPS video" | REFUTED: all 16 stops have one; 14 of 16 a fixed panorama id [S] |
| K3 | Gottfried 2007 vs 2013 | *Maps of Gettysburg* is Savas Beatie 2007; `terrain.json` 2013 is the error [S] |
| K4 | Avery "unverified" | "It was my fault." is wrong; recorded note "Major, Tell my Father I died with my Face to the enemy" (NC State Archives); verify [S] |
| K5 | FAQ "parts of the site are cached"; embed `?story=V-018` "The Cannonade" | HTML is never cached; the parameter is `vignette` and The Cannonade is V-017 [V] |
| K6 | Effort 42 d; Phase 0 "1 day"; Teach hub L | 45 d; Phase 0 2-3 d; Teach hub XL 8-15 d incl. modes [S] |
| K7 | Phase 0 "ships now" | D-ORDER: nothing ships before R0; `<title>`, H1, nav labels, meta, og, manifest, JSON-LD, canonical, product name wait for S2 |

Also applied inside the WPs: chronology `undefined` (WP-01), I Corps direction and 26th NC (WP-08), normaliser hazards (WP-03), ESLint rule name (WP-06), WeasyPrint status (WP-11).

## 3. Work-package table

Tier per D-SCOPE-TIERS; trains per register 4.2 (R2/R3 = later non-identity releases, kept 48 h clear of S-trains). Days: gross person-days [E].

| WP | Title | Eff | Days | Tier | Train | Depends on |
|---|---|---|---|---|---|---|
| WP-CONTENT-01 | Phase 0: truthful static-page copy + Historian chronology fix | M | 1.0-1.5 | 1 | R1 | R0; D-SOUND, D-VIEWSHED |
| WP-CONTENT-02 | In-app and Help copy patch table (T0 rows) | M | 1.0-2.0 | 1 | R1 / S2 | R0, D-SOURCE runner, 01 |
| WP-CONTENT-03 | Data text hygiene: normaliser, ids, alias, engine fields | L | 3.0-5.0 | 1 | R2 | data-pack mechanism, 06 |
| WP-CONTENT-04 | `facts.json` + `check_facts` | M-L | 1.5-2.5 | 1 | R2 | D-SITEGEN |
| WP-CONTENT-05 | `features.json`, glossary, parity gate | L | 3.0-4.5 | 1 | R2 / S2 | 04; D-URL |
| WP-CONTENT-06 | Style guide, catalogue, disclaimers, Vale, `copy_lint` | L | 2.5-4.0 | 1 | R1 warn, R2 error | 04, 05 |
| WP-CONTENT-07 | Canonical names, titles, descriptions, social copy | M | 1.0-2.0 | 1 | S2 | D-NAME; S1; 05, 06 |
| WP-CONTENT-08 | Headline-figure and quotation adjudication | M | 1.0-2.0 | 1 | R2 | D-HIST-REVIEW; 04 |
| WP-CONTENT-09 | Clock, "real time", "tick" copy | M | 1.0-2.0 | 1 | R1 (A), post-DG-3 (B) | D-TIME |
| WP-CONTENT-10 | Guide content: truth audit, v2 structure | L | 2.0-3.0 | 2 | R2 | 04-06; D-HEATMAP, D-SOUND |
| WP-CONTENT-11 | Guide generator, PDF/UA, layout, delivery, gates | L-XL | 4.0-6.0 | 2 | R2-R3 | 04, 05, 10; D-SITEGEN, D-MEDIA |
| WP-CONTENT-12 | In-app Help, About, sources list, onboarding | M-L | 1.5-2.5 | 1 | R1 / C | 02, 04, 05, 08; D-ENTRY |
| WP-CONTENT-13 | Microcopy, states, alt text, reading-level gate, landing copy | M | 1.0-1.5 | 1 | R2 / S3 | 06; D-ENTRY, D-ROOT |
| WP-CONTENT-14 | Sources and Methods | L | 3.0-5.0 | 1 | R2 seed, DG-3 final | 04, 08; D-LICENSE |
| WP-CONTENT-15 | Citation permanence | L | 2.0-3.0 | 1 | R3 | 14; D-HIST-ARCH |
| WP-CONTENT-16 | Corrections and Report a problem | M-L | 1.5-2.5 | 1 | R2 | WP-DEC-06; D-CONTACT |
| WP-CONTENT-17 | About, Contact, security.txt, glossary page, site map | M-L | 1.5-2.5 | 1 | R2 | WP-DEC-06; D-NAME |
| WP-CONTENT-18 | FAQ | M | 1.0-1.5 | 2 | R3 | 04, 08, 14, 16, 19 |
| WP-CONTENT-19 | Accessibility statement | M | 1.0-2.0 | 1 | R3, each release | 13; D-EVIDENCE (a) |
| WP-CONTENT-20 | Changelog, `version.json`, Known issues | S-M | 0.5 | 2 | R1 seed | R0 |
| WP-CONTENT-21 | Press and Embed kit | M | 1.0-2.0 | 2 | S4 | X4 embed fix; D-MEDIA, D-LICENSE |
| WP-CONTENT-22 | Teach hub, lessons, handouts, IT-admin page | L-XL | 4.0-6.0 | 2 | S4 | 11, 23, 25; D-SCHOOLS |
| WP-CONTENT-23 | Students edition, reading-level rewrite | L | 3.0-5.0 | 2 | S4 | 25; D-DESIGN |
| WP-CONTENT-24 | Privacy/Terms wording, footer identity, generated dates | S-M | 0.5-1.0 | 1 | R2 | WP-DEC-07/08 |
| WP-CONTENT-25 | Inclusive-history content | L | 3.0-5.0 | 1/2 | after DG-2 | D-HIST-REVIEW; CD-2 |
| WP-CONTENT-26 | Repo docs, shipped-comment strip | M | 1.0-2.0 | 2 | R0 (index), C | R0; D-SITEGEN |
| WP-CONTENT-27 | Documentation and voice evidence pack | M-L | 1.5-2.5 | 1 | DG-4 | all; D-EVIDENCE |

27 WPs, 48-79 person-days gross, before de-duplication with the Historian, SEO, a11y, data and legal chapters (overlaps named in each "Covers" line; each specialist finding id has one owning WP here).

## 4. Detailed specifications

Rules for every WP: copy from the catalogue (WP-06), numbers from `facts.json` (WP-04); nothing ships before R0 (D-ORDER); identity strings (title, H1, nav label, meta description, og, manifest, JSON-LD, canonical, product name) ship only in S2. Strings: Appendix A. "Covers" = specialist ids, then audit ids.

### 4.1 Phase 0 and Tranche 0

#### WP-CONTENT-01 - Phase 0: truthful static-page copy and the Historian chronology fix (M, 1.0-1.5 d, Tier 1, R1)
**What/why.** Visitors read development history, database words and an AI persona: `viewshed.html:46` "Earlier drafts...", `ar.html:56` "which we haven't been able to do from here", `dashboard.html:261-263` plus a card printing `highest_single_regiment_rate`/`undefined` (`:244-248`), `index.html:377` "AI-style historian", Search rows "alias for U-84NY"/"Commander unrecorded" [V].
**Fix.** One commit of exact-anchor string edits on static files (Appendix A, `R1` rows): body copy on `viewshed`, `ar`, `aftermath`, `watch-together`, `immersive`, `ground-remembers` (counts from loaded data), `regiment`, `sandbox`, `compare`, `dashboard`, `search`, `find-ancestor`, `report`, `index.html:377`, and `site-nav.js:20,26,27` (menu descriptions only). Dashboard: delete the footnote code; build four cards from a static title map and the `union`/`confederate` sub-objects (dc 2.4). Historian `historian.html:113-125`: **one implementation, owned by WP-HIST-01** (chapter 14 section E, same R1 release; its fix list, which also adds fetch Retry, a labelled 16 px input and clock-label holding, is authoritative and its Historian share of effort is not counted again here, chapter 15 RM-14); this WP supplies the catalogue strings (Appendix A rows 9-10) and the acceptance `hist_undefined.js` 0/137. Summary of the shared change: search text = `e.event + e.narrative + e.location + units_involved`; render `Day N, time - place: e.event`; source line "Chronology, Day N"; never render `flag`; intro counts from loaded arrays and no "source link under each answer" until true; delete persona lines (:186, :204) and the `parent_*_id` segment (:93). Omission-first (dc 2.5) in `search.html:112`, `find-ancestor.html:121`, `regiment.html:198-208`, `report.html:101`; skip `alias_for` records in the five loaders until WP-03; remove `console.log` (`compare.html:164`, `search.html:144`).
**Accept.** `copy_lint --rules DEVLOG,IDLEAK,DEBUGUI,AIPERSONA,ABSENCE` = 0 on the deploy tree; `hist_undefined.js` prints 0/137; "Herbst Woods" returns event text; "Brooklyn" shows no `alias for`; a diff test proves title/H1/description/og unchanged; SL-20; silent console.
**Moves/risks.** Fit and finish C+ to B+.
**Covers.** docs-copy-01, -02 (pages), -03 (D1-D3, D5, D11), -09, -28 (static), -30 (errors); ux-flows-16, -19; pages-C-12, -16, -57, -91; pagesB-10, -45, -52; pagesA-10, -11, -17, -21, -25, -41; data-integrity-05, -28. H7, H8, C7.

#### WP-CONTENT-02 - In-app and Help copy patch table (M, 1.0-2.0 d, Tier 1, R1 and S2)
**What/why.** Bundle and Help chunk hold `Tick 538/675`, `1x (real time)`, "445+", `Skip intro ›`, `Confed`, emoji labels. D-SOURCE puts `copy_patch_table.json` (64 rows, 0 count mismatches per verifier) in the ONE Tranche 0 runner.
**Fix.** Add per row `train` (`R1` | `S2` | `AFTER:<id>` | `OBSOLETE:D-ENTRY` | `DROP:<ADR>`), `surface`, `expect`; the runner asserts counts, emits new hashed names (entry, `HelpModal`, `BookmarkPanel`) and rewrites `index.html`, `sw.js`, modulepreload (deploy-history-01). Triage: about 40 rows `R1`; names `b03 b06 b13 b14 b19-b25 h11` `S2` (same runner, S2 deploy); `b42` waits for the gold-trail fix, `b46/b47` for WP-08, `h04` for unified Esc; `h09` and the Quick Reference heatmap row (111995) `DROP:D-HEATMAP`; `b01 b02 b04 b08 b09 b39 b40` `OBSOLETE` if T0 deletes intro and chooser. Corrections: `b10` becomes `1x` + tooltip "Base playback speed"; `b26` (6 hits) hand-patched to "Moment "; `b32` matches the quote-delimited `Confed` only (162 raw hits); `b33` becomes a rewrite of the rank function (102536-102546 prints "Lieutenant Col"); New rows: D-SOUND strings (111776, banner), Help "Primary Sources", dedication, tab labels, close `aria-label`. Coupled scripts (`index.html:406-407`, `:467`, `:696`) change in the same commit (dc 2.16); de-conflict with app-a11y-02's FIND strings.
**Accept.** runner fails on any count mismatch; patched files parse (`node --check`); Playwright smoke (Help opens, toolbar names, Tools sheet at 375 px); bundle `copy_lint` hits fall by the applied rows.
**Moves/risks.** Fit and finish (both devices). The runner dies at cutover, so no S2 row may fall after it.
**Covers.** docs-copy-32, -04, -05, -07, -10/-11 (interim), -02 (fps 97448, 96687); app-a11y-27; app-time 7.13. H7, H9, H10, H3.

#### WP-CONTENT-03 - Data text hygiene (L, 3.0-5.0 d, Tier 1, R2)
**What/why.** Public JSON is printed verbatim by the map, Search, Historian and pages (F2); fixing HTML alone leaves the map wrong.
**Fix.** `tools/normalise_data.mjs` reads lossless `data-src/`, writes public JSON via the D-ORDER data-pack/hashed-name mechanism (never in-place edits of `/data/*`; if that is late, this WP slips). **Overlap, one implementation:** rules 1-2 and the engine-field strip are the same work as chapter 13's WP-DATA-17 (normaliser, `authoring` vs `published` schema classes, banned tokens) and its value-only compat drop WP-DATA-09; WP-DATA-17 owns the code, this WP owns `phrases.json`, the copy rules and the golden snapshot. Chapter 13 section 9 item 5 allows value-only edits to the legacy file names (one atomic deploy, <= 1 h skew, never in Tranche 0); new shapes go to hashed `/data/v2/` packs; do not build two pipelines (chapter 15 RM-32/RM-38). Rules (dc 2.10): ` -- ` to spaced em dash; ranges to en dash; KIA/WIA to killed/wounded; `approximately` to `about`; clocks to `H:MM AM/PM` (interim); ALL-CAPS via a curated, owner-reviewed `phrases.json` (57 phrases; never algorithmic). **Apostrophes:** identity fields (`designation`, `name`, `title`, `commander.name`, terrain names) stay ASCII in data and are curled at render time by pages we control; only prose fields are curled; every page matcher folds both sides before `includes()`; minified in-app matchers (98768, 98798) stay ASCII until rebuild. **Alias:** delete `U-14BK` (`union_regiments_i_ii_corps.json:26`) and its id at `union_oob_brigades.json:14`; add `oob/aliases.json` for search keys and old links (465 regiments + 104 batteries = 569 units; `C-McClanahan-ART` moves to the battery list, chapter 13 WP-DATA-06/07). Strip only engine fields (`flag`, `flag_note(s)`, `engine_note`, `metadata.chunk`, `tick_formula`); KEEP `units_involved`. `check_ids.mjs`: every `regiment_ids`, `parent_*_id`, `units_featured`, `unit_id` resolves. Emit `display_name`, `brigade_name`, `corps_name` and the four dashboard `display` blocks.
**Accept.** `copy_lint` over public JSON = 0 for DASH/KIA/ALLCAPS/TIMEFMT/IDLEAK; 50-string golden snapshot; Search finds "Sickles", "Culp's Hill", "Culp’s Hill", "14th Brooklyn"; 0 dangling ids; DOM grep `\b[UC]-[IVX0-9A-Z-]+\b` = 0.
**Moves/risks.** Historical consistency C- to B+. Meaning changes (curated map, lossless source); matcher regressions (golden searches).
**Covers.** docs-copy-06, -02 (data), -09; data-integrity-20, -28, -08; pagesA-17, -21; pagesB-45; pages-C-66. H7, C7.

### 4.2 The five systems

#### WP-CONTENT-04 - `facts.json` and `check_facts` (M-L, 1.5-2.5 d, Tier 1, R2)
**What/why.** One count is typed in up to seven places and they disagree (F3, F4).
**Fix.** `tools/build_facts.mjs` writes `dist/facts.json` (Appendix C; qa-ci's `counts.json`/`claims.json` are the same family, one generator). Consumers: Astro `{{facts.x}}`, pre-Astro pages via `data-fact` hydration, JSON-LD/manifest at build, Help/About (lazy fetch), guide, Historian. It carries `casualty_bases`, no `minutes_per_tick` (contradicts D-TIME). `check_facts.mjs` scans built HTML, JS literals, JSON and PDF text for `\d[\d,]*\s+(regiments|batteries|stories|events|stops|monuments|tools|moments)` and fails on values not in the file (allow-list needs a reason). R1 interim: run once, paste numbers with `<!-- fact:x -->` markers.
**Accept.** change one record count and every surface changes at next build; `check_facts` fails on a typed number; DV-11/DV-23 green.
**Moves/risks.** Consistency, Documentation. "Tracked" wording needs V4.
**Covers.** docs-copy-08 (counts); data-integrity-09; app-bugs-15; qa DV-23. H10, H11.

#### WP-CONTENT-05 - `features.json`, `glossary.json`, parity gate (L, 3.0-4.5 d static half, Tier 1, R2 and S2)
**What/why.** Five hand-typed shortcut lists plus the PDF; tool names in 7 places; 8 of 11 disposition colours differ between map `Lp` (96306-96318) and legend/unit panel (99385-99413, 98090-98105) [S dc 3.2a].
**Fix.** `features.json`: `hotkeys[{id,keys,label,section,scope,exists}]`, `dispositions[11 incl. Line of March {label,gloss,color,cue}]`, `tools[...]`, `extras.groups[{name,tagline,items[{id,href,label,icon,desc,tier,status}]}]`; `glossary.json` (11 terms, dc 6.5). `status` (`shipped|beta|labs-hidden|retired`) makes D-SCOPE-TIERS retirement a manifest flip across nav, sitemap, guide, FAQ, Help, Press. Consumers: `site-nav.js` GROUPS (`:12-58`, already one source for 27 pages), Help, tooltips, guide, `index.html` SEO nav (18 of 20 today), sitemap. `check_parity.mjs`: manifest vs registry vs built text; a hotkey without handler fails; every tool reachable from toolbar or Tools sheet; legend colours equal drawn colours (needs app). The app half (map, legend, unit panel reading one table) is a rebuild item, XL under N1 [S]; T0 only aligns colours by design decision.
**Accept.** a new manifest hotkey updates Help, Quick Reference, tooltips and guide with no other edit; a hotkey with no handler fails CI; 11 swatches equal drawn colours (after the app half).
**Moves/risks.** Documentation B to A, Usability. App half depends on rebuild timing.
**Covers.** docs-copy-16, -05, -07, -12 (tables); ux-flows-17, -20; app-a11y-06; data-integrity-30. D4, H6, H10, G1.

#### WP-CONTENT-06 - Style guide, catalogue, disclaimers, Vale, `copy_lint` (L, 2.5-4.0 d, Tier 1, R1 warn then R2 error)
**What/why.** No style guide exists; 356 hits recur unless a machine blocks them.
**Fix.** (1) Commit `docs/STYLEGUIDE.md` = dc section 6 amended: title `{Page} | Gettysburg Interactive Map` (D-NAME); "High Ground" (D-VIEWSHED); first person only on About/Corrections/FAQ; role addresses (D-CONTACT); `4:30 PM` (prose may say "about 4 PM"; data-driven text never bare hours); `about`, never `~`/`c.`. (2) `content/copy/en-US.json` (ICU plurals, `{facts.x}`) + `disclaimers.json` (Appendix B). (3) `.vale.ini` + `styles/Gettysburg/{Dashes,Times,Terms,NoAI,DevSpeak}.yml` (dc 6.16); `Times.yml` lists case forms explicitly (`\d{1,2}:\d{2}(?:am|pm|AM|PM)`, `\d{1,2}:\d{2}\s?(?:am|pm|a\.m\.|p\.m\.)`); `NoAI.yml` allows "AI" only in `historian.ai_explain.*` if gate G-X opens. (4) `tools/copy_lint.mjs`: port of `inventory.py` (18 rules) plus DEVLOG tokens (`build plan`, `compiled bundle`, `no source project`, `proof of concept`, `YouTube vignette`, `alias for`, `TODO`), `gmail.com` in shipped text, `Reviewed` without a decision id, HTML comments except licence, quotation allow-list (reason + owner), reading level via `textstat`. (5) ESLint `react/jsx-no-literals` once source exists; PR template + release copy checklist. CI: facts > check_facts > copy_lint > Vale; warning mode one sprint, then error.
**Accept.** deploy tree 356 to 0 after WP-01/02/03; one fixture per rule fires (including the `unit-rendering-reference` diary the scan missed); a bad string in a PR fails CI.
**Moves/risks.** Documentation, Fit and finish. False positives in quotations (allow-list); rule drift (fixtures).
**Covers.** docs-copy-26, -30; seo-growth-34; pagesB-10; pages-C-12; data-integrity-20; qa SL-20/27. H7, G1.

### 4.3 Names, claims, numbers, clock

#### WP-CONTENT-07 - Canonical names, titles, descriptions, social copy (M, 1.0-2.0 d, Tier 1, S2)
**What/why.** D-NAME approves "Gettysburg Interactive Map"; F10 lists the drift.
**Fix.** In ONE identity deploy (redirect matrix green): apply Appendix D via `features.json` to nav, H1, `<title>`, JSON-LD (`WebSite.name` + transitional `alternateName`), manifest (`name` "Gettysburg Interactive Map", `short_name` "Gettysburg Map", description; the same reading of D-NAME as chapter 10 s.9 item 6, so one brand string), footer, guide, Help and every `S2` row of WP-02. The same table is WP-SEO-08 (one S2 deploy, count once: chapter 15 RM-25). Titles `{Page} | Gettysburg Interactive Map` <= 60; descriptions 120-155 on Index pages (chapter 10 TA-04) and 70-160 on noindex tool pages, all unique; `og:description` = description; `og:image:alt`; JSON-LD from the same catalogue entry; SEO nav block generated (20 tools). Reuse the 21 pairs of dc 2.13 (`seo_replacements.json`, re-measured 44-58 / 79-159) with two edits: separator `|`; viewshed becomes "High Ground: Battlefield Vantage Points" / "Elevation of 30 landmarks, ranked. Line-of-sight maps are not shown." Home title: DC-1. Footer: D-AFFIL (owner confirms true). Keep "Ask the Historian".
**Accept.** `grep -ri "animated battlefield map"` finds only `alternateName` and the changelog; "minute by minute" 0; lengths asserted; H1 = nav label; SL-27; pre/post dashboards recorded.
**Moves/risks.** SEO A- to A. Serialised identity train; old names lingering in the bundle (WP-02 S2 rows ship together).
**Covers.** docs-copy-05, -29; seo-growth-04, -05 (wording), -25 (overclaims); ux-flows-16; pagesA-08, -41; pagesB-34; qa SL-27. E2, H8, T1.

#### WP-CONTENT-08 - Headline-figure and quotation adjudication (M, 1.0-2.0 d + 6-10 reviewer h, Tier 1, R2)
**What/why.** New pages must not repeat unadjudicated numbers: 26th NC "714 of 800" (100756) vs data "588 of 843" and the "greatest loss percentage" claim (100734); Iverson "nearly 500" (100093) vs 232 (100778, 100800); three casualty bases (F4); Avery (100811); Lincoln "We had them within our grasp" (100317); Alexander's messages (ticks 525/530, UNVERIFIED-QUOTE); Gottfried year.
**Fix.** `data-src/authorities.json` + `decisions.jsonl` (id, value, basis, citation, reviewer, date). (1) One basis per page; wording is chapter 13's Q-DATA-2 default ("about 46,000 (23,049 Union per the Official Records; roughly 23,000 Confederate per Busey and Martin); estimates run to 51,000", chapter 15 OD-17), not this chapter's earlier proposal to lead with "about 51,000 (NPS 23,049 + 28,063)", which adds an Official Records figure to an estimate (chapter 13 WP-DATA-08); the engagement-period sum of 46,163 stays the dashboard basis. Historian decides I Corps (6,059 vs 6,394) and Confederate cavalry (583 vs 483). (2) 26th NC and the "highest loss" title: one figure; `b46/b47` follow. (3) Iverson: say who and how many. (4) Quotations: `cite {author, work, page|date}` + `status` recorded | recalled | attributed; copy says "wrote", "recalled", "is said to have said"; unverified quotations are not published; `check_quotes.mjs` fails a text with a quote-mark pair and no `cite`. (5) `terrain.json` Gottfried to 2007. (6) 165,000 stays with NPS citation; "512 of about 1,328 monuments" + selection rule. Seeds WP-14's register.
**Accept.** each item has a decision record and one value everywhere (grep of data, bundle, pages, guide); `check_quotes` 0.
**Moves/risks.** Historical consistency, trust. No reviewer: publish the range with both sources, label "Unreviewed", never pick.
**Covers.** docs-copy-33, -08 (G3-G5, G10), -01 (totals), -27 (quotes); pages-C-76; data-integrity-03, -29. C4, H10.

#### WP-CONTENT-09 - Clock, "real time", "tick" copy (M, 1.0-2.0 d, Tier 1, R1 stage A; stage B after DG-3)
**What/why.** 10 "real time" claims (Immersive, Watch Together are true), 69 "tick", four clock formats, "675 five-minute snapshots"; after D-TIME the clock is piecewise (0.83-42.3 min/moment) so "five-minute" is false in general.
**Fix.** **A (R1):** `1x (real time)` to `1x` + tooltip; "Tick N/675" to "Moment N of 675"; "tick" out of static-page body copy; `am (next day)` removed (`compare.html:128`); "minute by minute" out of `living-ledger.html` body and `terms.html:30`; sandbox labels (`:104-106`) to "Day 2, moment 260" (they contradict the data). **B (after D-TIME):** one `formatMoment()` from `time_anchors.json` (local mean time, "about" when sigma >= 10 min, first-light day tabs) feeds every clock string; "About the clock" panel + D-CLOCK (mean error 21 min, median 10, 86 of 102 within 30 [S time-facts]); guide examples; sandbox labels from the registry. Held until signed: hour pages, Historian clock strings, dated OG eyebrow, guide clock text; no reviewer by DG-3: "approximate time" + "Unreviewed reconstruction".
**Accept.** `copy_lint` REALTIME/TICKJARGON/TIMEFMT = 0; one moment shows one clock string on toolbar, event card, Ledger, Compare, guide example.
**Moves/risks.** Consistency, Usability. Stage A strings are interim; D-CLOCK wording provisional.
**Covers.** docs-copy-04, -12 (rows 5-7); app-time 7.13; pagesB-15, -28; pages-C-31, -76, -77; ux-flows-24. C4, H9.

### 4.4 The user guide (G1)

#### WP-CONTENT-10 - Guide content: truth audit and v2 structure (L, 2.0-3.0 d, Tier 2, R2)
**What/why.** 32 claims audited: 3 REMOVE, 8 wrong today, 7 conditional, 14 true [S dc 3.2]. E.g. `H` heatmap flips a flag nothing reads (112930, 112938, 113022); "Find Unit / Location" = Search (113213-113218); Esc "closes any panel"; "Street View panoramas" (opens Google Maps, 102034); a PDF-download row documents a header workaround; 8 of 11 legend colours differ from the map.
**Fix.** Rewrite from dc 3.2 with K2 applied. Each claim is a `claims.json` row `{id, statement, evidence_ref, verify, status: now|after:<id>}`; NOW rows first, AFTER rows as sibling fixes ship. Structure dc 3.3 (14 sections incl. "About the clock", 20 tools from the manifest, 12 corrected troubleshooting rows). Deleted by decision: heatmap (D-HEATMAP), sound (D-SOUND), Find Unit row, PDF-download row. Disposition table from the manifest (11 rows incl. Line of March, swatch + name + non-colour cue; it prints the colours the map draws until unified). No screenshots of the live map (D-MEDIA): annotated own-vector figures with alt text, or none. "Copy link" only after D-URLSTATE ships. Interim: the deployed PDF keeps false claims until v2; move the guide link into Help and list known differences under Known issues (WP-20).
**Accept.** a tester follows the guide end to end on desktop and phone and every sentence is true; `claims.json` all pass; `check_parity` green.
**Moves/risks.** Documentation B to A+. AFTER rows need app fixes (app-bugs-09/11/13/23/24/26/27); overlay order unobserved (V2).
**Covers.** docs-copy-12, -10, -07, -16; qa DOC-07; app-bugs-09, -11, -13, -23, -24, -26, -27. G1, D4, H8, H13.

#### WP-CONTENT-11 - Guide generator, PDF/UA, layout, delivery, gates (L-XL, 4.0-6.0 d incl. 0.5 d spike, Tier 2, R2-R3)
**What/why.** No generator exists; ReportLab OSS 5.0.1 has title/lang/outline APIs but no tagging API (`pdfdoc.py:1030-1031` empty slots [S]); the PDF cannot be reproduced or tagged. Defects: dc 3.1.
**Fix.** (a) HTML-first: `/guide` is an Astro page (D-SITEGEN) from `content/guide/*.md` + manifests; the PDF prints the built HTML. (b) Spike S-1 (0.5 d, readout DG-2): WeasyPrint (`pdf_variant='pdf/ua-1'`, v57+ experimental, Pango only) vs Playwright `page.pdf({tagged:true,outline:true,preferCSSPageSize:true})` (>= 1.42). Rule: first engine passing veraPDF `--flavour ua1` with 0 failures AND NVDA/Acrobat/PAC reading order AND the gates; tie to WeasyPrint (deterministic, CI-only). Fallbacks: pikepdf hand-tagging (XL, unplanned) or accessible HTML as primary with the PDF labelled "tagged, not certified". (c) Layout dc 3.5 (`break-after: avoid`, splittable tables, white print theme, body 10.5-11 pt, Letter + A4). (d) Tags/metadata dc 3.6 (`/Lang`, `/MarkInfo`, structure tree, `DisplayDocTitle`, title "Gettysburg Interactive Map: User Guide", author "Mike Legere", XMP `pdfuaid:part=1`, outline, fonts embedded: Spectral 400/700 OFL per D-DESIGN; Inter PDF-only if needed). (e) Delivery: `Content-Disposition: inline` + `Content-Language` (`netlify.toml:201-204`, generated headers), drop `download` (113116) and the toolbar link (113132), footer label "User Guide", versioned `...-v2.0.pdf` + stable alias, `SOURCE_DATE_EPOCH`, `/guide` in sitemap. (f) Gates: X-05 via extended `pdf_lint.py --strict`, veraPDF, `lychee`, `claims.json` parity, `copy_lint` on the text layer, manual reading-order log. (g) Generator, templates, fonts committed (N1).
**Accept.** clean clone `npm run docs` builds `guide/index.html` + PDF; second run identical text layer; removing a manifest tool breaks the build; all gates green; iOS Safari and Android Chrome open it in-tab at 375 px, legible.
**Moves/risks.** Documentation to A+, Accessibility. Engine may fail UA-1; WeasyPrint flags unverified (V1); ship font licences.
**Covers.** docs-copy-13, -14, -15, -12; app-a11y-34 (PDF); qa DOC-01..06; ux-flows-17. G1, N1.

### 4.5 In-app Help, microcopy, alt text

#### WP-CONTENT-12 - In-app Help, About, sources list, onboarding copy (M-L, 1.5-2.5 d, Tier 1, R1 interim, final at C)
**What/why.** Help chunk `helpmodal-cfv9t0zh.js`: "445+", "ticks", "Primary Sources" over 9 works (2 primary), dead heatmap row, "Dismiss panel / deselect unit", "51,000", unlabeled close glyph, no touch content, 1-2 s late (D1) [S dc 5.1].
**Fix.** R1 via WP-02: interim counts (WP-04), "Main sources" grouped Primary / Secondary + "See all N sources" to `/sources`, heatmap row deleted, Esc row per app-bugs-09, dedication "In memory of the soldiers killed, wounded, captured or missing at Gettysburg, July 1-3, 1863." (no headline number until Q-DATA-2 is decided, DG-1; a number then comes from `facts.json`), close `aria-label`. Final: tabs `Start here`, `Shortcuts` (touch users see gestures), `About and sources`, `Report a problem`, a link row to the trust pages, version line from `version.json`, rows from `features.json`, chunk preloaded on idle (perf owns 300 ms). Under D-ENTRY the chooser, splash and archetype cards vanish: dc 5.3 rows O1-O3, O6 `OBSOLETE`; O4, O5, O7-O12 survive with device-aware hints (touch "Tap Play to begin", "Pinch to zoom"; keyboard hints only with a hardware keyboard); no "settings menu" (none exists, 102815).
**Accept.** Help rows = manifest; About counts = `facts.json`; no heatmap/sound row; every row has a handler; axe on the dialog; phone emulation shows no Space/S/? text.
**Moves/risks.** Usability, Documentation. Interim strings die at rebuild.
**Covers.** docs-copy-10, -11, -07; ux-flows-17, -20; app-a11y-13, -27. H3, H10, D1, D4.

#### WP-CONTENT-13 - Microcopy, states, alt text, reading-level gate, landing copy (M, 1.0-1.5 d, Tier 1, R2 and S3)
**What/why.** Nine loading strings, raw-path errors, "(no note)", unlabeled glyphs; no alt-text rule; no reading-level gate.
**Fix.** Catalogue rows for loading/empty/error/offline/permission/success/destructive/toast (dc 6.12) and the 12 StateCard variants (ux-flows 5.11): loading "Loading the battlefield…"; error "{Thing} couldn't be loaded. Check your connection and reload the page." + Reload; unsupported "This needs WebGL..." (routes to the Text route); toasts one line, >= 5 s pauseable, max 3. Alt-text rules (Appendix E) via axe `image-alt` + a custom check. Reading-level gate in `copy_lint`: FK median <= 8.0 (p95 <= 10), sentences <= 20 words, hints <= 16, errors <= 2 sentences. Landing/poster copy `landing.*` (D-ENTRY, D-ROOT): one H1, buttons "Watch Pickett's Charge in 20 seconds", "Explore the map", "Ask a question", "Read as text", welcome card, >= 250 raw-HTML words (SEO chapter builds the page); Text-route intro (app-a11y-12).
**Accept.** network blocked: every data page shows the specified error + Reload at 320 and 1280 px; axe status-message pass; every `og:image` has alt.
**Moves/risks.** Fit and finish, Accessibility. FK misfires on ordinals/names: mask proper nouns, re-baseline (V11).
**Covers.** docs-copy-30; ux-flows-11, -12, -15; app-a11y-11, -14, -28; pages-C-04, -17, -85; pagesA-14; pagesB-03. H4, D2, A5.

### 4.6 Trust pages

Common contract: shared shell, one `<h1>`, `<main>`, <= 30 KB, extensionless URL (D-URL), JSON-LD, sitemap, print CSS, axe 0; numbers from `facts.json`, citations from `sources.yaml`, disclaimers by id; footer groups Learn / About / Legal / Help in raw HTML (not JS-injected, pagesA-05). Owners: **About**, **Contact**, `security.txt`: owner writes; **Sources**, **Corrections**, **FAQ**, **Glossary**, **Changelog**: AI drafts from data, owner sets promises, reviewer checks claims; **Accessibility**: AI drafts, a11y evaluator confirms; **Press**: AI drafts, owner approves; **Teach**, **Students**: AI drafts, two teachers and the reviewer sign.

#### WP-CONTENT-14 - Sources and Methods `/sources` and `/method` (L, 3.0-5.0 d + reviewer h, Tier 1, R2 seed, DG-3 final)
**What/why.** Makes authority checkable; replaces Help's 9-work list and Terms' "compiled from published sources". Data metadata already cites 29 strings = 26 works (F3).
**Fix.** Two static pages, `/sources` (bibliography, rights, disagreement register, how to cite) and `/method` (what this is, data layers, clock, positions, casualties, the public `data-quality-report.json`; chapters 10 and 13 link to `/method`), generated from `sources.yaml` (the Historian registry, hist-final-plan hf-01/hf-38; the generator is WP-HIST-02/WP-DATA-04's, this WP authors the pages, `/data-notes` is a 301 to `/corrections#data-versions` per WP-16) plus hand-written method text; R2 seeds the 26 works. Outline (dc 4.1, split across the two pages): what this is and is not (D-RECON); data layers (counts from facts; coverage 217/231/19; 1,804 keyframes on 188 of 675 moments); how the clock works (WP-09; provisional until D-TIME signs) and how positions are estimated; how to read casualties (D-CASUALTY + three bases); disagreement register (seed >= 8: the WP-08 items plus Rodes 2-3 PM, Howard learns of Reynolds's death, Barksdale); bibliography grouped Primary / Reference and secondary / Maps and imagery, each `{author,title,publisher,year,edition,locators[],archive_url,rights_tier,used_for,reviewed_by,verified_at}` (known conflicts: Gottfried 2007/2013; Busey and Martin 1994 vs 2005 [S]); third-party rights (Mapbox attribution restored on 2 maps, USGS, NPS media, Google Maps/Street View, HMDB and Stone Sentinels at 110533/110569 confirm or re-source, Wikipedia share-alike; explain or remove the metadata string "Google Maps / satellite imagery verification"); licence per D-LICENSE (default: code all rights reserved, quote with credit, no open data licence yet); how to cite (APA 7, MLA 9, Chicago; verify); versions, reviewer credit. Linked from every story, unit panel, sub-page footer, Help, guide.
**Accept.** counts = facts; `sources.yaml` valid (DV-24); each entry verified against a catalogue record; in sitemap; axe 0; Lighthouse 100; DV-25 green.
**Moves/risks.** Documentation, trust, E-E-A-T. Rights answers (register action 10) gate the third-party section.
**Covers.** docs-copy-17; seo-growth-25; hist-final-plan hf-01, hf-38; pages-C-83; qa DV-24/25; data-integrity-23; ux-flows-28. G1, T1.

#### WP-CONTENT-15 - Citation permanence (L, 2.0-3.0 d, Tier 1, R3)
**What/why.** Answers and unit cards will cite Internet Archive, LoC, NPS, HMDB; nothing stores archives or alternate locators (critic-2 gap 15), so page-accurate citations rot silently.
**Fix.** `sources.yaml` gains `locators[]` (>= 2 independent hosts per public-domain source: IA + HathiTrust/Google Books/Wikisource/LoC) and `archive_url` (Wayback Save Page Now at ingest, re-captured quarterly) for every external URL cited on unit pages, Historian answers, `/sources`, guide. Extracted PD text of each cited page is published at `/sources/text/<slug>/<page>` (rights tier A only, `noindex,follow`). Nightly `lychee` opens an issue and flips the UI to `archive_url` after 3 failures (`link-status.json`, no-cache). `/sources#id` anchors are permanent (ids never reused; test diffs the last release).
**Accept.** no cited URL without `archive_url`; a simulated IA outage falls back in the UI (Playwright route abort); link check and anchor-freeze tests green.
**Moves/risks.** Trust. Rights gate on mirrored text; Wayback rate limits.
**Covers.** critic-2 gap 15; hist-sources-2-01, -15, -20; hist-eval weekly catalogue check; qa DV-25.

#### WP-CONTENT-16 - Corrections and Report a problem (M-L, 1.5-2.5 d, Tier 1, R2)
**What/why.** The only feedback route is a bare Gmail mailto; no way to report a wrong record; no public log.
**Fix.** `/corrections` (dc 4.2): promise (acknowledge <= 3 days per D-CONTACT and hist-final-plan 4.4; fix or explain <= 30 days, CD-4), what counts, how to report, disagreement policy, log from `corrections.json` `{id,date,where,was,now,source,reviewer,credit_consent}` + Atom `corrections.xml`, "Data versions" section (absorbs hf-38 `/data-notes` via redirect), credits. In-app: Help tab, "Report an error in this record" on unit panel, story panel, event card, sub-page footers, prefilled with URL (deep-link params), moment, unit id, site/data version. Transport per D-CONTACT: form (Netlify Forms or the ingest function) + obfuscated `mailto:corrections@`; until the form ships and WP-24 updates Privacy, a prefilled mailto to the role address; no fingerprint (user agent only if the visitor opts in, D-TELEMETRY). Seed the log with this plan's fixes (C3 date +2, C5 gold trail, chronology `undefined`, alias, casualty basis, 26th NC), each dated and sourced.
**Accept.** opens with URL + version prefilled and nothing else; schema test; >= 10 dated entries; monthly acknowledgement drill logged; no Gmail in shipped HTML (grep).
**Moves/risks.** Trust, Usability. Needs role addresses (WP-DEC-06); Netlify Forms limits unverified (V12).
**Covers.** docs-copy-18; ux-flows-28, -18; data-integrity-25; pages-C-84, -85; seo-growth-25. G1.

#### WP-CONTENT-17 - About, Contact, security.txt, glossary page, site map (M-L, 1.5-2.5 d, Tier 1, R2)
**What/why.** JSON-LD names an author and the app credits "Mike Legere", but there is no About, no role address, no security contact (F7, F9).
**Fix.** `/about`: owner-written blocks marked **[OWNER]** (why, 3-5 sentences; about me, 80-120 words; optional photo with alt), how it was made, credits, reviewer credit, D-AFFIL, `AboutPage` + `Person` JSON-LD; no invented biography. `/contact`: scope, response expectation, role addresses `contact@`, `corrections@`, `security@` (never the personal Gmail, D-CONTACT), form + obfuscated fallback. `/.well-known/security.txt` (RFC 9116) shipped as `well-known/security.txt` + rewrite `/.well-known/* /well-known/:splat 200` to survive dot-folder stripping (infra-netlify-09), `Contact: security@`, `Expires` <= 12 months with a reminder 30 days out. `/glossary` from `glossary.json`; `/site-map` HTML; optional `humans.txt`. Footer "(c) {year} Mike Legere" + licence line per D-LICENSE + non-affiliation; timeline credit becomes "Created by Mike Legere" + Contact link (also C1).
**Accept.** all linked from the raw-HTML footer; JSON-LD valid; `curl /.well-known/security.txt` 200 `text/plain` with future Expires; `gmail.com` 0 in shipped HTML/JS/PDF; owner sign-off on About recorded.
**Moves/risks.** Trust, E-E-A-T. Owner text lead time; role addresses first.
**Covers.** docs-copy-19, -31, -25 (footer); seo-growth-25; pagesA-08; ux-flows-16, -28; infra-netlify-09, -34. E2, X5.

#### WP-CONTENT-18 - FAQ (M, 1.0-1.5 d, Tier 2, R3)
**What/why.** Questions are answered ad hoc in Historian, Terms and guide.
**Fix.** 14 questions from dc 4.4 with corrections: offline "The site needs an internet connection; repeat visits load faster from your browser cache" (K5); "Is Ask the Historian an AI?" only after WP-01 makes it true; privacy from the data inventory (WP-DEC-07); data download "Not yet" (D-LICENSE); ancestors per D-CWSS (link-out); devices per D-BROWSERS; times per anchors after D-TIME. Add: who checked this (reviewer or "Unreviewed"), why coverage of the two armies differs (hist-final-plan coverage note), NPS endorsement (D-AFFIL), classroom use (to `/teach`). The 60-question SEO Q&A hub is the SEO chapter's.
**Accept.** every number from `facts.json`; every yes/no claim in `claims.json`; linked from Help and guide.
**Moves/risks.** Documentation, SEO. Answers rot unless in `claims.json`.
**Covers.** docs-copy-20; seo-growth-23 (boundary). T1.

#### WP-CONTENT-19 - Accessibility statement (M, 1.0-2.0 d, Tier 1, R3 then each release)
**What/why.** No statement exists; A1-A6 failures mean any claim is provisional.
**Fix.** `/accessibility` per W3C WAI structure: commitment; WCAG 2.2 AA; status by area (pages, map, Walkthrough, sub-pages, guide, handouts); known limitations each with an alternative (canvas map to Data View/Text route; third-party NPS captions and Street View; imagery decorative); method with dates and AT/browser versions from app-a11y-33's log; keyboard reference generated from the manifest; feedback (role address, 3-day acknowledgement, CD-4; app-a11y-34's 2 days is superseded); review date. Status "Partially conforms to WCAG 2.2 Level AA" until D-EVIDENCE (a); ACR (VPAT 2.5) from the log after the audit; `copy_lint` bans "fully conforms" without an evidence link.
**Accept.** statement matches the latest audit; `Last reviewed` <= 100 days (CI); contact path works.
**Moves/risks.** Accessibility, trust. Over-claiming is the risk.
**Covers.** docs-copy-21; app-a11y-34; D-LEGAL step 4. A6.

#### WP-CONTENT-20 - Changelog, `version.json`, Known issues (S-M, 0.5 d, Tier 2, R1 seed)
**What/why.** No version anywhere; Privacy/Terms dates hand-typed (`privacy.html:21`); limitations leak into page copy.
**Fix.** `/changelog` (Added/Changed/Fixed/Data/Known issues; CalVer `2026.11.0`; user-facing sentences), `version.json` (`{site,data,built}`, no-cache, stamped by CI), Atom `changelog.xml`, footer "v2026.11.0", Help version line, Privacy/Terms dates from the build. Known issues holds limitations, never page copy. Seed with Phase 0 fixes; data history lives in `/corrections#data-versions`.
**Accept.** footer = `version.json` = PDF footer = top entry (DOC-06); feed validates; PR template blocks a user-visible change without an entry.
**Moves/risks.** Documentation, trust.
**Covers.** docs-copy-22; data-integrity-25; qa DOC-06.

#### WP-CONTENT-21 - Press and Embed kit (M, 1.0-2.0 d, Tier 2, S4)
**What/why.** Terms invite embedding (`terms.html:27`) but `embed.html` has no docs and conflicting headers (X4).
**Fix.** `/press`: 50/150-word descriptions (catalogue), key facts (facts), brand (gold `#c9a24b`, ink `#0a0a14`, Spectral), attribution "Gettysburg Interactive Map by Mike Legere", re-use terms per D-LICENSE, how to cite, contact. **No Mapbox screenshots or captures** (D-MEDIA): own-vector art and logos with alt and credit. Embed generator: pick one of 24 stories; snippet `<iframe src="https://gettysburginteractivemap.com/embed?vignette=V-017" title="Gettysburg Interactive Map: The Cannonade" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" width="640" height="400">` (title generated from the story id so they cannot mismatch); say it is a text card, not a map; visible attribution link outside the iframe; oEmbed (seo-growth-32). Only `/embed` is frameable (X4).
**Accept.** snippet renders the requested story cross-origin in Chrome, Firefox, Safari; title/id test; Terms clause matches; an educator embeds it in Google Sites within 5 minutes (pages-C-88).
**Moves/risks.** Trust, SEO links. Depends on the X4 header fix and D-MEDIA.
**Covers.** docs-copy-23; pages-C-88, -89; seo-growth-32; ux-flows-06 (embed). X4, T1.

### 4.7 Teachers, Students, inclusive history, repo docs, evidence

#### WP-CONTENT-22 - Teach hub, lessons, handouts, IT-admin page (L-XL, 4.0-6.0 d content only, Tier 2, S4)
**What/why.** No teacher surface; Privacy says the site is often used in classrooms (`privacy.html:41`); ux-flows-13 is XL (8-15 d incl. Classroom/Present modes, owned by the app/UX chapters).
**Fix.** `/teach`: 60-second start; 3 launch lessons on features that survive D-SCOPE-TIERS (Compare, Camera, Turning Points, Dashboard; Labs excluded): (1) Reading a battle from maps (45 min), (2) Decisions at Gettysburg (Turning Points with sources), (3) Casualties as data (define "casualty", why totals differ); three later lessons (Find a Regiment; Primary sources on the field; The battle in 60 minutes). Each: time, objectives, materials, steps naming `features.json` ids, focus questions, vocabulary, one-page tagged handout (WP-11 pipeline), assessment, differentiation, the WP-25 context block. Standards are candidates until a teacher reviews them, never claimed before: C3 D2.His.14/16 (UNVERIFIED), CCSS RH.6-8.7 (visual information incl. maps), RH.9-10.7 (quantitative/technical analysis, fits the casualty lesson) [S]. `/teach/it-admin` from a HAR of a full session, not the incomplete CSP (D-SCHOOLS): must include `cdn.jsdelivr.net`, `0.peerjs.com`, `events.mapbox.com`, the RUM host `ingesteer.services-prod.nsvcs.net`, Google Maps/Street View hosts, NPS. School privacy statement matches Privacy. Classroom copy "Third-party content is off. Turn it on for Street View and NPS video."; sensitive passages collapsed with a teacher toggle. URL naming: DC-4 (`/teach` teachers, `/learn` students), adopted by chapter 10 WP-SEO-24, which owns only templates, `LearningResource` JSON-LD, Classroom share links and indexing; the lesson text is budgeted here only (chapter 15 RM-83).
**Accept.** each lesson has objectives, materials, timing, assessment; steps use only shipped `features.json` ids (parity); handouts pass PDF gates; >= 2 teacher reviews recorded; IT-admin list equals the HAR; 4 of 5 teachers find a lesson in <= 180 s (ux-flows T6).
**Moves/risks.** Concept/content depth to A+. Teacher availability; pagesB-23 is UNVERIFIABLE (verify first).
**Covers.** docs-copy-24; ux-flows-13 (content); seo-growth-31; pagesB-23; critic-2 gap 7. G1, T1.

#### WP-CONTENT-23 - Students edition and reading-level rewrite (L, 3.0-5.0 d, Tier 2, S4)
**What/why.** `education.html` renders `panel_summary` (median FK 10.9-11.2, 21 of 24 above grade 8) under "A simple guide"; blue palette clashes; `DAY_INTRO` "both armies were at full strength" is contestable (`education.html:58-62`) [S pagesB-21].
**Fix.** Author `student_summary` (<= 60 words, target grade 5-7, FK <= 8.0 by `textstat` with proper nouns masked) for 24 stories, `student_intro` for 3 days, "Why it matters" and glossary chips, with `reviewed_by`; keep the 3 summaries already <= 8; Simple/Detailed toggle (Detailed = `full_script`, about grade 7.1-7.4); default theme and 18 px body (D-DESIGN); unique link text ("See The Railroad Cut on the map"); cause-of-war context (WP-25). Five non-author readers confirm comprehension.
**Accept.** every `student_summary` <= 8.0 and <= 60 words (median <= 7.0); `reviewed_by` or "Unreviewed" badge; teacher sign-off; axe 0; JS-on/off text equal (prerender: pages chapter).
**Moves/risks.** Concept/content depth, Accessibility. Reviewer/teacher time.
**Covers.** pagesB-20, -21, -22, -23; ux-flows-13 (student edition); seo-growth-31. D-SCHOOLS.

#### WP-CONTENT-24 - Privacy and Terms wording, footer identity, generated dates (S-M, 0.5-1.0 d, Tier 1, R2)
**What/why.** Facts (Street View placement, PeerJS/STUN/jsDelivr, Mapbox telemetry, AR permissions, Netlify logs) belong to WP-DEC-07/08 and the legal chapter; this WP owns wording.
**Fix.** Neutral voice (no "we", dc 2.12 J1); `Last updated` from the build (`<time datetime>`); storage-key table (`gettysburg_bookmarks`, `gtbg_onboarded`, `gtbg-ef-hidden`, `gtbg_watch_together_tour`, layout key, Mapbox `eventData`, SW caches); Terms sections: non-affiliation, third-party terms (Mapbox, Google, NPS, PeerJS), citation/attribution, AR safety (pages-C-84, NOT_VERIFIED); embed clause matches WP-21 and X4; "collects no personal information" becomes "no accounts and no advertising; the host logs IP addresses"; footer links Accessibility and Sources. Warranty, liability and governing-law text is not written by AI: flag for counsel (D-LEGAL step 3).
**Accept.** scripted diff of a full-session network log and storage keys against the pages (ORG-01, SL-18/19; not against the CSP, which still lists unused font hosts [S]); dates = build; "we" banned.
**Moves/risks.** Privacy/legal B+ to A. Wording that reads as legal advice.
**Covers.** docs-copy-25; pages-C-81, -82, -83, -84; infra-netlify-36, -37, -38 (copy side); seo-growth-26. X5, X4.

#### WP-CONTENT-25 - Inclusive-history content (L, 3.0-5.0 d + 10-20 reviewer h [E], Tier 1 minimum / Tier 2, after DG-2)
**What/why.** 0 mentions of slavery, enslaved people, emancipation, free Black residents or civilians (F8), yet Students and Aftermath explain the battle without the cause of the war; a museum-grade site and a classroom tool cannot omit it. Editorial decision CD-2 (default include); the historian signs.
**Fix.** Each item sourced and reviewer-signed: (i) "Why they fought" panel (150-250 words) for Students, Teach, Aftermath, Help "About the battle": secession, slavery as central cause as stated in primary documents, the Emancipation Proclamation (January 1, 1863), the Address ("a new birth of freedom", already in Walkthrough stop 16); the reviewer picks the primary-source quotes. (ii) Story "Gettysburg's Black residents and the invasion". (iii) Story "Civilians in the town" (Jennie Wade 110600; John Burns 105057). (iv) Aftermath: the wounded, the town, the Soldiers' National Cemetery. Candidate sources (UNVERIFIED until the reviewer checks them): NPS Gettysburg NMP pages on African Americans and civilians; Creighton, *The Colors of Courage* (2005); Boritt (ed.), *The Gettysburg Nobody Knows* (1997); Slade and Alexander, *Firestorm at Gettysburg: Civilian Voices* (2000). Language (dc 6.14): "enslaved people", capital "Black", period language only in quotations with D-SENSITIVE; flags `period_racial_language`, `graphic_injury`, `human_remains`; Explore shows a note and hide toggle, Classroom collapses (D-SCHOOLS). Add terms to the gazetteer so "why was the war fought" cites or abstains, never "Archer Captured" (HC-07).
**Accept.** topic terms appear in Students, Aftermath, Teach with citations in `sources.yaml`; reviewer sign-off in `decisions.jsonl`; toggles work at 320 and 1280 px; Historian golden queries for the three topics cite sources (HC-06). No reviewer: publish only the primary-document panel, labelled "Unreviewed".
**Moves/risks.** Concept/content depth to A+. Tonal or factual error (the reviewer is the control); scope creep.
**Covers.** docs-copy-27, -24 (context); critic-2 gaps 7, 13; pagesB-21, -24; hist-final-plan 10.2 #13. D-SCHOOLS.

#### WP-CONTENT-26 - Repo docs and shipped-comment strip (M, 1.0-2.0 d, Tier 2, R0 for `index.html`, C for the bundle)
**What/why.** No README/ARCHITECTURE/DATA-DICTIONARY/RELEASE/adr in any source tree (N1); 21.6-24.1 KB of developer comments ship (F11).
**Fix.** Content-owned docs: `README.md`, `docs/STYLEGUIDE.md` (WP-06), `docs/RELEASE.md`, `docs/DATA-DICTIONARY.md` (with the data chapter), `docs/retired.md` (D-SCOPE-TIERS), `docs/media-rights.csv` (D-MEDIA); ADRs (WP-DEC-17), BROWSERS, data-inventory and runbooks are cited, not rewritten. Comments: static pages by one-off script; `index.html` in R0's own edit (128 lines, 10.5 KB); bundle at rebuild via `terser --comments false` keeping licence headers; rationale moves to `docs/adr/`; `copy_lint` rule COMMENTS.
**Accept.** `<!--` count 0 in built HTML except licences; a fresh contributor runs `npm run docs` from the README; `docs/` link check green.
**Moves/risks.** Documentation, Performance (HTML <= 14 KB).
**Covers.** docs-copy-28, -31 (repo docs); qa-ci-26; data-integrity-25. P4, N1.

#### WP-CONTENT-27 - Documentation and voice evidence pack (M-L, 1.5-2.5 d + external cost [U], Tier 1, DG-4)
**What/why.** Every grade comes from the owner-plus-AI toolchain; an honest A+ needs a non-author artefact (critic-2 gap 14, D-EVIDENCE).
**Fix.** Collect: independent PDF/UA + AT check of the guide and one handout (veraPDF report + a human screen-reader read); outside copy edit of about 15 key strings and the trust pages; 5 non-author readers (teachers, students) on Students, Help and Sources, task success >= 90%; reviewer sign-off of bibliography and disagreement register; dated `docs/evidence/` linked from Sources and the Accessibility statement. Documentation stays capped A- until the scorecard runs >= 6 documentation gates (DOC-01..07, trust-page presence, claims parity, reading level, sources verification).
**Accept.** dossier exists with dates; each scorecard row for X-01..X-12 cites one non-author artefact.
**Moves/risks.** Documentation A- to A+. External costs and volunteers unverified.
**Covers.** critic-2 gap 14; D-EVIDENCE; qa-ci 9; ux-flows-22 (UNVERIFIABLE; verify first).


## 5. In-domain sequencing

Binding order (D-ORDER, register 4.1-4.3): S0 archive > R0 mechanism release > R1 > identity trains S1..S4 (>= 4 weeks apart) > cutover C; freezes 2026-11-15..20, 2027-06-25..07-05, 2027-11-15..20. **Calendar rule (review 3):** the dates in this section are the register's floors and latest dates; chapter 15 section 5.1 governs delivery (R0 ships 2026-11-10 at 30 h/week, 2026-12-15 at 15 h/week), and chapter 15 (RM-82/83, path fractions 0 in path L) places guide v2, the Teach hub, the Students edition and inclusive-history content (WP-10, 11, 22, 23, 25) after the L path, keeping only WP-25's reviewer-signed minimum if CD-2 is answered. **Phase 0 = WP-01 + WP-02 `R1` rows + WP-09 stage A** (docs-copy called it one day; the verifier's 2-3 days stands).

| Window | Content work |
|---|---|
| Now to R0 (<= 2026-10-21) | Prepare, do not ship: Phase 0 edits and patch-table triage on a branch; spike S-1 (PDF engine); owner tasks (names, reviewer, role addresses, permission emails). `index.html` comments go in R0's own edit (WP-26). |
| R1 (<= 2026-11-05) | WP-01, WP-02 `R1` rows, WP-09 A, WP-06 warning mode, WP-20 seed. No title/H1/nav/meta/og/manifest/JSON-LD/name change. |
| R2 (late Nov to mid Dec 2026, after S1 so new pages use the final canonical form) | WP-03 (with data pack), 04, 05, 06 (error mode), 08, 10, 13, 14 seed, 16, 17, 24; WP-11 build; role addresses first. Additive pages ship 48 h clear of S-trains. |
| S2 (<= 2026-12-15; may merge with S1) | WP-07 + every `S2` row of WP-02 + WP-05 nav generation, one deploy. |
| DG-2 (2026-11-30), R3 (Jan 2027), S3 (<= 2027-01-26) | PDF engine readout, reviewer named (WP-DEC-10), CD-2 decided; WP-11 release (guide v2), 15, 18, 19; landing copy (WP-13) with the SEO chapter. |
| DG-3 (2027-01-31) | D-TIME and D-LICENSE signed: WP-09 B, WP-14 final, WP-21 terms. |
| S4 (2027-02..04) | WP-21, 22, 23, 25 (before the 2027 anniversary freeze; fall-term 2027 target for Teach). |
| C (<= 2027-05-15), DG-4 (2027-04-30) | String catalogue in code, Help from registry, runner rows deleted, guide v2.1, bundle comments; WP-27 dossier and scorecard claim. |

Critical path: role addresses (WP-DEC-06) > WP-16/17; reviewer (WP-DEC-10) > WP-08/14/25; D-TIME > WP-09 B; WP-04/05/06 > WP-10 > WP-11. Capacity: WIP <= 2; Tier 2 WPs (10, 11, 18, 20-23, 26) stay unscheduled until D-SCOPE-TIERS is answered.

## 6. Owner decisions

Register ADRs needed (defaults in force unless overridden): D-NAME (B, DG-0), D-CONTACT (B), D-HIST-REVIEW (B), D-TIME (B, DG-3), D-LICENSE (B, DG-3), D-LEGAL (B), D-SOUND and D-HEATMAP (B, DG-0: delete the Help/guide rows), D-SCOPE-TIERS (B), D-VIEWSHED, D-ENTRY, D-MEDIA, D-SCHOOLS, D-EVIDENCE. Chapter-local proposals (defaults given):

| ID | Decision | Default | Class / by |
|---|---|---|---|
| CD-1 | Feature and menu names (Appendix D) | adopt until the post-cutover IA (ux-flows 5.8 proposes "Features") | D / DG-1 |
| CD-2 | Publish inclusive-history content (WP-25) and the sensitivity stance | include; note + hide in Explore, collapsed in Classroom | B / DG-2 |
| CD-3 | Guide engine/edition | spike rule; light print edition only; Letter + A4 | D / DG-2 |
| CD-4 | Response promises (Corrections, Accessibility, Contact) | acknowledge <= 3 days, fix or explain <= 30 days | D / DG-1 |
| CD-5 | About text and photo (owner-written, nothing invented) | owner supplies | B for About / before R2 |
| CD-6 | Standards alignment on Teach | only after teacher review | D / DG-3 |
| CD-7 | Hub URLs: `/teach` (teachers) and `/learn` (students), DC-4 | as written | D / DG-2 |
| CD-8 | Reading level: UI <= 8.0; Students <= 8.0 (target grade 5-7); stories 10-12 | as X-09 | D / DG-1 |

## 7. Verification debt ("verify first")

V1 PDF engines (WeasyPrint UA-1 flags/version, Playwright `tagged`, veraPDF, PAC; none run). V2 First-launch overlay order (never observed). V3 Order of Battle modal hierarchy (app-bugs-13 says no, guide yes). V4 How the app draws the 231 brigade-only regiments ("tracked" wording). V5 Mapbox GL 3.24.1 telemetry payload (Privacy). V6 History: 26th NC, Iverson, Avery, Lincoln, Alexander, NPS 23,049/28,063, Gottfried 2007, monuments 1,328. V7 Standards codes C3 D2.His.14/16, CCSS RH.6-8.7/RH.9-10.7. V8 D-CLOCK numbers wait for the signed anchor file. V9 Offline behaviour after the R0 service worker (FAQ #9). V10 Meaning of "Google Maps / satellite imagery verification" in `terrain.json`; rights of HMDB, Stone Sentinels, Wikipedia monument records. V11 Re-baseline reading level with `textstat` (specialists used a heuristic). V12 Netlify Forms limits and pricing. V13 Vale semantics proven by fixtures; re-run `inventory.py` after R1 and close its recall gaps. V14 Non-affiliation sentence is true (owner). V15 NPS video captions. V16 One CI definition of the dash baseline (raw 1,938; non-metadata 1,799; rendered 1,639; subset 1,591): use rendered-field occurrences after normalisation = 0. V17 State of app-bugs-02/05/09 before any AFTER row ships. V18 Bibliographic data of the WP-25 candidate sources. UNVERIFIABLE/NOT_VERIFIED carried here: pagesB-23, ux-flows-22, pages-C-40, -79, -84, hist-current-27.

## 8. Traceability

Each specialist finding id appears in exactly one "Covers" line (docs-copy-01..33 map to WP-01..26; -32 to WP-02, -27 to WP-25 with -08). No REFUTED finding is carried (K2; the 163,000 proposal in K1).

## 9. Decision conflicts

- **DC-1 Home title "The Battle in Five-Minute Steps" (D-NAME) vs D-TIME.** After the time-warp the clock advances 0.83-42.3 min per moment, so "five-minute" is false in general, and S2 (<= 2026-12-15) ships before D-TIME sign-off (DG-3). Recommend `Gettysburg Interactive Map: The Battle, July 1-3, 1863` (dc 2.13) for S2; owner may override at DG-0.
- **DC-2 Report a problem.** D-CONTACT defaults to a form; docs-copy-18 and ux-flows-28 start with mailto. Not a deviation: a prefilled mailto to the role address is the interim until the form ships and WP-24 updates Privacy.
- **DC-3 "Vantage Points" (docs-copy) vs "High Ground" (D-VIEWSHED).** Register wins; dc 2.8/2.13 amended.
- **DC-4 Teacher URLs.** The register uses `/learn` (D-SCOPE-TIERS, D-SCHOOLS) and `/teach` (D-ROOT, `/teach/it-admin`); docs-copy used `/teachers`, seo-growth `/learn`. This chapter: `/teach` for teachers, `/learn` for students; record it as an ADR amendment. Chapter 10 WP-SEO-24 was renamed to match (review 3).
- **DC-8 Effort envelope (review 3).** The register's D-SCOPE-TIERS planning line for Tier-1 docs is 6-10 person-days; this chapter's WPs sum to 48-79 gross (Tier 1 alone: WP-01..09, 12..17, 19, 24, 25, 27 = about 31-53), before de-duplication with WP-HIST-01/33, WP-SEO-08/12, WP-DATA-17/19/22 and WP-DEC-06/07. The gap is the machine-checked copy system, the trust pages, the guide generator and inclusive-history work that the register line did not size. Chapter 15 s.13 item 1 carries the re-total and its cut list (5.8) orders what goes first.
- **DC-5 Casualty headline (review 3).** The earlier proposal to lead with "about 51,000" is superseded by chapter 13 Q-DATA-2 (46,000 headline with the 51,000 estimate as an alternate; chapter 15 OD-17); WP-08 and WP-12 defer to it.
- **DC-6 Unit counts (review 3).** `facts.json` carries 465 regiments + 104 batteries = 569 units and 467 + 103 = 570 records (chapter 13 s.2.1 and chapter 16 row 13), not 466 + 103; DC-1's "five-minute" objection also removes the words from Help/About copy.
- **DC-7 Page split (review 3).** `/sources` and `/method` are one authoring package (chapters 10 and 13 both link `/method`); `/cite` is a section of `/sources`; `/data-notes` is a 301 to `/corrections#data-versions` (chapters 13 WP-DATA-22 and 14 WP-HIST-33 generate into it).

## Appendix A. Replacement strings for the worst offenders

Ship: R1, S2 (identity train), R2 (data pack). Full 64-row bundle table: `tmp-docs-copy/copy_patch_table.json`; longer copy: dc 2.3-2.13.

| # | Location | Current | Replacement | Ship |
|---|---|---|---|---|
| 1 | `viewshed.html:46` | "Earlier drafts of this tool tried..." | "Elevation only. This page ranks the height of 30 places on the field. It is not a line-of-sight map: trees, buildings, fences and gun smoke often decided what a soldier could see." | R1 |
| 2 | `ar.html:56` | "...which we haven't been able to do from here." | "Battlefield AR needs a phone with a camera, GPS and compass, and works best outdoors on the field. Your camera view and location stay on your device; nothing is uploaded." + D-AR (Beta) | R1 |
| 3 | `dashboard.html:261-263`, `:244-248` | "Data note: ... should be reconciled"; card `highest_single_regiment_rate` / `undefined` | delete the footnote code; cards "Most compressed fight, Union", "Most intense half hour, Confederate", "Longest sustained fight", "Highest regimental loss rate" | R1 |
| 4 | `aftermath.html:44` | "...tick-by-tick regimental placement data..." | "This timeline is an overview drawn from published histories. Unlike the battle map, it is not built from unit-by-unit records, so it is less detailed." | R1 |
| 5 | `watch-together.html:64` | "no account or server of ours involved" | "No account is needed and no server stores your session. The connection service is not run by this site, so Live Sync can occasionally be unavailable. Export tour and Import tour always work." | R1 |
| 6 | `search.html:163`, `compare.html:58`, `dashboard.html:69` | "...reads /data/*.json directly - try reloading" | "{Thing} couldn't be loaded. Check your connection and reload the page." + Reload | R1 |
| 7 | `index.html:377` | "an AI-style historian, live sound, AR ... Don't miss them." | R1 "20 more tools are in the Extra Features menu, including search and Ask the Historian."; S2 "More to Explore" | R1/S2 |
| 8 | `site-nav.js:26` | "A search-and-answer assistant built from the map's own records." | "Ask a question and get answers, with sources, from this site's records." | R1 |
| 9 | `historian.html:47-48` | "...not a live AI model ... source link below each answer" | "Ask about a regiment, a commander, a place, or a moment. Answers come only from this site's records ({n} regiments, {n} stories, {n} events, {n} places). This is a search of those records, not an AI." + " Each answer names its source." only once WP-HIST-01 renders a source line in every answer type (the R1 change as written adds "Chronology, Day N" for events; regiment, vignette and place answers need theirs too); otherwise the last sentence is omitted | R1 |
| 10 | `historian.html:186,204` | "I couldn't find...", "I'm ready. Ask me..." | "Nothing in the records matches “{query}”. Try a regiment (1st Minnesota), a place (Devil's Den), or a moment (Pickett's Charge)." / "Ask about a regiment, a commander, a place, or a moment." | R1 |
| 11 | Help chunk | "445+ Union and Confederate units"; "across 675 five-minute ticks" | "{465} regiments and {104} batteries" (facts; chapter 13 s.2.1: `C-McClanahan-ART` is a battery filed as a regiment); "across 675 moments" | R1 |
| 12 | `index.html:15,18,24,32,719,754`, `manifest.json:4` | "467 regiments and batteries ... 675 five-minute snapshots ... real time" | "Follow the Battle of Gettysburg on an interactive map: {569} regiments and batteries across three days, with the stories, commanders and casualties behind them." | S2 |
| 13 | `regiment.html:102` | "...order-of-battle record above is still complete" | "This regiment has no positions of its own in the record. On the map it moves with its brigade. Details above come from the order of battle." | R1 |
| 14 | 97429; 112357 | "1x (real time)"; "Tick 538/675" | "1x" + tooltip "Base playback speed"; "Moment 538 of 675" (clock string after D-TIME) | R1 |
| 15 | 112312-112336; Help col132-403 | "Prev tick (Left)", "Back 1hr", "Advance one tick (5 minutes)", "Advance one hour (12 ticks)", "Jump to July 1, dawn (tick 1)" | "Previous moment (←)", "Back 1 hour (Shift+←)", "Next moment", "Forward about one hour", "Jump to July 1, dawn" | R1 |
| 16 | 56 ` -- ` in HTML/JS/bundle; data 1,938 raw | "July 2-3", "X -- Y", KIA, ALL CAPS, `7:30am` | "July 2–3", "X — Y" (meta/manifest S2); data via WP-03 | R1/S2/R2 |
| 17 | "Gettysburg Animated Battlefield Map" (71) | product name | "Gettysburg Interactive Map" | S2 |
| 18 | menu, page and panel names | "Extra Features", "Find an Ancestor", "Follow Your Ancestor", "What They Could See", "Battle Reports", "Cinematic Export", "NPS Auto Tour" | the Appendix D names ("More to Explore", "Find Your Ancestor", "Follow a Regiment", "High Ground", "Regiment Fact Sheets", "Export a Video", "Guided Battle Tour") | S2 |
| 19 | `search.html:112`, alias row | "Commander unrecorded", "14th Brooklyn (alias for U-84NY)" | omit the segment; alias folded (WP-03) | R1/R2 |
| 20 | 103344-103348 | "Confed" chip | "Confederate" (wraps) | R1 |
| 21 | 98081-82, 99998-100002; 102540-102545; 112625, 112640, 112645, 100767; data 61 KIA | "210 KIA · 88 WIA"; "Gen", "Col", "Lt Col"; "Culps Hill", "Devils Den", "Barlows Knoll", "Picketts Charge" | "210 killed · 88 wounded"; "Brig. Gen.", "Col.", "Lt. Col."; with apostrophes | R1 |

## Appendix B. Standard disclaimers (`disclaimers.json`; exact wording, reuse by id)

The `D-...` keys below (D-RECON, D-CLOCK, D-AFFIL, D-LICENSE-INTERIM, D-HISTORIAN ...) are string ids in `disclaimers.json`, not decision-register ADRs; ADRs of the same shape (D-LICENSE, D-TIME, D-HIST-ARCH) are unrelated. In code and CI the keys are prefixed `dis.` (`dis.recon`, `dis.clock`) so a grep for `D-` finds only ADR references.

D-RECON "Positions are reconstructed from published sources. Where a regiment's exact place at a given time is not recorded, the map shows the best-supported position." · D-CLOCK (provisional until D-TIME) "Times are approximate. Sources can disagree by half an hour or more, and the map plays as a time-lapse." · D-DATA-LIMIT "This site lists regiments, not individual soldiers. To find a soldier by name, search the National Park Service's Soldiers and Sailors System." · D-AR "Beta. Compass accuracy varies by phone, so treat the markers as a guide to direction, not a survey." · D-HISTORIAN "Answers come only from this site's records, not from an AI. Each answer shows its source." · D-AFFIL "This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, the American Battlefield Trust, Mapbox or Google." · D-CASUALTY "Casualties are men killed, wounded, and captured or missing, added together." · D-DISAGREE "Sources disagree here: {a} to {b}. This site uses {c}." · D-BRIGADE (Appendix A row 12) · D-SV "Street View opens in Google Maps in a new tab and is provided by Google." · D-HIGHGROUND and D-OVERVIEW: Appendix A rows 1 and 5 · D-EDU "A reconstruction is a teaching aid, not a primary source. Ask students to check claims against the Sources page." · D-UNREVIEWED "Unreviewed reconstruction: a historian has not yet checked this account." · D-SENSITIVE "This excerpt is a primary source and contains language of its time." · D-LICENSE-INTERIM (counsel first, D-LEGAL) "Text and code are all rights reserved. You may quote short passages with credit and a link." Missing data (omit first): "Not reported" (tooltip "The sources give no figure for this."); "Commander not named in the order of battle."; "No results for “{query}”. Try a regiment, a state, or a commander."

## Appendix C. `facts.json` (computed, never hand-edited)

`regiments` 465, `regiment_records` 467, `aliases` 1, `batteries` 104 (103 in the artillery files + `C-McClanahan-ART` filed among the regiment records), `battery_records` 103, `unit_records` 570, `units` 569, `moments` 675, `stories` 24, `events` 137, `places` 30, `monuments_in_walkthrough` 512, `monuments_in_park_approx` 1328, `walkthrough_stops` 16, `guided_tour_stops` 16, `extras` 20, `turning_points` 9, `sources_distinct` 26; `positions` {`regiments_own` 217, `via_brigade` 231, `none` 19, `keyframes` 1804, `moments_with_keyframes` 188}; `casualty_bases` [`summary_fields` 45,928 (22,803 U / 23,125 C); `engagement_periods` 46,163 (23,138 / 23,025; used by dashboard and ledger); `commonly_cited` 51,000 (NPS 23,049 + 28,063, verify; carried as an alternate, not the headline, per chapter 13 Q-DATA-2)]; `data_version`, `built`.

## Appendix D. Canonical names (normative for the manifest; owner approves CD-1)

Product "Gettysburg Interactive Map" (short "the map"). Menu "More to Explore"; groups Explore the Map, Learn the Story, Records and Research, Experience It, Share and Export. Pages: Search Everything; Compare Moments; Camera Modes; High Ground; What-If Sandbox; Ask the Historian; Documentary Mode; Turning Points; For Students; Aftermath; Regimental Biography; Find Your Ancestor; Casualty Dashboard; Regiment Fact Sheets; Immersive Mode; The Living Ledger; The Ground Remembers; Battlefield AR; Watch Together; Export a Video. Map: Search Units; Follow a Regiment; Virtual Walkthrough (tabs Auto Tour Stops, Monuments); Guided Battle Tour; Soldier's Eye View; Minimap; Desktop layout / Mobile layout; User Guide. Terms: story (24), event (137), moment (a point in time; "Frame N of 675" only in a tooltip), regiment / battery, casualties (defined once per page).

## Appendix E. Alt-text and non-visual text rules

Informative image: one or two sentences, <= 125 characters, what and why, no "image of". Map figure: place, time, what is visible. Chart: the takeaway in the alt plus a data table on the page. Decorative: `alt=""`. Icon-only control: `aria-label` equals the visible tooltip and the command ("Close", "Search units"), never a glyph; no emoji labels. `og:image:alt` on every page. PDF: `Figure` with `Alt`, decorations as artifacts. Live-region text repeats the visible clock string. Map canvas: one region label ("Battle map, July 2, 4:30 PM. 84 units shown."). Guide and Press figures: own-vector art only (D-MEDIA).
