# Shard r03-2 report (R03.C-024..C-047, 24 rows)

Slice check: R03 has 48 sub-requirements; r03-1 holds R03.0000 and C-001..C-023, this shard C-024..C-047. Found exactly C-024..C-047, no missing, duplicate or malformed rows. Added `requirement_id` "R03" to each row to match r03-1 (r03-1 now also has `source_citation`/`supporting_passage_ref`).

Counts: verified 13 (C-025, 027-032, 034-036, 039, 040, 043), inferred 3 (C-033, C-041, C-044), gap 8 (C-024, 026, 037, 038, 042, 045, 046, 047). All 24 PDF defaults stay PENDING OWNER; no default was chosen.

Register: new entries r03-2-EG-01..06 (C-037, 040, 041, 043, 046, 047). The other gap, inferred or conflict rows point to existing sibling proposals; every id was checked to exist: TL08-EG-07, TL08-EG-18, TL09-CF-06, tl-07-EG-04, tl-11-EG-007, tl-06-CF-007, TL10-CANNONADE, TL10-CULP-TIMES, TL10-ECF, tl-12-EG-05/-10/-13/-15/-18, tl-11-EG-006/-011, TL08-EG-02, EG-TL04-015/-021, tl-03-EG-01, and register/EG-FX-G09 and EG-AUD-G07. C-028 needs none (both values are true events).

Findings where the OR departs from the PDF: C-029/C-030 (PDF 14:00 is not an OR end or step-off hour), C-031 (noon not found), C-032 (OR about noon; 13:00 and 15:00 later), C-034 (PDF default 150 wagons has no OR source; OR has 40, 300, 400-500), C-036 (Jul 7 contradicted by OR, kept flagged), C-040 (10:30 and 10:40-10:50 not in OR), C-045 (no wind speed in OR).

own_checks:
- C-028 Hunt, OR27-1-R028 p.237, "at 4.30 a. m. these batteries opened, and fired without intermission for fifteen minutes": same page and quote in history/positions/positions_B.jsonl.
- C-043 Wadsworth, OR27-1-R032 p.266, "at 3.45 o'clock I ordered the command to retire": same in positions_A.jsonl.
- C-031 Ruger, OR27-1-R273 p.781, "this state of things continued until about 10 a. m.": same in positions_B.jsonl. C-034 "The night was one of inky darkness" and C-036 "July 7, the division moved to Boonsborough" are in library/timeline_audit_T3.jsonl.

Lookups: web_lookups.json has 4 entries (WebSearch/NPS, partial or failed as recorded). No lookups.jsonl existed; web_lookups.json is the log.

Owner decisions: all C-024..C-047 defaults; wording of dead and casualty totals (C-046, C-047) as ranges with basis. Remaining: none.

Verification limits (2026-11-04 audit): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is not present in this checkout, so tools/bt/or27_find.py could not be re-run. The proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so nothing was re-fetched; those lookups count as failed for this pass and none was circumvented. Spot checks use independent local extractions of the same OR passages (library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A/B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and page. They are second local witnesses, not the raw scan.
