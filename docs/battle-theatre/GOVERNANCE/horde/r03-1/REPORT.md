# Shard r03-1 REPORT (R03.0000 and R03.C-001..C-023, 24 items)

Resumed after an interrupted first pass; all 24 items are finished. Nothing was seen in a browser; no shared file was edited.

**Counts (results.jsonl):** verified 13, inferred 4 (C-006, C-008, C-011, C-013), gap 6 (R03.0000, C-005, C-007, C-016, C-018, C-023), failed_lookup 1 (C-012). Item status is the best supported value; the tier text inside each row separates documented, inferred and gap values.

**Done this resume:** wrote 11 proposed register entries (proposed-register/r03-1-EG-01..11), the lookup log (lookups.jsonl) and this report; re-ran five Official Records quotes (all found); read Longstreet's 1896 memoir as raw Gutenberg text (replacing the earlier summarising-tool reading). That gives C-006 a direct source for "stars shining", C-008 an 11:00 memoir source (single witness, inferred), and shows Hood/McLaws at sunrise in the memoir against Kershaw's OR "left camp about sunrise" (C-005, C-007): a source conflict, carried, not resolved.

**Gaps:** no source for the plan's clocks in C-005, C-007, C-023, nor for C-012 (10/15 minutes; a web search for Law's essay failed), C-014 floor 218, C-015 385, C-016 place, C-018 attribution. The first-pass web log was lost (stated in EG-11).

**Owner decisions needed:** defaults of C-001..C-023 (all pending); add OR-only values as selectable scenarios (EG-02); unsupported defaults C-002, C-009, C-020, C-022 (EG-03); single-memoir 11:00 for C-008; DEC-003 accuracy wording (product text in R03.0000; never "100%"). R03.0000 passes must stay false.

**Remaining items:** none.

## Audit pass 2026-11-04

Slice check: expected R03.0000 and C-001..C-023 (24); found exactly these. Counts unchanged (verified 13, inferred 4, gap 6, failed_lookup 1). All 24 rows link to register entries r03-1-EG-01..11 or are verified. Added `source_citation` and `supporting_passage_ref` (built from the citations list) to match r03-2.

own_checks:
- C-010 Hunt, OR27-1-R028 p.234, "About 2 p. m. General Sickles formed his corps in line": found in library/or27_claim_checks.json with record, page and offsets.
- C-001 Meade, OR27-1-R006 p.115, "arriving there at 1 a. m. of the 2d": found in tests/historian/fixtures/golden-or27.json.
- C-021 Lee, OR27-2-R426 p.308, "Pickett's division, not yet relieved from duty at Chambersburg": found in positions_D.jsonl and or27_claim_checks.json.
Also 60 of 74 quotes reappear locally. Verification limits of this audit (2026-11-04): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is NOT present in this checkout, so tools/bt/or27_find.py could not be re-run. The web proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; those lookups are recorded as failed for this pass, none circumvented. Spot checks therefore use independent local extractions of the same OR passages (docs/battle-theatre/library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A.jsonl and positions_B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and printed page. These are second local witnesses made by earlier sessions, not the raw scan.
