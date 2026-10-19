# Verification pass 6 of 8: anachronism hunt on the 1863 reconstruction tiles

Independent pass. It re-derives from the committed tile pyramid (`docs/basemap1863/tiles`), the modern inventory (`docs/basemap1863/modern/data`), the 1863 land-cover polygons and the NAIP 2013 mosaic. It does not use any builder report as evidence. This is a reconstruction; nothing here says it is 1:1 or 100 percent accurate, and this pass shows it is not free of post-1863 objects.

## Result in one paragraph

The target of zero remnants is **not met**. Removal of mapped objects works well where they are small and in the listed inventory: of 903 listed monument points inside z16 coverage none still shows a monument-like anomaly unchanged from the 2013 photograph; of 5,882 visible Adams County building outlines in z16 coverage at most 73 (about 1 percent, and only about 5 of the 12 I opened were real) still show a roof. What remains falls in classes that the inventory does not cover or that the fill step leaves behind: whole industrial and quarry sites, paved loops and lots that are in no inventory layer, pale "ghost" strips and lattices of removed parking and roads, modern sports fields, a part of the Soldiers' National Cemetery, cleared power-line swaths, and mint-coloured artefact patches. 35 sites are listed below with tile and pixel position; 10 of them fail an automated test (`tests/t0/verify-base1863-anachronism-hunt.spec.mjs`).

## Method and coverage (what was and was not checked)

Pixel work used the 455 non-empty z16 tiles (mosaic 10,752 x 11,776 px, 126.6 Mpx, 0.917 m per pixel), the 270 z15 tiles, and the NAIP 2013 mosaic warped onto the same grid (alignment check: kept pixels differ from NAIP by at most 8 grey levels in 95.5 percent of PHOTO_KEPT pixels). The shipped group tile set equals the docs set for 784 tiles; 51 are edge re-encodes and 115 are blanks or fills (compared byte by byte), so findings carry over to what the site serves.

| Check | Coverage | Method |
|---|---|---|
| Inventory residual test | 26 of 32 inventory classes (roads, paths, rail, buildings, monuments, signs, towers, poles, lamps, parking, airfield, golf, sports, power sites, developed land, modern water, quarry, historic other, fences); 16,177 of 16,258 buildings (9,275 at z16, 6,902 only at z15) | per feature: contrast of the feature against its ring in the tile and in NAIP, plus share of its pixels equal to NAIP (blurred difference 8 or less) |
| Monument test | 903 of 938 listed points (in z16 coverage); 3,000 random control windows | luminance anomaly within 3 px against a ring, compared with the 95th percentile of controls (53.8) |
| Blind pixel detectors | 100 percent of the z16 mosaic | neutral-grey pixels (max-min of RGB 11 or less), bright and dark compact objects, pale blobs inside removed classes, mint colour, red roofs, canopy outside 1863 woods plus 150 m |
| Visual review | about 320 crops opened: 19 native-resolution 3x3 tile sheets (171 cells, 154 non-empty tiles, 34 percent of the 455), 60 paired tile/NAIP crops of candidates (buildings, large neutral components, ghosts), 90 random samples of detector hits, plus about 20 site close-ups | I looked at each image and noted what is there |

Not checked: 66 percent of z16 tiles were not opened one by one (they were covered by the pixel detectors only); z17 tiles (97, enlargements of the same 1 m image) were not scanned separately and no z18 tiles exist; z11 to z14 were not scanned (they are downsampled from the same image); the 380 or so NPS monuments with no open coordinate cannot be tested against a list; straight-line edges of modern subdivisions, modern fences (UNKNOWN by design, 32 still visible) and vehicles outside the sites listed were not measured as classes; the 1863 truth is not known for any pixel, so everything here is "post-1863 object visible", never "wrong".

## Counts per class

| Class | Count | How measured, and how sure |
|---|---:|---|
| Modern buildings still visible (inventory outline, roof contrast kept, pixels unchanged) | z16: 73 flagged, about 30 estimated real; z15-only: 221 flagged, 0 real in 12 opened (flags are mostly clearings and shade) | list in `tmp/b1863/check6/remnants_inventory.csv`; 12 of 73 opened at z16 (5 real: 11364, 08982, 12389/08198 pad and basin, 12467), 12 of 221 at z15 |
| Survivor buildings kept with real 2013 pixels (SURVIVOR_KEPT) | 59 components, 2.5 ha, of 41 catalogue entries | by design; those in the town (courthouse, depot, church, Pennsylvania Hall, Presbyterian church) and farm survivors carry modern annexes, roofs, parking and yard trees (H05, H06, H07, H33, H34, H36 below) |
| Monuments (listed) | 0 of 903 unchanged; 7 anomalies above the control p95 where 45 are expected by chance | measured |
| Unlisted monuments | not testable | no open coordinates |
| Industrial and quarry sites unchanged | 1 site fully (H01, about 20 percent neutral-grey pixels, 11 times the control p99); quarry rim and pit partly (H02, H03) | visual plus measured |
| Paved loops, paths, lots, pads in no inventory layer | at least 6 sites (H08 to H12, H32); 1,299 unchanged undrawn neutral-grey components of 12 px or more, 653 of 25 px or more (many natural: gravel bars, shade, water) | detector plus visual; precision of the 36 largest about 60 percent |
| Ghost strips and lattices of removed paving (beige or pale shapes in the exact layout of lots, aisles, roads) | 3,861 pale components of 12 px or more (21 ha); 132 of 300 px or more, about 70 percent real in the 18 largest opened; about 15 percent of 1,908 mid-size ones (5 of 30 opened) | detector plus visual; nearest inventory class: roads 1,036, developed land 890, buildings 849, sports 458, golf 223 |
| Removed highways leaving a pale-green band with a faint road line | at least 2 (H26, H27) | visual |
| Sports fields (baseball diamonds, soccer field with track) | at least 2 sites (H29, H30); sports polygons are not caught by the contrast test | visual |
| Soldiers' National Cemetery headstone rows (founded after the battle) | 1 sector (H28) | visual; unchanged share near the sector 0.45 |
| Cleared power-line swaths through woods | 3 of 5 corridors inside z16 coverage (59, 72 and 77 percent of pixels unchanged); 4 corridors lie outside z16 coverage and were not tested | measured plus visual (H20, H21) |
| Mint or turquoise colour artefacts (TREES_ADDED and fills) | 34 components of 80 px or more, 1.96 ha, 0 percent unchanged | measured, visual (H18, H19) |
| Canopy outside 1863 woods plus 150 m, still equal to NAIP | 21.9 ha in 20 components of 0.05 ha or more (2 of 0.5 ha or more); a further 136 ha of canopy-like pixels sit 0 to 150 m outside the 1863 polygons and are kept unverified (21 percent of the coverage is AMBIGUOUS_KEPT) | colour mask, not a vegetation index |
| Modern fences | 32 mapped fence or wall lines still visible; kept by design (UNKNOWN) | measured |
| Vehicles | seen at H10 (red cars in a small lot) and not measured elsewhere | visual only |
| Towers, poles, signs, flagpoles, lamps | 0 flagged by the contrast test (2 to 17 visible per class) | measured; small objects are at the limit of 1 m pixels |

## Sites found (tile z16, pixel inside the tile, lon/lat)

Severity: critical = a whole modern site visible at z13 to z16; high = clearly modern structure or pattern at z15 to z16; medium = visible at z16; low = faint. SURVIVOR_KEPT rows (H05, H06, H07, H33, H34, H36) are by design and are judgment calls, not clear errors. Full detail is in `tmp/b1863/check6/hotspots.json`.

| Id | Severity | Tile and pixel | lon, lat | What is there |
|---|---|---|---|---|
| H01 | critical | 16/18712/24848 px(35,336) | -77.21154, 39.83952 | Industrial plant / crushing yard with buildings, conveyors, stockpiles, adjacent US highway + railroad strip, unchanged |
| H02 | high | 16/18712/24857 px(8,420) | -77.21183, 39.80085 | SE quarry rim and pit: grey rubble, haul-road rings, cut faces partly overpainted by soft green patches |
| H03 | medium | 16/18711/24856 px(390,262) | -77.21322, 39.80638 | Quarry spur: unpaved haul track and spoil in woods |
| H04 | medium | 16/18702/24852 px(496,229) | -77.26152, 39.82353 | Depot/commercial site removed but white-grey blotches and pale hard-edged patches remain on lawn |
| H05 | medium | 16/18708/24850 px(305,239) | -77.23061, 39.83188 | Station annex in town: modern white flat-roof building kept beside Railroad Station survivor [prov class 21 SURVIVOR_KEPT: real 2013 roof pixels kept for a structure the catalogue lists as standing in 1863 (survives_altered); modern roof material, annexes, parking and yard trees come with it] |
| H06 | medium | 16/18708/24850 px(72,390) | -77.23311, 39.83064 | Town block west of Baltimore St: modern grey-roofed buildings kept (Christ Lutheran / courthouse survivors with modern wings) [prov class 21 SURVIVOR_KEPT: real 2013 roof pixels kept for a structure the catalogue lists as standing in 1863 (survives_altered); modern roof material, annexes, parking and yard trees come with it] |
| H07 | medium | 16/18708/24850 px(186,504) | -77.23189, 39.8297 | Town block south: modern low grey-roof commercial building kept, parking ghost around it [prov class 21 SURVIVOR_KEPT: real 2013 roof pixels kept for a structure the catalogue lists as standing in 1863 (survives_altered); modern roof material, annexes, parking and yard trees come with it] |
| H08 | medium | 16/18713/24845 px(127,401) | -77.20506, 39.85164 | Paved asphalt loop road in hayfield retained |
| H09 | medium | 16/18713/24845 px(200,359) | -77.20428, 39.85198 | Paved asphalt Y-shaped path retained in hayfield |
| H10 | high | 16/18711/24845 px(293,263) | -77.21426, 39.85277 | Small parking lot with parked cars (red vehicles) retained |
| H11 | medium | 16/18711/24847 px(56,365) | -77.21681, 39.8435 | Fenced gravel/asphalt pad (substation or tank pad) retained with fence outline |
| H12 | medium | 16/18706/24843 px(332,121) | -77.24131, 39.86237 | Fenced lumber/pallet yard with orange stacks, pad remains |
| H13 | high | 16/18715/24847 px(465,345) | -77.19045, 39.84366 | Ghost of parking lot aisles: pale rectilinear beige/white lattice 200 px across where a store and lot were removed |
| H14 | high | 16/18715/24847 px(217,491) | -77.19311, 39.84246 | Ghost of parking aisles loop (beige strips) |
| H15 | high | 16/18703/24862 px(292,502) | -77.25822, 39.77907 | Ghost of mobile-home park roads (beige strips, arcs) in woods |
| H16 | high | 16/18704/24863 px(58,132) | -77.25524, 39.7779 | Ghost of mobile-home park roads in woods (arc strips) |
| H18 | medium | 16/18702/24844 px(201,179) | -77.26469, 39.85768 | Turquoise-mint TREES_ADDED patch in crop field (colour artefact) |
| H19 | medium | 16/18700/24845 px(477,488) | -77.27271, 39.85092 | Mint patches in field edge (colour artefact) |
| H20 | medium | 16/18715/24850 px(456,301) | -77.19054, 39.83137 | Power-line cleared swath through woods retained (MOD-POWER_ROW-00014) |
| H21 | medium | 16/18713/24845 px(394,480) | -77.20219, 39.85098 | Power-line cleared swath through woods retained (MOD-POWER_ROW-00016) |
| H22 | medium | 16/18706/24848 px(379,347) | -77.24081, 39.83943 | Fenced raised-bed garden plot with shed retained (MOD-BUILDING-08982) |
| H23 | medium | 16/18708/24845 px(308,43) | -77.23058, 39.85458 | Engineered triangular stormwater basin and small paved pad retained (MOD-BUILDING-12389 / 08198) |
| H24 | medium | 16/18705/24843 px(370,29) | -77.2464, 39.86313 | Grey-roof building inside woods retained (MOD-BUILDING-11364) |
| H25 | low | 16/18696/24843 px(470,255) | -77.29476, 39.86127 | Farm yard ghost: dark/white smears where farm buildings removed (MOD-BUILDING-12467) |
| H26 | medium | 16/18715/24843 px(242,243) | -77.19284, 39.86137 | Broad diagonal pale-green band (ghost corridor) where a road/highway was removed, crossing crop fields |
| H27 | low | 16/18714/24843 px(230,143) | -77.19846, 39.86219 | Vertical pale-green ghost band in crop field (removed road/drive) |
| H28 | high | 16/18708/24853 px(306,218) | -77.2306, 39.8194 | Soldiers National Cemetery (founded after the battle): headstone rows and modern trees remain in the SE sector |
| H29 | high | 16/18706/24848 px(470,118) | -77.23983, 39.84131 | College baseball diamonds: infield dirt, foul-line arcs and dugouts retained |
| H30 | medium | 16/18707/24848 px(158,398) | -77.23768, 39.83901 | Soccer field with track, goal lines and stands retained as faint markings |
| H31 | medium | 16/18709/24848 px(328,333) | -77.22487, 39.83954 | White fenced parking pad: bright white outline of removed lot remains |
| H32 | high | 16/18705/24849 px(502,336) | -77.24498, 39.8353 | Motel-type complex: red roof fragments, drive and pool surroundings partly remain |
| H33 | medium | 16/18706/24852 px(5,200) | -77.24482, 39.82377 | Red-roof house with its drive and yard trees retained intact [prov class 21 SURVIVOR_KEPT: real 2013 roof pixels kept for a structure the catalogue lists as standing in 1863 (survives_altered); modern roof material, annexes, parking and yard trees come with it] |
| H34 | medium | 16/18708/24851 px(241,407) | -77.2313, 39.82628 | Multi-storey white-roofed building retained at the edge of the 1863 town [prov class 21 SURVIVOR_KEPT: real 2013 roof pixels kept for a structure the catalogue lists as standing in 1863 (survives_altered); modern roof material, annexes, parking and yard trees come with it] |
| H35 | low | 16/18707/24850 px(56,6) | -77.23878, 39.8338 | Circular pale halo with small object where a dome or tank was removed |
| H36 | medium | 16/18706/24850 px(58,264) | -77.24425, 39.83168 | Large dark-roofed institutional building retained (blue-grey roof) [prov class 21 SURVIVOR_KEPT: real 2013 roof pixels kept for a structure the catalogue lists as standing in 1863 (survives_altered); modern roof material, annexes, parking and yard trees come with it] |

## Why these remain (observations, not proven causes)

1. The contrast test and the inventory do not see sports pitches, unmapped paved paths and industrial yards, so the removal mask misses them; the largest site (H01) is in no building or road list.
2. Where the fill removes paving it leaves a beige or pale copy of the old layout (parking aisles, mobile-home roads, curbs); the shapes are straight-edged and obviously man-made (H13 to H16).
3. Added woods (TREES_ADDED) in crop fields come out mint, not the colour of any ground in the photo (H18, H19).
4. The power-line swaths are listed by the modern layer as a separate vegetation edit; it was not done.

## Failing test

`tests/t0/verify-base1863-anachronism-hunt.spec.mjs` (10 sites: share of neutral-grey pixels read from the committed WebP tiles, against the control p99 of 0.0184 measured in 4,000 random windows of the same tiles). It is red by design and passes only when the modern material is gone. It only covers sites whose remnants are neutral grey; ghost, colour and vegetation findings are visual and are not in the test.

## Scripts

Scripts and working arrays are in `tmp/b1863/check6/` (not committed, by rule): `mosaic.py`, `warp.py`, `resid.py`, `monu.py`, `neutral.py`, `ghost.py`, `canopy.py`, `hot.py`. Re-run: `python mosaic.py 16 15`, `python warp.py 16`, `python warp.py 15`, then the others.
