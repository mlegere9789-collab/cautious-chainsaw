# OR-RECHECK: shard quotes vs Official Records Ser. I vol. 27 OCR text

Method: `or_recheck.py` (this folder; run `python -I or_recheck.py`, then `make_report.py`) reads every `horde/*/results.jsonl` (read-only), extracts quote strings (fields `quote`, `exact_quote`, `passage_quote`, `quote_under_15_words`; plus, lower confidence, double-quoted fragments of 4+ words inside `passage_ref` / `supporting_passage*` free text), and searches them in the raw OCR text of pt.1-3 (archive.org cu31924077699761, cu31924077728255, cu31924077700262; sha256 in tmp/library/or27/MANIFEST.json, identical to library/acquired.json) using the or27_find normalised view (whitespace, line-break hyphenation, running heads removed). Verdicts: **yes** = verbatim in the normalised text; **fuzzy** = matches only after case/punctuation/ligature/long-s squashing (distance 0) or within 15% edit distance (distance recorded); **no** = not found (nearest candidate recorded, never accepted); **not_checkable** = attributed to a non-OR source (e.g. New York at Gettysburg), not in the downloaded text. A quote is searched in its claimed part first, then the other parts. Offsets are character offsets in the original raw file. Ellipsis/bracketed quotes are split into pieces, all of which must match.

## Counts

| group | yes | fuzzy | no | not_checkable | total |
|---|---|---|---|---|---|
| structured quote fields | 638 | 1 | 9 | 25 | 673 |
| embedded quoted fragments in free text (low confidence) | 189 | 24 | 47 | 0 | 260 |
| all | 827 | 25 | 56 | 25 | 933 |

Distinct quote strings checked (excluding not_checkable): 765. The same quote often appears in several fields or shards.

Citation drift among found quotes: report id differs from the shard citation 2, printed page differs 9 (often a one-page or page-range difference), found in a different part than claimed 16. Short generic quotes (e.g. "At 12 m.") match their first occurrence and are inherently ambiguous. See `note`.

## Quotes NOT found

### Structured quote fields (9)

All are tl-12 strings labelled `quote` that are summaries/paraphrases (form "Name: ..."), not verbatim text, so they cannot match; they should not be presented as quotations.

- tl-12 T3-163 (pt.2 claimed, nearest edit distance None): Guild: on the evening of the 4th the ambulance trains left by two routes, one by Cashtown, one by Fairfield; the Fairfield train was attacked, wagons destroyed,
- tl-12 T3-174 (pt.2 claimed, nearest edit distance 88): Stuart: Robertson (his own and Jones' brigades) was on the right near Fairfield and was instructed to hold the Jack Mountain passes; Jones' brigade later arrive
- tl-12 T3-174 (pt.1 claimed, nearest edit distance 57): Army list of engagements: Fairfield Gap, Pa., Jul 4 (a Union cavalry skirmish, Custer's column) and a skirmish near Fairfield Jul 5
- tl-12 T3-180 (pt.1 claimed, nearest edit distance None): Kilpatrick: Jul 6 early marched on Hagerstown, fell suddenly on Stuart and routed him; a charge through the streets (Snyder killed); later forced back toward Wi
- tl-12 T3-180 (pt.2 claimed, nearest edit distance 90): Stuart: Iverson's small body of infantry held the north edge of Hagerstown with Robertson's and Chambliss' cavalry; the enemy's dismounted skirmishers fought fr
- tl-12 T3-180 (pt.1 claimed, nearest edit distance 69): Meade (Jul 6, 2 p.m., Gettysburg): resumed the movement to Middletown after Sedgwick's report on the Fairfield gap; expects to assemble the army there by tomorr
- tl-12 T3-191 (pt.1 claimed, nearest edit distance 16): Buford: Jul 8 the enemy attacked at 6 a.m.; fighting lasted until about 5 p.m.; enemy driven back about 4 miles
- tl-12 T3-191 (pt.1 claimed, nearest edit distance 102): Devin (2nd Bde, Buford): Jul 8 the enemy advanced in force down the Hagerstown turnpike; his brigade supported the First Brigade under the enemy battery until o
- tl-12 T3-193 (pt.1 claimed, nearest edit distance 103): Army itinerary Jul 9: HQ to Turner's Gap; Second Corps Frederick to Rohrersville; Third to Fox's Gap; Fifth near Boonsborough; Sixth to Boonsborough; Twelfth to

### Embedded fragments of free text not found (47; LOW CONFIDENCE)

Extracted by pattern from quotation marks inside prose fields. Many are paraphrase, code regexes, web-page text (NPS, LOC) or extraction artifacts, not OR quotations. Listed so none is hidden; each needs a human look before being called a defect.

- fence-3 R14.S-066:  (276 hits) and for the object names found nothing that bears on this row. OR27 hits for 
- r03-2 R03.C-030:  (claim check e4/g3); Hays p.454 
- r03-2 R03.C-041:  for Ewell's); Hill p.607 
- r03-2 R03.C-042: (General|Gen.) Lee ... (arrived|reached|came upon|rode up|present)
- r03-2 R03.C-044: was established east of Gettysburg
- r03-2 R03.C-044: over 20,000 injured Union and Confederate soldiers that passed through the hospital's wards
- r03-2 R03.C-045: (light|gentle|strong|no|slight) (breeze|wind)|wind (was|blew|blowing)|miles an hour
- r03-2 R03.C-045: Open gap. Render a wind of 2 to 6 mph from S to SSW. The range is inferred.
- r03-2 R03.C-046: 8,900 / 8,000 dead/buried/killed
- r22-oa R22.0001: arrived in Gettysburg on the evening of November 18
- r22-oa R22.0011: spoke steadily for two minutes
- r22-oa R22.0011:  (Everett's characterization, not a measured time); LOC: five known manuscript copies, two at the Library (Nicolay, Hay), Nicolay and Hay di
- r22-oa R22.0000: A camera rise and swirl (spiral time-lapse)
- r22-oa R22.0000: every B.12.2 row and every S-080 to S-088 state with a tier
- r22-oa T3-144: We must now return to Virginia.
- r22-oa T3-145: The moon was high in the clear sky
- r22-oa T3-146: About 11 o'clock a horseman came to summon me to General Lee
- r22-oa T3-146: as late, I think, as 2 a. m.
- r22-oa T3-149: Shortly after noon of the 4th the very windows of heaven seemed to have opened. The rain fell in blinding sheets
- r22-oa T3-158: It was apparent by 9 o'clock that the wagons ... could not be collected and made ready to move till late in the afternoon
- r22-oa T3-158: About 4 p. M. the head of the column was put in motion near Cashtown
- r22-oa T3-158: the entire column was seventeen miles long
- r22-oa T3-158: After dark I set out from Cashtown
- r22-oa T3-163: from almost every wagon for many miles issued heart-rending wails of agony
- r22-oa T3-163: without food for thirty-six hours
- r22-oa T3-164: The storm continued, and the darkness was appalling
- r22-oa T3-166:  (D1075); Ingalls to Meigs 8.10 p.m. 
- r22-oa T3-170: the citizens to the number of thirty or forty attacked the train with axes, cutting the spokes out of ten or a dozen wheels and dropping the
- r22-oa T3-178: After dark I set out from Cashtown
- r22-oa T3-181: ordered as many of the wagoners to be formed as could be armed with the guns of the wounded
- r22-oa T3-181: By noon about 700 wagoners were organized into companies of 100 each
- r22-oa T3-181: The enemy appeared in our front about half-past one o'clock
- r22-oa T3-181: ; train reached Williamsport the afternoon of 5 Jul; river 
- r22-oa T3-182: the tremendous rains had raised the river more than ten feet above the fording stage
- r22-oa r22-oa-NR-01: The Confederate Retreat from Gettysburg
- r22-oa r22-oa-NR-05: The Confederate Retreat from Gettysburg
- r22-oa r22-oa-NR-06: The Confederate Retreat from Gettysburg
- r22-oa r22-oa-NR-10: The Confederate Retreat from Gettysburg
- r22-oa OA08: timeline rows do not yet place any unit
- r22-oa r22-oa-LK-01: Gettysburg Address - Nicolay Copy
- tl-05 T2-056:  and massed near the Rock Creek bridge; itinerary p.595: marched 4 a.m., 6 miles, 
- tl-10 T3-049: only civilian killed directly
- tl-10 T3-049:  (internal inconsistency). No hour of day on the page; 
- tl-10 T3-066: ordered a column of attack of Pickett's, Heth's and part of Pender's divisions
- tl-10 T3-080: ; then to the Artillery Reserve park; went to report but 
- tl-10 T3-088: ; Cushing killed, Milne mortally wounded; Webb p.428: by 2.45 the enemy 
- tl-10 T3-101: ); Hancock: attacking force 

### Fuzzy (25)

See results.jsonl rows with found=fuzzy (edit_distance and note).

### not_checkable (25)

Quotes attributed to non-OR sources (fence-2 New York at Gettysburg etc.); not verified here.
