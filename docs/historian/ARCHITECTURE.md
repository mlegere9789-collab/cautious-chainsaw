# Ask the Historian: architecture (H0 to H2, candidate)

Status: candidate. Nothing here is wired into any release, served page or deployment. The deployed `legacy/dist/historian.html` is untouched and stays the baseline (B0).

Scope of this build: phases H0 (engine and evaluation), H1 (entity resolution, typo repair, honest refusals) and H2 (cited extractive answers, follow-ups, on-site context) on the **current corpus only** (`legacy/dist/data/**`, 71 files). The Official Records ingestion code (`tools/historian/ingest/`) is scaffolding for later phases; no ingested text is part of any shipped artifact.

## 1. What it is

A static, zero-server question answering engine over the site's own records. Everything the reader sees is one of three things:

1. template text whose slots come from an entity field or a precomputed fact-table row,
2. a verbatim quote of a stored passage, with the exact character offsets recorded,
3. an explicit limitation ("I could not find a record on this site that answers that").

Nothing is generated. There is no language model, no embedding model, no server and no network call other than fetching static, content-hashed JSON files. The engine runs in a browser main thread, a Worker or Node from the same code.

## 2. Design at a glance ("Design A": static hybrid retrieval)

```
                        BUILD (Node, deterministic, ~4.5 s)                         RUNTIME (browser / Worker / Node)
 legacy/dist/data/**  ->  load (field whitelist)                                     question
 legacy/dist/assets   ->  bundle prose (acorn) ->  registry (T1 entities, aliases)      |
                                                    passages (T2) + sb + citations       v
                                                    postings (BM25 impact8)          guard + scope gate
                                                    fact tables, lexicon                 |
                                                    validators V01-V11, K001          normalise, tokenise, repair (join / split / Damerau-Levenshtein)
                                                         |                                |
                                                         v                                v
                                            historian-src/dist/hx/                   entity linker (unit grammar, aliases, surnames)
                                              manifest.json (only mutable file)          |
                                              f/entity, entix, facts, lexicon  <--- T1 loaded at open (~183 KB brotli)
                                              f/ix/NNN  (128 posting buckets)   <--- T2 lazily, per query
                                              f/en/NN   (32 entity postings)         intent -> card ranking (BM25F + link + priors)
                                              f/tx/NNNN (96 text shards)                 |
                                                                                    passage retrieval (entity postings + BM25, MMR)
                                                                                         |
                                                                                    decide: answer | partial | decline | clarify
                                                                                         |
                                                                                    compose (extractive) -> lint I1-I8 -> chips
```

Two tiers of data are loaded at different times:

| Tier | Contents | When | Size (Sep 2026 build) |
|---|---|---|---|
| T1 | entity records (1,694), unit keys, name vocabulary, card BM25F index, fact tables, lexicon | at open (first paint does not wait for it) | 1,417,594 B raw, 182,833 B brotli |
| T2 | passage BM25 postings (128 buckets), entity postings (32), text shards (96 x 16 passages) | lazily, only the buckets a question needs | 133,290 B postings, 726,936 B text; largest shard 12,798 B |

Content hashing: every artifact is named `<name>.<8 hex of sha>.json`; `manifest.json` is the only mutable file. The build keeps the previous two manifests (`manifest.prev1.json`, `manifest.prev2.json`) with their files, so rollback is redeploying an older manifest. A rebuild of unchanged input reproduces every hash (validator V12, tested).

## 3. Module map

Build (`tools/historian/`):

| File | Role |
|---|---|
| `build.mjs` | orchestrator and CLI: `node tools/historian/build.mjs [--data dir] [--out dir] [--no-bundle] [--dry] [--quiet]` |
| `lib/load.mjs` | reads the data lake through a field whitelist; drops developer-only fields (`flag`, `flag_notes`, tick-derived clock labels, animation fields) at the boundary |
| `lib/bundle.mjs` | extracts the 16 walkthrough stops and 16 tour stops from the built site bundle with acorn |
| `lib/registry.mjs`, `names.mjs`, `clean.mjs` | entity registry, name parsing, derived aliases, prose cleaning (raw ids humanised, ` -- ` to an em dash) |
| `lib/passages.mjs`, `postings.mjs` | passage kinds, sentence boundaries, citations, entity links, BM25 impact postings, lexicon |
| `lib/t1.mjs`, `facts.mjs` | T1 serialisation, card BM25F index, rank / roll-up / succession / event fact tables |
| `lib/emit.mjs`, `validate.mjs` | deterministic JSON, hashing, manifest rotation; validators |
| `lib/sources.mjs`, `yaml-lite.mjs` | rights register loader, tier gate, fetch gate |
| `data/aliases.v1.json`, `data/scope.v1.json` | curated aliases (47), scope table, unknowns, routes, glossary |
| `ask.mjs` | terminal client: `node tools/historian/ask.mjs "who commanded the Iron Brigade?" [--trace] [--json]` |
| `gen-sources.mjs` | generates `docs/historian/sources.yaml` from its head and the two catalogues (`--check` verifies) |
| `ingest/fetch.mjs`, `or27.mjs`, `cli.mjs` | polite rights-gated fetcher; Official Records volume 27 normaliser and segmenter; command line |

Runtime (`historian-src/core/`, browser and Node, ES modules, no dependencies):

| File | Role |
|---|---|
| `text.js` | normalisation, tokenising, stemming, Damerau-Levenshtein, sentence splitting (with 1863 abbreviations), FNV-1a bucket hashing |
| `units.js`, `linker.js`, `entities.js` | unit grammar ("20th ME", "First Minnesota", "1 MN"), alias and surname linking, prominence-aware ambiguity, T1 runtime view, BM25F |
| `guard.js` | sanitising (300 characters, markup and control characters stripped), scope gate, injection stripping |
| `intent.js` | ordered intent rules |
| `kb.js`, `codec.js` | opening the KB through an injected fetcher; LRU caches; retryable `ShardError`; wire formats |
| `select.js` | extractive quote selection |
| `compose.js`, `format.js`, `chips.js` | the composers, number and name formatting, follow-up chips |
| `engine.js` | the pipeline (`createEngine(kb).ask(question, ctx)`) |
| `lint.js` | render lint for invariants I1 to I8 that can be checked from an answer object |

Candidate page (`historian-src/page/`): `historian.html`, `historian.css`, `historian.js`. See section 6.

## 4. The runtime pipeline in order

1. **Guard.** Strip markup and control characters, cap at 300 characters. An empty question gets a prompt, not an error.
2. **Scope gate.** A table (`facts.scope`) recognises medical, finance, creative writing, code, visit planning, weather, adjacent topics, causes of the war and prompt injection. Out-of-scope questions get a short honest decline with a pointer where one exists. An injection with a real question inside it is stripped and the real question is answered, with a note that an instruction was ignored.
3. **Normalise, tokenise, repair.** Out-of-lexicon tokens are repaired against the name vocabulary by join ("wheat field" to "wheatfield"), split, or Damerau-Levenshtein with length-dependent tolerances. Repairs are reported ("Showing results for ...").
4. **Link.** Unit grammar first (ordinals, ordinal words and state abbreviations only after a number, arm and side aware), then alias phrases (longest n-gram over derived and curated aliases), then surnames (with a prominence rule: army 4, corps 3, division 2, brigade 1, and a capitalisation guard for common-word surnames). Ambiguity is carried forward, not guessed.
5. **Intent.** Ordered rules: ancestor, opponent, presence, succession, membership, quote, who-commanded, echelons, compare, superlative, count, strength, casualties, outcome, sequence, overview, when, where, why, what-happened, list, who, lookup. An explicit comparison outranks the measure it names.
6. **Card ranking.** BM25F over entity fields (label, aliases, title, attributes) plus link weights and per-intent kind priors.
7. **Passage retrieval.** Entity postings and BM25 impact postings, merged, MMR-diversified. Only the buckets needed are fetched.
8. **Decide.** `answer`, `partial` (limited), `decline` (out of scope or nothing found) or `clarify` (an ambiguous name; chips list the candidates).
9. **Compose.** Per-intent composers. Multi-hop parent chains (regiment to brigade to division to corps) are resolved from the `par` field. Extractive quotes are added under a length budget: the first quote always, further quotes only while the first answer stays within `QUOTE_BUDGET` (780) characters.
10. **Lint.** `lintAnswer` rejects raw ids, `undefined`, `null`, `NaN`, developer notes, "tick", "site clock", missing offsets and missing attribution. The page never shows an answer that fails lint.
11. **Chips.** Follow-ups derived from the answer's entity kinds; the test suite asks every chip and requires an answer.

Conversation state is small and explicit: `answer.ctx` (`lastEntities`, `lastIntent`, `lastSide`, `shownPassages`) is passed back by the caller so "tell me more" and "what about the Confederates?" resolve. The on-site context from the map (`onsite: {selected_unit, tick, day, location}`) is passed the same way; ticks are used only to find neighbouring events and are never converted to a clock.

## 5. Honesty rules and where they live

| Invariant (plan chapter 14 D.4) | Enforced by |
|---|---|
| I1 every sentence is a template slot, a verbatim quote or a limitation | composers only build blocks from fields, fact rows, quotes, limitation templates |
| I2 no numeral outside a fact row or a quote | `format.js` is the only number formatter; numbers come from `attrs` and `facts` |
| I3 `normalise_ws(text.slice(s, e)) == quote` | `select.js` records `s`, `e`; `engine.test.mjs` checks every quote against its passage; lint checks offsets exist |
| I4 attribution never dropped | every quote block carries `attrib`; lint rejects a quote without it |
| I5 clocks only as the site's own wording, never tick-derived | ticks and the legacy `time` label are dropped at load; passages record clock claims only for information; `tick` and "site clock" are lint-forbidden |
| I6 contested claims never alone | `why`, judgement and debate questions add the hedge ("Historians debate questions like this one. ...") |
| I7 authority numbers are "about" and carry the "sources differ" note | `AUTH_NOTE` on every strength and casualty answer; a compare table repeats it |
| I8 `textContent` only | the page builds DOM with `createElement` and text nodes; a source scan test forbids `innerHTML` and friends |

Refusals are honest: an out-of-scope question is declined in one sentence with a pointer; a question about a specific soldier is routed to the Find Your Ancestor page rather than guessed; a data conflict the engine can detect is stated rather than smoothed over. What the engine cannot answer from the site's records it says so.

## 6. The candidate page

`historian-src/page/historian.html` + `historian.css` + `historian.js`, no inline script or style, so it can run under a strict Content Security Policy.

- **First paint is independent of the records.** The shell (heading, explanation, example chips, form) is plain HTML and CSS. The script starts opening T1 immediately and says so in the status line; questions typed meanwhile wait for the records and then run.
- **Lazy shards with retry.** T2 buckets load per question through `browserFetcher`, which forgets a failed request. A failed shard produces an error card with "Try again"; a failed T1 open shows "Try again" in the status line and is retried automatically by the next question.
- **Accessible by construction.** `lang`, zoom allowed, one `h1`, skip link, labelled input, `role="log"` conversation region with polite live updates, `role="status"` for short messages, real buttons for every chip (44 px targets), visible focus ring, tables in keyboard-focusable scroll regions, `prefers-reduced-motion` respected, forced-colours rules, contrast of every text pairing at or above 4.5:1 (tested).
- **Focus and scroll.** After an answer the page scrolls to the start of the answer. Focus stays in the question box after a typed question and moves to the answer after a chip click (the chip that had focus is replaced). `/` focuses the question box; Escape clears it.
- **Input bar never covers content.** The ask bar is sticky at the bottom of the flow; its height is published as `--bar-h` (ResizeObserver) and `main` reserves that much padding, and `scroll-padding-bottom` keeps scrolled-to answers clear of it.
- **Mobile first.** The base CSS is the 320 px layout; only `min-width` queries exist; the input is 16 px so iOS does not zoom.
- **Never "undefined".** Every value passes through a string guard; unknown block types are dropped; a last-ditch text check replaces any answer containing `undefined`, `NaN` or `[object` with a neutral message.
- **Links.** Only same-site absolute paths coming from the engine's own source list become links.
- **Privacy.** Questions never leave the browser. The page stores nothing (no cookies, no storage).

Tests run the real `historian.html` and `historian.js` in a small fake DOM (`tests/historian/lib/fakedom.mjs`) against the real engine and a KB built from scratch. No browser was launched for this build: layout, real scrolling, IME and screen-reader behaviour, and the ES module graph over HTTP are **not verified** (see the limits below).

## 7. Rights and sources

`docs/historian/sources.yaml` (generated, 85 sources) is the register. Tiers: **A** public domain (may be indexed, redistributed in derived shards, quoted; the only tier that may ever be sent to a model), **B** reusable with attribution or share-alike (separate files, per-record licence text, never in a model call), **C** link-out only (never fetched, stored or embedded), **A-pending** believed public, awaiting confirmation (not shipped). The two site sources are A-pending: provenance of some site-authored data is still to be audited (chapter 14 D.10). Validator V02 fails the build on a Tier C id, a missing licence, Tier B without attribution, `may_send_to_llm` on a non-A source, a reprint imprint, or an unquarantined low-OCR source. The fetcher refuses banned hosts (27) and refused identifiers (the 1971 reprint of the Official Records) before any network call.

## 8. Budgets (measured)

| Item | Budget | Measured |
|---|---|---|
| T1 brotli | 250 KB | 182,833 B |
| largest text shard / posting bucket | 64 KB | 12,798 B / 3,638 B |
| build | none set | about 4.5 s |
| answer latency in Node (p95 over the golden run) | interactive | about 4 ms |
| mean initial characters | 600 (H2 gate) | 558 over all three batteries (507 on the golden subset) |
| page script graph | small | 16 files, about 177 KB unminified, no dependencies |

## 9. Deliberately not in H0 to H2

- No embeddings, no semantic tier, no model stage (`manifest.semantic.enabled` and `manifest.ai.enabled` are `false`).
- No external text in the shipped artifacts: Official Records, Fox, Busey and the rest are catalogued and gated, but only the ingestion scaffold exists. Passage anchors (folio-level citations) begin at H3.
- No Worker wrapper for the engine yet (it is main-thread safe: the p95 answer is milliseconds; a Worker is a later hardening).
- No release wiring, service worker precache, analytics or feedback capture.

## 10. Known limits

- The evaluation batteries are small; the primary battery was used to tune, the held-out and fresh batteries were not (fresh was written before the engine existed). The golden set has a locked split: aggregate numbers only were used from it.
- Extractive answers are only as good as the site's records: where the records conflict or are wrong (for example Biddle's Brigade) the engine reports what the records say.
- Questions that need reasoning across several passages (why did Lee lose; why did Pickett's Charge fail) get quotes and a hedge, not a synthesis. That is the design.
- The page was exercised only in a fake DOM. A real-browser pass (Chrome, Safari, Firefox; VoiceOver, NVDA, TalkBack) is required before release.
