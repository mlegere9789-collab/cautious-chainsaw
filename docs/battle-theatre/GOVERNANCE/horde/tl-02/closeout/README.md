# tl-02 close-out: build sources (snapshot of tmp/tl-02, which is gitignored)

Snapshot taken 2026-11-14 after the audit and the review pass. Everything written to GOVERNANCE/timeline_corrections/tl-02.jsonl and to
GOVERNANCE/horde/tl-02/ (results.jsonl, proposed-register/, counts.json, search_log.jsonl, REPORT.md, library_pages.json) comes from these files.

## Rebuild
The scripts compute the repository root as two folders above their own, so they run from `tmp/tl-02/`:
1. `mkdir -p tmp/tl-02 && cp -r docs/battle-theatre/GOVERNANCE/horde/tl-02/closeout/* tmp/tl-02/`
2. Inputs that are not committed (tmp/ is ignored): the acquired texts `tmp/tl-02/acq/<id>/*_djvu.txt` (identifiers and sha256 in `../sources_tl02.json`,
   public domain, archive.org text layer); the archive.org page index files of the library items used for page decisions in
   `tmp/tl-02/scan/ia/<identifier>/` (`metadata.json`, `<id>_hocr_pageindex.json.gz`, `<id>_hocr_searchtext.txt.gz`, fetched from
   https://archive.org/cors/<id>/<file>, at most 1 request per second); the Official Records text (tmp/library/or27) and its leaf map
   (docs/battle-theatre/kit/evidence/or27_leaf_pages.json, tools/bt/kit_or27_leafmap.py), which belong to other workstreams; PyEphem 4.2.1 in
   `tmp/tl-02/pylib` for astro_check.py (`pip install --target tmp/tl-02/pylib ephem==4.2.1`).
3. Check the row files (every quote is re-matched verbatim in the local text, page and report id verified): `python3 -I tmp/tl-02/build2.py --check`
4. Write the outputs, re-using the logged searches (a new or changed search runs, a few seconds each; a full run needs the machine lock):
   `python3 -I tmp/tl-02/build3.py --write`, then `python3 -I tmp/tl-02/post.py` (REPORT.md, older register entries), then the checks
   `python3 -I tmp/tl-02/verify_out.py` and `python3 -I tmp/tl-02/audit/audit_strict.py` (both must report 0 errors).
5. A new library citation needs a page decision in `../library_pages.json`: `TL2_NOPAGES=1 python3 -I tmp/tl-02/audit/mk_tmp_corr.py`, then
   `TL2_CORR=tmp/tl-02/audit/tmp_corr.jsonl python3 -I tmp/tl-02/audit/libpages_final.py` (existing decisions must come out unchanged).

## Files
- rows_a.py, rows_b.py, rows_c.py: the data of the 58 rows (claim, sub-claims with tier, citations, scenarios, remains, searches, register entry).
- tl2lib.py: constructors, verbatim quote resolver (Official Records by report id and scan-leaf page, library texts by offset and page decision), search runner.
- build2.py (checks, full write), build3.py (incremental write), post.py (REPORT.md, older register entries), verify_out.py, dd2.py (delegated-decision block), astro_check.py.
- audit/: audit_strict.py (independent re-read of every offset, exact span, page and report id by the scan leaf map), libpages_final.py (library page decisions),
  viewed_leaves.json (the leaves whose printed page was read on the page image: key "part:leaf", PDF page = leaf + 1), numcheck.py and overlap.py
  (heuristics that list claims whose numbers or words are not in their quotes; read by hand), compact.py and show.py (readers), shifts.py, libheads.py, pagediff.py (page-index checks).
- NOTES.md: working notes of the four runs (history, what was tried, what was found).
