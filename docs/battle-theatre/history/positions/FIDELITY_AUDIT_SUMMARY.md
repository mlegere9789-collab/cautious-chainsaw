# Fidelity audit of the OR position claims (independent read)

Sample: 30 documented claims per scope (A, B, C, D), fixed seed 20261020, stratified over the seven kinds (4 per kind, 2 extra from the largest kinds); list in `FIDELITY_SAMPLE.json`. positions_B.jsonl exists and has no "partial" in its name, so B is included. Each claim was read against at least 1,500 characters of normalised raw text before and after the anchor (running heads removed, hyphenation joined), plus, where the claim mentioned something outside the window, a search of the whole cited report. Judged against the passage only, not against history. Record per claim: `FIDELITY_AUDIT.jsonl`. No ledger was edited.

## Fidelity rate (FAITHFUL / sampled)

| Scope | n | FAITHFUL | OVERSTATED | SHIFTED | UNSUPPORTED_HERE | OCR_DOUBT | Rate |
|---|---|---|---|---|---|---|---|
| A | 30 | 22 | 3 | 2 | 2 | 1 | 73% |
| B | 30 | 28 | 0 | 0 | 1 | 1 | 93% |
| C | 30 | 26 | 2 | 0 | 1 | 1 | 87% |
| D | 30 | 17 | 5 | 2 | 4 | 2 | 57% |
| all | 120 | 93 | 10 | 4 | 8 | 5 | 78% |

With n = 30 per scope the rates carry wide uncertainty (roughly +/- 15 points); the ranking B > C > A > D is clear, the exact values are not. Several FAITHFUL verdicts carry a note (day-part inferred, hedge-free reading, road name normalised); these are listed in the jsonl `note` field and are not counted as defects.

## Every non-FAITHFUL claim

### Scope A

- **POS-A-11A-028** (arrival_road, OVERSTATED): place.printed adds "north of the town"; passage says only that the brigade was pushed through the town and took a position near the pike leading toward Harrisburg (no compass direction)
  - pattern: minor: direction inferred
- **POS-A-11A-051** (engagement, SHIFTED): claim puts the line "half a mile north of the batteries"; passage says the regiment was first ordered to a position about half a mile north, then ordered to move 1,000 steps backward and keep the same front, and the 6.30 p.m. attack came after that move
  - pattern: place at time of attack is the line after the 1,000-step move, not the half-mile-north position
- **POS-A-11C-022** (position, OVERSTATED): when.printed gives a 10.30 a.m.-to-noon window; Dilger's passage gives only an arrival about 10 a.m. and a 'short time afterward' advance; neither 10.30 nor noon appears
  - pattern: window derived from Osborn/other text and parenthesised; period turned into a clock window
- **POS-A-1D2-004** (position, UNSUPPORTED_HERE): the cited passage gives Cutler no hour for the detachment of the two regiments, only that the brigade left camp early and was about 2 miles out; the figure 10 a.m. appears only later in the same report, where it is the start of the whole brigade's action, so the hour is borrowed from another sentence
  - pattern: time borrowed from a later sentence
- **POS-A-1D3-069** (march, OVERSTATED): place.printed adds a compass direction (west of Gettysburg); the passage says only that the brigade arrived near the front where the battle was raging
  - pattern: minor: compass direction not in passage
- **POS-A-CV1-039** (march, OCR_DOUBT): time: the dispatch heading is OCR-damaged to a letter in place of the hour digit; claim reads it as 6 a.m. and marks it approximate; the road name Emmitsburg Road and the term First Corps are not in the passage, which says only the road on which the addressee (Reynolds, Left Wing) had marched
  - pattern: time uncertain by OCR; road name added
- **POS-A-CV2-023** (arrival_road, UNSUPPORTED_HERE): place.printed adds that the division came across country from the direction of Heidlersburg; Kilpatrick's passage says only that he moved across country toward the firing, and puts him at Berlin on July 1; the Heidlersburg direction is in Pleasonton's report (OR27-1-R336), not the cited one
  - pattern: claim attributes it to Pleasonton but cites Kilpatrick; time and activity faithful
- **POS-A-EXT-006** (position, SHIFTED): claim puts the 153rd PA line about half a mile north of the batteries from 5 p.m.; in the passage the 41st NY was ordered at 5 p.m. to a position half a mile north and then ordered 1,000 steps backward before the 6.30 attack, and the 153rd is placed only as the unit on the left of four companies of the 41st; the 2 p.m. instruction to support the 153rd refers to the earlier position
  - pattern: place of the 153rd is derived; same pattern as POS-A-1D1-051 (an order superseded within the same sentence group)

### Scope B

- **POS-B-us-12c-1d-lockwood-03** (arrival_road, OCR_DOUBT): printed digit "July 3" is what the passage reads, but the same passage places Lockwood's arrival before the Fifth Corps "arrived" and before the 8 a.m. order; the claim's date field is 1863-07-03 although its own text says July 2 in other reports; the digit 2/3 cannot be confirmed from this passage
  - pattern: claim encodes the printed digit and flags it itself (ocr_uncertain true); no road in passage though kind is arrival_road
- **POS-B-us-12c-59** (march, UNSUPPORTED_HERE): the label Pipe Creek movement is not in the Butterfield order (D0968, p.462), which refers only to the inclosed circular; the name is in the circular at p.458 (D0962); the rest (trains to Westminster, halt the command, wait for word that Reynolds has uncovered Two Taverns) is in the passage
  - pattern: minor: name imported from the enclosure

### Scope C

- **POS-C-0048** (position, OVERSTATED): place.printed says near the right of the line; the passage hedges (the author says what he supposed to be the right of the line); the hedge is dropped; the gloss naming the division's commander is the claim's own
  - pattern: minor: hedge dropped
- **POS-C-0356** (night_position, OCR_DOUBT): time: the passage prints the minute digit damaged (1.3 followed by a stray glyph); claim reads about 1.30 and gives no a.m./p.m. (daytime inferred from the whole-line fire that followed); all other elements are in the passage
  - pattern: OCR-damaged minute digit read as 30
- **POS-C-0389** (position, UNSUPPORTED_HERE): the clause about Battery F, Capt. Irish wounded as aide to McGilvery, and consolidation with C is not in Thompson's report (R323), which only carries the heading Batteries C and F; Irish as McGilvery's volunteer aide hit by a solid shot is in McGilvery's report OR27-1-R318 p.884; the date token in the passage is OCR-damaged and the date rests on context
  - pattern: time and place faithful; extra clause supported elsewhere
- **POS-C-0450** (movement, OVERSTATED): activity adds that this was the council of corps commanders; the circular states no purpose and leaves the hour of the meeting blank
  - pattern: purpose label is the compiler's gloss

### Scope D

- **PD-1c-mclaws-barksdale-04** (engagement, UNSUPPORTED_HERE): when.printed (the 2d) and evening of July 2 are not in the anchor passage: Hancock's sentence gives no date or hour (the ledger's printed_basis says the phrase is the nearest date phrase in the report); the passage shows only that Barksdale was left mortally wounded after the recapture of the guns; nearly dark appears two sentences later
  - pattern: date/time borrowed from elsewhere in the report
- **PD-1c-mclaws-semmes-04** (departure, UNSUPPORTED_HERE): the anchor passage (Kershaw) supports: on the 10th his and Semmes' brigades with a section of Fraser's battery went to the Antietam bridge near Macauley's, and next morning he rejoined the division near St. James College; the claim's second half (Motes, evening of July 11, battery right of the road, left of Semmes) is from another report (OR27-2-R440); when.printed next morning is the July 11 rejoin while the claim date is July 10
  - pattern: two reports merged in one claim; time phrase belongs to a different sentence than the date
- **PD-1c-mclaws-wofford-01** (engagement, OVERSTATED): place.description says Wofford came in from the rear at the stony hill, which is not in the passage (Kershaw says only that on emerging from the wood he saw Wofford coming in); when.printed the 2d and late afternoon are not in the passage (the ledger's printed_basis says nearest date phrase in the report); the passage ends near nightfall
  - pattern: embellished place; date/time phrase borrowed from elsewhere in the report
- **PD-1c-mclaws-wofford-03** (movement, OVERSTATED): place.printed is "Hagerstown" and direction_or_road "Hagerstown to Williamsport road"; the passage puts the action at Downsville (Stuart bivouacked near Hagerstown the night before) and names no road
  - pattern: minor: road and place name not those of the passage
- **PD-2c-rodes-daniel-45nc-01** (engagement, OCR_DOUBT): the report prints July 3 for both the formation in the grove near the seminary and the early march to support Johnson, while its own heading prints the dates as 1, 3 and 3 (digit 2/3 OCR confusion in the same report); the first fight is dated only by context; the July 3 grove clause is in a later paragraph of the same report, not in the anchor passage
  - pattern: date digits unreliable in this report
- **PD-3c-anderson-wilcox-01** (arrival_road, OCR_DOUBT): distance "1+ miles" is OCR-damaged (the glyph after 1 is not a legible fraction); claim reads it as 1 1/4; everything else (2.30 p.m., turnpike, halt of an hour, nearly 1 mile, battery on picket) is in the passage
  - pattern: fraction digit unreadable
- **PD-3c-anderson-wilcox-02** (position, OVERSTATED): claim says the Tenth and Eleventh Alabama cleared the woods held by the Third Maine and 1st US Sharpshooters with losses "10 killed, 28 wounded"; passage credits the Tenth Alabama's charge with breaking the line and gives 10 killed and 28 wounded for the Tenth only (the Eleventh lost 1 officer and 17 men wounded, separately)
  - pattern: casualty figure attached to both regiments; clearing credited to both
- **PD-anv-hq-08** (position, SHIFTED): when.printed "after nightfall" is when Wright retired to his original position; the order by Lee came "soon after" the late-afternoon move to cover Pickett's retreat, well before nightfall (claim's own description says late afternoon)
  - pattern: time phrase belongs to the following sentence
- **PD-cav-hampton-04** (departure, OVERSTATED): claim identifies the two cavalry brigades ordered by way of Cashtown as Hampton's (under Baker) and Fitz Lee's; the passage lists Baker's and Hampton's as the two brigades ordered via Cashtown and separately says two brigades on the Cashtown road were under Fitz Lee; the footnote that would equate them is not in the text
  - pattern: unit identification is the compiler's reading
- **PD-cav-hampton-05** (arrival_road, UNSUPPORTED_HERE): the Stuart clause (dispatch during the night July 1-2 to move 10 miles toward Gettysburg) is faithful; the clause that Hampton was at Hunterstown, 5 miles east of Gettysburg, on July 2 is attributed to Hampton (OR27-2-R567) and is not in Stuart's passage, which says only that his advance reached Gettysburg July 2 to thwart a cavalry move by way of Hunterstown
  - pattern: second clause from another report
- **PD-cav-horse-art-01** (engagement, UNSUPPORTED_HERE): Stuart's passage supports only that the artillery had left the crest it was essential to hold (its range was too short against the enemy's guns) and that he sent orders for its return; Hampton's two pieces for three brigades, Green's two Parrotts of Jones' battalion and General Orders No. 27 are from other reports; the claim also puts the departure before the enemy advanced, whereas the passage places it after the enemy had deployed sharpshooters and was advancing
  - pattern: three clauses from other reports; order of events reversed
- **PD-cav-jenkins-02** (march, SHIFTED): when.printed "the 28th" is the date of the scout's report later in the passage, not a date for Jenkins; the passage's "this time" is the moment Longstreet and Hill reached Chambersburg (encamped near Chambersburg on the 27th); the Rodes (OR27-2-R506) clause is from another report
  - pattern: date 28 June not supported for this fact
- **PD-corse-hanover-junction-02** (movement, OVERSTATED): claim states Seddon ordered Corse to leave 200 men and come to Richmond; the telegram is conditional on there being no reason to expect an enemy advance on Gordonsville and ends by asking Corse to telegraph if he can come
  - pattern: condition dropped; order stated flat

## Systematic patterns

1. **A time or date phrase taken from a different sentence than the fact** (most frequent; 8 claims). A-1D2-004 (the 10 a.m. that belongs to the whole brigade, applied to a two-regiment detachment), D-barksdale-04, D-wofford-01, D-jenkins-02, D-horse-art-01 (all four carry the ledger field `printed_basis`: "nearest clock or date phrase ... the distance can be long"), D-anv-hq-08 (after nightfall belongs to the retirement, not to the order), D-semmes-04 (next morning belongs to July 11, claim dated July 10), A-11C-022 (a 10.30-to-noon window built from another report). In scope D, 6 of the 30 sampled claims have `printed_basis`; 4 of those 6 are not faithful, against 9 of 24 without it. The ledger has 60 such claims in D.
2. **One claim merges text from a second report** (6 claims): A-CV2-023 (Heidlersburg, from Pleasonton), C-0389 (Irish/consolidation, from McGilvery), D-semmes-04 (Motes), D-hampton-05 (Hunterstown, 5 miles, from Hampton), D-horse-art-01 (three other reports), B-12c-59 (Pipe Creek, from the enclosure). The anchor quote only covers the first half, so `claim_support_verified` is true for a claim only half supported by its anchor.
3. **A later order in the same sentence group is ignored** (A-11A-051, A-EXT-006): the regiment is ordered half a mile north at 5 p.m., then 1,000 steps back before the 6.30 p.m. attack; the claims place the units at the first position at the later time.
4. **Glosses presented as printed text**: compass directions added (A-11A-028 north, A-1D3-069 west), a road name added (A-CV1-039; C-0072 only in the road field), a purpose added (C-0450 council), hedge dropped (C-0048 "supposed to be the right"), condition dropped (D-corse-02: the order was conditional), unit identity resolved by the compiler (D-hampton-04), a casualty figure attached to two regiments when it belongs to one (D-wilcox-02), a place named for the town rather than the action (D-wofford-03).
5. **OCR-damaged digits read with confidence** (5 claims): A-CV1-039 (hour glyph), B-lockwood-03 (2/3 date digit, already flagged by the ledger), C-0356 (minute digit), D-wilcox-01 (fraction), D-rodes-daniel-45nc-01 (report heading prints dates 1, 3, 3).
6. **No a.m./p.m. in the passage, meridian supplied** (B-kane-111pa-10 "about 1 o'clock", B-145ny-12, C-0439 "12" = midnight): each states its inference openly and was scored FAITHFUL, but they are inferences, not readings.
7. Not a problem in this sample: parenthesised editorial `when.printed` in scope A (198 claims; 8 sampled, 2 not faithful, no worse than the base rate). Quote-null claims in A (56, located by the `extract` field) and B (492, located through the earlier claim that quotes the same passage) were no worse than the rest.

## Recommendation per scope

- **A (73%)**: not acceptable as is for the time and place fields. Re-check the whole scope for patterns 1, 3 and 4: every claim whose `when.printed` hour is parenthesised or does not occur in the anchor passage (about 198 claims are parenthesised; check the hour against the full report), every `place.printed` with a compass direction or road name, and every claim whose activity contains two sentences. Unit/activity are mostly sound.
- **B (93%)**: accept as is. Optionally re-check the printed 2/3 date-digit case (B-lockwood-03, already flagged ocr_uncertain by the ledger) and the few multi-source claims (B-12c-59 pattern, 7 ledger claims mention another report id).
- **C (87%)**: accept with a light re-check for pattern 2 (claims whose activity names a second unit or a second report) and pattern 5 (OCR minute digits, e.g. "1.3(").
- **D (57%)**: re-check the whole scope. First the 60 claims with `printed_basis` (replace the borrowed date/hour phrase with the phrase in the claim's own sentence or drop the clock), then the 14 claims whose activity cites another report id (split them into one claim per report), then Confederate OCR-digit cases (2/3 and fractions). Until then treat D times and dates as `inferred`, not `documented`.

The `claim_support_verified` flag cannot be relied on for time and place: it was true for all 120 sampled claims, 27 of which are not fully supported by the anchor passage.
