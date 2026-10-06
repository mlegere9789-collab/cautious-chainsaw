### T1 settled frames, painted ink (desktop)
| zoom | samples | most chips in view | solid overlaps (max per frame) | solid x dim | min gap between chips px | ink outside box | unexplained pixels | missing / early / phantom units | chips under chrome (any / of solid chips) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 11 | 126 | 25 | 0 | 0 | 2 | 0 | 0 | 0 / 0 / 0 | 0 / 1494 (0.0%) |
| 12 | 126 | 47 | 0 | 0 | 2 | 0 | 0 | 0 / 0 / 0 | 33 / 3870 (0.9%) |
| 13 | 126 | 104 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 | 1540 / 7455 (20.7%) |
| 13.5 | 126 | 123 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 | 2078 / 10116 (20.5%) |
| 14 | 126 | 136 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 | 2397 / 11177 (21.4%) |
| 15 | 126 | 100 | 0 | 0 | 2.131 | 0 | 0 | 0 / 0 / 0 | 1737 / 7824 (22.2%) |
| 16 | 126 | 73 | 0 | 0 | 2.1 | 0 | 0 | 0 / 0 / 0 | 1035 / 6362 (16.3%) |
| 17 | 126 | 34 | 0 | 0 | 2.6 | 0 | 0 | 0 / 0 / 0 | 594 / 2862 (20.8%) |
| 18 | 126 | 21 | 0 | 0 | 2.7 | 0 | 0 | 0 / 0 / 0 | 273 / 1770 (15.4%) |

totals: {"samples":1428,"settledSolidOverlap":0,"settledSolidDim":0,"settledDimDim":0,"minGapCC":2,"inkOutsideFrames":0,"maxExcessPx":0.532,"unexplainedPixelsMax":0,"missingMax":0,"earlyMax":0,"phantomMax":0,"noInkSamples":40,"transitionFrames":175268,"transitionFramesWithOverlap":12071,"transitionSolidDim":14527,"transitionSolidSolid":1993,"samplesWithTransitionOverlap":724,"chipsSolid":61028,"chipsUnderChromeAny":11371,"chipsUnderChromeHalf":8943,"popupCoverage":0}

### T2 every frame of a 20 s real-time playback, painted ink (witness), Studio only
| scene | speed | frames | solid x solid overlap frames (max depth px) | solid x dim overlap frames (episodes, longest) | dim x dim frames | frames with a unit shown only by a dimmed tile (max units at once) | dim-only run per unit: median / p95 / max frames | chips under chrome per frame (of units in view) |
|---|---:|---:|---|---|---:|---|---|---|
| cemetery-hill | 1x | 939 | 2 (0.78) | 55 (13, 18 fr) | 19 | 252 (28) | 14 / 44 / 46 | 18.5 of 214.7 |
| cemetery-hill | 4x | 925 | 7 (1.88) | 147 (24, 21 fr) | 55 | 585 (39) | 12 / 56 / 170 | 16.8 of 241.3 |
| rose-woods | 1x | 1174 | 3 (1.69) | 206 (14, 147 fr) | 38 | 680 (67) | 10 / 147 / 147 | 4.2 of 147.4 |
| rose-woods | 4x | 1176 | 7 (1.93) | 116 (21, 24 fr) | 43 | 624 (43) | 15 / 96 / 136 | 2.5 of 152 |
| the-angle | 1x | 1113 | 1 (0.29) | 328 (18, 174 fr) | 47 | 531 (44) | 25 / 65 / 201 | 9.4 of 121.9 |
| the-angle | 4x | 1159 | 0 (0.00) | 234 (17, 66 fr) | 65 | 458 (49) | 27 / 56 / 108 | 10.0 of 116.4 |
| field | 1x | 854 | 1 (0.26) | 46 (7, 30 fr) | 8 | 660 (22) | 22 / 31 / 626 | 25.2 of 448.9 |
| field | 4x | 410 | 0 (0.00) | 84 (12, 25 fr) | 10 | 410 (25) | 28 / 48 / 49 | 25.1 of 448.4 |
| default | 1x | 1200 | 2 (0.14) | 486 (22, 157 fr) | 41 | 1017 (21) | 28 / 219 / 270 | 10.2 of 57.9 |
| default | 4x | 1200 | 0 (0.00) | 202 (20, 65 fr) | 40 | 473 (22) | 36 / 106 / 126 | 9.7 of 55.2 |

solid x solid classes summed over each run: cemetery-hill 1x {"cc":0,"lc":0,"lp":0,"cp":2,"ll":0}; cemetery-hill 4x {"cc":1,"lc":0,"lp":0,"cp":7,"ll":0}; rose-woods 1x {"cc":1,"lc":0,"lp":0,"cp":2,"ll":0}; rose-woods 4x {"cc":0,"lc":0,"lp":0,"cp":7,"ll":0}; the-angle 1x {"cc":1,"lc":0,"lp":0,"cp":0,"ll":0}; the-angle 4x {"cc":0,"lc":0,"lp":0,"cp":0,"ll":0}; field 1x {"cc":1,"lc":0,"lp":0,"cp":0,"ll":0}; field 4x {"cc":0,"lc":0,"lp":0,"cp":0,"ll":0}; default 1x {"cc":2,"lc":0,"lp":0,"cp":0,"ll":0}; default 4x {"cc":0,"lc":0,"lp":0,"cp":0,"ll":0}

solid x dim overlaps by (dim item / solid item): {"chip/label":1418,"pin/chip":275,"chip/pin":106,"chip/chip":777,"label/chip":82,"pin/pin":206,"pin/label":272,"label/pin":8,"label/label":4}

### T2b negative control: the Before view in the same harness
| scene | speed | frames | frames with overlapping solid items | deepest overlap px |
|---|---:|---:|---:|---:|
| cemetery-hill | 1x | 1200 | 1200 (100.0%) | 68.5 |
| cemetery-hill | 4x | 1200 | 1200 (100.0%) | 80.2 |
| rose-woods | 1x | 1200 | 1200 (100.0%) | 80.0 |
| rose-woods | 4x | 1200 | 1200 (100.0%) | 79.9 |
| the-angle | 1x | 1200 | 1200 (100.0%) | 38.2 |
| the-angle | 4x | 938 | 938 (100.0%) | 38.2 |
| field | 1x | 1030 | 1030 (100.0%) | 67.0 |
| field | 4x | 370 | 370 (100.0%) | 67.0 |
| default | 1x | 1200 | 1200 (100.0%) | 25.0 |
| default | 4x | 931 | 931 (100.0%) | 25.0 |

### T3 real time, 20 s per row, 1x CPU, popups on (no witness)
| scene | speed | renderer | display fps | p95 ms | frames > 20 ms | frames > 50 ms | tiles per frame | steps >= 8 px per s | sudden steps per s (solid) | largest step px | opacity flashes per s | label toggles per s | blink per s |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| cemetery-hill | 1x | Studio | 60 | 16.8 | 0% | 0 | 142.9 | 1.7 | 0.15 (0) | 15.42 | 0.2 | 0.95 | 0 |
| cemetery-hill | 4x | Studio | 60 | 16.8 | 0% | 0 | 146.6 | 3.45 | 0.35 (0) | 15.64 | 0.25 | 3.35 | 0.1 |
| cemetery-hill | 1x | Before | 60 | 16.8 | 0% | 0 | 235.5 | 6.35 | 6.35 (6.35) | 496.31 | 0 | 0 | 0 |
| cemetery-hill | 4x | Before | 60 | 16.8 | 0% | 0 | 259.2 | 79.44 | 51.79 (51.79) | 1550.41 | 0 | 0 | 2.25 |
| rose-woods | 1x | Studio | 60 | 16.8 | 0% | 0 | 151.6 | 2.7 | 0.25 (0) | 29.54 | 0.7 | 5.2 | 0.1 |
| rose-woods | 4x | Studio | 60 | 16.8 | 0% | 0 | 144.3 | 5.7 | 0.35 (0.1) | 19.38 | 1.05 | 5.45 | 0.2 |
| rose-woods | 1x | Before | 60 | 16.8 | 0% | 0 | 157.7 | 109.47 | 65.88 (65.88) | 624.56 | 0 | 0 | 1.45 |
| rose-woods | 4x | Before | 60 | 16.8 | 0% | 0 | 164.9 | 70.49 | 39.45 (39.45) | 624.46 | 0 | 0 | 1.75 |
| the-angle | 1x | Studio | 60 | 16.8 | 0% | 0 | 315.3 | 6.45 | 0.55 (0) | 75.82 | 0.8 | 8.85 | 0.05 |
| the-angle | 4x | Studio | 60 | 16.8 | 0% | 0 | 310.1 | 12.9 | 0.45 (0.05) | 94.45 | 1.4 | 8.7 | 0.2 |
| the-angle | 1x | Before | 60 | 16.8 | 0% | 0 | 133.2 | 4.9 | 3.45 (3.45) | 544.9 | 0 | 0 | 0.3 |
| the-angle | 4x | Before | 60 | 16.8 | 0% | 0 | 130.1 | 5 | 4.5 (4.5) | 544.9 | 0 | 0 | 0.3 |
| field | 1x | Studio | 56.2 | 33.3 | 6.77% | 0 | 119.2 | 0.75 | 0.05 (0) | 17.63 | 0.25 | 0.9 | 0 |
| field | 4x | Studio | 58.1 | 16.8 | 3.18% | 0 | 117.8 | 0.75 | 0.05 (0) | 27.62 | 0.3 | 0.75 | 0 |
| field | 1x | Before | 55 | 33.3 | 9.01% | 0 | 457 | 4.65 | 4.65 (4.65) | 417.37 | 0 | 0 | 0 |
| field | 4x | Before | 57.7 | 16.8 | 3.9% | 0 | 457 | 7.99 | 7.99 (7.99) | 417.37 | 0 | 0 | 0 |
| default | 1x | Studio | 60 | 16.8 | 0% | 0 | 391.5 | 8.95 | 0.45 (0) | 20.31 | 1 | 9 | 0.05 |
| default | 4x | Studio | 60 | 16.8 | 0% | 0 | 388.5 | 26.24 | 1.15 (0.1) | 74.74 | 1.55 | 9.3 | 0.3 |
| default | 1x | Before | 60 | 16.8 | 0% | 0 | 76 | 1.2 | 1.15 (1.15) | 311.46 | 0 | 0 | 0.25 |
| default | 4x | Before | 60 | 16.8 | 0% | 0 | 72.9 | 2.2 | 2.15 (2.15) | 708.46 | 0 | 0 | 0.25 |

### T3b 4x CPU slowdown
| scene | speed | renderer | display fps | p95 ms | frames > 20 ms | frames > 50 ms | tiles per frame | steps >= 8 px per s | sudden steps per s (solid) | largest step px | opacity flashes per s | label toggles per s | blink per s |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| cemetery-hill | 4x | Studio | 21.8 | 66.7 | 99.54% | 105 | 149.4 | 4.39 | 2.2 (0.3) | 57.62 | 10.93 | 4.04 | 0.2 |
| cemetery-hill | 4x | Before | 34.7 | 33.4 | 71.33% | 0 | 258.5 | 67.76 | 43.66 (43.66) | 1550.41 | 0 | 0 | 2.25 |
| rose-woods | 4x | Studio | 27.6 | 66.6 | 84.06% | 55 | 148 | 16.8 | 5.88 (1) | 295.02 | 9.97 | 6.83 | 0.3 |
| rose-woods | 4x | Before | 45.7 | 33.4 | 30.57% | 1 | 165 | 61.36 | 37.12 (37.12) | 624.2 | 0 | 0 | 1.75 |
| the-angle | 4x | Studio | 26.3 | 66.6 | 85.93% | 55 | 310.9 | 25.4 | 5.3 (1.35) | 319.92 | 13.8 | 8.4 | 0.25 |
| the-angle | 4x | Before | 58.2 | 16.8 | 2.92% | 0 | 130 | 4.9 | 4.45 (4.45) | 544.9 | 0 | 0 | 0.3 |

### T3c prefers-reduced-motion: reduce, Studio only
| scene | speed | renderer | display fps | p95 ms | frames > 20 ms | frames > 50 ms | tiles per frame | steps >= 8 px per s | sudden steps per s (solid) | largest step px | opacity flashes per s | label toggles per s | blink per s |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| cemetery-hill | 4x | Studio | 60 | 16.8 | 0% | 0 | 147.8 | 3.75 | 3.7 (3.05) | 119.6 | 12.65 | 3.45 | 0 |
| rose-woods | 4x | Studio | 60 | 16.8 | 0% | 0 | 143.2 | 10.25 | 8.5 (7.65) | 184.73 | 15 | 4.85 | 0 |
| the-angle | 4x | Studio | 54 | 16.8 | 3.06% | 15 | 306.2 | 19.6 | 10.6 (8.65) | 96.22 | 28.85 | 14.7 | 0 |

### T3d phone viewport 390x844 DPR 2, 1x CPU
| scene | speed | renderer | display fps | p95 ms | frames > 20 ms | frames > 50 ms | tiles per frame | steps >= 8 px per s | sudden steps per s (solid) | largest step px | opacity flashes per s | label toggles per s | blink per s |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| the-angle | 4x | Studio | 60 | 16.8 | 0% | 0 | 299.4 | 14.69 | 0.55 (0.1) | 123.91 | 1.15 | 7.14 | 0.25 |
| the-angle | 4x | Before | 60 | 16.8 | 0% | 0 | 58.8 | 2.75 | 2.55 (2.55) | 533.64 | 0 | 0 | 0.25 |
| cemetery-hill | 4x | Studio | 60 | 16.8 | 0% | 0 | 146.1 | 2.8 | 0.15 (0) | 15.88 | 0.2 | 3.15 | 0 |
| cemetery-hill | 4x | Before | 60 | 16.8 | 0% | 0 | 164.5 | 23.35 | 16.55 (16.55) | 519.96 | 0 | 0 | 1 |

### T4 units with no tile of any kind (deterministic 60 Hz, 1200 frames, popups off)
| scene | speed | frames with a gap | unit-frames without a tile | episodes per s | median / p95 / max frames | most units missing at once |
|---|---:|---:|---:|---:|---|---:|
| cemetery-hill | 1x | 16 (1.3%) | 20 | 0.25 | 4 / 5 / 5 | 2 |
| cemetery-hill | 4x | 44 (3.7%) | 110 | 2.45 | 1 / 7 / 7 | 26 |
| cemetery-hill | 16x | 102 (8.5%) | 270 | 5 | 1 / 8 / 8 | 26 |
| rose-woods | 1x | 81 (6.8%) | 111 | 2.15 | 1 / 7 / 8 | 8 |
| rose-woods | 4x | 77 (6.4%) | 180 | 3.7 | 1 / 8 / 8 | 27 |
| rose-woods | 16x | 123 (10.3%) | 296 | 6.05 | 1 / 7 / 9 | 26 |
| the-angle | 1x | 80 (6.7%) | 113 | 2.15 | 1 / 6 / 7 | 10 |
| the-angle | 4x | 69 (5.8%) | 106 | 2.2 | 1 / 6 / 7 | 10 |
| the-angle | 16x | 32 (2.7%) | 46 | 1.2 | 1 / 5 / 7 | 10 |
| field | 1x | 0 (0%) | 0 | 0 | 0 / 0 / 0 | 0 |
| field | 4x | 0 (0%) | 0 | 0 | 0 / 0 / 0 | 0 |
| field | 16x | 5 (0.4%) | 5 | 0.05 | 5 / 5 / 5 | 1 |
| default | 1x | 56 (4.7%) | 97 | 1.85 | 1 / 7 / 7 | 10 |
| default | 4x | 47 (3.9%) | 82 | 1.7 | 1 / 7 / 7 | 10 |
| default | 16x | 31 (2.6%) | 41 | 0.75 | 1 / 6 / 7 | 5 |
| evening | 1x | 26 (2.2%) | 138 | 2.4 | 1 / 7 / 7 | 24 |
| evening | 4x | 80 (6.7%) | 260 | 6.6 | 1 / 7 / 7 | 24 |
| evening | 16x | 185 (15.4%) | 448 | 12.2 | 1 / 7 / 8 | 26 |
| opening | 1x | 61 (5.1%) | 71 | 1.4 | 1 / 5 / 7 | 6 |
| opening | 4x | 124 (10.3%) | 383 | 8.85 | 1 / 8 / 8 | 24 |
| opening | 16x | 277 (23.1%) | 864 | 21.25 | 1 / 8 / 9 | 29 |
