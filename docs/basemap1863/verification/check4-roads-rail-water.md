# Verification pass 4 of 8: roads, railroad, bridges, water and fences on the 1863 reconstruction

Independent pass. It re-derives from the committed tile pyramid (`docs/basemap1863/tiles`, z16), the committed drawn-feature layer (`docs/basemap1863/PROVENANCE-LAYER/added_features.geojson`), the NAIP 2013 base mosaic, the Warren 1868-69 sheet, the Hopkins 1858 inset, the Official Records text and the TIGER/NHD files. It does not use a builder report as evidence. This is a reconstruction, nothing here says it is 1:1 or 100 percent accurate, and this pass shows it is not.

## Result in one paragraph

The target "zero modern roads remain and zero 1863 roads missing" is **not met**. Modern road removal is good where a TIGER edge exists: 7,555 visible 30 m road segments (226.7 km, 840 of 840 listed edges) were tested and 120 of them (1.6 percent, about 3.6 km) still show a road-like line. The drawn 1863 network is rendered and mostly well connected, and 19 of 26 Official Records route statements agree with it. But three principal roads are broken where they enter the borough (Harrisburg Road, Mummasburg Road, Granite Schoolhouse Lane), the Diamond carries a drawn modern traffic circle, the Warren sheet shows dozens of roads and lanes that are neither in the 29-road catalogue nor left in the photograph (their count is estimated, not established), Stevens Run is missing through the borough, a modern reservoir stays on Marsh Creek, and only 12 percent of the mapped fence length is drawn. Positions of the drawn roads cannot be checked better than the registration of the Warren sheet, which I measured at 4 to 34 m in the central battlefield, 24 to 60 m in the town and east of the Taneytown road, and could not measure in the far east and west. Thirteen defects are listed in section 6 with a tile or UTM position; five of them fail the committed spec `tests/t0/verify-base1863-roads-rail-water.spec.mjs` (red by design).

## Method and coverage (what was and was not checked)

| Check | Coverage | Method |
|---|---|---|
| Modern road residue | 840 of 840 TIGER edges of `modern-roads-remove.json` (the 11 removal classes: 7,952 visible segments before excluding the 397 that lie on a drawn road) | NAIP 2013 and the z16 tiles resampled onto the same 1 m grid (kept-pixel correlation 0.96 to 0.99, so the grids agree); for each 30 m segment the colour contrast of the line against its flanks in NAIP and in the tile, lateral search +-5 m, controls at +-22 and +-34 m. Residual = contrast in the tile of at least 35 (the 95th percentile of controls) and at least half the NAIP contrast |
| Pavement-like linear objects, blind | 100 percent of the NAIP grid, not only listed edges | neutral-colour elongated components (length at least 45 px, width 2 to 20 px) in NAIP and in the tile |
| Drawn roads rendered in the tiles | 97 of 97 drawn road polylines (126.2 km) | same contrast test along each drawn line |
| 1863 roads on the Warren sheet that are not drawn | 100 percent of the Warren raster for the detector; 48 sites reviewed by eye (the 36 longest of the 153 candidates, plus 12 of the 24 that coincide with TIGER edges) | matched filter for a road pair (two lines 6.5 m apart with a void between), 36 orientations, hysteresis threshold, skeleton; candidates of 150 to 1,500 m with fewer than 30 percent of points within 80 m of a drawn road. Many candidates are farm boundaries drawn as double lines, so the eye review is what counts |
| Official Records routes | 26 statements read from OR Series I vol. 27 parts 1, 2 and 3 (archive.org OCR text), 24 testable | each statement turned into a test on the drawn network graph (junctions within 10 m, lengths in miles) |
| Rail | 100 percent of the 613 TIGER rail segments of the box; both drawn rail lines (12.2 km) | contrast test as above; distance of drawn lines to the modern line; visual |
| Bridges | 10 of 10 drawn, 0 of 9 undrawn fords | visual: Warren crop, NAIP crop and tile crop at each |
| Water | 5 named runs (4,700 samples at 10 m) and 3 hand-checked sites | channel contrast along the NHD flowline in the tile; Warren overlay |
| Fences | counted from `fences.geojson` and the drawn layer; 2 windows by eye | |
| Town streets | the borough block (840 m x 840 m) by eye against Warren and Hopkins | |

Not checked: 117 of 153 Warren candidates were not opened one by one; 40 of the 42 Warren cells of 1.5 km were not viewed whole (I used the detector, 2 cell views and about 15 targeted windows); the far south, east and west outside the Warren sheet (163 of 235 km2) have no 1863 source in this pass at all; z17 tiles and the phone/desktop viewer were not opened; the compass of every fence on the Warren sheet was not measured; stream courses were not compared station by station (the builder's 14 stations were not repeated).

Ground-truth limits that apply to every number below: the Warren raster is registered to 16.5 m leave-one-out (docs/basemap1863/maps). I re-tested the registration by shifting the road-pair response against 57,338 samples of the 1863-class TIGER roads in 1.5 km windows (the peak is weak: 1.2 to 2.0 times the score at zero shift): the 10 windows of the central battlefield (UTM 306-309 km E, 4407.5-4410.5 km N) peak at shifts of 4 to 34 m, the town and the ground east of the Taneytown road at 24 to 60 m (60 m at 309000 E 4411500 N, 47 m at 310000 E 4407500 N), windows east of Rock Creek at 60 to 100 m or with no clear peak, and at three stations the Baltimore Pike east of Rock Creek is more than 40 m from the road the sheet draws (W. B. Miller / J. Bushman farms, 311008 E 4408152 N; station RD-001 at 311771 E 4407589 N shows no road within 60 m). So road positions east of Rock Creek and west of Marsh Creek cannot be checked against the sheet, and the drawn roads sit on modern centrelines by construction.

## 1. Official Records routes used as ground truth (26 statements, 24 testable)

Source texts: `warofrebellion012701rootrich` (part 1), `warofrebellion272unit` (part 2), `warofrebellion012703rootrich` (part 3) on archive.org, fetched once each. Offsets are character positions in the normalised text, so the statement can be found again. Buford's report is read from the transcript at ironbrigader.com; the NPS Handbook 9 text from npshistory.com. ehistory.osu.edu answered 403 and was not tried again.

"Pass" means the drawn network agrees with the statement. Most of these are topology and length tests; because the drawn roads are the modern centrelines the length agreement mostly shows that the road is the right road, not that 1863 positions are checked.

| Id | Source (OR 27) | Statement | Test | Result |
|---|---|---|---|---|
| T01 | NPS Handbook 9 (secondary); Heth | Marsh Creek on the Chambersburg road is 4 miles from Gettysburg | road length Diamond to BR-005 | drawn 3.04 mi; the source figure is rounded and the geometry is the real pike: **not scored as a defect** |
| T02 | Buford, report | enemy pickets 4.5 miles out on the Cashtown road | drawn pike continuous to the west edge | 5.65 mi continuous: pass |
| T03 | part 1 @2595971, @1230417 (XII Corps) | Baltimore pike to Two Taverns, 5 miles | length to the Two Taverns GNIS point | 5.22 mi, node 48 m from the point: pass |
| T04 | Pleasonton, part 3 @1103295 | Hanover road, 3 miles from Gettysburg | drawn Hanover Road reaches 3 mi | 3.66 mi: pass |
| T05 | Williams, part 1 @2321031 | pike 2 miles, cross-road to the Hanover road, Hanover road to Gettysburg | pike and Hanover Road joined east of the borough | only Low Dutch Road joins them, about 3.5 mi out and 16 m short at the box edge: **partial** |
| T06 | Murchison, part 2 @1533509; Buford dispatch, part 1 @2754419 | Hunterstown road leaves the York pike | RD-022 meets RD-006 | junction at 310396 E 4411956 N: pass |
| T07 | battery report, part 2 @1562349 | Emmitsburg pike meets the Millerstown road | RD-015 meets RD-003 | one junction (RD-003, RD-014, RD-015): pass |
| T08 | Round Top signal station, part 3 @1102300 | ridge 3 miles west of the town near the Millerstown road | west end of RD-015 | 3.23 mi: pass |
| T09 | Ewell, part 2 @1391016; Early @1470306 | Early advances by the Heidlersburg (Harrisburg) road into Gettysburg | RD-007 joins the borough | south end 236 m from RD-008 and the Warren sheet draws the road running on: **FAIL** |
| T10 | Schurz, part 1 @2154823; Howard @2076486 | the road leading to Mummasburg from Gettysburg crosses the XI Corps line | RD-009 joins the Carlisle Road or a street | RD-009 is two polylines with three loose ends 76, 164 and 380 m from the next road: **FAIL** |
| T11 | Ewell, part 2 @1391016 | Rodes comes by the Middletown (Carlisle) road | RD-008 meets the Diamond node | pass |
| T12 | Lee, part 2; Rodes/Iverson @1748137 | retreat by the road to Fairfield, part of the train by Cashtown | both pikes continuous to the west edge | 9.2 and 9.1 km: pass |
| T13 | Humphreys, part 1 @1568865; Prince @1611237 | Black Horse Tavern on the Fairfield road | RD-013 meets RD-010 | two junctions at 2.6 and 3.0 mi: pass |
| T14 | McFarland, part 1 @953495 | brigade debouched about a mile SW of Gettysburg on the Hagerstown road | length to the Willoughby Run crossing (BR-011) | 1.79 mi (straight 1.54): consistent with "about a mile", not exact |
| T15 | courier, part 1 @360654 | Taneytown road is the trunk road | continuous to the south edge | 8.1 km: pass |
| T16 | Dana @980932, Wister @970162, Morrow @769313 | Emmitsburg road from the Marsh Creek bivouacs | continuous to the south edge | 5.6 mi: pass |
| T17 | Warren sheet; Sickles | Wheatfield road links the Peach Orchard and the Taneytown road | RD-014 meets RD-003 and RD-004 | pass |
| T18 | NPS lane inventory | Granite Schoolhouse Lane links the Taneytown road and the Baltimore pike | RD-016 meets RD-004 and RD-001 | east end 268 m short of the pike: **FAIL** |
| T19 | Pleasonton, part 3 | Low Dutch road links the Hanover road and the Baltimore pike | RD-023 meets RD-001 and RD-005 | joins the pike; meets the Hanover Road across a 16 m gap at the box edge: pass with caveat |
| T20 | Heth, Archer, Pettigrew | Herr Ridge Road crosses the Chambersburg pike | RD-012 meets RD-002 | two nodes 25 m apart: pass |
| T21 | XII Corps, part 1 @2531705, @2595971 | Baltimore turnpike from Two Taverns to Gettysburg | continuous to the east edge | 5.2 mi: pass |
| T22 | Early, part 2 @1470306 | Gordon on the York turnpike | RD-006 meets the Diamond | pass |
| T23 | Gen. W. F. Smith, part 2 @733871 | Newman Cut is 4 miles east of Cashtown | Cashtown is outside the box | not testable |
| T24 | Kilpatrick, part 1 @2731334 | Hunterstown by the Hunterstown road | Diamond to the NE end of RD-022 | 4.1 mi to the box edge: pass |
| T25 | Buford dispatch, part 1 @2754419 | a road runs Cashtown, Mummasburg, Hunterstown, York pike | Mummasburg and Hunterstown roads reach the north edge | link lies beyond the box: not testable |
| T26 | Schurz, part 1 @2154823 | Carlisle road runs north from the town | continuous to the north edge | 4.6 km: pass |

Tally: pass 19, fail 3 (T09, T10, T18), partial 1 (T05), source rounding 1 (T01), not testable 2 (T23, T25). The committed spec encodes T09, T10 and T18 (T4-RW-01 to 03).

## 2. Modern roads that must be gone

| Class (modern-roads-remove.json) | Visible segments not on a drawn road | Residual | Share |
|---|---:|---:|---:|
| POST_1863_STREET_OR_DRIVE | 3,063 | 48 | 1.6 % |
| RURAL_ROAD_UNDECIDED | 1,649 | 38 | 2.3 % |
| NPS_MEMORIAL_AVENUE | 967 | 11 | 1.1 % |
| EXPRESSWAY_US15 | 818 | 1 | 0.1 % |
| TOWN_STREET_UNDECIDED | 377 | 3 | 0.8 % |
| PRIVATE_DRIVE | 331 | 17 | 5.1 % |
| RAMP_OR_TURN_LANE | 179 | 1 | 0.6 % |
| DRAWN_ON_1876_SHEET | 115 | 1 | 0.9 % |
| ALLEY, PARKING_LOT_ROAD, WALKING_PATH | 56 | 0 | 0 % |
| **All removal classes** | **7,555** | **120** | **1.6 %** |

Median contrast on the removed road lines is 3 to 7 by class against 10 on random ground: the filled lines are smoother than their surroundings. Blind check: elongated pavement-like components in NAIP 1,208; in the tile 470, of which 232 not within 18 m of a drawn road. I opened the 18 largest (214 of the 232 were not opened): 14 were field, tree or stream edges or a drawn road offset by more than 18 m, 1 was the removed US 15 interchange whose bare infield remains as a tan scar, 1 a removed trailer park whose lanes reappear as tan tracks (D8) and 2 a removed airstrip and a removed bridge with their sites smoothed. Two more ghosts (a removed lot whose bays remain as pale bars, and a construction track at Kestrel Drive) came from the segment-residue clusters (D8).

Policy note: 50 rural edges (108.5 km) are classed undecided and are removed and not drawn. Where I checked them against the sheet (a double-line detector hit within 40 m) they score 12.2 percent against 10.0 percent for the same lines shifted 170 m, i.e. the sheet gives them no more support than chance, which supports removal for most; 6 candidate roads on the sheet that coincide with undecided edges are listed in section 3. The same score for the catalogued 1863 roads is only 21.6 percent against 13.4 percent, because of the registration limits above, so this statistic is weak in both directions.

## 3. 1863 roads that are missing or broken

The drawn network is 126.2 km: 29 catalogue roads and 4 lanes (119.3 km) and 48 Hopkins streets (6.9 km). All of it is rendered: the share of 30 m segments with road contrast above the control p95 is 0.82 to 1.00 on every catalogue road (lowest RD-022 0.82, RD-012 0.87, RD-026 0.88, RD-009 0.92) and on 47 of 48 Hopkins streets (HOP-S-044 0.50). Median contrast 80 to 110 against 10 on random ground.

Established by two sources (Official Records and the Warren sheet):

* **Harrisburg Road (RD-007)**: the south end of the drawn road is at 39.83699 N, 77.22837 W (UTM 309327 E 4412041 N); the Warren sheet draws the road running SW to the Carlisle Road junction at 39.83324 N, 77.23102 W. About 480 m of the road that Early's division used (OR 27(2) Early report) is neither drawn nor left in the photograph. Tiles z16 18709/24849 and 18708/24850. See `t_north2.jpg` in the working folder.
* **Mummasburg Road (RD-009)**: drawn as one long polyline from the north-west edge to 39.83808 N, 77.23558 W and one short piece (178 m) near the borough; the three loose ends are 380, 164 and 76 m from the next road and none is joined to the Carlisle Road or a street. About 500 m of road (the stretch past Penn College on the Warren sheet) is missing. Tiles 18707/24848, 18708/24849, 18708/24850.
* **Granite Schoolhouse Lane (RD-016)**: east end at 39.80481 N, 77.21789 W, 268 m short of the Baltimore Pike (tile 18710/24856, pixel 467,452).

Seen on the Warren sheet, with a modern TIGER edge on the same line that the pipeline classed as non-1863 and removed (so neither drawn nor photographed); period confirmation of each is still needed (the sheet is 1868-69):

* N-S street north of the borough at 39.83459 N, 77.22899 W, 453 m, a modern "TOWN_STREET_UNDECIDED" edge (tile 18708/24849, pixel 456,421); two further N-S roads on the Warren sheet at about 308890 E and 309275 E north of the borough are in no layer.
* M. Bushman farm lanes at 39.79035 N, 77.25295 W (tile 18704/24860, 548 m and 378 m: two E-W lane pieces, modern trail on the same line).
* J. Slyder farm lane at 39.78947 N, 77.24724 W (tile 18705/24860, 178 m).
* tree-lined lane at 39.81173 N, 77.27963 W (tile 18699/24855, pixel 344,123, 242 m).
* a diagonal road at 308413 E 4410510 N (414 m) west of Cemetery Hill, drawn by the sheet and under a modern subdivision street.

Estimate, not a count: among the 36 longest detector candidates I opened, about 20 look like road or lane pairs and about 16 like farm boundaries (a judgement from the picture; precision falls with length, from about 7 in 9 in the first 18 to about 1 in 3 in the next 18). Extrapolated to 153 candidates, roughly 25 to 35 further roads or lanes of 150 m or more are drawn on the Warren sheet and are neither in the catalogue nor left in the photograph. I did not individually check them against a second source; the catalogue itself says that 18 of 21 NPS-named lanes have no geometry. The town streets: the borough block shows 5 E-W and 4 N-S streets drawn against about 9 E-W lines on the sheet; the builder left alleys out by rule, so alley and back-lot lines are absent.

Drawn width and colour: every road is a 6.5 m unpaved ribbon (class width). The turnpikes are not wider or paved; the Hopkins inset draws the Diamond crossing about 20 m wide.

## 4. Rail, bridges, water, fences

* **Railroad**: RL-001 (6.5 km) and RL-002 (5.7 km) lie a median 3 m and 7 m (maximum 36 and 30 m) from the modern line, as the builder says they were snapped to the sheet. The modern CSX line was removed: of 613 visible 30 m segments 26 (4 percent) pass the residue test, and those lie under the drawn line. At z16 the drawn east line reads as a thin dark curve and the west grade as a thin tan line, not as a railroad bed. The depot is a structure (not tested here). The Rock Creek trestle was burned on 27 June 1863 and is absent, as it should be.
* **Bridges**: 10 of 19 catalogued crossings are drawn as a small dark deck marker; the other nine are class-rule fords or unknown crossings and are not marked. BR-005 (Marsh Creek) lies beyond the Warren sheet. BR-001, 002, 003, 006 to 008 sit on the road at the stream; none was found displaced by more than the sheet registration.
* **Streams**: courses are the 2013 channels. Channel contrast along the NHD line in the tiles: Willoughby Run 87 %, Rock Creek 87 %, Plum Run 79 %, Marsh Creek 77 %, **Stevens Run in the borough 32 %** (161 samples; NAIP 92 percent, but that is shade and roofs). The Warren sheet draws Stevens Run as an open stream around the west and north of the borough (the thick wavy line, `t_water.jpg`, `t_north2.jpg`); in the tiles that reach is smooth lawn: about 1.5 to 2.3 km missing.
* **Modern impoundment**: a long reservoir pool on Marsh Creek behind the water-works dam at 39.79873 N, 77.27767 W (tile 18700/24858, pixel 15,165) is kept, with the bridge and road removed; the Warren sheet draws a narrow creek, a mill race with a flow arrow and a small dam symbol there. A second wide pool is at 304818 E 4407977 N.
* **Fences**: 36 are drawn (7.9 km) of 392 mapped candidates (65.3 km): 12 percent by length. 356 are not drawn. Modern fences and the NPS-rebuilt fences stay in the photograph as photographed, so most fence lines in the tiles are 2013 lines, not lines of 1863; the Warren sheet shows many more (not counted).

## 5. Errors in metres

| Quantity | Value | How |
|---|---|---|
| Drawn roads to the modern centreline | 0 m | they are the centreline |
| Drawn roads to the Warren sheet, central battlefield | 4 to 34 m (window shifts of the road-pair response) | 10 windows of 1.5 km |
| Drawn roads to the Warren sheet, town and east of the Taneytown road | 24 to 60 m | 4 windows |
| Drawn roads to the Warren sheet, east of Rock Creek and far west | not measurable; one road is more than 40 m from the sheet | registration, see above |
| Warren registration, leave-one-out | 16.5 m | builder file, not repeated |
| Drawn rail to modern rail | median 3 m and 7 m, maximum 36 m | 40 samples each |
| Stated positional error per road | 15 to 35 m | catalogue; not contradicted where measurable |

## 6. Defects

| Id | Severity | Area | Repro / location |
|---|---|---|---|
| D1 | high | Harrisburg Road missing 480 m at the borough | tiles z16 18709/24849 and 18708/24850; RD-007 south end 39.83699 N, 77.22837 W; spec T4-RW-01 |
| D2 | high | Mummasburg Road in two polylines (three loose ends), about 500 m missing | tiles 18707/24848, 18708/24849, 18708/24850; RD-009; spec T4-RW-02 |
| D3 | medium | Diamond drawn as a ring road (the 2013 traffic circle, 101 m ring RD-024); Warren 1868 and Hopkins 1858 show a plain crossing | tile 18708/24850, pixel 260,402; spec T4-RW-04 |
| D4 | medium | 1863 roads and lanes seen on the Warren sheet, removed or never present: N-S street north of the borough, Bushman, Slyder, tree-lined lane, diagonal at Cemetery Hill; about 25 to 35 more estimated | locations in section 3; no spec (the sheet raster is not committed) |
| D5 | medium | Granite Schoolhouse Lane ends 268 m short of the Baltimore Pike | tile 18710/24856 px 467,452; spec T4-RW-03 |
| D6 | medium | Stevens Run missing through the borough (about 1.5 to 2.3 km) | NHD Stevens Run, 308300-309800 E 4410900-4412100 N; spec T4-RW-06 |
| D7 | low | modern water-works reservoir kept on Marsh Creek (two pools) | tile 18700/24858 px 15,165 |
| D8 | medium | pale or tan ghosts of removed pavements: trailer park (tile 18703/24862 px 225,469), campground (18707/24863 px 312,243), parking bays (18715/24847 px 343,344), US 15 interchange infield (18715/24847 px 113,52), Kestrel Drive arc (18701/24851 px 164,326) | overlaps pass 6 |
| D9 | low | 120 of 7,555 removal-class road segments (3.6 km) still show a road-like line; largest clusters at 306508 E 4414512 N (5 segments), Kestrel Drive (4), 308505 E 4405396 N (3), Presidential Circle (3), Rock Creek Ford Road (3), NPS Farm Lane (3: this one is the Spangler lane and is legitimate) | list in the report text; `bad2.pkl` in the working folder |
| D10 | medium | fences: 12 percent of mapped fence length drawn, modern fence lines stay | `fences.geojson`, drawn layer |
| D11 | low | 9 of 19 crossings (fords, unknown) are not marked; rail reads as a thin line at z16 | section 4 |
| D12 | low | tiles z11 to z15 north of 39.863 N show vertical colour streaks (outside the data box; the group masks them) | z14 mosaic, top band; z16 tile row 24842 |
| D13 | medium (method) | drawn road position cannot be verified east of Rock Creek or west of Marsh Creek: the Warren raster is off by 40 to 100 m there | section 5 |

## 7. What I could not verify

* The existence in July 1863 of any road that is only on the 1868-69 sheet; the sheet is not dated to July 1863.
* Positions of the roads against 1863 ground to better than about 34 m anywhere, and to better than 40 m east of Rock Creek.
* The viewer (Battle Studio, main map): I read tiles only.
* The roughly 114 Warren candidates I did not open, the 232 pavement-like components below the 24 largest, and every road outside the Warren sheet.
* Whether the Gettysburg Railroad grade west of the sheet existed as drawn (RL-002W is unknown in the catalogue and is not drawn).
* Stevens Run's 1863 course and whether the modern water-works pool existed in any form in 1863.

## 8. Reproduce

Working folder `tmp/b1863/check4/` (not committed, caches and arrays): `common.py` (tile mosaic), `prep.py` (NAIP 2013), `edges.py` (TIGER edges with classes), `resid.py` and `run_resid.py` (residue test), `cand.py`, `cand2.py` (Warren road-pair detector), `net.py` and `routes.py` (graph and the 26 route tests, results in `route_tests.json`), `regcheck.py` (Warren registration), `pav.py` (blind pavement test), `win.py`, `cells.py`, `stations.py` (viewers). Official Records text in `or/`. Python 3.11 with numpy, pillow, opencv, scipy, scikit-image, shapely, pyproj, networkx, rasterio.

The committed spec: `node tests/t0/verify-base1863-roads-rail-water.spec.mjs`. Current result: 1 pass (guard), 5 fail (T4-RW-01, 02, 03, 04, 06).
