# Positions and approach roads, SCOPE C (V Corps, VI Corps, Artillery Reserve, army headquarters and staff)

Source: Official Records, Ser. I vol. 27 (pt.1 reports, pt.3 correspondence); the OR is the only evidence used. No secondary source was needed (tmp/library/misc not used). Claim file: `history/positions/positions_C.jsonl` (538 records: 515 documented, 9 inferred, 14 open gap). Built by `tools/bt/positions_C_build.py` from `tools/bt/pos_C/specs_*.py`; this file by `tools/bt/positions_C_summary.py`.

How the claims were made and checked: each claim names an index record and a verbatim anchor phrase (under 15 words) that the build locates BY CODE inside that record and re-verifies with `or27_find.verify()`; the printed page comes from the index page model (a `*` after a page below means INTERPOLATED, i.e. a page inside a run of lost running heads; the claim file stores the range). 0 build errors, 0 `validate_provenance.validate()` problems. Nothing here chooses between conflicting reports or changes a default, gate or tier elsewhere. Every claim is `weak_source: false`, `flag_single_source: true` (one report each; where two reports agree they are two claims).

Reading limits: V Corps reports R187-R222, VI Corps R223-R242, Artillery Reserve R315-R335, Hunt R028, Meade R006 (narrative and enclosures read, pp.114-127; the rest searched), Itinerary R007, Organization R009, Norton R017, Ingalls R024, Letterman R016, Newton R030, Howard R243 (the Cemetery Hill passages), neighbours where they speak of a scope-C unit (Birney R133, Geary R293, Cobham R303), and 20 Part 3 correspondence documents located by search. Regimental claims exist only where a regimental or higher report gives the regiment its own position or movement; brigade claims are not copied down to regiments.

## 1. Coverage by unit

Verdict rule: **full** = the OR gives an approach (march or route to the field), a position on the field with an hour on July 2, a position or relief on July 3, and the withdrawal/departure; **partial** = at least one claim but one of those is missing or only second-hand; **none** = no claim. "Road" = a named road or route of approach is documented for the unit (by its own report or a corps/division report that speaks of it); "Position" = a position on the field is documented. Times are the printed ones (t_iso only where a clock time is printed); earliest and latest are over all claims for the unit, including pre- and post-battle marches.

| unit | commander | claims (own / with subordinate units) | earliest | latest | road of approach | position on the field | verdict | why |
|---|---|---|---|---|---|---|---|---|
| us-5c (V Corps) | Sykes | 36 / 241 | 1863-06-29 | 1863-07-06T19:30 | yes: Liberty (Jun 29) - Union Mills via Johnsville, Union (Jun 30) - Hanover (Jul 1, relieved Kilpatrick) - left Hanover 7 p.m. - McSherrystown - Bonaughtown (midnight) - Gettysburg, 4 a.m. start; route over the last stretch is the Hanover/Gettysburg road (named by Ayres, Adams, Crawford) | Jul 2: massed at the Rock Creek bridge on the Baltimore pike, then (3 p.m. order) to Little Round Top / the left; Jul 3 on the left; Jul 5 Marsh Creek | **full** | Corps report, itinerary, Part 3 dispatch of 12.30 a.m. Jul 2, Hunt and Meade; the arrival hour is in conflict (section 4). |
| us-5c-1d (1st Div Barnes) | Barnes | 18 / 89 | 1863-06-28 | 1863-07-08 | yes (Taneytown road for the afternoon move; the morning road is not named in Barnes): Union Mills - Hanover (about 4 p.m.) - after-midnight halt "about 2 miles" from Gettysburg - field about 7 a.m. Jul 2; afternoon move "up by the Taneytown road" | right of the Second Division south of the village; orchard on the left of the road; 4-6 p.m. to the left, Little Round Top and the woods south of Rose house | **full** | Division report plus three brigade reports; Jul 5 withdrawal (Griffin relieved Barnes) in R189-R190. |
| us-5c-1d-tilton (Tilton) | Tilton | 8 / 13 | 1863-07-02T16:30 | 1863-07-04 | partial (no brigade-level road): with the division (Hanover-Gettysburg; Taneytown road in the afternoon) | woods south of Rose house 4.30 p.m., retired to the right of the Second Division; Jul 3 relieved the Third Brigade on Little Round Top | **full** | Own report (R192) is short and has no march; the march is from Barnes and Rice. 18th Mass. detached and 118th Pa. refused line have regiment claims. |
| us-5c-1d-sweitzer (Sweitzer) | Sweitzer | 10 / 16 | 1863-07-02 | 1863-07-05 | yes: Unionville/Union Mills - Hanover - bivouac "4 or 5 miles" from the field after midnight - led the division at daylight | orchard above the bridge on the turnpike, then wood facing an open field; wheat-field advance; night on the right of the First Brigade; left evening of Jul 5 | **full** | Own report R193; distance to the field in conflict (2 / 3 / 4-5 miles). |
| us-5c-1d-vincent (Vincent (mw)/Rice) | Vincent / Rice | 15 / 42 | 1863-06-29 | 1863-07-05T17:00 | yes: Liberty - Union Mills - Hanover 3 p.m. - left 5 p.m. - 3 miles from Gettysburg at 1 a.m.; 4 a.m. start; position about 4 p.m. on the extreme left | Little Round Top (extreme left) from about 4 p.m. (2.30 per Woodward); Round Top crest night of Jul 2; relieved Jul 3 forenoon; centre in reserve; left Jul 5 | **full** | Rice, Chamberlain, Welch, Conner, Woodward, Lamont, Clark; departure time of Jul 5 in conflict. |
| us-5c-2d (2nd Div Ayres) | Ayres | 13 / 68 | 1863-06-28 | 1863-07-05 | yes (named: Hanover road): Frederick - Liberty (Jun 29) - 23 miles Jun 30 - "Gettysburg and Hanover road" night of Jul 1-2, line of battle in rear of and facing that road (right: First Division) | massed left and centre; afternoon Round Top hill (Weed) and the wooded rocky point 350 yards ahead (Day, Burbank); night in rear of Weed; left Jul 5 to Marsh Creek | **full** | Division report R203 is poor OCR; supported by Adams (4th US) "Hanover and Gettysburg road, 5 miles east of Gettysburg". |
| us-5c-2d-day (Day) | Day | 7 / 26 | 1863-07-02T17:00 | 1863-07-05T17:00 | yes (via Adams): with the division; 4th US night "5 miles east" of Gettysburg on the Hanover and Gettysburg road, broke camp 4 a.m. | brigade moved to the front about 5 p.m. (Dunn), 4 p.m. (14th US), 4.30 (6th US); night wood in rear of Hazlett; Jul 4 reconnaissance; Jul 5 5 p.m. Emmitsburg road | **partial** | Day wrote no report (R204 is a casualty note); every fact is regimental. Positions are by regiment, brigade hour in conflict. |
| us-5c-2d-burbank (Burbank) | Burbank | 8 / 19 | 1863-07-02T17:00 | 1863-07-02 | partial (no road): arrived "in the vicinity of the enemy" the morning of Jul 2 (2nd US bivouac 5 miles out, up at 3.30 a.m.) | left on the right of the XII Corps at first; 2 miles left; 5 p.m. advance; marsh and stone wall; reformed in rear of the battery | **partial** | Own report R211 and five regimental reports; no departure claim in the brigade reports (Adams/Sheridan give Jul 5 5 p.m. for the sister brigade). |
| us-5c-2d-weed (Weed (k)/Garrard) | Weed (k) / Garrard | 6 / 10 | 1863-07-02T16:00 | 1863-07-03 | partial (no road): with the division; idle till about 4 p.m. | Round Top ridge (summit with Hazlett; 91st left, 146th and 155th right); stone wall built that night; stayed Jul 3 | **partial** | Garrard R217; no march or departure claim from the brigade. |
| us-5c-3d (3rd Div Crawford (PA Reserves)) | Crawford | 12 / 32 | 1863-06-30T18:30 | 1863-07-04 | yes (Hanover turnpike, McSherrystown): night march Jul 1-2; at daylight near McSherrystown; noon at the First and Second Divisions' position near the Gettysburg and Hanover turnpike; 2 p.m. order; guided by Capt. Moore | right of the road near the left flank; stone wall and woods; Jul 3 5 o'clock advance | **full** | Crawford R218, Sykes dispatches (D0935, D1001). |
| us-5c-3d-mccandless (McCandless) | McCandless | 6 / 10 | 1863-07-02 | 1863-07-04T12:00 | partial: arrived on the field about 1 p.m. (printed "3d", July 2 by sense) | rocky hillside near the left from 5 p.m.; stone wall; evening of Jul 3 advance; relieved about noon Jul 4 | **partial** | R219; arrival hour in conflict with Crawford (noon). |
| us-5c-3d-fisher (Fisher) | Fisher | 3 / 10 | 1863-07-02T22:00 | 1863-07-03 | partial: with the division | left of Sykes' corps (extreme left); 10 p.m. up Round Top (Chamberlain 9 p.m.); stone wall in the ravine the morning of Jul 3 | **partial** | R220 short; the 9th and 10th regiments only by elimination (inferred). |
| us-5c-art (Artillery Martin) | Martin | 2 / 16 | 1863-07-02 | 1863-07-02 | partial: Frederick-Union Mills with the corps; Gibbs: marched all night Jul 1, in position about 8 a.m. right of the Baltimore pike | artillery entered the field 4-5 p.m. (Martin, Hunt) - Gibbs 8 a.m. (conflict); Hazlett on Rock Hill [Round Top] 4.30 p.m.; Walcott and Watson taken by Sickles' staff | **full** | R221, R222, Hunt R028. |
| us-6c (VI Corps) | Sedgwick | 22 / 120 | 1863-06-28T04:00 | 1863-07-06 | yes (conflict on the road: section 3): Hyattstown (Jun 28) - New Windsor (Jun 29) - Westminster, Manchester (Jun 30) - ordered to Taneytown (Jul 1 4.30 p.m.) - left about 9-10 p.m. - crossed the Baltimore and Gettysburg pike, re-ordered by Littlestown - Gettysburg 3-5 p.m. | Jul 2 5 p.m. left centre (Wheaton, Eustis, Bartlett); Russell, Torbert reserve; Neill to the right (Slocum); Grant extreme left; Jul 3 placements; Jul 5 Fairfield road | **full** | Sedgwick R223, Wright R224, Meade, Part 3. |
| us-6c-1d (1st Div Wright) | Wright | 5 / 26 | 1863-07-02 | 1863-07-05 | yes: Manchester camp - Taneytown order - Baltimore and Gettysburg pike - "broad and excellent pike leading direct to Gettysburg"; arrival about 4 p.m., two-hour halt | Jul 2 night: Third Division and Bartlett moved into position, Torbert and Russell in reserve; Jul 3 Torbert to centre, Russell to extreme left; Jul 4 Round Top slope; Jul 5 across the valley | **full** | R224. |
| us-6c-1d-torbert (Torbert) | Torbert | 6 / 7 | 1863-07-01T22:00 | 1863-07-05T03:00 | partial (route not named): left near Manchester about 10 p.m.; "by 4 p.m." Jul 2; coffee halt about 1 p.m. | left of the line at dark; Jul 3 front and centre (on Newton's orders); picket line Wiebecke; Jul 5 3 a.m. rejoined and led the corps | **full** | R225. |
| us-6c-1d-bartlett (Bartlett/Upton) | Bartlett / Upton | 8 / 9 | 1863-07-01T22:00 | 1863-07-05T05:00 | yes (Westminster, per Upton; conflict with Wright's pike): Manchester toward Taneytown 10 p.m.; near Westminster destination changed (Upton); 3.30 p.m. (Upton) or "a little after 5 p.m." (Bartlett) | second line behind the Fifth Corps; Jul 3 5 p.m. with Crawford; Jul 4 supported Day; Jul 5 5 a.m. | **full** | R226, R227. |
| us-6c-1d-russell (Russell) | Russell | 5 / 5 | 1863-06-28T16:00 | 1863-07-05 | partial: evening of Jul 2 (Russell) / by 4 p.m. (corps) | extreme left Jul 3; centre in the afternoon; Jul 4 relieved a Fifth Corps portion on the hill left of centre | **partial** | R228, whose Jun 28 hour (4 p.m.) conflicts with Wright (4 a.m.). |
| us-6c-2d (2nd Div Howe) | Howe | 4 / 15 | 1863-07-02T17:00 | 1863-07-03 | partial (no road): left Manchester 1 a.m. (printed July 3; Jul 2 by sense) - 5 p.m. at the field, 33 miles | Neill supporting artillery on a key-point; the rest with the Fifth Corps; two batteries to the extreme left | **partial** | R229 is brief. |
| us-6c-2d-grant (Grant) | Grant (Vermont Brigade) | 3 / 4 | 1863-07-02T17:00 | 1863-07-03 | partial (no road): about 30 miles that day, arrived about 5 p.m. | left centre then extreme left after dark; Jul 3 right on Round Top Mountain, left on the Taneytown road | **full** | R230, brigade report of Aug 3 (the June 6-8 Fredericksburg reports in the same record are not used). |
| us-6c-2d-neill (Neill) | Neill | 6 / 6 | 1863-07-02 | 1863-07-05 | partial: arrived on the field in the evening after a march of 30 miles (hour OCR-lost) | height crowned by a battery; Slocum's front; midnight back; Jul 3 extreme right; Jul 5 rejoined | **partial** | R231. Re-rated from full after the fidelity re-check: the arrival hour on July 2 is OCR-lost ("Gp. m.") and the one printed clock phrase, "At midnight", is the midnight ending July 2 (corrected from a t_iso 24 hours too early); no readable hour for a July 2 position. |
| us-6c-2d-1brig (1st Brigade) | (none) | 1 / 1 | 1863-07-02 | 1863-07-02 | n/a: none: not with the army | not on the field (footnote of the organization, R009) | **n/a (documented absence)** | Source: POS-C-0509 (R009 footnote) only. |
| us-6c-3d (3rd Div Newton/Wheaton) | Newton -> Wheaton | 2 + 1 gap / 40 | 1863-07-02T19:00 | 1863-07-02 | partial: see Shaler, Nevin, Eustis | see brigades | **partial** | No division report (open gap). |
| us-6c-3d-shaler (Shaler) | Shaler | 8 / 13 | 1863-07-02T19:00 | 1863-07-04 | partial (route in Nevin's report): with the division | 7 p.m. left in rear of the Second Brigade; Jul 3 8 a.m. (8.45 per Geary) to Geary on the right; 3.30 p.m. to Newton | **full** | R232 and Geary R293 and Cobham R303; positions of Jul 3 in conflict (Sedgwick: left centre). |
| us-6c-3d-eustis (Eustis) | Eustis | 4 + 1 gap / 6 | 1863-07-02T17:00 | 1863-07-04 | no: none of its own | left centre 5 p.m. (Sedgwick); extreme left (Rogers); right centre Jul 3 (Sedgwick) | **partial** | No report by Eustis (open gap); only a regiment (2nd R.I.), the corps commander and Birney. |
| us-6c-3d-wheaton (Wheaton/Nevin) | Wheaton / Nevin | 13 / 19 | 1863-07-01T21:00 | 1863-07-04 | yes (Littlestown, Gettysburg pike): Manchester 9 p.m. - a mile across the Gettysburg pike, countermarched - Littlestown 8 a.m. - within 2 miles of Cemetery Hill 2 p.m. | to the left of Round Top 4.30 p.m.; first line of the division; supported Crawford; 6 p.m. Jul 3 reconnaissance; 102nd Pa. at Westminster | **full** | R234-R237. |
| us-6c-art (Artillery Tompkins) | Tompkins | 2 + 1 gap / 17 | 1863-06-28 | 1863-07-02 | partial: Edwards Ferry - Hyattstown - Sam's Creek - Manchester; batteries: Littlestown (3rd NY about noon; 1st NY; 1st RI G; 1st RI C) | under Hunt; Cowan with Newton and Webb; McCartney near the cemetery; Adams near Hazlett; 2usd, 2usg, 5usf no claim | **partial** | No Tompkins report; three batteries no claim. |
| us-art-reserve (Artillery Reserve) | Tyler | 29 / 113 | 1863-06-28 | 1863-07-05 | yes (Taneytown road): Frederick - Bruceville (Jun 29) - Taneytown (Jun 30, Emmitsburg turnpike) - brigades Ransom and Fitzhugh left Taneytown about sundown Jul 1 - the rest at dawn Jul 2; park on a cross-road between the main road and the Baltimore turnpike, reported about 10.30 | park behind the III Corps line; batteries sent out from 3.30 p.m.; Jul 3 batteries in line, works built; Jul 5 3 p.m. to Littlestown | **full** | R315, R316, R007. |
| us-art-reserve-ransom (1st Regular Brigade) | Ransom (wounded) | 2 + 1 gap / 10 | 1863-07-02 | 1863-07-02 | partial: Taneytown - Gettysburg, left about sundown Jul 1 (Tyler) / Jul 2 (Weir) | crest near Meade's headquarters; Weir 500 yards right and front 4 p.m.; Turnbull near the Emmitsburg road; Eakin Cemetery Hill; Thomas on the crest | **partial** | No report by Ransom; only Weir (R317) and Tyler/Hunt. |
| us-art-reserve-mcgilvery (1st Volunteer Brigade) | McGilvery | 9 / 33 | 1863-07-02T15:30 | 1863-07-03 | partial: Taneytown - 10 a.m. park (9th Mass.) | Peach Orchard line from 3.30-4.30 p.m.; new line 400 yards back; Jul 3 line of 39 guns; works | **full** | R318-R323. |
| us-art-reserve-taft (2nd Vol Brigade) | Taft | 1 / 10 | 1863-07-02 | 1863-07-02 | partial: see batteries | brigade split (inferred): Taft to the cemetery, Sterling forward, B and M at Westminster | **partial** | R009 and unit reports; Sterling no report. |
| us-art-reserve-huntington (3rd Vol Brigade) | Huntington | 1 + 1 gap / 14 | 1863-07-02 | 1863-07-02 | partial: Taneytown - Gettysburg about noon-10 a.m. | Cemetery Hill (Osborn, Wainwright), 4-4.30 p.m. batteries | **partial** | No brigade report; five battery reports. |
| us-art-reserve-fitzhugh (4th Vol Brigade) | Fitzhugh | 1 / 17 | 1863-07-02T08:00 | 1863-07-02T08:00 | partial: Taneytown - field about 8 a.m. (Fitzhugh), or Jul 1 evening (Tyler) | Baltimore pike near Slocum's line (K, A NJ); Rigby 500 yards west of the pike; Dow and Ames on the left; Jul 3 K and A NJ near Webb | **full** | R330-R334. |
| us-aop-hq (Army headquarters) | Meade (army headquarters) | 48 + 2 gap / 48 | 1863-06-27 | 1863-07-07 | yes: Frederick (Jun 27-28) - Middleburg (Jun 29) - Taneytown (Jun 30-Jul 1) - left 10 p.m. (Meade) / after midnight (Butterfield) - field 1 a.m. (Meade) / 2 a.m. (Hunt) / cemetery gate about 3 a.m. (Howard) | cemetery gate / "near Cemetery Hill"; council in a room not over 10 ft square; Jul 3 at Slocum's headquarters during the assault; evening of Jul 3 a strip of woods on the Taneytown road; Jul 4 Baltimore pike; Jul 6-7 to Frederick | **full** | R006, R007, R017, R028, R243, R030, Part 3; staff officers separately in 2. |

Brigade-level verdicts (excluding corps and division rows and the Artillery Reserve/HQ rows): {'full': 11, 'partial': 12, 'n/a': 1}.

Regiments and batteries with their own claims are listed in the claim file under their own unit ids; regiments with NO claim of their own (named only in the order of battle or in brigade-level passages): 22nd Mass. and 1st Mich. have a diagram claim only (garbled), the following have none: 1st, 3rd and 15th NJ; 5th Maine, 95th and 96th Pa.; 6th Maine, 49th Pa., 119th Pa., 5th Wis.; 2nd, 3rd, 5th, 6th Vt.; 7th Maine, 33rd, 43rd, 49th, 77th NY, 61st Pa.; 7th, 10th and 37th Mass.; Batteries 2usd, 2usg, 5usf; Battery K 3rd US has a claim only through the Turnbull passages. Their brigade positions are in the brigade rows.

## 2. Brigades and units with no claim, and reports searched

Open-gap records (kind `open gap`) in the claim file, each with three targeted searches whose hit counts were run by code at build time (see the `gap.searches` field):

- **POS-C-0524** us-6c-art-2usd - Battery D, 2nd US (Lt. Edward B. Williston): no position, hour or movement at Gettysburg in the OR Gettysburg volumes searched; listed only in the organization (R009) and Robertson's report of July 16 onward (R368)
  - search /Williston/ (Parts 1,3) -> 6 hit(s) in 5 record(s): 1-R009, 1-R368, 3-D1664, 3-D2111, 3-D2158
  - search /Battery D,? (of the )?Second U(nited|\. ?S\.) ?States|2d United States, Battery D/ (Parts 1,3) -> 1 hit(s) in 1 record(s): 1-R009
  - search /Second U\. ?S\. Artillery.{0,60}(Sixth|Gettysburg)/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - note: Sedgwick (R223): the artillery of the corps was under the chief of artillery. Wright (R224) and Howe (R229) mention "two batteries" on the left; Martin (R221) names them as Fifth Corps batteries. Not resolved.
- **POS-C-0525** us-6c-art-2usg - Battery G, 2nd US (Lt. John H. Butler): no position or movement found
  - search /Butl[eo]r.{0,50}(Battery|Second U|artillery)/ (Parts 1,3) -> 3 hit(s) in 3 record(s): 1-R009, 3-D1664, 3-D2111
  - search /Battery G,? (of the )?Second U/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /2d United States, Battery G/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - note: Listed in R009 only. Butler matches in R205/R212 are officers of other units.
- **POS-C-0526** us-6c-art-5usf - Battery F, 5th US (Lt. Leonard Martin): no position or movement found
  - search /Battery F,? (of the )?Fifth U/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /Leonard Martin/ (Parts 1,3) -> 2 hit(s) in 2 record(s): 1-R009, 3-D1664
  - search /5th United States, Battery F/ (Parts 1,3) -> 1 hit(s) in 1 record(s): 1-R009
  - note: Listed in R009 and in the July 31 organization (D1664) only.
- **POS-C-0527** us-6c-art - Artillery Brigade, VI Corps (Col. Charles H. Tompkins): no report by Tompkins and no OR passage stating where the brigade's batteries stood on July 2-3 as a brigade; only the unit reports of McCartney, Cowan, Harn, Waterman and Adams (claims above)
  - search /Tompkins/ (Parts 1,3) -> 11 hit(s) in 7 record(s): 1-R028, 1-R239, 1-R240, 1-R242, 3-D1664, 3-D1980
  - search /Artillery Brigade,? Sixth/ (Parts 1,3) -> 3 hit(s) in 3 record(s): 1-R238, 1-R239, 1-R242
  - search /Report of Col\. Charles H\. Tompkins|Tompkins, Colonel, Commanding Artillery/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - note: Hunt (R028) lists Tompkins as chief of VI Corps artillery but gives no VI Corps battery positions.
- **POS-C-0528** us-6c-3d - Third Division (Newton, then Wheaton): no report by Wheaton or Newton for the division; division-level facts rest on Sedgwick, Shaler and Nevin
  - search /Wheaton.{0,60}(report|commanding.{0,10}division)/ (Parts 1,3) -> 2 hit(s) in 1 record(s): 1-R232
  - search /Report of Brig\. Gen\. Frank Wheaton|Frank Wheaton.{0,40}Third Division/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /Newton.{0,80}Third Division/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
- **POS-C-0529** us-6c-3d-eustis - Eustis' brigade: no report by Col. Henry L. Eustis; no OR passage on its approach road (the Third Division route is in Nevin's report)
  - search /Eustis/ (Parts 1,3) -> 8 hit(s) in 7 record(s): 1-R009, 1-R013, 1-R133, 1-R223, 1-R224, 3-D1664
  - search /Colonel Eustis|Col\. Eustis|Henry L\. Eustis/ (Parts 1,3) -> 3 hit(s) in 3 record(s): 1-R009, 1-R133, 3-D1664
  - search /Second Brigade, Third Division, Sixth/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - note: Position claims for the brigade come from Sedgwick (R223), Rogers (R233) and Birney (R133).
- **POS-C-0530** us-6c-3d-eustis-7ma - 7th Massachusetts: no regimental report; named only in the organization (R009) and the Meade casualty table
  - search /Seventh Massachusetts/ (Parts 1,3) -> 3 hit(s) in 2 record(s): 1-R006, 3-D1649
  - search /7th Massachusetts/ (Parts 1,3) -> 6 hit(s) in 3 record(s): 1-R009, 3-D0958, 3-D1664
  - search /Lieut\. Col\. Frankl?in P\. Harlow/ (Parts 1,3) -> 1 hit(s) in 1 record(s): 3-D1664
- **POS-C-0531** us-6c-3d-eustis-10ma - 10th Massachusetts: no regimental report
  - search /Tenth Massachusetts/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /10th Massachusetts/ (Parts 1,3) -> 2 hit(s) in 2 record(s): 3-D0958, 3-D1664
  - search /Joseph B\. Parsons/ (Parts 1,3) -> 1 hit(s) in 1 record(s): 3-D1664
- **POS-C-0532** us-6c-3d-eustis-37ma - 37th Massachusetts: no regimental report
  - search /Thirty-seventh Massachusetts/ (Parts 1,3) -> 3 hit(s) in 2 record(s): 1-R006, 3-D1649
  - search /37th Massachusetts/ (Parts 1,3) -> 1 hit(s) in 1 record(s): 1-R009
  - search /Oliver Edwards/ (Parts 1,3) -> 2 hit(s) in 2 record(s): 1-R006, 1-R009
- **POS-C-0533** us-art-reserve-taft-2ct - Sterling's Connecticut battery (2nd Conn.; "3d Battery" in the organization): no battery report; position known only from McGilvery's July 3 line and Tyler/Hunt
  - search /Sterling/ (Parts 1,3) -> 20 hit(s) in 12 record(s): 1-R009, 1-R028, 1-R058, 1-R315, 3-D0050, 3-D0168
  - search /Second Connecticut|2d Connecticut/ (Parts 1,3) -> 8 hit(s) in 6 record(s): 1-R028, 1-R315, 1-R331, 3-D0835, 3-D0958, 3-D1664
  - search /Connecticut.{0,30}Battery.{0,40}Sterling|Sterling.{0,40}Connecticut/ (Parts 1,3) -> 7 hit(s) in 5 record(s): 1-R009, 1-R028, 1-R315, 3-D1664, 3-D2111
  - note: Tyler (R315): "No report has yetbeen received from ... Captain Sterling's (Second Connecticut) batteries."
- **POS-C-0534** us-art-reserve-huntington - Third Volunteer Brigade (Capt. James F. Huntington): no report by Huntington; the batteries' positions come from their commanders and Tyler/Hunt
  - search /Captain Huntington|Capt\. James F\. Huntington|James F\. Huntington/ (Parts 1,3) -> 6 hit(s) in 5 record(s): 1-R264, 1-R315, 1-R326, 1-R328, 3-D1664
  - search /Third Volunteer Brigade/ (Parts 1,3) -> 5 hit(s) in 5 record(s): 1-R009, 1-R013, 1-R326, 1-R327, 3-D1664
  - search /Report of Capt\. James F\. Huntington/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
- **POS-C-0535** us-art-reserve-ransom - First Regular Brigade (Capt. Dunbar R. Ransom, wounded July 2): no report by Ransom; the batteries' reports exist for Weir only (R317)
  - search /Captain Ransom|Capt\. Dunbar R\. Ransom|D\. R\. Ransom/ (Parts 1,3) -> 6 hit(s) in 4 record(s): 1-R009, 1-R028, 1-R315, 1-R317
  - search /First Regular Brigade/ (Parts 1,3) -> 4 hit(s) in 4 record(s): 1-R009, 1-R013, 1-R317, 3-D1664
  - search /Report of Capt\. Dunbar/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - note: Tyler (R315) says Ransom was severely wounded by a sharpshooter while reconnoitering a position; Thomas (4th US), Turnbull (3rd US), Eakin/Mason (1st US) have no battery report in the volume.
- **POS-C-0536** us-aop-hq - Named places for Army headquarters on July 2-3 (the Leister house; Powers' Hill): not named in any OR passage found; the OR names the cemetery gate, "General Meade's headquarters, near Cemetery Hill", "a strip of woods on the Taneytown road", "General Slocum's headquarters" and "the Baltimore pike"
  - search /Leister|Lester/ (Parts 1,3) -> 4 hit(s) in 4 record(s): 1-R243, 3-D0958, 3-D2111, 3-D2112
  - search /Powers?.? ?Hill|Power.s Hill/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /headquarters.{0,60}(Cemetery|cemetery)/ (Parts 1,3) -> 2 hit(s) in 2 record(s): 1-R017, 1-R243
  - note: The first two return no passage about Meade's headquarters (the "Lester" hits are unrelated names). The third returns Norton p.206 and Howard p.702 (claims above).
- **POS-C-0537** us-aop-hq - Reports by Butterfield (Chief of Staff) and Warren (Chief Engineer): no report in the volume; their positions rest on other officers' reports and on correspondence
  - search /Report of Maj\. Gen\. Daniel Butterfield|Butterfield, Chief of Staff.{0,60}report of/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /Reports? of Brig\. Gen\. G\. ?K\. Warren|Warren, Chief of Engineers?.{0,30}Report/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - search /Warren.{0,60}Little Round Top/ (Parts 1,3) -> 0 hit(s) in 0 record(s)
  - note: The index (or27_index.json) has no record authored by Butterfield or Warren in Part 1; Warren's dispatches are in Part 3.

Units in scope with NO claim at all: Battery D 2nd US (Williston), Battery G 2nd US (Butler), Battery F 5th US (Martin) - open gaps; no brigade in scope is without a claim. The following brigades have claims only at second hand (no report by their commander): Eustis, Day (a casualty note only), Weed/Garrard (report by Garrard exists: first-hand), Ransom, Taft, Huntington, Tompkins, and Wheaton as division commander.

Reports and records read for the scope are listed in the header. Reports confirmed ABSENT from the volume index for scope-C units: Eustis (2nd Brig., 3rd Div., VI), Wheaton/Newton (3rd Div., VI), Tompkins (VI art.), Williston, Butler, L. Martin (VI batteries), Huntington (3rd Vol. Brig.), Ransom (1st Reg. Brig.), Sterling (2nd Conn. Battery), Hull (62nd Pa., named in R193), Thomas (4th US C), Turnbull (3rd US F/K), Eakin/Mason (1st US H), Warren, Butterfield, Patrick (operations), Hazlett (killed), Seeley (III Corps).

## 3. Approach roads by division and corps (these decide where units enter the map)

Rows are claims; (*) = interpolated page. The OR names roads only occasionally. Where a road is named it is shown verbatim in the claim (`place.direction_or_road`); where only a town sequence is given it is shown as a route.

**V Corps**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0001 us-5c | 1863-06-29 (June 29) | Liberty, Md. | R187 p.595 |
| POS-C-0002 us-5c | 1863-06-30 (June 30) | Union Mills, via Johnsville, Union, and Frizellburg | R187 p.595 |
| POS-C-0003 us-5c | 1863-07-01 (July 1) | Hanover | R187 p.595 |
| POS-C-0482 us-5c | 1863-07-01 19:00 | Hanover -> Bonaughtown (9 miles), en route to Gettysburg; dateline "Headquarters Fifth Cor | P3-D1001 p.483 |
| POS-C-0004 us-5c | 1863-07-01 19:00 | Bonaughtown | R187 p.595 |
| POS-C-0493 us-5c | 1863-07-01 (July 1) | Union Mills -> Hanover -> McSherrystown -> Bonaughtown | R007 p.144 |
| POS-C-0005 us-5c | 1863-07-02 04:00 | Gettysburg | R187 p.595 |
| POS-C-0484 us-5c | 1863-07-01 19:30 | Hanover -> Gettysburg | P3-D0983 p.468 |
| POS-C-0006 us-5c | 1863-07-02 08:00 | the field of Gettysburg, via Liberty, Union Mills; Hanover | R187 p.592 |

**V Corps, 1st Division**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0021 us-5c-1d | 1863-07-01 16:00 | Hanover | R189 p.600 |
| POS-C-0022 us-5c-1d | 1863-07-02 (after midnight) | about 2 miles from Gettysburg | R189 p.600 |
| POS-C-0023 us-5c-1d | 1863-07-02 (about 7 o'clock in the morni | Gettysburg | R189 p.600 |
| POS-C-0027 us-5c-1d | 1863-07-02 (between 4 and 6 o'clock in t | the Taneytown road; road: Taneytown Road | R189 p.600 |

**V Corps, 2nd Division**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0105 us-5c-2d | 1863-07-02 (night of July 1-2) | the Gettysburg and Hanover road; road: Gettysburg and Hanover road | R203 p.634 |
| POS-C-0122 us-5c-2d-day-4us | 1863-07-02 (night of July 1) | the Hanover and Gettysburg road, 5 miles east of Gettysburg; road: Hanover and Gettysburg road | R206 p.638 |
| POS-C-0118 us-5c-2d-day-3us | 1863-07-01 18:00 | Hanover, Pa. -> toward Gettysburg, bivouacked on the road | R205 p.637 |

**V Corps, 3rd Division**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0480 us-5c-3d | 1863-06-30 18:30 | between Frizellburg and Union Mills | P3-D0935 p.424 |
| POS-C-0481 us-5c-3d | 1863-07-01 19:00 | Hanover | P3-D1001 p.483 |
| POS-C-0165 us-5c-3d | 1863-07-02 (night of July 1-2) | near McSherrystown (OCR "Mc- Sherrystown") | R218 p.652 |
| POS-C-0166 us-5c-3d | 1863-07-02 12:00 | the position of the First and Second Divisions, near the Gettysburg and Hanover turnpike; road: Gettysburg and Hanover turnpike | R218 p.653 |

**V Corps, departure Jul 5**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0487 us-5c | 1863-07-05 (July 5 (hour not printed)) | the road to Emmitsburg, the left-hand road, a short distance on the Taneytown road, leavin; road: the road to Emmitsburg, the left-hand road | P3-D1090 p.530 |
| POS-C-0489 us-5c | 1863-07-05 21:30 | Marsh Creek, south side, on the direct road from Gettysburg to Emmitsburg; road: the direct road from Gettysburg to Emmitsburg | P3-D1122 p.~540 (539-540)* |
| POS-C-0086 us-5c-1d-vincent-20me | 1863-07-05 (on the morning of the 5th) | the Emmitsburg road; road: Emmitsburg Road | R196 p.626 |

**VI Corps**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0305 us-6c | 1863-07-01 16:30 | Taneytown | P3-D0976 p.465 |
| POS-C-0213 us-6c | 1863-07-01 (Just before dark on the even | camp near Manchester -> Taneytown | R224 p.665 |
| POS-C-0214 us-6c | 1863-07-02 (during the night of July 1-2 | the Baltimore and Gettysburg pike; road: Baltimore and Gettysburg pike | R224 p.665 |
| POS-C-0304 us-6c | 1863-07-01 23:00 | toward Gettysburg by Littlestown | P3-D0985 p.469 |
| POS-C-0499 us-6c | 1863-07-01 (July 2, 6.15 a. m. (reportin | the road to Taneytown, then turned back to come up via Littlestown; road: via Littlestown | P3-D2099 p.~1086 (1086-1087)* |
| POS-C-0215 us-6c | 1863-07-02 (night of July 1-2) | the broad and excellent pike leading direct to Gettysburg; road: the broad and excellent pike leading direct to Gettysburg | R224 p.665 |
| POS-C-0288 us-6c-3d-wheaton | 1863-07-02 (night of July 1-2) | a mile across the Gettysburg pike, countermarched to the pike; road: the Gettysburg pike | R234 p.684 |
| POS-C-0289 us-6c-3d-wheaton | 1863-07-02 08:00 | Littlestown, Pa. | R234 p.684 |
| POS-C-0240 us-6c-1d-bartlett | 1863-07-02 15:30 | Arriving near Westminster, its destination was changed to Gettysburg | R227 p.673 |
| POS-C-0318 us-6c-art-1rig | 1863-07-01 (July 1, broke camp at 8 p. m | the Westminster and Gettysburg turnpike; road: Westminster and Gettysburg turnpike | R242 p.695 |
| POS-C-0314 us-6c-art-3ny | 1863-07-02 12:00 | Littlestown, Pa. | R240 p.692 |

**Artillery Reserve**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0323 us-art-reserve | 1863-06-29 (June 29) | about 1 mile beyond Bruceville (OCR "Bniceville") | R315 p.872 |
| POS-C-0324 us-art-reserve | 1863-06-30 (June 30) | Taneytown, a short distance beyond the village, on the Emmitsburg turnpike; road: Emmitsburg turnpike | R315 p.872 |
| POS-C-0325 us-art-reserve | 1863-07-01 (On the evening of July 1) | Taneytown -> Gettysburg | R315 p.872 |
| POS-C-0326 us-art-reserve | 1863-07-01 22:30 | Gettysburg (reported to General Gibbon) | R315 p.872 |
| POS-C-0327 us-art-reserve | 1863-07-01 (night of July 1) | the Taneytown road, near the cross-road leading to Two Taverns; road: Taneytown Road | R315 p.872 |
| POS-C-0329 us-art-reserve | 1863-07-02 (July 2, early dawn) | Taneytown | R315 p.872 |
| POS-C-0331 us-art-reserve | 1863-07-02 (July 2 (after reporting abou | a cross-road between the main road and the Baltimore turnpike | R315 p.872 |
| POS-C-0413 us-art-reserve-fitzhugh | 1863-07-02 08:00 | the field, from Taneytown | R330 p.895 |

**Army headquarters**

| claim | when | place / road | source |
|---|---|---|---|
| POS-C-0432 us-aop-hq | 1863-06-29 (June 29) | Frederick -> Middleburg | R007 p.144 |
| POS-C-0433 us-aop-hq | 1863-06-30 (June 30) | Middleburg -> Taneytown | R007 p.144 |
| POS-C-0438 us-aop-hq | 1863-07-01 22:00 | Taneytown -> the field of Gettysburg | R006 p.115 |
| POS-C-0439 us-aop-hq | 1863-07-02 00:00 | Taneytown -> the field of operations | P3-D1003 p.484 |
| POS-C-0440 us-aop-hq | 1863-07-02 01:00 | the field (Gettysburg) | R006 p.115 |
| POS-C-0441 us-aop-hq | 1863-07-02 02:00 | Gettysburg | R028 p.232 |
| POS-C-0501 us-aop-hq | 1863-07-02 03:00 | the cemetery gate | R243 p.705 |

Reading of the roads (for placement; every statement is a claim above, none is an owner decision):

- **V Corps** reached Gettysburg from Hanover by the Hanover-Gettysburg road through McSherrystown and Bonaughtown (itinerary, Sykes's 12.30 a.m. dispatch, Ayres "Gettysburg and Hanover road", Adams, Crawford "Gettysburg and Hanover turnpike"). The corps left Hanover at 7 p.m. (Sykes, Part 3 and itinerary; Rice 5 p.m.; Sheridan 6 p.m.), halted at Bonaughtown or 2-5 miles from the town, and resumed at 4 a.m. Arrival on the field: Williams at headquarters at 6.15 a.m. "momentarily expected"; Barnes and Chamberlain about 7 a.m.; Sykes about 8 a.m.; Meade "by 7 a.m."; the 2nd U.S. (Lee) reports taking position at "about 1 1/2 miles southeast of the town" after a 3.30 a.m. start. The afternoon move to the left was by the Taneytown road (Barnes, Sykes).
- **VI Corps** left the Manchester area about 9-10 p.m. July 1 on orders for Taneytown, then (Butterfield 11 p.m.) "toward Gettysburg by Littlestown"; Wright says the corps had crossed the Baltimore and Gettysburg pike when it was redirected and then used "the broad and excellent pike leading direct to Gettysburg"; Upton says the change came near Westminster; the Third Division and the batteries passed through Littlestown (Nevin 8 a.m.; Harn noon). Arrival 3-5 p.m. (see conflicts). Entered by "the broad and excellent pike leading direct to Gettysburg" (printed; that this is the Baltimore pike is the compiler's identification, not printed in Wright's sentence, and the road field of that claim now carries the printed words only) and by the Littlestown road for the Third Division and batteries, then to the area behind Cemetery Hill and to the left.
- **Artillery Reserve**: Frederick - Bruceville - Taneytown (Emmitsburg turnpike); Ransom's and Fitzhugh's brigades went on from Taneytown the evening of Jul 1 (reported to Gibbon about 10.30 p.m.); the rest left at early dawn Jul 2 under McGilvery and parked on a cross-road between the Taneytown road and the Baltimore turnpike about 10.30 a.m. (Tyler; individual battery arrivals 8-10.30 a.m., noon for one).
- **Army headquarters**: Taneytown until 10 p.m. (Meade) or midnight (Butterfield), arriving at the field 1-2 a.m. and at the cemetery gate by about 3 a.m.

## 4. Conflicts between reports (both values; none resolved)

Each group is a connected set of `conflicts_with` links in the claim file (links are symmetric). External ids C-nnn are rows of the conflict register that the same fact belongs to; this file does not change them.

**G01** broke camp near Edwards Ferry and moved to Hyattstown
- POS-C-0217 us-6c - 1863-06-28 04:00 - broke camp near Edwards Ferry and moved to Hyattstown (R224 p.666) - "the command broke camp near Edwards Ferry, and moved to Hyattstown"
- POS-C-0251 us-6c-1d-russell - 1863-06-28 16:00 - Russell's brigade broke camp near Edwards Ferry on June 28 (R228 p.674) - "this command broke camp near Edwards Ferry, Md., at 4 p. m."

**G02** left Union Mills early and reached Hanover about 4 p.m.; halt ordered,...
- POS-C-0061 us-5c-1d-vincent - 1863-07-01 06:00 - broke camp 6 a.m., arrived Hanover about 3 p.m. (R195 p.621) - "Broke camp at 6 a. m., arriving at Hanover about 3 p. m."
- POS-C-0021 us-5c-1d - 1863-07-01 16:00 - left Union Mills early and reached Hanover about 4 p.m.; halt ordered, then news of Gettys... (R189 p.600) - "for Hanover, where it arrived at about 4 o'clock in the afternoon."
- POS-C-0074 us-5c-1d-vincent-20me - 1863-07-01 (just before sunset) - 20th Maine, advance guard of the division on the July 1 march, reached Hanover just before... (R196 p.622) - "on reaching Hanover, Pa., just before sunset on that day"

**G03** resumed the march from Hanover at 7 p.m., bivouacked at Bonaughtown at...
- POS-C-0062 us-5c-1d-vincent - 1863-07-01 17:00 - left Hanover at 5 p.m. and bivouacked within 3 miles of Gettysburg at 1 a.m. (July 2) (R195 p.621) - "Left again at 5 [p. m.J, and arrived within 3 miles of Gettysburg"
- POS-C-0118 us-5c-2d-day-3us - 1863-07-01 18:00 - 3rd US reached camp near Hanover, left at 6 p.m. and marched toward Gettysburg, bivouacked... (R205 p.637) - "left at 6 p. m. same day, and marched in the direction of Gettysburg"
- POS-C-0004 us-5c - 1863-07-01 19:00 - resumed the march from Hanover at 7 p.m., bivouacked at Bonaughtown at midnight after 30 m... (R187 p.595) - "At 7 p. m. resumed the march, and at midnight bivouacked at Bonaughtow"
- POS-C-0482 us-5c - 1863-07-01 19:00 - Sykes to Butterfield (dispatch dated July 2, '13.30' a.m. [OCR; 12.30 by sense]): on recei... (P3-D1001 p.483) - "I left Hanover at 7 p. m., and marched 9 miles to Bonaughtown"
- POS-C-0063 us-5c-1d-vincent - 1863-07-02 01:00 - bivouac before the final march (R195 p.621) - "arrived within 3 miles of Gettysburg at 1 a. m."
- POS-C-0022 us-5c-1d - 1863-07-02 (after midnight) - division halted for a brief rest of two or three hours about 2 miles from Gettysburg (R189 p.600) - "halting after midnight about 2 miles from that place."
- POS-C-0045 us-5c-1d-sweitzer - 1863-07-02 (July 1 (after 12 p. m. = after midni - after a hard march on July 1 from Unionville, Md. by way of Hanover, bivouacked with the d... (R193 p.610) - "by way of Hanover, the brigade bivouacked after 12 p. m."
- POS-C-0046 us-5c-1d-sweitzer - 1863-07-02 (after 12 p. m.) - bivouac before the final march (R193 p.610) - "4 or 5 miles distant from the battle-field"
- POS-C-0122 us-5c-2d-day-4us - 1863-07-02 (night of July 1) - the 4th US spent the night of July 1 on the road 5 miles east of Gettysburg (R206 p.638) - "passed on the Hanover and Gettysburg road, 5 miles east of the latter "

**G04** the corps resumed the march at about 9 p.m. July 1
- POS-C-0220 us-6c - 1863-07-01 21:00 - the corps resumed the march at about 9 p.m. July 1 (R224 p.666) - "resumption of the march at about 9 p. m. on the night of"
- POS-C-0232 us-6c-1d-torbert - 1863-07-01 22:00 - brigade left Manchester at about 10 p.m. July 1; one hour for coffee about 1 p.m. July 2 (R225 p.~668 (667-668)*) - "about 10 o'clock, the brigade started from near Manchester, Md., for G"
- POS-C-0239 us-6c-1d-bartlett - 1863-07-01 22:00 - brigade (Upton commanding) marched from near Manchester toward Taneytown about 10 p.m. (R227 p.673) - "It commenced its march from near Manchester, Md., toward Taneytown abo"
- POS-C-0253 us-6c-2d - 1863-07-02 (1 a. m. on July 3 [sic]) - Howe: the division left Manchester at 1 a.m. (printed "July 3"; the context is the march t... (R229 p.675) - "The division left Manchester at 1 a. m. on July 3"

**G05** Meade: at 10 p.m. July 1 the headquarters were broken up at Taneytown ...
- POS-C-0438 us-aop-hq - 1863-07-01 22:00 - Meade: at 10 p.m. July 1 the headquarters were broken up at Taneytown and he proceeded to ... (R006 p.115) - "I broke up my headquarters, which until then had been at Taneytown"
- POS-C-0439 us-aop-hq - 1863-07-02 00:00 - Butterfield to Sedgwick, July 2 5.30 a.m.: Meade waited until 12 (midnight) to see Sedgwic... (P3-D1003 p.484) - "after waiting until 12 to see you, left for the field of operations"

**G06** the two brigades (Ransom, Fitzhugh) left Taneytown about sundown and r...
- POS-C-0326 us-art-reserve - 1863-07-01 22:30 - the two brigades (Ransom, Fitzhugh) left Taneytown about sundown and reported to Gibbon at... (R315 p.872) - "in the absence of General Hancock, at about 10.30 p. m."
- POS-C-0413 us-art-reserve-fitzhugh - 1863-07-02 08:00 - Fitzhugh arrived about 8 a.m. July 2 and was ordered by Tyler to take K 1st NY and A 1st N... (R330 p.895) - "Arriving on the field from Taneytown about 8 a. m. July 2"
- POS-C-0372 us-art-reserve-mcgilvery-9ma - 1863-07-02 10:00 - 9th Mass. (Milton) left Taneytown the morning of the 2d, arrived 10 a.m., parked on the le... (R320 p.886) - "Arrived at Gettysburg at 10 a. m."
- POS-C-0399 us-art-reserve-huntington-1nh - 1863-07-02 10:00 - 1st NH (Edgell) arrived 10 a.m. July 2 (R326 p.892) - "arrived on the field from Taneytown on July 2, at 10 a. m."
- POS-C-0330 us-art-reserve - 1863-07-02 10:30 - the rest of the reserve batteries and the ammunition train reported to Tyler at about 10.3... (R315 p.872) - "reported to me with the ammunition train about 10.30 a. m."
- POS-C-0395 us-art-reserve-taft-5ny - 1863-07-02 10:30 - 5th NY (20-pounders, Taft) marched from Taneytown the morning of July 2 and halted in park... (R325 p.891) - "where it halted in park about 10. 30 a. m."
- POS-C-0407 us-art-reserve-huntington-1paf - 1863-07-02 12:00 - Ricketts' F and G 1st Pa. moved from Taneytown to Gettysburg with Huntington's brigade, ar... (R328 p.894) - "arriving on the field about noon"
- POS-C-0353 us-art-reserve-ransom - 1863-07-02 (July 2) - Weir's Battery C 5th US marched from Taneytown to within 1 1/2 miles of Gettysburg and par... (R317 p.879) - "marched to within a mile and a half of Gettysburg, Pa."

**G07** Meade arrived on the field at 1 a.m. July 2  [register: C-001]
- POS-C-0440 us-aop-hq - 1863-07-02 01:00 - Meade arrived on the field at 1 a.m. July 2 (R006 p.115) - "and proceeded to the field, arriving there at 1 a. m. of the 2d"
- POS-C-0441 us-aop-hq - 1863-07-02 02:00 - Hunt: on the night of July 1 the commanding general left Taneytown and reached Gettysburg ... (R028 p.232) - "reached Gettysburg about 2 a. m. of the 2d"

**G08** reached the field of Gettysburg about 8 a.m. on July 2 by Liberty, Uni...  [register: C-003]
- POS-C-0145 us-5c-2d-burbank-2us - 1863-07-02 03:30 - 2nd US marched from a bivouac 5 miles from Gettysburg and took position about 1 1/2 miles ... (R212 p.646) - "About 3.30 a. m. the regiment marched from its place of bivouac"
- POS-C-0064 us-5c-1d-vincent - 1863-07-02 04:00 - started 4 a.m., about 2 miles to a position, remained some 2 hours; crossed the creek and ... (R195 p.621) - "Started at 4 a. m.; went about 2 miles, when we got into position"
- POS-C-0444 us-aop-hq - 1863-07-02 06:15 - S. Williams, Asst. Adjt. Gen., from the field at 6.15 a.m.: the Second Corps is up and the... (P3-D2099 p.~1086 (1086-1087)*) - "The Second Corps is up and the Fifth is momentarily expected"
- POS-C-0445 us-5c - 1863-07-02 06:15 - at 6.15 a.m. the Fifth Corps was not yet on the field but "momentarily expected" (Williams... (P3-D2099 p.~1086 (1086-1087)*) - "the Fifth is momentarily expected"
- POS-C-0076 us-5c-1d-vincent-20me - 1863-07-02 07:00 - after an hour or two of sleep by the roadside before daybreak, reached the heights southea... (R196 p.622) - "we reached the heights southeasterly of Gettysburg at about 7 a. m., J"
- POS-C-0446 us-5c - 1863-07-02 07:00 - Meade: by 7 a.m. the Second and Fifth Corps and the rest of the Third had reached the grou... (R006 p.115) - "7 a. m. the Second and Fifth Corps, with the rest of the Third"
- POS-C-0006 us-5c - 1863-07-02 08:00 - reached the field of Gettysburg about 8 a.m. on July 2 by Liberty, Union Mills and Hanover (R187 p.592) - "via Liberty, Union Mills; Hanover, &c., about 8 a. m."
- POS-C-0023 us-5c-1d - 1863-07-02 (about 7 o'clock in the morning) - the division reached Gettysburg about 7 a.m. on July 2 (OCR "Jidy 3") (R189 p.600) - "the division reached Gettysburg at about 7 o'clock in the morning of J"

**G09** passed through Littlestown at 8 a.m. July 2, a march of nearly 34 mile...
- POS-C-0289 us-6c-3d-wheaton - 1863-07-02 08:00 - passed through Littlestown at 8 a.m. July 2, a march of nearly 34 miles in seventeen hours... (R234 p.684) - "At 8 a. m. of July 2, passed through Littlestown, Pa."
- POS-C-0314 us-6c-art-3ny - 1863-07-02 12:00 - 3rd NY battery (Harn) left near Manchester about 8 p.m. July 1 and passed through Littlest... (R240 p.692) - "passed through Littlestown, Pa., about noon of the 2d of July"
- POS-C-0316 us-6c-art-1ric - 1863-07-02 15:00 - Waterman's Battery C 1st RI parked near Gettysburg at 3 p.m. July 2 (R241 p.693) - "at 3 p. m. on the 2d instant, parked near Gettysburg, Pa."
- POS-C-0319 us-6c-art-1rig - 1863-07-02 16:00 - Battery G 1st RI crossed the state line at sunrise, passed Littlestown, arrived Gettysburg... (R242 p.695) - "arrived at Gettysburg at 4 p. m."
- POS-C-0310 us-6c-art-1ny - 1863-07-02 22:00 - Cowan's 1st NY battery left camp near Manchester at 9 p.m. July 1 and arrived near the fie... (R239 p.690) - "I arrived near the battle-field of Gettysburg at 10 p. m. the 2d"

**G10** Crawford's division marched toward Gettysburg on a corps order receive...
- POS-C-0166 us-5c-3d - 1863-07-02 12:00 - Crawford's division marched toward Gettysburg on a corps order received at daylight, arriv... (R218 p.653) - "by noon had arrived at the position occupied by the First and Second D"
- POS-C-0175 us-5c-3d-mccandless - 1863-07-02 (about 1 p. m.) - brigade arrived on the field about 1 p.m. (printed "3d instant"; the narrative is of the 2... (R219 p.657) - "the command arrived on the field about 1 p. m. of the 3d instant"

**G11** Sykes summoned to Meade at 3 p.m.; as the enemy attacked on the left h...
- POS-C-0167 us-5c-3d - 1863-07-02 14:00 - order to form at once and proceed toward the left flank; the First Division, which it was ... (R218 p.653) - "At 2 o'clock an order reached me to form my command at once"
- POS-C-0095 us-5c-1d-vincent-83pa - 1863-07-02 14:30 - 83rd Pennsylvania ordered into position at the brigade's extreme left, behind rocks and st... (R201 p.~632 (632-633)*) - "At about 2. .30 p. m. was ordered into position on our extreme left"
- POS-C-0008 us-5c - 1863-07-02 15:00 - Sykes summoned to Meade at 3 p.m.; as the enemy attacked on the left he was ordered to thr... (R187 p.592) - "At 3 p. m. General Meade sent for me"
- POS-C-0096 us-5c-1d-vincent-83pa - 1863-07-02 15:15 - enemy attack on the 83rd Pennsylvania at 3.15 p.m., lively until nearly 6 p.m. (R201 p.~632 (632-633)*) - "At 3.15 p. m. the enemy advanced and engaged my skirmishers"
- POS-C-0065 us-5c-1d-vincent - 1863-07-02 16:00 - the brigade, under the late Colonel Vincent, detached from the division and ordered into p... (R195 p.616) - "ordered into position at about 4 p. m. of the 2d instant"
- POS-C-0125 us-5c-2d-day-4us - 1863-07-02 16:00 - moved to the front at 4 p.m. into line of battle below the crest of a slight eminence; aft... (R206 p.639) - "We lay on our arms here until 4 p. m."
- POS-C-0134 us-5c-2d-day-14us - 1863-07-02 16:00 - 14th US ordered to the front at 4 p.m. as support to the Second Brigade, lay down on a cre... (R210 p.~643 (643-644)*) - "where it rested until 4 p. m., when it was ordered to the front"
- POS-C-0156 us-5c-2d-weed - 1863-07-02 16:00 - after changing position several times in the early morning, the brigade lay with the divis... (R217 p.651) - "remained idle, lying by their arms until about 4 p. m."
- POS-C-0035 us-5c-1d-tilton - 1863-07-02 16:30 - brigade advanced to the front and was placed, by order of General Barnes, in order of batt... (R192 p.607) - "At 4.30 p. m. on July 2, the brigade, under my command, advanced"
- POS-C-0114 us-5c-2d-day - 1863-07-02 17:00 - First Brigade, Second Division moved to the front; took position at the foot of a hill, th... (R208 p.640) - "was moved to the front about 5 p. m. on the 2d instant"
- POS-C-0140 us-5c-2d-burbank - 1863-07-02 17:00 - at about 5 p.m. under heavy cannonading ordered forward; moved left, then at double-quick ... (R211 p.~644 (643-644)*) - "There it remained until about 5 p. m."
- POS-C-0148 us-5c-2d-burbank-7us - 1863-07-02 17:30 - 7th US formed in line, advanced against the enemy down the hill and across an open field, ... (R213 p.647) - "The regiment formed in line of battle on Rock Hill [Round Top]"
- POS-C-0154 us-5c-2d-burbank-17us - 1863-07-02 18:00 - 17th US formed the left of the brigade line and went into action at 6 p.m., engaged about ... (R216 p.650) - "went into pction at 6 p. m."
- POS-C-0026 us-5c-1d - 1863-07-02 (between 4 and 6 o'clock in the after - orders from Sykes to move toward the left and front (R189 p.600) - "Between 4 and 6 o'clock in the afternoon, orders were received from Ge"
- POS-C-0078 us-5c-1d-vincent-20me - 1863-07-02 (near 4 p. m.) - the division moved rapidly toward the firing; the brigade took a farm road crossing Plum R... (R196 p.622) - "Somewhere near 4 p. m. a sharp cannonade, at some distance to our left"
- POS-C-0176 us-5c-3d-mccandless - 1863-07-02 (at 5 p. m.) - brigade assigned a position at the left; naturally strong ground (R219 p.657) - "at 5 p. m. was assigned a position near the left"

**G12** McGilvery with two batteries (15th NY and C&F Pa.) ordered to report t...
- POS-C-0333 us-art-reserve - 1863-07-02 15:30 - McGilvery with two batteries (15th NY and C&F Pa.) ordered to report to Sickles at 3.30 p.... (R315 p.872) - "At 3.30 p. m., pursuant to instructions received, I ordered Major McGi"
- POS-C-0361 us-art-reserve-mcgilvery - 1863-07-02 15:30 - McGilvery ordered to report to Sickles with one light 12-pounder and one rifled battery; 5... (R318 p.881) - "at about 3.30 p. m. on July 2, 1 received an order"
- POS-C-0369 us-art-reserve-mcgilvery-5ma - 1863-07-02 16:00 - 5th Mass. ordered into action at 4 o'clock; retired about 1,000 yards after the lines gave... (R319 p.885) - "took position on the right of Captain Bigelow and left of Captain Hart"
- POS-C-0373 us-art-reserve-mcgilvery-9ma - 1863-07-02 16:00 - 9th Mass. ordered to the left; went in battery in line with Third Corps batteries on the e... (R320 p.886) - "Remained in park until 4 p. m., when ordered by Lieutenant-Colonel McG"
- POS-C-0379 us-art-reserve-mcgilvery-15ny - 1863-07-02 16:30 - 15th NY ordered to take position in the peach orchard at 4.30 p.m.; fired on a battery abo... (R322 p.889) - "in a peach orchard on the left and center at 4.30 p. m."

**G13** Weir's Battery C 5th US took position by Hancock's order about 4 o'clo...
- POS-C-0354 us-art-reserve-ransom-5usc - 1863-07-02 16:00 - Weir's Battery C 5th US took position by Hancock's order about 4 o'clock, opened with soli... (R317 p.880) - "to take up a position about 500 yards to the right and front"
- POS-C-0357 us-art-reserve-ransom - 1863-07-02 (when the action became general (July - Turnbull's (F and K, 3rd US) and Ransom's (C, 5th US) batteries ordered forward to General... (R315 p.873) - "were ordered forward to General Humphreys"

**G14** Shaler's brigade formed in line of battle on the left, in rear of the ...
- POS-C-0267 us-6c-3d-shaler - 1863-07-02 19:00 - Shaler's brigade formed in line of battle on the left, in rear of the Second Brigade, by d... (R232 p.680) - "in line of battle on the left of the position held by the army"
- POS-C-0278 us-6c-3d-shaler - 1863-07-02 () - Sedgwick (Aug 8): Shaler in reserve near the left centre July 2; later "also ordered to th... (R223 p.663) - "Shaler's brigade, of Wheaton's division, was held in reserve near the "
- POS-C-0280 us-6c-3d-wheaton - 1863-07-02 (since the evening of July 2) - Sedgwick's Nov 21 endorsement: Wheaton's brigade remained in the position where placed on ... (R232 p.682) - "brigade remained in the position in which it was placed"
- POS-C-0283 us-6c-3d-eustis - 1863-07-02 (night of July 2) - 2nd Rhode Island (of the Second Brigade) put in position on the extreme left on the aftern... (R233 p.683) - "on the extreme left, and lay on our arms all night"
- POS-C-0268 us-6c-3d-shaler - 1863-07-03 08:00 - Shaler reported to Geary (XII Corps) at 8 a.m. July 3 and took a sheltered position behind... (R232 p.681) - "I reported with my brigade to Brigadier-General Geary, commanding Seco"
- POS-C-0269 us-6c-3d-shaler - 1863-07-03 08:45 - Geary: Shaler's First Brigade, Third Division reported at 8.45 and was posted as a reserve (R293 p.829) - "reported at 8.45o'clock, and was posted as a reserve"
- POS-C-0279 us-6c-3d-shaler - 1863-07-03 (July 3 morning (Shaler, Nov 20)) - Shaler's Nov 20 letter asks for a correction: Wheaton's brigade was not sent to the Twelft... (R232 p.681) - "The First Brigade, and the First alone, was directed, and did report"

**G15** at Rice's order the regiment advanced in extended order and seized the...
- POS-C-0081 us-5c-1d-vincent-20me - 1863-07-02 21:00 - at Rice's order the regiment advanced in extended order and seized the crest of Great Roun... (R196 p.625) - "the little handful of 200 men pressed up the mountain side"
- POS-C-0187 us-5c-3d-fisher - 1863-07-02 22:00 - Fisher took the 5th PA Res. (Dare), the 12th PA Res. (Hardin) and the 20th Maine and went ... (R220 p.658) - "and at 10 p. m. ascended the hill"

**G16** the Fifth Corps artillery entered the field: D 5th US, C Mass., I 5th ...
- POS-C-0207 us-5c-art-1ohl - 1863-07-02 08:00 - Battery L, 1st Ohio went into position about 8 a.m. right of the Baltimore pike (skirmish ... (R222 p.662) - "went into position about 8 a. m. on the morning of the 2d"
- POS-C-0195 us-5c-art - 1863-07-02 (between 4 and 5 p. m.) - the Fifth Corps artillery entered the field: D 5th US, C Mass., I 5th US behind the First ... (R221 p.659) - "The artillery entered the field between 4 and 5 p. m."
- POS-C-0497 us-5c-art - 1863-07-02 (between 4 and 5 p. m.) - Hunt: the Fifth Corps artillery (Hazlett, Walcott, Watson with the First Division; Gibbs a... (R028 p.236) - "of the Fifth Corps arrived on the field between 4 and 5 p. m."

**G17** VI Corps reached the field on the afternoon of July 2  [register: C-022]
- POS-C-0304 us-6c - 1863-07-01 23:00 - Butterfield to Sedgwick: in case the movement has not commenced, move toward Gettysburg by... (P3-D0985 p.469) - "to move up toward Gettysburg by Littlestown, as a better and clearer r"
- POS-C-0499 us-6c - 1863-07-01 (July 2, 6.15 a. m. (reporting the pr - S. Williams: Newton reports Sedgwick was on the way to Taneytown with him when he got the ... (P3-D2099 p.~1086 (1086-1087)*) - "General Sedgwick was on the way with him to Taneytown"
- POS-C-0290 us-6c-3d-wheaton - 1863-07-02 14:00 - brigade halted within two miles of Cemetery Hill (R234 p.684) - "halted at 2 p. m. within 2 miles of Cemetery Hill"
- POS-C-0211 us-6c - 1863-07-02 15:00 - Meade reports the Sixth Corps arrived at 3 p.m. after a 33-mile march begun at 9 p.m. July... (R006 p.116) - "At 3 p. m. the Sixth Corps arrived, after a march of 33 miles"
- POS-C-0240 us-6c-1d-bartlett - 1863-07-02 15:30 - near Westminster the destination was changed to Gettysburg; arrived about 3.30 p.m. after ... (R227 p.673) - "its destination was changed to Gettysburg, where it arrived about 3.30"
- POS-C-0212 us-6c - 1863-07-02 16:00 - Wright: the corps was pushed on without halting except for a few moments each hour to Gett... (R224 p.665) - "where it arrived about 4 p. m."
- POS-C-0233 us-6c-1d-torbert - 1863-07-02 16:00 - brigade arrived near the battle-field by 4 p.m., rested about two hours, then ordered to t... (R225 p.~668 (667-668)*) - "we made it by 4 p. m. on the 2d"
- POS-C-0291 us-6c-3d-wheaton - 1863-07-02 16:30 - brigade hastily marched to the left; having the advance, formed the first line of the Thir... (R234 p.684) - "we were hastily marched forward and to the left of Rocky Hill [Round T"
- POS-C-0221 us-6c - 1863-07-02 17:00 - Wheaton's and Eustis' brigades (Third Division) and Bartlett's brigade (First Division) we... (R223 p.663) - "went into action about 5 p. m. on the left center"
- POS-C-0242 us-6c-1d-bartlett - 1863-07-02 17:00 - Bartlett: arrived a little after 5 p.m., formed in two lines as a support; the Third Briga... (R226 p.671) - "The brigade arrived on the field a little after 5 p. m."
- POS-C-0254 us-6c-2d - 1863-07-02 17:00 - Howe: division reached the field at 5 p.m. (R229 p.675) - "reached the field at Gettysburg at 5 p. m."
- POS-C-0210 us-6c - 1863-07-02 (on the afternoon of July 2) - VI Corps reached the field on the afternoon of July 2 (R223 p.663) - "arrived on the field of Gettysburg on the afternoon of July 2"
- POS-C-0214 us-6c - 1863-07-02 (during the night of July 1-2) - after crossing the Baltimore and Gettysburg pike the corps got new orders to go by rapid m... (R224 p.665) - "some time after crossing the Baltimore and Gettysburg pike, other orde"
- POS-C-0248 us-6c-1d-russell - 1863-07-02 (on the evening of July 2) - Russell's brigade reached Gettysburg on the evening of July 2 (R228 p.674) - "This brigade reached Gettysburg on the evening of July 2."
- POS-C-0288 us-6c-3d-wheaton - 1863-07-02 (night of July 1-2) - after a mile beyond the pike the brigades were countermarched to the pike and went on in t... (R234 p.684) - "were countermarched to the pike, and continued on in the direction of "

**G18** Hart: Gen. Hunt ordered him to a position on the left of the peach orc...
- POS-C-0380 us-art-reserve-mcgilvery-15ny - 1863-07-02 (July 2) - Hart: Gen. Hunt ordered him to a position on the left of the peach orchard; McGilvery poin... (R321 p.887) - "ordered me to take a position on the left of the peach orchard"
- POS-C-0381 us-art-reserve-mcgilvery - 1863-07-02 (July 2, after 3.30 p. m.) - McGilvery placed Hart's 15th NY in a peach orchard on the right of the New Jersey battery (R318 p.881) - "peach orchard on the right and a little in front of the"

**G19** Gibbon (letter of March 1864 printed in Meade's report): a council of ...  [register: C-024]
- POS-C-0451 us-aop-hq - 1863-07-02 (on the evening of the 2d July) - Gibbon (letter of March 1864 printed in Meade's report): a council of war was held at Mead... (R006 p.126) - "council of war held at General Meade's headquarters"
- POS-C-0452 us-aop-hq - 1863-07-02 (on the night of the 2d and 3d of Jul - Sykes (letter of Mar 10, 1864, printed in Meade's report): present at a meeting of Meade a... (R006 p.124) - "present at a meeting on the night of the 2d and 3d of July"

**G20** Tyler: the Confederate cannonade began about 12 o'clock; then reserve ...
- POS-C-0426 us-art-reserve-fitzhugh-1nyg - 1863-07-03 10:00 - Ames: remained near the Frederick and Gettysburg pike until about 10 a.m., when the cannon... (R334 p.901) - "about 10 a. m., when the cannonading from the rebel lines commenced"
- POS-C-0422 us-art-reserve-fitzhugh-6me - 1863-07-03 11:00 - Dow: the cannonade began about 11 o'clock at a signal of one gun; fire lasted about an hou... (R331 p.898) - "when, at a signal of one gun, the whole rebel line opened"
- POS-C-0341 us-art-reserve - 1863-07-03 12:00 - Tyler: the Confederate cannonade began about 12 o'clock; then reserve park and train moved... (R315 p.874) - "Everything was moderately quiet until about 12 o'clock"
- POS-C-0367 us-art-reserve-mcgilvery - 1863-07-03 12:30 - McGilvery: the Confederate cannonade began about 12.30, "at least one hundred and forty gu... (R318 p.883) - "At about 12.30 o'clock the enemy opened a terrific fire upon our lines"
- POS-C-0462 us-aop-hq - 1863-07-03 13:00 - Meade: the enemy opened with over 125 guns at 1 p.m. July 3 against the centre and left; c... (R006 p.117) - "when the enemy opened from over one hundred and twenty-five guns"
- POS-C-0463 us-aop-hq - 1863-07-03 13:00 - Hunt was on the top of Round Top with Lt. Rittenhouse when the Confederate cannonade opene... (R028 p.239) - "when the enemy opened, at about 1 p. m., along his whole right"
- POS-C-0464 us-5c - 1863-07-03 13:00 - Sykes: at 1 p.m. the enemy commenced a furious cannonade from more than one hundred guns, ... (R187 p.593) - "At 1 p. m. the enemy commenced"
- POS-C-0465 us-art-reserve-mcgilvery-5ma - 1863-07-03 13:00 - Phillips: about 1 o'clock the enemy opened from a long line of batteries, kept up for an h... (R319 p.885) - "About 1 o'clock the enemy opened a heavy fire from a long line"
- POS-C-0398 us-art-reserve-taft-5ny - 1863-07-03 13:30 - Taft: the cannonade reopened about 1.30 p.m.; one gun burst; battery fired until about 6 p... (R325 p.891) - "The enemy opened fire again about 1.30 p. m."
- POS-C-0403 us-art-reserve-huntington-1nh - 1863-07-03 13:30 - Edgell: the cannonade began about 1.30 p.m. (R326 p.892) - "the enemy opened a rapid artillery fire on our center and left"
- POS-C-0466 us-aop-hq - 1863-07-03 14:00 - Gillett (ordnance officer, Artillery Reserve): about 2 p.m. heavy artillery fire on that p... (R316 p.~878 (877-878)*) - "About 2 p. m. the enemy commenced a heavy artillery fire"
- POS-C-0386 us-art-reserve-mcgilvery-15ny - 1863-07-03 15:00 - McMahon: the Confederate cannonade began at 3 p.m.; battery returned fire about 4 p.m. by ... (R322 p.889) - "At 3 p. m. the rebels commenced a heavy firing"

**G21** Fitzhugh put K 1st NY and A 1st NJ in position at 1 p.m. July 3 by Hun...
- POS-C-0416 us-art-reserve-fitzhugh-1nyk - 1863-07-03 13:00 - Fitzhugh put K 1st NY and A 1st NJ in position at 1 p.m. July 3 by Hunt's order; fired on ... (R330 p.896) - "by order of General Hunt, I put them in position near the stone fence"
- POS-C-0417 us-art-reserve-fitzhugh-1nj - 1863-07-03 15:00 - Parsons: A 1st NJ moved to the front on Hunt's order about 3 p.m. July 3; opened with case... (R333 p.899) - "about 3 p. m., I received orders from General Hunt to move the battery"

**G22** by direction of Wheaton the brigade was moved, under a terrific fire o...
- POS-C-0276 us-6c-3d-shaler - 1863-07-03 14:00 - Col. Cobham (Geary's Second Division, XII Corps): about 2 p.m. his brigade retook the brea... (R303 p.849) - "About 2 p. m. the brigade again took possession of the breastworks"
- POS-C-0275 us-6c-3d-shaler - 1863-07-03 15:30 - by direction of Wheaton the brigade was moved, under a terrific fire of artillery, to repo... (R232 p.681) - "under a terrific fire of artillery, to report to General Newton"

**G23** Battery A Mass. (McCartney) ordered into position near the cemetery; t...
- POS-C-0402 us-art-reserve-huntington-1nh - 1863-07-03 14:30 - 1st NH returned to its old position on Cemetery Hill at 2.30 p.m. relieving Huntington's b... (R326 p.893) - "I was ordered to take up my old position on Cemetery Hill"
- POS-C-0308 us-6c-art-1maa - 1863-07-03 16:00 - Battery A Mass. (McCartney) ordered into position near the cemetery; the enemy was already... (R238 p.689) - "ordered into position near the cemetery, on the left and rear of Getty"
- POS-C-0405 us-art-reserve-huntington-1ohh - 1863-07-03 (after the close of the battle of Jul - Norton: H 1st Ohio relieved after the close of the battle of Friday (July 3) and went to t... (R327 p.894) - "the battery was relieved and went to the rear"

**G24** Bartlett with Nevin's brigade as second line advanced with Crawford's ...
- POS-C-0244 us-6c-1d-bartlett - 1863-07-03 17:00 - Bartlett with Nevin's brigade as second line advanced with Crawford's Reserves; recalled a... (R226 p.671) - "About 5 p. m. I was ordered by Major-General Sedgwick to cooperate"
- POS-C-0294 us-6c-3d-wheaton - 1863-07-03 18:00 - 62nd NY and 139th Pa. took an active part; recaptured a Napoleon gun and three caissons (R234 p.685) - "orders were received to support a reconnaissance of General Crawford t"

**G25** the 18th Massachusetts (Col. Hayes) relieved the 44th New York on the ...
- POS-C-0071 us-5c-1d-vincent - 1863-07-03 09:00 - relieved at about 9 a.m. by the First Brigade and the 9th Massachusetts of the Second Brig... (R195 p.621) - "until about 9 a. m., when we were relieved by the First Brigade"
- POS-C-0098 us-5c-1d-vincent-83pa - 1863-07-03 10:00 - relieved at 10 a.m. by a regiment of the Pennsylvania Reserves; rejoined the brigade masse... (R201 p.~632 (632-633)*) - "Remained here until 10 a. m., when, being relieved by a regiment"
- POS-C-0083 us-5c-1d-vincent-20me - 1863-07-03 12:00 - withdrawn from the Round Top crest to the brigade's new line (R196 p.626) - "About noon on the 3d of July, we were withdrawn"
- POS-C-0044 us-5c-1d-tilton-18ma - 1863-07-03 (the next morning about 8 a. m. (July - the 18th Massachusetts (Col. Hayes) relieved the 44th New York on the position on Round To... (R200 p.~631 (630-631)*) - "relieved by Colonel Hayes, Eighteenth Massachusetts"
- POS-C-0069 us-5c-1d-vincent - 1863-07-03 (forenoon of July 3) - relieved by the First Brigade, then ordered to the centre of the line (R195 p.~619 (618-619)*) - "relieved during the forenoon of the 3d instant by the First Brigade"
- POS-C-0094 us-5c-1d-vincent-44ny - 1863-07-03 (next morning about 8 a. m.) - held position all night; relieved by Col. Hayes, 18th Mass., about 8 a.m. on July 3, then ... (R200 p.~630 (630-631)*) - "We remained in our position until the next morning about 8 a. m."

**G26** 5th Mass. position July 3; guns protected by a slight parapet; remaine...
- POS-C-0390 us-art-reserve-mcgilvery-pac - 1863-07-03 05:00 - Thompson: July 3 position with Battery K 4th US on the right and Hart on the left (R323 p.890) - "was placed in position in line with Battery K, Fourth U. S. Artillery"
- POS-C-0370 us-art-reserve-mcgilvery-5ma - 1863-07-03 (At daylight on the 3d) - 5th Mass. position July 3; guns protected by a slight parapet; remained until Saturday for... (R319 p.885) - "took position to the right and rear of the position of the day before"

**G27** 15th NY ordered by McGilvery's orderly to the front early on July 3, r...
- POS-C-0384 us-art-reserve-mcgilvery-15ny - 1863-07-03 12:00 - McMahon: the 15th NY ordered to the front at noon July 3, position on the left of the ceme... (R322 p.889) - "we were ordered to proceed to the front at 12 m."
- POS-C-0383 us-art-reserve-mcgilvery-15ny - 1863-07-03 (Early on the morning of the 3d) - 15th NY ordered by McGilvery's orderly to the front early on July 3, reported to Thompson,... (R321 p.888) - "I took position accordingly"

**G28** division advanced toward Emmitsburg on the evening of July 5
- POS-C-0488 us-5c - 1863-07-05 04:30 - Sykes 4.30 a.m. July 5: troops in hand except pickets; will move as soon as pickets are re... (P3-D1091 p.530) - "My troops are all in hand, excepting the pickets"
- POS-C-0136 us-5c-2d-day-14us - 1863-07-05 16:00 - 14th US withdrew its pickets and joined the brigade on the march at 4 p.m. on July 5 (R210 p.~644 (643-644)*) - "ordered to withdraw the pickets and join the brigade on the march"
- POS-C-0072 us-5c-1d-vincent - 1863-07-05 17:00 - the brigade moved off at about 5 p.m. toward Emmitsburg, bivouacked on the road about 10 p... (R195 p.621) - "Started about 5 p. m. in direction of Emmitsburg."
- POS-C-0121 us-5c-2d-day-3us - 1863-07-05 17:00 - relieved from picket; marched at 5 p.m. about 5 miles on the Emmitsburg road and encamped (R205 p.638) - "At 5 p. m. marched about 5 miles on the Emmitsburg road and encamped."
- POS-C-0128 us-5c-2d-day-4us - 1863-07-05 17:00 - left the picket line at 5 p.m. on July 5 on the march to Emmitsburg (R206 p.639) - "we took up our line of march for Emmitsburg, Md."
- POS-C-0523 us-5c-2d-day - 1863-07-05 17:00 - 3rd US (Day's brigade) marched at 5 p.m. on July 5 about 5 miles on the Emmitsburg road an... (R205 p.638) - "At 5 p. m. marched about 5 miles on the Emmitsburg road and encamped."
- POS-C-0489 us-5c - 1863-07-05 21:30 - Sykes's camp at 9.30 p.m. July 5 on Marsh Creek on the direct Gettysburg-Emmitsburg road; ... (P3-D1122 p.~540 (539-540)*) - "My camp is on the south side of this creek, on the direct road"
- POS-C-0054 us-5c-1d-sweitzer - 1863-07-05 (the evening of the 5th) - division advanced toward Emmitsburg on the evening of July 5 (R193 p.~613 (612-613)*) - "when the division advanced toward Emmitsburg"
- POS-C-0086 us-5c-1d-vincent-20me - 1863-07-05 (on the morning of the 5th) - the regiment marched out on the Emmitsburg road on the morning of July 5 (R196 p.626) - "took up our march on the Emmitsburg road"
- POS-C-0087 us-5c-1d-vincent-20me - 1863-07-05 (July 5) - regiment moved forward on the battlefield on the morning of the 5th, held the Carolina roa... (R197 p.626) - "occupied the Carolina road during the day."

**G29** Meade to Couch dated from Army headquarters at Gettysburg, 4.40 p.m. J...
- POS-C-0458 us-aop-hq - 1863-07-06 16:40 - Meade to Couch dated from Army headquarters at Gettysburg, 4.40 p.m. July 6 (P3-D1207 p.578) - "Headquarters Army of the Potomac, Gettysburg, July 6, 1863—4.40 p. m."
- POS-C-0459 us-aop-hq - 1863-07-06 (the night of the 6th) - Ingalls: headquarters were in Frederick the night of July 6 (Meade ordered the army to con... (R024 p.222) - "The headquarters were in Frederick the night of the 6th."
- POS-C-0460 us-aop-hq - 1863-07-07 (July 7) - Itinerary: July 7 headquarters from Gettysburg to Frederick (R007 p.146) - "Headquarters Army of the Potomac moved from Gettysburg"
- POS-C-0461 us-aop-hq - 1863-07-07 (July 7) - Norton: headquarters moved to Frederick on July 7 (R017 p.203) - "July 7, the headquarters of the army moved to Frederick"

**G30** after Griffin relieved Barnes, the division moved toward Middletown, a...
- POS-C-0033 us-5c-1d - 1863-07-05 (On the day following (July 5)) - Griffin: relieved Barnes on July 4; the division left for the Potomac on July 5, reaching ... (R190 p.605) - "the division took up its line of march toward the Potomac"
- POS-C-0032 us-5c-1d - 1863-07-08 (July 8 (arrival)) - after Griffin relieved Barnes, the division moved toward Middletown, arriving July 8 (R189 p.605) - "the division moved toward Middletown, where it arrived on July 8"

Other register links not tied to a pair above: C-001 (Meade reaches Gettysburg: Meade 1 a.m. / Hunt about 2 a.m. / Howard about 3 a.m. at the cemetery gate; none supports "about 04:00"), C-003 (V Corps arrival Jul 2), C-022 (VI Corps arrival), C-024 (council of war), C-010 (III Corps advance: Meade rode out about 3 p.m.), C-028/C-029/C-030 (Jul 3 guns: Hunt 1 p.m., Meade 1 p.m.).

Cannonade onset on July 3, Union witnesses in this scope (group above): Ames about 10 a.m.; Dow about 11; Tyler about 12; McGilvery about 12.30; Hunt, Meade, Sykes, Phillips about 1 p.m.; Taft and Edgell about 1.30; Gillett about 2; McMahon 3 p.m.

## 5. Differences from `arrivals.json` (Q04 gates) - reported, nothing changed

- **Artillery Reserve, gate "date floor Jul 2 00:00"**: Tyler (R315) has Ransom's and Fitzhugh's brigades leaving Taneytown about sundown on July 1 and reporting to Gibbon at Gettysburg about 10.30 p.m. on July 1 (POS-C-0326). That is before the floor; Fitzhugh (R330) has his own arrival about 8 a.m. July 2 (POS-C-0413); Weir (R317) dates the departure from Taneytown to July 2 (POS-C-0353).
- **V Corps, gate earliest 05:00 / default 08:00**: the 2nd U.S. (Lee, R212) left a bivouac 5 miles out at about 3.30 a.m. and took position near Gettysburg (about 1 1/2 miles southeast of the town) (POS-C-0145); the 14th US (Giddings) left at 4 a.m. and the 4th US (Adams) at 4 a.m. and marched 3 miles. These are earlier on the map than the gate's earliest 05:00 for the corps head. Williams at 6.15 a.m. says the corps was not yet up (POS-C-0445).
- **VI Corps, gate earliest 14:00, main body 17:00**: Meade has the Sixth Corps arriving at 3 p.m. (POS-C-0211), Nevin halted within 2 miles of Cemetery Hill at 2 p.m. (POS-C-0290), Upton arrived about 3.30 p.m. (POS-C-0240), Wright about 4 p.m. (POS-C-0212), Howe and Bartlett about 5 p.m. These are consistent with the gate; no VI Corps claim is earlier than 14:00 on the field.
- **Army headquarters, gate 00:00-04:00 (default 01:00)**: Meade 1 a.m.; Hunt about 2 a.m.; Howard about 3 a.m. at the cemetery gate; all inside the gate window. The ledger text "Jul 3: Leister house made untenable ... Meade moves to Powers Hill" is not in the OR passages read: the OR says Meade was at "General Slocum's headquarters" during the assault (Norton) and that in the evening the headquarters went to "a strip of woods on the Taneytown road"; the ledger uses neither of these names.
- **Artillery Reserve strength**: ledger 106 guns / about 2,300 men; Tyler "one hundred and eight guns" (POS-C-0347).
- **Gate for the 20th Maine "21:00 on Round Top"**: Chamberlain says 9 p.m., Fisher 10 p.m.; Rice implies the ground was in hand by 9.

## 6. OCR problems met

- Records graded `poor` in the index that contribute claims (every claim from them carries `ocr_uncertain: true`): R203 Ayres, R204 Day, R205 Sheridan (3rd US), R199 Elliott, R202 Lamont, R225 Torbert, R240 Harn, R241 Waterman, R242 Adams, R332 Rigby, R335 Ewing.
- Date digits 2/3: Barnes "morning of Jidy 3" (July 2), Bootes "morning of the 3d" (July 2), Adams "On the morning of July 3" (July 2), McCandless "1 p. m. of the 3d instant" (July 2; no longer read from the glyph), Moody "afternoon of the 3d" (July 2), Howe "left Manchester at 1 a. m. on July 3" (no t_iso after the re-check; the other brigade reports have the departure on July 1 at 9-10 p.m.), Martin "At 3 a. m. on the 8d instant" (July 3), Dow "7.80 p. m." (7.30), Cowan "On the 38th of June" (28th), Newton "July 3. - In obedience to an order ... dated July 1" (July 2). The claim date is the sense-reading and the printed form is in `when.printed` and the note.
- Hour digits: Sykes dispatch "13.30 a. m." (12.30 a.m. by sense: the text says he left Hanover at 7 p.m. and marched 9 miles), Butterfield "13.30 p. m." (12.30), Neill "Gp. m." (unreadable, no t_iso), Woodward "2. .30 p. m." (2:30), Weir "1.3( o clock", Rice "5 [p. m.J", Thompson "5 p. m. ^^ +iVo 9,1 instant", McCandless "0 p. m." (unreadable).
- Names: "Bniceville" (Bruceville), "Bonaughtoivn/Bonaughtown", "Morits Cross-Eoads" (Moritz), "Unionville" in Sweitzer (Union Mills in the other V Corps reports), "Sixteenth Massachusetts" in Conner (the 16th Michigan), "Second [Sixth?] Corps" in Rice and Lamont, "Sixth Maiiie". The dump of R227 begins "Hdqrs. 131st New York" (121st).
- Interpolated pages (the running head was lost): 45 claims carry `interpolated: true` with a page range; by record: P3-D1120 1, P3-D1122 1, P3-D2099 3, P3-D2102 1, R009 5, R133 1, R193 5, R195 4, R200 3, R201 5, R202 1, R210 4, R211 4, R225 5, R316 2.
- Part 3 segmentation: D1003 holds two letters (Butterfield to Mendell, 5 a.m., and to Sedgwick, 5.30 a.m.); D1001 holds Sykes's 12.30 a.m. dispatch and Butterfield's 2.40 a.m. letter; D0983 is indexed with Slocum as signer but is Butterfield's letter to Sedgwick (the text quoted is verified). The claims quote the text, not the index header.

## 7. Index gaps

- Part 1 contains no report for: Eustis, the Third Division VI Corps commander, Tompkins, Williston, Butler and L. Martin (VI batteries), Huntington, Ransom, Sterling, Thomas, Turnbull, Eakin/Mason, Warren, Butterfield, Patrick (operations), Hull (62nd Pa.). None is in the Part 1 contents list (378 entries) on which the index is built, so these are absences from the printed contents list, not search misses; the searches in the open-gap records confirm no passage carries their report.
- Meade's report (R006) is one composite record with about a hundred dispatches and enclosures (OR27-NOTES.md); only pp.114-127 were read (narrative, 1864 corrections, council letters). Enclosures for July 1-5 elsewhere in the record (Meade to Halleck dispatches) were not read page by page for headquarters locations.
- Part 3 has no document-level contents list; documents were found by index header search and phrase search and read directly. Hours of Part 3 documents are datelines or text hours as printed.
- Second-witness diff of the OCR (HathiTrust) is not done (OR27-NOTES.md, item 1): every digit is single-witness OCR.

## 8. Identifications made by the compiler (not in the OR text)

- Gazetteer ids were attached only where the place resolves: GZ-039 Baltimore Pike for "Baltimore and Gettysburg pike"; GZ-042 Taneytown Road; GZ-041 Emmitsburg Road; GZ-009/GZ-010 for "Round Top" where the context fixes the hill (Little Round Top where Hazlett's battery and Weed stood; Big Round Top for the crest Chamberlain took at night; Rice/Garrard use "Round Top" for both); GZ-003 Cemetery Hill; GZ-004 for "the cemetery gate"; GZ-007 The Angle for "Webb's position" (flagged in each note); GZ-014 Peach Orchard. Where the passage does not decide, `gazetteer_ref` is null and the printed phrase stands.
- Nine inferred claims carry their reasoning: Fisher's 9th and 10th Reserves by elimination (2), Taft's brigade split, Slocum's headquarters hill, Newton's "one battery from the Sixth Corps"; and, after the fidelity re-check, the footnote asterisk on 1st Conn. Heavy Batteries B and M (2; the footnote text is not in the OCR of p.168) and the left-to-right order of the 22d Mass./1st Mich./118th Pa. line (2; garbled diagram).

## 9. Fidelity re-check (full-passage read, 2026-10-20)

Every non-gap claim (524) was re-read against at least 1,200 characters on each side of the cited passage; no claim was skipped (the 14 open gaps have no cited passage). fidelity_check: passed_full_read 364, corrected 156, downgraded 4, not_rechecked 14 (the open gaps). claim_support_verified is true only for documented claims with passed_full_read or corrected (520). Details, patterns and rates: `RECHECK_C_NOTES.md`; the repairs are in `tools/bt/pos_C/fid/fid_*.py` and are applied by `positions_C_build.py`.

Verdict change: us-6c-2d-neill full -> partial (section 1). No other brigade rating rested on a claim whose clock time or date was removed.

