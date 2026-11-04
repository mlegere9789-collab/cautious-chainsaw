# Terrain pipeline status: PDF B.9.2 against what the repository already has

Prepared 2026-10-19 (Phase 4 prep). Nothing in this file is built terrain. It maps each of the eight steps of PDF B.9.2 (pages 109-110) to the existing 1863 base-map work (`docs/basemap1863/`, `tools/b1863/`) and to the Battle Theatre prototype ground, and lists what is reusable and what is missing. Every figure below is quoted from a file named next to it; nothing was re-measured for this note. The `docs/basemap1863/verification/` reports are dated 2026-10-19; a "b1863 fix pass (WIP)" commit (2b46534) and modified provenance files in the working tree postdate or accompany them, and **those checks were not re-run here**, so the defect counts below are as written in the reports.

Companion files: `terrain_sources.json` (the 45 catalog rows), `terrain_sources_probe.json` (access probe), `tools/bt/terrain_check.py` (validator).

## 0. Two facts that shape everything

1. **The existing work is a 2D photo reconstruction, not a terrain model.** `docs/basemap1863/BUILD.md` section 4.9 and section 9.3: "Terrain is not rolled back ... the lidar shows modern ground only." The base is the 4 June 2013 NAIP photograph (1.0 m) with modern features removed and 1863 features drawn. The Battle Theatre prototype ground (`docs/battle-theatre/render/prototype/data/height.bin`, 1536 x 1536 uint16 at about 4 m over 6.16 x 6.12 km, `terrain.json`: "modern ground, not the 1863 landscape") is the modern 3DEP surface. No 1863 elevation surface exists anywhere in the repository yet.
2. **Two different LOC Warren items are in play.** The PDF (Table 1 row 1) names LOC 99446453, a partial 1886 tracing at 1:2400 ("only portions of sheets 2 and 3"). The project georeferenced and used LOC 99448794 (call G3824.G3 187- W3, `cw0353500.jp2`, 8878 x 9845 px, a 1:12,000 reduction of the 1:2,400 original, whole-field coverage, 4 ft contours): `docs/basemap1863/maps/sources.json`, `SOURCES-landcover.md`. The probe could not look at 99446453 (HTTP 403 to HEAD, not retried). Both stay in the catalog as separate entries.

## 1. At a glance

| Step (B.9.2) | Done in basemap1863 / b1863 | Reusable as-is for the Battle Theatre | Missing (short) | Gates |
|---|---|---|---|---|
| 1 LiDAR ingest | 3DEP 1 m DEM, 2017 lidar point cloud via EPT, 2 m canopy height model | project/bucket identification; DEM fetchers; CHM; 4 m prototype height grid | LAS tiles/denser ground DEM, PAMAP 2006-08 epoch, datum reconciliation, two-epoch difference, vertical check, non-ground masks other than canopy | Q03 (masks) |
| 2 De-modernization | Imagery only; terrain cut/fill/quarry/basin candidates measured, "not applied" | the candidate polygons as a starting list | any edit of the surface; Warren-vs-lidar flagging; documented edit polygons; residual register | Q03, Q08 |
| 3 Warren contours + error model | Warren georeferenced (23 control points, 16.5 m leave-one-out); no contours traced | transforms, control points, scans pipeline | contour vectorization, elevations, TIN, vertical datum, residual maps, elevation error model | Q16 (indirect) |
| 4 Drainage | NHD courses kept as Estimated/Unknown; bridges; Plum Run marsh polygon | water layers as candidates | flow-accumulation channels, Warren channels, DCNR comparison, channel geometry, flood state | Q22 (weather) |
| 5 1863 land-cover fusion | Large: woods, orchards, marsh, boulders, Wheatfield, open ground, roads, lanes, rail, bridges, fences, 433 structures, Hopkins 1858 borough | the GeoJSON layers with their sources and errors | crop/species/fence-type per field, Cope/Elliot fusion, hedgerows, East Cavalry Field, NPS vegetation map, Penn Pilot | Q03, Q21 |
| 6 Per-object provenance and tier | Source list, method, positional error, Documented/Estimated/Contested/Unknown on every catalogue feature; pixel provenance classes | the schema as a base; `tools/bt/validate_provenance.py` | crosswalk to documented/inferred/plausible-procedural, source dates, inferred attribute, conflicts, seeds, render flag | Q02, Q19, Q23 |
| 7 Accuracy tests / photo-match | Check 5 rephotography (12 renders, estimated poses), Check 2 georeference | renderer, photo list, pose-tier method | contour residual maps, 2006-08 vs 2017 difference, Knowles viewshed and thicket tests, documented camera positions, pass criteria | Q16 |
| 8 Honest accuracy bound | Measured/unmeasured tables in BUILD.md section 7; no "100 percent" claim | wording pattern | a bound for the Battle Theatre surface (needs steps 1-3, 7) and its in-product display | Q23 |

## 2. Step by step

### Step 1. LiDAR ingest

**Done.**
- 3DEP 1 m bare-earth DEM (lidar project PA_South_Central_B1_2017) fetched from the National Map ImageServer onto the EPSG:32618 grid 301750-313000 E, 4405000-4415750 N (`docs/basemap1863/maps/README.md` section 3 item 2; `maps/tools/fetch_ref.py`; `modern/scripts/fetch`). The Battle Studio basemap fetched 3DEP blocks for its tile grid (`docs/pitch/anim2/basemap/tools/fetch-dem.py`), and `render/prototype/tools/build-terrain.py` produced `height.bin` (1536 x 1536, about 4.0 m samples, 72-240 m).
- 2017 point cloud via EPT: `USGS_LPC_PA_South_Central_B1_2017_LAS_2019` on the AWS bucket `usgs-lidar-public` (`https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept.json`), read to EPT depth 10 (7,628 nodes, 2.1 GB, about 1.5 m spacing, not committed). Canopy height model = highest non-ground return minus interpolated ground, 2 m cells; canopy = height above 4 m with multi-return share above 0.08, 5 x 5 majority filter (`docs/basemap1863/SOURCES-landcover.md` section 4).
- This answers part of PDF B.9.3's gap "exact Adams County lidar project name, Rockyweb folder and AWS bucket path": project name and AWS path are known; the Rockyweb folder is not recorded.

**Reusable as-is.** Project/bucket identification; the DEM and CHM fetch scripts; the canopy mask; the 4 m prototype grid (as the modern surface, labelled as such).

**Missing.**
1. LAS 1.4 tiles or a denser ground-classified DEM than the delivered 1 m DEM (EPT depth 10 gives about 1.5 m; step 1 asks for denser where spacing allows).
2. The PAMAP 2006-08 LAZ epoch (catalog row 23; NOAA S3 `noaa-nos-coastal-lidar-pds`, ID 2574). No code or data for it exists. The PDF itself says the Adams acquisition date is "to verify".
3. Datum and unit reconciliation between epochs (NAD83(2011) / NAVD88 GEOID12B for 2017 against the PAMAP note). Check 2 found the base grid is EPSG:26918 with a null NAD83 to WGS84 step, worth about 0.2 m E and 0.9 m N (`verification/check2-georeference.md` section 3); the vertical datum was not examined.
4. The two-epoch difference map as a free processing-error estimate.
5. Vertical accuracy cross-check against monuments or building corners present in both datasets. The only noise figure that exists is the cross-profile roughness of the cut/fill operator (sigma 0.59 m, MAD sigma 0.27 m on 3,000 off-road samples; `modern/results/terrain_changes.json`), which is not the QL2 vertical accuracy.
6. Non-ground returns kept as masks for buildings, monuments and walls (only canopy was extracted; buildings and monuments came from OSM, Adams County outlines and a Wikipedia list).
7. Collection dates: the PDF row 21 gives 2017-11-21 to 2017-12-21 (leaf-off); the project documents say only "acquired 2017". Not reconciled.

### Step 2. De-modernization

**Done (imagery, not surface).** The modern-feature inventory and removal masks (`docs/basemap1863/modern/`: 32 inventory classes, `data/removal_mask_1m.*`, `inventory_features.geojson.gz`) drive pixel removal in `tools/b1863/s10_targets.py`, `s20_remove.py`, `s30_synth.py`. For the surface, `modern/scripts/terrain.py` measured candidates only: 252 road stretches (25.07 km; 115 cuts, 137 fills; threshold 1.77 m = 3 sigma), the quarry (`MOD-QUARRY_LANDFILL-00001`, 37.6 ha, depth 66.1 m by ring-versus-inside) and engineered basins and lakes (`results/terrain_changes.json`, `data/terrain_candidates.geojson.gz`). `MODERN-FEATURES.md` section 3: "Not applied to the imagery"; the cut/fill value is a straight-line estimate across the corridor and "many 1863 roads also run in cuts and hollows, so a candidate is not proof of a post-1863 change".

**Reusable as-is.** The candidate list as a starting set of edit polygons; the inventory (with the licence caveats: OSM is ODbL, the Adams County outlines carry no stated licence and "are not redistributed"; `BUILD.md` section 10).

**Missing.**
1. Any edit to the elevation surface (road beds, avenues, parking, the visitor center pad, monument bases, Little Round Top road work, quarry changes).
2. The comparison the PDF specifies: lidar DEM against a Warren-derived TIN, flagging disagreement beyond the combined error. It cannot exist before step 3.
3. Each edit as a documented polygon with reason and source; unexplained residuals into the register, not silently overwritten.
4. Railroad handling: the unfinished railroad grade (cut up to about 15 ft on the first-day field, per the PDF's Wikipedia citation; a lead, not a source) must stay, later railroad changes go. The project has rail and electric-railway history in `features/roads-rail-water/` (Round Top Branch 1884-1942, Gettysburg Electric Railway 1893-1916: `SOURCES-roads.md`) but no grade-level surface treatment.
5. Rules that keep Law items intact: no earthwork pre-placed (Q08), and no 1863 profile derived from modern rebuilt Culp's Hill, Little Round Top or Cemetery Ridge walls (CLAUDE.md).

### Step 3. Re-imposing Warren contours with a documented error model

**Done.**
- Warren sheet (LOC 99448794) georeferenced: affine on 23 control points, fit RMSE 13.9 m, **leave-one-out 16.5 m** (median 12.6, max 36.5); six independent road-line constraints 13.9 m RMSE; sheet frame about 8.8 x 9.8 km, rotated 3.8 degrees, 2.5 percent axis anisotropy (`docs/basemap1863/maps/README.md` sections 1, 4, 5; `maps/transforms/warren-1869.json`; `maps/gcps/warren.json`). Affine, quadratic and thin-plate models were compared by leave-one-out (16.5 / 16.3 / 15.6-16.6 m) and the affine kept.
- Bachelder 1876 sheets registered to Warren (relative 2.2-2.4 m), Woeltje 1888 (4.3 m), Hopkins 1858 inset (leave-one-out 2.9 m, 8 points).
- Hill summits were used as control points (3DEP maxima, `maps/tools/summits.py`); the Studio basemap moved three hills to measured summits (`docs/pitch/anim2/basemap/data/ground-truth.json`: 192.6, 203.5, 238.6 m).
- A DEM-derived 4 ft contour image exists (`maps/tools/contours.py`, "vertical offset 0 (the map's datum is unknown)"). An attempt to align Warren ink to DEM contours by windowed cross-correlation was **abandoned**: peaks 0.03-0.18, second peak within 5 percent (`maps/README.md` section 4).
- Land-cover pass 3 compared Warren ink density with lidar slope: median best-fit shift 21 m, correlation 0.3-0.47 (`SOURCES-landcover.md` section 5).

**Unresolved conflict that affects this step (not hidden).** Check 2 found the build uses two Warren georeferences (the affine above for structures, a free-form deformation for land cover) that disagree by a median 24.5 m (max 113 m) on the road network, and that road-line evidence favours the free-form frame (11 vs 17 m) while point evidence favours the affine (14 vs 26 m). The sheet is "locally distorted by up to about 25 m over 1 km scales" (`verification/check2-georeference.md` section 4). A contour trace needs one chosen frame, or a per-region model.

**Reusable as-is.** Transforms, control-point files, the scan fetch and raster tools, the identification of the usable LOC items. The horizontal 16.5 m leave-one-out figure is the same order as the Knowles "under 50 ft" statement (about 15 m) but they are different quantities (the PDF says the 50 ft figure is both an elevation difference and a displacement and is unresolved); the project does not claim they agree.

**Missing.**
1. Contour vectorization (automated trace with manual QA), elevation assignment and a TIN. No Warren contour has been traced in the repository.
2. Contour and spot-height reading: the vertical datum of Warren is unknown; no spot height was read.
3. Full-resolution acquisition for tracing: only the 1:12,000 reduction was fetched; the NARA 1:2,400 sheets (row 2) and the LOC 1886 tracing (row 1) were not obtained (catalog page robots-disallowed and LOC 403 in the probe).
4. The elevation error model: contour residuals against lidar on ground believed unchanged (hilltops, outcrops), published as the Warren RMS. The PDF unverified list says no RMS is documented anywhere; the project's 16.5 m is a horizontal georeference figure, not an elevation RMS.
5. A decision on the Warren frame (the 24.5 m conflict above), and the error budget that results.
6. Warren is 1868-69; land cover is "about 1868" until checked against 1863 photographs, Cope (Aug-Oct 1863) and Bachelder. Cope's NARA map was never obtained; the 1898 Cope Culp's Hill sheet and Cope sketch are downloaded but not georeferenced.

### Step 4. Drainage (Plum Run, Rock Creek, Marsh Creek, Stevens Run)

**Done.** `features/roads-rail-water/`: 363 NHD flowlines (235.3 km; named streams Estimated 93, unnamed Unknown 270; stated error 30 m), 19 bridges (Documented 5, Estimated 11, Unknown 3), 3 water features (Spangler's Spring, mill dams, Plum Run marsh), compared with the drawn Warren creek at 14 stations (median offset 13.0 m, max 50.0 m; `SOURCES-roads.md`). Land cover has 16 marsh polygons (63 acres, Warren grass-tuft symbols plus the Plum Run bottom from the NPS Little Round Top CLR). Check 4 found Stevens Run missing through the borough and a modern reservoir left on Marsh Creek (`verification/check4-roads-rail-water.md`).

**Reusable as-is.** The layers as candidates, labelled Estimated/Unknown. Courses are modern: `SOURCES-roads.md` says "NPS says they have changed"; the Rose Run drain (placed underground in the 1980s) and the ponds NPS names (McPherson's, Biesecker's) are not drawn or located.

**Missing.** Flow accumulation on a cleaned DEM; channel positions from the Warren map (weakest part of Warren per the PDF error model); comparison with NHD and PA DCNR lines (the DCNR layer was not used); width, depth and flow (documented nowhere; plausible-procedural, flagged); the Plum Run 4 July flood state (a weather-driven state, B.10.1/B.10.6); the Stevens Run width question (forum claim only).

### Step 5. Fusing 1863 land-cover layers

**Done (the largest piece).** `features/landcover/`: woods 276 polygons (2,959 acres), orchards 206 (654), scattered trees 124, marsh 16, boulder fields 1 (Devil's Den, 8 acres), the Wheatfield 1 (20 acres, standing wheat 2 July), cleared slope 1 (Little Round Top west, 40 acres), open ground 25 (13,157 acres), Warren coverage 17,709 acres; positional error against independent control median 27 m, p90 40 m, max 63 m, stated 30-40 m. `features/roads-rail-water/`: 29 roads, 4 lanes, 7 railways, 19 bridges, 392 fence candidates (36 with a continuous drawn line). `features/structures/`: 433 structures drawn, 246 catalogue entries not drawn. Hopkins 1858 borough inset: 334 buildings, 48 streets. `crops_unknown_1863.json` and `season_july_1863.json` record what is unknown. Modern layers were used only as masks (lidar canopy); the NPS vegetation map was **not obtained** (`SOURCES-landcover.md` section 6).

**Reusable as-is.** The GeoJSON layers (WGS84 and Web Mercator copies) with their per-feature sources, methods and errors. Constraints that travel with them: Warren is the 1868-69 state; 1,535 ha (21 percent of the 7,167 ha coverage) is AMBIGUOUS_KEPT; the registration margins (60-150 m) are 2D-photo choices and not a basis for 3D tree placement.

**Missing.**
1. Coverage: about 163 of the 235 km2 box lies outside the Warren sheet (BUILD.md section 9.5), and East Cavalry Field "lies just outside the Warren sheet" (`maps/README.md` section 8). The Battle Theatre needs that ground; the evidence set (Cope, Bachelder, Hopkins county sheet, OR text) has not been fused for it.
2. Crop per field, tree species and size, fence type: only the Wheatfield wheat is known. The 1860 agricultural census, damage claims and deed records are not ingested (see section 4 below on the catalog).
3. Cope sketches, Elliot's annotated hospital and grave map and the later park maps are downloaded as thumbnails but not georeferenced (`maps/sources.json`).
4. Hedgerows, cut timber for breastworks, yard and street trees: UNKNOWN in the existing work.
5. The NPS vegetation inventory (catalog row 25: its DownloadFile URL is robots-disallowed to our User-Agent and its printed catalog link is cut off), soils (SSURGO), Penn Pilot 1937-42 aerials: not used.
6. Fences and walls: 356 of 392 fence candidates undrawn; no stone-wall-versus-rail-fence classification; the NPS fence installation list in the CLR Record of Treatment was read but not converted to geometry.

### Step 6. Per-object provenance and tier

**Done.** Every catalogue feature carries `id, category, subtype, sources[] (cite, sheet or page, URL, type A1/A2/B, quote or paraphrase), method, positional_error_m, confidence` where confidence is Documented, Estimated, Contested or Unknown; 790 drawn features have sources (0 missing, `BUILD.md` pass 7); the land-cover set has 2,851 features and 0 schema problems. Pixel provenance: 17 classes in `PROVENANCE-LAYER/classes.json` with tiles and GeoJSON, the "show what was changed" layer. The Battle Theatre already has `tools/bt/validate_provenance.py` (PDF Appendix B: tier, render flag, two independent roots, procedural block).

**Reusable as-is.** The per-feature source records and positional errors; the idea of a provenance tile layer for "tier on request".

**Missing.**
1. A crosswalk between the b1863 vocabulary (Documented/Estimated/Contested/Unknown) and the PDF tiers (documented/inferred/plausible-procedural). They are not equivalent. Example: `woods_1863` records are labelled "Documented" from the Warren sheet alone, while the sheet shows 1868-69 and the Law and Gate Q19 require a source supporting exactly the claim (July 1863) and, for visible-result data, two independent roots. Under the PDF a Warren-only wood is at most inferred for July 1863 until Cope, photographs or Bachelder agree.
2. Fields the PDF asks for and the existing records lack: source dates, "the specific attribute that is inferred", conflicts, evidence class per attribute, per-object seed and render flag.
3. Procedural content (individual trees, rock scatter, grass) seeded for exact reproduction: the existing pipeline is deterministic (seed 1863) but works on pixels; no 3D object records exist.
4. Running `validate_provenance.py` over a converted set of terrain records.

### Step 7. Accuracy tests and photo-match

**Done.** Check 5 (`verification/check5-rephotography.md`, `check5/results.json`): 19 July 1863 photographs examined at LOC, 12 rendered with a pinhole camera over the 3DEP DEM with the shipped tiles draped; poses are the checker's own estimates (1 tier B, 6 tier C, 5 tier D; none A) because "Frassanito's coordinates are not in any open source I could reach". The relief matches (Big Round Top silhouette from Little Round Top 0.88 degrees rms). Findings as written: Devil's Den boulder field smoothed (34 percent of the polygon's pixels replaced; about half of the rock texture gone); no fence or wall drawn within 213 m of any camera while eight photographs show them within 100 m; photographed outbuildings missing; modern red roofs 100 m from the Thompson house; 30-93 percent of the ground in view at the photograph sites is synthetic fill. Five of six rephotography tests were red when the report was written. One finding was withdrawn because the camera position could not decide it (Little Round Top canopy, C03/C03b). Other checks: Check 2 georeference (above), Check 1 source trace (7 defects), Check 4 roads/water (13 defects, 5 spec failures), Check 6 anachronism hunt (35 sites, 10 spec failures), Check 7 photorealism (5 of 5 spec tests red), Check 8 claims and licences (14 red tests).

**Reusable as-is.** `check5/scripts/rephoto.py` (numba pinhole renderer), the candidate photograph list with LOC item IDs, the pose-tier definitions (A three independent landmarks to D guessed), the NPS Then and Now site descriptions as location text, the `tests/t0/verify-base1863-*.spec.mjs` specs as patterns.

**Missing.**
1. Contour residual maps by terrain class (hilltop, slope, valley floor, stream) and the final-surface-versus-Warren difference over the field.
2. The 2006-08 versus 2017 lidar difference.
3. The viewshed comparison with Knowles' published statements (Lee saw little of the Union force on day 2) and the Codori-Trostle thicket height test.
4. Documented camera positions. Only the NPS Rose Woods Then and Now example is named by the PDF as recoverable; the Plum Run and Rose farm positions are listed as a gap.
5. Pass criteria per photograph (the PDF says "pass criterion and the failures are recorded per photograph" but sets none).
6. A photo-match against the Battle Theatre 3D model; the Check 5 renderer uses assumed extrusion heights (canopy 4 + 1.5 m per metre of edge distance, capped 19 m).
7. Staged-photograph flags (Devil's Den sharpshooter): terrain and rocks only, never bodies or props.

### Step 8. Honest accuracy bound

**Done.** `BUILD.md` section 7 lists measured accuracy per layer and "Unknown and not measured" items; section 9 lists remaining artefacts; Check 8 found no "1:1" or "100 percent" claim in the layer. These bound the 2D reconstruction, not a surface.

**Documented bounds that exist today** (no more may be stated): Knowles, hilltops and ridgelines within about 50 ft of the 1996 DEM, creek beds and rolling ground by far more (quantity unresolved); Warren horizontal georeference 16.5 m leave-one-out; land-cover polygons 27 m median.

**Missing.** The Battle Theatre bound (after steps 1-3 and 7 produce residual maps); the class legend and in-product tier display; the statement that individual tree positions, exact fence lines everywhere, field crop state, path ruts, channel geometry and smoke density are plausible-procedural (the PDF text, to be rendered, not hidden).

## 3. Gates

| Gate | Text (PDF Section E, `GOVERNANCE/gates.json`) | Where it bites in the terrain pipeline | State today |
|---|---|---|---|
| **Q03** | No anachronisms: no modern monument, avenue, fence, sign, wire or marker; every 1863 structure exists on its date | Step 2 (surface edits must remove avenues, monument bases, pads), step 5 (structures, fences). Needs a terrain-specific automated scan | The 2D base fails its own hunt: Check 6 lists 35 remaining sites, 10 failing specs; 938 of about 1,320 monuments are positioned. The base raster cannot be reused as BT ground without a new Q03 scan |
| **Q16** | Photo-match tests at known camera positions of period photographs (staged flags respected) | Step 7 | No photograph has a documented camera position; all 12 renders use estimated poses (tier B/C/D). Without documented positions the gate cannot be called; each must be derived and registered |
| **Q21** | Vegetation state per field per date within the documented-or-ranged schedule | Step 5 (crop, canopy, ground cover), B.10.3 | No per-field schedule exists: crops UNKNOWN except wheat in the Wheatfield on 2 July; the base photograph is 4 June 2013 and `BUILD.md` section 9.2 says crop state is UNKNOWN. Nothing yet to check against |

Gates that also touch the terrain data (not asked, listed so they are not forgotten): Q02 (no datum without source and tier), Q19 (two independent roots), Q23 (non-documented items carry a render flag), Q07 and Q08 (fences, earthworks never baked into the ground), Q22 (weather-driven wet ground). PDF requirement mapping: R02 lists Q03, Q07, Q08, Q09, Q16; R20 lists Q21.

## 4. Source access, from the probe (115 requests, cap 150)

Summary of `terrain_sources_probe.json`: 66 unique URLs on 43 hosts; HEAD only, 3 s or more between requests, robots.txt honoured, no retries, nothing downloaded.

- URLs: ok 36, redirect 11 (one more hop followed where permitted), blocked 11 (LOC 403 x 7; hosts whose robots.txt answered 403: W&M finding-aid host x2, eHistory x2), robots-disallowed 3 (NARA catalog id page, MIT/BTAA record, NPS IRMA DownloadFile), not found 3 (Musselman GIS Day page, data.gov listing whose printed URL is cut off, Gettysburg College Perisho page), moved to a site search page 1 (PHMC 1880 census PDF), robots/host unavailable 1 (forum.game-labs.net: DNS failure).
- Rows: reachable 24, partially reachable 7, blocked 5 (rows 1, 4, 9, 12, 33), unreachable 3 (rows 20, 37, 41), print-only 2 (rows 5, 6), viewer-only 2 (rows 3, 28), request-only 1 (row 14), no URL 1 (row 7).
- LOC is not uniformly blocked: 7 item and collection pages answered 403 to HEAD while the collection JSON search URL answered 200 in the same pass. Per the rules no alternative request was made, so LOC items (rows 1, 8, 9, 11 partly, 33) stay "retry at pipeline run time with the documented 5 s spacing" (the earlier maps work fetched LOC items and JSON that way, `maps/README.md` section 3).
- Owner-only acts surfaced by this catalog: the request to the NPS GIS office (row 14), Rumsey permission for anything beyond noncommercial reuse (row 3), the University of Minnesota "contact the provider" licence (row 4), and the FamilySearch/Ancestry routes for the 1860 census named in B.9.3 (accounts).

## 5. Things in the PDF catalog that look wrong or inconsistent

1. **1860 census.** B.9.2 step 5 says the "1860 agricultural census ... (Table 4, rows 39 and 41)" would convert inference to fact. Row 41 lists extracts for 1850, 1880 and 1927 only; the ACHS row 38 lists census indexes for 1790 and 1830. No 1860 source is in the catalog.
2. **Tiers missing.** Only Tables 1 and 5 print a tier column: 16 rows carry R-tiers, row 9 prints "Not used", and rows 14-41 (28 rows) print none. The pipeline text assumes tiers everywhere.
3. **Warren attribution.** Row 15 gives the Knowles base map as "about 1874; survey by Lt. William H. Chase under Warren"; the project's LOC read says the sheet was revised on the ground in 1873 by P. M. Blake (`SOURCES-landcover.md`); row 2 says 1868-69 revised 1873. Not reconciled in either place.
4. **Truncated printed URLs.** Row 25 (`...national-milita`) and row 39 (`...after-the-b`) end mid-word as printed; the probe confirms 404 for row 25's and a redirect for row 39's. Row 41's PDF now lands on a site search page.
5. **B.9.3 retry list partly stale.** The Little Round Top CLR PDF and the CLR Record of Treatment were read by the earlier work; the NPS Historic Vegetation Study remains unfound.
6. **Row 44** carries its own date conflict (Sherfy orchard replanted 2008 here, 1883 elsewhere in the notes; Gilbert 2007); keep as a conflict-register entry, not a choice.
7. **Row 4 versus the project.** The PDF says the Bachelder 1876 map is "not confirmed georeferenced"; the project has registered the three LOC Bachelder sheets (item 99447491) to Warren at 2.2-2.4 m relative.
8. **Row 34** cites Wikipedia only, which is a lead and cannot support a documented claim (Law item 4); the book is copyrighted (cite, do not ingest).
9. **Row 9** (Michler) is listed "Not used"; the catalog therefore has 44 usable rows.
