# Shard tl-12 report: timeline rows T3-162 to T3-219 (seed lines 634-691)

Done: all 58 rows. Reused library/timeline_audit_T3.jsonl (every audit quote re-verified verbatim with tools/bt/or27_find.py, 0 failures), then spot-checked and extended with new OR searches and a few web lookups (9, listed in web_lookups.json; NCpedia returned HTTP 403 and was not circumvented).

Counts (results.jsonl): conflict 19, partially_supported 16, supported 9, not_primary_checkable 8, gap 6. Status: verified 41, gap 11, inferred 3, failed_lookup 3.

New against the audit:
- T3-176: the audit's NOT_FOUND is now a conflict: Capt. Jones, 1st NY Cav, near Greencastle Jul 5 (Couch, Pierce): 90/100 wagons, 500-653 prisoners vs row 134 wagons.
- T3-192: OR chronology confirms Humphreys announced Chief of Staff Jul 8.
- T3-209: Jul 16 date confirmed (Gregg p959, Pleasonton p917).
- T3-165: moonrise/alt/az match the project ephemeris; the row's 68% end illumination does not (about 75%).
- T3-172: NPS says Armistead died the day after wounding (Jul 4), not Jul 5.
- T3-178: Pendleton p353 contradicts a Jul 5 20:00 Imboden departure.
- T3-214: Meade's Manassas Gap dateline is Jul 23, Front Royal date unresolved.

Gaps: 20 proposed register entries in proposed-register/ (tl-12-EG-01..20); existing EG-TL-T3-179/184/185/187/201/134 cited, not duplicated. Camp Letterman and post-battle rows (T3-196, 211-218) have no primary source retrieved; NPS essay figures failed lookup.

Owner decisions needed: default views for the 19 conflicts (carried as scenarios, none picked); whether to close EG-TL-T3-201 (Lee p323 documents the rebuilt bridge) and narrow EG-TL-T3-184 (itinerary gives corps level). No shared file was edited; not committed.


---

## Audit 2026-11-04 (tl-07..tl-12 audit pass)

## Audit of results.jsonl
- Seed slice T3-162..T3-219: 58 ids; results rows 58; missing 0; duplicates 0; outside slice 0; malformed JSON lines 0.
- Schema: each shard's rows are internally uniform (shard-specific keys, as in tl-01..tl-06). A `norm` object (id, verdict, tier, citation, passage_ref, status, notes) was added to every row so shards can be read on one schema; no original key was removed.
- Verdict counts: {'partially_supported': 16, 'supported': 9, 'not_primary_checkable': 8, 'conflict': 19, 'gap': 6}
- Status counts: {'verified': 41, 'gap': 11, 'inferred': 3, 'failed_lookup': 3}
- Tier counts (norm): {'documented': 41, 'inferred': 16, 'plausible-procedural': 1}
- Rule check (documented tier or verified status needs a citation and a passage_ref): 0 violations after the fixes below.

## Fixes made
- T3-163, T3-174, T3-180, T3-191, T3-193: verified/documented rows had empty supporting_passage_refs; filled from the audit record
- T3-211, T3-218: tier documented -> inferred (status inferred, no primary; NPS dates support one scenario only)

## own_checks
Method of own_checks: the raw OR OCR (tmp/library/or27/, gitignored) is not present in this checkout, so tools/bt/or27_find.py cannot run here (FileNotFoundError, recorded). Each check below compares the row claim with the or_value/quote recorded for the same report id and printed page in library/timeline_audit_T*.jsonl (made earlier from the OCR) and confirms the report id, author and page range in library/or27_index.json. This is a consistency check against the project's own extraction, not a fresh read of the OCR; archive.org and loc.gov are blocked (HTTP 000/403) and were not circumvented.
- T3-168: Capehart R367 p.1019 (night charge on the wagon train, 300 wagons) and Kilpatrick R359 p.994 match the audit text and the row notes.
- T3-172: Webb R104 p.428 (Armistead mortally wounded within lines) and Letterman R016 p.196 (tents not available until Jul 5) match audit text.
- T3-175: Kilpatrick R359 pp.994-995 (columns seen 5 p.m., battery 5.30, Boonsborough 10 p.m.) and Richmond R362 p.1006 match audit text.
- T3-169: Kilpatrick R359 p.994 (Smithsburg 9 a.m. Jul 5 with 1,360 prisoners), Capehart p.1019, Stuart pp.700-701 match audit text.

## Conflicts carried as scenarios (no default picked, Law cl.6): 19
T3-165, T3-169, T3-172, T3-175, T3-176, T3-178, T3-186, T3-188, T3-190, T3-191, T3-195, T3-198, T3-199, T3-203, T3-204, T3-207, T3-211, T3-218, T3-219

## Gaps and failed lookups: 14
T3-164, T3-166, T3-167, T3-170, T3-173, T3-179, T3-185, T3-187, T3-196, T3-197, T3-213, T3-215, T3-216, T3-217

## Proposed register entries: 21 files in proposed-register/ (including row-level tl-12-RG-* entries added by the audit where a gap or conflict row had none; rows already covered by GOVERNANCE/register/EG-TL-* files are cited there, not duplicated).

## Owner-decision items
- Default view for each conflict listed above (carried as scenarios; none picked).
- Open gaps in proposed-register/ pending owner Decision Log entries; none blocks the work.
- Raw OR OCR must be present in tmp/library/or27 to re-run or27_find.py verification for the own_checks.

Nothing committed; no shared file edited.
