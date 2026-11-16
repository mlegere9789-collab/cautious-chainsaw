# Request from bt-timeline (shard tl-04, second reading), 2026-11-16

Files I do not own and what I would like changed in them. Nothing below was edited by me. This note adds to GOVERNANCE/horde/requests/bt-timeline-tl-04-corrections.md
(first close-out, 2026-11-13), which stays in force except where a statement below replaces one of it.

## 1. conflict_register.json, conflicts_structured.json and conflict_defaults.json: C-038 (Spangler farm, wounded)
- New evidence: the report of the U.S. Sanitary Commission signed by its associate secretary J. H. Douglas, Washington, Aug. 15, 1863 (printed New York 1863; text
  tmp/library/medical/USSC-GETTYSBURG-1863/reportonoperatio00doug_djvu.txt, source id USSC-GETTYSBURG-1863, printed page 24 from the running heads) says: "The Eleventh Corps Hospital
  occupied the house and farm of Geo. Spangler. The divisions were consolidated under the charge of Dr. Armstrong. It contained 1,900 wounded, of whom 100 were said to be
  confederates." Its table gives the Eleventh Corps as 1,800 Union and 100 Confederate, 1,900 in all, and the writer calls the figures "approximative only"; no date of the count is
  printed (the hospitals were visited in the days after the battle).
- Two of the five values of C-038 (1,800 and 1,900) therefore have a source; the status note "No primary or institutional count found (R03.C-038)" is no longer accurate for them.
  tl-04 leaves the default (range 1,000-2,000, all five values listed, no headline number) unchanged and carries every value as a scenario (T2-003 S1-S5); 1,000, 1,500 and 2,000
  still have no passage. Whether the default narrows is for the owner or the integrator (delegated decision DD-TL04-09 records only that tl-04 changed nothing).
- The same evidence bears on row T1-140 of shard tl-03, which carries C-038.
- The National Park Service says the farm "additionally served as the 11th Corps field hospital" (Cultural Landscape Report, Record of Treatment, vol. I, printed p.307, PDF p.333)
  and that "the 11th Corps hospital located here was the site of General Armistead's death" (boundary study 1988, PDF p.39).

## 2. tools/bt/merge_horde.py and its validators
- GOVERNANCE/timeline_corrections/tl-04.jsonl now has citations with these source ids besides OR27, the library and NPS texts: USSC-GETTYSBURG-1863, SOUDER-LEAVES-1864, HOKE-1887,
  NPS-BOUNDARY-1988 and `CA-<lccn>-<date>-p<n>` (one page of an 1863 newspaper, Library of Congress, Chronicling America; the printed_page field holds the image sequence of the page,
  the page_basis says so; the OCR text of the page is the quotation). Files are under tmp/library/medical, tmp/library/town and tmp/library/web/ca; the newspaper pages searched
  are listed in tmp/tl-04/ca_manifest.json (1,578 pages, frozen because the web workstream keeps adding pages).
- Citations may carry `reading` (what the page image prints where the OCR text differs; the quotation stays the OCR text) and `witness`. Five Official Records citations now have a
  `reading` (T1-176 and T2-005 g_3pm, T1-191 w_arr, T1-186 rod_why, T1-200 g_13).
- T2-003 moved from gap to partially_supported (status inferred in results.jsonl, corrected tier inferred); T1-203 stays gap, T1-205 stays partially_supported.

## 3. Corrections to statements of the first request note (bt-timeline-tl-04-corrections.md)
- Section 3, item 10: the 7th Indiana "nearly five hundred" is Hunt's (Battles and Leaders vol. 3, "The First Day at Gettysburg", p.283), not Halstead's.
- Section 4, T1-176 and T2-005: Geary advances from Two Taverns at about 14:00, not 15:00 (page image of Official Records vol. 27 part 1 printed p.825: "at about 2 p. m."; the OCR
  text reads 3 p. m.). By 17:00 the line is on the extreme left, as before.
- Section 1 and the unit fields of T1-175 and T2-004: the recipient of Hancock's dispatch of 5.25 p.m. was written as Gen. Butterfield; the text read prints only "General:" and
  Hancock's report calls it a communication to the major-general commanding, sent by Captain Parker. The rows now say so.
- T1-191: the march of the VI Corps was "from 32 to 35 miles" (page image of printed p.665; the OCR text reads 33). Shard tl-01 (T1-052) had already read 32 to 35 on the page image.
- T1-186: Rodes' division had lost 2,500 men (page image of vol. 27 part 2 printed p.555; the OCR text reads 3,600), the same figure as Early's 1877 "about 2,500": no conflict.
- The archive.org OCR text of the Official Records contains damaged digits that change hours and figures (three found among 18 leaves read on the page images). Any other shard that
  quotes digits from the three part texts without a page image reading should re-read them; the list of the leaves read by tl-04 is in horde/tl-04/REPORT.md.

## 4. Product notes (app data owners)
- T2-003 and T1-205: show the Eleventh Corps hospital at the George Spangler house and farm as documented (Sanitary Commission 1863; NPS) with 1,900 wounded (1,800 Union, 100
  Confederate) marked approximate and undated; the take-over hour, first wounded and the operations of the night as marked gaps; the counts as the C-038 range with all values.
- T1-203 and T1-205: where the wounded of Jul 1 were at the close of the day: most in the churches and public buildings of the town, prisoners (Major Bush, in the Sanitary
  Commission report); the First Corps hospital in the town (several churches and the Court-House) held the Jul 1 wounded, 400 to 450 with those in private houses. Wounded between
  the lines, burial parties and water details on the night of Jul 1 remain marked gaps.
- T1-190, T1-195, T1-219: three selectable readings of the sky on the night of Jul 1-2: moon veiled by thin cloud (Everett 1863), road very dark near Emmitsburg (Burling), clear
  light of the full moon (newspaper narrative of July 1863); no default.
- T1-200: S5 beside the recorded default: the Herald's "three or four hours on Thursday" and a good breastwork "by two o'clock P. M.".
- T1-197: the cemetery damage of the iron railings, tombstones and monuments is dated by the newspapers to the cannonade of Jul 3, not to the evening of Jul 1.
- T1-188: later texts add a place for Lee's headquarters on Seminary Hill (letter of Nov 1863) and, in a later book (Hoke 1887, tier inferred), a stone house on the Chambersburg Pike
  and Lee taking observations from the cupola of Pennsylvania College; no hour.
- T1-186: add Rodes' own reasons for not advancing on the evening of Jul 1 (OR vol. 27 part 2 p.555).

## 5. For other shards and the integrator (evidence found on the way, not used in tl-04 rows)
- The night of Jul 2: a correspondent of the New York Herald (printed in the Herald of Jul 4, 1863 and, as the same text, in the Weekly National Intelligencer of Jul 9, page 2) wrote
  that "In twenty minutes after the heavy fight was over on our left, the last vestige of daylight was gone, and the moon was so much enveloped in clouds that it was scarcely
  possible to see at all"; pages CA-sn83030313-1863-07-04-p1 and CA-sn83045784-1863-07-09-p2 (OCR text; one witness printed in two papers).
- The Boston Journal's correspondent on the cannonade of Jul 3 (printed in the Dodgeville Chronicle of Jul 23, page 1) has Howard's batteries in the cemetery with "the tombstones
  knocked over, iron railings torn": relevant to the Jul 3 rows of the cemetery and to the artillery rows.

## 6. Machine lock
- The searches and three small second-OCR runs of this close-out were run directly, niced, in pieces because the lock queue did not clear (two timing jobs had waited for more than
  an hour, so no new job passed the gate); details and CPU times in horde/tl-04/REPORT.md. The remaining second-OCR leaves are queued as one job under bench.sh
  (tmp/tl-04/logs/ocr_rest.log); if it has not run, the next pass should run `tools/horde/bench.sh python3 -I tmp/tl-04/tools2/ocr_some.py $(cat tmp/tl-04/ocr_rest_args.txt)`.
