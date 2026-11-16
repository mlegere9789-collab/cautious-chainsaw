# tl-02 close-out: build sources (snapshot of tmp/tl-02, which is gitignored)

Snapshot refreshed 2026-11-16 after the second reading (first snapshot 2026-11-14). Everything written to GOVERNANCE/timeline_corrections/tl-02.jsonl and to
GOVERNANCE/horde/tl-02/ (results.jsonl, proposed-register/, counts.json, search_log.jsonl, REPORT.md, library_pages.json, lookups.jsonl) comes from these files.

## Rebuild
The scripts compute the repository root as two folders above their own, so they run from `tmp/tl-02/`:
1. `mkdir -p tmp/tl-02 && cp -r docs/battle-theatre/GOVERNANCE/horde/tl-02/closeout/* tmp/tl-02/`
2. Inputs that are not committed (tmp/ is ignored): the acquired texts `tmp/tl-02/acq/<id>/*_djvu.txt` (identifiers and sha256 in `../sources_tl02.json`,
   public domain or U.S. Government works, archive.org text layer: 22 texts, the last two, DTIC-ADA207999 and AMEPH-1863, added on 2026-11-15); the archive.org
   page index files of the library items used for page decisions in `tmp/tl-02/scan/ia/<identifier>/` (`metadata.json`, `<id>_hocr_pageindex.json.gz`,
   `<id>_hocr_searchtext.txt.gz`, fetched from https://archive.org/cors/<id>/<file>, at most 1 request per second; `audit/ia_fetch.py <id>`); the Official Records
   text (tmp/library/or27) and its leaf map (docs/battle-theatre/kit/evidence/or27_leaf_pages.json, tools/bt/kit_or27_leafmap.py), which belong to other
   workstreams; PyEphem 4.2.1 in `tmp/tl-02/pylib` for astro_check.py (`pip install --target tmp/tl-02/pylib ephem==4.2.1`).
3. Check the row files (every quote is re-matched verbatim in the local text, page and report id verified): `python3 -I tmp/tl-02/build2.py --check`
   (`TL2_NOPAGES=1` lets library citations without a page decision pass while the decisions are being made).
4. Write the outputs. A new or changed search runs in full (a few seconds each); a full run of all searches needs the machine lock (`tools/horde/bench.sh`):
   - corpus unchanged since the last write: `python3 -I tmp/tl-02/build3.py --write` (re-uses the logged searches; refuses when a corpus text is newer than the log);
   - corpus gained texts since the last write: `python3 -I tmp/tl-02/build4.py --plan | --measure | --verify N | --write` (hit counts are additive over sources: the
     logged counts are kept and the hits of the new texts only are added; `--verify N` runs N old searches in full and compares: 0 mismatches on 2026-11-15; measure
     the CPU time first, a job above about 30 s goes through the lock);
   then `python3 -I tmp/tl-02/post.py` (REPORT.md, counts, astronomical check files, older register entries once), then the checks
   `python3 -I tmp/tl-02/verify_out.py` and `python3 -I tmp/tl-02/audit/audit_strict.py` (both must report 0 errors; audit_strict lists 5 known warnings: quotes that
   span a running head).
5. A new library citation needs a page decision in `../library_pages.json`: `TL2_NOPAGES=1 python3 -I tmp/tl-02/audit/mk_tmp_corr.py`, then
   `TL2_CORR=tmp/tl-02/audit/tmp_corr.jsonl python3 -I tmp/tl-02/audit/libpages_final.py` (existing decisions must come out unchanged; hand decisions are the
   OVERRIDES of libpages_final.py, for example the footer folios of the DTIC study). A new Official Records leaf needs its printed page read on the page image and
   entered in `audit/viewed_leaves.json` (key "part:leaf", PDF page = leaf + 1), otherwise audit_strict.py warns.

## Files
- rows_a.py, rows_b.py, rows_c.py: the data of the 58 rows (claim, sub-claims with tier, citations, scenarios, remains, searches, register entry).
- tl2lib.py: constructors, verbatim quote resolver (Official Records by report id and scan-leaf page, library texts by offset and page decision), search runner.
- build2.py (checks, `write_all()`), build3.py (incremental write), build4.py (incremental by source), post.py (REPORT.md, older register entries), verify_out.py,
  dd.py, dd2.py, ver2/dd3.py (delegated-decision blocks), astro_check.py (1863 almanac and PyEphem check), ws9find.py (corpus access).
- audit/: audit_strict.py (independent re-read of every offset, exact span, page and report id by the scan leaf map), libpages_final.py (library page decisions),
  viewed_leaves.json (the Official Records leaves whose printed page was read on the page image: 89 leaves), mk_tmp_corr.py, numcheck.py and overlap.py (heuristics
  that list claims whose numbers or words are not in their quotes; read by hand), compact.py and show.py (readers), shifts.py, libheads.py, pagediff.py (page-index
  checks), ia_fetch.py (page-index files from archive.org), ocr2.py with ocr2_report.txt (second method: tesseract at 300 dpi on the scan page of each Official
  Records citation; ocr2_report.run1.txt is the report of 2026-11-15 over 222 citations).
- ver2/ (second reading of 2026-11-15/16): tokcheck.py (numbers and names of a claim that are in neither its quotation nor the text around it), ctxshow.py (source
  context of a quote), tryq.py (try a candidate quotation through the builder resolver), hours_uncited.py and hours_or.py (hour statements of the local texts that a
  row does not cite), lookups_add.py (lookups LF1-LF11), eg_update.py (older register entries), dd3.py with dd_block3.md (DD-TL02-05), snapshot.sh (this snapshot),
  tokcheck.out (last run), patch/ (apply_patch.py and apply_patch2.py edit the row files; new_t092_093.py, new_t103.py, new_t111.py are the new row blocks).
- NOTES.md: working notes of the five runs (history, what was tried, what was found).

## Do not repeat
- dd.py, dd2.py and ver2/dd3.py only write a markdown block under tmp/tl-02 (dd_block.md, dd_block2.md, ver2/dd_block3.md); those blocks (DD-TL02-01 to DD-TL02-05, with
  two correction lines) were appended once to GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md and must not be appended again. The progress lines of 2026-11-13,
  2026-11-14 and 2026-11-16 in GOVERNANCE/progress.md were also appended once.
- post.py updates the older register entries tl-02-EG-001..013 only once (marker "CLOSE-OUT UPDATE 2026-11-13"); ver2/eg_update.py adds the paragraphs of the second reading
  to EG-001, EG-003 and EG-004 once (marker "SECOND-READING UPDATE 2026-11-15"); ver2/lookups_add.py appends LF1-LF11 to lookups.jsonl once (guard: an id starting with LF).
- ver2/patch/apply_patch.py and apply_patch2.py edited rows_a.py, rows_b.py and rows_c.py once; the row files in this snapshot already contain the edits.
