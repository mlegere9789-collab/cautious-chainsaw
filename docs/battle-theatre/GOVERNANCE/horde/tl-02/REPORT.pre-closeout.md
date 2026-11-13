# REPORT shard tl-02 (rows T1-058 to T1-115, 58 rows)

## Integrity audit (completes the stalled run)
No missing, duplicate or malformed rows. Canonical fields added. T1-068, T1-070 (computed from the repo ephemeris, no source passage) and T1-105 (procedural, asserts no fact) had status verified without citation or passage_ref: status lowered to inferred, status_raw keeps the original. T1-075 (documented tier, sky claim unsupported) tier lowered to inferred. T1-091, 093, 114, 083 (documented tier, status gap) tier lowered to open gap.

Schema: every row now carries id, verdict, tier, citation, passage_ref, status, notes (plus the shard's original fields; tier_raw and status_raw keep the pre-audit values). `tier` is the audit-recommended tier; seed_tier is unchanged and any promotion above the seed is an owner/integrator decision. Rule applied: tier documented and status verified require both citation and passage_ref and an OR or primary citation; otherwise downgraded (rows changed are marked `audit_downgrade`). No row sets a default among conflicting sources (default_picked is empty everywhere).

## Counts
Rows: 58 (seed slice exact, 0 missing, 0 duplicate, 0 malformed).
Verdict: {'partial': 27, 'supported': 7, 'conflict': 8, 'gap_closable': 1, 'gap_open': 4, 'computed': 4, 'procedural': 2, 'unsupported': 5}
Tier: {'documented': 37, 'inferred': 10, 'open gap': 9, 'plausible-procedural': 2}
Status: {'verified': 39, 'inferred': 10, 'gap': 8, 'failed_lookup': 1}

## Conflicts carried as selectable scenarios, no default picked (9)
T1-061, T1-082, T1-084, T1-089, T1-090, T1-094, T1-099, T1-100, T1-106

## Gap and failed-lookup rows (9)
T1-067, T1-071, T1-073, T1-083, T1-091, T1-092, T1-093, T1-104, T1-114

## Proposed register entries (13)
tl-02-EG-001.md, tl-02-EG-002.md, tl-02-EG-003.md, tl-02-EG-004.md, tl-02-EG-005.md, tl-02-EG-006.md, tl-02-EG-007.md, tl-02-EG-008.md, tl-02-EG-009.md, tl-02-EG-010.md, tl-02-EG-011.md, tl-02-EG-012.md, tl-02-EG-013.md
Every gap, failed_lookup, unsupported and conflict row is named in a proposed-register entry here or points to an existing register/conflict_register entry (T1-066, 071, 073, 099, 104 in shard 2 point to register/EG-TL-T1-*.md and conflict_register C-040).

## own_checks (this audit pass)
Method and limit: the raw OR OCR (tmp/library/or27) is not present in this checkout, so or27_find.py cannot run and the original page text could not be re-read. Web access to archive.org and loc.gov is blocked (403, not circumvented). Checks made instead: (a) every cited OR report id exists in library/or27_index.json; (b) every cited printed page of a verified row lies inside that report's indexed page range: 77 of 77 cited pages; (c) quotes were searched in separate local extractions (library/timeline_audit_T*.jsonl, or27_claim_checks.json, history/positions/*.jsonl): found 66/79. Quotes not found are shard-verified only and are listed as not independently confirmed.
- T1-058 Heth OR27-2-R549 p.637 (index p.637-642): quote 'who reached Cashtown on the evening of the 30th' found in the T1 audit file: CONFIRMED; A.P. Hill R534 p.607 (index 606-609) second quote not found in any other local file: NOT INDEPENDENTLY CONFIRMED here.
- T1-059 Hill R534 p.607: 'following on the morning of the 30th with the division of Ge...' found: CONFIRMED.
- T1-060 Ewell R467 'orders from the general commanding to proceed to Cashtown' and Early R470 p.468 'the object was to concentrate the corps at or near Cashtown' found: CONFIRMED.
- T1-062 Calef R374 p.1030 (index 1029-1034): 'went into position, just outside of town' found: CONFIRMED; 'Strong cavalry pickets thrown out about a mile and a half.' not found elsewhere: NOT INDEPENDENTLY CONFIRMED here.

## Owner-decision items
- Default view for each conflict listed above (PDF recommended defaults stay PENDING OWNER).
- Tier promotions or demotions relative to the seed tier recommended in the row notes.
- Approval to acquire primary sources for the gap rows (see proposed-register entries).
