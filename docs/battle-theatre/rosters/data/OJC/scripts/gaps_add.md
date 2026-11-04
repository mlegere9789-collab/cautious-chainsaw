
## OJC family (Ohio, New Jersey, Connecticut), added 30 October 2026

Details and counts are in `data/OJC/README.md`. IDs G-OJC1 to G-OJC8.

| ID | gap | what was tried | route |
|---|---|---|---|
| G-OJC1 | Per-man presence on the day for the 33,906 Unknown rows (18,331 `on-roll-undetermined`, 15,575 `unreadable-or-ambiguous`) | state rosters (Ohio 1886, Stryker 1876, Connecticut Catalogue 1869), OR 27/1 officer lists | open alternatives not yet read: regimental histories (Storrs 20th CT, Page 14th CT, 107th Ohio and others), Record of Service of Connecticut Men (1889), the New Jersey Gettysburg commission reports; muster rolls are not open |
| G-OJC2 | OCR text layer: New Jersey infantry 38 to 71 percent of rows unreadable-or-ambiguous, Ohio 8 to 34, Connecticut 2 to 6; 3,011 rows have no name in the text layer; names unverified (about 8 to 30 percent of sampled rows carry a slip by eye count) | djvu.xml word boxes, ditto resolution, month and year OCR variants | second OCR or vision read of the date and name columns (same as G02) |
| G-OJC3 | Ohio volume 2 (4th, 5th, 7th, 8th Ohio) comes from the Better World Books scan `bwb_W9-BTC-637`, which has no Internet Archive copyright flag; `officialrosters02commgoog` answered HTTP 504 three times | retried text and xml | owner may confirm the rights reading (published 1886); retry the Google copy later |
| G-OJC4 | 23rd New Jersey: the OOB lists it at Gettysburg (strength 340); Stryker has it mustered out 27 June 1863 and volunteering for Harrisburg service | roster rows flagged `contested-oob-lists-unit-at-gettysburg` (1,028 rows); 24 rows Absent-Documented from the printed must'd-out column | owner decision on the unit's place in the Theatre |
| G-OJC5 | OOB omissions to check: 10th and 15th New Jersey are in Stryker and not in the OOB file; other OJC men in headquarters, signal and provost details are not in the OOB at all | not determined | order-of-battle review |
| G-OJC6 | Company letters not recovered for the 8th Ohio (company A listed under FS, H under G) and the 75th Ohio (K under I) | heading and muster-in-paragraph rules | page-image check |
| G-OJC7 | Ohio deaths-and-burials lists after the rosters (vols 5, 6, 7), Stryker must'd-out column (used for the 23rd NJ only), Fox and OR regiment losses (needed for R-G5) not parsed | | next pass |
| G-OJC8 | Per-unit documented strength `S_doc` not obtained (OOB value is second-hand, so all 39 units are Short); Present-Documented exceeds the OOB casualty figure for the 73rd Ohio (114 against 16), 25th Ohio and 55th Ohio: carried as a conflict | | Fox, Regimental Losses and OR 27 returns |
