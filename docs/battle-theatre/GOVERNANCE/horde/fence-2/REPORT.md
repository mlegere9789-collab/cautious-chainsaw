# Shard fence-2 report (R14.S-017 to R14.S-052, 36 rows)

Slice check: expected 36 schedule rows S-017..S-052; found exactly these, none missing, duplicated, out of slice or malformed. Written from the existing results.jsonl, lookups.jsonl (9 lookups) and 7 proposed register entries (fence-2-EG-01..07).

Counts: verified 29, inferred 4 (S-032, S-034, S-035, S-045), failed_lookup 3 (S-021, S-039, S-046), gap 0. Of the 29 verified, 13 carry real OR or state-history quotes (S-017, 020, 023, 024, 026, 031, 033, 042, 050 and others) and 16 are "no fence component" row checks.

Fixes in this audit: (1) the 16 verified rows with no source (S-018, 019, 022, 025, 027-030, 038, 040, 041, 043, 047-049, 051) now cite the PDF B.8.7 schedule row with its plan-clean.txt line and page and a passage_ref, and carry an `audit_note`: verified there means the row text prints no fence state, nothing historical is claimed. (2) `related_register` fence-2-EG-03 (Emmitsburg Road continuity conflict) added to rows tied to FEN-emmitsburg-road; that entry had no row link. Schema note: this shard uses `fence_link` where fence-1 uses `fence_relevance`; both left in place.

Findings carried (no default chosen): Emmitsburg Road fences are printed intact on the morning of Jul 3 but the OR shows pull-downs on Jul 2 (EG-03); Peach Orchard fences cleared Jul 2 morning and some still standing 15:00-18:00 (EG-01); Evergreen Cemetery fence destruction date Jul 2 vs Jul 3 (EG-02); Culp's Hill stone wall position (EG-04); Klingle and Leister fences have no primary (EG-05, failed lookups); Wheatfield and Rose layouts (EG-06); Cemetery Hill segments (EG-07).

own_checks (see limits below):
- S-032 Kershaw, OR27-2-R432 p.368, "The numerous fences in the way": same report and page in library/timeline_audit_T2.jsonl.
- S-034 Humphreys, OR27-1-R158 p.532, "removing such of the fences as were in the way": same in timeline_audit_T2.jsonl.
- S-033 de Trobriand, OR27-1-R152 p.520, 17th Maine "took a strong position behind a stone wall": same in timeline_audit_T2.jsonl. S-024 and S-050 Geary "ordered to charge and carry the stone wall" is in tests/historian/fixtures/golden-or27.json.

Owner decisions: scenario choices for EG-01..EG-04 (Law cl.6). Remaining unprocessed: none.

Verification limits (2026-11-04 audit): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is not present in this checkout, so tools/bt/or27_find.py could not be re-run. The proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so nothing was re-fetched; those lookups count as failed for this pass and none was circumvented. Spot checks use independent local extractions of the same OR passages (library/timeline_audit_T1-T3.jsonl, library/or27_claim_checks.json, history/positions/positions_A/B.jsonl, tests/historian/fixtures/golden-or27.json), matched on quote text, report id and page. They are second local witnesses, not the raw scan.
