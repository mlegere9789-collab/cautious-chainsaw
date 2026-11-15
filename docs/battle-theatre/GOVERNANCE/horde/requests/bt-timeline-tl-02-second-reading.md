# Requests from bt-timeline, shard tl-02, second reading (2026-11-15)

These are changes in files that the tl-02 workstream does not own. Nothing here was done by tl-02 itself.

## 1. Two texts acquired on 2026-11-15 that other shards may use
Both are listed with sha256 in `horde/tl-02/sources_tl02.json` and are fetched again from archive.org by their identifiers (the local copies are under the gitignored `tmp/tl-02/acq/`).

| id | what | why it matters outside tl-02 |
|---|---|---|
| DTIC-ADA207999 | LTC A. W. Cameron, *A Communicator's Guide to the Gettysburg Campaign*, U.S. Army War College study project, 1989 (a U.S. Government work; archive.org item DTIC_ADA207999; the folio stands at the foot of the page, printed pages 8-10 carry the passages) | prints Jerome's letter of 18 Oct 1865 to Maj. Gen. Hancock (original in the Bachelder Papers, U.S. Army Military History Institute, not seen); names Pennsylvania Hall as the college signal station; prints Jerome's signal message to Howard (OR vol. 27 pt. 3 p.488, bracketed [July 2] by the Official Records, which the study dates Jul 1) and Norton's report. Useful to the shards that carry the signal-service rows of the afternoon of Jul 1 and to the object/location registers of the signal stations. |
| AMEPH-1863 | *The American Ephemeris and Nautical Almanac for the year 1863* (Washington 1861), archive.org item americanephemer33offigoog | the phases of the moon of June 1863 on printed page 103 (full moon Jun 30, 18 h 46.0 m Greenwich astronomical time = Jul 1 06:46.0 UT), the moon's right ascension and declination by hour, lunar distances. Any code that reads times from it must count the day from noon (the five phases of that page agree with PyEphem to within 0.3 minute only under that reading). The status files of `library/` (not owned by tl-02) do not list either text yet. |

## 2. Tabular pages of the Official Records are damaged in the OCR text
The OCR text of OR vol. 27 pt. 1 splits tables into columns and damages their labels. The return of casualties (printed pages 173-185) was read on the page image for the Second Brigade of the First Division (PDF page 197 of cu31924077699761.pdf, printed p.173): Cutler's brigade 1,002 casualties for the battle (killed 6 officers and 122 men, wounded 44 and 465, captured or missing 2 and 363); 7th Indiana 10, 76th New York 234, 84th New York 217, 95th New York 115, 147th New York 296, 56th Pennsylvania 130; every row and column sums to its printed total. Shards that carry brigade or regiment losses (units, strengths, medical) should read the table pages on the page image, not in the OCR text. The row T1-103's "454 of 1,007" is not the official figure and is in no text read (the tl-02 row keeps it as an open gap).

## 3. Unchanged from the first close-out
The request of `bt-timeline-tl-02-corrections.md` (page model of `tools/bt/or27_find.py` on tabular pages, the 12 conflicts and the product notes) stands; items 13 and 14 there are unchanged.
