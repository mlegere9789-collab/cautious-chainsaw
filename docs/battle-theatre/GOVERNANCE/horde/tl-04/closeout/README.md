# tl-04 close-out: build sources (snapshot of tmp/tl-04, which is gitignored)

Snapshot of 2026-11-16 after the second reading. Everything written to GOVERNANCE/timeline_corrections/tl-04.jsonl and to GOVERNANCE/horde/tl-04/
(results.jsonl, proposed-register/, counts.json, search_log.jsonl, REPORT.md, lookups.jsonl) comes from these files.

## Rebuild
The scripts compute the repository root as two folders above their own, so they run from `tmp/tl-04/`:
1. `mkdir -p tmp/tl-04 && cp -r docs/battle-theatre/GOVERNANCE/horde/tl-04/closeout/* tmp/tl-04/`
2. Inputs that are not committed (tmp/ is ignored): the Official Records text and leaf map (tmp/library/or27, docs/battle-theatre/kit/evidence/or27_leaf_pages.json, tools/bt),
   the 99-text library (tmp/library/ws9), the NPS texts (tmp/library/web/nps), the town and medical texts (tmp/library/town, tmp/library/medical), the newspaper pages listed in
   `ca_manifest.json` (tmp/library/web/ca/pages and retry; the set is frozen at 1,578 pages), the texts acquired for the first close-out (`../sources_tl04.json`), the Official
   Records PDFs for the second OCR (tmp/kit-plan/or27-pdf, read-only), PyEphem 4.2.1 in tmp/tl-04/pylib for astro_check.py.
3. Check every quotation (re-matched verbatim in the local text, report id and page checked): `python3 -I tmp/tl-04/build.py --check`.
4. Run and cache the searches, one scope at a time (OR27 about 20 s of CPU, NEWS and NPS 8 s, TOWN and MED 5 s, LIB 39 s, CA 45 s; use `tools/horde/bench.sh` for the long ones):
   `python3 -I tmp/tl-04/run_searches.py --scopes OR27` and so on; the cache is tmp/tl-04/search_cache.json and is valid only while pattern, scope and the scope's text files are unchanged.
5. Write the outputs: `python3 -I tmp/tl-04/build.py --write`, then `python3 -I tmp/tl-04/verify_out.py` (must report 0 errors), then `python3 -I tmp/tl-04/post.py` (REPORT.md, older register entries, lookups).
6. The delegated-decision block: `python3 -I tmp/tl-04/dd.py` writes tmp/tl-04/dd_block.md; it was appended ONCE to GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md (DD-TL04-01 to DD-TL04-10) and must not be appended again.

## Files
- rows_a.py .. rows_g.py: the first close-out (58 rows: claim, sub-claims with tier, citations, scenarios, defaults, remains, searches, register entry); rows_h.py: the second reading, applied
  over them (quotation extensions QX, wording CF, new citations NC, sub-claims SA and SD, scenarios SN, page ranges PG, the digits read on page images).
- tl4lib.py: constructors, verbatim quote resolver (Official Records by report id and scan-leaf page, library texts by offset and page), search runner; ext_lib.py: the texts of the second
  reading (town, medical, newspaper pages) and their running heads; ws9find.py: corpus access; build.py: checks and `--write`.
- post.py, dd.py, verify_out.py: report and register updates, decision block, independent re-read of every offset.
- tools2/: live_overlap.py and extend.py (claims that go beyond their quotations), ctx.py (source context of a stored quotation), numcheck.py and namecheck.py, ocr2.py and ocr_some.py (second
  OCR of the page images; ocr_rest_args.txt lists the leaves still to read), mk_viewed.py (leaves read on a page image: audit/manual_views.json), astro/leaf helpers.
- audit/: viewed_leaves.json and manual_views.json (leaves whose printed page was read on the page image).
- NOTES.md: working notes of both runs.

## Do not repeat
- dd.py only writes a block under tmp/tl-04; the block (DD-TL04-01 to 10) was appended once. post.py updates the older register entries EG-TL04-001..021 by replacing its own paragraph
  (marker "CLOSE-OUT UPDATE 2026-11-13"), so it can be run again.
- OWED: `tools/horde/bench.sh python3 -I tmp/tl-04/tools2/ocr_some.py $(cat tmp/tl-04/ocr_rest_args.txt)` (48 digit-bearing leaves of the Official Records, about 200 s of CPU), then read each
  flagged numeral on the page image, extend rows_h.py (field `reading`, wording), rebuild, rerun post.py.
