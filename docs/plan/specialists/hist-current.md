# hist-current — Ask the Historian: how it works today, measured baseline, failure taxonomy, quick wins, UI/UX defects, exact code-level plan

Specialist: **hist-current** · Mode: NO-BUILD, read-only plan input · Date: 2026-09-29/30
Scope: `DEPLOY_DIR/historian.html` (11,368 B), `DEPLOY_DIR/search.html` (10,118 B, the source of the console line "Search index built: 521 entries (467 regiments, 24 vignettes, 30 locations)" — that string is at `search.html:144`, not in the bundle), the 15 JSON files they fetch, and, for context, the in-app "Search Units" panel (`bundle.pretty.js:98745-98830`).
Everything written to `plan-work/tmp-hist-current/` (scripts + JSON). Nothing in DEPLOY_DIR/SRC_DIR/RECON_SRC was touched. The live page equals the deployed file plus Netlify's injected RUM `<script>` (diffed with curl); `data/chronology_day1.json` and `data/terrain.json` md5-match the live site.

Evidence tags: **[M]** measured by running the real page script in Node (harness, see §3) · **[C]** read from code (file:line) · **[D]** counted from the data files by script · **[P]** measured on my *prototype* retriever (`proto.js`, not deployed; in-sample vs held-out is always stated) · **[A]** taken from the audit/BRIEF or a sibling specialist's report. Lines are `historian.html:N` / `search.html:N` unless prefixed `bundle.pretty.js:N`. Uncertainty is stated where it exists (no browser was used, per BRIEF, so every visual claim is [C]).

---

## 0. TL;DR

1. **What it is.** A 658-record keyword matcher (467 regiments + 24 vignettes + 137 chronology events + 30 terrain locations), rebuilt in the browser on every visit from **15 JSON fetches (318 KB raw, ≈64 KB brotli)**. It has no normalisation, no stemming, no IDF/TF, no field weights, no fuzzy matching, no synonyms, no intent detection, no composition, no follow-up state and no "I don't know" logic beyond "zero substring hits". It always prints the top 3 cards (≈2,990 characters, ≈450 words on average [M]). The page calls itself a "search-and-synthesis tool"; there is no synthesis. (`historian.html:48,154-193`)
2. **The chronology — 137 of the 658 records — is dead.** `historian.html:119,123` read `e.title`/`e.description`; every event in `chronology_day{1,2,3}.json` has only `event`/`narrative`. Chronology records are therefore indexed by their *location string only* (419 of ≈4,800 words) and rendered as `Day 1, 5:00am — Gettysburg environs: undefined`. Chronology appears in the top 3 for 1 of 106 answered queries [M]. (Sibling `data-integrity.md` #7 independently reached the same finding.)
3. **Baseline quality (B0, 118-query primary battery / 57-query held-out) [M]:** any-relevant-at-1 76% / 71%; but the **canonical entity card (the regiment or place record itself) is first for only 29% / 41%** of entity queries (median rank 3 / 2); the top-1 card is a *vignette* for 71% of queries (a ×1.3 weight hack, `:107`). Direct-fact hit (the answer string is in the output) 68% / 31%. Typo queries succeed 13% / 20%. Only **47% / 20%** of queries that *should* be declined are declined, and mostly by luck. **90% / 91% of queries produce at least one defective card** (raw internal IDs like `U-III / U-III-1-1`, lower-cased proper nouns like `survived gettysburg -- lost arm at petersburg`, `kia july 3`, `undefined`, 1,200+-character walls of text).
4. **The corpus is thin where it looks rich.** 75.6% of regiments (353/467) have a one-line `key_action` of <10 words (median 6); only **45 regiments (9.6%)** appear in any vignette or chronology text; 222 (47.5%) lack a casualty percentage; 27 lack a commander. The four sources it loads hold ≈15,400 prose words in total (regiment one-liners 3,380 + vignette scripts 7,182 + chronology 4,226 + terrain 578) — and the chronology's 4,226 are not actually shown (see 2). That is roughly two book chapters.
5. **A large amount of data already on the site is invisible to it [D]:** 88 brigades, 31 divisions, 11 corps + 2 armies (commander, strength, casualties, nicknames like "Iron Brigade"), **103 artillery batteries (Cushing's, Hazlett's, McGilvery's line…)**, 42 commander successions with page-level citations, 20 roads/structures/terrain features, casualty-intensity notes, 1,245 placement notes (12,081 words), 16 walkthrough narratives (1,814 words) and 16 tour-stop history blocks (2,031 words) embedded in the JS bundle, 512 monuments. Questions like "who commanded the Iron Brigade", "how many men did Lee have", "who replaced Reynolds", "Cushing" cannot be answered today although the data exists.
6. **What quick wins buy (measured on the same batteries) [P]:** a one-hour hotfix of the existing algorithm changes almost nothing (S@1 76→78; canonical@1 29→28) but removes defects when paired with render fixes (90%→1%). A new retriever over the *same* 658 records (BM25F with field weights, name normalisation, derived aliases, fuzzy matching, entity linking, intent priors, no-answer gate) lifts canonical@1 29→91% (held-out 41→86), typo S@1 13→88% (held-out 20→80), correct-decline 47→94% (held-out 20→60, n=5) — the primary-battery figures are in-sample. Adding the already-shipped-but-unused data (957 records) lifts fact-hit 68→86% (held-out 31→85%) and S@1 to 94% (held-out 88%). Ablation shows the load-bearing parts are **derived aliases, entity linking, fuzzy matching, intent+composition and the no-answer gate** — not stemming or curated synonyms.
7. **Sequencing hazard.** Fixing the chronology field names *exposes* the clock error (C4): the fixed page says "Day 3, 9:30am … THE CANNONADE BEGINS. At approximately 1:00pm…" and "Day 3, 11:05am — PICKETT'S CHARGE BEGINS" [M]. Ship the field fix together with either the canonical time model or by omitting the clock label (finding hist-current-12).
8. **Second hazard: developer notes are in the same JSON.** 66 chronology events carry `flag` (animation directions, 1,138 words), 31 regiments carry `flag_notes` ("must be shown advancing north across the pike…"). A naïve "index every string" expansion would leak them. Build step must whitelist fields (hist-current-11).
9. **UI/UX** (§7): last answer hidden behind the sticky input bar, paragraphs collapsed (no `white-space`), 15 px input (iOS zoom), unlabeled input, no `aria-live`, 11–12 px text, ≈28 px chip targets, no error state if any of 15 fetches fails, static chips whose results are all non-canonical (even the placeholder question "What happened to the 1st Minnesota?" returns the 8th Alabama and Plum Run *before* the regiment), one source link per card of which 137 are `null` and 30 point at an unrelated page, and the map deep links they emit are dead (app reads only `?ancestor=`, `bundle.pretty.js:101019`).
10. **Plan (§8):** Phase 0 hotfix + render hygiene (½ day) → Phase 1 shared `search-core` + build script + B2 features (3–4 days) → Phase 2 extended entity index + composers + facts + conversation + redesigned card (3–5 days) → Phase 3 handoff to the content-expansion plan (passages, embeddings/LLM tier). Evaluation contract with baseline numbers, gates and re-run commands is in §9; the 175-query battery, harness, prototype and all raw rows are in `tmp-hist-current/`.

---

## 1. What the Historian does today — exact mechanics

### 1.1 Data loaded (15 requests, unconditional `Promise.all`, no error handling)
`historian.html:67-80`: 8 OOB files (`union_regiments_i_ii_corps`, `_iii_v_corps`, `_vi_xi_xii_corps`, `confederate_regiments_first/second/third_corps`, `union_cavalry_artillery`, `confederate_cavalry`) → **only their `.regiments` arrays**; `vignettes_part1-3.json` → `.vignettes`; `chronology_day1-3.json` → `.events`; `terrain.json` → `.key_locations` only. Raw bytes 317,788; brotli ≈63,974; gzip ≈78,248 [M, compressed locally]. There is **no try/catch** (compare `search.html:98-165`): if any of the 15 fetches fails, the page stays on "Loading the battle's records…" forever (`:51`, `:142-144` never run). Cache: `/data/*` = `public, max-age=3600` (`netlify.toml`).
Not loaded: `union_oob_brigades`, `union_oob_corps_division`, `confederate_oob_corps_div_bde`, `union_artillery`, `confederate_artillery`, the `horse_artillery` arrays inside the cavalry files, `commander_successions`, `casualty_apportionment`, `monuments`, `terrain.roads/structures/terrain_features`, all `placements_*`/`density_*`.

### 1.2 The four card kinds (the whole corpus)
| Kind | Count | Indexed text (`text`) | Weight | Rendered answer | Source link |
|---|---|---|---|---|---|
| regiment (`:85-101`) | 467 | `designation state commander.name key_action regiment_id` (`:87`) | 1.0 | template sentence: name, side, state, **raw `parent_corps_id / parent_brigade_id`**, commander + `fate.toLowerCase()`, strength/casualties/%, `key_action` (`:93-97`) | `/regiment.html?unit=ID` (works) |
| vignette (`:103-115`) | 24 | `title trigger_location panel_summary` (`:105`) — **`full_script` is not indexed** | **1.3** | `title (location, tick N). full_script` — whole 206–375-word script, `\n\n` collapsed (`:109`) | `/?tick=N&vignette=ID` (dead: app ignores it) |
| chronology (`:117-128`) | 137 | `e.title e.description e.location` (`:119`) — **first two fields do not exist** | 0.9 | `Day d, <time> — <location>: ${e.description || e.title}` → **`undefined`** (`:123`) | `null` (`:124`) |
| terrain (`:130-140`) | 30 | `name significance` (`:131`) | 1.0 | `"<name> sits at roughly N ft elevation. <significance>"` (`:135`) | always `/viewshed.html` "Compare its elevation…" (`:136-137`) |

### 1.3 Query parsing, matching, scoring (`:154-166`, `:177-193`)
```js
const qWords = query.toLowerCase().split(/\W+/).filter(w => w && !STOPWORDS.has(w));   // :155
const t = text.toLowerCase();                                                            // :157
for (const w of qWords) { if (t.includes(' ' + w)) s += 3; else if (t.includes(w)) s += 1.5; } // :160-161
if (t.includes(query.toLowerCase())) s += 5;                                             // :164  (only for bare-entity queries)
...
corpus.map(e => ({ e, s: score(query, e.text) * e.weight })).filter(x => x.s > 0).sort((a,b) => b.s - a.s).slice(0, 3)  // :179-183
```
Consequences (each verified [M] unless marked):
* **Keyword bag of raw substrings.** No stemming, no token boundaries (`'top'` matches "stopped"; `'war'` hits 47 records of which 6 are whole-word: Edward, Delaware, Ward, Warren, toward, forward…; `'men'` 89 vs 23 whole-word (regiment, monument, engagement); `'wheat'`→48 records that only contain "Wheatfield").
* **Apostrophes are token breakers, leaving a stray `s`.** `"Pickett's Charge"` → `['pickett','s','charge']`; the `s` token scores +3 on **266 of 658 records** (any word starting with s) and +1.5 on 344 more (any s at all). Apostrophe-less spellings ("Picketts Charge", "Devils Den", "Culps Hill") do not match the possessive forms in the data.
* **No TF, no IDF, no length normalisation, no field weights:** a word in the designation counts the same as one in a 60-word `key_action`; each query word counts once. Ties break by array order (regiments first): "Little Round Top" → at least six regiment records tie at 14.0 (U-99PA, U-16MI, U-83PA, U-20ME, U-140NY, U-91PA…), and the terrain record for Little Round Top itself is not in the top 3.
* **Stop-word list (`:64-66`) both over- and under-filters:** it removes `me`, `in`, `it` (so **"20th ME" loses "ME" and "1 IN"/Indiana-style abbreviations die**), `tell`, `about`, `happened`, and all interrogatives (`what who how when where why`) — so *intent is discarded*; it does **not** remove `many`, `lose`, `war`, `time`, which then match noise ("how many died at the Wheatfield" ranks the Wheatfield terrain card below Vincent and Farnsworth because `many`+`died` score 3.9).
* **Ordinal/name forms are not normalised.** "First Minnesota" matches "first shot"; "twentieth Maine", "20 Maine", "1 MN" do not resolve to 20th Maine / 1st Minnesota.
* **Kind weighting is a hack:** vignette ×1.3 (`:107`) puts a vignette first for 75 of 106 answered primary queries (71%) regardless of the question.
* **Zero-hit is the only "no answer"** (`:185-188`); any single substring hit returns three confident cards.
* Latency is not an issue: 0.66 ms per query (Node), corpus build is trivial; the problems are relevance, structure and presentation.

### 1.4 Answer composition
None. Each of the top 3 records becomes its own chat bubble (`:189-192`, `addMsg` `:169-175`, `innerHTML`), unsynthesised, unordered by intent, no shared header, no "why this result". Mean 2,989 characters shown per query (median 2,708; p90 5,540; max 6,185) [M].

### 1.5 `search.html` (the "search index")
* Builds 521 entries (467 regiments, 24 vignettes, 30 locations; `search.html:98-147`); `searchText` = designation+state+commander+id (regiment), title+location+summary (vignette), name+significance (location); **no chronology, no `full_script`, no aliases**.
* `score(query, text)` (`:83-96`) treats the *whole query string* as one phrase: exact 100 / prefix 90 / word-start 80 / substring 60 / **letters-in-order subsequence 20**. Multi-word natural-language queries therefore only match as one contiguous substring or by subsequence.
* The subsequence fallback returns junk: on my battery **88% of every returned list has score 20** (mean list length 16; capped at 40 — "ny" has 509 matches, shown as "40 results"; `asdfghjkl` returns 3 results; "what is the capital of France" returns 4). The result count line (`:187`) reports the junk.
* Entity rows leak "Commander unrecorded" / dangling `·` (`:112`, 222 rows [A]); titles are inserted unescaped via `innerHTML` (`:194-196`); links `/index.html?unit=`, `?tick=&vignette=`, `?lat=&lng=` are dead [A app-bugs-05]; chips lack button styles (C8).
* Measured on the same battery: S@1 46%, canonical@1 47%, fact-hit 5%, correct decline 18%.

### 1.6 In-app "Search Units" (`bundle.pretty.js:98745-98830`)
Substring `includes` on unit id / designation / state / commander name, minimum 2 characters, first 12 in insertion order (the "relevance" sort option is insertion order; the other is casualties), no aliases/nicknames, no fuzzy. **Three search implementations with three scoring functions and three index shapes exist** (`search.html`, `historian.html`, the app panel).

---

## 2. The current corpus, quantified [D]

### 2.1 Records and words
| Source | Records | Words | In historian index today | Shown to user today |
|---|---|---|---|---|
| Regiments (`key_action`) | 467 | 3,380 (median 6, mean 7.2, max 37) | yes (all fields) | yes |
| Vignettes | 24 | 1,421 summary + 7,182 script (206–375 each; 249 paragraphs; ≈546 sentences) | summary only | whole script |
| Chronology events | 137 (42/49/46 by day) | 4,226 `event` (median 30/event) + 565 `narrative` (25 events) | **location string only (419 words)** | broken (`undefined`) |
| Terrain key locations | 30 | 578 | yes | yes |
| **Total visible** | **658** | **≈15,400 prose words** (tokens indexed: 11,088; vocabulary 2,247) | | |

### 2.2 Regiment coverage (of 467)
| Property | Count | % |
|---|---|---|
| has commander name + fate | 440 | 94.2 |
| has strength / casualties / days_engaged | 467 | 100 |
| has casualty_percentage | 245 | 52.5 |
| `key_action` ≥ 10 words / ≥ 30 words / ≤ 4 words | 114 / 2 / 156 | 24.4 / 0.4 / 33.4 |
| named as a vignette `units_featured` id | 10 | 2.1 |
| named (by short name) in vignette text | 28 | 6.0 |
| present as a regiment id in chronology `units_involved` | 21 | 4.5 |
| covered through a brigade/corps id in chronology `units_involved` (structural only) | 365 | 78.2 |
| **any vignette/chronology mention (id or name)** | **45** | **9.6** |
| regiments whose only text is the one-line `key_action` + stats | 422 | 90.4 |
| has its own placement/density keyframe | 217 | 46.5 |
| successor named after commander casualty | 13 | 2.8 |
| alias / detachment duplicate records (`U-14BK`, `U-11PA-B`, `U-11PA-R-F`, `U-3WV-CAV`, `-b` ×4) | 8 | 1.7 |
Side split 274 Union / 193 Confederate; "467" = **regiment records only** (445 with a corps id + 22 Confederate cavalry — which is where Help's "445+" comes from [A data-integrity #8]); the 103 batteries are extra.

### 2.3 Chronology and terrain
* 137 events, 85 distinct location strings, significance low 3 / medium 16 / high 73 / critical 45; `units_involved` non-empty on 124, 135 distinct unit ids (only 21 are regiment ids; the rest are brigade/division/corps/battery ids); 25 have `narrative` (historiographic comment, e.g. "the second most-debated Confederate command decision"); **66 have `flag` = developer notes**.
* Terrain: 30 key locations used (each has lat/lng/elevation/day_relevance); unused: 8 roads, 8 structures, 4 terrain features (260 words). Data typo surfaced by aliasing: `LOC-029 "Gulp's Hill saddle"`.

### 2.4 Data the site already ships but the Historian cannot see
| Data | Records | Prose words | Notes |
|---|---|---|---|
| Union + Confederate brigades | 51 + 37 = 88 | 1,738 | nicknames only here: "(Iron Brigade)", "(Irish Brigade)", "(Stannard's Vermont Brigade)", "(Webb's Philadelphia Brigade)" |
| Divisions / corps / armies | 22+9 / 8+3 / 2 | 221 / 339 / – | commander, strength, casualties (Union 93,921 men, 23,049 casualties; Confederate 75,000 / 28,000) |
| Artillery batteries + horse artillery | 95 + 8 = 103 | 1,092 | commander, gun type/count, casualties |
| Commander successions | 42 | 856 | `source` has page cites ("Pfanz First Day p.65") — the only per-record provenance on the site |
| casualty_apportionment | 12 corps × periods | 643 | highest-rate/most-compressed notes |
| terrain roads/structures/features | 20 | 260 | |
| placements + density | 1,804 keyframes / 478 unit ids | **1,245 notes = 12,081 words** | animation-grade text, some clock claims; needs curation |
| monuments.json | 9 | – | plus **512** monuments embedded in the JS bundle (`bundle.pretty.js:104440`) |
| walkthrough stops (bundle) | 16 | 1,814 | tick-linked narratives (`bundle.pretty.js` ≈100250-100320) |
| tour-stop history blocks (bundle) | 16 | 2,031 | (`bundle.pretty.js:104113-104445`) |
| static sub-page prose (aftermath.html 330 visible words; turning-points.html holds ≈22 long strings inside its script; education/documentary render from the same JSON) | ~20 pages | not measured precisely (≈2–3k, mostly derived from the same JSON) | candidates for `page` records, not for facts |
| bibliography in `metadata.sources` | 29 distinct works | – | never shown to users; 0 of 467 regiments/24 vignettes/137 events carry per-record sources [A data-integrity #11] |

### 2.5 Questions the current design can NOT answer (archetype → evidence)
| # | Archetype | Example | Why | Data present? |
|---|---|---|---|---|
| 1 | Command above regiment | "Who commanded the Iron Brigade / I Corps / the Union army?" | brigade/corps/army files never loaded; nicknames only there | yes (S) |
| 2 | Command succession | "Who replaced Reynolds / Hood?" | successions never loaded | yes (S) |
| 3 | Army/corps totals | "How many men did Lee have? Union casualties?" | not indexed | yes (S) |
| 4 | Superlatives/aggregates | "Which regiment lost the most?", "How many Maine regiments?" (truth: 10), "Which state lost most men?" (NC 6,056) | no aggregate layer; retrieval cannot count | derivable |
| 5 | Artillery | "Cushing", "McGilvery's line", "Napoleon guns" | 103 batteries unloaded | yes (S) |
| 6 | Time/day | "What happened at noon on July 3?", "What time did Pickett's Charge start?" | chronology dead + clock labels wrong (C4) | yes but wrong |
| 7 | Position/location | "Where was the 20th Maine at 4 pm?", "Which units fought at the Wheatfield?" | placements unused; needs time model | yes (partly) |
| 8 | Per-location casualties | "How many died at the Wheatfield?" | no such totals exist anywhere — correct answer is a limitation statement | no |
| 9 | Causal/analytical | "Why did Lee lose?" | no analysis text; only 25 narrative one-liners | partial |
| 10 | Soldier-level | "Was John Smith at Gettysburg?" | no rosters | no |
| 11 | Site routing | "How do I find my ancestor?" | no knowledge of the site's own tools | yes (S) |
| 12 | Adjacent history | Antietam, Vicksburg, Lincoln's Address, causes of the war, aftermath, campaign context | out of corpus | no |
| 13 | Comparison / relational | "Compare the Iron and Irish Brigades", "Which brigades were in Pickett's division?" | no relational traversal | yes (S) |
| 14 | Multi-turn | "Tell me more", "What about the Confederates?" | stateless | – |
| 15 | People not commanders | Hazlett, Corby, Marcellus Jones (only in scripts/notes) | `full_script`/notes not indexed | yes (R) |

---

## 3. How I measured it

### 3.1 Harness fidelity
`harness.js` extracts the **actual inline `<script>` of `historian.html`**, runs it under a stub DOM with an fs-backed `fetch`, and drives the form's submit handler. The only edits are instrumentation: `__id` per corpus entry, the full ranked list exposed as `globalThis.__full`, and `globalThis.__corpus`. Scoring/ranking/rendering code is untouched (JS `sort` is stable in V8 like the browsers). `harness-search.js` does the same for `search.html`. Cross-checks: corpus size 658 = 467+24+137+30 [M], queries reproduce the audit's "why did Lee lose the war → Archer Captured".

### 3.2 Batteries
* **Primary: 118 queries** (`queries.js`): 24 regiment-name variants ("1st Minnesota / First Minnesota / 1 MN / twentieth Maine / 20th ME"…), 16 people, 16 places, 16 events/why/when, 7 casualty/number, 7 command, 5 ancestor, 10 out-of-scope + 2 gibberish, 9 typos, 3 compare, 2 follow-up, 1 day-time.
* **Held-out: 57 queries** (`queries_heldout.js`), authored *after* the prototype was frozen and never used to tune it (one prototype bug — middle-initial surname parsing — was found while analysing held-out failures and fixed; both before/after numbers are saved in `metrics_all_before_surname_fix.json` / `metrics_all.json`).
* Each query carries: `avail` (I indexed text · R rendered-but-not-indexed or chronology · S elsewhere in site data · N not in any data · O out of scope), `expect` (`answer`/`refuse`), `primary` ids, a relevance regexp, and (for fact questions) a `must` regexp.

### 3.3 Metrics
S@1/S@3 = a top-1/top-3 card is relevant (primary id **or** regexp match on that record's core text; lenient by design) · P@3 · MRR@50 · prim@3 (any primary id in top 3) · R@3 · **canonical@1/@3** (the entity's own regiment/place record: strict) · **fact@3 / factTop** (the `must` string appears in the answer text / in the first bubble) · **correct decline** (declines when `expect=refuse`; "limited-answer" statements count) · defect rate (raw internal id, lower-cased proper noun, `undefined`, alias record shown, bubble > 1,200 chars) · chars shown.

### 3.4 Limits (honest)
Single annotator; synthetic queries (no user logs exist); relevance labels are partly regexp-derived so S@k is generous (that is why canonical@1 and fact@3 are reported); small n per category (n=1–24); the prototype B2/B3 numbers on the primary battery are **in-sample** (thresholds and alias sets were tuned while looking at it) — use the held-out column for generalisation; declined-when-should for held-out has n=5. No browser/Lighthouse was run for `historian.html`, so page-performance statements are payload arithmetic, not lab data.

---

## 4. Results

### 4.1 Headline (percent)
Primary battery (n=118; 101 answerable, 17 should-decline):
| System | S@1 | S@3 | P@3 | MRR | prim@3 | R@3 | canon@1 | fact@3 | factTop | correct decline | defects |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **B0 current historian.html** | 76 | 80 | 61 | 79 | 61 | 44 | **29** | 68 | 55 | **47** | **90** |
| B1 hotfix of the same algorithm (`b1patch.js`) | 78 | 80 | 64 | 79 | 65 | 48 | 28 | 68 | 50 | 41 | 87 |
| B1u = B1 + render hygiene (`b1upatch.js`) | 78 | 80 | 64 | 79 | 65 | 48 | 28 | 59 | 45 | 41 | 1 |
| S0 current search.html | 46 | 52 | 35 | 50 | 46 | 35 | 47 | 5 | 5 | 18 | 1 |
| B2 new retriever, same 658 records [P] | 84 | 86 | 75 | 86 | 82 | 66 | 91 | 50 | 41 | 94 | 0 |
| B3 = B2 + unused site data, 957 records [P] | 94 | 98 | 81 | 94 | 90 | 71 | 88 | 86 | 77 | 88 | 0 |

Held-out (n=57; 52 answerable, 5 should-decline):
| System | S@1 | S@3 | P@3 | MRR | prim@3 | R@3 | canon@1 | fact@3 | factTop | correct decline | defects |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **B0** | 71 | 73 | 50 | 73 | 42 | 33 | **41** | 31 | 23 | **20** | **91** |
| B1 | 71 | 75 | 58 | 70 | 50 | 37 | 36 | 31 | 31 | 20 | 84 |
| B1u | 71 | 75 | 58 | 70 | 50 | 37 | 36 | 23 | 23 | 20 | 0 |
| S0 | 42 | 46 | 22 | 46 | 27 | 21 | 41 | 8 | 8 | 40 | 0 |
| B2 [P] | 77 | 81 | 62 | 83 | 65 | 53 | 86 | 38 | 15 | 60 | 0 |
| B3 [P] | 88 | 92 | 74 | 95 | 81 | 71 | 82 | 85 | 77 | 40 | 0 |
(B1u loses fact@3 because hiding `full_script` removes facts that only live there — proof that passage-level extractive answers are needed, QW-15. B2 also scores below B0 on fact@3 for the same reason plus the absence of army/succession data; both recover in B3 once composition and the unused data are added.)

### 4.2 B0 by category and by data availability (primary)
| Category (n) | S@1 | S@3 | prim@3 | fact | decline ok | notes |
|---|---|---|---|---|---|---|
| name-variant (24) | 100 | 100 | 79 | – | – | lenient: a vignette about the unit counts; canonical card first only 29% overall |
| commander (16) | 94 | 94 | 75 | – | – | works only for regimental colonels + names inside vignette summaries |
| place (16) | 94 | 100 | 63 | – | – | terrain card outranked by regiments that mention the place |
| event (16) | 75 | 75 | 63 | 80 | – | "Picketts Charge" 0; clock/why/when weak |
| casualty (7) | 33 | 50 | 50 | 67 | 0 | totals/superlatives fail; luck on 26th NC |
| command (7) | 29 | 29 | 0 | 86* | – | *fact hits are luck (Meade appears in an unrelated vignette) |
| ancestor (5) | 75 | 75 | 75 | 0 | 0 | no route to `/find-ancestor.html` |
| out-of-scope (10) | – | – | – | – | 40 | weather → three battle cards |
| typo (9) | **12** | 38 | 38 | – | 100 | 4 of 9 refuse ("Chamberlin"), 5 return noise |
| compare (3) / follow-up (2) / day (1) | 67 / – / 100 | | | 50 | 50 | |
By availability: **I (n=71) S@1 89% · R (n=16) 69% · S (n=14) 21%**; should-decline: N (n=6) 17% declined, O (n=11) 64% (the 64% is chance: "who won the world series", "tell me a joke", "capital of France" happen to share no substring).

### 4.3 What each tier buys, and what components matter (leave-one-out over 175 queries, B3 prototype)
| Config | S@1 | P@3 | canon@1 | fact@3 | factTop | correct decline | typo S@1 | name S@1 |
|---|---|---|---|---|---|---|---|---|
| FULL (B3) | 92 | 78 | 86 | 86 | 77 | 77 | 92 | 100 |
| − stemming | 92 | 78 | 86 | 89 | 77 | 77 | 92 | 100 |
| − unit-key parser | 92 | 78 | 86 | 86 | 77 | 77 | 92 | 100 |
| − curated alias table | 92 | 78 | 85 | 86 | 77 | 77 | 92 | 100 |
| − **derived aliases** (parentheticals, nicknames, "20th Maine" forms) | 86 | 74 | **70** | 77 | 66 | 82 | 85 | 88 |
| − **fuzzy / join / split** | 87 | 72 | 81 | 86 | 77 | 82 | **31** | 100 |
| − field weights | 92 | 78 | 85 | 86 | 77 | 77 | 92 | 97 |
| − **entity linking + phrase bonus** | 90 | 78 | 78 | 80 | 71 | 77 | 92 | 100 |
| − **intent classifier + priors** | 89 | 77 | 90 | **49** | **26** | 73 | 92 | 100 |
| − **composition templates** | 90 | 76 | 90 | 51 | 34 | 73 | 92 | 100 |
| − **no-answer gate** | 93 | 79 | 86 | 89 | 80 | **32** | 92 | 100 |
| − dedup/diversity | 92 | 79 | 86 | 86 | 77 | 77 | 92 | 100 |
| minus everything (plain BM25F + tokenizer) | **76** | 68 | **40** | 43 | 31 | 32 | 31 | 94 |
Reading: the **plain-BM25F row equals the current page's S@1 (76%)** — swapping ranking formula alone buys nothing. The gains come from *structure* (derived aliases, entity linking, intent+composition, typo repair, a decline rule). Stemming, the curated synonym table, field weights, unit-key parsing and diversity are redundant *on this battery* (auto-derived aliases cover most name forms) — keep them cheap and tested, not first.

### 4.4 Things the headline hides
* Top-1 card kind, B0 (primary): vignette 75, regiment 28, terrain 3, chronology 0. B3: regiment 34, terrain 22, chronology 13, brigade/division/corps/army 19, others — i.e. the right kind for the question.
* Average answer size falls from 2,989 chars (B0) to ≈440 chars (B2/B3) with the composed sentence first.
* Refusals that "work" in B0 are accidental: 8 of 17 should-decline queries decline only because no substring matches.
* The five suggestion chips (`:147`) and the placeholder question (`:55`) all put a non-canonical card first: "20th Maine" → Chamberlain's Charge vignette, 15th Alabama, Little Round Top (20th Maine's own card is 4th); "Pickett's Charge" → *Pickett's Return*, *Lee Meets His Men*, 8th Ohio (the charge event is absent); "Iron Brigade" → *Reynolds Falls*, *Archer Captured*, 19th Indiana; "What happened to the 1st Minnesota?" → vignette, **8th Alabama**, Plum Run.

---

## 5. Failure taxonomy (baseline B0, primary battery: 56 of 118 queries fail at least one strict criterion)
Each failing query is multi-labelled (`taxonomy.js`); "primary cause" counts the first label. Columns B1/B2/B3 = queries still failing after that tier (predicate: not relevant at 1, or fact missing, or refused, or canonical card outside top 3; or, for should-decline, not declined).

| Code | Failure mode | Root cause (file:line) | Failing (B0) | Primary | B1 | B2 | B3 | Example | Fix (finding) |
|---|---|---|---|---|---|---|---|---|---|
| F01 | Canonical entity card outranked | vignette ×1.3 `:107`; no title/alias field; ties by array order; 658 flat records | 24 | 14 | 20 | 2 | 2 | "20th Maine": card 4th; "Wheatfield": terrain card absent | 02, 04 |
| F02 | Unit-name normalisation | `me`/`in` stop-words `:64-65`; no ordinals/state abbreviations; `first` not a stop-word | 6 | 6 | 5 | 0 | 0 | "twentieth Maine", "20th ME", "1 MN", "Wheat field" | 04 |
| F03 | No typo tolerance | exact substring only | 7 | 6 | 7 | 1 | 1 | "Chamberlin" refused; "Armistad"; "Wheatfeild" | 05 |
| F04 | Apostrophe/possessive handling | `split(/\W+/)` `:155` stray `s` | 4 | 3 | 3 | 1 | 1 | "Picketts Charge", "Devils Den", "Culps Hill" | 03 |
| F05 | Answer lives in unloaded site data | `:67-80` loads 8+3+3+1 files only | 14 | 12 | 14 | 13 | 4 | "who commanded the Iron Brigade" → Reynolds vignette; Emmitsburg Road | 08 |
| F06 | Chronology dead | `:119,123` wrong field names | 6 | 2 | 6 | 1 | 1 | "Gettysburg environs" → `undefined`; "Longstreet" → Sickles vignette | 01 |
| F07 | Intent ignored / no composition | interrogatives are stop-words `:64`; no template | 16 | 2 | 15 | 12 | 4 | "who replaced Reynolds", "how many men did Lee have" | 06 |
| F08 | No decline / scope logic | any hit → 3 cards `:179-192` | 9 | 8 | 9 | 1 | 1 | weather, hotels, Lincoln's Address, "was John Smith at Gettysburg" | 07 |
| F09 | No conversation state | stateless `ask()` | 1 | 1 | 1 | 0 | 0 | "what about the Confederates" | 19 |
| F10 | No routing to site features | no site-page records | 3 | 2 | 3 | 3 | 2 | "how do I find my ancestor" | 28 |
| F11 | Relational/aggregate unsupported | flat retrieval | 3 | 0 | 3 | 2 | 2 | "which brigades were in Pickett's division", superlatives | 25 |
| F12 | Underlying clock labels wrong | C4 (`time` labels) | 1 | 0 | 1 | 1 | 1 | "what time did Pickett's Charge start" (data says 11:05am) | 12 |
Totals failing: B0 56 → B1 54 → **B2 22 → B3 13**. The 13 B3 residuals are: 4 grading artifacts (Q076, Q087, Q088, Q114 — the composed/site card is first and correct, but the regiment record is not in the top 3 or is not counted relevant); 6 prototype rule gaps (Q024 "Vermont brigade" alias, Q032 "Robert E. Lee" surname collision with battery commanders named Robert, Q072 day-scope override beating the place entity (the same rule also makes B3 *worse* than B0 on the held-out "what did Chamberlain do on July 2" and "what happened to the 26th North Carolina on July 1" — the day shortcut must only fire when no entity is linked; §8.3 step 7), Q095 "France"→"Francis" fuzzy hit, Q105 "pickets"→real word, Q078 "Union soldiers" not matching the strength rule); and 3 genuine structural limits (Q086 division→brigades traversal F11, Q059 clock F12, Q090 individual-soldier honesty F10).
Cross-cutting output defects (independent of relevance): **D1 raw internal ids** in 71 of 118 answers (`part of U-III / U-III-1-1`, fate `See U-11PA`); **D2 lower-cased proper nouns/acronyms** in 34 (`survived gettysburg -- lost arm at petersburg`, `kia july 3`) from `commander.fate.toLowerCase()` (`:94`); **D3 wall of text** (>1,200 chars) in 88; **D4 `undefined`** (chronology); **D5 alias record shown** (`14th Brooklyn (alias for U-84NY)` next to `84th New York…`); **D6 `--` double hyphens** (1,591 in site strings [A]).

---

## 6. Quick wins (immediate, inside the existing corpus) — spec, effect, effort
Effort key: S <0.5 d · M 0.5–2 d · L 2–5 d. "Measured" = [P] on the batteries above.

**QW-0 Hotfix the current page (S).** Diff (all line numbers `historian.html`):
```diff
@@ :119  chronology text uses the fields that exist
-      const text = `${e.title || ''} ${e.description || ''} ${e.location || ''}`;
+      const text = `${e.event || ''} ${e.narrative || ''} ${e.location || ''}`;          // never e.flag (developer notes)
@@ :123
-          html: `<b>Day ${c.day}${e.time ? ', ' + e.time : ''}${e.location ? ' — ' + e.location : ''}:</b> ${e.description || e.title}`,
+          html: `<b>Day ${c.day}${e.location ? ' — ' + e.location : ''}:</b> ${e.event}`, // clock label held back until time-model (finding 12)
@@ :155  tokenizer: drop possessive 's, apostrophes, split on non-alphanumerics
-    const qWords = query.toLowerCase().split(/\W+/).filter(w => w && !STOPWORDS.has(w));
+    const qWords = query.toLowerCase().replace(/['’]s\b/g,'').replace(/['’]/g,'').split(/[^a-z0-9]+/).filter(w => w && !STOPWORDS.has(w));
@@ :157,160-161,164  word-start matching only, text normalised the same way
-    const t = text.toLowerCase();
+    const t = ' ' + text.toLowerCase().replace(/['’]/g,'');
-      if (t.includes(' ' + w)) s += 3;
-      else if (t.includes(w)) s += 1.5;
+      if (t.includes(' ' + w)) s += 3;
-    if (t.includes(query.toLowerCase())) s += 5;
+    if (t.includes(' ' + query.toLowerCase().replace(/['’]/g,''))) s += 5;
@@ :64-65  question fillers that are not evidence
+ 'many','much','more','do','does','you','i','my','can','which','from','by','be','been','have','has','had','there','show','give','than','lose','time'
@@ :181  require a real hit
-      .filter(x => x.s > 0)
+      .filter(x => x.s >= 3)
@@ render hygiene
-          `... ${r.parent_corps_id ? ', part of ' + r.parent_corps_id + ...}`      → delete (or map ids to names, QW-14)
-          r.commander.fate.toLowerCase()                                            → r.commander.fate.replace(/ -- /g, '; ')
-          ${v.full_script}                                                          → ${v.panel_summary} + "Read the full story" disclosure
CSS: .msg{white-space:pre-line} #ask{font-size:16px} .msg{scroll-margin-bottom:96px}
```
Measured: retrieval hotfix B1 = S@1 +2 pts, canonical@1 unchanged, defects still 87%; with render fixes (B1u) defects 90→1% and mean answer 2,989→962 chars. **Value: removes every visible bug, stops the `undefined`; does not fix ranking.** Acceptance: no answer text contains `undefined`, a raw id (`/\b[UC]-[IVX]+/`) or a lower-case `july/gettysburg`; `node run-all.js` defect rate ≤ 1% on both batteries.

**QW-1 Normaliser + tokenizer (S–M).** NFKD, lowercase, curly→straight quotes, remove possessive `'s`/`s'`, `&`→and, collapse punctuation; numbers/ordinals → `#n` ("1st", "first", "1", "twenty-first"); `1 MN`/`20 ME`/`84th NY` → state expansion *only when preceded by a number* (so "in", "me", "us" stay words); "I Corps/first corps/1st corps" → `corps_i`. Unit key `#20|maine` → record. Measured: part of the "− derived aliases" and name-variant gains; prevents F02/F04.

**QW-2 Derived + curated aliases (M).** Derive at build time from data: parenthetical text in designations ("(14th Brooklyn)", "(Ellsworth Avengers)", "(2nd Bucktails)"), brigade nicknames in `key_action`/brigade designation ("Iron Brigade", "Irish Brigade", "Stonewall Brigade", "Louisiana Tigers", "Texas Brigade"), `{surname}'s {brigade|division|corps}` for each commander, ALL-CAPS event labels in `event` ("PICKETT'S CHARGE BEGINS", "GREENE'S LONE STAND"), terrain `(High Water Mark)` parentheticals; curated seed list in Appendix A (~45 entries: Devil's Den/Devils Den, Round Top vs Big/Little, Wheatfield/Wheat field, High Water Mark/The Angle/Copse of Trees, Bucktails, Berdan's, Lee/Meade/Longstreet forms…). Measured: **removing derived aliases costs −6 S@1, −16 canonical@1**; the curated list alone is worth ~0 on this battery (still needed for spellings and nicknames not present in data).

**QW-3 Stemming + concept lexicon (S).** Light stemmer (plural, -ed, -ing, trailing e) applied identically at index and query time; concept map (`died/killed/dead/KIA/fell → casualty`, `began/started/opened/stepped off → begin`, `lose/failure/repulse → defeat`, `won/victory`). Measured ≈0 alone (redundant with aliases) — implement because it is 30 lines and protects future prose expansion.

**QW-4 Field-weighted BM25F (M).** Fields title 3.0 / alias 3.0 / people 2.0 / place 1.5 / body 1.0; b = 0.4/0.3/0.3/0.3/0.6; k1 = 1.2; IDF = ln(1+(N−df+.5)/(df+.5)). Delete the ×1.3/0.9 kind weights; replace with **intent-conditional kind priors** (QW-7). Measured: alone does not beat the status quo (76%); it is the substrate for the rest.

**QW-5 Phrase + proximity scoring (S–M, not prototyped).** Exact normalised phrase equal to a title/alias +15; query n-gram inside a title +8; within body: bonus when ≥2 query tokens occur within a 6-token window (`Σ 1/(1+gap)`, cap +4). Prevents "Pickett's Charge" resolving to *Pickett's Return* by shared tokens.

**QW-6 Entity linking (M).** Longest-n-gram match of the query against the alias map (record surfaces + curated), unit-key parser, surname map built from every commander at every echelon; link weight 12–40 added to the record's score and returned as `entities[]` for the composer and for context memory. Measured: −entity costs −2 S@1, −8 canonical@1, −6 fact@3.

**QW-7 Intent classifier (S–M).** 12 ordered regex rules (ancestor, succession, who-commanded, highest/superlative, strength, casualties, outcome, compare, when, where, why, what-happened, list, who) + kind priors (e.g. who-commanded ×1.3–1.4 on unit records; when ×1.3 chronology). Interrogatives stop being stop-words; they become features. Measured with QW-8: **fact@3 49→86**.

**QW-8 Answer composition templates (M–L).** One-sentence deterministic answers from structured fields, then ≤2 evidence cards (details §8.4): unit-commander (`X was commanded at Gettysburg by <name> (<fate>); <successor> succeeded him`), unit-casualties/strength, army totals, succession, highest-rate, outcome, day timeline ("Day 3 key moments…"), place profile, ancestor routing, limited-answer ("I don't have casualty totals broken down by location…"). Measured: **−compose costs −35 pts fact@3**.

**QW-9 Fuzzy + did-you-mean (M).** Damerau-Levenshtein against the name vocabulary (1,390 tokens): distance ≤1 for length 5–7, ≤2 for ≥8; same first letter unless length >6; never fuzzy when one token is a prefix of the other under 7 chars ("franc"→"Francis"); join/split ("wheat field"→wheatfield, "roundtop"→round top). UI: "Showing results for **Chamberlain** — search for Chamberlin instead". Measured: typo S@1 **13→88%** on the primary battery (held-out 20→80% with B2, 100% with B3); −fuzzy = typo S@1 31%. Known residual: "Pickets charge" → real word "pickets".

**QW-10 Decline / scope logic (M).** (a) coverage gate: fraction of content tokens found in the index; (b) name-field gate: bare-entity queries need a hit in title/alias/people/place, else "no dedicated record; mentioned in N records"; (c) unknown-token gate; (d) did-you-mean for whole-subject tokens ("Gettysburg"); (e) **scope classifier for generic-word out-of-scope** — the held-out set shows lexical gates alone fail ("best restaurant in town", "D-Day", "how do I get to the battlefield" contain in-vocabulary words like *town/day/battlefield*): add intent rules for visit-planning (hotel, ticket, parking, hours, directions, weather, restaurant) that answer with an honest pointer, and an "adjacent topics" table (Antietam, Vicksburg, Lincoln's Address, causes of the war, Chancellorsville) with a one-line "outside this site's records" + optional external link. Measured: −no-answer costs **−45 pts** correct decline (77→32); held-out decline only 40% ⇒ (e) is required, not optional.

**QW-11 Follow-up chips + context (M).** After a unit answer: [Commander] [Casualties] [Where it fought] [See on map] [Who fought against them]; after an event: [What led up to this] [What happened next] [Who was involved]; carry `lastEntities/lastIntent` so "tell me more", "who commanded it", "what about the Confederates" resolve; chips are generated from the answer's entity kinds (not the static 5 at `:147`).

**QW-12 Result de-dup & diversity (S).** Merge alias/detachment records into canonical (`U-14BK`→`U-84NY`; `-b` detachments folded), max 2 cards per kind, collapse a chronology event and vignette that share tick ±2 and title tokens, never show two brigades' regiments when the question names one.

**QW-13 Index the unused site data (L).** Adds brigades, divisions, corps, armies, artillery, successions, roads/structures/features, casualty notes and site-page records (B3, 957 records). Measured: S@1 84→94 (held-out 77→88), fact@3 50→86 (held-out 38→85), command S@1 29→100.

**QW-14 Human-readable context instead of ids (S).** Replace `part of U-III / U-III-1-1` by names resolved from the corps/brigade files ("Third Corps · Ward's Brigade (Birney's Division)") and add a one-line context sentence per regiment from brigade `key_action` (365 of 467 regiments are already touched structurally by chronology events through their brigade/corps).

**QW-15 Passage-level extractive answers (M–L, not prototyped).** Chunk vignettes into their 249 paragraphs/≈546 sentences and chronology into 137 events (+25 narratives); rank passages with the same BM25F; show the best 1–2 sentences with a "read the full story" disclosure. Needed because B1u lost 9 points of fact@3 when `full_script` was hidden, and because names that live only in scripts (Alphonso Hodges, Levi Shafer, Marcellus Jones's carbine) are unfindable today ("Alphonso Hodges" → 17th Georgia in B0 [M]).

---

## 7. UI/UX defects of `historian.html` (all [C] unless noted)

| # | Defect | Evidence | Fix | Finding |
|---|---|---|---|---|
| UX-01 | Answers are three raw cards, mean 2,989 chars; 88/118 queries show a bubble >1,200 chars | `:189-192`, [M] | answer-first: 1-sentence composed answer, ≤2 evidence cards (≈300 chars) each with "Read more" | 06 |
| UX-02 | Paragraph breaks lost: `full_script` has `\n\n` (249 paragraphs) but `.msg` has no `white-space` | `:27`, `:109` | render `<p>` per paragraph / `white-space:pre-line` | 10 |
| UX-03 | Newest answer partly hidden behind the sticky input bar; and `block:'end'` lands the reader at the *end* of a 300-word answer | `:35` (sticky, ≈78 px), `:174` `scrollIntoView({behavior:'smooth',block:'end'})` [A H8] | scroll to the *start* of the new answer group with `scroll-margin-top`, `scroll-padding-bottom` = bar height; respect `prefers-reduced-motion` | 16 |
| UX-04 | Input is 15 px → iOS Safari zooms on focus (documented WebKit behaviour; not device-tested) | `:36` | 16 px | 16 |
| UX-05 | Input has no `<label>`; transcript has no `role="log"`/`aria-live`; answers are silent to screen readers | `:54-57`, `:52` | visible/`sr-only` label, `role="log" aria-live="polite"`, focus stays in input | 17 |
| UX-06 | Text 11–12 px (`.src` 11, `.how`/`.sugg`/back link 12); chips ≈28 px tall; back link 12 px | `:21,24,30,33` | ≥14 px body, ≥12 px minimum, 44 px touch targets | 17 |
| UX-07 | Input boundary contrast 1.20:1 (#1e1e2e on #0a0a14), chip borders same (WCAG 1.4.11 wants 3:1 for the control boundary); text contrast is fine (gold 7.7, muted 6.4, bot text 13.7, user bubble 10.9) [computed] | `:33,36` | stronger border token | 17 |
| UX-08 | No error state: any of 15 fetches failing leaves the loader forever; no retry/offline | `:75-80`, `:142-144` (compare `search.html:98-165`, which does have a try/catch) | try/catch + retry + message; one prebuilt index | 18 |
| UX-09 | Chips are static and clicking one leaves its text in the input, unlike submit which clears it | `:147-152` vs `:201` | contextual chips (QW-11); consistent clearing | 19 |
| UX-10 | Placeholder example and all five chips return non-canonical first cards | §4.4 [M] | make chips part of the eval set; test each | 20 |
| UX-11 | Source links: chronology `null`; terrain always `/viewshed.html`; vignette/regiment "map" links dead until deep links exist; the page states "shown as a source link below each answer" | `:124`, `:136-137`, `:110`, `:48`; app reads only `?ancestor=` `bundle.pretty.js:101019` [A app-bugs-05] | per-record link contract; bibliography line from `metadata.sources`; map link `/?tick=&unit=` once app-bugs-05 lands | 13 |
| UX-12 | Copy overclaims: "search-and-synthesis tool"; hard-coded counts "467…24…137…30" | `:48` | computed counts from index, honest capability/limits panel | 23 |
| UX-13 | No new-conversation/clear, no history, no share/permalink, no `?q=` (planned contextual entry `historian.html?q=&unit=&tick=` from the map [A app-design §7.3]) | absent | `?q=&unit=&tick=` contract + `history.replaceState` + session transcript | 19 |
| UX-14 | Raw ids, lowercase fate, `--`, `undefined` in answers | `:93-94`, `:123` | render layer + build normalisation | 10 |
| UX-15 | Smooth scroll ignores reduced-motion | `:174` | `matchMedia('(prefers-reduced-motion)')` | 16 |
| UX-16 | `innerHTML` with data and single-char user escaping; not exploitable today (user text is `<`-escaped, data is first-party) but blocks CSP and is fragile for expanded content | `:172,178` | DOM API (`textContent`), move script external for CSP enforcement (X3) | 22 |
| UX-17 | Render-blocking `/site-nav.css` + `/site-nav.js` and `display:none`→`flex` toggles (layout shift when data arrives) | `:15,60`, `:142-146` [A P4] | preload/async, reserve space, enable input immediately | 30 |
| UX-18 | `Ask` button/chips have no busy/disabled state while data loads; no empty-query handling beyond return | `:196-202` | disabled until index ready, queue first query | 18 |

---

## 8. Exact code-level plan

### 8.1 Target layout (static site, Node used only at authoring time — the owner runs one script; no server)
```
/historian.html                      shell: markup + CSS only, <script type="module" src="/historian/historian.js">
/historian/historian.js              UI controller (DOM, a11y, chips, deep links, session)   (~250 lines)
/historian/search-core.js            normalise, tokenise, stem, unit-key, fuzzy, link, intent, BM25F, rerank, decide (~500 lines, no deps)
/historian/composers.js              pure functions (facts, ctx) -> {text, sources[], limited?}               (~250 lines)
/historian/aliases.v1.json           curated aliases/synonyms/scope tables (Appendix A)
/data/historian/index.v1.json        built: records + postings + IDF + alias map + name-vocab (target <= 120 KB brotli in Phase 2)
/data/historian/passages.v1.json     built, lazy: vignette paragraphs, chronology events, walkthrough/tour-stop prose
/data/historian/facts.v1.json        built: rankings, by-state/corps rollups, brigade->regiment lists (deterministic aggregates)
/scripts/build-historian-index.mjs   reads /data/**/*.json (+ extracted bundle prose), whitelist, validate, emit the three files + report
/scripts/eval-historian.mjs          runs tests/historian/*.jsonl through search-core, prints metrics, diffs vs baseline, exit 1 on regression
/tests/historian/gold.v1.jsonl       the 118 primary queries (expand to 300+)   /held-out.v1.jsonl (57, then refreshed)   /baseline.b0.json
```
`search.html` and the in-app Search Units panel (`bundle.pretty.js:98745-98830`) import the same `search-core.js`/index; the entity docs are the same records as the planned `data/entities.v1.json` (pagesA-19) — **one build, one ID space** (regiment/battery/brigade/division/corps/commander/vignette/event/location/monument/page).
Fallback if the owner will not run Node: `historian.js` can build the index in the browser at load with the same code (prototype: 66 ms in Node including disk reads; 3.8 ms per unoptimised query) — the cost is parsing ~825 KB of JSON (≈160 KB brotli) instead of one ≈55–120 KB file.

### 8.2 `build-historian-index.mjs` — field whitelist and hard validations
| Source | Public fields → record | Never index / show |
|---|---|---|
| `oob/*_regiments_*`, cavalry | `regiment_id, designation, state, parent_* (resolved to names), commander{name,fate,successor…}, strength, casualties, casualty_percentage, days_engaged, key_action` | `flag_notes` (31), `notes` unless detachment, `alias_for` records (merge into canonical) |
| `vignettes_*` | `title, trigger_location, trigger_tick, units_featured, panel_summary`; `full_script` → passages (paragraph-level) | – |
| `chronology_*` | `tick, event, location, units_involved, significance, narrative`; `time` **only through the time model** | **`flag` (66, developer notes)**, raw `time` label |
| `terrain` | key_locations, roads, structures, terrain_features | – |
| `oob` brigades/divisions/corps/army, artillery | designation (+ nickname), commander, strength, casualties, %, days, key_action, member ids, gun type/count | `flag_notes` |
| `commander_successions` | event, from/to, cause, `approx_time`, notes, **`source` (page cite)** | – |
| `casualty_apportionment` | notable_intensity_notes, engagement notes | formula internals |
| placements/density notes | **Phase 2b only**, via curated subset; structured "where was X at T" lookup instead of text search | animation directions ("must show…", "CRITICAL:") |
| bundle prose (walkthrough 16 stops, tour-stop history 16, 512 monuments) | extract once to `/data/*.json` (owned by data-integrity/pagesA-19) | – |
Build fails when: any string equals `undefined`/`null`; any `units_involved`/`regiment_ids` id does not resolve (report the 95 unresolved placement ids and Confederate `U-` mis-keys from `data-integrity.md`); a record lacks title or summary; any output text matches the developer-note blocklist `/(must (be )?shown|CRITICAL:|animation|keyframe|HIGHEST PRIORITY)/i`; `--` remains (auto-convert to `—`); serialized index > budget; an alias maps one surface form to > 8 records without a disambiguation rule.

### 8.3 `search-core.js` — algorithm (reference implementation = `tmp-hist-current/proto.js`, ~400 lines, tested on the batteries)
```js
// 1) normalise & tokenise
norm(s)   = NFKD → strip accents → lowercase → ’‘` → ' → drop 's/s' → & → ' and ' → non-alnum → ' ' → corps rewrite ("first|1st|i corps" → corpsi)
toks(s)   = split; "20th"|"twentieth"|"twenty first"|"20" → "#20"; keep stop-words flagged
// 2) unit parse: number + (state | state-abbrev-after-number | city nickname) [+ type] → key "#20|maine" → unitKey map → link weight 40
// 3) fuzzy repair of out-of-vocabulary tokens against nameVocab (join, split, DL<=1|2, prefix guard) → notes[] (drives "showing results for")
// 4) entity link: longest n-gram (5→1) vs aliasMap (record title + derived + curated aliases); single token >120 df ignored;
//    surname map for commanders at every echelon → {id, kind:'entity'|'person'|'unit', w:12+6n | 10 | 40}
// 5) intent = first matching rule of INTENT_RULES (§6 QW-7); consume intent words from BM25 query
// 6) BM25F(qtokens) over fields {title:3, alias:3, people:2, place:1.5, body:1}, k1=1.2, b per field
// 7) rerank: + link weights, + exact title/alias phrase (15), × intent kind prior, drop dup/alias records, day-scope injection ONLY when no entity linked
// 8) compose(intent, entities, ranked) → {text, sources[], limited?}    // composers.js
// 9) decide: answer | partial | decline  by coverage, name-field hit, unknown tokens, top score, scope rules; produce did_you_mean + follow_ups
// 10) cards = composed source(s) first, then diversified evidence (max 2 per kind), each with snippet/links/citation
```
Return shape: `{intent, entities[], mode:'answer'|'partial'|'decline', answer:{text,facts,sources}, cards[], did_you_mean?, follow_ups[], trace}`. `trace` (scores, links, notes) is logged only in dev / `?debug=1`.

### 8.4 `composers.js` — templates (each unit-tested with snapshot strings)
1. **unit-commander**: "*{designation}* was commanded at Gettysburg by *{rank name}* ({fate}); *{successor}* succeeded him ({when})." (multiple echelons when ambiguous: "I Corps"/"First Corps" → Union and Confederate both, labelled.)
2. **unit-casualties / strength**: "*{designation}*: about {strength} men engaged; {casualties} casualties ({pct}%)." + rank among side ("2nd highest rate") from `facts.v1.json`.
3. **army-totals**: Union {93,921 / 23,049 / 24.5%} vs Confederate {75,000 / 28,000 / 37.3%} **with an authority footnote** (data-integrity #4: totals vary by source: Union 22,803–23,138; Confederate 23,025–28,063) until the numbers are reconciled.
4. **succession**: "{to} took over {unit} after {from} ({cause}); {approx_time}. Source: {source}."
5. **superlative** (from `facts`): highest rate = 1st Minnesota 85.5% (224 of 262); most casualties = 26th North Carolina 588; "note: 8th Virginia 76.7%…" only after the casualty-authority fix.
6. **outcome/day timeline**: "Day N key moments: …" (critical events by tick, titles from ALL-CAPS labels) — clock via time model.
7. **place profile**: name, elevation, day relevance, significance, + "units that fought here" (from brigade `key_action`/chronology join).
8. **ancestor routing**: link to `/find-ancestor.html` + roster caveat + (regiment card if a unit was named).
9. **limited-answer**: explicit statement of what the records do not contain (per-location casualties, soldier rosters, causes of the war) + closest cards.
10. **compare**: two-column mini-table for two linked units (commander, strength, casualties %, days engaged, one-line action).
11. **decline**: "I don't have a record that answers that." + did-you-mean + 3 example chips + what the records cover (computed counts).

### 8.5 `historian.js` — UI contract
* Markup: `<form role="search">` with `<label for="ask">Ask the Historian</label>`; transcript `role="log" aria-live="polite" aria-relevant="additions"`; each answer = `<article aria-label="Answer">` with `<p class="lead">` (composed sentence), ≤2 `<details>` evidence cards, a `<footer>` "Sources: …" line and follow-up chips as `<button>`s; all text via `textContent`/`<template>` (no `innerHTML` of data).
* Layout: answer-first; ≥14 px; 44 px targets; input 16 px; sticky bar with `env(safe-area-inset-bottom)`; scroll to answer *start*; reduced-motion aware; skeleton + disabled input until index ready; error card with Retry.
* Deep links: `/historian.html?q=…&unit=U-20ME&tick=268` (contract used by the map's contextual entry [A app-design R4]); `history.replaceState` per question; `sessionStorage` transcript (try/catch, per-viewer convenience only); "Clear conversation" button.
* Map links use the deep-link scheme from app-bugs-05 (`/?tick=…&vignette=…`, `/?unit=…`) and are hidden until that release (feature flag `deepLinks`).
* Time display always via the canonical `tickToClock(tick)` (pages-B `/js/time-model.js`); until then omit clock times and say "tick N of 675".
* Privacy: no network calls beyond same-origin JSON; optional feedback/unresolved-query logging is a separate opt-in (finding 27) and needs the privacy page updated (X5).

### 8.6 Tests & CI (`scripts/eval-historian.mjs`, `tests/historian/`)
Table-driven normaliser tests (≥60 name variants), alias resolution tests, 100 phrasings for intent rules, composer snapshots, build validators, the 175-query battery with gates (§9), a "no developer notes / no ids / no undefined" content scan over **every** record's rendered card (all 957+ cards rendered, not just queried ones), and a latency/size budget check (p95 ≤ 30 ms on a mid-range phone class CPU-throttled run; index ≤ 120 KB brotli).

### 8.7 Phases
| Phase | Scope | Effort | Exit criteria (numbers to beat: §9) |
|---|---|---|---|
| **H0** hotfix (QW-0, QW-14, UX-02/03/04/15, chips) | patch `historian.html` in place | S (½ d) | no `undefined`/ids/lowercase-nouns; defects ≤1%; chronology visible; ship |
| **H1** core (QW-1…QW-12, build script skeleton, tests, eval CI) on the *same 658 records* | new module, `historian.html` becomes shell | L (3–4 d) | held-out S@1 ≥ 80, canonical@1 ≥ 85, typo S@1 ≥ 85, defects 0, correct decline ≥ 85 on ≥30 OOS queries |
| **H2** breadth (QW-13, composers, facts.v1, follow-ups, redesigned card, search.html + app panel on the shared engine, deep links) | L–XL (3–5 d + integration) | held-out S@1 ≥ 90, fact@3 ≥ 90, factTop ≥ 85, aggregate/relational set ≥ 80 |
| **H3** depth (passages QW-15, curated placement notes, monuments, prose from bundle, external sources; embeddings / optional LLM tier) | XL | handed to the content-expansion plan (`hist-future`); must pass the same gates |

### 8.8 Finding index (IDs used in the structured summary; `hist-current-NN`)
| ID | Title | Sev | Effort | Phase |
|---|---|---|---|---|
| 01 | Revive the dead chronology (field-name mismatch) | critical | S | H0 |
| 02 | Replace the ranking model (canonical card first, drop kind-weight hack, BM25F + entity boost) | high | M | H1 |
| 03 | Fix tokenizer / substring / stop-word bugs (stray `s`, substring hits, `me`/`in`) | high | S | H0 |
| 04 | Name normalisation + alias layer (ordinals, state abbreviations, nicknames, derived + curated) | high | M | H1 |
| 05 | Typo tolerance, join/split, did-you-mean | high | M | H1 |
| 06 | Intent classification + deterministic answer composition | high | L | H1–H2 |
| 07 | Decline / scope logic (coverage gate, scope classifier, adjacent-topic replies) | high | M | H1 |
| 08 | Index the site data already shipped (brigades…artillery, successions, features, casualty notes, site pages) | high | L | H2 |
| 09 | Regiment cards are stubs: context lines, brigade/chronology links, gap flags | high | M | H2 |
| 10 | Render hygiene (raw ids, lower-cased fate, `--`, walls of text, lost paragraphs) | high | S | H0 |
| 11 | Build pipeline with field whitelist + validators (developer-note exclusion) | high | L | H1 |
| 12 | Clock display dependency: hold labels, adopt canonical time model | high | S–M | H0/H2 |
| 13 | Source links, citations, deep-link dependency | medium | S | H2 |
| 14 | search.html scoring replacement (whole-string + subsequence junk) | medium | M | H2 |
| 15 | Unify the three search implementations on one engine + index | medium | L | H2 |
| 16 | Answer-first layout, scroll / sticky-bar fix, reduced motion | medium | S | H0 |
| 17 | Accessibility of historian.html | medium | M | H0–H1 |
| 18 | Loading / error / payload robustness (single index, progressive enable) | medium | M | H1 |
| 19 | Conversation: context, follow-up chips, `?q=` deep link, persistence, clear | medium | M | H2 |
| 20 | First impression: chips + placeholder must be canonical and tested | medium | S | H0 |
| 21 | De-dup and diversity (alias/detachment records) | medium | S | H1 |
| 22 | DOM API instead of `innerHTML` (CSP-ready) | low | S | H1 |
| 23 | Honest copy + capability/limits panel (audit H8) | medium | S | H0 |
| 24 | Evaluation harness, gates, CI, unresolved-query loop | high | M | H1 |
| 25 | Precomputed facts for aggregate / relational questions | medium | L | H2 |
| 26 | Passage-level retrieval + proximity scoring | medium | L | H2–H3 |
| 27 | Privacy-safe feedback / unresolved-query logging | low | M | H2 |
| 28 | Ancestor routing + individual-soldier honesty | medium | S | H1 |
| 29 | Data-quality items that will surface in answers | medium | M | H2 |
| 30 | Historian page performance / CLS / render-blocking | medium | S | H1 |
Critical path: 01+12 → 03+10 (H0 ship) → 11 → 04/02/05/06/07 (+24 gates) → 08/09/25 → 19/13/15.

---

## 9. Evaluation contract for later comparison (what a re-run must beat)

### 9.1 Baseline numbers to compare against (B0 = the deployed page)
| Metric | B0 primary (118) | B0 held-out (57) |
|---|---|---|
| S@1 / S@3 / P@3 / MRR | 76.2 / 80.2 / 60.7 / 78.6 | 71.2 / 73.1 / 50.3 / 73.1 |
| prim@3 / R@3 | 61.4 / 43.6 | 42.3 / 32.7 |
| **canonical@1 / @3 / median rank** | **29.3 / 55.2 / 3** | 40.9 / 59.1 / 2 |
| fact@3 / fact in first bubble (n=22 / 13) | 68.2 / 54.5 | 30.8 / 23.1 |
| **correct decline (n=17 / 5)** | **47.1** | **20.0** |
| refuses an answerable query | 4.0 | 7.7 |
| **defect rate** (any bad card) | **89.8** | **91.2** |
| mean characters shown | 2,989 (median 2,708; p90 5,540; max 6,185) | 2,689 |
| typo S@1 (n=9 / 5) · command S@1 (n=7 / 5) · casualty S@1 (n=7 / 4) | 12.5 · 28.6 · 33.3 | 20.0 · 20.0 · 100 |
| chronology card in top 3 | 1 of 106 answered queries | 3 of 52 |
| top-1 kind = vignette | 75 of 106 (71%) | 28 of 52 |
`search.html` (S0): S@1 46 / 42, canonical@1 47 / 41, fact 5 / 8, decline 18 / 40, 88% of each result list is subsequence junk. Prototype references (not targets): B2 and B3 rows in §4.1.

### 9.2 Gates
| Metric | Gate at H1 | Gate at H2 | A+ target |
|---|---|---|---|
| S@1 (primary / held-out) | ≥ 88 / ≥ 80 | ≥ 93 / ≥ 90 | ≥ 95 / ≥ 93 |
| canonical@1 | ≥ 90 | ≥ 92 | ≥ 95 |
| fact@3 · factTop | ≥ 60 · ≥ 50 | ≥ 90 · ≥ 85 | ≥ 92 · ≥ 88 |
| correct decline (n ≥ 40, incl. generic-word OOS) | ≥ 85 | ≥ 92 | ≥ 95 |
| typo S@1 | ≥ 85 | ≥ 88 | ≥ 90 |
| relational/aggregate set (new, n ≥ 25) | – | ≥ 80 | ≥ 90 |
| defect rate · mean initial chars | 0% · ≤ 700 | 0% · ≤ 600 | 0% · ≤ 500 |
| index size (brotli) · p95 answer latency (throttled phone) | ≤ 70 KB · ≤ 30 ms | ≤ 120 KB · ≤ 30 ms | same |
Regressions of > 2 pts on any gate fail CI. Refresh the held-out set at each phase (never tune on it) and add every real unresolved query.

### 9.3 Re-run (Windows Git Bash; all paths under `plan-work/tmp-hist-current/`)
```
node run-all.js          # B0, B1, B1u, S0, B2, B3 on both batteries -> metrics_all.json, rows_<set>_<system>.json
node taxonomy.js         # failure taxonomy table (taxonomy.json)
node run-ablation.js     # leave-one-out on 175 queries (ablation.json)
node harness.js "20th Maine" "why did Lee lose the war"     # inspect the real page's top-5 + text
node harness-search.js "Chamberlin"                         # inspect search.html scoring
```
To add a *new system* implement `async (query) => ({ranked:[ids], shown:[ids], bubbles:[text], refused:boolean})` and pass it to `evaluate()` in `evalcore.js`.

---

## 10. Dependencies, risks, open questions
* **Time model (C4) — hard dependency for any clock output.** Historian must consume the canonical `tickToClock()` (app-time / pages-B), else it will print internally contradictory times (§0.7).
* **Deep links (app-bugs-05)** — until the app reads `?tick/?unit/?vignette`, "See it on the map" chips must be hidden (feature-flag).
* **Data hygiene (data-integrity):** casualty totals have no single authority (Union 22,803/23,049/23,138; Confederate 23,025/23,125/28,000); ID conflicts (95 placed IDs not in OOB; Confederate regiments keyed `U-…`); VI Corps brigade records missing; `Gulp's Hill saddle`; `C-61VA` commander string reads "Colonel Virginia Boisseau" (looks like a merge error — **unverified**, needs a historian check); fate strings like `See U-11PA`. Surface a `verified` flag; the composer should say "about" and cite the source until reconciled.
* **Shared entity index (pagesA-19):** one build for Search Everything, Regiment, Find Ancestor and the Historian; avoid a second ID space.
* **Licensing of any external text** (Phase 3) is owned by the content-expansion plan; nothing in Phases 0–2 adds third-party prose.
* **Risk — over-fitting to my batteries.** All prototype numbers except the held-out columns are in-sample; the gates are written against a refreshed held-out set plus real logs.
* **Open questions for the owner:** (1) OK to run a local Node build script and commit its output (else browser-side indexing fallback)? (2) Should the historian's tone stay "records-only, not AI" permanently, with any future LLM tier clearly labelled? (3) Keep the name "Ask the Historian" (audit H8 flags over-promise) — my recommendation: keep the name, add the capability/limits panel and never claim "AI-style". (4) Is per-query logging acceptable (privacy page change)? (5) Who signs off on historically contested answers (`narrative` fields, "why did Lee lose")?

## Appendix A — starter alias / synonym tables (seed of `aliases.v1.json`; canonical phrase → variants, all pre-normalised)

Curated aliases are *additions* to the automatically derived ones (parentheticals in designations, brigade nicknames in `key_action`, `{surname}'s brigade/division/corps`, ALL-CAPS event labels, terrain parentheticals).

```json
{
 "devil den": ["devils den","devils","devil s den"],
 "little round top": ["little roundtop","lrt","round top little","little round-top"],
 "big round top": ["round top","great round top","bigroundtop","big roundtop"],
 "wheatfield": ["wheat field","the wheatfield"],
 "peach orchard": ["peachorchard","sherfy peach orchard"],
 "culp hill": ["culps hill","culp s hill","gulp hill"],
 "cemetery hill": ["cemetary hill","cemetery hil","east cemetery hill"],
 "cemetery ridge": ["cemetary ridge"],
 "angle": ["the angle","bloody angle","high water mark","copse of trees","the copse"],
 "seminary ridge": ["seminary","the ridge west"],
 "mcpherson ridge": ["mcphersons ridge","mcpherson s ridge"],
 "herbst woods": ["mcpherson woods","mcphersons woods","herbst wood"],
 "railroad cut": ["unfinished railroad","the cut","rr cut"],
 "barlow knoll": ["blocher knoll","blocher s knoll"],
 "east cavalry field": ["east cavalry","rummel farm","cavalry field"],
 "lutheran theological seminary": ["lutheran seminary","theological seminary","seminary cupola"],
 "iron brigade": ["black hat brigade","black hats","western brigade","meredith brigade"],
 "irish brigade": ["irish","caldwell irish"],
 "texas brigade": ["hood texas","robertson brigade"],
 "stonewall brigade": ["jackson old brigade","stonewall"],
 "louisiana tigers": ["tigers","hays brigade","louisiana brigade"],
 "bucktail": ["bucktails","buck tails"],
 "vermont brigade": ["stannard brigade","stannard vermonters","2nd vermont brigade"],
 "berdan sharpshooters": ["1st us sharpshooters","berdan","sharpshooters","united states sharpshooters"],
 "cushing battery": ["battery a 4th us","4th us artillery battery a"],
 "pickett charge": ["picketts charge","pickett pettigrew trimble assault","third day assault","july 3 assault","the charge","longstreet assault july 3"],
 "longstreet assault": ["longstreet attack","july 2 assault","longstreets assault"],
 "cannonade": ["artillery bombardment","great cannonade","bombardment"],
 "first shot": ["opening shot","who fired first"],
 "robert e lee": ["lee","general lee","marse robert"],
 "george meade": ["meade","general meade"],
 "james longstreet": ["longstreet","old pete"]
}
```

State abbreviations are expanded **only when preceded by a number** ("20 ME", "1 MN", "84th NY") so that "in", "me", "us", "la", "al" stay ordinary words:

```json
{"me":"maine","mn":"minnesota","nh":"new hampshire","vt":"vermont","ma":"massachusetts","mass":"massachusetts","ri":"rhode island","ct":"connecticut","conn":"connecticut","ny":"new york","nj":"new jersey","pa":"pennsylvania","penn":"pennsylvania","de":"delaware","md":"maryland","wv":"west virginia","oh":"ohio","in":"indiana","il":"illinois","mi":"michigan","wi":"wisconsin","ia":"iowa","va":"virginia","nc":"north carolina","sc":"south carolina","ga":"georgia","fl":"florida","al":"alabama","ms":"mississippi","la":"louisiana","tx":"texas","ar":"arkansas","tn":"tennessee","ky":"kentucky","mo":"missouri","us":"united states","usa":"united states"}
```

Intent lexicon (QW-3/QW-7): casualty = casualties, died, dead, killed, KIA, losses, fell, wounded, death toll · command = commanded, commander, led, in charge, head of · begin = start(ed), began, opened, stepped off, launched · defeat = lose, lost, defeat, failure, repulse, collapse · victory = win, won, victor.

## Appendix B — the primary battery (118) with baseline (B0) and prototype (B3) verdicts

Columns: `avail` I/R/S/N/O (see §3.2) · B0 = current historian.html · B3 = prototype with unused site data · verdict `ok` or `FAIL` (B0 lists taxonomy codes) · `canon rank` = rank of the entity's own record in the full B0 ranking (blank = no canonical record defined). Full rows: `tmp-hist-current/rows_primary_B0.json`, `rows_primary_B3.json`.

| ID | cat | avail | query | B0 top-3 | B0 | canon rank | B3 top-3 | B3 |
|---|---|---|---|---|---|---|---|---|
| Q001 | name-variant | I | 20th Maine | V-010, C-15AL, LOC-003 | FAIL F01 | 4 | U-20ME, D2T268, C-15AL | ok |
| Q002 | name-variant | I | twentieth Maine | V-010, U-16ME, U-19ME | FAIL F02+F01 | 7 | U-20ME, D2T268, C-15AL | ok |
| Q003 | name-variant | I | 20th ME | V-010, C-15AL, LOC-003 | FAIL F02+F01 | 6 | U-20ME, D2T268, C-15AL | ok |
| Q004 | name-variant | I | 20 Maine | V-010, C-15AL, LOC-003 | FAIL F02+F01 | 4 | U-20ME, D2T268, C-15AL | ok |
| Q005 | name-variant | I | 1st Minnesota | V-012, C-8AL, LOC-026 | FAIL F01 | 4 | U-1MN, V-012, D2T302 | ok |
| Q006 | name-variant | I | First Minnesota | V-012, V-001, V-003 | FAIL F02+F01 | 6 | U-1MN, V-012, D2T302 | ok |
| Q007 | name-variant | I | 1 MN | U-1MN, C-13NC, V-001 | ok | 1 | U-1MN, V-012, D2T302 | ok |
| Q008 | name-variant | I | Minnesota regiment | V-012, V-008, V-009 | FAIL F01 | 14 | V-012, U-1MN, D2T302 | ok |
| Q009 | name-variant | I | 15th Alabama | V-010, C-15AL, C-4AL | ok | 2 | C-15AL, D2T268, BDE:C-I-2-1 | ok |
| Q010 | name-variant | I | Fifteenth Alabama | V-010, C-4AL, C-15AL | ok | 3 | C-15AL, D2T268, BDE:C-I-2-1 | ok |
| Q011 | name-variant | I | 26th North Carolina | C-26NC, V-005, V-014 | ok | 1 | C-26NC, D3T548, C-45NC | ok |
| Q012 | name-variant | I | 24th Michigan | U-24MI, V-020, U-7MI | ok | 1 | U-24MI, C-24GA, D2T273 | ok |
| Q013 | name-variant | I | 69th Pennsylvania | U-69PA, U-56PA, U-11PA | ok | 1 | U-69PA, U-69NY, ART:U-ART-EPA | ok |
| Q014 | name-variant | I | 14th Brooklyn | U-84NY, U-14BK, U-14VT | ok | 1 | U-84NY, D1T36, C-14VA | ok |
| Q015 | name-variant | I | 84th NY | U-84NY, V-012, V-014 | ok | 1 | U-84NY, U-4NY-CAV, ART:U-ART-15NY | ok |
| Q016 | name-variant | I | 1st Texas | C-1TX, V-012, U-70NY | ok | 1 | C-1TX, C-4TX, BDE:C-I-2-2 | ok |
| Q017 | name-variant | I | Texas Brigade | C-1TX, C-4TX, C-5TX | ok | 1 | C-4TX, C-1TX, BDE:C-I-2-2 | ok |
| Q018 | name-variant | I | Irish Brigade | U-28MA, U-63NY, U-69NY | ok | 1 | U-28MA, U-88NY, BDE:U-II-1-2 | ok |
| Q019 | name-variant | I | Bucktails | U-143PA, U-149PA, U-150PA | ok | 2 | U-13PA-R, U-143PA, BDE:U-I-3-2 | ok |
| Q020 | name-variant | I | Berdan's Sharpshooters | V-008, U-1US-SS, V-001 | ok | 2 | D2T240, U-1US-SS, V-008 | ok |
| Q021 | name-variant | I | Stonewall Brigade | C-2VA, C-4VA, C-5VA | ok | 1 | C-4VA, C-33VA, BDE:C-II-2-1 | ok |
| Q022 | name-variant | I | Louisiana Tigers | V-014, C-5LA, C-6LA | ok | 2 | C-7LA, C-6LA, BDE:C-II-1-1 | ok |
| Q023 | name-variant | I | 6th Wisconsin | V-004, LOC-017, U-6WI | ok | 3 | U-6WI, D1T37, U-26WI | ok |
| Q024 | name-variant | I | Vermont brigade | U-2VT, U-3VT, C-8AL | FAIL F05+F01 | 40 | U-3VT, U-2VT, D3T558 | FAIL |
| Q025 | commander | I | Chamberlain | V-010, U-20ME | ok | 2 | U-20ME, D2T275, V-010 | ok |
| Q026 | commander | I | Joshua Chamberlain | V-010, U-20ME | ok | 2 | U-20ME, V-010, D2T275 | ok |
| Q027 | commander | I | Colonel Oates | C-15AL, V-004, V-008 | ok | 1 | C-15AL, D2T268, V-010 | ok |
| Q028 | commander | I | William Oates | C-15AL, U-19IN, U-7WI | ok | 1 | C-15AL, BDE:C-II-2-3, DIV:U-XII-1 | ok |
| Q029 | commander | I | Cushing | V-018, LOC-009 | ok |  | ART:U-ART-A4US, SUCC:US-023, D3T553 | ok |
| Q030 | commander | I | Armistead | V-016, V-018, V-024 | ok |  | BDE:C-I-3-3, D3T552, D3T551 | ok |
| Q031 | commander | R | Longstreet | V-007, U-1US-SS | ok |  | D2T256, D2T360, CORPS:C-I | ok |
| Q032 | commander | R | Robert E. Lee | V-023, V-003, U-11NJ | ok |  | ART:U-ART-5MA, U-140PA, ARMY:C | FAIL |
| Q033 | commander | R | General Meade | V-002, V-003, V-005 | FAIL F06+F05 |  | SUCC:US-002, ARMY:U, STR:STR-001 | ok |
| Q034 | commander | I | Reynolds | V-002, V-003, LOC-012 | ok |  | SUCC:US-001, CORPS:U-I, ART:U-ART-L1NY | ok |
| Q035 | commander | R | John Buford | U-8IL-CAV, V-002, V-006 | ok |  | DIV:U-CAV-1, U-8IL-CAV, ART:U-HAB-A2US | ok |
| Q036 | commander | I | Sickles | V-007, V-008, LOC-007 | ok |  | CORPS:U-III, SUCC:US-017, D2T298 | ok |
| Q037 | commander | I | Gouverneur Warren | V-009, U-5CT, C-10VA | ok |  | C-10VA, D2T265, U-5CT | ok |
| Q038 | commander | I | George Pickett | V-020, U-15MA, V-013 | ok |  | DIV:C-I-3, ART:U-ART-I1US, U-15MA | ok |
| Q039 | commander | I | Custer | V-020, U-1MI-CAV, U-5MI-CAV | ok |  | BDE:U-CAV-2-3, D3T563, V-020 | ok |
| Q040 | commander | I | Winfield Scott Hancock | V-016, V-012, U-1MN | ok |  | CORPS:U-II, SUCC:US-009, U-7US | ok |
| Q041 | place | I | Little Round Top | V-009, V-010, U-99PA | FAIL F01 | 26 | LOC-003, V-009, D2T270 | ok |
| Q042 | place | I | Devil's Den | U-4ME, D2T260, U-20IN | FAIL F01+F06 | 13 | LOC-005, C-4TX, C-17GA | ok |
| Q043 | place | I | Devils Den | U-88NY, U-69PA, U-20IN | FAIL F04+F01 | 14 | LOC-005, C-4TX, C-17GA | ok |
| Q044 | place | I | The Wheatfield | U-81PA, U-28MA, U-2US | FAIL F01 | 4 | LOC-006, D2T290, D2T283 | ok |
| Q045 | place | I | Wheat field | U-5NH, U-61NY, U-81PA | FAIL F02+F01 | 37 | LOC-006, D2T290, D2T283 | ok |
| Q046 | place | I | Peach Orchard | V-007, V-008, U-57PA | FAIL F01 | 19 | LOC-007, D2T280, D2T248 | ok |
| Q047 | place | I | Culp's Hill | V-013, V-022, U-3MD | FAIL F01 | 41 | LOC-002, D3T515, LOC-029 | ok |
| Q048 | place | I | Cemetery Ridge | V-007, V-012, V-013 | FAIL F01 | 35 | LOC-011, D2T230, TF:TF-001 | ok |
| Q049 | place | I | the Angle | V-016, V-018, V-020 | FAIL F01 | 10 | LOC-009, V-016, SUCC:CS-005 | ok |
| Q050 | place | S | Copse of Trees | U-71PA, LOC-009 | ok | 2 | LOC-009, TF:TF-002, U-71PA | ok |
| Q051 | place | I | Railroad Cut | V-004, U-6WI, U-84NY | FAIL F01 | 13 | LOC-017, V-004, TF:TF-003 | ok |
| Q052 | place | I | Herbst Woods | V-002, V-003, U-19IN | FAIL F01 | 13 | LOC-013, D1T30, D1T29 | ok |
| Q053 | place | I | Spangler's Spring | LOC-025, V-001, V-002 | ok | 1 | LOC-025 | ok |
| Q054 | place | I | Bliss Farm | LOC-019, V-011, LOC-008 | ok | 1 | LOC-019, STR:STR-006, LOC-024 | ok |
| Q055 | place | S | Emmitsburg Road | V-007, U-8OH, U-1MA | ok |  | ROAD:RD-002, D3T544, U-26PA | ok |
| Q056 | place | I | Barlow's Knoll | V-006, U-41NY, U-54NY | FAIL F01 | 6 | LOC-016, D1T57, U-17CT | ok |
| Q057 | event | I | Pickett's Charge | V-019, V-023, U-8OH | ok |  | DIV:C-I-3, D3T538, D3T525 | ok |
| Q058 | event | I | Picketts Charge | V-003, V-004, V-005 | FAIL F04 |  | DIV:C-I-3, D3T538, D3T525 | ok |
| Q059 | event | R | what time did Pickett's Charge start | V-015, V-019, V-020 | FAIL F07+F06+F12 |  | D3T538, DIV:C-I-3, D3T525 | FAIL |
| Q060 | event | R | why did Lee lose | V-023, V-003, V-019 | ok |  | D1T75, D2T360, V-023 | ok |
| Q061 | event | I | who fired the first shot | V-001, V-002, V-003 | ok |  | V-001, ART:C-ART-Johnson-M, D3T451 | ok |
| Q062 | event | R | when did Reynolds die | V-002, V-003, V-009 | ok |  | D1T28, SUCC:US-001, CORPS:U-I | ok |
| Q063 | event | I | what was the cannonade | V-015, V-017, V-018 | ok |  | V-017, D3T518, D3T516 | ok |
| Q064 | event | I | why did Sickles move forward | V-007, V-005, V-008 | ok |  | V-007, D2T298, D2T252 | ok |
| Q065 | event | R | what happened on July 3 | V-017, V-024, U-13VT | ok |  | D3T518, D3T525, D3T530 | ok |
| Q066 | event | R | what happened on day 2 | U-19ME, U-106PA, U-3US-2 | FAIL F07+F06+F11 |  | D2T248, D2T256, D2T263 | ok |
| Q067 | event | R | how did the battle end | V-024, V-016, V-001 | ok |  | D3T675, D3T620, C-3AL | ok |
| Q068 | event | R | who won the battle | V-001, V-004, V-010 | FAIL F06+F07 |  | D3T675, D3T620, C-3AL | ok |
| Q069 | event | R | why did Longstreet oppose the attack | V-007, V-010, U-14VT | ok |  | CORPS:C-I, D2T360, D2T226 | ok |
| Q070 | event | I | what was the high water mark | V-016, V-024, LOC-009 | ok | 3 | LOC-009, V-024, D3T675 | ok |
| Q071 | event | R | who was killed at Little Round Top | U-140NY, V-009, V-010 | ok |  | LOC-003, D2T295, V-009 | ok |
| Q072 | event | R | what happened at Culp's Hill on July 3 | C-2VA, C-1NC, V-022 | ok |  | D3T518, D3T525, D3T530 | FAIL |
| Q073 | casualty | N | how many died at the Wheatfield | V-009, V-021, U-5NH | FAIL F08+F07 (answered) |  | LOC-006, U-4MI, BDE:U-II-1-3 | ok (declined) |
| Q074 | casualty | I | how many men did the 1st Minnesota lose | V-012, U-1MN, C-8AL | ok | 2 | U-1MN, V-012, BDE:U-II-2-1 | ok |
| Q075 | casualty | I | 26th North Carolina casualties | C-26NC, C-3NC, C-2NC-B | ok | 1 | C-26NC, CAS:notable_intensity_notes, C-45NC | ok |
| Q076 | casualty | S | which regiment had the highest casualties | U-149PA, C-26NC, C-38NC-S | FAIL F05+F07+F11 | 2 | CAS:notable_intensity_notes, C-8FL, C-28VA | FAIL |
| Q077 | casualty | S | total casualties at Gettysburg | V-001, V-024, U-149PA | FAIL F05+F07 |  | ARMY:U, ARMY:C, CAS:notable_intensity_notes | ok |
| Q078 | casualty | S | how many Union soldiers were at Gettysburg | V-005, V-006, V-020 | FAIL F05+F07 |  | ARMY:U, SUCC:CS-007, SUCC:CS-003 | FAIL |
| Q079 | casualty | S | how many men did Lee have | V-019, V-023, V-016 | FAIL F05+F07 |  | ARMY:C, STR:STR-002, D1T75 | ok |
| Q080 | command | S | who commanded the Iron Brigade | V-002, V-003, U-19IN | FAIL F05+F07 |  | BDE:U-I-1-1, U-19IN, U-2WI | ok |
| Q081 | command | S | who commanded the Union army | V-002, U-20ME, LOC-001 | FAIL F05+F07 |  | ARMY:U, D1T100, ARMY:C | ok |
| Q082 | command | S | who commanded the Confederate army | V-003, U-5US-CAV, V-001 | FAIL F05+F07 |  | ARMY:C, ARMY:U, BDE:C-II-2-1 | ok |
| Q083 | command | I | who commanded the 20th Maine | V-010, C-15AL, LOC-003 | FAIL F01+F07 | 4 | U-20ME, D2T268, BDE:U-V-1-3 | ok |
| Q084 | command | S | who replaced Reynolds | V-002, V-003, LOC-012 | FAIL F05+F07 |  | SUCC:US-001, CORPS:U-I, ART:U-ART-L1NY | ok |
| Q085 | command | S | who commanded I Corps | V-002, V-007, V-013 | FAIL F05+F07 |  | CORPS:U-I, CORPS:C-I, ART:U-ART-L1NY-I | ok |
| Q086 | command | S | who commanded Pickett's division brigades | V-019, V-013, V-015 | FAIL F05+F07+F11 |  | DIV:C-I-3, BDE:U-II-2-3, BDE:U-II-2-2 | FAIL |
| Q087 | ancestor | I | my ancestor served in the 20th Maine | V-010, U-20ME, C-15AL | FAIL F10+F01 | 2 | SITE:find-ancestor, U-20ME, D2T268 | FAIL |
| Q088 | ancestor | I | my great grandfather was in the 4th Alabama | C-4AL, C-44AL, C-14AL | ok | 1 | SITE:find-ancestor, C-4AL, C-12AL | FAIL |
| Q089 | ancestor | S | how do I find my ancestor | V-005, V-006, V-010 | FAIL F10+F05 |  | SITE:find-ancestor | ok |
| Q090 | ancestor | N | was John Smith at Gettysburg | V-006, V-011, U-150NY | FAIL F08+F10 (answered) |  | SITE:find-ancestor, ART:U-ART-4NYIND, C-31VA | FAIL (answered) |
| Q091 | ancestor | I | private in the 69th Pennsylvania | U-69PA, V-003, U-56PA | ok | 1 | U-69PA, U-69NY, D1T29 | ok |
| Q092 | oos | O | what's the weather today | V-011, V-024, LOC-009 | FAIL F08 (answered) |  | (declined) | ok (declined) |
| Q093 | oos | O | who won the world series | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q094 | oos | O | tell me a joke | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q095 | oos | O | what is the capital of France | (no answer) | ok (declined) |  | ART:U-ART-L1OH, V-006 | FAIL (answered) |
| Q096 | oos | N | Vicksburg | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q097 | oos | N | Antietam | U-13NJ | FAIL F08 (answered) |  | (declined) | ok (declined) |
| Q098 | oos | N | Lincoln's Gettysburg Address | V-001, V-005, V-006 | FAIL F08 (answered) |  | (declined) | ok (declined) |
| Q099 | oos | O | hotels near Gettysburg | V-001, V-005, V-006 | FAIL F08 (answered) |  | (declined) | ok (declined) |
| Q100 | oos | O | how much are tickets to the visitor center | V-014, U-83PA | FAIL F08 (answered) |  | (declined) | ok (declined) |
| Q101 | oos | N | what caused the Civil War | V-006, V-009, V-010 | FAIL F08 (answered) |  | (declined) | ok (declined) |
| Q102 | gibberish | O | asdfghjkl | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q103 | gibberish | O | the | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q104 | typo | I | Chamberlin | (no answer) | FAIL F03 (declined) |  | U-20ME, D2T275, V-010 | ok |
| Q105 | typo | I | Pickets charge | V-003, V-004, V-005 | FAIL F03+F04 |  | D1T3, D1T12, V-021 | FAIL |
| Q106 | typo | I | Little Roundtop | V-009, V-010, U-99PA | FAIL F02+F01 | 27 | LOC-003, V-009, D2T270 | ok |
| Q107 | typo | I | Cemetary Hill | V-009, V-013, V-014 | FAIL F03+F01 | 61 | LOC-001, D2T326, V-014 | ok |
| Q108 | typo | O | Gettysberg | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q109 | typo | R | Longstret | (no answer) | FAIL F03+F06 (declined) |  | D2T256, D2T360, CORPS:C-I | ok |
| Q110 | typo | I | Armistad | (no answer) | FAIL F03 (declined) |  | BDE:C-I-3-3, D3T552, D3T551 | ok |
| Q111 | typo | I | Wheatfeild | (no answer) | FAIL F03 (declined) |  | LOC-006, D2T290, D2T283 | ok |
| Q112 | typo | I | Culps Hill | V-009, V-013, V-014 | FAIL F04+F03 | 62 | LOC-002, D3T515, LOC-029 | ok |
| Q113 | compare | I | compare the 20th Maine and the 15th Alabama | V-010, C-15AL, LOC-003 | ok | 2 | C-15AL, U-20ME, D2T268 | ok |
| Q114 | compare | I | who fought the 20th Maine | V-010, C-15AL, LOC-003 | ok | 2 | U-20ME, D2T268, C-15AL | FAIL |
| Q115 | compare | S | Union versus Confederate casualties | LOC-006, V-001, V-006 | FAIL F05+F07 |  | ARMY:U, CAS:notable_intensity_notes, C-1MD-CSA | ok |
| Q116 | followup | O | tell me more | (no answer) | ok (declined) |  | (declined) | ok (declined) |
| Q117 | followup | O | what about the Confederates | V-009, U-12NJ, U-124NY | FAIL F09+F08 (answered) |  | (declined) | ok (declined) |
| Q118 | day | R | what happened on July 2 afternoon | V-014, U-1MN, U-82NY | ok |  | D2T248, D2T256, D2T263 | ok |

### B.2 Held-out battery (57)

| ID | cat | avail | query | B0 top-3 | B0 | B3 top-3 | B3 |
|---|---|---|---|---|---|---|---|
| H001 | name-variant | I | 16th Maine | U-16ME, V-010, U-19ME | ok | U-16ME, C-16GA, D3T558 | ok |
| H002 | name-variant | I | Sixteenth Maine | V-010, U-16ME, U-19ME | FAIL | U-16ME, C-16GA, D3T558 | ok |
| H003 | name-variant | I | second Wisconsin | V-003, V-004, V-015 | FAIL | U-2WI, U-5WI, D1T37 | ok |
| H004 | name-variant | I | 4th Texas | C-4TX, U-73NY, C-1TX | ok | C-4TX, C-1TX, BDE:C-I-2-2 | ok |
| H005 | name-variant | I | the 8th Ohio | C-40VA, U-8OH, V-001 | ok | U-8OH, BDE:C-III-2-2, C-40VA | ok |
| H006 | name-variant | I | 13th VT | U-13VT, U-13MA, U-14VT | ok | U-13VT, D3T546, U-3VT | ok |
| H007 | name-variant | I | Tammany Regiment | U-42NY, V-008, V-009 | ok | U-42NY, U-40NY, D1T31 | ok |
| H008 | name-variant | I | Excelsior Brigade | U-70NY, U-71NY, U-72NY | ok | U-71NY, U-72NY, BDE:U-III-2-2 | ok |
| H009 | name-variant | S | Philadelphia Brigade | U-118PA, V-002, V-003 | FAIL | BDE:U-II-2-2, U-118PA, D3T518 | ok |
| H010 | name-variant | I | Pennsylvania Reserves | U-1PA-R, U-2PA-R, U-6PA-R | ok | DIV:U-V-3, U-11PA-R-F, U-9PA-R | FAIL |
| H011 | commander | R | General Howard | V-002, V-003, V-005 | FAIL | CORPS:U-XI, D1T50, DIV:U-XI-3 | ok |
| H012 | commander | R | Ewell | C-14VA-CAV, U-5NJ | ok | CORPS:C-II, D1T75, D3T490 | ok |
| H013 | commander | R | Doubleday | (no answer) | FAIL | SUCC:US-002, DIV:U-I-3, SUCC:US-001 | ok |
| H014 | commander | R | Barksdale | U-39NY, U-111NY, U-125NY | ok | BDE:C-I-1-2, SUCC:CS-003, C-21MS | ok |
| H015 | commander | I | Vincent | V-009, U-16MI, U-44NY | ok | BDE:U-V-1-3, SUCC:US-020, D2T265 | ok |
| H016 | commander | R | Kershaw | U-17ME, C-2SC, C-3SC | ok | BDE:C-I-1-1, D2T283, C-15SC | ok |
| H017 | commander | R | Jubal Early | C-47VA, V-007, V-010 | ok | DIV:C-II-1, C-47VA, BDE:C-II-1-4 | ok |
| H018 | place | I | Round Top | V-009, V-010, V-021 | FAIL | LOC-004, LOC-003, V-009 | ok |
| H019 | place | S | Baltimore Pike | V-004, U-76NY, U-95NY | FAIL | ROAD:RD-004, D1T90, D1T66 | ok |
| H020 | place | S | Leister House | D2T400, LOC-023 | ok | STR:STR-001, D2T400, V-007 | ok |
| H021 | place | I | Trostle Farm | V-011, D2T298, D2T299 | FAIL | LOC-008, D2T300, STR:STR-003 | ok |
| H022 | place | I | Oak Hill | C-32NC, LOC-015, D1T48 | ok | LOC-015, D1T48, D1T49 | ok |
| H023 | place | I | McPherson Ridge | V-002, C-11NC, C-47NC | FAIL | LOC-012, D1T42, LOC-013 | ok |
| H024 | place | S | Willoughby Run | V-003, V-012, U-69NY | ok | TF:TF-004, V-003, D1T30 | ok |
| H025 | place | I | Evergreen Cemetery | LOC-023, V-007, V-012 | ok | LOC-023, LOC-001, D2T326 | ok |
| H026 | event | I | Iverson's Pits | V-005, C-5NC, C-23NC | ok | D1T53, V-005, C-23NC | ok |
| H027 | event | R | Gordon's flank attack | LOC-016, C-13GA-E, C-26GA | ok | D1T56, C-13GA-E, BDE:C-II-1-3 | ok |
| H028 | event | R | when was Sickles wounded | V-007, V-008, V-009 | ok | D2T298, SUCC:US-017, D2T252 | ok |
| H029 | event | R | Stannard Vermont brigade flank attack | U-14VT, U-13VT, C-13GA-E | ok | BDE:U-I-3-3, D3T546, U-14VT | ok |
| H030 | event | I | Farnsworth's charge | V-021, U-5NY-CAV, V-003 | ok | V-021, D3T569, BDE:U-CAV-3-1 | ok |
| H031 | event | R | Meade's council of war | V-006, V-009, V-010 | FAIL | D2T400, D1T100, STR:STR-001 | ok |
| H032 | event | I | how did Reynolds die | V-002, V-003, V-009 | ok | SUCC:US-001, CORPS:U-I, ART:U-ART-L1NY | ok |
| H033 | event | R | what happened on July 1 | V-001, V-017, V-024 | ok | D1T28, D1T29, D1T36 | ok |
| H034 | casualty | S | how many casualties did the Iron Brigade suffer | U-19IN, U-2WI, U-24MI | FAIL | BDE:U-I-1-1, U-19IN, U-2WI | ok |
| H035 | casualty | I | casualties of the 2nd Wisconsin | V-003, V-022, U-2WI | ok | U-2WI, CAS:notable_intensity_notes, U-5WI | ok |
| H036 | casualty | S | how many men were in Pickett's division | V-019, V-013, V-018 | ok | DIV:C-I-3, D3T530, V-019 | ok |
| H037 | casualty | S | III Corps casualties | U-141PA, V-007, U-107NY-XII | FAIL | CORPS:U-III, CORPS:C-III, CAS:notable_intensity_notes | ok |
| H038 | command | S | who commanded the Confederate Second Corps | V-013, V-015, LOC-015 | FAIL | CORPS:U-II, CORPS:C-II, BDE:U-II-3-3 | FAIL |
| H039 | command | S | who commanded Lee's cavalry | U-1MI-CAV, V-001, V-003 | FAIL | C-1VA-CAV, C-4VA-CAV, SUCC:CS-017 | FAIL |
| H040 | command | S | who replaced Hood | U-124NY, U-16MI | FAIL | SUCC:CS-001, DIV:C-I-2, SUCC:US-002 | ok |
| H041 | command | I | who took over the First Minnesota | V-012, V-001, V-003 | FAIL | U-1MN, V-012, SUCC:US-013 | ok |
| H042 | command | S | who commanded the Texas Brigade | U-2PA-R, U-45NY, U-123NY | FAIL | BDE:C-I-2-2, C-4TX, C-1TX | ok |
| H043 | ancestor | I | my ancestor was in the 16th Maine | U-16ME, U-20ME, U-5ME | FAIL | SITE:find-ancestor, U-16ME, C-16GA | FAIL |
| H044 | ancestor | S | where can I look up a soldier's record | V-011, V-017, V-009 | FAIL | (declined) | FAIL |
| H045 | oos | O | what's the best restaurant in town | V-008, U-157NY, U-82IL | FAIL | C-Phil-GA, U-1MI-CAV, D1T60 | FAIL |
| H046 | oos | O | tell me about D-Day | V-005, V-021, V-024 | FAIL | BDE:U-V-2-1, ART:U-ART-D5US, ART:U-ART-D2US | FAIL |
| H047 | oos | N | Chancellorsville | (no answer) | ok | (declined) | ok |
| H048 | oos | N | who was president in 1863 | V-001, V-024 | FAIL | (declined) | ok |
| H049 | oos | O | how do I get to the battlefield | V-005, C-4GA, C-26NC | FAIL | D2T340, U-16PA-CAV, U-6PA-CAV | FAIL |
| H050 | typo | I | Chamberlan | (no answer) | FAIL | U-20ME, D2T275, V-010 | ok |
| H051 | typo | I | Hancok | (no answer) | FAIL | CORPS:U-II, SUCC:US-009, U-7US | ok |
| H052 | typo | I | Peach Orchad | V-007, V-008, U-57PA | FAIL | LOC-007, D2T280, D2T248 | ok |
| H053 | typo | I | Cemetary Ridge | V-001, V-002, V-005 | FAIL | LOC-011, D2T230, TF:TF-001 | ok |
| H054 | typo | R | Barksdael | (no answer) | FAIL | BDE:C-I-1-2, SUCC:CS-003, C-21MS | ok |
| H055 | compare | S | compare the Iron Brigade and the Irish Brigade | V-002, V-003, U-19IN | ok | U-28MA, U-88NY, BDE:U-II-1-2 | ok |
| H056 | compare | I | what did Chamberlain do on July 2 | V-010, U-1PA-R, C-26NC | FAIL | D2T248, D2T256, D2T263 | FAIL |
| H057 | compare | I | what happened to the 26th North Carolina on July 1 | C-26NC, C-32NC, C-43NC | ok | D1T28, D1T29, D1T36 | FAIL |

## Appendix C — files produced (all under `plan-work/tmp-hist-current/`)

| File | Purpose |
|---|---|
| `harness.js` | runs the real inline script of historian.html under a stub DOM; instrumentation only |
| `harness-search.js` | same for search.html (captures scored list) |
| `queries.js / queries_heldout.js` | the 118 + 57 query batteries with gold ids, relevance regexps and fact regexps |
| `evalcore.js` | adapter-agnostic metric code (S@k, P@3, MRR, canonical@k, fact@k, decline, defects) |
| `run-all.js` | evaluates B0, B1, B1u, S0, B2, B3 on both batteries -> metrics_all.json + rows_*.json |
| `b1patch.js / b1upatch.js` | the one-hour hotfix and hotfix+render patches applied by string transform to the page script |
| `proto.js + aliases.js + data.js` | prototype retriever (BM25F, normaliser, aliases, fuzzy, entity linking, intents, composers, no-answer) — reference for search-core.js; NOT production code |
| `taxonomy.js / taxonomy.json` | failure taxonomy assignment and per-tier counts |
| `run-ablation.js / ablation.json` | leave-one-out component study |
| `coverage.js, notes-stats.js, oob-words.js, sizes.js, probe-substr.js, integrity.js, bundle-content.js, grepdata.js` | corpus quantification, payload sizes, substring false-positive probe, data sanity checks, data grep |
| `live_historian.html` | curl copy of the live page (diffed against the deploy: only Netlify RUM script added) |
| `metrics_all.json / metrics_all_before_surname_fix.json` | all summaries; the second predates the one prototype bug fix |

## Appendix D — verification notes

* Node v24 on Windows; shell heredocs mangle backslashes, so regex-heavy scripts were written or edited with the file/edit tools (one early edit left a literal backspace character in place of `\b` in the prototype — found by a control-character scan and fixed before the reported runs).
* Determinism: no randomness anywhere; re-running gives identical JSON.
* Not verified: real-browser rendering (sticky bar overlap, iOS zoom, focus order), Lighthouse for `historian.html`, screen-reader behaviour, and the exact brotli sizes Netlify serves (I compressed locally).


## Verification

Adversarial verifier for `hist-current`. Method: re-opened `DEPLOY_DIR/historian.html`, `search.html`, `netlify.toml`, `site-nav.js`, the data files, `bundle.pretty.js` lines 98745-98835 / 101012-101024 / 97822-97829, and re-ran the report's own harness and prototype from a separate folder (`plan-work/tmp-verify-hist-current/v1..v12.js`; nothing in `tmp-hist-current/` was written). Live checks: `curl` of `/historian.html` (identical to deploy plus the Netlify RUM `<script>`), `/data/{chronology_day1,terrain,vignettes_part1,oob/union_regiments_i_ii_corps}.json` md5 = deploy, `Cache-Control: public,max-age=3600`, `Content-Encoding: br` served. External: nps.gov Soldiers and Sailors page fetched (exists); Wikipedia / WebSearch for the 61st Virginia.

**Headline.** The evidence is unusually solid: every line number cited for `historian.html`, `search.html`, `bundle.pretty.js` and `netlify.toml` is exact; B0, B1, B1u, S0, B2 and B3 metrics, the ablation table, the 15-file payload (317,788 B raw / 63,974 B brotli, exact) and all data counts reproduce. The problems are in the fix specifications, the gates, and a few places where the prototype's numbers are less independent than stated.

### Reproduction log (what I re-ran)
| Claim | Result |
|---|---|
| B0 primary S@1 76.2, canonical@1 29.3, fact@3 68.2, decline 47.1, defects 89.8, mean chars 2,989 (p90 5,540) | reproduced exactly |
| B0 held-out 71.2 / 40.9 / 30.8 / 20.0 / 91.2 / 2,689 | reproduced exactly |
| B1 78.2 / 27.6 / 68.2 / 41.2 / 87.3; B1u fact@3 59.1, defects 0.8, chars 962 | reproduced exactly |
| S0 (search.html) 45.5 / 46.6 / 4.5 / 17.6 (held-out 42.3 / 40.9 / 7.7 / 40.0) | reproduced (report rounds to 46/47/5/18) |
| B2 primary 84.2 / canon 91.4 / fact 50.0 / decline 94.1 / typo S@1 88; held-out 76.9 / 86.4 / 38.5 / 60.0 / 80 | reproduced exactly |
| B3 primary 94.1 / 87.9 / 86.4 / 88.2; held-out 88.5 / 81.8 / 84.6 / 40.0 / typo 100 | reproduced exactly |
| Ablation table (section 4.3) | matches `ablation.json` cell for cell |
| top-1 kind = vignette 75 of 106 answered (primary); chronology in top-3: 1 of 106, 3 of 52 | reproduced |
| stray `s`: +3 on 266, +1.5 on 344; `war` 47/6, `men` 89/23, `wheat` 48/0 | reproduced exactly |
| Data: 467 regs (274 U / 193 C), 353 key_action <10 words (median 6, mean 7.24), 156 <=4, 114 >=10, 222 no casualty %, 27 no commander, 66 chronology `flag`, 31 `flag_notes`, 88 brigades, 31 divisions, 11 corps, 103 batteries (50+45+5+3), 42 successions, 249 vignette paragraphs | reproduced |
| Word totals for chronology (419 / 4,226 / 565 / 1,138) | tokenizer-dependent: my regexes give 413-445 / 4,236-4,454 / 563-584 / 1,111-1,183. Within about 3%, immaterial |

### Verdict table
| ID | Verdict | Notes / correction |
|---|---|---|
| 01 | CONFIRMED | Lines `:119`, `:123`, schema, `undefined` render all exact. Severity note: user-visible exposure is 1/106 primary and 3/52 held-out answered queries, so "critical" is a judgement call (the fix is S and correct). See MISSED-1 (threshold drops single-hit chronology cards) and MISSED-2 (event text still contains ` -- ` in 62/137 events). |
| 02 | CONFIRMED | Numbers reproduce. Dependency to state: plain BM25F alone scores canonical@1 40% (ablation); the gain comes from 04 (derived aliases) + entity links + phrase bonus, so 02 cannot ship before 04. |
| 03 | CORRECTED | Line refs and all counts exact. (a) "remove `me` and `in` from STOPWORDS" is harmful and is NOT what the tested hotfix did (`b1patch.js` keeps both): with word-start matching `in` hits 420 of 658 records (Infantry/Indiana...) and `me` 39. Measured B1 vs B1-minus-in/me: correct decline 41.2 -> 29.4 primary, S@1 78.2 -> 77.2. Keep both as stop-words and solve "20th ME" with the number-anchored state expansion in 04. (b) `.filter(x => x.s >= 3)` is a no-op for weight >= 1 and, with the chronology weight 0.9, drops every single-hit chronology card (0.9 x 3 = 2.7): 133 of 133 tested chronology events are not returned for "<rare word> zzzq" under B1. Filter on the raw score or set chronology weight to 1.0 in H0. |
| 04 | CONFIRMED | Baseline canonical ranks 7 / 6 / 4 / 6 / 14 (and "Wheat field" 37, "Devils Den" 14) reproduce; 59 of 88 brigades and 63 regiments carry parentheticals/nicknames in the data (Iron, Irish, Texas, Stonewall, Louisiana Tigers, Excelsior, Stannard's Vermont, Webb's Philadelphia all present). |
| 05 | CONFIRMED | Typo results reproduce (88 primary / 80 B2 / 100 B3 held-out; -fuzzy 31). Caveats: n = 9 and 5, thresholds tuned on the 9 primary typos, so "100%" is 5/5. Also `search.html` returns the 20th Maine FIRST for "Chamberlin" (score-20 ties resolved by array order, regiments first), so its subsequence tier is accidentally helpful for typos, not purely "the opposite failure". Generate >= 100 synthetic edit-distance typos from the name vocabulary before gating on typo S@1. |
| 06 | CONFIRMED | `:64` interrogatives in STOPWORDS; ablation 86 -> 49 / 51 reproduced. Trivial: the prototype has 14 intent rules (`proto.js:194-208`), not 12. See MISSED-6 (over-broad ancestor regex). |
| 07 | CORRECTED | Symptoms reproduce (weather -> V-011, V-024, LOC-009; hotels -> V-001, V-005, V-006; Antietam -> U-13NJ; Wheatfield deaths -> V-009, V-021; John Smith answered). The prototype figures mix systems: "94% primary but only 40% held-out" pairs B2 primary (94.1) with B3 held-out (40.0). Consistent pairs: B2 94.1 / 60.0, B3 88.2 / 40.0. Held-out has n = 5, so 40% is 2 of 5 (three generic-word OOS queries answered: restaurant, D-Day, "how do I get to the battlefield"). Direction supported, magnitude anecdotal. Ablation 77 -> 32 confirmed. |
| 08 | CONFIRMED | Counts and B3-vs-B2 deltas reproduce. Omitted trade-off: adding the 299 records lowers canonical@1 (91.4 -> 87.9; held-out 86.4 -> 81.8) and correct decline (94.1 -> 88.2; 60 -> 40). The decline gate must be re-tuned when the corpus grows. |
| 09 | CORRECTED | Stat block reproduces (353 / 156 / 222 / 27; U-95PA "Army reserve.", U-121PA "Biddle's brigade."). "365 covered structurally through brigade/corps ids" counts corps-level hits (an event naming `U-I` "covers" every I Corps regiment). At own-id-or-brigade level it is 292 (62.5%); use brigade-level joins only or the context line will attach corps-wide events to unrelated regiments. "Any mention" = 42 (9.0%) by my regex vs 45 (9.6%), immaterial. |
| 10 | CONFIRMED | Defect counts exact (raw ids 71, lowercased 34, wall 88 of 118); `:27` has no white-space; fate strings verified (48 with ` -- `, 16 KIA, 1 "See U-11PA"). "1,591 ` -- ` strings site-wide" not reproduced (I count 1,938 raw occurrences in `data/**/*.json`; scope differs). The fix is incomplete, see MISSED-2. |
| 11 | CONFIRMED | 66 / 31 developer-note fields verified. Sequencing gap in MISSED-8. Effort L plausible. |
| 12 | CORRECTED | Evidence exact (tick 518 label 9:30am vs text "approximately 1:00pm"; tick 538 11:05am). API name is wrong: pages-B section 3.5 `/js/time-model.js` exports `dayOf, clockMinutes, formatClock, label, tickForClock...`; `tickToClock` is app-time's module, not pages-B's. Name one canonical module. The interim "tick N of 675" is poor for "when" answers; say "the records do not carry a reliable clock time; it happened on Day 3" instead. The prototype itself prints the forbidden label (MISSED-5). |
| 13 | CORRECTED | Line refs exact (`:124`, `:136-137`, `:110`, `bundle.pretty.js:101019`). "29 distinct bibliography works": there are 29 distinct STRINGS but only 24 distinct printed works (Busey and Martin appears 3 times, "Pfanz trilogy" duplicates the three Pfanz volumes, and "Google Maps / satellite imagery verification" and "USGS topographic data" are provenance notes, not books). De-duplicate before rendering a Sources line. |
| 14 | CONFIRMED | `search.html:83-96`, `:112`, `:187`, `:194-196` exact; "ny" -> 509 matches shown as "40 results"; "asdfghjkl" -> 3; "capital of France" -> 4. Minor: "Commander unrecorded" occurs in 27 rows, the dangling ` . ` in 222. |
| 15 | CORRECTED | Three scorers exist (`bundle.pretty.js:98745-98830` verified). Omitted dependency: the in-app panel lives inside the minified 2.28 MB bundle with no source (BRIEF N1); a "lazily loaded module" needs bundle patching or the source-recovery track, so effort is L only for the two static pages and XL/blocked for the panel. Also a live bug in that panel, MISSED-7. |
| 16 | CONFIRMED | `:35`, `:174` exact; no `prefers-reduced-motion` anywhere in the file. |
| 17 | CONFIRMED | Font sizes, missing label, no `role=log` exact. Contrast recomputed: border #1e1e2e is 1.20:1 vs page bg and 1.13:1 vs the input's own #12121e fill (both fail 1.4.11); gold 7.74 on panel, muted 6.39 on bg (6.03 on panel), bot text 13.67, user bubble 10.88. |
| 18 | CONFIRMED | 15 fetches, no try/catch (`:75-80`), loader forever (`:51`); brotli served live. |
| 19 | CONFIRMED | Stateless `ask()`; "what about the Confederates" -> V-009 + unrelated regiments; "tell me more" declines. |
| 20 | CONFIRMED | Chip and placeholder results reproduce (20th Maine -> V-010, C-15AL, LOC-003; Iron Brigade -> V-002, V-003, U-19IN). |
| 21 | CONFIRMED | "14th Brooklyn" returns U-84NY and U-14BK; the alias card renders "roughly 0 effectives and suffered 0 casualties". |
| 22 | CONFIRMED | `:172`, `:178`; user text is `<`-escaped, not exploitable today. |
| 23 | CONFIRMED | `historian.html:48`, `index.html:377`, `site-nav.js:26` all contain the quoted copy. |
| 24 | CONFIRMED | Everything reproduces deterministically. Gate design problems are MISSED-3 and MISSED-4. |
| 25 | CONFIRMED | NC 6,056 (state sum), Maine 10 (9 infantry + 1 cavalry, by state/designation), 1st MN 85.5% (224/262), 26th NC 588, C-8VA 76.7% all from the data. Caveat: state roll-ups exclude artillery and include "Multi-state"/"Regular Army" buckets. |
| 26 | CONFIRMED | 249 paragraphs; sentences 518-546 depending on splitter (report says 546); B1u fact@3 68.2 -> 59.1 (-9.1) reproduced; "Alphonso Hodges" -> C-17GA, "Levi Shafer" -> U-6US, "Father Corby" -> U-28MA reproduced. |
| 27 | UNVERIFIABLE | Absence claim. `privacy.html` contains no "historian" mention (0 hits) and the page logs nothing today. Design is reasonable; nothing to test. |
| 28 | CONFIRMED | "how do I find my ancestor" -> V-005, V-006, V-010; "was John Smith at Gettysburg" -> V-006, V-011, U-150NY. `nps.gov/civilwar/soldiers-and-sailors-database.htm` exists (title "Soldiers and Sailors Database - The Civil War"; "over 6 million" service members per the page). See MISSED-6 for the prototype's own mis-routing. |
| 29 | CORRECTED | `LOC-029 "Gulp's Hill saddle"` and `U-11PA` fate verified. Upgrade for C-61VA: data says `{"name":"Colonel Virginia Boisseau"}`; Wikipedia and WebSearch list the 61st Virginia's field officers as Virginius D. Groner, Samuel M. Wilson, William F. Niemeyer, William H. Stewart, Charles R. McAlpine, with no Boisseau. So it is very likely a data error (secondary sources only; confirm against Busey and Martin before editing the record). |
| 30 | CORRECTED | Premise "no Lighthouse run for this page" is out of date: sibling `perf-cwv.md:105` / `tmp-perf-cwv/lab/lh_page_historian_mobile.json` (Lighthouse 13.5.0, local replica) show historian mobile Performance 100, FCP 0.8 s, LCP 1.2 s, TBT 40 ms, CLS 0.056 (green, <0.1), culprit `body > footer#gtbg-footer` when async content above it renders (perf-cwv-21). Severity should be low. The concrete fix is `#gtbg-nav-mount` / `#gtbg-footer-mount` `min-height` plus a transcript skeleton, and not regressing when the index grows. `:60` `/site-nav.js` sits at the end of `<body>`: parser-blocking, not render-blocking in Lighthouse's sense. |

### MISSED issues (in scope, not in the report)
1. **[medium] Hotfix threshold hides every single-hit chronology card.** `historian.html:181` -> `x.s >= 3` combined with `weight: 0.9` (`:121`) gives 2.7 for any one-word hit; only phrase-bonus (+5) single-token queries survive. Reproduced: 133 of 133 chronology events unreachable under `b1patch.js` for "<rare word> zzzq" (`tmp-verify-hist-current/v2.js`). Fix: threshold on the raw score before weighting (or weight 1.0 in H0); add a test "each of the 137 events is returned for a query made of its rarest word plus one filler".
2. **[medium] The H0 hotfix leaves `--` visible and the defect detectors cannot see it.** After B1u, 148 of 175 battery answers still contain ` -- ` (348 of 467 `key_action`, 62 of 137 events, 24 of 24 vignette scripts, 48 fates; `v9.js`, `v11.js`); QW-0 only patches `fate`. `evalcore.js defects()` has no `--` check, so "defects 0%" for B1u/B2/B3 is blind to it, and the prototype's own "highest" answer prints "1st Minnesota -- 224 of 262 casualties". Fix: one render-layer `.replace(/ -- /g, ' — ')` at H0 (build-time normalisation in H1), add `/ -- /` and `undefined|null|site clock` to the defect regex, and correct the "removes every visible bug" wording in section 6.
3. **[medium] Gates are unreachable by the H1-scope prototype and statistically meaningless at current n.** B2 (same 658 records, new retriever = H1 scope) scores S@1 84.2 / 76.9 vs gates 88 / 80, fact@3 50.0 / 38.5 vs 60, factTop 40.9 vs 50, held-out decline 60 vs 85; only B3 (H2 data) passes. Section 8.7 H1 exits (held-out S@1 >= 80, canonical >= 85) also disagree with section 9.2 (canonical >= 90). And the ">2 pt regression fails CI" rule fires on any one-query flip: n = 22 fact (1 query = 4.5 pts), 17 decline (5.9), 9 typo (11.1), 5 held-out typo/decline (20). Fix: move the fact and decline gates to H2 or pull SUCC/ARMY/BDE records into H1; gate on pinned must-pass query lists plus Wilson lower bounds; grow each gated metric to n >= 100 with generated variants before enabling percentage gates.
4. **[medium] The "held-out" set overlaps the tuning set.** 27 of 52 answerable held-out queries share at least one gold answer id with the primary battery (Reynolds, Sickles, Round Top, Pennsylvania Reserves, Iron Brigade, Pickett's division, find-ancestor...), the categories are identical, and `aliases.js` (frozen before the held-out set) already contains Stannard, Texas Brigade, Hood, Vermont. `proto.js` was also edited after the held-out set was written (00:27 vs 00:20; disclosed as the surname fix). Held-out numbers are therefore still optimistic; the B2 drop (84.2 -> 76.9) is the honest signal. Write a new held-out set (new entities, pre-registered rules) before the H1 gate is read.
5. **[medium] Prototype composers contradict the plan's own rules, so B3 fact@3 is not evidence for the data-derived path.** `proto.js:328` "highest" prints the data note (Confederate C-26NC 69.7%; the OOB maximum is C-8VA 76.7%, data-integrity #4/#6; "224 of 262 casualties in 15 minutes" is also wrong) and hard-codes "26th North Carolina lost the most men (588)"; `:330` "outcome" is a literal sentence; `:335-337` "when" prints "Day 3, 11:05am (site clock): PICKETT'S CHARGE BEGINS." for Pickett's Charge, exactly the label finding 12 forbids. Fix: add gold rows asserting the corrected answers (8th Virginia 76.7%) plus a forbidden-string list ("site clock", " -- ", clock times taken from `time`), and derive everything from `facts.v1.json`.
6. **[medium] Over-broad intent rule mis-answers presence questions.** `proto.js:195` ancestor rule `was .* at gettysburg` sends "was Longstreet at Gettysburg" (refused) and "was the 20th Maine at Gettysburg" (answered) to the "Find Your Ancestor ... your ancestor's regiment" template (reproduced). Fix: ancestor intent requires a personal-relation cue (my/grandfather/relative/soldier named) or an unlinked person name; a linked commander/unit plus "was ... at Gettysburg" gets a presence answer (days engaged, commander, casualties); add negative tests to the 100-phrasing intent suite.
7. **[low-medium] Existing bug in the in-app Search Units panel (belongs to finding 15).** `bundle.pretty.js:98753-98776` (`st`) filters on id, designation, state AND commander (`Jt` at `:98764`), but the sort handler `kt` (`:98790-98805`) filters on id, designation and state only. Typing a commander name ("Chamberlain") and then clicking Sort > Casualties drops the commander match and empties the list. Found by code reading (browser tools not allowed). Fix in the shared search-core migration, or a one-token patch to `kt`.
8. **[low] Build-validator sequencing and cache path.** The rule "build fails when any `units_involved` id does not resolve" fails on day one: 5 chronology ids do not resolve (C-CAV, U-ART-RES, C-CAV-1, C-CAV-2, C-CAV-5; `data-integrity.md` R001 also counts 5) plus 95 placed ids. The crosswalk (`unit_aliases.json`) must land in the same change, or the rule needs an allow-list with expiry. Separately, a content-hashed `/data/historian/index.<hash>.json` still inherits `Cache-Control: public, max-age=3600` (`netlify.toml:28-30`); add a `for = "/data/historian/*"` immutable rule or publish under `/assets/`.

### Effort and risk notes
* Estimates are realistic except 15 (see above; XL if the in-app panel is included) and 11 (L holds only if the id crosswalk from data-integrity ships first).
* 06 + 07 + 08 together are the whole value; 02 alone does nothing (plain BM25F row = current S@1 76%). Sequence 04 -> 02 -> 05 -> 07 -> 06 -> 08, and re-tune 07 after 08.
* Scripts and raw output for this section: `plan-work/tmp-verify-hist-current/`.
