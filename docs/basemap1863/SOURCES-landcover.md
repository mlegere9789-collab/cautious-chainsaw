# Sources for the 1863 land-cover reconstruction

Owner: land-cover pipeline (`docs/basemap1863/features/landcover/`). Generated 2026-10-19 from `scripts/sources_reg.py` and the verification run. Every number below comes from a command run in this session (script names in `scripts/`).

## 1. What this is, and what it is not

No aerial photograph of the battlefield in 1863 exists. This is a **reconstruction** of the July 1863 land cover (woods, orchards, tree clusters, marsh, boulder ground, one documented wheat field, one cleared slope, and the rest as open farmland) from the Warren survey of 1868-69. Modern tree canopy measured from 2017 lidar shows where today's trees were **not** there in 1863 and where 1863 woods are open now. It must be labelled "reconstruction" wherever it is shown. It is not "1:1" and not "100 percent accurate"; measured and estimated accuracy is in section 5.

Main limit: the Warren sheet was made **five to six years after the battle** (surveyed 1868 and 1869, revised on the ground in 1873 by P. M. Blake). Its printed legend says every object is shown as near as possible as it was at the time of the battle, but I could not check that claim. Woods cut or regrown between 1863 and 1869 are UNKNOWN. Land outside the sheet's inner frame (the sheet covers 17709 acres) is UNKNOWN and gets no features.

## 2. Source table (licence and attribution)

| Id | Type | Citation | URL | Licence | What was taken from it, and caveats |
|---|---|---|---|---|---|
| S-WARREN | A1 | Warren, G. K. (survey 1868-69, revised 1873 by P. M. Blake), "Battle field of Gettysburg", scale 1:12,000 (reduced from 1:2,400 original, NARA RG 77 E81). Library of Congress Geography and Map Division, call no. G3824.G3 187- W3 (LC Civil War Maps 353.5), image cw0353500, 8878 x 9845 px JPEG2000 | <https://www.loc.gov/item/99448794/> | Public domain (LoC: free to use and reuse; no rights advisory) | Topographic survey made 5-6 years AFTER the battle. Woods drawn with tree symbols, orchards with regular tree-and-hachure symbols, marsh with grass-tuft symbols; field boundaries as fence lines. Not an 1863 document: the land cover it shows is the 1868-69 state. |
| S-LRT-CLR | B | National Park Service, Gettysburg NMP, "Little Round Top Cultural Landscape Report, Treatment and Management Plan" (2012) | <https://www.nps.gov/gett/getinvolved/upload/FinalCLR_LittleRoundTop_AllSections-508.pdf> | Public domain (US Government work) | PDF pages 19 (Bushman/Weikert tracts wooded in July 1863; Hanaway tract mostly cleared; Plum Run bottom marshy), 43 (tree line at summit separating cleared Hanaway tract from wooded east-slope tracts; fence lines from Warren map), 90 (western face managed as old field), 121 (detail of Warren map). |
| S-HARTWIG | B | D. Scott Hartwig, "'I Have Never Seen the Like Before': Herbst Woods, July 1, 1863", Gettysburg Seminar Papers, NPS | <https://npshistory.com/series/symposia/gettysburg_seminars/10/essay5.pdf> | Public domain (US Government work) | p.1: of 160 acres Herbst farmed, 18 were woodlot, cattle-grazed and free of undergrowth except along Willoughby Run where willows and brush grew thickly; wheat fields and meadow south of the woods; an old quarry in the NW corner of the woods. |
| S-NPS-CWS-TROSTLE | B | National Park Service Civil War Series, "The Battle of Gettysburg", section on damage claims (Trostle farm claim of Catherine/Abram Trostle) | <https://npshistory.com/publications/civil_war_series/16/sec20.htm> | Public domain (US Government work) | Claim lists for the Trostle farm: wheat 27 acres, corn 9, oats 8, barley 4, flax 1, potatoes 1, grass 32 acres, 20 tons of hay in barn; crops and fences destroyed. |
| S-NPS-NATURE | B | NPS Gettysburg NMP, "Natural Features and Ecosystems"; NPS Gettysburg Daily/natural-resource notes on woodlots | <https://www.nps.gov/gett/learn/nature/naturalfeaturesandecosystems.htm> | Public domain (US Government work) | 1999 General Management Plan/EIS aims to rehabilitate 1863 features, incl. replanting missing historic woodlots and orchards and removing non-historic vegetation. NPS biologist statement that 1863 woodlots were wide open (cattle grazing) is reported in park material. |
| S-NPS-HERR | B | NPS Gettysburg NMP news, "Gettysburg Woods Get a Facelift" (Herr Woods, 2012) | <https://www.nps.gov/gett/learn/news/herr-woods-1-2012.htm> | Public domain (US Government work) | Herr Woods (~42 acres) is a woodlot that still exists from July 1863; co-owned by Herr and Wible; supplied timber and sheltered livestock. |
| S-LOC-PHOTOS | A1 | Library of Congress Prints and Photographs, Gardner/O'Sullivan Gettysburg views of 4-6 July 1863 (e.g. LCCN items 2018666308 and 2018666310 "Confederate dead gathered for burial at the edge of the Rose woods", 2011649968; ppmsca.12558 "Field where General Reynolds fell") | <https://www.loc.gov/item/2018666308/> | Public domain (LoC; photographs of 1863) | Cited from catalogue titles and notes found by web search. The images themselves were NOT analysed pixel-by-pixel in this pipeline (the LoC API returned HTTP 429 and WebFetch HTTP 403 during the run). Used only to document that a clearing existed at the SW edge of Rose Woods and that photographs of 1863 vegetation exist for later rephotography checks (Frassanito 1975, 1995). |
| S-HMDB-WHEATFIELD | B | Historical Marker Database entry for the NPS Wheatfield marker (m=13342): "golden wheat grew tall here in the summer of 1863" | <https://www.hmdb.org/m.asp?m=13342> | Marker text is public; entry used for a short paraphrase only | Confirms standing wheat in the Wheatfield on 2 July 1863; field size reported variously as about 20 acres and 26 acres in secondary books. |
| S-NAIP2022 | MODERN | USDA FSA / USGS The National Map, NAIP 2022 imagery m_3907714_se_18_060_20220428 etc. (0.6 m, 4-band, acquired 2022-04-28), via USGS TNM ImageServer exportImage | <https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer> | Public domain (USDA/USGS) | Early-spring (leaf-off to leaf-emerging) imagery. Used only as a visual cross-check, not for the canopy mask. |
| S-3DEP-LIDAR | MODERN | USGS 3DEP lidar point cloud USGS_LPC_PA_South_Central_B1_2017_LAS_2019 (EPT, hosted on AWS usgs-lidar-public) | <https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept.json> | Public domain (USGS) | Acquired 2017; points at EPT depth <= 10 (about 1.5 m spacing). Canopy height model = highest non-ground return minus interpolated ground, 2 m cells. Describes the 2017 state, not 2026 and not 1863. |
| S-TIGER2023 | MODERN | US Census Bureau TIGER/Line 2023 roads, Adams County PA (tl_2023_42001_roads) | <https://www2.census.gov/geo/tiger/TIGER2023/ROADS/tl_2023_42001_roads.zip> | Public domain (US Census Bureau) | Used as ground control for georeferencing the Warren map (road centrelines). |

Source types: A1 = primary period map or record; B = secondary; MODERN = modern measurement used only for registration or the change layers (not an 1863 source). No Google, Bing, Maxar or Mapbox imagery was used.

## 3. Feature files (GeoJSON in EPSG:4326, plus `.3857.geojson` Web Mercator copies)

| File | Features | Acres | Class and confidence |
|---|---|---|---|
| `woods_1863` | 276 | 2959 | woodlots from Warren tree symbols; Documented for dense symbol areas, Estimated for hand-drawn sparse ones |
| `orchards_1863` | 206 | 654 | orchards from Warren orchard symbols (incl. Peach Orchard); Documented (automatic) or Estimated (hand) |
| `scattered_trees_1863` | 124 | 615 | small tree-glyph clusters and residual symbol regions; Estimated, may include lettering mistaken for glyphs (see section 6) |
| `marsh_wetland_1863` | 16 | 63 | Warren grass-tuft marsh symbols and the Plum Run bottom (NPS CLR); Estimated |
| `boulder_fields_1863` | 1 | 8 | Devil's Den and Houck's Ridge boulder ground; Estimated |
| `fields_documented_1863` | 1 | 20 | Wheatfield (Rose farm), standing wheat; Estimated outline, Documented crop |
| `open_cleared_1863` | 1 | 40 | Little Round Top west slope cleared (Hanaway tract); Estimated |
| `open_ground_1863` | 25 | 13157 | everything else inside the sheet that is not tree, wet, boulder or town; open farmland, crop type UNKNOWN |
| `coverage_warren_sheet`, `excluded_town_zone` | 1, 1 | 17709, 304 | extent of the evidence; the town block is left to the structures layer |
| `change_remove_modern_canopy` | 1492 | 3768 | modern canopy absent in 1863: replace with the surrounding open-ground texture |
| `change_add_1863_tree_cover` | 707 | 957 | 1863 tree cover with no canopy now: add leaf-on trees or orchard rows |

Also: `season_july_1863.json` (leaf and crop state for the grading), `crops_unknown_1863.json` (what is not known), `VERIFICATION-landcover.json` (eight passes), `scripts/` (the pipeline).

Every feature carries `id, category, subtype, name, geometry, present_1863, period_note, sources[{cite, sheet_or_page, url, type, quote_or_paraphrase}], method, positional_error_m, confidence, notes`. Names are given only where the Warren label or an NPS source supports them; most polygons are unnamed.

## 4. Method in brief

1. Fetched the Warren scan (LoC `cw0353500.jp2`, 8878 x 9845 px) and Census TIGER 2023 roads. Fitted a similarity transform (rotation, scale, shift) of the sheet to about 5,900 road points by minimising distance to ink, then a smooth free-form warp (8 x 9 control grid, strong smoothness penalty, largest control shift 26 px).
2. Detected tree-symbol areas (ink density with long lines removed, then local texture) and reviewed **every** candidate by eye in 42 map tiles (wood, orchard, marsh or reject). Added hand outlines where symbols were sparse, then reviewed the residual dense-symbol regions and small-glyph clusters.
3. Converted to UTM 18N through the georeference, merged, simplified (1 to 1.2 m) and wrote GeoJSON.
4. Downloaded 3DEP lidar (USGS_LPC_PA_South_Central_B1_2017, EPT depth up to 10, 7,628 nodes, 2.1 GB, not committed). Built a 2 m canopy height model (highest non-ground return minus ground). Canopy = height above 4 m with a multi-return share above 0.08, 5 x 5 majority filter. Change layers: modern canopy more than 12 m from any 1863 tree polygon (remove); 1863 tree polygons with no canopy within 6 m (add).

## 5. Measured accuracy and what is uncertain

(from `VERIFICATION-landcover.json`)

- **Pass 1, fit to roads:** median 1.4 m, 81 % of road points within 5 m (similarity transform only: median 2.4 m, 73 % within 5 m). Optimistic: these points were fitted, and roads moved after 1863.
- **Pass 2, independent control:** 25 ground control points picked by the maps agent (summits, junctions, bridges, farm buildings) disagree with my transform by a median of 26.8 m (90th percentile 39.6 m, maximum 62.8 m). Unresolved: either their picks, my fit, or the 1863-versus-modern positions of the features carry 25 to 30 m of error. I therefore state **30 to 40 m** positional error for the polygons.
- **Pass 3, terrain:** Warren ink density against slope from lidar, 3 km windows: median best-fit shift 21 m (90th percentile 43 m); the correlation is weak (0.3 to 0.47), so it only confirms the error scale.
- **Pass 4, canopy persistence:** modern canopy covers 80 % of the interior of mapped 1863 woods, 32 % of 1863 open ground outside the town block (much of it modern hedgerow, stream-bank and suburban growth, and some Warren omissions), and 42 % of the whole sheet.
- **Pass 5, 2022-04 NAIP:** woods NDVI 0.146, brightness 121.4; open ground NDVI 0.155, brightness 131.6. **Weak contrast**: the polygons are not clearly separated by April colour, so this pass adds little confidence.
- **Pass 6, landmarks:** 6 of 7 agree (Culp's Hill and Big Round Top wooded; Peach Orchard an orchard; Wheatfield, Little Round Top summit and Cemetery Hill not woods). The Herbst Woods test point (coordinates from memory, approximate) falls 52 m outside the nearest wood: not resolved.
- **Pass 7, schema:** 2851 features, 0 schema problems, 0 invalid geometries, directory 18.6 MB.
- **Pass 8, determinism:** rebuilt all 24 GeoJSON files; identical = True.

## 6. Known weaknesses (not hidden)

- The canopy mask uses lidar from **2017**, not 2026 and not the base photograph's date; it also catches roof edges and fence-line trees. The remove layer is about 3,770 acres, mostly hedgerows, stream corridors and modern suburbs; hedgerows may have existed in 1863 but Warren did not draw them (UNKNOWN). Inside the town, 1863 yard and street trees are UNKNOWN; the town block is excluded from land cover.
- `scattered_trees_1863` clusters come from glyph detection; some are probably lettering or hachure marks rather than trees. Treat them as sparse single trees at most, never as dense canopy.
- Woodlot extents are the 1868-69 state: timber cut for breastworks or fuel in July 1863, and regrowth to 1869, are not modelled.
- Orchard blocks marked Documented are on the Warren sheet; whether each existed in July 1863 is not separately sourced.
- The 18-acre Herbst woodlot (Hartwig) cannot be separated from neighbouring woods in the mapped complex.
- Photographs of 1863 (Gardner, O'Sullivan, Brady, Tyson, Weaver; Frassanito's camera positions) were **not analysed**: the Library of Congress API returned HTTP 429 and its item pages HTTP 403 to the fetch tool during this run. Only catalogue titles seen in search results are cited (S-LOC-PHOTOS). This is the main source of 1863 vegetation evidence not yet used.
- Official Records and veterans' accounts of specific woods and fields were not systematically read; only the Hartwig essay, the Little Round Top CLR and the Trostle claim text were read in full or in part.
- The NPS vegetation inventory (GETT) and the park's 1999 GMP historic-woodlot maps were not obtained (no open GIS layer found on the NPS ArcGIS services; the NPS Data Store was not reachable with the tools used). A comparison against them would be the best independent check.
