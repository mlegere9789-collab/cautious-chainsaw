# Troop-map georeference: accuracy report (2026-10-21)

Reuses the Warren control-point work in `docs/basemap1863/maps/` (23 GCPs, affine, leave-one-out RMSE 16.5 m; `gcps/warren.json`, `transforms/warren-1869.json`). Nothing here is claimed more precisely than the numbers below.

## Map 1: Bachelder 1876, sheet 3 (Third day's battle), `cw0325000c.jp2`, 8315 x 11407 px

Transform of record (unchanged, committed 2026-10-19): thin-plate spline scan px to Warren px on 1,098 thinned SIFT pairs, then the Warren affine to UTM 18N (`transform_chain_of_record_sheet3.json`). Its relative cross-validation against the Warren scan is 2.4 m RMSE (median 1.7 m, 3,305 matches), so the absolute 1-sigma is sqrt(16.5^2 + 2.4^2) = **16.7 m**.

Independent hand check done this session (`hand_readings_sheet3.json`, `gcps_bachelder1876_sheet3.json`, previews `previews/sheet3_gcp_check_*.jpg`): 12 Warren control features (Sherfy house and barn, Trostle house and barn, Rose house, S. Patterson house, Leister house, Peach Orchard crossroads, Taneytown x Wheatfield Rd, Hanover Rd and York Pike bridges, Baltimore St / Steinwehr Ave fork) were located by eye in the Bachelder scan (3x crops, 20 px grid) as offsets from the position the committed chain predicts from the Warren GCP. Reading precision per point 3-8 px (3-8 m).

| Quantity | Value |
|---|---|
| Chain of record evaluated at the 12 hand-read points | RMSE 15.05 m, median 13.1 m, max 24.1 m |
| Warren affine alone at the same 12 ground points | RMSE 14.39 m (in-sample), median 12.0 m, max 27.5 m |
| Direct affine fitted to the 12 hand-read pairs only | fit RMSE 10.6 m, **leave-one-out RMSE 14.4 m**, median 12.1 m, max 22.4 m |
| Scale of the scan | about 1.0 m per px (consistent with 1:12,000 at the LOC scan resolution) |

Reading: the Bachelder sheet carries the Warren error and adds almost nothing of its own (15.05 m versus 14.39 m). The 12 points are the same ground truth as the Warren GCPs, so this check cannot reveal an error common to both maps (for example a shift of the whole Warren sheet). The Warren distortion pattern (smooth, up to 24 m at the Rock Creek bridges, 17-19 m at Rose and Trostle) is therefore also in the Bachelder sheet.

Accuracy bound adopted: **transform 16.7 m (1 sigma) over the control region (Peach Orchard to the town, Cemetery Hill to the Wheatfield)**. Outside it (Oak Ridge and Oak Hill in the north, Big Round Top to the south, east of Rock Creek) there are no control points: treat as worse, not quantified.

Per-claim sigma (`labels_sheet3_raw.json`, `troopmap_jul3_b1876.jsonl` `geo.sigma_m`) = sqrt(16.7^2 + (reading and placement)^2). Reading and placement: 15 px base (a 12-label verification sample, `previews/sheet3_verification_sample12.jpg`, found all label points on or beside the printed text, worst label-centre miss about 60 px) combined with a uniform half-extent of the line symbol (anchored labels) or 100 px (label-only: the label stands within about a label length of its line). Result: 32-205 m, median 62 m. A symbol position is a map symbol, not a surveyed position; individual soldiers are not located by it.

## Map 1b: Bachelder 1876, sheet 2 (Second day's battle), `cw0325000b.jp2`, 8304 x 11092 px (added 2026-10-21)

Transform of record: the committed chain for sheet 2 (relative CV against Warren 2.4 m RMSE), absolute 1-sigma **16.7 m**. Hand check as for sheet 3 (`hand_readings_sheet2.json`, `gcps_bachelder1876_sheet2.json`, `previews/sheet2_gcp_check_*.jpg`): 10 Warren control features re-found by eye (Sherfy house and barn, Trostle house and barn, Rose house, S. Patterson house, Leister house, Taneytown x Wheatfield Rd, Hanover Rd and York Pike bridges; the Peach Orchard crossroads and the Baltimore St fork were not identifiable in this sheet's crops and are not used).

| Quantity | Value |
|---|---|
| Chain of record at the 10 hand-read points | RMSE 15.84 m (max about 29 m at the York Pike bridge) |
| Warren affine alone at the same points | RMSE 14.6 m |
| Direct affine fitted to the 10 hand pairs | fit RMSE 11.6 m, **leave-one-out RMSE 16.7 m**, max 24.8 m |

Same reading as sheet 3: the sheet adds almost nothing to the Warren error, and the check cannot reveal an error shared with the Warren sheet. Per-claim sigma: 57-148 m (median 76 m) for brigades.
Label-position check: 20 random sheet-2 claims re-viewed with label and anchor points drawn (`previews/sheet2_verification_sample20.jpg`): all 20 label points lie on or within about 50 px of the printed text; 17 of 20 anchors lie on or beside a bar of the correct colour, 3 are offset by a bar width or more (Zook, Robertson and Kershaw anchors); no sample was wrong by more than the stated sigma.

## Map 2: LOC 99447494, July 1, 2 to 3.30 p.m. (Commons JPG, 4462 x 4943 px)

Preliminary only; **not used for any claim**. 11 hand pairs against the georeferenced Warren raster (`gcps_loc99447494_july1.json`), affine (`transform_loc99447494_july1.json`): fit RMSE 33.5 m, **leave-one-out RMSE 48.8 m** (median 42.5 m, max 93.7 m), scale 1.9-2.0 m per px. Control points lie only in x 1300-3450, y 1050-2250 of the scan. Dropping the worst point (J01, Herr Tavern, 62 m) after seeing it gives LOO 34.1 m; that is shown for information and not adopted. Because this sheet is redrawn from the Warren survey, a feature-based registration to the Warren raster (as for Bachelder) may do much better; not attempted.

## Files

| File | Content |
|---|---|
| `gcps_bachelder1876_sheet3.json`, `hand_readings_sheet3.json` | the 12 hand-read control points (scan px, predicted px, offset, reading sigma, ground E,N) |
| `transform_chain_of_record_sheet3.json` | copy of the committed chain of record |
| `transform_direct_affine_check_sheet3.json` | direct affine check, per-point fit and leave-one-out residuals |
| `labels_sheet3_raw.json` | all 167 labels: text as printed, side, kind, pixel positions, crop name, georeferenced lng/lat (EPSG:4326) and UTM, sigma |
| `crops/*.jpg` | the 35 ink-layer crops the labels were read from (JPEG q60); recipe and coordinate rule per crop in `tools/bt/troopmaps/crops_c.json` |
| `previews/` | GCP check montages, all-label overlay, verification sample |
| `gcps_loc99447494_july1.json`, `transform_loc99447494_july1.json` | preliminary July 1 georeference |


## July 1 georeferences (2026-10-21, second pass): Bachelder sheet 1 and LOC 99447494

This section supersedes the 'Map 2 ... preliminary, not used' paragraph above for LOC 99447494. Reproduce: `tools/bt/troopmaps/gt_j1.py`, `gtmont.py`, `vecover.py`, `fieldmodel_a.py`, `fieldfit_j1a.py`, `georef_j1_v2.py`.

**Ground truth used (independent of the Warren sheet).** Footprints of surviving buildings in the structures layer (2023 Adams County building outlines, bbox centre, 6-12 m: McPherson barn, McLean barn and house, Pennsylvania Hall, McMillan house, Schultz house, Dobbin house) and Warren GCPs that carry modern ground truth (Rock Creek bridges, Peach Orchard and Taneytown crossings, Leister house; NAIP/TIGER/DEM). Candidates: `tools/bt/troopmaps/gt_j1.json`. Reading by eye in 3-4.5x crops with a 20 px grid (`gtmont.py`); a 2023 county road and building overlay through the transform (`vecover.py`) was used to confirm which symbol cluster is which.

### Bachelder 1876 sheet 1 (`cw0325000a`), First day
* **The committed chain of record (TPS to Warren px, Warren affine, `bachelder-1876-sheet1.json`) is 70-138 m out in the north-west** (McLean barn 87 m, McLean house 91 m, Pennsylvania Hall 70 m; the same three points are within 15-25 m of the Bachelder bridges at Rock Creek). The Warren GCPs are all south and east of the Seminary; the north-west corner of the Warren sheet is unconstrained. Not used for July 1.
* **Transform of record for July 1:** the roads-task registration (base affine plus a smooth displacement field, grid 450 px, fitted to the 23 Warren GCPs and 26 hand-read road lines: `docs/basemap1863/features/roads-rail-water/registration_sheet_a.json`, leave-one-out 18.6 m on GCPs, 14.3 m on road lines), implemented in `fieldmodel_a.py`.
* **Independent validation** on the hand-read surviving buildings that were not fitted (McLean barn, McLean house, Pennsylvania Hall; `gcps_bachelder1876_sheet1_j1.json`, `transform_bachelder1876_sheet1_j1.json`): error 15.5, 25.2 and 35.2 m, RMS **26.5 m** (the chain: 83 m). Two further buildings (Schmucker Hall, Black Horse Tavern) were excluded because the symbol identification was ambiguous. McPherson, Shultz, McMillan and Thompson-house symbol clusters were checked by eye against the county outlines drawn through the field model: inside the printed cluster, 10-25 m from its centre. Adding the building points into the field fit gave a building leave-one-out of 21.9 m (3 points) and moved the Warren-GCP leave-one-out from 22.6 to 23.5 m: no gain that justifies a refit, so the roads-task field is used unmodified.
* **Honest bound: 1 sigma about 30 m** for scan y >= 1900 and x >= 1500 (McLean farm south to the Seminary, the town, Cemetery Hill, east to Rock Creek); **50 m** outside it (Oak Hill north of y 1900, Herr Ridge and west of x 1500, east of Rock Creek). Only three independent points exist: this is a small-sample estimate, not a proven bound.

### LOC 99447494 (July 1, 2 to 3.30 p.m.), 4462 x 4943 px
* **12 hand-read controls** (`gcps_loc99447494_july1_v2.json`; McLean barn and house, Pennsylvania Hall, McPherson and Shultz and McMillan symbol clusters, Dobbin house, Hanover Rd and York Pike bridges, Peach Orchard and Taneytown crossings, Leister house); the Black Horse Tavern is read but not used (three symbols within 20 px). Direct affine px to UTM18N (`transform_loc99447494_july1_v2.json`): fit RMSE 27.4 m, **leave-one-out RMSE 37.7 m** (median 30.6 m, max 56.8 m), scale 1.92-1.96 m per px. TPS (smoothing 0 to 5) gave leave-one-out 38-43 m (no better), quadratic 80 m (over-fit).
* The previous preliminary figure (48.8 m) came from 11 pairs read from the Warren raster, so it carried the Warren error; the new controls have county-outline ground truth. **The bound improves to 37.7 m, which is below 40 m but not by much: sigma 40 m is used inside the control region (scan x 1700-3300, y 790-3730), 60 m outside (west of Willoughby Run, Herr Ridge, the far north and east).** Residuals show no systematic pattern (largest: McMillan 48 m, Peach Orchard crossing 32 m, York Pike bridge 38 m); symbol clusters on this 2 m/px sheet limit reading to 8-15 m.

### Per-claim sigma and label check
* Sheet 1 (`troopmap_jul1_b1876.jsonl`): sigma = sqrt(T^2 + (reading+placement)^2) with T = 30 or 50 m and the 15 px base and symbol half-extent (or 100 px label-only) of sheet 3; brigade claims 44-197 m, median 93 m (label-only claims dominate the upper end).
* Hour sheet (`troopmap_jul1_hour_loc99447494.jsonl`): T = 40 or 60 m, reading 8 px, bar half-length (or 60 px label-only) times 1.93 m per px; brigade claims 66-158 m, median 125 m.
* Verification by eye: 20 of 115 sheet-1 claims (`previews/jul1_sheet1_verification_{1,2}.jpg`, list `jul1_sheet1_verification_list.json`) and 20 of 26 hour-sheet claims (`previews/jul1_hour_verification_{1,2}.jpg`, `jul1_hour_verification_list.json`): in all 40 the stored label point lies on or beside the printed text of the claim's quote; worst miss about 45 scan px (sheet 1, Brockenbrough) and about 30 scan px (hour sheet, label points that fall between the words of a spread-out division label; one such point, EARLY'S DIVISION, was moved onto a letter after the first check). Anchors were looked at but not counted: most lie on or beside the line symbol, a few are off by a bar width or more (sheet 1: the Garnett's battalion anchor lies about 70 px north of the gun rows, in the wood edge; hour sheet: the PENDER'S DIVISION anchor lies on the creek beside the bar). The sigma model already carries the symbol half-extent.
