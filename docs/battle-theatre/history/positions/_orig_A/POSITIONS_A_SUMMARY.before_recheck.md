# Positions and approach roads from the Official Records: SCOPE A

Union I Corps, XI Corps, Cavalry Corps (Buford, D. Gregg, Kilpatrick, horse artillery). Source: Official Records, Ser. I, vol. 27, parts 1-3 (OCR text in tmp/library/or27, index docs/battle-theatre/library/or27_index.json). Claim ledger: `docs/battle-theatre/history/positions/positions_A.jsonl` (one JSON claim per line). Nothing here changes a default, gate or tier elsewhere; every conflict between reports is listed with both values and none is resolved.

## 1. Counts and method

- Claims: 682 (documented 655, inferred 6, open gap 21).
- By kind: position 185, engagement 125, movement 119, night_position 96, march 52, arrival_road 48, departure 38, strength_note 19.
- Verbatim quotes under 15 words: 603 claims carry a quote verified present in the OR text by code (`tools/bt/or27_find.py` `verify`, inside the named report record); 58 further claims rest on a short verified extract (close reading); every quote is case-sensitive exact OCR text, errors included.
- Pages: printed page from the index page model; 45 claims fall in a run of pages whose running heads the OCR lost and carry the page RANGE with `interpolated: true`.
- `t_iso` is set only where a clock time is printed (232 claims); `approx` marks "about/near/toward/after". OCR-uncertain claims (digits, dates, names): 70.
- Gazetteer ids come from `docs/battle-theatre/app/data/gazetteer.json`. Where the OR phrase does not name the place, the gazetteer id is an inference and the claim `note` says so. "Fairfield road" (ambiguous), Moritz Tavern, Horner's Mill, the poor-house, Fairfield, Hanover Junction and others are not in the gazetteer: `gazetteer_ref` is null and the printed phrase is kept.
- Tier meaning here: documented = a verified OR passage states this; inferred = reasoned from OR passages (reasoning in the claim); open gap = searched and not found (searches listed in the claim note). Every documented claim is single-source (`flag_single_source`: true): the OR reports are treated as one root, and no two claims are counted as independent confirmation. The Appendix B validator (`tools/bt/validate_provenance.py`) was run over every non-gap claim mapped to its datum form: 0 problems.
- Coverage is by unit in `history/units.json` (ids used as is). Reports not in the OR index are named per unit in section 3.

## 2. Per-unit coverage (brigades, divisions, artillery brigades, corps)

Days = distinct dates with a documented position / night-position / engagement / movement / march / arrival / departure claim (a location on that date). "Direct" = the brigade or one of its regiments; "via div." = only a division or corps claim for that date. Road = a named road (or a gazetteer road) in an arrival_road / march / departure claim of the unit and its regiments (direct) or of its parent (via parent). Time span = earliest and latest `t_iso` among its claims.

| unit | name | claims (gaps) | location days (direct) | days via div./corps only | road of approach (direct) | road via parent | time span | verdict | why |
|---|---|---|---|---|---|---|---|---|---|
| us-11c | XI Corps | 164 (6) | 06-29,06-30,07-01,07-02,07-03,07-04,07-05 | - | the direct route (Emmitsburg Road) x1; Harrisburg road x1 | - | 06-29T17:00 to 07-04T08:00 | full | Howard (six reports), Schurz, Steinwehr, Osborn; the arrival hours conflict widely. |
| us-11c-1d | 1st Div Barlow (w)/Ames | 37 (2) | 07-01,07-02,07-03,07-04 | 06-29,06-30,07-05 | the direct route (Emmitsburg Road) x1; Harrisburg road x1 | - | 07-01T06:00 to 07-03T12:00 | full | Ames, Harris, Brady, White, Lutz, Einsiedel and Schurz account; Barlow has no report. |
| us-11c-1d-ames | Ames/Harris | 20 (0) | 07-01,07-02,07-04 | 06-29,06-30,07-03,07-05 | Harrisburg road x1 | the direct route (Emmitsburg Road) x1 | 07-01T13:00 to 07-02T19:00 | partial | Ames, Harris, Brady, White, Lutz; arrival about 1 p.m. (regiments) to 1-2 p.m. (Brady); road from Emmitsburg (Itinerary; Schurz "Emmitsburg road proper" for the division). |
| us-11c-1d-gilsa | von Gilsa | 11 (2) | 07-01,07-02,07-03,07-04 | 06-29,06-30,07-05 | none | the direct route (Emmitsburg Road) x1 | 07-01T22:00 to 07-03T12:00 | partial | No report by von Gilsa or Barlow (wounded). Only the 41st New York (Einsiedel, arriving "at 10 o'clock in the evening" of July 1) plus the division line in Schurz and Ames; 54th and 68th NY and 153rd PA only in Einsiedel; arrival hour and road open. |
| us-11c-2d | 2nd Div von Steinwehr | 28 (4) | 06-29,07-01,07-02,07-03 | 06-30,07-04,07-05 | none | - | 06-29T17:00 to 07-03T14:30 | partial | Steinwehr, Smith, Wood and Schurz (for Coster); Coster brigade has no report. |
| us-11c-2d-coster | Coster | 10 (4) | 07-01,07-02 | 06-29,06-30,07-03,07-04,07-05 | none | - | 07-02T21:00 to 07-02T21:00 | partial | No report by Coster, 134th NY, 154th NY, 27th PA or 73rd PA. Positions only through Steinwehr and Schurz. |
| us-11c-2d-smith | Smith | 12 (0) | 06-29,07-01,07-02,07-03 | 06-30,07-04,07-05 | none | - | 06-29T17:00 to 06-29T17:00 | partial | Smith and Wood; 33rd MA, 55th and 73rd OH have no report; Smith says the brigade brought up the rear of the whole corps; road not named. |
| us-11c-3d | 3rd Div Schurz/Schimmelfennig | 41 (0) | 06-30,07-01,07-02,07-03,07-04 | 06-29,07-05 | none | - | 06-30T12:00 to 07-04T08:00 | partial | Schurz (two reports), Hecker, Dobke, Bown, Koenig, Willis, Thomson, Ledig, Jacobs. |
| us-11c-3d-krzyzanowski | Krzyzanowski | 20 (0) | 06-30,07-01,07-02,07-03,07-04 | 06-29,07-05 | none | - | 07-01T05:00 to 07-04T08:00 | partial | No brigade report; Koenig (58th NY), Willis (119th NY), Thomson (82nd OH), Ledig (75th PA), Jacobs (26th WI). Arrival hours 12 to 3.30 p.m.; road not named. |
| us-11c-3d-schimmelfennig | Schimmelfennig/von Amsberg | 12 (0) | 06-30,07-01,07-02,07-03 | 06-29,07-04,07-05 | none | - | 06-30T12:00 to 07-03T12:00 | partial | Schimmelfennig captured/hid, no brigade report; Hecker (82nd IL), Dobke (45th NY), Bown (61st OH); 157th NY and 74th PA only through Schurz. Arrival hours differ by 2.5 hours within the brigade (45th NY 11 a.m.; 61st OH 1.30 p.m.). |
| us-11c-art | Artillery Osborn | 33 (0) | 07-01,07-02,07-03 | 06-29,06-30,07-04,07-05 | York pike x1 | - | 07-01T09:00 to 07-03T16:00 | full | Osborn and five battery commanders (Wiedrich, Wheeler, Dilger, Heckman, Bancroft/Merkle for Wilkeson). |
| us-1c | I Corps | 383 (4) | 06-29,06-30,07-01,07-02,07-03,07-05,07-06 | - | Hagerstown road x2; Cashtown road (Chambersburg Pike) x1 | - | 06-30T09:45 to 07-06T07:00 | full | All three divisions and the artillery by named commanders; see divisions. |
| us-1c-1d | 1st Div Wadsworth | 76 (1) | 06-30,07-01,07-02,07-03,07-06 | 06-29 | Cashtown road (Chambersburg Pike) x1; Emmitsburg road x1 | - | 07-01T08:00 to 07-03T15:00 | full | Wadsworth first-hand; Cutler, Meredith brigades; road named (Emmitsburg pike, then Cashtown road). |
| us-1c-1d-cutler | Cutler | 34 (0) | 07-01,07-02,07-03,07-06 | 06-29,06-30 | Emmitsburg and Gettysburg road x1 | Cashtown road (Chambersburg Pike) x1 | 07-01T10:00 to 07-03T15:00 | full | Cutler, Grover, Cook, Fowler, Pye, Hofmann cover June 30 to July 3 at regiment level; Cutler first-hand. |
| us-1c-1d-meredith | Meredith’s Iron Brigade | 30 (1) | 06-30,07-01,07-03 | 06-29,07-02,07-06 | Emmitsburg road x1; Emmitsburg-Gettysburg road x1 | Cashtown road (Chambersburg Pike) x1 | 07-01T09:00 to 07-01T10:00 | partial | July 1 very full (Morrow, Mansfield, Dawes, Robinson 7th WI, Wadsworth); July 2 only via the division, July 3 only the 24th Michigan (printed "July 3 and 4"); the brigade own report (Meredith, injured) is not in the OR index. |
| us-1c-2d | 2nd Div Robinson | 104 (3) | 06-30,07-01,07-02,07-03,07-05,07-06 | 06-29 | toward Gettysburg (road not named) x1 | - | 07-01T06:00 to 07-06T07:00 | full | Robinson first-hand plus Baxter, Coulter, five regiment reports; road not named. |
| us-1c-2d-baxter | Baxter | 42 (3) | 06-30,07-01,07-02,07-03,07-05 | 06-29,07-06 | none | toward Gettysburg (road not named) x1 | 07-01T07:00 to 07-03T18:00 | partial | Baxter own report plus 11th PA (Coulter), 97th NY, 88th PA; 12th MA, 83rd NY, 90th PA have no report. Approach road not named ("from bivouac near Emmitsburg"). |
| us-1c-2d-paul | Paul | 46 (0) | 06-30,07-01,07-02,07-03,07-05,07-06 | 06-29 | none | toward Gettysburg (road not named) x1 | 07-01T06:00 to 07-06T07:00 | partial | Paul wounded early: no brigade report; positions through Robinson, Coulter (First Brigade, second report) and five regiment reports; approach road not named (only "from Emmitsburg"). |
| us-1c-3d | 3rd Div Doubleday/Rowley | 135 (0) | 06-30,07-01,07-02,07-03,07-06 | 06-29 | Hagerstown road x2; Taneytown road x1 | - | 07-01T08:00 to 07-03T21:00 | full | Doubleday (December 1863 and September 1863), Rowley, both brigades; two approach roads (Hagerstown, Millerstown) plus Emmitsburg direction. |
| us-1c-3d-biddle | Biddle | 46 (0) | 06-30,07-01,07-02,07-03 | 06-29,07-06 | Hagerstown road x2; Taneytown road x1 | - | 07-01T08:00 to 07-03T21:00 | full | Chapman Biddle, A. Biddle, McCalmont, McFarland, Gates: two approach roads (Hagerstown road via Willoughby Run; Millerstown road). |
| us-1c-3d-stannard | Stannard | 25 (0) | 07-01,07-02,07-03 | 06-29,06-30,07-06 | none | - | 07-01T17:00 to 07-03T14:00 | partial | Stannard and Randall give July 2-3 well; July 1 arrival hour conflicts (Randall about 5 p.m.; Doubleday about twilight), the July 1 night position conflicts (Cemetery Hill vs the Third Corps line); road of approach not named; 12th and 15th Vermont are not in units.json. |
| us-1c-3d-stone | Stone | 50 (0) | 06-30,07-01,07-02,07-03,07-06 | 06-29 | Chambersburg pike x1; Emmitsburg direction x1 | - | 07-01T09:30 to 07-02T18:00 | full | Stone, Wister, Dana, Musser, Dwight, Irvin, Huidekoper, Jones: best-covered brigade of July 1; July 2-3 at regiment level. |
| us-1c-art | Artillery Wainwright | 43 (0) | 06-30,07-01,07-02,07-03 | 06-29,07-06 | none | - | 07-01T08:00 to 07-03T15:00 | partial | Wainwright and four battery commanders (Hall, Whittier, Breck, Cooper) plus Hunt; Stewart (4th US B) has no report, positions through Wainwright, Dawes, Wadsworth. |
| us-cav | Cavalry Corps | 135 (11) | 06-29,06-30,07-01,07-02,07-03,07-04,07-05 | - | via Emmitsburg x2; Taneytown x1 | - | 06-29T22:00 to 07-04T15:00 | full | Pleasonton, Buford, D. Gregg, Kilpatrick, brigade and regiment reports, Itinerary. |
| us-cav-1d | 1st Div Buford | 56 (7) | 06-29,06-30,07-01,07-02,07-03,07-04 | - | via Emmitsburg x2; Taneytown x1 | - | 06-30T11:00 to 07-03T15:00 | full | Buford (three reports and dispatches), Gamble, Devin, Merritt, Nolan, Calef. |
| us-cav-1d-devin | Devin | 12 (2) | 06-29,06-30,07-01,07-02 | 07-03 | via Emmitsburg x1 | Emmitsburg road (from Fairfield via Emmitsburg) x1 | - | partial | Devin report and Buford; regiments no Gettysburg reports; July 2-3 only at division level. |
| us-cav-1d-gamble | Gamble | 14 (1) | 06-29,06-30,07-01,07-02,07-03 | - | via Emmitsburg x1; Taneytown x1 | Emmitsburg road (from Fairfield via Emmitsburg) x1 | 07-01T08:00 to 07-01T08:00 | full | Gamble report and Buford; regiments (8th IL, 12th IL, 3rd IN, 8th NY) have no Gettysburg report; July 2-3 only at division level (Taneytown, Westminster). |
| us-cav-1d-merritt | Merritt reserve | 19 (4) | 06-29,06-30,07-02,07-03,07-04 | 07-01 | from Emmitsburg toward the ene x1 | Emmitsburg road (from Fairfield via Emmitsburg) x1 | 06-30T22:30 to 07-03T15:00 | partial | Merritt and Nolan; June 30 documented, July 1 by inference only; regiments (1st, 2nd, 5th US, 6th PA) have no report for July 1-3 (R341-R342 are June 21). |
| us-cav-2d | 2nd Div D. Gregg | 33 (4) | 06-30,07-01,07-02,07-03,07-04,07-05 | - | Gettysburg-Hanover pike x1; Gettysburg and Hanover turnpike x1 | - | 06-30T23:00 to 07-04T12:00 | full | D. Gregg and J. I. Gregg reports, Pleasonton; July 1 at Hanover Junction/Hanover only by the Itinerary and Part 3. |
| us-cav-2d-gregg | J. I. Gregg | 10 (2) | 07-02,07-03,07-04,07-05 | 07-01 | Gettysburg-Hanover pike x1 | - | 07-02T11:00 to 07-02T18:00 | partial | J. I. Gregg own report, D. Gregg and Pleasonton; 1st Maine and 16th PA have no July 2-3 report; July 1 not covered. |
| us-cav-2d-huey | Huey’s 2nd Brigade, 2nd Cavalr | 3 (0) | 06-30,07-03,07-04 | 07-01,07-02 | none | - | 06-30T23:00 to 07-04T12:00 | none (not on field) | Not on the field (Huey own report and the Itinerary): Manchester June 30 to July 3, Westminster July 3, Emmitsburg July 4. |
| us-cav-2d-mcintosh | McIntosh | 11 (2) | 07-01,07-02,07-03,07-04 | - | Gettysburg and Hanover turnpike x1 | - | 07-02T12:00 to 07-02T12:00 | full | D. Gregg and Pleasonton cover July 2-3; McIntosh own report starts July 4 (R348); July 1 at Hanover Junction/Hanover by the Itinerary and Part 3 only. |
| us-cav-3d | 3rd Div Kilpatrick | 34 (0) | 06-29,06-30,07-01,07-02,07-03,07-04 | - | none | - | 06-29T22:00 to 07-04T15:00 | partial | Kilpatrick, Richmond, Custer and four regiment reports; road of approach to Gettysburg not named; Hunterstown date conflict. |
| us-cav-3d-custer | Custer | 9 (0) | 06-29,07-02,07-03 | 06-30,07-01,07-04 | none | - | 06-29T22:00 to 07-03T10:00 | partial | Custer diary-form report (Hunterstown printed under July 1, 2 and 3) and Kilpatrick, Gregg, Pleasonton for July 3; road to Gettysburg not named. |
| us-cav-3d-farnsworth | Farnsworth (k)/Richmond | 13 (0) | 06-29,06-30,07-02,07-03 | 07-01,07-04 | none | - | 06-30T12:00 to 07-03T17:30 | partial | Kilpatrick, Richmond (brigade), Hammond (5th NY), Darlington (18th PA), Preston (1st VT), Capehart (1st WV); conflict about July 1-2 (Richmond: not engaged); road to Gettysburg not named. |
| us-cav-art | Horse Artillery | 12 (0) | 06-30,07-01,07-02,07-03 | - | none | - | 07-01T08:00 to 07-03T12:30 | partial | Only Calef (A, 2nd US), Daniels (Ninth Michigan), Robertson, Tidball and passages in brigade reports; no battery reports for Pennington, Elder, Randol, Graham, Heaton; battery ids are not in units.json. |

Brigade verdicts (the 21 infantry and cavalry brigades of scope A in units.json; artillery brigades and the horse artillery group are in the table above):

- us-1c-1d-meredith: partial
- us-1c-1d-cutler: full
- us-1c-2d-paul: partial
- us-1c-2d-baxter: partial
- us-1c-3d-biddle: full
- us-1c-3d-stone: full
- us-1c-3d-stannard: partial
- us-11c-1d-gilsa: partial
- us-11c-1d-ames: partial
- us-11c-2d-coster: partial
- us-11c-2d-smith: partial
- us-11c-3d-schimmelfennig: partial
- us-11c-3d-krzyzanowski: partial
- us-cav-1d-gamble: full
- us-cav-1d-devin: partial
- us-cav-1d-merritt: partial
- us-cav-2d-mcintosh: full
- us-cav-2d-gregg: partial
- us-cav-3d-farnsworth: partial
- us-cav-3d-custer: partial
- us-cav-2d-huey: none (not on field)

Totals: partial 15, full 5, none (not on field) 1.

Rule used: full = documented position claims (brigade or its regiments, not only the division) for each of July 1, 2 and 3 AND a documented approach/march claim naming a road for the brigade or its regiments; partial = anything less (the table says what is missing); none = no OR claim, or the unit never reached the field. A "full" brigade is not therefore uniform: see "why".

## 3. Units with no own claim or an open gap; reports searched; index gaps

Open-gap claims (searches listed in each claim): us-11c-1d-gilsa, us-11c-1d-gilsa-54ny, us-11c-2d-coster, us-11c-2d-coster-134ny, us-11c-2d-coster-154ny, us-11c-2d-coster-73pa, us-1c-1d-meredith-19in, us-1c-2d-baxter-12ma, us-1c-2d-baxter-83ny, us-1c-2d-baxter-90pa, us-cav-1d-devin-17pa, us-cav-1d-devin-3wvaandc, us-cav-1d-gamble-8il, us-cav-1d-merritt-1us, us-cav-1d-merritt-2us, us-cav-1d-merritt-5us, us-cav-1d-merritt-6pa, us-cav-2d-gregg-16pa, us-cav-2d-gregg-1me, us-cav-2d-mcintosh-1ma, us-cav-2d-mcintosh-1pa.

Units in units.json for scope A that have NO claim at all (neither documented nor gap): none.

Regiments and batteries with no claim of their own (they appear only through their brigade/division claims): none; every regiment/battery id of scope A in units.json has at least one claim (documented, inferred or an open gap).

Reports read in full or in the relevant passages (Part 1, report numbers as in the index): I Corps R029 Doubleday, R030 Newton, R032-R042 (1st Div, Meredith/Cutler brigades), R043-R054 (2nd Div), R055-R070 (3rd Div), R071-R075 (artillery brigade); XI Corps R243 Howard, R244-R270; Cavalry R336 Pleasonton, R337-R340, R343 (Nolan), R344 D. Gregg, R348 McIntosh, R352 Huey, R355-R358, R359 Kilpatrick, R361-R367, R368-R369, R372, R374-R375; also R007 (Itinerary) and R028 (Hunt, July 1-3 narrative on the First and Eleventh Corps batteries). Read and found to cover only June actions or later dates (no Gettysburg claim): R031, R341, R342, R345-R347, R349-R351, R353-R354, R356 (July 15-16), R357 (July 5+), R358 (July 15-16), R360, R370-R371, R373, R375 (Manchester).

Part 3 documents used: D0920, D0922, D0923, D0928, D0929, D0930, D0933, D0938 (June 30); D0959, D0960, D0970, D0971, D0986, D0987, D0988 (July 1); D1005, D1006, D1019, D1020, D1021 (July 2); D1044 (July 3). Part 2 (Confederate reports) was not read for this scope; it was searched only by unit-name regexes for the open-gap units (hits listed in each gap claim).

Index gaps (no report in `or27_index.json` for these commands, so claims come from the superior's, neighbours' or subordinates' reports): Meredith (1st Brig., 1st Div.), Paul, Barlow, von Gilsa, Coster, Schimmelfennig/von Amsberg, Krzyzanowski (brigade reports), 19th Indiana, 12th Massachusetts, 83rd NY, 90th PA, 54th NY, 68th NY, 153rd PA, 134th NY, 154th NY, 27th PA, 73rd PA, 157th NY, 74th PA, 33rd MA, 55th OH, 73rd OH; 8th IL, 12th IL, 3rd IN, 8th NY, 6th NY, 9th NY, 17th PA, 3rd WV cavalry; 6th PA, 1st, 2nd, 5th US cavalry (no July 1-3 report); 1st MA, 1st PA, 1st MD cavalry; 1st ME and 16th PA cavalry (no July 2-3 report); horse batteries of Pennington (M, 2nd US), Elder (E, 4th US), Randol (E, 1st US), Graham (K, 1st US) and Heaton (B and L, 2nd US) for July 1-3; Stewart (B, 4th US) and the 12th and 15th Vermont. The index has no sub-document split inside the composite reports (Meade R006, Howard R243 with six reports, Doubleday R029 with two, Pleasonton R336).

## 4. Approach roads and entry times (what decides where units enter the map)

All dates 1863. Times are those printed; the source claim ids are in the ledger (search by unit id and kind arrival_road / march / departure).

**I Corps (Reynolds, then Doubleday), June 29-July 1.** June 29 bivouac on the heights north of Emmitsburg (Doubleday R029). June 30 corps at Marsh Creek / "Marsh Run" on the direct road Emmitsburg-Gettysburg (Howard R243; Itinerary R007; Baird 9.45 a.m. D0922): 1st Division with Hall's battery covering the Gettysburg road; 3rd Division with Cooper's battery covering the Fairfield road; 2nd Division some miles in rear (Doubleday R029), north of Emmitsburg across the Pennsylvania line (Farnham, Batchelder, Prey, Bierer, Roath). The reports also place the 3rd Division brigades at White's house, Freedom Township, at the cross-roads of the Millerstown (Fairfield and Bull Frog) road with the Gettysburg road (A. Biddle) and on George Spangler's farm 6 miles from Gettysburg (McFarland).

- 1st Division: left Marsh Creek at 8 a.m. (Wadsworth; Hall 9 a.m.; Wainwright's orders about 8). Road: "the Emmitsburg pike" (Mansfield, 2nd WI, brigade column), "the road running from Emmitsburg to Gettysburg" (Robinson 7th WI). At about 2 miles out (Cutler) the column turned left across the fields and struck the Cashtown road (Chambersburg Pike) three-quarters of a mile west of the town at about 10 a.m. (Wadsworth); Morrow (24th MI) gives about 9 a.m. near the town; Buford at 10.10 a.m.: within 3 miles; Cook (76th NY) about 10.30; Hofmann (56th PA) engaged 11 a.m. Order: Cutler leading, Hall's battery, then Meredith (Wadsworth).
- 3rd Division (Rowley): from points 5-6 miles out; Biddle's brigade with a four-gun battery took the advance about 1.5 miles ahead of the other divisions; the division "took a by-road to the left" 4 miles out (Wainwright); reached the field "from the south" toward 11 (Rowley), "in a westerly direction" within 1 mile at about 11 (Biddle), forming on the Hagerstown road about a mile southwest of the town at 10.30 (McFarland: marched 8 a.m., up the left bank of Willoughby Run) and between 10 and 11 (Gates, 1.5 miles west of Gettysburg, brigade line formed in the Hagerstown road). Stone's brigade: bivouac 6 miles out on the north side of Marsh Creek, march 9.30 a.m. (Wister), "from the Emmitsburg direction" passing in rear of the 1st and 2nd Divisions (Dwight), in position 11 a.m. (Stone, Dana) or about noon (Wister, Huidekoper).
- 2nd Division (Robinson): rear of the corps column, from near Emmitsburg; left 6 a.m. (Farnham, Batchelder), 7 a.m. (Wheelock 97th NY), about 7 a.m. rejoined (88th PA); about 3 miles out it was pushed forward (Robinson); near the front at 11 a.m. (Baxter, Coulter) but 1 p.m. (Prey 104th NY, Wheelock, MacThomson); held a seminary-ridge reserve first. Road not named.
- Artillery brigade: orders about 8 a.m. (Wainwright), firing heard when within 2 miles at about 10.30; Breck (Battery L) arrived about 11 a.m.; Hall opened 10.45 (Hunt: ordered into action 10.15).
- Stannard's Vermont brigade: reached the field the evening of July 1 (Stannard; Randall about 5 p.m.; Doubleday about twilight; Itinerary July 1); road not named in the OR reports read. 12th and 15th Vermont detached as wagon guard.

**XI Corps (Howard), June 29-July 1.** June 29 Frederick to Emmitsburg (Itinerary; camp by 7 p.m., Howard; Smith 5 p.m.); June 30 at Emmitsburg (Howard; Hecker; Dobke). July 1: 3.30 a.m. order to within supporting distance; 8 a.m. Reynolds ordered the march (Howard R243; but a dispatch printed "C a. m." (6 a.m.) in D0959 already gives the route plan; Schurz left at 7, Ledig and Willis at about 5, Bown 9). Routes: the 1st Division (Barlow) behind the First Corps by the direct road, "the Emmitsburg road proper" (Howard, Schurz); the 3rd (Schurz) and 2nd (Steinwehr) divisions by "Horner's Mill(s)", about 13 miles, with four of the five batteries (Osborn). Entry times differ widely (section 5, group XH1): 45th NY 11 a.m.; Schurz himself about 11.30; 119th NY about 12; the head of column through the town "about" 12.30 (Howard); 75th OH, 107th OH about 1; 17th CT 1-2; 61st OH and 75th PA about 1.30; Steinwehr about 2; 26th WI about 3; part of the 58th NY 3.30; 41st NY "10 o'clock in the evening". Dilger arrived about 10 a.m. and Wilkeson about 11 a.m. (batteries ahead of the infantry).

**Cavalry Corps.** Buford: June 29 Boonsborough-Cavetown-Monterey Springs to near Fairfield (1st, 2nd Brigades; Reserve Brigade to Mechanicstown); June 30 from Fairfield via Emmitsburg (Emmitsburg Road) to Gettysburg, entering at 11 a.m. (Buford's June 30 dispatch) or "in the afternoon" (his August report); July 1 holds the Cashtown road west (Gamble: line 1 mile in front of the seminary, right on the railroad, left near the Middletown/Fairfield road; Devin: right on the Mummasburg road, line to the York road) from about 8-9 a.m.; July 1 night on the Union left; July 2 withdrawn to Taneytown (by 1.45 p.m. per D1021, reaching Taneytown about 4 p.m. per Calef), July 3 Westminster. Reserve Brigade (Merritt): Mechanicstown, Emmitsburg on July 2, July 3 about 12 m. from Emmitsburg 4 miles along the Gettysburg road, engaged about four hours; 3 p.m. on Farnsworth's left (Kilpatrick). D. Gregg's 2nd Division: July 1 Hanover Junction then Hanover (Itinerary), July 2 along the Hanover pike to the extreme right at its junction with the road behind the line: J. I. Gregg about 11 a.m., D. Gregg about noon (Pleasonton's 10.40 dispatch already speaks of the position 3 miles out on the Hanover road); July 3 morning moved three-quarters of a mile nearer the Baltimore turnpike; Huey's brigade never came (Manchester, Westminster). Kilpatrick's 3rd Division: June 29 Littlestown, June 30 Hanover (10 a.m. Kilpatrick; noon Richmond), July 1 Abbottstown-Berlin and back, July 2 Abbottstown-Oxford-Hunterstown (Capehart) or "reached the field at 2 p.m." across country (Kilpatrick), attacked at sundown near Hunterstown, 11 p.m. to Two Taverns (daylight), July 3 8 a.m. to the left of the line (Farnsworth in action at 1 p.m., Merritt 3 p.m., charge 5-5.30 p.m.), Custer's brigade on the right with Gregg (Gregg says he retained it; Kilpatrick says a mistake). Horse artillery: Robertson's batteries Taneytown June 30, left 11.30 p.m. July 1, near the field at 6.30 a.m. July 2 (reserve), Daniels' Ninth Michigan Battery in line west of town (as printed) at 12.30 p.m. July 3.

## 5. Conflicts between reports (both values, nothing resolved)

33 conflict groups (connected sets of claims whose `conflicts_with` lists link them). In each, the printed values are listed side by side. External conflict-register ids: C-043 (retreat order 15:45 / 16:00 / 16:30 / 17:00), C-040 (Reynolds' death 10:15 / 10:30 / 11:15 / 11:30), C-029/C-030 (cannonade start), C-032 (East Cavalry Field hour), C-027 (Buford). These ids are context only; nothing is added to the register here.

### Group 1 (1863-06-30; 2 claims): Buford's dispatch of June 30: entered Gettysburg that day at 11 a. m. and found 

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV1-004 | us-cav-1d | 1-R337 Brig. Gen. John Buford p.923 | to-day at 11 a. m. | 1863-06-30T11:00 | Gettysburg |
| POS-A-CV1-005 | us-cav-1d | 1-R337 Brig. Gen. John Buford p.926 | in the afternoon |  | Gettysburg |

### Group 2 (1863-06-30; 2 claims): June 30 the division reached Hanover at 10 a. m.; while passing through the town

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-019 | us-cav-3d | 1-R359 Brig. Gen. Judson Kilpatrick p.992 | 10 a. m. | 1863-06-30T10:00 | Hanover |
| POS-A-CV2-020 | us-cav-3d-farnsworth | 1-R362 Col. Nathaniel P. Richmond p.1005 | about noon | 1863-06-30T12:00 | Hanover |

### Group 3 (1863-07-01 to 1863-07-02; 26 claims): On July 1 at 7 a. m. the Third Division left its camp near St. Joseph's College 

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-11B-020 | us-11c-3d | 1-R253 Maj. G«n. Carl Schurz p.727 | at 7 a. m. | 1863-07-01T07:00 | its camp near Saint Joseph's College, Emmitsburg |
| POS-A-11A-005 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.701 | At 8 a. m. | 1863-07-01T08:00 | Emmitsburg |
| POS-A-11B-038 | us-11c-3d-schimmelfennig-45ny | 1-R256 Lieut. Col. Adolphus Dobke p.734 | at 11 a. m. | 1863-07-01T11:00 | Gettysburg |
| POS-A-11B-039 | us-11c-3d-schimmelfennig-45ny | 1-R256 Lieut. Col. Adolphus Dobke p.734 | at 11.30 a. m. | 1863-07-01T11:30 | the immediate right of the First Corps, north of the to |
| POS-A-11A-010 | us-11c-3d | 1-R243 Maj. Gen. OUver O. Howard p.702 | before 12 m. | 1863-07-01T12:00 | the cemetery, on the highest point north of the Baltimo |
| POS-A-11B-051 | us-11c-3d-krzyzanowski-119ny | 1-R260 Maj. Benjamin A. Willis p.742 | about 12 o'clock | 1863-07-01T12:00 | Gettysburg (11 miles from the start) |
| POS-A-11A-013 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.702 | About this time (about 12.30 p. m.) | 1863-07-01T12:30 | the town of Gettysburg, moving forward toward the posit |
| POS-A-11A-032 | us-11c-1d-ames-75oh | 1-R246 Col. Andrew L. Harris p.715 | at about 1 p. m. | 1863-07-01T13:00 | the northwest part of the city |
| POS-A-11A-036 | us-11c-1d-ames-17ct | 1-R247 Maj. Allen G. Brady p.716 | between 1 and 2 p. m. | 1863-07-01T13:00 | the lower end of the town |
| POS-A-11A-045 | us-11c-1d-ames-107oh | 1-R249 Capt. John M. Lutz p.720 | at about 1 p. m. | 1863-07-01T13:00 | Gettysburg |
| POS-A-11B-043 | us-11c-3d-schimmelfennig-61oh | 1-R258 Lieut. Col. William H. H. Bo p.738 | at about 1.30 p. m. | 1863-07-01T13:30 | Gettysburg |
| POS-A-11B-002 | us-11c-2d | 1-R250 Brig. Gen. Adolph von Steinw p.721 | At about 2 o'clock | 1863-07-01T14:00 | near Gettysburg; Cemetery Hill |
| POS-A-11B-027 | us-11c | 1-R253 Maj. G«n. Carl Schurz p.728 | about 2 p. m. | 1863-07-01T14:00 | a few hundred yards north of the town |
| POS-A-11A-014 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.703 | About 2.45 p. m. | 1863-07-01T14:45 | in front of the Eleventh Corps (north of the town) |
| POS-A-11A-046 | us-11c-1d-ames-107oh | 1-R249 Capt. John M. Lutz p.720 | at about 3 p. m. | 1863-07-01T15:00 | half a mile north of the town |
| POS-A-11B-028 | us-11c | 1-R253 Maj. G«n. Carl Schurz p.728 | about 3 o'clock | 1863-07-01T15:00 | north of the town (Mummasburg and Middletown roads) |
| POS-A-11B-061 | us-11c-3d-krzyzanowski-26wi | 1-R263 Col. William H. Jacobs p.746 | About 3 p. m. | 1863-07-01T15:00 | the village of Gettysburg; the extreme right of the bri |
| POS-A-11B-047 | us-11c-3d-krzyzanowski-58ny | 1-R259 Capt. Emil Koenig p.740 | about 3.30 p. m. | 1863-07-01T15:30 | Gettysburg; a hill on the left of Cemetery Hill |
| POS-A-11A-048 | us-11c-1d-gilsa-41ny | 1-R245 Lieut. Col. Detleo von Einsi p.713 | at about 10 o'clock in the evening of Ju | 1863-07-01T22:00 | the cemetery near Gettysburg, behind a square stone fen |
| POS-A-11A-043 | us-11c-1d-ames-25oh | 1-R248 Lieut. Israel White p.719 | the evening of the 1st |  | the heights in the rear of Gettysburg |
| POS-A-11B-005 | us-11c-2d-coster | 1-R250 Brig. Gen. Adolph von Steinw p.721 | (afternoon, July 1) |  | through the town, north and east of Gettysburg |
| POS-A-11B-012 | us-11c-2d-smith | 1-R251 Col. Orland Smith p.723 | Wednesday, July 1 |  | Emmitsburg to Gettysburg |
| POS-A-11B-022 | us-11c-3d | 1-R253 Maj. G«n. Carl Schurz p.727 | (hour blank: "arrived at — o'clock") |  | through the town to the right of the First Corps |
| POS-A-11B-058 | us-11c-3d-krzyzanowski-75pa | 1-R262 Maj. August Ledig p.745 | at 1.30 a. m. (printed) |  | the north side of the town |
| POS-A-CV1-025 | us-cav-1d-devin | 1-R339 Col. Thomas C. Devin p.939 | two hours (until the Eleventh Corps arri |  | the right, north-northeast of the town (York and Heidle |
| POS-A-11A-038 | us-11c-1d-ames-17ct | 1-R247 Maj. Allen G. Brady p.718 | until 2 o'clock of the 2d |  | behind a rail fence at the upper end of the town; picke |

### Group 4 (1863-07-01; 2 claims): On the morning of July 1 Osborn moved from Emmitsburg toward Gettysburg with the

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-11C-001 | us-11c-art | 1-R264 Maj. Thomas W. Osbom p.747 | on the morning of the 1st instant |  | Emmitsburg toward Gettysburg |
| POS-A-11C-015 | us-11c-art-13ny | 1-R266 Lieut. William Wheeler p.752 | on July 1 |  | Emmitsburg; within about 5 miles of Gettysburg |

### Group 5 (1863-07-01; 5 claims): A little after 10 a. m. Dilger's battery (the first) reached the town and was or

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-11C-003 | us-11c-art-1ohi | 1-R264 Maj. Thomas W. Osbom p.747 | A little after 10 a. m. | 1863-07-01T10:00 | the front of and 300 yards beyond the town |
| POS-A-11C-021 | us-11c-art-1ohi | 1-R267 Capt. Hubert DUger p.754 | at about 10 a. m. | 1863-07-01T10:00 | Gettysburg; position "between the Taneytown and Baltimo |
| POS-A-11C-005 | us-11c-art-4usg | 1-R264 Maj. Thomas W. Osbom p.748 | About 11 a. m. | 1863-07-01T11:00 | about three-fourths of a mile from the town on the left |
| POS-A-11C-027 | us-11c-art-4usg | 1-R269 Lieut. Eugene A. Bancroft p.756 | at 11 a. m. | 1863-07-01T11:00 | the town, then about 1 mile east/northeast through fiel |
| POS-A-11C-032 | us-11c-art-4usg | 1-R270 Lieut. Christopher F. Merkle p.757 | (about 11 a. m.-noon, July 1) |  | about 1 mile or three-quarters northwest of the poor-ho |

### Group 6 (1863-07-01; 7 claims): About 8 o'clock on the morning of July 1 orders to march to Gettysburg were rece

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1CA-003 | us-1c-art | 1-R071 Col. Charles S. Wainwright p.354 | About 8 o'clock | 1863-07-01T08:00 | the camps near Emmitsburg and Marsh Creek |
| POS-A-1CA-019 | us-1c-art-2me | 1-R072 Capt. James A. HaU p.359 | At 9 a. m. | 1863-07-01T09:00 | Marsh Creek, 4 miles from Gettysburg |
| POS-A-1D4-018 | us-1c-3d-biddle-80ny | 1-R057 Col. C!ol. Theodore B. Gates p.320 | between 10 and 11 o'clock | 1863-07-01T10:00 | the Hagerstown road, 1 1/2 miles west of Gettysburg |
| POS-A-1D4-045 | us-1c-3d-biddle-151pa | 1-R060 Lieut. Col. (Jeorge F. MoFar p.327 | at 10.30 a. m. | 1863-07-01T10:30 | the Hagerstown road, left flank of the First Corps |
| POS-A-1D4-002 | us-1c-3d | 1-R055 Brig. Gen. Thomas A. Eowley p.312 | Toward 11 o'clock | 1863-07-01T11:00 | the battle-field, from the south |
| POS-A-1D4-010 | us-1c-3d-biddle | 1-R056 Col. Chapman Biddle p.315 | about 11 a. m. | 1863-07-01T11:00 | within 1 mile of the town, in a westerly direction |
| POS-A-1C0-006 | us-1c | 1-R029 Maj. Gen. Abner Doubleday p.244 | between 7 and 8 o'clock (Reynolds' summo |  | Marsh Creek and the Emmitsburg bivouacs |

### Group 7 (1863-07-01; 10 claims): About 11 a. m. the brigade was massed on the west side and near the embankment o

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D3-012 | us-1c-2d-baxter | 1-R044 Col. C!ol. Eichard Coulter p.292 | about 11 a. m. | 1863-07-01T11:00 | the west side and near the embankment of the railroad |
| POS-A-1D3-069 | us-1c-2d-baxter | 1-R052 Brig. Gen. Henry Baxter p.307 | at 11 a. m. | 1863-07-01T11:00 | near the front (west of Gettysburg) |
| POS-A-1D3-087 | us-1c-2d-baxter-88pa | 1-R054 Capt. Edmund Y. Patterson p.311 | About 11 a. m. (heard cannonading); afte | 1863-07-01T11:00 | a stone fence, then a slight hill |
| POS-A-1D3-049 | us-1c-2d-paul-104ny | 1-R048 Col. C:!ol. Gilbert G. Prey p.300 | about 1 o'clock | 1863-07-01T13:00 | Gettysburg |
| POS-A-1D3-061 | us-1c-2d-paul-107pa | 1-R050 Lieut. Col. James MacThomson p.304 | about 1 p. m. | 1863-07-01T13:00 | the field west of Gettysburg (position not named) |
| POS-A-1D3-083 | us-1c-2d-baxter-97ny | 1-R053 Col. Charles_ Wheelock p.309-310 (range) | at 1 p. m. | 1863-07-01T13:00 | north of the town, on the flat |
| POS-A-1D3-015 | us-1c-2d-baxter | 1-R044 Col. C!ol. Eichard Coulter p.292 | until after 3 p. m. | 1863-07-01T15:00 | the ridge |
| POS-A-1C0-014 | us-1c-2d | 1-R029 Maj. Gen. Abner Doubleday p.247 | (just after Reynolds' death, July 1) |  | the seminary |
| POS-A-1D3-002 | us-1c-2d | 1-R043 Brig. Gen. John C. Eobinson p.289 | (on arrival, forenoon-noon of July 1) |  | near the seminary |
| POS-A-1D3-071 | us-1c-2d-baxter | 1-R052 Brig. Gen. Henry Baxter p.307 | over two hours |  | the ridge (right of the First Division) |

### Group 8 (1863-07-01; 3 claims): The brigade arrived at Gettysburg on July 1 at about 5 p. m. and the 13th, 14th 

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D5-059 | us-1c-3d-stannard-13vt | 1-R070 Col. Francis V. Eandall p.351 | at about 5 p. m. | 1863-07-01T17:00 | Gettysburg; Cemetery Hill |
| POS-A-1C0-027 | us-1c-3d-stannard | 1-R029 Maj. Gen. Abner Doubleday p.258 | about twilight |  | the field at Gettysburg |
| POS-A-1D5-049 | us-1c-3d-stannard | 1-R069 Brig. Gen. George J. Stannar p.347-348 (range) | the evening of July 1 |  | Gettysburg |

### Group 9 (1863-07-01; 3 claims): The Vermont regiments, having marched with Sickles' troops through some mistake,

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1C0-028 | us-1c-3d-stannard | 1-R029 Maj. Gen. Abner Doubleday p.258 | the night of the 1st |  | in the Third Corps line (left center) |
| POS-A-1D5-050 | us-1c-3d-stannard | 1-R069 Brig. Gen. George J. Stannar p.349 | (evening of July 1) |  | the front line in connection with the Third Army Corps |
| POS-A-1D5-060 | us-1c-3d-stannard-13vt | 1-R070 Col. Francis V. Eandall p.351 | (evening of July 1) |  | Cemetery Hill, in rear of the First and Eleventh Corps  |

### Group 10 (1863-07-01; 3 claims): July 1 between 8 and 9 a. m. reports came in from the First Brigade (Gamble) tha

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV1-007 | us-cav-1d-gamble | 1-R337 Brig. Gen. John Buford p.927 | between 8 and 9 a. m. | 1863-07-01T08:00 | the Cashtown road west of Gettysburg |
| POS-A-CV1-016 | us-cav-1d-gamble | 1-R338 Col. William Gamble p.934 | About 8 o'clock on the morning of the 1s | 1863-07-01T08:00 | the seminary building |
| POS-A-CV1-019 | us-cav-1d-gamble | 1-R338 Col. William Gamble p.934 | after "several hours" (forenoon, July 1) |  | the ridge about 200 yards behind the first line |

### Group 11 (1863-07-01; 7 claims): Came near the town about 9 a. m., filed off to the left leaving it on the right,

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D1-009 | us-1c-1d-meredith | 1-R033 Col. Henry A. Morrow p.267 | about 9 a. m. | 1863-07-01T09:00 | near the town of Gettysburg |
| POS-A-1D1-002 | us-1c-1d | 1-R032 Brig. Gen. James S. Wadswort p.265 | at about 10 a. m. | 1863-07-01T10:00 | the Cashtown road about threequarters of a mile west of |
| POS-A-1D1-016 | us-1c-1d-meredith | 1-R034 Maj. John Mansfield p.273 | About 10 a. m. | 1863-07-01T10:00 | the field on the left and west of Gettysburg, in the di |
| POS-A-1D1-030 | us-1c-1d-meredith | 1-R036 Col. WiUiam W. Eobinson p.278 | about 10 a. m. | 1863-07-01T10:00 | the vicinity of Gettysburg; the field to the left |
| POS-A-CV1-008 | us-1c | 1-R337 Brig. Gen. John Buford p.924 | 10.10 a. m. | 1863-07-01T10:10 | within 3 miles of Gettysburg |
| POS-A-1D2-021 | us-1c-1d-cutler-76ny | 1-R039 Capt. John E. Cook p.285 | at about 10.30 a. m. | 1863-07-01T10:30 | the battle-field near the seminary |
| POS-A-1D2-033 | us-1c-1d-cutler-56pa | 1-R042 Col. J. WiUiam Hofmann p.288 | at 11 a. m. | 1863-07-01T11:00 | Gettysburg |

### Group 12 (1863-07-01; 3 claims): Reynolds fell in the beginning of the attack about 10.15 a. m.; Doubleday took c

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1C0-009 | us-1c | 1-R029 Maj. Gen. Abner Doubleday p.245 | about 10.15 a. m. | 1863-07-01T10:15 | the ridge beyond Willoughby Run |
| POS-A-11A-008 | us-1c | 1-R243 Maj. Gen. OUver O. Howard p.696 | at 11.15 a. m. | 1863-07-01T11:15 | the front west of Gettysburg |
| POS-A-11A-009 | us-1c | 1-R243 Maj. Gen. OUver O. Howard p.702 | about 11.30 a. m. | 1863-07-01T11:30 | Gettysburg (Howard on a high building facing west) |

### Group 13 (1863-07-01; 4 claims): Hunt: about 10.15 a. m. Hall's battery (Second Maine) was ordered into action by

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-HNT-001 | us-1c-art-2me | 1-R028 Brig. Gen. Henry J. Hunt p.229 | About 10.15 a. m. | 1863-07-01T10:15 | the right of the Cashtown road on the second ridge, som |
| POS-A-1CA-006 | us-1c-art | 1-R071 Col. Charles S. Wainwright p.354 | at about 10.30 a. m. | 1863-07-01T10:30 | 2 miles from Gettysburg, then across the fields toward  |
| POS-A-1CA-021 | us-1c-art-2me | 1-R072 Capt. James A. HaU p.359 | at 10.45 a. m. | 1863-07-01T10:45 | the right of the Cashtown road beyond Seminary Hill |
| POS-A-1CA-023 | us-1c-art-1nyl | 1-R074 Lieut. George Breck p.362 | At about 11 a. m. | 1863-07-01T11:00 | the field west of the town, from Emmitsburg |

### Group 14 (1863-07-01; 4 claims): At 11 o'clock a. m. July 1, by Doubleday's order, Stone posted the brigade betwe

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D5-001 | us-1c-3d-stone | 1-R061 Col. Eoy Stone p.329 | at 11 o'clock a. m. | 1863-07-01T11:00 | the ridge in advance of Seminary Ridge, right on the Ch |
| POS-A-1D5-019 | us-1c-3d-stone | 1-R063 Col. Edmund L. Dana p.335 | about 11 a. m. | 1863-07-01T11:00 | the crest, between the grove (where Reynolds fell) and  |
| POS-A-1D5-009 | us-1c-3d-stone | 1-R062 Col. Langhome Wister p.332 | at about 13 m. (12 m.) | 1863-07-01T12:00 | the Gettysburg Seminary, then a house and barn on the C |
| POS-A-1D5-042 | us-1c-3d-stone-150pa | 1-R067 Lieut. Col. Henry S. Huideko p.346 | about noon | 1863-07-01T12:00 | the battle-field at Gettysburg |

### Group 15 (1863-07-01 to 1863-07-03; 18 claims): Division held the position on the right of the First Division line from about no

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D3-005 | us-1c-2d | 1-R043 Brig. Gen. John C. Eobinson p.290 | from about noon until nearly 5 p. m. | 1863-07-01T12:00 | the right (of the First Division line) |
| POS-A-1D5-011 | us-1c-3d-stone | 1-R062 Col. Langhome Wister p.333 | about 3.40 o'clock | 1863-07-01T15:40 | the seminary |
| POS-A-1D1-004 | us-1c-1d | 1-R032 Brig. Gen. James S. Wadswort p.266 | at 3.45 o'clock | 1863-07-01T15:45 | Seminary Ridge |
| POS-A-11A-015 | us-1c | 1-R243 Maj. Gen. OUver O. Howard p.704 | About 4 p. m. | 1863-07-01T16:00 | Cemetery Hill and the left of the Baltimore pike |
| POS-A-11B-062 | us-11c-3d-krzyzanowski-26wi | 1-R263 Col. William H. Jacobs p.746 | At about 4 o'clock | 1863-07-01T16:00 | Cemetery Hill, behind the stone fence |
| POS-A-1C0-021 | us-1c | 1-R029 Maj. Gen. Abner Doubleday p.250 | About 4 p. m. | 1863-07-01T16:00 | the line west of the seminary |
| POS-A-1D4-004 | us-1c-3d | 1-R055 Brig. Gen. Thomas A. Eowley p.313 | nearly 4 o'clock in the afternoon | 1863-07-01T16:00 | the ridges west of the seminary |
| POS-A-1D4-012 | us-1c-3d-biddle | 1-R056 Col. Chapman Biddle p.315 | about 4 p. m. | 1863-07-01T16:00 | a cover on the edge of the town, immediately in front o |
| POS-A-HNT-003 | us-11c | 1-R028 Brig. Gen. Henry J. Hunt p.230 | About 4 p. m. | 1863-07-01T16:00 | Cemetery Hill |
| POS-A-11A-016 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.704 | At 4.10 p. m. | 1863-07-01T16:10 | Cemetery Hill, Eleventh Corps right and First Corps lef |
| POS-A-11A-017 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.704 | At 4.30 p. m. | 1863-07-01T16:30 | Cemetery Hill |
| POS-A-1D4-048 | us-1c-3d-biddle-151pa | 1-R060 Lieut. Col. (Jeorge F. MoFar p.328 | 4.30 p. m. | 1863-07-01T16:30 | about 20 paces from the seminary |
| POS-A-11B-030 | us-11c | 1-R253 Maj. G«n. Carl Schurz p.730 | after 5 o'clock | 1863-07-01T17:00 | Cemetery Hill; the stone walls enclosing the cemetery o |
| POS-A-11C-012 | us-11c-art-1nyi | 1-R265 Capt. Michael Wiedrich p.751 | about 5 p. m. | 1863-07-01T17:00 | the hill on the north side of the Baltimore turnpike |
| POS-A-11C-029 | us-11c-art-4usg | 1-R269 Lieut. Eugene A. Bancroft p.756 | at 5 p. m. | 1863-07-01T17:00 | the cemetery, south side of the village |
| POS-A-1CA-029 | us-1c-art-1pab | 1-R075 Capt. James H. Cooper p.365 | At about 5 p. m. | 1863-07-01T17:00 | through Gettysburg to Cemetery Hill |
| POS-A-1D3-077 | us-1c-2d-baxter | 1-R052 Brig. Gen. Henry Baxter p.308 | About 9 a. m. | 1863-07-03T09:00 | the right and rear of Cemetery Hill |
| POS-A-1D3-066 | us-1c-2d-paul-107pa | 1-R051 Capt. Emanuel D. Eoath p.305 | 1.30 p. m. | 1863-07-03T13:30 | the rear of Cemetery Hill |

### Group 16 (1863-07-01; 3 claims): About 1 p. m. the regiment and the 151st PA moved by the left flank into the Get

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D4-021 | us-1c-3d-biddle-80ny | 1-R057 Col. C!ol. Theodore B. Gates p.317 | About 1 p. m. | 1863-07-01T13:00 | the Gettysburg road |
| POS-A-1D4-022 | us-1c-3d-biddle-80ny | 1-R057 Col. C!ol. Theodore B. Gates p.320 | About 2 p. m. | 1863-07-01T14:00 | the Hagerstown road, faced north |
| POS-A-1D4-047 | us-1c-3d-biddle-151pa | 1-R060 Lieut. Col. (Jeorge F. MoFar p.327 | About 2 p. m. | 1863-07-01T14:00 | the south end of the seminary grove |

### Group 17 (1863-07-02; 15 claims): July 2 until about 4 p. m. skirmishing; then the 75th placed at the stone wall s

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-11A-034 | us-11c-1d-ames-75oh | 1-R246 Col. Andrew L. Harris p.715 | about 4 p. m.; about dusk | 1863-07-02T16:00 | the stone wall south of the hill |
| POS-A-11B-053 | us-11c-3d-krzyzanowski-119ny | 1-R260 Maj. Benjamin A. Willis p.743 | About 4 p. m.; about 9 p. m. | 1863-07-02T16:00 | the cemetery position; the battery on East Cemetery Hil |
| POS-A-11B-033 | us-11c-3d-schimmelfennig | 1-R253 Maj. G«n. Carl Schurz p.731 | Between 6 and 7 p. m. | 1863-07-02T18:00 | a strip of woods on the right of the First Division (Cu |
| POS-A-11A-051 | us-11c-1d-gilsa-41ny | 1-R245 Lieut. Col. Detleo von Einsi p.714 | 6.30 p. m. | 1863-07-02T18:30 | the line half a mile north of the batteries |
| POS-A-11A-019 | us-11c-1d | 1-R243 Maj. Gen. OUver O. Howard p.705 | between 7 and 8 p. m. | 1863-07-02T19:00 | along the front of Ames to the town of Gettysburg (East |
| POS-A-11A-039 | us-11c-1d-ames-17ct | 1-R247 Maj. Allen G. Brady p.718 | 7 p. m. | 1863-07-02T19:00 | the extreme right, behind a stone wall on each side of  |
| POS-A-11A-044 | us-11c-1d-ames-25oh | 1-R248 Lieut. Israel White p.719 | About 7 p. m. | 1863-07-02T19:00 | the line on the hill (Second Brigade) |
| POS-A-11A-047 | us-11c-1d-ames-107oh | 1-R249 Capt. John M. Lutz p.720 | At about 7 p. m. | 1863-07-02T19:00 | a stone wall in front of a battery |
| POS-A-11C-009 | us-11c-art | 1-R264 Maj. Thomas W. Osbom p.749 | between 7 and 8 o'clock in the evening | 1863-07-02T19:00 | the hill and Wiedrich's battery |
| POS-A-11B-034 | us-11c-3d-krzyzanowski | 1-R253 Maj. G«n. Carl Schurz p.731 | between 8 and 9 p. m. | 1863-07-02T20:00 | the eminence immediately east of the cemetery (Wiedrich |
| POS-A-11B-049 | us-11c-3d-krzyzanowski-58ny | 1-R259 Capt. Emil Koenig p.740 | About 8 p. m. | 1863-07-02T20:00 | to the right toward Wiedrich's battery |
| POS-A-11C-013 | us-11c-art-1nyi | 1-R265 Capt. Michael Wiedrich p.752 | About 8 p. m. | 1863-07-02T20:00 | the battery on the hill east of the cemetery |
| POS-A-11B-009 | us-11c-2d-coster | 1-R250 Brig. Gen. Adolph von Steinw p.722 | At about 9 p. m. | 1863-07-02T21:00 | the northeast end of Cemetery Hill and Wiedrich's batte |
| POS-A-EXT-010 | us-11c-2d-coster-27pa | 1-R250 Brig. Gen. Adolph von Steinw p.722 | At about 9 p. m. | 1863-07-02T21:00 | the northeast end of Cemetery Hill (Wiedrich's battery) |
| POS-A-11B-019 | us-11c-2d-smith-136ny | 1-R252 Col. James Wood p.726 | On the evening of the 2d |  | farther to the right (East Cemetery Hill) |

### Group 18 (1863-07-02; 5 claims): About 10 a. m. July 2 relieved by General Webb's brigade of the Second Corps, mo

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D3-074 | us-1c-2d-baxter | 1-R052 Brig. Gen. Henry Baxter p.308 | about 10 o'clock on the morning of the 2 | 1863-07-02T10:00 | the Emmitsburg road position; then a short distance to  |
| POS-A-1D3-020 | us-1c-2d-paul | 1-R044 Col. C!ol. Eichard Coulter p.293-294 (range) | about noon next day (July 2) | 1863-07-02T12:00 | the left of the Eleventh Corps |
| POS-A-1C0-036 | us-1c-2d | 1-R030 Maj. (Jen. John Nevrton p.261 | early on July 2 |  | Cemetery Hill, left of the Eleventh Corps, facing left |
| POS-A-1D3-007 | us-1c-2d | 1-R043 Brig. Gen. John C. Eobinson p.290 | afternoon of the next day (July 2) |  | support of the Eleventh Corps |
| POS-A-1D3-058 | us-1c-2d-baxter-11pa | 1-R049 Capt. Jacob J. Bierer p.302 | early on July 2 |  | Cemetery Hill |

### Group 19 (1863-07-02; 8 claims): About 6 o'clock ordered to the left to assist a hard-pressed division of the Thi

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D3-076 | us-1c-2d-baxter | 1-R052 Brig. Gen. Henry Baxter p.308 | about 6 o'clock (then at dark) | 1863-07-02T18:00 | to the left (Third Corps front) |
| POS-A-1D3-064 | us-1c-2d-paul-107pa | 1-R051 Capt. Emanuel D. Eoath p.305 | about 6.30 p. m. | 1863-07-02T18:30 | toward the Round Top |
| POS-A-1D3-021 | us-1c-2d-paul | 1-R044 Col. C!ol. Eichard Coulter p.293-294 (range) | About 7 o'clock in the evening | 1863-07-02T19:00 | farther to the left (Third Corps front) |
| POS-A-1D3-059 | us-1c-2d-baxter-11pa | 1-R049 Capt. Jacob J. Bierer p.302 | until 8 p. m. | 1863-07-02T20:00 | Cemetery Hill, then the left |
| POS-A-1C0-038 | us-1c | 1-R030 Maj. (Jen. John Nevrton p.261 | Near sundown |  | a gap on the left of the Second Corps |
| POS-A-1D3-030 | us-1c-2d-paul-16me | 1-R045 Lieut. Col. Augustus B. Farn p.296 | nearly dark |  | Cemetery Hill |
| POS-A-1D3-040 | us-1c-2d-paul-13ma | 1-R046 Lieut. Col. N. Walter Batche p.298 | nearly dark |  | Cemetery Hill |
| POS-A-1D3-052 | us-1c-2d-paul-104ny | 1-R048 Col. C:!ol. Gilbert G. Prey p.301 | about sundown |  | Cemetery Hill, then the left |

### Group 20 (1863-07-02 to 1863-07-03; 2 claims): Division held the hill on the right of the cemetery through July 2 and 3, attack

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D1-006 | us-1c-1d | 1-R032 Brig. Gen. James S. Wadswort p.266 | on the 2d and 3d |  | a hill on the right of the cemetery |
| POS-A-1D1-014 | us-1c-1d-meredith-24mi | 1-R033 Col. Henry A. Morrow p.270 | during the battles of July 3 and 4 |  | Gulp's Hill (Culp's Hill) |

### Group 21 (1863-07-02; 5 claims): Pleasonton to Gregg 1.45 (p. m.) July 2: detail a regiment to picket the left of

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV1-042 | us-cav-1d | 3-D1021  p.490 | 1.45 (p. m.) | 1863-07-02T13:45 | the left of the line |
| POS-A-CV2-048 | us-cav-art | 1-R374 Lieut. John H. Calef p.1032 | about 4 p. m. | 1863-07-02T16:00 | Taneytown |
| POS-A-CV1-013 | us-cav-1d | 1-R337 Brig. Gen. John Buford p.928 | July 2 (printed "-TnW 9") |  | the left of the army (Gettysburg) |
| POS-A-CV1-014 | us-cav-1d | 1-R337 Brig. Gen. John Buford p.928 | (afternoon-night, July 2) |  | Taneytown |
| POS-A-CV1-027 | us-cav-1d-devin | 1-R339 Col. Thomas C. Devin p.939 | (July 2) |  | Taneytown |

### Group 22 (1863-07-02; 5 claims): July 2 Kilpatrick received orders to move quickly toward Gettysburg, proceeded a

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-023 | us-cav-3d | 1-R359 Brig. Gen. Judson Kilpatrick p.992 | at 2 p. m. | 1863-07-02T14:00 | the battle-field at Gettysburg, across country from the |
| POS-A-CV2-022 | us-cav-3d-farnsworth-1wv | 1-R367 Maj. Charles E. Capehart p.1018 | July 1-2 |  | Abbottstown, Oxford, Hunterstown |
| POS-A-CV2-024 | us-cav-3d-farnsworth | 1-R362 Col. Nathaniel P. Richmond p.1005 | July 1 and 2 |  | (not engaged) |
| POS-A-CV2-036 | us-cav-3d-farnsworth-18pa | 1-R364 Maj. WiUiam B. Darlington p.1011 | On the evening of July 2 |  | Hunterstown |
| POS-A-CV2-038 | us-cav-3d-farnsworth-1vt | 1-R365 Lieut. Col. Addison W. Prest p.1012 | July 2 |  | Hunterstown, front and right of Elder's battery |

### Group 23 (1863-07-02 to 1863-07-03; 4 claims): Ordered to the Gettysburg-Abbottstown road to prevent the enemy turning the flan

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-025 | us-cav-3d | 1-R359 Brig. Gen. Judson Kilpatrick p.992 | at sundown |  | near Hunterstown, the road from Gettysburg to Abbottsto |
| POS-A-CV2-026 | us-cav-3d | 1-R336 Maj. Gen. Alfred Pleasonton p.914-915 (range) | Late in the afternoon |  | near Hunterstown |
| POS-A-CV2-041 | us-cav-3d-custer-1mi | 1-R361 Brig. Gen. George A. Custer p.998 | On July 2 |  | Hunterstown |
| POS-A-CV2-042 | us-cav-3d-custer-6mi | 1-R361 Brig. Gen. George A. Custer p.999 | July 3 (printed) |  | Hunterstown |

### Group 24 (1863-07-02; 4 claims): Pleasonton's dispatch 10.40 July 2: Gregg is to hold his force well in hand in t

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-003 | us-cav-2d | 3-D1019  p.489 | 10.40 (a. m.), July 2 | 1863-07-02T10:40 | 3 miles from Gettysburg on the Hanover road |
| POS-A-CV2-001 | us-cav-2d-gregg | 1-R355 Col. Ck)l. J. Irvin Gregg p.975-976 (range) | about 11 a. m. on July 2 | 1863-07-02T11:00 | the pike leading from Gettysburg to Hanover, about 2 mi |
| POS-A-CV2-002 | us-cav-2d-mcintosh | 1-R344 Brig. Gen. David McM. Gregg p.956 | July 2, about noon | 1863-07-02T12:00 | the extreme right, at the intersection of the Gettysbur |
| POS-A-CV2-004 | us-cav-2d | 1-R336 Maj. Gen. Alfred Pleasonton p.916 | about noon of July 2 | 1863-07-02T12:00 | the intersection of the Gettysburg and Hanover turnpike |

### Group 25 (1863-07-02; 4 claims): At about 2 p. m. (printed; other reports say about 4) the rebel batteries opened

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-11C-018 | us-11c-art-13ny | 1-R266 Lieut. William Wheeler p.753 | At about 2 p. m. | 1863-07-02T14:00 | Cemetery Hill |
| POS-A-1CA-016 | us-1c-art | 1-R071 Col. Charles S. Wainwright p.358 | about 4 p. m. | 1863-07-02T16:00 | Cemetery Hill batteries; enemy in a wheat-field at abou |
| POS-A-1CA-026 | us-1c-art-1nyl | 1-R074 Lieut. George Breck p.363 | about 4 p. m. | 1863-07-02T16:00 | the front and right of the cemetery gate |
| POS-A-1CA-022 | us-1c-art-2me | 1-R072 Capt. James A. HaU p.360 | at 4.15 p. m. | 1863-07-02T16:15 | the left of the cemetery |

### Group 26 (1863-07-03; 2 claims): About 3 p. m. July 3 ordered with the 56th PA and 7th Indiana to support the lef

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D2-031 | us-1c-1d-cutler-95ny | 1-R041 Maj. Edward Pye p.288 | about 3 p. m. | 1863-07-03T15:00 | near the cemetery |
| POS-A-1D2-019 | us-1c-1d-cutler-7in | 1-R038 Col. Ira G. Grover p.285 | until the evening of the 3d instant |  | Cemetery Hill |

### Group 27 (1863-07-03; 2 claims): Ordered to re-enforce General Greene on the right; engaged a regiment (supposed 

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D2-027 | us-1c-1d-cutler-84ny | 1-R040 Col. Edward B. Fowler p.287 | until near dark (printed "On the 3d inst |  | on the right, with General Greene's brigade |
| POS-A-1D2-028 | us-1c-1d-cutler-84ny | 1-R040 Col. Edward B. Fowler p.287 | On the morning of the 3d instant |  | the right, with General Geary |

### Group 28 (1863-07-03; 5 claims): At 10 a. m. (printed) the brigade was ordered to the extreme right wing of the e

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-034 | us-cav-3d-farnsworth-1wv | 1-R367 Maj. Charles E. Capehart p.1018 | At 10 a. m.; 3 p. m. | 1863-07-03T10:00 | the extreme right wing of the enemy |
| POS-A-CV2-031 | us-cav-3d-farnsworth | 1-R359 Brig. Gen. Judson Kilpatrick p.993 | At 1 p. m. | 1863-07-03T13:00 | the rear and right of the enemy's position (south of th |
| POS-A-CV2-033 | us-cav-3d-farnsworth | 1-R359 Brig. Gen. Judson Kilpatrick p.993 | At 5.30 p. m. | 1863-07-03T17:30 | the woods and stone wall on the Union left (Farnsworth' |
| POS-A-CV2-029 | us-cav-3d-custer | 1-R359 Brig. Gen. Judson Kilpatrick p.993 | (July 3) |  | the right flank with Gregg |
| POS-A-CV2-030 | us-cav-3d-custer | 1-R344 Brig. Gen. David McM. Gregg p.956 | (about noon, July 3) |  | the right flank (Gregg's line) |

### Group 29 (1863-07-03; 4 claims): On the morning of July 3 about 7 o'clock the 5th New York was ordered to move an

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-035 | us-cav-3d-farnsworth-5ny | 1-R363 Maj. John Hammond p.1009 | At about 7 o'clock | 1863-07-03T07:00 | toward the left of the line of battle |
| POS-A-CV2-028 | us-cav-3d | 1-R359 Brig. Gen. Judson Kilpatrick p.992 | At 8 a. m. | 1863-07-03T08:00 | the left of our line, attacking the enemy's right and r |
| POS-A-CV1-030 | us-cav-1d-merritt | 1-R340 Brig. Gen. Wesley Merritt p.943 | about 12 m. | 1863-07-03T12:00 | from Emmitsburg toward the enemy's right and rear |
| POS-A-CV2-032 | us-cav-1d-merritt | 1-R359 Brig. Gen. Judson Kilpatrick p.993 | At 3 p. m. | 1863-07-03T15:00 | on Farnsworth's left |

### Group 30 (1863-07-03; 2 claims): Fifth Michigan July 3 at 10 a. m. moved out and met the enemy on the right at Ge

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-CV2-043 | us-cav-3d-custer-5mi | 1-R361 Brig. Gen. George A. Custer p.998 | At 10 a. m. | 1863-07-03T10:00 | the right at Gettysburg |
| POS-A-CV2-011 | us-cav-2d | 1-R336 Maj. Gen. Alfred Pleasonton p.916 | About noon | 1863-07-03T12:00 | Gregg's position on the right |

### Group 31 (1863-07-03; 17 claims): Between 12 m. and 1 p. m. July 3 the regiment stood under a very heavy artillery

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-11A-052 | us-11c-1d-gilsa-41ny | 1-R245 Lieut. Col. Detleo von Einsi p.714 | between 12 m. and 1 p. m. | 1863-07-03T12:00 | the same position |
| POS-A-11B-042 | us-11c-3d-schimmelfennig-45ny | 1-R256 Lieut. Col. Adolphus Dobke p.736 | from 12 m. to 4 p. m. | 1863-07-03T12:00 | Cemetery Hill |
| POS-A-1D4-029 | us-1c-3d-biddle-80ny | 1-R057 Col. C!ol. Theodore B. Gates p.318 | 12.30 p. m. | 1863-07-03T12:30 | the lowest ridge in the front line |
| POS-A-CV2-050 | us-cav-art | 1-R369 Capt. Jabez J. Daniels p.1022 | 12.30 p. m. | 1863-07-03T12:30 | the hill and west of the town |
| POS-A-11A-022 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.706 | At about 1 p. m. | 1863-07-03T13:00 | Cemetery Hill |
| POS-A-11C-014 | us-11c-art-1nyi | 1-R265 Capt. Michael Wiedrich p.752 | about 1 p. m. | 1863-07-03T13:00 | the hill east of the cemetery |
| POS-A-11C-019 | us-11c-art-13ny | 1-R266 Lieut. William Wheeler p.753 | from 1 to 3 p. m. | 1863-07-03T13:00 | behind Cemetery Hill |
| POS-A-1C0-044 | us-1c | 1-R030 Maj. (Jen. John Nevrton p.262 | Near 1 p. m. | 1863-07-03T13:00 | the position of the army |
| POS-A-1D4-030 | us-1c-3d-biddle-80ny | 1-R057 Col. C!ol. Theodore B. Gates p.318 | At 1 o'clock | 1863-07-03T13:00 | the lowest ridge in the front line |
| POS-A-HNT-004 | us-1c-art | 1-R028 Brig. Gen. Henry J. Hunt p.239 | at about 1 p. m. | 1863-07-03T13:00 | the west front of the Union line |
| POS-A-1C0-031 | us-1c-3d | 1-R029 Maj. Gen. Abner Doubleday p.258 | About 2 p. m. | 1863-07-03T14:00 | the front line of the Third Division |
| POS-A-1CA-027 | us-1c-art-1nyl | 1-R074 Lieut. George Breck p.364 | At about 2 p. m. | 1863-07-03T14:00 | the cemetery gate position |
| POS-A-1D4-041 | us-1c-3d-biddle-142pa | 1-R059 Lieut. Col. Alfred B. McCalm p.325 | About 2 p. m. | 1863-07-03T14:00 | a rude breastwork of rails on the right of the Second B |
| POS-A-1D5-056 | us-1c-3d-stannard | 1-R069 Brig. Gen. George J. Stannar p.349 | At about 2 p. m. | 1863-07-03T14:00 | the brigade position in front of the main line |
| POS-A-11A-023 | us-11c | 1-R243 Maj. Gen. OUver O. Howard p.697 | July 3, 2.15 p. m. | 1863-07-03T14:15 | Cemetery Hill |
| POS-A-11B-010 | us-11c-2d | 1-R250 Brig. Gen. Adolph von Steinw p.722 | At 2.30 o'clock | 1863-07-03T14:30 | Cemetery Hill |
| POS-A-11C-010 | us-11c-art | 1-R264 Maj. Thomas W. Osbom p.750 | About 3 p. m. | 1863-07-03T15:00 | Cemetery Hill |

### Group 32 (1863-07-03; 3 claims): About 1 p. m. July 3 ordered to the right and front of Cemetery Hill in support 

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-1D3-078 | us-1c-2d-baxter | 1-R052 Brig. Gen. Henry Baxter p.308 | About 1 p. m. | 1863-07-03T13:00 | the right and front of Cemetery Hill |
| POS-A-1D3-023 | us-1c-2d-paul | 1-R044 Col. C!ol. Eichard Coulter p.293-294 (range) | About 2 p. m. of the 3d | 1863-07-03T14:00 | the right of the cemetery |
| POS-A-1D3-024 | us-1c-2d-paul | 1-R044 Col. C!ol. Eichard Coulter p.293-294 (range) | About 3 p. m. | 1863-07-03T15:00 | right of the Third Division, Second Corps |

### Group 33 (1863-07-04; 2 claims): Early July 4 Huey moved forward and arrived at Emmitsburg at 12 m., where he met

| claim | unit | report, author, page | printed time | t_iso | place |
|---|---|---|---|---|---|
| POS-A-EXT-024 | us-cav-2d-huey | 1-R352 Col. Pennock Huey p.970 | at 12 m. (July 4) | 1863-07-04T12:00 | Emmitsburg |
| POS-A-EXT-025 | us-cav-3d | 1-R359 Brig. Gen. Judson Kilpatrick p.993 | at 3 p. m. (July 4) | 1863-07-04T15:00 | Emmitsburg |

### Conflicts internal to one report or one commander (also listed above where they have a claim pair)

- Howard (R243): Reynolds killed "11.15 a. m." (dispatch of 5 p.m. July 1) vs "about 11.30 a. m." (August 31 report); also the 2.15 p.m. note of July 3 implies the cannonade began near 1.15 p.m. vs "about 1 p. m.".
- Gates (R057): cannonade "12.30 p. m." (July 4 report) vs "1 o'clock" (January 1864 report); first report: moved "about 1 p. m." into the Gettysburg road; third report: enemy enfilade "about 2 p. m." before the move.
- Morrow (R033): Culp's Hill held "for the two succeeding days" vs "July 3 and 4" in the same report.
- Custer (R361): Hunterstown printed under July 1 (Battery M), July 2 (1st, 7th MI) and July 3 (6th MI).
- Buford (R337): entered Gettysburg 11 a.m. (June 30 dispatch) vs "in the afternoon" (August 27 report).
- Kilpatrick (R359) vs Gregg (R344) on who ordered Custer's brigade to the right on July 3; Richmond (R362) vs Darlington/Preston (R364, R365) on whether the First Brigade fought at Hunterstown on July 2.
- Doubleday (R029): First Corps strength "about 8,300" vs "about 8,200" in the same report; Stannard's cannonade hour printed "2 p.m." in R069 and "3 p.m." in the quotation inside R029 (OCR digit).
- Baxter (R052) puts the relief by Webb at about 10 a.m. July 2; Coulter noon; Roath forenoon; Bierer early; Robinson "afternoon" (group on relief hour above).

## 6. Differences from the existing ledger data (reported, not applied)

Compared with `history/arrivals.json` gates (Q04) and `app/data/placement.json`. No gate, default or tier is changed here; the following are differences for the owner/the later transcription step.

- us-1c-3d-stannard: gate 1863-07-02T18:00 ("earliest documented sighting", gap noted in the ledger) vs the OR: on the field the evening of July 1 (Stannard R069, Randall R070 about 5 p.m., Doubleday R029 about twilight, Itinerary R007). The OR also contradicts itself on the July 1 night position (Cemetery Hill rear vs the Third Corps line).
- us-cav-3d: gate 1863-07-02T16:30 at Hunterstown vs Kilpatrick "reached the battle-field at 2 p.m." across country (R359), and the Hunterstown fight "at sundown" (R359) or "late in the afternoon" (R336).
- us-cav-2d: gate 1863-07-02T12:00 vs J. I. Gregg's Third Brigade in position on the Hanover pike about 11 a.m. (R355) and Pleasonton's 10.40 dispatch placing the division 3 miles out on the Hanover road (D1019).
- us-cav-1d: gate 1863-06-30T11:00 agrees with Buford's own June 30 dispatch (11 a.m.) but not with his August report or Pleasonton ("afternoon").
- us-1c / us-1c-1d gates 10:00 / 10:20: Wadsworth about 10 a.m. on the Cashtown road; Morrow about 9; Buford 10.10 "within 3 miles"; Cook 10.30; Hofmann 11. us-1c-2d gate 11:00 agrees with Baxter/Coulter; Prey, Wheelock, MacThomson give 1 p.m.; us-11c gate 12:30 vs 45th NY 11 a.m., Schurz 11.30, 119th NY about 12.
- placement PO-02 (Baxter and Paul to Oak Ridge 13:00-13:30): the OR puts Baxter in position at about 11 a.m.-12.30 p.m. on the right of the First Division (Baxter, Coulter) and Robinson's line "from about noon"; "Oak Ridge" is not named in any OR report read.
- placement PO-10 / AC-02 (13th Massachusetts digging a rifle pit on Cemetery Ridge south of the Bryan farm on the evening of July 1): not in the OR. Batchelder (R046): July 2 supported batteries on Cemetery Hill, July 3 afternoon built earthworks at the edge of the woods at the Second Corps point of attack; Coulter (R044): the First Brigade built breastworks on the left of the Eleventh Corps the evening of July 1.
- placement PO-08 (7th Indiana joins the corps right on Culp's Hill about 16:00): Grover (R038) "on the afternoon of July 1"; Cutler (R037): joined on Cemetery Hill after the brigade, no hour.
- placement PO-13 (Stannard on the Cemetery Ridge line about 18:00 July 2): Stannard: in the rear of the left of Cemetery Hill on the morning of July 2; ordered up "just before dark" to the broken line; Randall about 2 p.m. orders to support a battery.
- placement PO-42/PO-43 (2nd Division at Brinkerhoff Ridge 15:00 July 2; Baltimore Pike 1 mile east of Rock Creek after 22:00): the OR has the division at the Hanover pike / Hanover-road intersection on July 2 (not Brinkerhoff's Ridge by name); the Baltimore turnpike position is July 3 morning (D. Gregg, Pleasonton D1044).
- placement AC-12 (3rd Division attacks 15:00 July 3): Capehart found the enemy at 3 p.m.; the charge was at about 5 p.m. (Preston, Darlington) or 5.30 p.m. (Kilpatrick).
- Positions consistent with the ledger: PO-34 (Steinwehr on Cemetery Hill about 14:00; Steinwehr "about 2 o'clock"); PO-35 (Ames defends East Cemetery Hill about 19:30, within the OR 7-9 p.m. range); AP-01 (I Corps head on the Emmitsburg Road, at least for the 1st Division and the 2nd Wisconsin; the 3rd Division used the Hagerstown/Millerstown roads); AP-05 (Merritt on the Emmitsburg Road about 15:00; OR: marched about noon from Emmitsburg, engaged about four hours).

## 7. OCR problems met

- Digit confusion 2/3/5/6/8 in dates and clock times: "3d" for "2d" (Biddle R056, Whittier R073, Gates, Fowler R040, Cutler "3d and 3d"), "13 m." for "12 m." (Wister, Daniels), "1.30 a. m." (Ledig 75th PA, impossible), "G a. m."/"C a. m." (Pleasonton D1044, Howard D0959), "0 a. m."; Custer's July 1/2/3 Hunterstown dates; "July 9" for "July 2" (Buford). Each is flagged `ocr_uncertain` and not corrected.
- Names: "Gulp's Hill" (Culp's), "Himterstown", "Hunterstowu", "Niaeteenth Indiana", "Wied rich", "Cautador/Cantador", "wMcli", "Eighty-tMrd", "Eighty -eighth", "Miller stown"; quotes keep the OCR text and a nearby clean phrase is used where possible.
- Running heads inside sentences and footnotes between page halves ("Cutler R037 p.281-283", "Hunter... R361"); pages near lost heads carry ranges (interpolated).
- Tables (strength and casualties) are unreadable: strength notes use narrative figures only (Morrow's 24th Michigan table "49ft" is not used).
- OCR dates of enclosures in Howard R243 ("Near Berlin, July 18, 18G3", "Brigadier-General Williams"): the Howard reports are a composite record in the index; claims name the dated sub-report in the note where it matters.

## 8. Files

- `docs/battle-theatre/history/positions/positions_A.jsonl` (claims)
- `docs/battle-theatre/history/positions/POSITIONS_A_SUMMARY.md` (this file)
- `tools/bt/positions_A_build.py` (rebuilds the ledger from the draft batches in `docs/battle-theatre/history/positions/draft_A/`, re-verifying every quote against the OR text; the rebuild reproduces the ledger byte for byte)
