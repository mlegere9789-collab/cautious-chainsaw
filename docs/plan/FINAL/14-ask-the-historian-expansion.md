# 14 - Ask the Historian: The Database Expansion Plan

Status: PLAN ONLY, 2026-09-30; nothing built or deployed. WP prefix **WP-HIST-NN** (inside this chapter a bare `WP-NN`, "WP 01" or "WP-12..17" means WP-HIST-NN; other prefixes are written in full). Binding: `01-decision-register.md` (ADR ids D-XXX); every deviation is in H.2.
Tags: [V] re-verified by me (deployed files, `bundle.pretty.js`, data recount); [S id] specialist or verifier statement; [M] measured on real text (`plan-work/tmp-*`); [E] estimate; [D] my proposal; [U] unverified. Effort S<0.5 d, M 0.5-2, L 2-5, XL>5 (person-days). Id prefixes: hf = hist-final-plan item, hc = hist-current, hs1/hs2 = hist-sources-1/2, di = data-integrity, inf = infra-netlify, seo = seo-growth, qa = qa-ci; QW/F = hc quick-win/failure code. Paths are under `plan-work/`.

## 0. Summary

1. **The ask** ("greatly expand the databases") is met by one repeatable pipeline (registry, fetch, OCR normalise, segment, link, anchor, review, emit) plus a wave list. The seven public-domain sources already local (21.6 MB OCR, 3,192,212 words [V]) segment to 14,391 passages [M]. Plan: **about 22-27 k passages / 4.4-5.4 M words by end of P4** (24-29 k / 5-6 M with P5) versus 658 records / 11,088 indexed words / 0 page citations today (roughly 400-490x).
2. **Architecture (D-HIST-ARCH):** Design A is permanent (static, zero server, quote-only, page-cited, entity + facts tier, 128-bucket BM25). B (on-device semantic) and C (LLM explanation) stay OFF behind gate G-X with numeric criteria (D.1).
3. **Value order:** H0 hotfix (0.5-1 d, in R1) kills `undefined`; P1 answer-first Historian on today's data; P2 Official Records with page citations and time-evidence tables (the audit-C4 deliverable); P3 NY/PA narratives and PD casualty facts; P4 voices, contested-topic balance, reviewed answers.
4. **Cost:** $0 per query; 0 bytes added to any other page's first paint; build-time LLM $31-61 (cap $75); 59-95 reviewer hours. **Effort:** core (P0-P4 + governance) **57.5-94 d** bottom-up vs 49-76 in D-HIST-ARCH (F.2, H.2); P5 base +8-14; optional B 4-6, C-lite 15-29.
5. **Can stall it:** no named reviewer (D-HIST-REVIEW), unknown Netlify plan and no Git/CLI deploy (D-CI-HOST), NPS silence (rosters only). None blocks P0-P2.

---

## A. A+ exit criteria for this domain

**A1. Content, rights, answer quality (device independent; thresholds are proposals for the owner and historian).**

| # | Criterion | Threshold | Test |
|---|---|---|---|
| 1 | Corpus | >= 22,000 passages (core + campaign scope), >= 15 registered sources in 5 filter families (Official reports, State monument books, Participant narratives, Testimony, Newspapers) + Site records; 957+ entity cards; 9 fact tables through P2, 10 with `casualty_sources` | manifest counts |
| 2 | Citations | 100% of quotes carry printed page + scan link; 5 sampled citations per source open the right page; hallucinated citations 0; quote fidelity 100% | V03; folio-OCR sample |
| 3 | Coverage | >= 90% of site regiment records linked to a passage (conf A/B), Confederate >= 75% (target 80%); >= 90% of NY + PA units have a narrative; crosswalk 570/570 resolved or in `unmatched.csv` | coverage report |
| 4 | Time evidence | 137/137 events have >= 1 anchor or "no report time found"; anchors >= 1,500 (target 3,000); sample precision >= 0.90; 0 legacy clock strings | anchors table |
| 5 | Rights | every passage has `lic` + `cite`; 0 Tier C ids; the 18 legacy monument rows resolved; every source on `/sources`; permission replies in `legal/` | CI tier gate |
| 6 | Answers (D.8 A+ column) | Golden-Core pass >= 95% (locked >= 93%); passage recall@5 >= 0.90; citation precision >= 0.95; unsupported claims 0; injection 100%; decline >= 95%, false refusal <= 3%; contested items show >= 2 sides or the disclosure >= 95% | `score-golden.js`; audit |
| 7 | Independence (D-EVIDENCE) | >= 100 questions written by others; audit signed by the named historian; `/historian` is one of the 6 flows in the independent accessibility evaluation | dossier |
| 8 | Governance | reviewer + second reader named (else visible "Unreviewed"); ack <= 3 d, fix <= 14 d, takedown <= 24 h met for 90 days; rollback drill passed | logs |

**A2. UX, accessibility, performance (desktop AND mobile).** Profiles: desktop 1024x768, 1440x900, 1920x1080, 2560x1440; mobile 320x568 (floor), 375x812, 390x844, 412x915; tablet 768x1024; landscape 812x375, 667x375.

| Criterion | Desktop | Mobile |
|---|---|---|
| Layout | no horizontal scroll or overlap; Sources panel docks at >= 900 px | same at 320-430; landscape header one 44 px row; last answer never under the input bar (`--bar-h`, safe-area inset) |
| Targets, type | >= 32 px (never < 24); body >= 16 px, secondary >= 14, nothing < 12 | >= 44x44 coarse, 8 px gaps; input 16 px (no iOS zoom) |
| Accessibility | WCAG 2.2 AA; axe 0 serious; text >= 4.5:1 (answers target 7), controls >= 3; focus never hidden by the sticky bar; keyboard-only run | same + NVDA, VoiceOver iOS, TalkBack at each phase exit; reflow at 320; reduced motion |
| Lighthouse, vitals (lab) | >= 95 in all four categories with the full KB; LCP <= 1.5 s, CLS <= 0.05, TBT <= 100 ms at 4x CPU | same; INP <= 200 ms in a scripted 100-query session (lab target 150) |
| Bytes, latency | shell <= 45 KB br; T1 <= 250 KB after first paint; cold passage query <= 120 KB; 0 bytes on other pages; worker p95 <= 50 ms at 6x; cold answer <= 2.0 s Slow 4G | same; a real mid-tier Android (about 2020-22, 4 GB) before G-A2 (S-3) |
| Reliability | no infinite loader, inline Retry per shard, console silent, 0 third-party requests | same; offline shows a clear message (full offline only with the P5 pack) |

`/historian` has about 110 views/month, too few for per-URL RUM (D-EVIDENCE): green rests on Lighthouse CI, the scripted INP session, real-device runs and aggregate RUM (template "tools").

---

## B. Verified current state (facts only)

- **Runtime:** `historian.html` (11,368 B): one inline script, 15 unconditional JSON fetches (8 OOB `.regiments`, 3 vignettes, 3 chronology, `terrain.key_locations`) = 317,788 B raw / about 63,974 B br, no try/catch, so one failure leaves "Loading the battle's records..." forever (`:67-80,142-146`) [M hc]; `/data/*` is `max-age=3600` [V `netlify.toml:28-30`].
- **Corpus:** 658 records = 467 regiment records + 24 vignettes + 137 chronology events + 30 terrain; 11,088 indexed tokens (45,096 narrative words exist site-wide); 0 page citations. 467 counts regiment records only (465 regiments + the alias stub `U-14BK`, also in `union_oob_brigades.json`, + the battery `C-McClanahan-ART` filed as a regiment [V, chapter 13 s.2.1]); 103 batteries extra: 570 records, 569 distinct units (465 regiments + 104 batteries).
- **Defects:** `:119,123` read `e.title`/`e.description`, but events carry `event`, `narrative`, `time`, `tick`, `location`, `units_involved`, `significance` (+ `flag` on 66) [V], so 137/137 print `undefined`. Also [M]: raw ids in 71/118 answers, lower-cased fate (`:94`), 1,591 ` -- ` in site strings, `full_script` dumps (mean 2,989 chars), x1.3 vignette weight (`:107`), `me`/`in` stop-words, stray `s` from apostrophes, zero-hit as the only "no answer", 15 px unlabelled input, sticky bar hiding the last answer, `innerHTML` (`:172`).
- **Baselines (deployed B0; 118 primary / 57 held-out):** S@1 76/71; canonical card first 29/41; fact@3 68/31; typo 13/20; correct decline 47/20; defective answers 90/91. Golden-Core 150: pass **14.0%**, hard defects on 48.7% of answers, injection 0/8; null 6.0%, prototype B3 29.3%, oracle 100% [M].
- **Unloaded site data:** 88 brigades, 31 divisions, 11 corps, 2 armies, 103 batteries, 42 successions (25 + 17 [V]), 20 roads/structures/features, 1,245 placement notes (12,081 words), 16 walkthrough and 16 tour-stop blocks, 512 monuments. Only 45/467 regiments (9.6%) appear in any vignette/chronology text (292/467 at own-id-or-brigade level, not 365 [S hc-09]). Three engines exist: `search.html` (letters-in-order fallback, 88% of rows score 20 [M]), `historian.html`, and in-app "Search Units" (`bundle.pretty.js:98745-98830`, in the source-less bundle, N1).
- **Copy, rights:** `historian.html:48` claims "search-and-synthesis tool" with hard-coded counts; `index.html:377` says "an AI-style historian", `:720,755` "data-grounded historian assistant"; `privacy.html` and `terms.html` never mention the Historian [V]. 18 shipped monument coordinates derive from Stone Sentinels (8), HMDB (4), Wikipedia (6); OOB metadata cites Busey and Martin, Pfanz, Desjardin, Hessler and Motts, Moe; 3 Confederate regiment files have `metadata: null` [S hs2-01, hs1].
- **Platform [V `sw.js`]:** `CACHE_NAME='gbg-v5'`, `skipWaiting()`, `activate` deletes every cache not named `CACHE_NAME` (would wipe any `hx-*`), `/data/` network-first and re-cached; R0's SW replaces it (D-SW) and must bypass `/hx/`. **Overlay check (closes hf 10.3 [U]):** the floating Extra Features overlay is in `index.html` only; `historian.html` has an in-flow sticky `<nav>` (`z-index:500`) and a sticky input bar: no collision [V].

**B.2 Corrections applied (none REFUTED; UNVERIFIABLE items are in G).** hc-03's "drop `me`,`in`" (correct decline 41.2 to 29.4) and `filter(s >= 3)` (drops 133/133 single-hit events at weight 0.9) are rejected; QW-0 leaves ` -- ` in 148/175 answers; hc-07's "94% vs 40%" mixes B2 and B3 (94.1/60.0 vs 88.2/40.0, n=5). hs1-01's "~2,200 dispatches" is the Pt3 clock count (about 1,374 dated items, about 100 dated July 1-3); hs1-14's `#page/n<leaf>` is wrong (reader index = `leafNum` - 3, then - 5 after leaf 887); hs1-11's `date <= 1930` gate fails (curated allow-list). hs2-03's "99%" crosswalk is 87.6% after US to UR and suffix codes; no IA Jacobs copy has a weather table; HMDB is B-NC; hf's `style-src 'self'` with inline CSS needs a hash, and its "9 fact tables" is 10 with `casualty_sources`.

---

## C. Work-package table

"Covers" = source ids, audit ids in brackets. hc phases: H0 = WP-01, H1 = WP-08, H2 = WP-09/10, H3 = the D.2 waves. Core total (01-27, 33-36) **57.5-94 d**; P5 base (28, 29) 8-14; optional 31 = 4-6, 32 = 15-29; 30 unscheduled.

| WP | Title | Phase | Effort, d | Depends | Covers | Moves |
|---|---|---|---|---|---|---|
| 01 | H0 hotfix + copy sweep | T0 (R1) | S 0.5-1 | R0 accepted | hf-02; hc-01,03,10,12,16,22,23; QW-0; F04,F06,F12 [H8,H7,C4] | Function, UX |
| 02 | Repo, source registry, tier gate, retro-audit | P0 | M 1-2.5 | D-CI-HOST | hf-01; hs1-11; hs2-01,18,19,20,23 [X5,N1] | Rights |
| 03 | `/hx/` platform, headers, CSP, robots, spikes | P0 | M 1-2.5 | R0 SW, 02 | hf-03,04,05; inf-30; hs1-17; hs2-22; seo-06 [X3,P5] | Perf, Security |
| 04 | Fetch, OCR normaliser, page map | P0 | M 1-2 | 02 | hf-06; hs1-12,13,14; hs2-21 | Data |
| 05 | Entity registry, 570-unit crosswalk, aliases | P0-1 | L 2.5-4 | 02 | hf-07; hs1-02; hs2-03; hc-04,09,21; di-28 [H7,H10] | Function |
| 06 | Build, emit, validate, CI, manifest | P0-2 | M-L 2-3.5 | 02, 05 | hf-08,14; di-24; hc-11,18 | Reliability |
| 07 | Eval harness, golden sets in CI | P0 | M 0.5-1.5 | none | hf-09; hc-24; qa-22; hs1-16; hs2-24 | QA |
| 08 | `search-core` | P1 | L 2-3 | 05, 07 | hf-10; hc-02..05,07; QW-1..7,9,10,12; F01-F04,F07,F08 [H8] | Function |
| 09 | Data lake to entities, facts, authority | P1 | L 2-3 | 05, 06 | hf-11; hc-08,09,25,29; di-23,27,29; QW-13,14; F05,F11 | Function, Data |
| 10 | Composers, I1-I8 linter, refusals, conversation | P1 | L 2-3 | 08, 09 | hf-12; hc-06,19,20,28; QW-8,11; F07,F09,F10 | Function, UX |
| 11 | UI v2 and integration (a11y, perf, adapter, `search.html`) | P1 | L 3.5-5 | 10 | hf-13,15,16,39,40; hc-13..18,22,23,30 [A1-A6,C8,P4] | UX, A11y, Perf |
| 12 | OR Pt1-3 segmenters, page map | P2 | XL 4-6 | 04, 05 | hf-17; hs1-01,06,14; hs2-05 | Data |
| 13 | Classifier, tables, chunker, dedupe | P2 | M 1-1.5 | 12 | hf-18; QW-15 | Data |
| 14 | Unit/person/place linkers, labelled set | P2 | L 2.5-3.5 | 05, 13 | hf-19 | Accuracy |
| 15 | Time anchors, evidence tables | P2 | L 2-3 | 12, 14, ch. 04 | hf-20; hs1-06; hs2-06; tf-14; app-time-19 [C4] | Accuracy |
| 16 | Review tool, decision loop | P2 | M 1-1.5 | 14 | hf-21 | Accuracy |
| 17 | Passage engine, T2 emit, composers A5/A7/A8 | P2 | M-L 2.5-3.5 | 13, 14 | hf-22,23; hc-26 | Function, Perf |
| 18 | Build-time LLM grafts, AI disclosure | P2 | M 2-3 | 14 | hf-24 | Function |
| 19 | Golden-Passage, audit #1, G-A2/G-X report | P2 | L 2.5-3.5 | 17 | hf-25,26 | QA |
| 20 | State books: NY x3, PA, ME/NJ/MI/MN | P3 | L 3-4.5 | 12-17 | hf-27; hs1-03,15 | Data |
| 21 | Fox + Guild casualty facts, reconciliation | P3 | L 2.5-4 | 13, 09 | hf-27; hs1-04; hs2-15 [H10] | Accuracy |
| 22 | Unit/place page-data export | P3 | M 1-2 | 20, 21, SEO | hf-28; seo-14 [T1] | SEO |
| 23 | Voices: B&L, Joint Committee, memoirs | P4 | L 3-4.5 | 17 | hf-29; hs1-05 | Data, Trust |
| 24 | SHSP shortlist (reviewer-gated) | P4 | L 2.5-4 | 23, reviewer | hf-29 | Data |
| 25 | Contested registry, balance, filters, sources drawer | P4 | L 2.5-4 | 23 | hf-30,31 | UX, Trust |
| 26 | Reviewed answers (about 60), audit #2 | P4 | M 1.5-2.5 | 25, SEO | hf-32,33; seo-23 | SEO, Trust |
| 27 | W4b regimental histories (stoppable) | P4 | M-L 2-3.5 | 20 | hf-29; hs2-14 | Data |
| 28 | W5 civilians, press, guides, NPS, weather, offline pack | P5 | L 4-7 | 23 | hf-34; hs1-09,10; hs2-05,06,07,12,13,16,17,25 | Data |
| 29 | W6 gated: Wikipedia, OSM, Commons, LoC photos | P5 | L 4-7 | 02, D-LICENSE | hf-34; hs1-08; hs2-08,09,11,18 | Data, Rights |
| 30 | CWSS rosters (BLOCKED) | P5 | XL >5 | NPS reply | hf-35; hs2-03,04,26 | Function |
| 31 | Optional B: reranker, B0 | branch | M 4-6 | G-X.2 | hf-36 | Function |
| 32 | Optional C-lite | branch | L-XL 15-29 | G-X.3 | hf-37; inf-31 | Function |
| 33 | Governance, citation permanence, `/sources` | P1-cont. | M 1.5-3 | 02 | hf-38; hs1-11; critics | Trust, Docs |
| 34 | Legal, privacy, AI-disclosure alignment | P0-1 | S-M 0.5-1 | D-LEGAL | inf-36,37,38; hc-27; hs2-02; critics [X5] | Privacy |
| 35 | Reviewer programme, hours ledger | P1-4 | S-M 0.5-1.5 | D-HIST-REVIEW | hf 4.4; critics | Accuracy |
| 36 | Continuous operations | cont. | M 1.5-3 | 06 | hf 9 | Reliability |

---

## D. Reference design

### D.1 Target architecture

**Stages (D-HIST-ARCH).** A0 (P1): entity + facts over site data, `search-core`, composers, UI v2. A1 (P2-P4): passage tier (128-bucket impact index, entity postings, 16-passage shards, page-cited quotes, evidence tables, perspective chips, filters). A+ (P2): build-time T0+ expansion, concept lexicon, PMI neighbours, LLM link proposals into the review queue. B (optional): reranker <= 8 MB, then B0, then "Deep search" (int8 arctic-embed-xs, ORT-Web WASM, about 40 MB opt-in). C (optional): per-click "Explain these sources (AI, beta)". Every stage adds 0 bytes to first paint; KB, schema, citation object and ids are shared, so B/C never force re-ingestion.

| Tier | Contents | Loaded | Size |
|---|---|---|---|
| T0 shell | HTML, hashed inline critical CSS, module, classic-IIFE worker | page load | <= 45 KB br [E] |
| T1 | 957+ entity cards, alias/surname maps, fact tables, lexicon | after first paint, in the Worker | entity 75.9 KB, lexicon 34 KB [M], facts about 100 KB [E]; <= 250 KB |
| T2 | 128 index buckets (12 KB avg, 20 max [M]), 32 entity-posting buckets, 16-passage shards (about 7.7 KB br [E]) | per query | 14.4 k passages: 1.54 MB + 5.3 MB text [M]; P4: 2.4-2.9 + 10.6-13 MB |
| T3, T4 | roster shards 6-12 MB (BLOCKED); LoC thumbnails <= 150 KB | on demand | |

**Reconciliation of designs A/B/C, the final plan and the register [D].** Prefix `/hx/` (never `/data/`: 3600 s cache, SW caches it forever [V]); SW bypasses `/hx/` and purges only `gbg-*` (R0, D-SW), a page-managed `hx-v<schema>` cache exists only for the P5 offline pack; ids `<doc>#<hash8>` + append-only `id_map.json`, `sb` blocks are the citable units, sources are slugs with `xref` to both catalogs; deep links use the fragment `#q=..&unit=..&clock=..&f=..` and `#a=<kb>:<hash>` (D-URLSTATE); Records mode by default, "AI explanation (beta)" only if C exists; Golden-Core GQ-001..150 + Golden-Passage GP >= 100; a non-live "Conversation" region plus a `role="status"` announcer; one `time-adapter.js` over ch. 04's module (`clockToTick` vs `tickForClock`).

| Gate | Pass / action |
|---|---|
| G-A1 (end P1) | Golden-Core H1+H2 (123 items) pass >= 85%, critical recall >= 93%; batteries per D.8; 0 forbidden strings over all rendered cards; Lighthouse >= 95; a miss is re-baselined explicitly |
| G-A2 (end P2) | GP held-out passage recall@5 >= 0.80, citation precision >= 0.90, cold query <= 120 KB, 5 sampled citations per source right |
| G-X.1 | paraphrase-slice recall@5 >= 0.80 with T0+: **freeze (expected)** |
| G-X.2 | else in order: aliases/lexicon, T0+ tuning, lexicon/PMI/PRF (+3 dev each); reranker (<= 8 MB, +8 points, p95 <= 150 ms Moto-G class, INP <= 200, no CSP downgrade); then B0 (4 d): hybrid minus BM25 >= +10 points recall@5 on >= 60 paraphrase items, 95% paired-bootstrap CI excludes 0, else stop |
| G-X.3 | residual is prose/explain: C-lite only if G-A2 passed, plan confirmed and a flood cannot pause the site (Free-plan 300-credit hard limit, inference), privacy/Terms/banner rewritten first, counsel review incl. provider policy for minors, caps USD 25/month + 2/day (workspace 30), R0 spike measured, opt-in per click with records fallback and kill switch; the 2 code rate-limit rules on Free/Personal go to `/api/ingest` and `/api/ask` |
| G-C-GA | 150 questions x 3 runs: claim-level supported >= 97%, citation precision >= 95%, unsupported numerals/dates/names 0, adversarial 100%, over-refusal <= 8%, first checked claim p95 <= 5.5 s |

### D.2 Source-expansion roadmap (waves; each stoppable, each ships value alone)

Tier A basis: US Government work (17 U.S.C. 105) or published before 1931 (counsel to confirm [U]). Default credit for every Tier A passage: `<Title> (<publisher>, <year>), p. <printed page>, via <host>` + **View scan**; original imprints only; curated IA-id allow-list; `may_send_to_llm` only for Tier A. Per-source effort is on top of the shared pipeline (W1's overlaps WP-12..17). IA sources ship OCR text (`_djvu.txt`), word boxes (`_djvu.xml`), `page_numbers.json` and `scandata.xml`.

| Wave (WP) | Source; ids | Adds; format; size -> passages | Rights, obligations | Extraction | Effort d; priority |
|---|---|---|---|---|---|
| **W0** (09) | site records | 957 cards, about 1,060 blocks (570 vignette + 489 chronology) | owner-authored; Busey and Martin/Pfanz numbers are facts-only rows with `auth/basis/edition/page` | field whitelist; block `flag`, `flag_notes` | P1; first |
| **W1** (12) | OR I/27 Pt1-3 (hs1 SRC-01/02/06, hs2 SRC-19): `warofrebellion271unit`, `warofrebellion272unit`, `warofrebellion273unit` | Pt1: 378 reports (376 ToC-recovered), about 208 Union regiment/battery, 3,970,479 B, 584,253 words -> 2,712; Pt2: Nos. 379-589 (211/211), ANV 424-589 with about 88 regiment/battery reports, 573,004 words -> 2,654 (Guild return No. 427 needs `_djvu.xml` word boxes); Pt3: 118 dispatch headers ("July 2, 1863-3.40 a. m."), about 100 dated July 1-3, 2,201 clock times, 489,617 words -> 2,040 | Tier A; Hathi `pd`; credit "Official Records, Ser. I, vol. 27, pt. N (US War Department, 1889), via Internet Archive"; never `warrebellionaco00cowlgoog` (1971 reprint); Pt3 marked contemporaneous | `normalize_ocr`, ToC parse, whitespace-tolerant header regex (303/378), fuzzy to ToC author; Pt3 dispatch segmenter (the "No. NN. Report of" one finds 0); U+FFFD to dash | L 3-5, 2-4, 3-4; **1** |
| **W2a** (20) | NY Final Report x3: `finalreportongettys01burgrich`, `finalreportonbat0001dani`, `finalreportonbat0003unse` | 68 infantry + 19 batteries in text; vol 1 209,257 words -> 966; vols 2-3 about 2.1 k; unit text spread over all 3 volumes | Tier A; IA scans, not NYSMM pages (all rights reserved) | ToC-driven sketches; NY numbering table | M 2-3; 2 |
| **W2b** (20) | Pennsylvania at Gettysburg (1914 canonical, 1893 variant) | about 4.0 k [E]; 74 units; OCR proxy 0.935-0.949 | Tier A | per-regiment sections | M 2-3; 2 |
| **W2c/d** (21) | Fox 1889 `reglossescivilwar00foxwrich`; Guild return | 335,051 words -> 1,152 before table routing; about 300 loss rows [E]; Union only | Tier A; numbers as facts with `auth/edition/page`; never auto-edit OCR digits (`(5,024`, `30S`); K+W+M checksum | prose vs tables, word boxes | L 3-4; 2 |
| **W4a** (20) | Maine 1898 + Gerrish, NJ 1888/91, Michigan 1889 + Curtis, Minnesota 1890-93 + Holcombe | about 1.5-2.5 k [E]; 10 ME, 13 NJ, 11 MI, 1 MN units | Tier A | per-unit sections | S each; 2 |
| **W3a/b/d** (23) | Battles and Leaders v3 `battlesleadersof03cent`; Joint Committee `reportofjointcomm01unit`; Haskell (Gutenberg #33121), Oates, Polley, Curtis, Holcombe | B&L 486,884 words whole, Gettysburg pp. about 244-440 -> about 600-1,000, rest scope `context`; JCCW 514,146 words whole, about 600-850, 33 witnesses; memoirs about 1.0-1.8 k [E] | Tier A; perspective chips, `lag_days`, retrospective flag mandatory; JCCW `partisan_committee` | contents/witness headings, Q/A pairs kept | M 1-2, M 1-2, S-M 2; 3 |
| **W3c** (24) | SHSP vols 1-43 | 49.0 MB, 2,949 hits; about 150-article shortlist -> about 2.0-3.3 k [E] | Tier A; `lost_cause`, `self_justifying`; historian sign-off; never whole volumes | density shortlist + review | L 3-5; 3, reviewer-gated |
| **W4b** (27) | Clark NC (Emory ids use underscores), Bates, Phisterer, Dyer 1908 (not 1959), CMH, small states, Itinerary; WI `battleofgettysbu0000unse_f9x3`, MA `dedicationofmonu00bowe`, NY `reportofnewyorkb00newy` | about 1.5-2.5 k [E]; gaps DE, NH, WV | Tier A | per family | 1-2 each; 4 |
| **W5** (28) | Pierce, Buehler, Hoke, Jacobs, Bates, NPS civilians; Chronicling America July 1863 (1,560 pages Jul 1-31); guides; NPS OOB pages and handbook; GNMP lists; cemetery lists 1864/65 | about 1 k [E]; curate 50-150 articles | Tier A per item; newspapers "title, date, page"; NPS "National Park Service, <page>, retrieved <date>"; contractor NPS CLRs A-pending | parse NPS OOB from DOM; The Compiler deferred (OCR 0.43-0.48) | M 2-3 per cluster; 5 |
| **W6** (29) | Wikipedia (6 articles, about 130 bios), Wikidata, Commons, OSM (867 vs site's 512), LoC photos (175 records, 75 dated July 1863), Smithsonian CC0, ACW Battle Data (CC BY 4.0; NPS/CWSAC/Dyer/Fox/Phisterer/Livermore/Bodart slices), UT Austin OR corpus (MIT) | small | Wikipedia: separate file, `may_send_to_llm=false`, block `Source: Wikipedia, "<title>", revision <revid>, CC BY-SA 4.0. Excerpted/condensed.`; OSM (ODbL): separate `monuments_osm.geojson` + `LICENSE-ODbL.txt`, map credit whenever visible; LoC photos only if rights advisory starts "No known restrictions", credit "Library of Congress, Prints and Photographs Division, LC-DIG-..."; Commons: credit beside image, no NC/ND | build-time only | M-XL; 6, gated |
| **Rosters** (30) | CWSS mirror `Soldiers_Personz.tsv` 1,194,562,274 B (about 6.26 M cards) | 467 shards, 6-12 MB | A-pending: no shard before NPS confirms in writing (D-CWSS: link-out) | stream once | XL; blocked |

**Link-out only (never fetched, stored, embedded or sent to a model):** American Battlefield Trust (bans scraping, framing, AI use); Ancestry, Fold3, Find a Grave, FamilySearch; ACHS and Gettysburg College collections until permission; HMDB (B-NC; 4 shipped rows derive from it); Stone Sentinels; NYSMM unit pages; NHGIS; Ladd/Morningside Bachelder Papers; NHHS originals (USD 25/50 per image plus fees); Rumsey (CC BY-NC-SA); Adams Sentinel; Busey and Martin, Pfanz, Desjardin, Hessler and Motts, Moe; the 1959 Dyer and 1971 OR reprints. **Negative results:** no public NPS GIS for monuments; Dyer/NPS lists 300 Union and 0 Confederate units; no Gettysburg OOB/roster dataset on GitHub/Zenodo; CWSS has 0 Gettysburg cemetery rows; no IA Jacobs copy has a weather table; the 28 "hourly" Bachelder maps are unlocated; no Broadhead diary on IA; no Camp Letterman roster or bulk damage claims online; Kaggle/DPLA/NARA API unchecked [U].

**Golden-Core items unlocked (the 37 needing expansion [C]):** W1 14 (incl. the 8 time items, which also need ch. 04), W2/W4a + Fox 7, W3 4, W5 4, W6 4, rosters 2 (blocked), site prose 2 (P1).

### D.3 Growth numbers

Per passage: 107 B index, about 480 B text incl. metadata, 190-220 words [M]; 16 passages per shard.

| Milestone | Passages | Words | Index br | Text br | Files |
|---|---|---|---|---|---|
| Today | 658 records | 11,088 | none | none | 15 |
| P1 | 957 cards + about 1,060 blocks (T1 only) | 24.7 k in cards | T1 <= 250 KB | | about 6 |
| P2 (OR) | 7.4 k | 1.65 M | 0.79 MB | 3.6 MB | about 630 |
| P3 (+NY 3.1 k, PA 4.0 k, Fox 1.15 k, ME/NJ/MI/MN 1.5-2.5 k) | about 17-18 k | about 3.5 M | 1.9 MB | 8.5 MB | about 1.3 k |
| P4 (+ voices 4.2-7.0 k, part of W4b) | about 22-27 k | 4.4-5.4 M | 2.4-2.9 MB | 10.6-13 MB | 1.6-1.9 k |
| P5 base (+ about 1 k) | 24-29 k | 5-6 M | 2.6-3.1 MB | 11.5-14 MB | 1.7-2.1 k |

B&L and Joint Committee count only their Gettysburg portions (whole volumes would add about 3.5 k `context` passages, off). Latency [M]: BM25 over 14,391 passages p50 0.057 ms, p95 0.126 ms (Node); fuzzy 3.5 ms; worker about 8-10 ms per query on desktop, about 50-60 ms modelled phone [E]; cold first passage answer about 90 KB, 2.1 s on Slow 4G [E]. **First-paint bytes added to any page: 0.**

### D.4 Unified schema (CI fails without `source_id`, `tier`, `lic`, `cite`, `ver`)

```
Source   {id slug, xref{hs1,hs2}, title, tier A|B|C|A-pending, license{id,statement_text,statement_url,verified_at,reviewer}, imprint{year,publisher,reprint,ia_id},
          author_affiliation, attribution, may_index, may_redistribute, may_send_to_llm, genre, scope_default core|campaign|context, ocr{engine,proxy,gate}, locators[], archive_url}
Document {doc_id "<slug>:<locator>", source_id, author{person_id,rank,unit_id,role}, date_written, pages{start,end,reader_index_start}, perspective{side,role,lag_days,retrospective,bias_tags[]}, ocr_score}
Passage  {id "<doc>#<hash8>", num (append-only id_map), kind, type prose|table|list|front_matter, scope, text, edits[], sb[], cite{short,page,scan{ia_id,scan_leaf,reader_index,url}},
          lic{id,tier,attribution}, persp{}, sens[], ents{units,people,places,events}[id,role,conf], time[]{day,clock_text,clock_min,tol_min,mod,evidence,attach,conf,tick_hint,tm},
          quotes[]{s,e,h}, expansion{generated:true} (index-only), flags[], conf{}, nav{prev,next}, ver}
Entity   {id, type, level, side, name, aliases[], parents[], display{}, attrs{field:{v,auth,basis,conf,edition,page}}, xref{cwss,dyer,osm,monuments}, prov[]}
Facts    tenures, stats, rank, rollup, anchors(P2), events, places, unknowns, routes, casualty_sources(P3);  Anchor {aid, passage_id, unit_ids, place_ids, day, clock_min, tol, mod, evidence, event_key?}
Manifest {kb_version, schema, time_model, tiers{}, sources[], redactions[], eval{}, semantic{enabled:false}, ai{enabled:false}}     // only mutable-URL file
Answer   {kb, mode answer|partial|decline, route records|reviewed|ai, intent, entities[], blocks[lead|quote|table|note], chips, links{map{unit,clock},pages}, trace}
GP       {id, slice P|C|T|X|R, split, answerability, registers{S,K,P}, expect, gold_passages[{id,grade 0-3,span}], gold_facts, must, forbid, needs_sides, pinned, generated}
```

Ids: entities keep OOB ids (`U-20ME`, `BDE:`, `DIV:`, `CORPS:`, `ARMY:`) plus `P:`, `LOC-###`, `MON:###`, `EV:D<day>T<tick>`, `VIG:`, `SITE:`; never reused, renames keep `alias_for` for two majors. KB semver (MAJOR id/schema break, MINOR sources/fields, PATCH corrections); previous two versions stay deployed; rollback = redeploy the previous manifest. `time[]` stores 1863 local clock minutes, never ticks (the clock is piecewise, 0.8-42.3 min/tick [S]); only `quotes[]` spans are quoted; only conf A/B links may be `subject`. **Validator (build fails):** V01 schema; V02 tier/licence (Tier C id, no `lic`, reprint, OCR < 0.80, tier B without attribution, `may_send_to_llm` on non-A); V03 quote/`sb` offsets; V04 ids resolve; V05 dev-note blocklist (`DATA NOTE`, `must be shown`, `CRITICAL:`, `keyframe`, `animation`, `flag_notes`); V06 no ` -- `, `undefined`, `null`, `NaN`, internal ids; V07 anchor ranges; V08 folio sample; V09 unique ids; V10 size budgets; V11 alias to > 8 entities needs a rule; V12 deterministic rebuild; K001 every indexed field exists in the schema (kills the `e.title` drift).

### D.5 Ingestion pipeline, review queue, confidence valves

Idempotent stages write JSONL + one manifest line; a stage runs only if the previous gate passed. Python 3.11 for text, Node 24 for emit/validate/eval (shares `search-core.js` with the browser). Single private repo: `pipeline/historian/` (`sources.yaml`, `sources.lock.json`, `fetch/ normalize/ segment/ link/ anchors/ qa/ registry/ review/ llm/ eval/ legal/ build/emit.mjs`), `packages/hx/`, derived `apps/web/public/hx/` (content-hashed, committed). `raw/` and `llm_cache/` stay out of git (LFS or archive); `decisions.jsonl` and `llm_cache` are irreplaceable: back up 3-2-1 (D-CONTINUITY).

| Stage | Method | Acceptance |
|---|---|---|
| S0 rights | curated allow-list, parsed year, publisher, reprint flag, tier | refuses `warrebellionaco00cowlgoog`, licence-less, Tier C |
| S1 fetch | archive.org 1 req/s sequential; loc.gov 12/min (limit 20, 1-hour block); Wikimedia 60/min with contact UA; NPS 500/h; names from `/metadata/<id>`; sha256 lock; hard stop on 403 | rerun downloads 0 bytes |
| S2 normalise | NFC; U+FFFD to dash by context; collapse `[ \t]+`; de-hyphenate; strip running heads; repair only at edit distance 1 and df >= 50, never digits or capitalised tokens; log every edit | OCR >= 0.90 accept, 0.80-0.90 accept + flag, < 0.80 quarantine |
| S3 segment | per source (D.2); page map `djvu.xml` -> `page_numbers.json` (interpolate 18 gaps) -> `scandata.xml` | >= 95% pages assigned; 20-document boundary check; 5 folio checks |
| S4-S5 classify, chunk | digit ratio > 0.07 / short-token ratio > 0.28 route tables and lists (1.4-10.6% [M]); 150-250 words, paragraph-aligned, no overlap, never across documents, Q/A kept, `sb` protects `Col.`, `No.`, `a. m.` | tables never quoted; join(chunks) = document |
| S6 link | unit (grammar, arm agreement, conf A-D), person, place, time anchors, event proposals, perspective/sensitivity/controversy | 200-mention set: precision >= 0.95 at conf >= B, recall >= 0.85; anchors >= 0.90 |
| S7-S8 dedupe, validate | 8-word shingles >= 0.6 keep OR > state book > memoir > secondary; V01-V12 | 200-pair precision >= 95%; CI red on any rule |
| S9-S11 review, emit, publish | queue below; content hashes, `keep_previous: 2`; Playwright golden pass; HEAD-check 5% of citations | eval gates green; identical hashes on rebuild |

**Review queue order:** (1) unit links conf C/D and every battery link; (2) `contested:*` without perspective tags; (3) anchors differing from the map's event time by > 60 min (the C4 table); (4) new persons; (5) 100 random passages per source; (6) OCR edits touching a number (blocked until accepted); (7) anything cited by a reviewed answer; (8) user reports. Volume [E]: about 1,500 linked OR27-1/2 + NYFR-1 passages, 15-25% conf C/D = 300-600 items at about 40/h = 8-15 h. Tool: static `tools/review/index.html` reading `queue.jsonl` (passage, proposed links, IA scan link), exporting `decisions.jsonl` keyed by content hash. **Valves:** unreviewed C/D links only boost retrieval, never `subject` or structured answers, and answers say "passages that mention ..."; a backlog older than 14 days freezes new-source ingestion. **Per-source definition of done:** the S2-S8 acceptance column, a 100-passage audit >= 95%, a card on `/sources`. A new source later = card + tier check + segmenter + link config + this checklist (about 1-2 d per family once WP-04/05/13/14 exist).

### D.6 Retrieval and answering (Worker; main thread only posts and renders)

Guard (<= 300 chars) -> normalise -> tokenise -> lexicon repair -> entity/time/place link -> intent + slots -> scope gate -> structured answer (sync) and passage retrieval (async) -> fuse -> diversify -> decide -> compose. The UI gets `planned` in milliseconds, the structured lead at once, evidence into pre-sized skeletons.

- **Normalise, link, repair:** NFKD, lowercase, straight quotes, drop `'s`, `&` to and, ordinals to `#n`, corps rewrite; state abbreviations expand only after a number; `me`, `in`, `us`, `la`, `al` stay words; one light stemmer at index and query time. Linking: longest n-gram over aliases (parentheticals, nicknames, `{surname}'s brigade`, ALL-CAPS event labels, 45-entry seed); derived aliases are the biggest win (-6 S@1, -16 canonical@1 without them [M]); bare surnames give disambiguation chips. Fuzzy: out-of-lexicon tokens only, Damerau-Levenshtein <= 1 (len 5-7) or <= 2 (>= 8), same first letter unless len > 6, never for short prefixes, join/split; 100% recall on 2,682 synthetic typos [M]; UI "Showing results for **Chamberlain**".
- **Intents (ordered, >= 20 phrasings + negative tests each):** ancestor, succession, who-commanded, superlative, strength, casualties, outcome, compare, when, where, why, what-happened, list, who + new report-of, evidence-time, presence, site-route, verify-claim. Fix `proto.js:195`: `ancestor` needs a personal-relation cue (`my`, `grandfather`, `soldier named`, `genealog`) or an unlinked personal name; "was Longstreet/the 20th Maine at Gettysburg" is *presence*. Retrieval: who-commanded/succession = `tenures`; strength/casualties/superlative = `stats`, `rank`, `casualty_sources` + the return as citation; when = `events` + `anchors`; where = `places`; report-of = by `author`; why/contested = concept lexicon + PRF, perspective-balanced; compare = card + passage each; list = `rollup`; ancestor = `routes`.
- **Scoring:** candidates = entity postings, BM25 (k1 1.2, b 0.75) over touched buckets, time-conditioned anchors. `score = BM25 + sum(w_link*role) + w_t*timeProx + phrase(+8) + proximity(cap 4)`; `w_link` 12 (unit key 40); role subject/author 1.0, mention 0.5; priors report/dispatch 1.0, testimony 0.95, narrative 0.9, monument text 0.85, newspaper 0.7, table 0.3, list 0.1; RRF `1/(60+rank)`; MMR <= 2 per document, <= 3 per source family in the top 5. Entity BM25F fields title 3.0, alias 3.0, people 2.0, place 1.5, body 1.0 replace the x1.3 vignette hack. Plain BM25F alone does not beat today (S@1 76%); gains come from aliases, linking, intent, fuzzy and the no-answer gate [M]. Tune on dev only.
- **Decide:** empty/gibberish/length; scope table (visit-planning topics get an honest pointer; Antietam, Vicksburg, Lincoln's Address, causes of the war get "outside this site's records"); token-coverage, name-field and support gates (tau_abs, tau_rel, entity agreement); known unknowns: per-location casualties (terrain LOC-006 carries an unsourced "Nearly 6,000 casualties" [S hist-eval]: say totals exist by unit and flag it as uncited), individual presence, weather. Re-tune after every expansion (299 records dropped canonical@1 91.4 to 87.9 and decline 94.1 to 88.2 [S]); archive abstention curves.
- **Compose (nothing generated):** I1 every sentence is a template slot, a verbatim quote `(passage,s,e)` or a limitation; I2 no numeral outside a fact row or quote; I3 `normalise_ws(text.slice(s,e)) == quote`; I4 attribution never dropped; I5 clocks only as a reported time on a named passage or a label from the canonical time module (never legacy `time`, tick arithmetic, "site clock"); I6 `contested:*` never alone; I7 authority numbers "about ... (source; sources differ)", `estimated` never history; I8 `textContent` only. Conversation state (`lastEntities/Intent/Side/Time`) resolves "tell me more" and "what about the Confederates"; ambiguous pronouns give clarify chips. Extractive pick: `bm25(q,s) + 4[entity] + 3[time] + cue - 0.02*max(0,words-45)`, best 1-3 sentences up to 90 words, <= 3 passages (one per document), contemporaneous first, <= 120 quoted words at first view; Tier B only in a labelled block. Answer types A1 profile, A2 command, A3 strength/casualties, A4 superlative, A5 evidence table, A6 place, A7 report quote, A8 evidence cards, A9 contested, A10 compare, A11 list, A12 route, A13 limited/decline, A14 clarify.
- **Time-evidence tables (ch. 04):** columns Reported time, Who (rank, unit, side), Written, Evidence class, Passage; summary "N accounts; median H:MM; range" (testimony statistics, not ground truth). Before D-TIME sign-off there is no map-clock column and the table says "the site's map clock is being corrected"; after, "Map shows" comes from `time-adapter.js`, "about" when sigma >= 10 min. `anchors.csv` goes to the D-TIME packet so the historian signs the 5 R anchors (t75, t90, t248, t275, t538) against actual report times.

### D.7 UI/UX (`/historian`, desktop and mobile)

Desktop >= 900 px: one conversation column (max about 720 px) + docked 400 px Sources panel (dialog, focus-trapped, Esc closes, focus returns). Mobile: 56 px header (Back 44x44, title, Sources & filters 44x44 with badge), sticky input bar; landscape: one 44 px header row, capability line as disclosure, full-height Sources dialog. Dark only + print stylesheet (D-DESIGN).

| Area | Spec |
|---|---|
| Honesty | one h1; capability line from the manifest ("Records-only search: N passages from M sources plus site records. It quotes; it does not write new text. Not an AI model."); "How it works" (scope, method, error reporting, KB version/date) in the same place in every state; never "AI-style"/"synthesis"; the D.10 disclosure |
| Input | `<form role="search">`, visible label, 16 px, enabled at once (first question queued while T1 loads), Enter submits, Esc: dialog, clear, blur; clears on submit and chip click; 300 chars, counter at 250; `enterkeyhint="send"` |
| Transcript | `role="region"` "Conversation" (not live); `<article aria-label="Answer to: ...">`; hidden `role="status"` ("Answer ready. 3 sources." + first 120 chars); `role="alert"` for errors; scroll to the start of the new answer (`scroll-margin-top`, `scroll-padding-bottom` = `--bar-h`); `planned` chip row, lead with no network, evidence streams into pre-sized skeletons, "Stop" after 400 ms, late results append below |
| Answer card, evidence table | provenance chip in text; lead >= 16 px; <= 2 evidence `<details>` (collapsed on phones); A5 evidence table is a semantic `<table>` with caption and `aria-sort`, stacked cards <= 480 px; "See it on the map" behind `deepLinks`; follow-up chips (from answer entity kinds) 44 px coarse / 32 px fine, wrap |
| Sources drawer | title, printed page, author line, side/genre/retrospective chips, licence + credit, **View scan**, **Copy citation** (Chicago short), **Report a problem** (D-CONTACT form prefilled with passage id and `kb_version`; question only if ticked), Quote in context; bottom sheet up to 90 dvh on phones, close button (no drag) |
| Filters | families with counts; side; day + time slider (`aria-valuetext` "about 4 p.m. on July 2"); Contemporaneous only, Hide retrospective, Hide flagged language; `sessionStorage`; an empty result says so, never silently widens |
| Deep links, entry | `#q=..&unit=..&clock=2T1600&f=..` (fragment: never reaches analytics or `Referer`); `history.replaceState`; `#a=<kb>:<hash>` shows "corrected on ..." or a tombstone; `?mode=classroom` (D-SCHOOLS) collapses sensitive passages; entry: nav link, "Ask about this unit" on `regiment.html`, in-map entry behind `deepLinks` (in-app Search Units waits for the rebuild, N1); links come from the routes manifest |
| Errors, sensitivity, first run | shard failure = inline Retry; "Helpful/Not helpful" local only (`hx.fb`); `period_racial_language` note, never in suggestions; `graphic_injury` collapsed; contested "Accounts differ"; six pinned first-run chips (`20th Maine`; `Who commanded the Iron Brigade?`; `What time did Pickett's Charge start?`; ...), each tested canonical-first |

Acceptance: Playwright over the 11 A2 profiles: no scroll/overlap, target sizes, axe, console silent, Lighthouse >= 95, 100-query INP <= 200 ms, keyboard-only run, screen-reader passes, last answer never covered (qa HC-12).

### D.8 Evaluation gates

**Golden-Core** (`hist-golden-set.json` 1.0.0): 150 questions, 17 categories; 113 answerable now (25 behaviour probes), 37 need expansion or the time model; 100 dev / 50 locked (by hash; re-cut each MINOR); 349 machine-verified anchors; 31 conflict items (18 with `must_not_match` on wrong clocks such as Longstreet 7:30am, Pickett's Charge 11:05am); 19 shape-only items need a historian. **Golden-Passage** (new; the batteries hold 0 passage-gold items): P 45-60, C 25-40, T 15-20, X 10-15, R 10-20 = about 105 at P2, about 155 at P4; 70% dev / 30% held-out; pooled top-20 labelling from >= 3 systems, grades 0-3, two annotators on >= 30% (kappa >= 0.6); amplifiers (typos x5, paraphrases x3, ordinals x4) reach n >= 100, `generated:true`, never locked. 40-query pinned list; forbidden strings (`undefined`, `null`, `NaN`, ` -- `, raw ids, `site clock`, known-wrong clocks, V05 terms). Reviewed-answer questions carry `route_covered:true` and retrieval slices run with the reviewed route off. Never edit an expected answer to pass; a data change tripping `verify-golden.js` blocks the merge until reviewed.

Always: injection/XSS/leak 100%; forbidden content 0; hard render defects 0; hallucinated citations 0; quote fidelity 100%. Wilson 95% lower bound; percentages gated only at n >= 100; regression tolerance 2 points against `eval/baselines/main.json` (updated only by a green merge job); paired bootstrap (+10 wins are detectable, +5 are not).

| Gate | P1a | P1 | P2 | P3 | P4 | A+ |
|---|---|---|---|---|---|---|
| GQ pass / crit recall | H1 >= 70/90 | H1+H2 >= 85/93 | same | same | >= 90, locked >= 90 | >= 95, locked >= 93 |
| S@1 primary/held-out | 88/80 | 93/90 | same | 94/91 | 95/92 | 95/93 |
| canonical@1; fact@3/factTop | 90; 60/50 | 92; 90/85 | same | 93; same | 95; 92/88 | 95; 92/88 |
| decline / false refusal; typo S@1 | 85/8; 85 | 92/5; 88 | same | same | 94/4; 90 | 95/3; 90 |
| passage recall@5 / citation precision | - | - | **0.80 / 0.90** | 0.80 / - | 0.85 / 0.92 | 0.90 / 0.95 |
| unsupported (audit); contested balance | - | - | 0; - | - | 0; >= 90 | 0; >= 95 |
| regiment coverage (Confederate) | - | - | 60 [D] | 85 | 90 (75) | 90 (80) |

P3 is interpolated [D]; also gated: mean initial characters <= 700 (P1a), 600 (P1-P3), 500 (P4+); worker p95 at 6x <= 60 ms (P1) then 50 ms; cold answer <= 2.5 s (P1) then 2.0 s; the prototype met the H1 gates only in-sample (held-out S@1 88.5, canonical 81.8, decline 40.0 at n=5), so a P1 miss is re-baselined explicitly; the 9 `requires_time_model` items gate from P2. **Baselines to beat:** deployed B0 and B3 as in B; B2 (new retriever, same records) S@1 84/77, canonical 91/86, fact@3 50/38, decline 94/60; B3 (+ unused site data) 94/88, 88/82, 86/85, 88/40 [M]. **Audits:** 100 answers at P2, P4, A+ by the owner and the named historian; unsupported must be 0; rubric axes 0-3, PASS needs no axis < 2, weighted kappa >= 0.60. **CI:** T1 every push (<= 6 min: verify-golden, run-system, score-golden --baseline, validator, tier gate, batteries); T2 on Deploy Preview (Playwright incl. 8 adversarial + 12 random items, axe, Lighthouse mobile); T3 nightly (both splits, previous index vs current set, link check); green `ci` is required for production.

### D.9 Costs and budgets

Runtime $0; shell <= 45 KB, T1 <= 250 KB, cold query <= 120 KB (about 90 KB [E]); lazy corpus <= 40 MB cap, projected 13-17 MB; worker <= 48 MB. Netlify credits [S inf-30; plan UNVERIFIED]: 20/GB, 2 per 10 k requests, 15 per production deploy, Free = 300 hard limit; a session is about 0.35 MB and 25 requests: 300 sessions/month about 64 credits with 4 deploys, 3,000 about 96, 15,000 about 238, 60,000 about 770; 20 deploys equal the Free allowance (weekly batches, 70% alert). Build-time cash: link proposals over about 26 k chunks $17 (Haiku 4.5 batch) to $34 (Sonnet 5.5), T0+ about 30 k chunks $14-27, total $31-61, cap $75 [S arch-rag-function 4.5; re-read prices at run time]. Reviewer time: P1 2-4 h, P2 14-24, P3 6-10, P4 15-24, audits 12-18, labelling 10-15 = **59-95 h**. C-lite (optional): USD 0.012-0.0235 per AI answer, caps USD 25/month and 2/day, about USD 12-25/month at today's traffic [E]; a flood can exhaust Netlify credits even when the Anthropic cap holds.

### D.10 Governance

- **Reviewer (D-HIST-REVIEW):** one reviewer + second reader, charter (3-4 h/week, credit on `/sources` and `/corrections`, veto over a claim, `decisions.jsonl`); only the reviewer signs `contested.yaml`, perspective-tag changes, audits and the 19 + 13 + 7 historian-dependent golden items. No reviewer: ship "Unreviewed", cap claims, skip SHSP.
- **Corrections:** intake (passage id + `kb_version`) -> ack <= 3 d -> triage (OCR, wrong link, wrong page, misleading selection, rights, privacy) -> fix at the source of truth (decision, `edits` override, registry change, source removal; never a hand edit of a shard) -> rebuild, eval -> weekly PATCH with a CHANGELOG **Corrected** entry `{id, before -> after, citation, reviewer, date}`; takedowns same-day with a tombstone. SLAs ack <= 3 d, fix <= 14 d, takedown <= 24 h [E]. Versioning per D.4; no KB deploy in the D-ORDER freeze windows.
- **Citation permanence:** `locators[]` with >= 2 independent hosts per PD source (IA + HathiTrust/Google Books); `archive_url` (Wayback Save Page Now) at ingest for cited external URLs (archive.org capture is [U]: test in P0); the site is the last-resort locator: permalink `#p=<doc>#<hash8>` shows the stored PD text with printed page, static text pages only for the cited set (<= about 1,500, `noindex` first); nightly lychee switches the UI to `archive_url` after 3 failures.
- **Rights retro-audit first (before Wave 2):** tag shipped rows `legacy` with source and tier: 18 monument coordinates (Stone Sentinels 8: five in the bundle at `bundle.pretty.js:104475`-`110569`, three in `data/monuments.json`; HMDB 4 at `110071`-`110533`; Wikipedia 6 in `data/monuments.json`); run the tier gate over `data/*.json` and the 512-monument array; replace from PD/OSM-verified sources or credit on `/sources`; counsel reviews Busey and Martin-derived figures (D-LEGAL); data notes citing a "Gettysburg Animated YouTube vignette" (`terrain.json:38`, `chronology_day1.json:31`, others) wait for owner action 10.
- **AI disclosure:** Stage A copy on `/sources` and "How it works": "Answers are assembled from records and quotations; nothing is written by an AI model when you ask. AI tools were used offline to propose links between records and search terms; proposals are reviewed or sampled and never shown as text." `llm_runs.jsonl` logs model, prompt hash, input hashes. Whether the "assistant" framing triggers an AI-transparency duty, and provider policy for minors (C only), are counsel items [U]. Stage C adds per-answer badges and drops "runs entirely in your browser".
- **Privacy:** Stage A stores `hx.filters` (session) and `hx.fb` (local), makes no analytics calls; the network-log test allows same-origin GETs plus the D-CONTACT form POST; question text stays on the device unless the reader ticks the box.

### D.11 Top risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Rights contamination (Tier B/C, reprints, legacy rows) | allow-list, tier gate, retro-audit, `may_send_to_llm` |
| 2 | Unit-link false positives (naive linker wrong 7/22; 15 arm collisions) | grammar linker, conf A-D, labelled set, "passages that mention" |
| 3 | No reviewer; Lost Cause framing shown as fact | labelled fallback, I6, SHSP gated |
| 4 | Numbers without authority (4 casualty totals per side; 88/103 battery strengths templated); clock C4 | facts-only rows, I7, `clock_min`, forbidden-clock tests |
| 5 | Vocabulary gap (BM25 recall@5 27% on plain phrasing, upper bound [S]) | aliases, T0+, G-X |
| 6 | Netlify limits/credits, anniversary surge, solo capacity, citation rot, refusal drift | S-1/S-2, Git/CLI, weekly batches, June credit check, stop rules, locators, archived curves |

---

## E. Work-package specifications

Fix (files, functions, config) and test (automatable) per WP; effort, dependencies, covers and metric moved are in section C. Risk mapping (D.11): #1 rights: WP-02, 22, 28, 29; #2 link errors: WP-05, 13, 14, 15; #3 reviewer: WP-16, 23-26, 35; #4 numbers and clock: WP-01, 09, 15, 21; #5 vocabulary gap: WP-08, 17, 18, 19; #6 platform and capacity: WP-03, 04, 06, 07, 10, 11, 12, 20, 27, 30-34, 36.

**WP-HIST-01 H0 hotfix + copy sweep.** Ships in R1 after R0 (D-ORDER); `historian.html` is outside the bundle, so no stale-code trap. *Fix (`historian.html`):*
```
:119 text=`${e.event||''} ${e.narrative||''} ${e.location||''}` (never e.flag); :121 chronology weight 1.0; :181 filter RAW score >= 3 before weighting
:123 `<b>Day ${c.day}${e.location?' — '+e.location:''}:</b> ${clean(e.event)}`      // clock label held (C4), no tick
:92-97 delete "part of U-III / U-III-1-1"; :94 keep fate case; clean(s)=s.replace(/\s--\s/g,' — ') on key_action, vignette, fate
:109 panel_summary + <details>Read the full story</details>, drop ", tick N"; .msg{white-space:pre-line}
:155-164 strip possessives, split /[^a-z0-9]+/, word-start matches; KEEP 'me','in' stop-words; add fillers (many, much, do, my, can, which, from, have, than, show)
:174 scrollIntoView({block:'start'}) unless reduced motion; 16 px input + label; Ask disabled until ready; try/catch + Retry on the 15 fetches; clear on chip click
:48 copy: "searches this site's own records (N regiment records, ... computed); it quotes them, does not write new text, and is not an AI model"
```
Copy sweep, same release: `index.html:377` ("an AI-style historian, live sound"), `:720` and `:755` ("data-grounded assistant") and `site-nav.js:26` ("A search-and-answer assistant built from the map's own records"; it has no "AI-style" wording, checked [V]) become "Ask the Historian: a search of the site's records". These strings are owned by chapter 11 (WP-CONTENT-01/02, Appendix A rows 7-10, one string per catalogue id, `index.html:377` also carries the D-SOUND "live sound" removal of WP-T0-16), so this WP supplies the requirement and the acceptance grep, not a second edit; `historian.html:48` and the :186/:204 persona lines use the same catalogue wording (chapter 11 row 9-10), and "each answer names its source" appears only after step :123 adds a source line to every answer type. *Test:* `node tmp-hist-current/run-all.js` defects <= 1% with the detector extended (` -- `, `undefined`, `null`, `NaN`, raw-id regex, `site clock`); all 137 events returned for rarest word + filler; Playwright with the fetches blocked shows Retry; axe 0 serious. *Moves:* defects 90% to about 1%, mean answer 2,989 to about 960 chars, S@1 76 to about 78. *Risk:* fact@3 68 to 59 until WP-13/17; map links stay off until D-URLSTATE.

**WP-HIST-02 Registry, tier gate, retro-audit.** `pipeline/historian/sources.yaml` for the 39 + 46 catalog entries (slugs, `xref`, D.4 fields incl. `author_affiliation`, `may_send_to_llm`); gate refuses `warrebellionaco00cowlgoog`, licence-less items, Tier C ids (hosts grep-banned in `fetch/`), Tier B without attribution; `/sources` generator; `legacy` rows for the 18 monument coordinates and OOB provenance strings. *Test:* one unit test per refusal; the gate over `data/*.json` + the 512-monument array lists exactly the 18.

**WP-HIST-03 Platform and spikes.** Generated headers for `/historian` and `/historian.html` (D-URL): `/hx/f/*`, `/hx/app/*` immutable 1 year; `/hx/manifest.json` its own `no-cache` rule (the one mutable URL, D.4). Chapter 09 WP-INFRA-11 writes `/hx/*` immutable, which would also match the manifest and break the one-rule-per-header-name invariant of WP-INFRA-10, so that rule is split into these paths by the generator. CSP Report-Only with a working collector: `default-src 'self'; script-src 'self'; style-src 'self' 'sha256-<critical CSS>'; connect-src 'self'; worker-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. `robots.txt`: `Disallow: /hx/f/` for all, `/hx/` + `/data/` for training crawlers; `/hx/app/` crawlable. R0 SW acceptance: bypass `/hx/`, purge `gbg-*` only, no `skipWaiting`/reload. Spikes: S-1 `.bin` compression, S-2 5,000-file deploy, S-3 real Android, S-4 IA reader index (fallbacks: gzip + `DecompressionStream`; 256-passage packs + Range); record Netlify plan and credits. *Test:* second visit fetches 0 bytes for `/hx/f/*`; a `CACHE_NAME` bump keeps `hx-*`.

**WP-HIST-04 Fetch, normaliser, page map.** `fetch/*.py` with the S1 buckets and `sources.lock.json`; `normalize_ocr()` (D.5 S2), test "OR27-1 No. 196 matches a strict regexp after normalising"; re-derive the OCR quality proxy on the first 3 sources (hs1-13 not reproduced); reader-index page map. *Test:* rerun downloads 0 bytes; 5 citations resolve.

**WP-HIST-05 Entity registry and crosswalk.** `registry/entities.src` for 570 units; parse `^(U|C)-(\d+)([A-Z]{2})(-CAV|-ART|-SS)?$`; hand tables for the 49 off-grammar ids and the 103 batteries; collapse `U-14BK` into `U-84NY` and remove it from `union_oob_brigades.json` (the data edit is chapter 13 WP-DATA-06 step 4; here only the registry entry and alias); CWSS mapping for later (`U-20ME` to `UME0020RI`, US to UR, suffix codes); display names so no raw id reaches the UI (di-28); alias generator (hc Appendix A). The 95 unresolved placed ids and 5 chronology ids (`C-CAV`, `U-ART-RES`, `C-CAV-1/2/5`) go to `unmatched.csv` with expiry. *Test:* 570/570 resolved or listed; "14th Brooklyn" resolves to the 84th NY; Regular Army asserted iff state is US.

**WP-HIST-06 Build, emit, validate.** `build/emit.mjs` writes `apps/web/public/hx/` (entity, facts, lexicon, `ix/000-127`, `en/00-31`, `tx/nnnn`, manifest), content-hashes, keeps 2 versions; K001 + V01-V12; `validation-report.json` per build; wired into `ci` and `release.yml`; hashed names or an immutable `for=/hx/*` rule (`/data/historian/` would inherit 3600 s [S hc missed-8]). *Test:* clean rebuild reproduces hashes; a seeded violation turns CI red.

**WP-HIST-07 Eval harness.** Copy `tmp-hist-golden/` (`golden-lib.js`, `verify-golden.js`, `score-golden.js`, `run-system.js`, `gates.json`) to `pipeline/historian/eval/`; add the 175 batteries, forbidden strings, 40 pinned queries, Wilson gates; reproduce B0 14.0%, null 6.0%, B3 29.3%. *Test:* `verify-golden.js` exit 0 on deployed data, 2 on a seeded mutation; CI red on a > 2-point regression.

**WP-HIST-08 `search-core`.** Port `tmp-hist-current/proto.js` (`baseNorm`, `toks`, `dl`, `buildIndex`, `resolveQuery`, `compose`) to `packages/hx/search-core.js` shared by Node and Worker; D.6 rules; fix prototype gaps (hc section 5): "Vermont brigade" (Q024), "Robert E. Lee" vs battery commanders (Q032), day shortcut only with no linked entity (Q072), "France" to "Francis" (Q095), "pickets" (Q105), "Union soldiers" (Q078). *Test:* D.8 P1a/P1 gates; `run-ablation.js` keeps aliases, fuzzy, linking, intent and the no-answer gate load-bearing. *Risk:* 27/52 held-out queries share gold ids with the tuning set [S hc missed-4]: write a fresh set.

**WP-HIST-09 Data lake to entities and facts.** Field whitelist per file (V05); index brigades, divisions, corps, armies, batteries, successions, roads/structures/features, casualty notes, site pages, vignette `full_script` as paragraph passages, 137 events; tables `tenures`, `stats` (`{v,auth,basis,conf,edition,page}`; templated battery strengths (4 guns = 80, 6 guns = 107) and 36 zero-casualty regiments get `basis:"estimated"`), `rank` with a minimum-strength rule and correct maxima (C-8VA 76.7%, not C-26NC 69.7% [S]), `rollup`, `places`, `unknowns`, `routes`; brigade-level context lines; suspect records (`C-61VA` "Boisseau" vs Groner; `U-11PA`/`U-11PA-B`, which chapter 13 WP-DATA-07 re-verified against OR No. 9 p.156 as one regiment transferred between brigades on July 1, not a duplicate) go to the data chapter. *Test:* every numeric answer rebuildable from a row; `verify-golden.js` exit 0. *Risk:* unreconciled totals until WP-21 (I7 wording).

**WP-HIST-10 Composers and refusals.** Templates A1-A4, A6, A10-A14 with snapshot tests; I1-I8 linter over all rendered cards and the golden run; refusal, limited and roster-honesty templates ("I can't tell whether a specific soldier was at Gettysburg; the site holds regiments, not individual muster rolls" + route to Find Your Ancestor); conversation state, follow-up chips. *Test:* 0 forbidden strings over all cards; the 6 first-run chips return the canonical card first.

**WP-HIST-11 UI v2 and integration.** D.7 in `packages/hx/ui/`; `#q=` links and permalinks; `time-adapter.js` (never legacy `time`); `deepLinks` flag off until R1's parser is verified; entry points on `regiment.html`, `search.html`; migrate `search.html` to `search-core`, delete its scorer; nav/footer mount `min-height` (CLS 0.056); DOM builders instead of `innerHTML`; Trusted Types report-only. *Test:* 11-profile Playwright matrix, axe, Lighthouse CI, 100-query INP, keyboard run, network-log test; NVDA + VoiceOver + TalkBack at G-A1 (manual). *Risk:* in-app Search Units is not migrated (N1; its sort bug at `bundle.pretty.js:98790-98805` is outside the T0 list).

**WP-HIST-12 OR segmenters.** `segment/or27.py`: ToC parse limited to Nos. 1-378 and 379-589; whitespace-tolerant body headers (303/378, 162/211) fuzzy-matched to the ToC author; Pt3 dispatch segmenter storing `{sender, recipient, clock_text, minutes, page}`; page assignment per S3; Guild return from `djvu.xml` word boxes (`lxml.iterparse`). *Test:* ToC 376/378 and 211/211; >= 95% pages assigned; 20-document check; 5 folio checks per part.

**WP-HIST-13/14 Chunker, linkers.** 13: D.5 S4/S5/S7; test round-trip join and `tmp-arch-static-hybrid/e1_corpus.js`, `e3_latency.js` (14,391 passages, 80 near-duplicates). 14: grammar linker (compound ordinals with negative lookbehind so "Fifty-seventh" never yields "seventh"; ellipsis lists; arm agreement; OCR-variant table; battery commander table; header author as `subject`), person and place linkers, 200-mention labelled set; test precision >= 0.95 at conf >= B, recall >= 0.85 (`e5_link.js`/`e6_link2.js`: 389/467 ids).

**WP-HIST-15 Time anchors, evidence tables.** Grammar `\d{1,2}([:.]\d{2})?\s*(o'clock)?\s*[ap]\.?\s?m` + daybreak/sunrise/noon/sunset/dusk/nightfall/midnight + about/near; dispatch header = contemporaneous exact; report times attach to (unit, day) since only 75 sentences hold a place and a clock time [M]; tolerance +/-10 min; event links are proposals until reviewed; `anchors.csv` for the D-TIME packet. *Test:* 200-anchor precision >= 0.90; 137/137 covered or marked; >= 1,500 anchors; GQ-044/045/047/118-125 pass on "reported times" wording; no legacy clock. *Risk:* a realistic July 1-3 pool is "a few thousand at most" [S hs1].

**WP-HIST-16/17 Review tool, passage engine.** 16: static `tools/review/index.html` (D.5), exports `decisions.jsonl`; test 30-60 items/hour. 17: Worker loads `ix/`, `en/`, `tx/` lazily with LRU; `impact8` postings, `fnv1a32(stem) % 128`, entity postings `% 32`, `DecompressionStream` fallback; candidate union, RRF, MMR; composers A5/A7/A8; test p95 <= 50 ms at 6x, cold query <= 120 KB, V03 100%, index within 5% of 1.54 MB at 14.4 k passages (`e2_scale.js`).

**WP-HIST-18 Build-time LLM grafts.** Batch API (Haiku 4.5 or Sonnet 5.5; ids and prices re-verified at run time [U]): (a) link proposals for ambiguous mentions over about 26 k chunks, strict JSON schema against the candidate list, confidence capped 0.7 + `review` flag; (b) T0+ expansion (3-6 modern-phrasing queries per passage) into index-only `expansion` at weight about 0.5, `generated:true`, 200-item audit, dropped if > 5% misleading. **Guard [D]:** a passage retrieved only via `expansion` is never the lead, and quote selection scores sentences on the original query terms. Cache in `llm_cache/`, log in `llm_runs.jsonl`, disclosure per D.10. *Test:* CI fails on an LLM call for a non-Tier-A source; rebuild hits the cache.

**WP-HIST-19 Golden-Passage, audit #1, G-A2/G-X.** About 105 GP items per D.8 (seeds: B's 33 information needs x3 registers, hs1-16 and hs2 question sets, seo-23's about 60); `eval/report-<kb>.json` (recall@1/5/10, MRR, nDCG@5, judged@10, residual classification: retrieval/paraphrase, synthesis, linking); first 100-answer audit; recorded decision (freeze, levers, B0, C-lite). *Test:* `score-golden.js` over Golden-Core + GP writes `eval/report-<kb>.json` in T1 CI; G-A2 (D.1) passes or the miss is re-baselined in writing; audit unsupported claims = 0; the decision row exists in `decisions.jsonl` before P3 starts.

**WP-HIST-20/21 State books; Fox, Guild.** 20: NYFR x3, PA 1914, ME/NJ/MI/MN; numbering tables; tag `veteran_address_18xx` retrospective; test >= 90% of NY + PA units have a narrative, GQ-009..012. 21: Fox notes vs tables (rows from word boxes, K+W+M checksum, never auto-edit digits); Guild return with a regimental-vs-brigade rule; `casualty_sources` `{unit,k,w,m,total,checksum_ok,source,edition,page}`; reconciliation report (OR returns > Fox > Dyer, Busey and Martin "see also"); test checksum failures < 3% after the manual queue, GQ-010/024/031/032.

**WP-HIST-22 Page-data export.** Emit `units/<slug>.json` `{facts, <= 3 excerpts <= 120 words with cite, scan url, licence, reviewer (seo-14 schema), related}`; `14th Brooklyn` maps to the 84th NY, no page for the alias stub; thin-content gate per the SEO chapter (default >= 1 reviewed narrative passage + >= 120 unique words, else `noindex` or rolled into the brigade page). Generator, URL taxonomy, sitemap: SEO chapter (consumed by WP-SEO-16 step 2; hf-28's `kb/export/unit_pages/` path is superseded by this `units/<slug>.json` under `apps/web/public/hx/`). *Test:* schema-valid export; sample pages Lighthouse SEO/a11y >= 95.

**WP-HIST-23-27 Voices, SHSP, contested UI, reviewed answers, W4b.** 23: B&L (scope `campaign`), Joint Committee, memoirs; `persp` on 100% of narrative passages, chips "written 1863" vs "written 1889". 24: SHSP shortlist of about 150 articles tagged `lost_cause`/`self_justifying`; skipped without a reviewer (H.1 #13). 25: `contested.yaml` seeded from the 25 chronology `narrative` fields and hs1's list (Longstreet/Early-Allan delay, Sickles vs Meade, Eleventh Corps collapse, Reynolds's death time, first shot), rule I6, filters, evidence table, sources drawer. 26 (= WP-SEO-23; authored and budgeted here once, `/questions` templates and gate in chapter 10): about 60 human-authored answers shared with seo-23 (LLM only as a drafting aid), `rv.*` shards with reviewer, date, hash; CI fails on "Reviewed" without a signed decision. 27: Clark, Bates, Phisterer, Dyer 1908, CMH, small states, Itinerary until the coverage KPI is met. *Tests:* perspective + lag on every narrative passage; GQ-020/021/056/074; contested GP items return >= 2 sides or the disclosure; 0 unsupported claims in audit #2.

**WP-HIST-28/29 W5, W6.** 28: civilians, Chronicling America curation (12 req/min), guides, NPS pages, cemetery and monument lists, weather source hunt ("unknown" until a primary is found), opt-in offline pack (page-managed `hx-v<schema>` cache, resumable, off under `saveData`, about 13-17 MB). 29: Wikipedia and OSM in separate files with the D.2 obligations, LoC photos (40-75), ACW Battle Data slices; Tier B never in a vector index or LLM call. *Tests:* per-item licence checks; `may_send_to_llm=false` enforced; attribution on every excerpt and the OSM layer; GQ-057/075/098/124.

**WP-HIST-30-32 Rosters, B, C-lite.** *Acceptance for all three: their gates, not a build date (30: NPS written confirmation; 31: G-X.2 B0 rule; 32: G-X.3 + G-C-GA); none is scheduled before its gate passes, and a missed gate ends the branch.* 30 (BLOCKED): link-out until NPS confirms in writing (D-CWSS); if cleared: crosswalk 409/467 + 50 hand + 7 ambiguous, stream `Soldiers_Personz.tsv` once, per-unit shards (<= 4 per query, INP < 200 ms). 31: only via G-X.2; reranker then B0 with the D.1 kill rule. 32: only via G-X.3/G-C-GA; R0 spike first; `/api/ask` per inf-31 (rate limit, `Sec-Fetch-Site` check, 2 KB body, secrets in Netlify env, Blobs budget guard returning `{mode:"static"}`, `HISTORIAN_ENABLED=false`); server re-runs retrieval; direct Anthropic API in a dedicated workspace (not the Netlify AI Gateway); privacy/Terms/banner first.

**WP-HIST-33-36 Governance, legal, reviewer programme, operations.** 33: the registry and changelog feed `/sources`, `/method` and `/corrections#data-versions` (pages authored by chapter 11 WP-CONTENT-14/16; `/data-notes` is a 301 to that anchor, chapter 11 DC-7), `CHANGELOG.md`, intake, tombstones, `passage_alias.json`, citation permanence and rollback drill (D.10). 34: Historian paragraph in the interim privacy correction (WP-DEC-07), `docs/data-inventory.md` rows (`hx.filters`, `hx.fb`, contact form), Terms line on quotation and credit, counsel packet (PD-1931 arithmetic, Busey and Martin figures, share-alike embeddings, AI-disclosure duty, minors policy). 35: charter, hours ledger against 59-95 h, second reader on 30% (kappa >= 0.6), quarterly audit; feeds WP-DEC-10/11. 36: weekly release (Tue/Wed, never in freeze windows), nightly T3 eval, weekly link check, monthly credit check (70% alert), quarterly rollback drill. *Tests:* a correction ships within a day as a Corrected entry; a simulated IA outage falls back; network-log test contacts only disclosed origins; drill log <= 90 days old.

---

## F. Sequencing, calendar, stop rules

**Calendar rule (review 3).** The windows below are the register's floor dates. Chapter 15 governs: P0 and P1 (RM-40/41, WP-02..11 and 33-36) sit in the L path, while P2-P4 (RM-74..76, WP-12..27) are only in the A and F paths and P5-B-C (RM-96) in the optional pool; at 15 h/week the L path ends about May 2029 and at 30 h/week about Jan 2028 (chapter 15 s.5.1), so "P2 live before 2027-06-25" is a best case that needs a second contributor or AI leverage. The ordering, gates (G-A1, G-A2, G-X) and stop rules are unchanged.

**F.1 Chain.** 02 -> 04/05 -> 06/07 -> P1 (08 -> 09 -> 10 -> 11) -> G-A1 -> P2 (12 -> 13/14 -> 15/16/17 -> 18 -> 19) -> G-A2/G-X -> P3 (20-22) -> P4 (23 -> 25 -> 26; 24 only with a reviewer; 27 stoppable) -> P5; 33-36 run alongside. Retro-audit and tier gate precede Wave-2 ingestion. External waits (permission emails, Netlify plan, reviewer search, real phone) run in parallel. The time model (ch. 04) is off the critical path: the Historian stores 1863 minutes and holds legacy labels; WP-15's map-clock column waits for D-TIME (DG-3). Anything that ships bytes waits for R0 (D-ORDER); spikes and offline pipeline work do not. Windows: by 2026-10-21 WP-02/03 (scratch-site spikes)/04/07, owner actions 5 and 8, reviewer search; R1 (by 2026-11-05) WP-01 + interim privacy paragraph (not 2026-11-15..20); 2026-11 to 2027-01 P1/G-A1 (reviewer named by DG-2, 2026-11-30); 2027-01 to 03 P2/G-A2/G-X (D-TIME sign-off at DG-3, 2027-01-31, enables the map-clock column); 2027-03 to 05 P3 (feeds SEO train S4; if it slips, S4 ships computed-facts pages); 2027-05 to 06-20 P4 (no KB deploy 2027-06-25..07-05, the anniversary peak); then P5 base. Aim for P2 live before 2027-06-25; check credits and the kill switch in early June.

**F.2 Effort re-total.** P0 7-10 (hf) vs 8.5-17 here; P1 10-14 vs 9.5-14; P2 10-16 vs 17.5-25.5 (item ranges sum higher than the roll-up; the low end assumes full reuse of the tested prototypes); P3 8-13 vs 6.5-10.5; P4 9-15 vs 11.5-18.5; governance 5-8 vs 4-8.5; **core 49-76 vs 57.5-94**: schedule at 76 (P50), 94 as P90. At 15/30/40 h per week the core is 31-50 / 15-25 / 12-19 weeks (with the register's 0.7 factor 44-72 / 22-36 / 16-27).

**F.3 Stop rules.** Every phase ships value alone. Stop B at a G-B0 miss; no C-lite if any G-C-GA gate misses; backlog > 14 days freezes new-source ingestion; bandwidth > 25% of monthly credits: move `/hx/f/` to a free-egress host (adds a `connect-src` origin; terms [U]) or trip the kill switch; a phase slip > 20% defers W4b, W5, W6 before any harness, accessibility or citation work; no reviewer by P4: skip WP-24, ship the rest "Unreviewed".

---

## G. Verification debt (verify first)

1. Netlify plan, credits, file limits (S-2), `.bin` compression (S-1), Range. 2. IA reader index (`leafNum` - 3, then - 5 after leaf 887) on all OR parts and state books (S-4). 3. Phone latencies (x6 modelled) on a real Android (S-3). 4. hc-27 (feedback, UNVERIFIABLE): settle with WP-34/D-LEGAL. 5. hs1-13 (OCR proxy, not reproduced) and hs1-16 (QA harness, a design): pilot on OR27-1. 6. Linker precision beyond the 25-item sample; anchor pool size; Confederate coverage (about 88 OR regiment-level reports for 241 Confederate units). 7. Wayback capture of archive.org URLs. 8. Counsel: PD "before 1931", Busey and Martin figures, AI-disclosure duty, minors policy. 9. NPS on CWSS; contractor authorship of NPS CLRs; the 28 hourly Bachelder maps; the Jacobs weather primary. 10. LLM model ids and prices; Kaggle, DPLA, NARA API, Broadhead diary (hs2-27); iOS HTTP-cache retention of T1.

---

## H. Owner decisions, conflicts, dependencies

**H.1 Owner decisions (defaults in bold).**

| # | Decision | Default | By |
|---|---|---|---|
| 1-2 | Name a historical reviewer and second reader, credit preference (D-HIST-REVIEW, class B); weekly review budget | **name one before P2, 3-4 h/week; fallback "Unreviewed"** | DG-2 |
| 3 | Numbers policy: OR returns > Fox > Dyer, Busey and Martin "see also" with edition and page; counsel check | **yes** | P2 |
| 4 | Netlify plan and credits (action 5) | **check this week** | P0 |
| 5 | Send the three permission emails (action 8; only P5 rosters depend on them); confirm the site stays non-commercial (HMDB, audio) | **yes; yes** | P5 |
| 6 | Confederate depth: accept regimental depth from OR Pt2, Clark, CMH, SHSP, memoirs with a coverage note | **accept + note** | P3 |
| 7 | Stage B/C posture | **OFF; decide at G-X with numbers** | end of P2 |
| 8-9 | Adjacent topics (Antietam, causes of the war); sensitive content | **decline with a pointer; quote period language with a note, never in suggestions, hide toggle, Classroom collapses** | P1 |
| 10 | A real mid-tier Android for S-3 and the P2 gate (shared with D-UNIT-RENDER) | **provide one** | P2 |
| 11 | Who authors and reviews the about 60 reviewed answers (shared with seo-23) | **owner drafts, reviewer signs** | P4 |
| 13 | SHSP without a reviewer [new] | **skip** | P4 |
| 14 | Optional enumerated outcome event (intent id, mode, route, latency bucket; no text) via D-TELEMETRY [new] | **none in Stage A** | DG-3 |
| 15 | Publish PD page-text permalinks for cited pages [new] | **cited set only, noindex first** | P4 |
| 16 | Action 10 answers (provenance of the data notes citing a YouTube vignette; Busey and Martin facts-only) | **needed before W0 is called owner-authored** | DG-1 |

**H.2 Decision conflicts (none silent).** (1) Effort: D-HIST-ARCH says core 49-76 d; WP sum 57.5-94 (F.2). (2) hf 6.2 (light + dark, `mailto:`), hf 1.4 (`style-src 'self'` with inline CSS) and hf's 3-line SW patch are superseded by D-DESIGN (dark only), D-CONTACT (form), D-CSP (style hash) and D-SW (R0's SW). (3) D-LICENSE names `/data/` for training crawlers; this chapter adds `Disallow: /hx/f/` for all and `/hx/` for training crawlers. (4) hf decision 8 (no unanswered-question counter) vs D-TELEMETRY `event`: none in Stage A, later ones enumerated only. (5) D-HIST-REVIEW says "ship labelled and capped"; SHSP is skipped instead (stricter). (6) seo-23's "the same 60 become the gold set": `route_covered` items, reviewed route off. (7) Anchor floor 1,500 / target 3,000 (Design A said 3,000) [D]. (8) HMDB: hs2 says B-NC, D-CWSS keeps bulk Tier C: consistent. (9) Review 3: chapter 10 Appendix A now bars training crawlers from all of `/hx/` (this chapter's WP-03 text), and the shared strings of WP-01 stay in chapter 11; the takedown SLA (<= 24 h) is the value chapter 13 adopted.

**H.3 Cross-domain dependencies.** R0 SW, headers, CSP collector and Git/CLI deploy (infra, perf); time model and adapter (ch. 04); deep links (D-URLSTATE, T0); SEO unit pages, `/questions` hub, sitemap/robots; QA/CI (eval, Lighthouse CI, network-log test); docs-copy sweep and trust pages; legal (privacy, Terms, data inventory, counsel packet); data-integrity (number authority, retro-audit fixes, 95 unresolved ids, `C-61VA`); pages (`regiment.html`, `find-ancestor.html`, `search.html`, `/learn`); a11y evaluation; app rebuild (in-app Search Units, N1).

## I. Traceability

Every finding in hc, hs1, hs2 and the related di/inf/seo/qa items is covered by a WP in section C; none was REFUTED (B.2); UNVERIFIABLE items (hc-27, hs1-13, hs1-16) are in G. The "missed by specialist" items are applied in WP-01/02/04/05/06/07/08/09/11/12/21/27/28/29. Owned elsewhere: time model, Bachelder georeferencing (hs1-07), 3DEP viewshed and 1863 landscape (hs2-10, hs2-11), site-wide SW/CSP, app source (N1), casualty reconciliation beyond the Historian's facts (di-03), the 60 Q&A pages (seo-23), monument provenance.
