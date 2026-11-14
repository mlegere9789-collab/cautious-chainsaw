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
