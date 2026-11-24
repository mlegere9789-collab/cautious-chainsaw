# Shard tl-10 report: timeline rows T3-046 to T3-102 (seed lines 519-575, 57 rows)

Written by the 2026-11-04 audit of the stalled local run. All 57 rows are present in results.jsonl.

## Audit of results.jsonl
- Seed slice T3-046..T3-102: 57 ids; results rows 57; missing 0; duplicates 0; outside slice 0; malformed JSON lines 0.
- Schema: each shard's rows are internally uniform (shard-specific keys, as in tl-01..tl-06). A `norm` object (id, verdict, tier, citation, passage_ref, status, notes) was added to every row so shards can be read on one schema; no original key was removed.
- Verdict counts: {'gap': 12, 'supported': 11, 'partial': 16, 'conflict': 15, 'inferred_model': 3}
- Status counts: {'gap': 9, 'verified': 41, 'failed_lookup': 3, 'inferred': 4}
- Tier counts (norm): {'inferred': 20, 'documented': 37}
- Rule check (documented tier or verified status needs a citation and a passage_ref): 0 violations after the fixes below.

## Fixes made
- none needed

## own_checks
Method of own_checks: the raw OR OCR (tmp/library/or27/, gitignored) is not present in this checkout, so tools/bt/or27_find.py cannot run here (FileNotFoundError, recorded). Each check below compares the row claim with the or_value/quote recorded for the same report id and printed page in library/timeline_audit_T*.jsonl (made earlier from the OCR) and confirms the report id, author and page range in library/or27_index.json. This is a consistency check against the project's own extraction, not a fresh read of the OCR; archive.org and loc.gov are blocked (HTTP 000/403) and were not circumvented.
- T3-055: Smyth R123 p.465 and Ellis R124 p.467 (buildings burned by Hays's order before the 2 p.m. cannonade) match the audit text.
- T3-060: Ruger R273 p.781 ('mistake of the staff officer') and Slocum R271 p.761 (no hill-watching statement) match the audit text.
- T3-080: Hunt R028 p.239 (on Round Top with Lt. Rittenhouse when the enemy opened about 1 p.m.) matches the audit text.
- T3-090 (gap): Letterman R016 p.197 (13 medical officers wounded, one died Jul 6, unnamed; no hospital sites) matches the audit text; gap status confirmed.

## Conflicts carried as scenarios (no default picked, Law cl.6): 15
T3-054, T3-058, T3-062, T3-069, T3-070, T3-075, T3-079, T3-085, T3-089, T3-093, T3-094, T3-097, T3-099, T3-100, T3-101

## Gaps and failed lookups: 12
T3-046, T3-048, T3-051, T3-063, T3-065, T3-067, T3-071, T3-072, T3-082, T3-087, T3-090, T3-095

## Proposed register entries: 24 files in proposed-register/ (including row-level tl-10-RG-* entries added by the audit where a gap or conflict row had none; rows already covered by GOVERNANCE/register/EG-TL-* files are cited there, not duplicated).

## Owner-decision items
- Default view for each conflict listed above (carried as scenarios; none picked).
- Open gaps in proposed-register/ pending owner Decision Log entries; none blocks the work.
- Raw OR OCR must be present in tmp/library/or27 to re-run or27_find.py verification for the own_checks.

Nothing committed; no shared file edited.


## Close-out 2026-11-24 (merged through tools/bt/merge_timeline_verification.py)

Rows 57; verdicts {'gap': 15, 'partially_supported': 39, 'confirmed': 3}; scenarios carried on 18 rows (no default anywhere, Law cl.6). Promoted to verified (verdict confirmed, every sub-claim documented and supported, quotes cut verbatim from tmp/library/or27 and re-matched at their stored offsets, digits read on the page image of the scan PDF): T3-056, T3-080, T3-096. Every other row stays seeded_unverified with its gaps visible in the `verification` block of timeline_seed.jsonl.

Quote check. 60 quoted strings in supporting_passage: 42 matched verbatim, 11 only after ignoring case, punctuation and spacing (OCR spacing, ellipses), 7 not matched (T3-049 two non-quote strings, T3-066 a condensed quote whose text reads "ordered a column of attack to be formed of Pickett's, Heth's, and part of Pender's divisions", T3-074 and T3-093 OCR differences ("gtms", "Ahout"), T3-101 a fragment "some 50 or 60 yards behind and to the right" and a non-quote string).

What was read: the shard notes, quotes and offsets against the local Official Records text (the 2026-11-04 audit had only compared them with its own library audit file because the OCR was absent); for each promoted row every element of the seed claim against the quoted text, and the digits (hours, ranges, yards) on the scan page image (tmp/kit-plan/or27-pdf, PDF page = leaf + 1; viewed 2026-11-24; the OCR errors found there are noted on the citations: Ritten-/Bitten-, Round/Eound, dayliglit). Rows with a conflict carry the values as scenarios taken from the shard notes; rows corrected: none; rows unsupported: none.

Not done (said, not hidden): the page images were not read for rows that were not promoted; the shard paraphrases of tl-09 and tl-11 are not re-read passage by passage; no web page was fetched in this close-out (archive.org and loc.gov page requests are not repeated); register entries tl-10-CO-<id>.md in proposed-register/ are new for rows that had none (not yet integrated into register/). Builder and data: closeout/ of horde/tl-09 (build.py, spec.py, register_md.py, crop.py) rebuilds all four files; `python3 -I horde/tl-09/closeout/build.py --check-only`.
