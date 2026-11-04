# Scope B, III Corps: notes for the positions summary

Built with `python -I tools/bt/positions_claims.py B III` from `tools/bt/positions_data_B_III_a.py` .. `_f.py` into `docs/battle-theatre/history/positions/partial_B_III.jsonl`. Every quote, time phrase, place phrase and road phrase is located by code in the named OR record. Nothing here changes a default, gate or tier elsewhere. All conflicts below are carried unresolved (both values kept, linked through `conflicts_with`).

Module map: `_a` corps (us-3c) and Part 3 dispatches; `_b` First Division level, Ward's brigade, its regiments and the two sharpshooter regiments; `_c` Graham's and de Trobriand's brigades and regiments; `_d` Second Division, Carr's brigade and regiments; `_e` Brewster's and Burling's brigades and regiments; `_f` artillery brigade and batteries.

## 1. Counts (641 claims: 623 documented, 5 inferred, 13 open gap)

| Level | claims | documented | inferred | open gap |
|---|---|---|---|---|
| Corps (us-3c) | 82 | 80 | 1 | 1 |
| First Division (us-3c-1d, incl. brigades and regiments) | 252 | 249 | 1 | 2 |
| Second Division (us-3c-2d, incl. brigades and regiments) | 221 | 210 | 3 | 8 |
| Artillery brigade and 5 batteries | 86 | 84 | 0 | 2 |

460 claims carry a verified quote; 168 more are located by code but the quote is withheld because an earlier claim already quotes that passage (one quote per passage); the 13 gap records carry searches instead. 151 claims cite an interpolated page (range given). 52 claims are marked `ocr_uncertain`. 116 claims are linked to at least one conflicting claim. Kinds: movement 201, position 180, night_position 69, march 58, engagement 50, arrival_road 37, departure 31, strength_note 15 (no kind was left empty).

Direct counts per unit (claims / documented-inferred-gap / earliest .. latest date or time):

| Unit | n | d-i-g | earliest .. latest |
|---|---|---|---|
| us-3c | 82 | 80-1-1 | 1863-06-28 .. 1863-07-07T10:00 |
| us-3c-1d (Birney) | 22 | 21-1-0 | 06-28 .. 07-04 |
| us-3c-1d-graham | 18 | 17-0-1 | 07-01 .. 07-03 |
| 57th Pa | 7 | 7-0-0 | 07-01T14:00 .. 07-04 |
| 63rd Pa | 6 | 6-0-0 | 07-01 .. 07-03T10:00 |
| 68th Pa | 4 | 4-0-0 | 07-02 |
| 105th Pa | 12 | 12-0-0 | 06-30 .. 07-03T21:00 |
| 114th Pa | 9 | 9-0-0 | 07-01T14:00 .. 07-06T04:00 |
| 141st Pa | 3 | 3-0-0 | 07-02 .. 07-05 |
| us-3c-1d-ward | 11 | 10-0-1 | 07-01 .. 07-02 |
| 20th Ind | 7 | 7-0-0 | 07-02 .. 07-05 |
| 3rd Me | 16 | 16-0-0 | 07-02 .. 07-05T12:00 |
| 4th Me | 7 | 7-0-0 | 07-01 .. 07-05 |
| 86th NY | 11 | 11-0-0 | 07-02 .. 07-06T04:00 |
| 124th NY | 3 | 3-0-0 | 07-02 (to about 15:30-16:00) |
| 99th Pa | 11 | 11-0-0 | 07-01 .. 07-05 |
| 1st US Sharpshooters | 25 | 25-0-0 | 07-02 .. 07-04 |
| 2nd US Sharpshooters | 15 | 15-0-0 | 07-02 .. 07-04T19:30 |
| us-3c-1d-trobriand | 13 | 13-0-0 | 07-01 .. 07-03 |
| 17th Me | 11 | 11-0-0 | 07-02 .. 07-05 |
| 3rd Mich | 13 | 13-0-0 | 07-02 .. 07-05 |
| 5th Mich | 8 | 8-0-0 | 07-02 .. 07-03T15:00 |
| 40th NY | 12 | 12-0-0 | 07-02 .. 07-05 |
| 110th Pa | 8 | 8-0-0 | 07-02 .. 07-03T20:00 |
| us-3c-2d (Humphreys) | 27 | 26-0-1 | 06-28 .. 07-07T03:00 |
| us-3c-2d-carr | 21 | 21-0-0 | 06-28T22:30 .. 07-07T13:15 |
| 1st Mass | 13 | 13-0-0 | 06-28T22:00 .. 07-07T03:00 |
| 11th Mass | 10 | 10-0-0 | 06-28 .. 07-05 |
| 16th Mass | 13 | 13-0-0 | 06-28 .. 07-07T03:00 |
| 12th NH | 2 | 1-0-1 | 07-02 (organization list only) |
| 11th NJ | 12 | 12-0-0 | 06-28T18:00 .. 07-07 |
| 26th Pa | 5 | 5-0-0 | 06-30T14:00 .. 07-07 |
| 84th Pa (train guard) | 6 | 6-0-0 | 06-30 .. 07-06 |
| us-3c-2d-brewster | 16 | 15-0-1 | 06-28 .. 07-07 |
| 70th NY | 10 | 10-0-0 | 06-29 .. 07-07 |
| 71st NY | 4 | 4-0-0 | 07-02 .. 07-03 |
| 72nd NY | 13 | 13-0-0 | 06-28 .. 07-07 |
| 73rd NY | 7 | 6-0-1 | 07-02 (to 17:30) |
| 74th NY | 2 | 1-0-1 | 07-02 |
| 120th NY | 4 | 4-0-0 | 07-02 .. 07-07 |
| us-3c-2d-burling | 23 | 19-3-1 | 06-28 .. 07-07T03:00 |
| 2nd NH | 6 | 6-0-0 | 07-02 (to 18:30) |
| 5th NJ | 10 | 10-0-0 | 07-01 .. 07-02T17:00 |
| 6th NJ | 6 | 6-0-0 | 07-02 .. 07-03T14:00 |
| 7th NJ | 5 | 5-0-0 | 07-02 .. 07-03T17:00 |
| 8th NJ | 3 | 2-0-1 | 07-02 |
| 115th Pa | 3 | 2-0-1 | 07-02 |
| us-3c-art | 13 | 12-0-1 | 06-28 .. 07-02T17:00 |
| 1st NJ B (Clark) | 15 | 15-0-0 | 06-28 .. 07-03 |
| 1st NY D (Winslow) | 13 | 13-0-0 | 07-01 .. 07-03 |
| 4th NY (Smith) | 14 | 14-0-0 | 07-01 .. 07-02T14:30 |
| 1st RI E (Randolph/Bucklyn/Freeborn) | 11 | 10-0-1 | 07-01 .. 07-02T15:00 |
| 4th US K (Seeley/James) | 20 | 20-0-0 | 07-01 .. 07-03 |

## 2. Coverage verdicts (units with their own claim set)

Verdict scale: full = hours, place and road of approach documented from June 30/July 1 to July 5 or later; partial = positions and hours documented but a named element missing (road of approach, a day, the commander's own report); none = no claim.

| Unit | verdict | road of approach documented | position on the field documented | why |
|---|---|---|---|---|
| Corps (Sickles) | full for the marches and July 1-7 dispatches; no report by Sickles | yes: Taneytown-Bridgeport-Emmitsburg-Gettysburg; "Emmitsburg road" (Hancock R076 p369); two parallel roads (D0973) | yes, July 2 (Emmitsburg road, Peach Orchard) | Sickles filed no report in vol. 27 (see section 6); evidence is Birney, Humphreys, Randolph, Hunt, Hancock, Meade, Gibbon, Part 3 |
| 1st Division (Birney) | partial | road not named by Birney; "Emmitsburg road" only through the 99th Pa (R148) and Hancock for the corps | yes (7 a. m. line, Peach Orchard, Sugar Loaf) | arrival hour conflicts (5.30 p. m. to about 7 p. m.), no named road in the division report |
| Graham | partial | no: none of the six regimental reports names the road (gap claim) | yes, with hours | Graham wounded and captured, no report; position in Peach Orchard / brick house / Emmitsburg road fully documented from Birney, Tippin, Craig, Bowen, Nelson, Madill |
| Ward | partial | only the 99th Pa names it (Emmitsburg road) (gap claim) | yes: rocky eminence near Round Top, stone wall, wheat-field, with hours | Ward's own report has times but no road |
| de Trobriand | full | yes: "pike leading to Gettysburg" (Egan R156, Merrill R153), Taneytown road (Pierce R154) | yes (apex, wheat-field, Peach Orchard skirmish line) | all five regiments report; start hour differs (2 a. m. order, 3, 4.30, daybreak) |
| 2nd Division (Humphreys) | full | yes: Waynesborough pike, western road nearly parallel to the main road, Marsh Run crossing, Black Horse Tavern road, counter-march, main road to Gettysburg | yes (Emmitsburg road line, log house, Round Top ridge) | only the clock time of the counter-march is missing (gap claim) |
| Carr | full | yes (left-hand road past Marsh Creek, Black Horse Tavern road, main road) | yes (left center; old building in orchard on left of line) | report plus six regiments; 84th Pa was with the train, 12th NH no report |
| Brewster (Excelsior) | partial | no (gap claim); division route from Humphreys | yes (rear of Carr, 71st/72nd left, 74th right, 73rd log house, then Graham) | hours differ for the night arrival |
| Burling | partial | only via Humphreys (main road from Emmitsburg) (gap claim) | yes (massed, then split among Graham, Ward, picket; each regiment placed) | the brigade was dispersed; 8th NJ and 115th Pa have no own report |
| Artillery brigade (Randolph) | partial | yes to Gettysburg July 1 (near the Taneytown road, R181) and on July 2 | yes for all five batteries, with hours | nothing in the OR for July 3-7 as a unit (gap claim); Randolph wounded, Clark acting chief |

Brigades with NO claim: none. Units with an open gap: us-3c (Sickles' own report), us-3c-1d-graham and -ward (road of approach), us-3c-2d (hour of the Black Horse Tavern counter-march), us-3c-2d-brewster and -burling (road of approach), us-3c-art (July 3-7), 1st RI E (July 3 onward), 8th NJ, 115th Pa, 12th NH, 73rd NY, 74th NY (no regimental report indexed). Reports searched for each gap are listed inside the gap records (`reports_searched`, `searches_tried`).

Brigade-level verdict count (six brigades + artillery brigade): full 2 (de Trobriand, Carr), partial 5 (Graham, Ward, Brewster, Burling, Artillery), none 0. Divisions: 2nd full, 1st partial. Corps: full for movements, no report by its commander.

## 3. Approach roads and hours found (these decide where units enter the map)

First Division (Birney)
- June 28: Middletown to Frederick (Sickles resumed the corps there), then Walkersville "on the road to Taneytown" (R133 p482; itinerary R007 p144 says near Woodsborough; Randolph R181 p581 says Woodville).
- June 29: Taneytown (Randolph R181; itinerary R007). Birney does not mention it.
- June 30: bivouac until 3 p. m., ordered to Emmitsburg (R133); bivouac within about 1.5 miles of Emmitsburg (R133, OCR "1^"); Sickles at Bridgeport 7.45 p. m. says the First Division and two batteries are farther toward Emmitsburg, across Middle Creek (D0936 p425), about a mile this side of Emmitsburg (D0935 p424); 105th Pa encamped about a mile east of Emmitsburg (R139 p500).
- July 1: took position beyond Emmitsburg covering the Fairfield and Gettysburg road; ordered to Gettysburg "at 2 o'clock" (R133) or 3.30 p. m. (D0974); left Emmitsburg 1.15 p. m. (105th), about 2 p. m. (57th, 114th); reached Gettysburg 5.30 p. m. (Birney), about dark (Ward), about 7 p. m. (114th), a short time after sunset by the Emmitsburg road (99th, R148 p513); bivouac south of the town / 1 mile south (114th R140, 105th R139); batteries near the Taneytown road (R181).
- De Trobriand (3rd Brigade) and Winslow's battery stayed at Emmitsburg July 1; order to rejoin at 2 a. m. (R152) or 1.30 a. m. (Burling for his own brigade); left at 3 a. m. (3rd Mich), daybreak (R152), 4.30 a. m. (17th Me); "up the pike leading to Gettysburg" (40th NY R156 p526), formed near the Taneytown road (3rd Mich R154 p523); with the division about 9 a. m. (Birney), about 10 (de Trobriand, Merrill), about 12 m. (Pierce).

Second Division (Humphreys)
- June 28: through Frederick, bivouac 7 miles out on the Woodsborough road (R158 p530); June 29 Taneytown through Woodsborough and Bruceville (R158); Carr left 5.30 a. m. (R160 p542) and arrived 4 p. m. (Baldwin R161), 6 p. m. (Tripp R162), about 5 p. m. (Donovan R163).
- June 30: left Taneytown 2 p. m. (26th Pa), 3 p. m. (1st and 11th Mass), 4.30 p. m. (Carr, R160), "morning" (72nd NY R172); Bridgeport at 6.30 p. m. (Carr); other regiments 3 to 6 miles beyond Taneytown on the road to Emmitsburg (R158 p530: "about midway between the two places").
- July 1: Emmitsburg 12 m. (Burling R174), 1.15 p. m. (Carr), about 2 p. m. (Austin), 2.30 p. m. (Baldwin); halted 1 mile out on the Waynesborough pike (R158 p530); order 3 p. m. (R158) or about 3.15 p. m. (Carr, after a two-hour halt); moved on "a road nearly parallel to the main road ... about 2 miles west of it" (R158 p531), crossed Marsh Run/Marsh Creek, took the left-hand road (R160 p543), then the Black Horse Tavern road (the road from Fairfield to Gettysburg), within 200 yards of the enemy pickets (Carr); counter-marched and came in by the main road; bivouac about 1 mile from Gettysburg east of the Emmitsburg road (R158 p531) at 1 a. m. (Humphreys, "la. m." Donovan), 1.30 (Carr), about 2 (Tripp, Bodine, Austin, Lockwood), 2.30 (Baldwin), "about midnight" (Brewster).
- Burling (3rd Brigade) and Smith's battery stayed at Emmitsburg on the Waynesborough pike / "Hagerstown road" (R158 p531, R174 p569); order 1.30 a. m., left nearly 4 a. m., joined 9 a. m. by the main Emmitsburg-Gettysburg road (R158 p531, R174 p570).

Artillery brigade: June 28 Middletown, Frederick (noon), Woodville; June 29 Taneytown (a mile north); June 30 afternoon Bridgeport; July 1 morning Emmitsburg; afternoon three batteries (Randolph's, Clark's, Seeley's) to Gettysburg, encamped on the left of the town near the Taneytown road (R181 p581). Smith's and Winslow's batteries came up on July 2 (Winslow left 3 a. m., reached the corps about 11 a. m., R183 p586-587; Smith with the 3rd Brigade at 9 a. m., R158 p531).

## 4. Conflicts between reports (all unresolved; linked in `conflicts_with`)

1. Corps, June 28 night: Woodville (R181 p581), near Woodsborough (R007 p144, date OCR "June 38"), Walkersville (R133 p482, R169 p558~, R172 p565), "7 miles from Frederick on the Woodsborough road" (R158 p530).
2. June 30, leaving Taneytown: 2 p. m. (Bodine R167 p556), 3 p. m. (Baldwin R161 p547, Tripp R162 p548~), 4.30 p. m. (Carr R160 p542), "morning" (Austin R172 p565); distance from Taneytown 3 miles (McAllister R164), 4 (Donovan, Baldwin, Tripp), 6 (Brewster R169, Hugo R170).
3. July 1, hour of the march order / start from Emmitsburg: "at 2 o'clock" Birney R133; 3.30 p. m. written order D0974 p465; Sickles to Howard "shall move" 3.15 p. m. D0972/D0973; Howard's message reached Sickles 3.30 p. m. R243 p703; Ward "arrived at Emmitsburg ... 3 p. m." R135 p493; 105th left 1.15 p. m. R139; 57th and 114th about 2 p. m. R136, R140; 2nd Division order 3 p. m. R158 p530, Carr 1.15 p. m. arrival then a two-hour halt R160, Burling at Emmitsburg 12 m. R174, Austin 2 p. m. R172, Baldwin 2.30 p. m. R161.
4. First Division at Gettysburg on July 1: 5.30 p. m. (Birney R133 p482); Hancock 5.25 p. m. dispatch "Third Corps not having yet reported" (R076 p366), head of the corps appeared on the Emmitsburg road shortly after 5-6 o'clock (R076 p369); about 7 p. m. (Meade R006 p115, Howard R243 p704, Bowen R140 p502); about dark (Ward R135 p493); a short time after sunset (Moore R148 p513). Ledger: dusk about 20:00.
5. Third Brigade rejoining: about 9 o'clock (Birney R133 p482), about 10 (R152 p519, R153 p522), about 12 m. (R154 p523); start from Emmitsburg 2 a. m. order, daybreak (R152), 3 a. m. (R154, R183), 4.30 a. m. (R153); Burling's order 1.30 a. m. (R174).
6. Second Division night arrival: see section 3 (1 a. m. to 2.30 a. m. and "about midnight"; ledger 00:00 vs 02:00); Hugo R170 p563 prints "arriving near Gettysburg at 12 m." for July 1.
7. Burling's brigade on the field July 2: 8 a. m. (Gilkyson R177 p577), 9 a. m. (Humphreys R158 p531, Burling R174 p570), about 10 a. m. (Woolsey R176 p575~). Burling at Emmitsburg 12 m. vs Carr 1.15 p. m. for the division.
8. Relief of Geary's division: 5 a. m. "relieved by the Third Army Corps" (Geary R293 p825) vs 7 a. m. (Birney R133 p482).
9. Berdan's reconnaissance: Berdan: first 100 men about 7.30 a. m., second detachment ordered about 11 a. m., reported about 2 p. m. (R149 p515-516~); Birney: 12 m. (R133 p482); Hunt: about 12 m. (R028 p234); ledger PO-23: 11:00, Pitzer's Woods (not named in the OR). Ward R135 sends both sharpshooter regiments and the 3rd Maine; Berdan sends 100 men of the 1st Regiment and the 3rd Maine while the 2nd stayed with the brigade.
10. Advance of the corps on July 2: notice "between 1 and 2 p. m." (Randolph R181 p581-582), about 2 p. m. (Hunt R028 p234), about 3 p. m. (Hancock R076 p369; Meade R006 p116, in the act of advancing), Birney: no clock time for the change of front, fire opened "say at 3.30 p. m.", the enemy at 4 (R133 p482); 4 o'clock (Gibbon R098 p416, Brewster R169 p558~); about 4 p. m. (Humphreys R158 p532); 4.08 p. m. (Carr R160 p543); about 4.30 (Hall R109 p436); Seeley engaged about 3 p. m. (R181 p584, R186 p590); attack opened 3 p. m. (Sykes R187 p592) or 5.30 p. m. (Norton R017 p202).
11. Graham and Ward on the line: Ward left and Graham right, in the Peach Orchard, with his right on the Emmitsburg road (Birney R133 p482-483); de Trobriand R152 p519: Graham's brigade "the left end of our front line", Ward en potence.
12. July 3, move of the First and Second Divisions to the center: 10 a. m. (Danks R137 p498), about 11 a. m. (Taylor R142 p506), about noon (Lakeman R143 p508), 12.30 p. m. (Baldwin R161), about 1 (Moore R148, Merrill R153), about 2 (Libby R145, Gilkyson R177, Austin R172), about 3 (Craig R139, Nelson R136, Bowen R140, Pierce R154, Pulford R155, Tripp, Donovan, McAllister/Schoonover, Hugo, Brewster), 3.22 p. m. (Carr R160), 4 (Higgins R146), about 4.30 (Humphreys R158 p536), about 5 (Cooper R178).
13. July 3 sharpshooters: Berdan has Capt. Baker's detachment covering the front of the Sixth Corps (R149); Trepp: with the Fifth Army Corps, Companies C, I and K, protecting batteries, the rest toward the First Corps (R150 p517); Stoughton: a dozen volunteers in front of the First Corps breastworks (R151 p519). Prisoners July 2: Berdan 22 (R149), Stoughton 23 (R151).
14. Leaving Gettysburg: July 5 (Madill R141 p506; Tripp R162 prints "the morning of the 5th", probably OCR), 4 a. m. of the 6th (Bowen R140 p503, Higgins R146 p512), orders on July 6 to move to Emmitsburg then halted (D1157, D1159, D1162, D1165; Burling "Monday ... a very short march" R174 p571); Sykes 1 p. m. July 6: First and Third Corps passing his camp (D1168 p560) vs Warren 2.30 p. m.: "General Birney has not moved from this place" (D1171 p562); 3 a. m. July 7 (Birney D1224 p586, Humphreys R158 p536, Carr R160 3.30 a. m.).
15. Artillery arrival: Smith arrived with the 3rd Brigade at 9 a. m. (Humphreys R158 p531); Winslow reached the corps about 11 a. m. (R183 p587); Randolph R181 p581: Smith and Winslow parked near Seeley's on arrival, placed after the 1-2 p. m. decision. Ledger: Smith at Devil's Den 09:00 (PO-28) and four guns above Devil's Den 14:00 (PO-27); Smith's own report fires first at about 2.30 p. m. "near the Devil's Cave" (R184 p588).
16. 73rd NY to Graham: Humphreys R158 p533 (after Sewell relieved the pickets, before Sickles was wounded, no hour) vs Brewster R169 (about 5.30 o'clock).
17. 2nd NH and 7th NJ ordered to Graham: Bailey R175 p573 "at 3 p. m."; Cooper R178 p578 "about 4 o'clock"; Burling R174: Birney's order.
18. Organization list R009 p162-169: footnote "Guarding corps trains, and not engaged in the battle" printed after the 84th Pa; in the OCR an asterisk also follows "26th Pennsylvania, Maj. Robert L. Bodine", though Bodine (R167 p555-556) reports the 26th in the line on July 2-3. Possibly a stray asterisk; not resolved.
19. Order to Graham D0972 (p464, "In the Field, near Getty ahurg" July 1) to go to Emmitsburg and command the troops there: no brigade or regimental report puts Graham there.

## 5. Differences from arrivals.json and placement.json (never resolved; Q04 not contradicted silently)

- arrivals.json us-3c-1d (first on field dusk, about 20:00, Cemetery Ridge via the Emmitsburg Road; also AP-02/PO-04): the OR puts the leading brigades at Gettysburg earlier: 5.30 p. m. (Birney R133). Moore R148 confirms the Emmitsburg road. Gate Q04 (never before the earliest value) would be contradicted by Birney's 5.30 p. m.; Ward ("about dark"), Moore (after sunset), Bowen (7 p. m.), Meade and Howard (about 7 p. m.) are consistent with or earlier than 20:00. Ledger place "Cemetery Ridge" is not in the regimental reports (they bivouac south of the town / on the left near the Taneytown road).
- arrivals.json us-3c-2d (00:00 EPP vs 02:00 SS1; counter-march at about 21:00 on the Black Horse Tavern road; AP-07 Black Horse Tavern Road): OR hours for the night bivouac are 1 a. m. to 2.30 a. m. (and "about midnight" Brewster); no OR passage prints 21:00 or any clock hour for the counter-march (gap claim). The road named in the OR is "the Black Horse Tavern, on the road from Fairfield to Gettysburg" (R158 p531, R160 p543).
- arrivals.json us-3c-art / subunit us-3c-art-4ny (Smith at Devil's Den 09:00): OR: Smith's battery joined with the 3rd Brigade at 9 a. m. but at the main road, parked near Seeley's (R181) and posted on the rocky hill after 1-2 p. m.; "Devil's Cave" in R184. The other four batteries have documented July 1-2 places (Taneytown road, Emmitsburg road, wheat-field), so "others gap" in the ledger is covered by this scope.
- placement.json PO-05 (corps advance 12:00-14:00 to the Emmitsburg Road): see conflict 10: no OR passage puts the advance earlier than the 1-2 p. m. notice (Randolph); most put it 3-4.30 p. m.
- PO-23 (Berdan to Pitzer's Woods 11:00): Pitzer's Woods is not named in the OR; hours 7.30 a. m. / 11 a. m. / 12 m.; place "beyond the Emmitsburg road", "the woods on the Fairfield road", "the Millerstown road" from the Peach Orchard (R133, R150).
- PO-24/PO-25 (1st Division 16:30 Devil's Den, 17:30-18:00 Peach Orchard): Ward's brigade is on the left from the morning (rocky eminence near Round Top / Sugar Loaf) and engaged from about 4 p. m. (R142, R147, R148, R146 4.30); Graham and the 3rd Maine are in the Peach Orchard from before 4 p. m. (R143, R138) until nearly dusk (R133 p483). Devil's Den is not named in the Ward reports; "Devil's Cave" appears in R184.
- PO-26 (2nd Division night July 2, Emmitsburg Road, 20:04 convention): OR: the division formed on the left of Hancock's corps along the Round Top ridge for the night (R158 p535) and returned to the Emmitsburg road line only as a result of the attack; by dusk it was off the Emmitsburg road.
- AC-03 (2nd Division advance 400-500 yards at 12:00): in the OR it is Birney who advances his left 500 yards (R133); the Second Division advances 300 yards (Carr, 4.08 p. m.) or "so that the first line ran along the Emmitsburg road" (Humphreys, about 4 p. m.).

## 6. Index gaps and absent reports

- Sickles: no report by Sickles in OR27 vol. 27 as indexed. The index has no record with that author (author search and full-text search of Part 1 for his signature gave only mentions and the casualty returns). His own signature appears only on Part 3 dispatches D0935 (June 30), D0973 and D0984 (July 1). Recorded as the gap claim on us-3c.
- Warren (chief of engineers, Round Top): no report in the index; Warren's June-July dispatches in Part 3 and the 1864 Mackenzie statement in the Meade composite were used where they place a Third Corps unit.
- No own report indexed for the 8th NJ (Ramsey), 115th Pa (Dunne), 12th NH (Langley), 73rd NY (Burns), 74th NY (Holt), 71st NY beyond a short note (R171) - see gap claims.
- Graham (wounded and captured): no brigade report; brigade-level claims come from Birney, regiments and others.
- R159 (Prince) covers only July 9 onward; R134 (French), R179 (Elliott), R180 (B. F. Smith) concern the Harper's Ferry troops (Third Division), which were not at Gettysburg. French's R134 gives the burial details of July 4-5 (tables unreadable).
- R130 "Aaron P. Seeley" is a captain of the 111th NY, not Battery K, 4th US (Seeley/James are in R186).
- Casualty and strength tables (R008, R013, regimental tabular statements) are unreadable in the OCR; strengths in the claims come only from the narrative sentences (Ward not 1,500; Brewster 1,837; Humphreys 5,000; Madill 200; Lakeman 14 officers and 196 rifles; Bailey 24 officers and 330 rifles; Cooper, Danks etc.).
- Interpolated pages (range printed, not a point): R133 (maps), R134, R136, R143-R145, R149-R150, R152, R154-R157, R160-R162, R169, R174, R176, R336, R009, D2101. Check the range before quoting a point page.
- Part 2 (Confederate reports): searched for Sickles, Birney, Humphreys, Trobriand, Burling, Excelsior, Berdan; no Confederate report in the index names a Third Corps unit with a time (hits are Pennsylvania militia officers named Sickles and an unrelated Excelsior mention). Hood, McLaws, Law, Barksdale are not indexed. No Part 2 claim was written.
- Meade composite R006: the "Historicus" letter and its comments (pp. 129-133) are a partisan newspaper account; not used as a source of Third Corps movements. The Mackenzie statement (p. 138) and the council minutes (p. 74) are used (flagged as after-the-fact / minutes).

## 7. OCR problems met in this scope

Dates and times: "June 38/39" for June 28/29 (R133, R160, R161, R007), "Jtdy / Jidy / Jvly / Juiy / Jyly" for July, "1^ miles" for 1.5, "1,15 p. m." for 1.15, "7. 30 a. rii.", "7.80 p. m." for 7.30 (R331), "la. m." for 1 a. m. (R163), "About 13 m." for 12 m. (R146), "By about 13 o'clock" (R030), "6. 30", "3. 30 p. m.", "1. 30 p. m." with spaces, "12_^m." in R174, Buford's date word garbled (R337 p928).
Words: "Emmitsbuxg, Aoout" (R136), "Sugar Xoaf" (R135), "Oh the morning of the 2d" (R139), "carap" (R146), "abeut" (R156), "imtil" (R162), "Walkers ville", "Taney town", "Sjkes" (R133), "Ernmitsburg" (R158), "Bimey", "Kandolph", "rqad", "Piizer's".
Garbled passages: R158 p532 (Third Brigade sent to the rear of the right of Birney's division), R169 p559 (74th NY "right of the First Bri- ^ gade"), R176 p577 (a footnote splits "Emmitsburg *Omitted. road"), R152 p521 (running head inside the sentence), R149 p515 (page split inside "divis- ion"). Quotes are verbatim from the OCR; OCR errors are not corrected.
Editorial brackets: R076 p366 prints the date and hour of Hancock's dispatch in a bracket ("5.25 [p. M., July 1, 1863,]").

## 8. Searches done (for the gap records and the audit)

Read in full: R133-R186 (all 54 reports of the Third Corps section; Sickles, Warren absent), R158, R160, R169, R174, R181. Part 1 searches for Sickles, Birney, Humphreys, Third Corps, De Trobriand, Burling, Brewster, Excelsior, Randolph, Graham, Peach Orchard over R001-R132 and R187-R378: used R006 (Meade narrative and composite), R007 (Itinerary), R009 (organization), R017 (Norton), R028 (Hunt), R029-R030 (Doubleday, Newton), R076 (Hancock), R098 (Gibbon), R109 (Hall), R187 (Sykes), R243 (Howard), R293 (Geary), R334 (Ames), R318 and R331 (McGilvery, Dow), R336, R337, R339 (Pleasonton, Buford, Devin). Part 3: all documents dated June 28 to July 7 mentioning Sickles, Birney (also "Bimey"), Humphreys, Third Corps, Excelsior, Trobriand, Burling, Randolph, Graham, Emmitsburg, Bridgeport, Black Horse, Marsh Run were read (D0840, D0889, D0895, D0919, D0921, D0923-D0936, D0960-D0984, D1009, D1093, D1099, D1105, D1107, D1110, D1116, D1154-D1171, D1224, D2101, D2102).
