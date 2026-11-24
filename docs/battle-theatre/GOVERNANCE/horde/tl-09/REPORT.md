# Shard tl-09 report: timeline rows T2-236 to T3-045 (seed lines 461-518, 58 rows)

Written by the 2026-11-04 audit of the stalled local run. All 58 rows are present in results.jsonl.

## Audit of results.jsonl
- Seed slice T2-236..T3-045: 58 ids; results rows 58; missing 0; duplicates 0; outside slice 0; malformed JSON lines 0.
- Schema: each shard's rows are internally uniform (shard-specific keys, as in tl-01..tl-06). A `norm` object (id, verdict, tier, citation, passage_ref, status, notes) was added to every row so shards can be read on one schema; no original key was removed.
- Verdict counts: {'supported': 11, 'gap': 13, 'partial': 10, 'conflict': 21, 'computed': 3}
- Status counts: {'verified': 38, 'gap': 15, 'inferred': 4, 'failed_lookup': 1}
- Tier counts (norm): {'documented': 36, 'plausible-procedural': 4, 'inferred': 18}
- Rule check (documented tier or verified status needs a citation and a passage_ref): 0 violations after the fixes below.

## Fixes made
- T3-044: proposed tier documented -> inferred (status failed_lookup)

## own_checks
Method of own_checks: the raw OR OCR (tmp/library/or27/, gitignored) is not present in this checkout, so tools/bt/or27_find.py cannot run here (FileNotFoundError, recorded). Each check below compares the row claim with the or_value/quote recorded for the same report id and printed page in library/timeline_audit_T*.jsonl (made earlier from the OCR) and confirms the report id, author and page range in library/or27_index.json. This is a consistency check against the project's own extraction, not a fresh read of the OCR; archive.org and loc.gov are blocked (HTTP 000/403) and were not circumvented.
- T2-245: Eshleman R466 p.434 (about midnight Alexander's order; eight Napoleons, two howitzers) matches the audit text.
- T3-020: Hunt R028 p.237 and Muhlenberg R314 p.870 (batteries F 4th and K 5th US posted 1 a.m., Rock Creek ravine) match audit text.
- T3-030: Eshleman p.434 left thrown back at daybreak, Dearing on his left: matches the audit record.
- T3-005: Greene R307 p.856 (four charges between 7 and 9.30 p.m.) matches the audit record.
- T3-012 (gap): Gregg R344 p.956 describes only the Jul 2 position and one skirmish: matches audit; gap status confirmed.

## Conflicts carried as scenarios (no default picked, Law cl.6): 21
T2-242, T2-243, T2-244, T3-002, T3-005, T3-006, T3-007, T3-011, T3-016, T3-017, T3-022, T3-023, T3-026, T3-029, T3-033, T3-037, T3-038, T3-039, T3-040, T3-041, T3-044

## Gaps and failed lookups: 16
T2-238, T2-239, T2-240, T2-248, T3-003, T3-010, T3-012, T3-013, T3-014, T3-015, T3-018, T3-019, T3-025, T3-031, T3-044, T3-045

## Proposed register entries: 25 files in proposed-register/ (including row-level tl-09-RG-* entries added by the audit where a gap or conflict row had none; rows already covered by GOVERNANCE/register/EG-TL-* files are cited there, not duplicated).

## Owner-decision items
- Default view for each conflict listed above (carried as scenarios; none picked).
- Open gaps in proposed-register/ pending owner Decision Log entries; none blocks the work.
- Raw OR OCR must be present in tmp/library/or27 to re-run or27_find.py verification for the own_checks.

Nothing committed; no shared file edited.


## Close-out 2026-11-24 (merged through tools/bt/merge_timeline_verification.py)

Rows 58; verdicts {'confirmed': 10, 'gap': 13, 'partially_supported': 31, 'corrected': 4}; scenarios carried on 24 rows (no default anywhere, Law cl.6). Promoted to verified (verdict confirmed, every sub-claim documented and supported, quotes cut verbatim from tmp/library/or27 and re-matched at their stored offsets, digits read on the page image of the scan PDF): T2-236, T2-237, T2-245, T2-247, T3-020, T3-030, T3-036, T3-043. Every other row stays seeded_unverified with its gaps visible in the `verification` block of timeline_seed.jsonl.

Quote check. tl-09 stored 95 anchor locators (char_offsets), not quoted passages: the text at every locator was read and stored in the citation (locator_text_read); the passages themselves are the shard's paraphrases and count as unsupported-as-quoted until cut verbatim, which the close-out did for the 8 promoted rows.

What was read: the shard notes, quotes and offsets against the local Official Records text (the 2026-11-04 audit had only compared them with its own library audit file because the OCR was absent); for each promoted row every element of the seed claim against the quoted text, and the digits (hours, ranges, yards) on the scan page image (tmp/kit-plan/or27-pdf, PDF page = leaf + 1; viewed 2026-11-24; the OCR errors found there are noted on the citations: Ritten-/Bitten-, Round/Eound, dayliglit). Rows with a conflict carry the values as scenarios taken from the shard notes; rows corrected: ['T2-244', 'T3-023', 'T3-026', 'T3-033']; rows unsupported: none.

Not done (said, not hidden): the page images were not read for rows that were not promoted; the shard paraphrases of tl-09 and tl-11 are not re-read passage by passage; no web page was fetched in this close-out (archive.org and loc.gov page requests are not repeated); register entries tl-09-CO-<id>.md in proposed-register/ are new for rows that had none (not yet integrated into register/). Builder and data: closeout/ of horde/tl-09 (build.py, spec.py, register_md.py, crop.py) rebuilds all four files; `python3 -I horde/tl-09/closeout/build.py --check-only`.
