### Main matrix, desktop, 462 tiles (first scene, see the loader note)

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:30:02.984Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 461, visible 461; repetitions per row: 3)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 48.0 | 16.7 / 33.4 / 50.0 | 15 | 9.90 / 13.30 | 55 | 65 | 146 | 64+42, 66 | 3 | 5 |
| A1 same rich tile drawn per frame, Canvas2D | 18.3 | 50.0 / 66.7 / 66.8 | 146 | 3.90 / 5.60 | 13 | 15 | 131 | 0+25, 23.8 | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.7 / 16.8 | 0 | 2.00 / 3.40 | 14 | 18 | 47 | 10+2, 4.5 | 2 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 58.6 | 16.7 / 16.8 / 33.4 | 1 | 4.10 / 6.10 | 27 | 31 | 112 | 10+3, 6.5 | 3 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.30 / 0.60 | 3 | 6 | 14 | 7+0, 1.6 | 3 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.30 / 0.60 | 8 | 12 | 15 | 24+2, 22.8 | 19 | 64 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.80 / 1.50 | 14 | 18 | 17 | 26+1, 20.7 | 10 | 85 |
| C1 Mapbox symbol layers, source.setData per frame | 57.9 | 16.7 / 16.8 / 33.4 | 3 | 0.20 / 5.80 | 96 | 306 | 29 | 229+21, 748.2 | 42 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 60.0 | 16.7 / 16.8 / 17.4 | 0 | 0.20 / 5.60 | 82 | 264 | 36 | 198+35, 542.8 | 35 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.10 / 0.30 | 7 | 12 | 10 | 27+0, 24.2 | 22 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 155 frames (2.68 s at 57.9 fps), p95 253; mbx-sym-upd: p50 78 frames (1.30 s at 60.0 fps), p95 119

### Main matrix, desktop retina (2x), 462 tiles

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:35:14.720Z

**D2: desktop 1440x852 @2x (retina), no throttle** (zoom 12.4; alive 461, visible 461; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 35.0 | 33.3 / 33.5 / 50.1 | 52 | 10.30 / 14.00 | 43 | 50 | 140 | 53+27, 54.1 | 2 | 5 |
| A1 same rich tile drawn per frame, Canvas2D | 9.4 | 116.6 / 166.5 / 183.9 | 76 | 5.30 / 10.50 | 11 | 9 | 134 | 1+11, 14.3 | 2 | 19 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 33.4 | 1 | 2.60 / 3.90 | 17 | 21 | 56 | 11+1, 3.8 | 2 | 147 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 58.4 | 16.7 / 16.8 / 50.0 | 4 | 4.70 / 7.00 | 30 | 34 | 115 | 11+4, 6.9 | 2 | 147 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 17.0 | 0 | 0.40 / 0.90 | 4 | 7 | 14 | 14+1, 4.6 | 4 | 165 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.30 / 0.70 | 8 | 13 | 16 | 23+2, 27.1 | 17 | 128 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.80 / 1.50 | 15 | 20 | 18 | 25+2, 23.4 | 17 | 163 |
| C1 Mapbox symbol layers, source.setData per frame | 51.4 | 16.7 / 33.4 / 66.7 | 16 | 0.20 / 9.70 | 88 | 261 | 25 | 171+55, 465 | 33 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 59.6 | 16.7 / 16.8 / 33.4 | 2 | 0.20 / 8.40 | 81 | 249 | 32 | 149+84, 473.7 | 23 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.10 / 0.30 | 8 | 13 | 10 | 27+1, 26.6 | 22 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 78 frames (1.52 s at 51.4 fps), p95 121; mbx-sym-upd: p50 47 frames (0.79 s at 59.6 fps), p95 62

### Main matrix, phone proxy (390x844 @3x, 4x CPU throttle), 462 tiles

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:40:36.783Z

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 461, visible 461; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 18.2 | 50.0 / 66.7 / 83.4 | 142 | 52.80 / 66.30 | 100 | 123 | 54 | 23+0, 22.7 | 5 | 1 |
| A1 same rich tile drawn per frame, Canvas2D | 10.5 | 100.0 / 116.7 / 183.3 | 83 | 45.00 / 59.70 | 61 | 114 | 136 | 1+10, 62.1 | 2 | 11 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 44.8 | 16.7 / 33.4 / 50.1 | 21 | 21.00 / 30.30 | 99 | 126 | 59 | 8+2, 18.3 | 4 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 27.9 | 50.0 / 66.7 / 166.7 | 137 | 44.10 / 58.70 | 100 | 123 | 59 | 6+2, 11.8 | 2 | 267 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.70 / 4.10 | 19 | 106 | 15 | 5+3, 17.6 | 3 | 343 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 50.0 | 1 | 1.50 / 5.90 | 43 | 113 | 16 | 24+3, 52.4 | 10 | 320 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 4.40 / 9.70 | 75 | 120 | 17 | 28+2, 56.2 | 13 | 219 |
| C1 Mapbox symbol layers, source.setData per frame | 4.9 | 216.8 / 333.3 / 366.7 | 39 | 17.80 / 61.60 | 100 | 183 | 8 | 62+33, 222.1 | 17 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 6.8 | 216.6 / 399.9 / 566.7 | 53 | 23.10 / 72.50 | 100 | 181 | 9 | 61+33, 223.1 | 16 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.60 / 1.60 | 38 | 111 | 13 | 31+0, 39.5 | 11 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 7 frames (1.43 s at 4.9 fps), p95 8; mbx-sym-upd: p50 8 frames (1.18 s at 6.8 fps), p95 9

### Phone proxy with the device pixel ratio capped at 2

n = 462 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:42:23.283Z

**P4c: phone 390x844 @2x (DPR capped), 4x CPU throttle** (zoom 11.4; alive 461, visible 461; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 16.4 | 66.6 / 83.3 / 83.4 | 132 | 57.70 / 71.80 | 99 | 120 | 40 | - | 3 | 1 |
| A1 same rich tile drawn per frame, Canvas2D | 12.4 | 83.3 / 83.4 / 116.7 | 100 | 37.20 / 55.40 | 66 | 113 | 133 | - | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 59.0 | 16.7 / 16.8 / 50.0 | 3 | 12.40 / 20.50 | 85 | 122 | 55 | - | 2 | 133 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 34.4 | 33.3 / 50.0 / 66.8 | 43 | 26.20 / 40.50 | 99 | 123 | 64 | - | 2 | 133 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.70 / 3.50 | 18 | 105 | 16 | - | 3 | 138 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.50 / 4.20 | 38 | 110 | 15 | - | 12 | 128 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 2.80 / 4.80 | 47 | 115 | 16 | - | 11 | 149 |
| C1 Mapbox symbol layers, source.setData per frame | 6.6 | 166.6 / 200.0 / 216.7 | 53 | 11.00 / 32.70 | 100 | 187 | 7 | - | 16 | 0 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 7.4 | 133.3 / 166.6 / 183.4 | 61 | 10.90 / 39.10 | 100 | 186 | 8 | - | 25 | 0 |
| C3 feature-state only (static positions, 66 glows) | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.40 / 0.90 | 33 | 110 | 12 | - | 11 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-set: p50 5 frames (0.76 s at 6.6 fps), p95 6; mbx-sym-upd: p50 5 frames (0.68 s at 7.4 fps), p95 5

### Confirmation on the corrected scene: 478 units (all of the data; the first matrix ran on 462 units because of a loader bug, see 05-architecture.md appendix)

n = 478 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T01:41:44.172Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 477, visible 477; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 44.0 | 16.7 / 49.9 / 66.6 | 38 | 10.50 / 20.70 | 57 | 62 | 142 | - | 4 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 2.60 / 5.40 | 19 | 23 | 57 | - | 2 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 60.0 | 16.7 / 16.8 / 18.6 | 0 | 4.00 / 10.50 | 32 | 36 | 93 | - | 2 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 17.0 | 0 | 0.30 / 0.80 | 4 | 6 | 14 | - | 4 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.30 / 0.80 | 8 | 13 | 16 | - | 21 | 64 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 60.0 | 16.7 / 16.8 / 33.4 | 0 | 0.20 / 6.70 | 84 | 271 | 34 | - | 49 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 75 frames (1.25 s at 60.0 fps), p95 90

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 477, visible 477; repetitions per row: 2)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 14.8 | 66.7 / 100.0 / 116.7 | 119 | 64.80 / 95.00 | 100 | 124 | 39 | - | 4 | 1 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 57.9 | 16.7 / 33.3 / 66.7 | 7 | 15.60 / 23.80 | 95 | 125 | 58 | - | 3 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 39.9 | 33.3 / 50.0 / 100.2 | 67 | 29.70 / 47.90 | 100 | 127 | 75 | - | 2 | 267 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.30 / 3.30 | 15 | 105 | 14 | - | 4 | 343 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.10 / 3.60 | 27 | 109 | 14 | - | 10 | 320 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 4.8 | 216.7 / 366.7 / 616.6 | 40 | 20.00 / 50.10 | 100 | 184 | 8 | - | 17 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 7 frames (1.46 s at 4.8 fps), p95 8

### Scaling: 570 tiles (the brief's figure; 108 are clones of real units at +-300 m)

n = 570 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:44:49.406Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 569, visible 569; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 34.7 | 33.3 / 33.5 / 50.1 | 42 | 15.70 / 18.60 | 60 | 68 | 140 | - | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 2.40 / 3.80 | 17 | 21 | 54 | - | 3 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 59.9 | 16.7 / 16.8 / 33.4 | 1 | 4.60 / 6.80 | 31 | 37 | 103 | - | 3 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.40 / 0.90 | 4 | 8 | 15 | - | 3 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.30 / 0.80 | 9 | 14 | 16 | - | 9 | 64 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.90 / 1.50 | 15 | 20 | 19 | - | 8 | 85 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.20 / 4.90 | 82 | 274 | 33 | - | 24 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 104 frames (1.73 s at 60.0 fps), p95 154

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 569, visible 569; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 12.4 | 83.3 / 100.0 / 100.1 | 100 | 77.40 / 89.30 | 100 | 122 | 36 | - | 3 | 1 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 52.8 | 16.7 / 33.3 / 50.0 | 8 | 15.70 / 28.70 | 94 | 125 | 57 | - | 3 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 26.7 | 33.4 / 66.6 / 83.4 | 91 | 32.40 / 58.70 | 98 | 124 | 62 | - | 3 | 267 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.80 / 3.70 | 19 | 106 | 14 | - | 2 | 343 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 1.40 / 2.80 | 33 | 111 | 15 | - | 11 | 320 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 4.40 / 8.00 | 68 | 117 | 17 | - | 12 | 219 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 5.3 | 183.5 / 300.0 / 366.6 | 43 | 20.80 / 60.60 | 100 | 181 | 9 | - | 16 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 6 frames (1.13 s at 5.3 fps), p95 8

### Scaling: 900 tiles (headroom; 438 clones)

n = 900 units requested; 8 s measured after 2 s warm-up; Chrome Chrome/155.0.8059.27; 2026-10-06T00:47:16.129Z

**D1: desktop 1440x852 @1x, no throttle** (zoom 12.4; alive 899, visible 899; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 21.1 | 50.0 / 50.1 / 66.7 | 142 | 39.90 / 45.70 | 90 | 96 | 137 | - | 2 | 5 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 3.90 / 5.20 | 25 | 29 | 71 | - | 3 | 69 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 56.5 | 16.7 / 33.3 / 33.4 | 5 | 6.90 / 8.90 | 42 | 48 | 134 | - | 3 | 69 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.8 | 0 | 0.40 / 0.80 | 4 | 7 | 14 | - | 3 | 73 |
| B2 Mapbox custom layer, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 0.30 / 0.70 | 8 | 12 | 14 | - | 9 | 64 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 60.0 | 16.7 / 16.7 / 16.8 | 0 | 1.20 / 2.10 | 19 | 24 | 19 | - | 12 | 85 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 59.5 | 16.7 / 16.8 / 33.4 | 0 | 0.20 / 7.80 | 84 | 261 | 27 | - | 50 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 124 frames (2.08 s at 59.5 fps), p95 209

**P4: phone 390x844 @3x, 4x CPU throttle** (zoom 11.4; alive 899, visible 899; repetitions per row: 1)

| candidate | fps | frame interval p50 / p95 / max (ms) | frames > 33 ms | our JS per frame p50 / p95 (ms) | main thread busy % | renderer CPU % (all threads) | GPU process CPU % | GC (minor+major, ms) | JS heap end (MB) | canvas + atlas (MB) |
|---|---:|---|---:|---|---:|---:|---:|---|---:|---:|
| A0 current routine (verbatim lS), Canvas2D 1x | 4.2 | 233.3 / 283.4 / 333.4 | 34 | 228.40 / 289.90 | 100 | 122 | 20 | - | 4 | 1 |
| A2 Canvas2D sprite atlas, 1 drawImage per tile | 32.7 | 33.3 / 50.0 / 83.3 | 60 | 26.10 / 46.80 | 98 | 125 | 55 | - | 3 | 331 |
| A3 Canvas2D atlas, body + rotated chevron (2 draws) | 15.6 | 66.6 / 83.4 / 100.0 | 124 | 60.50 / 78.10 | 100 | 124 | 57 | - | 2 | 203 |
| B1 own WebGL2 canvas, instanced sprites | 60.0 | 16.7 / 16.8 / 16.9 | 0 | 1.50 / 3.60 | 16 | 97 | 13 | - | 3 | 343 |
| B2 Mapbox custom layer, instanced sprites | 54.6 | 16.7 / 33.3 / 50.2 | 13 | 1.10 / 6.10 | 40 | 94 | 16 | - | 10 | 320 |
| B3 hybrid: custom layer bodies + Canvas2D text overlay | 59.6 | 16.7 / 16.8 / 33.3 | 0 | 6.90 / 10.20 | 82 | 117 | 21 | - | 13 | 219 |
| C2 Mapbox symbol layers, GeoJSONSource.updateData per frame | 6.5 | 150.0 / 266.6 / 300.0 | 52 | 13.20 / 50.90 | 100 | 199 | 10 | - | 19 | 0 |

Mapbox symbol layers, what is DISPLAYED lags what was sent (sentinel feature: frames between the data sent and the data the map holds, converted with the measured frame rate): mbx-sym-upd: p50 8 frames (1.23 s at 6.5 fps), p95 10

### Overlay lag behind the map while the map pans at 667 px/s (px, 1440x852, 8 s, three repetitions)

| overlay drawn from | mean abs mismatch px | p95 | max | share of frames > 1 px |
|---|---:|---:|---:|---:|
| own rAF loop armed after the map started animating | 0.00 | 0.00 | 0.00 | 0.00 |
| own rAF loop armed before the map (the order when Play is pressed first) | 11.12 | 11.41 | 12.81 | 1.00 |
| map.on('render') (+ triggerRepaint) | 0.00 | 0.00 | 0.00 | 0.00 |

### Layout-solver budget on real positions (solver-D1, desktop 1440x852 @1x, no throttle)

| zoom | visible | overlapping pairs raw | L0 current loops: ms p50 / p95, residual, extra px per frame mean / p95 / max | L1 grid warm start: ms p50 / p95, residual, extra px mean / p95 / max |
|---|---:|---:|---|---|
| 12.4 | 478 | 5456 | 5.6 / 6.7, 2984, 5.964 / 37.555 / 161.73 | 2.1 / 4, 2250, warm 5.466 / 35.488 / 220.1 (cold 41.927) |
| 13.5 | 432 | 1801 | 3.8 / 6.1, 1318, 0.926 / 0.349 / 133.91 | 1.2 / 1.8, 794, warm 3.76 / 4.782 / 702.05 (cold 10.214) |
| 14.5 | 190 | 333 | 0.6 / 0.7, 304, 0.127 / 0.012 / 57.63 | 0.3 / 0.6, 160, warm 0.719 / 1.491 / 262.65 (cold 2.256) |
| 15.5 | 57 | 24 | 0 / 0.1, 22, 0.083 / 0.059 / 15.49 | 0.1 / 0.1, 14, warm 0.169 / 0.174 / 61.88 (cold 0.145) |

### Layout-solver budget on real positions (solver-P4, phone 390x844 @3x, 4x CPU throttle)

| zoom | visible | overlapping pairs raw | L0 current loops: ms p50 / p95, residual, extra px per frame mean / p95 / max | L1 grid warm start: ms p50 / p95, residual, extra px mean / p95 / max |
|---|---:|---:|---|---|
| 12.4 | 478 | 5456 | 27.7 / 30.8, 2984, 5.964 / 37.555 / 161.73 | 11.3 / 15.9, 2250, warm 5.466 / 35.488 / 220.1 (cold 41.927) |
| 13.5 | 432 | 1801 | 26.4 / 41.9, 1318, 0.926 / 0.349 / 133.91 | 6.8 / 10.9, 794, warm 3.76 / 4.782 / 702.05 (cold 10.214) |
| 14.5 | 190 | 333 | 2.8 / 6.9, 304, 0.127 / 0.012 / 57.63 | 2.4 / 5.1, 160, warm 0.719 / 1.491 / 262.65 (cold 2.256) |
| 15.5 | 57 | 24 | 0.2 / 0.6, 22, 0.083 / 0.059 / 15.49 | 0.2 / 0.3, 14, warm 0.169 / 0.174 / 61.88 (cold 0.145) |

