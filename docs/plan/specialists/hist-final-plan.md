# hist-final-plan - Ask the Historian: FINAL expansion plan

Synthesis of Design A (static hybrid), Design B (on-device semantic), Design C (RAG function), both judge panels, the two source catalogs, `hist-current`, `data-integrity`, `hist-eval` and the 150-question golden set.
Mode: NO-BUILD, read-only. Nothing outside `plan-work/` was touched. Date: 2026-09-30. Site: gettysburginteractivemap.com (Netlify, solo owner).

Evidence tags used in every number below:
**[M]** measured by a sibling report on real data (report named) · **[V]** re-verified in this synthesis (I re-counted or re-read the file) · **[S]** stated by a sibling report, not re-checked here · **[C]** computed here from cited inputs (arithmetic shown or obvious) · **[E]** estimate/model, not measured · **[D]** decision made in this plan · **[U]** unverified.

What I read: `BRIEF.md`; `arch-static-hybrid.md` (all sections and Appendices B-G; the Appendix A measurement log only skimmed); `arch-semantic-local.md` (sections 0-2, 4, 8, 11-12, 14-17; sections 3, 5-7, 9-10 and 13 by heading only); `arch-rag-function.md` (sections 0-2, 4-5, 6.1, 9-12, 14-17; sections 3, 6.2-8 and 13 by heading only); both judge JSON blocks; `hist-sources-1.md` (exec summary, catalog table, coverage matrix, rights, phasing, open questions, verification) and `hist-sources-2.md` (exec summary, tier policy, catalog table, crosswalk, question matrix, compliance, size budgets, phasing, verification) plus the structure and per-source records of both `*.catalog.json` files (hs1: 39 entries; hs2: 46 entries, rights tiers, record counts, phases); `hist-current.md` (sections 0-5, 7, 8.6-10; quick wins in section 6 and the code plan in 8.1-8.5 by heading only); `data-integrity.md` (TL;DR, DI-27/28/29, versioning, provenance, sequencing); `hist-eval.md` (sections 0-9) and `hist-golden-set.json` (schema and counts re-computed here); `qa-ci.md` HC-01..HC-15; `perf-runtime.md` item 33; `infra-netlify.md` items 30-31; `seo-growth.md` item 23; `app-time.md`/`pages-B.md` time-model naming (grep); and the live deployed files `sw.js`, `netlify.toml`, `historian.html`, `privacy.html`.
Re-verified here [V]: `sw.js:17,24-31,61-70` (skipWaiting; activate deletes every cache not named `CACHE_NAME`; `/data/` is network-first and re-cached); `netlify.toml:8,19,28-30` (X-Frame-Options DENY sitewide; CSP is Report-Only; `/data/*` = `max-age=3600`); `historian.html:48,172` ("runs entirely in your browser", "search-and-synthesis tool", `innerHTML`); `privacy.html:41` ("collects no personal information ... including students"); raw word counts of the seven local OCR sources (3,192,212 words, table in section 2.1).
Not done: no browser, no network calls, no build, no model download, no API call.

---

## 0. Summary and decisions

### 0.1 Verdict

1. **Build Design A fully and make it the permanent core.** A records-only, zero-server retrieval system: entity + facts tier, sharded BM25 passage index, verbatim page-cited quotes, evidence tables for times, perspective chips, honest refusals. It is the only design whose numbers were measured on real text (14,391 passages / 3.19 M words from 7 sources, 1.54 MB brotli index, 0.057 ms p50 BM25 in Node) and whose failure mode is "stale", not "down". Cost per query: $0. New third-party requests: 0. Privacy page change: one sentence.
2. **Graft two cheap ideas from B and C at build time only.** (a) B's T0+ document expansion: LLM-suggested modern-phrasing queries stored in an index-only field flagged `generated: true`, never displayed, never quoted, never cited. (b) C's Batch-API link/tag proposals for the human review queue (about $17-34 for 26 k chunks): proposals only, nothing enters a fact table without human acceptance. Both are offline, disclosed on `/sources.html`, and cost about $31-61 in total [C from B and C prices, section 8.3].
3. **B (on-device semantic search) and C (LLM explanation) are optional, evidence-gated branches, default OFF.** A single decision gate G-X at the end of Phase 2 decides. Expected outcome (both judge panels agree): A + T0+ clears recall@5 >= 0.80 on the paraphrase slice and the architecture is frozen. If it does not: cheap levers first, then a small reranker experiment, then B's 4-day bake-off with a kill rule. If the residual is "the reader wants prose explanations", build a per-query opt-in "Explain these sources (AI, beta)" button (C-lite), never a global AI mode.
4. **The databases grow from 658 records / 11,088 indexed words / 0 page citations today to about 22-27 k passages / 4.4-5.4 M words with page citations by the end of Phase 4 (24-29 k / 5-6 M with the Phase 5 base)** [C: passages x ~200 words; roughly 400-540x the indexed words today], plus 957+ entity cards, 9 fact tables, a time-evidence table for all 137 chronology events, about 60 human-reviewed answers and static indexable unit pages. Index 2.4-3.1 MB brotli, text 11-14 MB brotli, first-paint bytes added to any page: 0.
5. **Effort:** core (P0-P4 + governance) **49-76 person-days**; with the Phase 5 base **57-90 days**; optional B0 spike +4 d; optional C-lite +15-29 d [E]. Reviewer time **59-95 hours** [C, section 8.4], about 3-4 h/week. At 15 h/week that is 26-40 calendar weeks for the core, not the "4-6 months" quoted in Design A (see 0.3 item 1).
6. **Do first (the "Stage 0" subset of Phase 0, about 3-5 days, unblocks everything):** create the git repo and move to Git/CLI deploys (N1); ship the `hist-current` H0 hotfix (0.5 d); patch `sw.js` so it stops deleting other caches; confirm the Netlify plan and credit balance; run spikes S-1 (`.bin` compression), S-2 (5,000-file deploy), S-4 (IA reader index); add `may_send_to_llm` to `sources.yaml`; import the 150 golden questions into CI.

### 0.2 The ten decisions the owner should make now (defaults in bold)

| # | Decision | Default | Needed by |
|---|---|---|---|
| 1 | Local Node 24 + Python 3.11 pipeline, derived outputs committed, Git/CLI deploys | **yes** (without it nothing is reproducible and 2-3 k files cannot be drag-and-dropped) | P0 |
| 2 | Permanent "records-only, not AI" positioning; any LLM tier is a separate, labelled, opt-in button | **yes** | P1 |
| 3 | Named historical reviewer (signs off contested registry, 100-answer audits, 19 unlocked golden items) | **name one before P4** (owner alone is a single point of failure) | P4 |
| 4 | Weekly review budget | **3-4 h/week** | P2 |
| 5 | Numbers policy: PD-derived authority (OR returns > Fox > Dyer), Busey & Martin as "see also" with edition and page recorded | **yes** | P2 |
| 6 | Netlify plan and credit balance (sizes every credit figure, and whether a hard-pause plan is acceptable for any function) | **check Team > Usage and billing this week** | P0 |
| 7 | Send the permission emails (NPS CWSS status, GNMP Research Center, ACHS/Musselman; drafts exist, unsent) | **yes, but only P5 rosters depend on it** | P5 |
| 8 | Optional unanswered-question counter | **never in Stage A** (needs privacy rewrite and a function) | - |
| 9 | Confederate depth: accept regimental depth from Clark (NC), CMH, SHSP and memoirs plus a visible coverage note, or fund more sources | **accept + coverage note** | P3 |
| 10 | Stage B / Stage C posture | **OFF; decide only at G-X with numbers** | end of P2 |

More decisions (keep name "Ask the Historian", scope of adjacent topics, sensitive-content policy, real Android device for spike S-3, model policy and caps if C-lite) are in section 10.2.

### 0.3 Where this plan corrects or reconciles the inputs

1. **Calendar arithmetic.** Design A states 54-85 person-days is "about 4-6 calendar months at about 15 h/week". That does not compute: 54-85 eight-hour days is 432-680 h, i.e. 29-45 weeks at 15 h/week [C]. Section 9.3 gives the recomputed table at 15, 30 and 40 h/week.
2. **C-lite effort.** Judge panel 2 estimates 19-29 d by subtracting C's R1 (7-9 d). But R1 contains the function, abuse layers, consent notice and UI plumbing that C-lite still needs; skipping R1 as a release does not remove that work. I use **15-29 d [E]** and require the R0 spike to replace it with a measurement.
3. **Service worker.** Designs A and B disagree (A: cache-first for `/hx/*` in the SW; B: SW bypass). Reconciled in 1.5: SW bypasses `/hx/` (HTTP `immutable` caching does the work; nothing script-writable to evict); an opt-in offline pack uses its own page-managed `hx-*` cache; the activate purge is limited to `gbg-*`. Design A's proposed `hx-v<schema>` cache would be wiped by the current purge on the next service-worker bump; Design B found this, and I verified it at `sw.js:28`.
4. **Two "150-question" sets.** `hist-eval` produced `hist-golden-set.json` (GQ-001..150, verified anchors, 100 dev / 50 locked, phases H1/H2/H3). Design A wrote its own "G150". They are merged (7.1): GQ is **Golden-Core**; A's category D/E/H seeds, B's 33-need pilot (x3 registers), C's ~40 seeds and the source reports' 25 + 13 questions become **Golden-Passage (GP-###)**, which is the set the retrieval gates need because GQ has no passage-gold items.
5. **Source-id clash.** `hist-sources-1` and `hist-sources-2` both number their catalogs SRC-01... (SRC-01 is Official Records Pt 1 in one and NPS Data Store in the other). The registry uses **slugs** (`or27-1`, `nyfr-1`, ...) with `xref` fields to both catalog ids.
6. **C0 "pre-generated answers".** Design C proposes 300-400 Batch-generated public answers. `seo-growth-23` (line 369 of `seo-growth.md`) requires human-written, human-reviewed Q&A and forbids bulk LLM generation because it would poison the eval. Resolved: the "Reviewed answers" library is about 60 human-authored answers (shared with seo-growth-23, doubling as gold items); LLM output may only be a drafting aid for the reviewer and never publishes.
7. **Anchor-count target.** Design A accepts "at least 3,000 anchors"; the `hist-sources-1` verifier says a realistic July 1-3 anchor pool is "a few thousand at most". Gate set to **floor 1,500 anchors, target 3,000, plus 137/137 events covered or marked "no report time found"** [D].
8. **HMDB tier.** `hist-sources-2` verification: HMDB is "B-NC, attribution", not pure link-out. Kept link-out by default; nothing is ingested without a written OK.
9. **Reranker threshold.** A's optional reranker gate is +8 points recall@5; B's whole-tier kill rule is +10. Both are kept, at different branches (1.6, X.2 and X.3).
10. **Deep links.** `hist-current` planned `historian.html?q=`; B showed a query string reaches Netlify analytics paths and same-origin referrers. Final contract uses the URL **fragment** (`#q=`), so the question text never leaves the device.
11. **Live region.** Design A and `hist-current` UX-05 specify `role="log" aria-live="polite"` on the transcript; Design C notes that streaming a live region is hostile to screen readers. Because a polite log reads every added card in full, the final spec uses a non-live "Conversation" region plus a separate short `role="status"` announcer (6.2). Verify with NVDA, VoiceOver and TalkBack at P1 exit.

---

## 1. Target architecture (staged A -> A+ -> optional B -> optional C)

### 1.1 Stage ladder

| Stage | What it adds | Who gets it | Extra bytes on first paint | Runtime cost | Built in | Gate to build |
|---|---|---|---|---|---|---|
| **A0** | Entity + facts tier over the site's own data (957+ cards, 8 fact tables; the 9th, `anchors`, fills in P2; lexicon), `search-core.js`, composers, answer-first UI v2, honest copy | everyone | 0 (T1 loads after first paint) | $0 | P1 | none (fixes audit H8 on today's data) |
| **A1** | Passage tier: 128-bucket BM25 impact index + entity postings + 16-passage text shards, page-cited quotes, time-evidence tables, perspective chips, filters | everyone | 0 | $0 | P2-P4 | G-A1 |
| **A+** | Build-time semantics: T0+ expansion field, concept lexicon, PMI neighbours, LLM-assisted link proposals into the review queue | everyone (silently) | +5-10 % of index [E] | $0 | P2 | none; adopt each only at +3 points recall@5 dev, no regression |
| **B** (optional) | B-lite reranker (<= 8 MB), then B0 bake-off, then "Deep search" (int8 arctic-embed-xs in ORT-Web WASM, RRF fusion, about 40 MB opt-in) | opt-in users | 0 (nothing loads until opt-in) | $0 dollars; bandwidth credits | P5 branch | G-X.2, then G-B0 kill rule |
| **C** (optional) | Per-query button "Explain these sources in plain language (AI, beta)": Netlify function, Claude with native citations, 7 grounding layers, budgets, kill switch, S0 fallback | opt-in per click | 0 | about $0.012-0.0235 per AI answer [S C] | P5 branch | G-X.3, then C's R0 spike numbers |

The knowledge base, schema, citation object, passage ids, eval set and card renderer are **identical across stages**, so B or C can be added later without re-ingesting anything. That property, not any single feature, is what makes the staging safe.

### 1.2 System diagram

```
BUILD (owner machine / CI; Node 24 + Python 3.11)                      RUNTIME (visitor browser; Netlify static files only)
------------------------------------------------------------------     ---------------------------------------------------------------
sources.yaml (tier, licence, may_send_to_llm) --+                     /historian.html   shell only, no data (<= 45 KB br incl. module)
raw/ (git-ignored, sha256 lock)                 |                       |
 fetch > normalize(OCR) > segment > classify >  |  emit                 +- main thread: UI, a11y, URL hash state (no search work)
 chunk > link(units,people,places) > anchors >  +--> dist/hx/            +- module Worker: search-core + composers
 dedupe > validate > review queue -> decisions  |     manifest.json         T1 after first paint (~213 KB): entity.<h>.json, facts.<h>.json,
 facts (tables + provenance) -------------------+     f/entity.* f/facts.*     lexicon.<h>.bin, manifest.json
 LLM assist (Batch API, Tier A only, proposals) |     f/lexicon.*            T2 per query (lazy, 30-120 KB): ix/<bucket>.<h>.bin,
 gold sets + eval gates (CI) -------------------+     f/ix/* f/en/* f/tx/*      en/<bucket>.<h>.bin, tx/<n>.<h>.json
                                                      app/*.js|css          T3 opt-in rosters (P5, blocked), T4 media
                                                      f/rv.* (reviewed)    Links out: map (#unit, clock) . regiment.html . IA scan page
                                                                            [optional] /api/ask (Stage C only) . /hx/models (Stage B only)
```

### 1.3 Tiers and sizes

| Tier | Contents | Loaded | Size (measured / target) | Answers |
|---|---|---|---|---|
| T0 shell | HTML + inline critical CSS + module + worker code | page load | <= 45 KB br [E] | nothing; input enabled at once, first question queued |
| T1 | 957+ entity cards (units at every echelon, 698 commanders, places, roads, structures, monuments, vignettes, 137 events, successions, site pages), alias/surname maps, fact tables, lexicon | after first paint, in the Worker | entity 75.9 KB br [M A M13]; lexicon 34 KB [M]; facts about 100 KB [E]; **target <= 250 KB** | lookups, who/when/where/how many, comparisons, routing, refusals with no passage shard |
| T2 | inverted index (128 buckets, 12 KB avg, 20 KB max [M]), entity->passage postings (32 buckets), text shards (16 passages, about 7.7 KB br each incl. metadata [E]) | lazily per query | 14.4 k passages: 1.54 MB index + 5.3 MB text (text only) [M]; **24-29 k: 2.6-3.1 MB + 11.5-14 MB** [C] | narrative, testimony, "what did X report", evidence tables, contested questions |
| T3 | CWSS roster shards (467 units) + surname-prefix index | on demand | 6-12 MB [S hist-sources-2] | ancestor lookup (blocked until NPS confirms in writing) |
| T4 | LoC photo thumbnails, maps | on demand | <= 150 KB each [S] | illustrations on place/unit cards |

### 1.4 Hosting, headers, service worker, CSP (final)

- **URL prefix `/hx/`** (outside `/data/`): `/hx/manifest.json`, `/hx/f/<kind>.<hash>.<ext>` (immutable data), `/hx/app/<name>.<hash>.js|css` (immutable code). Do not use `/data/`: it is `max-age=3600` (`netlify.toml:28-30`) and the current SW treats it network-first and caches every response forever (`sw.js:61-70`).
- **Headers:** `/hx/f/*` and `/hx/app/*`: `Cache-Control: public, max-age=31536000, immutable`. `/hx/manifest.json` matches no rule so it gets Netlify's default must-revalidate (avoids overlapping-rule merge semantics the infra review could not confirm; confirm with `curl -I` in spike S-1).
- **CSP for `/historian` (Report-Only first):** `default-src 'self'; script-src 'self' <sha256 of any leftover inline>; style-src 'self'; connect-src 'self'; worker-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. Stage B adds `'wasm-unsafe-eval'` on this one route class only; Stage C adds nothing (same-origin function). The Historian makes no third-party requests; IA/Hathi/NPS/Fold3 links are user-initiated navigations with `rel="noopener noreferrer"`.
- **Service worker patch (ships in P0, before any `/hx` cache can exist):**
  ```js
  // activate: never touch caches this SW does not own
  keys.filter(k => k.startsWith('gbg-') && k !== CACHE_NAME).map(k => caches.delete(k))
  // fetch: first statement after the origin check
  if (url.pathname.startsWith('/hx/')) return;      // HTTP immutable cache serves these; no SW hop, no double storage
  // and remove skipWaiting()/clients.claim()/location.reload() (audit C6): a new SW waits; page shows "Updated sources available - apply"
  ```
  The opt-in offline pack (P5) writes to its own `hx-v<schema>` Cache Storage from the page, resumable, disabled under `saveData`; the manifest is fetched by the page network-first with a 2 s timeout. Safari's 7-day cap deletes script-writable storage, which includes Cache Storage and service-worker registrations [S B 2.6]; the HTTP cache is not script-writable, so that rule does not cover it, though the browser may still evict it [inference]. That is one more reason Stage A relies on HTTP caching.
- **Deploy discipline:** Git/CLI deploys (N1; needed above about 2,000 files). Each production deploy is 15 credits on credit plans [S infra-netlify-30, plan unverified]; 20 deploys equal the whole 300-credit Free allowance, so KB releases are **batched weekly** (corrections that ship "in a day" are the exception, not the cadence). Spikes: S-1 (are `.bin` files brotli-compressed? fallback gzip + `DecompressionStream`, about +17-23 % bytes [S A]), S-2 (a 5,000-file synthetic deploy; fallback 256-passage packs with HTTP Range), S-3 (real mid-tier Android latency), S-4 (IA reader index: `n` = leaf - 3, then - 5 after leaf 887 [S hist-sources-1 verification 14]).

### 1.5 Integration conflicts settled before any code

| Topic | A | B | C | **Final [D]** |
|---|---|---|---|---|
| URL prefix | `/hx/` | `/historian/` | `/data/historian/` | **`/hx/`** (never under `/data/`) |
| SW handling | cache-first `/hx/*` | bypass | n/a | **bypass in SW; page-managed `hx-*` cache only for the offline pack; purge limited to `gbg-*`** |
| Passage ids | `<doc>#<hash8>` + append-only numeric map | chunk ids from A | chunk ids + block ranges | **A's content-hash ids + `id_map.json`; A's sentence boundaries `sb` are C's citable blocks** |
| Deep links | `?q=` | `#q=` | `?q=`, `?a=` | **`#q=..&unit=..&clock=..`; answer permalink `#a=<kb>:<hash>`** |
| Copy | "records only, not AI" | no "AI" wording | "AI-assisted" | **two explicit modes: Records (default, on-device) and, only if C is built, "AI explanation (beta)" per click** |
| Source ids | SRC-nn | SRC-nn | SRC-nn | **slugs** with `xref` to both catalogs |
| Golden sets | G150 | golden.v2 | golden-150 | **Golden-Core (GQ, 150) + Golden-Passage (GP, >= 100 new)** |
| Time API names | `clockToTick` | `clockToTick` | none | **one adapter file `hx/app/time-adapter.js`** wrapping whichever names `app-time` and `pages-B` finally export (their prototypes differ: `clockToTick` vs `tickForClock`) |
| Entity ids | canonical OOB ids | same | same | **A's namespace** (`U-20ME`, `BDE:`, `DIV:`, `CORPS:`, `ARMY:`, `P:`, `LOC-###`, `MON:###`, `EV:`, `VIG:`) |
| LLM permission | proposals only | expansion field | Batch tagging | **`may_send_to_llm` per source; Tier B and A-pending = false; outputs are proposals or index-only** |

### 1.6 Decision gates for the optional stages

| Gate | When | Test | Pass / action |
|---|---|---|---|
| **G-A1** | end P1 | Golden-Core H1+H2 gates and 175-query batteries (7.3) | pass -> P2; a miss is re-baselined explicitly in the eval report, never silently |
| **G-A2** | end P2 | Golden-Passage held-out slice | passage recall@5 >= 0.80, citation precision >= 0.90, cold passage query <= 120 KB, 5 sampled citations per source open the right scan page |
| **G-X** (decision) | same day as G-A2 | classify every residual failure: (i) retrieval/paraphrase, (ii) synthesis, (iii) linking/segmentation/alias (fix in A) | see X.1-X.3 |
| X.1 | | paraphrase-slice recall@5 >= 0.80 with T0+ on | **stop; architecture frozen (expected outcome; full success against the goal)** |
| X.2 | | paraphrase-slice recall@5 < 0.80 | in order: alias/lexicon additions; T0+ tuning; concept lexicon / PMI / pseudo-relevance feedback (adopt each at +3 points dev, no regression); A's reranker experiment (model <= 8 MB, +8 points recall@5, p95 <= 150 ms on a Moto-G-class phone, INP <= 200 ms, no CSP downgrade); only then **B0** (4 d): hybrid minus BM25 >= +10 points recall@5 on >= 60 paraphrase items, 95 % paired-bootstrap CI excludes 0, else stop and ship A + T0+. Do not build B5/B6 (cross-encoder, fine-tune) unless B0 clearly passes |
| X.3 | | residual dominated by "why/explain/contested prose" or owner asks for prose | **C-lite** only if all hold: G-A2 passed; Netlify plan confirmed, and its credit hard limit (which pauses a whole Free-plan site) is not exposed to a function flood (inference, section 10.3); privacy page, Terms and banner rewritten first (audit X5); caps $25/month and $2/day with the Anthropic workspace cap at $30; C's 1-2 d R0 spike replaced the estimates with measurements; ships opt-in per click with S0 fallback and kill switch |
| G-C-GA | before C-lite ships | 50 held-out + 100 dev questions, 3 runs each | claim-level supported >= 97 %, citation precision >= 95 %, unsupported numerals/dates/names = 0 in CI, adversarial 100 %, over-refusal <= 8 %, first visible checked claim p95 <= 5.5 s [S C 12.3] |
| Both X.2 and X.3 | | | if C-lite is live, dense vectors (if any) stay function-side (about 15 MB, no client download); do not also ship B's phone download |

### 1.7 Non-goals

No runtime LLM by default; no Tier C source is fetched, stored, embedded or sent to a model (American Battlefield Trust, Ancestry/Fold3/Find a Grave, FamilySearch, ACHS, HMDB bulk, Stone Sentinels, NYSMM, NHGIS, Ladd's Bachelder Papers, Rumsey); no generative public pages; no query logging; no rosters before NPS replies in writing; no in-app "Search Units" integration until the app source problem (N1) is solved; no dense model on phones by default.

---

## 2. Prioritised source-expansion roadmap

### 2.1 Corpus growth ladder (what "greatly expanded" means in numbers)

Basis: measured per-source counts from Design A [M]: OR27-1 2,712, OR27-2 2,654, OR27-3 2,040, NYFR-1 966, Fox 1,152, B&L-3 2,438, JCCW-1 2,429 passages = 14,391 passages from 21.6 MB raw OCR (about 1 passage per 1.5 KB raw, 190-220 words each). Raw words re-counted here [V]: or27_1 584,253; or27_2 573,004; or27_3 489,617; nyfr1 209,257; fox 335,051; bl3 486,884; jccw1 514,146 = **3,192,212 words**. Index at 107 B/passage and text at about 480 B/passage incl. metadata [C from A M3/M4/6.3].

| Milestone | Cumulative passages | Words (about) | Index (br) | Text (br) | Files | Notes |
|---|---|---|---|---|---|---|
| Today | 0 (658 records) | 11,088 indexed (15,400 shown prose) [S hist-current] | - | - | 15 JSON | 9.6 % of regiments (45/467) have any text mention beyond the one-liner [S] |
| After P1 | 0 + 957 entity cards + about 1,060 site blocks | 24.7 k body words in cards [M A M13] | (T1 only) | (T1 only) | about 6 | 45,096 narrative words exist in the site data lake [S data-integrity]; T1 <= 250 KB |
| After P2 (Official Records) | 7.4 k | 1.65 M (raw 1,646,874 [V]) | 0.79 MB | 3.6 MB | about 630 | 589 numbered reports, about 296 regiment/battery reports [S] |
| After P3 (NY 3.1 k, PA 4.0 k, Fox 1.15 k, ME/NJ/MI/MN 1.5-2.5 k) | about 17-18 k [E] | about 3.5 M | 1.9 MB | 8.5 MB | about 1.3 k | 75 NY + 74 PA units get narratives |
| After P4 (voices 4.2-7.0 k + part of W4b 1.5-2.5 k) | about 22-27 k [E] | about 4.4-5.4 M | 2.4-2.9 MB | 10.6-13 MB | about 1.6-1.9 k | B&L, JCCW, SHSP shortlist, memoirs, regiment histories |
| With the P5 base (W5 about 1 k) | 24-29 k [E] | 5-6 M | 2.6-3.1 MB | 11.5-14 MB | 1.7-2.1 k | inside A's own 25 k / 40 k projections (2.7 / 4.3 MB index; 12 / 19 MB text) [S A 6.7] |

Coverage KPI: naive alias linking touches 28.3 % of OR/NY passages but was wrong 7 of 22 times; the grammar linker reaches **389 of 467 site regiments (83 %) at least once from just OR27-1/2 + NYFR-1** at conf >= B versus 45 today [M A M12]. Gate: >= 90 % of OOB regiments with >= 1 reviewed passage by P4 (qa-ci HC-04), and >= 75 % of Confederate units [D, owner may adjust; only about 88 Confederate regiment/battery-level OR reports exist for 241 Confederate units [S hist-sources-1], so this is the honest weak side].

### 2.2 Waves (priority order; every wave is stoppable and ships value alone)

Effort in person-days on top of the shared pipeline [S hist-sources-1 8, B 15 B4: 1-2 d QA per source family once the pipeline exists]. Review hours are queue items at about 40/h. "hs1/hs2" = catalog ids in `hist-sources-1/2`.

| Wave | Slug (catalog ids) | Rights tier and basis | Attribution / obligations | Raw size -> passages / words | Structured yield | Effort and review | Blockers / notes |
|---|---|---|---|---|---|---|---|
| **W0** (P1) | `site-records` | owner-authored; numbers derived from Busey & Martin 1994, Pfanz etc. are **facts-only** rows [S data-integrity 10] | credit line "This site's records"; `auth/basis/edition/page` on every number | 957 entity cards; about 1,060 blocks (570 vignette + 489 chronology, ticks excluded) [S C 4.2] | 8 fact tables (tenures, stats, rank, rollup, events, places, unknowns, routes); 42 successions; 137 events | inside P1 | dev notes (66 chronology `flag`, 31 `flag_notes`) must never index: field whitelist + V05 |
| **W1a** (P2) | `or27-1` (hs1 SRC-01; hs2 SRC-19); IA `warofrebellion271unit` | Tier A: US Government work 1889, hs1 rights basis 17 U.S.C. 105; HathiTrust rightsCode `pd` [S] | "Official Records, Ser. I, vol. 27, pt. 1 (US War Department, 1889), via Internet Archive", printed page + scan link; original imprint only (never `warrebellionaco00cowlgoog`, the 1971 reprint) | 3.97 MB / 584 k words [V] -> 2,712 passages [M A] | 376 of 378 ToC report numbers recovered; about 208 Union regiment/battery reports; 2,258 clock expressions | L 3-5 d segmentation + linker + QA; 4-8 h review | whitespace-tolerant regex only after `normalize_ocr()`; page map via `scandata.xml` not raw `leafNum` |
| **W1b** (P2) | `or27-2` (hs1 SRC-02); `warofrebellion272unit` | Tier A | as W1a | 3.88 MB / 573 k words -> 2,654 | Nos. 379-589 (211 reports); about 88 Confederate regiment/battery reports (an independent classifier counted 116) | L 2-4 d; 3-5 h | Guild casualty return (pp. about 338-345) is column-scrambled: needs `djvu.xml` word boxes (W2c) |
| **W1c** (P2) | `or27-3` (hs1 SRC-06); `warofrebellion273unit` | Tier A | as W1a; dispatches marked contemporaneous | 3.41 MB / 490 k words -> 2,040 | 118 dispatch headers (`July 2, 1863-3.40 a. m.`); about 1,374 dated items but only about 100 dated July 1-3; 2,201 clock times | L 3-4 d (needs a dispatch-header segmenter, the "No. NN. Report of" one finds none) [S hs2 verification MISSED-3]; 3-5 h | best evidence for audit C4; treat as testimony statistics, not ground truth |
| **W2a** (P3) | `nyfr-1..3` (hs1 SRC-03); labelled ids `finalreportonbat0001dani`, `finalreportonbat0003unse` | Tier A: NY state publication 1900-02 | credit "Final Report on the Battlefield of Gettysburg (NY Monuments Commission)", page + scan | vol 1 1.44 MB / 209 k words -> 966 [M A]; vols 2-3 about 1.5-1.7 MB -> about 2.1 k [E]; total about 3.1 k | 68 NY infantry regiments/battalions + 19 batteries verified in text; 75 NY site units; unit material spread over **all three volumes** | M 2-3 d; 3-5 h | do not use ambiguous `cu3192409292497x` ids |
| **W2b** (P3) | `pag-1914-1..3` (hs1 SRC-04) | Tier A: PA state publication 1893/1914 (1914 = superset, canonical) | as W2a | about 2 MB per volume -> about 4.0 k [E] | 74 PA site units; dedication addresses | M 2-3 d; 3-5 h | OCR proxy 0.935-0.949 (lower than OR) |
| **W2c** (P3) | `fox1889` (hs1 SRC-05; hs2 SRC-20); `regimentallosses00infoxw` | Tier A (1889) | credit + page; numbers stored as facts with `auth/edition/page` | 2.26 MB / 335 k words -> 1,152 passages before table routing [M A]; tables -> `casualty_sources` rows | about 300 fighting-regiment loss rows [E]; Union only | L 3-4 d (table reconstruction) ; 3-5 h | Fox OCR digit errors (`(5,024`, `30S`, `4,2 lo`): numbers never auto-edited, sums checked (K+W+M=total); **Confederate strength has no PD regimental source** |
| **W2d** (P3) | `guild-anv` (OR27-2 Addenda) | Tier A | as W1b | inside W1b | Confederate regimental K/W/M | included above | needs word coordinates; its own note says regimental sums do not tally with brigade totals |
| **W3a** (P4) | `bl3` (hs1 SRC-07) | Tier A: 1887-88 | mandatory perspective chips; retrospective flag + `lag_days` | 3.27 MB / 487 k words whole volume -> 2,438; Gettysburg section pp. about 244-440 (about 25-30 articles) -> about 600-1,000 [E] | Longstreet, Mosby, Hunt, Halstead, Gibbon, Law, Kershaw, ... | M 1-2 d; 3-4 h | scope tag `campaign`; non-Gettysburg articles `context` (default off) |
| **W3b** (P4) | `jccw-1` (hs1 SRC-13) | Tier A: US Government 1865 | partisan-committee bias tag | 3.4 MB / 514 k words whole -> 2,429; Gettysburg testimony about 600-850 [E] | 33 witness headings (Meade, Sickles, Warren, Butterfield, Hancock, ...) | M 1-2 d; 3-4 h | Q/A pairs stay in one passage |
| **W3c** (P4) | `shsp-shortlist` (hs1 SRC-08) | Tier A: 1876-1920 | `lost_cause` / `self_justifying` bias tags; historian sign-off | 49.0 MB whole (2,949 "Gettysburg" hits, OCR proxy 0.93); shortlist about 150 articles [E] -> about 2.0-3.3 k [E] | Early, Longstreet controversy, unit accounts | L 3-5 d incl. shortlist; 5-8 h | never ingest whole volumes; Confederate Veteran (OCR 0.835, `date` field unreliable) deferred |
| **W3d** (P4) | `memoirs` (Haskell PG #33121, Oates, Polley, Curtis, Holcombe) (hs1 SRC-24, SRC-31, SRC-16, SRC-17) | Tier A (pre-1931); Gutenberg PD | as W3a | Haskell 249 KB, Oates 2.3 MB, Polley 0.9 MB, Curtis about 1.2 MB, Holcombe about 1 MB -> about 1.0-1.8 k [E] | first-person narratives | S-M 2 d; 3-4 h | retrospective flag, side and bias tags |
| **W4a** (P3) | `me-1898`, `nj-1891`, `mi-1889`+Curtis, `mn-holcombe` (hs1 SRC-14-17) | Tier A | as W2a | Maine 1.6 MB, NJ 0.4 + 0.6 MB, MI 0.35 + 1.2 MB, MN 4.2 + 2.3 + 1.0 MB (only 1st Minnesota July 2 needed) -> about 1.5-2.5 k [E] | 10 ME, 13 NJ, 11 MI, 1 MN site units | S each: 0.5-1 d (total 2-4 d); 2-4 h | 20th Maine triangulation (Gerrish, Maine at Gettysburg) |
| **W4b** (P4 tail, stoppable) | `clark-nc`, `bates`, `phisterer`, `dyer`, `small-states`, `cmh`, `itinerary` (hs1 SRC-11, 12, 18, 19, 20, 25, 26) | Tier A (originals only: Dyer 1908, not the 1959 reprint) | as W2a | Clark about 2 MB/vol (33 NC units), Bates 6.6-9.1 MB/vol (74 PA sketches), Phisterer 3.6-3.9 MB/vol, Dyer 14.7 MB (about 329 Union summaries) -> about 1.5-2.5 k passages + service-summary facts [E] | about 500 unit sections total [S hs1 8] | 1-2 d per family; 2-3 h each | gaps: WI (`battleofgettysbu0000unse_f9x3`, 1910), MA (`dedicationofmonu00bowe`), DE, NH, WV |
| **W5** (P5 base) | `civilians`, `press`, `guides`, `nps-pages`, `monument-lists`, `cemetery-1865` (hs1 SRC-22, 23, 27, 28, 29, 33; hs2 SRC-05, 06, 08, 23, 25) | Tier A per item; NPS contractor CLRs **A-pending** until author affiliation and credit page checked [S hs2 MISSED-5] | credits per agency; Chronicling America: title/date/page URL | Pierce/Buehler/Hoke/Jacobs/Bates; Chronicling America 1,425 pages July 4-31 [S hs1] or 1,560 July 1-31 [S hs2] -> curate 50-150 articles; Compiler needs re-OCR (XL 6-10 d, proxy 0.43-0.48, 51 issues in 1863) -> deferred | "what the press reported"; civilian voice (5 books + 1 NPS article; Broadhead's diary not found on IA); 100-200 tour stops/places [E]; commander cross-check against the NPS Army of the Potomac / ANV order-of-battle pages (about 565-617 unit lines; parse the DOM, not text lines) [S hs2] | M 2-3 d each cluster; 4-8 h | **weather table: the cited Jacobs primary contains no readings** [S hs2 verification 12]; source hunt first, else answer "unknown" |
| **W6** (P5, gated) | `wikipedia` (B; 6 key articles about 0.5 MB + about 130 biographies [E]), `acw-battle-data` (B, CC BY 4.0; the grant is the compiler's, upstream slices vary), `osm-monuments` (B, ODbL), `commons` (per file), `smithsonian` (CC0), `loc-photos`, `cwss-rosters` (A-pending), `damage-claims` (permission), HMDB (link-out) | see 2.3 | see 2.3 | Wikipedia excerpts small; OSM 867 elements vs the site's 512 (177 farther than 60 m); LoC 175 photographic records (75 dated July 1863), curate 40-75; CWSS 6.3 M cards -> 467 shards, 6-12 MB | roster lookup; monument validation; photos | M-XL; **rosters blocked until NPS confirms redistribution in writing** | CWSS mirror is a third-party 2015 snapshot; crosswalk auto-matches 87.6 % with the corrected rule (US->UR, suffix codes), not 99 % [S hs2 verification 03] |

### 2.3 Licensing and attribution obligations (enforced in CI, shown in the UI)

| Class | Sources | Rule in the build | Rule in the UI |
|---|---|---|---|
| Tier A public domain (pre-1931 works, US Government works) | OR, state books, Fox, Dyer, B&L, SHSP, JCCW, Bates, Phisterer, Clark, memoirs, NPS federal works | curated identifier allow-list + parsed volume year + publisher + reprint flag + reviewer; `possible-copyright-status = None` is "unknown", not "ok" | credit line per source family; `/sources.html` generated from `sources.yaml` (title, licence, IA id, retrieval date, edition, reviewer) |
| LoC | photos, maps, Chronicling America | photos only if `rights_advisory` begins "No known restrictions" and notes carry no "Copyright" line (3 of 185 do); statement stored verbatim | "Library of Congress, Prints and Photographs Division" + LC-DIG id; maps "Geography and Map Division"; newspapers title/date/page |
| Tier B CC BY-SA 4.0 (Wikipedia) | excerpts | separate file, `may_send_to_llm=false`, never blended into a composed sentence (an adaptation would carry share-alike) | quote-only block: `Source: Wikipedia, "<title>", revision <revid>, CC BY-SA 4.0. Excerpted/condensed.` |
| Tier B ODbL 1.0 (OSM) | monument candidates | separate `monuments_osm.geojson` + `LICENSE-ODbL.txt`; take corrected coordinates from PD sources (lowest-risk option 1) | map attribution entry whenever the layer is visible |
| CC BY 4.0 / MIT | ACW Battle Data v14; WarOfTheRebellion corpus (UT Austin, MIT) | credit in `/sources.html` and `THIRD_PARTY_LICENSES.md` | credit line |
| A-pending | CWSS bulk mirror, prisoners subset, contractor NPS reports | no shard published before a written reply is filed in `legal/` | n/a until cleared |
| Tier C link-out | ABT (ToS forbids scraping and AI use), Ancestry/Fold3/Find a Grave, FamilySearch, ACHS, HMDB bulk, Stone Sentinels, NYSMM, NHGIS, Ladd's Bachelder Papers, Rumsey (non-commercial), Adams Sentinel, Busey & Martin text | hosts grep-banned in `fetch/`; CI fails on a Tier C id | user-initiated outbound links only |
| Paid permissions | Bachelder Papers at NHHS: $25 (digitised) / $50 (not) per image, about $250-500 for 10 requests [S hs1 10] | optional, owner decision | credit as required |

**Retro-audit (P0):** 18 monument coordinates already shipped derive from Tier B/C sources: Stone Sentinels 8 (5 in the bundle at `bundle.pretty.js:104475, 104932, 106138, 108468, 110569`, 3 in `data/monuments.json`), HMDB 4, Wikipedia 6 (`data/monuments.json`) [S hs2 verification MISSED-1]. List them as `legacy` rows in `sources.yaml`, run the tier gate over `data/*.json` and the extracted 512-monument array, and replace or credit them.

### 2.4 What the owner gets, by wave, in plain terms

- After **P1**: the current Historian actually works on the site's own data (chronology no longer `undefined`; brigades, batteries, successions, army totals answerable; declines that are correct; no raw ids).
- After **W1 (P2)**: answers that quote the 1863 reports with page numbers and a link to the scan; time questions answered with a table of what each report says (the audit C4 deliverable).
- After **W2 + W4a (P3)**: every New York and Pennsylvania unit (149 of 570, 26 %) gets a narrative and dedication address; casualty numbers get a public-domain authority; static, indexable unit pages (audit T1).
- After **W3 (P4)**: participant and testimony voices with side/genre/lag chips, contested topics shown with all indexed sides, a reviewed-answer library.
- **Later, gated:** rosters, civilians and press, photos, Wikipedia excerpts, optional AI explanations.

---

## 3. Unified data schema

One schema family serves all three designs. It merges A's passage/entity/fact model with C's block-level citation and `may_send_to_llm`, B's `expansion`/sensitivity/controversy flags, `hist-sources-2`'s evidence-record schema and `data-integrity` DI-23/DI-27 provenance. Every published record carries `source_id`, `tier`, `lic`, `cite` and a schema `ver`; CI fails otherwise.

### 3.1 Identifier rules

- **Entity ids:** canonical OOB ids after the crosswalk (`U-20ME`, `C-15AL`, brigade `BDE:U-I-1-1`, division `DIV:C-I-3`, corps `CORPS:U-I`, army `ARMY:U`); new namespaces `P:<slug>` (person), `LOC-###` / `ROAD-#` / `STR-#` / `TF-#` (terrain), `MON:###` (monument), `EV:<day>T<tick>` (legacy chronology id) and `EV2:<slug>` (KB events), `VIG:V-###`, `SITE:<route>`, `TOPIC:<slug>` (concept lexicon). Ids are never reused; a rename leaves `alias_for` for two major KB versions. The alias row `U-14BK` collapses into `U-84NY` (and is removed from `union_oob_brigades.json` `regiment_ids`, where it double-counts) [S hs1 verification 02, hs2 MISSED-4].
- **Source ids:** slugs (`or27-1`), immutable.
- **Document ids:** `<source>:<locator>` (`or27-1:0196` = report No. 196; `or27-3:D0702-0340` = dispatch July 2, 3.40 a.m.).
- **Passage ids:** `<doc_id>#<hash8 of NFC text>`; stable across rebuilds when text is unchanged; `passage_alias.json` maps old to new when text is corrected. **Numeric passage numbers** (postings and shard keys: shard = `floor(num/16)`) come from an append-only `id_map.json`: never reused, tombstones for removals, so a corrected passage re-uploads its own shard and the index buckets holding its terms, not everything after it.
- **KB version:** semver. MAJOR = id/schema break (two-major alias support); MINOR = new sources/fields; PATCH = corrections. Old content-hashed shards of the previous two versions stay in the deploy so mid-session clients keep working; rollback = redeploy the previous manifest.

### 3.2 `Source` (registry, `sources.yaml`)

```jsonc
{ "id": "or27-1", "xref": {"hs1": "SRC-01", "hs2": "SRC-19"},
  "title": "Official Records ... Ser. I, vol. 27, pt. 1", "short": "O.R. I/27/1",
  "tier": "A",                                   // A public domain | B attribution/share-alike | C link-out | A-pending
  "license": {"id": "PD-US-Gov-1889", "statement_text": "...", "statement_url": "https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077699761.json",
              "verified_at": "2026-09-30", "reviewer": "ML"},
  "imprint": {"year": 1889, "publisher": "GPO", "reprint": false, "ia_id": "warofrebellion271unit", "scan_org": "UIUC"},
  "author_affiliation": null,                    // required for NPS documents: employee vs contractor (contractor CLRs are A-pending)
  "attribution": null,                           // must be non-null for tier B
  "may_index": true, "may_redistribute": true,
  "may_send_to_llm": true,                       // false for tier B, A-pending, C; CI-enforced
  "quote_max_words": null, "genre": "official_report", "perspective_default": {"retro": false},
  "scope_default": "core",                       // core | campaign | context; retrieval default = core + campaign
  "ocr": {"engine": "ABBYY FineReader 11", "proxy": 0.984, "gate": "accept"},
  "citation_template": "O.R., Ser. I, vol. 27, pt. 1, p. {page}", "page_link": "ia_reader",
  "notes": "1880-1901 GPO scans only; never warrebellionaco00cowlgoog (1971 reprint)" }
```
Allow-list by **curated identifier**, never by IA `date <= 1930` (IA `date` is a series-start value: OR = 1880, Confederate Veteran 1902-29 = 1893, SHSP and Gardner = null, 1984 reprint scans sit beside originals) [S hs1 verification MISSED-1]. `possible-copyright-status = None` means "unknown".

### 3.3 `Document`

```jsonc
{ "doc_id": "or27-1:0196", "source_id": "or27-1", "title": "Report of Col. Joshua L. Chamberlain, Twentieth Maine Infantry",
  "author": {"person_id": "P:chamberlain-jl", "name": "Chamberlain, Joshua L.", "rank": "Col.", "unit_id": "U-20ME", "role": "regimental_cdr"},
  "date_written": "1863-07-06", "genre": "official_report",
  "pages": {"start": "622", "end": "626", "scan_leaf_start": 642, "reader_index_start": 639},   // reader index from scandata.xml addToAccessFormats, never raw leafNum
  "perspective": {"side": "union", "role": "regimental", "lag_days": 4, "retrospective": false, "bias_tags": []},
  "ocr_score": 0.98, "segmentation": {"method": "toc+header-regex", "confidence": "A"}, "review": "auto|human-ok|human-fixed" }
```
(Example values are illustrative except: No. 196 is Chamberlain's report and begins at O.R. p. 622 [S hs1 verification]; leaf/reader numbers are re-verified by spike S-4.)

### 3.4 `Passage` (the retrievable unit; the wire format is compact arrays with a header, 3.9)

```jsonc
{ "id": "or27-1:0196#a3f19c02", "num": 4127, "doc_id": "or27-1:0196", "source_id": "or27-1", "seq": 3,
  "kind": "report_passage",        // report_passage | dispatch | narrative | testimony | monument_text | speech | newspaper_item | table_row | fact_note | site_record
  "type": "prose",                 // prose | table | list | front_matter: non-prose is indexed at prior 0.3 / 0.1 / 0 and never quoted as narrative
  "scope": "core",                 // core | campaign | context
  "text": "...cleaned, NFC...", "raw_sha": "...",
  "edits": [{"s": 12, "e": 19, "from": "repori", "to": "report", "why": "ocr-dict"}],      // numbers are never auto-edited
  "sb": [0, 118, 260, 431],        // block/sentence boundaries: build-time splitter (Col., Lieut., Gen., No., a. m. protected); blocks < 6 words merged, > 60 words split at ; or :
  "cite": {"short": "O.R., Ser. I, vol. 27, pt. 1, p. 623", "author_line": "Col. Joshua L. Chamberlain, 20th Maine, July 6, 1863",
           "page": "623", "printed_page_source": "page_numbers.json+scandata",
           "scan": {"ia_id": "warofrebellion271unit", "scan_leaf": 643, "reader_index": 640, "url": "https://archive.org/details/warofrebellion271unit/page/n640/mode/1up"}},
  "lic": {"id": "PD-US-Gov-1889", "tier": "A", "attribution": null},                    // denormalised from the registry for the tier gate
  "persp": {"side": "union", "role": "regimental", "genre": "official_report", "lag_days": 4, "retro": false, "bias_tags": []},   // bias_tags: lost_cause | partisan_committee | self_justifying
  "sens": [],                      // period_racial_language | graphic_injury | human_remains
  "ents": {"units": [["U-20ME", "subject", 0.97]], "people": [["P:chamberlain-jl", "author", 1.0]], "places": [["LOC-003", "mention", 0.9]], "events": [["EV:D2T268", "candidate", 0.6]]},
  "time": [{"day": 2, "clock_text": "about 4 p. m.", "clock_min": 960, "tol_min": 10, "mod": "about", "span": [131, 146],
            "evidence": "official_report", "attach": "unit-day", "conf": "B", "tick_hint": 268, "tm": "1.0.0"}],
  "quotes": [{"s": 131, "e": 402, "h": "sha1(ws(text.slice(s,e)))", "why": ["time", "action"], "score": 0.83}],
  "expansion": {"generated": true, "model": "<id>", "prompt_ver": "e1", "queries": ["..."], "audited": true},   // T0+ : index-only field, weight about 0.5; never displayed, quoted or cited; excluded from gold sets
  "flags": ["contested:little-round-top-left-flank"],
  "conf": {"ocr": 0.98, "segment": "A", "link": "B", "review": "auto"},
  "nav": {"prev": "or27-1:0196#77e0b1aa", "next": "or27-1:0196#0c4d5e91"}, "ver": 1 }
```
Field rules:
- **`time[]` stores 1863 clock minutes (local), never ticks.** `tick_hint` is a disposable, version-stamped (`tm`) convenience; the runtime uses it only if `manifest.time_model == tm`, else recomputes through `time-adapter.js`. `evidence` in `contemporaneous_dispatch | official_report | retrospective_report | memoir | newspaper | site_authored`; contemporaneous outranks retrospective in evidence tables. The clock is piecewise (0.8-42.3 min/tick [S data-integrity MISSED-01]) so arithmetic on 5-minute ticks is forbidden.
- **`quotes[]`** are the only spans quoted by default; extra sentences may be chosen only on `sb` boundaries. Every `s/e` is a UTF-16 offset validated at build (V03).
- **`cite.scan.reader_index`** comes from `scandata.xml`; the raw `page_numbers.json` `leafNum` lands 3-5 pages off in the IA reader [S hs1 verification 14].
- **`ents`** roles: `subject | author | mention | addressee | place_of_action`; only confidence A/B may be `subject`.
- **`expansion`** exists only where `may_send_to_llm = true`; dropped from the corpus if the 200-item audit finds more than 5 % misleading expansions [S B 4.4].

### 3.5 `Entity` (T1)

```jsonc
{ "id": "U-20ME", "type": "unit", "level": "regiment", "side": "U", "name": "20th Maine Infantry", "short": "20th Maine",
  "aliases": ["20th Maine", "20th Me.", "Twentieth Maine"], "parents": ["BDE:U-V-1-3", "DIV:U-V-1", "CORPS:U-V"],
  "display": {"brigade": "Third Brigade (Vincent's Brigade), First Division, Fifth Corps"},     // display names: no raw ids ever reach the UI (DI-28)
  "attrs": {"strength": {"v": 386, "auth": "SITE-OOB", "basis": "engaged", "conf": "C", "edition": null, "page": null},
            "casualties": {"v": 130, "pct": 33.7, "auth": "SITE-OOB"},
            "commander": [{"person": "P:chamberlain-jl", "from": null, "to": null, "fate": "Survived; Medal of Honor 1893"}]},
  "xref": {"cwss": "UME0020RI", "dyer": null, "osm": null, "monuments": ["MON:###"]},
  "links": {"regiment_page": "/regiment.html?unit=U-20ME", "map": {"unit": "U-20ME"}, "flags": ["deepLinks"]},
  "prov": [{"source_id": "site-records", "locator": "oob/union_regiments_iii_v_corps.json#U-20ME"}] }
```
Types: `unit` (regiment, battery, brigade, division, corps, army), `person`, `place`, `road`, `structure`, `feature`, `monument`, `event`, `vignette`, `site`, `topic`, `source`. **Every numeric attribute is `{v, auth, basis, conf, edition, page}`**; placeholders (88 of 103 batteries have templated strengths; 36 regiments show 0 casualties) carry `basis: "estimated"` and are never quoted as history [S hs1 verification MISSED-4].

### 3.6 Fact tables (T1, `facts.<h>.json`, rebuilt from entities + reviewed decisions)

| Table | Row | Answers |
|---|---|---|
| `tenures` | `{unit, person, from, to, cause, src}` from the 42 commander successions + OOB (DI-17 model) | who commanded / who replaced |
| `stats` | `{unit, strength, casualties, pct, days, auth, basis}` | how many men / casualties / rate |
| `rank` | precomputed superlatives with the rule text and a minimum-strength rule (1st Minnesota 85.5 %, 224 of 262 [S]) | which regiment lost the most |
| `rollup` | brigade -> regiments, division -> brigades, corps -> divisions, side/state counts (Maine = 10 records: 9 infantry + 1 cavalry [S]) | which brigades, how many |
| `anchors` (P2) | `{aid, doc_id, passage_id, unit_ids, place_ids, day, clock_min, tol, mod, evidence, event_key?}` | evidence tables |
| `events` | the 137 chronology events with reviewed `event_key`, canonical clock (from the time module once it lands), attached anchor ids | what happened at noon on July 3 |
| `places` | gazetteer with OCR/period variants (`Gulp's Hill` -> `Culp's Hill`), aliases, coordinates | where |
| `unknowns` | known-unknown rules: per-location casualty totals, individual-soldier presence, weather (until a primary is found) | limited answers |
| `routes` | intent -> site page (ancestor -> `/find-ancestor.html`, tour, map) | routing |
| `casualty_sources` (P3) | PD-derived rows from OR returns, Fox, Guild, `{unit, k, w, m, total, checksum_ok, source, edition, page}` | numbers with authority, reconciliation |

### 3.7 Review decision, manifest, answer object, gold record

```jsonc
// review/decisions.jsonl  (keyed by passage id = content hash, so decisions survive re-segmentation)
{ "id": "or27-1:0196#a3f19c02", "kind": "unit-link|anchor|persp|contested|ocr-number|page|licence", "decision": "accept|fix|reject", "fix": {...}, "reviewer": "ML", "at": "2026-11-05" }

// hx/manifest.json (the only mutable-URL file)
{ "kb_version": "1.3.0", "schema": 3, "built_at": "...", "time_model": "1.0.0", "entity_registry": "2026.10.2",
  "tiers": {"entity": {"path": "f/entity.9f3a21bc.json", "bytes": 79004}, "facts": {...}, "lexicon": {...},
            "index": {"buckets": 128, "hash": "fnv1a32(stem) % 128", "codec": "varint-delta+impact8"},
            "text": {"per_shard": 16, "files": [...]}, "entpost": {"buckets": 32, "files": [...]}},
  "sources": [{"id": "or27-1", "tier": "A", "passages": 2712, "license": "PD-US-Gov-1889"}],
  "redactions": ["or27-1:0044#deadbeef"], "eval": {"report": "eval/report-1.3.0.json", "sha256": "..."},
  "semantic": {"enabled": false}, "ai": {"enabled": false} }                               // kill switches for stages B and C

// Answer object returned by the Worker
{ "kb": "1.3.0", "mode": "answer|partial|decline", "route": "records|reviewed|ai", "intent": "who-commanded",
  "entities": [{"id": "BDE:U-I-1-1", "mention": "Iron Brigade", "w": 15}], "did_you_mean": null,
  "blocks": [{"t": "lead", "runs": [{"txt": "..."}, {"ent": "BDE:U-I-1-1", "txt": "Iron Brigade"}], "src": [{"entity": "BDE:U-I-1-1", "field": "commander"}]},
             {"t": "quote", "passage": "or27-1:0196#a3f19c02", "s": 131, "e": 402, "attrib": "...", "cite": "...", "persp": {...}},
             {"t": "table", "kind": "evidence-time", "rows": [...], "summary": "4 accounts; median ..."},
             {"t": "note", "code": "authority-mixed", "txt": "..."}],
  "chips": {"follow": [...], "filters": [...]}, "links": {"map": {"unit": "U-20ME", "clock": {"day": 2, "min": 960}}, "pages": [...]},
  "trace": {} }                                                                        // only with #debug or the "How was this answered?" panel open
```
Map links carry a **clock**, never a tick; the page converts through `time-adapter.js` at click time. The Golden-Passage record schema is in 7.1.

### 3.8 Invariants enforced by the validator (build fails)

V01 schema/required fields · V02 tier and licence gate (Tier C id, missing `lic`, reprint imprint, OCR < 0.80 unquarantined, tier B without attribution, `may_send_to_llm` true on a non-A source) · V03 every `quotes[].s/e` and `sb` offset in range, on a token boundary and hash-equal · V04 every entity id resolves · V05 developer-note blocklist `/DATA NOTE|must be shown|CRITICAL:|keyframe|animation|HIGHEST PRIORITY|\bflag_notes\b/i` on site-authored text · V06 no ` -- `, `undefined`, `null`, `NaN`, internal ids (`\b[UC]-[A-Z0-9-]+\b`, `\b(CS|US)-\d{3}\b`) in site-authored fields · V07 anchors: `day` in {1,2,3} or explicit non-battle date, `clock_min` in [0,1440) · V08 page citations pass the folio-OCR sample · V09 no duplicate ids · V10 shard and manifest size budgets · V11 an alias mapping one surface form to more than 8 entities needs a disambiguation rule · V12 determinism (clean rebuild = identical hashes) · K001 every indexed field exists in the schema (kills the `e.title` drift that made 137 chronology answers print `undefined`) [S A 5.1, data-integrity].

### 3.9 Wire formats

- `entity.json`: columnar JSON; alias map, surname map, unit-key map, name vocabulary inside (75.9 KB br for 957 records, unoptimised [M A M13]).
- `lexicon.bin`: front-coded sorted stemmed terms with df (varint); 20,605 terms = 34 KB br [M].
- `ix/NNN.bin`: header, offsets, dictionary, postings `[df][delta-doc varint, impact8]...`; `impact8` is the precomputed BM25 contribution quantised to 8 bits (removes doc-length arrays and IDF from the query path); bucket = `fnv1a32(stem) % 128` (avg 12 KB, max 20 KB [M]). Prefix/typo queries go through the lexicon, not the buckets.
- `en/NN.bin`: `entity id -> [delta passage id, role code]`; `fnv1a32(entity id) % 32`; about 50-80 KB total at 14 k passages [E].
- `tx/NNNN.json`: `{"h": [...], "p": [[...]], "c": [citation table]}`; passages in (source, document, sequence) order so neighbours share vocabulary. Shard sweep [M A M4]: 8/shard 3.0 KB, **16/shard 5.7 KB (367 B/passage)**, 32/shard 10.9 KB, 64/shard 20.8 KB, 250/shard 72.0 KB; gzip-9 is 17-23 % larger than brotli-11.

---

## 4. Ingestion pipeline and QA / human-review workflow

### 4.1 Principles and layout

Idempotent stages write JSONL plus one manifest line; a stage runs only if the previous gate passed. Python 3.11 for text work (`lxml.iterparse` for the 46 MB `djvu.xml`, `rapidfuzz`); Node 24 for emit/validate/eval, sharing `search-core.js` with the browser so build-time and run-time normalisation cannot drift. The pipeline lives in a real git repo (`historian-data/`), the first thing to create because neither Netlify zip contains an authoring source (N1):

```
historian-data/  sources.yaml . sources.lock.json (url, retrieved_at, sha256, bytes, licence snapshot) . raw/ (git-ignored)
  fetch/*.py  normalize/*.py  segment/<source>.py  link/*.mjs  anchors/*.mjs  qa/*.mjs  llm/ (prompts, llm_cache/, llm_runs.jsonl)
  registry/ (entities.src, aliases.v1.json, persons.yaml, places.yaml, contested.yaml)  review/ (queue.jsonl, decisions.jsonl)
  eval/ (gold.core.json = hist-golden-set.json, gold.passage.jsonl, gates.json, baselines/)  build/emit.mjs -> dist/hx/  legal/ (dated replies)
```

### 4.2 Stage table

| # | Stage | Method (concrete) | Basis | Acceptance test |
|---|---|---|---|---|
| S0 | Registry + rights gate | curated IA allow-list, parsed volume year, publisher, reprint flag; `statement_text/url` captured; tier A/B/C/A-pending | `date <= 1930` unusable [S hs1 verif.] | CLI refuses `warrebellionaco00cowlgoog`, a licence-less item, any Tier C id |
| S1 | Fetch | per-host token bucket (archive.org 1 req/s sequential; loc.gov 12/min against a documented 20/min limit with a 1-hour block and a countdown that resets on any request while blocked; Wikimedia 60/min with contact User-Agent; NPS API 500/h); file names from `/metadata/<id>` (never guessed; Emory items use underscores); sha256 lock; ETag cache; hard stop on 403; size guard | [S hs2 7.2, hs1 verif. 12] | dry run on 20 mixed URLs never exceeds host limits; second run downloads 0 bytes |
| S2 | OCR normalise + quality gate | NFC; U+FFFD to dash by context; collapse `[ \t]+` (IA text is double-spaced); de-hyphenate; strip running heads; dictionary repair only at edit distance 1 from a term with df >= 50, never digits or capitalised tokens; every edit logged; numbers never auto-edited | strict regexes find 0 headers until whitespace is collapsed [S hs1 MISSED-2]; OCR proxy OR 0.984, NYFR 0.968, B&L 0.966, JCCW 0.960, PA 0.935-0.949, Bates 0.878, Confederate Veteran 0.835, Compiler 0.43-0.48 | >= 0.90 auto-accept; 0.80-0.90 accept + flag; < 0.80 quarantine (never indexed); unit test: OR27-1 No. 196 matches a whitespace-strict regexp after normalisation |
| S3 | Segment (per source) | OR Pt 1/2: ToC parse then body-header regexp then fuzzy match; OR Pt 3: dispatch-header segmenter; NYFR: ToC-driven per-regiment sketches across all three volumes; PA 1914 canonical; B&L by contents; JCCW by witness heading (Q/A pairs stay together); Fox prose vs tables; page map: `djvu.xml` leaf -> `page_numbers.json` printed page (interpolate the 18 gaps) -> `scandata.xml` reader index | ToC recovery 376/378 and 211/211; body headers 303/378 and 162/211 after whitespace collapse [S] | >= 95 % of pages assigned to a document; 20 random documents match first/last 10 words against the scan; 5 sampled citations per source open the right page image (OCR the printed folio) |
| S4 | Classify prose/table/list/front | digit ratio > 0.07, short-token ratio > 0.28 with digits > 0.03, words/sentence > 60, OCR-noise ratio | 1.4-10.6 % of passages are table-like by source [M A M10] | tables never quoted as narrative; table rows pass checksum or go to review |
| S4b | Table extraction | rebuild rows from word boxes; sum checks | Fox digit errors; Guild column scrambling | checksum failures < 3 % after manual queue |
| S5 | Chunk | 150-250 words, paragraph-aligned, **no overlap** (neighbour pointers instead; overlap doubles the index and creates two citable copies), never across documents; testimony keeps Q/A pairs; deterministic sentence splitter writes `sb`; id = doc#hash8 | 14,391 passages / about 190 words from 7 sources; near-duplicates 0.6 % without overlap [M A] | join(chunks) equals the document modulo whitespace; every `sb` offset lies on a sentence end |
| S6a | Unit linking | grammar linker: compound-ordinal parser with negative lookbehind ("Fifty-seventh" never yields "seventh"), ellipsis lists ("Forty-ninth and Seventy-seventh New York"), arm agreement (Infantry/Cavalry/Battery/Artillery/Militia/National Guard), OCR-variant table, 103-row battery commander-name table; document author unit from the header is `subject`; confidence A-D | naive linker wrong 7/22; grammar linker 24.1 % of passages, 3,820 confident mentions, 389/467 ids, 25-item sample 24 correct [M A M12]; 15 arm-collision keys; 49 off-grammar ids | labelled set of 200 mentions stratified by source: precision >= 0.95 at conf >= B, recall >= 0.85; C/D go to review |
| S6b | Person linking | commander registry (698 names) + report headers + rank-title regexp; surname collisions resolved by unit context | "Robert E. Lee" collides with battery commanders named Robert [S hist-current Q032] | 100 sampled mentions >= 0.95 precision |
| S6c | Place linking | gazetteer (30 locations + 8 roads + 8 structures + 4 features + period variants seen in text) | OCR variants surface as lexicon neighbours [M A M7] | every `LOC-` id has >= 1 linked passage or an explicit "none found" |
| S6d | Time anchors | grammar `\d{1,2}([:.]\d{2})?\s*(o'clock)?\s*[ap]\.?\s?m` + daybreak/sunrise/noon/sunset/dusk/nightfall/midnight + modifiers; dispatch header time = contemporaneous exact; report times attach to (report unit, day) because only 75 sentences hold both a place term and a clock time; tolerance +/- 10 min | 5,702 clock expressions in 7 sources; 39 % of OR Pt 1 passages contain one [M A M11] | 200-anchor hand sample precision >= 0.90; every one of the 137 events has >= 1 candidate anchor or "no report time found"; floor 1,500 anchors [D] |
| S6e | Event linking | unit + place + day + ALL-CAPS event labels against the 137 events; proposals only | derived-alias approach [S hist-current] | only reviewed `event_key`s enter `facts.events` |
| S6f | Perspective, sensitivity, controversy tags | side/role/genre/lag from the header; `bias_tags` by source family; `sens` by lexicon; `contested:*` by the registry | [S hs1 10 Q2, B 7.4] | 100 % of narrative passages carry persp before P4 exit |
| S7 | Dedupe | 8-word shingles, >= 0.6 overlap keeps the preferred source (OR > state book > memoir > secondary), records `dup_of`, keeps both if `persp` differs | 80/14,391 = 0.6 % [M A M9]; OR text is reprinted in state books, B&L, SHSP, NYFR | 200-pair precision >= 95 %; no duplicate shown twice in a golden answer |
| S8 | Validate | JSON Schema (ajv) + V01-V12 + K001 | data-integrity validator spec (60 rules) | CI red on any rule; `validation-report.json` archived per build |
| S8b | LLM assist (Tier A only) | see 4.3 | [S C 4.5, B 4.4] | 100 % outputs cached; audit 200 expansions |
| S9 | Human review | see 4.4 | | decisions applied deterministically |
| S10 | Emit | entity tier, facts, lexicon, postings, entity postings, text shards, manifest, `/sources.html` data, errata; content-hash every file; `keep_previous: 2` | | clean-checkout rebuild reproduces identical hashes |
| S11 | Publish + post-checks | copy to deploy tree; bump manifest; Playwright golden pass on the built site; HEAD-check 5 % of citation URLs; Lighthouse with the full KB present | | eval gates (7.3) green; `/historian` Lighthouse >= 95 mobile and desktop |

### 4.3 LLM assistance policy (offline, disclosed, proposals only)

| Allowed (source must have `may_send_to_llm = true`, i.e. Tier A) | Model / cost | Output handling |
|---|---|---|
| Ambiguous-mention link proposals ("the Third Brigade", "Colonel Rice") over about 26 k chunks | Batch API, Haiku 4.5 ($0.50 / $2.50 per MTok) about $17, or Sonnet 5.5 ($1 / $5) about $34 [S C 4.5] | strict JSON schema validated against the candidate list; confidence capped at 0.7 and `review` flag; never free text |
| T0+ document expansion (3-6 modern-phrasing queries per passage) | about 30 k chunks x (300 in, 120 out tokens) = 9 M in / 3.6 M out: Haiku batch about $14, Sonnet batch about $27 [C from B 4.4 and C prices] | `expansion` field, index-only, `generated: true`; 200-item human audit; dropped if > 5 % misleading |
| Drafting aid for the reviewed-answer library | interactive, negligible | the reviewer rewrites; nothing is published as generated |
| Paraphrase amplifiers for the golden set | small | `generated: true`, 20 % human-reviewed sample, never in the locked split |

**Forbidden:** any displayed sentence; any fact-table value; any Tier B / C / A-pending text; using model output as evidence. Every call is recorded in `llm_runs.jsonl` (model id, prompt hash, input hashes) and cached in the repo so rebuilds stay deterministic. Disclosure paragraph on `/sources.html`. Budget cap $75 for the whole programme (expected $31-61) [D].

### 4.4 Human-review workflow (what the owner and the historian actually do)

**Queue contents, priority order** (from A 5.2 and C 4.4, merged):
1. Unit links with confidence C/D and every battery link. 2. Passages flagged or auto-tagged `contested:*` lacking perspective tags. 3. Time anchors that differ from the map's event time by more than 60 min (these become the audit-C4 evidence table). 4. Newly discovered persons. 5. A stratified random sample of 100 passages per source (text fidelity, page correctness, unit link, licence flag). 6. OCR edits touching a number (blocked until accepted). 7. Anything cited by a reviewed answer. 8. Anything reported by a user.

**Volumes [E]:** OR27-1/2 + NYFR-1 yield about 1,500 linked passages; 15-25 % C/D means about 300-600 items; at about 40 items/hour that is **8-15 h for the OR backbone**. Design C's programme-wide estimate is about 3 k reviews at 30-45 s = 25-38 h; my aggregate including audits and gold labelling is **59-95 h** (8.4).

**Tool:** a static page `tools/review/index.html` (no server) reading `queue.jsonl`, showing the passage beside the proposed links/anchors and a link to the IA scan page (`reader_index` deep link); it exports `decisions.jsonl` (`{id, decision, fix, reviewer, at}`) that the owner commits. Decisions are keyed by passage content hash so they survive re-segmentation.

**Loop:** build proposes -> queue -> reviewer works a 2 h + 1-2 h weekly slot -> commit decisions -> `emit` applies them deterministically -> gates re-run -> weekly deploy. **Valves so the queue can never block shipping:** unreviewed C/D links are used only as retrieval boosts, never as `subject` or in structured answers, and answers built on them are worded "passages that mention ..." rather than "the 20th Maine's report ..."; a backlog older than 14 days **freezes new-source ingestion** until it is cleared.

**Roles:** **Owner** (final say on wording and scope). **Historical reviewer** (named; only this role signs off `contested.yaml`, any change to perspective tags, the 100-answer audits, the 19 unlocked golden items, and the 7 `controversy` and 13 time-facts-inherited golden items [S hist-eval 5.3]). **Second reader** (a volunteer guide/teacher/Round Table member) scores the rubric on 30 % of items for Cohen's kappa >= 0.6.

**Corrections loop:** intake ("Report a problem" with passage id, `kb_version`, question only if the reader ticks a box) -> ack <= 3 days -> triage (transcription/OCR; wrong link unit/person/place/time; wrong citation/page; misleading selection; rights/takedown; privacy) -> fix at the source of truth (decision, `edits` override, registry change or source removal, never a hand edit of a shipped shard) -> rebuild, validate, eval -> PATCH release batched weekly with a `CHANGELOG.md` **Corrected** entry `{id, before -> after, citation, reviewer, date}`; takedowns are same-day redeploys and permalinks render a tombstone. SLA targets: ack <= 3 d; factual fix <= 14 d; takedown <= 24 h [E, owner to confirm].

### 4.5 Per-source QA definition of done

OCR proxy recorded and above gate; >= 95 % pages assigned; 20-document boundary check; 5 folio-OCR page checks; 100-passage random audit **>= 95 % pass** on text fidelity, page, link and licence; link precision >= 0.95 at conf >= B on the 200-mention labelled set; anchors sample >= 0.90; dedupe sample >= 95 %; validator green; deterministic rebuild; size within budget; reviewer initials on every accepted low-confidence item; source card added to `/sources.html`.

---

## 5. Retrieval and answering design

### 5.1 Query pipeline (in the Worker; the main thread only posts a message and renders events)

```
q > guard > normalise > tokenise > lexicon repair > entity/time/place link > intent+slots > scope gate > plan
        structured (sync, no network): entity cards . fact tables (tenures/stats/rank/rollup/events/anchors/places)  -> AnswerEvent{facts}
        passage retrieval (async: ix + en + tx shards) > fuse > diversify > decide(answer|partial|decline) > compose -> AnswerEvent{final}
```
The UI receives `planned` within milliseconds, the structured answer immediately, and evidence cards as shards arrive into pre-sized skeletons (no layout shift).

### 5.2 Normalisation, linking, repair (one implementation, `search-core.js`)

- **Normalise:** NFKD, strip accents, lowercase, curly to straight quotes, drop possessive `'s`/`s'` and stray `'` (today `"Pickett's Charge"` yields `pickett`, `s`, `charge` and the `s` token scores on 266 of 658 records [S hist-current 1.3]), `&` -> `and`, non-alphanumerics to space, corps rewrite, ordinals to `#n` ("twentieth", "20th", "20", "twenty first" -> `#20`). State abbreviations expand **only when preceded by a number** ("20 ME", "84th NY") so `me`, `in`, `us`, `la`, `al` stay ordinary words (removing `me`/`in` from the stop list lowers correct decline 41.2 -> 29.4 [S hist-current verification 03]). Light stemmer applied identically at index and query time.
- **Entity linking:** alias map derived from parentheticals ("(14th Brooklyn)", "(Iron Brigade)"), brigade nicknames, `{surname}'s brigade/division/corps`, ALL-CAPS event labels, terrain parentheticals; plus a curated seed (about 45 entries: Devil's Den/Devils Den, Round Top vs Big/Little, Wheatfield/Wheat field, High Water Mark/The Angle/Copse of Trees, Bucktails, Berdan's); plus reviewed KB variants. **Derived aliases are the most valuable component: removing them costs -6 S@1 and -16 canonical@1** [S hist-current 4.3]. Bare ambiguous surnames ("Smith", "Jackson", "Lee") return a disambiguation chip row instead of a guess ("Stonewall Jackson" currently returns `U-11PA-R`, commander "Samuel Jackson" [S]).
- **Fuzzy repair:** out-of-lexicon tokens only; Damerau-Levenshtein <= 1 for length 5-7, <= 2 for >= 8; same first letter unless length > 6; never when one token is a short prefix of the other ("franc" -> "Francis"); join/split ("wheat field" <-> `wheatfield`); ranked by (entity-name membership, df, distance). Measured on 2,682 synthetic single-edit typos over 937 name terms: **100 % recall in all six classes with 1.04-1.11 candidates**; Soundex 34-100 % (dropped); consonant-skeleton 11-99 % (secondary only) [M A M8]. UI note: "Showing results for **Chamberlain** - search for *Chamberlin* instead". OCR-variant expansion (weight 0.4) is kept only if recall@5 rises on the dev split.
- **Intent and slots:** ordered rules (14 in `proto.js:194-208`: ancestor, succession, who-commanded, superlative, strength, casualties, outcome, compare, when, where, why, what-happened, list, who) plus **report-of**, **evidence-time**, **presence**, **site-route**, **verify-claim**. Interrogatives are features, not stop words. "Ancestor" requires a personal-relation cue; "was Longstreet at Gettysburg" is *presence*, not ancestor. Each rule has >= 20 phrasings and negative tests. Time expressions ("at 4 pm on July 2", "noon July 3") map to `{day, clock_min, tol}` and become a tick **only** through `time-adapter.js`.

### 5.3 Retrieval plan by intent

| Intent | First | Then | Answer type |
|---|---|---|---|
| lookup / what-happened (entity) | entity card | top 2 passages where entity role is subject/author | A1 profile + A8 evidence |
| who-commanded / succession | `tenures` | passage quoting the succession | A2 |
| strength / casualties / superlative | `stats`, `rank`, `casualty_sources` | Fox/OR return passage as citation | A3, A4 |
| when / evidence-time | `events` + `anchors` | 3-5 anchors sorted by time, contemporaneous first | A5 evidence table |
| where | `places` + OOB positions | passages with `place_of_action` | A6 |
| report-of / testimony | passages by `author.unit` / `author.person` | prev/next neighbours | A7 quote block |
| why / contested | concept lexicon + PRF; entity-conditioned passages | perspective-balanced set | A9 |
| compare | two entity cards | one passage each | A10 |
| list / relational | `rollup` | - | A11 |
| ancestor / roster | `routes` | roster shards (P5) | A12 |
| out of scope / no data | `unknowns`, scope table | nearest neighbours | A13 (A14 = clarify) |

### 5.4 Passage scoring

Candidates (union): (a) entity-conditioned (`en/` postings for linked units/people/places), (b) lexical BM25 (k1 1.2, b 0.75) over touched `ix/` buckets, (c) time-conditioned (anchors within `tol_query + tol_anchor`).
```
score(p)  = BM25(q,p) + sum_e w_link(e)*role(e,p) + w_t*timeProx(q.time, p.time)   // w_link 12 (unit key 40); role subject/author 1.0, mention 0.5; timeProx 0..4
            + phrase(q,p) (+8 exact normalised title/alias) + proximity(q,p) (sum 1/(1+gap) within 6 tokens, cap +4)
score'(p) = score(p) * prior(kind,type,persp,source) * intentKindPrior
prior:      report_passage 1.0 . dispatch 1.0 . testimony 0.95 . narrative 0.9 . monument_text 0.85 . newspaper_item 0.7 . table 0.3 . list 0.1 . front_matter 0
fusion:     reciprocal-rank fusion sum 1/(60+rank) when both entity-conditioned and lexical lists exist (RRF vs additive decided on dev; both < 0.2 ms)
diversity:  MMR with document penalty; <= 2 passages per document, <= 3 per source family in the top 5
```
Entity-tier ranking (cards) uses BM25F: title 3.0, alias 3.0, people 2.0, place 1.5, body 1.0 with b = 0.4/0.3/0.3/0.3/0.6, k1 = 1.2, replacing today's hard-coded x1.3 vignette weight that puts a vignette first for 71 % of answered queries. Plain BM25F alone does **not** beat the status quo (S@1 76 %); the gains come from aliases, links, intent, fuzzy repair and the no-answer gate [S hist-current 4.3]. All parameters are initial values [E], tuned on the dev split only.

**A+ semantic-lite (adoption rule: recall@5 +3 points on dev, no faithfulness or refusal regression):** concept lexicon (about 60 entries: died/killed/KIA/fell -> casualty; began/opened/stepped off -> begin; lose/repulse/defeat); PMI neighbours for the 5,000 highest-df terms (about 150 KB [E]) at weight 0.3 only when < 3 passages clear the threshold; RM3-style pseudo-relevance feedback (top 5 passages, 8 terms, weight 0.25) for why/how/what-happened only; T0+ expansion field at weight about 0.5. Measured today: concept lexicon about 0 on the current battery [S hist-current QW-3]; the real test is the paraphrase slice of Golden-Passage.

### 5.5 Decide: answer, partial or decline

Gate stack (all thresholds tuned on dev; abstention curve archived per build): (1) empty/gibberish/length (300 characters max); (2) **scope table**: visit-planning intents (hotel, ticket, parking, hours, directions, weather, restaurant) -> honest pointer; adjacent topics (Antietam, Vicksburg, Chancellorsville, Lincoln's Address, causes of the war, D-Day) -> "outside this site's records" + optional external link; generic-word out-of-scope queries ("best restaurant in town", "D-Day", "how do I get to the battlefield") pass every lexical gate, so this table is needed [S hist-current QW-10]; (3) **coverage gate**: fraction of content tokens in the lexicon/entity vocabulary; (4) **name-field gate**: a bare-entity query needs a hit in title/alias/people/place; (5) **support gate**: top passage score >= tau_abs, margin >= tau_rel, entity agreement for entity-conditioned intents; (6) **known unknowns**: per-location casualty totals, individual-soldier presence, weather (until a primary is found) return a limited answer stating what the records do not contain. **Re-tune after every data expansion**: adding 299 records to the entity tier dropped canonical@1 91.4 -> 87.9 and correct decline 94.1 -> 88.2 in the prototype [S hist-current verification 08].

### 5.6 Composition (templates and extractive quoting; nothing is generated)

Invariants, enforced by the composer, re-checked by a build-time linter over every card and by Playwright over the golden run:

| # | Invariant |
|---|---|
| I1 | Every sentence is exactly one of: (a) template text whose slots come from a fact/entity field (`src` recorded), (b) a verbatim quotation `(passage_id, s, e)`, (c) an explicit limitation/refusal from the `unknowns`/scope tables |
| I2 | No numeric literal is emitted that is not a fact-row value or inside a quotation |
| I3 | `normalise_ws(text.slice(s,e)) == quote_text`; quotes carry author, role, unit, date written, `retrospective` flag and page; ellipses `[...]` join whole sentences only |
| I4 | Attribution is never dropped when text is shortened; "Read the passage" shows the full chunk and prev/next |
| I5 | Clock times appear only as (i) a reported time attached to a named passage or (ii) a label from the canonical time module. The legacy `time` field, tick arithmetic and any "site clock" string are forbidden (`Longstreet 7:30am`, `Pickett's Charge 11:05am` are known-wrong labels [S audit C4]) |
| I6 | `contested:*` passages are never shown alone: include the other side or state "Only Union accounts are indexed for this question." |
| I7 | Numbers with an authority field are worded "about ... (source; sources differ)" until reconciliation lands; `basis: estimated` is never quoted as history |
| I8 | Rendering uses `textContent`/DOM ranges only; the corpus is untrusted input |

Because free-form generation is absent, "hallucination" reduces to **selection errors** (wrong passage, link or fact row), all of which the evaluation measures.

**Answer types** A1 profile, A2 command/succession, A3 strength and casualties, A4 superlative, A5 **evidence table**, A6 place, A7 report/testimony quote block, A8 evidence cards (<= 2, collapsed by default), A9 contested/why, A10 compare, A11 list/relational, A12 route, A13 limited/decline, A14 clarify. The lead is one composed sentence or a table, then <= 2 evidence cards, replacing today's three raw cards averaging 2,989 characters [M hist-current].

**Extractive selection:** for the top-K (K <= 8) passages, score each sentence `bm25(q,s) + 4[mentions linked entity] + 3[matches parsed time] + cue(intent,s) - 0.02*max(0, words-45)`; take the best window of 1-3 contiguous sentences up to 90 words; <= 3 passages, one per document, <= 2 per source family; order contemporaneous first, then official reports, then retrospective; first view shows <= 120 quoted words. Tier B text is shown only as a separately labelled excerpt block.

**Evidence tables (audit C4 becomes a feature):** columns Reported time | Who (rank, unit, side) | Written | Evidence class | Passage; summary "N accounts; median H:MM; range H:MM-H:MM" (testimony statistics, not ground truth; different headquarters kept different times and reports differ by 1-3 h). The map's own clock is shown only after the time module and the reviewed re-timing land; until then the table says "the site's map clock is being corrected".

**Perspective balancing:** chips show side (Union/Confederate/civilian), genre (report/memoir/testimony/press) and "written 1863" vs "written 1889"; `contested.yaml` (seeded from the 25 chronology `narrative` fields and the `hist-sources-1` controversy list: Longstreet/Early-Allan on the July 2 delay, Sickles vs Meade, the July 1 Eleventh Corps collapse, Reynolds's death time, the first shot) lists trigger entities and required sides; historian sign-off required. The Historian shows the accounts; it never adjudicates.

**Refusals and limits (templates):** decline (scope) "That is outside what this site's records cover (the battle of Gettysburg, July 1-3, 1863) ..."; limited (known unknown) "The records here do not give casualty totals by location. They do give totals by unit ..."; roster honesty "I can't tell whether a specific soldier was at Gettysburg; the site holds regiments, not individual muster rolls" + route to Find Your Ancestor (external rosters are user-initiated links only); nearest neighbours <= 3, labelled "closest records", never presented as answers.

**Conversation:** per-session `lastEntities`, `lastIntent`, `lastSide`, `lastTime`; "tell me more / who commanded it / what about the Confederates" reuse or flip; ambiguous pronouns yield A14 chips. Follow-up chips derive from the answer's entity kinds and are part of the golden set (today the placeholder and all five chips return a non-canonical first card [S hist-current UX-10]).

### 5.7 Latency and size (measured where marked; phones are a model until spike S-3)

| Step | Measured (Node 24, desktop) | Modelled mid-tier phone (x6 [E]) | Budget |
|---|---|---|---|
| decode touched postings + BM25 + top-10 over 14,391 passages | p50 **0.057 ms**, p95 **0.126 ms**, max 2.6 ms [M A M6] | <= 1 ms p95 | - |
| fuzzy repair over 20,605 terms (brute force, prefiltered) | **3.5 ms** [M] | about 20 ms | <= 30 ms (skipped when all tokens are in-lexicon) |
| whole `ask()` on the 957-record tier (unoptimised prototype) | about 3.8 ms [S hist-current 8.1] | about 23 ms | <= 30 ms |
| composition + sentence selection | not measured; about 2 ms [E] | about 12 ms | <= 20 ms |
| **Worker compute per query** | about 8-10 ms | **about 50-60 ms unoptimised** | **<= 50 ms**; main-thread handler <= 10 ms |

End-to-end (Slow 4G = 1.6 Mbps, 150 ms RTT, Lighthouse mobile defaults) [E A 12.2]: page load to ready about 213 KB, about 1.3 s, non-blocking, input already enabled; first structured answer instant after ready; **first cold passage answer about 90 KB, about 2.1 s from page load**; second passage query 30-60 KB, 0.3-0.5 s; everything cached 60-150 ms; broadband cold 0.3-0.4 s. Levers if the cold path is too slow: `prefetch` T1 at idle, prefetch the `en/` bucket while the lexicon loads, ship the 300 most common index buckets inside T1, raise shard size to 32 passages (10.9 KB).

### 5.8 Hooks for the optional stages (interfaces frozen now so B and C plug in later)

Design B needs eight interfaces from A: I1 passage store `chunk_id -> {text, citation, lic}` (immutable shards), I2 `lexSearch(analysis, filters, k)`, I3 `analyze(q)`, I4 `compose(intent, entities)`, I5 gate features (coverage, unknown-token ratio, name-field hit), I6 entity/id namespace, I7 time model, I8 one Worker owning the index. B fuses by `chunk_id` and rank, so A may change analyzers without re-embedding. **Design C** reuses the same `search-core` and citation object; the function **re-runs retrieval server-side from the question** (authoritative; the client sends only question, filters and an opt-in token, never passage text) so a client cannot steer what the model sees.

---

## 6. UI / UX specification (`/historian.html`, desktop and mobile)

Answer-first, single column, 320-2560 px, portrait and landscape. It addresses `hist-current` defects UX-01..UX-18 and audit H8 (over-promising). Numbers below are acceptance criteria, not suggestions.

### 6.1 Layouts

Desktop (>= 900 px; the Sources panel docks at >= 900 px):
```
+--------------------------------------------------------------------------------------------------+
| < Back to the map                                        [Sources & filters]   [New conversation] |
| Ask the Historian                                                                                 |
| Records-only search: {N} passages from {S} sources plus {R} site records. It quotes; it does not  |
| write new text. Not an AI model.  [How it works]                                                  |
+-------------------------------------------------------------------------+------------------------+
| You: Who commanded the Iron Brigade?                                    | Sources panel (dialog, |
| +--- Answer (records) ------------------------------------------------+ | 400 px, focus-trapped, |
| | Brig. Gen. Solomon Meredith commanded the Iron Brigade (First        | | Esc closes, returns    |
| | Brigade, First Division, First Corps); he was wounded on July 1 ...  | | focus to the marker)   |
| | [Site records]                                  [See it on the map]  | |                        |
| | > What the reports say (2)   > Sources (3)   > How was this answered?| | per source: title,     |
| | Ask next: [Casualties] [Its regiments] [Where it fought] [Compare]   | | printed page, author   |
| +-----------------------------------------------------------------------+ | line, side/genre/lag   |
| [ Ask a question ...                                        ] [Ask]     | chips, licence badge,  |
+-------------------------------------------------------------------------+ View scan, Copy cite   |
```
Mobile (375 x 812; 320 x 568 is the floor):
```
+---------------------------------+
| <  Ask the Historian     [Filt 2]|  header 56 px: Back 44x44 . title . Sources & filters 44x44 (badge = active filters)
| Records-only . 21k passages .   |  capability line, max 2 lines, [How it works]
| Not AI.                         |
+---------------------------------+
| You: Who commanded the Iron Br..|
| +-- Answer ---------------------+
| | Lead sentence (16-18 px)      |
| | [Site records]                |
| | > What the reports say (2)    |  <details>, collapsed on phones
| | > Sources (3)                 |  opens a bottom sheet
| | Ask next: [Casualties]        |  chips >= 44 px tall, 8 px gaps, wrap (no hidden scroll)
| |           [Its regiments]     |
| +-------------------------------+
+---------------------------------+
| [ Ask a question ...   ] [Ask]  |  sticky bar, respects env(safe-area-inset-bottom)
+---------------------------------+
```
Landscape phone (812 x 375, 667 x 375): header collapses to a single 44 px row, the capability line becomes a disclosure, the input bar uses reduced padding, and the Sources view is a full-height dialog; the last message must never sit under the input bar.

### 6.2 Component specification

| Area | Spec (desktop and mobile unless stated) |
|---|---|
| **Header and honesty** | one `<h1>`; capability line with **computed** counts from the manifest (never hard-coded 467/24/137/30; audit H10); "How it works" panel: what is indexed (link to `/sources.html`), what is not (no rosters until P5, no per-location casualty totals, times are reported not corrected, retrospective accounts flagged), how answers are built (tables and quotations, never generated text), how to report an error, KB version and date. Copy never says "AI-style" or "search-and-synthesis" (there is no synthesis), and once external sources are indexed it must stop saying "answers only from this site's own published data"; `historian.html:48` says all three today. "Runs in your browser" stays true in Stage A and must be removed if Stage C is enabled. "How it works" sits in the same place in every state (WCAG 3.2.6) |
| **Input** | `<form role="search">` with a visible `<label for="ask">`; 16 px font (no iOS zoom; today 15 px); enabled immediately and the first question is queued while T1 loads; Enter submits; Esc order: close dialog/sheet, else clear a non-empty field, else blur; the field clears on submit **and** on chip click (today only submit clears); max 300 characters with a visible counter at 250; `enterkeyhint="send"`; `autocomplete="off"`; sticky bar height exposed as CSS variable `--bar-h` (ResizeObserver) |
| **Transcript** | `role="region"` labelled "Conversation" (not a live region); each answer is an `<article aria-label="Answer to: ...">`; a separate visually hidden `role="status"` announcer says "Answer ready. 3 sources." plus the first 120 characters of the lead; errors use `role="alert"`. Rationale: a `role="log"` with polite additions would read whole cards, so the design keeps announcements short. New answers scroll to the **start** of the answer group with `scroll-margin-top` = header height and `scroll-padding-bottom` = `--bar-h` (fixes UX-03); smooth scroll only under `prefers-reduced-motion: no-preference`; paragraphs preserved (`<p>` per paragraph, UX-02); older messages use `content-visibility: auto` |
| **Progressive rendering** | `planned` event shows a chip row "Looking in: site records . Official Records ..."; the structured lead appears with no network; evidence cards stream into pre-sized skeletons (no layout shift); "Stop" appears only after 400 ms; no auto-scroll while content arrives; later results are **appended below** what the reader is reading, never reordered |
| **Answer card** | provenance chip as text ("Site records", "Official Records", "Reported testimony"); lead at >= 16 px, line-height 1.5; <= 2 evidence cards as `<details>` (collapsed on phones, first open on desktop); "See it on the map" hidden behind the `deepLinks` flag; follow-up chips are `<button>`s >= 44 x 44 px on coarse pointers (>= 32 px on fine pointers, never below WCAG 2.5.8's 24 px) with 8 px gaps |
| **Sources drawer / sheet** | >= 900 px: side dialog 400 px; below: bottom sheet up to 90 dvh (full-screen when height < 500 px), close button (no drag required, WCAG 2.5.7), focus trap, Esc closes, focus returns to the invoking marker. Per source: title, printed page, author line, side/genre/retrospective chips, licence badge and credit line, **View scan** (IA reader link from `reader_index`), **Copy citation** (Chicago-style short form), **Report a problem** (prefilled `mailto:` with passage id and `kb_version`; the question is included only if the reader ticks a box), "Quote in context" (prev/next passages) |
| **Filters** | families (Official reports, State monument books, Participant narratives, Testimony, Newspapers, Site records) with counts; side (Union/Confederate/civilian); day + time-of-day slider driven by the time module (`aria-valuetext`, e.g. "about 4 p.m. on July 2"); "Contemporaneous only"; "Hide retrospective"; "Hide flagged language". Filters constrain candidate generation (facets on `persp`, `kind`, `time`), persist in `sessionStorage` (try/catch), and an empty result says so ("No Confederate accounts match these filters - clear filters?") instead of silently widening. On phones the filters live in a bottom sheet; toggle buttons carry `aria-pressed` |
| **Evidence table (A5)** | semantic `<table>` with `<caption>`, header cells, sortable by time or side (`aria-sort`); on <= 480 px it becomes stacked label/value cards, no horizontal scroll |
| **Deep links** | `#q=..&unit=U-20ME&clock=2T1600&f=..` (fragment only, so the question never reaches Netlify analytics or a `Referer`); `history.replaceState` per question; answer permalink `#a=<kb>:<hash>` resolves against the current KB and shows "this passage was corrected on ..." or a tombstone if redacted |
| **Feedback** | "Helpful" / "Not helpful" as text buttons, stored locally only (no network); "Report a problem" as above; no analytics on question text |
| **Errors and offline** | any shard failure shows an inline "Couldn't load the Official Records index - Retry", never an infinite loader (today a single failed fetch of 15 leaves "Loading the battle's records..." forever); with cached T1 the structured tier keeps working offline; missing passage tier -> "Only site records are available offline." |
| **Sensitive content** | `period_racial_language` passages carry a one-line note ("This excerpt is a primary source and contains language of its time.") and never appear as suggestion snippets; `graphic_injury` and `human_remains` collapse behind "Show excerpt"; `contested` shows an "Accounts differ" header |
| **First run and empty state** | six example chips, each tested canonical-first in the pinned list: `20th Maine`; `Who commanded the Iron Brigade?`; `What did Chamberlain report about Little Round Top?`; `What time did Pickett's Charge start?`; `Which brigades were in Pickett's division?`; `Was my ancestor at Gettysburg?` |
| **Entry points** | primary nav link on every page; "Ask about this unit" on `regiment.html` (`/historian#unit=U-20ME`); `search.html` shares `search-core` and links here; the in-map entry sits behind the `deepLinks` flag until the app reads the parameters (app-bugs-05) and the source problem (N1) is solved |
| **Visual system** | site design tokens (colour, spacing, type scale) shared with the rest of the A+ plan; light and dark via `prefers-color-scheme`; `color-scheme` meta; forced-colors friendly; no colour-only meaning |

### 6.3 Accessibility (WCAG 2.2 AA everywhere, AAA where cheap)

Text contrast >= 4.5:1 (aim 7:1 for answer text, AAA) and control/border contrast >= 3:1 (the input boundary is 1.20:1 today [S hist-current UX-07]); visible focus ring >= 3:1, never hidden by the sticky bar (2.4.11); targets as above (2.5.8); no dragging required (2.5.7); consistent help location (3.2.6); no redundant entry (3.3.7); reflow at 320 CSS px without horizontal scroll and text-spacing overrides tolerated (1.4.10, 1.4.12); body >= 16 px, secondary >= 14 px, nothing below 12 px (today 11-12 px in places); landmarks (header, main, `form role=search`, dialog for sources); a skip link; keyboard: Enter, Esc, Tab order follows visual order; quotations in `<blockquote cite>`; tables with headers; reduced motion honoured everywhere; no orientation lock (the PWA manifest locks landscape today, audit E1). Automated: axe-core 0 serious/critical in CI; manual: one NVDA + one VoiceOver (iOS) + one TalkBack pass at each phase exit.

### 6.4 Performance of the page (CWV and Lighthouse)

| Budget | Value | Basis |
|---|---|---|
| Bytes added to first paint of any page | **0** | lazy tiers |
| `/historian` shell (HTML + inline critical CSS + module) | <= 45 KB br | HTML about 11 KB today [C] + module about 30 KB [E] |
| T1 | <= 250 KB br, loaded after first paint, in the Worker | 213 KB measured/modelled |
| LCP element | the `h1` / capability text (no images) | text LCP |
| LCP / CLS / INP on `/historian` | **<= 1.5 s / <= 0.05 / <= 200 ms (lab target <= 150 ms)** | lab replica today: perf 100, LCP 1.2 s, CLS 0.056 with 15 JSON fetches [S hist-current verif. 30]; the CLS culprit is the `#gtbg-nav-mount`/footer without reserved height |
| TBT (4x CPU) | <= 100 ms | [S perf-runtime-33] |
| Lighthouse mobile and desktop, all four categories | **>= 95**, with the full KB present | audit P7 bar |
| RUM p75 (Netlify) | LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1, FCP <= 1.8 s, TTFB <= 800 ms | BRIEF green thresholds |
| Main-thread input handler | <= 10 ms; no task > 50 ms | INP |
| Worker memory | <= 48 MB resident (decoded postings LRU <= 16 MB, text LRU <= 16 MB, T1 about 12 MB) [E] | |

`/hx/f/` is `Disallow`ed in `robots.txt`; `/historian` and `/historian.html` resolve to one canonical URL (audit T3). SEO value comes from the static unit pages and reviewed answers, not from the JS-driven search.

### 6.5 Optional-stage UI (only if the gates open)

- **Stage B "Deep search" (opt-in):** never auto-prompted, never on Save-Data/2g/3g, never a modal; states off -> prompt -> checking (storage estimate must be >= 1.3x total, `persist()` request, capability probe) -> downloading (`<progress>` with text, cancel, resumable, `aria-live` at 25/50/75/100 %) -> verifying -> warming (ORT init in an idle callback) -> on -> evicted/updated/error. Copy: "Deep search (optional). Understands what you mean, not just the words you type. One-time download about 40 MB; works offline; your questions never leave your device." Safari copy: "may be removed after about a week without a visit; Add to Home Screen keeps it longer". Results refine **append-only** ("More sources found with deep search (n)").
- **Stage C "Explain these sources (AI, beta)":** a per-answer button under the records answer; the records answer renders first and stays the fallback; first use shows an inline (non-blocking) notice: "AI answers send your question and a few source passages to Anthropic's Claude to write the answer. Nothing else about you is sent. You can stay on Records only at any time." Badges "AI-written from cited sources" / "Assembled from the records (no AI)" / "Reviewed answer"; states ON / SHED / STATIC / RECOVER with a status pill; streaming card uses `aria-busy` and announces on completion.

### 6.6 UI acceptance matrix

Playwright at 320x568, 375x812, 390x844, 412x915, 768x1024, 1024x768, 1440x900, 1920x1080, 2560x1440, and landscape 812x375 and 667x375: no horizontal scroll; last answer never covered by the input bar (qa-ci HC-12); no clipped or overlapping UI; every interactive target passes the size rule; axe clean; console silent; Lighthouse >= 95 (mobile and desktop) per 6.4; 100-query scripted INP session <= 200 ms p75; keyboard-only run of all flows; screen-reader passes per 6.3. Verify separately that the site-wide floating "Ask the Historian / Extra Features" overlay (audit H1, home page) does not appear on or collide with this page [U: not checked here].

---

## 7. Evaluation gates and the golden set

### 7.1 Golden sets (one yardstick, two files)

**Golden-Core (GQ-001..GQ-150, `hist-golden-set.json` v1.0.0)** [V: counts re-computed here]: 17 categories; **113 answerable now** (25 of them pure behaviour probes: decline, refuse, clarify) and **37 needing expansion or the canonical time model**; split **100 dev / 50 locked** (locked chosen by hash of the question); phases H1 40 / H2 83 / H3 27; `expected_behavior`: answer 78, answer_with_caveat 45, clarify 7, decline 5, decline_with_pointer 5, correct_premise 4, refuse_injection 3, limitation_statement 2, route 1; 349 machine-verified anchors (a deliberate mutation of the 20th Maine strength is caught with exit code 2); 31 items encode known data conflicts (20 tagged `clock-conflict`, 18 with `must_not_match` on the known-wrong clock label, e.g. Longstreet 7:30am, Pickett's Charge 11:05am); 19 items are shape-only and cannot lock until a historian fills them; 0 exact overlaps with the 175-query batteries. Baselines: **null 6.0 %, deployed page B0 14.0 %, unshipped prototype B3 29.3 %, oracle 100 %** [M hist-eval 7].

**Golden-Passage (GP-001.., `eval/gold.passage.jsonl`, new)**: the retrieval yardstick the current sets lack (the 175 batteries hold 0 passage-gold questions). Built in P2, extended in P4:

| Slice | n at P2 | n at P4 | What it measures | Seeds |
|---|---|---|---|---|
| P passage recall (single-passage gold, S/K/P registers) | 45 | 60 | recall@k, MRR, nDCG@10, the vocabulary gap | B's 33 information needs (BM25 recall@5 100 % on source-wording, 66.7 % on keywords, 27.3 % on plain questions, single author with gold in view = upper bound) + 12 new; the 25-question retrieval gold set of hs1-16 |
| C conceptual / why / compare (multi-passage, graded) | 25 | 40 | nDCG@10, citation precision, contested handling | A categories D/E, C's seeds, the 13-question matrix of hs2 section 6, the ~60 seo-growth-23 authored questions |
| T time-anchored | 15 | 20 | reported-time correctness, anchor recall | `time-facts-anchors.csv`, hs1-06 |
| X contested / perspective | 10 | 15 | both-sides presence, disclosure line | `contested.yaml` |
| R refusal / no-direct-data / adjacent | 10 | 20 | decline precision and recall | Antietam, Vicksburg, causes of the war, weather, roster honesty |
| **Total GP** | **about 105** | **about 155** | | |

Combined with GQ this is **about 255 questions at P2 and about 305 at P4** (qa-ci HC-06 asks for >= 200). Splits: GQ as above; GP 70 % dev / 30 % held-out, with 15 held-out questions retired into dev and replaced by newly written ones each phase; the locked GQ split is re-cut at each MINOR version (hist-eval 5.5). **Labelling protocol** (fixes the pilot's weaknesses [S B 12.2]): pool the top 20 from at least three systems (plain BM25, A hybrid, A + T0+); grades 0-3 (relevant = grade >= 2); two annotators on >= 30 % of items, Cohen's kappa >= 0.6; authors write registers from a topic list (the OR table of contents) without seeing the target passage; print `judged@10`. **Amplifiers** (typo variants x5 per entity query, paraphrase templates x3 per fact question, ordinal/state forms x4 per unit) lift every gated percentage to n >= 100; they are `generated: true`, 20 % human-sampled, never in a locked split. A **40-query pinned must-pass list** (every chip, the placeholder, all flagship queries) fails CI on any regression. **Forbidden-string list** applied to every answer: `undefined`, `null`, `NaN`, ` -- `, raw ids (`\b[UC]-[IVX0-9A-Z-]+\b`, `\b(CS|US)-\d{3}\b`), `site clock`, the known-wrong legacy clock labels, every V05 developer-note term. Governance: never edit an expected answer to make a system pass; a data change that trips `verify-golden.js` (exit 2) blocks the merge until each named item is re-reviewed; changelog per `golden-vMAJOR.MINOR.PATCH`.

**Golden-Passage record** (extends the GQ field dictionary of `hist-eval` 1.2; GQ files are not changed):
```jsonc
{ "id": "GP-017", "slice": "P", "split": "dev", "answerability": "exact|derivable|evidence-only|no-direct-data|out-of-scope",
  "registers": {"S": "...", "K": "...", "P": "plain-language question written without seeing the target passage"},
  "expect": "answer|partial|decline|route|clarify",
  "gold_passages": [{"id": "or27-2:0379#....", "grade": 3, "span": [0, 412]}, {"id": "...", "grade": 2}],
  "gold_entities": ["U-20ME"], "gold_facts": [{"table": "stats", "row": "U-20ME", "field": "casualties", "value": 130}],
  "must": ["regex"], "forbid": ["regex"], "needs_sides": ["union", "confederate"], "min_sources": 2, "time_window": null,
  "pinned": false, "generated": false, "truth_basis": "source_verified|shape_only",
  "annotators": ["ML", "VOL1"], "judged_pool": ["bm25", "hybrid", "hybrid+t0"], "corpus_min": "1.4.0", "added_in": "gold-passage-1.0.0", "notes": "" }
```

### 7.2 Metrics

`pass` (correct AND behaviour ok AND no hard defect AND grounded if a citation is required); `crit_recall`; `hit@5` and `MRR@10` on record ids; **passage recall@k / MRR@10 / nDCG@5** on GP; `S@1`, `canonical@1/@3`, `fact@3`, `factTop`, `typo S@1` (definitions as `hist-current` 3.3); `citation precision` (100-answer human audit; automated proxy: the quote overlaps >= 60 % of the claim's content tokens); `quote fidelity` (100 % by construction, verified by V03 and Playwright); `faithfulness` (I1 share = 100 % required, plus selection accuracy by the rater); `correct decline`, `false decline`, `abstain precision/recall`; `clock-clean` (the 20 conflict items); `clarify`, `hedge`, `readability` (Flesch-Kincaid caps on the 7 student items); `defect rate` and mean initial characters; latency p50/p95, bytes per query, INP.

### 7.3 Gates by phase (Wilson 95 % lower bound; a percentage is gated only at n >= 100 including amplifiers)

P1a = `hist-current` H1 on the same records; P1 exit = its H2 scope. `hist-eval` H1/H2/H3 subsets are the Golden-Core columns. **Honesty note:** the B3 prototype reached the H2 numbers only in-sample (held-out S@1 88.5, canonical@1 81.8, correct decline 40.0, n = 5) [S hist-current 4.1]; if P1 misses a gate the exit is **re-baselined explicitly in the eval report, never silently**. The 9 `requires_time_model` GQ items are reported separately at P1 and become gating at P2, once anchors exist or the time module has landed.

| Gate | P1a | P1 exit | P2 exit | P3 exit | P4 exit | A+ target |
|---|---|---|---|---|---|---|
| **Always:** injection / XSS / leak resistance | 100 % | 100 % | 100 % | 100 % | 100 % | 100 % |
| **Always:** forbidden content · hard render defects · hallucinated citations · quote fidelity | 0 · 0 · 0 · - | 0 · 0 · 0 · 100 % | same | same | same | same |
| Unsupported claims in the 100-answer audit | - | - | 0 | - | 0 | 0 |
| GQ subset pass · critical recall | H1: >= 70 % · >= 90 % | H1+H2 (123 items): >= 85 % · >= 93 % | same | same | all >= 90 %, locked >= 90 % | all >= 95 %, locked >= 93 % |
| S@1 primary / held-out (175 batteries) | >= 88 / >= 80 | >= 93 / >= 90 | same | >= 94 / >= 91 | >= 95 / >= 92 | >= 95 / >= 93 |
| canonical@1 | >= 90 | >= 92 | >= 92 | >= 93 | >= 95 | >= 95 |
| fact@3 · factTop | >= 60 · >= 50 | >= 90 · >= 85 | same | same | >= 92 · >= 88 | >= 92 · >= 88 |
| correct decline · false refusal | >= 85 · <= 8 | >= 92 · <= 5 | same | same | >= 94 · <= 4 | >= 95 · <= 3 |
| typo S@1 (generated) | >= 85 | >= 88 | >= 88 | >= 88 | >= 90 | >= 90 |
| relational / aggregate set (n >= 25) | - | >= 80 | >= 80 | >= 80 | >= 85 | >= 90 |
| hit@5 (record ids) · MRR@10 | - | >= 0.90 · >= 0.70 | same | same | same | same |
| abstain precision / recall · clarify · hedge · readability | - | >= 0.95 / 0.90 · >= 85 · >= 90 · >= 85 | same | same | same | same |
| clock-clean on conflict items | - | held (labels withheld) | >= 95 % | >= 95 % | >= 95 % | >= 95 % |
| **passage recall@5 (GP, held-out)** | - | - | **>= 0.80** | >= 0.80 | >= 0.85 | >= 0.90 |
| **citation precision (100-answer audit)** | - | - | **>= 0.90** | - | >= 0.92 | >= 0.95 |
| contested questions return >= 2 sides or the disclosure line | - | - | - | - | >= 90 % | >= 95 % |
| coverage: OOB regiments with >= 1 reviewed passage (Confederate) | - | - | >= 60 % [D] | >= 85 % | >= 90 % (>= 75 %) | >= 90 % (>= 80 %) |
| time evidence: anchors · events covered | - | - | >= 1,500 · 137/137 or marked | same | >= 3,000 target | same |
| defect rate · mean initial characters | 0 % · <= 700 | 0 % · <= 600 | 0 % · <= 600 | 0 % · <= 600 | 0 % · <= 500 | 0 % · <= 500 |
| worker p95 compute (6x throttle) | <= 60 ms | <= 60 ms | <= 50 ms | <= 50 ms | <= 50 ms | <= 50 ms |
| cold first answer (Slow 4G) · cold passage query bytes | <= 2.5 s · - | <= 2.5 s · - | <= 2.0 s · <= 120 KB | same | same | same |
| Lighthouse `/historian` mobile and desktop (4 categories) · CLS · LCP | >= 95 · <= 0.05 · <= 1.5 s | same | same | same | same | same |

Sources of the numbers above: the P1a, P1 exit, P2, P4 and A+ columns for the battery metrics are Design A's 10.6 (identical to `hist-current` 9.2 at H1/H2); `hist-eval` 6 supplies the always-gates, the H1/H2/H3 subset and A+ pass rates; the **P3 column is interpolated between P2 and P4** [D]; the coverage and anchor rows are set here [D]. All thresholds are proposals for the owner and the historian to confirm.

### 7.4 Statistical and regression rules

Gate on the **Wilson lower bound** and on the pinned list; one-query flips in groups under 20 (typo n = 9, decline n = 17) are reported but fail CI only if the pinned list is touched; **regression tolerance 2 points** on any tracked metric versus the ratcheted baseline in `eval/baselines/main.json` (updated only by the merge job when every gate is green). System comparisons use a paired bootstrap (10,000 resamples) with 95 % CIs. **Power reality [S B 12.6]:** at about 95 non-entity dev questions and 0.3-0.4 discordance, CIs are about +/- 11-13 points, so a +10 gate is detectable and **+5 wins are not**: do not claim them and do not tune on them. Every fixed bug and every real "Report a problem" becomes a GQ/GP item; retire an item only with a written reason.

### 7.5 Human audits, device protocol, CI

- **100-answer audit at P2, P4 and A+** by the owner and the named historian: supported (Y/N), citation supports claim (Y/N), perspective label correct, anything a specialist would call misleading. **Unsupported claims must be 0**; any finding becomes a regression item. Rubric axes 0-3 (accuracy, completeness, sourcing, calibration, voice, safety); PASS needs no axis below 2 and accuracy 3 on verified items; two reviewers, weighted kappa >= 0.60. Per release: read every locked failure, score 40 auto-passes and 20 auto-fails (auto-pass precision >= 95 %, false-fail <= 15 %).
- **Latency protocol:** Playwright + CDP, CPU 4x and 6x, Slow 4G (1.6 Mbps, 150 ms RTT), cold vs warm, 100-query script with `web-vitals` INP; plus **at least one real mid-tier Android (about 2020-22, 4 GB) before the P2 gate (spike S-3)**.
- **CI:** T1 every push (<= 6 min): `verify-golden.js` -> `run-system.js` -> `score-golden.js --phase Hx --baseline main.json`, plus the schema/validator/determinism/tier gate and the 175-query battery; T2 on Deploy Preview: Playwright through the real UI (8 adversarial + 12 random answer items, overlap check at 320-430, cold first query on the Lighthouse mobile profile, axe); T3 nightly: both splits, the previous release's index against the current golden set (HC-15), weekly catalog link check. Netlify gate: green `ci` is a required status on the production branch; if the owner still deploys by zip, the pre-deploy script runs `npm run eval:golden` and refuses to zip on a non-zero exit. Golden files stay out of the published output.

### 7.6 Decision-gate metrics (recap of 1.6)

G-A2 on GP held-out: passage recall@5 >= 0.80, citation precision >= 0.90. G-X.1 paraphrase-slice recall@5 >= 0.80 -> freeze. G-X.2 reranker: +8 points, p95 <= 150 ms, INP <= 200 ms; B0: +10 points on >= 60 items, CI excludes 0. G-X.3 / G-C-GA: supported >= 97 %, citation precision >= 95 %, unsupported numerals 0, adversarial 100 %, over-refusal <= 8 %, first visible checked claim p95 <= 5.5 s.

---

## 8. Costs and budgets

### 8.1 Runtime budgets (Stage A)

| Budget | Value |
|---|---|
| Bytes added to first paint of any page | 0 |
| Shell / T1 / cold passage query | <= 45 KB / <= 250 KB / <= 120 KB (4 index buckets x 12 KB + entity bucket + 5 text shards x 7.7 KB about 90 KB [E]) |
| Total lazy corpus | <= 40 MB br cap; **projected 13-17 MB at 22-29 k passages** [C: index 2.4-3.1 + text 10.6-14 + T1 0.25] |
| Full opt-in offline pack (P5) | about 13-17 MB [C]; costs about 0.3 credit per download (20 credits/GB), disabled under `saveData` |
| Worker compute p95 (6x throttle) / main-thread handler | <= 50 ms / <= 10 ms |
| Worker memory | <= 48 MB |
| Files in the deploy at 22-29 k passages | about 1.6-2.1 k (Git/CLI deploy required; limits [U] until spike S-2) |

### 8.2 Netlify bandwidth and requests (credit plans; **plan itself unverified**, 20 credits/GB, 2 credits per 10 k requests, 15 credits per production deploy, Free = 300 credits with a hard limit [S infra-netlify-30])

Assumption per Historian session using the passage tier: about 0.35 MB (T1 0.21 MB + about 1.5 passage queries x 0.09 MB) and about 25 requests; repeat visits within a KB version cost about 0 (immutable). Four deploys a month = 60 credits.

| Historian sessions / month | GB | Bandwidth credits | Request credits | Total incl. 4 deploys |
|---|---|---|---|---|
| 300 | 0.10 | 2 | 1.5 | about 64 |
| 1,500 (about every current visitor once) | 0.51 | 10 | 7.5 | about 78 |
| 3,000 | 1.03 | 21 | 15 | about 96 |
| 15,000 | 5.1 | 103 | 75 | about 238 |
| 60,000 | 20.5 | 410 | 300 | about 770 |

Arithmetic re-checked here [C]. For reference the whole site moved 328 MB in 30 days (about 6.6 credits) [S]. At >= 15,000 sessions/month a Free plan is at risk: verify the plan before any SEO push. Levers: lighter T1, `/hx/f/*` on a free-egress host (adds a `connect-src` origin; terms [U]). Deploys are the realistic burner (20 = 300 credits), hence weekly batching.

### 8.3 Build-time cash

| Item | Cost |
|---|---|
| Compute, CI minutes, downloads (about 21.6 MB for the 7 measured sources; about 75 MB raw P0 volume) | $0 |
| LLM assist: link proposals over about 26 k chunks (Batch API, Haiku 4.5 / Sonnet 5.5) | about $17-34 [S C 4.5] |
| LLM assist: T0+ expansions, about 30 k chunks | about $14-27 [C] |
| **Total expected / cap** | **about $31-61 / $75** [D] |
| Optional permission fees (NHHS Bachelder images, about 10 requests) | about $250-500 [S hs1] |
| Model bake-off, only if Stage C: Opus 450 + Sonnet 900 + Haiku 450 answers + judge | about $60 [S C 12.6] |

### 8.4 People time (reviewer hours; my aggregation [C/E])

| Phase | Hours | What |
|---|---|---|
| P1 | 2-4 | site-data fact checks, alias review |
| P2 | 14-24 | OR link queue 8-15 [S A], time anchors 4-6, first 100-passage audit 2-3 |
| P3 | 6-10 | NY/PA/Fox link queue, casualty reconciliation |
| P4 | 15-24 | voices queue 10-16, historian sign-off of `contested.yaml` 5-8 |
| Audits (P2, P4, A+) | 12-18 | 100-answer audits, 4-6 h each |
| Golden-Passage labelling | 10-15 | pooled judging, second annotator on 30 % |
| **Total (P1-P4, audits, labelling)** | **59-95 h** | about 3-4 h/week; the P5 base adds 4-8 h |

### 8.5 Optional tiers

| Tier | Effort | Bytes / cost | Latency |
|---|---|---|---|
| B0 spike | 4 d | none | - |
| B-lite reranker (<= 8 MB) | 1-2 d experiment [E] | 33 opt-in users x 8 MB = 0.26 GB about 5 credits/month [C] | p95 <= 150 ms Moto-G class (gate) |
| B "Deep search" | B's own 20-25 d includes about 6-8 d of corpus work that A already does; **about 15-19 d after A** [C/E] | about 27 MB runtime (model 22.97 MB + ORT wasm 3.07 MB br) + 13-21 MB vectors = **about 40-48 MB one-time, opt-in** [S B]; at today's about 110 Historian views/30 d and 30 % opt-in = 33 users = 1.3 GB about 26 credits/month; at 10x traffic about 264 credits (88 % of Free); one abusive scraper (100 downloads) about 80 credits; iOS evicts after 7 days without interaction | warm query p95 <= 250 ms desktop / <= 700 ms mid phone; enable <= 30 s at 10 Mbps; ORT init <= 3 s / <= 8 s [E targets] |
| C-lite | **15-29 d [E]** (R0 1-2 d; function, PoW, budgets, breaker, kill switch, D1-D10 checks, consent and privacy rewrite, UI, gates) | per AI answer: Opus 5.5 $0.0235 (warm cache) / $0.0326 (no cache) / $0.0422 (1-hour write); Sonnet 5.5 $0.0120 / $0.0163 / $0.0211; Haiku 4.5 $0.0081 [S C 14.2]. Monthly base scenario Opus / Sonnet: 1 k queries $14 / $7, 10 k $100 / $53, 100 k $840 / $440; unprotected bound $35 / $350 / $3,500. Caps: **$25/month, $2/day, Anthropic workspace cap $30**, shed at 80 %, static at 100 %. Prompt cache: none below about 300 LLM calls/month, 1-hour TTL above. Recurring floor is independent of traffic: evals $30-60/month + canary about $10/month [S C 14.5], which exceeds serving cost at about 110 Historian views/month; so run generation evals only on release candidates ($7 per 150-question pass, about $21 for 3 runs) and expect **about $12-25/month at today's traffic** [E] | provider first token p50 <= 2.2 s / p95 <= 4.5 s; **first visible checked claim p50 <= 2.8 s / p95 <= 5.5 s**; full answer p50 <= 8 s / p95 <= 14 s; abort at 45 s (platform limit 60 s); deterministic routes <= 80 ms; curated/cached <= 250 ms |

Function compute is 10 credits per GB-hour and requests 2 credits per 10 k [S]; a bot flood on `/api/ask` could exhaust **Netlify credits** even while the Anthropic cap holds, and on a Free plan the 300-credit limit pauses the whole site (inference, section 10.3). Netlify `rateLimit` (2 code rules on Free/Personal), a self-hosted proof-of-work challenge (ALTCHA-style, MIT) and hashed-IP buckets are the mitigation; none of this exists in Stage A.

---

## 9. Six-phase timeline

Effort scale S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d; person-day figures are [E]; review hours are separate (8.4).

| Phase | Scope (work items in Appendix A) | Effort | Review | Exit gate | Visitor sees |
|---|---|---|---|---|---|
| **P0 Foundations and unblockers** | git repo + `sources.yaml` + tier gate + `may_send_to_llm` + retro-audit (hf-01); H0 hotfix (hf-02); SW patch, `/hx/` headers, CSP class (hf-03); Netlify plan/credit check and weekly-deploy policy (hf-04); spikes S-1, S-2, S-4 now, S-3 when a phone is available (hf-05); fetch + OCR normaliser (hf-06); crosswalk seed for 570 units (hf-07); validator/determinism (hf-08); eval harness with GQ + batteries + forbidden strings (hf-09) | **7-10 d** | 0 | 570/570 ids resolved or in `unmatched.csv`; OR27-1 No. 196 normalises and page-links correctly; CI green on an empty KB; spikes recorded with decisions | the H0 fix: no `undefined`, no raw ids, chronology visible |
| **P1 Records engine on the site's data** | `search-core` (hf-10), facts + authority (hf-11), composers A1-A4/A6/A10-A14 (hf-12), UI v2 (hf-13), emit T1 (hf-14), `search.html` on the shared engine (hf-15), security (hf-16), governance one-liners (hf-38), time adapter (hf-39), deep-link flag (hf-40) | **10-14 d** (`hist-current` H1 3-4 d + H2 3-5 d + UI/a11y/SW 4-5 d) | 2-4 h | **G-A1** (7.3, P1a then P1 exit); Lighthouse >= 95; zero forbidden strings over all 957+ rendered cards | first visible win in about 2-3 focused weeks: an answer-first Historian that works on today's data, honest copy, brigade/battery/succession/army questions answered, correct declines |
| **P2 Official Records backbone + build-time grafts** | OR segmenters incl. dispatches (hf-17), classifier/chunker/dedupe (hf-18), linkers + labelled set (hf-19), time anchors + evidence tables (hf-20), review tool (hf-21), passage engine + emit T2 (hf-22), composers A5/A7/A8 (hf-23), **T0+ expansion and LLM link proposals (hf-24, +2-4 d)**, Golden-Passage + audit #1 (hf-25), G-X report (hf-26) | **10-16 d** (A's 8-12 + grafts) | 14-24 h | **G-A2 and G-X** (1.6, 7.3); 5 sampled citations per source open the right scan page; cold query <= 120 KB | page-cited Official Records answers; time-evidence tables for the 137 events (audit C4 deliverable) |
| **P3 State books, Fox and casualty facts, unit pages** | NYFR x3, PA 1914, ME/NJ/MI/MN, Fox + Guild -> `casualty_sources` + reconciliation (hf-27); static indexable unit/place pages (hf-28) | **8-13 d** | 6-10 h | P3 column; >= 90 % of NY + PA units have >= 1 narrative passage; reconciliation report | regiment "History" panels; PD-derived casualty numbers; search-indexable unit pages (audit T1) |
| **P4 Voices, perspective, filters, reviewed answers** | B&L, JCCW, SHSP shortlist, memoirs + tags (hf-29); contested registry and balance rule (hf-30); filters, evidence-table and sources-drawer UI (hf-31); ~60 reviewed answers (hf-32, effort mostly in seo-growth-23; Historian side about 1 d); audit #2 + GP refresh (hf-33); part of W4b | **9-15 d** | 15-24 h (+ audits) | P4 column; every narrative passage has perspective + lag; >= 90 % coverage KPI | participant and testimony voices with side/genre/lag chips; contested topics shown with all indexed sides |
| **P5 Gated extras and optional tiers** | rosters if NPS confirms (hf-35, XL, blocked); LoC photos, OSM monument validation, weather source hunt, civilians/press, offline pack (hf-34); reranker experiment / B0 (hf-36); C-lite (hf-37) | **base 8-14 d**; optional B0 4 d; optional C-lite 15-29 d | 4-8 h | go/no-go recorded with numbers; roster query fetches <= 4 shards and INP < 200 ms if built | depends on gates |
| **Continuous** | governance, errata page, changelog, link checks, eval refresh each phase, corrections SLA | **5-8 d** | in phases | corrections SLA met; held-out refreshed | - |
| **Totals** | | **core (P0-P4 + continuous) 49-76 d; with P5 base 57-90 d** | **59-95 h** (+ 4-8 h in P5) | | |

### 9.1 Critical path and parallel work

P0 (registry + crosswalk + OCR normaliser) -> P1 (`search-core` + facts + UI) -> P2 (OR segmenters + linker + review) -> everything else. External waits run in parallel: the NPS/GNMP/ACHS replies, the Netlify plan confirmation, the volunteer historian, the real phone. The time model (app-time / pages-B) is **not** on this critical path: the Historian stores 1863 clock minutes and holds legacy labels until the module lands. `seo-growth-23` (the 60 authored Q&A) can start after G-A1.

### 9.2 What is deliberately not in these numbers

The time-model implementation and re-timing (app-time), the casualty reconciliation beyond the Historian's own facts (data-integrity DI-03), the site-wide SW rewrite beyond the 3-line patch (audit C6), CSP enforcement site-wide (audit X3), the app bundle source (N1), and authoring the 60 Q&A pages (seo-growth-23).

### 9.3 Calendar conversion (recomputed; corrects Design A's "4-6 months at 15 h/week")

| Scenario | Person-days | 15 h/week (1.9 d/wk) | 30 h/week (3.75 d/wk) | 40 h/week (5 d/wk) |
|---|---|---|---|---|
| Core P0-P4 + continuous | 49-76 | 26-40 weeks (about 6-9 months) | 13-20 weeks | 10-15 weeks |
| With P5 base | 57-90 | 30-48 weeks | 15-24 weeks | 11-18 weeks |
| Plus C-lite | +15-29 | +8-15 weeks | +4-8 weeks | +3-6 weeks |

Reviewer hours (59-95 h) fit inside the same calendar at 3-4 h/week only if the historian reviewer exists; without one, P4 stalls.

### 9.4 Stop rules

Each phase ships value alone and can be the stopping point. Stop B at G-B0 failure. Do not ship C-lite if any G-C-GA gate misses. If the review backlog exceeds 14 days, freeze ingestion. If bandwidth passes 25 % of monthly credits, move heavy blobs off Netlify or trip the manifest kill switch.

---

## 10. Risks, decisions and traceability

### 10.1 Risk register (L = likelihood, I = impact; H/M/L)

| # | Risk | L | I | Mitigation | Early indicator |
|---|---|---|---|---|---|
| 1 | **Rights contamination**: Tier B/C text or a reprint enters the index; 18 shipped monument coordinates already derive from Stone Sentinels (8), HMDB (4), Wikipedia (6) | M | H | curated allow-list + CI tier gate; retro-audit as `legacy` rows; `/sources.html`; `may_send_to_llm`; ABT/Ancestry hosts grep-banned; counsel review of Busey & Martin-derived figures | tier-gate failure; unexplained new `source_id` |
| 2 | Numbers have no single authority (4 casualty totals per side; Confederate strength has no PD regimental source; 88 of 103 batteries templated) | H | M | facts-only rows with `auth/edition/page`; range wording (I7); PD reconciliation (OR returns > Fox > Dyer) | an answer shows two different totals |
| 3 | **Unit-link false positives** (naive linker wrong 7/22; 15 arm collisions; OCR-broken ordinals; Virginia side ambiguity) | H | H | grammar linker + arm agreement + confidence A-D; only A/B become `subject`; 200-mention labelled set; review queue; "passages that mention ..." wording | labelled precision < 0.95; queue backlog growth |
| 4 | OCR errors in quoted text or numbers (Fox `(5,024`, `30S`; Guild column scrambling) | M | H | OCR gate 0.90/0.80; numbers never auto-edited; table checksums; scan link on every quote | citation-precision audit < 0.90 |
| 5 | **Contested topics and Lost Cause framing shown as fact** (SHSP, memoirs) | M | H | mandatory perspective tags; contested registry + balance rule I6; historian sign-off; chips show side/genre/lag | audit flags a one-sided answer |
| 6 | **Clock (C4) unresolved**: legacy labels wrong; tick arithmetic invalid (0.8-42.3 min/tick) | H | H | store 1863 `clock_min`; hold map-clock labels; testimony statistics; forbidden-string tests | any legacy clock string in eval |
| 7 | **Vocabulary gap**: plain questions vs 19th-century prose (BM25 recall@5 27 % on plain phrasing in B's pilot, an upper bound) | M | M | derived aliases, T0+, concept lexicon; gated reranker; G-X | paraphrase-slice recall@5 < 0.80 |
| 8 | Low-end phone: CPU, memory, Worker start, SW quota (phone numbers are a x6 model) | M | M | Worker, LRU caps, 6x throttle gates, real Android in S-3, `saveData` respected | INP > 200 ms in the scripted session |
| 9 | **Netlify constraints**: file-count/deploy limits [U], `.bin` not compressed [U], plan and credits [U], drag-and-drop fragility | M | M-H | spikes S-1/S-2; packs-with-Range or gzip + `DecompressionStream` fallbacks; Git/CLI deploys; weekly batching; 70 % credit alert | spike failure; credit alert |
| 10 | **Service-worker skew and purge**: `sw.js:28` deletes every non-current cache; C6 forced reload | M | H | 3-line patch in P0; manifest + hashes; prompt-based updates; test that a `CACHE_NAME` bump keeps `hx-*` | users on mixed KB versions |
| 11 | **Solo capacity**: review queue and corrections are unbounded | H | M | time-boxed 3-4 h/week; confidence valves; deterministic pipeline; phase gates that can stop at any tier; 14-day backlog freeze | queue older than 2 weeks |
| 12 | Eval overfitting / small n (per-category n = 7-12; single-author synthetic questions) | M | M | held-out refresh, amplifiers to n >= 100, Wilson bounds, pinned list, human audit | dev-vs-held-out gap > 8 points |
| 13 | Refusal calibration drifts as data grows (canonical@1 91.4 -> 87.9, decline 94.1 -> 88.2 after +299 records) | M | M | abstention curves archived; separate false-refusal metric; re-tune at each phase | false refusal > 5 % |
| 14 | **N1: no app source**; map deep links and in-app search are blocked | H | M | standalone page first; `deepLinks` flag; in-app panel out of scope | app-bugs-05 not landed |
| 15 | XSS/injection via corpus or query echo | L | H | `textContent` only; enforced CSP; Trusted Types report-only; adversarial items in GQ/GP | CSP reports; eval failures |
| 16 | Privacy creep (logging, feedback, question in URL) | L | M | default none; hash deep links; feedback `mailto:` opt-in; any new network call from `/historian` fails CI | new request in the network-log test |
| 17 | Entity-id drift between registry, OOB data and KB | M | M | `alias_for` for two majors; V04; crosswalk unit tests | unresolved-id count > 0 |
| 18 | Source hosts change (IA formats, LoC 403s, rate limits) | M | L | raw cache + lockfile; polite fetcher; fetching is build-time only | fetch failures |
| 19 | Over-promising copy ("Historian", "AI-style") | M | M | capability panel, computed counts, claims test (qa-ci HC-13) | copy review |
| 20 | Accessibility of long quotations and tables | L | M | semantic markup, stacked mobile tables, axe CI, manual screen-reader pass | axe regressions |
| 21 | **Sunk cost on Stage B** (ceiling 3.4 points on today's battery; about 33 opt-in users/month; 40 MB download; iOS eviction) | M | M | B0 kill rule; T0+ is the fallback; only after G-X.2 | B0 CI includes 0 |
| 22 | **Stage C blast radius and promise change** (privacy page says no personal information; Netlify credit exhaustion pauses a Free site; provider dependency; sampling variance) | M | H | opt-in per click; rewrite privacy/Terms/banner first; caps and kill switch; static fallback; confirm plan; R0 spike | any G-C-GA gate miss |
| 23 | Calendar slip from mis-stated arithmetic (Design A's "4-6 months") | M | L | use 9.3 | phase overrun > 25 % |
| 24 | Golden-set drift: two files, two 150s, phase names H1-H3 vs P0-P5 | M | M | single owner; gate file `gates.json`; changelog; 7.1 mapping | conflicting CI verdicts |

### 10.2 Further owner decisions (defaults in bold)

11. Keep the name "Ask the Historian" with the honest capability panel: **yes** (audit H8 concerns the copy, not the name).
12. Scope of adjacent topics (Antietam, causes of the war): **decline with a pointer** (widen only by owner decision; two golden items are tagged `scope_policy_review`).
13. Sensitive-content policy: **quote period language faithfully with a note; never in suggestions; user can hide flagged records.**
14. Real mid-tier Android available for spike S-3 and the P2 latency gate?
15. Tier B (Wikipedia/OSM) stays out of any vector index permanently: **yes**.
16. If Stage C is ever built: model policy (Opus 5.5 low effort as reference; Sonnet 5.5 / Haiku 4.5 per route only if faithfulness >= 98 % and within 1 point), caps ($25/month, $2/day, workspace $30), provider path (**direct Anthropic API with own key in a dedicated workspace**, not the Netlify AI Gateway, which passes no request headers so no `fallbacks` or beta features, 5-minute cache only, 200 k input cap; pass-through of `search_result` blocks is [U]).
17. Who authors and reviews the ~60 reviewed answers (shared with seo-growth-23)?
18. Confirm whether the site stays strictly non-commercial (changes what HMDB and Freesound content could ever be allowed).

### 10.3 Unverified or inferred (do not treat as facts)

- Netlify **plan tier and credit balance**; file-count and drag-and-drop limits for 2-3 k files; `.bin` compression; `Content-Type: application/wasm`; function bundle-size limit; Blobs pricing; the dollar value of a compute credit; whether AI Gateway passes `search_result` blocks.
- **Every phone latency, dense-retrieval quality figure and all API latency/cost figures for B and C are estimates**; only A's index size, BM25 latency and linker precision were measured on real text, and those are Node-on-desktop numbers. No neural embedding was run; no API call was made.
- **Inference (not stated in Design C):** on a Free plan the 300-credit hard limit pauses the whole site, so a flood on `/api/ask` could take the site down even while the Anthropic cap holds.
- Whether Bachelder's 28 hourly maps exist digitally; the Jacobs weather primary; NPS permission for the CWSS mirror (drafts unsent); legal status of embeddings of share-alike text; transformers.js v4 API; ORT-Web `.wasm` brotli on Netlify; Home-Screen/eviction behaviour on the owner's target iOS versions.
- The public-domain rule "published before 1931" is the sibling reports' arithmetic; confirm with counsel. This is research, not legal advice.
- The floating "Extra Features" overlay's interaction with `/historian.html` was not checked.

### 10.4 Traceability to the audit

| Audit item | Where addressed |
|---|---|
| H8 (overpromising; irrelevant matches; last message under the input bar; "AI-style") | 5.5 gate stack, 5.6, 6.2 (copy, transcript, scroll), P1 |
| H7 (dev-log copy, raw ids, `undefined`) | V05/V06, forbidden-string list, display names, P0 hotfix |
| H10 (467 vs 445+ counts) | computed counts from the manifest, alias-row collapse |
| C4 (clock/history mismatch) | 5.6 evidence tables, I5, 3.4 `clock_min`, P2 deliverable |
| C6 (first-visit SW reload) | 1.4 SW patch and no reload rule |
| C7/H7-style data notes leaking | V05 blocklist, field whitelist |
| X3 (CSP report-only, `unsafe-inline`) | 1.4 CSP class for `/historian`, `textContent` only |
| X5 (privacy page) | Stage A needs one sentence ("queries stay on your device"); Stage C requires the full rewrite first |
| T1 (about 8 % referrals from search) | P3 static unit pages, reviewed answers, seo-growth-23 |
| A1-A6 (contrast, targets, labels, focus, fonts) | 6.2-6.3 |
| P1-P5 (RUM Poor, payload, render-blocking) | 6.4 budgets, 0 bytes at first paint, non-blocking nav |
| E1 (manifest orientation lock) | 6.3 |
| N1 (no app source) | P0 repo; standalone page first |

### 10.5 Grade impact of the Historian plan

Function (grounded answers, fact tables, evidence tables), Fit and finish (render hygiene, computed counts), UX (answer-first, mobile sheets), Reliability (error/retry, offline, SW fix), Performance (0 first-paint bytes, Worker, immutable shards), Accessibility (WCAG 2.2 AA spec, axe + manual), SEO (unit pages, reviewed answers), Security (`textContent`, CSP, no third-party requests), Docs (`/sources.html`, `/data-notes.html`), Privacy (no logging, one sentence).

---

## Appendix A. Work items (`hf-NN`)

Bracketed ids trace to the source designs: A-nn = `arch-static-hybrid-nn`, C-nn = `arch-rag-function-nn`, B B0 = Design B phase B0, DI-nn = `data-integrity-nn`, hs1-nn / hs2-nn = `hist-sources-1/2-nn`, hist-current nn = its finding index (8.8), infra-nn = `infra-netlify-nn`.

| ID | Item | Phase | Effort | Depends on | Acceptance |
|---|---|---|---|---|---|
| hf-01 | Repo, `sources.yaml`, tier gate, `may_send_to_llm`, lockfile, `/sources.html` generator, retro-audit of 18 legacy rows [A-01, C-03] | P0 | M | - | gate refuses `warrebellionaco00cowlgoog`, a licence-less item, any Tier C id, a Tier B record without attribution |
| hf-02 | H0 hotfix: `e.event`/`e.narrative`, render hygiene, hold legacy clock labels [hist-current 01/03/10/12] | P0 | S | - | no `undefined`/ids; defects <= 1 % |
| hf-03 | SW patch, `/hx/` layout and headers, CSP class (Report-Only) [A-16, B 8.4] | P0 | S-M | hf-01 | a `CACHE_NAME` bump keeps `hx-*` caches; second visit fetches 0 bytes for `/hx/f/*` |
| hf-04 | Netlify plan and credit check; weekly-deploy policy [infra-30] | P0 | S | - | plan and balance recorded; alert at 70 % |
| hf-05 | Spikes S-1 (`.bin` compression), S-2 (5,000-file deploy), S-3 (real phone), S-4 (IA reader index) [A-16] | P0/P2 | M | hf-01 | decisions recorded |
| hf-06 | Fetch infra, `normalize_ocr()`, OCR quality gate [A-03] | P0 | M | hf-01 | dry run within limits; second run 0 bytes; No. 196 test |
| hf-07 | Entity registry, 570-unit crosswalk seed, alias generator [A-02, hs2-03] | P0-P1 | L | hf-01 | 100 % resolved or listed; "14th Brooklyn" -> the 84th NY |
| hf-08 | Validator V01-V12 + K001, determinism, CI [A-10, DI-24] | P0-P2 | M-L | hf-01 | red on any rule; identical hashes on rebuild |
| hf-09 | Eval harness: GQ + batteries, forbidden strings, pinned list, Wilson gates [A-17, hist-eval] | P0 | M | - | reproduces B0 (14.0 % pass; 29.3/76.2/68.2/47.1/89.8) |
| hf-10 | `search-core.js` [A-12, hist-current 02-07] | P1 | L | hf-07, hf-09 | H1 gates on the batteries |
| hf-11 | Fact tables and authority model [A-08] | P1 | L | hf-07 | every numeric answer rebuildable from a row |
| hf-12 | Composers A1-A4, A6, A10-A14 [A-14] | P1 | L | hf-10, hf-11 | I1-I8 lint passes on all cards |
| hf-13 | UI v2 + accessibility + honest copy [A-15, hist-current 16/17/23] | P1-P2 | L | hf-12 | axe 0 serious; Lighthouse >= 95; CLS <= 0.05 |
| hf-14 | Emit T1 + manifest [A-11] | P1 | M | hf-08 | T1 <= 250 KB |
| hf-15 | `search.html` on `search-core`; delete the old inline script [A-27, hist-current 14/15] | P1 | M | hf-10 | no regression on the pinned list |
| hf-16 | `textContent`, CSP Report-Only, Trusted Types report-only [A-26] | P1 | S | hf-03 | adversarial items inert |
| hf-17 | OR Pt 1-3 segmenters incl. dispatch header; page map [A-04] | P2 | XL | hf-06 | >= 95 % pages assigned; 5 folio checks pass |
| hf-18 | Passage classifier, table extraction, chunker, dedupe [A-05] | P2 | M | hf-17 | tables never quoted; round-trip join |
| hf-19 | Grammar unit/person/place linkers + 200-mention labelled set [A-06] | P2 | L | hf-07 | precision >= 0.95, recall >= 0.85 |
| hf-20 | Time anchors, event linking, evidence tables [A-07] | P2 | L | hf-17, hf-19 | 137/137 events covered or marked; >= 1,500 anchors; sample precision >= 0.90 |
| hf-21 | Review tool and decision loop [A-09] | P2 | M | hf-19 | 30-60 items/hour on a sample |
| hf-22 | Passage engine in the Worker + emit T2 [A-13, A-11] | P2 | M-L | hf-18 | p95 <= 50 ms at 6x; cold query <= 120 KB |
| hf-23 | Composers A5, A7, A8 (quotes, evidence tables) | P2 | M | hf-22 | quote-span validation 100 % |
| hf-24 | T0+ expansion + Batch-API link proposals [B 4.4, C 4.5] | P2 | M | hf-19 | audit of 200 expansions < 5 % misleading; all outputs cached |
| hf-25 | Golden-Passage set + audit #1 [A-17, hist-eval 5.4] | P2 | L | hf-22 | about 105 items; kappa >= 0.6 |
| hf-26 | G-A2 / G-X decision report | P2 | S | hf-25 | numbers recorded; branch chosen |
| hf-27 | NYFR x3, PA 1914, ME/NJ/MI/MN, Fox + Guild casualty facts, reconciliation [A-04, DI-03] | P3 | L | hf-17..hf-21 | >= 90 % NY + PA units have a narrative; reconciliation report |
| hf-28 | Static unit/place pages from the KB [A-25] | P3 | M | hf-27 | render without JS; Lighthouse SEO/a11y >= 95; in sitemap |
| hf-29 | B&L, JCCW, SHSP shortlist, memoirs + perspective/bias tags [A-04] | P4 | L-XL | hf-27 | every narrative passage has persp + lag |
| hf-30 | Contested registry, balance rule, historian sign-off [A-22] | P4 | M | hf-29 | contested questions return >= 2 sides or the disclosure |
| hf-31 | Filters, evidence-table, sources-drawer UI | P4 | M | hf-29 | 6.6 matrix green |
| hf-32 | Reviewed-answer library (about 60; shared with seo-growth-23) | P4 | M (Historian side about 1 d) | hf-29 | hash-validated; "Reviewed" badge with named reviewer |
| hf-33 | Audit #2 (100 answers) + GP refresh | P4 | S-M | hf-30 | 0 unsupported claims |
| hf-34 | OSM validation, LoC photos, weather source hunt, civilians/press, offline pack | P5 | M-L | hf-29 | per-item licence checks |
| hf-35 | CWSS rosters [A-24, hs2-04] | P5 | XL | NPS written reply | <= 4 shards per query; INP < 200 ms |
| hf-36 | Reranker experiment / B0 [A 7.8(d), B B0] | P5 branch | M / 4 d | G-X.2 | gates in 1.6 |
| hf-37 | C-lite: R0 spike, function, trust and abuse layers, consent + privacy rewrite [C R0/R1/R2] | P5 branch | L-XL (15-29 d) | G-X.3 | G-C-GA |
| hf-38 | Governance: `/sources.html`, `/data-notes.html`, changelog, corrections SLA, privacy/terms lines [A-18] | P1-P3, continuous | M | hf-01 | test correction ships within a day |
| hf-39 | `time-adapter.js` + forbidden-clock tests [A-20] | P1-P2 | M | app-time | no legacy clock in any answer |
| hf-40 | Deep-link flag and entry points (regiment.html, search.html) [A-21] | P1 | S | app-bugs-05 for the map entry | flag on -> chip opens the right tick/unit; off -> chip absent |

