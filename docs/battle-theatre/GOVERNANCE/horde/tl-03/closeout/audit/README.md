# tl-03 close-out: build sources and audit scripts (snapshot of tmp/tl-03, which is gitignored)

Everything written to GOVERNANCE/timeline_corrections/tl-03.jsonl and to GOVERNANCE/horde/tl-03/ (results.jsonl, proposed-register/, counts.json, search_log.jsonl, library_pages.json, astro_check.json, REPORT.md) comes from the files of this folder and of ../.

## Rebuild
The builder runs in place (it finds the repository root from its own location): `python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/build.py [--check-only]`.
- row data: ../rows_a.py, ../rows_b.py, ../rows_c.py (57 rows); ../rowlib.py (constructors), ../shard_rows.py (results.jsonl), ../register_md.py (proposed entries), ../post.py (REPORT.md).
- inputs that are not committed (tmp/ is ignored): the Official Records text tmp/library/or27 and its scan leaf map docs/battle-theatre/kit/evidence/or27_leaf_pages.json (other workstreams); the library texts listed in GOVERNANCE/library/acquired_2.json and acquired_3.json; tmp/library/misc/pennsylvaniaatge04penn_djvu.txt; ../acquired_tl03.json (HARD-1868: archive.org text layer, sha256 inside; copy it from tmp/tl-02/acq or fetch `https://archive.org/cors/historyofeighthc00hard/historyofeighthc00hard_djvu.txt`); PyEphem 4.2.1 for ../astro_check.py (`pip install --target tmp/tl-02/pylib ephem==4.2.1`).
- library pages: `TL3_NOPAGES=1 python3 -I ../build.py --libcites tmp/tl-03/audit/libcites.json` then `python3 -I tmp/tl-03/audit/libpages3.py` (writes ../../library_pages.json; the archive.org page index files are fetched with ia_fetch.py into tmp/tl-03/scan/ia, one request per second).
- order after a change of a row file: `build.py --check-only` (every quote re-matched verbatim; a page that is not the scan-leaf page stops the run), `build.py` (writes the outputs), `python3 -I audit/audit_strict.py` (independent re-read of every offset, report id, scan-leaf page, sha256: 0 errors), `python3 -I post.py` (REPORT.md).
- to use the scripts of this folder copy them: `mkdir -p tmp/tl-03/audit tmp/tl-03/tools && cp audit/*.py tmp/tl-03/audit/ && cp tools/*.py tmp/tl-03/tools/`.

## Files
- audit_strict.py: independent audit of the written corrections file (runs in place).  viewed_leaves.json: printed page read on the page image for each cited leaf (key "part:leaf"; PDF page = leaf + 1 of tmp/kit-plan/or27-pdf/<identifier>.pdf); montage.py cuts the header strips (6 per image) and mark_viewed.py stores a reading after comparing it with the leaf map.
- snip.py: crops the lines around a phrase of a scan page (tesseract locates it) to read damaged digits; ocr2.py: second-OCR comparison of the numerals of every Official Records quote (CPU heavy, run under the machine lock; had not run when the report was written).
- edit.py (row-block patch helper), review.py (flagged sub-claims with their source text), ctx.py, head.py, leafof.py, compact.py, show.py, numcheck.py, overlap.py, pagecheck.py, pagetext.py (readers and heuristics, not gates).
- bs.py with sp*.py: batches of logged searches (Official Records and library) of the second pass; tools/s.py, q.py, qq.py, rd.py, ws9lib.py: the search and quote tools of the first pass.
- libpages3.py, neigh.py, ia_fetch.py: library page decisions. NOTES.md: working notes.

## Do not repeat
- The delegated-decision block DD-TL03-01 to DD-TL03-04 and the progress lines of 2026-11-13 and 2026-11-14 were appended once to GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md and GOVERNANCE/progress.md.
