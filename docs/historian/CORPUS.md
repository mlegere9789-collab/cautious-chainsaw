# Ask the Historian: the Official Records corpus (Series I, volume 27)

What this is: the text of the *War of the Rebellion: Official Records*, Series I, volume 27 (the Gettysburg Campaign), parts 1, 2 and 3, cut into 8,232 citable passages, linked to the site's units and people, and wired into the engine so that questions about what an officer **reported**, **wrote** or **said** (and at what **time** he said it) are answered with his own words and a page citation.
Status: built and tested, **not shipped**. The candidate page still reads `historian-src/dist/hx`, which has no corpus; the corpus KB is built next to it (`historian-src/dist/hx-or27`, git-ignored). Whether to ship it is a decision for the owner (section 9 lists what the decision costs).

Everything below was measured on the committed tables and the build of 2026-10-01; the numbers are reproduced by `tests/historian/or27.test.mjs` and `tools/historian/measure-corpus.mjs`. Where something was **not** checked, it is said.

## 1. Provenance and rights

Three Internet Archive items, original 1889 Government Printing Office scans (never the 1971 reprint, whose identifier `warrebellionaco00cowlgoog` is on the register's refused list):

| Volume | Archive item | Files read (role, bytes, sha256) |
|---|---|---|
| Part 1 (`or27-1`) | `warofrebellion271unit` | OCR text 3,970,479 `4a388b62...`; page numbers 200,256 `1c466ef4...`; scan data 1,563,011 `1f1f193e...` |
| Part 2 (`or27-2`) | `warofrebellion272unit` | OCR text 3,880,513 `144f88d2...`; page numbers 190,222 `26a63d95...`; scan data 1,479,014 `f930f670...` |
| Part 3 (`or27-3`) | `warofrebellion273unit` | OCR text 3,406,041 `5bd2aed1...`; page numbers 211,296 `80f8088e...`; scan data 1,642,470 `544fa8a9...` |

URLs (`https://archive.org/download/<item>/<item>_djvu.txt`, `_page_numbers.json`, `_scandata.xml`), fetch times and full hashes are in `historian-src/corpus/or27/manifest.json` (`sources`) and in the `ingest` block of each `or27-N` entry of `docs/historian/sources.yaml`. The nine files were fetched on 2026-10-01 with the project's fetcher (`ingest/fetch.mjs`: honest User-Agent, one request per second per host, redirects gated, rights gate before any request); a second build reads `tmp/historian-cache` and downloads nothing.

**Rights statement.** The text is a United States Government publication of 1889 (17 U.S.C. 105; published before 1931): public domain, register tier A, licence id `PD-US-Gov`, `may_index`, `may_redistribute` and `may_send_to_llm` true, `imprint.reprint` false. The register points each volume at its HathiTrust catalogue record (`coo.31924077699761`, `coo.31924077728255`, `coo.31924077700262`; rightsCode `pd`, "Full view"). The Internet Archive's own terms apply to the scans and OCR files it hosts. Quotation of the text is of the public-domain work; the scan links point to the Archive's reader and copy nothing.
*Not verified in this pass:* I could not read the HathiTrust records myself: the catalogue sits behind a Cloudflare challenge that an honest client cannot pass, and I did not try to get past it. The rights entries therefore stand on the register as the earlier workstream wrote it (`verified_at: null`, `reviewer: null` for volumes 2 and 3; volume 1's entry says the API was read on 2026-09-30). The public-domain status of an 1889 Government publication does not depend on that record, but a person should sign the entries off.

What is committed: the tables in `historian-src/corpus/or27/` (`reports.json`, `dispatches.json`, `time_claims.json`, `manifest.json`, `measurements.json`) and `historian-src/corpus/time_evidence.json`. What is not (git-ignored, rebuilt on demand): the downloaded files, `historian-src/raw/or27/` (the normalised text, the passages, the documents and the mention log) and `historian-src/dist/hx-or27/`.

## 2. What is in it

| | Part 1 | Part 2 | Part 3 | Total |
|---|---|---|---|---|
| documents | 377 | 211 | 2,945 | 3,533 |
| passages | 2,680 | 2,083 | 3,469 | 8,232 |
| words | 513,531 | 401,477 | 415,080 | 1,330,088 |

- **Reports**: 588 of the 589 numbered reports are found (Part 1: 377 of 378; Part 2: 211 of 211). **No. 161** (Lt. Col. Baldwin, 1st Massachusetts) is a damaged scan whose text is not in the OCR; it is named, not hidden (`missing_numbers` in the manifest). 573 of the 588 are reports by a person; the others are returns, organisation lists and the like.
- **Dispatches** (Part 3, cut at their datelines): 2,945 (Union 2,429, Confederate 516; 2,764 dispatches, 180 orders, 1 itinerary), dated June 3 to August 3, 1863; 1,263 carry a clock time in their header; 586 fall between June 28 and July 5, 208 on July 1 to 3 (89 with a clock).
- Tables (the Guild casualty return and the like) are not read: the cells are taken out of a chunk and the prose kept (174 chunks cleaned), and a chunk that is only a table is dropped (67: 26, 22 and 19 by part). The normaliser logged 16,552 edits (15,791 de-hyphenations, 279 hyphens kept, 482 dictionary repairs); see `PIPELINE.md` section 2 for the rules.
- Confederate coverage is uneven, which is the volume's, not the corpus's: no report by Pickett, Hood or McLaws is in it. The engine says so when asked (sections 6 and 8).

## 3. How it is built

```
node tools/historian/ingest/corpus.mjs build                                  # fetch (or read the cache), normalise, segment, chunk, page-map, link, claims; writes historian-src/raw/or27 and historian-src/corpus/or27
node tools/historian/ingest/time-evidence.mjs                                 # historian-src/corpus/time_evidence.json (proposals; section 5)
node tools/historian/build.mjs --corpus or27 --out historian-src/dist/hx-or27 # the KB with the corpus tiers; V01-V09 validators
node tools/historian/gen-sources.mjs                                          # docs/historian/sources.yaml from the manifest
node tools/historian/golden-or27.mjs --set A|H                                # the OR golden sets
node tools/historian/measure-corpus.mjs --out historian-src/corpus/or27/measurements.json
node --test tests/historian/*.test.mjs                                        # the tests that need the corpus build it into a temp directory, or SKIP LOUDLY with these commands
```

Stages (details of the normaliser and segmenter are in `PIPELINE.md` section 2):

1. **Normalise**: running heads, signature marks and page folios read by what they say; de-hyphenation; a conservative dictionary repair; every edit logged. Page marks travel through the joining of hyphenated words as one private-use character each (the first build looked each mark up again by its next four words and put two pages whose first lines read alike, such as "Headquarters Third Army Corps," on one offset; the independent page check below rose from 91.1% to 94.9% when that was replaced).
2. **Segment**: Parts 1 and 2 by report number and contents list; Part 3 by dateline (header, place, clock, addressee, signer).
3. **Chunk** into 150 to 250 word passages with sentence offsets (`sb`), never across documents; the id is `<doc>#<sha1 of the text, 8 hex>`.
4. **Page map**: every passage carries `pg = [[offset, printed page, scan leaf, reader index], ...]`.
5. **Link** to the site's registry (the T1 the KB is built from), **extract clock claims**, **build the tiers** (postings, entity postings, text shards, a file list).

## 4. Citations: quote spans, pages, scan leaves

- **Verbatim quote spans.** An engine quote is `{ passage, s, e, text, h, page, scan, leaf }`: `text` is `passage.text.slice(s, e)` (whitespace-normalised), `h` is the FNV-1a hash of that text. Invariants checked on every quote of every golden answer (`tests/historian/lib/or27-golden.mjs`): **Q1** the words are the passage's words at `[s, e)` and the hash is theirs; **Q2** the printed page is the one the passage's page list gives for the span, inside the document's own page range; **Q3** the scan link is the Archive reader of the leaf that list gives, on the right volume. No quote of the 106 golden answers broke Q1 to Q3.
- **Verbatim at build** (validator V03): every one of the 8,232 passages is a slice of the normalised OCR of its own report (paragraph by paragraph, in order); **8,232 checked, 0 failed**. The text is the OCR as read, with the 1863 spelling and the OCR's damage; it is not corrected beyond the logged normalisation, and a quote shows it as it is.
- **Printed page.** All 8,232 passages have one (10,161 page entries). The page is read from the running heads of the raw OCR; the Archive's `page_numbers.json` is only used for the leaf. *Independent check:* for each passage, the first seven words (unique in the raw text) were found in the raw OCR and the nearest running head before them read; of 5,863 passages where that head is readable and clean, **5,562 (94.9%) agree** (Part 1 1,868 of 2,012; Part 2 1,216 of 1,294; Part 3 2,478 of 2,557). The 301 that differ (54 one page low, 8 one page high, 239 by more) are not resolved: a damaged head in the check is as likely as a wrong page in the map, and 2,369 passages have no clean head to compare with. On the golden sets' 84 evidence sentences, 70 have a readable head and 66 agree; the other 4 differ by one page where the sentence stands just after a page break the check could not see (`pages_ok` in the fixture records the page held to be right).
- **Scan leaf and reader link.** The leaf of a page is the leaf of the same folio in the Archive's `page_numbers.json` when it holds one; the reader index subtracts the leaves the Archive excluded from the access formats (`scandata.xml`). 2,829 of the 2,830 distinct (part, page) pairs cited are mapped by the Archive's own folio reading; one, **Part 3 page 3**, is not: the opening page of Part 3 (the first two dispatches, June 3 and June 1) prints no running head, the Archive could not read its folio, and the OCR shows it printed as "(3)" at the page's foot; it is page 3 by the folio count (the first folio read is 4 at leaf 10, so leaf 9). *Not verified:* **no scan link was opened in a browser** (the build was not allowed to launch one), so the leaf-to-reader arithmetic is derived from the files, not checked against the live reader; the printed page is the citation, the link is a convenience. An attempt to check leaves with the Archive's search-inside API failed (HTTP 405) and was abandoned.

## 5. Entity links, clock claims, time proposals

### Entity links

Every passage is linked to the site's units and people with the engine's own linker (`ingest/link.mjs` over `core/linker.js`): tier **A** (the unit grammar names the regiment), **B** (a formation, battery or person alias resolved by side, rank class and given names) and **C** (a bare surname or an uncertain match). **Only A and B are emitted** as passage entities; C is kept in the raw mention log for measurement and never reaches the KB. Counts: A 7,078, B 6,903, C 6,260 (not emitted); 5,574 passages carry an entity.
Authors: of 573 reports by a person, 270 are linked to a person of the registry and 300 to a unit (157 to neither: the registry holds the 706 officers of the battle, not every captain who reported). Senders: of 2,938 dispatches, 2,425 carry exactly one signature and **463 are linked** to a person (the signature, its title line, the side and the rank class must agree; a text with two signatures has no single sender).

**Hand-checked precision.** One reader (the builder) read each link in its sentence, against the contents-list title for authors, and against the signature and its title line for senders, and labelled it correct, wrong or uncertain (uncertain counts as wrong). The sample was drawn with a seeded generator from the links the build emitted: `tests/historian/fixtures/or27-links-checked.json` (items, sentences, labels and reasons; the text is public domain). Draw S1 was made on the build before this pass's fixes, S2 after the first fixes.

| Sample | Links | Right | Share (95% Wilson interval) |
|---|---|---|---|
| **All emitted (A and B)** | **200** | **192** | **96.0% (92.3 to 98.0)** |
| tier A passage entities | 135 | 131 | 97.0% (92.6 to 98.8) |
| tier B passage entities | 65 | 61 | 93.8% (85.2 to 97.6) |
| of which passage mentions | 120 | 113 | 94.2% (88.4 to 97.1) |
| report authors, person | 35 | 35 | 100% |
| report authors, unit | 20 | 19 | 95% |
| dispatch senders | 25 | 25 | 100% |
| tier C (not emitted) | 15 | 10 | 66.7% |

The 8 wrong or uncertain emitted links, and what became of them. **Wrong, fixed (5):** a battery that carries its parent regiment's name ("Cooper's (First Pennsylvania Reserve Volunteer) battery") read as the regiment; "Major-General Hill, Comdg. Dept. of N. C." read as A. P. Hill instead of D. H. Hill; a report author's "Twenty-seventh Pennsylvania Militia" read as the Volunteers; "Capt. J. M. Knap, Battery A, Pennsylvania militia" read as Knap's Independent Battery E; "General Williams, Assistant Adjutant-General" read as Alpheus Williams instead of the staff officer Seth Williams. **Uncertain, still emitted (3):** "1 or y fourth Georgia" in an OCR-damaged list (the Forty-fourth?); "the First Michigan Regiment" (infantry or cavalry is not told by the sentence); "General Hill has the three brigades with him" (A. P. or D. H. Hill). The fixes were written into `link.mjs` (militia and National Guard; a battery with a regiment's name; the rank class written in the text against the registry's; a staff title; a surname that only stems like another) and each is a regression in `tests/historian/or27.test.mjs` (OR-6, OR-7): a link read as right is still made, a wrong link that was fixed is not.
**The sample is not a measurement of the final build**: after it was labelled the sender rules changed (below), and the sample cannot say how the new links do.

**Sender links read from the document's own lines.** The first build resolved senders from the *passages'* text, where the lines of a paragraph are joined, so "A. PLEASONTON," and "Brigadier-General, Commanding." had become one line and no sender was read (and the June 3 dispatch of Pleasonton to Williams could not be found by "what did Pleasonton write to Williams on June 3"). Reading the document's lines added **100 sender links (463 in all, from 375)**. All 105 candidate links were read, none drawn: **100 right at first reading, 5 wrong** (a signal officer, Capt. James S. Hall, taken for Capt. James Hall of the 2nd Maine Battery, three times; Capt. William H. Hill taken for Capt. Wallace Hill; Col. J. S. Robinson taken for Brig. Gen. John Robinson). Those five were fixed (the given names written must agree with the registry's, a staff title below the rank of general makes a staff officer, the title's rank class must be the registry's rank class exactly) and the same rules removed two earlier author links that were wrong (a "Capt. Jesse M. Richardson" taken for John Richardson, a "Capt. Atherton W. Clark" taken for A. Judson Clark). One earlier link read as right (a signature with no title line) is no longer made, which is the price of the title rule (`lost_after_fix` in the fixture). Fixture items `S3-*`, tests OR-5 and OR-7.

### Clock claims

`ingest/times.mjs` (a grammar of 1863 clock expressions and of the day a sentence names; the engine's `core/clock.js` is the question-side reader) and `ingest/anchors.mjs` (the claim in its passage and sentence) read every clock expression in the corpus: **5,382 claims** (5,117 with a minute; 265 with an ambiguous meridiem that are kept apart; clock times 3,930, "o'clock" 596, sunrise and sunset 459, noon 272, midnight 78, ranges 44, spelled-out 3). Evidence kinds: report text 3,518, dispatch header 1,130 (the sender's own clock as he sent it, the best clock evidence in the volume), dispatch body 734. Each claim carries its sentence offsets, its day and the basis of that day ("carried" from the report's own dating, "same" sentence, "dateline", "rel" for "the next morning", "scope-other" for the June actions, "none"), the author's rank class, unit, the date written and the lag, and the printed page and scan leaf **of the claim's own page** (not of the report's first page). A claim in a report is testimony written days to months after the fight and is labelled so ("somewhere near 4 p. m.").

### Time proposals (`historian-src/corpus/time_evidence.json`)

For each of the 137 chronicle events of the site's time model, claims from the corpus that may bear on its minute are attached in tiers: **A** (the unit itself, same kind of event), **B** (a sentence naming the unit), **F** (a part of the unit, the same kind of thing, within 60 minutes of the site's own minute), **C** (weak). Counts: A 1, B 5, F 68, C 434 over 96 events; 41 events have no claim; 5 events have a report found. **These are proposals**: the file's `status` says nothing in it is shown to a reader or applied to the time model; the time workstream decides.
*Hand check (36 attached claims, seeded draw: 6 of tiers A and B, 30 of tier F; `fixtures/or27-time-evidence-checked.json`):* a claim is "about the event" when it states the time of that event (same day, same phase of the fighting). **Tier F: 17 of 30 (57%; 95% interval 39 to 73)**; tiers A and B: 3 of 6. Two earlier versions of the matcher were measured the same way and replaced (unit family + place + words: 6 of 40; unit family + action: 6 of 35). The labels are one reader's judgements and the event's model minute is the site's own proposal, so 57% means "more likely than not the same event", and the file is not evidence for moving a time without the claim being read.

## 6. Retrieval in the engine

The corpus is a set of **lazy tiers** the manifest only describes: `manifest.corpora.or27` is a small descriptor (base number 1530, count 8,232, a content-hashed file list `f/or27/files.<hash>.json` of 84,067 bytes). Opening the KB reads no corpus file. `core/kb.js` holds a stub; `core/corpus.js` and `core/reports.js` (36 KB, outside the page's static module graph) are imported by the first request that reaches into the corpus, which fetches the file list once. Corpus retrieval is **opt-in** per call (`scorePassages(terms, true)`, `entityPassages(ids, true)`), and only the report-seeking paths opt in, so a site question never touches a corpus file.

What it answers (`core/reports.js`; nothing is generated, the lead is a template over the document's metadata and every other sentence is a verbatim quote):

- "what did Chamberlain report about Little Round Top" - the report he wrote (author link, role 2), the passages closest to the topic, with author, rank, unit, date written and lag ("official report, written July 6, 1863, 3 days after the fighting ended"), volume and page.
- "what time did Longstreet say his assault began" - the sentences of his report that give a clock time and bear on the topic, as he wrote them.
- "what did Meade telegraph on July 4", "what did Lee write to Imboden", "what did Pleasonton write to Williams on June 3" - dispatches only, restricted before ranking by pseudo-entity postings (`K:dispatch`, `K:report`, `D:<date>`, `A:<addressee stem>`, `F:<sender stem>`; the stems are the question side's `stem()` of the name), labelled "written at the time"; a day with no dispatch is said, not answered with another day's.
- "what did the reports say about the Railroad Cut", "what did Confederate reports say about the Peach Orchard" - one passage per report, side filtered.
- When the corpus holds no report by the person ("what did Pickett report"): the answer says so, and says what he did write, instead of quoting someone else as if it were him.
- Questions naming another source ("what did Meade tell the Joint Committee", "newspapers report the outcome") are not about a report of the volume and fall through to the site's own path.

**Additive.** Over the 274 questions of the three site batteries and the 150 questions of the golden core (411 distinct), the answer is identical with and without the corpus except for **4**, each a question that asks for what someone wrote or said in his own report ("What did Colonel Oates say about Chamberlain's charge in his own words?", "What did Longstreet say in his own report about when the July 2 attack began?", "What did Alexander write to Pickett before the charge?", "What does Chamberlain's official report say about the bayonet charge?"), where the site had said "the site's records do not quote anyone saying that" and now the report is quoted. Site questions fetch the same files with and without the corpus (test OR-11, and 7 site questions in `measurements.json`).

## 7. The golden sets

`tests/historian/fixtures/golden-or27.json` (set **A**, 73 questions: 25 time, 21 author, 11 dispatch, 10 generic, 6 absent) and `golden-or27-heldout.json` (set **H**, 33: 11, 8, 5, 4, 5). Each question was written from the text: its evidence sentence was found in the normalised document, read, and its page checked against the nearest raw running head, **before the engine was run on it**. An item says what an answer must do (the right document, the clock times in the quote, quotes from the right side, or an honest "the volume holds no report by X"), and every quote must hold Q1 to Q3.

| Run | Result | By type |
|---|---|---|
| A, first run (before any fix) | **65 of 73 (89.0%)** | time 24/25, author 20/21, dispatch 9/11, generic 7/10, absent 5/6 |
| A, final (after the fixes the first run called for) | **71 of 73 (97.3%)**, **in-sample** | time 24/25, author 21/21, dispatch 10/11, generic 10/10, absent 6/6 |
| **H, held out** (written after the engine was final, run once, no change for it) | **31 of 33 (93.9%)** | time 9/11, author 8/8, dispatch 5/5, generic 4/4, absent 5/5 |

A's final figure measures the fixes, not generalisation (the questions drove them); **H is the honest figure**. The first run's 8 failures (OR-T09, A05, D08, D10, G03, G09, G10, N01) and the additivity check below led to engine fixes in `reports.js`, 6 of the 8 now pass: "Union reports" taken for the Army of the Potomac; "newspapers report the outcome" taken for a question of the volume; a question naming another source (the Joint Committee); "write to X" with no dispatch; a dated dispatch question given June dispatches; a report question given a date filter; and a quote chosen from another side or about another place. **Four questions still fail** (two of A, two of H), recorded as failures in `tests/historian/fixtures/golden-or27.recorded.json` (the test fails only if a question recorded as passing fails):

- OR-T09 "what time did Meade say he reached Gettysburg": the right report, but the quote chosen is the 7 p.m. and 11 p.m. sentences, not "At 10 p. m. of the 1st, I broke up my headquarters ... arriving there at 1 a. m. of the 2d."
- OR-D08 "what did Meade telegraph on July 4": the right dispatch (to Couch, 8.30 a.m.), a sentence other than the one the question expected ("withdrawn").
- OR-HT03 (Ruger) and OR-HT11 (Dobke): **neither is in the site's 706-person registry**, so the engine does not know the name, takes the question as a site question and answers with an unrelated site timeline entry. Authors outside the registry cannot be asked for by name (see the next section).

## 8. Sizes and latency (`historian-src/corpus/or27/measurements.json`)

| | Raw | Brotli | Files |
|---|---|---|---|
| BM25 impact postings (128 buckets; 20,919 terms) | 3,625,147 | 1,216,015 | 128 (largest 79,139) |
| entity postings (32 buckets) | 191,270 | 46,783 | 32 |
| text (8 passages per shard) | 11,489,810 | 3,483,705 | 1,029 (largest 19,032) |
| file list | 84,067 | 12,288 | 1 |
| **all corpus files** | **15,390,294** | **4,758,771** | **1,189** |

**First paint** (what a visitor to the page pays before the first question): the four T1 files (entity, entix, facts, lexicon) are **byte-identical** with and without the corpus; the manifest grows by **1,043 bytes (267 brotli)** (17,757 to 18,800 raw) to describe the corpus; the page's static scripts grow by **529 bytes unminified against the committed code** (`kb.js` 7,148 to 7,693: the stub that loads the corpus on demand; `engine.js` -23, `select.js` +7). First paint is therefore not *byte*-identical, but the first-paint data is T1 identical and the delta is under 0.1% of it (1,540,463 to 1,541,506 bytes raw; 205,330 to 205,597 brotli). The page's static module graph is 307,088 of 307,200 allowed characters (`page.test.mjs`): **there is no room left for static code in the page**; anything more must load lazily.

**A question that reaches into the corpus** (the 106 questions of the two golden sets, each with a fresh KB so no cache helps; files and bytes are those fetched beyond manifest and T1): 12 files at the median (31 at p95, 39 at most); 224 KB raw at the median (366 KB p95, 529 KB max), **53.7 KB brotli** at the median (96 KB p95, 152 KB max); **211 ms** of CPU in Node for the question itself at the median (379 ms p95, 467 ms max), the corpus files read from disk. The modelled phone latency is arithmetic over those bytes (four dependent waves of 150 ms, the brotli bytes at 1.6 Mbit/s, four times the Node CPU): **1.7 s at the median, 2.6 s p95, 3.2 s max**. It is a model, not a measurement on a phone. Warm in a running Node (the golden run, one KB for all questions): 4 ms median, 10 ms p95. The 7 site questions measured alongside fetch the same files with and without the corpus (21 files at the median).

## 9. Limits, what was not checked, what needs a person

- **Authors and senders outside the registry cannot be asked for by name.** The registry holds the 706 officers of the battle; 303 of the 573 reports by a person have no person link, and 2,475 of the 2,938 dispatches have no linked sender (Halleck, Butterfield, most staff officers and everyone who was not at Gettysburg). A question naming one of them gets no corpus answer: "what did Colonel Dobke report" and "what did Halleck write to Hooker" are declined as outside the site, and "what did Halleck telegraph to Meade" is answered from the site's own records about Meade, which does not answer it. (The report is there: `F:<stem>` and `A:<stem>` postings exist for every dispatch's signer and addressee, but only a question the engine already treats as a question of the volume reaches them, and a name it does not know is not one.) The fix would be a surname index of the authors (an `AU:<stem>` pseudo-entity per report) and a path in `reports.js` that tries it, and the postings that exist, when no registry person matches; it needs a lead that names an author who is not an entity. **Not built**; it is the first thing to build, and the cause of 2 of the 4 failing golden questions.
- The OCR is quoted as read: "Beport of", "i ms was replied to", "undei". A quote can carry OCR damage (3 passages carry a word the site's copy rules would flag, V06; they are verbatim text).
- Tables are not read, so numbers in returns (strength, casualties by regiment) are not in the corpus.
- **Rights sign-off** (section 1) and the **decision to ship** are the owner's. Shipping means building `--corpus or27` into the served `hx` (about 15.4 MB raw, 4.8 MB brotli across 1,189 files, 3.5 MB of it text), 1,043 bytes more at first paint, and the lazy modules.
- **Not verified**: scan links against the live reader (no browser was launched; printed pages are the citation); the leaf of Part 3 page 3 (by folio count, with the printed "(3)" as the only direct evidence); HathiTrust rights records (section 1); the per-question latency on a phone (modelled); links outside the 200 + 105 read (precision of the other 13,000 is inferred from the sample, with the interval above); that the corpus helps the time model (proposals are not applied).
- One reader labelled every sample, the builder; labels are judgements. A second reader would be better.

## 10. Where things are

| | |
|---|---|
| ingestion | `tools/historian/ingest/` (`corpus.mjs`, `or27.mjs`, `or27-dispatch.mjs`, `meta.mjs`, `link.mjs`, `times.mjs`, `anchors.mjs`, `time-evidence.mjs`, `pagemap.mjs`, `fetch.mjs`) |
| tiers | `tools/historian/lib/corpus-or.mjs`; runtime `historian-src/core/corpus.js`, `reports.js`, `select.js`, `kb.js` |
| tables | `historian-src/corpus/or27/`, `historian-src/corpus/time_evidence.json` |
| tests | `tests/historian/or27.test.mjs` (15 tests, `OR-1` to `OR-13`; the ones that need the corpus build it once into a temporary directory from `historian-src/raw/or27`, or are skipped loudly), `ingest.test.mjs`, `ingest-classes.test.mjs`; fixtures `golden-or27*.json`, `golden-or27.recorded.json`, `or27-links-checked.json`, `or27-time-evidence-checked.json`, `or27-part3-first-pages.txt` |
| measures | `tools/historian/golden-or27.mjs`, `measure-corpus.mjs` |
