# arch-semantic-local — Design B: an on-device semantic layer for Ask the Historian (on top of Design A)

Architect: **arch-semantic-local** · Mode: NO-BUILD, read-only plan · Date: 2026-09-30
Site: gettysburginteractivemap.com (Netlify static hosting, solo developer). Feature: `/historian.html`.
Scratch work (scripts, samples, raw results): `plan-work/tmp-arch-semantic-local/` (nothing outside `plan-work/` was modified; no model or site file was downloaded, built or deployed).

Evidence tags used throughout: **[M]** measured by me on local data or on the live site today; **[V]** verified today from a primary page/API (HF model card or API, jsDelivr file listing, caniuse JSON, WebKit blog, curl of the live site); **[R]** taken from a sibling report (file + section named); **[E]** estimate/assumption (always labelled, never presented as measured); **[U]** unverified (could not be checked today, stated in §17).

---

## 0. Decision summary (read this first)

1. **What B is.** A *progressive-enhancement* layer that adds a dense-retrieval channel (embeddings computed offline, queries embedded **in the visitor's browser**), fused with Design A's lexical/entity channel by weighted Reciprocal Rank Fusion, plus an optional small cross-encoder rerank, evidence-only (extractive) answer composition with page-level citations, and an evaluation harness that decides — with numbers — whether B ships. **No query, embedding or click ever leaves the device.** Nothing loads until the visitor opts in; Design A alone (tier T0) remains the default experience and the fallback for every failure.
2. **B is not justified by today's corpus; it is justified by the expanded prose corpus.** Of the 23 strict failures that remain in the prototype of A (hist-current B3, 175 queries), only **6 (3.4 % of the battery) are even *assistable* by semantic matching** (5 scope/decline cases, 1 typo); the other 17 are alias/rule gaps, structured facts/aggregates/time, and routing that B cannot fix [M, §2.1]. The value appears when the Historian holds thousands of period-prose passages (Official Records, state monument volumes, memoirs). On 11,425 real Official-Records chunks a pure keyword channel finds the *answer passage* in the top 3 for only **24 %** of natural-language questions, while returning something *topically adjacent* for 73 % and **nothing related at all for 27 %** [M, §2.3: pilot, single author, 33 questions, caveats there]. That gap (and the 27 % "confidently wrong" tail that a lexical-only gate cannot detect) is what B exists to close.
3. **Model (decision rule + default).** Default query+passage encoder: **`Snowflake/snowflake-arctic-embed-xs`** (Apache-2.0 [V], 22.6 M params, 384-d, MTEB-English retrieval avg **50.15** [V computed from its card], int8 ONNX **22.97 MB** [V]). Quality alternative: `BAAI/bge-small-en-v1.5` (MIT [V], 33.4 M, 384-d, **51.68** [V], int8 ONNX 33.8–34.0 MB [V]). Rule: run the B0 bake-off on the golden set and ship the *smallest* model whose recall@10 is not significantly below the best (paired bootstrap, §12.6). Static-embedding tier (Model2Vec `potion-*`, MIT [V]) is **fallback/optional only**: its published MTEB retrieval is 32.7–35.1 vs 50.2 [V], a 15-point gap.
4. **Runtime.** ONNX Runtime Web **1.30.x** (latest on npm today [V]) single-threaded **WASM** in a dedicated Worker (`ort-wasm-simd-threaded.wasm` is 14.24 MB raw / **3.07 MB brotli** [V]); WebGPU (`.jsep.wasm` 28.3 MB raw / 5.48 MB br [V]) only for the optional reranker, never for the ~25-token query (prefix included). Self-hosted, `connect-src 'self'`, CSP `'wasm-unsafe-eval'` on `/historian` only. transformers.js is at **4.3.0** [V]; its v4 API was **not** re-verified today [U] — pin and spike in B0.
5. **Index.** Exact brute-force scan over int8 vectors — **no HNSW/IVF**. Measured on this desktop (Core Ultra 7 265H, Node 24, scalar JS): 50 k × 384 int8 = **11.0 ms**, binary-popcount prefilter **0.8 ms**, 200 k × 384 = 43.7 ms / 3.3 ms [M, §2.4]. Phones: **[E]** 3–8× slower, to be measured on real devices in B0. Corpus planning envelope: **9.5 k embedded chunks for Official Records alone (measured)**, 25–35 k after state volumes and participant narratives, ceiling 50 k [E from hist-sources-1 §9-17]; 384-d int8 = 3.6 / 11.5 / 19.2 MB (+2 B/vector for the fp16 scale).
6. **Footprint (opt-in only).** ≈ **27 MB** query-side (model 22.97 + ORT wasm 3.07 br + JS/tokenizer ≈ 1) + **13–21 MB** vectors/columns = **≈ 40–48 MB one-time**, zero bytes on first paint, immutable-cached. iOS Safari can evict it: WebKit deletes all script-writable storage after **7 days of Safari use without interaction** unless the site runs as a Home-Screen web app [V webkit.org/blog/10218]; browser-app origin quota is up to 60 % of disk (15 % for non-browser WebKit apps) [V webkit.org/blog/14403]. The design therefore treats the download as *re-buyable*, offers Home-Screen guidance, requests `navigator.storage.persist()`, and always degrades to T0.
7. **Cost guard.** Netlify bandwidth is 20 credits/GB and the Free plan is a 300-credit **hard** limit [R infra-netlify-30, plan UNVERIFIED]. At today's ≈110 Historian pageviews/30 d [R seo-growth G7] the 40 MB opt-in costs ≈ 26 credits/month at a 30 % opt-in; at 10× traffic it would consume ≈ 88 % of the Free allowance. So: budget flag + kill switch in the manifest, and a pre-agreed move of the heavy blobs to a zero-egress host at scale (§8.9, §14.4).
8. **Ship criteria (kill switch for the whole workstream).** After the B0 bake-off, if hybrid (BM25 + dense, RRF) does not beat BM25-only by **≥ +10 points recall@5 on the paraphrase subset with a 95 % paired-bootstrap CI excluding 0**, or misses the latency/size budgets in §14, **stop B** and invest only in A + build-time document expansion (doc2query-style, §4.4). Pilot reference for the size of effect to expect: BM25 recall@5 is 66.7 % on keyword-style and 27.3 % on plain-language phrasings of the same 33 information needs [M].
9. **Effort (B-owned, solo dev, ESTIMATE):** B0 spike 4 d → B1 corpus foundation 6–8 d → B2 client runtime 5–6 d → B3 UX + ops 5–7 d → (B4 per-source ingest QA 1–2 d per source family; source acquisition itself is owned by hist-sources-1/2) → B5 rerank/highlight/opt 3–4 d → B6 optional static tier/fine-tune 3–5 d. **Core B (B0–B3): ≈ 20–25 person-days; with six source-family QA passes (B4) and B5 ≈ 29–41 d; +3–5 d if the optional B6 R&D is pursued** — excluding source acquisition (45–80 d, hist-sources-1 §8) and Design A (H1–H2, ≈ 6–9 d, hist-current §8.7).
10. **Human review is the real cost**, not compute: embeddings of ~35 k chunks take on the order of tens of minutes on one CPU core [E]; entity/time/perspective QA of the same corpus is weeks of part-time work (§7.7).

---

## 1. Scope, assumptions, and the contract with Design A

### 1.1 Inputs read
`BRIEF.md`; `hist-current.md` (the 175-query battery, F01–F12, H0–H3 phases, prototype numbers); `hist-sources-1.md` / `hist-sources-2.md` (source catalog, rights tiers, extraction playbook, size budgets, evidence-record schema); `data-integrity.md` (ID namespace DI-02, provenance DI-23, KB contract DI-27, validator spec, versioning); `infra-netlify.md` (CSP classes, COOP/COEP stance, credits, Historian API skeleton, item 31), `perf-runtime.md` (item 33 scale budgets), `perf-cwv.md`, `seo-growth.md` (traffic, feedback events, human-reviewed Q&A), `app-time.md` (canonical `tickToClock`); the deployed `historian.html` (208 lines), `sw.js` (76 lines), `netlify.toml`. Live probes with `curl`; HF API/model cards; jsDelivr package listings; caniuse JSON; WebKit blog posts.

### 1.2 What "Design A" is assumed to be (I was not given A's document)
A = the static, lexical-first design the sibling plans converge on: `search-core.js` (normaliser, alias/entity linker, fuzzy repair, intent rules, BM25F, no-answer gate), `composers.js` (deterministic answers from structured rows), `facts.v1.json`, a build script that emits a sharded passage store and inverted index, an evidence-record schema, and a Web Worker (hist-current §8.1–8.5; hist-sources-2 §9; perf-runtime-33; data-integrity DI-27). **B adds; it never replaces.** If A's real interfaces differ, only the adapter in §4.3 changes.

**Interfaces B requires from A (all must exist before B2):**
| # | Interface | Shape | Why B needs it |
|---|---|---|---|
| I1 | Passage store | `chunk_id → {text, citation, license, …}` in `passages/<source>/<shard>.json`, ≤ 40 KB brotli per shard, immutable names | B stores no text; it retrieves ids, A supplies text |
| I2 | Lexical channel | `lexSearch(analysis, filters, k) → [(chunk_id, score, matched_terms)]` | Fusion partner and fallback |
| I3 | Analysis | `analyze(q) → {tokens, entities[], intent, notes[], dayScope}` | Entity-conditioned dense search, fusion weights, gate |
| I4 | Composers + facts | `compose(intent, entities) → {text, sources[], limited?}` | Structured questions never go through dense retrieval |
| I5 | Gate features | lexical coverage, unknown-token ratio, name-field hit | B extends the same decision function |
| I6 | Entity/ID namespace | canonical unit/place/person ids after DI-02, plus the crosswalk for the 28 dual-use and 95 unresolved ids [R data-integrity §0 #3] | Passage entity tags must join the same ids as the map and OOB |
| I7 | Time model | `clockToTick(day, minutes)`, `tickToClock(tick)` from `time_anchors.json` [R app-time §6] | Time-anchored retrieval and "show on map" links |
| I8 | Worker + message bus | one Worker owning index + search | B's dense code lives in the same Worker or a sibling |

**Sequencing rule:** B0 (spike) may start against a private copy of the OR27 text today; B1+ waits for I1/I6/I7 or ships with the documented temporary crosswalk.

### 1.3 Explicit non-goals
* No server-side embedding, no third-party API at runtime, no analytics on query text (Design C, if the owner wants it, is a separate track — infra-netlify-31).
* No generative on-device LLM (decision and revisit criteria in §5.6).
* No Tier-C sources (American Battlefield Trust, Ancestry family, FamilySearch, Stone Sentinels, ACHS, HMDB bulk) are ever fetched, embedded or indexed (hist-sources-2 §3).
* No replacement of A's deterministic composers for numbers, commanders, casualties, times.
* Not a fix for SEO: passages reachable only through JS are invisible to crawlers (seo-growth §0 #5); static Q&A pages are that plan's job.

---

## 2. Evidence: what I measured and verified (so the design rests on numbers)

### 2.1 Headroom for semantic retrieval on the *current* corpus [M]
Source: `tmp-hist-current/rows_{primary,heldout}_B3.json` (hist-current's best prototype, B3 = new retriever + unused site data, 957 records). Strict failures = not relevant@1, or missing fact, or wrongly refused, or canonical card outside top 3, or should-decline not declined.

| Battery | queries | strict failures (B3) |
|---|---|---|
| primary | 118 | 13 (Q024 Q032 Q059 Q072 Q076 Q078 Q086 Q087 Q088 Q090 Q095 Q105 Q114) |
| held-out | 57 | 10 (H010 H038 H039 H043 H044 H045 H046 H049 H056 H057) |

My classification of the 23 (single annotator):
| Class | n | Members | Can dense retrieval help? |
|---|---|---|---|
| Alias / rule gaps (Vermont brigade, "Robert E. Lee" surname collision, day-scope override, Pennsylvania Reserves, Chamberlain-on-July-2, 26th NC on July 1) | 6 | Q024 Q032 Q072 H010 H056 H057 | No — A's aliases/rules |
| Structured facts, aggregates, relations, time (Pickett's Charge time, highest casualties, Union strength, Pickett's brigades, who fought the 20th Maine, Confederate II Corps and cavalry commanders) | 7 | Q059 Q076 Q078 Q086 Q114 H038 H039 | No — composers/facts/time model |
| Site routing / ancestor phrasing | 4 | Q087 Q088 H043 H044 | No — intent rules |
| Scope / decline (John Smith, capital of France, restaurant, D-Day, "how do I get to the battlefield") | 5 | Q090 Q095 H045 H046 H049 | **Assistable** (exemplar kNN scope classifier, §9.7) |
| Typo | 1 | Q105 "Pickets charge" | **Assistable** (subword model) |

**Reading:** B's ceiling on the existing battery is ≈ 6/175 = **3.4 points**. Anyone selling B on the current 658–957 records is wrong; B is a bet on the *expanded prose corpus* (H3). That is why B0 is a gate (§15) and why the golden set (§12) must be dominated by passage-level and paraphrase questions the current battery does not contain (it has 118 + 57 entity/fact-style queries; 0 passage-gold questions).

### 2.2 Real chunk statistics for the Official Records [M]
`tmp-arch-semantic-local/chunker.py` cleans (de-hyphenation, running heads) and chunks `tmp-hist-sources-1/or27_{1,2,3}.txt` (paragraph-aligned, target 170 words, max 260, minimum 25).

| | Pt 1 | Pt 2 | Pt 3 | Total |
|---|---|---|---|---|
| Raw OCR | 3.95 MB | 3.86 MB | 3.39 MB | 11.20 MB |
| Chunks | 4,096 | 4,033 | 3,296 | **11,425** |
| Words / chunk (mean, median, p90, max) | 142 / 152 / 170 / 260 | 142 / 150 / 170 / 259 | 148 / 158 / 170 / 260 | 1,639,722 words |
| Narrative share (my heuristic classifier) | 87.1 % | 86.5 % | 73.6 % | **83.0 % (9,483)** |
| Table / list-noise / index chunks | 319 / 167 / 42 | 311 / 184 / 48 | 328 / 450 / 93 | 958 / 801 / 183 |

Also: **27.8 %** of chunks contain ≥ 1 clock-time expression (3,176) and **35.5 %** mention a numbered unit (heuristic regex) — so time and unit tagging are not edge cases, they are the main metadata. Rule of thumb from this measurement: **≈ 1 chunk per 1 KB of raw OCR text**, of which ≈ 83 % should be embedded (tables/indices/noise are excluded from the dense index and handled as structured rows or dropped). For hist-sources-1's ≈ 30 MB Gettysburg-filtered P0 text this predicts ≈ 30 k chunks (≈ 25 k embedded), consistent with its 20–50 k estimate.

### 2.3 Vocabulary-gap pilot on the same 11,425 chunks [M — a pilot, not an evaluation of B]
Files: `pilot_queries.py` (33 information needs × 3 registers), `pilot_bm25.py`, `pilot_bm25_results.json`, `pilot_judgments.json`.
* **Sample:** 40 narrative chunks drawn with seed 20260930 from OR27 Pts 1–2 (place-token filter), 33 kept as question-worthy.
* **Registers:** **S** = copies the report's own words; **K** = 4–8 word keyword query a visitor might type (names + topic words, no copied verbs); **P** = plain natural-language question (keeps names/places, swaps the report's verbs/nouns for everyday words). Gold = every chunk whose text matches a distinctive anchor phrase (so reprints/duplicates count).
* **Retriever:** BM25 (k1 1.2, b 0.75), lowercase alnum tokens, stop-word list, **ordinal normaliser** ("Eighty-second"/"82nd" → 82, approximating A's unit-key parser); no aliases, no entity boost (A would add those).

| Register | R@1 | R@3 | R@5 | R@10 | R@20 | MRR@20 | query-token overlap with gold |
|---|---|---|---|---|---|---|---|
| S (source words) | 100 | 100 | 100 | 100 | 100 | 100 | 97.7 % |
| K (keywords) | 48.5 | 63.6 | 66.7 | 75.8 | 87.9 | 58.2 | 75.0 % |
| P (plain question) | 12.1 | 24.2 | 27.3 | 27.3 | 39.4 | 18.1 | 36.6 % |
| P with light stemming | 9.1 | 18.2 | 21.2 | 24.2 | 33.3 | 14.3 | — |

Judging the 25 P-queries whose gold was not in the top 3 (I read all 75 top-3 chunks): **8/33 (24.2 %)** answer the question in the top 3; **16/33 (48.5 %)** return only topically related chunks; **9/33 (27.3 %)** return three off-topic chunks (index tables, other theatre, other date) — and a lexical gate would still *answer* them because words matched. Stemming does not help (matches hist-current's ablation: stemming ≈ 0).

**Caveats (do not skip):** single author who wrote P with the gold in view (adversarial-ish; treat the S→P drop as an upper bound of the vocabulary gap, not a user-log estimate); single annotator; strict single-passage gold (other valid passages count as misses for *any* retriever, so absolute numbers are lower bounds; the A-vs-B *difference* is what matters); no dense system was run because no model was downloaded (see §2.7). Purpose: to size the headroom and to define the golden-set format, nothing more.

### 2.4 Retrieval-kernel micro-benchmark [M]
`bench_bruteforce.mjs`; Intel Core Ultra 7 265H (16 logical), 31 GB, Node v24.19.0, scalar JS, unrolled ×4, one thread.
| N × d | int8 dot + per-vector scale | float32 dot | binary popcount prefilter | binary + int8 rescore (≈ top-200) | int8 store |
|---|---|---|---|---|---|
| 12,000 × 384 | 2.6 ms | 2.8 ms | 0.19 ms | 0.33 ms | 4.6 MB |
| 50,000 × 384 | **11.0 ms** | 12.6 ms | **0.80 ms** | 1.00 ms | 19.2 MB |
| 50,000 × 256 | 7.4 ms | 7.4 ms | 0.60 ms | 0.69 ms | 12.8 MB |
| 50,000 × 768 | 20.8 ms | 21.3 ms | 1.50 ms | 1.77 ms | 38.4 MB |
| 200,000 × 384 | 43.7 ms | 43.3 ms | 3.34 ms | 3.41 ms | 76.8 MB |
Desktop, not phone. **[E]** phones 3–8× slower ⇒ 33–90 ms for the 50 k int8 scan, 3–7 ms with the binary prefilter; WASM SIMD would be faster than this JS loop. Conclusion: exact scan is comfortably inside budget to ≥ 200 k vectors; ANN adds index build, memory (HNSW graph ≈ 1.5–2× vectors [E]) and load cost with no benefit at this scale.

### 2.5 Models and runtimes (verified today) [V]
HF API/model cards, jsDelivr package listings, 2026-09-30. "MTEB retr" = mean nDCG@10 over the 15 MTEB-English retrieval tasks as recorded in each card's `model-index` (my script `README parse`, CQADupstack subsets averaged); MiniLM's figure is from the Model2Vec card table.
| Model | License | Params | Dim | MTEB retr | int8 ONNX | Max seq | Notes |
|---|---|---|---|---|---|---|---|
| **snowflake-arctic-embed-xs** | Apache-2.0 (card §License) | 22.6 M | 384 | **50.15** | **22.97 MB** (`onnx/model_int8.onnx`, official repo) | 512 | smallest good retriever; transformers.js-tagged |
| snowflake-arctic-embed-s | Apache-2.0 | 33.2 M | 384 | 51.98 | ≈ 34 MB [E] | 512 | |
| **bge-small-en-v1.5** | MIT | 33.4 M | 384 | **51.68** | 33.76–34.01 MB (Xenova repo) | 512 | card documents query instruction "Represent this sentence for searching relevant passages: " |
| gte-small | MIT | 33.4 M | 384 | 49.46 | — | 512 | |
| e5-small-v2 | MIT | 33.4 M | 384 | 49.04 | — | 512 | needs `query:`/`passage:` prefixes |
| all-MiniLM-L6-v2 | Apache-2.0 | 22.7 M | 384 | 42.92 | 22.97 MB | 256 (128 trained) | truncates our 170-word chunks |
| mxbai-embed-xsmall-v1 | Apache-2.0 | 24.1 M | 384 | 42.80 | — | — | |
| potion-base-32M / -base-4M (Model2Vec static) | MIT | — | — | 32.67 / 28.43 | 30.2 MB f32 (base-8M) | — | no transformer at query time |
| potion-retrieval-32M (static) | MIT | 32 M | — | 35.06 | 129 MB f32 (≈ 32 MB int8 [E]) | — | best static retriever |
| nomic-embed-text-v1.5 | Apache-2.0 | 136.7 M | 768 (MRL) | — | ≈ 137 MB [E] | 8192 | too large for a phone download |
| EmbeddingGemma-300m | Gemma terms (not OSI) | 302.9 M | 768 (MRL) | — | — | — | licence + size exclude it |
| Cross-encoder ms-marco-MiniLM-L6-v2 | Apache-2.0 | 22.7 M | — | — | 23.01–23.14 MB (Xenova) | — | reranker candidate |
| jina-reranker-v1-tiny-en | Apache-2.0 | 33.0 M | — | — | — | 8 k | reranker candidate |
| mxbai-rerank-xsmall-v1 | Apache-2.0 | 70.8 M | — | — | — | — | larger reranker option |
| answerai-colbert-small-v1 | Apache-2.0 | 33.4 M | per-token vectors | — | — | — | late-interaction option; multi-vector index too large for a phone [E] |
Runtimes: **onnxruntime-web 1.30.0** (`latest`): `ort-wasm-simd-threaded.wasm` 14.24 MB raw / **3.07 MB br** (HEAD with `Accept-Encoding: br`), `.jsep.wasm` (WebGPU) 28.31 MB / **5.48 MB br**, `.asyncify.wasm` 26.8 MB, JS 0.05–0.87 MB. **@huggingface/transformers 4.3.0** (`latest`; `4.0.0-next.11` on `next`), `dist/transformers.web.min.js` 0.45 MB. Model licences are attribution-only; ship `THIRD_PARTY_LICENSES.md` (§13.1).

### 2.6 Platform facts [V]
* **Netlify serves `Accept-Ranges: bytes` and 206 partial content** for static files (`/assets/index-*.js` → `HTTP/1.1 206`, `Content-Range: bytes 0-99/2280438`; PDF the same); JSON is served `Content-Encoding: br`; assets are `immutable` (curl 2026-09-30). ⇒ packed binary files with byte-range reads are possible; JSON shards get Brotli for free.
* **WebKit storage (Safari 17+/iOS 17+):** browser-app origin quota up to 60 % of disk, overall 80 %; other WebKit apps 15 %/20 %; Home-Screen web apps share the browser's quotas; `StorageManager.estimate()`/`persist()` supported, `persist()` granted by heuristics such as being a Home-Screen web app; `QuotaExceededError` must be handled; quota may vary with visit frequency to limit fingerprinting (webkit.org/blog/14403).
* **ITP 7-day cap:** after 7 days of Safari use without user interaction with the site, all script-writable storage (IndexedDB, LocalStorage, SessionStorage, service-worker registrations **and caches**) is deleted; Home-Screen web apps have their own use counter and are not expected to be purged (webkit.org/blog/10218). ⇒ For a visitor who reads the Historian monthly in Safari, the 40 MB will usually be gone; design for re-download.
* **caniuse (JSON, today):** WebGPU global full 85.7 % (+3.1 % partial); Chrome/Edge 113+, Android Chrome 154, iOS Safari **26.0+** full, desktop Safari and Firefox partial/flagged; WebAssembly SIMD 95.7 % (Safari/iOS 16.4+); SharedArrayBuffer 96.2 % (needs cross-origin isolation for threads). ⇒ WASM+SIMD is the universal baseline; WebGPU is an accelerator for the reranker only.
* **Site constraints:** `netlify.toml` CSP is Report-Only with `script-src 'self' 'unsafe-inline'…` and no `wasm-unsafe-eval` and `connect-src 'self' …` (lines in `netlify.toml`, header `Content-Security-Policy-Report-Only`); `/data/*` = `public, max-age=3600` (not immutable); `sw.js` **deletes every cache whose name ≠ `CACHE_NAME`** on activate (`sw.js:24-31`) and network-first-caches every `/data/` response (`sw.js:58-70`). infra-netlify-05 rejects COEP site-wide (Street View frames) but nothing prevents a per-page policy on `/historian`.

### 2.7 What I could not measure (honest limits)
* **No neural embedding was run.** Downloading model weights is a file download I did not have approval for, and no Python ML stack is installed (`sentence_transformers`, `onnxruntime`, `sklearn` all absent). Consequently *every quality claim about dense retrieval in this document is a design target or a citation of public benchmarks, not a result*. B0 exists to turn them into results.
* No phone was available: all phone latencies are **[E]**.
* transformers.js v4 documentation could not be fetched today (tool quota); v4 env option names below follow the v3 API and must be re-verified [U].
* Netlify plan/credit balance unknown [R infra-netlify-30].
* The golden set (~150) is specified here (§12) but does not exist yet; the pilot's 33 questions are its first seed.

---

## 3. Goals, principles, success criteria

### 3.1 Goals (each has a metric in §12/§14)
| # | Goal | Measure |
|---|---|---|
| G1 | Find the *answer passage* for natural-language and paraphrased questions over period prose | recall@5, MRR@10, nDCG@10 on the paraphrase/passage subsets, vs A |
| G2 | Never make A worse: entity/fact/structured questions still resolved by A's deterministic path | ≤ 1-point regression on G1 subset (canonical@1, fact@3) |
| G3 | Every displayed claim is traceable to a quoted span with a page-level citation and licence | citation precision ≥ 0.90; quote fidelity 100 % (byte-exact) |
| G4 | Say "I don't have that" correctly, including when embeddings would happily return a nearest neighbour | refusal F1 ≥ 0.92 on ≥ 40 items |
| G5 | Privacy by construction: query text, embeddings and feedback stay on the device | network log test: 0 requests containing query text; `connect-src 'self'` |
| G6 | Zero cost to people who do not opt in: no bytes, no main-thread work, no CWV change on first paint | Lighthouse `/historian` unchanged (≥ 95 mobile/desktop), CLS/INP/LCP deltas ≈ 0 |
| G7 | Works offline after opt-in, degrades gracefully, recoverable after eviction | offline test; eviction test on Safari |
| G8 | Governable: licences enforced in CI, corrections shippable in a day, versions pinned | §13 |

### 3.2 Principles
1. **Lexical first, semantic assists.** Dense similarity is not calibrated and is weak on rare names/numbers (the current battery is mostly names and numbers: the ablation shows derived aliases, entity linking, fuzzy repair, intent+composition and the no-answer gate are the load-bearing parts, hist-current §4.3). Dense retrieval is a *second channel*, never the only one.
2. **Evidence, not generation.** The system quotes sources; it does not paraphrase them into new claims. A history site's failure mode is a fluent wrong sentence.
3. **Provenance is a hard constraint.** A chunk without `source_id`, licence, locator, and a resolvable citation cannot be indexed (build fails).
4. **Progressive enhancement with an honest state machine.** T0 always works; each higher tier is announced, sized, cancellable, removable, and never silently swaps results under the reader's cursor.
5. **One shared ID space.** Chunks tag the same unit/place/person ids as the map, `regiment.html`, Find-Ancestor and A (DI-02). No second namespace.
6. **Measure, then ship.** Every optional component has an ablation row and a kill criterion (§12.7, §15).

### 3.3 Success criteria for shipping B (all must hold; numbers set from A's measured baseline on the golden set at B0)
* Paraphrase/passage subset: recall@5 ≥ A + 15 points absolute **and** nDCG@10 ≥ A + 0.08; 95 % paired-bootstrap CI of the difference excludes 0.
* Entity/fact subset (from the 175 battery): canonical@1, fact@3, S@1 regress ≤ 1 point; typo S@1 ≥ A.
* Refusal F1 ≥ max(A, 0.92); zero "off-topic answered" among the ≥ 25 refusal items after the gate.
* Citation precision ≥ 0.90 (human-judged, n ≥ 100 shown citations); faithfulness audit of 100 answers: **0** unsupported claims.
* Budgets in §14 met on the real-device matrix (§12.9).

---

## 4. Architecture

### 4.1 Tiers (progressive enhancement)
| Tier | What runs | Extra download | When |
|---|---|---|---|
| **T0** | Design A only (lexical + entity + composers + gate) | 0 | default for everyone; fallback for every failure |
| **T0+** | T0 with **build-time document expansion** (§4.4): indexed-only synonym/paraphrase fields, no runtime ML | +5–10 % of A's index [E] | ships with A's index; removes part of the vocabulary gap for free |
| **T2** *(optional)* | dense channel with a **static-embedding** query encoder (table lookup, no WASM) | ≈ 8 MB model (int8 [E]) + 7.7 MB vectors (30 k × 256) | only if B0 shows it retains ≥ 85 % of T3's lift; otherwise dropped |
| **T3** *(default semantic tier)* | dense channel: arctic-embed-xs int8 in ORT-web WASM, Worker | ≈ 27 MB runtime + 13–21 MB vectors/columns | explicit opt-in ("Deep search") |
| **T4** *(optional on T3)* | cross-encoder rerank of top 20 (WebGPU if present, else WASM), sentence highlighting with the loaded encoder | +23 MB reranker | opt-in inside T3; desktop-first; off on Save-Data/low-memory |

**Out of B:** T5 = server LLM (Design C). B's passage ids, citations and gate are designed so C can reuse them.

### 4.2 Runtime topology
```
main thread (UI only)                     historian.worker.js  (module worker, one)               Cache Storage (own cache, not the SW's)
 ├─ historian.js  (DOM, a11y, state)  ⇄   ├─ search-core (A):   analyze → lex BM25F → gate         historian-v{corpus}-vec / -model / -rt
 │    postMessage({q, filters, ctx})       ├─ dense/                                                 (versioned; manifest-driven cleanup)
 │    ← {answer, cards, notes, timings}    │   ├─ store.js    load vectors+columns (typed arrays)
 │                                         │   ├─ encoder.js  tokenizer + ORT session (lazy, after opt-in)
 ├─ enable-flow.js (size, quota, consent,  │   ├─ scan.js     masked exact int8 scan (+binary prefilter if N>100k)
 │    progress, cancel, remove)            │   ├─ fuse.js     weighted RRF + priors + MMR + diversity
 └─ evidence-panel.js (citations, filters) │   ├─ gate.js     calibrated answer/partial/decline (+scope exemplars)
                                           │   └─ rerank.js   (T4) cross-encoder, optional
                                           └─ passages.js (A): getPassages(ids) → fetch shard JSON (HTTP cache / Cache Storage)
```
* **All model and vector work is in one dedicated Worker**; the main thread only sends strings and receives plain objects. Rationale: INP (audit P1): no long task on Ask; ORT session creation and 20 MB typed-array upload never touch the UI thread.
* **Cross-origin isolation is not required.** ORT runs `numThreads = 1`, `proxy = false` (we are already in a worker). A batch-1 query of ~25 tokens (documented prefix included) gains little from threads; a per-page COOP+COEP on `/historian` is *possible* (nothing cross-origin loads there) and is reserved for the optional reranker (§5.5).
* **Message contract:** `search({id, q, filters, ctx, tier}) → {id, mode:'answer'|'partial'|'decline', lead, cards[], notes[], timings{analyze,lex,encode,scan,fuse,gate,fetch}, trace?}`; a second message `refine({id})` may arrive later with dense-only evidence when the model was still warming (§11.5).

### 4.3 Adapter to A
`dense/` exposes `denseSearch(qVec, mask, k)`; `search-core` calls it only if `state.tier ≥ T2` and the intent class allows (§9.2). If A's `lexSearch` signature differs, only `adapter.js` (~60 lines) changes. B keeps **zero** knowledge of A's tokenizer: fusion is by `chunk_id` and rank, so A may change analyzers without re-embedding.

### 4.4 T0+: build-time expansion (semantic without a runtime model)
For each embedded chunk generate 3–6 **modern-phrasing queries** (doc2query-style) and a "plain summary" line with an LLM or a local model at build time; index them in a separate BM25 field `expansion` (weight ≈ 0.5), **never display them and never treat them as a source**. Budget: ≈ 30 k chunks × ~120 output tokens ≈ 3.6 M tokens [E]; human spot audit of 200. Why include it: it attacks the same vocabulary gap the pilot measured (P-register R@5 27 %) at zero runtime cost and benefits every visitor including T0. Risks: LLM-generated text in an index → provenance flag `generated:true` on the field, excluded from quote spans and citations, dropped from the corpus if the audit finds > 5 % misleading expansions. It is also the *fallback if the B0 gate fails*.

### 4.5 Degradation ladder (every rung is tested)
`T3+T4 → T3 → T2 → T0+ → T0`. Triggers: opt-out; storage estimate too small or `QuotaExceededError`; download/parse failure or hash mismatch; model/vector `model_id` mismatch with manifest; ORT init failure or > 5 s init; Worker OOM/crash (caught, tier lowered, remembered for the session); `Save-Data`/effectiveType ≤ 3g → never *prompt*, but an explicit opt-in still works; kill-switch flag in `manifest.json` (`semantic.enabled=false`). The UI always shows which tier answered (§11.2 status line).

---

## 5. Model, quantization and runtime decisions

### 5.1 Encoder selection
**Constraint that shapes everything:** the query encoder runs on the visitor's phone, so *the passage vectors must come from the same model*. A large teacher cannot be used for passages unless a student query encoder is trained to mimic it (§5.7). Hence a small dual encoder.

**Decision:** default **`Snowflake/snowflake-arctic-embed-xs`** (6 layers, 384-d, CLS pooling, 512 max positions [V config.json]; query prefix `Represent this sentence for searching relevant passages: ` [V card]; passages embedded with no prefix). Reasons: Apache-2.0; the smallest int8 file among the good retrievers (22.97 MB vs 34 MB for bge-small); half the layers ⇒ roughly half the query latency of a 12-layer model [E]; MTEB retrieval 50.15 vs 51.68 (−1.5). **Quality alternative:** bge-small-en-v1.5 (12 layers). **Excluded:** all-MiniLM-L6-v2 (256-token cap truncates our chunks; retrieval 42.9), nomic/EmbeddingGemma (size, licence).

**B0 bake-off protocol (decides the pick, not my preference):**
1. Embed the same ≈ 7.5 k OR27 Pt1–2 narrative chunks with {arctic-xs, arctic-s, bge-small, gte-small, e5-small-v2} + {potion-retrieval-32M as the static reference} using the *exact ONNX int8 file* planned for the browser (via `onnxruntime` in Python or Node) — never PyTorch fp32 for the index and int8 for the query (parity, §5.4).
2. Evaluate on the golden paraphrase/passage subset (≥ 60 questions, S/K/P registers): recall@{1,5,10,20}, MRR@10, nDCG@10; alone and fused with BM25 (RRF).
3. Rule: pick the **smallest** model whose hybrid recall@10 is within the paired-bootstrap noise of the best (i.e. not significantly lower at 95 %); ties → fewer layers → smaller file.
4. Record cos-parity: mean cosine between fp32 and int8 *query* embeddings ≥ 0.98 and recall@10 drop from int8 ≤ 1 point, else use fp16 (45.3 MB for xs [V]) or `q4f16`.

**Text fed to the encoder (both sides):**
* Passage: `"{title_path} — {text_clean}"` where `title_path` = `"{source_short} · {doc_title/author (unit)} · {date_written}"` (a contextual header; cheap, usually worth several points on passage retrieval [E — ablated in §12.7]). Truncate at 480 tokens (chunks are ≈ 200–340 tokens [E: ≈ 1.35–1.6 tokens/word; OCR noise raises it]).
* Query: model's documented prefix + normalised question (curly quotes → ASCII, whitespace collapsed; **not** A's alias-expanded form).

### 5.2 Quantization and dimensionality
| Format | Bytes/vec (d = 384) | 30 k vectors | 50 k | Use |
|---|---|---|---|---|
| fp32 | 1,536 | 46.1 MB | 76.8 MB | build only |
| fp16 | 768 | 23.0 MB | 38.4 MB | fallback if int8 parity fails |
| **int8 + per-vector fp16 scale** | 386 | **11.6 MB** | **19.3 MB** | **shipped** |
| binary (sign bits) | 48 | 1.4 MB | 2.4 MB | derived at load from the int8 file (no extra download) — prefilter only if N > 100 k or measured phone scan > 40 ms |
| int8 @ 256 (MRL-truncated) | 258 | 7.7 MB | 12.9 MB | only for models trained with MRL (arctic-embed-xs/bge-small are **not** MRL-trained [E: card does not claim it — verify]); not used by default |
* Vectors are **L2-normalised, then scalar-quantised per vector** (`scale = max|x|/127`); score = `dot_int8(q,v) · scale_v · scale_q`. Per-vector scales cost 2 B and remove the outlier problem of a global scale.
* int8 does not compress (Brotli ≈ 0–5 %); do not count on transport compression for vectors.
* **No ANN** (§2.4). Revisit at N > 250 k or if the measured p95 phone scan (after binary prefilter) exceeds 60 ms.

### 5.3 Runtime: ONNX Runtime Web (+ tokenizer), not WebGPU, for queries
| Option | Verdict |
|---|---|
| **onnxruntime-web 1.30 WASM SIMD, single thread, in a Worker** | **Chosen.** Universal (SIMD 95.7 %), 3.07 MB br runtime, deterministic, no cross-origin isolation, no GPU warm-up |
| WebGPU (`.jsep`) for the query | Rejected: 5.48 MB br extra, shader compile + adapter init cost seconds for a ~25-token query; iOS needs 26+; results vary across GPUs |
| WebGPU for reranker/batch | Optional T4 (larger matmuls amortise the init) |
| transformers.js 4.x as the wrapper | **Start with it in the spike** (handles `tokenizer.json`, pooling, ORT session); keep raw ORT + a vendored WordPiece tokenizer as the planned fallback if the wrapper's size or v4 churn hurts. Pin exact versions; self-host; re-verify option names for 4.x [U] |
| Custom-trimmed ORT build (operators used by BERT only) | Optional later (could cut the 14 MB wasm substantially [E]); needs a build toolchain — B6 |
| llama.cpp/wllama GGUF embedding | Not chosen: extra runtime, no advantage over ORT for a 22 M-param BERT |
Configuration (v3-style names; re-verify for 4.x [U]):
```js
ort.env.wasm.numThreads = 1;  ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = '/historian/rt/ort-1.30.0/';     // self-hosted, immutable
// transformers.js: env.allowRemoteModels = false; env.allowLocalModels = true;
//   env.localModelPath = '/historian/models/'; env.useBrowserCache = false;   // we own the cache (§8.5)
const session = await ort.InferenceSession.create(modelBytes, { executionProviders:['wasm'], graphOptimizationLevel:'all' });
```
CSP for the `/historian` document class: `script-src 'self' 'wasm-unsafe-eval' 'sha256-…'`; `worker-src 'self'`; `connect-src 'self'`; `frame-ancestors 'self'` (§8.8). ORT's dynamic `import()` of its `.mjs` glue must be same-origin.

### 5.4 Parity rules (the classic silent failure of on-device retrieval)
1. **Index and query use the same ONNX file** (same quantisation) — the build embeds with `onnxruntime`, not PyTorch. 
2. **Tokenizer parity test:** 500 strings (OCR-noisy sentences, unit names "20th Maine", possessives, curly quotes, non-ASCII, empty, very long) tokenised by the reference (`tokenizers`/HF) and by the browser tokenizer must give identical ids (CI test; blocks release).
3. **Embedding parity test:** for 200 queries, cos(browser, build-time reference) ≥ 0.999 (same file) ; browser-vs-Node top-10 identical for ≥ 98 % of the golden queries.
4. Prefix, pooling (CLS), normalisation and truncation length are stored in the manifest (`encoder:{prefix, pooling, max_tokens, normalize}`) and read by the client — never hard-coded twice.
5. `model_id` = sha256 of the ONNX file; vectors carry it in their header; the client refuses to combine mismatching pairs.

### 5.5 Reranker (optional, T4)
Cross-encoder `ms-marco-MiniLM-L6-v2` int8 (23 MB [V]; trained on MS MARCO web questions — must be *validated* on period prose, may not help, §12.7) or `jina-reranker-v1-tiny-en` (Apache-2.0, 33 M [V]). Input: (query, top-20 fused chunk texts, ≤ 384 tokens each) ⇒ 20 pairs. WebGPU if `navigator.gpu` and ≥ 4 GB `deviceMemory` (Chrome only) else WASM with K = 10. Latency budget: ≤ 400 ms desktop, ≤ 1.5 s mid-phone **[E]**, shown as a progress refinement, never blocking the first result. Adopt only if the ablation gives ≥ +3 nDCG@10 on the golden set; otherwise use the cheap feature reranker (§9.5).

### 5.6 No on-device generative model (decision)
Small WebGPU LLMs (0.3–3 B params, 0.3–2 GB downloads [E]) would let the page *paraphrase* evidence. Rejected for B because: (a) the product's risk is a fluent unsupported sentence; extractive quotes are faithful by construction; (b) 0.3–2 GB downloads are incompatible with iOS eviction/quota and the site's cost model; (c) iOS < 26 has no WebGPU; (d) evaluation of generative faithfulness needs a much larger human budget. **Revisit if** (1) a ≤ 500 MB model passes a 100-answer faithfulness audit with 0 unsupported claims under constrained "quote-and-cite" prompting with span verification, and (2) ≥ 60 % of the target audience has WebGPU. Until then Design C (server) is the route for generation.

### 5.7 Optional R&D (B6, only if the golden set shows a domain gap after B3)
* **Domain fine-tune** of the chosen small model on ≈ 20 k synthetic (question, passage) pairs generated at build time from the corpus (MultipleNegativesRanking loss; hard negatives from BM25) — typically the biggest single lever for a niche domain [E]. Requires re-embedding, new `model_id`, and a licence note for the synthetic data. Keep a held-out set that the synthetic generator never saw.
* **Static student for T2:** distil the fine-tuned model into a Model2Vec-style static table (≈ 8 MB int8) to give phones a no-WASM tier that is better than off-the-shelf `potion-*`.
* **Asymmetric retrieval:** embed passages with a large teacher offline, train a small student only for the *query* side to land in the teacher's space (halves the quality gap at the same phone cost) — research-grade, low priority.

---

## 6. Data model

### 6.1 IDs and namespaces
* `chunk_id`: `"{source_id}:{doc_key}:{seq}"`, stable across rebuilds when the source text is unchanged; e.g. `OR27-1:0196:003` (OR Ser. I vol. 27 pt. 1, report No. 196, chunk 3). Text edits keep the id and bump `rev`; splits/merges retire ids into `supersedes[]`.
* `doc_id`: `"{source_id}:{doc_key}"` (report, article, regiment section, dispatch).
* Entity ids are the **DI-02 canonical ids** (`U-20ME`, `C-15AL`, brigade/division/corps ids; `LOC-###` for the 30 terrain locations + roads/structures; `P-…` for persons; `EV-…` for chronology events and vignettes; `MON-###` for the 512 monuments). Until DI-02 lands, the crosswalk `data/source/id_crosswalk.json` (seed: the 95-row table in data-integrity) is applied at build and every chunk stores **both** `unit_ids` (canonical) and `unit_ids_legacy`.
* `source_id`: the registry id. **Two catalogues use different numbering (OR27 is `SRC-01/02/06` in hist-sources-1, `SRC-19` in hist-sources-2)** — B adopts a single `sources.yaml` with stable slugs (`or27-1`, `or27-2`, `or27-3`, `ny-final-report`, `pa-at-gettysburg`, `bl3`, `shsp`, …) and keeps a `catalog_refs:{s1:'SRC-01', s2:'SRC-19'}` cross-reference so neither plan's ids are lost.

### 6.2 Chunk record (authoring form, JSONL; one line per chunk)
**Field shapes only — ILLUSTRATIVE.** Spans, ids, confidences, page ranges and the wording of `title_path`/`expansion` are placeholders (only `ia_id` and the report number/first page 622 come from hist-sources-1-01); real values are produced by S1–S6.
```jsonc
{
  "chunk_id": "OR27-1:0196:003",
  "doc_id": "OR27-1:0196",
  "rev": 1,
  "kind": "narrative",                       // narrative | dispatch | testimony | address | inscription | caption | table_row | index | header
  "embed": true,                              // false for table/index/header/noise: retrievable only via structured paths
  "text": "…cleaned passage text, ≤ 260 words…",
  "text_raw_ref": {"ia_id":"warofrebellion271unit","leaf_start":712,"char_start":48213,"char_end":50017},
  "title_path": "OR27-1 · Chamberlain, Col., 20th Maine · 6 Jul 1863",
  "citation": {
    "short": "O.R., Ser. I, vol. 27, pt. 1, p. 623",
    "long": "War of the Rebellion: Official Records, Ser. I, vol. 27, pt. 1 (Washington: GPO, 1889), report no. 196, pp. 622–626",
    "locator": {"printed_page": 623, "page_span": [622, 626], "report_no": 196},
    "url": "https://archive.org/details/warofrebellion271unit",
    "page_url": "https://archive.org/details/warofrebellion271unit/page/n712",   // leaf deep link (hist-sources-1-14)
    "retrieved": "2026-09-30", "sha256_source": "…"
  },
  "source_id": "or27-1", "catalog_refs": {"s1":"SRC-01","s2":"SRC-19"},
  "license": {"spdx":"LicenseRef-PD-US-Gov-1889", "tier":"A", "attribution": null, "may_index": true, "may_quote_chars": 1200, "share_alike": false},
  "perspective": {"side":"union","role":"regimental","genre":"official_report","written":"1863-07-06","lag_days":4,
                  "retrospective": false, "bias_tags": [], "controversy_ids": []},
  "entities": {
    "units":   [{"id":"U-20ME","role":"author_unit","conf":0.99,"spans":[[0,14]]}, {"id":"U-83PA","role":"mentioned","conf":0.93,"spans":[210,238]}],
    "places":  [{"id":"LOC-003","conf":0.97,"spans":[[120,136]]}],
    "persons": [{"id":"P-CHAMBERLAIN-JL","conf":0.99,"spans":[[0,8]]}],
    "events":  [{"id":"EV-D2-LRT-2000","conf":0.7}]
  },
  "unit_ids_legacy": [],
  "time": {                                    // SOURCE-STATED time only; never rewritten to the site's clock (C4)
    "anchors": [{"text":"about 4 p. m.","day":2,"minutes":960,"modifier":"about","tol_min":30,"basis":"stated","conf":0.9,"span":[1204,1217]}],
    "range": {"day":2,"start":960,"end":1140},
    "tick_est": {"value": 220, "time_model": "tm-2026.10.1", "derived": true}   // recomputed each build via clockToTick; used ONLY for map links/filters
  },
  "geo": null,
  "quote_spans": [{"start":412,"end":703,"kind":"key_sentence"}, {"start":1204,"end":1290,"kind":"time_anchor"}],
  "quality": {"ocr_score":0.98, "ocr_flags":[], "confidence":"A",       // A = primary, clean, entity+page verified · B = auto-linked, sampled · C = single-source/OCR-noisy
              "entity_review":"auto_ok", "review": {"status":"approved","by":"ML","on":"2026-11-02"}},
  "sensitivity": [],   // any of: period_racial_language | graphic_injury | human_remains | contested
  "dedupe": {"cluster_id":"dc-000412","canonical":true,"also_in":[{"source_id":"pa-at-gettysburg","chunk_id":"…"}]},
  "expansion": {"generated": true, "queries": ["what did chamberlain do when his regiment ran out of ammunition"]},   // indexed only, never shown
  "supersedes": [], "retracted": false,
  "embedding": {"model_id":"sha256:…", "row": 18422, "shard": "or27-1"}    // filled by the packer
}
```
* **`confidence` letters** align with the data-integrity provenance block (`A/B/C`, §9 of that report); `basis` values there (`documented|reconstructed|derived|schematic`) map to `stated|inferred|day_only|none` for time anchors.
* **Quote spans** are character offsets into `text`; the UI highlights them and the composer may quote only within them or within a sentence selected at query time (§9.8). A validator asserts `text[start:end]` is non-empty and sentence-aligned.
* `may_quote_chars` is the per-source display cap (Tier A: generous; Tier B share-alike: quote-only blocks with attribution; Tier C: forbidden, record rejected).

### 6.3 Entity and source tables (shared with A / DI-27)
`kb/units.jsonl`, `kb/places.jsonl`, `kb/persons.jsonl`, `kb/events.jsonl`, `kb/monuments.jsonl`, `kb/sources.yaml` (registry: `id, slug, title, edition, year, publisher, url, ia_id, rights{tier,statement_text,statement_url,retrieved}, attribution, may_index, may_redistribute, ocr_score, catalog_refs`), `kb/aliases.jsonl` (surface → entity, with `derived|curated`, from hist-sources-1-02 and hist-current Appendix A), `kb/controversies.yaml` (id, title, sides, seed queries, required source mix — e.g., Longstreet's July 2 delay, Sickles' advance, Pickett's Charge timing, Ewell/Cemetery Hill). Person ids are new (698 distinct commander names exist unindexed [R data-integrity DI-27]).

### 6.4 Shipped artefacts (runtime form)
| File | Content | Format | Size model (N = 30 k embedded, 35 k total) |
|---|---|---|---|
| `manifest.json` | versions, hashes, sizes, model/encoder config, thresholds, flags, licence roll-up, changelog pointer | JSON, `no-cache` | ≤ 8 KB |
| `vec.{collection}.{hash}.gvec` | header + fp16 scales + int8 rows | binary, immutable | 11.6 MB total across collections |
| `cols.{hash}.gcol` | columnar metadata (typed arrays) for masks/priors | binary (br via transport) | ≈ 70–90 B/chunk ⇒ 2.5–3 MB raw, ≈ 1–1.5 MB br |
| `passages/{source}/{shard}.{hash}.json` | chunk text + citation (A's store, I1) | JSON, br | ≤ 40 KB br per shard; ≈ 10–14 MB br total |
| `lex/…` | A's inverted index shards | JSON/binary | A's budget (2–3 MB br for OR) |
| `models/{model}/{file}.{hash}` | ONNX, `tokenizer.json`, `config.json` | binary/JSON, immutable | 23.7 MB (xs) |
| `rt/ort-1.30.0/*.wasm`, `*.mjs` | ORT-web runtime | immutable | 3.1 MB br |
| `thresholds.{model_id}.json` | calibrated gate/fusion parameters | JSON | < 2 KB |

**`.gvec` header (64 B, little-endian):** `magic "GVEC"`, `u16 version`, `u8 dtype (1=int8)`, `u8 flags`, `u16 dim`, `u32 n`, `u32 model_id32`, `u32 corpus_version`, `u32 scales_off`, `u32 data_off`, reserved, `u32 crc32`. Row order = `cols` order = `meta` order (one canonical sort: `source, doc_key, seq`). Reader validates `crc32`, `dim`, `n` against the manifest before use.

**`.gcol` columns (all `n`-long unless stated):** `source_idx u8`, `kind u8`, `flags u8` (retrospective, contested, sensitivity bits, generated-expansion, canonical), `day u8` (0 = unknown, 1–3 battle days, 4–9 aftermath/other dates via a small lookup), `t_start u16`, `t_end u16` (minutes from 00:00, `0xFFFF` unknown), `t_conf u8`, `ocr_q u8`, `doc_idx u32`, `page u16`; ragged arrays as `offsets u32[n+1]` + values: `unit_idx u16[]`, `place_idx u16[]`, `person_idx u16[]`, `event_idx u16[]` (indices into the entity id tables shipped inside the file), plus a small string table for `source_short`. This lets the Worker build masks (side, day, time window, source, perspective, entity) with typed-array loops and **no per-chunk JSON parse**.

### 6.5 Versioning
* `corpus_version` semver: **MAJOR** = embedding model change, schema break, id renames; **MINOR** = new sources/collections/chunks; **PATCH** = corrections/text fixes. `data-manifest` hash covers all shipped files (data-integrity §8).
* Old shard files are never overwritten (content-hashed names); manifest points at the new set; clients delete caches whose `corpus_version` is not the manifest's (§8.7).
* `retracted:true` chunks are removed from vectors/cols at rebuild and listed in `manifest.tombstones[]` so a client with an old cache purges them even before it re-downloads.

---

## 7. Ingestion pipeline (download → OCR cleanup → segmentation → linking → dedupe → validation → review → embedding → packaging)

Acquisition of the sources themselves (fetch infra, rights registry, unit alias table, OR segmentation, Fox tables, state books, newspapers, maps, photos) is **owned by hist-sources-1 items 01–17 and hist-sources-2 items 01–27**. B owns everything from *chunking* onward and the contract those plans must satisfy. Stages are idempotent; each writes JSONL plus a manifest line; the whole pipeline runs from a Git repository (BRIEF N1 / infra-netlify-28) so runs are reproducible.

```
S0 acquire ─▶ S1 clean ─▶ S2 segment+chunk ─▶ S3 link entities ─▶ S4 time anchors ─▶ S5 tag perspective/sensitivity
   │ (owned by sources plans)                                                                    │
   ▼                                                                                             ▼
S6 dedupe ─▶ S7 validate ─▶ S8 review queue ─▶ S9 embed (same ONNX as browser) ─▶ S10 pack+manifest ─▶ S11 evaluate gates ─▶ S12 publish
```

### 7.1 Stage table
| Stage | Input → output | Method | Gate / acceptance |
|---|---|---|---|
| **S0 Acquire** | IA `_djvu.txt`/`_djvu.xml`/`_page_numbers.json`, LoC JSON, PNA pages → `raw/` + `sources.lock.json` (url, sha256, bytes, retrieved, licence snapshot) | per hist-sources-1-12 (per-host token bucket, identifying User-Agent, 1 req/s to IA; LoC ≤ 12 req/min) | source registry entry with `tier ∈ {A,B}`, `statement_text`, `may_index=true`; Tier C ⇒ hard stop (hist-sources-2 §3 CI rule) |
| **S1 Clean** | raw OCR → `text_clean` + `ocr_score` per page/chunk | NFC; de-hyphenate line breaks; strip running heads per source (regex list, e.g. `Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 595`); collapse double spaces (IA text has many); repair long-s/ligatures; conservative OCR fixes with a **frequency-ratio dictionary** built from the corpus (`tbe→the`, `bas→has`; edit distance 1, ratio ≥ 50:1; never touch capitalised tokens, unit numbers, or anything in the alias table); OCR score = share of ≥ 3-letter tokens in the OR-derived vocabulary (hist-sources-1 §2 method, Appendix A) | `text_clean` vs raw similarity ≥ 0.95 (no silent rewriting); per-source median `ocr_score` ≥ 0.90 else re-OCR queue (hist-sources-1-13) |
| **S2 Segment + chunk** | cleaned text → `docs.jsonl`, `chunks.jsonl` | source-specific document boundaries (OR: ToC + header regex, hist-sources-1-01; state books: regiment headings via alias table; B&L: contents; dispatches: header lines; testimony: witness headings); paragraph-aligned chunking, **target 170 words, max 260, min 25**, sentence-aligned splits, one overlapping sentence only when a paragraph is split; never cross a document boundary; `kind` classifier (narrative / dispatch / testimony / table_row / index / header / list-noise — my heuristic gave 83 % narrative on OR27, §2.2) ; `title_path` composed from document metadata | `embed=false` for table/index/header/noise; 100 % of `embed=true` chunks have a resolvable page locator |
| **S3 Link entities** | chunks → `entities` with char spans, roles, confidences | §7.2 | precision ≥ 0.97 for `auto_ok` on the QA sample; mid-confidence to review |
| **S4 Time anchors** | chunks → `time.anchors[]`, `time.range` | §7.3 | day-accuracy ≥ 0.95 on `stated`; never overwritten by the site clock |
| **S5 Perspective / sensitivity** | doc metadata → `perspective`, `sensitivity`, `controversy_ids` | §7.4 | 100 % of narrative/testimony chunks carry `side, role, genre, written, retrospective` |
| **S6 Dedupe** | chunks → `dedupe.cluster_id`, `canonical`, `also_in` | §7.5 | exactly one canonical per cluster; quoted-second-hand flagged |
| **S7 Validate** | everything → pass/fail report | 25 rules (§7.6) | any **E** rule fails the build |
| **S8 Review** | queue → approved/edited/rejected | §7.7 | contested + mid-confidence + sampled chunks reviewed before publish |
| **S9 Embed** | `embed=true` chunks → fp32 → L2 → int8 + scales | **run the exact shipped ONNX (int8) with `onnxruntime` (Python or Node)**, passage text `title_path — text_clean`, batch 64, length-sorted, CLS pooling, normalise, per-vector scale; deterministic ordering | parity tests §5.4; self-retrieval top-1 = self for 200 random chunks (V-17) |
| **S10 Pack** | vectors/cols/manifest | `.gvec` + `.gcol` per collection, content-hash names, manifest with sizes, licences, thresholds | budgets §14 (build fails when exceeded) |
| **S11 Evaluate** | golden set → metrics vs baseline | `scripts/eval-historian-semantic.mjs` (§12.8) | all gates §12.7 |
| **S12 Publish** | dist → Netlify deploy | additive deploy (old hashed files kept ≥ 2 versions), changelog entry, tombstones | manifest flips last (atomic switch) |

### 7.2 Entity extraction and linking (S3)
**Dictionaries** (all from data already on the site or the alias table of hist-sources-1-02): 570 unit records (467 regiments + 103 batteries) plus 93 brigades, 31 divisions, 11 corps, 2 armies and 23 artillery battalions/brigades [R data-integrity §1]; 698 distinct commander names; 30 terrain locations + 20 roads/structures/features; 137 chronology events and 24 vignettes as event anchors; 512 monuments. Aliases: derived (ordinal spellings, "82nd/Eighty-second/82d", parenthetical militia numbers "Eighty-fourth New York (Fourteenth Militia)", `{surname}'s brigade/division/corps`, nicknames) + curated (hist-current Appendix A: "Rocky Hill" = Round Top in OR usage, "Cemetery Ridge/Hill", "Seminary Ridge", "Devil's Den", "Wheat-field/Wheatfield", "Culp's/Gulp's Hill" etc.).

**Algorithm**
1. Normalise like the pilot (§2.3): curly→ASCII quotes, possessive stripping, ordinal → integer, OCR variant folding (`Emmettsburg`, `Wheat-field`).
2. Candidate generation: Aho–Corasick longest-match over the alias trie; fuzzy (Damerau-Levenshtein ≤ 1) only for place/person tokens ≥ 6 characters, **never** for unit numbers.
3. **Unit disambiguation** uses context, not text alone: `number + state + arm` is unique for regiments; bare "First Brigade / Second Division / Third Corps" is resolved against (a) the document's author unit chain, (b) the nearest preceding fully-qualified formation within 120 words, (c) side inferred from `perspective.side`; otherwise the mention stays **unlinked** (`unresolved_mentions`) rather than guessed. Batteries: "Cushing's/Hazlett's battery", "Battery B, 4th U.S." via commander alias.
4. **Person linking:** rank+surname or full name within the document's side; a bare surname links only if unique among that side's commanders at that echelon; collisions (e.g., "Robert E. Lee" vs battery commanders named Robert — hist-current Q032) require full-name evidence.
5. **Confidence** = calibrated score from features (exact alias, ordinal+state agreement, context agreement, distance to the report header, fuzzy distance); bins `≥ 0.90 auto_ok`, `0.60–0.90 → review`, `< 0.60 → discard link, keep mention`. Calibrate on the 100-chunk QA sample per source.
6. **Denormalise ancestors:** each linked regiment also stores `unit_ancestors` (brigade, division, corps) from the OOB parent ids so "everything about the Iron Brigade / I Corps" is one filter. Requires the VI Corps brigade records (DI-07) and the DI-02 crosswalk (the 28 dual-use ids and 95 unresolved placement ids resolve through it).
7. Document-level defaults: an official report's `author_unit` (from the OR header "Col. Joshua L. Chamberlain, Twentieth Maine Infantry") tags *every* chunk of the report with role `author_unit` even when the chunk says "my regiment".

**Deliverable metrics:** linking precision/recall on the QA sample; % of the 570 unit ids with ≥ 1 chunk (hist-sources-1-02's coverage target ≥ 95 % joined to some source); list of units with none (drives source acquisition priority).

### 7.3 Time anchors (S4) — source-stated times, never the site's clock
**Why this matters (audit C4):** the site's own clock labels are inconsistent (Longstreet 7:30 am, Pickett 11:05 am, `app-time.md`, `time-facts.md`). B therefore stores **what the source says** and never "corrects" it to the map's clock. The Historian shows "reported as about 4 p. m." with the citation; map links use `tick_est` derived from the canonical model (`clockToTick`) and are hidden until that model ships (feature flag, as hist-current §8.5).

**Extraction:** regex + lexicon: `about|at|near|by|until|before|after|from` + `H[:.]MM a. m./p. m.`, `H o'clock`, `noon`, `midnight`, `daybreak`, `sunrise`, `sunset`, `dusk`, `nightfall`, `twilight` (lexicon values with tolerances); ≈ 5,420 hits expected across OR27 (heuristic, hist-sources-1-06); **27.8 % of OR27 chunks contain ≥ 1** [M §2.2].
**Day resolution** (the hard part): a per-document state machine seeded by the header date line and advanced by in-text markers ("July 2", "the 2d", "the following day", "at daylight on the 3d"); each anchor records `basis ∈ {stated (clock + explicit date), inferred (date from context), day_only, none}` and `conf`. Ambiguous → `day = null` (never guessed).
**Storage:** `{text, day, minutes, modifier, tol_min, basis, conf, span}` + a chunk-level `range`; `tick_est` recomputed at every build from `time_anchors.json` and tagged with the `time_model` version so a time-model change invalidates it without touching the source-stated fields.
**QA:** 100 random anchors hand-checked per source; target day accuracy ≥ 0.95 for `stated`.

### 7.4 Perspective, sensitivity and controversy tags (S5)
Rules by source family (reviewer can override): OR Pt 1 reports → `side:union, role:regimental|brigade|division|corps|army, genre:official_report`; OR Pt 2 → `confederate`; OR Pt 3 correspondence → side of the author, `genre:dispatch`; state monument volumes → `union|confederate (by state), genre:veteran_memory, written:1889–1917, lag ≈ 26–54 years, retrospective:true`; Battles & Leaders / SHSP → `memoir/periodical`, `bias_tags:['lost_cause']` candidates for Confederate postwar accounts, `controversy_ids` for Longstreet–Early–Alexander disputes; Joint Committee → `testimony, partisan_committee_1864`; newspapers → `press, genre:newspaper` (often wrong, hist-sources-2 §6). `retrospective = written > 1863-12-31`.
**Sensitivity flags** (lexicon + reviewer): `period_racial_language` (slurs and period terms appear in primary sources — the chunk is kept, flagged, and shown behind a context note, §11.7), `graphic_injury`, `human_remains`, `contested`. Flags are columns in `.gcol` so the UI can filter/annotate without parsing text.

### 7.5 Dedupe (S6)
Exact: sha1 of normalised text. Near-duplicate: 5-word shingles, 128-perm MinHash + LSH (bands 16×8), Jaccard ≥ 0.8 → cluster (the same report appears in OR, in state volumes and in Bates reprints; OR27-1 also quotes Lee's report inside a Union summary — pilot sample #7). **Canonical** = primary public-domain original with best `ocr_score`, then earliest `written`, then longest. Others become `also_in` (shown as "also printed in …") so citations are richer, not duplicated. Second-hand quotation (a chunk ≥ 50 % overlapping another document) gets `flags.quoted_secondhand`. Post-embedding: pairs from *different* documents with cosine ≥ 0.97 go to review (catches paraphrased duplicates lexical shingling misses).

### 7.6 Validation rules (S7). **E** = fails build, **W** = report only
| ID | Sev | Rule |
|---|---|---|
| V-01 | E | Record validates against `chunk.schema.json` |
| V-02 | E | `source_id` exists in `sources.yaml`, `tier ∈ {A,B}`, `may_index=true`; **any Tier C ⇒ fail** |
| V-03 | E | Licence block complete; Tier B requires `attribution` and `share_alike` flag; Tier B chunks are placed only in their own collection file (never blended, hist-sources-2 §8) |
| V-04 | E | Citation resolvable: locator + `page_url` well-formed; `printed_page ∈ page_span`; IA leaf exists in `_page_numbers.json` |
| V-05 | E | `25 ≤ words ≤ 260` for `embed=true` |
| V-06 | E | `ocr_score ≥ 0.90` for `embed=true` (else `embed=false` + re-OCR queue) |
| V-07 | E | Developer-note/placeholder blocklist on any **composed or generated** string: `/(must (be )?shown\|CRITICAL:\|animation\|keyframe\|HIGHEST PRIORITY)/i`, `undefined`, `null`, `NaN`, `--`; raw internal ids (`\b[UC]-[IVX0-9A-Z-]+\b`) forbidden in UI strings (source quotes exempt) |
| V-08 | W→E | Every entity id resolves in `kb/*` or the crosswalk; unresolved mentions kept separately |
| V-09 | E | Official-report documents have an `author_unit` |
| V-10 | E | Time anchors: `0 ≤ minutes < 1440`, known day codes; `tick_est` monotone in time |
| V-11 | E | Quote spans inside `text`, sentence-aligned |
| V-12 | E | `chunk_id` unique; ids removed since last version are listed as tombstones |
| V-13 | E | Each dedupe cluster has exactly one canonical |
| V-14 | E | Perspective present for narrative/testimony |
| V-15 | E | Any chunk matching the period-language lexicon has the flag |
| V-16 | E | Vector `model_id` = manifest; pre-quantisation norm ∈ [0.99, 1.01]; no NaN/Inf |
| V-17 | E | Self-retrieval: for 200 random chunks, top-1 of the int8 scan is the chunk itself (guards row-order/packing bugs) |
| V-18 | E | `.gvec` rows = `.gcol` rows = manifest count; `crc32` correct |
| V-19 | E | Size budgets (§14) |
| V-20 | E | Licence roll-up lists every source present in the build |
| V-21 | W | Mojibake (`�`), residual OCR patterns (`tbe`, `bas`) below threshold per chunk |
| V-22 | E | No chunk crosses a document boundary |
| V-23 | E | Text fidelity: normalised similarity between `text_clean` and raw ≥ 0.95 |
| V-24 | E | `expansion.generated=true` on every generated field; generated text absent from `quote_spans`, citations and `passages/` |
| V-25 | E | All gold ids in the golden set still exist (else the set must be re-baselined explicitly) |

### 7.7 Human review queue (S8) — the actual bottleneck
* **Priority score** = mid-confidence entity links + contested/controversy tag + numeric claims (casualty/strength/time) + inferred (not stated) day + `ocr_score < 0.95` + sensitivity flag + 2 % uniform random sample.
* **Tooling (solo-dev friendly):** `review export` writes a CSV per batch (`chunk_id, source, citation, text, proposed entities, proposed times, tags, flags, decision, note`), opened in a spreadsheet; `review import` merges decisions, writes `review.status/by/on`; edits become `corrections.jsonl` overlays applied at build (the raw source is never edited).
* **Who:** owner + 1–2 volunteers per the seo-growth reviewer programme (a licensed battlefield guide, a Round Table historian, a teacher). Contested/controversy chunks require an *approved* status; everything else may ship as `auto_ok` only above the calibrated thresholds.
* **QA sample** (hist-sources-1-16): 100 random chunks per source family, five checks (text fidelity, entity correctness, time correctness, citation resolves, perspective correct); pass ≥ 95 % or the source is held back.
* **Effort model [E]:** for OR27 (≈ 9.5 k embedded chunks) assume 15 % reach the queue ≈ 1.4 k × 45 s ≈ 17 h + 2.5 h QA per source family ⇒ **≈ 1–2 person-days per source family**, dominated by linking/time review, not by embedding.

### 7.8 Build artefacts and repository layout
```
historian-data/
  sources.yaml  sources.lock.json  kb/{units,places,persons,events,monuments}.jsonl  kb/aliases.jsonl  kb/controversies.yaml
  raw/ (git-ignored)   work/{docs,chunks,linked,timed,tagged,dedup}.jsonl   corrections.jsonl   review/*.csv
  schemas/chunk.schema.json  manifest.schema.json
  scripts/{fetch,clean,segment,link,time,tag,dedupe,validate,review,embed,pack,eval,publish}.{py,mjs}
  dist/historian/v{corpus_version}/…  (what is deployed)
  tests/{tokenizer-parity,embedding-parity,validators,golden}.…
```
Deterministic: sorted inputs, fixed seeds, pinned package versions; CI recomputes `dist/` from `raw/` and fails on diff.

---

## 8. Storage, hosting and CDN layout

### 8.1 URL layout (all same-origin; `/historian/` is a new prefix, **not** `/data/`)
```
/historian/manifest.json                                     Cache-Control: no-cache
/historian/v/{corpus_version}/vec.{collection}.{hash}.gvec   public, max-age=31536000, immutable
/historian/v/{corpus_version}/cols.{hash}.gcol               immutable
/historian/passages/{source}/{shard}.{hash}.json             immutable   (A's store, I1)
/historian/lex/…                                             immutable   (A's index)
/historian/models/arctic-embed-xs/{model_int8.{hash}.onnx, tokenizer.{hash}.json, config.{hash}.json}   immutable
/historian/rt/ort-1.30.0/{ort-wasm-simd-threaded.wasm, ort-wasm-simd-threaded.mjs, ort.wasm.min.mjs}    immutable
/historian/thresholds/{model_id}.json                        immutable
```
Two rules from infra-netlify: (1) headers are emitted by the `_headers` generator (`scripts/gen-netlify-config.mjs`), not appended to `netlify.toml`, so no header name is set by two rules; (2) heavy files never live under `/data/` (its rule is `max-age=3600`, and `sw.js` caches every `/data/` response).

### 8.2 Headers to add (generator input)
```
/historian/v/*            Cache-Control: public, max-age=31536000, immutable
/historian/models/*       Cache-Control: public, max-age=31536000, immutable
/historian/rt/*           Cache-Control: public, max-age=31536000, immutable
/historian/passages/*     Cache-Control: public, max-age=31536000, immutable
/historian/manifest.json  Cache-Control: no-cache
/historian /historian.html (document, CSP class "historian"):
   Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-…'; worker-src 'self';
       connect-src 'self'; img-src 'self' data:; style-src 'self' 'sha256-…'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'
```
`Content-Type: application/wasm` for `.wasm` is required for streaming compile (Netlify infers from extension — **verify with `curl -I` after the first upload [U]**). Brotli applies automatically to JSON/JS/WASM but *not* to already-incompressible int8 vectors; ORT `.wasm` is served `Content-Encoding: br` (3.07 MB transfer [V via jsDelivr; Netlify's own encoding to be confirmed]).

### 8.3 Range reads and packed files (available, not needed yet)
Netlify returns `206` with correct `Content-Range` for static files [V]. If the passage store grows beyond ≈ 3,000 shard files, switch A's store to **packed source files + an offset table + `Range:` reads** (one request per shard-sized block; blocks pre-compressed with `deflate-raw` and decoded with `DecompressionStream`, because CDN compression and Range interact badly). Not needed at 30–50 k chunks (≈ 250–350 shards at ≈ 150 chunks/shard).

### 8.4 Service-worker interplay — two blocking bugs in the current `sw.js`
1. **Cache purge on every SW version bump.** `sw.js:24-31` deletes *every cache whose name ≠ `CACHE_NAME`* (`keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))`). A 40 MB `historian-…` cache created by the page would be wiped on the next SW update (the file's own comment says to bump `CACHE_NAME` on each deploy). **Fix:** `keys.filter(k => k.startsWith('gbg-') && k !== CACHE_NAME)`.
2. **Interception of `/historian/*`.** Everything same-origin flows through the SW's `fetch` handler (`sw.js:35-76`); `/data/` responses are `put` into `gbg-v5` on every fetch (`sw.js:58-70`). **Fix:** first line of the handler `if (url.pathname.startsWith('/historian/')) return;` so the browser HTTP cache and our own Cache Storage serve these bytes with no SW hop and no double storage.
The infra-netlify Appendix E service-worker rewrite (audit C6/P5) must adopt both rules. Also: never call `location.reload()` when the Historian data version changes (C6 root cause); show a non-blocking "Updated sources available" notice.

### 8.5 Client cache manager (`enable-flow.js` + `cache.js`)
```js
async function enableDeepSearch(manifest, {signal, onProgress}) {
  const need = Math.ceil(manifest.semantic.bytes.total * 1.3);                       // headroom for temp copies
  const est = await navigator.storage?.estimate?.() ?? {};
  if (est.quota && est.usage != null && est.quota - est.usage < need) return {ok:false, reason:'space', need, have: est.quota - est.usage};
  try { await navigator.storage?.persist?.(); } catch {}                              // heuristic; Safari grants for Home-Screen apps
  const cache = await caches.open(`historian-v${manifest.corpus_version}-${manifest.semantic.model.id.slice(7,15)}`);
  for (const f of manifest.semantic.files) {                                          // sequential, 2 in flight max
    if (await cache.match(f.url)) continue;                                           // resume
    const res = await fetch(f.url, {integrity: f.sri, signal});                       // SRI: sha256-…
    await cache.put(f.url, res.clone());                                              // throws QuotaExceededError → handled
    onProgress(f);
  }
  await pruneOldCaches(manifest);                                                     // delete historian-* not matching the manifest
  return {ok:true};
}
```
* **Detect eviction** at every Historian load: if the "enabled" hint (localStorage, try/catch, treated as a hint only) is set but `cache.match(manifest.semantic.files[0].url)` is empty → show "Your browser cleared Deep search data. Turn it back on (≈ 40 MB)?" — never re-download automatically.
* **Safari 7-day rule:** do not promise persistence. Copy says "may be cleared by your browser after a week without visits"; offer "Add to Home Screen" guidance (the manifest currently locks orientation to landscape — audit E1 — fix that first).
* Errors mapped to plain messages: space, network, hash mismatch, unsupported browser, init failure; each leaves the tier at T0.
* **Remove data** button: deletes the caches and the hint; shows freed MB.
* Parsed vector arrays live only in Worker memory (`Int8Array` over the cached bytes: ≈ 20 MB for 50 k × 384); no IndexedDB copy.

### 8.6 Offline
After opt-in: search works offline for everything already in Cache Storage. Text shards are fetched lazily and are added to the same cache (`passages/*` immutable). A separate **"Make fully available offline" (+ ≈ 10–14 MB [E])** button prefetches all passage shards of the enabled collections. If offline and a shard is missing, the card shows the citation and "text not downloaded yet" instead of failing.

### 8.7 Update flow
`manifest.json` (≤ 8 KB, `no-cache`) is fetched **only on `/historian`** at load. Same `corpus_version` ⇒ nothing. Newer ⇒ notice "Updated sources (+N MB; changes: …)"; on accept: download only changed hashed files, switch atomically, prune old cache. `manifest.tombstones[]` are applied immediately to any cached passage list. Rollback = redeploy the previous manifest.

### 8.8 CSP and headers for the page class
`'wasm-unsafe-eval'` only on the Historian document class (infra-netlify Appendix: map class does not need it). Inline script in `historian.html` moves to a module (hist-current UX-16) so hashes/`'self'` suffice. `connect-src 'self'` — no third-party origin at runtime (models are self-hosted; **no Hugging Face hub calls**).

### 8.9 Cost model and hosting alternatives
Traffic today: ≈ 3,389 pageviews / 30 d, of which the Historian ≈ 110 (68 + 42) [R perf-cwv, seo-growth G7]; site bandwidth ≈ 328 MB / 30 d [R infra-netlify-30].
| Scenario (per month) | Historian views | opt-in | payload | GB | Credits @ 20/GB [R, plan UNVERIFIED] | % of Free 300 |
|---|---|---|---|---|---|---|
| Today | 110 | 30 % → 33 | 40 MB | 1.3 | 26 | 9 % |
| Today, iOS re-downloads ×1.5 | 110 | 30 % | 60 MB effective | 2.0 | 40 | 13 % |
| SEO success ×10 | 1,100 | 30 % → 330 | 40 MB | 13.2 | 264 | **88 %** |
| A single abusive scraper (100 downloads of the vectors+model) | — | — | 4 GB | 4 | 80 | 27 % |
**Controls:** immutable hashing (returning users never re-download unless evicted); `robots.txt` `Disallow: /historian/v/ /historian/models/ /historian/rt/`; budget flag `semantic.enabled` + hidden prompt when credits > 60 % (infra-netlify-30 alert); Netlify path-level analytics reviewed weekly; pre-wired `manifest.base_url` so heavy blobs can move without a code change.
| Option | Egress | CSP impact | Notes |
|---|---|---|---|
| **Netlify same-origin (start here)** | credits | none | Range/br verified [V]; hard cap on Free |
| Cloudflare R2 + custom domain | egress-free by vendor design [U, not fetched today] | `connect-src` + 1 origin, CORS needed | needs a WAF/rate rule for abuse [U] |
| GitHub Pages / Releases | free with soft limits [U] | + 1 origin | large-binary terms unverified |
| jsDelivr (npm/GH) | free CDN [U] | already in `script-src`; add `connect-src` | per-file size limits unverified |
Decision point: revisit at the first month where semantic bandwidth > 25 % of credits.

---

## 9. Retrieval and ranking algorithm

### 9.1 Pipeline (per question; Worker)
```js
async function answer(q, filters, ctx, tier) {
  const A = analyze(q, ctx);                                   // A: tokens, entities[], intent, notes[] (did-you-mean), dayScope
  // 1) Structured path first (A): commanders, casualties, totals, succession, superlatives, ancestor/site routing
  const S = A.intent.structured ? composeStructured(A) : null;  // {text, sources[], confidence}
  if (S && S.confidence >= 0.9 && !A.wantsPassages) return finish({mode:'answer', lead:S.text, evidence: rows(S.sources)});
  // 2) Lexical channel (A) over the passage index
  const L = lexSearch(A, filters, 100);                         // [(chunk_id, score)]
  // 3) Dense channel (B), only if tier ≥ T2 and the intent class allows it
  let D = [];
  if (tier >= T2 && allowDense(A.intent)) {
    const qv = await encode(A.rawQuery);                        // ~25 tokens incl. prefix; warm-up handled at enable time
    const mask = buildMask(filters, A);                         // typed-array loops over .gcol
    D = scan(qv, mask, 100);                                    // global
    if (A.entities.length) D = unionTopK(D, scan(qv, mask & entityMask(A.entities), 50), 120);   // entity-conditioned
  }
  // 4) Fuse, prior, diversify
  let F = weightedRRF([L, D], weightsFor(A.intent), {k:60});
  F = applyPriors(F, A, cols);                                  // entity/time/tier/quality priors (multiplicative, bounded)
  if (tier >= T4 && rerankAllowed(A)) F = await rerank(A.rawQuery, F.slice(0,20));   // optional
  F = diversify(F, {perDocCap:2, mmrLambda:0.7, perspective: contestedNeeds(A, F)});
  // 5) Gate
  const G = gate({A, L, D, F});                                 // answer | partial | decline (+ reasons)
  if (G.mode === 'decline') return finish(declineCard(A, G));   // did-you-mean, scope explanation, chips
  // 6) Compose (extractive), then citations
  const passages = await getPassages(F.slice(0,5).map(x=>x.id)); // A's store; top-3 first, others lazily
  return finish(composeEvidence(A, S, F, passages, G));
}
```

### 9.2 Intent classes and which channels run
| Class | Examples | Structured | Lexical | Dense | RRF weights (L : D) |
|---|---|---|---|---|---|
| unit / person / place **lookup** | "20th Maine", "Cushing", "Cemetery Hill" | yes (A card) | yes | *skipped unless the user asks "more"*; entity-conditioned only | 1.0 : 0.3 |
| **fact** (who/when/how many) | "who commanded the Iron Brigade" | yes | yes | no (composer answers; passages only as optional evidence) | 1.0 : 0.3 |
| **what-happened** (event/place/unit narrative) | "what happened at the Peach Orchard" | partial | yes | yes | 1.0 : 0.8 |
| **why / how / explain / compare** | "why did Lee attack the center" | no | yes | **yes** | 0.6 : 1.0 |
| **perspective / quote-seeking** | "what did soldiers say about the wheatfield" | no | yes | **yes** | 0.7 : 1.0 |
| **time-anchored** | "what was happening at 4 pm on July 2" | partial (time model) | yes | yes + time-window mask | 0.8 : 0.8 |
| **site routing / ancestor** | "how do I find my ancestor" | yes (A rules) | no | no | — |
| **scope probe** (out-of-domain, visit planning, soldier-level) | "best restaurant", "was John Smith there" | A rules | gate | scope-exemplar kNN | — |
Rationale for skipping dense on lookups: dense embeddings underperform lexical matching on rare names and numbers, and A's prototype already reaches canonical@1 of 91 % (in-sample) / 86 % (held-out) on them [R hist-current §4.1]; the extra ~100 ms buys nothing.

### 9.3 Lexical channel (A's, reused unchanged)
BM25F over passage fields `{title_path ×3, entities/aliases ×2, place ×1.5, text ×1, expansion ×0.5}`, k1 = 1.2, b per field (hist-current QW-4). Returns `(chunk_id, score)` for the top 100. Uses A's normaliser (ordinal/possessive/OCR-variant folding), so B never re-tokenises.

### 9.4 Dense channel
* **Encode:** `prefix + q` → tokenizer → ORT session → CLS → L2 normalise → int8 quantise (scale = max|x|/127). Session is created **at opt-in/first Historian visit after opt-in, in `requestIdleCallback` inside the Worker**, never on the first Ask.
* **Mask:** typed-array loop over `.gcol`: side (from `perspective.side` bits), source/collection, day/time window (`t_start/t_end` overlap with a query window ± tolerance), `kind`, `sensitivity` (e.g. hide `human_remains` on request), `unit_idx` ∈ linked units ∪ ancestors (for entity-conditioned pass), `embed=true`, `retracted=false`, `ocr_q ≥ floor`, canonical-only for dedupe clusters unless the user asks for "all versions".
* **Scan:** exact int8 dot × scales over masked rows; keep a top-100 with a fixed-size min-heap. If N > 100 k or measured phone p95 > 40 ms: binary sign-bit Hamming prefilter → top-256 → int8 rescore (§2.4: 0.8–1.0 ms desktop at 50 k).
* **Entity-conditioned second pass:** when A links ≥ 1 unit/person/place, also scan only chunks tagged with those entities (a few hundred rows) and merge — this fixes the classic dense failure where the global top-100 is dominated by generic battle prose and the unit's own report never surfaces.
* **Query-time budget** in §9.9.

### 9.5 Fusion, priors and the feature reranker
**Weighted RRF:** `score(d) = Σ_c w_c / (k + rank_c(d))` with `k = 60` (tune ∈ {20, 60, 100}), weights from §9.2. RRF is chosen over score normalisation because BM25 scores are unbounded and cosines are uncalibrated; the ablation (§12.7) also tests a convex combination of min-max-normalised scores.
**Priors (multiplicative, each clamped to [0.8, 1.3] so no prior can override evidence):**
* entity: chunk tagged with a linked unit/person/place ×1.25 (×1.10 if only an ancestor matches);
* time: query has a day/time and the chunk's anchor range overlaps ± tolerance ×1.15; mismatching *day* ×0.85;
* source tier/genre: contemporaneous official report vs memoir chosen by intent ("what did X report" ×1.2 official; "what did soldiers remember" ×1.2 memoir);
* quality: `ocr_q` and `confidence A/B/C` (×1.05/1.0/0.95);
* dedupe: non-canonical duplicates ×0.5 (kept only to enrich `also_in`).
**Feature reranker (no model download):** a linear combination of ≤ 6 features (RRF score, entity match, phrase-in-title, time overlap, tier prior, passage length prior) with weights fitted on the golden **dev** split by coordinate ascent on nDCG@10 and validated on the frozen test split. Fewer than 8 parameters to avoid overfitting 150 questions. It is the default "reranker"; the cross-encoder (§5.5) replaces it only if it adds ≥ 3 nDCG@10 points.

### 9.6 Diversity and perspective coverage
* Max 2 chunks per document in the top 5; MMR (λ = 0.7) on chunk vectors (we already have them) over the fused top 30.
* **Contested-topic rule** (`controversies.yaml`, hist-sources-1-05): if the query's entities/keywords hit a controversy id, the answer set must include ≥ 1 Union and ≥ 1 Confederate passage when both exist in the top 30, plus ≥ 1 contemporaneous (≤ 1863-12-31) source when available; otherwise the card says which side/time is missing.
* Non-canonical duplicates are collapsed under the canonical with "also printed in …".

### 9.7 Gate: answer / partial / decline (this is where embeddings can hurt, so it is the most tested part)
A nearest neighbour always exists; a cosine of 0.6 does not mean "relevant". Signals (all on the golden dev split):
| Signal | Source | Meaning |
|---|---|---|
| `cov` | A | fraction of content tokens found in the lexical index (coverage gate) |
| `unk` | A | unknown-token ratio after fuzzy repair |
| `s1`, `margin` | B | top-1 cosine and (s1 − s10) of the masked scan |
| `agree` | fusion | Jaccard of top-10 lexical vs dense ids |
| `ent` | A | any linked entity / known topic |
| `oos` | B | **scope-exemplar kNN:** cosine to the nearest of ≈ 150 curated out-of-scope exemplars (weather, hotels, tickets, parking, restaurants, D-Day, capital of France, Antietam/Vicksburg, "was John Smith there") minus cosine to the nearest of ≈ 300 in-domain question exemplars; positive ⇒ out of scope |
Decision (form; thresholds fitted, stored per `model_id` in `thresholds/{model_id}.json`):
* **decline** if `oos > τ_o`, or (`cov < τ_c` and `s1 < τ_s`), or (`ent = 0` and `agree = 0` and `s1 < τ_s2`);
* **partial** ("weak match — closest records") if exactly one channel supports (e.g. `s1 ≥ τ_s` but `cov < τ_c`, or `agree = 0`);
* **answer** otherwise.
Fit by maximising F1 of the decline decision subject to *decline precision ≥ 0.95* (never refuse a good question) on ≥ 40 refusal + 40 answerable dev items; report the ROC. **Pilot warning:** 27 % of plain-language pilot questions retrieved only off-topic chunks yet had matching words — the lexical-only gate would have answered them (§2.3), so a dense-agreement signal must join the gate at T2+; at T0 the gate stays A's.

### 9.8 Sentence selection and quote spans (for the answer lead)
Each answer quotes **one passage-length excerpt** (≤ ~90 words) chosen inside the top chunk: (a) if the chunk has precomputed `quote_spans`, take the best-scoring span; (b) else score the chunk's sentences against the query — with the loaded encoder (embed ≤ 30 sentences from the top 3 chunks ≈ 30 short sequences, ~0.1–0.3 s on a phone [E]) or with lexical overlap when the model is not loaded. Highlight the matched span; runtime assertion `quote ⊂ chunk.text` (else drop the quote and show the whole chunk).

### 9.9 Latency budget (warm; **targets**, not measurements except where noted)
| Stage | Desktop | Mid-range phone [E] | Basis |
|---|---|---|---|
| analyze (A) | 1–3 ms | 5–10 ms | hist-current: 0.66–3.8 ms per query on desktop |
| lexical BM25F (A) | 5–15 ms | 20–50 ms | sharded index in Worker memory |
| encode (arctic-xs int8, ~25 tokens incl. prefix) | 20–50 ms | 100–250 ms | [E] 6 layers × 384; measure in B0 |
| dense scan (masked, 30–50 k × 384 int8) | 7–11 ms [M 11.0 ms @ 50 k] | 30–90 ms | §2.4 ×3–8 |
| fuse + priors + MMR + gate | 2–5 ms | 10–25 ms | |
| passage text fetch (top 3, cold network) | 30–150 ms | 60–300 ms | ≤ 40 KB br shards, HTTP/2 |
| (T4) cross-encoder 20 pairs | ≤ 400 ms (WebGPU/WASM) | ≤ 1.5 s | progressive refinement only |
| **p50 total, no rerank** | **≈ 100–200 ms** | **≈ 300–600 ms** | must not block input; INP measured on "Ask" |
| A-only (T0) | ≤ 50 ms | ≤ 120 ms | hist-current gate ≤ 30 ms p95 for search core |
Budgets to enforce (§14): p95 ≤ 250 ms desktop / ≤ 700 ms mid phone (T3, excluding text fetch and T4); no main-thread task > 50 ms during Ask or enable; Worker heap ≤ 400 MB peak.

### 9.10 Known dense-retrieval failure modes and the countermeasure for each
| Failure | Example | Countermeasure |
|---|---|---|
| Rare names/numbers/ordinals underweighted | "82nd New York", "Wiedrich's battery" | lexical channel + entity priors; lookup class skips dense |
| Negation/temporal reversal | "who did *not* attack" | intent rules refuse negation queries into "partial"; evidence-only answers avoid asserting polarity |
| Hubness / generic battle prose dominates | every question returns "the enemy advanced…" | entity-conditioned pass; MMR; per-doc cap; source-tier priors |
| OCR noise degrades vectors | `ocr_score < 0.95` chunks | `ocr_q` floor for embedding; noisy chunks retrievable lexically only |
| Near-duplicate flooding | same report in OR + state volume | dedupe clusters, canonical-only default |
| Period vocabulary ("rebels", "Rocky Hill" = Round Top) | user says "Round Top" | curated aliases in lexical channel; contextual `title_path`; T0+ expansion |
| Long/compound questions | 40-word question | truncate to 64 tokens, keep entities from A; split at " and " if two entities |
| Non-English or gibberish | — | `unk` high ⇒ decline |
| Query embedding drift after model change | — | `model_id` pinned; MAJOR bump; parity tests §5.4 |

### 9.11 Conversation context (rule-based; no LLM)
`ctx = {lastEntities, lastIntent, lastFilters, lastDoc}`. "What about the Confederates?" → same query + `side=confederate` filter; "tell me more" → neighbouring chunks (`seq ± 1`) of `lastDoc` and next-ranked chunks; "who commanded it?" → A's fact path with `lastEntities`. Follow-up chips are generated from the answer's entities/time/source (§11.6). Context lives in memory (+ optional `sessionStorage`, try/catch) and is cleared with "New conversation".

---

## 10. Answer composition (extractive, cited)

### 10.1 Answer object (contract between Worker and UI)
```jsonc
{ "mode": "answer|partial|decline",
  "tier": "T3", "notes": ["Showing results for Chamberlain (searched: Chamberlin)"],
  "lead": {"kind":"structured|quote|summary_of_evidence", "text":"…", "sources":[{"chunk_id":"…","span":[412,703]}]},
  "evidence": [ {"chunk_id":"OR27-1:0196:003","quote":{"start":412,"end":703},"why":["mentions 20th Maine","reported time: about 4 p. m."],
                 "perspective":{"side":"union","genre":"official_report","written":"1863-07-06","retrospective":false},
                 "citation":{…}, "map":{"unit":"U-20ME","tick_est":220,"enabled":false}, "flags":["period_racial_language"], "also_in":[…]} ],
  "accounts_differ": null | {"topic":"CTRL-LONGSTREET-DELAY","left":[…],"right":[…]},
  "follow_ups": [{"label":"Who commanded it?","q":"…"}],
  "filters_applied": {"side":null,"sources":["or27-1","or27-2"],"time":null},
  "timings": {…} }
```

### 10.2 Lead-sentence policy
1. **Structured lead** (A composers) for facts: "*20th Maine* was commanded at Gettysburg by Col. Joshua L. Chamberlain." — numbers/times only from structured rows with their own provenance (data-integrity DI-03/DI-11).
2. **Quote lead** for passage answers: "**Col. Joshua L. Chamberlain** (20th Maine, official report, 6 July 1863): “…” — *O.R., Ser. I, vol. 27, pt. 1, p. 623*."
3. **Summary-of-evidence lead** (multi-passage, e.g. "why"): a *template*, not prose generation: "The Official Records give **N** accounts, **U** Union and **C** Confederate. The closest are quoted below." Never a synthesized causal claim.
4. If A's composer and a quoted passage disagree on a number/time, show both and label "the site's record says … / this report says …" (this is exactly the C4 situation and the casualty-authority problem, DI-03).

### 10.3 Citation model (from `citation.*`, hist-sources-1-14)
Display: short cite + source title + author + date written + perspective chips + licence/attribution line; links: "Open the page scan" (IA leaf deep link), "Copy citation" (Chicago-style long form and the short form), "See on the map" (unit/tick, flag-gated), "Report an error". Multiple `also_in` shown collapsed. For Tier B quote-only blocks the attribution line is mandatory and rendered as a separate labelled block (never blended into the site's own words).

### 10.4 Quote rules
Only substrings of `chunk.text`; ≤ 90 words per quote (≤ `may_quote_chars`); ellipses only at sentence boundaries; runtime assert; **never merge text from two chunks into one quotation**; typographic normalisation only (curly quotes, `--`→`—`) applied at render, not to the stored text. OCR errors are shown as-is inside quotes only if the reviewer marked them `keep`; otherwise the cleaned text is shown with a "corrected from OCR" marker in the panel.

### 10.5 Contested topics and time statements
* `accounts_differ` card: side-by-side excerpts with `written`/`lag` and side chips; a one-line neutral header ("Participants disagree about …"); link to the matching Turning-Points page if it exists (seo-growth).
* Time is always **reported**: "reported as about 4 p. m." + who wrote it and when; never a bare "at 4 p. m." from a passage; map link uses `tick_est` from the canonical model and is hidden until it ships (C4).

### 10.6 Refusal and partial copy (templates)
* Decline: "I don't have a record that answers that. **Did you mean** …? This Historian covers the Gettysburg campaign, June 3 – August 3 1863, from the Official Records and other sources listed on the Sources page. Try: [chips]".
* Partial: "These are the closest records; they may not answer your question directly." + top evidence.
* Out-of-scope pointers per hist-current QW-10 (visit planning → an honest pointer, not a search).
* Soldier-level questions: honest statement of what rosters do/don't show (hist-sources-2 §6).

---

## 11. UI/UX

### 11.1 Layout (answer-first; extends hist-current §8.5, does not fork it). Wireframe is illustrative: names, dates and page numbers are placeholders except the quoted Lee excerpt, which is real OR27 Pt 2 text from the pilot sample
```
┌ Ask the Historian ─────────────────────────────────  [Sources ▾] [Filters ▾] [Deep search: On ✓] [⋯]
│  Answers come from published records. Every quote is cited.
│
│  You:  Why did Lee attack the Union center on July 3?
│ ┌─ Answer ───────────────────────────────────────────────────────────────────────┐   ← role="article", labelled
│ │  Participants gave different reasons.  ⚑ Accounts differ                        │   ← only for controversy ids
│ │  ┃ Gen. R. E. Lee · Confederate · official report · written July 1863            │
│ │  ┃ “…Encouraged by the successful issue of the engagement of the first day…”     │
│ │  ┃ O.R. Ser. I, vol. 27, pt. 2, p. ###   [Open scan] [Copy citation] [See on map ⓘ]│
│ │  ┃ ─────────────────────────────────────────────────────────────────────────────  │
│ │  ┃ Maj. Gen. J. Longstreet · Confederate · memoir · written 18xx · retrospective  │
│ │  ┃ “…”                                                     [Open] [Copy] [Report]  │
│ │  ▸ 3 more records   ▸ Why these results?  (matched: “center”, “July 3”, meaning)  │
│ │  Follow up:  [What did Union officers report?] [Who was in Pickett’s division?]   │
│ │  Was this helpful?  [👍] [Not what I asked] [Wrong or misleading]                  │
│ └────────────────────────────────────────────────────────────────────────────────┘
│  ┌ Ask a question ───────────────────────────────────────────────────────┐ [Ask]
└─ Deep search: on this device · works offline · your questions never leave your device
```
Mobile: single column; evidence collapsed to 1 excerpt with "More records (n)"; filters open as a bottom sheet with ≥ 44 px targets; sticky input honours `env(safe-area-inset-bottom)`; scroll to the *start* of the new answer (hist-current UX-03).

### 11.2 Components
| Component | Behaviour / a11y |
|---|---|
| Transcript | `role="log" aria-live="polite" aria-relevant="additions"`; one `<article aria-label="Answer">` per turn; focus stays in the input |
| Answer card | lead (structured/quote/template), ≤ 2 excerpts visible, "More records" `<details>`; contrast ≥ 4.5:1; font ≥ 14 px; 44 px targets |
| Citations panel | per record: short cite, author, date written, side/role/genre/retrospective chips, licence line, scan link, copy-citation, report-error; keyboard reachable |
| Source filters | collections (Official Records, State volumes, Memoirs, Testimony, Newspapers…) as checkboxes with counts; side (Union / Confederate / civilian / any); type (official report / dispatch / memoir / testimony / press); written (contemporaneous ≤ 1863-12 / postwar); date/time window; unit/place chips from A's linker; "include duplicates". Persisted per tab (`sessionStorage`, try/catch) |
| Map links | "See on the map" `/?tick=&unit=&vignette=` per app-bugs-05 / app-time URL contract; **feature-flagged off** until the app reads those params and the time model ships |
| Follow-up chips | generated from the answer (entities, time, source): [Who commanded it?] [What happened next?] [What did the other side report?] [Show the passage in context] (`seq ± 1`) |
| Feedback | 👍 / "Not what I asked" / "Wrong or misleading" / "Offensive without context": stored as local counters only; "Report an error" opens `mailto:` prefilled with `chunk_id` + citation — **the question is included only if the user ticks a checkbox (default off)** |
| Status line | always shows the tier that answered ("keyword search" vs "deep search") and a "Why these results?" disclosure (matched terms, entities, time window, source mix; `trace` in `?debug`) |

### 11.3 Enable flow ("Deep search")
States: `off → prompt → checking → downloading (n/m MB, cancel) → verifying → warming (idle init) → on → (evicted | updated | error)`.
* **Prompt (never auto-shown on Save-Data/2g/3g; never a modal; dismissible; remembered per tab):** "Deep search (optional). Understands what you mean, not just the words you type. One-time download ≈ 40 MB; works offline; your questions never leave your device. [Turn on] [Not now]" + "Storage available: X MB of Y".
* **Checking:** `estimate()` (need ≥ 1.3 × total), `persist()` request, capability probe (SIMD; `deviceMemory` if exposed; try-catch WebAssembly instantiate of a 1-page module).
* **Progress:** `<progress>` with text ("Downloading model 12 of 23 MB"), cancel button (AbortController), resumable at file granularity, announces via `aria-live` at 25/50/75/100 %.
* **Warming:** ORT session creation in an idle callback in the Worker; the first Ask before warm-up returns T0 immediately and appends "More sources found with deep search" when ready (§11.5).
* **Errors:** plain language + retry; a failed enable leaves T0 fully working.
* **Remove:** "Remove Deep search data (frees 40 MB)" in the ⋯ menu.
* Copy for iOS Safari: "Safari may remove this after about a week without a visit. Adding this site to your Home Screen keeps it longer."

### 11.4 Trust surface
* A permanent **"How this works & what it can't do"** disclosure: sources list (link to `/sources.html` generated from `sources.yaml`), what is measured (counts computed from the manifest, not hard-coded — audit H10), limits (no soldier rosters, casualty figures differ by source, times are reported not corrected, retrospective accounts flagged), version (`corpus_version`, `model`), last updated, "Report an error".
* Never claims "AI"; the current banner text "search-and-synthesis tool" (`historian.html:48`) is replaced (audit H8).

### 11.5 Progressive result behaviour (no jumping content)
* If dense is warm: wait up to the deadline (250 ms desktop / 700 ms phone) for both channels, render **once**.
* If dense is cold/slow: render A's answer immediately; when dense finishes and *materially changes* the top-3 (e.g. new evidence not in A's top 10), append a collapsed "More sources found with deep search (n)" row **below** the visible answer — never reorder or replace what the reader is already reading; announce politely via the live region.
* Layout stability: reserve card min-heights; skeletons for evidence; CLS budget ≤ 0.02 on `/historian` (perf-cwv-21).

### 11.6 Follow-ups, context, history
Chips as §11.2; "New conversation" clears context; optional per-tab transcript in `sessionStorage` (try/catch; treated as a convenience, never as state); **deep link uses the URL hash** `/historian#q=…&f=…` so the question is never sent to the server, analytics or a `Referer` (a `?q=` query string would appear in Netlify analytics paths and in same-origin referrers; this revises hist-current §8.5's `?q=`), and history uses `history.replaceState` on the hash.

### 11.7 Sensitive and contested content
Chunks with `period_racial_language` show a one-line context note ("This excerpt is a primary source and contains language of its time.") and are never used as a homepage/suggestion snippet; `graphic_injury` and `human_remains` collapse behind "Show excerpt"; `contested` shows the `accounts_differ` header. Users can hide flagged records in Filters.

### 11.8 Accessibility and performance acceptance
WCAG 2.2 AA: labelled input (`<label for="ask">`), visible focus, 44×44 targets (24 desktop minimum), text ≥ 14 px (≥ 12 px minimum), 3:1 control boundaries (hist-current UX-07), `prefers-reduced-motion` respected for scroll, live-region politeness, no keyboard trap in the filters sheet, `Esc` closes sheets (audit H2), screen-reader-only status for progress. Performance: no main-thread task > 50 ms on Ask/enable; INP of "Ask" ≤ 150 ms (perf-runtime-33 proxy); LCP/CLS of `/historian` unchanged with T0.

---

## 12. Evaluation plan (B vs A, and B's own components)

### 12.1 Golden set (~150 questions) — composition and sourcing
The existing batteries (118 + 57) are entity/fact-style and contain **no passage-gold questions**, so they cannot show what B is for. The golden set therefore keeps a regression slice and adds passage/paraphrase/conceptual/time/contested/refusal slices. It is a *separate* set from hist-current's `queries*.js`, but reuses items from it.
| Slice | n | What it measures | Seeds |
|---|---|---|---|
| **E** entity/fact regression | 30 | A must not regress (canonical@1, fact@3, S@1, typo S@1) | stratified from the 175-query battery (hist-current) |
| **P** passage recall (single-passage gold, graded) | 45 | recall@k, MRR, nDCG@10 in S/K/P registers | the pilot's 33 information needs (§2.3) + 12 new (state volumes, memoirs) |
| **C** conceptual / why / how / compare (multi-passage graded) | 25 | nDCG@10, citation precision | seo-growth-16 authored Q&A (≈ 60 planned; "answer contains the cited fact"), hist-sources-2 §6 matrix |
| **T** time-anchored | 15 | time-window recall; "reported time" correctness | hist-sources-1-06 anchors, time-facts anchors CSV |
| **X** contested / perspective | 10 | both-sides presence, `accounts_differ` correctness | `controversies.yaml` |
| **R** refusal / unanswerable | 25 | decline precision/recall | 10 adjacent-history (Antietam, Vicksburg, Lincoln's Address, causes of the war…), 8 visit-planning (hotel, tickets, parking, weather, restaurant, directions), 7 soldier-level/no-data ("was John Smith there") |
Splits: **dev 100 / test 50**, stratified by slice; the test split is frozen, opened only for release decisions (≤ 3 openings per phase to limit adaptive overfitting). Per question also store 2–3 paraphrases (S/K/P registers) for slice P and typo variants for 20 items. Real unresolved queries are added **only** from opt-in feedback (§11.2/§12.11) — none exist today (single-annotator synthetic queries are the main limitation, as in hist-current §3.4).

**Record schema (`tests/historian/golden.v2.jsonl`):**
```jsonc
{"qid":"P-017","slice":"P","split":"dev","registers":{"S":"…","K":"…","P":"Why was a Confederate brigade sent toward Gettysburg the day before the battle began?"},
 "expect":"answer","gold":[{"chunk_id":"OR27-2:…:007","grade":3,"span":[0,412]},{"chunk_id":"…","grade":2}],
 "must_cite":["or27-2"],"must_facts":["Pettigrew","supplies"],"controversy":null,"time_window":null,"notes":"anchor: Pettigrew's brigade, sent by General Heth to procure supplies",
 "annotators":["ML","VOL1"],"judged_pool":["bm25","dense-arctic-xs","hybrid"],"added":"2026-10-xx"}
```

### 12.2 Annotation protocol (fixing the pilot's weaknesses)
* **Pooling from ≥ 3 systems** (BM25, dense, hybrid; plus the pilot's gold anchor) — pooling from BM25 alone biases the set toward BM25.
* Graded 0–3: 0 not relevant · 1 topically related · 2 partial/context · 3 directly answers with the correct span. Binary "relevant" = grade ≥ 2.
* **Two annotators on ≥ 30 % of items** (owner + a volunteer reviewer); Cohen's κ ≥ 0.6 on binary relevance or the rubric is revised; adjudicate disagreements.
* Duplicates in one dedupe cluster share the grade. Unjudged results count as non-relevant but the report always prints **judged@10** coverage.
* Question authors must not see the target passage when writing K/P registers (the pilot's authoring-with-gold-in-view caveat); write questions from the source's *topic list* (e.g. the OR table of contents) and then find gold by pooling.

### 12.3 Metric definitions
| Metric | Definition |
|---|---|
| recall@k | any gold (grade ≥ 2) in the top k chunks (k = 1, 3, 5, 10, 20) |
| MRR@10, nDCG@10 | standard; graded gains 0/1/3/7 for grades 0–3 |
| canonical@1, S@1, fact@3, typo S@1 | reused unchanged from hist-current §3.3 for slice E |
| citation precision | judged fraction of *displayed citations* whose quoted span supports the lead claim |
| citation recall | fraction of `must_facts` covered by cited spans |
| faithfulness | (a) quote fidelity: `quote ⊂ chunk.text` byte-exact, automated, must be 100 %; (b) structured facts equal their source rows, automated, 100 %; (c) human audit of 100 answers: unsupported claims (target 0), "misleading by omission" on slice X (≤ 2) |
| refusal correctness | on slice R: decline recall and precision of `mode=decline`; on answerable slices: false-decline rate; report F1 and the ROC of the gate |
| latency | p50/p95 per stage and total, cold (first query after enable) and warm, per device |
| enable time / bytes / memory | time from click to `on`; bytes downloaded; Worker heap peak |
| parity | tokenizer id equality (500 strings), embedding cosine (200 queries), browser-vs-Node top-10 identity |

### 12.4 Baselines to beat
* **A-baseline** = the version of A at the time of the run, measured on the *same* golden set (numbers unknown today; hist-current B0/B3 are the reference for slice E only).
* **BM25-only** on slice P = pilot reference: R@5 27.3 % (P register), 66.7 % (K), 100 % (S) [M §2.3] — used only as an order-of-magnitude anchor; the real baseline is re-measured on the pooled-judged set.
* hist-current B0 for slice E: S@1 76.2 / canonical@1 29.3 / fact@3 68.2 / typo S@1 12.5 / correct decline 47.1 (primary battery) [R hist-current §9.1].

### 12.5 Ablation matrix (every optional component earns its place or is removed)
| Factor | Levels |
|---|---|
| Channel | L only · D only (each candidate model) · L+D RRF · L+D convex combination of normalised scores |
| RRF | k ∈ {20, 60, 100}; weights per §9.2 vs uniform |
| Model | arctic-xs · arctic-s · bge-small · gte-small · e5-small-v2 (+ potion-retrieval-32M static reference) |
| Precision | fp32 · fp16 · int8 · binary+rescore(256) ; **int8 query encoder vs fp32 query encoder** |
| Passage text | with vs without `title_path` header; chunk target 120/170/250 words; query prefix on/off |
| Priors | entity · time · tier · quality · dedupe (each off) |
| Conditioning | entity-conditioned second pass on/off |
| Diversity | MMR on/off; per-doc cap on/off; contested-topic rule on/off |
| Rerank | none · feature reranker · cross-encoder MiniLM · cross-encoder jina-tiny |
| Expansion | T0+ doc2query field on/off (for L and for L+D) |
| Gate | A's gate · A's gate + dense agreement · + scope-exemplar kNN |
Report, per row, Δ on slices P/C/T/X (pooled) and E, R, with CIs. Components that do not clear +2 points (or −0 on E/R for cost-only choices) are cut.

### 12.6 Statistics
Paired bootstrap over questions (10 000 resamples) for every difference; report 95 % CIs. **Power reality check [E, computed]:** with ≈ 95 pooled non-entity dev questions and a discordance rate of 0.3–0.4 between two systems, SE ≈ √(d/n) ≈ 5.6–6.5 points ⇒ 95 % CI ≈ ±11–13 points. The +15-point ship gate is detectable; **+5-point wins are not** — do not claim them, do not tune on them. On the 50-question test split, per-slice CIs are wider still; decisions use pooled slices.

### 12.7 Gates
| Gate | Phase | Pass condition |
|---|---|---|
| **G-B0** (go/no-go for all of B) | end of B0 | hybrid − BM25 recall@5 on the paraphrase (P-register) items ≥ **+10** points, CI excludes 0, on ≥ 60 questions; int8 query/passage parity (cos ≥ 0.98, recall drop ≤ 1 pt); slowest test phone p95 encode ≤ 300 ms and enable+warm ≤ 30 s on 10 Mbps [E targets]; model chosen by the §5.1 rule. Fail ⇒ stop B, ship T0+ only |
| **G-B2** (integration) | end of B2 | slice E regression ≤ 1 pt on canonical@1/fact@3/S@1; tokenizer/embedding parity tests pass; V-01…V-25 green; latency budgets §9.9 on desktop |
| **G-B3** (ship) | end of B3 | §3.3 in full on the frozen test split; faithfulness audit 0 unsupported claims; refusal F1 ≥ 0.92; real-device matrix within budgets; privacy page updated; kill switch tested |
| **G-B5** (each optional component) | B5/B6 | ≥ +3 nDCG@10 (reranker), ≥ +2 (others) at no slice-E/R regression and within budgets; else removed |
Regressions > 1 point on slice E or > 2 points on any pooled slice fail CI.

### 12.8 Harness and re-run commands
`scripts/eval-historian-semantic.mjs` (Node ≥ 22): loads `dist/historian/v*/…` (the exact shipped files), runs the same `search-core` and dense code with `onnxruntime-node` for encoding (parity-tested against the browser), evaluates `tests/historian/golden.v2.jsonl`, writes `reports/eval-{corpus_version}.json`, diffs vs `tests/historian/baseline.json`, exits 1 on gate failure.
```
node scripts/eval-historian-semantic.mjs --systems L,D:arctic-xs,H:arctic-xs --split dev
node scripts/eval-historian-semantic.mjs --ablate priors,mmr,rerank --split dev --bootstrap 10000
node scripts/eval-historian-semantic.mjs --gate G-B3 --split test          # opens the frozen split (logged)
node scripts/parity-tokenizer.mjs && node scripts/parity-embeddings.mjs
npx playwright test tests/e2e/historian-semantic.spec.ts --project=mobile-chrome,desktop-chrome,webkit   # timings, enable flow, offline, eviction
```
My own reproducible measurements: `python chunker.py`, `python pilot_bm25.py`, `python judge_dump.py` (prints the 75 top-3 chunks I judged), `node bench_bruteforce.mjs` (all in `plan-work/tmp-arch-semantic-local/`).

### 12.9 Real-device matrix
| Device class | Why | Checks |
|---|---|---|
| iPhone SE 2nd gen (3 GB) iOS 17/18 | memory floor, no WebGPU, ITP | enable, warm, encode p95, jetsam/crash, 7-day eviction simulation (Web Inspector > Storage), Home-Screen web app behaviour |
| iPhone 13+ iOS 26 | WebGPU present | reranker on WebGPU vs WASM |
| Pixel 6a-class Android Chrome | mid-range Android | encode/scan p95, `deviceMemory`, Save-Data |
| Low-end Android (2–3 GB) | worst case | init time, OOM handling, fallback ladder |
| Desktop Chrome / Firefox / Safari | breadth | parity, offline, CSP |
Playwright + CPU throttling (4× / 6×) is a *proxy* for CI only; decisions use real devices. Record `navigator.hardwareConcurrency`, `deviceMemory` (Chromium only), browser/OS versions with every number.

### 12.10 Human audits (scheduled, sample-based)
(1) Faithfulness: 100 answers × 2 reviewers, rubric = every claim supported by the shown span. (2) Sensitive content: 50 flagged chunks reviewed for framing. (3) Contested topics: each `controversies.yaml` entry gets a both-sides check. (4) Copy audit: no "AI", no over-claim ("every…"), counts computed. (5) Accessibility: keyboard-only and screen-reader walk-through of the enable flow and an answer.

### 12.11 In-product measurement without query text
Counts only, per the seo-growth event taxonomy: `historian_semantic_prompt_shown`, `_enabled`, `_enable_failed{reason enum}`, `historian_answer_mode{answer|partial|decline}` counts, thumbs up/down counts. **Never**: query text, chunk ids, entity ids, or anything derived from a question. (Chunk ids could reveal a topic.) Quality improvement therefore relies on the golden set and on owner-initiated "Report an error" e-mails that the user chooses to write.

---

## 13. Governance

### 13.1 Licensing and attribution compliance
* **Allow-list, not block-list** (hist-sources-1 §7.2): a source enters only with `status ∈ {PD-US-pre-1931, PD-US-gov, LoC-no-known-restrictions, NDNP-PD, PG-PD, permission-granted}` plus captured `statement_text`/`statement_url`; reprints and derivatives (Dyer 1959, OR 1971 reprint, Ladd 1994) rejected at fetch; Tier C never fetched, stored, embedded or fed to a model (American Battlefield Trust ToS forbids AI use; Ancestry/Fold3/Find a Grave/FamilySearch/ACHS/Stone Sentinels/HMDB bulk). The pre-1931 → public-domain rule is the sibling plan's arithmetic; confirm with counsel (hist-sources-1 §2).
* **Tier B (CC BY-SA Wikipedia, ODbL OSM, CC BY datasets) is excluded from the default vectors.** A composed answer is an adaptation and would pull share-alike onto the site's words (hist-sources-2 §8). If ever added: a **separate collection file** with its own vectors, licence text, per-record attribution, quote-only rendering, never blended, and a legal check on whether *embeddings* of share-alike text are themselves adaptations (unsettled; counsel) [U].
* **Model and runtime licences:** arctic-embed-xs Apache-2.0 [V], bge-small MIT [V], ORT Web MIT and transformers.js Apache-2.0 [U — confirm in the packages before shipping], potion MIT [V]. Ship `THIRD_PARTY_LICENSES.md` + a "Models and software" section on `/sources`; keep model-card citations and copyright notices.
* **Attribution UI:** each shown record carries source, author, date, page, licence line (§10.3); `/sources.html` is generated from `sources.yaml` (title, edition, IA id, licence, retrieval date, permalink).
* **Rights-restricted content in the existing OOB numbers** (Busey & Martin-derived) is out of B's scope but must not be quoted by B: B's structured numbers come from A's facts registry after DI-03/hist-sources-1-04.

### 13.2 Content governance
* **Perspective is mandatory** on every quoted passage (side/role/genre/written/retrospective); contested topics need both sides shown; Lost-Cause and partisan-committee tags visible as chips (hist-sources-1-05).
* **Sensitive language:** kept, flagged, contextualised (§11.7); never used as a suggestion/snippet on landing surfaces; reviewer sign-off list.
* **Historic accuracy:** the Historian says "reported" for times and figures that differ across sources; disputes list per record (data-integrity §9 `disputes`); the historian-verification backlog (DI-29) is closed with citations in `CHANGELOG.md`.
* **Editorial tone:** records-only voice; no "AI" branding (audit H8); the name "Ask the Historian" stays only with the capability/limits disclosure (hist-current §10 open question 3).

### 13.3 Corrections workflow
1. Intake: "Report an error" on each record → `mailto:` with `chunk_id`, citation, and (opt-in checkbox) the question; optional GitHub issue template.
2. Triage weekly; acknowledge within 7 days [policy choice].
3. Fix as an overlay in `corrections.jsonl` `{chunk_id, field, before, after, citation, reviewer, date}` — the raw source is never edited; retractions set `retracted:true`.
4. Rebuild → validate (V-01…V-25) → golden regression → publish (PATCH bump) → `CHANGELOG.md` + `/data-notes.html` errata entry (data-integrity §8).
5. Tombstones ship in `manifest.tombstones[]`; clients purge cached copies on next manifest read.
6. Rights complaints: same path with a 48-hour target for removal (`retracted:true` + redeploy).

### 13.4 Versioning, reproducibility, ownership
Semver corpus versions (§6.5); `model_id` pinned by hash; every release archives `eval-{version}.json`, `sources.lock.json`, `manifest.json`; CI rebuilds `dist/` from `raw/` and fails on diff. Ownership: owner = release decisions and contested-topic sign-off; volunteer reviewers = entity/time/perspective QA; no one else merges to `corrections.jsonl`.

### 13.5 Security and privacy engineering
* **Supply chain:** commit the sha256 of the ONNX model, tokenizer, ORT wasm/mjs; CI verifies against the pinned upstream revision; SRI (`integrity:`) on every runtime fetch; no remote code execution paths (ONNX/wasm are data/artefacts, still hash-pinned); no `eval`.
* **CSP** enforced per page class (infra-netlify 01/Appendix A); `wasm-unsafe-eval` only on `/historian`; `connect-src 'self'`; Report-Only first, then enforce after a clean crawl.
* **Privacy statement (update `privacy.html`, audit X5):** "Deep search downloads a language model and an index to your device. Your questions are processed on your device and are never sent to us. Your browser stores about 40 MB for this feature; you can remove it at any time. We count how often the feature is turned on, but not what you ask." Also list the other items X5 already flags (PeerJS broker, Mapbox telemetry, AR permissions).
* **No third-party requests at runtime from `/historian`** (fonts already self-hosted? verify) — testable by a network-log assertion in the e2e suite.
* **Query privacy edge cases:** hash-based deep links (§11.6); no query in `document.title`, history entries or logs; `console.log` of queries forbidden in production builds (lint rule); Referrer-Policy unchanged.

### 13.6 Kill switch, rollback, release checklist
`manifest.json` `semantic:{enabled:true, min_corpus_version, max_credits_flag}`; setting `enabled:false` hides the prompt and forces T0 for everyone on next load; rollback = redeploy previous manifest (old hashed files remain ≥ 2 versions). Release checklist: gates green, sizes within budget, privacy/terms/sources pages updated, `_headers` regenerated and header regression script passes, SW patch deployed **before** the first `historian-*` cache exists (§8.4), real-device matrix signed off.

---

## 14. Performance and cost budgets

### 14.1 Download budget (opt-in only; **zero on first paint**)
| Component | T2 (static, optional) | **T3 default (arctic-xs)** | T3 with bge-small | T4 adds |
|---|---|---|---|---|
| Model | ≈ 8 MB int8 static table [E] | **22.97 MB** [V] | 33.8–34.0 MB [V] | reranker 23.0–23.1 MB [V] |
| Tokenizer/config | ≈ 0.3 MB br [E] | 0.71 MB raw (≈ 0.25 MB br [E]) | same | 0.71 MB raw |
| Runtime (ORT wasm + JS + wrapper) | none | **3.07 MB br + ≈ 0.5 MB** [V] | same | + 5.48 MB br if WebGPU (`jsep`) [V] |
| Vectors (int8, 384-d) at N = 9.5 k / 30 k / 50 k | 2.4 / 7.7 / 12.9 MB (256-d) | **3.6 / 11.6 / 19.3 MB** | same | — |
| Columns (`.gcol`, br) | 0.4 / 1.2 / 2.0 MB [E] | same | same | — |
| **Total at N = 30 k** | ≈ 17 MB | **≈ 40 MB** | ≈ 51 MB | + 23–29 MB |
| Passage text (A's store; lazy) | ≈ 10–14 MB br for full offline [E] | same | same | — |

### 14.2 Runtime budgets
| Item | Budget |
|---|---|
| Worker heap peak (T3, N = 50 k) | ≤ 400 MB (vectors 19 MB + cols 5 MB + ORT session ≈ 100–200 MB [E]) |
| Main-thread long tasks during Ask / enable | none > 50 ms |
| Query latency | §9.9: p95 ≤ 250 ms desktop, ≤ 700 ms mid phone (T3 warm, excl. text fetch and T4) |
| Enable | ≤ 30 s on 10 Mbps for ≈ 40 MB [E]; resumable; cancellable |
| ORT session init | ≤ 3 s desktop / ≤ 8 s phone [E], in idle time, never on the first Ask |
| INP of "Ask" (lab proxy) | ≤ 150 ms; TBT of `/historian` ≤ 100 ms (perf-runtime-33 at 4× corpus) |

### 14.3 Core Web Vitals and Lighthouse protection
T0 initial payload stays ≤ 30 KB br JS + ≤ 50 KB data (perf-runtime-33); **no `<link rel=preload>`/prefetch of any B asset**; the enable prompt is text only (no layout shift; reserved height); `Save-Data`/slow connections never see the prompt automatically; `/historian` Lighthouse ≥ 95 mobile and desktop, CLS ≤ 0.02, unchanged LCP with and without B (CI Lighthouse on the route with and without the flag).

### 14.4 Bandwidth cost — see §8.9 (credits table, controls, hosting alternatives).

### 14.5 Build-time and people cost (ESTIMATES)
* Embedding 35 k chunks × ≈ 300 tokens with a 6–12-layer 384-d model on CPU ONNX: ≈ 30–100 chunks/s/core ⇒ ≈ 6–20 min on one core; GPU unnecessary. Re-embedding on a model change is therefore cheap; **re-review is not**, so entity/time/perspective tags are stored independently of the embedding and survive a model swap.
* T0+ expansions: ≈ 3.6 M output tokens for 30 k chunks (≈ 120 tokens each) plus a 200-item audit.
* Human review: ≈ 1–2 person-days per source family (§7.7); volunteers recommended.
* Repo size: raw sources ≈ 75 MB (P0) kept in a private bucket/LFS, not in the deploy (hist-sources-1-17); `dist/` ≈ 40 MB per corpus version plus previous two versions retained on the CDN.

---

## 15. Phased delivery (B-owned work; effort scale S < 0.5 d, M 0.5–2 d, L 2–5 d, XL > 5 d; person-day figures are ESTIMATES)

| Phase | Scope | Deliverables | Effort | Depends on | Exit gate | Visitor sees |
|---|---|---|---|---|---|---|
| **B0 Spike & bake-off** | Pilot v2 (≥ 60 pooled-judged paraphrase items); embed ≈ 7.5 k OR27 Pt1–2 chunks with 5 models using the shipped ONNX int8 files; recall/MRR/nDCG alone and fused; int8 parity; static reference; throw-away browser page measuring init/encode/memory on 3–4 real devices; CSP `wasm-unsafe-eval` check; decision memo | `reports/b0-bakeoff.md`, chosen `model_id`, seed thresholds, device numbers | **4 d** (S–M) | OR27 text (present), Python `onnxruntime` locally | **G-B0** (kill or continue) | nothing |
| **B1 Corpus foundation** | Production chunker; schema + validators V-01…V-25; entity linker v1; time anchors; perspective/sensitivity/controversy tags; dedupe; review tooling; OR27 reviewed to QA thresholds; embed/pack/manifest tooling; T0+ expansion field | `dist/` for OR27 (≈ 9.5 k embedded chunks), QA report, unit-coverage report | **6–8 d** (L) | A's passage store (I1), DI-02 crosswalk (or temp), time model (or `tick_est` omitted), hist-sources-1-01/02/12, Git repo (N1) | V-rules green; QA ≥ 95 %; link precision ≥ 0.97 | nothing (T0+ improves A's recall silently) |
| **B2 Client runtime** | Worker dense module; `.gvec/.gcol` loader; tokenizer+ORT; parity tests; cache manager + enable flow (headless); fusion/priors/MMR; calibrated gate; **SW patch**; `_headers` + CSP class; Node eval harness + CI | `historian.worker.js`, harness, thresholds | **5–6 d** (L) | A's search-core (H1) and Worker | **G-B2** | nothing (flagged off) |
| **B3 UX, ops, ship** | Evidence cards, citations panel, filters, follow-ups, feedback, enable UI, trust page; privacy/terms/sources pages; kill switch; device matrix; faithfulness audit; frozen-test evaluation | shipped "Deep search (beta)" | **5–7 d** (L) | A's redesigned card (H2), CSP rollout, copy review | **G-B3** | opt-in Deep search; unchanged for everyone else |
| **B4 Collections (rolling)** | Per source family: chunk + link + QA + embed + re-gate: NY Final Report, PA at Gettysburg (149 units), Battles & Leaders v3, Joint Committee, Maine/NJ/MI/MN, SHSP shortlist | N grows to ≈ 25–35 k | **1–2 d per family (≈ 6–12 d)** | hist-sources-1-03/05 acquisition | per-collection QA + budgets | more depth per unit |
| **B5 Optional components** | Cross-encoder (WebGPU/WASM) with progressive refinement; encoder-based sentence highlighting; binary prefilter if needed | flags | **3–4 d** (M) | B3 | **G-B5** each | sharper ordering on desktop |
| **B6 R&D (only if the golden set shows headroom)** | Domain fine-tune with synthetic queries; static student tier; trimmed ORT build; per-page COEP for threads | new `model_id` | **3–5 d** (L) | B3, budget | **G-B5** | better recall / lighter tier |
**Totals:** core B0–B3 ≈ **20–25 person-days**; with B4 (six families) and B5 ≈ **29–41 d**; B6 optional +3–5 d. Not included: source acquisition (45–80 d, hist-sources-1 §8), Design A H1–H2 (≈ 6–9 d, hist-current §8.7), time model/data-integrity fixes. Part-time solo cadence ≈ 3× calendar time [E].
**Critical path:** N1 (Git repo) → DI-02 crosswalk + time model → B1 linking/time → B2 → B3. B0 and the SW patch (finding 14) have no dependencies and should start immediately.
**Stop rules:** G-B0 fails ⇒ ship T0+ and stop; G-B3 fails on faithfulness or refusal ⇒ do not ship, keep flagged; bandwidth > 25 % of credits ⇒ move blobs (§8.9).

---

## 16. Risks and mitigations
| # | Risk | L | I | Mitigation | Phase |
|---|---|---|---|---|---|
| R1 | Dense retrieval does not beat A on the real golden set | M | H | G-B0 kill criterion; T0+ expansion is the fallback; B costs only B0 (4 d) to find out | B0 |
| R2 | Model swap silently changes results | M | M | `model_id` pinned in manifest/vectors; MAJOR bump; parity CI; thresholds per model | B2 |
| R3 | iOS/Safari deletes the 40 MB (7-day ITP rule) | H | M | re-buyable design, honest copy, eviction detection, Home-Screen guidance, no auto re-download, `persist()` request | B2–B3 |
| R4 | OOM/crash on low-memory phones | M | M | capability probe, one ORT session, int8 model, heap budget, Worker try/catch, tier ladder, test on iPhone SE | B2 |
| R5 | Bandwidth credits exhausted (Free plan hard limit) or scraper abuse | M | H | kill-switch flag, immutable hashing, robots disallow, weekly path analytics, 60 % alert, `base_url` move plan (§8.9) | B3 |
| R6 | `sw.js` purges/duplicates the Historian cache (`sw.js:24-31`, `:58-70`) | H | H | patch before first cache exists (finding 14); test that a `CACHE_NAME` bump keeps `historian-*` | B2 |
| R7 | CSP `wasm-unsafe-eval` widened site-wide or breaks the page | L | M | per-class CSP (Historian only); Report-Only crawl; e2e assertions | B2 |
| R8 | Tokenizer/embedding parity bug (silent quality loss) | M | H | same ONNX file at build and runtime; 500-string tokenizer test; 200-query embedding test; V-17 self-retrieval | B0/B2 |
| R9 | Wrong entity links (28 dual-use ids, 95 unresolved, VI Corps brigades missing, Confederate `U-` mis-keys) | H | H | crosswalk, confidence bins, `author_unit` default, unlinked mentions, coverage report, review of mid-confidence | B1 |
| R10 | Time anchors assigned to the wrong day / conflict with the site clock (C4) | H | H | source-stated only; `basis` field; never rewrite; hide map links until time model; day-accuracy QA ≥ 95 % | B1 |
| R11 | Contested or self-serving accounts shown as fact (Lost Cause, Sickles–Meade) | M | H | perspective chips, both-sides rule, `accounts_differ`, reviewer sign-off for contested chunks | B1–B3 |
| R12 | Period racial language surfaced without context | M | M | lexicon + flag + context note; never in suggestions; user filter | B1–B3 |
| R13 | Copyright/ToS breach (Busey & Martin-derived numbers, ABT, Fold3, Tier B share-alike) | L | H | registry allow-list in CI; Tier C hard stop; Tier B separate/excluded from default vectors; counsel on embeddings-as-adaptation | B1 |
| R14 | OCR noise poisons vectors | H | M | `ocr_score` floor, cleanup, kind classifier (17 % excluded), re-OCR queue | B1 |
| R15 | Near-duplicate flooding | M | M | dedupe clusters, canonical default, MMR | B1 |
| R16 | Dense gate answers out-of-scope/adjacent questions (nearest neighbour always exists) | H | H | scope-exemplar kNN, agreement signal, calibrated on ≥ 40 refusals, ROC; A's lexical gate retained; 27 % of pilot P questions returned only off-topic chunks | B2 |
| R17 | Overfitting to 150 synthetic questions | M | M | dev/test split, frozen test, ≤ 8 tunable parameters, CIs, no claiming < 10-point wins | B0–B3 |
| R18 | Library churn (transformers.js 4.x, ORT 1.30+) | M | M | pin exact versions, vendor files, raw-ORT fallback, upgrades only with parity CI | B2 |
| R19 | WebGPU fragmentation | M | L | WASM baseline; GPU only for optional reranker; feature-detect | B5 |
| R20 | Solo-developer capacity | H | M | phase gates, B0 kill, volunteers, defer B5/B6, no A-blocking dependencies | all |
| R21 | Privacy regression (question in URL, logs, feedback, referrer) | M | H | hash deep links, no logging lint, network-log e2e test, feedback opt-in checkbox | B3 |
| R22 | Inaccessible enable/progress flow | M | M | WCAG walk-through, `<progress>`, live regions, 44 px targets | B3 |
| R23 | Golden-set labelling bias (BM25-pooled, single annotator) | H | M | pool ≥ 3 systems, 2 annotators on 30 %, κ ≥ 0.6, judged@10 reported | B0 |
| R24 | `QuotaExceededError` / private mode | M | L | estimate + try/catch, message, T0 | B2 |
| R25 | Results change under the reader (layout jump) | M | M | append-only refinement, single render at deadline, CLS ≤ 0.02 | B3 |
| R26 | Model licence or terms change | L | M | keep licence text with artifacts; alternative model qualified in B0 | B0 |
| R27 | Cross-encoder trained on web questions hurts on period prose | M | L | ablation gate G-B5; feature reranker default | B5 |
| R28 | Ingested text is untrusted if Design C later feeds chunks to an LLM (prompt injection) | L | M | B has no LLM; document that C must treat chunk text as data and sanitise | — |

---

## 17. Open questions and unverified items

### 17.1 Decisions needed from the owner
1. Approve an **optional ≈ 40 MB "Deep search" download** and its wording (§11.3)?
2. Netlify plan and monthly credits (drives the hosting decision, §8.9)?
3. Confirm **no generative model on the device** (§5.6); is Design C (server LLM) in scope?
4. Who are the 1–3 volunteer reviewers (battlefield guide, Round Table historian, teacher)? Without them contested/entity review stays on the owner.
5. Which real phones are available for the matrix (§12.9)?
6. OK to run local Python/ONNX for the bake-off and commit `dist/` artifacts (needs the Git repo, N1)?
7. Acceptable to use LLM-generated synthetic queries (T0+ expansion, fine-tune) with the provenance rules in §4.4?
8. Switch the Historian deep link from `?q=` (hist-current §8.5) to `#q=` for privacy (§11.6)?
9. Keep Tier B (Wikipedia/OSM) out of the vector index permanently?
10. Historian name: keep "Ask the Historian" with the limits panel and no "AI" wording (hist-current §10 Q3)?

### 17.2 Not verified today (treat as assumptions)
* Phone latencies, memory and enable times (all **[E]**); no phone or neural embedding run was available.
* transformers.js 4.x API/option names and bundle behaviour (fetch quota exhausted); ORT-web/transformers.js licence texts.
* Netlify: `Content-Type: application/wasm` inference and Brotli on `.wasm` (jsDelivr's 3.07 MB br figure is not Netlify's); plan/credits.
* R2/GitHub Pages/jsDelivr size and egress terms; legal status of embeddings derived from share-alike text.
* MRL-truncation support of arctic-embed-xs/bge-small (assumed **not** MRL-trained); arctic-embed-s int8 size.
* Safari 26 WebGPU stability for a 23 MB cross-encoder; `deviceMemory` availability (Chromium only).
* All quality claims about dense retrieval: design targets pending B0.

### 17.3 Self-check
I re-ran `chunker.py`, `pilot_bm25.py`, `bench_bruteforce.mjs` and the HF/jsDelivr/caniuse/WebKit/curl probes; model MTEB averages were recomputed from each card's `model-index` (arctic-xs 50.15, bge-small 51.68, gte-small 49.46, e5-small-v2 49.04, arctic-s 51.98, mxbai-xsmall 42.80). Numbers in §0–§2 are produced by those scripts; everything phrased as a budget or "≈" with **[E]** is an estimate.

---

## 18. Findings index (`arch-semantic-local-NN`)
| ID | Title | Sev | Effort | Phase | Audit refs / depends |
|---|---|---|---|---|---|
| 01 | Gate the whole workstream on measured headroom: B0 bake-off, +10-point kill criterion, T0+ fallback | critical | M | B0 | H8 |
| 02 | Pick the encoder by the smallest-non-inferior rule; default arctic-embed-xs; static tier fallback only | high | M | B0 | H8 |
| 03 | Chunk schema v1 (JSON Schema) and validators V-01…V-25 | high | L | B1 | H8; DI-23, DI-27 |
| 04 | Chunk `kind` classifier; exclude tables/index/noise (17 % of OR27) from the dense index | high | S | B1 | H8 |
| 05 | Contextual `title_path` header in embedded text and lexical field | medium | S | B1 | H8 |
| 06 | Passage entity linking: confidence bins, `author_unit`, ancestors, unresolved mentions | high | L | B1 | H7, H10; DI-02, DI-07 |
| 07 | Source-stated time anchors and day state machine; `tick_est` only via the canonical model | high | L | B1 | C4; app-time |
| 08 | Perspective, sensitivity and controversy tags with mandatory chips | high | M | B1 | H8 |
| 09 | Dedupe/near-duplicate clusters, canonical selection, `also_in` citations | medium | M | B1 | H8 |
| 10 | Human review queue, sampling QA, corrections overlay | high | M | B1 | DI-25, DI-29 |
| 11 | Embedding/tokenizer parity: same ONNX file at build and runtime, CI parity tests | high | M | B0/B2 | — |
| 12 | `.gvec`/`.gcol` binary formats, int8 + fp16 scales, manifest with hashes/thresholds | medium | M | B1/B2 | P3 |
| 13 | `/historian/` storage layout, immutable hashing, `_headers` via the generator (not `/data/`) | medium | S | B2 | P3; infra-netlify-13/28 |
| 14 | **Patch `sw.js`: stop purging non-`gbg-` caches (`:24-31`) and stop intercepting `/historian/*` (`:35-76`)** | high | S | B2 (before the first cache) | C6, P5; infra-netlify Appx E |
| 15 | Worker architecture for dense retrieval; no long tasks; INP protection | high | L | B2 | P1 |
| 16 | Cache/quota manager: estimate, persist, SRI, eviction detection, remove, atomic update | high | M | B2/B3 | — |
| 17 | Hybrid retrieval: weighted RRF, entity-conditioned scan, priors, MMR, contested-topic rule | high | L | B2 | H8 |
| 18 | Calibrated gate with dense agreement and scope-exemplar kNN | high | M | B2 | H8 |
| 19 | Extractive composition, quote spans, citation model, runtime quote assertion | high | M | B3 | H8 |
| 20 | UI: enable flow, evidence cards, citations panel, filters, follow-ups, feedback, trust page | high | L | B3 | H8, D2, A1–A6 |
| 21 | Hash-based deep links; map links behind a feature flag; no query in any URL | medium | S | B3 | X5 |
| 22 | Privacy engineering: on-device statement, `connect-src 'self'`, network-log test, no query logging | high | M | B3 | X3, X5 |
| 23 | Golden set (~150), annotation protocol, harness, CI gates, bootstrap statistics | high | L | B0–B3 | H8 |
| 24 | Governance: rights registry CI gate, Tier B excluded from default vectors, model/runtime licence files | high | M | B1/B3 | hist-sources-1-11, hist-sources-2-01 |
| 25 | Corrections workflow, semantic versioning, tombstones, changelog and errata page | medium | M | B3 | DI-25 |
| 26 | Bandwidth/credit guard, kill switch, host-move plan | medium | M | B3 | infra-netlify-30 |
| 27 | Optional cross-encoder rerank (WebGPU/WASM) and encoder-based sentence highlighting | low | M | B5 | — |
| 28 | No on-device generative LLM (policy + revisit criteria) | low | S | — | H8 |
| 29 | Real-device matrix and Lighthouse/CWV CI on `/historian` with and without B | medium | M | B3 | P1, P7 |
| 30 | T0+ build-time expansion field (doc2query) as the no-runtime-ML fallback | medium | M | B1/B5 | H8 |
| 31 | Optional R&D: domain fine-tune, static student, trimmed ORT, per-page COEP threads | low | L | B6 | — |

---

## Appendix A — illustrative `manifest.json` (no real hashes)
```jsonc
{
  "corpus_version": "1.0.0", "built": "2026-11-20T00:00:00Z", "schema": "chunk.v1", "time_model": "tm-2026.10.1",
  "semantic": {
    "enabled": true, "min_client": "1.0.0", "base_url": "/historian/",
    "model": {"id": "sha256:…", "name": "Snowflake/snowflake-arctic-embed-xs", "license": "Apache-2.0", "dim": 384, "quant": "int8",
              "encoder": {"prefix": "Represent this sentence for searching relevant passages: ", "pooling": "cls", "max_tokens": 480, "normalize": true}},
    "runtime": {"ort": "1.30.0", "threads": 1, "files": [{"url": "rt/ort-1.30.0/ort-wasm-simd-threaded.wasm", "bytes": 14240000, "sri": "sha256-…"}]},
    "files": [
      {"url": "models/arctic-embed-xs/model_int8.<hash>.onnx", "bytes": 22970000, "sri": "sha256-…"},
      {"url": "v/1.0.0/vec.or27.<hash>.gvec", "bytes": 3640000, "sri": "sha256-…", "n": 9483},
      {"url": "v/1.0.0/cols.<hash>.gcol", "bytes": 800000, "sri": "sha256-…"}
    ],
    "bytes": {"total": 31600000},
    "thresholds": "thresholds/<model_id>.json"
  },
  "collections": [{"id": "or27", "source_ids": ["or27-1", "or27-2", "or27-3"], "chunks": 9483, "licence": "PD-US-Gov-1889"}],
  "tombstones": [], "flags": {"deepLinks": false, "mapLinks": false, "rerank": false},
  "licenses": [{"source": "or27-1", "statement_url": "https://…", "attribution": "Official Records, Ser. I, vol. 27, via Internet Archive"}],
  "changelog": "/data-notes.html"
}
```

## Appendix B — `sw.js` patch (diff sketch; apply before any `historian-*` cache is created)
```diff
--- a/sw.js
+++ b/sw.js
@@ activate
-      .then(keys => Promise.all(
-        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
-      ))
+      .then(keys => Promise.all(
+        keys.filter(k => k.startsWith('gbg-') && k !== CACHE_NAME).map(k => caches.delete(k))   // never touch historian-* caches
+      ))
@@ fetch
   const url = new URL(e.request.url);
   // Only handle same-origin requests
   if (url.origin !== self.location.origin) return;
+  // Historian data/model/runtime: served by the browser HTTP cache + the page's own Cache Storage, no SW hop, no double storage
+  if (url.pathname.startsWith('/historian/')) return;
```
Acceptance: after a `CACHE_NAME` bump and SW activation, `caches.keys()` still lists `historian-v…`; DevTools shows no `/historian/` request served from the SW; a first-visit SW install does not trigger `location.reload()` (C6 fixed separately).

## Appendix C — two golden-set items from the pilot (real, checkable)
| Field | Item 1 | Item 2 |
|---|---|---|
| Gold anchor (OR27 Pt 1) | "positive information of the enemy's position" (Buford's morning of July 1) | "Black Horse Tavern" (a division misrouted toward the Fairfield road) |
| S (source words) | "By daylight on July 1 General Buford obtained positive information and made dispositions to hold him in check until the First Corps under Reynolds arrived" | "General Sickles instructed the guide to lead the division by way of the Black Horse Tavern on the road from Fairfield" |
| K (keywords) | "Buford delay July 1 morning Reynolds arrive" — BM25 rank 1 | "Sickles division Fairfield road wrong route" — BM25 rank 1 |
| P (plain) | "What was Buford's cavalry trying to do on the morning of July 1 before the infantry showed up?" — BM25 rank **12** | "Why did one Union division end up close to the Confederates on the Fairfield road instead of reaching the battlefield directly?" — BM25 rank 2 |
Per-query ranks for all 33 items are printed by `python pilot_bm25.py`.

## Appendix D — file inventory (`plan-work/tmp-arch-semantic-local/`)
`chunker.py` (cleaning + chunking, writes `or27_chunks.json`), `pilot_sample.json` (40 sampled chunks, seed 20260930), `pilot_queries.py` (33 × S/K/P), `pilot_bm25.py`, `pilot_bm25_results.json`, `judge_dump.py` + `judge_todo.json`, `pilot_judgments.json`, `bench_bruteforce.mjs`, `webkit_storage.html` (fetched WebKit storage post). No model files, no site files.
