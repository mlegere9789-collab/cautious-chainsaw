# tl-03 close-out, second pass (bt-timeline), working notes (scratch; files are the memory)

## 2026-11-14 ~00:45 start of the second pass (this incarnation)
- Found: first pass complete (57 rows, 543 citations, `build.py --check-only` ok; outputs of 2026-11-13 22:03: timeline_corrections/tl-03.jsonl, horde/tl-03/results.jsonl, proposed-register (52 CO entries + EG-01..09 + CONFLICTS), counts.json). REPORT.md is still the 2026-11-04 audit text. No DD-TL03 lines, no tl-03 final progress line, no request note.
- Plan: (1) content review of all 57 rows + extra searches (rows_a/b/c.py in horde/tl-03/closeout/) (2) page audit: OR printed page from the scan leaf map (18 of 438 differ/spanning), library pages decided per citation, header strips of the 141 cited OR leaves read on page images (3) schema as tl-02 (tier_change, source_class, scan) (4) rebuild, REPORT, counts, DD-TL03 block (append once), progress line (append once), request note.
- Audit scripts: tmp/tl-03/audit/ (pagecheck.py, numcheck.py, overlap.py, compact.py, show.py).

## State 2026-11-14 ~01:10 (resume here if interrupted)
- build.py ported to the scan-leaf page rule (or_page, source_class, scan, page_running_head_model); stated pages in rows must equal the scan-leaf page (6 stated pages fixed: T1-116 p_div 914, T1-121 w13 584, T1-143 org_n 164, T1-145 oob 164, T1-146 f_ret 188, T1-149 d_rock 582). `python3 -I docs/.../horde/tl-03/closeout/build.py --check-only` = 57 rows, 554 citations ok.
- Tools in tmp/tl-03/audit/: edit.py (row-block patch helper: R(rid).replace/ext/add_cites/sub_keys/set_kw/set_page), review.py (flagged sub-claims with source context), ctx.py, numcheck.py, overlap.py, pagecheck.py, montage.py (header strips, 6 per image), mark_viewed.py (stores readings in horde/tl-03/closeout/audit/viewed_leaves.json), ocr2.py (second OCR of every cited leaf; started 00:5x under the lock, output tmp/tl-03/audit/ocr2.log, ocr2_report.txt).
- FOUND: T1-121 w13 "say at 13 o'clock" is "say at 12 o'clock" on the page image (part 2 leaf 589 = p.584, Willis, 4th Georgia); the first pass carried the OCR digit. T1-119 "2h miles" = 2 1/2 (part 2 leaf 647 = p.642). Rows done in the second pass so far: T1-116..T1-121 (content), pages of T1-143/145/146/149.
- Remaining plan: review.py on T1-122..T1-172 (flagged items), extra searches for the 68 unsupported sub-claims (s.py logs to closeout/search_log.jsonl), library page decisions, header-strip reading of all cited leaves (montage.py all), ocr2 report read, then outputs (build.py write, REPORT.md, tier_change, DD-TL03, progress line, request note).

## Page-image digit readings (2026-11-14, snip.py; each is also stored as image_check/note on its citation)
- T1-121 w13 (2:589, p.584): "say at 12 o'clock" (OCR 13). T1-119 j_dep (2:647, p.642): "about 2 1/2 miles" (OCR 2h). T1-126 dan12 (2:571, p.566): "within 2 1/2 miles" (OCR 2^).
- T1-122 d_baxter (1:271, p.248): "nearly 400 yards" (OCR 4t)0). T1-129 tab820 (2:347, p.342): Iverson's Brigade total row 130 / 328 / 308 / 820; rows 143, 56, 122, 134 (OCR 131 for 134); 130+328+308 = 766 not 820: printed columns inconsistent.
- T1-147 mor_str (1:292, p.269): 24th Michigan strength: field 3, staff 1, line officers 24 (OCR 34), non-commissioned and privates 468, total 496 (OCR 49ft); losses killed 79, wounded 237, total 316 (OCR 3m), plus about 80 enlisted men and 3 officers missing. T1-147 mcf_roll (1:351, p.328): "8 officers and 113 men answered to roll-call ... 21 officers and 446 men had gone into the fight".

## State 2026-11-14 ~01:55
- Second-pass flagged-quote review done for T1-116..T1-157 (extensions, header cites, digit fixes). Big findings: T1-144 Gordon "within about 300 yards" (the first pass had 200: OCR ':>,()()'), T1-147 rewritten from the page images (24th Michigan strength 496 with 24 line officers; revised return p.173/174: 24th Michigan 363, 151st Pennsylvania 337; 399 = Morrow sum, scenario), T1-129 Iverson table (130/328/308/820 inconsistent columns), T1-152 216 confirmed.
- build.py also now stores report_heading (verbatim OCR heading of the report with offsets) on every OR citation.
- TODO next: review T1-158..T1-172 flagged items; then searches for the 68 unsupported sub-claims; library pages (TPIERCE etc. p.None); montage.py all (header strips) -> mark_viewed.py; ocr2_report.txt; tier_change; REPORT/counts/register/DD/progress/request note.

## State 2026-11-14 ~02:00 (resume here)
- Library pages: horde/tl-03/library_pages.json written by tmp/tl-03/audit/libpages3.py (73 decisions; PA-GB-1914-v1 decided by hand from heads: leaf alignment fails; first-pass pages wrong for pa230 491->492, NY vol.1 T1-167 58->21, Fremantle 253->254, Meade 55->56). build.py consults it (TL3_NOPAGES=1 + --libcites to regenerate the cite list for libpages3).
- Header strips of every cited OR leaf read on page images: closeout/audit/viewed_leaves.json (144 readings, 0 mismatches vs the leaf map).
- Computed rows: COMPUTED citations (T1-158 eph/meeus/pyeph, T1-171 sky_eph/sky_pye); closeout/astro_check.py + horde/tl-03/astro_check.json.
- Background (queued under the lock): bs.py sp1.py -> tmp/tl-03/audit/sp1.out (25 searches logged to closeout/search_log.jsonl), ocr2.py -> ocr2_report.txt.
- Still to do: read sp1.out and apply finds; write sp2 (second batch: rows T1-141..T1-171 unsupported items); tier_change field; REPORT.md; counts; DD-TL03 block (append once); request note; final progress line; snapshot tmp scripts into closeout/audit; copy acquired texts used (BIDDLE etc.) if cited.

## FACTS changed in the second pass (feed for REPORT.md FACTS list and the request note)
1. T1-121: 4th Georgia (Maj. W. H. Willis, R515 p.584) "say at 12 o'clock" (OCR 13, page image); Doles about 1 p.m.: two scenarios; window start 12:00.
2. T1-144: Gordon moved slowly to within about 300 yards (OCR ':>,()()'; first pass said 200).
3. T1-147: revised return R013 pp.173-174 (page images): 151st PA 337 (2+49 k, 9+202 w, 4+71 m); 24th MI 363 (8+59, 13+197, 3+83); Morrow p.269: strength 496 (3,1,24,468), losses 79/237/316 + about 80 and 3 missing (sum 399 = scenario A, 363 = scenario B).
4. T1-129: Iverson's Brigade total row p.342 prints 130/328/308/820 (130+328+308=766; regiment rows 143,56,122,134 = 455): inconsistent columns.
5. T1-127: infantry and battery earthworks on Jul 1 night documented (Roath R051 p.305 107th PA breastworks left of Cemetery Hill; Whittier R073 p.361 temporary earthworks); window end 23:59.
6. T1-164: Howard R243 p.704 and Meade R006 p.115: Slocum and Sickles about 7 p.m.
7. T1-135: Doubleday R029 p.256 Heard and Bache stayed with the wounded.
8. Library pages: PA vol.1 pa230 491->492; NY vol.1 (T1-167) 58->21; Fremantle 253->254; Meade 55->56.
9. T1-146: window start 11:00 (Hunt, Bancroft); T1-122 Baxter 400 yards (Doubleday p.248 OCR 4t)0 read 400); T1-152 216 confirmed; 2 1/2 miles (T1-119, T1-126, T1-154).

## State 2026-11-14 ~01:40 real clock (resume here)
- Library searches (30) and OR searches (28) done directly (each batch < 10 s CPU) and logged (search_log.jsonl). Finds applied: T1-169 (Hard 1868, 8th Illinois Cavalry surgeon: wounded moved to the Presbyterian church after noon, Surgeons Beck, Rulison, Vosburg stayed; row now `corrected`, afternoon not evening; HARD-1868 registered in acquired_tl03.json, text in tmp/tl-03/acq), T1-119 (Herr's Ridge named by Bachelder 1873), T1-128/T1-144 (Barlow's Knoll names later: Bachelder 1873, Ohio 1887, PA address; NPS Blocher Knoll), T1-148 (PA vol.2: Stone among the wounded), T1-153 (NPS McPherson study: Heth fell unconscious, forehead), T1-145 (NY vol.1: Battery G withstood half an hour), T1-127 (Roath R051 p.305, Whittier R073 p.361: breastworks/earthworks on Jul 1 night), T1-135 (Doubleday p.256).
- ocr2 job (second OCR numerals) is still queued under the lock (PID 28624); if it never runs, the REPORT says so (owed).
- Remaining: REPORT.md (post.py has FACTS/OWED to fill), DD-TL03 block (append once), request note, final progress line, snapshot of tmp scripts into closeout/audit, delete scratch caches, counts, final verification pass (build, pagetext, verify_out-like independent re-read of offsets).
