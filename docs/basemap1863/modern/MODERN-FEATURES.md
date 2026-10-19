# Modern (post-1863) features: inventory, removal masks, removal method

Part of the 1863 base-map reconstruction. Written by `scripts/gen_report.py` from `results/*.json`; every number below is read from a result file that a script in `scripts/` produced. The finished map is a **reconstruction**: no photograph of 1863 exists. This document says what in the modern photograph is not 1863, where it is, how much of it there is, how it is cut out, and how well the cutting-out was tested. It does not say the result is exact.

Base photograph and why: `../IMAGERY-CHOICE.md`. Licences: `LICENCES.md`.

## 1. Inventory by class

Box: west -77.34375, south 39.75788, east -77.14600, north 39.87602 (235 km2). Sources: OpenStreetMap (ODbL), Adams County GIS 2023 building outlines and centre lines, US Census TIGERweb, USGS NHD, USGS structures, Wikipedia monument list (CC BY-SA). `removal` says what the 1863 reconstruction does with the class: REMOVE = cut out; REMOVE_REPLACE = the modern surface is cut out and the 1863 feature on that line is drawn back by the layer that owns it from its own sources; UNKNOWN = not established here, kept in the picture and flagged; KEEP = not removed by this layer.

| Class | Count | Length km | Area ha | Sources | Removal | Note |
|---|---:|---:|---:|---|---|---|
| ROAD_ARTERIAL | 301 | 153.32 |  | OSM 290, ADAMS 6, TIGER 5 | REMOVE_REPLACE | Arterial roads (US/State routes, bypass, ramps). The 1863 road net is drawn back by the roads layer; US 15 bypass, ramps and the 20th-century realignments have no 1863 counterpart |
| ROAD_LOCAL | 784 | 431.4 |  | OSM 705, ADAMS 7, TIGER 72 | REMOVE_REPLACE | Local roads, streets, park avenues. Many follow an 1863 alignment (Emmitsburg, Taneytown, Baltimore Pike); the surface is removed, the 1863 road is redrawn from period maps |
| ROAD_SERVICE | 2,559 | 383.28 |  | OSM 2490, ADAMS 48, TIGER 21 | REMOVE | Service roads, driveways, parking aisles. Almost all are post-1863; farm lanes that existed are redrawn by the roads layer |
| PARKING | 131 |  | 37.11 | OSM 131 | REMOVE | Parking lots. All paved lots are post-1863 |
| PATH | 936 | 122.64 |  | OSM 936 | REMOVE | Footways, trails, steps, cycleways. Modern visitor trails; wide worn paths in the image are caught by the pixel detector, not by this class |
| TRACK | 29 | 7.65 |  | OSM 29 | UNKNOWN | Tracks (unpaved farm/park lanes). May follow a farm lane that existed in 1863; needs the roads layer |
| RAIL | 42 | 40.02 | 0.03 | OSM 41, TIGER 1 | UNKNOWN | Railways. The Gettysburg Railroad line and the Unfinished Railroad grade pre-date the battle; later spurs and yards did not; needs a dated source per segment |
| AIRFIELD | 29 | 4.56 | 24.65 | OSM 29 | REMOVE | Runways, helipads, aprons. No aircraft facilities in 1863 |
| BUILDING | 16,258 |  | 325.14 | OSM 76, ADAMS 16182 | REMOVE_REPLACE | Buildings (Adams County 2023 outlines). Roofs, walls and cast shadows are cut out; buildings that stood in 1863 are redrawn by the structures layer from HABS/NPS/period-map sources |
| STRUCTURE_OTHER | 47 | 45.97 | 7.93 | OSM 47 | REMOVE | Silos, tanks, chimneys, treatment tanks. Modern industrial or farm infrastructure |
| MONUMENT | 938 |  |  | OSM 873, WIKI 65 | REMOVE | Monuments, memorials, statues, markers, tablets. Every Gettysburg monument dates from 1863 or later; none stood on the field in July 1863 |
| INFO_SIGN | 28 |  |  | OSM 28 | REMOVE | Interpretive signs, information boards. Modern |
| TOWER_COMM | 18 |  |  | OSM 18 | REMOVE | Communication towers and masts. Modern |
| TOWER_OBS | 3 |  | 0.02 | OSM 3 | REMOVE | Observation towers. Observation towers on the field are memorial-era (post-battle) structures; the 1863 Lutheran Seminary cupola is part of a building, not in this class |
| WATER_TOWER | 3 |  | 0.01 | OSM 3 | REMOVE | Water towers and tanks. Modern |
| POWER_LINE | 51 | 52.27 |  | OSM 51 | REMOVE | Power lines and their cleared corridors. Modern; the cleared corridor through woodland is a separate vegetation edit |
| POWER_SUPPORT | 284 |  |  | OSM 284 | REMOVE | Pylons, poles, portals, switches, transformers. Modern |
| POWER_SITE | 15 | 3.19 | 6.14 | OSM 15 | REMOVE | Substations, power plants, solar arrays. Modern |
| FLAGPOLE | 19 |  |  | OSM 19 | REMOVE | Flagpoles. Modern |
| FENCE_WALL | 714 | 100.98 |  | OSM 714 | UNKNOWN | Mapped fences, walls, hedges, gates, guard rails. Modern NPS and farm fences mixed with rebuilt 1863 fence lines: not separable by the mapped data; at 1 m they are sub-pixel lines (cannot be seen), so nothing is painted out for them |
| SITE_FURNITURE | 820 |  |  | OSM 820 | REMOVE | Street lamps, traffic signals, stop signs, crossings, bus stops. Modern |
| GOLF | 31 |  | 110.05 | OSM 31 | REMOVE | Golf courses and their features. Modern land use; needs a land-cover replacement, not a patch fill |
| SPORTS_REC | 174 |  | 156.14 | OSM 174 | REMOVE | Sports pitches, tracks, pools, playgrounds, camp sites. Modern |
| DEVELOPED_LAND | 85 |  | 609.78 | OSM 85 | REMOVE_REPLACE | Residential, commercial, industrial, retail land use. Modern developed land; the ground is replaced by the 1863 land cover from the landcover layer |
| QUARRY_LANDFILL | 1 |  | 37.6 | OSM 1 | UNKNOWN | Quarries, landfills, construction. Terrain change: the 1863 ground surface is not recoverable from the modern lidar alone |
| WATER_MODERN | 42 |  | 64.78 | OSM 29, NHD 13 | REMOVE | Basins, wastewater ponds, reservoirs, golf hazards. Engineered water, post-1863 |
| WATER_POND | 332 |  | 93.28 | OSM 187, NHD 145 | UNKNOWN | Ponds and lakes (origin not stated). Farm ponds and dammed pools: 1863 existence needs a period map; kept |
| CEMETERY | 13 |  |  | OSM 13 | UNKNOWN | Cemeteries. Evergreen Cemetery pre-dates the battle; the Soldiers National Cemetery was created after it (dedicated November 1863); later sections of both did not exist: needs a dated plan per section |
| HYDRO_STREAM | 373 | 174.94 |  | OSM 373 | KEEP | Streams, rivers, ditches (OSM waterway). Natural drainage: not removed; modern channelisation or culverts are not separable here |
| LANDCOVER_OSM | 175 |  | 1000.54 | OSM 175 | KEEP | Mapped land cover: farmland, forest, orchard, meadow, grass. Modern land cover for the land-cover layer to compare with 1863; not removed here |
| HISTORIC_OTHER | 9 | 0.01 | 21.73 | OSM 9 | UNKNOWN | Other historic or attraction features (hollow way, bridges, piers). Each needs a dated source |
| OTHER | 2 |  | 0.01 | OSM 2 | UNKNOWN | Unclassified mapped features. No rule matched; kept for review |

Total 25,246 features in 32 classes. Every feature carries an id `MOD-<CLASS>-<n>`, its class, subclass, source and source id in `data/inventory_features.geojson.gz` (WGS84).

Cross-checks of the sources against each other (`results/inventory.json`):

- adams_centerline.json: {'segments': 734, 'length_km': 685.58, 'osm_covered_fraction': 0.881}
- tiger_local.json: {'segments': 884, 'length_km': 573.2, 'osm_covered_fraction': 0.891}
- tiger_primary.json: {'segments': 2, 'length_km': 74.95, 'osm_covered_fraction': 0.522}
- tiger_sec_hwy.json: {'segments': 11, 'length_km': 62.14, 'osm_covered_fraction': 0.65}
- tiger_sec_72k.json: {'segments': 50, 'length_km': 309.93, 'osm_covered_fraction': 0.643}
- tiger_rail: {'segments': 11, 'covered_by_osm': 10, 'added': 1}
- Buildings: Adams County 2023 outlines 16,209; OSM buildings with no Adams outline under them (added) 75.
- Water: NHD water bodies duplicating an OSM polygon 145 (dropped), added 158.
- Monuments: OSM points 873; Wikipedia list entries with coordinates 512, of which 446 lie within 15 m of an OSM point (median offset 4.1 m, 90th percentile 11.3 m) and 66 were added; total located 938. NPS-managed unit: 1,320 monuments and markers as of 2008 (cited by the Wikipedia list to its ref 2); the NPS Civil War Soldiers and Sailors page says almost 1,400. The NPS does not publish their coordinates as open data (searched: data.gov, NPS Data Store, NPS ArcGIS org). Positions here come from OSM (ODbL) and the Wikipedia list (CC BY-SA 4.0).

**Visibility of monuments.** In the 1.0 m 2013 photograph 156 of 938 listed monument points (16.6 %) show a luminance anomaly above the 95th percentile of 3000 random open-ground controls (so about 47 of them are chance); the rest are not resolvable (tablets and markers are below 1 m). On the 0.6 m 2019 flight the figure is 180 (19.2 %) 
So the monument layer matters for the legend and for large state monuments, not for most of the 1,320 objects; and about 380 of the park's objects have no coordinate in any open source read here.

## 2. Pixel masks

Grid EPSG:26918, 1.0 m, origin (299220.0, 4416660.0), 17280 x 13620 px; box 235.4 km2. Class codes: 1 road surface, 2 building (roof and cast shadow), 3 monument, 4 utility, 5 area to re-texture, 6 detected but not mapped, 7 modern water.

| Mask class | Pixels | Area ha | % of box |
|---|---:|---:|---:|
| ROAD_SURFACE | 7,708,464 | 770.8 | 3.275 |
| BUILDING | 6,464,323 | 646.4 | 2.747 |
| MONUMENT | 18,243 | 1.8 | 0.008 |
| UTILITY | 299,103 | 29.9 | 0.127 |
| AREA_RETEXTURE | 5,984,099 | 598.4 | 2.543 |
| DETECTED_UNMAPPED | 1,039,362 | 103.9 | 0.442 |
| WATER_MODERN | 609,078 | 60.9 | 0.259 |

Patch-based removal (classes 1-4, 6): **1552.9 ha**. Needs the 1863 land-cover layer (classes 5, 7): **659.3 ha**.
Building outlines evaluated 16,249: roof visible in the 2013 photograph 13,229; not visible (built after 2013, or hidden) 3,020, which are not cut out. Detected, unmapped components: 1,855, 103.86 ha.

Detector (`scripts/detect.py`, gradient-boosted trees on 12 pixel features of the 1.0 m R,G,B,NIR photograph) under 2-fold spatial hold-out against map-derived labels: pavement recall 0.70, precision 0.77; roof recall 0.70, precision 0.85; background recall 0.97. These are measured against the maps' own labels (a road under trees is a miss; a new building is a false hit), not against a hand-drawn truth.

Registration of vectors on the photograph: median shift (+0.0, -1.0) m east, north, spread 1.5 m (4,000 buildings); masks are grown by 1 m.

## 3. Terrain changes and power-line corridors

3DEP 1 m cross-profile estimate (`scripts/terrain.py`): noise floor sigma 0.59 m on 3000 off-road samples, threshold 1.77 m. 252 road stretches (total 25.07 km) are candidates for a cut (115) or fill (137) of at least that height; arterials 170, local roads 82. Many 1863 roads also run in cuts and hollows, so a candidate is not proof of a post-1863 change. 1863 ground under these features is not recoverable from the modern DEM alone: h is a straight-line estimate across the corridor; a period source (HABS drawings, NPS cultural landscape report, 1860s contour map) is needed to confirm. Not applied to the imagery.

Largest candidates:

| Id | Kind | Road | Length m | Median height m | Max m |
|---|---|---|---:|---:|---:|
| MOD-TERRAIN-0133 | road_cut | Fairfield Road | 400 | -6.4 | -10.4 |
| MOD-TERRAIN-0156 | road_cut | w488502398 | 325 | -3.8 | -6.1 |
| MOD-TERRAIN-0079 | road_cut | w115255446 | 225 | -5.4 | -6.2 |
| MOD-TERRAIN-0039 | road_fill | Fairfield Road | 275 | 3.8 | 5.0 |
| MOD-TERRAIN-0048 | road_cut | Solomon Road | 150 | -6.2 | -7.4 |
| MOD-TERRAIN-0110 | road_fill | Hunterstown Road | 225 | 4.1 | 5.1 |
| MOD-TERRAIN-0172 | road_fill | w488756105 | 325 | 2.8 | 3.4 |
| MOD-TERRAIN-0011 | road_cut | w11800501 | 250 | -3.6 | -4.3 |
| MOD-TERRAIN-0053 | road_fill | Scott Road | 275 | 3.2 | 5.2 |
| MOD-TERRAIN-0017 | road_cut | Highland Avenue Road | 225 | -3.8 | -4.9 |
| MOD-TERRAIN-0227 | road_fill | US Hwy 30 | 275 | 3.1 | 5.6 |
| MOD-TERRAIN-0241 | road_fill | York Rd | 275 | 3.1 | 5.6 |

Engineered water and the quarry (depth = ring median minus inside 5th percentile):

| Id | Kind | Area ha | Depth m |
|---|---|---:|---:|
| MOD-WATER_MODERN-00001 | water_modern large lake (>= 5 ha) | 57.1 | 2.2 |
| MOD-QUARRY_LANDFILL-00001 | quarry_landfill quarry | 37.6 | 66.1 |
| MOD-WATER_MODERN-00002 | water_modern reservoir | 0.07 | -0.0 |
| MOD-WATER_MODERN-00003 | water_modern basin | 0.14 | 0.4 |
| MOD-WATER_MODERN-00004 | water_modern quarry pond | 1.79 | 1.0 |
| MOD-WATER_MODERN-00005 | water_modern basin | 0.06 | 1.6 |
| MOD-WATER_MODERN-00006 | water_modern basin | 0.09 | 0.5 |
| MOD-WATER_MODERN-00007 | water_modern basin | 0.31 | 3.2 |
| MOD-WATER_MODERN-00008 | water_modern basin | 0.11 | -0.8 |
| MOD-WATER_MODERN-00009 | water_modern basin | 0.31 | 1.5 |
| MOD-WATER_MODERN-00010 | water_modern basin | 0.09 | 0.4 |
| MOD-WATER_MODERN-00011 | water_modern basin | 0.99 | 0.2 |
| MOD-WATER_MODERN-00013 | water_modern basin | 0.86 | 0.8 |
| MOD-WATER_MODERN-00014 | water_modern basin | 0.2 | 0.5 |
| MOD-WATER_MODERN-00015 | water_modern basin | 0.17 | 0.0 |

Power-line corridors through woodland (`scripts/corridors.py`): 9 of 51 mapped lines cross woodland, 1.14 km, median cleared width 40.0 m, about 4.56 ha of canopy missing because of them. The 1863 canopy is the land-cover layer's decision; the corridor polygons are in `data/power_corridors.geojson.gz`.

## 4. Removal method

**What is removed, in which order** (`scripts/build_masks.py`): the mask is built on the 1.0 m grid of the 2013 base from (a) the vector inventory (a mapped road, lot, roof outline, monument, pole or line gives a place to look and a size) and (b) the photograph itself (a pixel detector gives the actual extent of paved surface and roofs). A mapped road does not by itself mark a pixel: the pixel must also look impervious (NDVI below 0.12, saturation below 0.30), so grass verges and tree canopy over a road are left alone. Building outlines are cut out only where the 2013 photograph shows a roof (mean roof probability inside the outline of at least 0.25): outlines of buildings built after June 2013 are not cut out from a photograph that does not show them (`data/building_roof_visibility.csv.gz` has the value for every outline). Everything is grown by 1 m (the measured registration spread). Areas that need a new land cover rather than a patch (golf, sports fields, airfield, solar and substation sites, developed land) are mask class 5 and engineered water is class 7: a patch of neighbouring grain cannot make a golf course into a pasture, the land-cover layer must say what the ground was.

**How a masked pixel is replaced** (`scripts/inpaint_methods.py`, method `exemplar`): the mask is cut into chunks of at most 48 x 48 px. For each chunk, 2,500 random translations of the chunk's own shape are tried inside the window; a donor must lie at least 8 px from every masked pixel (the masks under-cover soft edges, shoulders and walls, so a donor next to a mask carries the object's edge: measured, an earlier version with a 2 px clearance kept ghosts of the roads) and must not overlap the chunk's neighbourhood. The donor is scored by the squared colour difference on the 5 px ring of known pixels around the chunk (ring pixels already filled count as known, so the next chunk continues the previous one) plus a texture-statistics penalty (standard deviation of the donor body against the ring, 4x; difference of mean colour, 1.5x). The best donor body is copied in with a smooth colour-and-illumination correction fitted on the ring (normalised convolution, sigma 5 px, clamped to +-30 levels) and clipped to the ring's 3rd to 97th percentile range plus 12 levels, so a fill cannot be darker or brighter than the ground it joins. A chunk with no clean donor falls back to Telea diffusion and is counted. Real photographic grain is copied, not synthesised; nothing is invented that is not already somewhere in the same photograph. `cv2.seamlessClone` was tried and rejected: its boundary condition is read from the mask's own edge pixels, which lie on the object, so it kept the object (shown on a toy case and on a real window).

**Not used:** a learned inpainter (LaMa, Apache-2.0). Its weights come as a pickled checkpoint or as a third-party TorchScript file; neither can be audited here, so none was downloaded. No imagery vendor was called.

**What the test shows and does not show.** The two diffusion methods (Telea, Navier-Stokes) remove objects but replace them with smooth blur: grain (Laplacian variance) of 6 to 7 % of the real ground, and a grey ghost of any road or roof whose mask under-covers the edge. The exemplar method keeps 66 % of the real grain on clean ground and its gradient statistics are three times closer to the truth (Jensen-Shannon 0.12 against 0.30 to 0.34). It has lower PSNR and SSIM than diffusion on the truth test; that is expected, because PSNR rewards blur and no method can recover the true pixels under a masked object. Looked at (previews/*.jpg, panel 5 of each strip): in fields, meadows and woodland the result reads as the surrounding ground; in dense town blocks and farmyards it leaves faint ghost lines where the mask under-covers (unmasked kerbs, concrete aprons, shadows) and occasional dark blotches. In the closed-loop check a detector still calls 17 % of the filled pixels modern (diffusion 37 to 45 %; the floor on untouched ground is the detector's own false-alarm level). So: **the method is usable for the open ground of the battlefield (roads through fields, farm lanes, parking lots in meadows, monuments, poles); it is not yet photorealistic in the town and in farmyards, where the 1863 buildings and the land-cover layer must be drawn over the fill rather than relying on it.**

**Measurements to expect if the removal is run on the whole box:** mask area for patch removal, see the table above; at about 0.9 s per 256 m window with 2 threads the 1,553 ha of patch removal need roughly 30 minutes of one core (estimate from the per-window time, not run on the whole box).


### Test on 20 real masks

20 sites, 256 m windows, mask classes [1, 2, 3, 4, 6]. Means over sites. seam_ratio: 1.0 = the filled boundary is as busy as ordinary ground; above 1.3 visible. tex_ratio: Laplacian variance inside the fill over the ring around it (1.0 = same grain). truth_*: the same shape moved onto clean ground and compared with the real pixels.

| Method | seam_ratio mean | seam_ratio median | sites with seam > 1.3 | tex_ratio | truth PSNR dB | truth SSIM | truth tex_ratio | truth JS(grad) | s per site |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| telea | 1.13 | 1.095 | 4 | 0.088 | 26.865 | 0.94 | 0.059 | 0.344 | 0.019 |
| ns | 1.156 | 1.125 | 7 | 0.134 | 26.932 | 0.943 | 0.069 | 0.303 | 0.019 |
| exemplar | 0.974 | 0.935 | 1 | 0.412 | 23.075 | 0.854 | 0.661 | 0.117 | 0.937 |

Per site:

| Site | Class | Mask px | telea seam/tex | ns seam/tex | exemplar seam/tex | exemplar truth PSNR |
|---|---|---:|---|---|---|---:|
| arterial_road_A | ROAD_ARTERIAL | 11315 | 1.29/0.12 | 1.31/0.19 | 1.02/0.37 | 22.936 |
| arterial_road_B | ROAD_ARTERIAL | 3447 | 1.15/0.05 | 1.19/0.08 | 0.92/0.52 | 23.267 |
| local_road_field | ROAD_LOCAL | 12344 | 0.89/0.12 | 0.91/0.22 | 0.99/0.76 | 23.597 |
| local_road_town | ROAD_LOCAL | 3471 | 0.83/0.07 | 0.84/0.06 | 0.82/0.42 | 24.55 |
| service_drive_A | ROAD_SERVICE | 10230 | 1.16/0.11 | 1.2/0.16 | 0.79/0.27 | 21.724 |
| service_drive_B | ROAD_SERVICE | 8533 | 1.06/0.09 | 1.1/0.14 | 0.93/0.47 | 22.76 |
| parking_large | PARKING | 15972 | 1.29/0.08 | 1.39/0.13 | 0.75/0.12 | 21.654 |
| parking_small | PARKING | 15572 | 1.35/0.1 | 1.43/0.16 | 0.79/0.24 | 25.567 |
| path_trail | PATH | 1411 | 1.01/0.1 | 1.04/0.18 | 1.07/0.84 | 21.826 |
| rail_line | RAIL | 8494 | 1.29/0.05 | 1.31/0.08 | 1.07/0.25 | 21.621 |
| building_farm_A | BUILDING | 6423 | 1.53/0.11 | 1.53/0.18 | 1.17/0.29 | 23.407 |
| building_farm_B | BUILDING | 14157 | 0.82/0.08 | 0.86/0.11 | 0.99/0.68 | 21.937 |
| building_large | BUILDING | 3086 | 0.8/0.1 | 0.83/0.19 | 0.75/0.34 | 20.974 |
| building_town | BUILDING | 8045 | 1.04/0.11 | 1.06/0.18 | 1.08/0.5 | 20.38 |
| monument_A | MONUMENT | 10740 | 1.05/0.05 | 1.08/0.09 | 0.89/0.33 | 25.348 |
| monument_B | MONUMENT | 5126 | 1.13/0.08 | 1.15/0.08 | 1.23/0.46 | 25.143 |
| monument_C | MONUMENT | 15602 | 1.42/0.09 | 1.47/0.15 | 0.94/0.16 | 25.665 |
| pylon | POWER_SUPPORT | 13036 | 0.83/0.06 | 0.86/0.09 | 0.69/0.32 | 22.069 |
| tower_comm | TOWER_COMM | 2320 | 1.85/0.14 | 1.74/0.1 | 1.69/0.38 | 25.287 |
| airfield_apron | AIRFIELD | 13744 | 0.81/0.06 | 0.83/0.1 | 0.9/0.51 | 21.794 |

## 5. Visual review (looked at)

{
 "how": "Contact sheets of random windows were generated by scripts/review_sheets.py (mask outlined) and scripts/review_unmapped.py (24 random class-6 components) and looked at by the author of this layer on 2026-10-19; counts below are what was seen, not computed.",
 "round_1_before_spectral_gate": {
  "sheets": [
   "previews/review_1_0.jpg",
   "previews/review_1_1.jpg",
   "previews/review_1_2.jpg"
  ],
  "windows_seen": 18,
  "seen": "Road mask too wide (the outline enclosed grass verge beside roads, 3 to 6 m); false road and 'unmapped' hits on shaded tree crowns and tree shadows (the detector called dark shaded foliage pavement or roof); several real unmapped gravel lanes, a barn and a sand pad were found. Fix: spectral gate (NDVI < 0.12 and saturation < 0.30 on every detector pixel), road pieces kept only if they touch the mapped centre-line core, closing and opening, minimum component 80 px with fill ratio >= 0.25."
 },
 "round_2_after_gate": {
  "sheets": [
   "previews/review_2_0.jpg",
   "previews/review_2_1.jpg",
   "previews/review_2_2.jpg"
  ],
  "windows_seen": 12,
  "seen": "Road masks follow the pavement, including roads under partial canopy; building masks follow roofs, include the drive and part of the cast shadow, and sometimes a strip of lawn; subdivision roofs and streets are covered; the power-line mask follows the line; farmyard dirt lanes are masked as road. Residual issues: ragged road edge (1 to 2 m), unmasked concrete aprons and kerbs beside buildings, no mask on gravel lanes that are not near a mapped road."
 },
 "unmapped_detections_precision": {
  "sheets": [
   "previews/unmapped_5_0.jpg",
   "previews/unmapped_5_1.jpg"
  ],
  "n": 24,
  "confirmed_modern_surface_or_roof": 15,
  "engineered_or_modern_but_not_pavement_or_roof": 3,
  "false_bare_soil_or_stream_gravel": 6,
  "reading": "62 percent confirmed, 75 percent counting the engineered cases; 25 percent false (bare field soil along field edges, a gravel bar in a stream). n = 24, so the binomial 95 percent interval is about 41 to 81 percent confirmed. Class 6 is therefore marked Estimated and listed separately; removing a false hit replaces bare soil with neighbouring field grain, which is harmless, but a true 1863 farm lane may also be removed: the roads layer must restore lanes it can source."
 }
}

## 6. The eight checks

- 1 registration (vectors vs photograph): 4000 Adams outlines fitted to 2013 image edges: median shift (+0.0, -1.0) m, spread 1.5 m; masks grown 1 m. results/registration.json
- 2 detector, spatial hold-out: pavement recall 0.70 / precision 0.77; roof 0.70 / 0.85; against map-derived labels only. results/detect_cv.json
- 3 mask drawn on the photograph, looked at: 18 windows before and 12 after the spectral gate; the first round exposed shadow false hits and over-wide road masks, fixed, second round clean apart from ragged 1-2 m edges. results/visual_review.json, previews/review_*.jpg
- 4 precision of unmapped detections, by eye: 15 of 24 confirmed, 3 engineered, 6 false. results/visual_review.json
- 5 seams of the removal, 20 real masks: seam_ratio mean: telea 1.13, ns 1.156, exemplar 0.974 (1.0 = boundary as busy as ordinary ground); sites above 1.3: 4, 7, 1. results/inpaint_test.json
- 6 removal vs truth on clean ground: grain ratio (Laplacian variance, 1.0 = real): telea 0.059, ns 0.069, exemplar 0.661; gradient-histogram distance (lower = more like real): 0.344, 0.303, 0.117; PSNR dB 26.865, 26.932, 23.075 (PSNR rewards blur).
- 7 closed loop: does a detector still see modern surface in the filled mask: mean P(modern) inside masks: before 0.895, telea 0.444, ns 0.503, exemplar 0.288, untouched ground 0.186; share of mask pixels above 0.5: {'telea': 0.366, 'ns': 0.45, 'exemplar': 0.168, 'before': 0.922}. results/closedloop.json
- 8 source cross-consistency: OSM vs Adams centre lines: 88% of Adams length within 15 m of OSM; TIGER local 89%; monuments Wikipedia vs OSM median offset 4.1 m (p90 11.3 m) over 446 matched; quad-edge seams in the 2013 mosaic 4.27 vs 4.2 on random lines.
