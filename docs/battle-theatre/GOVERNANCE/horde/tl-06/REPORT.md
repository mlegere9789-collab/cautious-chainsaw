# REPORT shard tl-06 (rows T2-063 to T2-120, 58 rows)

## Integrity audit (completes the stalled run)
No missing, duplicate or malformed rows. row_tier/recommended_tier mapped to tier enum with tier_raw kept. Added tl-06-EG-009 for the partial rows T2-082, 084, 091, 098. Only 2 rows have an open gap tier; the other gap or failed_lookup rows keep the recommended tier inferred with the status marking the gap.

Schema: every row now carries id, verdict, tier, citation, passage_ref, status, notes (plus the shard's original fields; tier_raw and status_raw keep the pre-audit values). `tier` is the audit-recommended tier; seed_tier is unchanged and any promotion above the seed is an owner/integrator decision. Rule applied: tier documented and status verified require both citation and passage_ref and an OR or primary citation; otherwise downgraded (rows changed are marked `audit_downgrade`). No row sets a default among conflicting sources (default_picked is empty everywhere).

## Counts
Rows: 58 (seed slice exact, 0 missing, 0 duplicate, 0 malformed).
Verdict: {'supported': 14, 'gap': 10, 'partial': 26, 'conflict': 8}
Tier: {'documented': 44, 'inferred': 11, 'plausible-procedural': 1, 'open gap': 2}
Status: {'verified': 45, 'gap': 8, 'failed_lookup': 4, 'inferred': 1}

## Conflicts carried as selectable scenarios, no default picked (20)
T2-065, T2-068, T2-069, T2-071, T2-076, T2-077, T2-082, T2-084, T2-087, T2-091, T2-092, T2-093, T2-094, T2-095, T2-102, T2-104, T2-108, T2-110, T2-113, T2-115

## Gap and failed-lookup rows (12)
T2-064, T2-068, T2-072, T2-073, T2-075, T2-080, T2-086, T2-095, T2-098, T2-100, T2-103, T2-113

## Proposed register entries (19)
tl-06-CF-001.md, tl-06-CF-002.md, tl-06-CF-003.md, tl-06-CF-004.md, tl-06-CF-005.md, tl-06-CF-006.md, tl-06-CF-007.md, tl-06-CF-008.md, tl-06-CF-009.md, tl-06-CF-010.md, tl-06-EG-001.md, tl-06-EG-002.md, tl-06-EG-003.md, tl-06-EG-004.md, tl-06-EG-005.md, tl-06-EG-006.md, tl-06-EG-007.md, tl-06-EG-008.md, tl-06-EG-009.md
Every gap, failed_lookup, unsupported and conflict row is named in a proposed-register entry here or points to an existing register/conflict_register entry (T1-066, 071, 073, 099, 104 in shard 2 point to register/EG-TL-T1-*.md and conflict_register C-040).

## own_checks (this audit pass)
Method and limit: the raw OR OCR (tmp/library/or27) is not present in this checkout, so or27_find.py cannot run and the original page text could not be re-read. Web access to archive.org and loc.gov is blocked (403, not circumvented). Checks made instead: (a) every cited OR report id exists in library/or27_index.json; (b) every cited printed page of a verified row lies inside that report's indexed page range: 76 of 76 cited pages; (c) quotes were searched in separate local extractions (library/timeline_audit_T*.jsonl, or27_claim_checks.json, history/positions/*.jsonl): found 47/58 (from passage_ref text). Quotes not found are shard-verified only and are listed as not independently confirmed.
- T2-063 Webb R104 p.427 and Hancock R076 p.369: 'about 7 a. m. of the 2d' found in both audit files: CONFIRMED.
- T2-065 Birney R133 p.482 and Chamberlain R196 p.623: 'At 7 a. m., under orders from Major-General Sickles, I relie...' found in timeline_audit_T2.jsonl and positions_B.jsonl: CONFIRMED.
- T2-066 Chamberlain R196 p.622 (index 622-626): 'we reached the heights southeasterly of Gettysburg at about 7 a. m.' found in audit file and positions_C.jsonl: CONFIRMED (arrival ~07:00 July 2).
- T2-067 Alexander R464 p.429 (index 429-431): 'arrived at 9 a. m. on July 2' found: CONFIRMED.

## Owner-decision items
- Default view for each conflict listed above (PDF recommended defaults stay PENDING OWNER).
- Tier promotions or demotions relative to the seed tier recommended in the row notes.
- Approval to acquire primary sources for the gap rows (see proposed-register entries).
