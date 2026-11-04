# REPORT shard tl-05 (timeline_seed.jsonl lines 231-287 = T2-006 to T2-062, 57 rows)

Done: all 57 rows processed; results.jsonl has 57 records; 18 proposed register entries in proposed-register/ (ids tl-05-EG-001..018).

Method: reused library/timeline_audit_T2.jsonl and the OR27 index (cited per row), then spot-verified against the OR text with tools/bt/or27_find.py (every audit quote in range re-verified; about 40 further passages re-read), recomputed astronomy from environment/ephemeris_1863.json, and made four web lookups (archive.org Dawes memoir, NPS Thompson-house article, two searches).

Counts: conflict 19, partially_supported 17, supported 6, supported_computed 3, unsupported 7, not_primary_checkable 5. Status: verified 31, inferred 7, gap 18, failed_lookup 1.

New findings: (1) T2-008 spades and wagon confirmed by Dawes memoir p.179 (archive.org), not his OR report. (2) T2-047 states 93% illumination by dawn, but the computed value for Jul 2 dawn is 98.0%; 93% is Jul 3 dawn. (3) T2-009 McDougall gives about 40 paces, not 10 rods, and the wall in rear. (4) T2-018 NPS article says morning, row says evening. (5) T2-040/042: Humphreys himself says 01:00, so the row note that 02:00 is the B.2.5 default has no OR backing. (6) T2-011 moves are July 2 events.

Failed lookup: primary Jacobs meteorological sheets (only secondary summaries found).

Owner decisions needed: default view for each conflict (19 rows); none picked. Tier promotion candidate: T2-019. Tier demotion candidates (documented without non-lead primary): T2-006, 024, 027, 031, 033, 048, 058, 060.

Not done: no shared files edited. Nothing remains unprocessed.

---


## Integrity audit (completes the stalled run)
No missing, duplicate or malformed rows. recommended_tier mapped to tier enum with tier_raw kept; the shard report's tier promotions and demotions remain recommendations (seed_tier unchanged); T2-019 stays a promotion candidate. All gap-status rows normalized to open gap (T2-023 and similar inferred rows kept inferred).

Schema: every row now carries id, verdict, tier, citation, passage_ref, status, notes (plus the shard's original fields; tier_raw and status_raw keep the pre-audit values). `tier` is the audit-recommended tier; seed_tier is unchanged and any promotion above the seed is an owner/integrator decision. Rule applied: tier documented and status verified require both citation and passage_ref and an OR or primary citation; otherwise downgraded (rows changed are marked `audit_downgrade`). No row sets a default among conflicting sources (default_picked is empty everywhere).

## Counts
Rows: 57 (seed slice exact, 0 missing, 0 duplicate, 0 malformed).
Verdict: {'unsupported': 7, 'conflict': 19, 'partially_supported': 17, 'supported_computed': 3, 'supported': 6, 'not_primary_checkable': 5}
Tier: {'open gap': 18, 'documented': 27, 'inferred': 10, 'plausible-procedural': 2}
Status: {'gap': 18, 'verified': 31, 'inferred': 7, 'failed_lookup': 1}

## Conflicts carried as selectable scenarios, no default picked (19)
T2-007, T2-009, T2-010, T2-011, T2-012, T2-015, T2-017, T2-018, T2-026, T2-037, T2-039, T2-040, T2-041, T2-042, T2-047, T2-050, T2-055, T2-056, T2-062

## Gap and failed-lookup rows (19)
T2-006, T2-018, T2-022, T2-023, T2-024, T2-027, T2-029, T2-031, T2-032, T2-033, T2-034, T2-036, T2-043, T2-044, T2-045, T2-048, T2-053, T2-058, T2-060

## Proposed register entries (18)
tl-05-EG-001.md, tl-05-EG-002.md, tl-05-EG-003.md, tl-05-EG-004.md, tl-05-EG-005.md, tl-05-EG-006.md, tl-05-EG-007.md, tl-05-EG-008.md, tl-05-EG-009.md, tl-05-EG-010.md, tl-05-EG-011.md, tl-05-EG-012.md, tl-05-EG-013.md, tl-05-EG-014.md, tl-05-EG-015.md, tl-05-EG-016.md, tl-05-EG-017.md, tl-05-EG-018.md
Every gap, failed_lookup, unsupported and conflict row is named in a proposed-register entry here or points to an existing register/conflict_register entry (T1-066, 071, 073, 099, 104 in shard 2 point to register/EG-TL-T1-*.md and conflict_register C-040).

## own_checks (this audit pass)
Method and limit: the raw OR OCR (tmp/library/or27) is not present in this checkout, so or27_find.py cannot run and the original page text could not be re-read. Web access to archive.org and loc.gov is blocked (403, not circumvented). Checks made instead: (a) every cited OR report id exists in library/or27_index.json; (b) every cited printed page of a verified row lies inside that report's indexed page range: 52 of 52 cited pages; (c) quotes were searched in separate local extractions (library/timeline_audit_T*.jsonl, or27_claim_checks.json, history/positions/*.jsonl): found 35/41 (from passage_ref text). Quotes not found are shard-verified only and are listed as not independently confirmed.
- T2-007 Hancock R076 p.369: 'About dark I started for the headquarters of the army' found in timeline_audit_T2.jsonl: CONFIRMED.
- T2-008 Dawes memoir p.179 (not an OR source; read at archive.org by the shard): quote 'We immediately commenced the construction of a temporary bre...' is Grover OR27-1-R038 p.284 (index 284-285), found in both audit files: CONFIRMED for Grover; the Dawes memoir text could NOT be re-read here (archive.org blocked by the proxy, 403) so that part rests on the shard's own record.
- T2-010 Johnson R481 p.504 (index 499-507): 'Late on the night of July 1, I moved along the Gettysburg...' found in audit file and positions_D.jsonl: CONFIRMED.
- T2-011 Coulter R044 p.293-294 (index 292-295): 'Later in the evening' and 'about noon next day' found in audit files and positions_A.jsonl: CONFIRMED.

## Owner-decision items
- Default view for each conflict listed above (PDF recommended defaults stay PENDING OWNER).
- Tier promotions or demotions relative to the seed tier recommended in the row notes.
- Approval to acquire primary sources for the gap rows (see proposed-register entries).
