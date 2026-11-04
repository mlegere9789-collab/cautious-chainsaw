# Shard tl-07 report: timeline rows T2-121 to T2-178 (seed lines 346-403, 58 rows)

Written by the 2026-11-04 audit of the stalled local run. All 58 rows are present in results.jsonl.

## Audit of results.jsonl
- Seed slice T2-121..T2-178: 58 ids; results rows 58; missing 0; duplicates 0; outside slice 0; malformed JSON lines 0.
- Schema: each shard's rows are internally uniform (shard-specific keys, as in tl-01..tl-06). A `norm` object (id, verdict, tier, citation, passage_ref, status, notes) was added to every row so shards can be read on one schema; no original key was removed.
- Verdict counts: {'gap': 4, 'not_an_or_claim': 1, 'supported_partial': 40, 'supported': 3, 'supported_participant_memoir': 1, 'conflict': 8, 'computed_verified': 1}
- Status counts: {'gap': 5, 'inferred': 6, 'verified': 47}
- Tier counts (norm): {'open-gap': 5, 'plausible-procedural': 1, 'documented': 46, 'inferred': 6}
- Rule check (documented tier or verified status needs a citation and a passage_ref): 0 violations after the fixes below.

## Fixes made
- T2-128: documented/verified -> inferred/inferred (empty citations, memoir read through a summarizer, verbatim check pending); new entry tl-07-EG-07
- T2-135: citation (project ephemeris) added to the computed row

## own_checks
Method of own_checks: the raw OR OCR (tmp/library/or27/, gitignored) is not present in this checkout, so tools/bt/or27_find.py cannot run here (FileNotFoundError, recorded). Each check below compares the row claim with the or_value/quote recorded for the same report id and printed page in library/timeline_audit_T*.jsonl (made earlier from the OCR) and confirms the report id, author and page range in library/or27_index.json. This is a consistency check against the project's own extraction, not a fresh read of the OCR; archive.org and loc.gov are blocked (HTTP 000/403) and were not circumvented.
- T2-141: row (Longstreet R430 p.359, Hood severely wounded soon after getting under fire) matches the audit-recorded OR text of OR27-2-R430 p.359: 'General Hood received a severe wound soon after getting under fire'. Index: R430 Longstreet.
- T2-147: row (Ward R135 p.493, no fire beyond 200 yards, volley at that range) matches audit text of OR27-1-R135 p.493.
- T2-164: row (Wheeler R266 p.753, ammunition exhausted about 5.30 p.m., relieved) matches audit quote 'At about 5.30 p. m. my ammunition became exhausted'.
- T2-170: row (Birney R133 p.483, at 6 o'clock found Sickles wounded, took command) matches audit quote; Hancock R076 p.370 matches audit paraphrase.
- T2-123: row (Robertson left of Law, R452 p.404; Benning behind, R458 p.415) matches the audit text of both records.

## Conflicts carried as scenarios (no default picked, Law cl.6): 8
T2-132, T2-134, T2-146, T2-156, T2-159, T2-161, T2-174, T2-176

## Gaps and failed lookups: 5
T2-121, T2-133, T2-148, T2-176, T2-178

## Proposed register entries: 8 files in proposed-register/ (including row-level tl-07-RG-* entries added by the audit where a gap or conflict row had none; rows already covered by GOVERNANCE/register/EG-TL-* files are cited there, not duplicated).

## Owner-decision items
- Default view for each conflict listed above (carried as scenarios; none picked).
- Open gaps in proposed-register/ pending owner Decision Log entries; none blocks the work.
- Raw OR OCR must be present in tmp/library/or27 to re-run or27_find.py verification for the own_checks.

Nothing committed; no shared file edited.
