# Base imagery choice for the 1863 reconstruction

Status: written 2026-10-19 by the "modern" part of the 1863 base-map work. Every number is from a script in `docs/basemap1863/modern/scripts/` and its output in `docs/basemap1863/modern/results/`. Nothing here claims the finished map is an exact replica of 1863: no aerial photograph of 1863 exists, so the finished map is a **reconstruction**: a modern, public-domain aerial photograph with the post-1863 features removed and 1863 features added from period sources. This file covers only the photograph under it and the removal of the modern features.

## 1. The decision

| | |
|---|---|
| Base photograph | **USDA NAIP, flown 2013-06-04, 1.0 m ground sample distance, 4 bands (red, green, blue, near-infrared), 16 Pennsylvania quarter-quads (ids and bounds in `modern/results/naip_scenes_pa.json`), one flight date for the whole box** |
| Elevation | **USGS 3DEP 1 m DEM, lidar project `PA_South_Central_B1_2017`** (the project the 3DEP ImageServer reports at the battlefield, `identify` at -77.2347, 39.8117) |
| Box | west -77.34375, south 39.75788, east -77.14600, north 39.87602 (the Battle Studio data box, `docs/pitch/anim2/basemap/README.md` section 5): 17,280 x 13,620 px at 1.0 m, EPSG:26918 (UTM 18N), 235 km2 |
| Licence | public domain (file metadata: "placed in the public domain and may be used and reproduced without permission or fee"); credit "NAIP imagery provided by USDA Farm Service Agency" |
| Leaf state | leaf-on, early June (measured: 40.5 % of pixels have NDVI above 0.3, the highest of the leaf-on flights; green-to-red ratio 1.24) |

Why 2013-06-04 and not the others (all six flights over the box, `modern/results/vintages.json`, contact sheets looked at: `tmp/b1863/modern/cmp/sheet_*.jpg`):

| Flight | Scenes | GSD | Noon sun elevation (computed) | NDVI > 0.3 | Mean saturation | Green/red | Verdict |
|---|---|---|---|---|---|---|---|
| 2010-07-03 | 16 | 1.0 m | 73.2 deg | 40.0 % | 0.189 | 1.10 | leaf-on, same calendar days as the battle, but flat, hazy and brownish; second choice (seasonal colour reference) |
| **2013-06-04** | 16 | 1.0 m | 72.6 deg | 40.5 % | 0.248 | 1.24 | **leaf-on, sharpest and most saturated summer flight, high sun so short shadows. Chosen.** |
| 2015-05-04 | 16 | 1.0 m | 66.0 deg | 33.6 % | 0.204 | 1.19 | spring, canopy only partly out, fields bare |
| 2017-05-16 and 05-19 | 16 | 1.0 m | about 69.5 deg | 37.0 % | 0.267 | 1.26 | mid-May, young leaf, hazy |
| 2019-09-27 | 16 | 0.6 m | 47.6 deg | 2.5 % (the NIR band does not behave as NIR: do not use for vegetation) | 0.204 | 1.02 | finest ground sample but late September: senescent, brown meadows, long shadows (noon elevation 48 deg) |
| 2022-04-24, 04-28, 05-10 | 16 | 0.6 m | 63 to 68 deg | 14.9 % | 0.203 | 0.98 | leaf-off: what the earlier prototype used; wrong season for July |

The USGS catalogues (`USGSNAIPPlus` and `USGSNAIPImagery` ImageServers at `imagery.nationalmap.gov`) list over this box only the 2022 scenes (queried 2026-10-19: 6 scenes with acquisition dates 2022-04-24, 04-28, 05-10 at 0.6 m); the National Map Access API returned zero NAIP products for the box. The older flights come from the Microsoft Planetary Computer STAC collection `naip`, a public mirror of the same USDA files (read by HTTP range requests with the service's anonymous read token; `modern/scripts/fetch/pcnaip.py` holds the token-endpoint call only; no token is stored). No Maryland quads are used: the box's south edge (39.758) lies north of their cover (up to 39.754).

Seasonal honesty: 2013-06-04 is four weeks before the battle (1-3 July 1863). Early June is leaf-on, but crop and meadow state differs from the first days of July (wheat and hay ripening and harvest); the 2010-07-03 flight is the closer date and is kept as the colour reference. The land-cover layer, not this layer, decides what each field was.

What the choice costs: 1.0 m instead of 0.6 m or 0.3 m. At the Battle Studio's finest zoom (z17: 0.46 m per CSS px) the base is upsampled 2.2 times, and a monument of 1 to 3 m is 1 to 3 pixels. Most of the 938 listed monuments cannot be seen at all in this photograph (`modern/MODERN-FEATURES.md` section 1). The 0.6 m 2019 flight is kept for structure checks only, never for colour.

## 2. Mosaic quality (measured)

- Coverage of the box: 100.0 % (valid-pixel mask, every scene dated 2013-06-04).
- Seams: the mean luminance step across the 16 quad edges inside the box is 4.27 grey levels (median over 336 strips of 400 x 18 px each side), the same as the step across 300 random lines in the same image, 4.20. There is no measurable seam; one flight day.
- Registration of the vectors on the photograph (`modern/results/registration.json`): the Adams County building outlines fit the 2013 photograph with a median shift of 0.0 m east and -1.0 m north, spread (median absolute deviation) 1.5 m, from 4,000 buildings in 40 cells of 2 km. The masks are grown by 1 m to absorb this. Absolute accuracy of NAIP is a specification (6 m CE95); the measured relative fit to the county's 2023 data is the number to quote.
- Terrain: the 3DEP DEM mosaic has 0 % no-data cells in the box, range 72.1 to 305.2 m.

## 3. What is removed, and how many (summary; the full table is `modern/MODERN-FEATURES.md`)

Counts and areas are in `modern/results/inventory.json` (vector inventory) and `modern/results/masks.json` (pixel masks). The inventory holds 32 classes and 25,246 features, among them 16,258 buildings (325.14 ha), 968 km of arterial, local and service roads, 122.64 km of paths, 131 parking lots (37.11 ha), 938 located monuments and markers, 284 pylons and poles, 18 communication towers. The pixel masks put 1552.9 ha through patch removal (roads, roofs with cast shadow, monuments, utilities, detected unmapped surface) and hand 659.3 ha (golf, sports, airfield, solar and substation sites, developed land, engineered water) to the land-cover layer.

Removal method and its test (20 real masks, three methods, seam metric, truth test on clean ground, closed-loop check): `modern/MODERN-FEATURES.md` section 4 and `modern/results/inpaint_test.json`. Result in one line: the patch-based exemplar method replaces objects with real photographic grain from the same image (66 % of the real grain kept against 6 to 7 % for diffusion) with no measurable seam at 19 of 20 sites, and is not yet photorealistic in dense town blocks and farmyards.

## 4. Unknowns kept visible

- 1863 existence is not decided here for roads that follow an old line, for farm buildings that stood then, for fences, ponds, tracks or railways: those classes are marked REMOVE_REPLACE or UNKNOWN in the class table and are not silently erased.
- Terrain changes (road cuts and fills, the quarry, basins) are measured as estimates from the modern lidar (`modern/results/terrain_changes.json`); the 1863 ground surface under them is not recoverable from lidar alone.
- Vegetation that grew after 1863 (woodlots on Culp's Hill and Big Round Top, field edges) is the land-cover layer's job; this layer only records the cleared power-line corridors (`modern/results/corridors.json`).
- 1,320 monuments and markers are managed by the park (2008 count, cited by the Wikipedia list); the NPS publishes no coordinates as open data; 938 positions are listed here from OpenStreetMap and Wikipedia; roughly 380 are not located at all.

## 5. Removal method and its test: `modern/MODERN-FEATURES.md` section 4, `modern/results/inpaint_test.json`, `modern/previews/`.
