# Road-name concordance: period names that the repository did not hold (2026-10-22, DEC-014)

Written by `python tools/bt/roadconc/build_concordance.py` from the hand-read evidence in that script; the data is `docs/battle-theatre/app/data/road-concordance.json`. Every quotation (fewer than 15 words) was re-verified against the OR text (`tools/bt/or27_find.py --verify`) when this file was built. Nothing here is a coordinate of a unit.

## What this is, and what it is not

Many reports print a road by a name the road layer does not carry (Heidlersburg road, Middletown road, the Gettysburg road, the road from Scotland, a route by a mill). The history layer draws a unit only where a road of approach resolves to a gazetteer line (DEC-009, DEC-012), so these names kept many leaf units out of the picture (108 in the v4 audit). This table says, name by name, what the period sources show. A name that the sources settle is `resolved` with a tier; a name they do not is `unresolved` with the reason and its units stay an open gap. **No road is aliased to another by guess, and no road was traced or invented:** every resolved name is a line the gazetteer already holds inside the loaded ground, and only its crossing with the edge of the ground matters.

* Tiers: **documented** = a period map prints the name on the road, or an OR report equates the two names. **inferred** = sources of different kinds (OR text, period maps) agree on the identity and none contradicts it; the argument and the rejected alternatives are written out. **unresolved** = neither. No resolved name here is `documented`: no sheet read prints Heidlersburg or Middletown on a road, and no report equates them with a road the sheets label. That is stated, not hidden.
* Sources read (hash in the JSON, library entries in `GOVERNANCE/library/acquired.json`): Warren 1868-69 (LOC 99448794), Bachelder 1876 first-day sheet (LOC 99447491), Hopkins 1858 county map (LOC 2004629149; used for TOPOLOGY only: its georeference is grade D, 376 m leave-one-out, and no coordinate or geometry was taken from it), OR Ser. I vol. 27 (local OCR text). The OR Atlas plates are not yet acquired (`library/status.json`).

## Georeference and crossing checks

| map | transform | error |
|---|---|---|
| Warren survey 1868-69, LOC 99448794 (cw0353500.jp2, 8878 x 9845 px) | docs/basemap1863/maps/transforms/warren-1869.json | fit RMSE 13.9 m, leave-one-out 16.5 m (max 36.5 m); the sheet is 70 to 138 m out in the north-west corner (HISTORY-LAYER-NOTES DEC-011 item 10): a road there cannot be checked against the sheet to better than that; north of the town and east of the creek the sheet agrees with the roads layer to about 10 m (crossing checks below) |
| Bachelder 1876, first day, LOC 99447491 (cw0325000a.jp2) | docs/basemap1863/maps/transforms/bachelder-1876-sheet1.json (thin-plate scan to Warren px, then the Warren affine) | relative to Warren 2.4 m, absolute 16.7 m (1 sigma) |
| Hopkins, Map of Adams Co., Pennsylvania, 1858, LOC 2004629149 (la000697.jp2, 16639 x 11740 px) | docs/basemap1863/maps/transforms/hopkins-1858-county.json | leave-one-out 377 m (D (not for tracing)); TOPOLOGY ONLY: which village a road runs to and which landmark it passes (a drawn road with an owner or an institution on it); no coordinate is taken from it and no geometry is traced from it |

The crossing of a road with the edge of the loaded ground (the point where a column enters) is the gazetteer line's. It was checked against the Warren sheet by marking it on the sheet (`tools/bt/roadconc/crosscheck.py`) and reading the drawn road at 1.6x (about 1 m per pixel, reading +-3 px):

| road | gazetteer crossing | Warren px | offset from the drawn road | result | crop |
|---|---|---|---|---|---|
| Harrisburg Road (GZ-045, sigma 55 m) | -77.22763, 39.838 | [5607, 3007] | about 11 m (+-3) | the gazetteer crossing lies on the drawn road, about 11 m beside its centre line (inside the 16.5 m of the sheet) | `crossing_harrisburg_road.jpg` |
| Carlisle Road (GZ-046, sigma 35 m) | -77.23113, 39.838 | [5304, 3019] | about 1 m (+-3) | the gazetteer crossing lies on the drawn road (the label CARLISLE ROAD stands on it 1.5 km farther north) | `crossing_carlisle_road.jpg` |
| Taneytown Road (GZ-042, sigma 40 m) | -77.23, 39.783 | [5548, 9034] | about 12 m (+-3) | the gazetteer crossing lies on the drawn road, about 12 m beside its centre line | `crossing_taneytown_road.jpg` |
| Chambersburg Pike (GZ-040, sigma 48 m) | -77.25208, 39.838 | [3492, 3093] | not used | NOT USED AS A CHECK: the drawn pike lies about 110 m from the gazetteer crossing, which is the 70 to 138 m by which the Warren sheet is out in the north-west corner (DEC-011 item 10), not a measured error of the road; the modern centreline of the roads layer (sigma 48 m) is kept | `crossing_chambersburg_pike_nw_corner.jpg` |
| Hanover Road (GZ-043, sigma 57 m) | -77.2, 39.82519 | [8032, 4311] | not used | NOT CHECKED: the road is under the wood hachure at the crossing and cannot be read; the gazetteer crossing (sigma 57 m) is kept | `crossing_hanover_road_under_wood.jpg` |

Crops are in `docs/battle-theatre/terrain/roadconc/crops/` (JPEG, from the scans in `tmp/`, recipes in `tools/bt/roadconc/crop.py`, `rot.py`, `overlay.py`, `crosscheck.py`).

## The names

| id | period name | status | tier | resolves to | leaf units under the units whose claims print it |
|---|---|---|---|---|---|
| RC-01 | Heidlersburg road | resolved | inferred | Harrisburg Road (GZ-045) | 19 |
| RC-02 | Middletown road | resolved | inferred | Carlisle Road (GZ-046) | 23 |
| RC-03 | the Gettysburg road (Kershaw, from Fayetteville) | resolved | inferred | Chambersburg Pike (GZ-040) | 6 |
| RC-04 | the Gettysburg road (other passages) | unresolved | unresolved | - | 7 |
| RC-05 | the road from Scotland to Gettysburg (Johnson's division) | unresolved | unresolved | - | 23 |
| RC-06 | Gettysburg and York Railroad | resolved_name_no_approach | inferred | a railroad line (no approach) | 23 |
| RC-07 | the route by Horner's Mill (Eleventh Corps) | unresolved | unresolved | - | 23 |
| RC-08 | the Fairfield road | unresolved | unresolved | - | 25 |
| RC-09 | the Waynesborough pike / the road to Emmitsburg of 30 June | unresolved | unresolved | - | 43 |

### RC-01 Heidlersburg road

Variants printed: “the Heidlersburg road”, “Heidlersburg pike”, “the Heidlersburg pike”, “the direct road from Heidlersburg to Gettysburg”. Status **resolved**, tier **inferred**.

Scope: the road from Heidlersburg that enters the field from the north-east: the part inside the loaded ground and the 2.5 km north of it where Early formed his line; farther north the road runs outside the ground and is not needed.

Resolves to **Harrisburg Road** (GZ-045; road record RD-007 (Estimated; positional_error_m 35); sigma_m = its positional error plus 20 m for the width of the way). Crossing(s) with the edge of the loaded ground: -77.22763, 39.838. Geometry: the gazetteer line (sigma 55 m); no new line.

Argument: Early marched down it and formed "across the Heidlersburg road", Hays arrived on it "within a mile and a half" of Gettysburg, Blackford deployed "2 miles from Gettysburg" with his left on the Heidlersburg pike, and Carter reports Doles, on the left of Rodes' line, massing a large force "near the Heidlersburg road" (OR). Bachelder's first-day sheet draws exactly this line (Gordon, Hays, Hoke, Smith, Jones' battalion, "Early's Division") across the road that Bachelder and Warren both label HARRISBURG ROAD, 2.4 to 2.6 km north of the borough centre (1.5 miles), and that road runs from there to the borough past the County Almshouse. Hopkins 1858 draws the road from Heidlersburg running south-west to Gettysburg and entering the borough past the "Alms Houses" on its drawn line; Warren shows the almshouse on the same road. Ewell's sentence names the Middletown road and the Heidlersburg road as two different roads in one breath, and Schurz (Eleventh Corps, whose right stood astride the Harrisburg road) feared the enemy advancing "by the Heidlersburg road" against his right. No source prints "Heidlersburg" on a road of the sheets; the identity rests on the agreement of the OR distances and positions with the drawn road, so the tier is inferred, not documented.

| evidence | where | words (verified) | what it shows |
|---|---|---|---|
| OR text | OR27-2-R470, p. 468 | “formed my line across the Heidlersburg road, with Gordon's brigade on the right” | Early: the line was formed across the road he marched in on |
| OR text | OR27-2-R472, p. 479 | “arrived with my brigade on the Heidlersburg road, within a mile and a half” | Hays: 1.5 miles from Gettysburg |
| OR text | OR27-2-R527, p. 597 | “deployed 2 miles from Gettysburg, with the left resting upon the Heidlersburg pike” | Blackford: the road at 2 miles |
| OR text | OR27-2-R470, p. 468 | “the road from my camp to Hunterstown was a very rough and circuitous one” | Early: why he did not take the Hunterstown road |
| OR text | OR27-2-R531, p. 603 | “reported a large force massing on his front and left, near the Heidlersburg road” | Carter: on Doles' left the road is near the front of Rodes' left |
| OR text | OR27-1-R253, p. 728 | “if any of the enemy's forces were advancing by the Heidlersburg road” | Schurz: the road threatens the Eleventh Corps right (north of the town, astride the Harrisburg road) |
| OR text | OR27-2-R467, p. ~444 | “by the Middletown-road, sending word to Early to advance directly on the Heidlersburg road” | Ewell: Rodes by the Middletown road, Early by the Heidlersburg road (two roads) |
| Bachelder 1876 sheet 1 | scan px about (5800-6700, 1100-2300); scan cw0325000a.jp2; crop `bachelder1_early_across_harrisburg_road.jpg` | - | Early's division line (GORDON, HAYS, HOKE, SMITH, JONES' BATT.) drawn across the road labelled HARRISBURG ROAD |
| Warren 1868-69 | Warren px (6200-6500, 1500-2000) and (5600-5900, 2300-2800); scan cw0353500.jp2; crop `warren_carlisle_road_almshouse.jpg` | - | HARRISBURG ROAD printed along the north-north-east road; COUNTY ALMSHOUSE beside it 1.1 km north of the borough |
| Hopkins 1858 (county sheet) | scan px (9200,4800) Heidlersburg to (7650,7580) Alms Houses; scan la000697.jp2; crop `hopkins_heidlersburg_to_rockcreek.jpg` | - | the road from Heidlersburg runs south-west to Rock Creek and enters Gettysburg past the "Alms Houses" (labelled on the drawn road) (topology only) |

Rejected: Hunterstown Road (GZ-058): Early did not take it ("the road from my camp to Hunterstown was a very rough and circuitous one", Early p. 468) and Bachelder's sheet labels it HUNTERSTOWN ROAD and it is a separate road from the borough; Carlisle Road (GZ-046): the road of the Middletown road, Rodes' (RC-02); York Pike (GZ-044): Brown prints the York road for Jones' battalion (claim PD-2c-early-jones-05); a different road, kept as the unit's own printed road.

Claims: `PD-2c-early-06`, `PD-2c-early-02`, `PD-2c-early-hays-01`, `PD-2c-early-hoke-01`. Units: `cs-2c-early` (19 leaf units).

Entry: where the Harrisburg Road crosses the north edge of the loaded ground (crossing check: on the drawn road within 11 m).

### RC-02 Middletown road

Variants printed: “the Middletown road”, “Middletown road”. Status **resolved**, tier **inferred**.

Scope: the road by which Rodes' division came down to the field from Middletown (Biglerville): the part inside the loaded ground and the 3 km north of it; the roads layer names it Carlisle Road, Warren labels it CARLISLE ROAD near the borough and NEWVILLE ROAD from the farm of W. Ross northward, Bachelder labels it NEWVILLE ROAD.

Resolves to **Carlisle Road** (GZ-046; road record RD-008 (Estimated; positional_error_m 15); sigma_m = its positional error plus 20 m for the width of the way). Crossing(s) with the edge of the loaded ground: -77.23113, 39.838. Geometry: the gazetteer line (sigma 35 m); no new line.

Argument: Rodes names two roads in one report: the Mummasburg road, "which crossed the ridge at the base of the hill I held" (Oak Hill), and the Middletown road, whose "open plain between the Middletown road and the foot of the ridge" Doles' brigade occupied. A road with a plain between it and the foot of Oak Ridge is the road east of the ridge, which on both sheets is the road labelled CARLISLE ROAD / NEWVILLE ROAD; the Mummasburg road is the one that crosses the ridge, so the Middletown road is not the Mummasburg road. Bachelder draws Doles' line (DOLES GA., 1 P.M.) across the road he labels NEWVILLE ROAD. Schurz writes of "the Middletown and Mummasburg roads" as two roads at the Eleventh Corps' right, west of which his division held the ground. Ewell and Early put Rodes on a different road from Early's Heidlersburg road (RC-01), and Lee says Rodes "arrived by the Middletown road". The roads that are left, the Harrisburg Road (Early's) and the Mummasburg Road (named separately), are excluded by those reports; the Table Rock Road joins this road 1.8 km north of the borough, north of the loaded ground. No sheet prints "Middletown" on the road and no report says "Carlisle road" for Rodes; the identity is by elimination and by the position of Doles' line, so the tier is inferred. Hopkins 1858 shows the village of Middletown about 11 km north of the borough; it was not used for geometry or for the identity.

| evidence | where | words (verified) | what it shows |
|---|---|---|---|
| OR text | OR27-2-R506, p. 553 | “the open plain between the Middletown road and the foot of the ridge” | Rodes: Doles on the plain between the road and the ridge foot |
| OR text | OR27-2-R506, p. 552 | “the Mummasburg road, which crossed the ridge at the base of the hill” | Rodes: the Mummasburg road is another road |
| OR text | OR27-1-R253, p. 729 | “of the highest importance to hold the Middletown and Mummasburg roads” | Schurz: two roads at the Eleventh Corps right |
| OR text | OR27-2-R467, p. ~444 | “by the Middletown-road, sending word to Early to advance directly on the Heidlersburg road” | Ewell: two different roads for Rodes and Early |
| OR text | OR27-2-R470, p. 468 | “General Rodes had turned off at Middletown, and was moving toward the same place” | Early: Rodes turned off at Middletown toward Gettysburg |
| Bachelder 1876 sheet 1 | scan px about (4350-5300, 1000-2100); scan cw0325000a.jp2; crop `bachelder1_newville_road_doles.jpg` | - | NEWVILLE ROAD printed along the road; Rodes' division line and DOLES GA. 1 P.M. drawn across it, W. ROSS and CHAS. YEATTS beside it |
| Warren 1868-69 | Warren px (5300, 2400-2700) CARLISLE ROAD; (4900-5000, 1000-1500) NEWVILLE ROAD; scan cw0353500.jp2; crop `warren_carlisle_road_almshouse.jpg` | - | CARLISLE ROAD along the north road from the borough past the County Almshouse and Smithy; NEWVILLE ROAD along its continuation to the north-north-west |

Rejected: Mummasburg Road (GZ-047): named separately by Rodes and by Schurz; Harrisburg Road (GZ-045): Early's road (RC-01); Table Rock Road (GZ-057): does not cross the loaded ground; it joins this road north of it.

Claims: `PD-2c-rodes-02`, `PD-2c-rodes-04`, `PD-2c-rodes-carter-03`. Units: `cs-2c-rodes` (23 leaf units).

Entry: where the Carlisle Road crosses the north edge of the loaded ground (crossing check: on the drawn road within 1 m).

### RC-03 the Gettysburg road (Kershaw, from Fayetteville)

Variants printed: “the Gettysburg road”, “Gettysburg road”. Status **resolved**, tier **inferred**.

Scope: ONE PASSAGE ONLY: Kershaw's march of 1 July, report OR27-2-R432 p. 366, claim PD-1c-mclaws-kershaw-02. The phrase "the Gettysburg road" is not a name: in other reports it is the road to Gettysburg from wherever the writer came (RC-04).

Resolves to **Chambersburg Pike** (GZ-040; road record RD-002 (Estimated; positional_error_m 28); sigma_m = its positional error plus 20 m for the width of the way). Crossing(s) with the edge of the loaded ground: -77.25208, 39.838. Geometry: the gazetteer line (sigma 48 m); no new line.

Argument: Kershaw marched to Fayetteville on 30 June; on 1 July "Anderson's and Johnson's divisions and General Ewell's wagon train occupied the road until 4 p. m., when we marched to a point on the Gettysburg road, some 2 miles from that place". It is one march on one road from Fayetteville to the point 2 miles from Gettysburg: "the road" that Anderson's division (Third Corps) had occupied is, in Hill's report, "the road from Chambersburg to Gettysburg, near the village of Fayetteville", and Wright's report of Anderson's division prints the march "along the turnpike in the direction of Gettysburg" (AP-32); the roads layer and Warren (CHAMBERSBURG ... PIKE) name that road the Chambersburg Pike. The step "the road" to "the Gettysburg road" inside one sentence of Kershaw is the only link not printed, so the tier is inferred. It does not extend to the other brigades of McLaws' division (their claims print no road).

| evidence | where | words (verified) | what it shows |
|---|---|---|---|
| OR text | OR27-2-R432, p. 366 | “marched to a point on the Gettysburg road, some 2 miles from that place” | Kershaw: the road and the point |
| OR text | OR27-2-R432, p. 366 | “Anderson's and Johnson's divisions and General Ewell's wagon train occupied the road” | Kershaw: "the road" of the same march |
| OR text | OR27-2-R432, p. 366 | “Remained in camp until the 30th, when we marched to Fayetteville” | Kershaw: the start of the march |
| OR text | OR27-2-R534, p. 606 | “encamped on the road from Chambersburg to Gettysburg, near the village of Fayetteville” | Hill: Fayetteville is on the Chambersburg to Gettysburg road |
| OR text | OR27-2-R539, p. 622 | “took up the line of march along the turnpike in the direction of Gettysburg” | Wright (Anderson's division): the road of that division is the turnpike |
| Warren 1868-69 | Warren px (2700-4000, 2400-3100); scan cw0353500.jp2; crop `warren_with_gazetteer_chambersburg_pike.jpg` | - | CHAMBERSBURG ... PIKE printed along the turnpike west of the borough (J. Leafer, St. John, E. McPherson, Dustman on it); the road leaves the sheet toward Cashtown |

Rejected: Emmitsburg Road / Taneytown Road / Baltimore Pike: roads from other directions; nothing in the report puts Kershaw on them before the field.

Claims: `PD-1c-mclaws-kershaw-02`. Units: `cs-1c-mclaws-kershaw` (6 leaf units).

Entry: where the Chambersburg Pike crosses the edge of the loaded ground (the crossing is in the north-west corner: the Warren sheet cannot check it, sigma 48 m kept).

### RC-04 the Gettysburg road (other passages)

Variants printed: “the Gettysburg road”, “the road leading to Gettysburg”, “the road to Gettysburg”. Status **unresolved**, tier **unresolved**.

Why unresolved: the phrase is not a name of a road: each writer means the road by which his own column came to Gettysburg (the Second Corps from Taneytown, the Eleventh from Emmitsburg, Kershaw from Fayetteville), and two or more roads of the gazetteer could carry it. No sheet and no report equates it with one road for these passages. The claims keep their place on the cards; none is placed by it.

Claims: `POS-B-us-2c-1d-brooke-53pa-01`, `POS-B-us-2c-2d-hall-7mi-04`, `POS-B-us-2c-2d-hall-59ny-01`, `POS-B-us-2c-2d-webb-106pa-04`, `PD-1c-mclaws-barksdale-07`. Units: `us-2c-1d-brooke-53pa`, `us-2c-2d-hall`, `us-2c-2d-webb-106pa` (7 leaf units).

### RC-05 the road from Scotland to Gettysburg (Johnson's division)

Variants printed: “the road from Scotland to Gettysburg”, “eastwardly, via Scotland, to Gettysburg”, “the road west of the mountains”, “the road from Shippensburg”. Status **unresolved**, tier **unresolved**.

Why unresolved: Scotland lies in Franklin County and on the Cumberland Valley line (Couch: "Scotland Bridge, 6 miles this side of Chambersburg", OR27-3-D1142 p. 548). Hopkins 1858 covers Adams County only and the Warren sheet ends about 5 km west of the borough, so no period map in the repository shows Scotland or the road from it. The reports say that Johnson "countermarched my division to Greenville, thence eastwardly, via Scotland, to Gettysburg" (Johnson), "marched from Carlisle by the road west of the mountains" (Lee) and that his division "came into the road from Shippensburg" (Longstreet, who does not name the road); none says which road it was on from the mountain to the field. To say the Chambersburg Pike would be a guess from the geography; the OR Atlas plates are not yet acquired (library/status.json). The 17 leaf units of Johnson's division stay an open gap.

| evidence | where | words (verified) | what it shows |
|---|---|---|---|
| OR text | OR27-2-R481, p. 503 | “countermarched my division to Greenville, thence eastwardly, via Scotland, to Gettysburg” | Johnson |
| OR text | OR27-2-R426, p. 318 | “marched from Carlisle by the road west of the mountains” | Lee |
| OR text | OR27-2-R430, p. 358 | “which came into the road from Shippensburg” | Longstreet |

Claims: `PD-2c-johnson-06`, `PD-2c-johnson-jones-42va-01`, `PD-2c-johnson-03`. Units: `cs-2c-johnson` (23 leaf units).

### RC-06 Gettysburg and York Railroad

Variants printed: “the Gettysburg and York Railroad”, “the York railroad”, “the railroad depot”. Status **resolved_name_no_approach**, tier **inferred**.

Resolves to: the Gettysburg (Hanover Junction, Hanover and Gettysburg) Railroad east of the borough; Warren prints GETTYSBURG AND HANOVER RAIL ROAD along it; it is the only railroad leaving the borough to the north-east on the sheets (the grade west of the borough was never laid).

Argument: Johnson and Steuart say that on the night of 1 July the division moved "along the Gettysburg and York Railroad" to the north-east of the town and formed there; Steuart "marched through a part of the town and along the York railroad". Both describe a move inside the field after the unit reached it by another road, so the name gives no road of approach even though it can be placed. The name is not a gazetteer road and no approach record rests on it.

Why no approach: a move after arrival, inside the field.

| evidence | where | words (verified) | what it shows |
|---|---|---|---|
| OR text | OR27-2-R481, p. 504 | “Gettysburg and York Railroad” | Johnson: the name as printed |

Claims: `PD-2c-johnson-07`, `PD-2c-johnson-steuart-01`, `PD-2c-johnson-jones-01`. Units: `cs-2c-johnson` (23 leaf units).

### RC-07 the route by Horner's Mill (Eleventh Corps)

Variants printed: “the route by Horner's Mill”, “the road past Horner's Mills”, “by way of Horner's Mills”. Status **unresolved**, tier **unresolved**.

Why unresolved: a route named by a mill, not a road. Howard says the Second and Third Divisions took it (13 miles against 10 to 11 by the direct road), his dispatch of 1 July says it was chosen 'to relieve the direct road' and that the corps would encamp 'near J. Wintz's place, near the cross-roads, about 3 miles this side of Gettysburg'; Schurz passed Horner's Mills at 10.30. Hopkins 1858 prints Horner's mill and the Horner farms about 8 km south of the borough, near Rock Creek, but no source names the roads of the route, and where it met the road layer (the Emmitsburg road at the cross-roads, or another) is not stated. No road is traced from the map for it: the route would have to be invented between the mill and the cross-roads. The leaf units of the Eleventh Corps's Second and Third Divisions and artillery stay an open gap.

| evidence | where | words (verified) | what it shows |
|---|---|---|---|
| OR text | OR27-1-R243, p. 701 | “taking the route by Horner's Mill” | Howard |
| OR text | OR27-3-D0959, p. 457 | “the balance of the corps on the road past Horner's Mills” | Howard's dispatch of 1 July |

Claims: `POS-A-11A-007`, `POS-A-CV1-038`, `POS-A-CV1-039`. Units: `us-11c-3d`, `us-11c-2d`, `us-11c-art` (23 leaf units).

### RC-08 the Fairfield road

Variants printed: “the Fairfield road”, “the road leading from Gettysburg to Fairfield”, “the road from Fairfield to Gettysburg”. Status **unresolved**, tier **unresolved**.

Why unresolved: the gazetteer holds two roads that could carry the name (RD-010 Hagerstown Road, the road by the Black Horse Tavern, and RD-015 the road from the Peach Orchard, today Millerstown Road; data/gazetteer.json ambiguous_names). Warren prints HAGERSTOWN ROAD on the first; no sheet read here prints 'Fairfield road' on either. The claims that print it describe moves inside the field on 2 July (Kershaw) and the road of Humphreys' halt (Black Horse Tavern road, AP-07, which does not cross the loaded ground), so no approach is lost by leaving it open.

Claims: `PD-1c-mclaws-kershaw-05`, `PD-1c-mclaws-kershaw-3sc-03`, `POS-B-us-3c-2d-carr-09`, `PD-2c-rodes-05`. Units: `cs-1c-mclaws-kershaw`, `us-3c-2d` (25 leaf units).

### RC-09 the Waynesborough pike / the road to Emmitsburg of 30 June

Variants printed: “the Waynesborough pike”, “the Emmitsburg turnpike at Taneytown”, “the Emmitsburg road (3 miles from Taneytown)”. Status **unresolved**, tier **unresolved**.

Why unresolved: roads of other places: the Waynesborough pike leaves Emmitsburg (Maryland) and the Taneytown to Emmitsburg road is not the Gettysburg to Emmitsburg road of the gazetteer although both are called 'the Emmitsburg road' in the reports. Neither enters the loaded ground; the ledger's gazetteer references to GZ-041 for these claims are by name only and are not used.

Claims: `POS-B-us-3c-2d-05`, `POS-B-us-3c-2d-carr-11nj-03`, `POS-C-0324`. Units: `us-3c-2d`, `us-art-reserve` (43 leaf units).

## Name forms of roads the gazetteer holds

Forms that claims print for a road the gazetteer holds under another form. No approach rests on a form unless the approach record says so in its `identification` field; this table does not change `Gazetteer.resolve`.

| printed forms | road | tier | basis |
|---|---|---|---|
| Cashtown road; Cashtown turnpike; Cashtown pike; Chambersburg-Gettysburg turnpike; the road from Chambersburg to Gettysburg; Chambersburg road | Chambersburg Pike (GZ-040) | inferred | Warren prints CHAMBERSBURG TURNPIKE along it; the road leads to Cashtown (Hill R534 p. 606: Heth to Cashtown on the road from Chambersburg to Gettysburg); the ledger references GZ-040 for these claims |
| Emmitsburg pike; the road from Emmitsburg to Gettysburg; Gettysburg and Emmitsburg road | Emmitsburg Road (GZ-041) | inferred | the same road in AP-01 and AP-02 (identification text); the ledger references GZ-041 |
| Taneytown pike; Gettysburg and Taneytown road; the road between Taneytown and Gettysburg; the road leading from Gettysburg to Taneytown | Taneytown Road (GZ-042) | inferred | the road named by its two ends; the ledger references GZ-042 (for POS-B-us-2c-20 "by inference") |
| Baltimore road; Baltimore pike; Baltimore turnpike; Baltimore and Gettysburg turnpike; Baltimore and Gettysburg pike | Baltimore Pike (GZ-039) | inferred | pike and road are one word in the reports; the ledger references GZ-039 |
| Hanover turnpike; Gettysburg and Hanover turnpike | Hanover Road (GZ-043) | inferred | the ledger references GZ-043; the railroad of the same ends is another line (RC-06) |
| Baltimore and Harrisburg road | Harrisburg Road (GZ-045) | inferred | Dilger (R267 p. 754) places his advanced section "600 yards on our right, on the Baltimore and Harrisburg road"; the ledger references GZ-045; Warren prints HARRISBURG ROAD. Name form only: no approach rests on it |
| Hunterstown road | Hunterstown Road (GZ-058) | documented | Bachelder 1876 sheet 1 prints HUNTERSTOWN ROAD along the road (crop bachelder1_hunterstown_road_label.jpg); the gazetteer already holds the name |

## Not done, and why

* No road was traced from a map: the three resolved names are lines the gazetteer holds inside the loaded ground, and the crossing is the only place a column enters. The north-east and north roads were checked against Warren at the crossing (11 m and 1 m); the pike (north-west corner) and the Hanover road (under hachure) could not be checked and keep their gazetteer sigma.
* No period map prints Heidlersburg or Middletown on a road, so RC-01 and RC-02 are inferred, not documented. The OR Atlas plates (not yet acquired) and the Bachelder tactical sheets might print them; the owner may add them to the library (see `GOVERNANCE/library/status.json`).
* The road from Scotland (Johnson, 17 leaf units) and the route by Horner's Mill (Eleventh Corps, 23 leaf units) need a period map of Franklin County or of the Emmitsburg side; the repository has none. They stay open gaps, marked on the cards.

