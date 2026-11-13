# REPORT shard tl-01 (timeline_seed.jsonl lines 1-57, rows T1-001 to T1-057)

## Close-out 2026-11-13 (supersedes the pass of 2026-11-04 where they differ; that report is kept below)

What was asked: for every row whose status_effective is not verified_against_or_text (14 rows: T1-003, 005, 011, 013, 018, 019, 022, 023, 029, 030, 040, 041, 048, 050) apply the OR-RECHECK and OR-RECHECK-2 findings, search the Official Records (all three parts) and the library for a passage supporting the claim or any sub-claim, write one corrections line, and propose a register entry for every row that stays gap, unsupported or partial; the 43 verified rows also get a line.

What exists now (all written by `closeout/build.py`, run as `python3 -I docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout/build.py`; `--check-only` re-verifies without writing):
- `GOVERNANCE/timeline_corrections/tl-01.jsonl`: 57 lines, one per seed row. Fields: id, verdict, before (the status the row had), corrected_claim (event, unit, place, time_window with ISO start/end of the form 1863-MM-DDTHH:MM and its basis, text, tier, marking), sub_claims (each with tier, support and the citation keys), citations (source id, part, report id, printed page, verbatim quote, text offset, text offset end, source file, sha256; page-image readings where the OCR is column-mixed), scenarios, default, remains_unsupported, searched, recheck_applied, register_proposed.
- `horde/tl-01/results.jsonl`: the 57 shard rows with the findings applied (old values kept under *_before): verdict, tier, status, citations (report id and page as FOUND in the text, quote verbatim), citation, passage_ref, scenarios_no_default, remains_unsupported, or_recheck_findings, or_claim_check_finding.
- `horde/tl-01/proposed-register/`: 34 entries `tl-01-CO-<row>.md` (every row that stays partial, unsupported or gap), `tl-01-CONFLICTS.md` regenerated (24 rows with scenarios), and the 7 older entries `tl-01-EG-001..007` kept with a close-out update row.
- `horde/tl-01/closeout/`: build.py, rowlib.py, shard_rows.py, register_md.py, rows_a.py, rows_b.py, rows_c.py (the data of all rows), search_log.jsonl (58 logged searches with pattern, scope and hit counts per source), acquired_tl01.json (files fetched), counts.json, tools/ (the search and quote-check scripts and the two weather scans with their output). `lookups.jsonl` has records LK-07 to LK-13.

## Counts

- Rows: 57. Verdicts: confirmed 10, corrected 23, partially_supported 23, unsupported 1, gap 0.
- Of the 14 rows that were not verified against the OR text: partially_supported 9 (T1-003, 005, 013, 018, 019, 022, 029, 040, 050), corrected 4 (T1-011, 023, 030, 041), unsupported 1 (T1-048). No row stays a pure gap: the evidence found for T1-013 (Sandoe), T1-005 (Caledonia) and T1-018 (guards, quartering) moved them.
- Status now (results.jsonl): verified 23, partially_verified 33, gap 1. Row tier: documented 53, inferred 2, open gap 2 (the row tier is the tier of what the displayed claim asserts; the sub-claims carry their own tiers).
- Sub-claims: 269: documented 217, inferred 5, plausible-procedural 5, open gap 42; support: supported 181, conflict 33, unsupported 47, contradicted 8.
- Citations: 302, every one re-matched verbatim in the local text by the builder (whitespace normalised, case sensitive, report id and printed page checked for the OR): OR vol.27 192, Jacobs 1864 35, Gettysburg Compiler 1863-06-29 26, Adams Sentinel 3, Pennsylvania at Gettysburg 14, Fremantle 6, Meade Life and Letters 5, Battles and Leaders 5, Pierce 1889 4, Alexander 3, SHSP 5, Minnesota 1916 1, NPS 3.
- Scenarios: 24 rows carry two or more scenarios (T1-005, T1-007, T1-008, T1-010, T1-011, T1-012, T1-015, T1-020, T1-023, T1-024, T1-028, T1-030, T1-032, T1-035, T1-036, T1-039, T1-041, T1-042, T1-043, T1-044, T1-045, T1-046, T1-047, T1-055); the only default is T1-043 (delegated decision DD-07: shoes motive first, PDF reading selectable). Every other conflict is carried without a default.
- Searches: 58 logged (closeout/search_log.jsonl) plus the two weather scans (closeout/tools/out/wx2.txt, wx3.txt: OR sentence scans for weather words near Jun 25-30 dates, 17 and 9 hits read) and direct reads of the reports named in each row's `searched`; all 108 library texts (99 of acquired_2.json and 9 earlier state volumes) were searched by regex for the topics of the 14 rows; the OR was searched in all three parts; 8 issues of the 1885 Gettysburg Compiler were searched on archive.org for Jacobs's readings (nothing). Not read: the regimental histories of the library for the night of Jun 29 (T1-040; stated in its register entry).

## What the close-out found (rows whose displayed claim changed)

- T1-013 (Sandoe): documented. The Gettysburg Compiler of Jun 29 1863 (page 2, read on the page image) and the regimental monument text give George W. Sandoe shot dead on Jun 26 near Nathaniel Lightner's after the rebel cavalry entered the town at about 3 p.m. "Lightner" as a second trooper, the 16:00 hour and the attacker's unit stay unsupported.
- T1-005 (Caledonia): documented as an event by the Compiler (Friday) and the Adams Sentinel (Jul 21 and Sep 8: Thursday, Col. French's cavalry); the two dates are carried as scenarios; the OR has nothing for Jun 25-26.
- T1-007 (26th Pennsylvania arrival): three witnesses disagree (Early: the night before; Jacobs, the Compiler, Pennypacker: advance detail of 100 on the evening of Jun 25, regiment on the morning of Jun 26 after a derailment at Swift Run; monument text: June 25). The seed "by train, about 09:00" is not supported as a train arrival.
- T1-008, 009-012, 014-018: the militia day and the occupation of Gettysburg rest now on Jacobs 1864, the Compiler, Richards (Battles and Leaders), Pennypacker and Early: hours 10:00 or 10:30, about 3 p.m. contact, the demands and Kendlehart's answer, the cars and the Rock Creek bridge, quartering in the Court-house. Not supported by any text: militia prisoners locked in the Court-house, a covered bridge, torn telegraph lines, Belmont Road and the rail station, a wooden bridge, Lt. Strickler.
- T1-020: the Compiler confirms Early's own route (only Gordon on the York turnpike; the rest by Hunterstown to Dover); the flagpole is not documented at Gettysburg (Gordon: the flag was taken down at York).
- Weather rows T1-003, 019, 023, 030, 041: the OR contradicts "dry" for the Union columns of Jun 29 (rain and mud in four reports, "inclement" in Lee) and has rain at Emmitsburg on Jun 30 and a "very warm day" on Jun 28; temperatures are still found nowhere. Carried as scenarios (DD-TL01-01).
- T1-022, 029: Union corps destinations from the Itinerary cited verbatim for Jun 27 and 28 and the Confederate corps placed at village level (Lee, Anderson, Rodes, Early, Fremantle); exact bivouac sites remain open.
- T1-025: Meade was roused at about 03:00 (Meade Life and Letters) and acknowledged the order at 07:00 (OR27-1-R006): window 03:00-07:00. T1-021: the order is dated Jun 27, no hour for its issue.
- T1-035, 043, 047: Heth's own report printed in SHSP vol.6 reads "nine miles" (the OR OCR "0 miles") and "shoes especially" (a contemporary report, so the seed note "first appears in 1877" is contradicted); Jones (R550) has Pettigrew's brigade on picket half way to Cashtown that night.
- T1-046: Custer's report has the 6th and 7th Michigan engaged at Hanover (the shard said a 6th Michigan role was not found). T1-054: the 123rd New York halted a mile outside Littlestown on Jun 30 and went to Two Taverns on Jul 1 (Rogers, R279).
- T1-050: the only support is the NPS Edward McPherson Farm Historical Study (the tenant Slentz's claim: Buford's troopers cut and threw down about a quarter mile of post-and-rail fence on the night of Jun 30); shown as alleged, inferred (DD-TL01-04). T1-048: only Pancoast's office is documented; the NPS list puts a Cavalry Corps tablet in front of the Presbyterian Church; no hospital on Jun 30 is documented.
- T1-052: the 35 miles are now cited (Torbert, Wright). T1-057: documented (promotion of DD-08 applied).

## What was not run or not done

- No gate was run, no `passes` flag touched, no node test, no browser, `tools/bt/check_governance.py` not run (it writes GOVERNANCE/check_report.json, outside this shard's ownership). `tools/bt/merge_horde.py --dry` was run to check the shard rows against the integrator's rules (no row of this shard is flagged); `timeline_verified.jsonl` is not regenerated (the integrator's task), so its status_effective counts for tl-01 are unchanged until the next merge.
- The OR text is the OCR text; where it is damaged the quote is the OCR string as printed and a clean reading comes from another print of the same text (Heth, SHSP vol.6) or from the page image (newspapers). The three newspaper pages (Compiler Jun 29 p.2, Adams Sentinel Jul 21 p.3 and Sep 8 p.2) were rendered from the archive.org PDFs (sha256 in acquired_tl01.json; `pdftoppm -r 150 -f 2 -l 2` for the Compiler) and read with the image viewer; the OCR text layer interleaves the columns, so each such citation carries an OCR fragment found verbatim in the library text plus the printed words under `reading`. No OR page image was read: OCR readings such as Ewell p.443 stay OCR readings (owed: a page-image read of the OR scan for the damaged figures).
- Not read: the regimental histories of the library for the night of Jun 29 (T1-040); the Cavalry Corps return and Custer's brigade losses (T1-045, T1-051); the Slentz claims file (T1-050); Jacobs's 1885 readings (not on archive.org); the HMDB marker (refused by the proxy, tl-01-LK-13); the Broadhead diary (Cornell, HTTP 403, not circumvented).

## Owner-only steps (nothing here was done by Claude)

- Broadhead, Myers and McCreary diaries (T1-018, T1-040): a copy of the Broadhead diary can be requested from the Cornell library (the scan answered HTTP 403 to automated access); an owner act.
- Slentz damage claim (T1-050): Adams County claim papers (Gettysburg claims) at the Adams County Historical Society or the park archive; a request to a third party, so an owner act.
- Jacobs 1885 thermometer readings (T1-003, 019, 023, 030, 041): the August 1885 issues of the Star and Sentinel or the Compiler through a newspaper archive with a login, or the Smithsonian observer sheets; an owner act if an account is needed.
- HMDB marker 17939 text (T1-048): the owner can open the page in a browser and paste the inscription; the proxy refuses the host.

## Owner decisions

None open from this close-out: the delegated decisions it applied or made are DD-07 and DD-08 (earlier) and DD-TL01-01..04 (appended to DELEGATED-DECISIONS-2026-11-11.md, reversible).

---

# Earlier pass of 2026-11-04 (kept for the record; where it says "Remaining items: none", "Jacobs read only through a summary" or lists rows as unsupported, the close-out above supersedes it)

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
