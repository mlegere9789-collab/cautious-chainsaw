# BASE1863 - the 1863 reconstruction as the base of the two main maps (optional patch group)

Status: built and tested on scratch trees of R1c (`tmp/b1863/group/R1c`, 2026-10-19, and R1c + MON, `R1c-mon`); **not registered** in `trains.json`, not in `release/`, nothing deployed.
The picture is the reconstruction of `docs/basemap1863` (read its `BUILD.md` first). It is **a reconstruction, not a photograph of 1863**: a USDA NAIP aerial photograph of 4 June 2013 (1 m per pixel)
with post-1863 features removed and 1863 features added from period maps. This group says so on the map, in the credit line and in `ABOUT.txt`; it claims neither "1:1" nor any percentage of accuracy.

## In plain words

1. Before: both main maps (desktop and phone) asked Mapbox for the *modern* satellite style. Now they draw only our own tiles of the reconstruction, on top of a flat neutral ground colour.
2. There is no switch back to the modern picture and none is offered. Zero Mapbox satellite, style or raster requests are made (the test counts them). Mapbox is still asked for text glyphs (the road and
   river names), nothing else.
3. A box on the map says in every state: *Reconstruction of July 1863 (USGS imagery and period maps), not a photograph*, with a **Show what was changed** button (colours every pixel that was removed,
   filled, drawn or recoloured, with a legend) and a **Sources and licences** link.
4. Beyond the edge of the photograph you see the neutral ground colour, never the modern picture. If tiles cannot be loaded (offline) the same happens, with a polite status line, and they are requested again
   when the connection returns.
5. The Virtual Walkthrough has its own map and is **not touched** (its code span is byte-identical to the build without the group, tested). It still shows the modern Mapbox satellite style: that is the owner's
   rule for this task, and it means the *site* still contains one modern satellite view (see "Not done").

## What was found in the pyramid and handled at integration (all measured)

| finding | evidence | handling |
|---|---|---|
| Tiles reaching past the photograph hold **streaks**: `s40_tiles.py` cuts with `cv2.remap(..., BORDER_REPLICATE)`, so the edge row/column of the 17,280 x 13,620 m mosaic is smeared outward (two streaked bands and a streaked margin in the z13 mosaic) | image of the 25 z13 tiles composed before and after | `stage_assets.py` recomputes which pixels lie inside the mosaic (same grid constants as `tools/b1863/common.py`): 784 tiles inside are copied byte for byte, 51 edge tiles are re-encoded as WebP **with alpha** (outside transparent, quality +8 to limit the second generation loss), 87 tiles wholly outside become tiny transparent tiles (so no request is a 404) |
| z17: 97 of 459 tiles exist (362 holes) and they are enlargements of z16 | `manifest.native_note`, tile list | not shipped: the map over-zooms z16 (GL pixels at z17 and z18 equal the enlarged z16 tile, test B63-01: diff 0.1) |
| z16: 28 holes inside its rectangle | tile list | the 28 are filled with the 2x enlargement of the z15 parent quadrant (same pixels the z15 layer shows) and masked; no new information |
| the provenance tiles are opaque palette PNGs (class 0 is opaque black) | `PROVENANCE-LAYER/tiles` | re-written with transparency for the unchanged classes (0, 22) and outside the mosaic; 932 tiles, 6.87 MB |
| a 1440 px wide window cannot go below zoom 12.04 (the map's own `maxBounds` of 0.24 degrees) | `getZoom()` after `jumpTo({zoom: 5})` | unchanged; the phone reaches z11 |
| The tile pyramid ends at lon -77.34375 on the west (the builder's data box) though the mosaic reaches -77.348 | stage statistics | a 0.004 degree strip of photograph is not drawn (it was never tiled) |

## What ships (`tools/t0/base1863/stage_assets.py`, deterministic, below normal priority, 4 processes)

`/tiles1863/v1-<8 hex of the hash of all files>/` (a content hash: the name is never reused for other bytes, so the directory is immutable like `/assets/`):
`{z}/{x}/{y}.webp` z11-z16 (950 files, 27.77 MB), `changed/{z}/{x}/{y}.png` z13-z16 (932 files, 6.87 MB), `overlays.json` (46.8 KB), `ABOUT.txt`, `index.json`. **Added to the build: +34.71 MB and +1,885 files**
(tree 4.01 MB / 127 files without the group, 38.72 MB / 2,012 with it; the entry bundle grows by 13,795 bytes to 2,319,366). `sw.js` grows from 1,433 to 2,250 bytes, `_headers` by 91 bytes.
The 29.3 MB pyramid of `docs/basemap1863/tiles` is therefore not shipped as is (z17 dropped, edge tiles re-encoded); the committed pyramid is untouched.

Version hash at the time of writing: `v1-65d491b8`. `BASE1863.json` embeds it; regenerate both after any change of the pyramid (`stage_assets.py`, then `node tools/t0/base1863/build-base1863.mjs`).

## The map (`gtb63.js`, injected before `T4`, the function that adds the product's own layers)

* **Style**: an inline style object, not `mapbox://styles/...`: `background` (neutral ground `#708a6e`, the median RGB of the valid pixels of the z11 tiles), `raster b1863-wide` (tile zoom 11-15, bounds of the staged
  rectangle), `raster b1863-detail` (z16 only, over-zoomed to z18), `raster b1863-changed` and `b1863-changed-detail` (hidden until the toggle, `raster-resampling: nearest`). Everything the product adds
  (roads, rivers, breastworks, farms, MON, the unit canvas, popups) is above these. Glyphs: `mapbox://fonts/mapbox/{fontstack}/{range}.pbf`.
* **Retina**: the photograph is 1.0 m per pixel (z16 = 0.92 m, the native level), so z17/z18 files would add bytes and no information. On a device with DPR >= 1.5 that is not in data-saver mode and not on 2g
  the sources use `tileSize: 256`, i.e. one zoom level finer than the camera (real detail at camera zoom 11 to 15, 4x the tiles); otherwise `tileSize: 512`. `saveData`, `effectiveType` 2g and
  `prefers-reduced-data` choose the normal level. `prefers-reduced-motion` turns the 200 ms cross-fade off.
* **Beyond coverage**: every tile of the declared bounds exists, so a tile request never returns 404; outside the bounds nothing is requested and the ground colour shows. Tile errors (offline): a filter on the map's
  `error` event swallows errors of the `b1863-*` sources only (everything else is logged as before), shows the status line, and rebuilds the sources on `online` or the next `moveend` (at most every 8 s).
* **Label, toggle, link**: one DOM box in the map container above the unit canvases (z-index 12): home is the top of the map, right of the menu cluster and the day badge on the desktop, top left on the
  phone; the label wraps, the buttons are 44 px tall on touch devices. **Placement** (`Placer` in `gtb63.js`): the label is permanent and must never stand on a card or other floating furniture (POLISH layout:
  cards, unit card, legend, menu cluster, badge, overview, toasts, Mapbox controls; the phone shell's stack, pop-up, sheets, bars), so it reads their real rectangles (`FURN` selectors; a card that ANIM glides with
  CSS `translate` counts as the hull of its start and end) and picks, among the corners at the edges of that furniture, the cheapest place where it fits, widest first (it wraps, never below 12 px text or
  its controls); it stays while still free and returns home when home is free. It runs on a mutation of a furniture element, a resize or the end of a transition (not per frame), moves with `transform` (a move
  is never a layout shift) and is not drawn until it is first placed (after 1.5 s at the CSS position if placement cannot run). The legend of "Show what was changed" is a panel under the box (above it when
  there is no room), not part of the placement. On the phone shell the card stack is the one piece of furniture that may give way: when no free place exists the box takes the place that leaves the stack most
  room and the stack is capped (`data-gtb63-room` on `.gtbg-mp-story`: portrait max-height, landscape top) as far as each card keeps 90 px; if even that is not enough the box stands where it overlaps least and
  carries `data-conflict`. Counters: `window.__gtb63.place` (runs, moves, conflicts, yields, last). **Show what was changed** is a toggle button
  (`aria-pressed`, Enter and Space), its legend has the 15 classes with plain-language texts (colours are those of `PROVENANCE-LAYER/classes.json`), below z13 a note says to zoom in. Not remembered between visits
  (like every other tool toggle). **Show modern satellite is not offered** (the test greps the page and the entry).
* **Attribution**: the raster source's `attribution` shows in the map's own attribution control: *Reconstruction, not a photograph. USDA NAIP 2013, USGS, Library of Congress, NPS, OpenStreetMap contributors*;
  the long credit line, the licence table of `BUILD.md` section 10, the measured accuracy of the inputs and what is unknown are in `/tiles1863/<ver>/ABOUT.txt`.

## The product's own overlays on the new base (decided from the evidence)

The product's lines were placed by hand with 4 to 6 points each. Compared with the catalogue geometry that the reconstruction is drawn from (sample every 25 m, UTM 18N metres, median / 90th percentile / maximum):

| overlay | distance to the catalogue road or stream of the same name | decision |
|---|---|---|
| Emmitsburg Road | 311 / 377 / 569 m | the line is hidden by default (it is 300 m from the drawn road); its **label** is redrawn on the catalogue road `RD-003` |
| Taneytown Road | 789 / 1,421 / 1,515 m | same, `RD-004` |
| Baltimore Pike | 1,027 / 1,715 / 1,854 m | same, `RD-001` |
| Chambersburg Pike | 1,004 / 1,973 / 2,208 m | same, `RD-002` |
| Hanover Road, Wheatfield Road, Granite Schoolhouse Lane | 367, 193, 311 m median | same, `RD-005`, `RD-014`, `RD-016` |
| Willoughby Run, Rock Creek, Plum Run | 1,599 / 806 / 50 m median to the NHD course of that name | line hidden, label on the NHD course |
| Rose Farm outline | the box does not contain its own farmhouse: 347 m from the documented farmhouse `STR-ROSE-HOUSE1` | the boxes are removed (the catalogue has no farm boundaries); **Farm Labels** now sit on the four documented farmhouse points; the "Farm Outlines" row is removed from the Layers panel |
| breastworks (4 lines) | no catalogue of works exists, nothing to compare | kept as they are: they show something the base does not draw, but they are the product's schematic lines, not surveyed positions |

The Layers panel starts in the state the map is in; "1863 Roads" and "Rivers" can still be switched on and now follow the catalogue geometry (25 roads, 8 streams). Labels of minor roads and the other
catalogue roads are added (rank 1, drawn after the twelve main ones). Spangler's Spring (a point in the catalogue) is not labelled.

## Service worker, headers, cache budget

* `sw.js` (generated from `tools/t0/mechanism/sw.js.tmpl`, which this group does **not** edit): `b63_build.py` wraps `mechanism._tmpl` in memory and adds three edits (each anchor asserted once):
  `/tiles1863/*` is cache-first in the same release cache `gbg-r0-<rid>`, **at most 600 tile entries (about 24 MB at the 40 KB average), oldest first**, asset entries are never evicted by it, a failed tile fetch
  answers `Response.error()` (no uncaught worker exception), everything the gate checks (no `skipWaiting`, `clients.claim`, cache name, navigations bypassed) is unchanged. Offline: a tile seen before is served, one never seen
  fails (nothing is invented).
* `_headers`: `config_hook.mjs` runs `gen.mjs` unmodified and adds `Cache-Control: public, max-age=31536000, immutable` to the `/tiles1863/*` block (only that header; the one-rule-per-name invariant is re-proved
  with `config/lib.mjs`). Without it Netlify would revalidate 35 MB of tiles on every request. The directory name carries the content hash, so immutable is safe (same argument as `/assets/*`).
* Asset names: the entry gets a new release id as always (`index-<rid>.js`); tiles live under the hashed directory; the used-names ledger is unaffected (no new file under `assets/`).

## First-load cost (measured by `T0-B63-08`, real Chrome, local emulator of the dist's own `_headers`)

| device | tile requests | bytes | tile zoom |
|---|---|---|---|
| desktop 1440x900, DPR 1 (start zoom 13.5) | 16 | 0.82 MB | 14 |
| desktop DPR 2 | 46 | 1.97 MB | 15 |
| desktop DPR 2, data saver / 2g | 16 | 0.82 MB | 14 |
| phone 375x812, DPR 3 | 7 | 0.33 MB | 14 (sharp) |

Plus `overlays.json` (46.8 KB) fetched after the map is up. The legacy page loaded Mapbox satellite tiles for the same view (not measured here: the Mapbox cap of the harness).

## Tests (`tests/t0/base1863.spec.mjs`, real Chrome, tiles only from the local pyramid, Mapbox only for glyphs)

`T0-B63-01` desktop z12-z18: GL pixels read back inside a render event equal the tile's pixels at a tile centre (mean abs RGB diff 0.0 at z13, z14, z16, 0.1 at z17/z18, 4.4 at z15 where a label crosses the patch), every
tile 200, zero Mapbox satellite/style/raster requests, only fonts + session + telemetry hosts; `-02` phone DPR 3 touch, hit-testable 44 px controls, z11 reached, a real tap; `-03` label text at every zoom, attribution,
`ABOUT.txt`, no modern-satellite offer, no accuracy claim; `-04` the toggle (click, Enter, Space), provenance tiles requested only after it, 15-entry legend, pixels change, note below z13, **axe: 0 serious/critical**
on the open label on desktop and phone; `-05` beyond coverage (neutral ground, no 404, no console error); `-06` offline: no uncaught exception, status text, ground colour, recovery and cleared status;
`-07` layer order, catalogue labels, hidden lines, a real click on a drawn unit opens its panel; `-08` retina / data saver / 2g / phone and the cost table above; `-09` immutable header, SW cache-first, offline,
the 600-entry cap in a node vm; `-10` (needs MON) the Monuments layer above the base; `-11` anchors 10/10, Walkthrough span byte-identical to the control, tile set complete; `-X` no first-party console error.
Result: **11 of 11 pass on R1c + BASE1863, `-10` passes on R1c + MON + BASE1863** (`node tests/t0/base1863.spec.mjs --dist tmp/b1863/group/R1c-mon/dist --filter B63-10`).
**Red-first**: on `release/R1c/dist` (no group) all 10 feature tests fail, with the guard and with `--expect-red --behavior-only` (by behaviour: 9 of 9, MON skipped). The build gates are green (`gate.json`), two
builds of the same tree have the same tree sha256 (`2ebaf65c...`).

## Using it

```
python tools/t0/base1863/stage_assets.py                       # the files of /tiles1863/<ver>/ (about 50 s)
node   tools/t0/base1863/build-base1863.mjs                    # tools/t0/patches-next/BASE1863.json
python tools/t0/base1863/b63_build.py --train R1c --out tmp/b1863/group/R1c [--with CLOCK,DATA,MON] [--without-base] [--no-gate]
node   tests/t0/base1863.spec.mjs --dist tmp/b1863/group/R1c/dist [--control <dist without the group>] [--filter 'B63-0[1-4]']
```
Registering it for real (integrator): (1) add `BASE1863` to `trains.json` `optional_groups` (last), (2) put `tiles1863/` under `tools/t0/overlay/R1c/` (about 35 MB: or keep generating it), (3) take the three `sw.js.tmpl`
edits of `b63_build.py` into the template and the `/tiles1863/*` immutable rule into `config/gen.mjs` (`CACHE_DIRS`), (4) check that the suites that read `caches.keys()` or `_headers` still hold (the tile entries live in the
release cache, so the number of caches is unchanged), (5) `docs/baseline-drift.md`/staging notes: with the group the map shows on `netlify.app` staging as well, because the base no longer depends on the URL-restricted Mapbox token
(only the labels do).

## Not done / not verified (nothing here is hidden)

* **Not photoreal at the closest zoom and not July 1863**: see `docs/basemap1863/BUILD.md` section 9 (1 m per pixel, 4 June 2013 crop state, soft re-synthesised patches, 21 percent AMBIGUOUS_KEPT, nothing added outside the Warren sheet, terrain
  not rolled back). Those limits are the builder's and are shown, not fixed, here.
* **The Walkthrough still shows modern Mapbox satellite imagery** (owner rule: do not touch it). So does any other page with its own map (`compare`, `viewshed` and others were not part of this task and not changed).
* Mapbox glyph requests remain (fonts API, plus the map-session call and telemetry): Mapbox terms still apply to them.
* Not tested: Safari/Firefox/real devices (only system Chrome with emulated phone metrics), a real Netlify deploy (headers were tested on the emulator that applies the dist's own `_headers`),
  the SW cap against real browser eviction, `prefers-reduced-data` (no browser ships it; the code path is the same as save-data).
* R1a and R1b were not built with the group; the anchors are the ones of R1c.
* The unit canvas colours and the time-of-day tint were designed for the satellite picture; they were looked at, not re-designed.
* The 51 re-encoded edge tiles lose a little quality (one more lossy generation); the strip west of lon -77.34375 is not drawn.
