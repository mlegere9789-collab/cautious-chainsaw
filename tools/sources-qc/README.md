# tools/sources-qc

QC of `docs/historian/sources-v2/Gettysburg_Sources_v2.docx`. Method: `docs/historian/sources-v2/VERIFICATION-METHOD.md`. Results: `docs/historian/sources-v2/QC-REPORT.md` (generated), `data-src/sources-v2/registry.json`, `data-src/sources-v2/ingest-queue.json`.

```
node tools/sources-qc/parse.mjs               # docx -> data-src/sources-v2/entries.json (nothing verified)
node tools/sources-qc/structural-check.mjs    # OR entries + Part XIII pointers vs the OCR index -> qc/structural.json (offline, read-only on historian-src/)
node tools/sources-qc/structural-refresh-diff.mjs --old <previous structural.json>   # what a re-run moved -> qc/structural-refresh.json
node tools/sources-qc/probe-links.mjs         # the first run's polite read-only link probe -> qc/link-probe.json (cached, 1 req/s/host, robots obeyed)
node tools/sources-qc/verify-ia.mjs           # archive.org metadata of every item a reviewer named -> qc/ia-verify.json (cached, 1 req/s, robots obeyed)
node tools/sources-qc/build-registry.mjs      # merge rules -> registry.json, ingest-queue.json, qc/registry-stats.json, qc/review-queue-next.json, QC-REPORT.md (no network)
node --test "tests/sources-qc/*.test.mjs"     # machine-checkable guarantees, and mutation tests that corrupt a copy of the registry
```

`lib/`:

- `reviews.mjs` loads every reviewer file under `qc/` into one flat list (one review per reviewer batch and entry; the file list is `REVIEW_FILES`);
- `derive.mjs` derives, by rule and with a verbatim token for each value, the text source, adapter, imprint year and date a reviewer's prose states;
- `registry.mjs` is the merge rules (pure functions): unanimity over two to four reviewers, the more restrictive rights tier, the Official Records crosswalk, the audit locator override and the description-trust test;
- `nonor.mjs` turns the decision and the reviews into the registry record of one other work (perspective, replacement links, ingest recipe);
- `audit.mjs` reads the audit batches (description accuracy, locators, the pages beyond the list);
- `attested.mjs` loads `qc/reviewer-attested.json` and checks every anchor phrase against the reviewer text;
- `invariants.mjs` is the whole set of guarantees as one function, used by the test on the real registry and on corrupted copies;
- `classes.mjs` (what kind of thing each other work is, from the list's own titles; a builder judgement), `report.mjs` (renders the report from the registry), `http.mjs` (polite client: cache, robots, rate limit), `urlnorm.mjs`, `entry-parse.mjs`, `docx.mjs`, `structural.mjs` (the OR checks), `or-ocr.mjs`.

Never writes under `historian-src/`, `tools/historian/`, `tools/t0/` or any path another workstream owns. Never fetches ehistory.osu.edu, babel.hathitrust.org, hdl.handle.net, perseus.tufts.edu or any host whose robots.txt disallows it.
