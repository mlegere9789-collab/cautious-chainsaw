# Verification method for Gettysburg_Sources_v2

How the 1,714 entries of `Gettysburg_Sources_v2.docx` were checked, what each verdict means, and what no verdict can mean. Numbers live in `QC-REPORT.md` (generated); this file is the method and does not go stale when the counts change.

## 1. The principle

The document was written by another AI session. **Every claim in it is unverified input**: titles, authors, dates, page ranges, links and descriptions. A verdict in the registry cites what was actually fetched or computed. Where something could not be seen, the registry says unverifiable. Nothing is approved on automated checks alone, nothing is approved on one reviewer's word, and **an entry of the other works is approved only if every reviewer who examined it agrees**.

"Verified" therefore means one of three things, depending on the kind of entry:

| Entry kind | What "approved" means | Evidence required |
|---|---|---|
| Official Records report (Parts I-III, 543) | **Citation crosswalk**: the report number, author, side and first page agree with an independent index built from the printed headers of the Internet Archive scan, and no audit reviewer who looked at the page found the first page wrong. The listed *description* is **not** approved: it is marked untrusted (section 7) | structural check (section 3) and, for the audited entries, the audit reviewers (section 7) |
| Page pointer (Part XIII, 1,057) | **Pointer**: the printed page exists in the scan and its side label agrees with the dispatch headers on it. A pointer is not a writing and is never counted as one | structural check, and the audit sample |
| Any other work (Parts IV-XII, 114) | **Approved for the quote corpus** only if all of its two to four reviewers agree on identity, rights tier and extraction path; or **link-out only** if all say so | the reviewer files (section 5) |

## 2. Stages and files

All files are under `data-src/sources-v2/` unless noted. Code is under `tools/sources-qc/`.

| Stage | Command | Output | What it does |
|---|---|---|---|
| 0 parse | `node tools/sources-qc/parse.mjs` | `entries.json` | Reads the .docx structure (styles, hyperlinks), checks the part counts and the document's own totals, records every claim as the document states it. Nothing is verified here. |
| 1 structural | `node tools/sources-qc/structural-check.mjs` | `qc/structural.json` | OR entries and page pointers against the OCR header index (section 3). Offline, read-only on `historian-src/`. Re-run after the historian corpus changes; `structural-refresh-diff.mjs --old <previous file>` writes `qc/structural-refresh.json`, which records exactly what moved. |
| 2 link probe | `node tools/sources-qc/probe-links.mjs` | `qc/link-probe.json` | The first run's polite, cached, read-only probe of the other works' links, plus the HathiTrust catalogue records of the three OR volumes (section 4). Not needed again: every other work now has reviewers. |
| 3 reviewers | (workflow agents) | `qc/review-pass1.json`, `review-pass2.json` (entries 586-597), `review-pass1-r2.json`, `review-pass2-r2.json`, `r3/pass1-a.json`, `pass1-b.json`, `pass2-a.json`, `pass2-b.json` | Independent reviewers read each entry, fetch the real source and return one structured verdict. Stored verbatim. `lib/reviews.mjs` lists the files; a review of the same entry from the same batch twice is refused. |
| 3b attested facts | by hand, checked by the test | `qc/reviewer-attested.json` | The few things reviewers wrote only in prose and the registry needs as data (an entry that prints Official Records text, two entries that are one work, a first page the list gets wrong), each with a **verbatim phrase** that must occur in the reviewer's own output. The builder refuses to run, and the test fails, if a phrase cannot be found. |
| 3c Archive check | `node tools/sources-qc/verify-ia.mjs` | `qc/ia-verify.json` | For every archive.org item a reviewer named as a text source, reads the item's own metadata (title, date, publisher, copyright-status field, OCR present). Polite and cached; only archive.org's documented metadata API is requested. |
| 4 merge | `node tools/sources-qc/build-registry.mjs` | `registry.json`, `ingest-queue.json`, `qc/registry-stats.json`, `qc/review-queue-next.json`, `docs/historian/sources-v2/QC-REPORT.md` | Applies the merge rules (section 6). No network. Deterministic: the test rebuilds it in memory and compares. |
| 5 test | `node --test "tests/sources-qc/*.test.mjs"` | pass or fail | Machine-checkable guarantees (section 9). |

`qc/review-norm.json` is the **first run's** hand-written normalisation of entries 586-597 (corrected titles, ingest recipes, flags). It is used only as an overlay for those twelve entries and as the calibration target for the derivation (section 5); everything for the other 98 entries is derived from the reviewers' own fields by rule.

## 3. The structural check (Parts I-III and XIII)

HathiTrust and eHistory refuse automated clients (HTTP 403, a Cloudflare challenge even for `robots.txt`), and 94.8% of the document's links go there. Nobody tried to get around that. Instead the entries are compared with an **independent derivation**:

- The list took report numbers, titles and page ranges from Civil War Cycling's index, and its links from HathiTrust and eHistory.
- The historian ingestion segmented the Internet Archive OCR of OR Ser. I vol. 27 (`warofrebellion271unit`, `272unit`, `273unit`) by reading the printed headers: `historian-src/corpus/or27/reports.json` and `dispatches.json`. The Archive's own folio maps (`*_page_numbers.json`) say which printed pages exist.

Two separate derivations that agree on (report number, author surname, side, first page) are strong evidence that the entry names a real report at that page. They do not prove that the HathiTrust or eHistory link opens that page.

Checks per OR report entry (`lib/structural.mjs`): the (part, report number) exists in the OCR index (or, if its header was lost, the contents-list line and the signature on the claimed pages confirm it); the author surname is within a small edit distance; the side agrees; the first page is equal or off by one at a page boundary (two or more is a **flag**); the end page, the folio, the HathiTrust volume and the eHistory shape are recorded. Page pointers (Part XIII): the page must exist in the volume's folio map, the eHistory link shape must match, and the side label must agree with the dispatch headers on the page (the 60 pages labelled "Union / Confederate (section transition)" are recorded as hedged labels with the side the OCR shows).

A **pass** is not a verification of the content. It is a cross-check of the index. Its tolerance of one page is why the audit (section 7) matters: it found an entry (298) whose first page is off by one and that had passed.

## 4. The link probe and the Archive check

Rules enforced by `lib/http.mjs`, not left to callers:

- honest User-Agent: `Gettysburg-sources-QC/1.0 (contact mlegere9789@gmail.com; read-only link verification, 1 req/s/host)`;
- at most one request per second per host (1.2 s gap), more if `robots.txt` asks for it;
- `robots.txt` read once per host and obeyed: a `Disallow` means the URL is **not fetched** and is recorded as `robots_disallowed` (all of Perseus and one blog host); an unreadable `robots.txt` means the host is not fetched;
- `ehistory.osu.edu`, `babel.hathitrust.org` and `hdl.handle.net` are never fetched; only the documented HathiTrust catalogue API and the Internet Archive metadata API are used for identity;
- redirects are followed by hand; every response and failure is cached under `tmp/sources-v2/cache/`; no browser, no spoofed headers, no proxies, no accounts.

The Archive check (`verify-ia.mjs`) confirms that every identifier a reviewer named exists (HTTP 200) and records what the Archive says about it. A date field is sometimes the **series start year** (the reviewers noticed and read the title page); the University of Florida scans of the SHSP carry no date field but state "Copyright status reviewed by UF staff - Out of copyright". The merge guard R17 sends an approved entry to a human if its primary Archive item did not answer 200 or is dated after 1930.

## 5. The reviewer passes, and what is derived from them

Every reviewer returns the same JSON shape: link status, bibliographic match, kind, side, date written, relevance to the battle, description accuracy, rights tier with its basis, `usable_for`, an evidence paragraph naming what was fetched and read, extraction notes, issues, a replacement URL if the link is dead, and a verdict: `APPROVE`, `APPROVE-LINKOUT-ONLY`, `NEEDS-HUMAN-REVIEW` or `REJECT`.

Review files, by reviewer batch (a batch id is the reviewer's identity; the registry id of a review is `<round>/<pass>/<batch>#<entry>`):

- entries 586-597: one first-pass and one second-pass reviewer (the first run);
- first-pass batches R1n-0 to R1n-8 and second-pass batches A-nonOR-0 to A-nonOR-104 for the other entries; R1n-4 and R1n-5 cover the same entries, as do R1n-7 and R1n-8, so those 24 entries have **two first-pass and two second-pass reviews (four reviewers)**;
- the 14 entries missed earlier (555, 556, 575, 584, 585, 610, 619, 620, 621, 624, 625, 636, 643, 651) in `r3/`: one first-pass and one second-pass reviewer each;
- audit batches R2-audit-A, R3-audit-A, A-OR-0, A-OR-10, A-OR-20 and A-OR-30 for the Official Records entries and page pointers (section 7).

The merge rules need three agreement fields and one guard that a human could not type for 100 entries and a test could not trust if typed. They are **derived by rule from each reviewer's own text** (`lib/derive.mjs`), and every derived value carries the verbatim token it was read from, which the test finds again in the reviewer's output:

- **text sources**: the Internet Archive items, Gutenberg numbers, newspaper pages and page URLs a reviewer names in `replacement_url` and `extraction_notes` (a Wayback capture stands for the page it captured; a bare identifier counts when the words around it say it is an archive item; a `robots.txt` is never a source). A reviewer who read the listed page live stands for the listed link;
- **adapters**: the extraction path the notes name: `archive-fulltext`, `gutenberg`, `pdf-text`, `html`, `loc-ocr`, `manual-transcription`. A path mentioned only to be refused ("not Perseus", "never Gutenberg") is skipped, and no adapter is ever derived for a forbidden host. If the notes name none, the kind of the named source says (marked `adapters_from`);
- **text state** (machine, OCR, image-only) from the adapters;
- **imprint years** from `rights_basis`, used only to tell that two different scans are one edition;
- **date written**: the first date the reviewer states, except for a retrospective work (a memoir or recollection), whose date is the earliest date after 1865, the composition or publication date and not the date of the battle it describes; and the genre.

**Calibration**: for the twelve entries of the first run (586-597), the derivation reproduces the hand-normalised decision exactly (status, rule, tier, adapter and ingest state): a test.

## 6. The merge rules

Other works (`lib/registry.mjs: decideNonOrN`), over **all** reviews of the entry:

| Rule | Condition | Result |
|---|---|---|
| R16 | fewer than two reviewers | NOT-VERIFIED |
| R1 | every reviewer rejects (at least two), each with evidence | REJECTED |
| R2 | any reject while not every reviewer rejects (including two rejects against an approve), or a reject with no evidence | NEEDS-HUMAN-REVIEW, every rationale kept |
| R3 | any reviewer asks for human review | NEEDS-HUMAN-REVIEW |
| R4 | some reviewers allow verbatim use and others link-out only | NEEDS-HUMAN-REVIEW |
| R5/R6 | all say link-out only | APPROVED-LINKOUT-ONLY if all agree on identity, else NEEDS-HUMAN-REVIEW. **The recorded tier is the more restrictive one** when the reviewers differ (a link-out entry is never quoted, so a disagreement between B and C changes nothing a person may do) |
| R7/R8 | all say APPROVE | APPROVED only if **identity, rights tier (the same class, A1 or A2) and extraction path all agree**, else NEEDS-HUMAN-REVIEW naming the criteria that differ |
| R17 | an approved entry's primary Archive item did not answer 200, or is dated after 1930 | NEEDS-HUMAN-REVIEW |

The three agreement criteria, as computed over every reviewer:

- **Identity** agrees when every reviewer identified the work (`bibliographic_match` is `confirmed` or `partial`) and every pair names the same text source, or, where the scans differ, states the same imprint year (a different scan of one edition; the registry says which basis applied). A reviewer who names no source stands for the listed link.
- **Rights tier** agrees when all give the same class and it is A1 or A2. Where reviewers differ the registry records the **more restrictive** tier (A1 < A2 < B < C < unknown), and an entry whose reviewers differ on the tier is never approved for quoting. A reviewer who approves verbatim use of a tier C item is a contradiction and goes to a human.
- **Extraction path** agrees when every reviewer says `verbatim-quote-corpus` and the adapters they name have one in common (the preferred one first: Internet Archive scans, then Gutenberg, a PDF text layer, an HTML page, a newspaper OCR, last a hand transcription).

What an APPROVED entry then needs before ingestion (`ingest.state`): tier A1 and extractable text is `ready`; tier A2 is `hold:rights-review`; image-only (the agreed adapter is a hand transcription, or any reviewer calls the text image-only) is `blocked:manual-transcription`.

**Duplicates** are merged (DUPLICATE) only on a hard identity: the same HathiTrust volume id confirmed by the catalogue API (entries 572, 573, 657) or the same document id (entry 599 into 595). Soft duplicates the reviewers attest (one 1908 printing by two routes, one volume in two scans, one newspaper issue as a PDF and a transcription) stay as entries and are **ingested once** through the queue: the lowest entry number leads and the others ride along.

**Official Records entries** (R9-R13): APPROVED-CROSSWALK iff the structural check passes and no audit reviewer found the first page wrong or asked for review; APPROVED-POINTER for Part XIII pages iff the page exists and its side label agrees. An audit reviewer who viewed the page image and says the listed first page is wrong overrides a structural pass (R11b): the entry goes to a human with the corrected page recorded.

## 7. The audits of the Official Records entries and the page pointers

Two audit batches (R2-audit-A for Parts I-III, R3-audit-A for Part XIII) and four second-pass batches (A-OR-0, -10, -20, -30) read samples against the scan.

- **Description trust.** The OR description is one template sentence. The sample is systematic (every ninth entry, 61 of them; the auditor added entry 134). Each entry's rating is the worst rating any auditor gave. The template is **systemically inaccurate when the 95% Wilson lower bound of the not-accurate share exceeds 10%**; then every unaudited OR description is marked `untrusted`, audited ones carry their own rating (`audited-accurate-by-two-reviewers`, `audited-accurate-by-one-reviewer`, `audited-partly-inaccurate`, `audited-inaccurate`), identity and page range are kept, and the share is quantified in `meta.or_description_audit` and the report. One auditor under-counts: where a second auditor re-rated an entry, the second was sometimes stricter, so the worst rating is used. The pointers' systematic sample (every 35th page) is not systemically wrong, and is reported.
- **Part XIII completeness.** The items numbered beyond 1714 in the audit are printed pages 1060 to 1092 of the volume, which exist but are not entries in the list. They are recorded in `meta.list_incompleteness` as **notes about the list's incompleteness and never as entries**; a test fails if an entry numbered beyond 1714 exists.
- **Prose facts as data**: the corrected first pages (entries 10 and 298), two doubts from an OCR heading scan that were not confirmed on the image (251, 509), and three OCR defects are in `qc/reviewer-attested.json` with verbatim anchors.

## 8. Rights tiers

Decided by evidence, never by "it is free to read":

- **A1 quotable public domain**: US Government work, or an original imprint before 1931 with the imprint year read from the title page or the archive's own metadata. Reprints and later editions are excluded (the Archive also holds 1960 and 1989 reprints of Early and 2015-2018 reprints of Wingate: they must not be on the allow-list).
- **A2 public domain, needs review**: the underlying text is old, but the host or repository adds something (an unstated transcription right, an "all rights reserved" notice, a repository rule on unpublished manuscripts, a volunteer transcription that is not verbatim).
- **B facts only**; **C link-out only** (the host's copyright, a modern edition, terms against reuse); **unknown** (the reviewer could not tell and says counsel is needed).

`robots.txt` of `www.perseus.tufts.edu` says `Disallow: /` and the SHSP articles in Part IV link there: **there is no perseus adapter** and no queue item has a Perseus source. The SHSP is taken from the University of Florida scans on the Internet Archive.

## 9. What the test guarantees

`tests/sources-qc/registry.test.mjs` runs `lib/invariants.mjs: checkRegistry` on the real registry and requires no violation, and runs it on **corrupted copies** and requires each corruption to be caught by the invariant that names it. It fails when:

- an entry lacks a status, rule, reason or evidence, or an entry numbered beyond 1714 exists;
- anything of the other works is APPROVED without **every** reviewer agreeing on verdict, identity, rights tier and extraction path, or fewer than two independent reviewers (one from each pass) examined it;
- a recorded rights tier is **not the more restrictive one** the reviewers gave, or an A1 or A2 has no rights basis;
- anything unverified or link-out is usable for the quote corpus;
- an OR entry or pointer is approved without a passing structural check, or after an audit found its first page wrong;
- the OR descriptions are not marked untrusted although the audit sample says the template is systemically inaccurate, or the quoted statistic differs from a recomputation from the raw audit reviews;
- the ingest queue holds anything that is not APPROVED, A1 and ready, drops an approved entry, uses a forbidden adapter (perseus) or a forbidden source host (Perseus, eHistory, HathiTrust);
- a dead-link replacement names a reviewer whose own evidence does not name it, or an approved entry with a dead listed link has no verified replacement;
- a duplicate is not on a hard identity;
- the registry's copy of any reviewer's field differs from the reviewer's own file, a derived token is not in the reviewer's text, or a reviewer-attested phrase cannot be found;
- the derivation fails to reproduce the 12 hand-normalised decisions of the first run;
- an Internet Archive item behind an approved work did not answer 200 or is dated after 1930;
- the link probe sent a request to eHistory, HathiTrust, a handle server or Perseus;
- `registry.json`, `ingest-queue.json`, `registry-stats.json` or `review-queue-next.json` differs from a fresh in-memory rebuild (hand edits, or stale after an input changed).

`SOURCES_QC_REGISTRY=<path> SOURCES_QC_QUEUE=<path> node --test tests/sources-qc/registry.test.mjs` runs the same suite against another copy: a copy with one reviewer's tier edited, an entry 1715, a promoted entry, a perseus adapter and a trusted description fails 14 of the 39 tests (the commit message records the run).

## 10. Limits

- 94.8% of the links (eHistory, HathiTrust) are unconfirmed: only their shape is checked. A human should open a sample from both ends of each volume.
- Page-level anchors (`pg=`, `#page/`, `seq=`) cannot be checked for blocked hosts and were not checked for Google Books.
- A reviewer's evidence is stored, not re-run; this builder re-fetched only Archive metadata and re-ran the structural check. It viewed no page image.
- Identity and extraction path are parsed from prose. Where reviewers named different scans of one work, "same edition" rests on a stated imprint year (the report lists those entries); where they named no path, the kind of source stood in. The calibration against the first run's hand normalisation is a test, not a proof.
- The audits are samples. The pointers' description template held in the systematic sample; the OR template did not. An audit finding about one entry does not clear its neighbours.
- The classification of the 114 other works into writing, volume, index, scholarship and into battle, campaign and post-battle (`lib/classes.mjs`) comes from the entries' own titles and descriptions and is labelled as the builder's judgement; the coverage tables use the reviewers' own labels.
- The catalogue overlap (`catalog_overlap`) is a title match against the historian's catalogues, a judgement, not a finding. The overlap with Official Records text (`or_text_overlap`) is what a reviewer stated, with the phrase.

## 11. Adding more reviewed entries

1. Save a reviewer batch unchanged under `qc/` and add the file to `REVIEW_FILES` in `lib/reviews.mjs` (one of the three shapes it knows).
2. If a prose fact must become data, add it to `qc/reviewer-attested.json` with a verbatim phrase.
3. `node tools/sources-qc/verify-ia.mjs` (cached), then `node tools/sources-qc/build-registry.mjs`, then `node --test "tests/sources-qc/*.test.mjs"`.
