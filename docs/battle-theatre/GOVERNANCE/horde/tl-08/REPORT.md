# Shard tl-08 report: timeline rows T2-179 to T2-235 (seed lines 404-460, 57 rows)

Written by the 2026-11-04 audit of the stalled local run. All 57 rows are present in results.jsonl.

## Audit of results.jsonl
- Seed slice T2-179..T2-235: 57 ids; results rows 57; missing 0; duplicates 0; outside slice 0; malformed JSON lines 0.
- Schema: each shard's rows are internally uniform (shard-specific keys, as in tl-01..tl-06). A `norm` object (id, verdict, tier, citation, passage_ref, status, notes) was added to every row so shards can be read on one schema; no original key was removed.
- Verdict counts: {'unsupported': 8, 'partial': 31, 'conflict': 7, 'computed': 4, 'supported': 5, 'not_primary': 2}
- Status counts: {'gap': 7, 'verified': 46, 'inferred': 2, 'failed_lookup': 2}
- Tier counts (norm): {'inferred': 13, 'documented': 39, 'plausible-procedural': 3, 'open gap': 2}
- Rule check (documented tier or verified status needs a citation and a passage_ref): 0 violations after the fixes below.

## Fixes made
- T2-213: tier_recommended documented -> inferred (status inferred; only computed moonrise)

## own_checks
Method of own_checks: the raw OR OCR (tmp/library/or27/, gitignored) is not present in this checkout, so tools/bt/or27_find.py cannot run here (FileNotFoundError, recorded). Each check below compares the row claim with the or_value/quote recorded for the same report id and printed page in library/timeline_audit_T*.jsonl (made earlier from the OCR) and confirms the report id, author and page range in library/or27_index.json. This is a consistency check against the project's own extraction, not a fresh read of the OCR; archive.org and loc.gov are blocked (HTTP 000/403) and were not circumvented.
- T2-181: Greene R307 p.856 (6.30 p.m. works left unoccupied) and Johnson R481 p.504 (Steuart carried breastworks) match the audit-recorded OR text.
- T2-186: Mahone R538 p.621 (skirmishers only) and Posey R546 p.633 (two regiments as skirmishers) match audit text; index pages 633-634 contain the cite.
- T2-193: Crawford R218 p.653 (McCandless charge down the slope to the wheat-field) matches audit text.
- T2-200: Stuart R565 pp.697-698 (advance reached Gettysburg Jul 2; Jenkins wounded the day previous, Ferguson commanding) matches the audit quotes.

## Conflicts carried as scenarios (no default picked, Law cl.6): 7
T2-185, T2-199, T2-211, T2-216, T2-230, T2-234, T2-235

## Gaps and failed lookups: 9
T2-179, T2-217, T2-218, T2-219, T2-220, T2-221, T2-225, T2-226, T2-227

## Proposed register entries: 19 files in proposed-register/ (including row-level tl-08-RG-* entries added by the audit where a gap or conflict row had none; rows already covered by GOVERNANCE/register/EG-TL-* files are cited there, not duplicated).

## Owner-decision items
- Default view for each conflict listed above (carried as scenarios; none picked).
- Open gaps in proposed-register/ pending owner Decision Log entries; none blocks the work.
- Raw OR OCR must be present in tmp/library/or27 to re-run or27_find.py verification for the own_checks.

Nothing committed; no shared file edited.
