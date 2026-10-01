# Verification method for Gettysburg_Sources_v2

How the 1,714 entries of `Gettysburg_Sources_v2.docx` were checked, what each verdict means, and what no verdict can mean. Numbers live in `QC-REPORT.md` (generated); this file is the method and does not go stale when the counts change.

## 1. The principle

The document was written by another AI session. **Every claim in it is unverified input**: titles, authors, dates, page ranges, links and descriptions. A verdict in the registry cites what was actually fetched or computed. Where something could not be seen, the registry says unverifiable. Nothing is approved on automated checks alone, and nothing is approved on one verifier's word.

"Verified" therefore means exactly one of three things, depending on the kind of entry:

| Entry kind | What "approved" means | Evidence required |
|---|---|---|
| Official Records report (Parts I-III, 543) | **Citation crosswalk**: the report number, author, side and first page agree with an independent index built from the printed headers of the Internet Archive scan | structural check (section 3) |
| Page pointer (Part XIII, 1,057) | **Pointer**: the printed page exists in the scan and its side label agrees with the dispatch headers on it. A pointer is not a writing and is never counted as one | structural check |
| Any other work (Parts IV-XII, 114) | **Approved for the quote corpus** only if two independent verifiers agree on identity, rights tier and extraction path; or **link-out only** if both say so | two reviewer passes (section 5) |

## 2. Stages and files

All files are under `data-src/sources-v2/` unless noted. Code is under `tools/sources-qc/`.

| Stage | Command | Output | What it does |
|---|---|---|---|
| 0 parse | `node tools/sources-qc/parse.mjs` | `entries.json` | Reads the .docx structure (styles, hyperlinks), checks the part counts and the document's own totals, and records every claim as the document states it. Nothing is verified here. |
| 1 structural | `node tools/sources-qc/structural-check.mjs` | `qc/structural.json` | OR entries and page pointers against the OCR header index (section 3). |
| 2 link probe | `node tools/sources-qc/probe-links.mjs` | `qc/link-probe.json` | A polite, cached, read-only probe of the other works' links nobody reviewed, plus two APIs (section 4). |
| 3 reviewers | (workflow agents) | `qc/review-pass1.json`, `qc/review-pass2.json` | Two independent reviewers read each entry, fetch the real source, and return one structured verdict. Stored verbatim. |
| 3b normalise | by hand, checked by the test | `qc/review-norm.json` | Machine-readable agreement fields derived from the reviewers' own words; every "basis" phrase must occur in the reviewer's text. |
| 4 merge | `node tools/sources-qc/build-registry.mjs` | `registry.json`, `ingest-queue.json`, `qc/registry-stats.json`, `qc/review-queue-next.json`, `docs/historian/sources-v2/QC-REPORT.md` | Applies the merge rules (section 6). No network. Deterministic: the test rebuilds it in memory and compares. |
| 5 test | `node --test "tests/sources-qc/*.test.mjs"` | pass or fail | Machine-checkable guarantees (section 8). |

`qc/auto.json` and `qc/review-queues.json` were named as inputs for the merge stage but do not exist in the repository: no stage wrote them. The builder records their absence in `registry.json` (`meta.inputs_absent`) and will read them if they appear.

## 3. The structural check (Parts I-III and XIII)

HathiTrust and eHistory refuse automated clients (HTTP 403), and 94.8% of the document's links go there. We did not try to get around that. Instead the entries are compared with an **independent derivation**:

- The list took report numbers, titles and page ranges from Civil War Cycling's index, and its links from HathiTrust and eHistory.
- The historian ingestion segmented the Internet Archive OCR of OR Ser. I vol. 27 (`warofrebellion271unit`, `272unit`, `273unit`) by reading the printed headers: `historian-src/corpus/or27/reports.json` (588 reports) and `dispatches.json` (2,945 dispatches with printed pages). The Archive's own folio maps (`*_page_numbers.json`) say which printed pages exist.

Two separate derivations that agree on (report number, author surname, side, first page) are strong evidence that the entry names a real report at that page. They do not prove that the HathiTrust or eHistory link opens that page.

Checks per OR report entry (`lib/structural.mjs`):

| Check | Passes when |
|---|---|
| number in OCR index | the (part, report number) exists in `reports.json`; if the header was lost (No. 161) the contents-list line and the signature on the claimed pages must confirm it |
| author | the entry's surname is within a small edit distance of the OCR author (0 for under 5 letters, 1 for 5-8, 2 for 9 or more); non-person documents compare titles (overlap of 0.6 or more) |
| side | Part I union, Part II other Federal (union), Part III Confederate, against the OCR |
| first page | equal, or off by one at a page boundary; a difference of two or more is a **flag** |
| end page | recorded; a difference of two or more is a note, not a failure |
| folio exists | the first page is in the Archive's folio map for that part |
| HathiTrust volume | the volume id equals the one the historian manifest verified for that part (also fetched from the catalog API) |
| HathiTrust seq offset | recorded as a note when it is not the part's modal offset (it is the modal offset for every entry, see QC-REPORT section 5) |
| eHistory shape | Part I only: serial 43 and the page equal the first page |

Page pointers (Part XIII): the page must exist in the volume's folio map and lie in 3..last folio, the eHistory link shape must match, and the side label must agree with the dispatch headers on that page (or, for a page where no dispatch begins, with the dispatch that is continuing onto it). The 60 pages the list labels "Union / Confederate (section transition)" are recorded as hedged labels with the side the OCR shows.

A **pass** is not a verification of the content. It is a cross-check of the index.

## 4. The link probe

For the 102 other-works entries that no reviewer examined (the 12 reviewed ones have their link status from the reviewers). Rules enforced by `lib/http.mjs`, not left to callers:

- honest User-Agent: `Gettysburg-sources-QC/1.0 (contact mlegere9789@gmail.com; read-only link verification, 1 req/s/host)`;
- at most one request per second per host (the probe uses a 1.2 s gap), more if robots.txt asks for it;
- `robots.txt` read once per host and obeyed: a `Disallow` means the URL is **not fetched** and is recorded as `robots_disallowed` (all of Perseus and one blog host); an unreadable robots.txt means the host is not fetched (`journals.psu.edu`);
- `ehistory.osu.edu`, `babel.hathitrust.org` and `hdl.handle.net` are never fetched (`blocked_to_bots`); only the documented HathiTrust catalog API (`catalog.hathitrust.org/api/volumes/brief/htid/<id>.json`) and the Internet Archive metadata API (`archive.org/metadata/<id>`) are used for identity;
- Google Books: the listed URLs carry `dq=` and `pg=` parameters that its robots.txt disallows, so only the bare `?id=` page is fetched and the page anchor is recorded as not checked;
- redirects are followed by hand so every hop is rate limited and logged; bodies are capped; every response and every failure is cached under `tmp/sources-v2/cache/` so a re-run costs nothing;
- no browser, no spoofed headers, no proxies, no accounts.

Link classes: `live`, `redirected`, `redirected_to_generic_page` (a dead link in disguise), `dead` (404/410), `blocked_to_bots` (403 or policy), `robots_disallowed`, `not_fetched_robots_unreadable`, `timeout`, `network_error`. For `dead` and generic redirects the probe asks the Wayback Machine availability API for the capture nearest 2024 and compares the capture's page title with the entry's title; a match makes the capture a **candidate** replacement, never an approved one.

`live` means a page answered. It does not mean the page is the document the entry describes.

## 5. The reviewer passes

Two reviewers, independent of each other, read each entry and return the same JSON shape (see `qc/review-pass1.json`): link status, bibliographic match, kind, side, date written, relevance to the battle, description accuracy, rights tier with its basis, `usable_for`, an evidence paragraph naming what was fetched and read, extraction notes, issues, a replacement URL if the link is dead, and a verdict: `APPROVE`, `APPROVE-LINKOUT-ONLY`, `NEEDS-HUMAN-REVIEW` or `REJECT`.

The first batch to reach this stage was entries 586-597 (12 entries). The second reviewer also showed that 599 is a second page of 595, so 599 is merged into it. The two passes are stored verbatim with the sha256 of each file recorded in the registry's `meta.inputs`. The builder re-fetched, itself, the metadata of the nine Internet Archive items the reviewers named as text sources (title, date, publisher, image count, whether OCR text and page numbers exist); each agreed with what the reviewers wrote. It also fetched the HathiTrust catalog records of the three OR volumes, which agree with the historian manifest.

## 6. The merge rules

Non-OR entries (`lib/registry.mjs: decideNonOr`):

| Rule | Condition | Result |
|---|---|---|
| R1 | both reject | REJECTED |
| R2 | one rejects, the other does not | NEEDS-HUMAN-REVIEW, both rationales kept |
| R3 | either asks for human review | NEEDS-HUMAN-REVIEW (the stricter verdict holds) |
| R4 | one allows verbatim use, the other link-out only | NEEDS-HUMAN-REVIEW |
| R5/R6 | both link-out only | APPROVED-LINKOUT-ONLY if identity and tier agree, else NEEDS-HUMAN-REVIEW |
| R7/R8 | both APPROVE | APPROVED only if **identity, rights tier (A1 or A2) and extraction path all agree**, else NEEDS-HUMAN-REVIEW naming the criteria that differ |

The three agreement criteria, as computed:

- **Identity agrees** when both reviewers identified the work (`bibliographic_match` is `confirmed` or `partial`) and name the same edition (`source_key` in `review-norm.json`: work plus imprint, not host).
- **Rights tier agrees** when both give the same tier class and it is A1 or A2. A reviewer who approves verbatim use of a tier C item is a contradiction and goes to a human.
- **Extraction path agrees** when both say `verbatim-quote-corpus` and the sets of adapters each reviewer verified by reading intersect (adapters: `html`, `gutenberg`, `archive-fulltext`, `pdf-text`, `manual-transcription`, `or27-ocr`; `perseus` is vocabulary only and never usable, see section 7). Different scans of the same edition count as one path if both were read.

What an APPROVED entry then needs before ingestion (`ingest.state`): tier A1 and extractable text is `ready`; tier A2 is `hold:rights-review`; image-only is `blocked:manual-transcription`.

OR entries: R9-R13 (section 1). Duplicates: R14, only on a hard identity (the same HathiTrust volume id confirmed by the catalog API, or the same document id). Unreviewed: R16 NOT-VERIFIED.

## 7. Rights tiers

Decided by evidence, never by "it is free to read":

- **A1 quotable public domain**: US Government work, or an original imprint before 1931 with the imprint year read from the title page or the archive's own metadata. Reprints and later editions are excluded (the Internet Archive also holds 1960 and 1989 reprints of Early and 2015-2018 reprints of Wingate: they must not be on the allow-list).
- **A2 public domain, needs review**: the underlying text is old, but the host or repository adds something (an unstated transcription right, an "all rights reserved" notice, a repository rule on unpublished manuscripts, a volunteer transcription that is not verbatim).
- **B facts only**; **C link-out only** (the host's copyright, a modern edition, terms against reuse).

A hint in the registry (`rights_hint`) is for reviewers only and is never a tier.

`robots.txt` of `www.perseus.tufts.edu` says `Disallow: /` and the SHSP articles in Part IV link there: the **perseus adapter is not usable** by any program. The Historian takes SHSP from the Internet Archive scans in its own plan (hist-sources-1 SRC-08).

## 8. What the test guarantees

`tests/sources-qc/registry.test.mjs` fails when: an entry lacks a status, rule, reason or evidence; anything is APPROVED without two agreeing verifiers (non-OR) or a passing structural check (OR and pointers); an A1 or A2 lacks a rights basis; anything unverified is marked usable for the quote corpus; the ingest queue holds anything that is not APPROVED, A1 and ready, or uses the perseus adapter; a replacement for a dead link is called verified without a verifier; the link probe sent a request to eHistory, HathiTrust, a handle server or Perseus; or `registry.json` differs from a fresh in-memory rebuild (hand edits, or stale after an input changed). The truth table of the merge rules is tested with synthetic reviewer outputs. The tests were also run red against a hand-corrupted registry.

## 9. Limits

- 94.8% of the links (eHistory, HathiTrust) are unconfirmed: only their shape is checked. A human should open a sample from both ends of each volume.
- Page-level anchors (`pg=`, `#page/`, `seq=`) cannot be checked for blocked hosts and were not checked for Google Books.
- A reviewer's evidence is stored, not re-run; the builder re-fetched only cheap metadata.
- The structural check trusts the historian OCR index as an independent derivation. Both come from the same scans, so an error in the scan itself would be shared; the Archive folio maps and the HathiTrust catalog records are the second and third witnesses where used.
- The classification of the 114 other works into writing, volume, index, scholarship and into battle, campaign and post-battle (`lib/classes.mjs`) comes from the entries' own titles and descriptions, not from reading the documents. It is labelled as such (`basis: list-title-and-description`).
- The catalogue overlap (`catalog_overlap`) is a title match against the historian's catalogues, a judgement, not a finding.

## 10. Adding more reviewed entries

1. Take the next batch from `qc/review-queue-next.json` (12 entries; the order is value first).
2. Run two independent reviewers and append their outputs, unchanged, to `qc/review-pass1.json` and `qc/review-pass2.json` (arrays keyed by `n`).
3. Add an entry to `qc/review-norm.json` with the per-pass `adapters_read`, `text_state`, `source_key`, the `basis` phrases (verbatim from the reviewer text), the corrected title, date, genre, perspective tags and ingest notes.
4. If a new IA item is named as a text source, add its id to `ia_ids_to_verify` and re-run `probe-links.mjs` (cached, polite).
5. `node tools/sources-qc/build-registry.mjs`, then `node --test "tests/sources-qc/*.test.mjs"`.

The batch size of 12 is the one the first reviewers used; nothing in the code depends on it.
