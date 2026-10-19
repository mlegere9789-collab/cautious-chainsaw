# Verification pass 2 of 8: georeference accuracy of the 1863 reconstruction

Independent check, 2026-10-19. Method: re-georeference two period maps (Warren 1868-69 and the Hopkins 1858 Gettysburg inset) from my own measurements against NAIP and 3DEP data, then measure the reconstruction's roads, buildings and woodlot edges against those traces. Numbers are in `check2-results.json`; scripts and caches are in `tmp/b1863/check2/` (not committed); failing tests are `tests/t0/verify-base1863-georeference.spec.mjs` (4 pass, 6 fail by design). Nothing here claims the reconstruction is 1:1 or 100 percent accurate, and nothing found changes that: it is a reconstruction.

## 1. Verdict

The pixels are registered to the NAIP photograph almost perfectly. The 1863 content placed on them is not: the Warren sheet cannot be tied to the ground better than about 15 to 25 m by any method I tried, the build uses two Warren georeferences that disagree by a median of 24.5 m on the road network, and the stated errors are too small for 8 roads, 5 survivor buildings, the Hopkins roofs far from control, and the Warren town masses. Registration of the pictured features is therefore tens of metres (25 to 60 px at z16), not "1:1".

## 2. What I could not verify (up front)

* No independent ground truth for 1863 exists. Every accuracy number below is a comparison between measurements that each carry error; where two builders' frames disagree I cannot say which is right.
* My manual control points for Warren are few (3 new points plus 6 re-picks of the builders' points). My Warren transform from road lines alone is worse than the builders' (27.5 m rms on their points), so I do not offer a replacement transform. The independent finding is the conflict between road-line and point evidence, not a better fit.
* Hopkins: my 10 picks give fit 3.9 m, leave-one-out 6.6 m. I could not reproduce the builders' 1.9 / 2.85 m with my own picks (their numbers do reproduce from their file). My picks agree with theirs to 6.7 m rms.
* Coverage: 118 tile windows, 329 road cross-sections, 433 of 433 drawn structures, 334 of 334 drawn Hopkins roofs, 45 coherent Warren road runs (384 windows of 8,062), 980 woodlot edge samples (85 woods), 25 builder control points, 41 survivor entries (flagged ones viewed), about 12 farmsteads viewed by eye. Not checked: orchards edge by edge, fences, bridges (except 2), the 4,000+ unvisited tiles' content, structures' own thin-plate frame (not available to me), anything outside the Warren sheet.
* Lidar canopy (2017) is the builders' file; woodlot edges that moved since 1863 add scatter I cannot separate from registration.

## 3. Pixel registration (control, passes)

* Tile pyramid vs the NAIP mosaic: 118 phase-correlation windows, median shift 0.004 px east, 0.021 px north (1 m pixels). Registered.
* Datum: the base grid is EPSG:26918 (NAD83) and tiles are produced with a null NAD83 to WGS84 step. The proper NAD83(2011) to WGS84(G1762) transformation shifts positions about 0.2 m E and 0.9 m N. Under 1 px; low severity, undocumented.
* Drawing fidelity: 329 road cross-sections, drawn ribbon centre is 0.38 m median (rms 0.50, max 2.5 m) from the catalogue line; 433 of 433 drawn structures sit within 2.24 m (median 0.84 m) of their catalogue footprint.

## 4. Warren sheet (LOC cw0353500)

My methods: (a) a matched filter for the pair of road-edge lines Warren draws, run on 8,062 windows along 79 TIGER lines; 384 windows in 45 coherent runs (adjacent windows within 3.5 m) on 26 roads; (b) my own picks at bridges, a crossing and farm symbols; (c) re-derivation of both builders' georeferences.

| Frame | Evidence | Result |
|---|---|---|
| Maps affine (builder transform of record) | 25 builder point controls | rms 21.2 m (13.9 m without the two J. Weikert points); leave-one-out reproduces 16.48 m |
| Maps affine | my 45 road runs, normal offset of Warren road pair vs TIGER centre line | rms 17.1 m, median abs 8.0, p90 28.6, max 36.5 |
| Land-cover FFD (used for woods, orchards, Wheatfield) | the same 25 points | rms 29.6, median 26.8, max 62.8 m; mean bias (E,N) = (-0.8, -14.0) m; no better after refitting an affine (leave-one-out 16.5 m) |
| Land-cover FFD | my 45 road runs | rms 11.1 m (it was fitted to roads) |
| Affine minus FFD | at the 45 run locations | rms 32.8, median 24.5, max 113 m, mean (-4.1, -22.3) m |

Reading: roads favour the FFD frame (11 vs 17 m) and point features favour the affine (14 vs 26 m); the two kinds of evidence conflict by about 20 m. A smooth field fitted to my road runs predicts held-out runs to 6 m (leave one run out) but 11 to 14 m when a whole road family is left out, and predicts the builders' point residuals worse than no correction. So the Warren sheet is locally distorted by up to about 25 m over 1 km scales, and modern centre lines differ from the 1863 road pairs by comparable amounts.

Independent confirmations by me: Hanover Rd and York St bridges over Rock Creek lie (+8,+14) and (-5,+14) m from the NAIP bridges in the affine frame (builders: +11..+15 E, +13..+25 N); Peach Orchard crossing (+17,+8) (builders: 18, 3); six farm symbols re-picked from overlays agree with the builders' residuals to 5.5 m rms. At Sherfy, Trostle, Hummelbaugh and Leister the affine frame puts the surviving outline within about 5 to 8 m of its symbol. At J. Weikert it is about 60 m off, at McMillan about 47 m, at the McPherson barn about 80 m.

Independent test of the FFD bias: the catalogue Wheatfield polygon fits the modern open Wheatfield best when moved 33 m north (canopy inside 0.26 to 0.21, boundary contrast -0.02 to 0.30). The drawn wheat is clipped to open ground so it covers most of the field, but the polygon's extent is wrong by that order; Medium.

Woodlot edges (980 clean samples on 85 woods in the FFD frame; 765 on 81 in the affine frame) against the 2017 canopy edge: median +6 m (+4), MAD 20.8 m (23.7), 34 percent within 10 m. Best-fit shifts per 3 km cell are at most 13 m and do not reduce the scatter, so this test cannot choose between frames; it is consistent with the stated 30 to 40 m and does not support anything tighter.

## 5. Hopkins 1858 borough inset

* Builders' 8 points reproduce: fit 1.91 m, leave-one-out 2.85 m.
* My 10 picks: fit 3.89 m, leave-one-out 6.61 m (max 14.9, one South St pick of mine is poor); builder transform vs my picks rms 6.74 m. Anisotropy (0.415 vs 0.431 m per pixel) is real in both fits.
* Drawn roofs: 319 of 334 lie within 15 m of an ink symbol I detected under the builders' transform (median 0.4 m, rms 2.2 m): faithful to the transform. 15 do not (listed in `tmp/b1863/check2/hopcheck.py` output when rerun).
* Extrapolation: only 103 of 334 roofs (31 percent) lie inside the control hull; 114 within 100 m, 80 at 100 to 200 m, 37 farther (max 539 m). My transform differs from the builders' by median 2.8 m inside, 5.1, 8.0 and 11.6 m (max 16.4) in the successive bands. All 334 carry `positional_error_m` 4.
* Pennsylvania College check, 460 m beyond the hull: the Hopkins hatched college building lies about 48 m south-south-west of surviving Pennsylvania Hall in the builders' frame. The drawn Warren mass STR-BORO-MASS-003 (stated error 20 m) is 69 m from Penn Hall, whose real roof is also kept: the college appears twice. In addition the kept roof of Penn Hall has its cupola area replaced by lawn texture (NAIP vs z16 tile, centre (308811, 4411828)); pass 1 reports kept pixels as unchanged, so this contradicts it. High for the duplicate, Medium for the roof hole.

## 6. Roads: stated error vs measured (Warren pair vs drawn centre line, affine frame, abs metres)

Catalogue stated `positional_error_m` is exceeded at: RD-003 Emmitsburg Rd (29 vs 22), RD-004 Taneytown Rd (20 vs 17, two runs), RD-005 Hanover Rd / PA 116 (36 vs 30), RD-006 York St (31.5 vs 30), RD-014 Wheatfield Rd (27 vs 24), RD-021 Table Rock Rd (22 vs 15). Within stated: Old Harrisburg Rd, Carlisle St, PA 34, Hunterstown Rd, Baltimore Pike (9 to 21 vs 22). Full table in `check2-results.json`. Roads are drawn on modern centre lines, so these offsets are the error against the period sheet, mixed with the sheet's own distortion (section 4).

Width: drawn ribbons (class ROAD_ADDED, with verge shading) are 1.6 to 2.3 m wider than the stated class width (stated 3.0, 4.5, 6.5 m: drawn median 4.6, 6.9, 8.8 m). Low.

## 7. Buildings

* Survivors are drawn on real roofs, so their own position is exact. But five survivors marked Documented are 29 to 84 m from their own Warren plate symbol in the builders' frame (Spangler house 29, McMillan 33, Bryan house 41, Culp house 47, McPherson barn 84) while carrying `positional_error_m` 4; the identity check against the symbol fails for them. Medium.
* Lost outbuildings placed by anchoring on survivors: Sherfy outbuilding and barn sit 3 to 5 m from their symbols (good). At Slyder, Warfield/Snyder (5 outbuildings) and McMillan the drawn outlines do not coincide with any Warren symbol in the builders' affine frame and the arrangement cannot be matched by a translation; I could not use the structures task's own frame, so these are flagged, not proven. 99 non-town structures and 23 Warren masses were not each checked.

## 8. Comparison with the builders' stated errors

| Statement | My measurement | Holds? |
|---|---|---|
| Warren to ground 16 m absolute (maps) | 16.5 m reproduced; 17.1 m rms vs roads | yes, as an average |
| Land cover 27 m median, 63 m max, stated 30 to 40 m | 26.8 / 62.8 reproduced; mean bias 14 m south; max beyond stated | median yes, maximum no |
| Structures leave-one-out median 10 m, max 35 m | frames differ 24.5 m median on roads; survivor symbol mismatches 29 to 84 m | not shown; control is thin |
| Hopkins 1.9 m fit, 4 m stated for all roofs | 3.9 / 6.6 m from my picks; 69 percent of roofs outside the control hull; 48 m miss at the college | not for extrapolated roofs |
| Roads 15 to 32 m | exceeded on 6 roads | partly |
| Seams, pass 1 (kept pixels unchanged) | Penn Hall roof hole inside a kept building | no |

## 9. Defect list

| Severity | Area | Defect and location |
|---|---|---|
| high | structures / town | Pennsylvania College drawn twice: STR-BORO-MASS-003 at (308792, 4411761) is 69 m from surviving Penn Hall (308811, 4411828), whose real roof is also kept; stated error 20 m. Test G2-07. |
| high | Warren frames | Land-cover FFD frame disagrees with the maps affine by median 24.5 m (max 113 m) on the road network, mean 22 m south; woods, orchards and Wheatfield use FFD, structures and roads another frame. Features of different layers inherit different shifts (Peach Orchard polygon vs Sherfy house in the Peach Orchard area). Tests G2-09, G2-10. |
| medium | Hopkins roofs | 231 of 334 roofs lie outside the control hull (37 farther than 200 m, up to 539 m) yet all state 4 m; the college symbol is 48 m off. Test G2-06. |
| medium | roads | stated positional_error_m too small on Emmitsburg, Taneytown (two entries), PA 116 / Hanover, York St, Wheatfield, Table Rock roads. Test G2-04. |
| medium | structures | 5 survivors "Documented" with plate symbol 29 to 84 m away and error 4 m. Test G2-05. |
| medium | Penn Hall roof | cupola area of the kept roof replaced by lawn at z16 (308811, 4411828); contradicts pass 1. |
| medium | Wheatfield | polygon best fits the modern field 33 m north; extent of the ripe-wheat recolour affected. |
| low | roads | drawn width 1.6 to 2.3 m over stated. Test G2-08. |
| low | datum | NAD83 treated as WGS84, about 0.9 m north; not documented. |
| low | Slyder, Warfield/Snyder, McMillan outbuildings | no Warren symbol under the drawn outlines in the affine frame (unproven; needs the structures frame). |

## 10. Reproduce

`tmp/b1863/check2/`: `roadmeas.py`, `roadrun.py`, `roadruns.py`, `gpcv.py`, `mywarren.py`, `lcwarp.py` + `cmp_tr.py`, `woodedge.py`, `woodfit.py`, `tilereg.py`, `roadrender.py`, `strrender.py`, `hoppick*.py`, `hopconv.py`, `hopfit.py`, `hopcheck.py`, `farmview*.py`, `wheatview.py`. Run with `python -I`, one thread, low priority. `node tests/t0/verify-base1863-georeference.spec.mjs`. Negative results kept: a global ICP of Warren symbols to county buildings and a Warren-town cross-correlation had no sharp peak and were discarded.
