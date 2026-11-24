# Shard tl-11 report: timeline rows T3-103 to T3-161 (seed lines 576-633, 58 rows)

Written by the 2026-11-04 audit of the stalled local run. All 58 rows are present in results.jsonl.

## Audit of results.jsonl
- Seed slice T3-103..T3-161: 58 ids; results rows 58; missing 0; duplicates 0; outside slice 0; malformed JSON lines 0.
- Schema: each shard's rows are internally uniform (shard-specific keys, as in tl-01..tl-06). A `norm` object (id, verdict, tier, citation, passage_ref, status, notes) was added to every row so shards can be read on one schema; no original key was removed.
- Verdict counts: {'conflict': 15, 'supported': 14, 'partial': 11, 'gap': 13, 'inferred': 1, 'computed': 2, 'procedural': 2}
- Status counts: {'verified': 38, 'gap': 16, 'failed_lookup': 3, 'inferred': 1}
- Tier counts (norm): {'documented': 34, 'inferred': 15, 'open gap': 6, 'plausible/inferred': 1, 'plausible-procedural': 2}
- Rule check (documented tier or verified status needs a citation and a passage_ref): 0 violations after the fixes below.

## Fixes made
- T3-105: verified row had passage_ref 'not re-read in full'; passage_ref filled from the audit record and compared
- T3-122: tier documented (components) -> inferred (open gap), status failed_lookup
- T3-103: source label 'pt.2 R120 Sawyer' corrected to pt.1 (OR27-1-R120, p.461)

## own_checks
Method of own_checks: the raw OR OCR (tmp/library/or27/, gitignored) is not present in this checkout, so tools/bt/or27_find.py cannot run here (FileNotFoundError, recorded). Each check below compares the row claim with the or_value/quote recorded for the same report id and printed page in library/timeline_audit_T*.jsonl (made earlier from the OCR) and confirms the report id, author and page range in library/or27_index.json. This is a consistency check against the project's own extraction, not a fresh read of the OCR; archive.org and loc.gov are blocked (HTTP 000/403) and were not circumvented.
- T3-112: Webb R104 p.428 (Armistead over the fence with probably over 100; 71st PA driven; 42 dead) and Hall R109 p.440 match audit text.
- T3-130: Cabell R435 p.378 (12 killed, 30 wounded, 67 horses killed, 13 disabled) and Alexander R464 p.430 (19/114/6) match audit text.
- T3-120: Capehart R367 p.1019 (5 killed, 4 wounded) and Richmond R362 p.1005 (brigade 17 killed enlisted, 26 wounded) match audit text.
- T3-105: Hunt R028 p.239, Hancock R076 p.373, Osborn R264 p.750 match the audit records (was verified with no passage_ref; passage_ref now filled).
- T3-140 (gap): Curtis R112 p.450 and Maulsby R283 p.806: night not clearly Jul 3; matches audit.

## Conflicts carried as scenarios (no default picked, Law cl.6): 15
T3-103, T3-109, T3-112, T3-114, T3-120, T3-122, T3-132, T3-134, T3-136, T3-139, T3-144, T3-145, T3-150, T3-154, T3-158

## Gaps and failed lookups: 19
T3-110, T3-113, T3-116, T3-121, T3-122, T3-126, T3-128, T3-129, T3-132, T3-137, T3-139, T3-140, T3-142, T3-143, T3-146, T3-148, T3-150, T3-153, T3-161

## Proposed register entries: 24 files in proposed-register/ (including row-level tl-11-RG-* entries added by the audit where a gap or conflict row had none; rows already covered by GOVERNANCE/register/EG-TL-* files are cited there, not duplicated).

## Owner-decision items
- Default view for each conflict listed above (carried as scenarios; none picked).
- Open gaps in proposed-register/ pending owner Decision Log entries; none blocks the work.
- Raw OR OCR must be present in tmp/library/or27 to re-run or27_find.py verification for the own_checks.

Nothing committed; no shared file edited.


## Close-out 2026-11-24 (merged through tools/bt/merge_timeline_verification.py)

Rows 58; verdicts {'partially_supported': 39, 'gap': 16, 'confirmed': 3}; scenarios carried on 18 rows (no default anywhere, Law cl.6). Promoted to verified (verdict confirmed, every sub-claim documented and supported, quotes cut verbatim from tmp/library/or27 and re-matched at their stored offsets, digits read on the page image of the scan PDF): T3-118 (T3-135 and T3-141 are recomputations: verdict confirmed, but tier inferred and COMPUTED is not a source, so they stay unverified). Every other row stays seeded_unverified with its gaps visible in the `verification` block of timeline_seed.jsonl.

Quote check. 26 --verify phrases of the shard: 26 matched verbatim. 11 rows quote nothing (audit-record references only): their paraphrases were not re-read and are not used.

What was read: the shard notes, quotes and offsets against the local Official Records text (the 2026-11-04 audit had only compared them with its own library audit file because the OCR was absent); for each promoted row every element of the seed claim against the quoted text, and the digits (hours, ranges, yards) on the scan page image (tmp/kit-plan/or27-pdf, PDF page = leaf + 1; viewed 2026-11-24; the OCR errors found there are noted on the citations: Ritten-/Bitten-, Round/Eound, dayliglit). Rows with a conflict carry the values as scenarios taken from the shard notes; rows corrected: none; rows unsupported: none.

Not done (said, not hidden): the page images were not read for rows that were not promoted; the shard paraphrases of tl-09 and tl-11 are not re-read passage by passage; no web page was fetched in this close-out (archive.org and loc.gov page requests are not repeated); register entries tl-11-CO-<id>.md in proposed-register/ are new for rows that had none (not yet integrated into register/). Builder and data: closeout/ of horde/tl-09 (build.py, spec.py, register_md.py, crop.py) rebuilds all four files; `python3 -I horde/tl-09/closeout/build.py --check-only`.
