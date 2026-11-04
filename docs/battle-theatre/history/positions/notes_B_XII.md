# Notes: Scope B, XII Corps (Slocum; Williams / Ruger; Geary; Muhlenberg), positions ledger

Written by the XII Corps helper. Built by `cd tools/bt && python -I positions_claims.py B XII` from `tools/bt/positions_data_B_XII_a.py ... _i.py, _z.py` (helper `tools/bt/xii_helpers.py`) into `docs/battle-theatre/history/positions/partial_B_XII.jsonl`. Every quote is located and verified by the builder; nothing was typed from memory. Reports R271-R314 were read in full (R277 is unreadable, see 6). Part 1 was searched for "Twelfth (Army) Corps|Slocum" (193 hits outside R271-R314 examined), Part 3 for Slocum / Twelfth Corps / Geary / Ruger / Williams / Lockwood (291 hits; the 36 June 27 - July 5 documents were dumped and read), Part 2 for the XII Corps unit and commander names (320 hits: no Confederate report names a XII Corps unit with a time; Ewell R467 p. 446 quotes a Sykes-to-Slocum dispatch of 12 midnight).

Counts: 794 claims = 738 documented, 49 inferred (date or hour derived; reasoning stored), 7 open gap. By division (including their brigades and regiments): corps 64/5/1, First Division 320/23/4, Second Division 288/18/1, Artillery 66/3/1 (documented/inferred/gap). Dates and hours are as printed; approx=true where the OR says "about". The `conflicts_with` links are symmetric; a pair that prints the same clock time is not linked; a claim without a clock time is not linked to a timed claim of the same date (the time groups below show every printed value).

Strength tables in the XII Corps reports (R271-R314 and R013) are numerically unreadable in the OCR; only figures that appear in running text were taken (strength_note claims: Kane 652/650, Lockwood 1,700 / 2,500 / 2,100, regiment figures, Hunt gun counts).

## 1. Coverage per unit (claims; earliest and latest dated claim; roads and positions)

| unit | claims | doc | inf | gap | earliest | latest | road claims | position claims | verdict |
|---|---|---|---|---|---|---|---|---|---|
| us-12c (XII Corps) | 70 | 64 | 5 | 1 | 1863-06-27T20:30 | 1863-07-06T05:00 | 11 | 26 | full |
| us-12c-1d (1st Div Williams/Ruger) | 46 | 39 | 6 | 1 | 1863-06-28 | 1863-07-06 | 6 | 13 | full |
| us-12c-1d-mcdougall (McDougall) | 26 | 25 | 1 | 0 | 1863-06-30 | 1863-07-05T10:30 | 4 | 12 | full |
| us-12c-1d-mcdougall-5ct (5th CT) | 34 | 34 | 0 | 0 | 1863-06-29 | 1863-07-06T11:00 | 3 | 9 | regiment: full |
| us-12c-1d-mcdougall-20ct (20th CT) | 22 | 15 | 7 | 0 | 1863-07-01 | 1863-07-05 | 3 | 6 | regiment: full |
| us-12c-1d-mcdougall-3md (3rd MD) | 15 | 14 | 0 | 1 | 1863-06-28T05:00 | 1863-07-06T04:00 | 0 | 2 | regiment: partial |
| us-12c-1d-mcdougall-123ny (123rd NY) | 16 | 16 | 0 | 0 | 1863-06-28T06:00 | 1863-07-05 | 1 | 3 | regiment: full |
| us-12c-1d-mcdougall-145ny (145th NY) | 14 | 14 | 0 | 0 | 1863-07-01 | 1863-07-05T10:30 | 3 | 5 | regiment: full |
| us-12c-1d-mcdougall-46pa (46th PA) | 8 | 8 | 0 | 0 | 1863-07-01 | 1863-07-03 | 1 | 4 | regiment: full |
| us-12c-1d-colgrove (Colgrove) | 17 | 16 | 1 | 0 | 1863-07-01 | 1863-07-04 | 5 | 5 | full |
| us-12c-1d-colgrove-27in (27th IN) | 16 | 16 | 0 | 0 | 1863-07-01 | 1863-07-03T16:00 | 0 | 4 | regiment: full |
| us-12c-1d-colgrove-2ma (2nd MA) | 19 | 19 | 0 | 0 | 1863-06-30 | 1863-07-03T05:30 | 2 | 4 | regiment: full |
| us-12c-1d-colgrove-13nj (13th NJ) | 17 | 17 | 0 | 0 | 1863-06-30 | 1863-07-03T23:00 | 5 | 7 | regiment: full |
| us-12c-1d-colgrove-107ny (107th NY) | 17 | 17 | 0 | 0 | 1863-07-01 | 1863-07-03T18:00 | 4 | 8 | regiment: full |
| us-12c-1d-colgrove-3wi (3rd WI) | 15 | 14 | 0 | 1 | 1863-07-01 | 1863-07-03T11:00 | 0 | 7 | regiment: full |
| us-12c-1d-lockwood (Lockwood) | 32 | 23 | 8 | 1 | 1863-06-25 | 1863-07-03T08:00 | 0 | 5 | partial |
| us-12c-1d-lockwood-1mdphb (1st MD PHB) | 13 | 13 | 0 | 0 | 1863-06-27T20:20 | 1863-07-03T12:00 | 1 | 4 | regiment: full |
| us-12c-1d-lockwood-1mdeasternshore (1st MD Eastern Shore) | 8 | 8 | 0 | 0 | 1863-06-26 | 1863-07-03T20:00 | 0 | 1 | regiment: full |
| us-12c-1d-lockwood-150ny (150th NY) | 12 | 12 | 0 | 0 | 1863-06-27T20:20 | 1863-07-04T07:00 | 1 | 6 | regiment: full |
| us-12c-2d (2nd Div Geary) | 46 | 42 | 4 | 0 | 1863-06-28T06:30 | 1863-07-05T17:30 | 6 | 16 | full |
| us-12c-2d-candy (Candy) | 29 | 29 | 0 | 0 | 1863-06-28T05:00 | 1863-07-05T13:00 | 4 | 10 | full |
| us-12c-2d-candy-5oh (5th OH) | 12 | 12 | 0 | 0 | 1863-07-01 | 1863-07-03T11:00 | 0 | 4 | regiment: full |
| us-12c-2d-candy-7oh (7th OH) | 18 | 18 | 0 | 0 | 1863-07-02 | 1863-07-05T11:00 | 5 | 5 | regiment: full |
| us-12c-2d-candy-29oh (29th OH) | 16 | 16 | 0 | 0 | 1863-07-02T05:30 | 1863-07-04T01:00 | 0 | 3 | regiment: full |
| us-12c-2d-candy-66oh (66th OH) | 6 | 6 | 0 | 0 | 1863-07-03 | 1863-07-03T21:00 | 0 | 1 | regiment: full |
| us-12c-2d-candy-28pa (28th PA) | 10 | 7 | 3 | 0 | 1863-07-02 | 1863-07-04T03:00 | 0 | 4 | regiment: full |
| us-12c-2d-candy-147pa (147th PA) | 11 | 11 | 0 | 0 | 1863-07-01 | 1863-07-03T08:00 | 1 | 5 | regiment: full |
| us-12c-2d-kane (Kane) | 34 | 33 | 1 | 0 | 1863-06-29T04:00 | 1863-07-05 | 6 | 16 | full |
| us-12c-2d-kane-29pa (29th PA) | 17 | 17 | 0 | 0 | 1863-07-01 | 1863-07-04 | 2 | 6 | regiment: full |
| us-12c-2d-kane-109pa (109th PA) | 8 | 8 | 0 | 0 | 1863-07-02 | 1863-07-03T15:30 | 1 | 4 | regiment: full |
| us-12c-2d-kane-111pa (111th PA) | 10 | 10 | 0 | 0 | 1863-07-02 | 1863-07-03T13:00 | 2 | 4 | regiment: full |
| us-12c-2d-greene (Greene) | 37 | 34 | 2 | 1 | 1863-06-28 | 1863-07-05 | 1 | 11 | full |
| us-12c-2d-greene-60ny (60th NY) | 13 | 10 | 3 | 0 | 1863-07-02 | 1863-07-03T14:00 | 0 | 2 | regiment: full |
| us-12c-2d-greene-78ny (78th NY) | 9 | 9 | 0 | 0 | 1863-07-02 | 1863-07-03T21:00 | 0 | 2 | regiment: full |
| us-12c-2d-greene-102ny (102nd NY) | 8 | 3 | 5 | 0 | 1863-07-01 | 1863-07-03T16:00 | 0 | 2 | regiment: full |
| us-12c-2d-greene-137ny (137th NY) | 13 | 13 | 0 | 0 | 1863-07-01 | 1863-07-03T21:00 | 1 | 2 | regiment: full |
| us-12c-2d-greene-149ny (149th NY) | 10 | 10 | 0 | 0 | 1863-07-01 | 1863-07-03T06:30 | 0 | 1 | regiment: full |
| us-12c-art (Artillery Muhlenberg) | 19 | 18 | 0 | 1 | 1863-06-30 | 1863-07-05 | 2 | 6 | partial |
| us-12c-art-1nym (1st NY M) | 11 | 11 | 0 | 0 | 1863-06-26 | 1863-07-03 | 3 | 7 | regiment: full |
| us-12c-art-pae (PA E) | 16 | 14 | 2 | 0 | 1863-06-26 | 1863-07-03 | 2 | 7 | regiment: full |
| us-12c-art-4usf (4th US F) | 11 | 11 | 0 | 0 | 1863-06-26 | 1863-07-03T04:00 | 4 | 6 | regiment: full |
| us-12c-art-5usk (5th US K) | 13 | 12 | 1 | 0 | 1863-06-26 | 1863-07-03T01:00 | 3 | 5 | regiment: full |

Verdict reasons (corps, divisions, brigades, artillery brigade):

- **us-12c XII Corps: full.** Daily marches June 27/28 - July 5 with hours (Slocum R271, Williams R272, Itinerary R007, Part 3 orders), the July 1 move by Two Taverns, the Culp's Hill line July 2-3, the 7 p.m. departure, the night return, the 4-4.30 a.m. artillery, 10.30 a.m. end and the July 5 departure. Roads named: Hanover road (Littlestown), "Baltimore pike" (Williams) / "turnpike from Littlestown to Gettysburg" (Ruger).
- **us-12c-1d 1st Div Williams/Ruger: full.** Road (Gettysburg pike / Baltimore turnpike / cross-road to the Hanover road), July 1 hours (regiments), July 2 line (Culp's Hill, Rock Creek), 6 p.m. departure, return, July 3 fight, July 4 reconnaissance, July 5-6 departure. Dates of Williams's own report are doubtful (see conflicts).
- **us-12c-1d-mcdougall McDougall: full.** First Brigade: Littlestown June 30 (Hanover road), July 1 evening line 1.5 miles from the town and half a mile right of the pike, July 2 11 a.m. move by the Littlestown and Gettysburg turnpike across Rock Creek, 4-5 p.m. July 3 to the rear of the left center. Regiments 5th CT, 20th CT, 123rd NY, 145th NY, 46th PA each have their own reports; 3rd MD only via R278 (R277 unreadable).
- **us-12c-1d-colgrove Colgrove: full.** Third Brigade (Ruger, then Colgrove from the morning of July 2): July 1 turn off the pike about 2 miles from Gettysburg (R286), July 2 line along Rock Creek, 6 p.m. departure, 10 p.m. return, July 3 charge. Regiments each have reports (3rd WI R292; R291 Flood is June only).
- **us-12c-1d-lockwood Lockwood: partial.** Part 3 gives the march from Baltimore to the Monocacy (June 25-29). Between Monocacy Junction (June 29) and Gettysburg the OR gives no road or hour except the arrival at 8 a.m. (Ketcham July 2; Lockwood prints "July 3"). Positions July 2 evening and July 3 are documented for the regiments. Road of approach beyond "via Frederick City" is an open gap.
- **us-12c-2d 2nd Div Geary: full.** Geary R293 gives hour-by-hour marches June 28 - July 1 (Two Taverns 11 a.m.; advance 3 p.m. on "the turnpike leading from Baltimore"), the 5 p.m. line on the extreme left, 5 a.m. July 2 line, 7 p.m. departure, night, 3.30 a.m. attack, 10.30 a.m. end, July 5 1 p.m. departure.
- **us-12c-2d-candy Candy: full.** First Brigade: June 28 - July 5 with hours (R294), July 1 night on the left hills, July 2 line behind Greene, 7 p.m. to Rock Creek / pike, midnight return, July 3 reliefs, July 5 1 p.m.
- **us-12c-2d-kane Kane: full.** Second Brigade: June 29 4 a.m. (Cobham), July 1 night in reserve by the turnpike about 2 miles from Gettysburg, July 2 line (Kane/Cobham), evening fire at the works, July 3 3.30-10.30 a.m., July 5. Date of Kane's command differs (July 2 vs July 3).
- **us-12c-2d-greene Greene: full.** Third Brigade: July 1 night on the left (Taneytown road, Sugar Loaf), July 2 6 a.m. line on Culp's Hill, attack from about 6.40-7 p.m. to 9.30-10 p.m., July 3 4-10.30 a.m. No OR passage gives an hour or road for the July 1 arrival (open gap).
- **us-12c-art Artillery Muhlenberg: partial.** Muhlenberg R314 and Hunt R028: June 26 - July 5 with hours at 3.30/5 p.m. July 2, 1 a.m. and 4.30 a.m. July 3. July 1 night and July 4 batteries are given only as "about the same distance from the town" (1.5 miles); who Lt. Col. Best is (Slocum R271) is not stated. Open gap recorded.
- Regiments: every regiment and battery named in the brief has at least one claim. The 3rd Maryland is partial because its colonel's report (R277) is unreadable; the 3rd Wisconsin report R291 (Flood) is a June 6-16 report with no July claim (open gap recorded; July claims from R292 Hawley and R286). Brigades with NO claim: none. Brigades/divisions with an open gap for an item: First Division (Spangler's Spring), Lockwood (march roads), Greene (July 1 arrival hour/road), artillery brigade (Best, July 4), corps (Powers' Hill, Wolf Hill).

## 2. Approach roads and times (these decide where units enter the map)

**Corps (June 28 - July 1).** June 28: Knoxville, Md., to near Frederick, left 6 a.m., arrived 2 p.m. (Slocum R271 p. 758; Geary 6.30 a.m. / 2 p.m.; Candy 5 a.m. / about 3 p.m.; Robinson 5 a.m. / 2 p.m.). Orders of June 28 (Part 3 D0840): June 29 at 4 a.m. "by Ceresville, Walkersville, and Woodsborough, to Taneytown"; Slocum from Woodsborough 6.20 p.m. June 29: "not ... beyond Double Pipe Creek" (D0886). June 30: Taneytown/Bruceville to Littlestown (Itinerary R007; order D0895 "passing the Third Corps"); the corps encamped "about 1 mile beyond Littlestown, Pa., on the road leading from that place to Hanover" (Slocum R271 p. 758); Rogers: "on the Hanover road". July 1 (Slocum R271): morning to Two Taverns, then forward on news of the First and Eleventh Corps. Road: Williams (R272 p. 773) "the Baltimore pike toward Gettysburg"; Williams division report "Two Taverns, on the Gettysburg pike"; Ruger (R273 p. 777) "the turnpike from Littlestown to Gettysburg"; Geary (R293 p. 825) "the turnpike leading from Baltimore to that place"; Cobham (R303 p. 848) "the Baltimore turnpike to Two Taverns"; Muhlenberg (R314 p. 869) "the Baltimore pike to ... Two Taverns".

**First Division (Williams; Ruger from the morning of July 2).** July 1: from Littlestown on the pike to Two Taverns (2nd MA: marched 4 miles on the Gettysburg turnpike to Two Taverns; 5th CT there 11 a.m.; 20th CT "morning" then 1 p.m. forward), then at about 2 miles from Gettysburg left the turnpike to the right (Ruger R273; Colgrove R286: "about 2 miles of Gettysburg ... filed to the right, leaving the pike", then about 1.5 miles; Williams R272: "a cross-road to the Hanover road", to an eminence "a mile or so east of Gettysburg"; Grimes R289: left the pike about 3 miles out, then a road to the right). Arrival hours at the field: 5th CT 12 m., 20th CT 1 p.m., 107th NY about 4 p.m., 2nd MA "afternoon", McDougall "toward evening", 46th PA "evening". Night: withdrawn "about sunset" to a position 3/4 mile to the rear (Ruger), "about dusk" to the right of the pike (McDougall), "nearer the Baltimorepike" (Williams). July 2: Rodgers's 3.40 a.m. order to advance and connect with Wadsworth (D1002); the move to the Culp's Hill line is Williams 8 a.m., Slocum about 8, Ruger "about 9 a.m." by "the Baltimore turnpike toward Gettysburg" about 1.5 miles, McDougall about 11 a.m. "by the way of Littlestown and Gettysburg turnpike across Rock Creek".

**Second Division (Geary).** June 28 Knoxville 6.30 a.m. - Frederick 2 p.m.; June 29 4 a.m. via Ceresville, Walkersville, Woodsborough, camp 7 p.m. near Big Pipe Creek (21 miles); June 30 5 a.m. through Taneytown and Littlestown, camp at noon near Littlestown; July 1 left camp 5 a.m., Two Taverns 11 a.m., advanced "at about 3 p.m." on the turnpike from Baltimore (Geary R293 pp. 824-825); Barnum: Two Taverns about 12 m., left 3.30 p.m.; Rickards: left Littlestown 7 a.m.; Cobham: placed by Geary on a hill about 2 miles from Gettysburg (Second Brigade with two pieces of Battery K, reserve on the left of the turnpike). 5 p.m. line on the "extreme left", "half a mile west of the Baltimore turnpike to the left of the First Corps, to a range of hills south and west of the town" (Geary); Hancock R076 p. 368: "the high ground to the right of and near Round Top Mountain"; Greene R307: "in front of the Taneytown road, about half a mile to the right of Sugar Loaf Mountain". July 2 5 a.m. to the line east of the turnpike (Geary), Greene/Godard/Hammerstein about 6 a.m.

**Lockwood.** Baltimore June 25 (left that morning, D0746), Poplar Springs June 26 night, Monocacy June 27 night (150th NY, 1st PHB; Eastern Shore regiment a day behind), Monocacy Junction June 29 (D0884), "from Baltimore, via Frederick City" to Gettysburg, arrival 8 a.m. July 2 (Ketcham; "July 3" in Lockwood and Williams as printed). Road beyond Frederick not stated.

**Artillery.** July 1 "along the Baltimore pike to ... Two Taverns" (Muhlenberg); about noon the First Division batteries (F 4th U.S., M 1st N.Y.) away from the pike northeast toward the Hanover road and into position east of Gettysburg about 1.5 miles; the Second Division batteries (K 5th U.S., Knap) along the Baltimore pike, encamped the same distance from the town; July 2 the First Division batteries to the pike; 3.30/5 p.m. Knap/Van Reed on the right of the First Corps; then Slocum's Hill (SW of the pike) and the knoll east of it; 1 a.m. July 3 F and K SW of the pike.

## 3. Conflicts between reports (all values kept, nothing resolved)

### 3a. Time and place groups (every member lists the others it differs from in conflicts_with; text below is generated from the ledger)

### arr_jul1_1d  [July 1: First Division regiments arrive near Gettysburg]
- XII-1d-mcdougall-5ct | 1-R275 p.790 | printed "At 12 m." | 1863-07-01T12:00 | us-12c-1d-mcdougall-5ct-19
- XII-1d-mcdougall-20ct | 1-R276 p.793 | printed "At 1 p. m." | 1863-07-01T13:00 | us-12c-1d-mcdougall-20ct-07
- XII-1d-colgrove-107ny | 1-R290 p.819 | printed "about the hour of 4 p. m." | 1863-07-01T16:00 | us-12c-1d-colgrove-107ny-06
- XII-1d-mcdougall | 1-R274 p.782 | printed "toward evening" | 1863-07-01 | us-12c-1d-mcdougall-08
- XII-1d-mcdougall-145ny | 1-R280 p.799 | printed "On the morning of July 1" | 1863-07-01 | us-12c-1d-mcdougall-145ny-02
- XII-1d-mcdougall-46pa | 1-R281 p.803 | printed "on the evening of the 1st instant" | 1863-07-01 | us-12c-1d-mcdougall-46pa-02
- XII-1d-colgrove-2ma | 1-R288 p.816 | printed "In the afternoon" | 1863-07-01 | us-12c-1d-colgrove-2ma-08

### art_duel  [July 2 afternoon: artillery duel (Knap's / Battery K) hours]
- XII-art-pae | 1-R314 p.870 | printed "At 3.30 p. m." | 1863-07-02T15:30 | us-12c-art-pae-07
- XII-art-pae | 1-R028 p.234 | printed "About the same hour, 3.30 p. m." | 1863-07-02T15:30 | us-12c-art-pae-14
- XII-art-5usk | 1-R028 p.234 | printed "About the same hour, 3.30 p. m." | 1863-07-02T15:30 | us-12c-art-5usk-13
- XII-art-pae | 1-R293 p.826 | printed "At 4 p. m." | 1863-07-02T16:00 | us-12c-art-pae-02
- XII-art-5usk | 1-R293 p.826 | printed "At 4 p. m." | 1863-07-02T16:00 | us-12c-art-5usk-03
- XII-2d-greene-60ny | 1-R308 p.860 | printed "At about 4 p. m." | 1863-07-02T16:00 | us-12c-2d-greene-60ny-04
- XII-2d-greene-60ny | 1-R309 p.862 | printed "About 4 p. m." | 1863-07-02T16:00 | us-12c-2d-greene-60ny-13
- XII-2d-greene-102ny | 1-R311 p.864 | printed "about 4 p. m." | 1863-07-02T16:00 | us-12c-2d-greene-102ny-04
- XII-art-5usk | 1-R310 p.863 | printed "4. 30 o'clock" | 1863-07-02T16:30 | us-12c-art-5usk-04
- XII-art-pae | 1-R314 p.870 | printed "and at 5 p." | 1863-07-02T17:00 | us-12c-art-pae-09
- XII-art-5usk | 1-R310 p.863 | printed "at 5.30 o'clock" | 1863-07-02T17:30 | us-12c-art-5usk-05

### art_open  [July 3: opening of the XII Corps artillery fire]
- XII-2d | 1-R293 p.828 | printed "at 3.30 a. m. (early dawn)" | 1863-07-03T03:30 | us-12c-2d-30
- XII-2d-candy | 1-R294 p.836 | printed "3.45 a. m. [July 3]" | 1863-07-03T03:45 | us-12c-2d-candy-23
- XII-1d-mcdougall-5ct | 1-R275 p.791 | printed "4 a. m. July 3" | 1863-07-03T04:00 | us-12c-1d-mcdougall-5ct-28
- XII-1d-mcdougall-145ny | 1-R280 p.800 | printed "About 4 o'clock on the morning of the 3d" | 1863-07-03T04:00 | us-12c-1d-mcdougall-145ny-11
- XII-2d-greene | 1-R307 p.857 | printed "At 4 a. m." | 1863-07-03T04:00 | us-12c-2d-greene-23
- XII-art | 1-R271 p.761 | printed "4 a. m." | 1863-07-03T04:00 | us-12c-art-02
- XII-art | 1-R314 p.870 | printed "At 4.30 a. m." | 1863-07-03T04:30 | us-12c-art-12
- XII-art | 1-R028 p.237 | printed "At 4.30 a. m." | 1863-07-03T04:30 | us-12c-art-18
- XII-art | 1-R273 p.780 | printed "4. .30 o'clock" | 1863-07-03T04:30 | us-12c-art-05
- XII-1d-mcdougall-20ct | 1-R276 p.793 | printed "At daylight" | 1863-07-03 | us-12c-1d-mcdougall-20ct-14
- XII-1d-mcdougall-3md | 1-R278 p.796 | printed "at daylight" | 1863-07-03 | us-12c-1d-mcdougall-3md-11
- XII-1d-mcdougall-46pa | 1-R281 p.803 | printed "At daybreak" | 1863-07-03 | us-12c-1d-mcdougall-46pa-07
- XII-1d-lockwood | 1-R282 p.804 | printed "Early on the morning of the 3d" | 1863-07-03 | us-12c-1d-lockwood-15
- XII | 1-R315 p.873 | printed "At daylight on July 3" | 1863-07-03 | us-12c-46
- XII-art | 1-R272 p.775 | printed "at daylight" | 1863-07-03 | us-12c-art-03

### candy_return  [July 2-3 night: Candy's brigade returns to the right]
- XII-2d-candy-7oh | 1-R296 p.840 | printed "At 11.30 p. m. July 2" | 1863-07-02T23:30 | us-12c-2d-candy-7oh-08
- XII-2d-candy | 1-R294 p.836 | printed "until about 12 p. m." | 1863-07-02 | us-12c-2d-candy-21
- XII-2d-candy-28pa | 1-R300 p.845 | printed "12.30 a. m. July 3" | 1863-07-03T00:30 | us-12c-2d-candy-28pa-08
- XII-2d-candy | 1-R307 p.857 | printed "at 1.30 a. m. on the 3d" | 1863-07-03T01:30 | us-12c-2d-candy-29
- XII-2d-candy-29oh | 1-R297 p.842 | printed "about 2 o'clock on the morning of July 3" | 1863-07-03T02:00 | us-12c-2d-candy-29oh-05
- XII-2d-candy | 1-R294 p.836 | printed "until 3.45 a. m." | 1863-07-03 | us-12c-2d-candy-22

### charge  [July 3: Colgrove brigade charge (2nd MA and 27th IN)]
- XII-1d-colgrove-27in | 1-R287 p.815 | printed "between 5 and 6 o'clock on the morning of the 3d" | 1863-07-03T05:30 | us-12c-1d-colgrove-27in-13
- XII-1d-colgrove-2ma | 1-R288 p.817 | printed "5.30 o'clock" | 1863-07-03T05:30 | us-12c-1d-colgrove-2ma-16
- XII-1d-colgrove-2ma | 1-R286 p.813 | printed "At the command" | 1863-07-03 | us-12c-1d-colgrove-2ma-04
- XII-1d-colgrove-27in | 1-R286 p.813 | printed "At the command" | 1863-07-03 | us-12c-1d-colgrove-27in-07
- XII-1d-colgrove-27in | 1-R287 p.815 | printed "between 5 and 6 o'clock on the morning of the 3d" | 1863-07-03 | us-12c-1d-colgrove-27in-14
- XII-1d-colgrove-2ma | 1-R273 p.781 | printed "At this time I received orders" | 1863-07-03 | us-12c-1d-colgrove-2ma-01

### corps_arr_jul1  [July 1: arrival of the XII Corps (or its divisions) at Gettysburg]
- XII-2d | 1-R293 p.825 | printed "at about 3 p. m." | 1863-07-01T15:00 | us-12c-2d-20
- XII-2d-greene-149ny | 1-R313 p.868 | printed "3.30 p. m." | 1863-07-01T15:30 | us-12c-2d-greene-149ny-02
- XII | 3-D0975 p.465 | printed "3.35 p. m." | 1863-07-01T15:35 | us-12c-60
- XII-2d | 3-D0979 p.466 | printed "5 p. m." | 1863-07-01T17:00 | us-12c-2d-43
- XII-1d | 3-D0979 p.466 | printed "5 p. m." | 1863-07-01T17:00 | us-12c-1d-43
- XII-2d | 1-R293 p.825 | printed "At 5 p. m." | 1863-07-01T17:00 | us-12c-2d-22
- XII | 1-R076 p.368 | printed "Between 5 and 6 o'clock" | 1863-07-01T17:30 | us-12c-40
- XII | 1-R001 p.16 | printed "About 7 p. m." | 1863-07-01T19:00 | us-12c-25
- XII | 1-R006 p.115 | printed "About 7 p. m." | 1863-07-01T19:00 | us-12c-27
- XII | 1-R006 p.129 | printed "a short. time before" | 1863-07-01 | us-12c-33
- XII-1d | 1-R076 p.368 | printed "None" | 1863-07-01 | us-12c-1d-42
- XII-2d | 1-R076 p.368 | printed "subsequently" | 1863-07-01 | us-12c-2d-40

### dep_left_1d  [July 2 afternoon: First Division and Lockwood ordered/moved to the left (departure hour)]
- XII-1d-mcdougall-5ct | 1-R275 p.790 | printed "At 4 p. m." | 1863-07-02T16:00 | us-12c-1d-mcdougall-5ct-26
- XII-1d-mcdougall-20ct | 1-R276 p.793 | printed "until about 4 p. m." | 1863-07-02T16:00 | us-12c-1d-mcdougall-20ct-11
- XII-1d-mcdougall-123ny | 1-R279 p.798 | printed "About 4 p. m." | 1863-07-02T16:00 | us-12c-1d-mcdougall-123ny-11
- XII-1d-lockwood | 1-R282 p.804 | printed "about 5 p. m. of that day" | 1863-07-02T17:00 | us-12c-1d-lockwood-12
- XII-1d-lockwood-1mdphb | 1-R283 p.805 | printed "about 5 p. m." | 1863-07-02T17:00 | us-12c-1d-lockwood-1mdphb-04
- XII-1d-lockwood-150ny | 1-R285 p.809 | printed "until about 6 p. m." | 1863-07-02T18:00 | us-12c-1d-lockwood-150ny-03
- XII-1d-colgrove-27in | 1-R287 p.815 | printed "About 6 p. m." | 1863-07-02T18:00 | us-12c-1d-colgrove-27in-10
- XII-1d-colgrove-2ma | 1-R288 p.816 | printed "About 6 p. m." | 1863-07-02T18:00 | us-12c-1d-colgrove-2ma-12
- XII-1d-colgrove-13nj | 1-R289 p.818 | printed "6 p. m." | 1863-07-02T18:00 | us-12c-1d-colgrove-13nj-11
- XII-1d-colgrove-3wi | 1-R292 p.823 | printed "6 p. m." | 1863-07-02T18:00 | us-12c-1d-colgrove-3wi-10
- XII-1d | 1-R273 p.778-779~ | printed "about 6 p. m." | 1863-07-02T18:00 | us-12c-1d-33
- XII-1d-mcdougall-145ny | 1-R280 p.800 | printed "6.30 p. m." | 1863-07-02T18:30 | us-12c-1d-mcdougall-145ny-08
- XII-2d-greene | 1-R307 p.856 | printed "until 6.30 p. m." | 1863-07-02T18:30 | us-12c-2d-greene-17
- XII-1d | 1-R307 p.856 | printed "until 6.30 p. m." | 1863-07-02T18:30 | us-12c-1d-40
- XII-1d | 1-R293 p.826 | printed "7 p. m." | 1863-07-02T18:30 | us-12c-1d-39
- XII-1d-colgrove-107ny | 1-R290 p.819 | printed "About 7 p. m." | 1863-07-02T19:00 | us-12c-1d-colgrove-107ny-10
- XII-1d-mcdougall | 1-R274 p.783 | printed "Late in the afternoon" | 1863-07-02 | us-12c-1d-mcdougall-14
- XII-1d-mcdougall-5ct | 1-R275 p.789 | printed "On the evening of the 2d" | 1863-07-02 | us-12c-1d-mcdougall-5ct-08
- XII-1d-mcdougall-3md | 1-R278 p.796 | printed "In the evening" | 1863-07-02 | us-12c-1d-mcdougall-3md-09
- XII-1d-mcdougall-46pa | 1-R281 p.803 | printed "On the same evening" | 1863-07-02 | us-12c-1d-mcdougall-46pa-05
- XII-1d-colgrove | 1-R286 p.812 | printed "Shortly before sundown" | 1863-07-02 | us-12c-1d-colgrove-11
- XII-1d | 1-R271 p.759-760~ | printed "As soon as the attack on our left commenced" | 1863-07-02 | us-12c-1d-03
- XII-1d | 1-R272 p.773 | printed "Between 5 and 6 p. m." | 1863-07-02 | us-12c-1d-20

### dep_left_2d  [July 2 evening: Second Division (Candy, Kane) departure / Greene left alone]
- XII-2d-candy-7oh | 1-R296 p.840 | printed "until 6 p. m." | 1863-07-02T18:00 | us-12c-2d-candy-7oh-06
- XII-2d-candy | 1-R307 p.856 | printed "until 6.30 p. m." | 1863-07-02T18:30 | us-12c-2d-candy-28
- XII-2d-kane | 1-R307 p.856 | printed "until 6.30 p. m." | 1863-07-02T18:30 | us-12c-2d-kane-32
- XII-2d-candy | 1-R294 p.836 | printed "about 7 p. m." | 1863-07-02T19:00 | us-12c-2d-candy-19
- XII-2d-kane-29pa | 1-R304 p.851 | printed "at 7 p. m." | 1863-07-02T19:00 | us-12c-2d-kane-29pa-05
- XII-2d | 1-R293 p.826 | printed "7 p. m." | 1863-07-02T19:00 | us-12c-2d-27
- XII-2d-candy-29oh | 1-R297 p.842 | printed "about 7.30 p. m." | 1863-07-02T19:30 | us-12c-2d-candy-29oh-04
- XII-2d-candy-5oh | 1-R295 p.839 | printed "until evening" | 1863-07-02 | us-12c-2d-candy-5oh-08
- XII-2d-candy-147pa | 1-R301 p.846 | printed "until evening" | 1863-07-02 | us-12c-2d-candy-147pa-06
- XII-2d-kane | 1-R302 p.847 | printed "At twilight" | 1863-07-02 | us-12c-2d-kane-10
- XII-2d-kane | 1-R303 p.849 | printed "till evening" | 1863-07-02 | us-12c-2d-kane-24
- XII-2d-kane-109pa | 1-R305 p.853 | printed "then changing our position with the brigade" | 1863-07-02 | us-12c-2d-kane-109pa-02
- XII-2d-kane-111pa | 1-R306 p.854 | printed "a little before dark" | 1863-07-02 | us-12c-2d-kane-111pa-04

### depart_jul5  [July 5-6: departure from Gettysburg]
- XII-1d-mcdougall-145ny | 1-R280 p.802 | printed "On the morning of July 5" | 1863-07-05T10:30 | us-12c-1d-mcdougall-145ny-14
- XII-1d-mcdougall | 1-R274 p.786 | printed "About 10.30 a. m." | 1863-07-05T10:30 | us-12c-1d-mcdougall-23
- XII-2d-candy | 1-R294 p.838 | printed "About 1 p. m." | 1863-07-05T13:00 | us-12c-2d-candy-27
- XII-2d | 1-R293 p.832 | printed "at 1 p. m." | 1863-07-05T13:00 | us-12c-2d-36
- XII | 3-D1115 p.537 | printed "6 p. m." | 1863-07-05T18:00 | us-12c-68
- XII-1d-mcdougall-5ct | 1-R275 p.791 | printed "The following day" | 1863-07-05 | us-12c-1d-mcdougall-5ct-33
- XII-1d-mcdougall-20ct | 1-R276 p.794-795~ | printed "On the afternoon of the 5th instant" | 1863-07-05 | us-12c-1d-mcdougall-20ct-22
- XII-1d-mcdougall-3md | 1-R278 p.796 | printed "about dark" | 1863-07-05 | us-12c-1d-mcdougall-3md-13
- XII-1d-mcdougall-123ny | 1-R279 p.799 | printed "July 5" | 1863-07-05 | us-12c-1d-mcdougall-123ny-16
- XII-2d-kane | 1-R303 p.850 | printed "On the 5th" | 1863-07-05 | us-12c-2d-kane-31
- XII-2d-greene | 1-R307 p.859 | printed "July 5" | 1863-07-05 | us-12c-2d-greene-31
- XII-art | 1-R314 p.871 | printed "on the 5th" | 1863-07-05 | us-12c-art-17
- XII | 1-R007 p.145 | printed "None" | 1863-07-05 | us-12c-24
- XII | 3-D1099 p.532 | printed "July 5" | 1863-07-05 | us-12c-67
- XII | 1-R271 p.761 | printed "The next day" | 1863-07-05 | us-12c-10
- XII-1d-mcdougall-5ct | 1-R275 p.789 | printed "11 a. m. the following day, July 6" | 1863-07-06T11:00 | us-12c-1d-mcdougall-5ct-14
- XII-1d | 1-R272 p.771 | printed "July 6" | 1863-07-06 | us-12c-1d-16

### greene_end  [July 2 evening: end of the attack on Greene (fire ceases)]
- XII-2d-greene | 1-R307 p.856 | printed "between 7 and 9.30 p. m." | 1863-07-02T19:00 | us-12c-2d-greene-20
- XII-2d-greene-102ny | 1-R311 p.865 | printed "about 9.30 p. m." | 1863-07-02T21:30 | us-12c-2d-greene-102ny-06
- XII-2d-greene-149ny | 1-R313 p.868 | printed "At about 9.30 p. m." | 1863-07-02T21:30 | us-12c-2d-greene-149ny-07
- XII-2d-greene-60ny | 1-R308 p.860 | printed "for about two hours" | 1863-07-02 | us-12c-2d-greene-60ny-06

### greene_start  [July 2 evening: attack on Greene begins]
- XII-2d-greene-78ny | 1-R310 p.863 | printed "beginning at 6.40 o'clock" | 1863-07-02T18:40 | us-12c-2d-greene-78ny-03
- XII-2d-greene-149ny | 1-R313 p.868 | printed "until about 6.45 p. m." | 1863-07-02T18:45 | us-12c-2d-greene-149ny-05
- XII-2d-greene-60ny | 1-R308 p.860 | printed "until about 7 p. m." | 1863-07-02T19:00 | us-12c-2d-greene-60ny-05
- XII-2d-greene-60ny | 1-R309 p.862 | printed "about 7 p. m." | 1863-07-02T19:00 | us-12c-2d-greene-60ny-12
- XII-2d-greene-137ny | 1-R312 p.866 | printed "About 7 p. m." | 1863-07-02T19:00 | us-12c-2d-greene-137ny-07
- XII-2d-greene | 1-R307 p.856 | printed "a few minutes before 7 p. m." | 1863-07-02 | us-12c-2d-greene-19
- XII-2d-greene | 1-R256 p.735 | printed "In the evening, at dark" | 1863-07-02 | us-12c-2d-greene-36
- XII-2d-greene | 1-R293 p.826 | printed "In the meantime" | 1863-07-02 | us-12c-2d-greene-09

### gregg  [July 3 evening: 13th NJ, 107th NY, 5th CT sent to support Gregg]
- XII-1d-mcdougall-5ct | 1-R275 p.789 | printed "at 5 p. m." | 1863-07-03T17:00 | us-12c-1d-mcdougall-5ct-11
- XII-1d-colgrove-13nj | 1-R273 p.781 | printed "At about 5 p. m." | 1863-07-03T17:00 | us-12c-1d-colgrove-13nj-01
- XII-1d-mcdougall-5ct | 1-R275 p.791 | printed "6 p. m." | 1863-07-03T18:00 | us-12c-1d-mcdougall-5ct-30
- XII-1d-colgrove-107ny | 1-R290 p.821 | printed "Near 6 p. m." | 1863-07-03T18:00 | us-12c-1d-colgrove-107ny-16
- XII-1d-colgrove-13nj | 1-R289 p.818 | printed "7.30 p. m." | 1863-07-03T19:30 | us-12c-1d-colgrove-13nj-16
- XII-1d-colgrove-13nj | 1-R289 p.818 | printed "at 11 p. m." | 1863-07-03T23:00 | us-12c-1d-colgrove-13nj-17

### inf_start  [July 3: infantry fire becomes general / fight begins (Second Division front)]
- XII-2d-kane | 1-R303 p.849 | printed "At 3 o'clock next morning, July 3" | 1863-07-03T03:00 | us-12c-2d-kane-27
- XII-2d-kane-29pa | 1-R304 p.852 | printed "At 3 a. m. of the 3d" | 1863-07-03T03:00 | us-12c-2d-kane-29pa-09
- XII-2d-greene-137ny | 1-R312 p.867 | printed "At 3 a. m. of Friday, July 3" | 1863-07-03T03:00 | us-12c-2d-greene-137ny-09
- XII-2d-kane | 1-R302 p.847 | printed "at 3.30 a. m., July 3" | 1863-07-03T03:30 | us-12c-2d-kane-14
- XII-2d-kane-29pa | 1-R304 p.852 | printed "At 3.30 a. m." | 1863-07-03T03:30 | us-12c-2d-kane-29pa-10
- XII-2d-greene-78ny | 1-R310 p.863 | printed "at 3.30 a. m." | 1863-07-03T03:30 | us-12c-2d-greene-78ny-04
- XII-2d-greene-102ny | 1-R311 p.865 | printed "At 3.30 a. m." | 1863-07-03T03:30 | us-12c-2d-greene-102ny-07
- XII-2d | 1-R293 p.828 | printed "at 3.30 a. m. (early dawn)" | 1863-07-03T03:30 | us-12c-2d-30
- XII-2d-candy-29oh | 1-R297 p.842 | printed "about 3.45 o'clock" | 1863-07-03T03:45 | us-12c-2d-candy-29oh-06
- XII-2d-kane-111pa | 1-R306 p.855 | printed "about 3.45 o'clock" | 1863-07-03T03:45 | us-12c-2d-kane-111pa-08
- XII-2d-candy-5oh | 1-R295 p.839 | printed "about 3.50 a. m." | 1863-07-03T03:50 | us-12c-2d-candy-5oh-09
- XII-1d-colgrove-13nj | 1-R289 p.818 | printed "At 4 a. m. July 3" | 1863-07-03T04:00 | us-12c-1d-colgrove-13nj-14
- XII-2d-kane-109pa | 1-R305 p.853 | printed "At 4 o'clock on the morning of the 3d" | 1863-07-03T04:00 | us-12c-2d-kane-109pa-05
- XII-2d-greene-60ny | 1-R308 p.861 | printed "at about 4 a. m. July 3" | 1863-07-03T04:00 | us-12c-2d-greene-60ny-07
- XII-2d-greene-149ny | 1-R313 p.868 | printed "At about 4 a. m. of the 3d" | 1863-07-03T04:00 | us-12c-2d-greene-149ny-08
- XII-1d-colgrove | 1-R286 p.813 | printed "Early on the morning of the 3d" | 1863-07-03 | us-12c-1d-colgrove-16
- XII-1d-colgrove-3wi | 1-R292 p.824 | printed "At daybreak on the morning of the 3d" | 1863-07-03 | us-12c-1d-colgrove-3wi-13

### jul1_depart_2d  [July 1: Second Division leaves Littlestown camp]
- XII-2d | 1-R293 p.825 | printed "5 a. m." | 1863-07-01T05:00 | us-12c-2d-18
- XII-2d-kane-29pa | 1-R304 p.851 | printed "On the afternoon of July 1" | 1863-07-01T07:00 | us-12c-2d-kane-29pa-01

### jul1_night_2d  [July 1 evening/night position of the Second Division]
- XII-2d | 1-R293 p.825 | printed "At 5 p. m." | 1863-07-01T17:00 | us-12c-2d-22
- XII-2d | 3-D0979 p.466 | printed "5 p. m." | 1863-07-01T17:00 | us-12c-2d-43
- XII-2d | 1-R271 p.759-760~ | printed "pursuant to orders from General Hancock" | 1863-07-01 | us-12c-2d-01
- XII-2d | 1-R272 p.773 | printed "for the night" | 1863-07-01 | us-12c-2d-05
- XII-2d | 1-R076 p.368 | printed "subsequently" | 1863-07-01 | us-12c-2d-41

### jul2_morning_2d  [July 2 morning: Second Division moves to / takes the line east of the turnpike]
- XII-2d | 3-D1002 p.484 | printed "3.40 a. jn." | 1863-07-02T03:40 | us-12c-2d-44
- XII-2d-greene-149ny | 1-R313 p.868 | printed "about 4 a. m. of the 2d instant" | 1863-07-02T04:00 | us-12c-2d-greene-149ny-04
- XII-2d-candy-5oh | 1-R295 p.839 | printed "at 5 o'clock" | 1863-07-02T05:00 | us-12c-2d-candy-5oh-06
- XII-2d | 1-R293 p.825 | printed "At 5 a. m. on the 2d" | 1863-07-02T05:00 | us-12c-2d-25
- XII-2d-candy-29oh | 1-R297 p.842 | printed "5.30 a. m." | 1863-07-02T05:30 | us-12c-2d-candy-29oh-02
- XII-2d-greene | 1-R307 p.855 | printed "at about G a. m." | 1863-07-02T06:00 | us-12c-2d-greene-13
- XII-2d-greene-60ny | 1-R308 p.860 | printed "at or about 6 a. m." | 1863-07-02T06:00 | us-12c-2d-greene-60ny-02
- XII-2d-greene-78ny | 1-R310 p.863 | printed "about 6 o'clock" | 1863-07-02T06:00 | us-12c-2d-greene-78ny-01
- XII-2d-candy-7oh | 1-R296 p.840 | printed "at 6. 30" | 1863-07-02T06:30 | us-12c-2d-candy-7oh-04
- XII-2d-kane-29pa | 1-R304 p.851 | printed "On the 2d, at 9 a. m." | 1863-07-02T09:00 | us-12c-2d-kane-29pa-03
- XII-2d-candy | 1-R294 p.836 | printed "On the morning of the 2d" | 1863-07-02 | us-12c-2d-candy-17
- XII-2d-candy-147pa | 1-R301 p.846 | printed "early on the morning of the 2a" | 1863-07-02 | us-12c-2d-candy-147pa-05
- XII-2d-kane-109pa | 1-R305 p.853 | printed "On the morning of the 2d" | 1863-07-02 | us-12c-2d-kane-109pa-01
- XII-2d-greene-102ny | 1-R311 p.864 | printed "shortly after daylight the next morning, July 3" | 1863-07-02 | us-12c-2d-greene-102ny-02
- XII-2d-greene-137ny | 1-R312 p.866 | printed "Early on the morning of Thursday, July 2" | 1863-07-02 | us-12c-2d-greene-137ny-04
- XII-2d-greene | 1-R037 p.281-283~ | printed "Early on the morning of the 2d instant" | 1863-07-02 | us-12c-2d-greene-35
- XII-2d | 1-R271 p.759-760~ | printed "following morning" | 1863-07-02 | us-12c-2d-02

### jul2_move_1d  [July 2 morning: First Division moves to the Culp's Hill line]
- XII-1d | 3-D1002 p.484 | printed "3.40 a. jn." | 1863-07-02T03:40 | us-12c-1d-45
- XII-1d | 1-R271 p.759-760~ | printed "At about 8 a. m." | 1863-07-02T08:00 | us-12c-1d-02
- XII | 1-R272 p.773 | printed "At 8 a. m." | 1863-07-02T08:00 | us-12c-14
- XII-1d | 1-R273 p.778-779~ | printed "About 9 a. m." | 1863-07-02T09:00 | us-12c-1d-29
- XII-1d-mcdougall | 1-R274 p.783 | printed "about 11 a. m." | 1863-07-02T11:00 | us-12c-1d-mcdougall-11
- XII-1d-mcdougall-20ct | 1-R276 p.793 | printed "Between 10 and 11 a. m." | 1863-07-02 | us-12c-1d-mcdougall-20ct-10

### jul3_dur  [July 3: duration of the fight]
- XII-1d-lockwood-1mdeasternshore | 1-R284 p.808 | printed "At 8 o'clock" | 1863-07-03T08:00 | us-12c-1d-lockwood-1mdeasternshore-05
- XII-2d-candy-5oh | 1-R294 p.837 | printed "seven hours" | 1863-07-03 | us-12c-2d-candy-5oh-04
- XII-2d-kane-29pa | 1-R304 p.852 | printed "seven and three-quarter hours" | 1863-07-03 | us-12c-2d-kane-29pa-14
- XII-2d | 1-R272 p.775 | printed "seven hours" | 1863-07-03 | us-12c-2d-10
- XII-2d | 1-R293 p.830 | printed "seven hours and a half" | 1863-07-03 | us-12c-2d-32
- XII-1d-mcdougall-20ct | 1-R276 p.793 | printed "for over five hours" | 1863-07-03 | us-12c-1d-mcdougall-20ct-16

### jul3_end  [July 3: end of the main fight on the right (enemy retires / last charge / fire ceases)]
- XII-2d-greene-60ny | 1-R308 p.861 | printed "until 9.30 a. m." | 1863-07-03T09:30 | us-12c-2d-greene-60ny-08
- XII-2d-kane | 1-R303 p.849 | printed "about 10 a. m." | 1863-07-03T10:00 | us-12c-2d-kane-29
- XII-art | 1-R314 p.870 | printed "until 10 a. m." | 1863-07-03T10:00 | us-12c-art-16
- XII-1d-mcdougall-20ct | 1-R276 p.794-795~ | printed "about 10.30 a. m." | 1863-07-03T10:30 | us-12c-1d-mcdougall-20ct-17
- XII-2d-kane | 1-R302 p.847 | printed "until about 10.30 o'clock" | 1863-07-03T10:30 | us-12c-2d-kane-15
- XII-2d-kane-29pa | 1-R304 p.852 | printed "About 10.30 a. m." | 1863-07-03T10:30 | us-12c-2d-kane-29pa-12
- XII-2d-kane-109pa | 1-R305 p.853 | printed "10.30 a. m." | 1863-07-03T10:30 | us-12c-2d-kane-109pa-06
- XII-2d-greene | 1-R307 p.857 | printed "until 10.30 a. m." | 1863-07-03T10:30 | us-12c-2d-greene-24
- XII | 1-R271 p.761 | printed "10.30 a. m." | 1863-07-03T10:30 | us-12c-09
- XII-2d | 1-R293 p.830 | printed "10.30 a. m." | 1863-07-03T10:30 | us-12c-2d-31
- XII-1d-colgrove-3wi | 1-R292 p.824 | printed "until about 11 a. m." | 1863-07-03T11:00 | us-12c-1d-colgrove-3wi-14
- XII-2d-candy-5oh | 1-R295 p.839 | printed "until 11 a. m." | 1863-07-03T11:00 | us-12c-2d-candy-5oh-10
- XII-2d-candy-7oh | 1-R296 p.841 | printed "About 11 a. m. July 3" | 1863-07-03T11:00 | us-12c-2d-candy-7oh-14
- XII-2d-candy-29oh | 1-R298 p.843 | printed "about 11 a. m." | 1863-07-03T11:00 | us-12c-2d-candy-29oh-14
- XII-1d-lockwood-1mdphb | 1-R283 p.806 | printed "about 12 m." | 1863-07-03T12:00 | us-12c-1d-lockwood-1mdphb-09
- XII-2d-kane-111pa | 1-R306 p.855 | printed "about 1 o'clock" | 1863-07-03T13:00 | us-12c-2d-kane-111pa-10
- XII-2d-greene-149ny | 1-R313 p.868 | printed "about! p. m." | 1863-07-03 | us-12c-2d-greene-149ny-10

### jul3_night_relief  [July 3 night: relief / attack ~9.30-10 p.m.]
- XII-2d-candy-66oh | 1-R299 p.844 | printed "until relieved at 9 p. m." | 1863-07-03T21:00 | us-12c-2d-candy-66oh-06
- XII-2d-greene-137ny | 1-R312 p.867 | printed "at 9 p. m." | 1863-07-03T21:00 | us-12c-2d-greene-137ny-12
- XII-2d-candy | 1-R294 p.837 | printed "About 9.30 p. m." | 1863-07-03T21:30 | us-12c-2d-candy-25
- XII-2d-candy-7oh | 1-R296 p.841 | printed "9.30 p. m." | 1863-07-03T21:30 | us-12c-2d-candy-7oh-13
- XII-2d-kane-29pa | 1-R304 p.852 | printed "At 9.30 p. m." | 1863-07-03T21:30 | us-12c-2d-kane-29pa-16
- XII-2d-candy-29oh | 1-R297 p.842 | printed "(time, 10 p. m.)" | 1863-07-03T22:00 | us-12c-2d-candy-29oh-08

### jul3_pm_center  [July 3 afternoon: First Brigade (and Lockwood) sent toward the center]
- XII-1d-mcdougall | 1-R273 p.781 | printed "At about 3 p. m." | 1863-07-03T15:00 | us-12c-1d-mcdougall-05
- XII-1d-mcdougall-123ny | 1-R279 p.798 | printed "About 4 p. m." | 1863-07-03T16:00 | us-12c-1d-mcdougall-123ny-14
- XII-1d-colgrove-107ny | 1-R290 p.821 | printed "About 4 p. m." | 1863-07-03T16:00 | us-12c-1d-colgrove-107ny-15
- XII-1d-mcdougall-145ny | 1-R280 p.801 | printed "4.30 o'clock" | 1863-07-03T16:30 | us-12c-1d-mcdougall-145ny-12
- XII-1d-mcdougall-20ct | 1-R276 p.794-795~ | printed "nearly 5 p. m." | 1863-07-03T17:00 | us-12c-1d-mcdougall-20ct-20
- XII-1d-mcdougall | 1-R274 p.785 | printed "between 4 and 5 p. m." | 1863-07-03 | us-12c-1d-mcdougall-18
- XII-1d-lockwood | 1-R282 p.805 | printed "Toward the close of the day" | 1863-07-03 | us-12c-1d-lockwood-18
- XII-1d-lockwood-1mdphb | 1-R283 p.806 | printed "on the afternoon of the 3d instant" | 1863-07-03 | us-12c-1d-lockwood-1mdphb-10
- XII-1d-mcdougall | 1-R272 p.775 | printed "In the afternoon of the same day" | 1863-07-03 | us-12c-1d-mcdougall-02

### jun28_2d_arrive  [June 28: Second Division reaches Frederick]
- XII-2d | 1-R293 p.824 | printed "2 p. m." | 1863-06-28T14:00 | us-12c-2d-13
- XII-2d-candy | 1-R294 p.835 | printed "about 3 p. m." | 1863-06-28T15:00 | us-12c-2d-candy-08

### jun28_2d_depart  [June 28: Second Division leaves Knoxville]
- XII-2d-candy | 1-R294 p.835 | printed "at 5 a. m." | 1863-06-28T05:00 | us-12c-2d-candy-07
- XII-2d | 1-R293 p.824 | printed "6.30 a. m." | 1863-06-28T06:30 | us-12c-2d-12

### jun29_2d_depart  [June 29: Second Division leaves camp]
- XII-2d | 1-R293 p.824 | printed "4 o'clock on the following morning" | 1863-06-29T04:00 | us-12c-2d-14
- XII-2d-kane | 1-R303 p.848 | printed "At 4 o'clock on the morning of June 29" | 1863-06-29T04:00 | us-12c-2d-kane-17
- XII-2d-candy | 1-R294 p.835 | printed "at 4.30 a. m." | 1863-06-29T04:30 | us-12c-2d-candy-09

### jun29_place  [June 29: where the corps/divisions camped]
- XII | 3-D0840 p.375 | printed "4 a. TO." | 1863-06-29T04:00 | us-12c-51
- XII-2d | 1-R293 p.824 | printed "4 o'clock on the following morning" | 1863-06-29T04:00 | us-12c-2d-14
- XII-2d-kane | 1-R303 p.848 | printed "At 4 o'clock on the morning of June 29" | 1863-06-29T04:00 | us-12c-2d-kane-17
- XII-2d-candy | 1-R294 p.835 | printed "at 4.30 a. m." | 1863-06-29T04:30 | us-12c-2d-candy-09
- XII | 3-D0886 p.398 | printed "6.20 p. m." | 1863-06-29T18:20 | us-12c-52
- XII-2d | 1-R293 p.825 | printed "7 p. m." | 1863-06-29T19:00 | us-12c-2d-15
- XII-1d-mcdougall-3md | 1-R278 p.796 | printed "at 9 p. m." | 1863-06-29T21:00 | us-12c-1d-mcdougall-3md-04
- XII-1d | 1-R272 p.771 | printed "June 29" | 1863-06-29 | us-12c-1d-08
- XII-1d-mcdougall-123ny | 1-R279 p.798 | printed "Monday, June 29" | 1863-06-29 | us-12c-1d-mcdougall-123ny-06
- XII | 1-R007 p.144 | printed "June 29" | 1863-06-29 | us-12c-21
- XII-1d-mcdougall-5ct | 1-R275 p.788 | printed "the following day" | 1863-06-29 | us-12c-1d-mcdougall-5ct-02
- XII-1d-mcdougall-5ct | 1-R275 p.790 | printed "Upon the 29th" | 1863-06-29 | us-12c-1d-mcdougall-5ct-15

### jun30_2d_depart  [June 30: Second Division leaves camp]
- XII-2d | 1-R293 p.825 | printed "5 o'clock on the morning of the 30th" | 1863-06-30T05:00 | us-12c-2d-16
- XII-2d-candy | 1-R294 p.835 | printed "6i.'36'a. m." | 1863-06-30 | us-12c-2d-candy-10

### kane_cmd  [Kane takes command of the Second Brigade]
- XII-2d-kane | 1-R302 p.846 | printed "6 a. m. on the morning of the 2d instant" | 1863-07-02T06:00 | us-12c-2d-kane-08
- XII-2d-kane | 1-R303 p.848 | printed "About 6 o'clock on the morning of July 2" | 1863-07-02T06:00 | us-12c-2d-kane-22
- XII-2d-kane | 1-R293 p.832 | printed "on the morning of the 3d instant" | 1863-07-03 | us-12c-2d-kane-34

### kane_return_time  [July 2 night: Kane's brigade returns to the works]
- XII-2d-kane | 1-R293 p.827 | printed "At 9 p. m." | 1863-07-02T21:00 | us-12c-2d-kane-05
- XII-2d-greene | 1-R307 p.857 | printed "About 10 o'clock" | 1863-07-02T22:00 | us-12c-2d-greene-22
- XII-2d-kane | 1-R307 p.857 | printed "About 10 o'clock" | 1863-07-02T22:00 | us-12c-2d-kane-33
- XII-2d-kane-111pa | 1-R306 p.854 | printed "At about 11 o'clock" | 1863-07-02T23:00 | us-12c-2d-kane-111pa-06
- XII-2d-kane | 1-R302 p.847 | printed "At twilight" | 1863-07-02 | us-12c-2d-kane-12

### lockwood_arrival  [Lockwood regiments: arrival at Gettysburg]
- XII-1d-lockwood-150ny | 1-R285 p.809 | printed "about 8 a. m. July 2" | 1863-07-02T08:00 | us-12c-1d-lockwood-150ny-02
- XII-1d-lockwood-1mdphb | 1-R283 p.805 | printed "on the morning of the 2d instant" | 1863-07-02 | us-12c-1d-lockwood-1mdphb-02
- XII-1d-lockwood | 1-R271 p.766 | printed "early on the morning of July 2" | 1863-07-02 | us-12c-1d-lockwood-01
- XII-1d-lockwood | 1-R282 p.804 | printed "at 8 a. m. July 3" | 1863-07-03T08:00 | us-12c-1d-lockwood-11
- XII-1d-lockwood | 1-R272 p.773 | printed "Eaily on the morning of July 3" | 1863-07-03 | us-12c-1d-lockwood-03
- XII-1d-lockwood | 1-R293 p.828 | printed "None" | 1863-07-03 | us-12c-1d-lockwood-20

### lockwood_return  [July 2 night: Lockwood regiments return from the left]
- XII-1d-lockwood-150ny | 1-R285 p.809 | printed "about 9 p. m." | 1863-07-02T21:00 | us-12c-1d-lockwood-150ny-06
- XII-1d-lockwood-1mdphb | 1-R283 p.807 | printed "about 11 o'clock the preceding night" | 1863-07-02T23:00 | us-12c-1d-lockwood-1mdphb-11
- XII-1d-lockwood | 1-R282 p.804 | printed "after full darkness set in" | 1863-07-02 | us-12c-1d-lockwood-14
- XII-1d-lockwood-1mdphb | 1-R283 p.806 | printed "About midnight" | 1863-07-02 | us-12c-1d-lockwood-1mdphb-06

### recon_jul4  [July 4 (or 3): reconnaissance around the right of the army]
- XII-1d-colgrove-27in | 1-R287 p.816 | printed "until about 4 p. m." | 1863-07-03T16:00 | us-12c-1d-colgrove-27in-15
- XII-1d-mcdougall-5ct | 1-R275 p.789 | printed "7 a. m. July 4" | 1863-07-04T07:00 | us-12c-1d-mcdougall-5ct-12
- XII-1d-mcdougall-5ct | 1-R275 p.791 | printed "At 7 a. m. July 4" | 1863-07-04T07:00 | us-12c-1d-mcdougall-5ct-31
- XII-1d-mcdougall | 1-R274 p.786 | printed "July 4" | 1863-07-04 | us-12c-1d-mcdougall-21
- XII-1d-mcdougall-123ny | 1-R279 p.798 | printed "until morning" | 1863-07-04 | us-12c-1d-mcdougall-123ny-15
- XII-1d | 1-R272 p.776 | printed "July 4" | 1863-07-04 | us-12c-1d-25
- XII-1d | 1-R272 p.771 | printed "July 5" | 1863-07-05 | us-12c-1d-15

### tt_arr  [July 1: arrival at Two Taverns (Second Division)]
- XII-2d | 1-R293 p.825 | printed "11 a. m." | 1863-07-01T11:00 | us-12c-2d-19
- XII-2d-greene-149ny | 1-R313 p.868 | printed "at about 12 m." | 1863-07-01T12:00 | us-12c-2d-greene-149ny-01


### 3b. Other conflicts (value or composition differences)

- Lockwood's arrival date: Lockwood R282 p. 804 "8 a. m. July 3" (and the evening move "5 p. m. of that day"); Williams R272 p. 773 "Early on the morning of July 3"; Williams's letter in R271 p. 765-766 "early on the morning of July 2"; Maulsby R283 p. 805 "morning of the 2d"; Ketcham R285 p. 809 "about 8 a. m. July 2". The 2/3 digit is the dominant OCR confusion; claims keep the printed value with ocr_uncertain and the other date in the note.
- Geary's route on the evening of July 2: Slocum R271 p. 759 "took the road leading to Two Taverns, crossing Rock Creek"; Williams R272 p. 774 "the road toward Littlestown ... a position on the south side of Rock Creek"; Slocum/Williams letter R271 p. 766 "marching toward Littlestown by mistake"; Geary R293 p. 826: across Rock Creek to "the turnpike across Rock Creek Bridge", halted; Rickards R304 p. 851: forded the creek, 1.5 miles to the rear on the pike; Meade R006 p. 120: "mistaken the road". Hour of the order: Slocum no hour; Williams "Soon after Ruger's and Lockwood's commands had moved out"; Geary 7 p.m.
- Second Division position on the evening of July 1: Slocum R271 p. 759 (on Hancock's order) "on the extreme left of the line"; Williams R272 p. 773 "on the left of the First Corps"; Geary R293 p. 825 extreme left (hills south and west of the town); Hancock R076 p. 368 "the high ground to the right of and near Round Top Mountain"; Slocum's 5 p.m. dispatch D0979 "My Second Division has gone up to the town, and the First on the right of the town"; Greene R307 p. 855 in front of the Taneytown road.
- Greene's fight on July 2: duration "nearly three hours" (Slocum), "three hours' night conflict" (Williams), "two and a half hours" then discontinued about 10 p.m. (Geary), four charges 7 to 9.30 (Greene), 6.40 to 9.30 (Hammerstein), 6.45 to 9.30 (Barnum), "about two hours" (Godard).
- Kane's assumption of command: Kane R302 and Cobham R303 "6 a.m. on the morning of the 2d"; Geary R293 p. 832 "the morning of the 3d instant".
- Kane's return: Geary 9 p.m. (order), Greene about 10 p.m. (informed), Walker (111th PA) about 11 p.m. at Greene's rear, Creighton (7th OH) 11.30 p.m. ordered to form; Candy's brigade: Geary 1 a.m., Greene 1.30 a.m., Flynn 12.30 a.m., Stevens about 2 a.m., Candy "about 12 p.m." (midnight).
- 20th Connecticut / 123rd New York relief in the breastworks on July 3: Wooster R276 p. 794 after about 10.30 a.m. (immediately); McDougall R274 p. 784 and Rogers R279 p. 798 about 2 p.m.
- Time of the Colgrove charge (2nd MA, 27th IN): Morse R288 5.30 (a.m.), Fesler R287 between 5 and 6 a.m.; Ruger R273 after about 10 a.m. ("At this time I received orders"); Colgrove R286 no hour; Hawley R292 advance about 11 a.m.
- The reconnaissance around the right: Slocum R271, Ruger R273, Williams corps report R272, Packer, Rogers: July 4; Williams division report R272 p. 771 "July 5"; Fesler R287 p. 816 July 3 after about 4 p.m.
- Departure from Gettysburg: Slocum R271 p. 761 "The next day [July 5] ... Littlestown"; McDougall about 10.30 a.m. July 5; Price 10.30 a.m.; Geary and Candy 1 p.m.; Wooster "afternoon"; Robinson through Littlestown "about dark"; Packer's first report "11 a.m. ... July 6"; Williams's division report puts the first march (3 miles toward Bruceville) on July 6 with July 5 spent burying the dead; Slocum D1115 (Two Taverns, July 5, 6 p.m.) plans a 5 a.m. July 6 march to near Frederick.
- Strength: Third Wisconsin 246 (Fesler's footnote R287) against 21 officers and 339 enlisted (Hawley R292); 2nd Massachusetts 320 (Fesler) against 294 enlisted men (Cogswell R288); 107th New York 319 (table) against 322 enlisted (footnote) (Crane R290); Kane 652 (R302) against "only 650" (Geary); Lockwood about 1,700 (Geary, Greene) against 2,500 (Butterfield D0807) and 2,100 / 2,700 (D0673, D0693); gun counts July 3: Muhlenberg 20 guns, Geary 14 pieces, Price "some twelve guns", Packer "twenty pieces".
- The July 2 line relative to Rock Creek: Williams (R272 p. 773) "north of Rock Creek"; Slocum "across Rock Creek"; and Colgrove (R286) has the First Brigade on his right where Ruger (R273) puts the Third Brigade on the right of the First.
- Meade (R006 pp. 115-117, 120-121) credits Geary's division alone with the July 3 fight and calls Lockwood's brigade First Corps; Meade's own correction of Feb. 25, 1864, Slocum's letter (R271) and Williams (R271 pp. 765-768) are kept as separate claims.
- Division reports prefer different names for the July 3 morning hill: Ruger R273 "Gulp's Hill" [Culp's Hill] (OCR); Geary R293 "a continuation of Cemetery Hill"; Muhlenberg/Hunt "Slocum's Hill" / "hill known as Slocum's headquarters" (a different hill, near the pike).

## 4. Differences from arrivals.json and placement.json (OR claims recorded anyway)

1. us-12c first_on_field "Jul 1 evening on Culp's Hill: 123rd NY works begin Jul 1" (placement PO-39 / AC-11, 19:32 convention): the OR does not put the 123rd NY, or any First Division unit, on Culp's Hill or building works on July 1. Rogers R279 p. 798: lay on its arms near Rock Creek July 1; "Next morning ... moved toward the town, into the woods to the right of Cemetery Hill. Here the regiment ... built a strong breastwork" (July 2); McDougall R274: built breastworks after the 11 a.m. move July 2. Ruger R273: the Culp's Hill line was reached about 9 a.m. July 2.
2. "Williams's division approaches 17:30, withdraws to the Baltimore Pike for the night" (PO-40): no 17:30 in R271-R314. First Division regiments are near Gettysburg at 12 m. (Packer), 1 p.m. (Wooster), about 4 p.m. (Crane); withdrawal "about sunset" (Ruger), "about dusk" (McDougall), "At evening" (Wooster); "Baltimorepike" only in Williams's corps report R272 p. 773. Gate Q04 (us-12c earliest 1863-07-01T17:30) is later than the OR hours for the First Division (12 m. to 4 p.m.) and than Geary's 5 p.m. line; Slocum's own 3.35 p.m. dispatch (D0975) says he is "moving the Twelfth Corps ... about 1 mile to the right of Gettysburg". Reported, not changed.
3. "Geary on Cemetery Ridge 17:30" (PO-41): Geary R293 prints 5 p.m. and "extreme left of the line of battle", hills south and west of the town, half a mile west of the Baltimore turnpike; Hancock "near Round Top Mountain"; no OR passage says Cemetery Ridge for Geary on July 1.
4. "Lockwood's brigade arrives Jul 2 about 08:00 from Baltimore" (AP-03, road "Baltimore Pike"): 8 a.m. is printed by Ketcham (July 2) and Lockwood (July 3); "Baltimore Pike" as the road is NOT in the OR (only "from Baltimore, via Frederick City"); gap recorded.
5. night_positions "Jun 30: Littlestown / Two Taverns (123rd NY at Two Taverns)": the OR has the corps at Littlestown June 30 (Rogers: a mile outside Littlestown on the Hanover road); Two Taverns is the July 1 halt (Slocum, Williams, Packer 11 a.m., Wooster, Geary 11 a.m.).
6. "Jul 2: Culp's Hill works from about 06:00": 6 a.m. is the Second Division (Greene R307 "about G a. m.", Godard, Hammerstein; Kane/Cobham 6 a.m. command); the First Division arrives later (Williams 8 a.m., Ruger about 9, McDougall about 11; D1002 3.40 a.m. order). "Jul 2 06:00-10:00 works" (AC-07): works finished about 9 a.m. (Godard), about noon (Ireland), "By 13 o'clock" (Greene).
7. "18:30 departure of Geary, Kane, Ruger": Greene R307 6.30 p.m. for the First Division and Candy's and Kane's brigades; Ruger about 6 p.m.; Geary's order to his own division 7 p.m. (the First Division left "nearly half an hour previously"); Williams 5-6 p.m. orders. "Five brigades pulled to the left": the First Division brigades (McDougall, Colgrove) and Lockwood went to the left; Candy and Kane (Geary) did not reach it.
8. "23:00 Ruger at Spangler's Spring" (PO-36): no OR passage (Spangler's Spring is not named anywhere in OR vol. 27, parts 1-3); Ruger R273: after about 10 p.m. in line "along the crest of a slight ridge bordering the swale"; Williams: "on the open fields between the breastworks and the Baltimore pike". Open gap recorded.
9. "Jul 3 04:30 artillery opens" (AC-08): 4.30 is printed by Ruger, Muhlenberg, Hunt; Geary 3.30, Slocum 4, Candy 3.45, Packer 4, Price about 4; Williams "at daylight".
10. Positions for Powers' Hill (GZ-019) and Wolf Hill (GZ-024): not named in the OR; "Slocum's Hill" (Muhlenberg) / "hill known as Slocum's headquarters" (Hunt) carries no gazetteer id.

## 5. OCR problems met

- R277 (3rd Maryland, Sudsburg): upside-down scan, reversed gibberish; recorded as an open gap.
- Digit confusion that changes a date or hour: "July 3" for July 2 (Williams R272 p. 773, Lockwood R282 p. 804, Wooster R276 p. 793 "the morning of the 3d", Flynn R300 "morning of the 3d", Stegman R311 "July 3", Redington R309 heading "July 3"); "13.20 p. m." (Slocum D1040; 12.20 or 1.20), "13 m." for 12 m., "13 o'clock" (Greene R307), "G a. m." (6 a.m.) in Greene R307 and Pleasonton D1044, "lOp. m." (Geary R293), "15J o'clock" (Williams R272 p. 775, illegible), "6i.'36'a. m." (Candy R294), "about! p. m." (Barnum R313), "9 a. m." printed for night (Packer R275), "5. 55", "4. 30", "6. 30" with spaces, "4 a. TO." for 4 a. m. (D0840), "a. jn." (D1002).
- Name OCR: "Gulp's Hill" (R273), "LittlestoAvn", "Taney town", "Knoxyille", "Swell's corps", "T'aneytown road", "Kock Creek", "Eock Creek", "Vohmteers", "Penn- ^Ivania", "tte turnpike".
- Footnotes and running-head fragments inside sentences (R314 p. 869-870 "Divis- ... ion"; R287 p. 815-816).
- Tables unreadable: R274 p. 787-788 regiment strengths partly, R293 p. 833 table, R307 table, all casualty tables.

## 6. Index gaps and index notes

- OR27-1-R277 is delimited (p. 795, `ocr_inverted_page: true`) but unreadable. The printed report numbers differ from the index sequence in this range ("No. 283" for R282 Lockwood, "No. 383" for R283 Maulsby, "No. 380" for R280 Price, "No. 391" for R291 Flood, "No. 398" for R298 Hayes, "No. 293" for R292 Hawley); the index ids follow the sequence and were used.
- Page quality: R273 (Ruger) and R292 (Hawley) have `head-inferred` start pages; R276, R278, R282 and R298 show a doubled page head in the dump (harmless); 29 claims carry interpolated page ranges (R273 9, R271 8, R276 7, R009 2, R037, R211, D1008 one each); never exact.
- Sub-documents inside records are not indexed: the Williams-to-Slocum letter of Dec. 26, 1863 and Meade's reply of Feb. 25, 1864 (inside R271 pp. 763-770), Williams's letter to Geary of Aug. 8, 1863 (R272 p. 777), Candy's second report (R294 p. 838), Packer's two reports (R275), Ketcham's two reports (R285), Colgrove's two reports (R286), Maulsby's second letter (R283 p. 807), and in R006 the statement of the officer who carried sealed orders (p. 126), Gibbon's letter (p. 127) and an unattributed narrative (p. 129). Claims cite the containing record and say so in the note.
- Author strings with OCR errors in the index: "Euger" (Ruger), "McDougaU", "Robmson", "Wilham Hawley", "Bamum", "PoweU", "WiUiam R. Creighton"; report numbers and units are correct.
- Reports not in the index and not searched because absent: none for this slice (R271-R314 all present). Part 3 has no document-level contents, so the Part 3 claims come from dateline segmentation: D-numbers and printed pages as given by the index.

## 7. Open gaps recorded (searches tried are stored in the claim)

- POS-B-us-12c-1d-mcdougall-3md: R277 Sudsburg unreadable.
- POS-B-us-12c-1d-colgrove-3wi: R291 Flood is a June report only.
- POS-B-us-12c-2d-greene: no hour or road for the July 1 arrival.
- POS-B-us-12c-1d: Ruger at Spangler's Spring 23:00 July 2.
- POS-B-us-12c: Powers' Hill / Wolf Hill not named in the OR.
- POS-B-us-12c-1d-lockwood: roads and hours Monocacy Junction to Gettysburg.
- POS-B-us-12c-art: July 1 night / July 4 battery positions and the identity of "Best".

## 8. Statements about other scopes found while reading (for the lead and the other helpers)

- Fifth Corps (scope C): Slocum R271 p. 759 "The Fifth Corps arrived at 5 a. m. on July 2", placed on the right of the Twelfth Corps; Ruger R273 "the advance of the Fifth Army Corps" at daylight; Burbank R211 left on the right of the Twelfth; Sykes left Hanover 7 p.m. July 1, 9 miles to Bonaughtown (D1001, 12.30 a.m.), resume 4 a.m.; Fifth Corps massed near the bridge on Rock Creek on the Baltimore pike (Sykes R187).
- Third Corps (other helper): Geary R293 p. 825 "At 5 a. m. on the 2d, having been relieved by the Third Army Corps" (at the extreme left); Slocum and Sickles arrived about 7 p.m. (Meade R006 p. 115, Halleck R001, Howard R243).
- First Corps (scope A): Cutler R037 early July 2 between the First Brigade and Greene; Wadsworth sent the 6th Wisconsin, 14th Brooklyn and 147th New York (355 men) to Greene about 8 p.m. July 2 (Geary R293 p. 827, Greene R307 p. 856, Stegman R311: 6th WI about 8 p.m.); the 147th NY and 14th Brooklyn reported again to Geary about 8.35 a.m. July 3; the 147th PA and 102nd NY were sent to Wadsworth in the afternoon of July 3 (Pardee R301, Stegman R311); Robinson (R043) and Baxter (R052, 9 a.m.) in support of the Twelfth Corps July 3.
- Eleventh Corps (scope A): 82nd Illinois, 45th New York, 61st Ohio (about 400 men) to Greene (R293, R307); Dobke R256 and Bown R258 confirm; Howard R243 p. 704 about 4 p.m. sent Maj. Howard to Slocum asking one division to each side of Gettysburg; Slocum "had already ordered a division to the right".
- Sixth Corps (scope C): Shaler's brigade (65th, 67th NY, 23rd PA, 82nd PA, 122nd NY) reported to Geary 8.45 a.m. July 3 and was "posted as a reserve" (Geary R293 pp. 829-830, Slocum D1039 10.05 a.m.); Neill's brigade to the right under Slocum (R231, R223).
- Second Corps (lead): Hancock R076 p. 371 "General Meade brought up in person ... two regiments of Lockwood's brigade" on the left of the Second Corps July 2 evening; Caldwell R077 "relieved by the Twelfth Corps"; Gibbon R098 "timely arrival of the Twelfth Corps"; the California Regiment (71st PA, Webb's brigade, footnote R293 p. 826) reported to Greene about 8 p.m. and fell back.
- Artillery Reserve (scope C): Rigby's Battery A, 1st Maryland (R332 p. 899; R315 Tyler p. 873) fired at daylight July 3 "by direction of Major-General Slocum" across Rock Creek; Fitzhugh R330 two batteries on the Baltimore turnpike near Slocum's line; Osborn R264.
- Cavalry (scope A): Pleasonton D1044 (6 a.m. July 3) ordered Gregg to hold "the ridge on the Baltimore turnpike, behind the bridge, which is the right of General Slocum's position"; the 13th NJ, 107th NY and 5th CT went to support Gregg that evening (Ruger 5 p.m., Crane about 6, Packer 5/6, Grimes 7.30 p.m.).

## 9. Files

- tools/bt/positions_data_B_XII_a.py (Slocum R271), _b (Williams R272, Ruger R273), _c (McDougall brigade R274-R281), _d (Lockwood R282-R285, Colgrove brigade R286-R292), _e (Geary R293), _f (Candy, Kane, Cobham and regiments R294-R306), _g (Greene brigade R307-R313), _h (Muhlenberg R314), _i (other Part 1 reports and Part 3 documents, gaps), _z (conflict-group joins, Geary on Kane); tools/bt/xii_helpers.py (helper: literal-quote regexes, conflict groups).
- docs/battle-theatre/history/positions/partial_B_XII.jsonl (794 claims).
- docs/battle-theatre/history/positions/notes_B_XII.md (this file).
