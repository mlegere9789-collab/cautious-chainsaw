# tl-02 close-out working notes (scratch, safe to delete after the build is final)

Run state (update as you go; files are the memory)

- 2026-11-13 19:2x: second incarnation. Predecessor left: acq/ (11 archive.org djvu texts), cache/, helper scripts
  (ws9find.py patched to LRU+array, q.py search, ctx.py window), dump_rows.txt (the 58 rows with shard + recheck data),
  search/*.txt (old hit dumps), build.py + tlc.py (old design, NOT used any more), astro_check.* (PyEphem cross-check, pylib/).
- New design: copy of the tl-01 peer schema (GOVERNANCE/horde/tl-01/closeout/build.py is the model).
  tmp/tl-02/tl2lib.py (constructors + resolver), rows_a.py (T1-058..076), rows_b.py (T1-077..096), rows_c.py (T1-097..115),
  build2.py (verify every quote, run every search, write outputs).
- Outputs: GOVERNANCE/timeline_corrections/tl-02.jsonl, horde/tl-02/results.jsonl (rewritten, old one kept as results.pre-closeout.jsonl),
  horde/tl-02/proposed-register/tl-02-CO-<row>.md, REPORT.md, sources_tl02.json, search_log.jsonl.

Key finds (library texts that close sub-claims)
- Heth 1877 letter (SHSP-04 ~p.157): Pettigrew reported cavalry + drums; Hill: "the only force at Gettysburg is cavalry".
- WELD-1912 (acq): diary Jun 30 (HQ Moritz's tavern), Jul 1 ("moved off at 8 a.m."), Reynolds message "barricade ... hold the enemy back as long as he could".
- MEADE-LL-v2 ~@106313: Weld (printed "Weed") left Reynolds at ten o'clock with the message; PA-GB-1914-v2: Weld recorded 8 o'clock.
- BACH-WHATTOSEE-1873/1889: "From this cupola, the gallant Buford directed the opening battle"; Buford watched from cupola, met Reynolds.
- NY-GB-1900 @21456: signal officer in the belfry sees the corps flag of Reynolds' troops; Buford climbs to the tower.
- CHENEY-1901 @231780 and HALL-6NYCAV-1908 @253031: 9th NY Cavalry picket exchange ~5.30 a.m. at the Marsh Creek bridge ("first shots"); competing first-shot claim.
- Astro: PyEphem cross-check in astro_check.json matches repo ephemeris (moonrise Jun 30 19:01 LMT, not 19:10).

- 2026-11-13 19:2x second incarnation: tmp/tl-02/rows_a.py T1-058..076 written and verified (104 quotes). Next rows_b (077..096), rows_c (097..115), emit.

- 19:5x/20:1x rows_a/b/c written: 58 rows, 282 citations verified (build2.py --check = 0 problems). Next: emit (corrections jsonl, results.jsonl, register md, REPORT, sources manifest, search log), delegated-decision block, request note, progress line.

## STATE at 20:22 (resume here if interrupted)
- rows_a/b/c complete (58 rows, 313 citations pass `python3 -I tmp/tl-02/build2.py --check`).
- Interim outputs were written by a DRY RUN (TL2_NOSEARCH=1: hit counts null, flagged "pending"): corrections jsonl, results.jsonl (pre-closeout copy kept), proposed-register (CO entries), REPORT.md, counts.json.
- The REAL build is queued under the machine lock: `tools/horde/bench.sh python3 -I tmp/tl-02/build2.py --write > tmp/tl-02/write.log` (started 20:02). When write.log says "wrote 58 ...":
  1. python3 -I tmp/tl-02/post.py       (updates EG-001..013 once, REPORT.md, lookups, astro files)
  2. python3 -I tmp/tl-02/verify_out.py  (independent re-read of every offset)
  3. python3 -I tmp/tl-02/dd.py && cat tmp/tl-02/dd_block.md >> docs/battle-theatre/GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md  (once)
  4. printf progress line >> docs/battle-theatre/GOVERNANCE/progress.md (once)
  5. rm -rf tmp/tl-02/cache tmp/tl-02/__pycache__ (regenerable, ~320 MB)
- Request note written: docs/battle-theatre/GOVERNANCE/horde/requests/bt-timeline-tl-02-corrections.md

## STATE at 21:05 (resume here if interrupted)
- Second proofreading pass done (patch2..patch8.py applied through the stage dir tmp/tl-02x: copy build2/tl2lib/ws9find/rows to tmp/tl-02x, patch there, `build2.py --check` there, then `cp` + `mv` the rows files over the live ones). Findings fixed: T1-110 unit (Baxter's Second Brigade, 11th PA + 97th NY; "afternoon" contradicted by Baxter/Coulter 11 a.m.), T1-097 Hall replaces Calef (Calef p.1031; NY vol.1), T1-098 enveloping Archer's right (Morrow OR, Bachelder, Meade 1913, Beveridge), T1-099 regiment conflict (Bates: 2nd WI; NY vol.1: 19th IN) + head/brain/neck + sharp-shooter + seed caveats, T1-101 (Cutler front and right flank; NY narrative on Davis/55th NC/Wadsworth), T1-102 (XI Corps through town about 12:30 Howard / 12:45 Pierce; Schurz before noon), T1-108 (Biddle: cut fighting before about 11:30), T1-111 (Pierce cupola), T1-112 (10:30 found in OR: Slocum p.768), T1-115 (Lee p.317: about 2:30 p.m.), T1-061 (Williams memo of Jul 1, OR pt.3 p.460), T1-063/067/071 (Devin camp north of railroad; Confederate bivouacs), T1-064 date (Hill 29th), T1-069 OCR numbers, T1-083 Beveridge rejects rival claims, T1-085 fences, T1-092 signal officer in Bates, T1-094 Calef wheat-field.
- 19 extra searches are appended at the end of rows_c.py (`_add_sr`), 135 searches in total.
- Live check: `python3 -I tmp/tl-02/build2.py --check` = 58 rows, 379 citations, 0 problems.
- Interim outputs were refreshed at 21:00 by a DRY run (TL2_NOSEARCH=1, log write_dry.log): hit counts null/pending, REPORT.md says so.
- The REAL build is still queued: `tools/horde/bench.sh python3 -I tmp/tl-02/build2.py --write` (pid 25593, log tmp/tl-02/write.log; a background waiter greps write.log). When it says "wrote 58 ...":
  1. python3 -I tmp/tl-02/post.py ; 2. python3 -I tmp/tl-02/verify_out.py ; 3. python3 -I tmp/tl-02/dd.py && cat tmp/tl-02/dd_block.md >> .../decisions/DELEGATED-DECISIONS-2026-11-11.md (once)
  4. one printf line >> GOVERNANCE/progress.md (once; format "- 2026-11-13 bt-timeline tl-02 ...") ; 5. rm -rf tmp/tl-02/cache tmp/tl-02/__pycache__ tmp/tl-02x
- Later edits to rows after the real run: use `python3 -I tmp/tl-02/build3.py --write` (re-uses search_log.jsonl for unchanged searches; only new/changed searches run).
- Request note updated: docs/battle-theatre/GOVERNANCE/horde/requests/bt-timeline-tl-02-corrections.md (12 conflicts + product notes).

## FINAL STATE at 21:20
- The locked build ran at 21:12 (write.log: wrote 58 corrections lines, 135 search records; 2101 hits, 17 zero-hit). Final files were rewritten by build3.py --write (write3.log; all 135 searches re-used) after patch9 (explicit pages) and a register wording change.
- post.py, verify_out.py (0 errors), dd.py + append (DD-TL02-01..03), progress.md line, request note: all done. Scratch cache/search/stage dirs deleted; acq/ and pylib/ kept (evidence texts, astro check).

## STATE at 2026-11-13 23:58 (third incarnation: continuing the interrupted AUDIT pass that started 23:28)
- Outputs (timeline_corrections/tl-02.jsonl, horde/tl-02/*) are still the 21:16 build; rows_a/b/c.py + tl2lib.py carry audit edits (OR pages by scan leaf map) NOT yet built. Backup of the 21:16 outputs + sources: tmp/tl-02/backup-pre-audit/.
- `python3 -I tmp/tl-02/build2.py --check` = 58 rows, 379 citations, 0 problems (9 s CPU; direct run is fine). 213 OR citations: all printed pages read on the page image (audit/viewed_leaves.json); 30 differ from the running-head model (audit/pagediff.py).
- Library pages: archive.org page index is NOT reliable alone (3 items have leafNum shifted +1: Alexander, PA-GB-1914-v2, Fox; NY vol.2 index counts plates). Rule found: page = number printed at the top of the scan leaf (OCR head), cross-checked with index (audit/shifts.py, libheads.py, libctx.py, leafheads.py). Decisions to apply: alex_full 384->385; bach_env 24->25; chen_530/hall_530 136-137->137; shsp_6000/8052 38->39; tp_* 30-34 -> 33, tp_fire -> 34; NY vol1 leaf19=p.11, leaf20=p.12; ny2_55 616; fox_147 237; in_volley 43; pierce 117; mi_* 114; bl3_cup check; Bates/Biddle/CAVTACT/MI verified by text heads.
- FOUND DEFECT: T1-085 citation ny_carb is NOT New York at Gettysburg vol.2: it is The Campaign of Chancellorsville (Yale UP 1910) p.25, bound at the end of the same archive.org item (finalreportonba00chatgoog; title page in text at offset 1,444,614). Fix row T1-085 (source, witness, sub-claim 7, text), post.py UPD 012, EG-012.md.
- ocr2.py (second-OCR numerals check of the OR leaves) queued under the lock at 23:55 (log audit/ocr2.log, report audit/ocr2_report.txt).
- TODO after the page work: patch tl2lib (library page decisions file horde/tl-02/library_pages.json), adapt audit_strict.py (scan-leaf page rule), rebuild: python3 -I tmp/tl-02/build3.py --write (re-uses searches; run directly if --plan says 0 new), post.py, verify_out.py, audit_strict.py, REPORT/counts, progress line (+ DD-TL02-04 if needed), update request note.

## STATE early in the fourth incarnation (started 00:07 UTC on 2026-11-14, after the 00:06 container restart)
- Found: rows_a/b/c.py + tl2lib.py carry the audit edits; library_pages.json exists (23:59); `build2.py --check` = 58 rows, 380 citations, 0 problems; `build3.py --plan` = 135 searches re-used, 0 new.
- ocr2.py job (queued 23:55) never ran (restart): ocr2.log empty. Not needed for the build; second-OCR numerals check stays optional.
- Plan: (1) build3.py --write (outputs still the 21:16 build) (2) adapt audit_strict.py to the scan-leaf page rule (3) post.py with REPORT text updated (scan leaf rule, not "no scan image") (4) verify_out.py + audit_strict.py (5) independent review of sample rows (6) progress line, request note refresh, DD-TL02-04 only if a new default/promotion is needed.

## STATE in the middle of the fourth incarnation (wall-clock stamps in these headings were estimates; the run's files carry the real times)
- Done: build3 --write of the audited rows (page rule by scan leaf; 214 OR citations, 154 library); audit_strict.py adapted to the scan-leaf rule (0 errors but the T1-105 word, now fixed).
- Review pass edits (rows_a/b/c.py): T1-067 (Howard p.701 + Itinerary p.144: XI Corps at Emmitsburg, I Corps near Marsh Run on Jun 30; Jacobs conflict now two scenarios; event wording fixed), T1-080 ("a hot day's fight" is an idiom, not weather: removed), T1-094 (hall_9 quote extended to the 400 yards), T1-098 (Howard 10.45 vs Doubleday 10.15 as scenarios), T1-099 (note: Howard dispatch headed 5 p.m.), T1-105 (no word "generated"), T1-115 (C-041 pointer), stale "~" page statements, Buford p.930, Doubleday p.245.
- EG-001/003/008/012 register files patched (stale pages; carbine statement is the Chancellorsville book, not New York vol. 2); post.py UPD 012 text patched.
- Page images checked by me: part 2 PDF page 295 = printed 289 (Heth's division); part 1 PDF page 355 = printed 331, "about 12 m." (Wister).
- NEXT: build3 --write (1 new search), verify_out.py, audit_strict.py, numcheck; post.py (REPORT text: scan-leaf rule, no more "no scan image"); DD-TL02-04 append; progress line; request-note refresh; delete tmp/tl-02/scan/chk4.

## STATE later in the fourth incarnation
- More review edits applied (rows_a/b/c.py): quotes extended to cover the full claim in T1-062 (Calef Carlisle road), 074, 078, 079 (Early route), 083 (stone faces), 084, 085 (Gamble organization), 086 (Grey Eagle split), 088, 089, 094, 097, 100 (Haskell answer), 103 (Harney), 108, 109, 112; T1-071 (bridge), T1-106 (sub 4 reworded); page table regenerated with tmp/tl-02/audit/mk_tmp_corr.py + libpages_final.py (TL2_NOPAGES=1 / TL2_CORR=...): 129 entries, existing ones unchanged.
- post.py: REPORT text now computed from the file (scan-leaf rule, provenance, review pass); dd2.py writes tmp/tl-02/dd_block2.md (DD-TL02-04) - append ONCE with shell >> after the final rebuild; grep -c DD-TL02-04 must be 0 before.
- Still TODO: final build3 --write + post.py + verify_out + audit_strict; append DD block; progress.md line; refresh the request note (items 13/14 conflicts + page-model request); rm tmp/tl-02/scan/chk4 and tmp_corr.jsonl (small); final structured answer.

## FINAL STATE of the fourth incarnation (2026-11-14, about 00:40 UTC)
- Final files: timeline_corrections/tl-02.jsonl (58 rows, 389 citations), horde/tl-02/* rebuilt by build3.py --write + post.py; verify_out.py and audit_strict.py 0 errors; DD-TL02-04 appended; progress lines appended (one plus a correction); request note updated (items 13-14, section 5).
- Snapshot of every script and row file: docs/battle-theatre/GOVERNANCE/horde/tl-02/closeout/ (README there).
- Owed: second-method re-read of the OCR-damaged digits (ocr2.py never ran), USNO almanac cross-check of the computed sky rows.

## STATE of the fifth incarnation (started 2026-11-15 22:53 UTC; relaunch after the weekly-limit pause; nothing of the finished close-out redone)
- Verified at start: verify_out.py 0 errors (58 rows, 379 citations), audit_strict.py 0 errors / 5 warnings (spans across running heads). Backup of builder + outputs: tmp/tl-02/ver2/backup-20261115/.
- Second reader tools (tmp/tl-02/ver2): tokcheck.py (claim numbers/names outside the quotes), ctxshow.py (source context), tryq.py (try a quote through the builder resolver), img/ (page images).
- Queued under the lock at 22:57: tools/horde/bench.sh python3 -I tmp/tl-02/audit/ocr2.py > audit/ocr2.log (second-OCR numerals check; writes audit/ocr2_report.txt). Read the report when it exists; compare flagged numerals on the page image.
- NEW FINDS: (1) DTIC ADA207999 (US Army War College study project 1989, A Communicator's Guide to the Gettysburg Campaign) prints Jerome's letter of 18 Oct 1865 to Hancock (Bachelder Papers): "As early as seven A.M. I reported their advance, and took my station in the steeple of the 'Theological Seminary.' General Buford came up and looked at them through my glass ... corps flag ... for half an hour ... Gen. Reynolds ... hailed the Gen. who was with me in the steeple" (printed pp.9-10; folios are at the FOOT of the page; item index leaf 13 = p.9) and says Pennsylvania Hall (p.9). Text registered at tmp/tl-02/acq/DTIC-ADA207999/DTIC_ADA207999_djvu.txt (sha256 1479babc...). Needs: sources_tl02.json item, tl2lib LABEL/CLASS, libpages OVERRIDES (footer folio, leaves 12-14), rows T1-086/092/093/111.
  (2) OR vol. 27 pt. 1 Return of casualties printed p.173 (PDF page 197, leaf 196) read on the page image: Cutler's Second Brigade aggregate 1,002 (K 6/122, W 44/465, M 2/363); regiments 7th IN 10, 76th NY 234, 84th NY 217, 95th NY 115, 147th NY 296, 56th PA 130; every row and column sums. Row T1-103 (the row's 454 of 1,007 stays unsupported; OR gives 1,002 for the whole battle).
  (3) quotes narrower than their claim (my tokcheck): extend T1-063 dbl_400, T1-065/069 add stu_carl, T1-066 v_hq + carr_em2, T1-071 gam_notice, T1-076 Pegram batteries, T1-083 hall_530, T1-084 ny_marye, T1-085 gam_comp, T1-095 buf_1010h, T1-098/107 dbl_1000, T1-098 how_1045 heading, T1-106 dbl_hand, T1-113 heth_hour, T1-114 bar_church (candidates tested OK with tryq.py: cands1.json).
- Plan: patch rows_*.py -> build2.py --check (TL2_NOPAGES=1 while library decisions are missing) -> mk_tmp_corr/libpages_final (page decisions) -> FULL build under the lock (the corpus changed: build3 refuses to re-use the log) -> post.py -> verify_out.py + audit_strict.py -> REPORT counts, DD-TL02-05 block (append once), progress line, closeout snapshot refresh.

## STATE 2026-11-15 ~00:40 UTC (fifth incarnation, rows patched, full build queued)
- Patches applied (scripts in tmp/tl-02/ver2/patch/): apply_patch.py (quote extensions, DTIC Jerome letter in T1-086/092/093/111, OR casualty return in T1-103, tl2lib OR(reading=), LABEL/CLASS DTIC, libpages OVERRIDES for DTIC leaves), apply_patch2.py (hour statements of already-local sources: Jacobs, NY vol.1, Cheney, T. Pierce, Beveridge, Meade 1913, regimental reports of OR vol.27 pt.1/2; rows T1-058, 062, 074, 077, 078, 079, 082, 088, 090, 091, 094, 095, 096, 099, 101, 102, 103, 109, 110, 112, 113, 115). Backup of the pre-patch builder and outputs: tmp/tl-02/ver2/backup-20261115/.
- build2.py --check: 58 rows, 474 citations, 0 problems; library_pages.json now 155 entries (existing 130 unchanged; DTIC footer folios; NY vol.1 leaf 13 = p.7; Cheney leaf 123 = p.111).
- ocr2.py finished: 222 OR citations compared, 11 flagged (audit/ocr2_report.txt): 1st read as "ist" (2), decimal comma (2), confirms 12 m. (T1-088), 13 horses (T1-094), 11th/42d/55th (T1-101), 10.15; tesseract misreads 2 1/2 as "24" (T1-109/115): page image read by eye: "2 1/2 miles ... about 12 m." (printed p.566).
- USNO (aa.usno.navy.mil) refused by the egress proxy (403): record as blocked, not retried.
- Jerome letter source: tmp/tl-02/acq/DTIC-ADA207999/ (registered in horde/tl-02/sources_tl02.json item 21); page images viewed (PDF pages 13-15).
- NEXT: full build under the lock (tools/horde/bench.sh python3 -I tmp/tl-02/build2.py --write > tmp/tl-02/write5.log) -> post.py (update its REPORT text first) -> verify_out.py + audit_strict.py + tokcheck -> lookups_add (FTS/web lookups of 2026-11-15, once) -> EG-003 update paragraph (once) -> DD-TL02-05 block (once, shell >>) -> progress line (once) -> refresh horde/tl-02/closeout snapshot -> final answer.

## FINAL STATE of the fifth incarnation (2026-11-16 ~00:55 UTC)
- Final files: timeline_corrections/tl-02.jsonl (58 rows, 477 citations: 465 quoted + 12 computed; 362 sub-claims; verdicts corrected 41, confirmed 6, partially_supported 10, gap 1; 40 rows with scenarios; 152 searches, 16 with zero hits). verify_out.py 0 errors (465 citations re-read); audit_strict.py 0 errors, 5 warnings (spans across running heads); tokcheck rerun done.
- Build history: the full build never got a slot of the machine lock (queue of 38-48 jobs for more than half an hour); build4.py (incremental by source; --verify 4 gave 0 mismatches) was measured at about 18 s CPU and then run directly with nice (tmp/tl-02/write6.log); build3.py --write rewrote the files once more after 24 further OR leaves were read on the page image (viewed_leaves.json, 89 leaves); post.py regenerated REPORT.md.
- Once-only steps DONE on 2026-11-16 (do not repeat): lookups_add.py (LF1-LF11 in horde/tl-02/lookups.jsonl), eg_update.py (marker SECOND-READING UPDATE 2026-11-15 in tl-02-EG-001/003/004), dd3.py + shell >> (DD-TL02-05 in decisions/DELEGATED-DECISIONS-2026-11-11.md), one progress.md line.
- merge_horde.py --dry (reads only): shard tl-02 gives no problem line (the 1012 problems of the run belong to other shards / OR-RECHECK).
- A second tesseract run over the 47 OR citations added on 2026-11-15 was queued under the lock (tools/horde/bench.sh python3 -I tmp/tl-02/audit/ocr2.py > audit/ocr2.log). The report of the 2026-11-15 run (222 citations) is kept as audit/ocr2_report.run1.txt. If the new report exists: read it, compare each flagged numeral on the page image, change the "Second-method re-read" bullet of post.py (it says the additions were in no second run), rerun post.py, snapshot.sh.
- NOT FOUND (recorded as failed, kept as open gaps): Jacobs's original meteorological table, Pegram's own report, Fry's 13th Alabama report, Broadhead / Myers / McCreary diaries, Cutler "454 of 1,007", the 20-mile Dover march, the 7-mile cavalry front, Buford's horse "Grey Eagle", the ladder to the cupola (a 2006 book only: lead), the original of Jerome's letter (owner-only step: request to the U.S. Army Military History Institute); aa.usno.navy.mil refused by the egress proxy (403, not retried).
