# us-1c-1d-art: report of the third pass (2026-11-16)

Group `us-1c-1d-art` of `groups.json`: the I Corps entry, Wadsworth's First Division (Meredith's Iron Brigade, Cutler's brigade) and Wainwright's Artillery Brigade, with the two roster-gap units. Deliverable: `history/undrawn/us-1c-1d-art.jsonl`, in the contract of `undrawn/PLAN.md`. This report replaces the one of 2026-11-13 (152 records). Workstream bt-units.

## 1. Result

- **519 records**: 273 documented, 240 inferred, 4 open gaps, 2 source records (the two texts acquired for this group). No plausible-procedural record (the group files never hold that tier). Every datum carries its tier, a citation and a quote of at most 14 words that the checker finds in the text; a record that rests on a non-officer text (a state volume's sketch or inscription, a regimental history, a guide) is at most inferred, with its reasoning.
- The file grew from 152 records (first pass) to 306 (second pass) and now to 519. No claim id was renumbered or reused; the ids of the earlier passes stand.
- `python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py us-1c-1d-art --complete`: 0 errors, 2 warnings (records 0084 and 0209, whose notes say why no anchor exists), 0 of 17 leaf units still owed anything.
- The file is rebuilt from spec modules by code (offsets, pages, passages and quotes are computed from the local texts, not typed); the scratch builder is under `tmp/units-us-1c-1d-art/` (not shipped).
- Every conflict is carried and none is resolved: 35 clusters (section 4), conflict links reciprocal inside the file (the two links to ids outside it, `POS-A-1CA-001` and `RC-08`, are named in the records).

## 2. Units done

All 23 unit ids that carry records. Counts are records; kinds: arr arrival, road arrival_road, march, pos position, mov movement, eng engagement, night night_position, dep departure, str strength, order line_order, rid road_identification, gap, unit. The last column is the earliest arrival record of the unit's own (record, date/hour, source, tier).

| Unit | Name | Records | Kinds | Earliest own arrival |
|---|---|---|---|---|
| `us-1c` | I Corps (corps entry) | 15 | str 3 arr 3 rid 2 dep 2 pos 2 road 1 march 1 order 1 | 0389, 06/30 (day only), R007, inferred |
| `us-1c-1d` | First Division, Wadsworth | 42 | pos 21 eng 7 arr 4 march 4 order 3 road 2 mov 1 | 0345, 06/30 (day only), R029, documented |
| `us-1c-1d-meredith` | First Brigade (Iron Brigade), Meredith | 26 | pos 10 order 6 str 4 eng 3 arr 2 road 1 | 0504, 06/30 12:00 (approx.), CURTIS-1891, inferred |
| `us-1c-1d-meredith-2wi` | 2nd Wisconsin | 13 | pos 4 eng 4 mov 2 rid 1 road 1 str 1 | none of its own (see section 3) |
| `us-1c-1d-meredith-6wi` | 6th Wisconsin | 35 | pos 16 mov 5 str 3 eng 3 order 2 night 2 march 2 road 1 arr 1 | 0505, 06/30 (day only), DAWES-1890, documented |
| `us-1c-1d-meredith-7wi` | 7th Wisconsin | 13 | pos 4 eng 3 mov 2 rid 1 road 1 arr 1 gap 1 | 0021, 07/01 10:00 (approx.), R036, documented |
| `us-1c-1d-meredith-19in` | 19th Indiana | 7 | pos 3 str 2 eng 2 | none of its own (see section 3) |
| `us-1c-1d-meredith-24mi` | 24th Michigan | 25 | pos 9 mov 4 str 3 eng 3 arr 2 march 2 road 1 night 1 | 0376, 06/30 (day only), R033, documented |
| `us-1c-1d-cutler` | Second Brigade, Cutler | 35 | pos 12 eng 8 mov 7 order 3 rid 1 road 1 night 1 march 1 arr 1 | 0481, 07/01 (day only), NY2-S021, inferred |
| `us-1c-1d-cutler-7in` | 7th Indiana | 17 | pos 8 arr 2 mov 2 gap 2 eng 1 dep 1 str 1 | 0037, 07/01 (day only), R037, documented |
| `us-1c-1d-cutler-56pa` | 56th Pennsylvania | 18 | str 5 mov 4 eng 4 pos 2 rid 1 road 1 arr 1 | 0514, 06/30 12:00, PA1-S018, documented |
| `us-1c-1d-cutler-76ny` | 76th New York | 18 | str 5 mov 5 pos 4 eng 2 arr 1 road 1 | 0043, 07/01 10:30 (approx.), R039, documented |
| `us-1c-1d-cutler-84ny` | 84th New York (14th Brooklyn) | 29 | pos 10 eng 10 mov 7 str 2 | none of its own (see section 3) |
| `us-1c-1d-cutler-95ny` | 95th New York | 21 | pos 12 mov 3 str 2 night 2 eng 2 | none of its own (see section 3) |
| `us-1c-1d-cutler-147ny` | 147th New York | 25 | pos 8 mov 8 eng 5 str 2 arr 1 road 1 | 0044, 07/01 09:30 (approx.), NY3-S006, inferred |
| `us-1c-art` | Artillery Brigade, Wainwright | 26 | pos 8 eng 6 order 5 arr 2 road 1 gap 1 rid 1 mov 1 march 1 | 0074, 07/01 10:30 (approx.), R071, documented |
| `us-1c-art-2me` | 2nd Maine Battery (Hall) | 35 | pos 13 mov 7 arr 6 eng 4 str 2 road 1 night 1 march 1 | 0346, 06/30 (day only), R029, documented |
| `us-1c-art-5me` | 5th Maine Battery (Stevens) | 29 | pos 12 eng 9 mov 2 night 2 rid 1 arr 1 road 1 str 1 | 0086, 07/01 (day only), ME-S004, inferred |
| `us-1c-art-1nyl` | Battery L, 1st New York (Reynolds) | 38 | pos 15 eng 13 mov 5 arr 2 rid 1 road 1 night 1 | 0094, 07/01 11:00 (approx.), R074, documented |
| `us-1c-art-1pab` | Battery B, 1st Pennsylvania (Cooper) | 36 | pos 12 eng 11 mov 4 arr 3 road 2 str 2 rid 1 night 1 | 0425, 06/30 (day only), PA2-S031, documented |
| `us-1c-art-4usb` | Battery B, 4th US (Stewart) | 10 | pos 6 eng 3 night 1 | none of its own (see section 3) |
| `us-1c-art-1nye` | Battery E, 1st New York (attached to Battery L; roster gap) | 2 | unit 2 | none of its own (see section 3) |
| `us-1c-hq-1mecav-l` | 1st Maine Cavalry, Company L (I Corps headquarters; roster gap) | 2 | unit 1 march 1 | none of its own (see section 3) |

Records by source (the source of each record's quote):

| Source | Records |
|---|---|
| Official Records, Series I, vol. 27, parts 1 and 3 | 306 |
| State volumes (NY2) | 36 |
| State volumes (NY3) | 35 |
| State volumes (PA2) | 34 |
| State volumes (ME) | 31 |
| DAWES-1890 | 21 |
| State volumes (PA1) | 17 |
| CURTIS-1891 | 12 |
| State volumes (NY1) | 7 |
| BACH-WHATTOSEE-1889 | 7 |
| State volumes (BL3) | 3 |
| State volumes (MI) | 2 |
| State volumes (FOX) | 1 |
| IN-1913 | 1 |

What the third pass added to what the earlier passes held: the group's own reports were read again for sentences no record covered (a coverage tool lists the sentences that overlap no passage) and the neighbouring reports were swept for the group's units; the regimental addresses, sketches, inscriptions and tablets of the New York volumes (NY2-S013, S018, S021; NY3-S006, S023, S024) were scanned sentence by sentence with the coverage tool and every passage about the group's units read in full; the Maine volume's sketches of Hall's and Stevens' batteries (ME-S001, ME-S004), Gardner's address for Cooper's battery (PA2-S031), Hofmann's address for the 56th Pennsylvania (PA1-S018), the commission's narrative of the first day (NY1-S001), the chapters of Dawes and Curtis for 30 June to 5 July and Bachelder's guide of 1889 were read for the same purpose.

Facts of the pass worth naming (all in the file, each with its quote):

- Dates before 1 July: the First Corps on the night of 30 June (Marsh Run or Marsh Creek, Howard R243, itinerary R007, Doubleday R029, Morrow R033, Dawes' letter, Curtis, Hofmann: noon at Marsh Creek on the south bank by the pike bridge; Emmitsburg except Wadsworth's division, Bachelder 1889).
- Routes: the leaving point at the Codori house (Hofmann, Pierce, the 95th sketch, Bachelder), Cooper's battery on the western road by the White bridge and Willoughby Run (Gardner, Bachelder), the order of the corps artillery on the march.
- Positions anchored on monuments and markers (MON-154, MON-291, MON-297, MON-298, MON-303, MON-357): each anchor carries the printed statement that the monument stands where the unit stood.
- Times: clocks printed in numerals are coded as clocks; times in words ("eleven o'clock", "lo o'clock" for 10) are carried by sequence with the hour in the note (second request note).
- Facing: only where a compass word or a named place is printed (facing the town, toward Oak Hill, west and northwest, the northwest of the Twenty-fourth Michigan's monument); never inferred.
- Builds on the ground: the four lunettes of Cooper's battery (finished on the morning of 2 July, the start not printed), the breastworks of Cutler's brigade on Culp's Hill (no hour printed), the earthworks of the batteries outside the cemetery gate at dusk on 1 July. No earthwork is placed before its printed window.

## 3. Gaps and units without a record of their own

**Four open gaps** (each with what was searched, and a proposed register entry in `GOVERNANCE/horde/ws-units/proposed-register/us-1c-1d-art-*.md`; none is in `register/` yet, the integrator or the owner files them):

| Claim | Unit | What is missing | Searched (count of source entries, now including Bachelder 1889 and Curtis) |
|---|---|---|---|
| 0111 | 7th Wisconsin | strength on 1 July | 7 entries; the OR reports of the brigade, Fox, Dawes, Curtis, Bachelder, a pattern search over the volumes and the texts; Busey and Martin is not public domain and is not acquired |
| 0112 | 7th Indiana | strength on 1 July | 7 entries; the one figure found is a later historian's "nearly five hundred" (record 0293, inferred) |
| 0113 | 7th Indiana | the road from Emmitsburg to Gettysburg on 1 July | 6 entries; Grover, Cutler and Hofmann print the detachment and the junction at Cemetery Hill and no road; the 95th sketch prints only that the regiment guarded trains |
| 0114 | Batteries L, B (4th US), E | strength on 1 July | 5 entries; the returns, Wainwright, Breck, Hunt, the Battery E and L sections of NY3 print losses and guns, not strength |

Each gap has a proposed way to draw the unit that is not in the file (the corps-level road for the 7th Indiana, the battery's gun count for the batteries); the product marking for such a unit must say "open gap" and name the register entry.

**Units with no arrival record of their own**: the 14th Brooklyn (84th New York), the 95th New York, the 19th Indiana, the 2nd Wisconsin (road only), Battery B 4th US, Battery E 1st New York and Company L 1st Maine Cavalry. The reports of Fowler (R040) and Pye (R041) print no hour or place for the arrival of their regiments; no report of the 19th Indiana is among the reports read; Battery B (4th US) has the hour of its help to Wadsworth (R032) and its places, not an arrival. These units are carried with the arrival of the brigade or the corps above them (records 0004, 0030, 0481 for Cutler's brigade; 0015 and 0017 for the Iron Brigade; 0074 and 0076 for the artillery brigade): that is what the checker requires and what the sources print; it is not an arrival of their own and the integrator must not give them a time of their own.

**Roster-gap units**: Battery E, 1st New York (records 0106 and 0107: the organization table prints it as "attached" to Battery L and the sketch says it was transferred to L on 20 June 1863 and fought with it; it has no separate entry in any report, so it is drawn as part of Battery L and its strength is in gap 0114) and the 1st Maine Cavalry, Company L (records 0105 and a march record: it stood at corps headquarters as Reynolds' escort, Doubleday prints; no figure of its own).

**Days and places not printed**: for the batteries on 2 and 3 July, some positions are given by the printed words only ("on the hill", "outside the cemetery gate"); where a printed word names no anchor the record keeps the words and the checker's two warnings say so (0084, 0209).

## 4. Conflicts carried (35 clusters, none resolved)

Records are named by their last four digits. "R" is an Official Records report. Each cluster is a set of records that cannot all be true; the integrator carries them as selectable scenarios.

| # | Records | What differs |
|---|---|---|
| 1 | 0089, `POS-A-1CA-001` | where the Fifth Maine Battery was at daylight on 1 July: with the artillery brigade between Marsh Creek and Gettysburg (Maine sketch) against the layer's claim; Wainwright (R071) puts the main body about 2 miles from Emmitsburg with marching orders about 8 o'clock |
| 2 | 0186, `RC-08` | "the Fairfield road" of Dawes (R035): the Hagerstown road or the road from the Peach Orchard (concordance row RC-08, request note 1) |
| 3 | 0001, 0002 | Doubleday's two figures for the First Corps at the start: about 8,300 and about 8,200 |
| 4 | 0004, 0015, 0016, 0021, 0043, 0044, 0194, 0209, 0311 | the arrival of the division and the brigades on 1 July: 9 a. m. (24th Michigan), 9:30 (147th New York), about 10 (division, Iron Brigade, 7th Wisconsin), 10.10 (Buford's dispatch of the head of the column), 10:15 (Wadsworth), 10:30 (76th New York), 11 (56th Pennsylvania engaged) |
| 5 | 0010, 0137, 0138, 0502 | the line of the Iron Brigade: Doubleday, Second, Seventh Wisconsin, Nineteenth Indiana, Twenty-fourth Michigan from right to left; Morrow, the Nineteenth Indiana on the left of the Twenty-fourth and the Seventh Wisconsin on its right; Robinson, the Seventh on the right of the Second; Curtis, the Twenty-fourth in the centre, the Nineteenth on its left, the Seventh and Second Wisconsin on its right |
| 6 | 0012, 0125 | strength of the Iron Brigade: 1,883 engaged (Fox) against 1,800 (Dawes); the plan's roster holds 1,830 |
| 7 | 0031, 0032 | order of Cutler's regiments: Hofmann's column (76th NY, 56th PA, 147th NY, 95th NY, 14th Brooklyn) against Pierce's formation (guard of 18, 76th, 56th, 147th, 14th Brooklyn, 95th) |
| 8 | 0040, 0041, 0042 | the detachment of the 56th Pennsylvania, 7th Indiana and 95th New York to the cemetery on 3 July: the evening (Grover), about 3 p. m. (Pye), late afternoon (Hofmann) |
| 9, 10 | 0045 to 0048 | strength of the 76th New York: 348 men and 27 officers (Cutler) against 346 and 24 (Bachelder); one record per figure, men and officers |
| 11 | 0053, 0453, 0454 | the night encounter of the 14th Brooklyn on 2 July: near dark (Fowler), after dark (Low, 1887), about 9 P. M. (the tablet on Culp's Hill) |
| 12 | 0073, 0495 | the march order of the corps on 1 July: first division, third, artillery brigade, second (Wainwright) against the batteries of Stevens, Reynolds and Stewart behind the first division on the pike and Cooper with the third division on a western road (Bachelder) |
| 13 | 0074, 0094 | the arrival of the artillery brigade: about 10.30 within 2 miles (Wainwright), about 11 a. m. at the scene (Breck) |
| 14 | 0081, 0082 | Hall's battery into action: 10.15 and 500 yards beyond the seminary (Hunt), 10.45 and 400 yards (Hall) |
| 15 | 0084, 0152, 0278, 0312, 0313, 0410 | Hall's battery on 2 and 3 July: to the rear for repairs on 2 July (Hall, Maine volume) against in Osborn's line on the hill on the 2nd and 3rd (Hunt, Osborn) |
| 16 | 0090, 0091 | Whittier's "morning of the 3d instant" fire at 1,500 yards: read as 2 July or as 3 July |
| 17 | 0092, 0401 | the Fifth Maine on 3 July: engaged an hour early in the morning (R073) against not actively engaged (Maine volume) |
| 18 | 0096, 0139, 0455 | Battery L on 3 July: engaged from Cemetery Hill (monument inscription), not engaged (Breck 1889), replied at first and was then forbidden (Breck's report, record 0387) |
| 19 | 0098, 0425, 0426 | Cooper's battery on 30 June: camp near Emmitsburg (R075) against Marsh Creek (Doubleday, Gardner) |
| 20 | 0102, 0103 | Cooper's battery to the front on 3 July: about 3 p. m. (Cooper) against 1 p. m. (Gardner) |
| 21 | 0122, 0124 | the Sixth Wisconsin: 340 in the ranks against 420 who started from the turnpike fence (Dawes, one chapter) |
| 22 | 0146, 0147, 0427 | Cooper's first position of 1 July: an oat-field 350 yards (Wainwright) or 380 yards (Hunt) south of the Cashtown road, or a crest south of the McPherson wood (Gardner) |
| 23 | 0189, 0503 | the capture at the railroad cut: the Second Mississippi of Davis' brigade (Dawes) against Archer's remnant (Curtis) |
| 24 | 0218, 0219 | the 147th New York's retreat: held until relieved by a charge (Cutler, Doubleday) against not cut off, ordered by Wadsworth's adjutant (Pierce) |
| 25 | 0228, 0230, 0456, 0457, 0522 | the 14th Brooklyn and the gun of Hall's battery: recaptured by the charge (Fowler's report, the commission narrative) against drawn off by one of Hall's officers (Fowler's letter of 1888 quoted by Pierce); the regiment stayed at the cut until the final retreat (monument) against left it for the brigade and the seminary (R040, R037) |
| 26 | 0232, 0233 | who sent the 7th Indiana to Culp's Hill on 1 July: Wadsworth (Cutler) or Hancock (Hofmann); Hunt (BL3, record 0294) has Wadsworth lead it and Hancock order Wadsworth there |
| 27 | 0249, 0250 | the Fifth Maine at the seminary: on Stewart's left (Whittier) or to the right of Cooper (Wainwright, Maine volume) |
| 28 | 0251, 0252, 0253, 0402 | the Fifth Maine's knoll on the night of 1 July: right and rear of Cemetery Hill (Whittier), right and 50 yards in front of the other batteries (Wainwright), the knoll at the end of Culp's Hill sent by Hancock (Maine volume) |
| 29 | 0258, 0265 | the retirement of 1 July: all batteries down the pike and through the town (Wainwright) against four of Battery L's pieces to the Taneytown road (Breck) |
| 30 | 0262, 0298 | Battery L's second position: 500 yards behind the first, west of the seminary (Breck) against the field south of the pike behind the McPherson woods facing north (commission narrative) |
| 31 | 0273, 0428 | Cooper's retirement through the town: about 5 p. m. (Cooper) against after 4 p. m. (Gardner) |
| 32 | 0291, 0292 | the 24th Michigan on 5 July: moved to near the ground of the final charge (Sergeant Green) against Culp's Hill (Captain Edwards' dateline) |
| 33 | 0304, 0305 | Whittier's afternoon after the "morning of the 3d instant": 2 July or 3 July |
| 34 | 0388, 0389, 0496 | the First Corps on the night of 30 June: Marsh Run (Howard, itinerary) against Emmitsburg except Wadsworth's division at Marsh Creek (Bachelder 1889); the three are records of the corps, and records 0497 and 0498 (Wadsworth's division and Hall's battery at Marsh Creek) agree with all three |
| 35 | 0415, 0429 | Cooper's battery at the seminary: about 2 p. m. (Maine volume) against about 3 p. m. (Gardner) |

Smaller disagreements are written in the notes of the records and are not made clusters (for example the officer who ordered the 95th New York and the Fourteenth Brooklyn to the left: Reynolds in Cutler's report and Bachelder, Wadsworth in Hedges and the 95th sketch; the place and the time are the same in all of them).

## 5. Evidence read

**Official Records, Series I, vol. 27, part 1** (read in the group's own reports and swept for the units in the neighbours'): R028 (Hunt), R029 (Doubleday), R030 (Newton), R032 (Wadsworth), R033 to R036 (Morrow, Mansfield, Dawes, Robinson), R037 (Cutler), R038 to R042 (Grover, Cook, Fowler, Pye, Hofmann), R071 to R075 (Wainwright, Hall, Whittier, Breck, Cooper), R007 to R009 (itinerary, returns, organization), and for corroboration or conflict R006, R061, R067, R076, R231, R243, R253, R264, R271, R272, R293, R307, R311, R312, R327, R328, R337, R374 and one page of part 3. The sentence-coverage tool was run over the group's own reports. For the brigade and regimental reports (R032 to R042, R072 to R075) the sentences it still lists name no place, hour, strength or order of a unit of the group (staff officers, decorations, individual acts, later days of the march). For the long reports of Hunt (R028), Doubleday (R029) and Wainwright (R071) it still lists 128, 156 and 23 sentences that contain place or time words; they concern the army, other corps and other batteries, were swept for the group's units in the earlier passes and were not re-read one by one after the last additions.

**State volumes** (section ids): NY1-S001; NY2-S013 (76th New York: inscription, Bachelder's address), S018 (14th Brooklyn: inscription, two tablets, Low's oration, Fowler's address), S021 (95th New York: sketch, Hedges' address); NY3-S006 (147th New York: sketch, Pierce, Fowler's letter), S023 and S024 (Battery E and L: inscriptions, Breck's address, the oration of Gen. John A. Reynolds); PA1-S018 (Hofmann); PA2-S031 (Gardner), S035 (Ricketts); ME-S001, ME-S004 (the Second and Fifth Maine Batteries, the sketch of the artillery brigade); MI-S009 (24th Michigan); BL3-S028 (Hunt, 1887); FOX-S002, S204, S209.

**Texts acquired for this group** (declared by `source` records inside the file, public domain, archive.org, read by the builder from `tmp/units-us-1c-1d-art/texts/`):

| Record | Source | Archive identifier | Bytes | sha256 |
|---|---|---|---|---|
| 0119 | `DAWES-1890`, Service with the Sixth Wisconsin Volunteers (1890) | `servsixthwiscon00dawerich` | 850,918 | `b168059e595763a9d53e209a09d286f84ce60cb55a67654e28cabd18e9c367a7` |
| 0133 | `CURTIS-1891`, History of the Twenty-fourth Michigan of the Iron Brigade (1891) | `24thmichiganiron00curtrich` | 1,215,856 | `722f4b6fe42095cc8e85aba788402fbd63e41129794cd522af43fffa7be9f1f9` |

**Texts of the library read this pass**: `BACH-WHATTOSEE-1889` (and the 1873 edition, which prints the same sentences and is the same witness), `IN-1913` (the roster and regimental sketches: no narrative of the 7th Indiana, the 19th's loss only), `MEADE-LL-v2` (read for the group's units: a compilation from the reports; no record). Searched by pattern for the units' names and not read in full, no record made: `PIERCE-F-1914`, `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `HASKELL-1908`, `ALEXANDER-1907`, `LONGSTREET-1896`, `SHSP-04`, `SHSP-05`, `SHSP-06`, `BACH-REPULSE-1870`, `BACH-STORY-1904`, `OH-DED-1887`, `MN-1ST-1916`; the 1863 newspapers were not searched for these units in this pass.

**Not read, owner-only**: Busey and Martin, Regimental Strengths and Losses at Gettysburg (not public domain; reading it needs a purchase or licence, an owner act). It is the likeliest source for the four strength gaps.

Network: no request was made in this pass; the texts used were already local. A proxy notice about a connection to a host outside the allow-list appeared once earlier in the session; it was not an action of this group.

## 6. Defects found in the earlier file and corrected in this pass

- Records that stated more than their passage prints (a footnote read as text of the sentence, an hour of arrival put at 3:30 where 3 p. m. is printed, an adjective not in the passage, "after half an hour" outside the quoted span) were corrected or their passages widened; each correction was made against the full text of the passage.
- One conflict that was not one (Hall at 9 a. m. against Wadsworth at 8 a. m.: two different things) was removed; conflicts exist only where two statements about the same thing differ.
- One sentence was dropped as a record because it prints no place (Newton: the First Division "also not engaged").
- Places printed as roads were re-anchored (a road is not a place: `along_road` with the place it was near); `printed` fields that were not verbatim in the passage were made verbatim; statements over 400 characters were cut to what the passage prints.
- OCR defects of the texts were read, not copied: `2d` and `3d` printed `3d` and `3d`, `Gulp's` for Culp's, `lo` for 10, `i` and `I` for 1, split words (`Sev enth`, `hun dred`, `construc tion`), a page head inside a sentence. The records say so in their notes and carry `ocr_uncertain` where a figure is read through a defect.
- Two lists the checker cannot read (clock words, the gazetteer's lack of Emmitsburg) are in the request notes below.

## 7. Not coded, and why

- The march of 25 to 29 June (the Potomac at Edwards Ferry, Middletown, Frederick on the 28th, the rear guard of 29 June, the bivouac after midnight near the southern end of Emmitsburg): outside the loaded ground and no gazetteer id for Emmitsburg or Frederick (request note 2); the 30 June records carry what falls inside.
- The 24th Michigan's fourth, fifth and sixth lines of battle (Curtis): no place is printed for the fourth and fifth, the sixth is the barricade already in record 0180; the regiment's lines of the first three are in Morrow's records.
- The dispute whether the 147th New York was "rescued" (Pierce against Doubleday's book as he quotes it, and Fowler): a matter of interpretation of other regiments' acts; the positions and the retreat orders are coded, the claim of rescue is not.
- "Twenty-eight of the enemy's guns at once opened" on Battery L (the orator Reynolds quoting Bachelder): hearsay of the orator, not a datum of a unit of this group.
- The casualties of Battery L on 1 July (1 killed, 15 wounded, 1 missing on its monument): carried in the statement of the engagement record 0458; the contract has no casualty record.
- Meade's Life and Letters (Stewart's battery "First United States Artillery" posted on Cutler's line): an apparent misprint for Fourth in a compilation; not coded.
- Counts that are not strengths: the 75 men of the 147th New York rallied behind Seminary Ridge are in the note of record 0488 and not a strength record; the 26 men who followed Captain Edwards through the town (Curtis) are not coded.

## 8. Owner-only acts and requests

- Owner-only: buying or licensing Busey and Martin to read the four strength gaps; filing the four proposed register entries; any decision on the default of any conflict cluster (Law 6: none was made here, no recommended default is logged; nothing was appended to the delegated decisions).
- Request notes of this group in `GOVERNANCE/horde/requests/`: `bt-units-us-1c-1d-art-statevol-index.md` (section headings of the state-volume index), `bt-units-us-1c-1d-art-clock-forms.md` (hours printed in words, the Fairfield road, the 10:20 gate of the division against printed arrivals), `bt-units-us-1c-1d-art-clock-forms-2.md` (three more words-only hours, a gazetteer entry for Emmitsburg and Frederick).

## 9. What was checked, and what was not run

Run: the group checker with `--complete` on the file as it stands (0 errors, 2 warnings), and before every publish of the pass; the file is the output of the builder (`make3.py --publish`) from the spec modules, which refuses to replace the file when the checker reports an error, and a fresh build from the specs is byte-identical to the file (sha256 `f2c4486d2ea1ed62d18cde661d4c9b3dd6964c85b7e7b0ccf73c4935a34bac3c`); a full read of every new record against its passage before it was published; the copy audit of the file, this report, the proposed entries and the request notes (no mention of how the data was produced and no tool or company name; the only hit of a search for such words is the register template's own row label "Autonomous substitute applied").

Not run: the checker over all groups and its self-test (queued behind the timing jobs of the machine lock and not completed when this report was written, see the progress line), the governance check, any browser job, any gate runner, the node suite. Nothing was committed, pushed or deployed and no `passes` flag was touched. No credential, account or key was used; the texts used were already local.
