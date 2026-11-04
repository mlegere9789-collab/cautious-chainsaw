# NE progress (one line per step, 30 October 2026)

- Read CLAUDE.md, DEC-019, PLAN, pipeline README, pilot, SOURCES, GAPS; OOB scope computed: 37 infantry, 3 cavalry, 7 batteries (47 units).
- Built fetch library: User-Agent gettysburg-map-research/1.0, 2.2 s between requests, cache under tmp/library/rosters/NE/, sha256 in acquired.json, below-normal process priority set in code.
- IA search and metadata: Massachusetts Soldiers, Sailors and Marines 1931-37 (9 items, all NOT_IN_COPYRIGHT, none access-restricted); copyright check recorded in README. Fetched vols 1-7 and index (vol 8 HTTP 500, Navy only).
- Massachusetts: parser (running heads, company markers, entries), event and presence rules (events.py, rosterlib.py); 17 infantry, 1st Cavalry, 3 batteries written; entry counts within 1 percent of an independent count; page check of 31 rows clean.
- OR 27 check: OOB batteries MAF and MAE match no Massachusetts battery at Gettysburg; 1st Battery (A) delivered as UNMAPPED.
- New Hampshire: Ayling vols 1 and 2 fetched; 2nd, 5th, 12th Infantry and 1st Light Battery written; page check of 40 rows; running-head page tracking and swallowed-entry splitting fixed after the check.
- Maine: located return page ranges in the 1863 AG report and participants ranges in Maine at Gettysburg; generalised the pilot parsers; 3rd, 4th, 5th, 6th, 7th, 16th, 17th, 19th Infantry, 1st Cavalry and 2nd Battery written; page check of 61 rows exposed two rule faults, fixed and re-run.
- Found and corrected a pilot defect: 11 field and staff rows of the "20th Maine" file are the 19th Maine's (page image checked); 20th Maine file rebuilt with the 20th's own field and staff added.
- Vermont: Revised Roster item cu31924080774148 returned HTTP 503 or timeouts for every file on every attempt; background retry running; no Vermont rows. Recorded as a failed lookup.
- Stats (stats.json), README, QA-SAMPLE written; SOURCES.csv and GAPS.md updated; scripts copied to pipeline/NE.
