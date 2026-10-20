# Check 5 of 8: rephotography of the 1863 reconstruction

Independent pass, 2026-10-19. Method: take the July 1863 photographs of the battlefield (Library of Congress, public domain), find where the camera stood, render the reconstruction (3DEP relief with the shipped tiles draped, a pinhole camera) from there, and compare the two pictures: terrain silhouette, tree lines, fences, buildings, roads, crops, boulders. Nothing in the builders' reports was trusted; every number below comes from a command run in this pass (scripts in `check5/scripts/`, evidence in `check5/`).

Failing tests: `tests/t0/verify-base1863-rephotography.spec.mjs` (5 of 6 red today; R5-05, the terrain check, passes). Numbers: `check5/results.json`.

## Verdict

The relief matches the photographs (the Big Round Top silhouette from Little Round Top reproduces to 0.88 degrees rms). The 1863 content of the picture does not match the photographs in five ways: (1) the **Devil's Den boulder field is smoothed** (the catalogue's own boulder polygon says "keep modern ground texture", yet 34 percent of its pixels are replaced and 51 to 59 percent of the rock texture is gone), (2) **no fence or wall is drawn within 213 m of any camera**, while eight photographs show fences or stone walls within 100 m, (3) **photographed outbuildings are missing** (Trostle log hog pen, a pavilion at the Evergreen gatehouse, outbuildings at the Leister house), (4) **modern red tile roofs survive 100 m from the Thompson house** (the Lee headquarters), and (5) at the sites of the photographs **30 to 93 percent of the ground in view is synthetic fill**, which cannot carry the boulders, stones and ruts the photographs show.

What this pass cannot say: where exactly most cameras stood. No open source gives camera coordinates (details below), so every position is my estimate. Of 12 photographs rendered, 1 has a tier B pose, 6 tier C and 5 tier D (pose not resolved, shown but no match or mismatch claimed). Seven more photographs were examined without a render. The view cones of the 12 renders to 150 m cover 9.7 ha, 0.04 percent of the 235 km2 box (0.7 percent out to 600 m). This is a sample, not a survey.

One finding was withdrawn during the pass because it depended on the camera position: the canopy the reconstruction keeps on Little Round Top looked like a contradiction of the two photographs from the Little Round Top crest (63 percent canopy in the view from my first position), but a position grid showed that positions equally consistent with the Big Round Top silhouette give anything from 0 to 68 percent, so the photographs cannot decide it (see C03 and C03b). Findings that rest on map content rather than on the camera position (the boulders, the red roofs, the missing fence layer, the catalogue gaps) were not affected.

Nothing here claims the reconstruction is, or is not, "1:1". It is a reconstruction, and the photographs show where it differs.

## Method

**Photographs.** 19 candidates, chosen from the Library of Congress Civil War photograph collection (`loc.gov/pictures/search`, item JSON, large JPEG, 4 s between requests, user agent naming the research purpose): O'Sullivan, Gardner, Tyson and unnamed July 1863 views with a recognisable site. Public domain ("No known restrictions on publication", LoC rights field of each item). Images and item JSON sit in `tmp/b1863/check5/photos/` (not committed).

**Documented camera positions.** Frassanito's coordinates are not in any open source I could reach. What exists is text: the LoC notes cite Frassanito (for example "Dead body in photo was moved 72 yards", item 2018671578; "southwestern edge of the Rose woods", item 2011649966; "Title and exact date from Frassanito", item 2018670852), and the National Park Service "Then and now" pages describe sites ("looks southwest, away from the Rose Woods", the Trostle barn photograph "captured by Timothy O'Sullivan", the Seminary photograph shows "the seminary building up the hill from the camera"; `nps.gov/gett/learn/photosmultimedia/` pages rose-woods, trostle-farm, devil-s-den, buildings-and-farms). The location of the "Harvest of Death" photograph is disputed (Gettysburg Daily series by Jerry Coates and Garry Adelman, `gettysburgdaily.com`; search snippets only). So every pose is my own, constrained by those texts.

**Camera model and renderer** (`check5/scripts/rephoto.py`, numba, 4 threads, below normal priority). Pinhole camera at E, N (UTM 18N), height above ground, yaw, pitch, horizontal field of view. Ground: USGS 3DEP 1 m bare-earth DEM (lidar project PA_South_Central_B1_2017, `tmp/b1863/maps/ref/dem_1m.tif`). Texture: the shipped z16 tiles reprojected to the 1 m UTM grid (`build_scene.py`). Extrusions (`build_ext2.py`): modern canopy that the reconstruction kept or added (provenance raster `prov.u8` plus `canopy1m.npy`), the structures, masses and fences the builder actually drew (`draw_items.pkl`, the builder's own footprint rule), and the 41 retained survivor buildings (`retain_1863_survivors.csv`). **Heights are my assumptions**: canopy 4 + 1.5 m per metre from the canopy edge, capped at 19 m, with 15 percent noise; buildings from the builder's `HEIGHT` table with a gable; fences 1.4 m. The third panel of every pair is the 2013 NAIP photograph with the same canopy rule, as a control. Trees within 35 m of the camera are not drawn, so the camera is not inside a tree.

**Pose tiers.**
* A: three or more independent landmarks. None reached A.
* B: one surviving building fixes position and scale, and the faces visible agree with the photograph (C01).
* C: a surviving building, a road alignment, a summit or a combination; the position is correct to about 30 m laterally but not along the line of sight or along a road (C02, C03, C12, C14, C16, C17). The C03 grid below shows how far a tier C position can still be from the truth: 100 m along a crest.
* D: guessed from the text description, or a fit that does not reproduce the photograph; shown for the record, no claim made (C04, C05, C08, C09, C15).

**Pose search.** Differential evolution (scipy) over E, N, height, yaw, pitch, field of view, with the building footprint outline (`fitfoot.py`), road polyline (`posefit.py`) and sky-line (`skyfit.py`) as costs. Fits are under-determined and several solutions fit equally; the one used was selected by which faces of the building are visible and on which side of the road the building stands. This is stated per case.

**Comparison that does not depend on a perfect pose.** For each case a pose ensemble (60 draws: position sigma 20 m, yaw sigma 3 degrees) gives the share of the view cone (8 to 150 m) that is canopy, fence, structure, replaced ground, catalogue woods and catalogue open ground (`cone.py`). Claims are made from the median and the 10th to 90th percentile of that ensemble, never from one render.

**Tests of my own tools.** The renderer was checked on the NAIP drape: the Big Round Top silhouette from the first C03 pose has 24 px rms error on a 910 px frame. The tile mosaic was compared with the NAIP raster by phase correlation: four of five 512 px blocks differ by 0.5 to 2.7 px (about 1 to 3 m); I did not trace this (it may be my 0.5 px resampling convention, a NAD83 to WGS84 shift of the 3DEP grid, or the pipeline) and it is not used in any claim.

## The photographs

All LoC links are `https://www.loc.gov/pictures/item/<id>/`. Evidence files are in `docs/basemap1863/verification/check5/`: `Cxx-pair.jpg` (photograph | reconstruction render | 2013 NAIP render), `Cxx-map.jpg` (top-down, camera and view wedge, 520 m square) and `E1` to `E6` (site comparisons).

| Case | LoC item | Photograph (credit as catalogued) | Documented position (source) | Pose tier | Render |
|---|---|---|---|---|---|
| C01 | 2018670894 | View at Trostle's barn (O'Sullivan, July 1863) | Trostle barn; "captured by Timothy O'Sullivan" (NPS Trostle page) | B | yes |
| C02 | 2013645105 | Dead horses of Bigelow's battery, Trostle house (O'Sullivan) | "posted at Abram Trostle's house" (LoC caption) | C | yes |
| C03 | 2018670708 | Big Round Top from entrenchments on Little Round Top | caption only | C | yes (C03 and C03b, two positions) |
| C04 | 2018666302 | Breastworks on Little Round Top, Round Top beyond (O'Sullivan) | caption only | D | yes |
| C05 | 2012647709 | Valley of the shadow of death (O'Sullivan, Sketch Book 44) | between the Round Tops (caption) | D | yes |
| C06 | 2018670802 | Slaughter pen at foot of Round Top (Gardner) | foot of Little Round Top (caption) | none | no |
| C07 | 2006692502 | Home of a rebel sharpshooter (O'Sullivan, Sketch Book 41) | Devil's Den west side; body moved 72 yards (LoC note citing Frassanito, Early Photography at Gettysburg p. 268-271) | none | map only (E1) |
| C08 | 2018670703 | Dead at the Rose Woods boulder (Gardner stereo 257; LoC caption "view in wheatfield") | "looks southwest, away from the Rose Woods" (NPS Rose Woods page) | D | yes |
| C09 | 2011649966 | Confederate dead gathered for burial, SW edge of Rose woods (Mumper) | title from Frassanito, Journey in Time 1975 (LoC note) | D | yes |
| C10 | 2018670852 | Confederate dead looking toward the orchard on the Rose farm (O'Sullivan) | date and title from Frassanito (LoC note) | none | map only (E5) |
| C11 | 2018666307 | Federal dead near the McPherson woods (O'Sullivan) | caption only | none | no |
| C12 | 2025169709 | General Meade's headquarters, Leister house (stereo card of Gardner B811-259) | Leister house, Taneytown Road (NPS buildings page) | C | yes |
| C13 | 2018670707 | Lutheran Theological Seminary, assistant on fence | "up the hill from the camera" (NPS buildings page) | none | no |
| C14 | 2014646001 | View of Gettysburg from Cemetery Hill (O'Sullivan, Sketch Book pl. 35) | "road on the left is the Baltimore pike" (LoC caption) | C | yes |
| C15 | 2014646002 | View of Gettysburg from the northwest (Gardner) | "Seminary Ridge looking east, Pennsylvania Hall on the left" (retail listing, geographicus.com; weak) | D | yes |
| C16 | 2019635468 | Chambersburg Pike, Tyson cabinet card | Chambersburg Pike (LoC title "from Seminary Ridge" is a Library staff title) | C | yes |
| C17 | 2020634839 | Evergreen Cemetery gatehouse (Tyson) | Cemetery Hill; Brady "about two weeks after the battle" (NPS buildings page) | C | yes |
| C18 | 2018670704 | Federal breastworks in the woods on Culp's Hill | caption only | none | no |
| C19 | 2006685384 | A harvest of death (O'Sullivan, Sketch Book 36) | disputed (Gettysburg Daily) | none | no |

Poses used (E, N UTM 18N metres, height m, yaw, pitch, hfov degrees) and the basis of each are in `check5/results.json` and `scripts/cases.py`. Six renders (C01, C02, C12, C14, C16, C17) rest on a surviving structure or road, C03 on the Big Round Top summit and the skyline.

## Results by feature class

### Terrain silhouette: matches
C03: the 3DEP terrain with the tree cover reproduces the Big Round Top outline (summit left of centre, long shoulder to the right) with 0.88 degrees rms (24 px of 910) at the first position after a search of plus or minus 3 degrees yaw, 2 degrees pitch and 6 degrees field of view. A position grid (78 positions on and around the Little Round Top crest, 12 pose variants each) found 30 positions within 45 px, all on the west crest (E 308380 to 308460, N 4406960 to 4407140), the best at 26 to 29 px. `C03b-pair.jpg` renders the open end of that band and looks like the photograph: forested Big Round Top, summit left of centre, open ground in front. The relief under the reconstruction is therefore the right ground to draw 1863 on; the builder says it did not roll the terrain back (road cuts, the quarry remain), which these 12 views do not test. C14: the Baltimore Pike centreline (RD-001) fits four hand-picked road points with 6.6 px rms (one of six searches reached 0.3 px), so the catalogued alignment is consistent with the photograph.

### Tree lines and canopy: consistent where tested; Little Round Top cannot be decided
Share of the view cone (8 to 150 m) that is canopy in the reconstruction (median, 10th to 90th percentile of the ensemble), in the 2013 NAIP, and what the photograph shows (my estimate of cover class from the image).

| Case | Reconstruction | 2013 NAIP | Photograph | Result |
|---|---|---|---|---|
| C01 | 5 percent (3 to 8) | 15 | open yard, one oak behind the barn, 10 to 20 percent | consistent |
| C02 | 12 (6 to 23) | 27 | clumps left and right, 20 to 30 percent | consistent |
| C03 | 63 (32 to 84) at the first position; 11 (3 to 26) at C03b; 0 to 68 over the 30 skyline-consistent grid positions (median 10) | 85 / 21 | cleared rocky slope, scattered saplings and one cedar, Big Round Top forest beyond 250 m: 5 to 30 percent | **not decidable**: depends on where along the crest the camera stood |
| C04 (tier D) | 64 (43 to 81) | 88 | same ground, 10 to 35 percent | no claim |
| C09 | 66 (41 to 81) | 68 | woods 15 to 25 m behind the dead, 75 to 95 percent | consistent, slightly low |
| C12 | 8 (4 to 10) | 15 | apple orchard round the house, 20 to 40 percent; the reconstruction draws orchards as texture only (ORCHARD_ADDED dots), not as canopy | not testable here |
| C14 | 0 (0 to 5) | 22 | open fields, one foreground tree, 5 to 20 percent | consistent |
| C16 | 1 (1 to 6) | 12 | yard trees, 5 to 25 percent | consistent |
| C17 | 16 (8 to 27) | 57 | young saplings round the gate, 15 to 35 percent | consistent in share; the trees kept are mature cemetery plantings (E3), the photograph shows small ones |

On Little Round Top the reconstruction keeps canopy as AMBIGUOUS_KEPT (class 20, "the evidence cannot decide") inside catalogue open-ground polygons (100 percent of the cone is in open_cleared or open_ground polygons). Whether that contradicts the photograph depends on the camera position, which this pass could not fix: on the north part of the west crest the cone is open (3 to 26 percent canopy) and the reconstruction agrees with the photograph, on the south part it is 50 to 68 percent canopy and it would not. I therefore make no claim, and the earlier claim is withdrawn.

### Fences and walls: absent
The builder draws 36 fences (7.9 km) of 392 candidates in the whole 235 km2 box. The nearest drawn fence to the 12 camera positions is 213 m (C02), and none of the eight photographs that show fences or walls within 100 m (C01, C02, C09, C12, C14, C15, C16, C17) has a drawn fence within 150 m. The photographs show: a zig-zag worm fence and plank panels in the Trostle yard (C01), a white picket fence along the Trostle yard (C02), a rail fence along the Rose Woods edge (C09), stone wall plus worm fence plus picket fence at the Leister house (C12), continuous dry-stone walls on both sides of the Baltimore Pike and across the fields (C14), post-and-rail fences on both sides of the Chambersburg Pike (C16), rail fences and a stacked rail pile at the Evergreen gate (C17). A fence is thin (under 1 m) and cannot survive from the 2013 photograph at 1 m per pixel; where the Warren plate does not show one, nothing replaces it. That is the stated rule (nothing is drawn that no source supports) and I do not call it a defect of honesty, but it is a measured departure from the pictures.

### Buildings: survivors present, photographed extras absent, one modern remnant
* **Match.** Trostle barn (C01), Trostle house (C02), Leister house (C12, 22 m west of the Taneytown road, left of the road as photographed), Thompson house (C16, 15 m from the pike on its left (north) side when heading east, 112 versus 120 degrees in the frame), Evergreen gatehouse (C17, facade 16.4 m wide facing the town). The roofs of these survivors are the 2013 pixels (class 21 SURVIVOR_KEPT); for the Trostle barn the catalogue itself says the 1863 roof was wood shingle, and the photograph shows it, while the kept roof is the dark grey 2013 roof. The catalogue's Trostle summer kitchen "under construction" (STR-TROSTLE-SUMMER_KITCHEN1) is a roofless brick structure right of the house in C02: **match**, a good catch by the catalogue.
* **Missing: Trostle log hog pen (C01).** The catalogue has it as STR-TROSTLE-HOG_PEN1, Documented, "seen in O'Sullivan photograph", no geometry (UNKNOWN). Nothing is drawn. From my pose the base projects to about E 308030, N 4408190 (plus or minus 25 m, poor; the barn projects 16 m off) which is 20 to 30 m from the barn's east end, roughly as the catalogue says. Evidence `E4`.
* **Missing: gatehouse pavilion (C17).** A small hip-roofed pavilion stands right of the gatehouse; the catalogue has only the gatehouse within 120 m. `E3`.
* **Missing: Leister house outbuildings (C12).** The photograph shows low outbuildings and a fenced yard beside the house; the catalogue has four Warren-sheet symbols at 44 to 115 m (STR-MAPSYM-0168 to 0171) that the builder left undrawn ("no county building outline within the error radius"). The photograph supports them.
* **Missing: frame addition of the Trostle house (C02)**: a lattice-framed lean-to left of the house; not catalogued.
* **Modern remnant (C16).** 100 m ahead and left of the camera, red tile roofs of the modern hotel are partly kept: 353 roof-red pixels remain in a 130 by 90 m box where the 2013 photograph has 1,524 (23 percent), 250 of them PHOTO_KEPT, 48 SURVIVOR_KEPT, 55 AMBIGUOUS_KEPT. Tiles `16/18705/24849` (px 493,342 and 507,389) and `16/18706/24849` (px 13,329 and 45,372). Evidence `E2`. 1863 had no tile roofs here.
* **Town density (C14, C16).** Drawn structure blobs in the cone: C14 4 within 300 m and 21 within 600 m; C16 1 within 150 m, 3 within 300 m, 4 within 600 m. The photographs show far more roofs: C14 a continuous street front, by hand count more than 30 buildings to 1,000 m; C16 two houses at 100 m and six or more within 400 m. Not a clean count (the ranges differ and the town is the Hopkins 1858 inset's job); recorded as indicative and consistent with pass 7 defect D3.

### Roads
The drawn roads are where the photographs put them: the pike runs along the view axis in C16, the Taneytown road is right of the Leister house in C12, the Baltimore Pike alignment fits in C14. The drawn Chambersburg Pike is 6.5 m wide; the road in C16 measures 5 to 7 m at 100 m (width by projection). Road colour was not compared: the photographs are monochrome prints of different tone, and a luminance ratio between road and field varied from 0.9 to 1.8 across prints, which says nothing.

### Crops and ground state
The photographs are 4 to 7 July 1863 and show ground the battle changed: trampled bare fields among tents (C14), straw and hay on the Rose pasture (C08, C09), uncut hay (C11). The reconstruction leaves fields as photographed in June 2013 and recolours only the Wheatfield (CROP_RECOLOURED). Battle disturbance is not a defect; crop state cannot be compared in monochrome.

### Boulders and rock: erased at the Devil's Den
Photographs C05, C06, C07 are dominated by boulders. The catalogue polygon LC-BOULD-0001 (3.19 ha, "Devil's Den and Houck's Ridge boulder field", note: "Bare rock: keep modern ground texture here; do not add or remove tree cover from this polygon without separate evidence") was nevertheless treated:

| Measure inside the polygon | Reconstruction | 2013 NAIP |
|---|---|---|
| pixels replaced (REMOVED_PATCH, REMOVED_SYNTH, CANOPY_REMOVED) | 10,974 of 31,909 = 34.4 percent | 0 |
| mean local standard deviation (5 px window) | 8.23 | 12.61 (ratio 0.65) |
| grey low-saturation share | 15.7 percent | 32.9 percent (includes pavement) |

A pavement-free part (interior of the loop, E 307972 to 308030, N 4407005 to 4407043, 58 by 38 m): 45.3 percent replaced, textured rock-like share 24.9 percent against 51.2 percent, local standard deviation 8.15 against 13.89. The loop road, the parking and the social trails were modern and had to go; the boulders between them were there in 1863 and are now smooth green patch (E1). z16 tiles `16/18706/24860` and `16/18706/24859` (z17 `17/37412/49720`, `17/37413/49719`). At ground level the other 1 to 3 m boulders (C01 yard, C02 left foreground, C08 Rose boulder) are 1 to 3 pixels of the base and cannot be shown at all; that is the resolution of the source, not a processing error.

### Ground synthesis at the photographed sites
Share of the view cone whose ground is REMOVED_PATCH, REMOVED_SYNTH, CANOPY_REMOVED or TOWN_GROUND (median, 10th to 90th percentile): C01 34 percent, C02 39, C03 30 (C03b 23), C04 28, C12 47, C14 82 (75 to 95), C15 93, C16 66 (47 to 73), C17 59 (40 to 78). The viewer at these places sees filler (pass 7 judged its texture); it cannot carry the stones, ruts and rails that the photographs show.

## Per-photograph notes

**C01 Trostle barn, tier B.** Camera 93 m SSW of the barn, 307997 / 4408116, yaw 16.1, hfov 30.7; two solutions fitted the barn outline, the other (SE of the barn, 308069 / 4408134) shows one face only and was rejected. Terrain: not testable (no horizon). Trees consistent. Barn present, shingles replaced by 2013 roof; log hog pen missing; fences missing; boulders not representable; 34 percent of the cone is filler. Files `C01-pair.jpg`, `C01-map.jpg`, `E4`.

**C02 Trostle house, tier C.** 59 m WNW of the house, yaw 109.5, hfov 49.4; seven solutions fit the footprint outline equally, this one has the narrow gable at the right. House and summer kitchen present (match), lattice addition and picket fence absent, trees consistent, large boulder at left not representable.

**C03 Big Round Top from Little Round Top, tier C.** First estimate 308470 / 4406990, yaw 207.6, pitch -3.1, hfov 40 (assumed); alternative C03b 308420 / 4407040, yaw 206.5, pitch 0, hfov 36 (skyline-best open position). Terrain matches in both; canopy not decidable (above). The stone breastwork of the photograph is not part of the base picture.

**C04 Breastworks on Little Round Top, tier D.** The rendered view does not reproduce the photograph (no skyline fit was run); no claim.

**C05 Valley of the shadow of death, tier D.** The guessed camera lies in continuous canopy (100 percent of the cone) where the photograph shows an open boulder floor and woods from 40 m; no claim, but the Plum Run valley south of the Den is under modern canopy in the tile (`C05-map.jpg`). Whether the valley floor was open in the reconstruction's own woods polygons is for the structures and land-cover passes.

**C06, C07 Slaughter pen, rebel sharpshooter, no render.** Boulder evidence `E1`.

**C08, C09 Rose Woods, tier D.** Poses guessed from the NPS text and the LoC title. In C09 the woods edge with an open grass strip in front is present in the reconstruction (66 percent canopy in the cone); in C08 the cone has 21 percent canopy against open pasture in the photograph, and a rail fence along the edge in C09 is not drawn. Evidence `E6` shows the Rose farmhouse (a retained survivor, STR-ROSE-HOUSE1, 21 by 11 m) as a small dark quadrilateral next to trees, not the grey roof with porch of the 2013 photograph: not a rephotography finding, left to pass 3.

**C10, C11, C13, C18, C19, no render.** Not placed. C19 (Harvest of Death) has no agreed location.

**C12 Leister house, tier C.** 106 m south of the house on the Taneytown road, yaw 350.1, hfov 30. House left of the road as in the photograph, drawn dirt road at the right; orchard drawn left of the house as texture; fences, wall and outbuildings missing; 47 percent filler.

**C14 Cemetery Hill, tier C.** Position along the pike is not determined: four searches slid the camera 400 m along it (309159 / 4410330, 309365 / 4410004, 309408 / 4409944 and a 16 m high solution at 309238 / 4410176). The composition of the render (road bending left, open field right, town skyline) resembles the photograph. Walls and fences missing; 82 percent filler; woods NE of the pike are kept in the reconstruction and were not checked against the photograph.

**C15 northwest view, tier D.** Two search solutions 460 m apart (308429 / 4411510 and 307968 / 4411761); neither reproduces the arrangement of pike, house and orchard. No claim.

**C16 Chambersburg Pike, tier C.** Camera on the pike 100 m WNW of the Thompson house; the red-roof remnant (E2), missing fences and a sparse neighbourhood; pike alignment and width consistent.

**C17 Evergreen gatehouse, tier C.** Camera 95 m NNW of the gatehouse on Baltimore Street, yaw 152.5, hfov at the 30 degree bound; the facade and its 16.4 m width fit. Pavilion missing, mature cemetery trees kept (E3), fences missing.

## Reconstruction features the photographs contradict

| Feature | Evidence | Tiles / ids |
|---|---|---|
| Devil's Den boulder treatment, LC-BOULD-0001 | C05, C06, C07; 34 percent replaced, rock texture lost | z16 18706/24860, 18706/24859; z17 37412/49720, 37413/49719 |
| Modern hotel roofs kept at the Thompson house | C16; E2 | z16 18705/24849 (px 493,342; 507,389), 18706/24849 (px 13,329; 45,372) |
| Undrawn Warren symbols STR-MAPSYM-0168 to 0171 | C12 shows outbuildings | near Leister house, E 308945 N 4409547 |
| No geometry for STR-TROSTLE-HOG_PEN1 | C01 shows it | E 308030 N 4408190, plus or minus 25 m |
| Catalogue gap: gatehouse pavilion; Trostle house lean-to | C17, C02 | gatehouse E 309193 N 4410244; house E 308048 N 4408151 |
| Fence layer (36 drawn of 392) | eight photographs | all camera sites |
| Retained mature trees at Evergreen Cemetery | C17, E3 | z16 18708/24852 |

## Defects

| # | Severity | Area | Defect | Repro |
|---|---|---|---|---|
| D1 | high | Devil's Den boulders | The boulder polygon the catalogue says to keep is smoothed: 34.4 percent of 31,909 px replaced, local texture ratio 0.65, pavement-free interior 45 percent replaced and 51 percent of rock-like texture lost. Photographs C05 to C07 show the boulders. | `node tests/t0/verify-base1863-rephotography.spec.mjs` (R5-01, R5-02); tiles above; `E1` |
| D2 | medium | Fences and walls | None drawn within 213 m of any camera; eight photographs show fences or walls within 100 m. | R5-04; `results.json` fences |
| D3 | medium | Missing buildings | Trostle log hog pen (Documented, no geometry), gatehouse pavilion, Leister outbuildings (MAPSYM 0168 to 0171 undrawn), Trostle house lean-to. | `E4`, `E3`, `C12-pair.jpg`, `C02-pair.jpg` |
| D4 | medium | Modern remnant | Red tile roofs kept 100 m from the Thompson house (353 px, 23 percent of the hotel's roof colour). | R5-03; `E2`; tiles above |
| D5 | low | Ground synthesis | 23 to 93 percent of the ground in the view of the photographed sites is filler that cannot show stones, ruts or boulders; retained survivor roofs are modern roofs (Trostle barn). | R5-06; `results.json` cases[].cone.removed |
| D6 | low | Town density (indicative) | Fewer roofs drawn than photographed in C14 and C16; same family as pass 7 D3. | `results.json` structure_blobs_in_cone |
| D7 | low | Mature cemetery trees | Evergreen plantings that were saplings in 1863 are kept (C17). | `E3` |

## Coverage and what I could NOT verify

* **Photographs.** 19 examined, 12 rendered (13 renders: C03 at two positions), 7 with a pose of tier B or C (C01, C02, C03, C12, C14, C16, C17), 5 tier D, 7 not rendered.
* **Area.** View cones to 150 m cover 9.7 ha, 0.04 percent of the box; to 600 m 1.6 km2, 0.7 percent. All sites lie inside the Warren-sheet coverage; the 163 km2 outside it was not tested.
* **Not verified.** True camera positions (no open coordinates; poses are estimates, 20 to 100 m); lens field of view (assumed 30 to 50 degrees, wide for the panorama); tree and building heights (assumed); fence, crop and ground colour (monochrome prints); the positions of the C14, C15 and C16 cameras along the road; any 1863 feature outside the 12 views; the Rose farmhouse and Evergreen Cemetery graves beyond a glance; whether the 1 to 3 px offset between tiles and NAIP exists in the pipeline or in my resampling.
* **Method limits.** The renderer shows canopy as extruded blocks and buildings as gabled prisms, so near-field comparisons (under 50 m) judge presence and absence, not shape. Ensemble statistics use my cover-class reading of each photograph, which carries my judgement.
* **Network and licences.** Only the LoC search and item API, the NPS pages named above and general web search were used, at the rates stated; no Google, Bing, Maxar or Mapbox imagery. Photographs: public domain (LoC rights field). 3DEP and NAIP: public domain. No upload, no deploy.

## Reproduce

`tmp/b1863/check5/` (scratch): `locq.py`, `getitem.py` (LoC search and download), `build_scene.py` (tiles, DEM, NAIP to the 1 m UTM window), `build_ext2.py` (extrusions from draw items), `rephoto.py` (renderer), `fitfoot.py`, `posefit.py`, `skyfit.py` (pose search), `cases.py` (photographs and poses), `build_cases.py`, `build_evidence.py` (images), `cone.py`, `metrics.py` (every number, writes `results.json`). Copies are in `check5/scripts/`. Run order: `build_scene.py`, `build_ext2.py`, `build_cases.py`, `build_evidence.py`, `cone.py`, `metrics.py`, then the spec.
