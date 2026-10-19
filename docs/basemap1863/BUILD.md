# Reconstruction of Gettysburg, July 1863: the base map build

**This is a reconstruction.** No aerial photograph of Gettysburg in 1863 exists. The map is a modern public-domain aerial photograph (USDA NAIP, flown 4 June 2013, 1.0 m per pixel) from which modern features were removed and to which 1863 features were added, from period maps and records. It is **not** an exact replica and **no accuracy of 100 percent is claimed anywhere**. What is measured is stated in section 7; what is not known is left as photographed or drawn neutral, and recorded as UNKNOWN. Every change is listed in `PROVENANCE-LAYER/` with its sources (title, locator, URL, type A1 primary map or record, A2 later first-hand, B secondary), method, positional error in metres and confidence (Documented, Estimated, Contested).

Written by `tools/b1863/gen_build_md.py`; every number in it comes from a file produced by a script in `tools/b1863/`.

## 1. What ships

| Path | What |
|---|---|
| `docs/basemap1863/tiles/{z}/{x}/{y}.webp` | the photoreal tile pyramid, 512 px tiles, Mapbox GL convention (zoom z is the camera zoom), z11 to z17: 932 tiles, 29.3 MB (limit 40 MB) |
| `docs/basemap1863/tiles/manifest.json` | scheme, bounds, attribution text, per-tile sha256, input hashes, the RECONSTRUCTION label |
| `docs/basemap1863/PROVENANCE-LAYER/tiles/{z}/{x}/{y}.png` | per-pixel provenance class (palette PNG, same tile grid, z13 and finer): the "show what was changed" layer |
| `docs/basemap1863/PROVENANCE-LAYER/added_features.geojson` | every drawn road, railway, bridge, fence, building, mass and orchard area: id, sources, method, error, confidence |
| `docs/basemap1863/PROVENANCE-LAYER/changed_regions.geojson.gz` | outlines of removed, re-synthesised, added-tree and ambiguous regions |
| `docs/basemap1863/PROVENANCE-LAYER/classes.json`, `checks/` | class codes; the eight verification passes (JSON) and the review images |
| `tools/b1863/` | the pipeline (section 3); `python tools/b1863/run_all.py` rebuilds everything from the inputs |

Tile levels: z11 4 tiles 0.12 MB; z12 9 tiles 0.33 MB; z13 25 tiles 1.11 MB; z14 72 tiles 3.55 MB; z15 270 tiles 11.10 MB; z16 455 tiles 11.51 MB; z17 97 tiles 1.57 MB. The photograph is 1.0 m per pixel, so z16 (0.92 m per pixel at this latitude) is the native level; z17 tiles exist only around ten hotspots and are enlargements (no new detail); no z18 tile is shipped (it would be a further 2x enlargement of the same pixels). The tile scheme is the one the Battle Studio backdrop already uses (512 px tiles, zoom equals camera zoom).

## 2. Inputs

| Input | Source | Licence |
|---|---|---|
| Base photograph: NAIP 2013-06-04, 4 bands R,G,B,NIR, 1.0 m, 16 quarter-quad scenes, mosaic 17,280 x 13,620 px on the UTM 18N 1 m grid | USDA Farm Service Agency NAIP (read from the Microsoft Planetary Computer mirror of the USDA files); choice and tests: `IMAGERY-CHOICE.md` | public domain |
| Elevation: 3DEP 1 m DEM and the 2017 lidar canopy height model (2 m cells) | USGS 3DEP (project PA_South_Central_B1_2017) | public domain |
| Removal masks (roads, roofs with cast shadow, monuments, utilities, areas, water) and the modern-feature inventory | `modern/` of this work (scripts and results there); built from OpenStreetMap (ODbL), Adams County GIS 2023 building outlines and centre lines, Census TIGER, USGS NHD, Wikipedia monument list (CC BY-SA) | see `modern/LICENCES.md` (the Adams County data carries no stated licence: used only to decide what to remove, not redistributed here) |
| 1863 land cover: woods, orchards, wheat field, cleared slope, open ground, coverage, town zone; the lidar canopy mask | `features/landcover/` from the Warren map (Library of Congress cw0353500) and NPS documents | public domain |
| 1863 roads, lanes, railways, bridges, fences | `features/roads-rail-water/` (Bachelder/Warren sheets, NPS 2004 landscape treatment, Census TIGER, OSM) | public domain / ODbL |
| 1863 structures catalogue and the list of buildings that survive | `features/structures/` (NPS, HABS/HAER via Library of Congress, Warren/Bachelder plates) | public domain |
| The borough in 1858: building symbols and street plan | Hopkins/Converse, Map of Adams Co., Pennsylvania (1858), Gettysburg inset, Library of Congress item 2004629149, scan la000697; georeferenced in `maps/` (fit RMSE 1.91 m, leave-one-out 2.85 m, 8 control points) | public domain |

Not used, and why: Google Earth, Google Maps, Bing, Maxar, Mapbox and any other commercial imagery (their terms forbid derivative or offline use); the `pass7` check greps this repository part for them.

## 3. Pipeline (all scripts in `tools/b1863/`, heavy ones at below-normal priority with at most 4 workers)

| Stage | Script | What it does |
|---|---|---|
| 10 | `s10_targets.py` | turns the modern removal mask into targets: THIN (filled from surroundings), DEEP (wide objects: a pixel 13 px from a core of the mask), AREA, WATER; grows masks 2 px; keeps the real roofs of the 41 buildings that stood in 1863 and still stand; adds monument plazas and plinths (66284 px); retextures the Soldiers' National Cemetery (founded after the battle) |
| 20 | `s20_remove.py`, `pminpaint.py` | removes THIN targets (11458963 px) by multi-scale PatchMatch with patch voting (own implementation, numba, deterministic): real photographic grain is copied from the surroundings, not diffused |
| 25 | `s25_lc.py` | rasterises the 1863 land cover; derives the change decisions on the lidar grid with registration margins (section 4) |
| 28 | `s28_bank.py` | cuts banks of real 24 x 24 px photograph blocks: 24871 open-ground blocks, 14775 woods-canopy blocks (never from synthesised pixels) |
| 30 | `s30_synth.py`, `synth.py`, `quilt.py` | fills wide targets, modern canopy outside 1863 tree cover (with its cast shadow), and 1863 woods that are open now, by image quilting from the banks (Efros-Freeman, colour- and texture-guided, minimum-error seams, boundary colour matching) |
| 33 | `s33_hopkins.py` | reads the 1858 borough inset: building symbols (solid black rectangles) and the street plan |
| 34 | `s34_prepare.py` | decides what is drawn (rules in section 4) and records what is not |
| 35 | `s35_features.py`, `features.py`, `render.py` | draws roads (unpaved ribbons with natural edges, ruts, verge shading and real grain), railway, bridges, fences, roofs with sun-consistent shading and cast shadows, orchards, the Wheatfield colour |
| 39 | `s39_final.py` | per-pixel provenance raster |
| 40, 45, 46 | `s40_tiles.py`, `s45_prov_vectors.py`, `s46_manifest.py` | tile pyramid, provenance tiles, GeoJSON provenance, manifest |
| checks | `checks.py` | the eight verification passes (section 8) |

## 4. Decisions and rules (each one is a place where a judgement was made)

1. **Registration margins.** The 1863 land-cover outlines are georeferenced to the ground with a measured error of median 27 m, 90th percentile 40 m, maximum 63 m (land-cover task). A change is therefore made only where it holds with a margin: modern canopy is removed only where it lies more than 150 m from every 1863 tree polygon (60 m was tried first and removed woods that the NPS says were wooded east of Little Round Top); 1863 woods are added only where the modern canopy is more than 60 m away; orchard trees only where the orchard outline eroded by 12 m has no modern canopy within 25 m. Everything inside the margins stays as photographed and is labelled AMBIGUOUS_KEPT (1535.0 ha).
2. **Survivors.** The 41 buildings that stood in 1863 and still stand keep their real roof pixels (modern additions attached to them stay, modern roofing material is the real modern roofing).
3. **Roads.** Drawn only where the catalogue says present in 1863 and the confidence is not Unknown, on the catalogue line, as unpaved ribbons (turnpike 6.5 m, county road 5.5 m, township road 4.5 m, lane 3 m). The colour is measured from 3,846 samples of 29 real unpaved tracks of the photograph (median-bright half RGB about 200,192,173; the ribbons use RGB 190,181,162 and the macadam 186,182,172). All modern roads are removed; roads not in the catalogue are not drawn.
4. **The borough.** The 1858 Hopkins inset gives individual building symbols (A1, five years before the battle, georeferenced to 3 m). They replace the 1868-69 Warren masses inside the plan (206 masses superseded; the Warren masses elsewhere stay). Streets of the plan: every non-service street centre line of the modern network inside the plan (alleys, which cross the blocks of the 1858 plan, are not drawn); each was reviewed by eye on `PROVENANCE-LAYER/checks/review_street_overlay.jpg`. Lot boundaries, ridge direction, roof material and the 1859-1863 infill are NOT in the source: roofs are schematic. Modern yard and street trees inside the town block are removed (1863 yard trees are UNKNOWN); the real lawn pixels stay.
5. **Other structures.** Curated entries with a position error up to 30 m are drawn (documented footprint where known, typical size for the type otherwise). Machine-detected plate symbols (STR-MAPSYM) are drawn only when the position error is at most 35 m and a 2023 building outline lies within the error radius. Everything else is listed as undrawn (`tmp/b1863/build/draw_stats.json`: 246 entries).
6. **Fences.** Only the 36 fences with a continuous drawn line on the period sheet. The 356 others stay as photographed (fence lines are sub-pixel at 1 m).
7. **The Wheatfield.** Recoloured to ripe wheat (NPS marker: golden wheat on 2 July 1863); the real field texture is kept, the hue is Estimated (no 1863 colour record), the outline is the catalogue's Estimated outline, feathered over about 6 m. No other crop is known; the rest of the open ground keeps the colour of 4 June 2013 (no global seasonal edit is made: the photograph is four weeks before the battle and the July crop state is UNKNOWN).
8. **Light.** The shadows of the photograph fall toward the north-west (measured on 1771 isolated trees: darkest ground at 130 deg east-counterclockwise, shadow length about 1.1 times the height, from `sun_estimate.py`). Everything drawn (roofs, trees, fences, bridges) is lit and shadowed to match.
9. **Terrain** is not rolled back (road cuts, the quarry, basins): the lidar shows modern ground only. Listed as a limit.

## 5. Areas of each provenance class

| Class | Code | Hectares | Meaning |
|---|---:|---:|---|
| PHOTO_KEPT | 0 | 3740.7 | photograph kept, inside the Warren-sheet coverage: not verified as 1863, no source says it differs |
| REMOVED_PATCH | 1 | 1103.7 | modern feature (road, roof, utility, small object) removed; filled by PatchMatch from the surroundings |
| REMOVED_SYNTH | 2 | 2030.4 | modern feature or area removed; ground re-synthesised from real photograph blocks |
| CANOPY_REMOVED | 3 | 316.9 | modern tree canopy outside 1863 tree cover (beyond the 100 m registration margin) replaced by open-ground texture |
| TREES_ADDED | 4 | 20.5 | 1863 woods tree cover that is open now (beyond the 60 m margin): canopy blocks added |
| TOWN_GROUND | 5 | 105.6 | town block: modern street and yard trees removed |
| ROAD_ADDED | 6 | 93.6 | 1863 road drawn |
| RAIL_ADDED | 7 | 7.1 | 1863 railway or railroad grade drawn |
| BRIDGE_ADDED | 8 | 0.1 | 1863 bridge drawn |
| FENCE_ADDED | 9 | 2.2 | 1863 fence drawn |
| STRUCTURE_ADDED | 10 | 8.3 | 1863 structure drawn (schematic roof) |
| ORCHARD_ADDED | 11 | 9.7 | 1863 orchard trees drawn |
| CROP_RECOLOURED | 12 | 6.2 | Wheatfield recoloured to ripe wheat |
| TOWN_MASS_ADDED | 13 | 1.3 | 1868-69 survey building mass drawn (schematic roofs) |
| AMBIGUOUS_KEPT | 20 | 1535.0 | inside the registration margin of an 1863 tree polygon: photograph kept, the evidence cannot decide |
| SURVIVOR_KEPT | 21 | 2.5 | building that stood in 1863 and still stands: real roof pixels kept |
| PHOTO_KEPT_OUTSIDE | 22 | 14551.5 | photograph kept, outside the Warren-sheet coverage: 1863 land cover unknown |

## 6. Drawn features

Counts from `tmp/b1863/build/draw_stats.json`: roads 80, rails 2, bridges 10, fences 36, structures 433, masses 23, orchards 206. Hopkins 1858: {"symbols_on_surviving_buildings_not_redrawn": 5, "buildings": 334, "streets": 48, "masses_dropped": 206}. Machine-detected plate symbols: {"total": 263, "drawn": 60, "no_corr": 60, "too_far": 143}.

## 7. Accuracy: what is measured and what is not

Nothing here is a ground survey. The numbers are those of the inputs, plus the checks below.

| Layer | Number | From |
|---|---|---|
| Photograph vs county building outlines (2023) | median shift 0.0 m east, -1.0 m north, spread 1.5 m (4,000 buildings) | `modern/results/registration.json` |
| Warren map to ground | 16 m absolute (leave-one-out), 2 to 3 m relative | `maps/README.md` |
| Hopkins 1858 inset | 1.9 m fit, 2.85 m leave-one-out, 4.2 m maximum | `maps/transforms/hopkins-1858-gettysburg-inset.json` |
| 1863 woods, orchards, open ground outlines | 27 m median, 40 m 90th percentile, 63 m maximum against independent control points; stated 30 to 40 m | `SOURCES-landcover.md` |
| 1863 structures from the Warren/Bachelder plates | leave-one-out median 10 m, 90th percentile 22 m, maximum 35 m (and a 76 m disagreement between two georeferences of the same plate at the plate edges) | `SOURCES-structures.md` |
| 1863 roads | modern centre lines on the 1863 corridors; period-map registration 15 to 19 m | `SOURCES-roads.md` |
| Roofs from Hopkins symbols | 3 to 4 m position, nominal size | this build |

Unknown and not measured: the colour of July 1863 fields (crops), woods cut or grown between 1863 and the 1868-69 survey, the 1863 stream courses (the modern NHD courses are kept), the terrain, the street trees and yard trees, farm lanes not in the catalogue, fences not in the catalogue, buildings not in the catalogue or on the 1858 inset.

## 8. The eight verification passes

Each pass writes `PROVENANCE-LAYER/checks/passN.json`. Results of this build:

| Pass | Question | Result |
|---|---|---|
| 1 pixel accounting | do pixels labelled "kept photograph" differ from the photograph? | 3.6e-05 of the kept pixels differ by more than 6 grey levels |
| 2 closed loop | does a modern-surface detector still fire inside removed areas? | removed_patch: mean P(modern) 0.726 -> 0.208; removed_synth: mean P(modern) 0.612 -> 0.171; canopy_removed: mean P(modern) 0.336 -> 0.158; town_ground: mean P(modern) 0.849 -> 0.139; kept: mean P(modern) 0.195 -> 0.191 |
| 3 drawn roads and ghosts | do catalogue roads fall on drawn roads; grey ghost pixels left in the old road corridor | 0.999 of road samples on drawn roads; ghost share 0.031 (before 0.7034) |
| 4 seams | colour step at window seams and at filled-region borders | random line 5.554, window rows 6.292, window columns 6.12, filled-region border 2.311 |
| 5 repeated texture | near-duplicate 32 px patches within 320 px | open fill 0.0, removed fill 0.004, drawn road 0.0, untouched 0.012 |
| 6 colour and light | Lab difference of filled and drawn classes to the ground around; shadow direction of drawn roofs | {"removed_patch": 8.1, "removed_synth": 10.6, "canopy_removed": 9.4, "road": 29.2, "trees_added": 8.5, "structure": 27.6, "orchard": 24.4, "town_ground": 4.0, "wheat": 48.8}; roof shadow at 140 deg (expected 130) |
| 7 sources, licences, labels | banned imagery terms outside a "not used" sentence; claims; tile hashes; size; sources on every feature | banned hits 0; accuracy-claim hits outside a negation 0; tile hash mismatches 0 of 932; 29.27 MB; features missing sources 0 of 790 |
| 8 hotspot review | five hotspots at z13, z15, z16.5, z17.5 from the written tiles | 25 images in `PROVENANCE-LAYER/checks/review/` (looked at; fixes made are in section 9) |

Reading the table: (2) the detector reads removed areas as far less modern than before (the floor is the untouched level 0.19); drawn roads and roofs are meant to stay "modern surface" to a detector (0.75 and 0.48), they are roads and roofs. (4) The step across the 1024 px window seams (6.1 to 6.3) is about 12 percent above the random-line step (5.55): a faint seam effect cannot be excluded and was not traced further; the border of filled regions (2.3) is small. (5) Quilted and filled areas show no more repeated 32 px patches than untouched ground. (6) Roads are 28 L* units lighter than the surrounding ground by design (a pale dirt ribbon); the wheat tone is deliberately far from the 2013 grass. Determinism: PatchMatch stage run twice, byte-identical = True; one 900 px quilting window run twice, identical = True (`PROVENANCE-LAYER/checks/determinism.json`).

## 9. Fixes made after looking, and known artefacts that remain

Fixes made after looking at crops (z13, z15, z16.5, z17.5 around the five hotspots, and a 1/10 overview of the whole box):

1. **Woods removed by mistake near Little Round Top.** The first rule (canopy more than 30 m from an 1863 tree polygon is modern) cut a wedge out of the wooded east slope that the NPS says was wooded in 1863. Measured registration error of the outlines reaches 63 m, so the removal margin was raised to 60 m, 100 m and finally 150 m; the area inside the margin is kept and labelled AMBIGUOUS_KEPT.
2. **Soldiers' National Cemetery.** The graves and paths of the National Cemetery (founded after the battle) were still visible after the first removal pass (the removal list had no class for them); the cemetery polygon (OSM way 131108963) is now retextured as open ground. Evergreen Cemetery (1854) is kept.
3. **Divided highway and paved shoulders.** The US 15 bypass was only partly removed (the road mask covers the detector's pavement in a narrow corridor and misses pale concrete). Pavement-like pixels connected to the road mask are now added within 45 m of a mapped arterial and 15 m of other roads.
4. **Monument plazas.** The mask was a 2.5 m disc per monument, which left the plaza and steps; pavement or pale stone connected to a disc within 22 m is now removed.
5. **Town.** The first version drew the 229 Warren ink masses as roofs: blobs larger than the buildings with long hull-shaped shadows. They are replaced, inside the 1858 plan, by the individual building symbols of the Hopkins inset and the street plan read from it; shadows are the exact sweep of each footprint instead of a convex hull; modern yard trees and the whole ground of the town block are re-synthesised so that no strip of modern yard meets the fill.
6. **The Wheatfield** was a hard-edged orange shape; it is now a feathered, lighter ripe-wheat tone on the real field texture, and does not cover trees.
7. **Orchard.** The added orchard trees were too dark and too large, and were placed in irregular blobs; the crowns are smaller and lighter, spaced on a regular grid aligned to the orchard polygon, and only added where the polygon (eroded 12 m) has no modern canopy within 25 m.
8. **Roofs.** The first palette gave reddish-brown roofs; the palette is now weathered shingle, slate and tin in neutral tones, with weaker plane shading.
9. **Unlabelled shadows.** Cast shadows and verge shading changed pixels that were labelled "photograph kept"; every pixel touched by a drawing step now carries that step's class (pass 1 measures it).

Known artefacts and limits that remain (not hidden):

1. **Resolution.** The photograph is 1 m per pixel. At the closest zoom the ground is an enlargement; roofs are 5 to 15 px long, fences and walls are sub-pixel and drawn only as faint lines. It does not have the 0.3 to 0.6 m detail of a modern commercial satellite view; no public-domain source of that detail dated in the right season was used (the 0.6 m flights are leaf-off or late September).
2. **The photograph is 4 June 2013, not July 1863.** Crop and meadow state (wheat and hay ripening, harvest) is UNKNOWN except for the Wheatfield. The shadows and light are those of the 2013 flight (about the same sun height as early July), not a measured 1863 light.
3. **Terrain** is the modern ground: road cuts, the quarry, basins, the railroad embankments and grading of the 20th century are not rolled back. Contours of hills are therefore not 1863.
4. **Removal leaves soft, flat patches.** Wide removed areas (the US 15 bypass, the visitor-centre area, golf courses, the former airfield, quarries, large developments) are re-synthesised from real photograph blocks: texture is real, but there is no field pattern, tracks or tree lines in them; at z13 some of them read as pale smooth patches (visible in `PROVENANCE-LAYER/checks/review/`). They are labelled REMOVED_SYNTH.
5. **Outside the Warren sheet** (about 163 km2 of the 235 km2 box) the 1863 land cover is unknown: modern roofs, roads and utilities are removed, but modern woods and fields are kept as photographed, and no 1863 roads or buildings are drawn there. The map is therefore emptier than 1863 outside the core and richer in trees and field patterns of 2013.
6. **Buildings.** Not drawn: 143 machine-detected plate symbols with position error above 35 m, 60 without a county building outline nearby, 13 curated entries with position error above 30 m, and 15 entries without a position (`tmp/b1863/build/draw_stats.json`). All roofs are schematic: documented footprints are used where the sources give them, typical sizes otherwise; materials and colours are not documented for most.
7. **The 1858 borough plan** gives positions of buildings, not 1863 buildings: buildings erected 1859 to 1863 are missing and a few demolished by 1863 may be shown; the plan was engraved schematically (symbol size is nominal).
8. **Roads.** Only roads in the catalogue are drawn (the catalogue is incomplete: farm lanes, the blacksmith shop road and the borough alleys are not drawn). Widths are class values from period descriptions; real 1863 widths varied. The colour of unpaved roads is the measured colour of the 2013 farm tracks, not an 1863 measurement.
9. **Orchards, woods.** Tree crowns on orchard areas are schematic (regular grid at 9 m, crown radius 2 to 2.6 m); the 1863 spacing and species are not recorded in the sources read. Added woods use real canopy blocks of the 2013 photograph.
10. **Shadow direction of drawn roofs** measured on the final image: 140 deg against 130 deg for the photograph (39 roofs, 10 degree bins); the difference is inside the measurement scatter, not corrected.
11. **Registration.** All 1863 outlines carry the errors listed in section 7 (27 m median for land cover, 10 m median for structures, up to 63 m and 35 m maximum); everything drawn can be off by that much. Where the evidence cannot separate modern canopy from 1863 woods (1,535 ha, 21 % of the 7,167 ha coverage), the photograph is kept (AMBIGUOUS_KEPT).
12. **Monuments.** 938 monument positions are known; the park has about 1,320; the others are partly removed by the bright-small-object rule near roads and paths (`s10_targets.py`), partly still in the image. Monument-sized objects farther than 45 m from a road or path are not detected.
13. **Licence of the county data.** The Adams County 2023 building outlines have no published licence; they decide what is removed and corroborate plate symbols, and are not redistributed in this layer.


## 10. Licences and attribution table

| Source | Used for | Licence | Attribution shown |
|---|---|---|---|
| USDA FSA NAIP 2013-06-04 | the photograph | public domain | NAIP imagery provided by USDA Farm Service Agency |
| USGS 3DEP (lidar, DEM) | canopy mask, terrain analysis | public domain | USGS 3DEP |
| Library of Congress: Warren 1868-69, Bachelder 1876, Hopkins/Converse 1858 | 1863 land cover, roads, structures, the 1858 borough | public domain (Library of Congress, no rights advisory) | Library of Congress Geography and Map Division |
| Historic American Buildings Survey / HAER (Library of Congress) | structure identity and size | public domain | HABS/HAER, Library of Congress |
| National Park Service documents (Cultural Landscape Reports, Treatment Philosophy 2004, NPS web pages) | 1863 land cover, roads, structures | public domain (US Government work) | National Park Service |
| US Census TIGER/Line 2023, USGS NHD | road control, water | public domain | US Census Bureau, USGS |
| OpenStreetMap | list of modern features to remove; modern street centre lines used on the 1858 plan | ODbL 1.0 | (c) OpenStreetMap contributors |
| Adams County GIS building outlines 2023 | list of modern buildings to remove; corroboration of plate symbols | county public records, no licence text published | Adams County GIS (not redistributed here) |
| Wikipedia monument list | monument positions to remove | CC BY-SA 4.0 | Wikipedia contributors |

The manifest carries the attribution text: "Reconstruction of Gettysburg, July 1863, built from USGS/USDA NAIP imagery ... with period maps ...".

## 11. Rebuild

`python tools/b1863/run_all.py` (about 25 minutes on this machine with 4 workers). Inputs live under `tmp/b1863/` (not committed): `modern/work/naip2013_1.0m.tif`, `removal_mask_1m.tif`, `detect_ppav.tif`, `inventory_utm.pkl`; `landcover/canopy_smooth.npy`; `maps/scans/la000697.jp2`. Their scripts are in `docs/basemap1863/modern/scripts`, `features/landcover/scripts` and `maps/tools`. Everything is seeded and deterministic (seed 1863).
