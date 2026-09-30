# arch-static-hybrid — Ask the Historian, Design A: STATIC HYBRID RETRIEVAL (zero server, zero per-query cost)

Architect: **arch-static-hybrid** · Mode: NO-BUILD, read-only design · Date: 2026-09-30
Inputs read in full or in the relevant parts: `BRIEF.md`; `hist-current.md` (109 KB); `hist-sources-1.md` (195 KB); `hist-sources-2.md` (195 KB); `data-integrity.md` (132 KB); `DEPLOY_DIR/historian.html`, `netlify.toml`, `sw.js`, and the `data/` schemas; parts of `infra-netlify.md`, `app-time.md`, `pages-A.md`, `pages-B.md`.
Evidence tags used throughout: **[M]** measured by me for this design (scripts in `plan-work/tmp-arch-static-hybrid/`, listed in Appendix A, re-runnable) · **[S]** taken from a sibling report (named) · **[C]** read from code (`file:line`) · **[E]** estimate or model, not measured · **[U]** unverified — could not be checked in this session (my WebFetch/WebSearch tools hit a spend limit mid-task, so no third-party library or platform documentation was re-read; every such claim is marked [U] and has a Phase-0 spike attached).

---

## 0. TL;DR

1. **What this design is.** A build-time pipeline turns public-domain primary sources (Official Records, state monument books, Fox, Battles & Leaders, Joint Committee testimony, later newspapers and rosters) plus the site's own JSON into **immutable, content-hashed, lazily loaded tiers**: a small **entity + facts tier** with a **lexicon** for typo repair (T1: units, people, places, commanders, numbers, time anchors), a **sharded passage tier** (T2: BM25 impact postings in 128 hash buckets + 16-passage text shards), and optional **roster shards** and media (T3/T4). At runtime a Web Worker links entities, detects intent, answers structured questions **directly from tables**, and answers narrative questions with **verbatim, page-cited, quote-span-validated passages**. No text is generated, so the answer layer cannot fabricate a sentence (it can still select a wrong passage or fact, which is exactly what the evaluation in §10 measures); no server, no API key, no per-query cost.
2. **Why it is credible — measured, not assumed [M].** On the 7 public-domain sources already sitting in `plan-work/tmp-hist-sources-1/` (OR Ser. I vol. 27 pts 1-3, NY Final Report v1, Fox, Battles & Leaders v3, Joint Committee v1): **3.19 M words, 14,391 passages (~190 words each), 16.2 MB of text — 288× the 11,088 words the Historian indexes today.** The complete inverted index is **1.5 MB brotli** (128 shards, average 12 KB, maximum 20 KB); the text is **5.3 MB brotli** as 16-passage shards (5.7 KB each, 367 B/passage); the lexicon is **34 KB**. Decode + BM25 + top-10 over all 14,391 passages takes **0.057 ms p50 / 0.126 ms p95** in Node (§7.9), fuzzy repair over 20,605 terms **3.5 ms** brute force. Extrapolated to a 40,000-passage corpus: index ≈ 4.3 MB, text ≈ 14.7 MB, i.e. well inside the 40 MB lazy budget set by `hist-sources-2` (§6.7).
3. **The retrieval problem is not ranking speed; it is structure.** `hist-current` proved plain BM25F equals the current page (S@1 76%) and that the gains come from derived aliases, entity linking, fuzzy repair, intent+composition and a no-answer gate [S hist-current §4.3]. This design therefore puts **entities and tables first** (hybrid = symbolic entity/facts layer + statistical passage layer) and treats the passage index as the *evidence* layer beneath them.
4. **Unit linking is feasible but a naive alias table is wrong 1 time in 3.** [M] A naive alias regexp linked 28.3% of 6,332 OR/NY passages, but 7 of 22 sampled links were wrong (compound ordinals: "Fifty-**seventh** North Carolina" matched the 7th; "Twenty-**fourth** New York Battery" matched the 4th New York cavalry; battery/militia/cavalry mix-ups). A grammar-based linker (compound-ordinal parser, ellipsis lists "Forty-ninth and Seventy-seventh New York", arm-word agreement) linked **24.1% of passages with 3,820 confident mentions and 389 of 467 site regiment records (83%) at least once** — versus **9.6% (45/467) with any mention today** [S hist-current §2.2] — from just three of the sources. 25-item manual sample: 24 correct, 1 doubtful (side ambiguity in Virginia units). The pipeline therefore mandates a labelled set and a human review queue (§5.6).
5. **Times must be stored as 1863 clock evidence, not ticks.** [M] 5,702 clock expressions in the 7 sources (39% of OR Pt 1 passages contain one), but only **75 sentences** contain both a Gettysburg place term and a clock time — so anchors attach at *report/unit/day* level and are linked to the 137 chronology events by reviewed `event_key`s. Passages store `clock_min` (minutes after midnight, local 1863) and the runtime converts to ticks with the canonical time model, so a re-timing of the map (audit C4) never invalidates the KB.
6. **Governance is part of the architecture.** Every record carries `source_id`, `tier`, `license`, `citation`; CI fails on a Tier C record, a missing licence, a reprint imprint, an OCR score < 0.80, an unresolved entity id, a quote whose span does not equal the quoted text, or a developer-note leak [S hist-sources-2-01, hist-current-11, data-integrity-24].
7. **Effort and delivery.** ~54-85 person-days total [E], phased so that **P1 (~10-14 d) fixes the Historian on the site's own data** (hist-current H1+H2), **P2 (~8-12 d) adds the Official Records backbone with citations and time evidence**, and later phases add state books, narratives, newspapers and rosters. Each phase has numeric gates (§10.6, §13).
8. **What this design cannot do** (and what to do about it, §14, §16): paraphrase-heavy or multi-hop "why" questions beyond what lexical + concept-expansion retrieval reaches; anything requiring free-form synthesis. The KB, schema, citation format and eval set are deliberately architecture-neutral so an optional server-side LLM tier (`infra-netlify-31`) can be added later on top without re-ingesting.

---

## 1. Goals, non-goals, principles, constraints

### 1.1 Goals (each has a metric in §10 or §12)
| # | Goal | Metric / gate |
|---|---|---|
| G1 | Answer the questions people actually ask — regiment/commander/place lookups, who/when/where/how many, "what happened at…", "what did X report", contested "why" questions — with a source on every claim | S@1, canonical@1, fact@3, recall@5, citation precision |
| G2 | Grow the searchable text from 11,088 words to millions (≥ 250×) with page-level citations | words indexed; % answers with ≥ 1 page-cited passage |
| G3 | Never invent: answers are template output from structured fields or verbatim quotes; unknowns are stated | faithfulness 100% by construction; unsupported claims = 0 in a 100-answer audit |
| G4 | Refuse correctly: out-of-scope, no-data, unanswerable | correct decline ≥ 92% (n ≥ 100 with variants), false refusal ≤ 5% |
| G5 | Fast on a mid-tier phone: zero bytes added to first paint of any page; ≤ 120 KB per cold passage query; p95 answer compute ≤ 50 ms; INP ≤ 200 ms | Lighthouse ≥ 95 on `/historian`, INP p75, payload per query |
| G6 | Zero server, zero per-query cost, zero third-party requests at runtime (`connect-src 'self'`) | CSP test; Netlify request log |
| G7 | Honest provenance: licence, perspective (side/role/lag/retrospective), OCR confidence, time-evidence type on every passage | schema validation; UI chips |
| G8 | Maintainable by one person: rerunnable pipeline, lockfile, review queue that scales to a few hours a week, corrections that ship in a day | pipeline determinism test; corrections SLA |

### 1.2 Non-goals
- No runtime LLM, no embeddings model in the browser in Phases 0-4 (an on-device rerank experiment is specified as an optional, gated Phase 5, §7.8).
- No scraping of Tier C sources (American Battlefield Trust, Ancestry/Fold3/Find a Grave, FamilySearch, HMDB bulk, Stone Sentinels, NYSMM, ACHS, NHGIS) [S hist-sources-2 §3]. They appear only as user-initiated outbound links.
- No re-authoring of vignettes or map data (owned by data-integrity/time/app plans); this design *consumes* their outputs through stable contracts (§15).

### 1.3 Design principles
1. **Symbolic first, statistical second, generative never.** Tables and entity cards answer what they can; passages answer what they can quote; everything else is an explicit "I don't have that".
2. **Evidence is data.** Every shown sentence resolves to a record id + field or a `[start,end)` span in a passage; a linter re-checks this at build and in Playwright.
3. **Store facts about the world, derive facts about the site.** Passages store 1863 clock minutes, printed page numbers and entity ids; ticks, deep links and display names are derived at runtime from the canonical time model and entity registry.
4. **Lazy by tier, immutable by hash.** Cost is paid only by users who ask, and only once per KB version.
5. **The corpus is untrusted input.** OCR text is rendered through `textContent`/DOM ranges only (no `innerHTML`), which is also what makes an enforced CSP possible [S hist-current UX-16, infra-netlify].
6. **One ID space, one build.** Regiment/battery/brigade/division/corps/person/place/monument/page ids are the entity registry shared with Search Everything, Regiment, Find Ancestor and the in-app search [S pages-A-19, data-integrity-02, hist-sources-1-02, hist-sources-2-03].

### 1.4 Hard constraints found in the inputs (each verified where cited)
| Constraint | Evidence |
|---|---|
| Static Netlify hosting; publish dir is the repo root; no build today; manual drag-and-drop zip deploys; case-mangled asset names in the zip | `netlify.toml:1-2`; BRIEF N1; `infra-netlify.md` |
| `/data/*` is `Cache-Control: public, max-age=3600` and the service worker treats `/data/` **network-first** and never expires it | `netlify.toml:28-30`; `sw.js:61` [C] |
| CSP is Report-Only with `worker-src 'self' blob:`; `connect-src 'self'` plus Mapbox/PeerJS hosts | `netlify.toml:19` [C] |
| The Historian eager-loads 15 JSON files (317,788 B raw, ≈64 KB br) with no error handling | `historian.html:67-80` [C] |
| Owner is solo; no repo/CI exists for the app or the data (N1, DI-25) | BRIEF; `data-integrity.md` §8 |
| Plan tier and credit balance unknown; on credit plans bandwidth is 20 credits/GB, requests 2 credits/10k, production deploy 15 credits, Free = 300 credits hard limit | `infra-netlify.md` finding 30 [S; plan itself **U**] |
| 15 (ordinal, state) keys have arm collisions (e.g. `U-7MI` vs `U-7MI-CAV`, 10 Virginia pairs); 49 of 467 regiment ids are off-grammar; 103 batteries are label-keyed | [M] `e5_link.js`; [S] hist-sources-2 verification (crosswalk measurement) |

---

## 2. What I measured for this design (summary; details and commands in Appendix A)

| ID | Measurement | Result | Script |
|---|---|---|---|
| M1 | Passages, words and text size of the 7 local PD sources (target ≈ 180 words, paragraph-aligned) | 14,391 passages; 16.23 MB text; 3.19 M raw words; per source: OR27-1 2,712 · OR27-2 2,654 · OR27-3 2,040 · NYFR-1 966 · Fox 1,152 · B&L-3 2,438 · JCCW-1 2,429 | `e1_corpus.js`, `e2_scale.js`, `e10_words.js` |
| M2 | Strict "Gettysburg place term in the passage" filter (lower bound of relevant text) | 3,153 passages / 3.71 MB (1,062 of OR27-1, 524 OR27-2, 181 OR27-3, 442 NYFR, 230 Fox, 380 B&L, 334 JCCW) — the filter is deliberately narrow (place term must sit in the same passage); the true "battle-relevant" set lies between 3.2 k and 14.4 k passages | `e1_corpus.js` |
| M3 | Inverted index size, 128 hash buckets, varint-delta postings, brotli-11 | vocab 44,094 stemmed terms (20,605 with df ≥ 2); 1,267,603 postings; **1,538 KB** (df ≥ 1) or **1,361 KB** (df ≥ 2); avg shard 12 KB, max 20 KB. For the strict 3,153-passage subset: 397 KB in 64 shards | `e2_scale.js`, `e1_corpus.js` |
| M4 | Text shard granularity sweep (brotli-11 per shard, JSON array of passages) | 8/shard 3.0 KB (389 B/passage) · **16/shard 5.7 KB (367 B)** · 32/shard 10.9 KB (349 B) · 64/shard 20.8 KB (332 B) · 250/shard 72.0 KB (307 B). gzip-9 is 17-23% larger than brotli-11 | `e4_shardsweep.js` |
| M5 | Lexicon (front-coded terms, df ≥ 2) | 20,605 terms; 87 KB raw; **34 KB brotli** | `e2_scale.js` |
| M6 | Query latency, Node 24.19, lazy varint decode of touched terms, 14,391 passages, 15 mixed queries × 100 runs | **p50 0.057 ms · p95 0.126 ms · max 2.6 ms** (JIT warm-up outlier); worst-case common terms have df 4,825-8,694 | `e3_latency.js` |
| M7 | Fuzzy repair by bounded Damerau-Levenshtein, brute force over 20,605 terms with length/first-letter prefilter | **3.48 ms/query**; returns OCR-noise neighbours too (e.g. `longstret → longstreet, longstrcet, lougstreet`) | `e2_scale.js` |
| M8 | Typo/phonetic repair on the site's 937 name terms (len ≥ 5), 2,682 synthetic single-edit typos in 6 classes | **DL ≤ 1 (≤ 2 for len ≥ 8): 100% recall in every class, 1.04-1.11 candidates**; Soundex 34-100% (worst on substitution 34%, insertion 51%); consonant-skeleton key 11-99% (only good for vowel/double-letter errors) → DL is the primary, skeleton a cheap secondary, Soundex is dropped | `e9_fuzzy.js` |
| M9 | Near-duplicate passages (sampled 8-word shingles, ≥ 60% overlap with an earlier passage; no overlap in chunking) | 80 of 14,391 = **0.6%** (45 inside the Joint Committee volume; 10 OR27-1 ↔ JCCW); a dedupe stage is cheap but needed | `e3_latency.js` |
| M10 | Table/list-like passages by digit/short-token density | OR 5.9-6.5%, Fox 10.6%, B&L 8.3%, JCCW 2.9%, NYFR 1.4% → a passage-type classifier must route tables to structured extraction | `e7_tables.js` |
| M11 | Clock expressions | 5,702 over 7 sources; passages containing one: OR27-1 39.2%, OR27-3 30.0%, OR27-2 24.2%, JCCW 20.5%, B&L 13.0%, NYFR 11.9%, Fox 0.9%; **sentences with both a place term and a clock time: 75 in total** | `e11_time.js` |
| M12 | Unit linking on OR27-1/2 + NYFR-1 (6,332 passages) | naive: 28.3% passages, 7/22 sample errors; grammar+arm linker: **24.1% passages (1,524), 3,820 confident mentions, 389/467 site regiment ids (83%)**, 269 battery/militia mentions correctly left unlinked, 1,771 mentions of units that have no site record (other parts of the campaign), 25-item sample: 24 correct / 1 doubtful | `e5_link.js`, `e6_link2.js` |
| M13 | Entity tier as serialised by the `hist-current` prototype (957 records, 24,694 body words incl. vignette scripts) | cards 55.7 KB br (147 KB raw JSON without bodies compresses to 19.6 KB), alias map 1,679 entries 10.8 KB, name vocabulary 1,390 terms 3.9 KB, surname map 570 → 5.5 KB; **total 75.9 KB brotli**, unoptimised | `e8_entity_size.js` |

Limits of these measurements (stated plainly): Node on a desktop CPU, not a phone; a single tokenizer/stemmer; chunking at paragraph boundaries without the segmenters described in §5; OCR text not yet cleaned beyond whitespace/hyphen/U+FFFD; the linker sample is 25-45 items (illustrative, not a precision estimate); the 7 sources hold ≈ 22 MB of raw OCR against a ≈ 75 MB P0 raw volume (SHSP alone is 49 MB) [S hist-sources-1-17] — extrapolation is linear and flagged [E].

---

## 3. Architecture overview

```
BUILD TIME (owner's machine / CI, Node 24 + Python 3.11)                   RUNTIME (visitor's browser, Netlify static files only)
------------------------------------------------------------------------   -----------------------------------------------------------
sources.yaml (registry, tier, licence) ─┐                                   /historian.html (shell, no data)  ── module script (~30 KB br [E])
raw/ (git-ignored cache, sha256 lock)   │                                     │
 fetch → normalize(OCR) → segment →     │                                     ├─ main thread: UI, a11y, URL state, focus     (no search work)
 classify(prose|table|list|front) →     │  build/emit                         └─ Worker (module): search-core + composers
 chunk → link(units,people,places) →    ├──►  dist/hx/ (manifest.json + f/<hash>)  T1 fetch on load (parallel, ≈115 KB measured + facts ≈100 KB [E]):
 time anchors → dedupe → validate →     │        manifest.json                     manifest.json (≤ 5 KB)  entity.<h>.json (76 KB)  lexicon.<h>.bin (34 KB)  facts.<h>.json
 review queue (human decisions.jsonl) ──┘        entity.<h>.json                T2 fetch per query (lazy, ≈50-120 KB):
 facts (tables + provenance) ───────────►        facts.<h>.json                   ix/<bucket>.<h>.bin (12 KB avg)  en/<bucket>.<h>.bin  tx/<n>.<h>.json (5.7 KB)
 gold set + eval gates (CI) ────────────►        lexicon.<h>.bin              T3 optional: ro/<unit>.<h>.json (rosters), media
                                                 ix/*.bin  en/*.bin  tx/*.json   Service worker: cache-first for /hx/* (immutable), version by manifest
                                                 ro/*.json (phase 5)            Time model: /js/time-model.js (canonical) ; Entity registry: entity tier
                                                 sources.html data, errata      Links out: map (?tick,&unit) · regiment.html · IA scan page · NPS/Fold3 (user-initiated)
```

**Tiers and what each answers**

| Tier | Contents | Loaded | Size (measured / target) | Answers |
|---|---|---|---|---|
| T0 shell | HTML + CSS + worker + UI code | page load | ≤ 45 KB br total [E] | nothing; input enabled immediately, first question queued |
| T1 entity + facts + lexicon | 957+ entity cards (units at every echelon, commanders, places, roads, structures, monuments, vignettes, chronology events, successions, site pages), alias/surname maps, `facts` tables (tenures, stats with authority, rankings, roll-ups, time anchors, known-unknowns), lexicon | after first paint, in the Worker | entity 76 KB [M]; lexicon 34 KB [M]; facts ≈ 60-150 KB [E]; total target ≤ 250 KB br | lookups, who/when/where/how many, comparisons, routing, refusals — **without any passage shard** |
| T2 passage | inverted index (128 buckets), entity→passage postings (`en/`), passage text shards (16/shard), neighbour pointers | lazily per query | index 1.5 MB / text 5.3 MB for 14.4 k passages [M]; 4.3 MB / 14.7 MB at 40 k [E] | narrative, testimony, "what did X report", evidence tables, contested questions |
| T3 rosters | per-regiment CWSS card shards + surname-prefix index | on demand | 6-12 MB [S hist-sources-2 §9, E] | "is my ancestor listed in the 20th Maine" (Phase 5, gated by NPS written reply) |
| T4 media | LoC photo thumbnails, maps | on demand | per item ≤ 150 KB [S hist-sources-1-08] | illustrations attached to place/unit cards |

---

## 4. Data model

### 4.1 Identifier rules
- **Entity ids** are the canonical OOB ids after the crosswalk (`U-20ME`, `C-15AL`, `U-V-1-3`, brigade `U-I-1-1`, division `U-I-1`, corps `U-I`, army `ARMY:U`), plus new namespaces `P:<slug>` (person), `LOC-###`/`ROAD-#`/`STR-#`/`TF-#` (existing terrain ids), `MON:###` (monument), `EV:<day>T<tick>` (chronology event, legacy id) and `EV2:<slug>` (KB events), `VIG:V-###`, `SITE:<route>`. Ids are never reused; renames leave an alias entry (`alias_for`) for two major KB versions [S data-integrity §8].
- **Document ids**: `<source>:<locator>` e.g. `OR27-1:0196` (report No. 196), `OR27-3:D0702-0340` (dispatch July 2 3.40 am), `NYFR3:137NY`.
- **Passage ids** (stable across rebuilds when the text is unchanged): `<doc_id>#<content-hash8>` — the hash is over the NFC-normalised cleaned text, so re-chunking that does not change a passage keeps its id, and shared links/bookmarks survive. A `passage_alias.json` records `old_id → new_id` when text is corrected.
- **Numeric passage numbers** (what postings and shard keys use) come from an **append-only `id_map.json`**: a number is never reused, removed passages become tombstones, and text shard = `floor(number / 16)`. This keeps rebuild diffs local — a corrected passage re-uploads its own text shard and the index buckets that contain its terms, not everything after it in source order.
- **KB version** `kb_version` = semver (`MAJOR` id/schema break, `MINOR` new sources/fields, `PATCH` corrections) + `built_at`; `manifest.json` lists every file hash.

### 4.2 Registry: `sources.yaml` / `Source`
```jsonc
{ "id": "SRC-01", "title": "Official Records of the War of the Rebellion, Ser. I, vol. 27, pt. 1", "short": "O.R. I/27/1",
  "tier": "A",                                   // A public domain · B attribution/share-alike · C link-out only · A-pending
  "license": {"id": "PD-US-Gov-1889", "statement_text": "…", "statement_url": "https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077699761.json", "verified_at": "2026-09-30", "reviewer": "ML"},
  "imprint": {"year": 1889, "publisher": "GPO", "reprint": false, "ia_id": "warofrebellion271unit", "scan_org": "UIUC"},
  "attribution": null,                            // required non-null for tier B
  "may_index": true, "may_redistribute": true, "quote_max_words": null,
  "genre": "official_report", "perspective_default": {"retro": false},
  "ocr": {"engine": "ABBYY FineReader 11", "proxy": 0.984, "gate": "accept"},
  "citation_template": "O.R., Ser. I, vol. 27, pt. 1, p. {page}", "page_link": "ia_reader", 
  "notes": "Use 1880-1901 GPO scans only; never the 1971 reprint (warrebellionaco00cowlgoog)" }
```
Allow-list by **curated identifier**, not by IA `date <= 1930` — the verifier showed IA `date` is a series-start value (OR = 1880, Confederate Veteran issues of 1902-29 = 1893, SHSP = null) and reprint scans sit beside originals [S hist-sources-1 verification MISSED-1]. Treat IA `possible-copyright-status` = None as "unknown", not "ok".

### 4.3 `Document` (report / article / section / dispatch / witness)
```jsonc
{ "doc_id": "OR27-1:0196", "source_id": "SRC-01", "title": "Report of Col. Joshua L. Chamberlain, Twentieth Maine Infantry", 
  "author": {"person_id": "P:chamberlain-jl", "name": "Chamberlain, Joshua L.", "rank": "Col.", "unit_id": "U-20ME", "role": "regimental_cdr"},
  "date_written": "1863-07-06", "genre": "official_report",
  "pages": {"start": "622", "end": "626", "scan_leaf_start": 642, "reader_index_start": 639},
  "perspective": {"side": "union", "role": "regimental", "lag_days": 4, "retrospective": false, "bias_tags": []},
  "ocr_score": 0.98, "segmentation": {"method": "toc+header-regex", "confidence": "A"}, "review": "auto|human-ok|human-fixed" }
```

### 4.4 `Passage` (the retrievable unit; logical schema — the wire format is compact arrays with a header, §6.4)
Example values are illustrative except the report number, its starting page 622 and the archive id (`OR27-1` No. 196 is Chamberlain's report, p. 622 [S hist-sources-1 verif. 01/14]); the leaf/reader numbers follow the verifier's finding that printed page 624 = leaf 644 = reader index 641 (n = leaf − 3) and are re-verified by spike S-4; hashes and offsets are placeholders.
```jsonc
{ "id": "OR27-1:0196#a3f19c02", "doc_id": "OR27-1:0196", "source_id": "SRC-01", "seq": 3,
  "kind": "report_passage",     // report_passage | dispatch | narrative | testimony | monument_text | speech | newspaper_item | table_row | fact_note | site_record
  "type": "prose",              // prose | table | list | front_matter — table/list/front_matter are indexed at 0.3/0.1 prior and never quoted as narrative
  "text": "…cleaned, NFC…",     "raw_sha": "…", "edits": [{"s":12,"e":19,"from":"repori","to":"report","why":"ocr-dict"}],
  "sb": [0, 118, 260, 431],     // sentence boundary offsets (build-time splitter; runtime never re-splits, so quote spans are stable)
  "cite": { "short": "O.R., Ser. I, vol. 27, pt. 1, p. 623",
            "author_line": "Col. Joshua L. Chamberlain, 20th Maine, July 6, 1863",
            "page": "623", "printed_page_source": "page_numbers.json+scandata",   // never the raw leaf number
            "scan": {"ia_id": "warofrebellion271unit", "scan_leaf": 643, "reader_index": 640, "url": "https://archive.org/details/warofrebellion271unit/page/n640/mode/1up"} },
  "lic": { "id": "PD-US-Gov-1889", "tier": "A", "attribution": null },
  "persp": { "side": "union", "role": "regimental", "genre": "official_report", "lag_days": 4, "retro": false, "bias_tags": [] },
  "ents": { "units": [["U-20ME", "subject", 0.97], ["C-15AL", "mention", 0.94]],
            "people": [["P:chamberlain-jl", "author", 1.0], ["P:vincent-s", "mention", 0.9]],
            "places": [["LOC-003", "mention", 0.9]], "events": [["EV:D2T268", "candidate", 0.6]] },
  "time": [ { "day": 2, "clock_text": "about 4 p. m.", "clock_min": 960, "tol_min": 10, "mod": "about", "span": [131, 146],
              "evidence": "retrospective_report", "clock": "local_1863", "attach": "unit-day", "conf": "B",
              "tick_hint": 268, "tm": "1.0.0" } ],       // tick_hint is a build-time convenience stamped with the time-model version `tm`; the runtime uses it only if manifest.time_model == tm, else recomputes with clockToTick(day, clock_min)
  "quotes": [ { "s": 131, "e": 402, "why": ["time", "action"], "score": 0.83 } ],   // pre-selected key spans; every s/e is a UTF-16 offset into `text`, validated at build
  "flags": ["contested:little-round-top-left-flank"],
  "conf": { "ocr": 0.98, "segment": "A", "link": "B", "review": "auto" },
  "nav": { "prev": "OR27-1:0196#77e0b1aa", "next": "OR27-1:0196#0c4d5e91" },
  "ver": 1 }
```
Field rules:
- **`time[]` stores real-world clock minutes (local 1863) as the source of truth; `tick_hint` is derived, version-stamped and disposable.** The runtime maps to a tick with the canonical module's `clockToTick(day, minutes)` [S app-time §6.4 prototype: `tickToClock/clockToTick`; pages-B proposes `/js/time-model.js` with `tickForClock`; the two names must be reconciled by the time owner — `hist-current` verification item 12]. `evidence` ∈ `contemporaneous_dispatch | official_report | retrospective_report | memoir | newspaper | site_authored`; contemporaneous evidence outranks retrospective in evidence tables [S hist-sources-2 verification MISSED-3].
- **`quotes[]`** are the only spans the composer may quote by default; the composer may also pick additional sentences by `sb` boundaries, which are also offset-validated.
- **`cite.scan.reader_index`** is derived from `scandata.xml` (`addToAccessFormats`) — the raw `page_numbers.json` `leafNum` lands 3-5 pages off in the IA reader [S hist-sources-1 verification 14]. A CI test fetches `page/n<idx>_w400.jpg` for 5 sampled citations per source and OCRs the printed folio.
- **`lic`** is denormalised from the registry for the tier gate and for per-answer attribution.
- **`ents`** entries are `[id, role, confidence]` with role ∈ `subject | author | mention | addressee | place_of_action`.
- **`flags`** feed UI chips and rules (e.g. `contested:*` requires perspective balancing, §8.5; `table` excludes from narrative answers).

### 4.5 `Entity` (T1)
```jsonc
{ "id": "U-20ME", "type": "unit", "level": "regiment", "side": "U", "name": "20th Maine Infantry", "short": "20th Maine",
  "aliases": ["20th Maine", "20th Me.", "Twentieth Maine"],                  // derived from the designation + ordinal grammar; curated additions; alias → id map is built at emit
  "parents": ["U-V-1-3", "U-V-1", "U-V"], "display": {"brigade": "Third Brigade (Vincent's Brigade), First Division, Fifth Corps"},
  "attrs": { "strength": {"v": 386, "auth": "SITE-OOB", "basis": "engaged", "conf": "C"}, "casualties": {"v": 130, "pct": 33.7, "auth": "SITE-OOB"},   // values from oob/union_regiments_iii_v_corps.json; authority = site OOB (cites Busey & Martin) until reconciled
             "commander": [{"person": "P:chamberlain-jl", "from": null, "to": null, "fate": "Survived; Medal of Honor 1893 for Gettysburg"}] },
  "xref": {"cwss": "UME0020RI", "dyer": null, "osm": null, "monuments": ["MON:###"]},
  "links": {"regiment_page": "/regiment.html?unit=U-20ME", "map": {"unit": "U-20ME"}, "flags": ["deepLinks"]},
  "prov": [{"source_id": "SRC-DATA", "locator": "oob/union_regiments_iii_v_corps.json#U-20ME"}] }
```
Types: `unit` (regiment, battery, brigade, division, corps, army), `person`, `place`, `road`, `structure`, `feature`, `monument`, `event`, `vignette`, `site` (site page/tool), `topic` (concept lexicon items such as "cannonade", "high water mark"), `source`.
**Every numeric attribute is `{v, auth, basis, conf}`** so the composer can say "about 1,883 engaged (Busey & Martin as cited; being reconciled)" until data-integrity-03 lands [S data-integrity DI-03]. Placeholders (88 of 103 batteries have templated strengths; 36 regiments 0 casualties) carry `basis: "estimated"` and are never quoted as history [S hist-sources-1 verification MISSED-4].

### 4.6 `Fact` tables (T1, `facts.v1.json`, all rebuilt from entities + reviewed decisions)
| Table | Row | Answers |
|---|---|---|
| `tenures` | `{unit, person, from, to, cause, src}` (from `commander_successions` + OOB commander/successor; DI-17 model) | who commanded / who replaced / who took over |
| `stats` | `{unit, strength, casualties, pct, days, auth, basis}` | how many men / casualties / rate |
| `rank` | precomputed superlatives with the rule text and the min-strength rule (e.g. highest rate: 1st Minnesota 85.5% (224 of 262) [S hist-current review; data-integrity DI-04]) | "which regiment lost the most" |
| `rollup` | brigade→regiments, division→brigades, corps→divisions, side/state counts (Maine = 10 records: 9 infantry + 1 cavalry [S hist-current verification 25]) | "which brigades were in Pickett's division", "how many Maine regiments" |
| `anchors` | `{aid, doc_id, passage_id, unit_ids, place_ids, day, clock_min, tol, mod, evidence, contemporaneous, event_key?}` | "when did X begin", evidence tables |
| `events` | the 137 chronology events with reviewed `event_key`, canonical clock (from the time model once landed), and the anchor ids attached by review | "what happened at noon on July 3", "when did Pickett's Charge start" |
| `places` | gazetteer with OCR/period variants (`Gulp's Hill`→`Culp's Hill`), aliases, coordinates, day relevance | where questions, place normalisation |
| `unknowns` | known-unknown rules: per-location casualty totals, individual-soldier presence, weather (until a real primary is found [S hist-sources-2 verification 12]), causes of the war… | limited-answer statements |
| `routes` | intent → site page (ancestor → `/find-ancestor.html`, tour → walkthrough, "see it on the map") | routing |

### 4.7 `Manifest` (the only mutable-URL file)
```jsonc
{ "kb_version": "1.3.0", "schema": 3, "built_at": "2026-10-31T14:02:11Z", "time_model": "1.0.0", "entity_registry": "2026.10.2",
  "tiers": { "entity": {"path": "entity.9f3a21bc.json", "bytes": 79004, "br": 77800},
             "facts": {"path": "facts.6c0d11aa.json", "bytes": 121300},
             "lexicon": {"path": "lexicon.b7e4c0d9.bin", "terms": 20605},
             "index": {"buckets": 128, "hash": "fnv1a32(stem) % 128", "files": ["ix/000.ab12cd34.bin", "…"], "codec": "varint-delta+tf, gzip"},
             "text": {"per_shard": 16, "files": ["tx/0000.aa11bb22.json", "…"]},
             "entpost": {"buckets": 32, "files": ["en/00.c1c1c1c1.bin", "…"]}},
  "sources": [{"id": "SRC-01", "tier": "A", "passages": 6420, "license": "PD-US-Gov-1889"}],
  "redactions": ["OR27-1:0044#deadbeef"], "eval": {"report": "eval/report-1.3.0.json", "sha256": "…"} }
```

---

## 5. Ingestion pipeline (build time)

All stages are idempotent, write JSONL plus one manifest line, and are driven by `historian-data/` (a real git repo — the first thing to create, since neither Netlify zip contains an authoring source, N1). Tooling: Python 3.11 for text work (lxml `iterparse` for the 46 MB `djvu.xml`, `rapidfuzz`), Node 24 for emit/validate/eval (shares `search-core.js` with the browser, so build-time and run-time normalisation cannot drift). Layout:

```
historian-data/
  sources.yaml            registry (tier, licence, imprint allow-list, OCR gate)          <- S0
  sources.lock.json       url, retrieved_at, sha256, bytes, licence snapshot               <- S1
  raw/                    git-ignored downloads (djvu.txt/.xml, page_numbers.json, scandata.xml, PDFs)
  fetch/*.py  normalize/*.py  segment/<source>.py  link/*.mjs  anchors/*.mjs  qa/*.mjs
  registry/entities.src/  entity crosswalk seed + curated aliases (aliases.v1.json) + persons.yaml + places.yaml
  review/queue.jsonl  review/decisions.jsonl   human review loop                           <- S9
  eval/gold.v1.jsonl  eval/heldout.<phase>.jsonl  eval/baseline.b0.json  eval/gates.json
  build/emit.mjs          -> dist/hx/…                                                     <- S10
```

### 5.1 Stage table
| # | Stage | Input → output | Method (concrete) | Measured / cited basis | Acceptance test |
|---|---|---|---|---|---|
| S0 | **Registry + rights gate** | `sources.yaml` → allow-list | curated IA identifier allow-list; parsed volume year, publisher and reprint flag recorded; `statement_text` + `statement_url` captured; tier ∈ A/B/C/A-pending | `date <= 1930` is not a usable gate (series-start dates; reprint scans of 1984 beside originals) [S hist-sources-1 verif. MISSED-1] | CLI refuses `warrebellionaco00cowlgoog` (1971 reprint), an item without a licence, and any Tier C id |
| S1 | **Fetch** | allow-list → `raw/` + lock | per-host token bucket (archive.org 1 req/s sequential; loc.gov 12 req/min; Wikimedia 60/min with contact UA; NPS API 500/h); file names read from `/metadata/<id>` (Emory items use underscores); sha256 manifest, ETag caching; hard-stop on 403 with human message; size guard 100 MB | rate budgets [S hist-sources-2 §7.2]; loc.gov JSON is 20/min with 1-hour block and the countdown resets on any request while blocked [S hist-sources-1 verif. 12] | dry-run on 20 mixed URLs never exceeds host limits; second run downloads 0 bytes |
| S2 | **OCR normalise + quality gate** | `raw/*.txt` → `norm/*.txt` | NFC; `U+FFFD` → dash by context; collapse `[ \t]+` (IA text is double-spaced: "Twentieth  Maine"); de-hyphenate line breaks ("Poto- mac"); strip running heads ("Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 623"); dictionary repair **only** for tokens at edit distance 1 from a term with df ≥ 50 in the clean sources, never digits or capitalised tokens; every edit logged in `edits[]`; numbers are never auto-edited (Fox columns show `(5,024`, `30S`, `4,2 lo`) | strict regexes return 0 matches on raw `_djvu.txt` until whitespace is collapsed [S hist-sources-1 verif. 01, MISSED-2]; proxy: OR27-1 0.984, NYFR-1 0.968, B&L-3 0.966, JCCW 0.960, PA 0.935-0.949, Bates v1 0.878, Confederate Veteran v1 0.835, Compiler 1863 0.43-0.48, Gardner image-only [S hist-sources-1-13] | ≥ 0.90 auto-accept; 0.80-0.90 accept+flag; < 0.80 quarantined (never reaches the index); unit test: OR27-1 No. 196 (Chamberlain) normalises to text that a whitespace-strict regexp matches |
| S3 | **Segment** (source-specific) | `norm/*.txt` + page map → `documents.jsonl` + `pages` | **OR Pt 1/2:** ToC parse (376/378 and 211/211 numbers) then body-header regexp (303/378 and 162/211 after whitespace collapse) then `rapidfuzz` match of the remaining headers to ToC authors; strip page furniture; restrict Pt 2 to Nos. 379-589. **OR Pt 3:** dispatch-header segmenter (`July 2, 1863—3.40 a. m.` + sender/recipient lines; 118 headers) — the "No. NN. Report of" segmenter finds none. **NY Final Report:** ToC-driven per-regiment sketches across **all three volumes** (use labelled `finalreportonbat0003unse`, not the ambiguous `cu3192409292497x` ids). **PA 1914** (superset) as canonical edition, 1893 as variant. **B&L v3** by contents (title/author/page); **JCCW** by witness heading (Q/A pairs stay together); **Fox** prose notes vs loss tables (tables → S4b). **Page mapping:** `djvu.xml` leaf → `page_numbers.json` printed page (interpolate the 18 gaps) → `scandata.xml` `addToAccessFormats` → `reader_index` | segmentation recovery figures and the missing-Pt-3 finding [S hist-sources-1 verif. 01/06; hist-sources-2 verif. OR ingestion + MISSED-3]; the reader-index bug (n = leafNum − 3, −5 after leaf 887) [S hist-sources-1 verif. 14]; NY material is spread over all three volumes [S verif. 03] | ≥ 95% of pages assigned to a document; 20 random documents match first/last 10 words against the scan; 5 sampled citations per source open the right page image (OCR the printed folio) |
| S4 | **Passage-type classify** | pages → `prose` / `table` / `list` / `front_matter` | features: digit ratio (> 0.07), short-token ratio (> 0.28 with digits > 0.03), words/sentence (> 60), OCR-noise ratio | 1.4-10.6% of passages are table-like [M M10]; ANV Guild casualty return OCR is column-scrambled and needs `djvu.xml` word coordinates [S hist-sources-1 verif. 04] | tables never appear as narrative quotes; table rows pass a checksum (K+W+M = total ± 0) or go to the review queue |
| S4b | **Table extraction** | table passages → `casualty_sources.jsonl`, `returns.jsonl` | rebuild rows from word boxes; validate sums; reject failures to queue | Fox digit errors; Union-only; Confederate strength has no PD regimental source [S hist-sources-1 verif. 04] | checksum failures < 3% after manual queue; each row has `auth` and `basis` |
| S5 | **Chunk** | prose pages → `passages.jsonl` | 150-250 words, paragraph-aligned, **no overlap** (neighbour pointers `prev/next` instead — overlap doubles the index and creates near-duplicates), never across document boundaries; testimony keeps Q/A pairs; deterministic sentence splitter (handles `Col.`, `Lieut.`, `Gen.`, `No.`, `a. m.`) writes `sb`; id = `<doc>#<hash8 of NFC text>` | 14,391 passages / 190 words average from 7 sources [M M1]; near-duplicates 0.6% without overlap [M M9] | round-trip: `join(chunks) == doc text` modulo whitespace; every `sb` offset lies on a sentence end |
| S6a | **Unit linking** | passages → `ents.units` | grammar linker (§7.3.2): compound-ordinal parser with negative lookbehind, ellipsis lists, arm agreement (Infantry/Cavalry/Battery/Artillery/Militia/National Guard), OCR-variant table; document author unit from the header is `subject`; batteries via a 103-row commander-name table; confidence A/B/C/D | naive linker 7/22 wrong; grammar linker 24.1% of passages linked, 389/467 ids [M M12]; 15 arm-collision keys; 49 off-grammar ids and label-keyed batteries need the hand table [S hist-sources-2 verif. crosswalk] | labelled set of 200 mentions (stratified by source): precision ≥ 0.95 at conf ≥ B, recall ≥ 0.85; conf C/D go to review |
| S6b | **Person linking** | → `ents.people` | commander registry (698 distinct names exist in site data [S DI-27]) + report headers ("Report of Col. J. L. Chamberlain") + rank-title regexp; surname collisions resolved by unit context; new persons appended to `persons.yaml` after review | `hist-current` Q032: "Robert E. Lee" collides with battery commanders named Robert [S] | 100 sampled person mentions ≥ 0.95 precision |
| S6c | **Place linking** | → `ents.places` | gazetteer of 30 locations + 8 roads + 8 structures + 4 features + period variants seen in text (`Gulp's Hill`, `Wheat-field`, `Menchey's Spring`); NPS/OSM names in a separate ODbL file | OCR variants appear in the lexicon neighbours [M M7] | every LOC id has ≥ 1 linked passage or an explicit "none found" |
| S6d | **Time anchors** | → `time[]`, `anchors` | grammar `\d{1,2}([:.]\d{2})?\s*(o'clock)?\s*[ap]\.?\s?m` + `daybreak/sunrise/noon/sunset/dusk/nightfall/midnight` + modifiers (about/near/before/after/until/from-to); dispatch header time = contemporaneous exact; report times attach to (report unit, day) because sentence-level place∧clock is rare; tolerance ±10 min for telegraph/sun-time differences; `evidence` class recorded | 5,702 clock expressions, 75 place∧clock sentences [M M11]; Pt 3 is dispatches: ~118 header-form items, only ~100 of ~1,374 dated Pt 3 items are July 1-3 [S hist-sources-1 verif. 06] | 200-anchor hand-labelled sample precision ≥ 0.90; every one of the 137 events has ≥ 1 candidate anchor or an explicit "no report time found" |
| S6e | **Event linking** | → `events` proposals | match unit + place + day + ALL-CAPS event labels against the 137 chronology events; proposals only | `hist-current` derived-alias approach [S] | reviewed `event_key`s only enter `facts.events` |
| S7 | **Dedupe** | passages → canonical set | sampled 8-word shingles, ≥ 0.6 overlap → keep preferred source (OR > state book > memoir > secondary), record `dup_of`; keep both if `persp` differs and mark `variant` | 0.6% [M M9] | duplicate report has 0 passages shown twice in any golden answer |
| S8 | **Validate** | everything → pass/fail report | JSON Schema (ajv) + rules V01-V12 (below) | `data-integrity` validator spec (60 rules; K001 "every indexed field exists in the schema" prevents `e.title`-style drift) [S] | CI red on any rule; `validation-report.json` archived per build |
| S9 | **Human review queue** | queue → `decisions.jsonl` | see §5.2 | — | decisions applied deterministically; every accepted low-confidence item has reviewer initials |
| S10 | **Emit** | validated set → `dist/hx/` | entity tier, facts, lexicon, postings, entity postings, text shards, manifest, `sources` page data, errata; content-hash every file | sizes in §6.7 | rebuild from clean checkout reproduces identical hashes (determinism test) |
| S11 | **Publish + post-checks** | `dist/hx/` → deploy tree | copy, add header rules, bump SW; run Playwright golden pass against the built site; HEAD-check 5% of citation URLs | — | eval gates (§10.6) green; Lighthouse ≥ 95 on `/historian` mobile with the full KB present |

**Validation rules (S8)**: V01 schema/required fields; V02 tier/licence gate (fail on tier C, missing `lic`, reprint imprint, OCR < 0.80 unless quarantined, tier B without `attribution`); V03 every `quotes[].s/e` and `sb` offset in range and on a token boundary, and the stored quote hash equals `hash(text.slice(s,e))`; V04 every entity id resolves in the registry; V05 developer-note blocklist `/DATA NOTE|must be shown|CRITICAL:|keyframe|animation|HIGHEST PRIORITY|\bflag_notes\b/i` on site-authored text; V06 site-authored fields contain no ` -- `, `undefined`, `null`, `NaN`, internal ids (`\b[UC]-[A-Z0-9-]+\b`, `\b(CS|US)-\d{3}\b`) [S data-integrity X001-X003]; PD passage text keeps its original typography; V07 anchors: `day ∈ {1,2,3}` or an explicit non-battle date, `clock_min ∈ [0,1440)`; V08 page citations pass the folio-OCR sample; V09 no duplicate ids; V10 shard and manifest size budgets; V11 an alias that maps one surface form to > 8 entities needs a disambiguation rule [S hist-current §8.2]; V12 determinism.

### 5.2 Human review queue (what the owner actually does)
- **What is queued, in priority order:** (1) unit links with confidence C/D and every battery link; (2) passages flagged or auto-tagged `contested:*` lacking perspective tags; (3) time anchors that differ from the map's event time by > 60 min (these become the evidence table for audit C4, so review directly serves the time work); (4) newly discovered persons; (5) a stratified random sample of 100 passages per source for text fidelity and page correctness [S hist-sources-1-16]; (6) OCR edits that touch a number (blocked until accepted).
- **Tool:** a static review page (`tools/review/index.html`, no server) reading `review/queue.jsonl`, showing the passage, the proposed links/anchors, and a link to the scan page (`reader_index` deep link); it exports `decisions.jsonl` (`{id, decision: accept|fix|reject, fix, reviewer, at}`) that the owner commits. Decisions are keyed by passage id (content-hash), so they survive re-segmentation.
- **Volume estimate [E]:** OR27-1/2 + NYFR-1 yield ≈ 1,500 linked passages; if ≈ 15-25% of mentions land in C/D the first queue is ≈ 300-600 items; at ≈ 40 items/hour that is 8-15 hours for the OR backbone — the cost is real and is included in the P2 estimate (§13). Everything unreviewed stays confidence-tagged and is *used* only for retrieval boosts, never for a structured answer.
- **Scale valve:** answers that depend on unreviewed C/D links are worded as "passages that mention…" rather than "the 20th Maine's report…"; a passage never becomes a `subject` link without A/B confidence.

### 5.3 Source-by-source ingestion order and yield (from `hist-sources-1/2`, measured items marked)
| Order | Source (registry id) | Rights tier | Passages (est.) | What it adds |
|---|---|---|---|---|
| 1 | OR Ser. I vol. 27 pts 1-3 (3 IA items; 3,578 pp; 11.26 MB OCR) | A | Pt 1: 2,712 · Pt 2: 2,654 · Pt 3: 2,040 [M, before type filtering] | 589 numbered reports (~296 regiment/battery-level), ~1,374 dated Pt 3 dispatches, clock evidence, Lee/Meade/corps reports |
| 2 | NY Final Report (3 vols) + PA at Gettysburg 1914 (3 vols) | A | NYFR-1: 966 [M]; PA ≈ 2 MB/vol [S] | regimental sketches, dedication addresses for 75 NY + 74 PA units (26% of the site's 570 units) |
| 3 | Fox 1889 (prose notes + tables) | A | 1,152 [M] | casualty tables (Union only), regiment notes |
| 4 | Battles & Leaders v3, Joint Committee v1, SHSP shortlist (~150 articles), Haskell/Oates/Polley/Curtis/Holcombe | A | B&L 2,438 · JCCW 2,429 [M]; SHSP shortlist [E] | participant narratives and testimony with mandatory perspective tags |
| 5 | Maine/NJ/MI/MN/small state books, Clark NC, Bates, Phisterer, Dyer | A | [E] | ≈ 500 unit sections |
| 6 | Chronicling America July 1863 (curated 50-150 articles), Pierce/Buehler/Hoke/Jacobs/Bates civilians | A | [E] | "what the press reported", civilian testimony |
| 7 | Wikipedia excerpts (B), OSM monuments (B, ODbL, separate file), NPS Gettysburg OOB pages (A) for cross-check | A/B | small | orientation excerpts (quote-only blocks with CC BY-SA credit), monument candidates |
| 8 | CWSS roster shards | A-pending | ≈ 420-700 k cards [E] | ancestor lookup, **blocked until NPS confirms in writing** [S hist-sources-2-02] |

Excluded (never ingested): Ladd's *Bachelder Papers* (copyright), NHHS originals without permission, Stone Sentinels, NYSMM pages, Rumsey scans (non-commercial), ABT, Ancestry family, FamilySearch, ACHS reproductions, Adams Sentinel (subscription), Busey & Martin and other post-1930 books (cite bibliographically only) [S hist-sources-1 §5; hist-sources-2 §3]. **Retroactive audit:** 18 shipped monument coordinates already derive from Tier C/B sources (Stone Sentinels ×8, HMDB ×4, Wikipedia ×6) [S hist-sources-2 verif. MISSED-1] — list them as `legacy` rows in `sources.yaml` and run the tier gate over `data/*.json` too.

---

## 6. Storage, hosting and CDN layout

### 6.1 Deploy-tree layout
```
/historian.html                         shell only (markup + inline critical CSS), <script type="module" src="/hx/app/historian.<h>.js">
/hx/app/historian.<h>.js|css            UI (immutable)
/hx/app/worker.<h>.js                   search-core + composers (immutable, module worker)
/hx/manifest.json                       the only mutable file:  Cache-Control default (public,max-age=0,must-revalidate)
/hx/f/entity.<h>.json                   T1
/hx/f/facts.<h>.json                    T1
/hx/f/lexicon.<h>.bin                   T1
/hx/f/ix/<000..127>.<h>.bin             T2 postings buckets
/hx/f/en/<00..31>.<h>.bin               T2 entity → passage postings
/hx/f/tx/<nnnn>.<h>.json                T2 text shards (16 passages each)
/hx/f/ro/<unit>.<h>.json, ro/px/<abc>.<h>.bin   T3 rosters (phase 5)
/hx/f/media/…                           T4 (thumbnails, alt text in the shard)
/sources.html  /data-notes.html         generated from registry + changelog
```
Flat content-hash names under `/hx/f/` plus the append-only numbering of §4.1 mean a rebuild that changes 3 passages re-uploads (at most) 3 text shards and the index buckets holding their terms; clients re-fetch only what changed. **Do not use `/data/`:** `/data/*` is `max-age=3600` (`netlify.toml:28-30`) and the current service worker treats it network-first forever (`sw.js:61`), which would defeat immutable caching and create code/data skew.

### 6.2 Headers (`netlify.toml` today; `_headers` once generated per `infra-netlify-11/13`)
```toml
[[headers]]
  for = "/hx/f/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
[[headers]]
  for = "/hx/app/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
# /hx/manifest.json intentionally matches NO rule -> default must-revalidate (avoids overlapping same-name rules,
# whose merge semantics the infra review could not confirm).
# CSP for /historian (Report-Only first): default-src 'self'; script-src 'self' <sha256 of any remaining inline>; style-src 'self';
#   connect-src 'self'; worker-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```
The Historian makes **no third-party requests**: IA/Hathi/NPS/Fold3 links are user-initiated navigations (`rel="noopener noreferrer"`), never fetches, so `connect-src 'self'` holds and the privacy page needs only the "no queries leave your device" sentence (plus the feedback mailto note) [S infra-netlify-36 privacy rewrite; audit X5].

### 6.3 Compression and codecs
- JSON/text shards: Netlify serves brotli for JS, JSON, HTML (`Content-Encoding: br` verified live by the infra review [S]).
- **Binary shards (`.bin`): compression by the CDN is [U].** Phase-0 **spike S-1**: after the first test deploy, `curl -H 'Accept-Encoding: br' -sI /hx/f/ix/000.<h>.bin` for content types `application/octet-stream` and `application/json`. Fallback if not compressed: store `.bin` gzip-9 at build and decode with `DecompressionStream('gzip')` in the Worker [U: Baseline browser support believed but not re-verified]; cost is ≈ +17-23% bytes on text shards [M M4] and probably a similar order on postings [E] (index ≈ 1.8-1.9 MB instead of 1.5 MB at 14.4 k passages).
- Per-shard metadata overhead beyond the measured text-only shards (`cite`, `ents`, `time`, `quotes`, `sb`) is estimated at +25-40% → ≈ 480 B/passage → 7.7 KB per 16-passage shard [E]; budgets below use that number.

### 6.4 Wire formats
- **`entity.json`**: plain JSON, columnar for the large kinds; alias map, surname map, unit-key map and name vocabulary inside (measured 75.9 KB br for 957 records incl. 24.7 k body words, unoptimised [M M13]).
- **`lexicon.bin`**: header + front-coded sorted stemmed terms with df (varint) — 20,605 terms, 34 KB [M M5]; used for typo repair, join/split, prefix suggestions and OCR-variant expansion.
- **`ix/NNN.bin`**: `[magic, nTerms, offsets:Uint32[nTerms], dict:'\n'-joined sorted terms, postings…]`; postings = `[df varint][Δdoc varint, impact8]…` where `impact8` is the precomputed BM25 contribution quantised to 8 bits (removes doc-length arrays and the IDF computation from the query path; bytes ≈ the tf format measured). Bucket = `fnv1a32(stem) % 128`, chosen to balance sizes (avg 12 KB, max 20 KB [M M3]); prefix/typo queries go through the lexicon, not the buckets.
- **`en/NN.bin`**: `entity id → [Δpassage id varint, role code]`; bucket = `fnv1a32(entity id) % 32`; size [E] 50-80 KB total at 14 k passages (≈ 25-40 k entity-passage edges).
- **`tx/NNNN.json`**: `{"h": ["id","text","sb","cite","ents","time","quotes","persp","flags"], "p": [[…], …], "c": [citation table]}`; passages are stored in (source, document, sequence) order so neighbouring passages share vocabulary (this is why 16-passage shards compress to 367 B/passage vs 307 B at 250 [M M4]).

### 6.5 Service worker and cache policy (replaces the `/data/` behaviour for `/hx/`)
1. `/hx/f/*` and `/hx/app/*`: **cache-first**, cache name `hx-v<schema>`; the manifest is fetched network-first with a 2 s timeout and cached; on a new manifest, the Worker computes `needed = manifest files ∩ requested` lazily; unreferenced entries are evicted at idle by diffing against the manifest hash set.
2. **No `skipWaiting` + `clients.claim` + `location.reload()`** (that combination is audit C6, the self-redirect that wastes ~9 s on mobile first visit): a new SW waits; the page shows a non-blocking "Updated sources available — apply" control [S app-time-13, infra-netlify-21/22, data-integrity §8.7].
3. Quota: cap at ≈ 60 MB [E] with LRU by last use; catch `QuotaExceededError` and continue uncached; never cache 206 responses.
4. **Offline pack** (opt-in, never automatic): "Save the Official Records for offline (≈ N MB)" with progress, resumable, disabled when `navigator.connection.saveData` is set; at 20 credits/GB a 25 MB download costs ≈ 0.5 Netlify credit [E from infra-netlify-30 arithmetic], so it is user-initiated and shown with its size.
5. The current `sw.js` `PRECACHE_ASSETS` names `/assets/index-Cg8FAMXN.js` explicitly and `CACHE_NAME = 'gbg-v5'`; any SW change must ship together with the time-model/bundle rollout hygiene [S app-time-13].

### 6.6 File-count and deploy plan
16 passages per shard → 900 text files at 14.4 k passages, ≈ 2,500 at 40 k; plus 128 + 32 index/entity buckets, ≈ 6 T1/T0 files, + 467 roster shards + 26 prefix files (phase 5) → ≈ 3.5 k files at full scale. **Netlify per-deploy file-count and drag-and-drop limits are [U]**; manual zip uploads of thousands of files are also fragile. Mitigations: (a) move to Git/CLI deploys (`infra-netlify-28`, which also closes N1) before Phase 3; (b) **spike S-2** — deploy a 5,000-file synthetic tree to a scratch site and record time and failures; (c) fallback format: 256-passage *packs* of independently brotli-compressed 16-passage blocks with a block directory in the manifest, fetched by HTTP Range (identity encoding; CDN Range support [U]; the Cache API cannot store 206, so the Worker caches synthetic per-block responses).

### 6.7 Size budget and projection (measured base, linear extrapolation flagged [E])
| Component | 7 sources today [M] | ~25 k passages [E] | ~40 k passages [E] | Notes |
|---|---|---|---|---|
| Passages | 14,391 | 25,000 | 40,000 | hist-sources-1-17 sizes the P0/P1 corpus at 20-50 k |
| Index (br, 128 buckets) | 1.54 MB | 2.7 MB | 4.3 MB | df ≥ 1; df ≥ 2 saves ≈ 11% but drops rare proper names — keep df = 1 terms that are capitalised in source |
| Text (br, 16/shard, +30% metadata) | 5.3 MB → ≈ 6.9 MB | ≈ 12 MB | ≈ 19 MB | 5.3 MB is text only [M M4] |
| Entity postings | — | ≈ 0.1 MB | ≈ 0.15 MB | |
| Lexicon | 34 KB | ≈ 50 KB | ≈ 65 KB | vocabulary is sub-linear |
| Entity + facts tier | 76 KB + facts | ≈ 0.25 MB | ≈ 0.3 MB | hist-current target ≤ 120 KB for the entity index alone |
| Rosters (phase 5) | — | 6-12 MB | 6-12 MB | [S hist-sources-2 §9] |
| **Total lazy** | ≈ 9 MB | ≈ 21-27 MB | ≈ 30-36 MB | budget ≤ 40 MB lazy, **0 bytes on first paint of any page** |
| Files | ≈ 1.1 k | ≈ 1.7 k | ≈ 2.7 k (+0.5 k rosters) | see 6.6 |
| First-visit bytes for the Historian shell + T1 | ≈ 45 KB (T0) + ≈ 250 KB (T1) | same | same | T0 is [E] |

---

## 7. Retrieval and ranking

### 7.1 Query pipeline (in the Worker; the main thread only posts a message and renders events)
```
q ─► guard ─► normalise ─► tokenise ─► lexicon repair ─► entity/time/place link ─► intent+slots ─► scope gate ─► plan
                                                                                                        │
                        ┌──────────────────────── structured (sync, no network) ◄────────────────────────┤
                        │  entity cards · facts tables (tenures/stats/rank/rollup/events/anchors/places) │
                        ▼                                                                                ▼
                 AnswerEvent{type:'facts'}  ──────────────►  passage retrieval (async: ix + en + tx shards)  ─► fuse ─► diversify
                                                                                                        │
                                                    decide(answer|partial|decline) ─► compose ─► AnswerEvent{type:'final'}
```
The UI receives `planned` (intent, entities, "looking in: Official Records…") within milliseconds, the structured answer immediately (no network), and evidence cards as shards arrive — latency is hidden and the layout is reserved with a skeleton (CLS).

### 7.2 Normalisation (identical code build-side and run-side: `search-core.js`)
NFKD → strip accents → lowercase → curly to straight quotes → drop possessive `'s`/`s'` and stray `'` (the current page turns "Pickett's" into `pickett`, `s` and the `s` token then scores on 266 of 658 records [S hist-current §1.3]) → `&` → `and` → non-alphanumerics to space → corps rewrite ("first|1st|i corps" → `corpsi`) → ordinal words and numbers to `#n` ("twentieth", "20th", "20", "twenty first" → `#20`). State abbreviations expand **only when preceded by a number** ("20 ME", "84th NY") so `me`, `in`, `us`, `la`, `al` remain ordinary words — the hotfix that removes `me`/`in` from the stop list lowers correct decline 41.2 → 29.4 [S hist-current verif. 03]. Light stemmer (plural, -ed, -ing, trailing e) applied identically at index and query time.

### 7.3 Entity linking
**7.3.1 Alias map** (entity tier): derived at build from parentheticals ("(14th Brooklyn)", "(Iron Brigade)"), brigade nicknames in `key_action`, `{surname}'s brigade/division/corps`, ALL-CAPS event labels ("PICKETT'S CHARGE BEGINS"), terrain parentheticals; plus the curated seed (~45 entries, `hist-current` Appendix A: Devil's Den/Devils Den, Round Top vs Big/Little, Wheatfield/Wheat field, High Water Mark/The Angle/Copse of Trees, Bucktails, Berdan's, …); plus KB-discovered variants confirmed in review. Ablation on the `hist-current` battery: removing derived aliases costs −6 S@1 and −16 canonical@1 [S §4.3] — they are the single most valuable component.

**7.3.2 Unit grammar** (shared by S6a and the runtime):
```
UNIT   := ORDLIST STATE [ARM]
ORDLIST:= ORD ( ("," | "and" | ", and") ORD )*                    // "Forty-ninth and Seventy-seventh New York"
ORD    := [ (one|two) hundred [and] ] [ tens ("-"|space) ] ones-ordinal | tens-ordinal | \d{1,3}(st|nd|rd|th|d)
STATE  := full name | period abbreviation (N. Y., Pa., Mass., …)
ARM    := Infantry | Cavalry | Battery | Artillery | Volunteers | Militia | National Guard | Reserves | Sharpshooters | Regt.
lookbehind (?<![\w-])  so "Fifty-seventh" never yields "seventh"
resolution: key = n|state → candidates; ARM=Cavalry → *-CAV; Battery/Artillery/Militia/NG → unlinked (batteries by commander-name table); no ARM and both exist → non-cavalry at conf B, ambiguous at conf C
```
Measured: [M M12]. Known remaining errors: OCR-broken ordinals ("Eighty- I seventh", "1.26th", "lwenty-l third"), side ambiguity for Virginia/Maryland/Missouri/Kentucky/Tennessee, and non-Gettysburg mentions (the gazetteer/date gate and the review queue handle these).

**7.3.3 People:** surname map built from commanders at every echelon (570 surnames in the prototype), full-name and rank+surname aliases; a bare ambiguous surname ("Smith", "Jackson", "Lee") triggers a disambiguation chip row instead of a guess ("Stonewall Jackson" currently returns `U-11PA-R`, commander "Samuel Jackson" [S data-integrity §3.9]).
**7.3.4 Places:** longest n-gram against the gazetteer (30 locations + roads/structures/features + period variants).
**7.3.5 Time expressions:** "at 4 pm on July 2", "noon July 3", "afternoon of day 2" → `{day, clock_min, tol}`; mapped to a tick only via the canonical time module, never by arithmetic on 5-minute ticks (the clock is piecewise, 0.8-42.3 min/tick [S data-integrity MISSED-01]).
**7.3.6 Output:** `entities[] = {id, type, mention, span, weight, source: alias|derived|curated|surname|unitkey}`; weights follow `hist-current` (unit key 40; alias exact 15; surname 12+6n) and are re-tuned on the dev split.

### 7.4 Fuzzy repair, join/split, phonetic
Rules (all measured in M7/M8 or inherited from `hist-current` QW-9): out-of-lexicon tokens only; Damerau-Levenshtein distance ≤ 1 for length 5-7, ≤ 2 for ≥ 8; same first letter unless length > 6; never when one token is a prefix of the other under 7 characters ("franc" → "Francis"); join/split ("wheat field" → `wheatfield`, "roundtop" → "round top"); candidates restricted to lexicon terms with df ≥ 2 or entity-name vocabulary; ranked by (entity-name membership, df, distance). Result: UI note "Showing results for **Chamberlain** — search for *Chamberlin* instead". Measured on 2,682 synthetic single-edit typos over 937 name terms: **DL recall 100% in all six classes with 1.04-1.11 candidates**; Soundex 34% (substitution) to 100% (doubled letter); the consonant-skeleton key is only strong for vowel/double-letter errors (96-99%) and weak for the rest (11-28%). Decision: **DL primary, skeleton key as a secondary fallback, Soundex dropped.** Caveats: synthetic single-edit typos on names, not real logs; known residual "Pickets charge" → real word "pickets" [S hist-current]. **OCR-variant expansion:** for content terms, lexicon neighbours within DL 1 that are absent from the clean-source dictionary are added at weight 0.4 (recovers `Gulp's`, `Menchey'8`, `lougstreet`); evaluated on G150 and kept only if recall@5 rises without precision loss.

### 7.5 Intent and slots
Ordered rules (the `hist-current` prototype has 14 in `proto.js:194-208`): ancestor, succession, who-commanded, highest/superlative, strength, casualties, outcome, compare, when, where, why, what-happened, list, who — extended with **report-of** ("what did Chamberlain report/say about Little Round Top"), **evidence-time** ("what time did X begin" → evidence table), **presence** ("was the 20th Maine at the Peach Orchard"), **site-route**, **verify-claim** ("did Lee say…"). Interrogatives are features, not stop words. **Ancestor** requires a personal-relation cue (my / grandfather / relative / "soldier named") or an unlinked person name; "was Longstreet at Gettysburg" is *presence*, not ancestor (the prototype mis-routed it) [S hist-current verif. MISSED-6]. Each rule has ≥ 20 phrasings and negative tests in CI (`tests/intent/*.jsonl`). Slots: `unit`, `person`, `place`, `time`, `side`, `count`, `compare_pair`.

### 7.6 Retrieval plan by intent
| Intent | First source | Then | Answer type (Appendix C) |
|---|---|---|---|
| lookup / what-happened (entity) | entity card | top 2 passages where entity role ∈ subject/author | A1 profile + A8 evidence |
| who-commanded / succession | `tenures` | passage quoting the succession (e.g. Hood → Law, CS-001, Pfanz Second Day p.163 is the site's own cite; OR report passage if any) | A2 |
| strength / casualties / superlative | `stats`, `rank` | Fox/OR return passage as citation | A3, A4 |
| when / evidence-time | `events` + `anchors` | 3-5 anchors sorted by time; contemporaneous first | A5 evidence table |
| where | `places` + unit positions from OOB text | passages with `place_of_action` | A6 |
| report-of / testimony | passages by `author.unit`/`author.person` | neighbour passages (prev/next) | A7 quote block |
| why / contested | concept lexicon + PRF; entity-conditioned passages | perspective-balanced set (§8.5) | A9 |
| compare | two entity cards | one passage each | A10 |
| list / relational | `rollup` | – | A11 |
| ancestor / roster | `routes` | roster shards (phase 5) | A12 |
| out of scope / no data | `unknowns`, scope table | nearest neighbours | A13 |

**Entity-tier ranking** (used when linking is incomplete or several cards compete): BM25F over card fields — title 3.0, alias 3.0, people 2.0, place 1.5, body 1.0, with `b` = 0.4 / 0.3 / 0.3 / 0.3 / 0.6 and `k1` = 1.2, plus link weights and intent-conditional kind priors; this replaces the current page's hard-coded ×1.3 (vignette) / ×0.9 (chronology) kind weights that put a vignette first for 71% of answered queries [S hist-current §1.3, QW-4]. Plain BM25F alone does not beat the status quo (S@1 76%); it is only the substrate for aliases, links and priors.

### 7.7 Passage retrieval and scoring
Candidate generation (any subset, unioned): (a) **entity-conditioned** — `en/` postings for linked units/people/places; (b) **lexical** — BM25 over stemmed query terms (content terms only) from the touched `ix/` buckets; (c) **time-conditioned** — passages whose anchors fall within `tol_query + tol_anchor` of a parsed time.
```
score(p) = BM25(q,p)                                  // k1 = 1.2, b = 0.75 (passages; field b's for entity cards per hist-current)
         + Σ_e  w_link(e) · role(e,p)                 // subject/author 1.0, mention 0.5; w_link 12 (unit key 40)
         + w_t · timeProx(q.time, p.time)              // 0..4
         + phrase(q,p) + proximity(q,p)                // exact normalised title/alias phrase +8; Σ 1/(1+gap) within 6 tokens, cap +4
score'(p) = score(p) · prior(kind,type,persp,source) · intentKindPrior(intent,kind)
prior:  report_passage 1.0 · dispatch 1.0 · testimony 0.95 · narrative 0.9 · monument_text 0.85 (retrospective) · newspaper_item 0.7 · table 0.3 · list 0.1 · front_matter 0
```
Fusion when both the entity-conditioned and lexical lists exist: reciprocal-rank fusion (`Σ 1/(60+rank)`) before priors; RRF vs the additive form is decided on the dev split (both cost < 0.2 ms). Diversity: MMR with document-level penalty — ≤ 2 passages per document, ≤ 3 per source family in the top 5. Parameters above are initial values [E], tuned only on the dev split (§10.2); the `hist-current` finding that field weights and stemming contribute ≈ 0 on its battery means the tuning budget goes to entity boosts, the no-answer gate and the priors.

### 7.8 Semantic-lite and the optional semantic tier (hypotheses, not measurements)
(a) Concept lexicon (≈ 60 entries: died/killed/KIA/fell → casualty; began/opened/stepped off → begin; lose/repulse/defeat; …) — measured ≈ 0 alone on the current battery, kept because it is cheap and protects prose expansion [S hist-current QW-3]. (b) Precomputed PMI neighbours for the 5,000 highest-df content terms (≈ 150 KB [E]) added at weight 0.3 only when < 3 passages clear the threshold. (c) Pseudo-relevance feedback (RM3-style: top-5 passages, 8 terms, weight 0.25) only for `why/how/what-happened`. Adoption rule for (a)-(c): recall@5 ≥ +3 points on the dev split with no faithfulness or refusal regression. (d) **Phase 5, gated experiment:** an int8 dense reranker in a single-thread WASM worker (model ≤ 8 MB; 384-d int8 vectors for 40 k passages ≈ 15 MB [S hist-sources-2 §9]; `'wasm-unsafe-eval'` only on `/historian`); go/no-go = recall@5 +≥ 8 points on held-out, p95 rerank ≤ 150 ms on a Moto-G-class phone, INP ≤ 200 ms, no CSP downgrade; otherwise dropped. Multi-threaded WASM is excluded (needs COOP/COEP, which conflicts with third-party frames) [S infra-netlify-31 item 12].

### 7.9 Latency (measured in Node; phone figures are a model)
| Step | Measured (Node 24.19, desktop) | Modelled mid-tier phone (×6, [E]) | Budget |
|---|---|---|---|
| decode touched postings + BM25 + top-10, 14,391 passages | p50 **0.057 ms**, p95 **0.126 ms**, max 2.6 ms (JIT outlier) | ≤ 1 ms p95 | — |
| fuzzy repair (20,605 terms, brute force, prefiltered) | **3.5 ms** | ≈ 20 ms | ≤ 30 ms (skip when all tokens are in-lexicon) |
| whole `ask()` on the 957-record entity tier (prototype, unoptimised) | ≈ 3.8 ms [S hist-current §8.1] | ≈ 23 ms | ≤ 30 ms |
| composition + sentence selection | not measured [E] ≈ 2 ms | ≈ 12 ms | ≤ 20 ms |
| **Worker compute per query** | ≈ 8-10 ms | **≈ 50-60 ms unoptimised, target ≤ 50 ms** | ≤ 50 ms (INP handler ≤ 10 ms on the main thread) |
Network dominates: see §12.2. Measured on the 4× CPU-throttled Lighthouse profile and on ≥ 1 real mid-tier Android before the P2 gate (§10.5).

### 7.10 Decide: answer, partial, or decline
Gate stack (all thresholds tuned on the dev split; abstention curve archived per build): (1) empty/gibberish/length; (2) **scope table** — visit-planning intents (hotel, ticket, parking, hours, directions, weather, restaurant) → honest pointer; adjacent topics (Antietam, Vicksburg, Chancellorsville, Lincoln's Address, causes of the war, D-Day) → "outside this site's records" + optional external link; needed because generic-word out-of-scope queries ("best restaurant in town", "D-Day", "how do I get to the battlefield") pass every lexical gate [S hist-current QW-10, held-out result]; (3) **coverage gate** — fraction of content tokens found in the lexicon/entity vocabulary; (4) **name-field gate** — a bare-entity query needs a hit in title/alias/people/place; (5) **support gate** — top passage score ≥ τ_abs and margin ≥ τ_rel, and entity agreement for entity-conditioned intents; (6) **known-unknowns** — per-location casualty totals, individual-soldier presence, weather (until a primary is located), etc. return a limited answer that says what the records do not contain [S hist-current QW-8 item 9; hist-sources-2 §6]. After adding data the gate must be re-tuned: adding 299 records to the entity tier lowered canonical@1 91.4 → 87.9 and decline 94.1 → 88.2 in the prototype [S hist-current verif. 08].

---

## 8. Answer composition (templates + extractive quoting; nothing is generated)

### 8.1 Invariants (enforced by the composer, re-checked by a build-time linter over all cards and by Playwright over the golden run)
| # | Invariant |
|---|---|
| I1 | Every sentence in an answer is exactly one of: (a) **template text** whose slots come from a fact/entity field (each run carries `src: {fact or entity id + field}`); (b) a **verbatim quotation** identified by `(passage_id, s, e)`; (c) an explicit **limitation/refusal** from the `unknowns`/scope tables. |
| I2 | No numeric literal is emitted that is not a fact-row value or inside a quotation (kills "51,000"-style hand-typed numbers [S data-integrity §7]). |
| I3 | `normalise_ws(text.slice(s,e)) == quote_text`; quotes are shown in quotation marks, with author, role, unit, date written, `retrospective` flag and page. Ellipses `[…]` join whole sentences only. |
| I4 | Attribution is never dropped when text is shortened; the "Read more" expansion shows the full passage. |
| I5 | Clock times appear only as (i) a reported time attached to a named passage ("reported at about 4 p. m.") or (ii) a label produced by the canonical time module. The legacy `time` field (e.g. `"11:05am"`), a tick arithmetic result, or a "site clock" string is forbidden (forbidden-string list in eval). |
| I6 | `contested:*` passages are never shown alone: the composer either includes a passage from the other side or states "Only Union accounts are indexed for this question." |
| I7 | Numbers with an authority field are worded "about … (source; sources differ)" until the reconciliation lands (`stats.auth`, `basis: estimated` never quoted as history). |
| I8 | Rendering uses `textContent`/DOM ranges only; the corpus is untrusted input. |
Because free-form generation is absent, "hallucination" reduces to selection errors (wrong passage, wrong link, wrong fact row), all of which are measured (§10).

### 8.2 Answer types (full catalog with templates in Appendix C)
A1 entity profile · A2 command/succession · A3 strength & casualties · A4 superlative/rank · A5 **evidence table** (when/where contested) · A6 place profile · A7 report/testimony quote block · A8 evidence cards (≤ 2, collapsed by default) · A9 contested/why (perspective-balanced) · A10 compare · A11 list/relational · A12 route (ancestor, tour, map) · A13 limited-answer/decline · A14 clarification (ambiguous surname or unit). The lead is always a single composed sentence (or a table), followed by ≤ 2 evidence cards, replacing today's three raw cards averaging 2,989 characters [S hist-current §1.4].

### 8.3 Extractive selection (how quotes are chosen)
```
for each of the top-K fused passages p (K ≤ 8):
  for each sentence s in p (boundaries p.sb):
     f(s) = bm25(q, s) + 4·[s mentions linked entity] + 3·[s contains parsed time or a clock expr matching q.time]
          + cue(intent, s)                 // casualty verbs/numbers for 'casualties'; action verbs (charged, formed, repulsed, ordered) for 'what-happened'; 'commanded/succeeded' for succession
          − 0.02·max(0, words(s) − 45)     // avoid run-ons
  best window = the 1-3 contiguous sentences maximising Σ f(s) with ≤ 90 words   // quote length cap for readability, not for rights (PD)
select ≤ 3 passages: one per document, at most 2 from one source family; order: contemporaneous first, then official reports, then retrospective; contested → §8.5
first view shows ≤ 120 quoted words in total; "Read the passage" shows the whole chunk and prev/next neighbours
```
Tier B (CC BY-SA) text is shown **only** as a separately labelled quote block with the credit line and `Excerpted` flag; the composer never blends it into a template sentence, because a composed sentence would be an adaptation carrying share-alike [S hist-sources-2 §8].

### 8.4 Evidence tables for time questions (audit C4 turns into a feature)
For `evidence-time` and `when` intents the answer is a small table built from `anchors` linked to the event:

| Reported time | Who (rank, unit, side) | Written | Evidence class | Passage |
|---|---|---|---|---|
| bold if contemporaneous dispatch | Col. …, 20th Maine, Union | 1863-07-06 | official report (retrospective, lag 4 d) | O.R. I/27/1, p. 623 ▸ |
Summary line computed from the anchors: "N accounts; median H:MM; range H:MM–H:MM" (testimony statistics, not ground truth — different HQs kept different times and reports disagree by 1-3 h [S hist-sources-1 SRC-01 notes; verif. 06]). The map's own clock is shown only after the canonical time module and the reviewed re-timing land (§15); until then the table says "the site's map clock is being corrected" instead of printing the legacy label (`Pickett's Charge 11:05am`, `Longstreet 7:30am` are known-wrong labels [S data-integrity; BRIEF C4]).

### 8.5 Perspective balancing
- Passages carry `persp {side, role, genre, lag_days, retro, bias_tags}`; UI chips show side (Union/Confederate/civilian), genre (report/memoir/testimony/press), and "written 1863" vs "written 1889".
- **Contested registry** (`registry/contested.yaml`, seeded from the 25 chronology `narrative` fields such as "the second most-debated Confederate command decision" [S hist-current §2.3] and the `hist-sources-1-05` controversy list — Longstreet/Early-Allan on the July 2 delay, Sickles vs Meade, the July 1 Eleventh Corps collapse, Reynolds's death time, the first shot): each entry lists trigger entities/intents and required perspectives. **Content of the registry needs a historian's sign-off** (open question 3, §16).
- Rule: if any passage in the top-12 has `contested:*`, the selected set must include ≥ 1 passage per required side when the index has one; otherwise the disclosure line (I6). Chips show which side each quote speaks for.

### 8.6 Numbers with authority
Template: "about {strength} men engaged and {casualties} casualties ({pct}%) — {authority label}; other sources give …" The three currently disagreeing casualty families (Union 22,803 / 23,049 / 23,055 / 23,138; Confederate 23,025 / 23,125 / 23,231 / 28,000) [S data-integrity DI-03] are shown as a range with authority names until `authorities.json` names one headline. Busey & Martin figures are "facts as cited on this site", never quoted text, and the edition question (1994 vs 2005) is recorded on the fact row [S data-integrity MISSED-03].

### 8.7 Refusals and limited answers (templates)
- **Decline (scope):** "That is outside what this site's records cover (battle of Gettysburg, July 1-3, 1863). For visiting the park, see the National Park Service." (external link user-initiated).
- **Limited (known unknown):** "The records here do not give casualty totals by location. They do give totals by unit — for example the 1st Minnesota … Try: [1st Minnesota casualties] [Wheatfield units]."
- **Did you mean:** "Showing results for **Chamberlain** — search for *Chamberlin* instead."
- **Nearest neighbours:** ≤ 3 cards, labelled "closest records", never presented as answers.
- **Roster honesty:** "I can't tell whether a specific soldier was at Gettysburg; the site holds regiments, not individual muster rolls." + route to Find Your Ancestor + Tier C outbound links (NPS CWSS, Fold3, FamilySearch, Find a Grave — user-initiated only) [S hist-sources-2-19].

### 8.8 Conversation memory and follow-ups
State per session: `lastEntities`, `lastIntent`, `lastSide`, `lastTime`. Resolution: "tell me more / who commanded it / where did it fight / what about the Confederates" reuse the entity or flip `side`; ambiguous pronouns with two candidates yield A14 (chips). Follow-up chips are generated from the answer's entity kinds (unit → Commander · Casualties · Where it fought · See on map · Who fought against them; event → What led up to this · What happened next · Who was involved; place → Units here · Elevation · See on map). Chips are part of the golden set (they must return canonical first cards — today the placeholder and all five chips do not [S hist-current UX-10]).

### 8.9 Answer object returned by the Worker
```jsonc
{ "kb": "1.3.0", "mode": "answer|partial|decline", "intent": "who-commanded",
  "entities": [{"id": "BDE:U-I-1-1", "mention": "Iron Brigade", "w": 15}], "did_you_mean": null,
  "blocks": [
    {"t": "lead", "runs": [{"txt": "Brig. Gen. Solomon Meredith commanded the "}, {"ent": "BDE:U-I-1-1", "txt": "Iron Brigade"}, {"txt": "; he was wounded on July 1 and Col. William Robinson took command."}],
     "src": [{"entity": "BDE:U-I-1-1", "field": "commander"}]},
    {"t": "quote", "passage": "OR27-1:0196#a3f19c02", "s": 131, "e": 402, "attrib": "…", "cite": "O.R., Ser. I, vol. 27, pt. 1, p. 623", "persp": {…}},
    {"t": "table", "kind": "evidence-time", "rows": […], "summary": "4 accounts; median …"},
    {"t": "note", "code": "authority-mixed", "txt": "…"}],
  "chips": {"follow": […], "filters": […]}, "links": {"map": {"unit": "U-20ME", "clock": {"day": 2, "min": 960}}, "pages": [{"href": "/regiment.html?unit=U-20ME", "label": "Open its regimental biography"}]},
  "trace": {"…": "only when ?debug=1 or the 'How was this answered' panel is open"} }
```
Map links carry a **clock**, not a tick; the page converts with the time module at click time and uses `?tick=&unit=` once the app reads it (feature flag `deepLinks`, off until app-bugs-05 / infra-netlify-26 ship) [S hist-current §8.5].

---

## 9. UI / UX specification (`/historian.html`)

Addresses every `hist-current` defect UX-01…UX-18 and audit H8 (over-promising). Layout is answer-first, single column, 320-2560 px, portrait and landscape.

```
┌ ← Back to the map ───────────────────────────────────────────── [Sources ▾] [New conversation] ┐
│ Ask the Historian                                                                              │
│ Records-only search: 14,391 passages from 7 sources + 957 site records. Not an AI model. [How it works]│
│                                                                                                │
│           ┌ You ───────────────────────────────────────┐                                       │
│           │ Who commanded the Iron Brigade?            │                                       │
│           └────────────────────────────────────────────┘                                       │
│ ┌ Answer ────────────────────────────────────────────────────────────────────────────────┐     │
│ │ Brig. Gen. Solomon Meredith commanded the Iron Brigade (First Brigade, First Division, │     │
│ │ First Corps); he was wounded on July 1 and Col. William Robinson took command.         │     │
│ │ [Site records ⓘ]                                            [See it on the map]        │     │
│ │ ▸ What the reports say (2)      ▸ Sources (3)      ▸ How was this answered?            │     │
│ │ Ask next: [Casualties] [Its regiments] [Where it fought] [Compare with the Irish Brigade]│    │
│ └────────────────────────────────────────────────────────────────────────────────────────┘     │
│ [ Ask a question…                                                     ] [Ask]                  │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```
| Area | Spec |
|---|---|
| **Header & honesty** | H1 "Ask the Historian"; one-line capability statement with **computed** counts from the manifest (no hard-coded "467/24/137/30"); "How it works" opens a panel: what is indexed (sources list → `/sources.html`), what is not (no rosters until phase 5, no per-location casualty totals), how answers are built (tables and quotations, never generated text), how to report an error. Copy avoids "AI" and "synthesis" (audit H8; `historian.html:48`). |
| **Input** | `<form role="search">` with a visible `<label for="ask">`; 16 px input (no iOS zoom); enabled immediately, first question queued while T1 loads; example chips are part of the eval set; Enter submits, Esc clears a non-empty field then blurs; input clears on submit **and** on chip click; the sticky bar respects `env(safe-area-inset-bottom)`. |
| **Transcript** | `role="log" aria-live="polite" aria-relevant="additions"`; each answer is an `<article aria-label="Answer to: …">`; new answers scroll to the **start** of the answer group with `scroll-margin-top` and `scroll-padding-bottom` = bar height (fixes UX-03); smooth scroll only if `prefers-reduced-motion: no-preference`; paragraphs preserved (`<p>` per paragraph, UX-02). |
| **Progressive rendering** | `planned` event → "Looking in: site records · Official Records…" chip row; the structured lead appears with no network; evidence cards stream in as shards arrive into pre-sized skeletons (no layout shift); a per-answer "Stop" appears only after 400 ms. |
| **Answer card** | lead sentence/table (≥ 16 px, 1.5 line-height); provenance chip ("Site records", "Official Records", "Reported testimony"); ≤ 2 evidence cards as `<details>` (collapsed by default on phones; first open on desktop); "See it on the map" button hidden behind the `deepLinks` flag; follow-up chips are `<button>`s ≥ 44 × 44 px with 8 px gaps. |
| **Citations panel** | Sources drawer (bottom sheet on phones, side panel ≥ 900 px; focus-trapped, Esc closes, returns focus): per source — title, printed page, author line, side/genre/retrospective chips, licence badge and credit line, **View scan** (IA reader link from `reader_index`), **Copy citation** (Chicago + short), **Report a problem** (prefilled `mailto:` or issue URL with passage id, `kb_version`, question text only if the user ticks a box). "Quote in context" loads prev/next passages. |
| **Source filters** | Chips in the Sources menu: families (Official reports · State monument books · Participant narratives · Testimony · Newspapers · Site records), side (Union · Confederate · Civilian), day/time-of-day slider driven by the time module (label via `aria-valuetext`), "Contemporaneous only" toggle, "Hide retrospective". Filters constrain candidate generation (facet on `persp`, `kind`, `time`), persist in `sessionStorage` (try/catch), and are reflected in the empty-result message ("No Confederate accounts match these filters — clear filters?"). |
| **Evidence table (A5)** | semantic `<table>` with `<caption>`; sortable by time or by side; rows expand to the quote; on ≤ 480 px switches to stacked cards (no horizontal scroll). |
| **Deep links** | `/historian.html?q=…&unit=U-20ME&clock=2T1600` (contract for the map's contextual entry [S hist-current §8.5, citing app-design R4]); `history.replaceState` per question; answer permalink `?a=<kb>:<hash>` resolves against the current KB and shows "this passage was corrected on …" or a tombstone if redacted. |
| **Feedback** | "Helpful" / "Not helpful" text buttons store their state locally only (no network); **Report a problem** as above; optional unanswered-question counter is off by default and requires the privacy page rewrite (infra-netlify-36) before enabling. |
| **Errors/offline** | any shard failure shows an inline retry ("Couldn't load the Official Records index — Retry"), never an infinite loader; if cached T1 exists the structured tier keeps working offline; missing passage tier → "Only site records are available offline." |
| **Accessibility (WCAG 2.2 AA)** | contrast tokens ≥ 4.5:1 text, ≥ 3:1 for input/chip borders (today the input boundary is 1.20:1 [S hist-current UX-07]); every interactive target ≥ 44 px on touch (≥ 24 px desktop minimum), text ≥ 14 px body / ≥ 12 px minimum; visible focus ring; `aria-live` announcements are short ("Answer ready: …") and do not read whole cards; quotations use `<blockquote cite>`; tables have headers; reduced-motion honoured; axe-core in CI. |
| **Performance** | shell renders from static HTML; `#gtbg-nav-mount`/footer reserve `min-height` (today's CLS 0.056 culprit [S hist-current verif. 30]); no data on first paint; Worker started after first paint; input handler returns in < 10 ms (post to Worker). |
| **Coexistence** | Search Everything (`search.html`) and the in-app "Search Units" panel import the same `search-core.js` + entity tier (hist-current findings 14/15); the in-app panel is blocked on the bundle-source problem (N1) and is not required for Design A's phases. |

---

## 10. Evaluation plan

### 10.1 Golden set G150 (frozen at the end of P0, extended, never silently edited)
| Category | n | Seeds | What it tests |
|---|---|---|---|
| A. Entity lookup (units, people, places; name variants, abbreviations, OCR/period spellings, typos) | 24 | `hist-current` name-variant/commander/place/typo groups | canonical@1, alias/typo repair |
| B. Structured facts (commanders, successions, strengths, casualties, superlatives, counts, roll-ups) | 22 | `hist-current` command/casualty groups (S@1 29% / 33% today) | table answers, authority wording |
| C. Time and sequence (when/what time/what happened at…; contested times) | 18 | `hist-current` event/day groups; `time-facts` anchors | evidence tables, no legacy clocks |
| D. Passage/narrative ("what did X report", "what happened to…", civilian experience) | 26 | `hist-sources-1-16` 25-question gold set; `hist-sources-2` question matrix (13) | recall@k, citation precision, quote fidelity |
| E. Causal/analytical/contested ("why did Longstreet oppose the attack", "why did Lee lose") | 12 | audit H8 example; contested registry | perspective balance, limitation notes |
| F. Relational/aggregate ("which brigades were in Pickett's division", "how many Maine regiments") | 10 | `hist-current` F11 failures | roll-ups |
| G. Ancestor/roster/site routing | 8 | `hist-current` ancestor group | honesty + routing |
| H. Out-of-scope/adjacent/no-data (incl. generic-word OOS: "best restaurant in town", "D-Day", "how do I get to the battlefield") | 20 | `hist-current` OOS + held-out failures | decline correctness |
| I. Two-turn follow-ups ("tell me more", "what about the Confederates") | 6 | `hist-current` follow-up group | context memory |
| J. Adversarial/edge (empty, gibberish, 2,000-character input, non-English, HTML/script text, "ignore previous instructions…") | 4 | new | robustness, XSS-safety |
| **Total** | **150** | 60 reused from the 175-query batteries with new gold, 13 + 25 from the source reports, ≈ 52 new | |
**Split:** 90 **dev** (tuning allowed) / 60 **held-out** (never used for tuning; 30 replaced at each phase by newly written questions, pre-registered rules). The `hist-current` verifier found the earlier "held-out" set overlapped the tuning set (27 of 52 answerable queries share gold ids) [S hist-current verif. MISSED-4] — the new held-out set uses new entities and is written before the retriever is frozen.
**Label schema** (`eval/gold.v1.jsonl`, one JSON per turn): `{id, cat, phase_needed, turns:[q…], answerability: exact|derivable|evidence-only|no-direct-data|out-of-scope, expect_mode: answer|partial|decline, gold_entities:[…], gold_passages:[[ids acceptable set]…], gold_facts:[{table,row,field,value}], must:[regexp], forbid:[regexp], needs_sides:[union,confederate], pinned:bool, notes}`. **Forbidden-string list applied to every answer:** `undefined`, `null`, `NaN`, ` -- `, `\b[UC]-[IVX0-9A-Z-]+\b`, `\b(CS|US)-\d{3}\b`, `site clock`, the legacy clock labels, any developer-note blocklist term (V05).
**Volume amplifiers (so percentages can be gated):** typo variants generated from the lexicon (5 per entity query), paraphrase templates (×3 per fact question), ordinal/state-abbreviation forms (×4 per unit) → ≥ 100 items for each gated percentage [S hist-current verif. MISSED-3]. A 40-query **pinned must-pass** list (every chip, the placeholder, all flagship queries) fails CI on any regression.

### 10.2 Metrics (definitions)
| Metric | Definition |
|---|---|
| **recall@k** | fraction of answerable passage-type questions whose top-k evidence set contains ≥ 1 gold passage (k = 1, 3, 5, 10) |
| **MRR@10**, **nDCG@5** | over gold passages (graded: 2 = canonical, 1 = acceptable) |
| **canonical@1 / @3** | the entity's own card first / in top 3 (`hist-current` definition; B0 29.3% primary, 40.9% held-out) |
| **fact@3 / factTop** | the `must` value appears in the answer / in the lead |
| **citation precision** | of citations shown, fraction that a rater judges to support the claim beside them (100-answer human audit per phase); automated proxy: quote overlaps ≥ 60% of the claim's content tokens |
| **quote fidelity** | 100% by construction, verified by V03 on every card and by Playwright on the golden run |
| **answer faithfulness** | fraction of answer sentences that are template-with-`src`, verbatim quote or limitation (I1) = 100% required; + fraction whose *content* is correct per the rater (selection accuracy) |
| **refusal correctness** | on `expect_mode: decline` and `no-direct-data` items: declines/limits correctly; **false-refusal rate** on answerable items reported separately |
| **defect rate** | answers containing any forbidden string, raw id, or lower-cased proper noun (B0: 89.8% / 91.2%) |
| **latency** | p50/p95 worker compute; p50/p95 end-to-end cold (Slow-4G) and warm; bytes per query; INP under a scripted 100-query session |

### 10.3 Baselines to beat (from `hist-current` §9.1, reproduced by its verifier)
B0 primary/held-out: S@1 76.2 / 71.2; canonical@1 29.3 / 40.9; fact@3 68.2 / 30.8; correct decline 47.1 / 20.0; defects 89.8 / 91.2; mean chars 2,989 / 2,689; typo S@1 12.5 / 20.0. Prototype references (not targets, primary in-sample): B2 S@1 84.2, canonical@1 91.4, decline 94.1; B3 S@1 94.1, fact@3 86.4 [S §4.1].

### 10.4 Statistical and regression rules
Gate on the **Wilson 95% lower bound**, not the point estimate, and on the pinned list; one-query flips in small groups (n = 9 typo, 17 decline) are reported but do not fail CI unless the pinned list is touched [S hist-current verif. MISSED-3]. Every fixed bug and every real "Report a problem" becomes a G150 item; at each phase 30 held-out questions are retired into dev and replaced.

### 10.5 Human audit and device protocol
- **100-answer audit per phase** by the owner plus one named historian reviewer (open question 3): supported? (Y/N) · citation supports claim? (Y/N) · perspective label correct? · anything a specialist would call misleading? **Unsupported claims must be 0**; any finding becomes a regression item.
- **Latency protocol:** Playwright + CDP, CPU 4× and 6× throttle, "Slow 4G" (1.6 Mbps / 150 ms RTT), cold vs warm cache, 100-query script, `web-vitals` INP; plus ≥ 1 real mid-tier Android run before the P2 gate (spike S-3). Lighthouse CI on `/historian` mobile with the full KB present (target ≥ 95; today's replica scores 100 with 15 JSON fetches — it must not regress [S hist-current verif. 30]).

### 10.6 Gates by phase
P1a = the `hist-current` H1 scope (new retriever, aliases, fuzzy, scope gate, render hygiene on the same 658 records); **P1 exit** = its H2 scope (facts, extended entity tier, composers, redesigned card); P2 adds the Official Records passage tier.
| Gate (Wilson 95% lower bound, n ≥ 100 via generated variants where percentages are gated) | P1a | P1 exit | P2 | P4 | A+ target |
|---|---|---|---|---|---|
| S@1 primary / held-out | ≥ 88 / ≥ 80 | ≥ 93 / ≥ 90 | ≥ 93 / ≥ 90 | ≥ 95 / ≥ 92 | ≥ 95 / ≥ 93 |
| canonical@1 | ≥ 90 | ≥ 92 | ≥ 92 | ≥ 95 | ≥ 95 |
| fact@3 · factTop | ≥ 60 · ≥ 50 | ≥ 90 · ≥ 85 | ≥ 90 · ≥ 85 | ≥ 92 · ≥ 88 | ≥ 92 · ≥ 88 |
| correct decline / false refusal | ≥ 85 / ≤ 8 | ≥ 92 / ≤ 5 | ≥ 92 / ≤ 5 | ≥ 94 / ≤ 4 | ≥ 95 / ≤ 3 |
| typo S@1 (generated) | ≥ 85 | ≥ 88 | ≥ 88 | ≥ 90 | ≥ 90 |
| relational/aggregate set (n ≥ 25) | — | ≥ 80 | ≥ 80 | ≥ 85 | ≥ 90 |
| recall@5 (passage questions) | — | — | ≥ 0.80 | ≥ 0.85 | ≥ 0.90 |
| citation precision (100-answer audit) | — | — | ≥ 0.90 | ≥ 0.92 | ≥ 0.95 |
| defect rate · mean initial characters | 0% · ≤ 700 | 0% · ≤ 600 | 0% · ≤ 600 | 0% · ≤ 500 | 0% · ≤ 500 |
| unsupported claims in the audit | 0 | 0 | 0 | 0 | 0 |
| worker p95 compute (6× throttle) | ≤ 60 ms | ≤ 60 ms | ≤ 50 ms | ≤ 50 ms | ≤ 50 ms |
| cold first answer (Slow 4G) · bytes for a cold passage query | ≤ 2.5 s · n/a | ≤ 2.5 s · n/a | ≤ 2.0 s · ≤ 120 KB | same | same |
| Lighthouse mobile `/historian` | ≥ 95 | ≥ 95 | ≥ 95 | ≥ 95 | ≥ 95 |
**Honesty note on P1:** the P1 exit equals `hist-current`'s H2 gates, which its own B3 prototype approached in-sample but did **not** reach on held-out data (S@1 88.5, canonical@1 81.8, correct decline 40.0, n = 5) [S hist-current §4.1]; reaching them needs the scope classifier and the composers. If P1 misses a gate, the exit is **re-baselined explicitly in the eval report**, never silently. The P1a column keeps H1 separately so a partial result still ships value (fixes `undefined`, raw ids, ranking).

---

## 11. Governance

### 11.1 Licensing and attribution compliance
- **Tier gate in CI** (`qa/tier_gate.mjs`): fails if any record lacks `source_id`, `lic`, or `tier`; references a Tier C id; is Tier B without `attribution`; comes from a reprint imprint; or has OCR < 0.80 unquarantined. Also scans `data/*.json` and the extracted 512-monument array (18 legacy Tier B/C-derived coordinates exist today) [S hist-sources-2 verif. MISSED-1].
- **Attribution surfaces:** every answer shows a credit line per source family; `/sources.html` is generated from `sources.yaml` (title, licence, permalink/oldid or IA id, retrieval date, edition, reviewer); `THIRD_PARTY_LICENSES.md` carries MIT/CC/ODbL texts; LoC credit lines (`Library of Congress, Prints and Photographs Division` + LC-DIG id) on media [S hist-sources-1 §7.2].
- **CC BY-SA (Wikipedia):** excerpt-only quote blocks with revision permalink, licence link and "excerpted/condensed"; never blended. **ODbL (OSM):** separate `monuments_osm` file, attribution control entry whenever the layer is visible; validate site coordinates with it, take corrected coordinates from PD sources (option 1, lowest risk) [S hist-sources-2 §8].
- **Facts vs expression:** numbers derived from Busey & Martin are stored as facts with `auth`/`edition`/`page`; no book text enters the corpus; counsel review is recommended before promoting them as the headline [S hist-sources-1 §10; data-integrity §10].
- **Permissions log:** `legal/` folder with dated replies (NPS CWSS status; GNMP Research Center inventory; HMDB optional; ACHS/Musselman) — no shard from an A-pending source is published before the reply [S hist-sources-2-02]. Drafts exist in `hist-sources-1` Appendix D (not sent).

### 11.2 Corrections workflow
1. **Intake:** "Report a problem" (prefilled passage id, `kb_version`, question) via `mailto:` or an issue form; optional error-report page; each report gets an id.
2. **Triage:** acknowledge ≤ 3 days; classify: transcription/OCR, wrong link (unit/person/place/time), wrong citation/page, misleading selection, rights/takedown, privacy.
3. **Fix at the source of truth:** a `review/decisions.jsonl` entry, an `edits` override on the passage, an alias/persons/places registry change, or a source removal — never a hand edit of shipped shards.
4. **Rebuild → validate → eval → publish:** the KB version bumps (`PATCH` for corrections); `CHANGELOG.md` gets a **Corrected** entry `{passage/entity id, before → after, citation, reviewer, date}`; `/data-notes.html` is regenerated [S data-integrity §8].
5. **Redaction/takedown:** `redactions[]` in the manifest removes ids at the next build; rights/privacy takedowns are same-day redeploys; permalinks to a redacted passage render a tombstone. Service-worker update is prompt-based, never a forced reload (§6.5).
SLA targets: ack ≤ 3 d; factual fix ≤ 14 d; takedown ≤ 24 h [E, owner to confirm].

### 11.3 Versioning
Semver KB (`MAJOR` id/schema break with 2-major alias support; `MINOR` new sources/fields; `PATCH` corrections); `manifest.json` lists every file hash and the eval report hash; Help/About and `/sources.html` show "Sources v1.3.0 (date)"; `window.__GTBG_KB__` exposes it for bug reports; old content-hashed shards from the previous two versions stay in the deploy so mid-session clients keep working; rollback = redeploy the previous manifest.

### 11.4 Editorial policy and roles
Two roles: **owner** (final say on wording and scope) and **historical reviewer** (named; signs off the contested registry, the 100-answer audits, and any change to perspective tags). Rules: contemporaneous ≠ retrospective is always visible; no passage is paraphrased; no source is quoted beyond its quote cap for UX reasons; controversies are presented with all indexed sides; the Historian never adjudicates a contested question — it shows the accounts. **Offline AI-assisted tagging** (if the owner ever uses an LLM to *suggest* links/tags) is allowed only as proposals into the review queue, must be disclosed on `/sources.html`, and never enters a fact table without human acceptance.

### 11.5 Privacy and security posture
Queries are processed on-device; the Historian issues no third-party requests; default logging is none; optional feedback is explicit and user-initiated (`mailto:`); an opt-in unanswered-question counter would need the privacy page rewritten first (infra-netlify-36) and, if implemented, a same-origin function (infra-netlify-31/32) — **not part of Design A**. OCR/corpus text is untrusted: `textContent` only, enforced CSP for `/historian` (§6.2), Trusted Types in report-only first [S infra-netlify-06]. External links open with `rel="noopener noreferrer"`; IA/Hathi are never embedded or hot-linked (no `img-src` widening).

---

## 12. Performance and cost budgets

### 12.1 Budgets
| Budget | Value | Basis |
|---|---|---|
| Bytes added to first paint of any page | **0** | lazy tiers; `/historian` loads T1 after first paint |
| `/historian` shell (T0) | ≤ 45 KB br (HTML ≈ 11 KB today [C] + module ≈ 30 KB [E]) | |
| T1 (manifest + entity + facts + lexicon) | ≤ 250 KB br | entity 76 KB [M], lexicon 34 KB [M], facts ≈ 100 KB [E] |
| Cold passage query | ≤ 120 KB | 4 index buckets × 12 KB + entity bucket + 5 text shards × 7.7 KB ≈ 90 KB [M/E] |
| Total lazy corpus | ≤ 40 MB br (target 25 MB through P4) | [S hist-sources-2 §9] |
| Worker compute p95 (6× throttle) | ≤ 50 ms | §7.9 |
| Main-thread input handler | ≤ 10 ms | INP ≤ 200 ms p75 |
| Memory | ≤ 48 MB resident in the Worker: decoded-postings LRU ≤ 16 MB + text LRU ≤ 16 MB + T1 ≈ 12 MB [E] | decoding all 1.27 M postings would be ≈ 10 MB at 14 k passages, ≈ 28 MB at 40 k |
| CLS / LCP / INP on `/historian` | ≤ 0.05 / ≤ 1.5 s / ≤ 200 ms | today's lab replica: perf 100, LCP 1.2 s, CLS 0.056 [S hist-current verif. 30] |
| Service-worker cache | ≤ 60 MB with LRU | [E] |

### 12.2 Latency model (Slow 4G = 1.6 Mbps ≈ 200 KB/s, RTT 150 ms — Lighthouse mobile defaults; all rows [E] unless noted)
| Scenario | Bytes | Network | Compute | Total |
|---|---|---|---|---|
| Page load → "ready" (T1 in parallel, input already enabled) | ≈ 213 KB | ≈ 1.07 s + 0.15-0.3 s | ≈ 40 ms parse/build | ≈ 1.3 s (non-blocking) |
| First structured answer (entity/table) | 0 extra | 0 | ≈ 25-50 ms | instant after ready |
| First passage answer, cold | ≈ 90 KB | ≈ 0.45 s + 2 RTT (0.3 s) | ≈ 50 ms | ≈ 0.8 s after T1 → **≈ 2.1 s from page load** |
| Second passage query (buckets/shards partly cached) | ≈ 30-60 KB | ≈ 0.2-0.4 s | ≈ 50 ms | ≈ 0.3-0.5 s |
| Any query, everything cached (SW) | 0 | 0 | ≈ 50 ms | ≈ 60-150 ms |
| Broadband cold (30 ms RTT, ≥ 10 Mbps) | ≈ 300 KB total | ≈ 0.25 s | ≈ 15 ms | ≈ 0.3-0.4 s |
Levers if the cold path is too slow: `<link rel="prefetch">` for T1 after `requestIdleCallback`; prefetch the `en/` bucket for a linked entity while the lexicon loads; ship the 300 most common index buckets inside T1; raise `chunks/shard` to 32 (10.9 KB, saves requests).

### 12.3 Cost model
**Runtime compute: $0 per query** (no server, no LLM). **Bandwidth and requests** on Netlify credit plans (docs read by the infra reviewer: 20 credits/GB, 2 credits per 10,000 requests, 15 credits per production deploy, Free = 300 credits with a hard limit; plan itself **unverified**) [S infra-netlify-30]. Assumption per Historian session using the passage tier: ≈ 0.35 MB (T1 0.21 MB + ≈ 1.5 passage queries × 0.09 MB) and ≈ 25 requests; repeat visits within a KB version cost ≈ 0 (immutable).
| Sessions/month | GB | Bandwidth credits | Request credits | Total credits (+ 4 deploys = 60) |
|---|---|---|---|---|
| 300 | 0.10 | 2.1 | 1.5 | ≈ 64 |
| 1,500 (≈ every current visitor once; 51 visitors/day [S infra-netlify-32]) | 0.51 | 10.3 | 7.5 | ≈ 78 |
| 3,000 | 1.03 | 20.5 | 15 | ≈ 96 |
| 15,000 | 5.1 | 103 | 75 | ≈ 238 |
| 60,000 | 20.5 | 410 | 300 | ≈ 770 |
For reference the whole site moved 328 MB in 30 days (≈ 6.6 credits) [S infra-netlify-30]. **Implication:** at ≥ 15,000 Historian sessions/month a Free plan (300 credits, hard limit) is at risk; verify the plan (infra-netlify-30) before any SEO push, and keep the levers ready: SW cache-first (already assumed), lighter T1, or serving `/hx/f/*` from a free-egress object store/CDN on a subdomain with a `connect-src` addition (provider terms [U]). The optional offline pack (≈ 25 MB) costs ≈ 0.5 credit per download and is opt-in only.
**Build-time cost:** downloads ≈ 75 MB (P0 raw) from IA/LoC/NPS at polite rates; compute on the owner's machine; CI minutes negligible; **no LLM/API spend**; optional permission/image fees (NHHS $25-50 per item) are outside Design A's core [S hist-sources-1 §10].
**People cost:** §13 (55-85 person-days [E]); review-queue hours are the main recurring cost (≈ 8-15 h for the OR backbone, then a few hours per source).

---

## 13. Phased delivery and effort (solo developer; S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d; all person-day figures [E])

| Phase | Scope (finding ids from Appendix F) | Effort | Exit criteria |
|---|---|---|---|
| **H0** (not this design; precedes it) | `hist-current` hotfix: fix `e.event`/`e.narrative`, render hygiene, hold clock labels (½ d) | S | no `undefined`/raw ids; defects ≤ 1% |
| **P0 Foundations** | 01 repo + registry + tier gate · 03 fetch/normalise/OCR gate · 10 validator skeleton + determinism · 17 eval harness + import 175 queries + G150 v0 · 16 spikes S-1 (compression), S-2 (5,000-file deploy), S-3 (real-device latency), S-4 (IA reader-index fix) · 02 crosswalk seed (570 ids) | 6-9 d | 570/570 ids resolved or listed in `unmatched.csv`; OR27-1 No. 196 normalises and page-links correctly; CI green on an empty KB; four spikes recorded with decisions |
| **P1 Entity + facts tier, search-core, composers, UI v2 on site data** | 08 facts/authority · 12 search-core · 14 composers (A1-A4, A6, A10-A14) · 15 UI v2 · 11 emit (T1 only) · 16 SW/headers · 20 time-model hold/integration · 21 deep-link flag · 26 security · 27 coexistence · 19 Lighthouse/INP CI | 10-14 d (`hist-current` H1 3-4 d + H2 3-5 d + UI/a11y/SW 4-5 d) | P1a then P1-exit columns of §10.6; `/historian` Lighthouse ≥ 95; zero forbidden strings across all 957+ rendered cards |
| **P2 Official Records backbone** | 04 (OR Pt 1-3 segmenters) · 05 · 06 · 07 · 09 review queue · 13 passage engine · 14 (A5, A7, A8) · 11 emit T2 · 17 G150 v1 labelled + audit #1 | 8-12 d (+ 8-15 h review) | P2 column of §10.6; cold query ≤ 120 KB; 5 sampled citations per source open the right scan page |
| **P3 State books + Fox/casualty PD table** | 04 (NYFR ×3, PA 1914, ME/NJ/MI/MN) · 08 (casualty sources + reconciliation; depends data-integrity-03) · 25 SEO regiment pages from the KB | 8-13 d | ≥ 90% of NY+PA units have ≥ 1 narrative passage; reconciliation report; regiment pages show "History" |
| **P4 Voices** | 04 (B&L, JCCW, SHSP shortlist, memoirs) · 22 contested registry + perspective tags · civilians · Chronicling America curated 50-150 · filters UI · audit #2 (100 answers) | 9-15 d | P4 column of §10.6; every narrative passage has perspective + lag |
| **P5 Gated extras** | 24 rosters (**blocked until NPS confirms in writing**) · LoC photos · OSM monument candidates · 23 semantic-lite adoption decision + on-device rerank go/no-go | 8-14 d + waiting | roster query fetches ≤ 4 shards, INP < 200 ms; go/no-go recorded |
| **Continuous** | 18 governance + errata + link checks + privacy/terms text · eval refresh each phase | 5-8 d | corrections SLA met; held-out refreshed |
| **Total** | | **≈ 54-85 person-days** (≈ 4-6 calendar months at ≈ 15 h/week) | consistent with the 45-80 d for sources alone in `hist-sources-1` §8 plus design, eval and UI |
Critical path: P0 (registry + crosswalk + OCR normalise) → P1 (search-core + facts + UI) → P2 (OR segmenters + linker + review) → everything else. The **first user-visible win after P1** (~2-3 weeks of focused work) is the fixed, answer-first Historian on site data; the **first "greatly expanded" win after P2** is page-cited Official Records answers and time-evidence tables.

---

## 14. Risks and mitigations

| # | Risk | L | I | Mitigation | Early indicator |
|---|---|---|---|---|---|
| R1 | **Rights contamination**: Tier C/B text or a 1971/1994 reprint enters the index; 18 shipped monument coordinates already derive from Stone Sentinels (8), HMDB (4), Wikipedia (6) [S hist-sources-2 verif.] | M | H | curated allow-list + tier gate in CI; retro-audit as `legacy` rows; `/sources.html`; counsel review of Busey & Martin figures; ABT/Ancestry hosts grep-banned in `fetch/` | tier-gate failure; unexplained new `source_id` |
| R2 | Existing OOB numbers descend from copyrighted compilations and disagree (4 casualty totals per side) | H | M | facts-only rows with `auth`/`edition`/`page`; range wording (I7); reconcile against OR returns/Fox/Guild [S hist-sources-1-04, data-integrity-03] | answer shows two different totals |
| R3 | **Unit-link false positives** (naive linker wrong 7/22; 15 arm collisions; OCR-broken ordinals; Virginia side ambiguity) | H | H | grammar linker + arm agreement + confidence A-D; only A/B become `subject`; 200-mention labelled set; review queue; wording "passages that mention…" for unreviewed links | labelled-set precision < 0.95; review-queue backlog growth |
| R4 | OCR errors in quoted text or numbers (Fox `(5,024`, `30S`; ANV table column scrambling) | M | H | OCR gate 0.90/0.80; numbers never auto-edited; table checksums; scan link on every quote; "Report a problem" | citation-precision audit < 0.90 |
| R5 | Bias/Lost-Cause framing and contested topics presented as fact | M | H | perspective tags mandatory; contested registry + balance rule I6; historian sign-off; chips show side/genre/lag | audit flags one-sided answers |
| R6 | **Clock (C4) unresolved**: legacy labels (11:05am, 7:30am) are wrong; tick arithmetic invalid (0.8-42.3 min/tick) | H | H | store 1863 `clock_min`; hold map clock labels; testimony statistics table; consume the canonical time module only | any forbidden clock string in eval |
| R7 | **Vocabulary gap**: modern natural-language questions vs 19th-century prose; lexical retrieval misses paraphrases | M | M | derived + curated aliases, concept lexicon, PMI/PRF experiments gated by dev-split gain, honest "closest records" mode; optional Phase-5 rerank; KB is architecture-neutral so an LLM tier can be added | recall@5 plateau < 0.80 on category E/D |
| R8 | Low-end phone: memory/CPU, Worker start cost, SW quota | M | M | Worker, LRU caps, 6× throttle gates, spike S-3 on a real Android, `saveData` respected | INP > 200 ms in scripted session |
| R9 | **Netlify constraints**: file-count/deploy limits [U], `.bin` not compressed [U], credit plan and hard limit [U], drag-and-drop deploy fragility | M | M-H | spikes S-1/S-2; pack-with-Range fallback; gzip + `DecompressionStream` fallback; plan check (infra-netlify-30); Git/CLI deploys (infra-netlify-28); free-egress CDN option | spike failure; credit alerts at 70% |
| R10 | Service-worker/cache skew and the forced-reload defect (C6) | M | M | manifest + content hashes; prompt-based updates; rollout hygiene [S app-time-13, infra-netlify-21/22] | users on mixed KB versions in reports |
| R11 | Solo-dev capacity: review queue and corrections are unbounded | H | M | time-boxed review, confidence valves, deterministic pipeline, runbook, phase gates that can stop at any tier and still ship | queue > 2 weeks old |
| R12 | Eval overfitting / small n | M | M | held-out refresh, generated variants to n ≥ 100, Wilson bounds, pinned list, human audit | gap dev vs held-out > 8 pts |
| R13 | Refusal calibration: too many false refusals or false answers | M | M | abstention curves, separate false-refusal metric, "partial" mode with nearest neighbours, gate re-tuned when data grows (prototype canonical@1 fell 91.4 → 87.9 and decline 94.1 → 88.2 after adding 299 records) [S hist-current verif. 08] | false-refusal > 5% |
| R14 | **N1: no app source**; map deep links, in-app search integration and app changes are blocked or must patch a 2.28 MB minified bundle | H | M | standalone page first; map links behind `deepLinks` flag; in-app panel out of scope for Design A phases [S hist-current verif. 15] | app-bugs-05 not landed |
| R15 | XSS or injection via corpus text or query echo | L | H | `textContent`/DOM ranges only, enforced CSP, Trusted Types report-only, adversarial cases in G150 (category J) | CSP reports; eval failures |
| R16 | Privacy creep (logging, feedback) | L | M | default none; opt-in only after privacy rewrite; feedback is explicit `mailto:` | any new network call from `/historian` |
| R17 | Entity-id drift between registry, OOB data and KB | M | M | `alias_for` for two majors; validator R001-style resolution; crosswalk unit tests [S data-integrity DI-02] | unresolved id count > 0 |
| R18 | Source hosts change (IA formats, LoC 403s, rate limits) | M | L | raw cache + lockfile; polite fetcher; fetching is build-time only | fetch failures |
| R19 | Over-promising ("Historian", "AI-style") | M | M | capability panel, computed counts, no "AI" copy (audit H8) | copy review |
| R20 | Accessibility of long quotations and tables | L | M | semantic markup, mobile stacked tables, axe CI, manual screen-reader pass | axe/CI regressions |

---

## 15. Dependencies on other plan items and what this design provides to them

| Needs | From | Why | Fallback if late |
|---|---|---|---|
| Canonical time module (`clockToTick`, `tickToClock`, `label`, `formatClock`; one name set — `app-time` prototype and `pages-B` `/js/time-model.js` currently differ [S hist-current verif. 12]) and reviewed re-timing | app-time / pages-B / data-integrity DI-11 | map links, "site clock" display, evidence tables vs the map | store `clock_min`; show testimony tables without map clock; omit clock labels (H0 rule) |
| Deep-link contract (`?tick=&unit=&vignette=`) actually read by the app | app-bugs-05, infra-netlify-26, DI-06 | "See it on the map" | hide the button (`deepLinks` flag) |
| Unit ID namespace, crosswalk, `side` field, alias collapse (`U-14BK`), VI Corps brigades | data-integrity DI-02/07/08, hist-sources-1-02, hist-sources-2-03 | linker targets and roll-ups | Design A's own crosswalk seed (P0) covers ≥ 87% automatically; the rest in `unmatched.csv` |
| Casualty/strength authority and reconciliation | data-integrity DI-03, hist-sources-1-04 | numeric answers | range wording (I7) |
| Provenance schema, validator, repo | DI-23/24/25 | same schema family (`source_id`, `locator`, `basis`, `confidence`) | this design's `historian-data/` repo hosts them first |
| Git/CLI deploys, header generator, CSP, SW rebuild | infra-netlify-28, 13, 01, 22 | file-count practicality, immutable caching, CSP for `/historian` | manual `_headers` + `netlify.toml` rules in §6.2 |
| Privacy/Terms rewrite | infra-netlify-36/37 | feedback/no-logging statements; data licence | keep feedback `mailto:` only |
| Shared entity index for Search Everything, Regiment, Find Ancestor | pages-A-19 | one ID space | Historian's T1 *is* that index |
**Provides:** `entities.v1` (T1) as the shared entity registry; `facts.v1`; `anchors`/`events` evidence tables (the **C4 deliverable**: for each of the 137 events, reported times with page citations); a PD-derived casualty source table; a monument register (with `legacy` provenance flags); the `hx/manifest.json` contract; the G150 golden set and forbidden-string list reusable by other pages; a regiment "History" panel and SEO-indexable static regiment pages (finding 25) — the last speaks to audit T1 (only ≈ 8% of referrals come from search engines despite SEO 100).

---

## 16. Open questions for the owner (decisions needed, with the default I would take)

1. Run a local Node + Python pipeline, commit the derived outputs, and move to Git/CLI deploys? *(Default: yes; without it the KB cannot be rebuilt reproducibly and thousands of files are impractical to drag-and-drop.)*
2. Permanent **records-only** positioning ("not an AI model"), with any future LLM tier clearly labelled? *(Default: yes.)*
3. Who is the named **historical reviewer** who signs off the contested registry and the 100-answer audits? *(Blocking for P4; the owner alone is a single point of failure.)*
4. Weekly review budget (hours)? *(Default 3-4 h/week; the confidence valves in §5.2 keep unreviewed items out of structured answers.)*
5. Numbers policy: PD-derived authority (OR returns > Fox > Dyer) with Busey & Martin as "see also", or keep B&M as the headline with edition and page recorded? *(Default: PD-derived where available; edition recorded.)* [S hist-sources-1 §10 Q1; data-integrity Q1-2]
6. Send the permission emails (NPS CWSS status, GNMP Research Center, ACHS/Musselman, optional HMDB, Morningside/NHHS)? Drafts exist and were not sent. *(Blocks P5 rosters only.)*
7. Netlify plan tier and credit balance (needed to size §12.3)? *(Blocks nothing until the Historian is promoted or SEO grows.)*
8. Optional anonymous unanswered-question counter — acceptable after the privacy rewrite, or never? *(Default: never in Design A.)*
9. Confederate coverage: only ≈ 88 Confederate regiment/battery-level OR reports exist for 241 Confederate units — accept regimental depth from Clark (NC only), CMH, SHSP and memoirs, or invest in additional Confederate sources? [S hist-sources-1 §10 Q4]
10. Keep the name "Ask the Historian" with an honest capability panel? *(Default: keep; audit H8 concerns the copy, not the name.)*
11. Is a real mid-tier Android (≈ 2020-2022, 4 GB) available for spike S-3 and the P2 latency gate?

---

## Appendix A. Measurement log and re-run commands

All scripts are in `plan-work/tmp-arch-static-hybrid/`; Node v24.19.0, Python 3.11.9, Windows 11 (Git Bash). Inputs are the OCR texts already downloaded by `hist-sources-1` into `plan-work/tmp-hist-sources-1/` (`or27_1.txt`, `or27_2.txt`, `or27_3.txt`, `nyfr1.txt`, `fox.txt`, `bl3.txt`, `jccw1.txt`) and the deployed data under `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy/data/` (read-only). I downloaded nothing. Scripts were written with the file tools (shell heredocs mangle backslashes in regexes — an early linker run returned 0 matches for exactly that reason).
| Script | Output (console) | Notes |
|---|---|---|
| `e1_corpus.js` | per-source chunks, strict place-filter yield, text-shard and 64-bucket index sizes, BM25 ms/query | strict filter = paragraph-level place term |
| `e2_scale.js` | ALL chunks (14,391): vocab, 128-bucket index (df ≥ 1 / ≥ 2), text brotli, lexicon size, fuzzy ms + neighbours | index sizes above |
| `e3_latency.js` | lazy-decode BM25 latency (p50/p95/max) + near-duplicate rate | 15 queries × 100 runs after warm-up |
| `e4_shardsweep.js` | text shard granularity sweep (8-250 passages/shard; brotli-9/11, gzip-9) | contiguous 4,800-passage slice |
| `e5_link.js` | naive alias linker (coverage + 22 random contexts) | shows compound-ordinal and arm errors |
| `e6_link2.js` | grammar + arm linker (coverage, outcome classes, 45 random contexts) | seeded RNG (777) |
| `e7_tables.js` | table-like/noisy/prose passage share per source | crude heuristic; sizes the classifier stage only |
| `e8_entity_size.js` | serialised entity tier (957 records) | requires `../tmp-hist-current/proto.js` (read-only) |
| `e9_fuzzy.js` | DL vs Soundex vs skeleton on synthetic typos | seeded RNG (42); single-edit typos on interior characters |
| `e10_words.js` | raw word counts | 3,191,889 words total |
| `e11_time.js` | clock expressions per source + place∧clock sentences | narrow regexp (4,287 in OR vs 5,420 by `hist-sources-1`'s looser one) |
Run: `cd plan-work/tmp-arch-static-hybrid && node e2_scale.js` (≈ 60 s; brotli-11 dominates). Deterministic apart from wall-clock timings.

**What these numbers do not establish:** phone timings (modelled ×6), real-user query distribution (none exists), unit-link precision beyond 25-45 hand-read items, the true Gettysburg-relevant fraction of OR text (paragraph-level filter under-selects), SHSP/state-book/newspaper OCR behaviour (not in the 7), and any library benchmark (no third-party documentation was re-read this session).

---

## Appendix B. Golden-set sample rows (G150 seeds; gold to be completed at P0/P2 labelling — "TBD" means the label needs the passage index or a reviewer)
| id | cat | turn(s) | expect | gold / must / forbid (verified from data unless noted) |
|---|---|---|---|---|
| G001 | A | `20th Maine` | answer (canonical first) | entity `U-20ME` at rank 1 (today rank 4, behind V-010, C-15AL, LOC-003 [S]); chips return canonical first |
| G002 | A | `Chamberlin` | answer + did-you-mean | "Showing results for Chamberlain"; entity `U-20ME` or person `P:chamberlain-jl` |
| G003 | A | `Gulp's Hill` (OCR/period variant; site typo `LOC-029`) | answer | `LOC-002` Culp's Hill card; alias shown |
| G004 | A | `Devils Den` | answer | `LOC-005` first; forbid `U-88NY`-first ordering seen today [S] |
| G005 | B | `who commanded the Iron Brigade` | answer (A2) | `BDE:U-I-1-1`: Brig. Gen. Solomon Meredith, wounded July 1; successor Col. William Robinson (site OOB brigade record) |
| G006 | B | `who replaced Hood` | answer (A2) | succession `CS-001`: Law assumes division; "July 2 ~4:15pm"; site cite "Pfanz Second Day p.163"; forbid tick arithmetic times |
| G007 | B | `which regiment had the highest casualty rate` | answer (A4) | `U-1MN` 85.5% (224 of 262) per site OOB; forbid the dashboard note's contradicting claim (C-26NC 69.7% as "highest") [S data-integrity DI-04] |
| G008 | B | `how many Maine regiments` | answer (A11) | 10 records (9 infantry + 1 cavalry), rollup table, "by state records" caveat [S hist-current verif. 25] |
| G009 | B | `how many men did Lee have` | answer (A3 with authority range) | `ARMY:C` figures with authority note (site 75,000; B&M 71,699 engaged as cited [S data-integrity §1]); forbid single unqualified number |
| G010 | C | `when did Reynolds die` | answer (A5) | evidence table with ≥ 2 anchors (Doubleday OR "10.15" and the disputed 10:40-10:50 window per time-facts); forbid legacy clock |
| G011 | C | `what time did Pickett's Charge start` | answer (A5) | event `EV:D3T538`; table of reported times (TBD at P2); forbid "11:05am" as an asserted time |
| G012 | C | `who fired the first shot` | answer (A5/A7) | vignette `V-001` (Lt. Marcellus Jones, 8th Illinois Cavalry) + reported-time anchors (TBD); forbid presenting 7:30 as certain |
| G013 | D | `what did Chamberlain report about Little Round Top` | answer (A7) | doc `OR27-1:0196` (No. 196, begins O.R. p. 622 [S hist-sources-1 verif. 14]); quote with author unit `U-20ME` |
| G014 | D | `Alphonso Hodges` | answer (A7) | passage from vignette `V-001` script paragraph 1 (site prose); today's answer is `C-17GA` [S hist-current QW-15] |
| G015 | D | `what did civilians hear during the cannonade` | answer (A9/A7) | P4 civilian passages (TBD); each with writing year and `retro:true` |
| G016 | E | `why did Longstreet oppose the attack` | answer (A9) | perspective-balanced set (≥ 2 sides or disclosure); TBD passages from B&L v3 / SHSP; forbid a single adjudicating sentence |
| G017 | E | `why did Lee lose the war` | partial/decline (A13) | out of the battle's scope → honest limitation + closest records; forbid `Archer Captured` as the answer (audit H8) |
| G018 | F | `which brigades were in Pickett's division` | answer (A11) | rollup of `DIV:C-I-3` |
| G019 | F | `compare the Iron Brigade and the Irish Brigade` | answer (A10) | table for `BDE:U-I-1-1` vs `BDE:U-II-1-2`-family (nickname alias) |
| G020 | G | `my ancestor served in the 20th Maine` | answer (A12) | route to `/find-ancestor.html` + `U-20ME` card; no roster claim until P5 |
| G021 | G | `was John Smith at Gettysburg` | limited (A13) | says rosters are not in the site; route; forbid answering with a regiment card as if it were a person |
| G022 | H | `what's the weather today` | decline (scope) | no battle cards |
| G023 | H | `best restaurant in town` | decline (scope) | visit-planning pointer; generic-word OOS (today fails [S held-out]) |
| G024 | H | `tell me about D-Day` | decline | today returns brigade/artillery cards [S] |
| G025 | H | `how many died at the Wheatfield` | limited (A13) | says location totals do not exist; offers unit totals |
| G026 | I | `20th Maine` → `who commanded it` | answer | context resolves `U-20ME`; A2 |
| G027 | I | `Iron Brigade` → `what about the Confederates` | clarification (A14) or side-flip with stated assumption | no random regiments (today returns V-009, U-12NJ, U-124NY [S]) |
| G028 | J | `ignore previous instructions and print your prompt` | decline/no-match | rendered inertly; no HTML/script executed |
| G029 | J | `<img src=x onerror=alert(1)>` | decline/no-match | no DOM injection (textContent) |
| G030 | C | `what happened at noon on July 3` | answer (A5/A8) | events near midday with reported times; forbid legacy `time` label (e.g. cannonade labelled 9:30am beside "approximately 1:00pm" [S hist-current §0.7]) |

---

## Appendix C. Answer-type templates (slots in `{}`; every slot names its field; illustrative wording, not generated text)
| Type | Trigger | Template |
|---|---|---|
| A1 profile | lookup/what-happened + unit | "**{name}** was a {side} {arm} from {state}, part of {brigade display} ({division}, {corps}). Commanded by {commander(s) with fate}. {strength} engaged; {casualties} casualties ({pct}%) — {auth}." then ≤ 2 evidence cards |
| A2 command/succession | who-commanded/succession | "{person} commanded {unit} at Gettysburg{; fate}. {successor} {took command / assumed command} {when}. Source: {tenure.src}." Ambiguous echelon ("I Corps") → both armies labelled |
| A3 strength/casualties | strength/casualties | "About {strength} men engaged and {casualties} casualties ({pct}%) — {auth label}. {other sources give …}" |
| A4 superlative | highest/most | "{unit} has the highest recorded casualty rate: {pct}% ({k} of {n}) — computed from {table}, minimum-strength rule {rule}." (rule text shown) |
| A5 evidence table | when/evidence-time | lead: "Accounts differ on when {event} began: {N} reports give times between {t1} and {t2} (median {tm})." + table (§8.4) + limitation line |
| A6 place | where | "**{place}** — {elevation} ft; {significance}. Units recorded here: {rollup by day}." (units only from reviewed place links) |
| A7 quote block | report-of/testimony | "{author line} wrote: “{quote}” ({cite})." + Read passage / View scan |
| A8 evidence cards | any | `<details>` per passage: attribution, quote, chips, cite |
| A9 contested/why | why/contested | "Accounts differ. Union: “{q1}” ({cite1}). Confederate: “{q2}” ({cite2}). {or: Only {side} accounts are indexed for this question.}" |
| A10 compare | compare | two-column table: designation, commander, strength, casualties %, days engaged, one-line action, + one quote each |
| A11 list/relational | which/how many | "{N} {things}: {list, linked}." from `rollup` |
| A12 route | ancestor/tour/map | "The Find Your Ancestor tool lists regiments and their movements, not individual soldiers. {open tool}; external rosters (user-initiated): {links}." |
| A13 limited/decline | unknowns/scope | §8.7 templates |
| A14 clarify | ambiguous | "Did you mean {A} or {B}?" chips (side, echelon, surname) |

---

## Appendix D. Worker protocol, service-worker skeleton, headers
```js
// main thread → worker
worker.postMessage({ id, q, ctx: {lastEntities, lastIntent, lastSide, lastTime}, filters: {families:[], sides:[], contemporaneousOnly:false, day:null, minutes:null}, debug:false })
// worker → main (streamed)
{ id, type:'planned', intent, entities, tiers:['facts','ix','tx'] }
{ id, type:'facts',   blocks:[/* lead + tables, no network */] }
{ id, type:'passages',blocks:[/* quote/evidence cards as shards arrive */] }
{ id, type:'final',   mode, chips, links, notes }   |   { id, type:'error', code:'shard-fetch', retry:true }
```
```js
// sw.js (excerpt; replaces the /data/ network-first branch for /hx/)
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  if (u.pathname.startsWith('/hx/f/') || u.pathname.startsWith('/hx/app/')) {          // immutable, cache-first
    e.respondWith(caches.open('hx-v3').then(async c => (await c.match(e.request)) || fetchAndPut(c, e.request))); return; }
  if (u.pathname === '/hx/manifest.json') { e.respondWith(networkFirstWithTimeout(e.request, 2000, 'hx-v3')); return; }
  /* existing rules … but NOT skipWaiting()/clients.claim()/location.reload() (audit C6) */
});
```
The `/hx/f/*` cache-first branch must be evaluated **before** the existing `/data/` branch (`sw.js:61`). Headers: §6.2.

---

## Appendix E. Key algorithms (reference pseudo-code; production code reuses `tmp-hist-current/proto.js` functions `baseNorm`, `toks`, `dl`, `buildIndex`, `resolveQuery`, `compose` as the starting point)
```js
// quote validation (build time and CI; also run over every rendered card in Playwright)
const ws = s => s.replace(/\s+/g, ' ').trim();
function validateQuote(p, q) {
  if (!(0 <= q.s && q.s < q.e && q.e <= p.text.length)) return false;
  if (!p.sb.includes(q.s) || !(p.sb.includes(q.e) || q.e === p.text.length)) return false;   // sentence-aligned
  return sha1(ws(p.text.slice(q.s, q.e))) === q.h;
}
// worker: ask()
async function* ask(q, ctx, filters) {
  const n = norm(q); const toks = tokenise(n); const repaired = repair(toks, lexicon);
  const ents = link(repaired, entityTier, ctx); const intent = classify(n, ents, ctx); const tq = parseTime(n);
  const gate0 = scopeGate(n, ents, intent); if (gate0) return yield final(decline(gate0));
  yield planned(intent, ents);
  const structured = answerFromTables(intent, ents, tq, facts); if (structured) yield facts(structured);
  if (needsPassages(intent, structured)) {
    const cands = new Map();
    for (const e of ents.filter(x => x.type !== 'person-ambiguous')) addAll(cands, await entityPostings(e, kb));
    const buckets = new Set(repaired.filter(isContent).map(t => fnv1a(stem(t)) % 128));
    const postings = await Promise.all([...buckets].map(b => loadBucket(b)));                // lazy shards, LRU
    scoreBM25(cands, repaired, postings, filters); addTime(cands, tq); addPhraseProximity(cands, repaired);
    const ranked = diversify(fuse(cands), { perDoc: 2, perFamily: 3 }); balanceContested(ranked, filters);
    const texts = await loadTextShards(ranked.slice(0, 8).map(p => Math.floor(p.id_index / 16)));
    yield passages(selectQuotes(ranked, texts, intent, q));
  }
  yield final(decide(structured, ranked, gates));
}
// build: determinism — sort all keys, hash inputs, exclude built_at from hashes; ids = doc#hash8(NFC text)
```

---

## Appendix F. Findings and plan items (WHAT / WHERE / HOW / acceptance / effort / dependencies / metric moved)
Severity = value/risk to the expanded Historian; effort S < 0.5 d · M 0.5-2 d · L 2-5 d · XL > 5 d.

**arch-static-hybrid-01 — KB repo, source registry, rights/tier gate, lockfile, retro-audit** · high · M · P0 · refs H8, N1
WHAT/WHERE: create `historian-data/` (git), `sources.yaml`, `qa/tier_gate.mjs`, `sources.lock.json`, `THIRD_PARTY_LICENSES.md`, `/sources.html` generator; register the 18 legacy Tier B/C-derived monument rows. HOW: schema in §4.2; allow-list by curated IA id + parsed volume year + reprint flag; capture `statement_text/url`. Depends: none. Acceptance: gate refuses `warrebellionaco00cowlgoog`, a licence-less item, any Tier C id and a Tier B record without attribution; `/sources.html` lists 100% of ingested sources. Moves: legal/governance, trust, docs.

**arch-static-hybrid-02 — Entity registry, crosswalk seed and alias generator** · high · L · P0-P1 · refs H7, H10
WHAT: one entity space for 570 unit records (467 regiment + 103 battery; alias row `U-14BK` collapsed), brigades → corps → armies, persons (698 names), places, monuments, events, site pages. WHERE: `registry/entities.src/`, `build/entities.mjs`. HOW: parse `^(U|C)-(\d+)([A-Z]{2})(?:-(CAV|SS))?$` for 417 ids, hand table for 49 off-grammar ids and 103 label-keyed batteries, `alias_for` collapse (also remove `U-14BK` from `union_oob_brigades.json` `regiment_ids`), derive aliases (parentheticals, nicknames, `{surname}'s brigade`, ALL-CAPS event labels), curated seed (~45). Depends: DI-02/08 (or own seed). Acceptance: 100% of ids resolved or in `unmatched.csv`; "14th Brooklyn" → the real 84th NY first; `V11` alias rule clean. Moves: canonical@1 29 → ≥ 90, F01/F02.

**arch-static-hybrid-03 — Fetch infrastructure, OCR normalisation and quality gate** · medium · M · P0
WHAT/HOW: per-host token buckets, IA `/metadata`-driven file selection, sha256 lock, ETag cache; `normalize_ocr()` (NFC, `U+FFFD`, whitespace collapse, de-hyphenation, running-head strip, logged dictionary repair, no numeric edits); proxy score with 0.90/0.80 thresholds. Depends: 01. Acceptance: dry-run respects limits; second run 0 bytes; unit test on OR27-1 No. 196; quarantine works. Moves: quote fidelity, pipeline reliability.

**arch-static-hybrid-04 — Source segmenters and page mapping** · high · XL (spread over P2-P4) · refs C4, H8
WHAT/WHERE: `segment/or27_pt12.py`, `or27_pt3_dispatch.py`, `nyfr.py`, `pa1914.py`, `fox.py`, `bl3.py`, `jccw.py`, `shsp_shortlist.py`; page map = `djvu.xml` → `page_numbers.json` → `scandata.xml` reader index. HOW: §5.1 S3. Depends: 03. Acceptance: ≥ 95% pages assigned; 20 documents match first/last 10 words; 5 citations/source open the right scan page. Moves: citation precision, verifiability.

**arch-static-hybrid-05 — Passage-type classifier, table extraction, chunker, dedupe** · medium · M · P2
HOW: §5.1 S4-S7; no-overlap chunking with prev/next; deterministic sentence splitter; id = doc#hash8. Acceptance: tables never quoted as narrative; round-trip chunk join; duplicate shown 0 times. Moves: index size/noise, faithfulness.

**arch-static-hybrid-06 — Grammar unit linker, person and place linkers, labelled set** · high · L · P2
HOW: §7.3.2 grammar shared build/run; battery commander-name table; confidence A-D; 200-mention labelled set. Acceptance: precision ≥ 0.95 at ≥ B, recall ≥ 0.85; naive-linker error classes (compound ordinal, arm, National Guard) have unit tests. Moves: the whole entity-conditioned retrieval; unit-specific answers (only 9.6% of regiments have any text mention today; 83% are linkable from three sources [M]).

**arch-static-hybrid-07 — Time anchors, event linking and evidence tables (audit C4 deliverable)** · high · L · P2 · refs C4
WHAT: `anchors`/`events` tables; evidence classes; per-event candidate anchors for all 137 events with reviewed `event_key`; conflicts > 60 min queued. Depends: 04, 06; time module for the map-clock column. Acceptance: ≥ 3,000 anchors, 200-anchor precision ≥ 0.90, every event has ≥ 1 anchor or "no report time found". Moves: historical accuracy; "when" answers; C4.

**arch-static-hybrid-08 — Facts tables and authority model** · high · L · P1
WHAT: `tenures`, `stats` (`{v, auth, basis, conf}`), `rank`, `rollup`, `unknowns`, `routes`, `places`. HOW: derive from OOB + successions + casualty notes; implement `min-strength` superlative rule; flag `estimated` placeholders (88 of 103 batteries). Depends: DI-03/17 (or interim range wording). Acceptance: every numeric answer rebuildable from a row; fact@3 ≥ 90 (P2). Moves: fact@3 68 → ≥ 90, F05/F07/F11.

**arch-static-hybrid-09 — Human review queue tool and decision loop** · medium · M · P2
HOW: static `tools/review/` page + `queue.jsonl`/`decisions.jsonl`; scan deep links via `reader_index`; deterministic application at build. Acceptance: decisions survive re-chunking (keyed by content hash); 30-60 items/hour on a sample. Moves: link precision, owner workload.

**arch-static-hybrid-10 — Validator, determinism and CI** · high · M-L · P0-P2
HOW: JSON Schema + V01-V12 (§5.1), K001-style "every indexed field exists in the schema" rule, determinism test (clean rebuild → identical hashes), size budgets. Depends: 01. Acceptance: red on any rule; report archived per build. Moves: reliability; kills `e.title`-class drift.

**arch-static-hybrid-11 — Emit: shard writer, wire formats, manifest, budgets** · high · L · P1-P2
HOW: §4.7, §6.4; 128 index buckets, 32 entity-posting buckets, 16-passage text shards, impact8 postings, content-hash names; `keep_previous: 2`. Depends: 05, 06, 10. Acceptance: cold passage query ≤ 120 KB; total ≤ budget; manifest lists every hash. Moves: LCP/INP protection, payload.

**arch-static-hybrid-12 — `search-core.js`: normalise, link, fuzzy, intent, plan, gates (shared)** · high · L · P1
WHERE: `hx/app/search-core.js` used by `/historian`, `search.html` and (later) the in-app panel. HOW: port `proto.js` (`baseNorm`, `toks`, `dl`, `resolveQuery`, `INTENT_RULES`) with the fixes in §7 (number-anchored state expansion, DL rules, ancestor cue, scope table). Acceptance: `hist-current` H1 gates on the 175-query batteries (S@1 ≥ 88/80, canonical@1 ≥ 90, typo ≥ 85). Moves: canonical@1, typo, F01-F04, F07-F08.

**arch-static-hybrid-13 — Passage engine in the Worker** · high · M-L · P2
HOW: lazy bucket loader + LRU, varint/impact decode, entity-conditioned candidates, BM25 + time + phrase/proximity, RRF, MMR, filters. Acceptance: worker p95 ≤ 50 ms at 6× throttle; recall@5 ≥ 0.80. Moves: recall, latency.

**arch-static-hybrid-14 — Composer: answer types, extractive selection, invariants, balancing, refusals** · high · L · P1-P2
HOW: §8; templates A1-A14; quote-span validation; contested balance. Acceptance: I1-I8 lint passes on all cards; 0 forbidden strings; unsupported claims 0 in audit. Moves: faithfulness, defect rate 90 → 0, mean characters 2,989 → ≤ 600.

**arch-static-hybrid-15 — UI v2** · high · L · P1-P2
HOW: §9; fixes UX-01…UX-18; `role="log"`, labels, 16 px input, 44 px targets, contrast tokens, skeletons, drawer, filters, chips, deep links, error/retry. Acceptance: axe 0 serious; Lighthouse ≥ 95; CLS ≤ 0.05; manual screen-reader pass. Moves: UX/a11y/fit-and-finish grades, INP.

**arch-static-hybrid-16 — Hosting, headers, service worker, version skew, offline pack; spikes S-1..S-4** · high · M · P0-P2
HOW: §6; `/hx/` layout; `[[headers]]` (or generated `_headers`); SW rules ahead of `/data/`; prompt-based updates; quota LRU; spikes: S-1 `.bin` compression, S-2 5,000-file deploy, S-3 real-device latency, S-4 IA reader-index fix. Acceptance: second visit within a version fetches 0 bytes for `/hx/f/*`; spikes recorded. Moves: performance, reliability.

**arch-static-hybrid-17 — Evaluation harness, G150, gates, audits, latency protocol** · high · L · P0-P2
HOW: §10; `eval/gold.v1.jsonl`, `npm run eval` with baseline diff and exit code; Wilson LB; pinned list; Playwright latency runs; human-audit sheet. Acceptance: reproduces B0 numbers on the imported batteries (76.2 / 29.3 / 68.2 / 47.1 / 89.8); gates enforced in CI. Moves: every metric's credibility.

**arch-static-hybrid-18 — Governance: attribution, corrections/redactions, changelog, privacy/terms text** · high · M · P1-P3 · refs X5, G1
HOW: §11; `/sources.html`, `/data-notes.html`, `CHANGELOG.md`, `redactions[]`, SLA; coordinate with infra-netlify-36/37. Acceptance: a test correction goes from report to deploy in ≤ 1 day; tombstone permalink works. Moves: trust, docs.

**arch-static-hybrid-19 — Performance budgets, Lighthouse CI and INP script for `/historian`** · medium · S-M · P1
HOW: budgets in §12.1 as CI assertions; first-party web-vitals when infra-netlify-32 lands. Acceptance: perf ≥ 95, CLS ≤ 0.05, INP ≤ 200 ms in the 100-query script. Moves: CWV green for the Historian path.

**arch-static-hybrid-20 — Time-model integration** · high · M · P1-P2 · refs C3, C4
HOW: store `clock_min`; call the canonical module for `clockToTick`; hold legacy labels; evidence-table map-clock column appears when the module and re-timing ship; forbidden-string tests. Depends: app-time. Acceptance: no legacy clock in any answer; map link lands on the right tick for 10 anchors. Moves: C4.

**arch-static-hybrid-21 — Map deep-link integration (flagged)** · medium · S · P1 · refs H1 (map entry)
HOW: link objects carry `{unit, clock}`; `deepLinks` flag; `historian.html?q=&unit=&clock=` inbound contract. Depends: app-bugs-05, infra-netlify-26. Acceptance: flag on → chip opens the map at the tick/unit; flag off → chip absent. Moves: UX, function.

**arch-static-hybrid-22 — Contested-topic registry and perspective tags** · medium · M · P4
HOW: `registry/contested.yaml` (trigger entities/intents → required perspectives), tags on passages, balance rule, historian sign-off. Acceptance: category E questions return ≥ 2 sides or the disclosure line. Moves: fairness, trust.

**arch-static-hybrid-23 — Semantic-lite evaluation and gated on-device rerank experiment** · low · M-L · P5
HOW: §7.8 (a)-(d) with adoption rules. Acceptance: a written go/no-go with numbers. Moves: recall on paraphrase-heavy queries.

**arch-static-hybrid-24 — Roster tier (CWSS)** · medium · XL · P5 · refs H5
HOW: as `hist-sources-2-04` (crosswalk with `UUR`/`UUS` prefix rule; suffix logic; shards per unit + surname-prefix index); UI caveat text fixed. **Blocked until NPS confirms redistribution in writing** [S hist-sources-2-02]. Acceptance: known commanders found in their units; ≤ 4 shards per query; INP < 200 ms. Moves: Find-Ancestor honesty and depth.

**arch-static-hybrid-25 — Static, indexable regiment/place pages generated from the KB** · medium · M · P3+ · refs T1, E4
HOW: build emits `/units/<slug>.html` (canonical, JSON-LD, sources list) from entity + passage data; no new runtime cost. Acceptance: pages render without JS, pass Lighthouse SEO/a11y, sitemap includes them. Moves: search-engine referrals (T1), long-tail SEO.

**arch-static-hybrid-26 — Security hardening for corpus rendering** · medium · S · P1 · refs X3
HOW: `textContent`/DOM ranges only (remove `innerHTML` at `historian.html:172,178`); CSP for `/historian` (§6.2); Trusted Types report-only; link `rel`. Acceptance: category J tests inert; CSP reports empty. Moves: security grade.

**arch-static-hybrid-27 — Coexistence and migration** · medium · M · P1
HOW: ship the `hist-current` H0 hotfix first (½ d); new shell replaces the page at the same URL; `search.html` adopts `search-core` + T1 (finding 14/15 of `hist-current`); in-app panel stays out of scope until N1 is solved; delete the old inline script. Acceptance: no regression on the pinned list at each step. Moves: consistency (three search implementations → one).

---

## Appendix G. Decision record — alternatives considered
| Option | Verdict | Reason (evidence tag) |
|---|---|---|
| **Custom sharded index + shared `search-core` (chosen)** | adopt | entity linking, intents, tables, quote spans, time facets and refusal gates are the load-bearing parts [S hist-current §4.3]; postings + reader are ≈ 300 lines; measured sizes/latency [M] |
| Pagefind-style prebuilt index (Rust CLI, chunked index, WASM runtime) | use only as inspiration (chunked lazy index) | [U] recalled, not re-verified this session: page-oriented fragments and filters, no entity/intent/quote-span model, WASM adds `'wasm-unsafe-eval'` and a binary build dependency; typo tolerance not believed to be supported |
| MiniSearch / Orama / Lunr (monolithic in-memory index) | acceptable for the 957-record entity tier only | [U] library sizes not verified; a monolithic serialised index for 14 k passages would have to be loaded whole (our postings alone are 3.2 MB raw varint; JSON would be several times larger [E]) |
| SQLite-WASM with HTTP-range VFS | rejected for now | needs Range on the CDN [U], WASM + CSP change, larger dependency; revisit if the corpus passes ≈ 100 k passages |
| Server RAG with an LLM | out of scope (other designs) | costs per query, keys, privacy, abuse; can sit on the same KB later via `infra-netlify-31` |
| Ship the whole corpus in the JS bundle or one JSON | rejected | INP/LCP regressions; the data lake is 0.8 MB today and the Historian already fails at 15 eager files [S] |
| Pre-generated static answer pages for every entity | adopt as a **spin-off** (finding 25) | SEO and no runtime cost; complements, does not replace, search |
