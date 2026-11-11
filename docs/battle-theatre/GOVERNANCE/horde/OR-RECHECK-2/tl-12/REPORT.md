# OR-RECHECK-2 tl-12

Rows with no checkable quote (or_recheck null): 10. Method: shard row, seed row, then OR27 OCR text read through tools/bt (or27_find/or27_dump/or27_peek); every verbatim passage was re-verified with or27_find.verify against the cited report and page.

Verdict counts: not_found 8, supported_partial 2

## Rows that fail or are only partial

- T3-165: not_found [-] Moonrise 21:50 Jul 4 (computed), end illumination 68% not reproduced (about 75% computed); cloud hiding moon from Strategypage. Not an OR claim.
- T3-167: not_found [-] Sisters of Charity and Philadelphia Ladies' Aid nurses; churches as hospitals: OR 'Catholic church' search returns only Ewell-at-church scouts' reports. Sources are Aleteia and HistoryNet (lead-class).
- T3-173: supported_partial [OR27-2-R426 p.322] Lee's report: army put in motion at dark of Jul 4; 'A heavy rain continued throughout the night, and so much impeded its progress that Ewell's corps ... did not leave Gettysburg until late in the forenoon of the following day.' Su
- T3-185: not_found [-] Civilian returns (Sherfy Jul 6, Tillie Pierce Jul 7) are not OR claims; open gap stands.
- T3-187: supported_partial [OR27-1-R337 p.928] Union half only: Buford's division bivouacked on the road to Boonsborough after the Williamsport action (dark, Jul 6). Confederate night positions after the Wagoners' Fight are not in the OR; that part of the row remains an open g
- T3-196: not_found [-] Burial details, last Confederate dead, rail traffic, Camp Letterman construction from Jul 10: not OR claims (secondary W-GNC, CWMED-CL, W-STATION). Row's 1865 inconsistency stays flagged.
- T3-213: not_found [-] Camp Letterman layout, graves, deaths: post-battle medical camp, secondary sources only; not OR claims.
- T3-215: not_found [-] David Wills recommends a cemetery Jul 24: civilian/memorial source, not OR.
- T3-216: not_found [-] Pennsylvania Hall hospital use ends Jul 29: single secondary source; not OR.
- T3-217: not_found [-] Hospital closure dates and Aug 10 census (1,772 vs over 4,000): HMDB, NPS essay, CWN-CL; not OR claims. Census conflict stands.

## Citations corrected
None of these rows carried an OR citation in the shard file; where a page was located the correct report and page are in results.jsonl. Notable corrections: T3-090 (Moore is 61st Ohio, XI Corps per Letterman p.197, not V Corps); T3-157 (Imboden, not Baker, has the wagon trains: Stuart p.699); T3-089 (OR gives 39 guns not 6-23: McGilvery p.883); T3-173 (rain impeded, not aided, the retreat: Lee p.322); T3-103 (Lee p.318 three-quarters of a mile is not the Jul 3 advance distance).
