# Ask the Historian: pipeline, tests and evaluation

How the knowledge base is built from the site's data, how the ingestion scaffold for the Official Records works, what the tests cover, and how the engine is evaluated (with the numbers this build actually reached and where it falls short). Candidate work: nothing here deploys anything.

## 1. Build pipeline (site data to `historian-src/dist/hx/`)

```
node tools/historian/build.mjs                  # reads legacy/dist/data/**, writes historian-src/dist/hx/ and historian-src/dist/validation-report.json
node tools/historian/build.mjs --dry            # everything except writing the hashed files and the manifest
node tools/historian/build.mjs --data <dir> --out <dir> [--no-bundle] [--quiet]
```

Stages (all in `tools/historian/build.mjs` and `lib/`):

| # | Stage | What happens |
|---|---|---|
| S0 | load | `load.mjs` reads the 71 data files through a **field whitelist** (regiments, order of battle, vignettes, chronology, terrain, monuments, successions, placement notes, tour stops). `flag`, `flag_notes`, the chronology clock label `time` and animation fields are dropped at this boundary. The data directory is hashed (sha256) into the manifest. |
| S1 | bundle prose | `bundle.mjs` parses the site's built bundle with acorn and extracts the 16 walkthrough stops (with their tick windows) and the 16 tour stops. |
| S2 | registry | `registry.mjs` builds 1,694 entity records (T1) keeping the site's own ids, folds alias stubs (`U-14BK` into `U-84NY`), derives aliases (ordinal forms, state abbreviations, parentheticals, nicknames, "{surname}'s brigade", ALL-CAPS event labels), adds 706 person entities with a prominence rank, and applies the curated aliases in `tools/historian/data/aliases.v1.json` (47). Prose is cleaned: raw ids humanised or the sentence dropped, ` -- ` to an em dash, developer notes removed. |
| S3 | passages | `passages.mjs` makes 1,530 passages (vignette paragraphs, chronology events and commentary, succession notes, curated placement notes, walkthrough and tour prose) with sentence boundaries, citations, entity links and clock-claim offsets. |
| S4 | index | `postings.mjs` builds the lexicon (2,258 terms), 128 BM25 impact8 posting buckets and 32 entity-posting buckets; `t1.mjs` builds the card BM25F index. |
| S5 | facts | `facts.mjs` computes the rank tables (with their rule text), roll-ups, the succession index, event lists, and compiles `data/scope.v1.json` (scope rules, unknowns, routes, domain terms, the outcome and glossary rows). |
| S6 | emit | `emit.mjs` writes each artifact as `<name>.<sha8>.json` (canonical JSON), then the manifest; the previous two manifests and their files are kept. |
| S7 | validate | `validate.mjs` (below). The build exits 1 on any error-level finding and writes nothing. |

A full build takes about 4.5 s. Output today: 266 files, about 5.3 MB on disk including the two kept previous versions; T1 is 1,417,594 B raw and 182,833 B brotli.

### Validators

| Rule | Checks |
|---|---|
| V01 | schema: required fields on every record |
| V02 | licence and tier gate (Tier C never ships; licence id; Tier B attribution; `may_send_to_llm` only on Tier A; no reprint imprint; OCR proxy) |
| V03 | sentence boundaries and quote offsets in range and on boundaries |
| V04 | every id referenced anywhere resolves to a record |
| V05 | developer-note blocklist ("CRITICAL ANIMATION", "flag_notes", "keyframe", "YouTube", "Unique placement", ...) |
| V06 | no ` -- `, `undefined`, `null`, `NaN` or raw internal ids in any text that can be shown |
| V07 / V08 | anchors and folio sample (no-ops until H3) |
| V09 | unique ids |
| V10 | size budgets (T1 brotli at most 250 KB; shards at most 64 KB) |
| V11 | an alias that maps to more than 8 entities needs an explicit rule |
| V12 | determinism: rebuild twice, compare every hash (a test) |
| K001 | every indexed field exists in the schema and every whitelisted source field is populated: this is the rule that kills the drift that made the deployed page print `undefined` 137 times (`e.title` / `e.description` no longer existed in the chronology) |

### Determinism and rollback

Same input gives the same bytes: keys are sorted, no timestamps enter the artifacts, ordering is by id. Changing data changes the affected hashes and the manifest; the previous two manifests remain deployable. Rebuilding into the same directory with unchanged input leaves the manifest untouched and removes nothing.

## 2. Ingestion scaffold (Official Records, series I, volume 27)

Purpose: prove the S1 to S4 shape for a scanned public-domain source (fetch politely, normalise OCR, segment into reports, chunk into citable passages with printed pages and sentence offsets) so the later phases can add sources without redesign. **No ingested text is part of any shipped artifact and no source text is committed**: the download cache is `tmp/historian-cache/` and the outputs `historian-src/raw/`, both git-ignored. The only fixture is `tests/historian/fixtures/or27-excerpt.txt` (6.9 KB of the 1889 public-domain OCR).

```
node tools/historian/ingest/cli.mjs list
node tools/historian/ingest/cli.mjs fetch   or27-1 --sample          # first 2 MB (Range: bytes=0-2097151), cached
node tools/historian/ingest/cli.mjs segment or27-1 --sample          # writes historian-src/raw/or27-1/{report.json, documents.jsonl, passages.jsonl, normalized.txt}
```

### Fetcher (`ingest/fetch.mjs`)

- **Rights gate first.** The URL must pass `fetchAllowed` (banned hosts, refused identifiers), and an archive.org identifier must be **registered** in `sources.yaml` as Tier A or B. Anything else is refused before any network call (`RightsRefusal`).
- **Politeness.** Identifying `User-Agent`; per-host sequential queue with a minimum interval (archive.org 1 s, loc.gov 5 s, Wikimedia 1 s, nps.gov 7.2 s, default 1 s); `Retry-After` honoured; exponential backoff on 429 and 5xx (3 retries); **403 is a hard stop**: the host is blocked for the rest of the process.
- **Cache.** Every response is stored by `sha1(url|range)` with metadata; `sources.lock.json` records url, range, sha256, bytes and time. A second run downloads 0 bytes (tested; the CLI prints "network bytes this run").
- Range requests are supported so a test can use the first 2 MB of a volume.

### Normaliser and segmenter (`ingest/or27.mjs`)

| Step | Behaviour |
|---|---|
| whitespace | NFC, CRLF and form feeds, collapsed blanks; U+FFFD between digits becomes an en dash, otherwise dropped; logged |
| running heads | odd-page ("CHAP. XXXIX.] THE GETTYSBURG CAMPAIGN. 605") and even-page ("606 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.") heads removed, including dozens of OCR variants (fuzzy comparison of the letters against the fixed title); the printed page of every page start is recorded; a numbering restart (front matter, then page 1) is kept when the next mark confirms it; a digit slip is replaced by the previous page plus one and counted |
| de-hyphenation | lower-case continuations joined ("mor-\ntally"), hyphen kept before a capital ("Brigadier-\nGeneral"); logged |
| dictionary repair | conservative: a rare lower-case token is changed only when exactly one frequent word (df at least 200) differs by one edit that is a typical OCR confusion (u/n, b/h, c/e, i/l, v/w, ...); digits, capitals and short tokens never touched; every edit logged |
| contents list | parses "No. 196.— Col. Joshua L. Chamberlain, Twentieth Maine Infantry." including the ABBYY column layout (a run of numbers, then a column of titles), removes OCR punctuation inside titles, and restores a misread number (203 read as 208) from its neighbours |
| report headers | tolerant of "Ho. 48.", "ISTo. 68.", "Beport of", "Renort of", "Report, of", "General Return of ..."; a report whose number line is unreadable is found again by its contents author near a "Report of" line and marked `recovered` |
| chunking | 150 to 250 word passages, paragraph aligned, over-long paragraphs cut at sentence boundaries, short tails merged (never above 310 words), never across reports; each passage carries sentence starts, its offsets in the report and its printed pages |
| sentences | `historian-src/core/text.js` `splitSentences`, extended for 1863 usage: Hdqrs., Genl., Sergt., Comdg., Asst., Adjt., Surg., Batt., Div., Dept., Chap., Fred., Wm., Chas. and similar; no split before a number after "p.", "Vol.", "No." or a month abbreviation; a stray OCR dot after a space is not a sentence end |

### Result on the first 2 MB of volume 27 (`or27-1`, IA `warofrebellion271unit`)

Measured with `cli.mjs segment or27-1 --sample` (cached sample; 2,097,152 bytes; sha256 `b7d815f7...`):

| Measure | Value |
|---|---|
| reports found | 188 of the 191 in the range 1 to 191 (missing: 30, 81, 161) |
| contents entries parsed | 358 (numbers 1 to 378; the sample ends inside report 191) |
| reports with printed pages | 188 of 188 |
| page marks | 469, of which 33 inferred (digit slips), 0 running heads left in the text |
| confidence | A 165, B 9, C 14 |
| recovered from the contents list | 9 (Nos. 77, 85, 86, 108, 111, 139, 158, 169, 170) |
| passages | 1,513, mean 193 words, none above 310, every passage has a printed page |
| logged edits | 3,713 (dehyphenate 3,577; hyphen kept 55; dictionary 81) |

Known misses: No. 30 has a scrambled header ("Reports of Maj. Gen. ... No. 30. John Newton ..." in separate columns), No. 81 has no contents entry, No. 161 is a badly damaged scan. Report bodies still carry ordinary OCR noise (stray glyphs, split words such as "Getty sburg"); the retrieval layer does not depend on it but a reader-facing quote would need the scan image to confirm (this is what anchors are for at H3).

## 3. Tests

`node --test "tests/historian/**/*.test.mjs"` runs 129 tests in about 45 s (no network, no browser):

| Suite | Covers |
|---|---|
| `text.test.mjs` | normalisation, tokenising, stemming, Damerau-Levenshtein, sentence splitting |
| `intent.test.mjs` | every intent rule, including the tightened ones and rule order |
| `engine.test.mjs` | composers, honest refusals, clarification, injection, invariants I1 to I8, the entity-card sweep (every record's own name asked as a question), chip answerability, latency |
| `build.test.mjs` | determinism (V12), validators including K001 and V06, developer-note exclusion, size budgets, manifest rotation, id discipline, derived aliases, fact tables |
| `sources.test.mjs` | the register, the tier gate, every fetch refusal |
| `ingest.test.mjs` | the fetcher with a mocked network (gate, politeness, per-host queue, cache, Retry-After, 5xx backoff, 403 hard stop, CLI refusals) and the OR27 normaliser, contents parser, segmenter and chunker on the committed excerpt; one test uses the cached real sample and is skipped when it is absent |
| `page.test.mjs` | the candidate page: markup and CSS contracts, contrast, forbidden APIs, module graph, the controller run against the real HTML in a fake DOM with the real engine, and the page booted over HTTP from a localhost static server (import graph, content types, lazy shards, same-origin `hx-base`) |
| `regress.test.mjs` | runs the evaluation and fails on a drop of more than 2 points against `engine-recorded.json` |

## 4. Evaluation

```
node tests/historian/eval.mjs                                   # batteries + golden set, new engine and the deployed page (baseline B0, run live)
node tests/historian/eval.mjs --system engine --gates H2        # engine only, H2 gates
node tests/historian/eval.mjs --suite golden --split dev --verbose   # list the failing golden items (dev split only)
node tests/historian/eval.mjs --json out.json                   # machine-readable
node tests/historian/eval.mjs --baseline-update                 # re-record tests/historian/engine-recorded.json (after reviewing the numbers)
```

**Systems.** B0 is the deployed `legacy/dist/historian.html` script, run live under a stub DOM against `legacy/dist/data` (it reproduces the recorded baseline: primary S@1 76%, canonical@1 29%). NEW is `historian-src` on the committed `hx` build.

**Batteries** (metric definitions from the plan's current-state analysis, section 3.3): primary (118 queries; the prototype was tuned on it), held-out (57), and fresh (99; written for this build before the engine existed). S@1: the first shown card is relevant. canonical@1 (strict): the first shown card is the entity's own regiment or place record (ids `U-`, `C-`, `LOC-`). fact@3: the expected fact appears in the answer text. typo: S@1 on misspelled names. Correct decline: out-of-scope questions declined. Defects: `undefined`, raw ids, developer notes, ` -- `, lower-cased proper nouns, alias records. Chars: mean length of the first answer.

**Golden set** (150 questions; `answerable_now` = 113 questions the current corpus can answer; dev and locked splits). Only the aggregate is used from the locked split. Scored with a port of the plan's scorer.

### Numbers (Sep 2026 build; `tests/historian/engine-recorded.json`)

| | B0 primary | NEW primary | B0 held-out | NEW held-out | B0 fresh | NEW fresh |
|---|---|---|---|---|---|---|
| S@1 | 76% | **99%** | 71% | **98%** | 63% | **99%** |
| canonical@1 (strict) | 29% | 88% | 41% | 91% | 40% | 88% |
| canonical@1 (echelon-aware variant, see below) | | 100% | | 100% | | 96% |
| fact@3 | 68% | 91% | 31% | 100% | 38% | 100% |
| typo S@1 | 13% | 100% | 20% | 100% | 22% | 100% |
| correct decline | 47% | 94% | 20% | 100% | 25% | 100% |
| false refusal on answerable | 4% | 0% | 8% | 0% | 6% | 0% |
| defect rate | 90% | 0% | 91% | 0% | 90% | 0% |
| mean initial characters | 2,989 | 583 | 2,689 | 572 | 3,004 | 520 |

Golden set, `answerable_now` (113): B0 passes 16%, NEW passes **87%** (dev split 91%, locked split 76%); critical-point recall 92%; behaviour correct 99%; clean 100%; out-of-scope declines 100% correct with 0% false declines; hedged caveat items 94%; grounded 98%; retrieval hit@5 91%, MRR@10 0.76; prompt-injection, XSS and leak resistance 100%; hallucinated citations 0; forbidden content (wrong clocks, fabricated numbers, leaked secrets) 0. All 150 questions: B0 14%, NEW 69% (the rest need data the current corpus does not have).

### Gates at H2 (`tests/historian/gates.json`, golden gates in `fixtures/golden-gates.json`)

Passing: S@1 on all three batteries; fact@3; fact in the top bubble; typo; correct decline; false refusal; defects; mean initial characters (558 against a limit of 600); every golden hard-zero gate; H1+H2 subset pass rate (86.7% against 85%); abstain precision and recall; retrieval hit@5 and MRR.

**Failing, and why:**

1. **canonical@1 (primary): 88% against 92%.** Six of the seven misses are brigade nicknames ("Texas Brigade", "Irish Brigade", "Bucktails", "Stonewall Brigade", "Louisiana Tigers", "Vermont brigade") answered with the brigade card first, which is arguably the right card, but the strict metric counts only a regiment or place record. The echelon-aware variant reported next to it (brigade, division and corps cards of an expected regiment, and the site's own `TF:`, `STR:`, `ROAD:` records, count as canonical) gives 100%, 100% and 96%. The variant is this build's own, informational, and does **not** replace the plan's metric; whether to redefine it is a decision for the owner. The one miss both metrics share on the fresh battery is a count question ("how many Maine regiments were there"), which is a list-type answer, not an entity lookup.
2. **H1+H2 critical-point recall: 92.0% against 93%.** The misses on the dev split are the cause-and-effect questions ("why did Lee lose", "why did Pickett's Charge fail", "was Sickles's advance a blunder"), which ask for several contributing factors (the engine quotes the closest passages and hedges; it does not synthesise a list, by design), one item where the site's own brigade record is wrong (Biddle's Brigade lists Col. Roy Stone; the engine reports what the record says), one on-site question, and one question whose reference answer is a quote the retrieval does not surface.
3. **Readability of student-level answers: 80% against 85%** (4 of 5 measurable items; the failure is the locked "explain Pickett's Charge to a 5th grader" item, whose extractive answer is above the grade limit because the site's own sentences and proper nouns are long).

### Honest caveats about the numbers

- The primary battery was used for tuning (as in the prototype it is compared with); its numbers are in-sample. The held-out and fresh batteries were not tuned on, but they are small (57 and 99 queries) and were written by the same team as the engine.
- The golden dev split (91%) was used as guidance during tuning; the locked split (76%) is the better estimate of unseen performance, and the gap of about 15 points is real: expect the locked figure to be the more honest one.
- The metrics reward extractive answers that contain the expected words; they do not measure whether a reader would find an answer helpful or fair, especially on contested questions. A human review of a sample of answers is still needed.
- The corpus is small (1,530 passages, 26,869 words). Most quotes come from the site's own vignettes and chronology, which is why the answers are accurate to the site and only as accurate as the site.
- `p95` latency (about 4 ms) is Node on a warm cache with shards on local disk; in a browser the cost is dominated by fetching shards (each at most 13 KB).
- The regression guard records where this build is, not what is required; it will fail on a real regression and needs re-recording (`--baseline-update`) after a deliberate change.

## 5. What would have to happen before a release

None of this is done and none of it is part of this work:

1. A real-browser pass of `historian-src/page/` on the target browsers and screen readers, at 320, 375, 768 and 1280 px, with the on-screen keyboard.
2. A decision on where the page and `hx/` are served (the page reads `hx-base`, same origin only), cache headers (shards immutable, manifest `no-cache`), and whether the module graph is bundled.
3. Owner confirmation of the provenance audit of the site's own data (both site sources are Tier A-pending) and, before any external source ships, counsel confirmation of each Tier A pre-1931 imprint.
4. A human review of a sample of answers, the owner or historian sign-off of the outcome, glossary and scope rows (`reviewed: false` today), and the decision on the canonical@1 definition.
5. The T0 rules stand: no clock-label change ships in Tranche 0, and anything that changes displayed history stays a candidate until the time model is approved. This engine never derives a clock from a tick.

## 6. Gotchas (found while building this)

- On Windows, shell heredocs collapse `\\` to `\` and can turn `\b` into a backspace byte inside a regular expression. Two source bugs of this kind were found (a lost `\s` in the chronology lead cleaner, a `\b` in a sentence-splitter regex); the fix was to write such files with an editor tool and to grep for `[.:]s+` style damage. Do not patch regexes through a shell heredoc.
- `Response` bodies from a mocked fetch must be `Buffer`-able (`arrayBuffer()`); the fetcher relies on it.
- `node --test` runs each test file in its own process, so each file that needs a KB builds one (about 4.5 s); the fixture memoises per process.
