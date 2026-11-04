# Shard fence-1 report (R14, items 1-35)

Scope: R14.0000, E-01..E-18, S-001..S-016. These sub-requirements are works-chronology and state-schedule rows, so many are earthworks rather than fences; fence relevance is marked on each row.

Method: only the local OR Ser. I vol. 27 OCR (Parts 1-2) was searched, with `tools/bt/or27_find.py`. No web lookups. 82 exact quotes (each under 15 words) were re-verified verbatim. OCR is a single witness.

Counts (34 children): 24 verified, 5 inferred (E-02, E-06, E-13, E-16, S-014), 5 failed_lookup (S-003, S-004, S-008, S-009, S-016). R14.0000 itself is status gap. 13 proposed register entries (`proposed-register/fence-1-EG-01..13.md`).

Two OR findings contradict the PDF and need owner attention:
1. E-17: the PDF says no source for rail breastworks on Cemetery Ridge. The OR documents them (Harrow, Joslin, Gibbon, Hancock, Curtis, Baxter, Davis, Patterson). The PDF text was not changed.
2. E-03 / S-015: the 123rd NY report puts its breastwork on the morning of Jul 2, not Jul 1.

Other conflicts carried, no default chosen: E-07 (Kane "before sundown"), E-10 (empty vs defended works), E-11 (rounds 227,000 / 250,000 / 277,000), E-14 (Fisher's brigade, Jul 3 morning, not Weed), S-006 (paling vs post-and-rail), FEN-evergreen-cemetery (OR dates cemetery fence damage Jul 3, not Jul 2).

Gaps: lunette form, traverse, Lockwood Jul 2, Confederate works other than Jul 3-4, all church and farm hospitals, McMillan fences.

No items remain unprocessed. Files: results.jsonl, lookups.jsonl, proposed-register/.

## Audit pass 2026-11-04

Slice check: expected R14.0000, E-01..E-18, S-001..S-016 (35); found exactly these, no missing, duplicate, out-of-slice or malformed rows. Status counts after audit: verified 24, inferred 5, failed_lookup 5, gap 1.

Fixes: (1) every source entry now also carries `quote`, `quote_verified` and `passage_ref` (character offsets in the raw OCR plus printed page), matching the sibling fence shards' schema; the original `exact_quote` and `offsets_in_raw_file` are kept. (2) Two conflicts that had no register entry now have one: E-07 Kane "before sundown" vs PDF morning (fence-1-EG-14) and E-10 empty vs defended works (fence-1-EG-15). Register entries: 15. No verified row lacked a citation.

own_checks (spot verification, second local witness; see limits):
- R14.E-10 Johnson, OR27-2-R481 p.504, "carried a line of breastworks which ran perpendicular": same report id, page and sentence in library/timeline_audit_T2.jsonl.
- R14.E-12 Hunt, OR27-1-R028 p.232, "had a small earthwork thrown up in its front": same in timeline_audit_T2.jsonl and positions_A.jsonl.
- R14.E-17 Gibbon, OR27-1-R098 p.416, "tore down the fences and constructed breastworks": same in timeline_audit_T3.jsonl.
Also 58 of 92 quotes in this shard reappear verbatim in local non-horde files. Verification limits of this audit (2026-11-04): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is NOT present in this checkout, so tools/bt/or27_find.py could not be re-run. The web proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; those lookups are recorded as failed for this pass, none circumvented. Spot checks therefore use independent local extractions of the same OR passages (docs/battle-theatre/library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A.jsonl and positions_B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and printed page. These are second local witnesses made by earlier sessions, not the raw scan.
