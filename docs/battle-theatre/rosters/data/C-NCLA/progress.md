# progress (C-NCLA), 30 October 2026

- read CLAUDE.md, DEC-019, PLAN, pilot, pipeline; 50 units found (33 NC infantry, 10 LA infantry, 7 batteries: Manly, Reilly, Maurin, Washington Artillery x4).
- IA search: Moore vols 1-4 and Booth 7 parts identified; metadata checked, none access-restricted; robots.txt read.
- fetched txt (11 files) and xml (13 files) with sha256; Emory copy of Moore fetched after the Google scan of v1 showed repeated pages. 562 MB used.
- Moore generalised parser: header table, company sequence, scan-repeat check; both scans run; scan chosen per unit; leaf map; CSVs for 35 NC units.
- Booth parser: entries, unit match, roll parser, labels; fixed blank-line entry breaks, vol-1 period punctuation, year OCR, cross-reference tails; 1st La. variant split; CSVs for 15 LA units.
- QA on 4 page images, defects fixed and re-run (QA-SAMPLE.md).
- stats.json, README.md, GAPS.md section D, SOURCES.csv rows written.
- 30 Oct 2026, independent audit (AUDIT.md): 60-row samples seed 41 (first output) and seed 42 (repaired); stats recounted, 0 mismatches; 34 hashes match; 17 systematic defects repaired with a frozen copy in _pre_audit/; rows 57,801 to 58,483; R-G1, R-G2, R-G3, R-G9 not met.
