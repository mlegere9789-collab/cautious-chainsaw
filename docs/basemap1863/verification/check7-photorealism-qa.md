# Check 7 of 8: photorealism and technical quality of the 1863 reconstruction

Independent pass, 2026-10-19. Method: image statistics against untouched NAIP, 100 percent crops, a random sample of removed areas, cross-zoom registration, WebP and tile-edge analysis, and the product map in real Chrome (desktop DPR 1 and 2, phone DPR 3) on the scratch group build `tmp/b1863/group/R1c/dist` (tile set `v1-65d491b8`).
Nothing of the builders' reports was trusted; every number below comes from a command run in this pass (scripts in `tmp/b1863/check7/`, not committed). Failing tests: `tests/t0/verify-base1863-photorealism-qa.spec.mjs` (5 of 5 red today).

This pass judges the picture as a photograph. It does not judge whether a feature stood in July 1863 (other passes).

## Verdict

The pyramid is technically clean (no registration offset between zoom levels, no brightness step between zooms, no tile-edge seam beyond the WebP block grid, zero satellite requests). As a photographic picture it is **not photoreal in three large parts**: the town, every large removed area, and the closest zooms. Visible composite artefacts (white pads, parking-lot stripes, milky haze patches, mint halos, polygon edges) are present at ordinary viewing zooms (z13 to z16) and not only at the closest zoom.

## Defects

Severity is for the stated goal ("a satellite photograph of 1863"). Locations are z16 tile x/y (Mapbox convention, 512 px) or lon/lat, with the visible frame given where useful. Test ids refer to the spec.

| # | sev | area | defect and evidence | repro |
|---|---|---|---|---|
| D1 | high | removed areas, ghost pavement | Removed parking lots, concrete pads and yards leave **pale pavement ghosts**: beige and white stair-stepped strips (aliased, pixel-stepped edges) in the middle of grass. 71 connected components of 150 px or more of bright, low-saturation pixels (V>205, S<60) inside classes REMOVED_PATCH, REMOVED_SYNTH, CANOPY_REMOVED and TOWN_GROUND (biggest 4,231 px, z16 18716/24846; also 18715/24847, 18714/24846, 18712/24848). At 1 m: 401 components of 40 px or more, 118,673 px. Test T0-V7-01 | lon -77.1903 lat 39.8436 z16 (parking-lot stripes); lon -77.1685 lat 39.8729 z16 (white concrete apron with beige rectangles); lon -77.1765 lat 39.7818 z15 (maze-like scars) |
| D2 | high | removed areas, halos and haze | Re-synthesised patches are surrounded by a **pale mint-green glow** (compositing halo) with hard polygon outlines, and some patches are **milky white-grey haze blobs** that read as smoke or cloud. In a random sample of 36 removed-area sites (200x150 m windows with 35 percent or more removed pixels, seed 777) **11 of 36 (31 percent) show an obvious composite artefact** (halo, haze, polygon edge, leftover modern object, wedge seam; site 31, a drawn orchard lattice, is counted under D9) | sites 6, 9, 10, 16, 21, 25, 28, 29, 30, 33, 35 of `sites36.json`; viewable at lon -77.188 lat 39.8496 z16 (halo around a wheat field, grey remnant), lon -77.2306 lat 39.8204 z15 (white arcs on Cemetery Hill), retina z15 town (white blob upper left) |
| D3 | high | town, TOWN_GROUND (105.6 ha) | The borough is an **empty lawn with scattered brown rounded blobs** for roofs: no gables, no ridge lines, no courtyards, no street or lot texture. Colour variance (Lab a std) of the ground between roofs is 19 percent of photographed open ground (z16 tiles) and 33 percent in the 1 m source; luminance std 6.3 against 30.8; Laplacian energy 7.2 against 12.3. It does not read as a satellite picture of a town at any zoom. Test T0-V7-03 | lon -77.2311 lat 39.8309, z14 to z18 |
| D4 | high | closest zooms | The map allows **zoom 18** (`getMaxZoom()` = 18; `jumpTo({zoom:22})` lands at 18) on a 0.92 m per pixel picture: z18 is a 4x bilinear enlargement, a smooth smear with 64 px WebP block steps. z17 is 2x and soft. No detail exists beyond z16. Test T0-V7-04 | desktop-po-z18.png, phone-po-z18.png (lon -77.2527 lat 39.8001 z18) |
| D5 | medium | window seams | Step between neighbouring pixels at the 1024 px window boundaries inside synthesised ground (classes 1, 2, 3, 5) is **6.42 against a median 4.25 (+51 percent) for columns, 6.30 against 4.23 (+49 percent) for rows**; the 512 offset also shows +30 percent. The builder's +12 percent compared with random lines across all content and understates it. Visible tonal seam across a re-synthesised pasture. Test T0-V7-02 | stage35 pixel column 12288, rows about 10880 to 11136 (lon -77.2011 lat 39.7800); also column 7168 row 4480; column 9216 rows 4736 to 5248 |
| D6 | medium | removed areas, polygon edges | Hard, straight, polygonal outlines of re-synthesised areas are visible against textured neighbours: a diagonal straight edge across woods at lon -77.2627 lat 39.8376 (the removed golf-course shapes remain as smooth pale ribbons through the woods, with the polygon outline), a straight pale wedge boundary (random sites 29 and 33), and a straight vertical edge east of the Little Round Top road scar (stage pixel crop 308453/4407010) | see sites above; `crops/seam_7168_4480.png` |
| D7 | medium | Wheatfield | CROP_RECOLOURED is a **flat orange-yellow polygon with a sharp edge**; its mean Lab b (159.4) is above the 99.9th percentile of all photographed ground in the same tiles (153). Contrast with the surrounding natural fields is stark at z13 to z16. Test T0-V7-05 | lon -77.2425 lat 39.7957 z14 to z16 |
| D8 | medium | drawn structures | Roofs are flat brown, textureless rectangles with hard, uniform dark shadows. The kept "survivor" buildings keep their **modern roof materials and colours** (grey metal, red-white-blue roofs, white annexes), next to schematic brown roofs, so the town mixes two renderings. 2013 surroundings of survivors show paved white rectangles. Drawn roof-shadow direction could not be confirmed independently (113 roofs, R=0.16, inconclusive); visually the shadows fall to the upper left like the photographed trees | town z16 and z17 screenshots; lon -77.2307 lat 39.8320 (red-white roofed building kept on the lawn) |
| D9 | medium | orchards | ORCHARD_ADDED is a regular lattice of near-black, identical round dots on bare ground; photographed orchards in the same view are green and irregular. Reads as stamped | lon -77.2527 lat 39.8001 z16 right side; The Angle (stage pixel 308662/4409204, left) |
| D10 | medium | removal scars | Old road corridors leave smooth, textureless pale bands (no field pattern), e.g. at The Angle and beside the Rose farm road; scars are visible at z16 and z17 | stage pixel crops 308662/4409204 and 307400/4407690; desktop angle z16 |
| D11 | low | roads drawn | 1863 roads are uniform-width beige ribbons with no ruts, edge wear or verge transitions; junction "diamond" is a drawn ring | town z16/z17 |
| D12 | low | WebP | z16 quality 72: PSNR against the source 31.9 to 36.7 dB (8 tiles, resampled-source approximation), 16 px macroblock edge steps 1.31 (columns) and 1.38 (rows) times the in-block step; tile boundaries are no worse than any block edge (1.18 and 1.17). Becomes visible as a faint grid at z17 and z18 (phone z18: a 2.5 level step across a 64 px block edge) | phone-po-z18.png row 386 |
| D13 | low | coverage edges | The photograph ends in a straight line (mosaic edge): at 1440 px and z12.2 the left 110 px are neutral ground; z11 to z13 show the straight edge of the picture inside the allowed bounds (screenshot desktop-edge-photo-w-z13.png, edge near lon -77.345). No streak seen after the integration masking | |
| D14 | low | detail level change | At the northern limit of the z16 rectangle (about lat 39.866) the picture changes from native z16 to over-zoomed z15; no visible seam at z16.5 (checked), but detail drops there | desktop-edge-n-z165.png |

## What passed (measured)

* **Cross-zoom registration**: z15 against z16 downsampled over 101 blocks of 512 px: median shift 0.001 coarse px, maximum 0.030; z14 against z15 (48 blocks) maximum 0.027; z13 against z14 (12 blocks) maximum 0.020. Mean signed RGB difference 0.1 or less. No brightness step between zoom levels.
* **Tile-edge seams (z16, z15)**: mean colour step across tile boundaries (4 px bands) 2.91 and 2.87 against 2.76 and 2.75 for control positions (+5 percent); the pixel-step ratio at boundaries (1.18) is below the macroblock-edge ratio (1.31), so tile edges add nothing beyond the WebP block grid.
* **Delivered tiles are the committed tiles**: 784 byte-identical, 51 re-encoded edge tiles (alpha), 115 blanks or fills, as the integration report says.
* **No modern satellite request**: desktop DPR 1 and 2 and phone DPR 3 runs, 273, 239 and 203 requests each to 127.0.0.1; hosts other than local were only `api.mapbox.com` (fonts glyph PBFs and one map-sessions call, 5 requests) and `events.mapbox.com` (telemetry, 3). No jpg, no `satellite`, `/v4/`, `styles/v1`, raster or any Google, Bing or Maxar host in any run. Tile responses non-200: 0 of 112, 60 and 95. `__gtb63.errors` 0, first-party console errors 0.
* **First-load bytes**: desktop DPR 1 16 tiles 822,794 bytes (z14); retina DPR 2 46 tiles 1,970,538 bytes (z15); phone DPR 3 was not re-measured for first load (60 tile responses over nine views, all 200). Desktop and retina match the builder's table.
* **Class textures that do pass** (open ground only, canopy excluded, 9 px eroded interiors): REMOVED_SYNTH high-frequency energy 9.8 against 8.9 for kept ground (no excess blur in pastures); no near-duplicate 48 px blocks in REMOVED_SYNTH (0 of 393 under distance 0.35 against 3.5 percent of 5,267 kept blocks): no tiling by repetition was found.
* **Z17 and Walkthrough** were not part of this pass.

## Measured against untouched NAIP (open ground, no canopy; PHOTO_KEPT inside coverage as reference)

| class | Laplacian | local std 5x5 | Lab a std | luminance std |
|---|---|---|---|---|
| PHOTO_KEPT (reference) | 8.87 | 4.84 | 7.09 | 25.1 |
| REMOVED_PATCH | 9.49 | 4.97 | 5.90 | 23.1 |
| REMOVED_SYNTH | 9.77 | 4.83 | 3.43 | 18.5 |
| CANOPY_REMOVED | 9.64 | 4.63 | 3.24 | 12.0 |
| TOWN_GROUND | 7.23 | 3.42 | 2.32 | 7.5 |

High-frequency noise is matched in pastures, but colour variance is halved in REMOVED_SYNTH and CANOPY_REMOVED and cut to a third in TOWN_GROUND: the "lawn" look.

## Coverage and limits

* Automatic, whole pyramid: all 455 z16 tiles (bright residue, TOWN_GROUND and CROP statistics), cross-zoom registration over all overlapping tiles at z13 to z16, tile-edge statistics over all tile boundaries at z15 and z16, window seams over every synthesised pixel of the 17,280 x 13,620 mosaic, class statistics over all 1024 px windows.
* By eye: 48 images viewed: 36 random removed-area sites in three sheets, 22 pixel-exact crops (base and reconstruction side by side, or reconstruction only), and 23 of the 42 saved screenshots (18 desktop, 2 retina, 3 phone; the other 19 were taken and only checked by request logs). About 15 of 455 z16 tiles were seen individually; the others only through the automatic statistics above.
* Not verified: Firefox, Safari and real phones (Chrome only, phone emulated); the 1 m source with the real sun time (shadow direction of the drawn roofs is not resolved: 113 roofs, R=0.16); WebP quality against the source at z13 to z15 (my resampled source aliases at the coarse zooms, only z16 PSNR is reported); accuracy of any 1863 feature (other passes); the z17 tiles (not shipped, not viewed); the Walkthrough; production hosting.
* Chrome and the static emulator ran on ports 10470 to 10475 only; processes started by this pass were stopped. No network access was needed or used.

## Artefacts (not committed, `tmp/b1863/check7/`)

`crops/` (side by side base and reconstruction, three sheets of random sites, seam crops), `shots/` (42 screenshots, `net-*.json` with the request logs), the analysis scripts `a1` to `a11`, `tilecheck.py`, `shoot.mjs`, `sites36.json`.
