# REPORT shard tl-04 (rows T1-173 to T2-005, 58 rows)

## Integrity audit (completes the stalled run)
No missing, duplicate or malformed rows. Canonical citation/passage_ref derived from the evidence list. T1-188 and T1-225 tier lowered documented to inferred (only web or project-computation evidence, no OR or primary); T1-173 inferred (railroad-cut target unsupported). Computed rows (T1-189, 190, 193, 195, 196, 223, 224) are tier inferred; they cite a project computation file, not a historical source.

Schema: every row now carries id, verdict, tier, citation, passage_ref, status, notes (plus the shard's original fields; tier_raw and status_raw keep the pre-audit values). `tier` is the audit-recommended tier; seed_tier is unchanged and any promotion above the seed is an owner/integrator decision. Rule applied: tier documented and status verified require both citation and passage_ref and an OR or primary citation; otherwise downgraded (rows changed are marked `audit_downgrade`). No row sets a default among conflicting sources (default_picked is empty everywhere).

## Counts
Rows: 58 (seed slice exact, 0 missing, 0 duplicate, 0 malformed).
Verdict: {'supported_partial': 12, 'supported': 11, 'conflict': 16, 'unsupported_gap': 10, 'computed_verified': 7, 'not_testable': 1, 'gap_partly_closed': 1}
Tier: {'inferred': 18, 'documented': 30, 'open gap': 9, 'plausible-procedural': 1}
Status: {'verified': 45, 'gap': 11, 'inferred': 2}

## Conflicts carried as selectable scenarios, no default picked (16)
T1-176, T1-177, T1-182, T1-184, T1-187, T1-188, T1-192, T1-198, T1-199, T1-200, T1-201, T1-220, T1-222, T1-225, T2-001, T2-005

## Gap and failed-lookup rows (11)
T1-183, T1-194, T1-197, T1-203, T1-207, T1-208, T1-213, T1-214, T1-217, T1-218, T2-003

## Proposed register entries (21)
EG-TL04-001.md, EG-TL04-002.md, EG-TL04-003.md, EG-TL04-004.md, EG-TL04-005.md, EG-TL04-006.md, EG-TL04-007.md, EG-TL04-008.md, EG-TL04-009.md, EG-TL04-010.md, EG-TL04-011.md, EG-TL04-012.md, EG-TL04-013.md, EG-TL04-014.md, EG-TL04-015.md, EG-TL04-016.md, EG-TL04-017.md, EG-TL04-018.md, EG-TL04-019.md, EG-TL04-020.md, EG-TL04-021.md
Every gap, failed_lookup, unsupported and conflict row is named in a proposed-register entry here or points to an existing register/conflict_register entry (T1-066, 071, 073, 099, 104 in shard 2 point to register/EG-TL-T1-*.md and conflict_register C-040).

## own_checks (this audit pass)
Method and limit: the raw OR OCR (tmp/library/or27) is not present in this checkout, so or27_find.py cannot run and the original page text could not be re-read. Web access to archive.org and loc.gov is blocked (403, not circumvented). Checks made instead: (a) every cited OR report id exists in library/or27_index.json; (b) every cited printed page of a verified row lies inside that report's indexed page range: 74 of 74 cited pages; (c) quotes were searched in separate local extractions (library/timeline_audit_T*.jsonl, or27_claim_checks.json, history/positions/*.jsonl): found 65/81. Quotes not found are shard-verified only and are listed as not independently confirmed.
- T1-176 Geary R293 p.825 (index 824-835): 'at about 3 p. m. advanced rapidly on the road to the town' found in positions_B.jsonl: CONFIRMED; Hancock R076 p.368 (index 366-379): 'ordered the division to the high ground to the right of and near' found: CONFIRMED.
- T1-200 Geary p.825: 'At 5 a. m. on the 2d' and 'As soon as we were in position, we began to intrench ourselves' found in both audit files: CONFIRMED.
- T1-173 Wiedrich R265 p.751: 'about 5 p. m., our infantry, which had advanced through the...' found: CONFIRMED; second quote ('opened with shells on their columns with good effect') not found elsewhere: NOT INDEPENDENTLY CONFIRMED here. Row downgraded to inferred (railroad-cut target unsupported).
- T1-177 Hancock: 'About 7 p. m. Generals Slocum and Sickles arrived at the cem...' found in positions_B.jsonl: CONFIRMED; 'Between 5 and 6 o'clock, my dispositions having been complet...' not found elsewhere: NOT INDEPENDENTLY CONFIRMED here.

## Owner-decision items
- Default view for each conflict listed above (PDF recommended defaults stay PENDING OWNER).
- Tier promotions or demotions relative to the seed tier recommended in the row notes.
- Approval to acquire primary sources for the gap rows (see proposed-register entries).
