# Period maps of Gettysburg, georeferenced to the modern ground

Scope: acquire the period maps (Warren, Bachelder, Hotchkiss/Jacobs, Cope, the 1858 Adams County map, the 1890s park and monument maps, HABS records), georeference them to the real ground, and say which are good enough to trace 1863 features from and with what accuracy. Everything here was run on 2026-10-19. This is a RECONSTRUCTION aid: no aerial photograph of 1863 exists, and nothing in this folder claims the result is exact. All numbers below come from `verification.json` and `transforms/*.json`, produced by the scripts in `tools/`.

## 1. Verdict (read this first)

| Map | Use for tracing? | Measured accuracy (metres, ground) |
|---|---|---|
| **Warren survey 1868-69/1873** (LOC 99448794) | **Yes, the master base** | absolute: fit RMSE 13.9, **leave-one-out RMSE 16.5** (median 12.6, max 36.5), n = 23 control points. Local relative accuracy is better than the absolute figure: feature-to-feature shifts between independently registered copies are 2-3 m (below). Where a feature still exists (a road, a farm building, a bridge, Rock Creek) it can be snapped to the NAIP/3DEP ground to a few metres. |
| **Bachelder 1876, three sheets** (99447491) | Yes, for troop lines; same topography as Warren | relative to Warren: 5-fold cross-validated 2.2-2.4 m (3300-3900 SIFT matches per sheet); 100 random 192 px patches per sheet match Warren with RMS shift 2.8-3.1 m (median 1.7-2.0). Absolute = Warren's 16.5 m plus that. |
| **Woeltje & Cutting 1888** (99448798) | Marginal; use Warren instead (it is Warren plus hachures and owners) | relative to Warren CV 4.3 m (83 matches, 53 control pairs); patch shifts RMS 6.2 m. Absolute = Warren's plus that. |
| **Hopkins 1858, Gettysburg borough inset** (2004629149) | **Yes, inside the borough**: 1858 streets, building footprints, depot, churches, hotels | affine on 8 street junctions: fit RMSE 1.9, **leave-one-out 2.9** (max 4.2). Valid only over the borough grid (about 0.8 x 0.6 km); extrapolation untested. Scale differs 4 % between axes (0.407 x 0.425 m per px), kept in the affine. |
| Hopkins 1858, county sheet | **No** (names, owners, which villages and roads existed) | leave-one-out 376 m (10 villages; dots read to about 200 m; GNIS points are not exact village centres) |
| Hotchkiss/Jacobs sketch (99439128) | **No** | 5 control points, residuals 20-270 m, leave-one-out 492 m: a sketch, not a survey |
| Cope Culp's Hill 1898 (99439193), GNMP 1900 (99448795), NY Monuments 1894 (99447503), Elliott 1864 (99447501), Cope sketch (99447498) | Not georeferenced here | Downloaded and thumbnailed. SIFT registration to Warren failed or gave 7-15 inliers (different drawing style, hachure shading, blueprint). Next step is hand pairs against Warren with `tools/pairview.py` and `tools/pair_pick.py` (see section 6). |
| HABS records (pa1728 Trostle barn and others) | Building-scale evidence, not map sources | cited only |

What is uncertain (not hidden): the absolute position of the Warren sheet is known to about 16 m, not 1 m; the residuals are not random (section 4); the hill summits rest on a modern surface (quarrying, road cuts); the control points assume that road crossings, bridges and farm buildings stood where they stand today.

## 2. What is in the folder

| Path | What |
|---|---|
| `sources.json` | citation and licence table for every map and every ground dataset (title, author, date, type A1/A2/B, LOC URL, call number, file URL, pixel size, licence, status) |
| `transforms/*.json` | **the deliverable**: for each georeferenced map the affine (or control pairs for the thin-plate maps), `px_to_en` and `en_to_px` in EPSG:32618 (WGS 84 / UTM 18N), accuracy figures, residual list |
| `gcps/*.json` | every control point with scan pixel, ground E,N, kind, note and the station image it was read from; `warren.json` also holds 6 independent road-centreline constraints |
| `verification.json` | the eight checks of section 5 |
| `checks/*.jpg` | side-by-side checks at 1 px = 1 m: georeferenced map, NAIP, and map with 3DEP contours (red) |
| `thumbs/*.jpg` | 900 px thumbnails of every downloaded scan |
| `tools/` | all scripts (section 6) |

Full-resolution scans (about 250 MB) and the georeferenced rasters (`tmp/b1863/maps/georef/*.tif`, 1 m grid, EPSG:32618, RGB plus alpha footprint, 200-240 MB each) are not committed; they are rebuilt by the scripts.

Raster files built (all in `tmp/b1863/maps/georef/`): `warren-1869`, `bachelder-1876-sheet1/2/3`, `woeltje-1888`, `hopkins-1858-gettysburg-inset`, `hopkins-1858-county` (4 m).

## 3. Method

1. **Acquisition.** The LOC JSON API (`?fo=json`) on item pages and `/collections/civil-war-maps/` was used with an identifying User-Agent, 5 s between requests (robots.txt Crawl-Delay is 5), retries on 5xx, one download per file from `tile.loc.gov` (its robots.txt is a 404, so no restriction is stated). The `/search` paths that robots.txt disallows were not used. Item JSON is cached in `tmp/b1863/maps/items/`. The LOC items carry no Rights Advisory.
2. **Reference ground** (all US Government public domain): USGS NAIP imagery and USGS 3DEP bare-earth DEM at 1 m from The National Map services, Census TIGERweb roads and rail, USGS NHD flowlines, USGS GNIS populated places; all fetched into the EPSG:32618 grid 301750-313000 E, 4405000-4415750 N (`tools/fetch_ref.py`, `fetch_vec.py`). No Google, Bing, Maxar or Mapbox data was fetched or used.
3. **Control points** were chosen only among things that existed in 1863 and still exist or can be located today: road junctions and bridges (TIGER and NHD candidates generated by `tools/cand.py` and `cand_water.py`, then judged on side-by-side station images), hill summits (3DEP maxima against the closed contours and summit marks), standing farm buildings (Sherfy, Trostle, Rose, Leister, Hummelbaugh and S. Patterson sites). Each was read on a labelled grid in both images (`tools/zoomgrid.py`, `pick_z.py`). Six more constraints are Warren road centrelines (Emmitsburg, Taneytown, Baltimore Pike) that constrain only the distance normal to the modern TIGER road (`tools/roadfit.py`); they were kept out of the fit and used as an independent check.
4. **Transform choice.** Affine, quadratic and thin-plate models were compared by leave-one-out on the 23 Warren points (`model_comparison` in `warren-1869.json`): affine 16.5 m, quadratic 16.3, thin-plate with smoothing 0.5 16.6 and with smoothing 2.0 15.6. The differences (about 1 m) are smaller than the scatter, so more flexible models are not shown to predict held-out points better, and **the affine is the transform of record** for Warren (simplest, and the same model used for the derived maps). A robust affine that drops the two worst points (the Big Round Top summit and the York Pike bridge) lowers the fit RMSE (10.7 m) but raises the independent road-line RMSE (17.5 vs 13.9 m), so it was not adopted; both are stored.
5. **Derived maps** (Bachelder, Woeltje) were registered to the Warren scan, not to the ground, by SIFT feature matching with RANSAC (they share its engraved topography), then a thin-plate spline on spatially thinned pairs, then the Warren affine to the ground. Their absolute error is therefore the Warren error plus their relative error.
6. **Rasters** are warped with OpenCV from the original scans (`tools/rasterize.py`, `tools/derived.py`).

## 4. Where the Warren sheet is distorted

Affine residual (map minus ground, metres, `warren-1869.json` `residuals`): town street crossings E -10, N -6 (three points, consistent); Peach Orchard crossroads E +18; Hanover Road and York Pike bridges over Rock Creek E +11..+15, N +13..+25; Round Top summit E -25, N +17; Little Round Top and Stevens Knoll within 6 m; Sherfy and Leister houses within 1 m; Rose house N +17; Trostle barn N -14. The affine scale is 0.989 m per px along x and 1.014 m along y (rotation 3.8 degrees from north-up): a 2.5 % anisotropy, consistent with paper shrinkage or a non-square scan. The pattern is smooth rather than random (east and north of the centre read high, the town reads low), which a thin-plate model can absorb in the fit (fit RMSE 7.6 m at smoothing 0.5), but held-out accuracy did not improve at this point density (15.6-16.6 m), so the residual pattern is reported rather than fitted. The two worst points are hill summits, where the modern surface (quarries, road cuts, 150 years of change) may differ from 1869.

Attempted and abandoned: aligning the Warren raster to DEM-derived contours/slope by windowed cross-correlation (`tools/dem_refine.py`, `dem_refine2.py`). The correlation peaks were weak and ambiguous (peak 0.03-0.18, second peak within 5 percent), so the shifts are not trusted and were not used.

## 5. The eight checks (`verification.json`, `tools/verify.py`)

1. **Refit reproducibility**: refitting from `gcps/warren.json` reproduces the stored transform exactly (max difference 0).
2. **Leave-one-out**: 16.5 m RMSE, 12.6 m median, 36.5 m max over 23 points (fit RMSE 13.9 m).
3. **Independent road lines**: 6 scan points on road centrelines (not in the fit) lie 0.9-28 m from the modern centreline of the same road; RMSE 13.9 m. This includes real 1863-versus-modern road differences, so it is an upper bound on map error.
4. **Frame and scale**: the corners of the scan fall at 39.8675 N 77.2916 W (NW), 39.8642 N 77.1890 W (NE), 39.7777 N 77.2943 W (SW), 39.7744 N 77.1918 W (SE): a sheet of about 8.8 x 9.8 km around Gettysburg, rotated 3.8 degrees from north-up. Anisotropy 2.5 %.
5. **Raster round trip**: sampling the georeferenced raster at the 23 control ground points gives the same colour as the scan at the control pixels (max difference 9.4 of 255); CRS EPSG:32618, 1 m pixel.
6. **Bachelder vs Warren on the finished rasters**: 100 random patches per sheet, normalised cross-correlation between the Warren raster and each Bachelder raster: RMS shift 3.0, 3.1 and 2.8 m (median 1.7-2.0, 90th percentile 3.6-4.0).
7. **Woeltje vs Warren**: RMS shift 6.2 m (median 5.0, 90th percentile 8.5), mean correlation 0.46.
8. **Standing 1863 buildings**: the 8 farm-building control points have leave-one-out RMSE 11.4 m (Sherfy house 1.4, Leister 1.2, Hummelbaugh 2.5, Trostle house 6.7, Sherfy barn 10.9, S. Patterson 12.3, Trostle barn 15.1, Rose 22.0). Building identity (1863 fabric versus later replacement) is uncertain for Hummelbaugh and S. Patterson. Two J. Weikert buildings were excluded because their identity was not verified (40-58 m from the fit).

Checks 5 to 8 and the visual checks in `checks/` are weaker than an independent surveyed benchmark; there is none for 1869. The Hopkins inset has its own leave-one-out figure (2.9 m, 8 points) and a visual check (`checks/hopkins_inset_town.jpg`: the 1858 block and street pattern lies on the modern street grid; the Diamond is a plain crossing in 1858, a roundabout now).

## 6. Reproduce

Python 3.11 with numpy, pillow, scipy, shapely, pyproj, rasterio, opencv-python-headless (installed here with pip). Run at low priority (`nice -n 10`), at most 4 threads.

```
tools/fetch_ref.py naip ; tools/fetch_ref.py dem ; tools/fetch_vec.py        # reference ground into tmp/b1863/maps/ref
tools/mosaic.py naip ; tools/mosaic.py dem ; tools/hillshade.py ; tools/contours.py
tools/cand.py ; tools/cand_water.py ; tools/summits.py ; tools/mk_cands.py ; tools/mk_summits.py   # candidate control points
tools/zoomgrid.py / st.py / nodes_view.py / roadview.py                       # read control points; pick_z.py, pick.py, pick_line.py record them
tools/finalize.py fit                                                         # Warren transform from gcps/warren.json
tools/sift_reg.py  (Bachelder, Woeltje)  ->  tools/derived.py                 # derived transforms; rasterize.py / derived.rasterize for rasters
tools/affine_maps.py                                                          # Hopkins inset and county, Hotchkiss
tools/verify.py ; tools/make_sources.py
```

To finish an ungeoreferenced map: `tools/pairview.py gcps/<map>.json cx cy half zoom out.png` shows the map pre-warped by its coarse affine beside the Warren scan; `tools/pair_pick.py` records hand pairs; then run `tools/pairfit.py` and `derived.write_derived`.

## 7. Licences and attribution

| Source | Licence | Credit line |
|---|---|---|
| LOC Geography and Map Division scans (Warren, Bachelder, Woeltje, Hopkins, Hotchkiss/Jacobs, Cope, GNMP, NY Monuments, Elliott) | public domain by age; LOC states free to use and reuse unless a Rights Advisory is present (none on these items) | Library of Congress, Geography and Map Division |
| LOC HABS records | no known restrictions on images made by the US Government; images copied from other sources may be restricted | Library of Congress, Prints and Photographs Division, Historic American Buildings Survey |
| USGS NAIP, 3DEP, NHD, GNIS; Census TIGER | US Government works, public domain | USGS The National Map; USDA FSA NAIP; US Census Bureau |

Not used: Google Earth/Maps, Bing, Maxar, Mapbox. Not fetched or committed: full-resolution scans, georeferenced rasters, caches. The owner's personal e-mail address appears nowhere.

## 8. Honest limits

The accuracy figures are measured against control points that I picked by eye on 2022 imagery, so they include my reading error (about 3-5 m) and any mistaken identification. They say nothing about places far from a control point; the control points cover the central battlefield and the town better than the north (Oak Hill, Mummasburg Road) and the far south and east (Big Round Top to Marsh Creek, East Cavalry Field, which lies just outside the Warren sheet). Features not on a period map are UNKNOWN here, not absent.
