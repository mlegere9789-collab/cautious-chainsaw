# REPORT shard fence-3 (R14 sub-requirements 72-107 = R14.S-053 to R14.S-088, 36 rows)

Done: all 36 items processed; results.jsonl has 36 records; 10 proposed register entries (fence-3-EG-001..010); lookups.jsonl lists 20 lookups including 4 failures. No shared file edited, nothing committed.

Method: each row classed by fence relevance: direct 8 (S-055, 059, 062, 063, 068, 082, 083, 084), indirect 5 (S-054, 056, 058, 075, 079), none 23. OR27 text searched (276 "fence" hits plus name searches); 27 quotes re-verified with or27_find.py --verify.

Status counts: verified 21 (mostly "no fence claim" classifications; S-058 Cushing wall and S-063 Brian carry real support), inferred 3, gap 11, failed_lookup 1.

Findings:
- S-062: "Intact morning Jul 3" is contradicted in part by Jul 2 pull-downs and fence clearing (Gibbon, Harrow, Hancock, Joslin, Meade, Humphreys, Higgins, Bodine); Peyton p.386 and Shepard p.647 confirm fences obstructed the Jul 3 advance.
- S-063: Sherfy 1972 (NPS) supports removal Jul 1-3 and 195 panels claimed; Warren and Cope maps disagree on materials.
- S-059: NPS supports rails burned, not the 13:00-15:00 window.
- S-055 Rummel, S-068 Klingle: no non-lead support.
- S-082..084: an iron fence in 1863 is in conflict and unsupported.

Failed lookups (not circumvented): Hessler excerpt (over 10 MB), HMDB (403), LOC item (403), pdftoppm missing.

Owner decisions: selectable scenarios for S-062 and S-063 (no default chosen); accept inferred marking for Rummel, Klingle, Cemetery fences. Remaining: none unprocessed; follow-up needed for S-062 (Hessler), S-068, S-075 (photo view).

## Audit pass 2026-11-04

Slice check: expected S-053..S-088 (36); found exactly these. Status counts: verified 21, inferred 3, gap 11, failed_lookup 1. Register entries 10 (fence-3-EG-001..010), every gap and failed_lookup row links to one.

Fixes: 19 verified rows had source_citation "None needed." The citation is now the PDF B.8.7 schedule row with its plan-clean.txt line and page, and the passage_ref names the line; the status verified means a negative row-content check (the row prints no fence state), not a historical claim, and an `audit_note` says so. S-075 was failed_lookup but carried a "documented" tier; tier lowered to n/a (nothing verified).

own_checks:
- S-056 Williams, OR27-1-R272 p.773, "A thick stone fence parallel to the ridge" (via "construction of log breastworks along the entire crest"): same report and page in history/positions/positions_B.jsonl.
- S-058 Smith, OR27-1-R106 p.432, "protected by a stone wall from an infantry attack": same in positions_B.jsonl.
- S-056 Candy, OR27-1-R294 p.836, 147th PA "occupied a stone fence in front of the enemy": same in positions_B.jsonl.
Verification limits of this audit (2026-11-04): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is NOT present in this checkout, so tools/bt/or27_find.py could not be re-run. The web proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; those lookups are recorded as failed for this pass, none circumvented. Spot checks therefore use independent local extractions of the same OR passages (docs/battle-theatre/library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A.jsonl and positions_B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and printed page. These are second local witnesses made by earlier sessions, not the raw scan.
