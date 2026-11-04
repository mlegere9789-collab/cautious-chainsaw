# Shard terrain-1 report: R13.0000 and R13.G-01..G-16 (17 items)

The first 17 R13 ids are R13.0000 and gun emplacements G-01..G-16. All 17 done; none remain.

Method: OR vol. 27 read with tools/bt/or27_find.py; every quote verified verbatim. Three web lookups (web_lookups.json): one photo lead, one empty, one HTTP 404.

Counts: supported 3 (G-05, 09, 15); partially_supported 7; conflict 3 (G-10, 14, 16); conflict_with_seed 3 (G-03, 11, 12); R13.0000 not satisfied. Status: verified 14, gap 3. Proposed register entries: terrain-1-EG-01..17.

Key findings needing owner decision:
1. G-03: OR (Hunt p.232, Wainwright p.357) records a small earthwork in front of each gun at dusk Jul 1, not lunettes by 16:00 Jul 2.
2. G-11: McGilvery's Jul 3 line had a slight earthwork; the PDF says improvised only. Split G-11 into a and b?
3. G-12: no OR source for any earthwork at Cushing's battery; engine rule "built on screen" lacks a basis. Guns run to the fence: Webb three, Hall one, PDF two.
4. G-16: Eshleman documents Miller's battery as the signal guns; no OR support for the Whitworth signal. Both stay scenarios.
5. Kit gaps (Hall, Stevens, Stewart, Wiedrich) can be filled from the OR (EG-17); not patched here.

Gaps: Confederate per-battery gun counts (Pendleton table unreadable), "Benner's Hill" absent from OR, photographs, Bachelder and NPS HSR sources not reached. No shared file edited; not committed.

## Audit pass 2026-11-04

Slice check: expected R13.0000 and G-01..G-16 (17); found exactly these. Counts unchanged (verified 14, gap 3). Register entries terrain-1-EG-01..17, each row links to one. No fixes needed.

own_checks:
- G-03 Hunt, OR27-1-R028 p.232, "Each of the guns in these batteries had a small earthwork thrown up in its front": found in library/timeline_audit_T2.jsonl (same report and page).
- G-06 Hunt, OR27-1-R028 p.236, "About 4.30 p. m. Hazlett's battery was moved to the extreme left": found in timeline_audit_T2.jsonl.
- G-12 Gibbon, OR27-1-R098 p.416, Webb's brigade "partially behind a low stone wall": found in tests/historian/fixtures/golden-or27.json with page 416.
Also 30 of 66 quotes reappear locally. Verification limits of this audit (2026-11-04): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is NOT present in this checkout, so tools/bt/or27_find.py could not be re-run. The web proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; those lookups are recorded as failed for this pass, none circumvented. Spot checks therefore use independent local extractions of the same OR passages (docs/battle-theatre/library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A.jsonl and positions_B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and printed page. These are second local witnesses made by earlier sessions, not the raw scan.
