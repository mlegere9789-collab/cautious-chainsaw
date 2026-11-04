# REPORT shard tl-03 (rows T1-116 to T1-172, 57 rows)

## Integrity audit (completes the stalled run)
No missing, duplicate or malformed rows. Canonical fields were native; tier normalized to an enum with tier_raw kept. Rows documented only by a secondary source (T1-132, 135, 139, 140, 169, 170) or mixed rows with an unsupported part (T1-127, 147, 167, 171) normalized to tier open gap (status already gap/failed_lookup). Added proposed-register entries tl-03-EG-08 and tl-03-EG-09 for conflict and partial rows that no entry mentioned.

Schema: every row now carries id, verdict, tier, citation, passage_ref, status, notes (plus the shard's original fields; tier_raw and status_raw keep the pre-audit values). `tier` is the audit-recommended tier; seed_tier is unchanged and any promotion above the seed is an owner/integrator decision. Rule applied: tier documented and status verified require both citation and passage_ref and an OR or primary citation; otherwise downgraded (rows changed are marked `audit_downgrade`). No row sets a default among conflicting sources (default_picked is empty everywhere).

## Counts
Rows: 57 (seed slice exact, 0 missing, 0 duplicate, 0 malformed).
Verdict: {'partial_fill': 1, 'partial': 24, 'unsupported': 2, 'supported': 9, 'conflict': 12, 'not_in_primary': 7, 'verified_computed': 1, 'mixed': 1}
Tier: {'open gap': 13, 'documented': 39, 'inferred': 4, 'plausible-procedural': 1}
Status: {'gap': 11, 'verified': 41, 'failed_lookup': 3, 'inferred': 2}

## Conflicts carried as selectable scenarios, no default picked (17)
T1-122, T1-124, T1-126, T1-129, T1-136, T1-142, T1-143, T1-146, T1-148, T1-151, T1-153, T1-155, T1-157, T1-159, T1-161, T1-162, T1-163

## Gap and failed-lookup rows (14)
T1-116, T1-119, T1-124, T1-127, T1-132, T1-135, T1-138, T1-139, T1-140, T1-147, T1-167, T1-169, T1-170, T1-171

## Proposed register entries (9)
tl-03-EG-01.md, tl-03-EG-02.md, tl-03-EG-03.md, tl-03-EG-04.md, tl-03-EG-05.md, tl-03-EG-06.md, tl-03-EG-07.md, tl-03-EG-08.md, tl-03-EG-09.md
Every gap, failed_lookup, unsupported and conflict row is named in a proposed-register entry here or points to an existing register/conflict_register entry (T1-066, 071, 073, 099, 104 in shard 2 point to register/EG-TL-T1-*.md and conflict_register C-040).

## own_checks (this audit pass)
Method and limit: the raw OR OCR (tmp/library/or27) is not present in this checkout, so or27_find.py cannot run and the original page text could not be re-read. Web access to archive.org and loc.gov is blocked (403, not circumvented). Checks made instead: (a) every cited OR report id exists in library/or27_index.json; (b) every cited printed page of a verified row lies inside that report's indexed page range: 45 of 45 cited pages; (c) quotes were searched in separate local extractions (library/timeline_audit_T*.jsonl, or27_claim_checks.json, history/positions/*.jsonl): found 46/54 (quotes taken from passage_ref text). Quotes not found are shard-verified only and are listed as not independently confirmed.
- T1-117 Wainwright R071 p.354 and Doubleday R029 p.247: 'at about 10.30 a. m. I immediately joined General Doubleday' and 'I immediately directed General Robinson to station his divis...' found in the T1 audit file: CONFIRMED.
- T1-120 Howard R243 p.702 (index 696-712): 'about 12.30 [p. m.]' found in or27_claim_checks.json: CONFIRMED.
- T1-121 Doles R514 p.581 (index 581-582): 'formed into line of battle about 1 p. m. July 1' found in audit file and positions_D.jsonl: CONFIRMED.
- T1-118 Carter R531 p.602-603: '4 men killed outright and 7 more or less severely wounded' found: CONFIRMED; '2 men killed, 2 mortally wounded, 26 more or less badly woun...' not found elsewhere: NOT INDEPENDENTLY CONFIRMED here.

## Owner-decision items
- Default view for each conflict listed above (PDF recommended defaults stay PENDING OWNER).
- Tier promotions or demotions relative to the seed tier recommended in the row notes.
- Approval to acquire primary sources for the gap rows (see proposed-register entries).
