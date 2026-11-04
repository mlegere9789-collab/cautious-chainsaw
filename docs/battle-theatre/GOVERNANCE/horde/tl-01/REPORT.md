# REPORT shard tl-01 (timeline_seed.jsonl lines 1-57, rows T1-001 to T1-057)

Done: all 57 rows processed. Reused library/timeline_audit_T1.jsonl (cited per row), re-verified all 65 stored OR quotes by code (0 failures; 8 evidence items carry no stored quote), and re-read the OR text myself for the conflict rows and the rows closed or opened (see own_checks_this_pass). No shared file touched; nothing committed.

Counts: supported 10, supported_partial 25 (core fact supported, named sub-claims not in the OR), conflict 7 (T1-007, 020, 024, 032, 039, 046, 055), ambiguous_conflict 1 (T1-044), unsupported 5 (T1-005, 011, 013, 048, 050), not_testable_gap 9 (weather and open-gap rows). Status: verified 43, gap 11, inferred 2 (T1-022, 029), failed_lookup 1 (T1-013). Conflicts are carried as scenarios with both sources named; no default picked (proposed-register/tl-01-CONFLICTS.md also lists 4 range conflicts: T1-035, 036, 042, 043).

New findings: the OR closes T1-057 (Early to Heidlersburg) and partly T1-022/029 (OR Itinerary p.143); T1-017's Mummasburg camp is documented in OR; Heth's Sept 1863 report already says "shoes especially", against the row's 1877 note.

Gaps: 7 proposed register entries (tl-01-EG-001 to 007). Web lookups (6, recorded as tl-01-LK-*): Sandoe, Caledonia, Broadhead and LOC Jacobs failed (two HTTP 403, not circumvented). Jacobs 1864 via archive.org was read only through a fetch summary, so it is used as a lead (status inferred), not as verification.

Owner decisions: re-tier T1-017 and T1-057; PDF no-shoe correction for T1-043 vs Heth's report; approve acquiring Broadhead, Jacobs 1885 and 21st PA Cavalry sources.

Remaining items: none.

---


## Integrity audit (completes the stalled run)
Duplicates: none. The 6 extra lines in results.jsonl (tl-01-LK-01..06) are web-lookup records, not duplicate rows; moved unchanged to lookups.jsonl (results.jsonl now has exactly 57 rows T1-001..T1-057, one each). Canonical fields citation, passage_ref, tier (enum), tier_raw, status_raw added to every row; original fields kept.

Schema: every row now carries id, verdict, tier, citation, passage_ref, status, notes (plus the shard's original fields; tier_raw and status_raw keep the pre-audit values). `tier` is the audit-recommended tier; seed_tier is unchanged and any promotion above the seed is an owner/integrator decision. Rule applied: tier documented and status verified require both citation and passage_ref and an OR or primary citation; otherwise downgraded (rows changed are marked `audit_downgrade`). No row sets a default among conflicting sources (default_picked is empty everywhere).

## Counts
Rows: 57 (seed slice exact, 0 missing, 0 duplicate, 0 malformed).
Verdict: {'supported': 10, 'not_testable_gap': 9, 'supported_partial': 25, 'unsupported': 5, 'conflict': 7, 'ambiguous_conflict': 1}
Tier: {'documented': 42, 'open gap': 12, 'inferred': 3}
Status: {'verified': 43, 'gap': 11, 'failed_lookup': 1, 'inferred': 2}

## Conflicts carried as selectable scenarios, no default picked (13)
T1-007, T1-011, T1-020, T1-024, T1-032, T1-035, T1-036, T1-039, T1-042, T1-043, T1-044, T1-046, T1-055

## Gap and failed-lookup rows (12)
T1-003, T1-005, T1-011, T1-013, T1-018, T1-019, T1-023, T1-030, T1-040, T1-041, T1-048, T1-050

## Proposed register entries (8)
tl-01-CONFLICTS.md, tl-01-EG-001.md, tl-01-EG-002.md, tl-01-EG-003.md, tl-01-EG-004.md, tl-01-EG-005.md, tl-01-EG-006.md, tl-01-EG-007.md
Every gap, failed_lookup, unsupported and conflict row is named in a proposed-register entry here or points to an existing register/conflict_register entry (T1-066, 071, 073, 099, 104 in shard 2 point to register/EG-TL-T1-*.md and conflict_register C-040).

## own_checks (this audit pass)
Method and limit: the raw OR OCR (tmp/library/or27) is not present in this checkout, so or27_find.py cannot run and the original page text could not be re-read. Web access to archive.org and loc.gov is blocked (403, not circumvented). Checks made instead: (a) every cited OR report id exists in library/or27_index.json; (b) every cited printed page of a verified row lies inside that report's indexed page range: 65 of 65 cited pages; (c) quotes were searched in separate local extractions (library/timeline_audit_T*.jsonl, or27_claim_checks.json, history/positions/*.jsonl): found 64/64. Quotes not found are shard-verified only and are listed as not independently confirmed.
- T1-002 Stuart OR27-2-R565 p.692: report exists in or27_index.json (p.679-719); quotes 'At 1 o'clock at night, the brigades with noiseless march mov...' and 'rendezvoused secretly near Salem Depot' found in library/timeline_audit_T1.jsonl and history/positions/positions_D.jsonl (separate extractions): CONFIRMED.
- T1-006 Early OR27-2-R470 p.465 (index p.459-474) and Gordon R477 p.491: quotes found in the audit file and positions_D.jsonl: CONFIRMED.
- T1-015 Early R470 p.465: 'The cars, numbering 10 or 12, were burned...' and 'There were no railroad buildings of consequence' found: CONFIRMED.
- T1-020 Early R470 p.466: 'on the turnpike toward York at light next morning' and 'New Chester, Hampton, and East Berlin, toward Dover' found: CONFIRMED (and it is the basis of the T1-020 conflict).

## Owner-decision items
- Default view for each conflict listed above (PDF recommended defaults stay PENDING OWNER).
- Tier promotions or demotions relative to the seed tier recommended in the row notes.
- Approval to acquire primary sources for the gap rows (see proposed-register entries).
