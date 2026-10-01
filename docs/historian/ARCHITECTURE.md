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
| `lib/sources.mjs`, `yaml-lite.mjs` | rights register loader, tier gate, fetch gate (a URL is judged in every spelling it decodes to: percent-decoding is repeated to a fixed point and the result is NFKC-folded, so a doubly encoded or full-width host is the host it spells) |
| `lib/english.mjs`, `gen-english.mjs`, `data/english-*.v1.txt` | the English dictionary the typo repair consults: two seed lists, a list of period words generated from the cached Official Records sample (`gen-english.mjs`), loaded by `english.mjs` and compiled into `facts.english` (about 4,800 words) |
| `data/aliases.v1.json`, `data/scope.v1.json` | curated aliases (47), scope table, known unknowns (with their `semantic` tags), concept lexicons (`lexicons`: weather words, ranks, rosters, thought verbs, ...), routes, glossary |
| `ask.mjs` | terminal client: `node tools/historian/ask.mjs "who commanded the Iron Brigade?" [--trace] [--json]` |
| `gen-sources.mjs` | generates `docs/historian/sources.yaml` from its head and the two catalogues (`--check` verifies) |
| `ingest/corpus.mjs`, `or27-dispatch.mjs`, `meta.mjs`, `link.mjs`, `times.mjs`, `anchors.mjs`, `time-evidence.mjs`, `pagemap.mjs`, `lib/corpus-or.mjs`, `golden-or27.mjs`, `measure-corpus.mjs` | the full Official Records volume 27 build (CORPUS.md): segmentation of Part 3 into dispatches, report and dispatch metadata, the linker for authors, senders and mentions, clock claims, time proposals, the printed page to scan leaf map, the corpus tiers, the OR golden run and the size and latency measurement |
| `ingest/fetch.mjs`, `or27.mjs`, `heads.mjs`, `cli.mjs` | polite rights-gated fetcher (every redirect hop gated); Official Records volume 27 normaliser and segmenter; `heads.mjs` reads running heads and signature marks by what they say (token by token, within a few OCR edits) and counts them independently of the stripper; command line |

Runtime (`historian-src/core/`, browser and Node, ES modules, no dependencies):

| File | Role |
|---|---|
| `text.js` | normalisation, tokenising, stemming, Damerau-Levenshtein, sentence splitting (with 1863 abbreviations), FNV-1a bucket hashing |
| `units.js`, `linker.js`, `entities.js` | unit grammar ("20th ME", "First Minnesota", "1 MN"; at query time also connectors and word order: "the 19th regiment from Indiana", "Indiana's 19th", "19th Regt., Indiana Vols.", "United States 4th"), alias and surname linking, prominence-aware ambiguity, T1 runtime view, BM25F |
| `guard.js` | sanitising (300 characters, markup, control and invisible formatting characters stripped), scope gate, injection stripping |
| `intent.js` | ordered intent rules |
| `english.js` | `createEnglish(words).has(w)`: the dictionary closed under inflection and derivation (plural, -ed, -ing, -ly, -er, un-, -ness, ...); a word it holds is never rewritten by the typo repair |
| `unknowns.js` | `createUnknowns(kb)`: the known unknowns read by concept, not by phrasing: weather (a strong or weak weather word in a frame, with a metaphor guard and a present-time test), an individual soldier (an enlisted rank with a name, a capitalised name with a unit, "someone named X"), a roster ("every man in", "list the names of"), what a person thought or felt |
| `clock.js`, `atime.js` | the day reader (`readDays`: "July 1 to 3", "the first two days", "day 2", "7/2/1863", dates outside the battle) and the clock reader (`parseClock`: every clock form, ranges, before and after, impossible times); the clock answers (section 4a) |
| `kb.js`, `codec.js` | opening the KB through an injected fetcher; LRU caches; retryable `ShardError`; wire formats |
| `select.js` | extractive quote selection (`pageSpan`: printed page, scan leaf and reader link of a span) |
| `corpus.js`, `reports.js` | the Official Records corpus tier (CORPUS.md): `corpus.js` opens a corpus's postings and text shards on demand, `reports.js` answers "what did X report / write / telegraph", "what time did X say" and "what did the reports say about Y" from it. Both are imported dynamically by the first request that needs them, so they are outside the page's static module graph; the site-only KB (no `manifest.corpora`) never loads them and answers as before |
| `compose.js`, `format.js`, `chips.js` | the composers, number and name formatting, follow-up chips |
| `engine.js` | the pipeline (`createEngine(kb).ask(question, ctx)`) |
| `lint.js` | render lint for invariants I1 to I8 that can be checked from an answer object |

Candidate page (`historian-src/page/`): `historian.html`, `historian.css`, `historian.js`. See section 6.

## 4. The runtime pipeline in order

1. **Guard.** Strip markup, control characters and invisible formatting characters (zero-width and bidirectional marks, soft hyphen, variation selectors, Hangul fillers), cap at 300 characters. An empty question gets a prompt, not an error. The engine accepts a string or a plain object only; the context object is read defensively (getters, Proxies and cycles cannot make `ask` throw: it always returns an answer object).
2. **Scope gate.** A table (`facts.scope`) recognises medical, finance, creative writing, code, visit planning, weather forecasts, adjacent topics, causes of the war and prompt injection. Questions the records cannot answer but that are about the battle are not declined as out of scope: they match an entry of `facts.unknowns` (per-location casualties, an individual soldier, the weather at the battle, the Gettysburg Address) and are answered as a stated limitation with the entry's `answer_with` text, i.e. what would answer it (period diaries and weather records, the Soldiers and Sailors Database, the Library of Congress). The entries marked `standalone` also look in the site's own words for what it does say (only real weather remarks, only for the asked day; the cemetery tour's mention of the Address) and quote them, never as the answer itself. Out-of-scope questions get a short honest decline with a pointer where one exists. An injection with a real question inside it is stripped and the real question is answered, with a note that an instruction was ignored.
3. **Normalise, tokenise, repair.** Out-of-lexicon tokens are repaired against the name vocabulary by join ("wheat field" to "wheatfield"), split, or Damerau-Levenshtein with length-dependent tolerances. Repairs are reported ("Showing results for ..."). **A correctly spelled word is never rewritten:** a word the English dictionary holds (`english.js`) is left alone and counted as unknown rather than repaired, and a fuzzy, join or split repair is kept only when a recognised mention covers it or its target is a word of the engine's own vocabulary (domain words, intent words, state names after an ordinal). On a held-out sample of 335 real English words, 8 (2.4%) are still rewritten (alter, blown, bold, federate, random, steeple, summoned, wherever): the dictionary is not a full lexicon.
4. **Link.** Unit grammar first (ordinals, ordinal words and state abbreviations only after a number, arm and side aware), then alias phrases (longest n-gram over derived and curated aliases), then surnames (with a prominence rule: army 4, corps 3, division 2, brigade 1, and a capitalisation guard for common-word surnames). Ambiguity is carried forward, not guessed.
5. **Intent.** Ordered rules: ancestor, opponent, presence, succession, membership, quote, who-commanded, echelons, compare, superlative, count, strength, casualties, outcome, sequence, overview, when, where, why, what-happened, list, who, lookup. An explicit comparison outranks the measure it names.
6. **Card ranking.** BM25F over entity fields (label, aliases, title, attributes) plus link weights and per-intent kind priors.
7. **Passage retrieval.** Entity postings and BM25 impact postings, merged, MMR-diversified. Only the buckets needed are fetched.
8. **Decide.** `answer`, `partial` (limited), `decline` (out of scope or nothing found) or `clarify` (an ambiguous name; chips list the candidates).
9. **Compose.** Per-intent composers. Answers lead with what was asked: the time before the description, the route before the regiment, the brigades before their division commander, the battle totals when only "casualties" is linked. Multi-hop parent chains (regiment to brigade to division to corps) are resolved from the `par` field. Extractive quotes are added under a length budget: the first quote always, further quotes only while the first answer stays within `QUOTE_BUDGET` (780) characters. A quote shown under an answer about a unit or a person must be **about** that subject (its passage is linked to it, or it names it); a quote about a neighbouring unit is dropped rather than shown as if it were this one's (verifier V-09). A question about what someone said prefers the sentence in which that person is the speaker; a question about how long something lasted quotes the sentence that states the length. A request that names a young reader ("to a 5th grader") about an event, story or unit gets a **plain card** (short template sentences from the record's own fields, no quotes) and a chip, "The site's own words", that asks the same question without the young-reader wording.
10. **Lint.** `lintAnswer` rejects raw ids, `undefined`, `null`, `NaN`, developer notes, "tick", "site clock", missing offsets and missing attribution. The page never shows an answer that fails lint.
11. **Chips.** Follow-ups derived from the answer's entity kinds; the test suite asks every chip and requires an answer.

### 4b. Report questions (the Official Records corpus)

When the KB carries a corpus (`manifest.corpora.or27`) and the question asks for what an officer **reported, wrote, telegraphed or said** (or at what time a report says something happened, or what "the reports" say), `engine.js` hands it to `reports.js` before the ordinary flow. The author is the registry person (or unit) named next to the cue; candidates are cut **before** they are ranked by pseudo-entity postings (`K:report`, `K:dispatch`, `D:<date>`, `A:<addressee stem>`, `F:<sender stem>`) and by the author links (role 2), then ranked by BM25 over the topic words, and quoted verbatim through `select.js` with author, rank, unit, date written, lag behind the battle, volume, printed page and scan link. A report is labelled written after the fact, a dispatch written at the time. When the volume holds no report by the person, the answer says so rather than quoting someone else. Corpus retrieval is opt-in per call, so every other question fetches exactly the files it fetched without the corpus (tested). Authors the registry does not know cannot be asked for by name yet (CORPUS.md section 9).

### 4a. Clock-of-day questions (the time model)

"What was going on at 3 pm on July 2" used to get the day's summary, which is wrong: it lists events from the whole day, some after the asked time. The engine now answers it from a clock that is **baked at build time** from the time model (`src/lib/time/index.js` and `data-src/time/time_anchors.json`, both owned by another workstream and read-only here). Nothing is computed from a tick at runtime.

- `parseClock` (`core/clock.js`) reads a clock point ("3 pm", "3:15 in the afternoon", "noon"), a part of the day ("the morning of July 1", "at dusk" from the solar table) or a range ("between 2 and 4 pm on July 3"), and `julyDate` the day. A part of the day alone ("the evening attack at Culp's Hill") is not a clock question.
- **Days and stretches.** `readDays` reads one day or a stretch ("July 1 to 3", "between July 2 and July 3", "the first two days", "day 2", "7/2/1863", "1863-07-03", "7-3-63"; "7/10 of the men" is not a date) and the question is answered across the stretch, day by day; a date outside July 1 to 3 ("July 4", "day 4", "June 28") is named as outside the records, never read as day 1 or answered with another day. **Before and after:** "before 4 pm", "by 4", "4 pm and after", "4 pm onwards", "4 pm or earlier" list only the entries on the right side of the time. **Not clocks:** a bare hour is asked about ("at 3", "at three on July 2": am or pm?), a time that cannot exist ("25:00", "13 pm", "2:75") is named as unreadable, a military time ("1500 hours") is read, and a name or a noun built on noon or midnight ("the noon lull", "midnight march") is not a clock question, while "the noon hour" is.
- The answer (`clockAnswer`, `core/atime.js`) lists the chronology events whose baked time lies within 60 minutes before and 45 after the asked time, each with its own approximate time (and the range where the model's anchor is contested), in order; then it **names what it left out**: the latest earlier entry and the next later entry ("Later entries are left out because they had not happened yet; the next is ..."). A named unit, place or commander narrows the list to that subject's entries (searching a wider stretch) and says so when its nearest entry is not at the asked time. A moment with no entry says that and names the neighbours.
- A clock without a day, or without am or pm, is **not guessed**: the answer asks, with one chip per day (the map's "Ask about this" context supplies the day when it has one). A date outside July 1 to 3, 1863 is an honest limitation, not a summary of another day.
- Every such answer ends with the basis note: "Clock times come from the site's proposed revised timeline: they are approximate, a historian has not yet reviewed them, and sources differ on many of them." The wording changes to "the site's reviewed timeline" once the model is signed. "What time did X begin" answers carry the model's time for X in the same words.
- Clock labels shown anywhere (leads, lists, notes) come from baked minutes through `hm12` (5-minute rounding), which is what the I2 sweep in `atime.test.mjs` checks. The legacy tick-derived `time` label and the ticks themselves stay dropped at load, and lint still forbids "tick" and "site clock".
- **Status: proposal.** `manifest.time_model` records the model's version, sha256, `release: candidate` and `signed: false`. Whether the site may show a model-derived clock before it is approved is the owner's decision (PIPELINE.md section 5, item 5).

Conversation state is small and explicit: `answer.ctx` (`lastEntities`, `lastIntent`, `lastSide`, `shownPassages`) is passed back by the caller so "tell me more" and "what about the Confederates?" resolve. The on-site context from the map (`onsite: {selected_unit, tick, day, location}`) is passed the same way; ticks are used only to find neighbouring events and are never converted to a clock.

## 5. Honesty rules and where they live

| Invariant (plan chapter 14 D.4) | Enforced by |
|---|---|
| I1 every sentence is a template slot, a verbatim quote or a limitation | composers only build blocks from fields, fact rows, quotes, limitation templates |
| I2 no numeral outside a fact row or a quote | `format.js` is the only number formatter; numbers come from `attrs` and `facts` |
| I3 `normalise_ws(text.slice(s, e)) == quote` | `select.js` records `s`, `e`; `engine.test.mjs` checks every quote against its passage; lint checks offsets exist |
| I4 attribution never dropped | every quote block carries `attrib`; lint rejects a quote without it |
| I5 clocks only as the site's own wording, or from the time model as a labelled proposal; never from a tick | ticks and the legacy `time` label are dropped at load; passages record clock claims only for information; a clock in an answer is either a quoted sentence of the site or a baked minute value from `facts.clock` printed as approximate with the basis note (section 4a); `tick` and "site clock" are lint-forbidden |
| I6 contested claims never alone | `why`, judgement and debate questions add the hedge ("Historians debate questions like this one. ...") |
| I7 authority numbers are "about" and carry the "sources differ" note | `AUTH_NOTE` on every strength and casualty answer; a compare table repeats it |
| I8 `textContent` only | the page builds DOM with `createElement` and text nodes; a source scan test forbids `innerHTML` and friends |

Refusals are honest: an out-of-scope question is declined in one sentence with a pointer; a question about a specific soldier is routed to the Find Your Ancestor page rather than guessed; a data conflict the engine can detect is stated rather than smoothed over. What the engine cannot answer from the site's records it says so.

## 6. The candidate page

`historian-src/page/historian.html` + `historian.css` + `historian.js`, no inline script or style, so it can run under a strict Content Security Policy.

- **First paint is independent of the records.** The shell (heading, explanation, example chips, form) is plain HTML and CSS. The script starts opening T1 immediately and says so in the status line; questions typed meanwhile wait for the records and then run.
- **Lazy shards with retry.** T2 buckets load per question through `browserFetcher`, which forgets a failed request. A failed shard produces an error card with "Try again"; a failed T1 open shows "Try again" in the status line and is retried automatically by the next question.
- **Accessible by construction.** `lang`, zoom allowed, one `h1`, skip link, labelled input, `role="log"` conversation region with polite live updates, `role="status"` for short messages, real buttons for every chip (44 px targets), visible focus ring, tables in keyboard-focusable scroll regions, `prefers-reduced-motion` respected, forced-colours rules, contrast of every text pairing at or above 4.5:1, the boundary of the question box and of every chip button at or above 3:1 against the page (WCAG 1.4.11; `--line` is `#5f6884`, about 3.5:1), and no secondary text below 14 px (all tested).
- **Focus and scroll.** After an answer the page scrolls to the start of the answer. Focus stays in the question box after a typed question and moves to the answer after a chip click (the chip that had focus is replaced). `/` focuses the question box; Escape clears it.
- **Input bar never covers content.** The ask bar is sticky at the bottom of the flow; its height is published as `--bar-h` (ResizeObserver) and `main` reserves that much padding, and `scroll-padding-bottom` keeps scrolled-to answers clear of it.
- **Mobile first.** The base CSS is the 320 px layout; only `min-width` queries exist; the input is 16 px so iOS does not zoom.
- **Never "undefined".** Every value passes through a string guard; unknown block types are dropped; a last-ditch text check replaces any answer containing `undefined`, `NaN` or `[object` with a neutral message.
- **Links.** Only same-site absolute paths coming from the engine's own source list become links.
- **Privacy.** Questions never leave the browser. The page stores nothing (no cookies, no storage).

Tests run the real `historian.html` and `historian.js` in a small fake DOM (`tests/historian/lib/fakedom.mjs`) against the real engine and a KB built from scratch. The import graph and `boot()` (including the same-origin `hx-base` rule) are also exercised over HTTP against a localhost static server with Node's own `fetch`. No browser was launched for this build: real layout, real scrolling, IME and screen-reader behaviour, and a browser's own module loading and CSP enforcement are **not verified** (see the limits below).

## 7. Rights and sources

`docs/historian/sources.yaml` (generated, 85 sources) is the register. Tiers: **A** public domain (may be indexed, redistributed in derived shards, quoted; the only tier that may ever be sent to a model), **B** reusable with attribution or share-alike (separate files, per-record licence text, never in a model call), **C** link-out only (never fetched, stored or embedded), **A-pending** believed public, awaiting confirmation (not shipped). The two site sources are A-pending: provenance of some site-authored data is still to be audited (chapter 14 D.10). Validator V02 fails the build on a Tier C id, a missing licence, Tier B without attribution, `may_send_to_llm` on a non-A source, a reprint imprint, or an unquarantined low-OCR source. The fetcher refuses banned hosts (27) and refused identifiers (the 1971 reprint of the Official Records) before any network call.

## 8. Budgets (measured)

| Item | Budget | Measured |
|---|---|---|
| T1 brotli | 250 KB | 184,593 B |
| largest text shard / posting bucket | 64 KB | 12,798 B / 3,638 B |
| build | none set | about 4 s |
| answer latency in Node (p95 over the golden run) | interactive | about 3 ms |
| mean initial characters | 600 (H2 gate) | 547 over all three batteries (579 on the golden set) |
| page script graph | under 300 KiB | 20 files, 307,088 of 307,200 characters unminified, no dependencies (the corpus modules are outside it) |
| Official Records corpus (not shipped) | lazy | 1,189 files, 15.4 MB raw, 4.8 MB brotli; a question that reaches into it: 12 files and 54 KB brotli at the median; first paint +1,043 B in the manifest, T1 identical (CORPUS.md section 8) |

## 9. Deliberately not in H0 to H2

- No embeddings, no semantic tier, no model stage (`manifest.semantic.enabled` and `manifest.ai.enabled` are `false`).
- No external text in the shipped artifacts: the Official Records volume 27 corpus (8,232 passages, page and scan citations) is built, tested and measured (CORPUS.md) but not part of `historian-src/dist/hx`; Fox, Busey and the rest are catalogued and gated, nothing more. Shipping the corpus is the owner's decision.
- No Worker wrapper for the engine yet (it is main-thread safe: the p95 answer is milliseconds; a Worker is a later hardening).
- No release wiring, service worker precache, analytics or feedback capture.

## 10. Known limits

- The evaluation batteries are small; the primary battery was used to tune, the held-out and fresh batteries were not (fresh was written before the engine existed). The golden set has a locked split: aggregate numbers only were used from it.
- Extractive answers are only as good as the site's records: where the records conflict or are wrong (for example Biddle's Brigade) the engine reports what the records say.
- Questions that need reasoning across several passages (why did Lee lose; why did Pickett's Charge fail) get quotes and a hedge, not a synthesis. That is the design.
- **The clock answers rest on a proposed, unsigned time model** (section 4a). They are only as good as its anchors, and the model may still change; a change to it changes the baked clock, and the committed build must be regenerated (a test notices a stale one).
- **Student-level answers are a plain card**: readable (grade 4 to 7), and for an event it now also gives the record's own figure ("The record mentions approximately 12,500 men in a mile-wide front.") and up to three of the site's own short lines from the following stretch of the chronology ("Soon after, in the site's own words: ..."), chosen so the whole card stays at grade 7 or lower. It is still thin for the golden item GQ-092 (it covers one of its three expected points by the automated patterns, and the student-content gate stays red, 80% against 85%): a written plain-language text for the main events would serve a young reader better and is content, not code.
- The compound-question splitter handles two questions joined by "and" or a comma where the second has its own question word; it does not plan longer chains.
- **Known unknowns are read by concept, and the concept lists are small.** The weather, soldier, roster and thought rules (core/unknowns.js, the `lexicons` in scope.v1.json) were swept with about 85 paraphrases and 45 look-alike questions, not with real users' questions; the wording of the limitation texts has not been reviewed by the owner (`reviewed: false`).
- **The English dictionary is not a lexicon.** It holds about 4,800 words (two seed lists, period words from the OR27 sample, inflection and derivation closure). It is what keeps a correctly spelled word from being rewritten; a rare correct word it lacks can still be rewritten into a similar name (2.4% of a held-out sample).
- The page was exercised only in a fake DOM. A real-browser pass (Chrome, Safari, Firefox; VoiceOver, NVDA, TalkBack) is required before release.
