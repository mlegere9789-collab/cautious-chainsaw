# tools/sources-qc

QC of `docs/historian/sources-v2/Gettysburg_Sources_v2.docx`. Method: `docs/historian/sources-v2/VERIFICATION-METHOD.md`. Results: `docs/historian/sources-v2/QC-REPORT.md` (generated), `data-src/sources-v2/registry.json`, `data-src/sources-v2/ingest-queue.json`.

```
node tools/sources-qc/parse.mjs               # docx -> data-src/sources-v2/entries.json (nothing verified)
node tools/sources-qc/structural-check.mjs    # OR entries + Part XIII pointers vs the OCR index -> qc/structural.json (read-only on historian-src/)
node tools/sources-qc/probe-links.mjs         # polite read-only probe of unreviewed links -> qc/link-probe.json (cached, 1 req/s/host, robots obeyed)
node tools/sources-qc/build-registry.mjs      # merge rules -> registry.json, ingest-queue.json, qc/review-queue-next.json, QC-REPORT.md (no network)
node --test "tests/sources-qc/*.test.mjs"     # machine-checkable guarantees
```

`lib/`: `http.mjs` polite client (cache, robots, rate limit), `urlnorm.mjs`, `entry-parse.mjs`, `docx.mjs`, `structural.mjs` (the OR checks), `registry.mjs` (the merge rules), `classes.mjs` (what kind of thing each non-OR entry is), `report.mjs` (renders the report from the registry).

Never writes under `historian-src/`, `tools/historian/`, `tools/t0/` or any path another workstream owns. Never fetches ehistory.osu.edu, babel.hathitrust.org or any host whose robots.txt disallows it.
