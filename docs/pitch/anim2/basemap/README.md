# Basemap: the real ground under the Battle Studio

An open-data equivalent of the product's satellite map, for the Battle Studio prototypes: USGS aerial photography, lit by a USGS elevation model, with contours, water, roads and the site's place marks, graded into four looks so the unit tiles can sit on it. No network at run time, no token, no dependency. Public-domain sources only.

```js
import { configureBackdrop, drawBackdrop } from './src/backdrop.mjs';
import { MANIFEST } from './data/manifest.mjs';
import { VECTORS } from './data/vectors.mjs';
configureBackdrop({ manifest: MANIFEST, vectors: VECTORS, base: './assets/' });         // tiles as files next to the page ...
// configureBackdrop({ manifest: MANIFEST, vectors: VECTORS, pack: PACK });              // ... or as data URIs (dist/pack.mjs), for a host that must be one file
// every frame, before the tiles:
const r = drawBackdrop(ctx, { lng: -77.2347, lat: 39.8117, zoom: 15, w: 1440, h: 900 }, 'dim');   // ctx in CSS px, a DPR scale on it is honoured
// r = { animating, pending }: when either is true a tile is still arriving or fading, draw again
```

Everything in this folder was built and checked on 2026-10-06 and 2026-10-07; every number below comes from a script in `verify/` or `tools/` that you can re-run (section 10), or is marked as read, not measured.

## 1. What is in the folder

| Path | What | Size |
|---|---|---|
| `src/backdrop.mjs` | the loader: `configureBackdrop`, `drawBackdrop(ctx, camera, variant)`, `createBackdrop`, `backdropEntries` (for the Studio's registry), the tile cache, grading, fades, frame cache | 21 KB |
| `src/looks.mjs` | the four looks as data (`dim`, `natural`, `slate`, `paper`), `registerLook`, `stops` | 10 KB |
| `src/vectors.mjs`, `src/vtiles.mjs` | water, roads, rail, contours and the place marks; the vector layers baked into bitmap tiles for a moving camera | 15 + 6 KB |
| `src/tiles.mjs`, `src/geo.mjs` | the image-tile cache (decodes before a tile counts as ready); Web Mercator on the Studio's 512-px world | 5 + 2 KB |
| `assets/aerial/<z>/<x>_<y>.avif`, `assets/shade/...` | 776 tiles: NAIP aerial z13 to z17 (475) and hillshade z13 to z16 (301); `assets/manifest.json` is the tile index | 9.17 MB |
| `data/vectors.mjs`, `data/manifest.mjs`, `data/ground-truth.json` | quantised vector layers and 41 place marks (named export `VECTORS`), the tile index (`MANIFEST`), the three hills moved to their measured summits | 0.52 MB |
| `dist/pack.mjs` (git-ignored, `tools/build-pack.mjs`) | the same tiles as data URIs, 12.3 MB of module text (`--max-zoom=15`: 7.6 MB, `=14`: 2.5 MB, `=16`: 10.9 MB) | - |
| `demo/index.html` | stand-alone page: `?lng=&lat=&z=&look=dim|natural|slate|paper&dpr=&places=0&labels=0&roads=0&contours=0&scale=1&pack=1&bench=1` | 5 KB |
| `previews/` | 27 JPEGs: `<spot>-z13.5/15/16.5/17.5-dim` for the three hotspots (12), `looks/<spot>-z15-natural/paper/slate` (9), `landmarks/sheet_0..2` (3), `studio-on-real-ground-dim/paper/natural` (the real Studio on the real ground, 3) | 5.7 MB |
| `tools/` | the pipeline, in order (section 10) | - |
| `verify/` | every check, with `results/*.json` | - |

Total that ships at run time: 9.69 MB of data (tiles 9.166 MB + vectors 0.522 MB + indexes) and 60 KB of code: 9.75 MB (9.30 MiB), under the 10 MB cap. Nothing is requested from the network: `verify/studio-integration.mjs` records zero external requests.

## 2. The product's map today (read in the R1c bundle)

Source: `release/R1c/dist/assets/index-2531699e.js` (minified; line numbers are that file's), cross-checked with `docs/pitch/anim/03-data-fuel.md` and `04-benchmarks.md` (F18). Read, not run: the Mapbox token is restricted, so I could not open the product's map in a browser.

- **Style**: `mapbox://styles/mapbox/satellite-v9` (lines 3355 and 3421), Mapbox GL JS 3.24.1, `minZoom 11`, `maxZoom 18`, `maxBounds [[-77.36,39.72],[-77.12,39.91]]`, no pitch or bearing (rotation disabled). Start centre `[-77.235, 39.812]`; start zoom 13.5 on the desktop host (constant `mF`), 13 in the second host (line 3421).
- **What the unit layer sits on**: one full-size 2D `<canvas>` appended to the map container with `position:absolute; inset:0; pointer-events:none; z-index:10` (line 3421), above the Mapbox canvas. The units are drawn on it, projected with `map.project()` every frame.
- **What the picture looks like**: Mapbox's satellite imagery. The bundle's own code adds no terrain and no fog (every `setTerrain` and `setFog` in `index-2531699e.js` is inside the Mapbox library code, and the style has no DEM source added), so the ground is the style's own picture, flat. Whether `satellite-v9` carries road, place or POI labels, and what its imagery looks like in tone and vintage, is **Unknown** here: I could not open the style JSON (token) and the Mapbox styles page I fetched is rendered by script, so its text did not say.
- **What the product adds on top of the imagery**, all on map load (`T4`, line 3421): the site's own GeoJSON layers, not the base style:

| Layer | Look | Labels |
|---|---|---|
| `roads-1863` | line `#44bb44`, 2 px, opacity 0.7 | along the line, Open Sans Regular 10 px, `#88dd88`, black halo 1 px, only features flagged `label` |
| `rivers` | line `#8844cc`, 2 px, opacity 0.8 | Open Sans Italic 9 px, `#aa66dd`, same halo |
| `breastworks` | line `#884422`, 3 px, opacity 0.85, dashed `[4,2]` | none |
| `farms` (outline, label) | `#886633`, 1 px, 0.5, dashed `[3,3]`; label Open Sans Bold 13 px `#f0c97a`, halo 2 px | both layers `visibility: none` at load; the Layers panel (`GtbgLayers`) lists "Farm Outlines" as on at load, so the first click on it changes nothing (read in the code, not reproduced) |

  A Layers panel toggles them. Other components add `wt-stops` (numbered gold discs, walking tour), `wt-mons` (monument dots: blue Union, red Confederate) and `gbdist` (the distance tool) to their own maps. The labels the visitor sees on the main map are therefore the overlay labels above plus the unit labels; there is no base-map place-name layer that this backdrop needs to match.

What this backdrop does about it: it uses the same Web Mercator, 512-px world and zoom numbers as Mapbox GL (tile zoom z equals camera zoom z), so the Studio's camera drives it unchanged; it covers zoom 13 to 17 inside the data box (below 13 the z13 tiles are drawn smaller; above 17 the z17 tiles are stretched); it draws the place marks of the Studio's terrain data, modern roads and streams (Census TIGER) and optional contours instead of the product's 1863 overlays. The 1863 road, river and breastwork GeoJSON are product data and are **not** reproduced here.

## 3. What the picture is, and what it is not

| Layer | Evidence label | Why |
|---|---|---|
| Aerial photograph | **Measured**, modern | USDA NAIP, photographed 24 April, 28 April and 10 May 2022 (section 5); leaf-off, so woods read brown and fields read pale. **It is not the 1863 landscape**: fences, orchards, woods, roads and buildings differ, and that difference is **Unknown**. `backdrop.caption()` returns the one-line caption for the corner of the screen |
| Hillshade, contours | **Computed** from a measured surface | USGS 3DEP bare-earth DEM, 10 ft (3.048 m) contours, index lines every 50 ft; the modern ground surface, with modern quarry and road cuts |
| Roads, rail, streams, water | **Measured**, modern | Census TIGER/Line centre lines; their positional accuracy was not checked here |
| 30 place marks, 3 features, 8 structures | **Modelled** (the site's `terrain.json`), except the three hills below | positions are the site's, drawn as a ring; a filled dot means the position was moved to a measured summit; a **dashed ring** means the position is in doubt: the landmark check found no building of that name at the mark (the Lutheran Seminary, the Evergreen Cemetery gatehouse, section 7.2) or, in the legacy frame, the two frames disagree (8 places) |
| Three hills (Little Round Top, Big Round Top, Culp's Hill) in the `ground` frame | **Measured** | the highest point of the 3DEP DEM within 350 m of Wikipedia's coordinate (`verify/ground-truth.py`) |

Nothing on this ground says where a unit was. The unit placements stay **Modelled** whatever they are drawn on.

## 4. Using it

**Camera**: any object with `{ lng, lat, zoom, w, h }` (CSS px). The Studio's `Camera` class (`docs/pitch/anim/prototype/src/geo/project.mjs`) already has these five fields.

**API** (`src/backdrop.mjs`, named exports only):

| Call | Does |
|---|---|
| `configureBackdrop({ manifest, vectors, base \| pack \| urlOf })` | builds the shared instance; `base` = a folder of tile files, `pack` = `{ aerial: { 'z/x_y': dataURI }, shade: ... }`, `urlOf(layer, z, x, y)` = your own source |
| `drawBackdrop(ctx, camera, variant = 'dim', opts = {})` | draws the ground into the host context; before `configureBackdrop` it draws flat ground and returns |
| `createBackdrop(options)` | a separate instance (`.draw`, `.prefetch(14)`, `.whenIdle()`, `.stats()`, `.caption()`, `.attribution()`, `.bounds`, `.onchange`) |
| `backdropEntries(backdrop, { placeFrame })` | one Studio backdrop entry per look: ids `real-dim`, `real-natural`, `real-slate`, `real-paper`; the token `backdrop.frame`, when the host has one, picks the place frame |
| `registerLook(look)` | add or replace a look at run time (section 11) |

`opts`: `places`, `placeFrame` (`'ground'` default, `'production'`, `'legacy'`), `roads`, `contours`, `water`, `labels`, `vignette`, `fade` (the 240 ms cross-fade when a tile arrives; on by default, `false` turns it off, the demo and the previews do so that pictures are deterministic), `scaleBar: { x, y }`, `direct` (default true, below), `dpr`. `quality` (the image-smoothing quality of the moving-camera path, default `'low'`), `live` (stroke the vector layers every frame instead of baking them). Constructor options: `maxBakes`, `bakeBudget` (tiles graded per frame, 8), `bakeMs` (grading time per frame, 3), `vectorTiles` (`false` = live vectors, or `{ step, maxBytes, bakePx }`). The host sets `backdrop.onchange = () => redraw()`; that one line is how a tile arriving makes the Studio redraw.

**How a frame is painted.** While the camera moves, the backdrop paints straight into the host's canvas in one pass, with plain bilinear image smoothing and the vector layers drawn from baked bitmap tiles (`src/vtiles.mjs`). When the camera comes to rest it renders once, with high-quality smoothing, into a frame cache and from then on blits that (0.09 ms per frame at DPR 1), so the units can animate at 60 fps for free. With the same smoothing the two paths give byte-identical pixels; with the default ('low' while moving) the moving frame differs from the resting one by a mean of 0.07 to 0.19 of 255 and at most 6 (`verify/direct-test.mjs`, 4 views), so nothing pops when the camera stops. Why the moving path looks like this is section 7.5; the short version is that stroking roads and contours every frame, resampling at high quality and baking four tiles in one frame each cost the GPU more than the whole photograph. The rest of the discipline:

- Aerial tiles are graded once, when first needed ("baked": at most 8 per frame and about 3 ms of grading per frame, never fewer than one), never per frame; a coarser ancestor tile is drawn under any tile that has not arrived; the hillshade of a tile is waited for, so a tile never appears ungraded.
- A tile image counts as ready only when it is decoded (`img.decode()`), so no frame pays for decoding an AVIF.
- Each aerial tile carries a 4 px gutter of real neighbouring pixels, each vector tile too, so a lossy codec or a fractional-pixel placement can never show a seam.
- Vector tiles are cut at half levels of zoom (zoom 14.5 and 15.0, not every 0.01), line widths come from the look at that zoom and a tile is drawn scaled by at most 19 % either way. A tile not baked yet is replaced by its neighbour half level or its parent, clipped to its own cell, so there is never a hole and never a double line. Baking is limited by pixels (0.6 M device px per frame: one tile at DPR 2, two at DPR 1), not by milliseconds, because recording a bake takes the main thread under a millisecond while the GPU then needs 10 to 14 ms to rasterise it (`tmp` micro-benchmark, section 7.5).
- Labels (road and stream names along their lines, place marks) are not baked: text is cheap and must stay sharp. They are laid out greedily once per 1/8 of a zoom step and anchored in world coordinates, so they move with the ground and never flicker.

**Into the real Studio.** `verify/studio-integration.mjs` copies the prototype to `tmp/`, adds the modules and the pack, registers `backdropEntries(real)` through the hook `registerBuiltins(kernel, { backdrops })` already offers, builds one `battle-studio.html` with the Studio's own bundler (every module accepted, `tools/check-bundle-rules.mjs` re-applies its rules) and opens it at `?backdrop=real-dim`. Result: the token validates against the registry, 0 page errors, 0 tiles failed, 0 external requests, at DPR 1 and 2, for four looks. Two things a host must know: the Studio's `syncTheme` only treats the id `ink` as dark, so for `real-dim` and `real-slate` map the look's `theme` field (`'dark'`) yourself; and the backdrop's own place and road labels sit under the unit tiles, so a skin that carries its own place names should pass `labels: false` (or `places: false`).

**Looks** (`previews/` shows each):

| Look | Theme | For |
|---|---|---|
| `dim` (default) | dark | calm, desaturated, darkened aerial so symbols pop; faint contours, blue water, pale roads |
| `natural` | dark | the aerial almost as photographed, gently muted: nearest to what the product's map looks like today |
| `slate` | dark | near-monochrome blue-grey with strong relief: the quietest ground for saturated symbols |
| `paper` | light | warm paper with the aerial ghosted in, brown relief and contours: a faded survey print for dark symbols |

## 5. The data

**Tiles.** A Web Mercator pyramid of 512-px tiles on the Studio's world (512 px at zoom 0). Each tile is stored as 520 x 520 px AVIF (the 512 px tile plus a 4 px gutter), quality 40 (z13 and z14: 36). z13 to z16 are box-averaged from one request of the USGS service at 0.917 m per pixel (z16 is that grid itself) with a mild unsharp mask up to z15, z17 from a second request at 0.459 m per pixel; the service itself resamples its 0.6 m photograph (bilinear) to the grid I ask for. Hillshade is grayscale (128 = flat) from the 3DEP DEM: three light azimuths (135, 165, 195 degrees, weights 1:2:1) at 38 degrees altitude, vertical exaggeration 3x at z16 rising to 6x at z13, so the relief reads at every scale; the south-south-east light was chosen to agree with the direction of the shadows in the photograph (they fall north-north-west; judged by eye on the landmark crops, not measured), and the `paper` look inverts it (lit from the north-west, the cartographic convention). It is laid on the graded aerial with a soft-light blend at run time.

| Level | Ground per CSS px (lat 39.8) | Aerial tiles | Aerial MB | Hillshade tiles | Hillshade MB | Covers |
|---|---|---|---|---|---|---|
| z13 | 7.34 m | 20 | 0.24 | 20 | 0.18 | the whole box |
| z14 | 3.67 m | 63 | 0.89 | 63 | 0.59 | the whole box |
| z15 | 1.83 m | 150 | 2.48 | 150 | 1.30 | everything within 2 km of a unit path or place mark |
| z16 | 0.92 m | 150 | 1.94 | 68 | 0.55 | by priority: tiles with the most unit activity first |
| z17 | 0.46 m | 92 | 1.01 | - | - | within 380 to 560 m of the eight hotspots (the three primary ones first) |

The z17 tile pixel (0.46 m) is finer than the photograph's native 0.6 m, so z17 adds no detail, it only avoids a soft stretch. The hotspots are The Angle, the Wheatfield and Rose Woods, Cemetery Hill, Culp's Hill, Seminary Ridge, Oak Hill, Little Round Top and the Peach Orchard (`tools/hotspots.json`). 218 candidate z16 and z17 tiles were left out for the 9.7 MB budget (`tools/build-assets.py` ranks them); outside the finest tiles the loader falls back to the next coarser level, so nothing is ever blank inside the box.

**The box.** West -77.34375, south 39.75788, east -77.14600, north 39.87602 (z14 tile range 4672..4680 x 6210..6216): every unit keyframe (1,687) and every place mark in `docs/pitch/anim/prototype/data/dataset.json` plus 1.2 km (`plan.json`). Past the edge of the data the loader draws the look's ground colour, with the last 160 px of imagery fading into it, so the camera can run off the map without a hard cut.

**Which day is the ground.** `tools/build-assets.py` first wrote "2022-04-24" for the whole box; a query of the USGS NAIP Plus catalogue over the box (`verify/results/naip-scenes.json`, 13 scenes) shows three flight dates: 24 April 2022 (3 scenes, longitude -77.2545 to -77.1831: Cemetery Ridge, The Angle, Culp's Hill, Little Round Top, the Wheatfield), 28 April 2022 (6 scenes, west of -77.2456: Seminary Ridge's western slope and the Confederate side) and 10 May 2022 (4 scenes, east of -77.1919). Counted over the 1,687 unit keyframes: 63.2 % lie only under 24 April scenes, 20.2 % where 24 and 28 April overlap, 15.5 % only under 28 April, 1.1 % under 10 May. Counted over the 30 place marks: 23, 5 and 2 (24 April, overlap, 28 April). I looked for a colour step across the scene edges in the z13 mosaic (column means of an excess-green index and of luminance, 24 px either side of -77.2545, -77.2456, -77.1919 and -77.1831): the largest step was 2.5 on a 0 to 255 scale (luminance 5.3), so the USGS mosaic hides the date change; the manifest caption now says "24 April to 10 May 2022 (24 April over most of the battlefield)".

**Georeferencing.** Pixel (px, py) of tile (z, x, y) is world pixel `(x*512 + px, y*512 + py)` at zoom z, with `world = 512 * 2^z` and the standard sphere Mercator (`src/geo.mjs`, identical to `project()` of the Studio and to Mapbox GL). Every request to the USGS services is made in EPSG:3857 with the exact tile bounds, so no re-projection of the photograph happens here.

## 6. Pictures to look at

`previews/` (JPEG q84 from the loader's own canvas pixels, real Chrome, 1440 x 900, DPR 1; produced by `tools/previews.mjs`):

- the nine required views: `angle-`, `wheatfield-` and `cemhill-` with `z13.5`, `z15`, `z16.5` and the `dim` look; plus `z17.5` for each;
- `looks/<spot>-z15-natural|paper|slate.jpg`;
- `landmarks/sheet_0..2.jpg`: the measurement sheets of section 7.2;
- `studio-on-real-ground-dim|paper|natural.jpg`: the real Battle Studio (the first prototype's tiles, which are being redesigned) on the real ground.

What I looked at, and fixed: at z17 and z18 the TIGER road line drew a dark double line inside the real road of the photograph and read as a second, thinner road; the road overlay now fades from 100 % at zoom 16.3 to 30 % at 17.4 (`roads.fade` in `looks.mjs`), the road names stay. The demo page asked for a favicon and logged a 404; it carries an empty one now. Tile seams: 0 found in 21 pictures (`verify/seams.py`; two boundary-coincident outliers are a stone wall and a label, which only stand out along their own length). Colour and banding: no banding visible at DPR 1 or 2 in `dim`, `natural`, `slate` or `paper`; the AVIF encode shows no block edges at 100 % up to z17.5. The aerial is soft past z17, as expected of 0.6 m imagery.

Two things the checks turned up in my own earlier work, both fixed: the manifest called the whole box "2022-04-24" (section 5 has the three dates), and the committed `data/vectors.mjs` was not what `build-vectors.py` produced from the committed pipeline, because the contour step had been run with other parameters than the script's defaults (section 10).

## 7. Verification

### 7.1 The whole chain against the authority (Measured)

`verify/verify-render.mjs` renders nine sites through the real loader in real Chrome (raw look: no grade, no shade, no vectors) at camera zooms 13.5, 15 and 16.5, DPR 1 and 2, centred on each site; `verify/verify-georef.py` requests the same ground window from the USGS NAIP service (exportImage, EPSG:3857, supersampled and area-averaged) and measures the sub-pixel shift between the two by phase correlation of band-passed luminance. The shift is the error of tile cutting, pyramid, manifest, loader maths and DPR handling together, in ground metres.

54 windows, 46 usable (correlation peak at least 0.12): **mean error 0.071 m, maximum 0.339 m**, mean east -0.022 m, mean north -0.004 m. The eight windows without a reliable peak are all zoom 16.5 at DPR 2 (192 CSS px, the imagery is oversampled there, the correlation has no texture left); the same chain at zoom 16.5 and DPR 1 measures 0.006 to 0.024 m. (`verify/results/georef-e2e.json`; reproduced identically on 2026-10-07 after the loader changes.)

### 7.2 Landmarks against the site's own coordinates (Measured, read by eye)

For each landmark: a 40 m window of the NAIP photograph (0.2 m/px crop from the USGS service, upscaled to 15 px per metre) centred on the site's coordinate, 5 m grid, the coordinate as a red cross; I read the centre of the pedestal or platform on the picture and the script (`verify/landmark-report.py`, readings in `verify/landmark-readings.json`, sheets in `previews/landmarks/`) turns that into metres. Reading uncertainty about 1 m. The photograph is the same data as the backdrop, and 7.1 says the backdrop reproduces it to 0.07 m, so these are also the errors you see on screen.

| Landmark | Site's coordinate (source) | Error to the monument | Second source |
|---|---|---|---|
| Hancock equestrian statue | bundle monuments no. 66 | **0.7 m** | |
| Eternal Light Peace Memorial | bundle monuments no. 501 | **1.8 m** | the tour stop 2 viewpoint is a car park 56 m away (it is a viewpoint, not the monument) |
| Virginia State Monument (Lee) | bundle monuments no. 14 | **2.2 m** | `monuments.json` va-state: 1.8 m |
| Meade equestrian statue | bundle monuments no. 76 | **3.0 m** | |
| New York State Monument | bundle monuments no. 44 | **4.3 m** | `monuments.json` ny-state: 0.9 m |
| Pennsylvania State Memorial | bundle monuments no. 46 | **5.2 m** (the mark lies on the 35 m platform, 5 m from its centre) | `monuments.json` pa-state (Wikipedia): 18.7 m |
| Indiana State Monument | bundle monuments no. 43 | **8.2 m** | `monuments.json` in-state: 3.6 m |
| Soldiers' National Monument | `monuments.json` (Wikipedia) | **10.4 m** | |

Median 4.3 m, maximum 10.4 m; 5 of 8 within 5 m, all 8 within 11 m. For monuments the site's coordinates sit on or beside the monument; "within a few metres" holds for five, and the three outliers (8 to 10 m) are inside the monument's own surroundings. **Two of the site's marks are not at their building at all** (the backdrop draws both with a dashed ring, `data/place-checks.json`):

- **Lutheran Seminary** (`terrain.json` LOC-022): open meadow, no building within 20 m. The seminary's verdigris cupola (Schmucker Hall) was read on a crop centred on Wikipedia's coordinate for Schmucker Hall (39.83194, -77.24472; that point is itself 36 m from the cupola, Wikipedia rounds to the arc second): the cupola is at about 39.83213, -77.24438, **679 m** north-north-east of the site's mark.
- **Evergreen Cemetery gatehouse** (`terrain.json` LOC-023): scrub and young woodland, no building within 25 m, on the wrong side of Baltimore Pike. The building at the head of the cemetery's entrance drive on Baltimore Street is the likely gatehouse, about **402 m** north-west; I could not confirm it against an independent coordinate (**Unknown**).

### 7.3 Hills and crossroads on the ground (Measured, from the DEM and TIGER)

`verify/ground-truth.py`: the summit is the highest point of the 3DEP DEM (z15 grid, smoothed 2 px = 3.7 m) within a search radius of a reference coordinate; the Peach Orchard crossroads is the intersection of the TIGER centre lines of Emmitsburg Road and Wheatfield Road. Distances from the site's two frames (the legacy frame the placements were authored in, and the production `terrain.json`):

| Feature | Truth | Legacy frame | Production frame | Wikipedia |
|---|---|---|---|---|
| Little Round Top | summit, 203.5 m | 274 m off | 291 m off | 28 m |
| Big Round Top | summit, 238.6 m | 362 m off | 362 m off | 5 m |
| Culp's Hill | summit, 192.6 m | **731 m off** | 10 m off | 10.5 m |
| Cemetery Hill | crest, 190.7 m (search circle 300 m round the production mark) | 412 m | 291 m, a lower bound: the maximum sits near the edge of the circle, and there is no independent coordinate | - |
| Peach Orchard | crossroads of Emmitsburg Rd x Wheatfield Rd | 227 m | 99 m | - |

The `ground` place frame (the default) is the production frame with the three summits the DEM places elsewhere moved to the measured summit; those three are drawn as filled dots. `placeFrame: 'legacy'` draws the frame the Studio's schematic backdrop uses, with the eight places whose two frames disagree dashed.

### 7.4 The rest

| Check | Result |
|---|---|
| Bundler rules (`tools/check-bundle-rules.mjs`): named exports only, relative imports only, no `import.meta`, no cycle, no URL, no network call | ok, 8 modules |
| Seams (`verify/seams.py`) | 0 in 21 pictures |
| Files versus data-URI pack (`verify/pack-test.mjs`), same view | identical SHA-256; the pack run requested 0 tile files, the files run 190 |
| Moving path versus resting frame (`verify/direct-test.mjs`), 4 views (z13.5 to 17.2, DPR 1 and 2, four looks) | with the same smoothing: identical, 0 of 13.4 M colour channels differ; with the default (bilinear while moving, high at rest): mean difference 0.07 to 0.19 of 255, at most 6 |
| Inside the real Studio (`verify/studio-integration.mjs`) | ok: 5 runs, 0 errors, 0 failed tiles, 0 external requests |
| Rebuild from the cache (`tools/regenerate.sh`, 2026-10-07) | the tile files come out byte for byte the same (765 of 765 compared); see section 10 for the vector layer |

Two measurements, because one of them lies. The viewer sees the **frame interval**: the time between two animation frames while the camera moves (16.7 ms is 60 fps). `draw()` is only the JavaScript time and leaves out everything the GPU and the compositor do after it returns.

| DPR | main thread | version | frame interval while the camera moves: mean / p95 / max (ms) | frames over 20 ms | JS time in `draw()`: mean / p95 (ms) |
|---|---|---|---|---|---|
| 1 | 1x | first version | 18.0 / 26.7 / 38.8 | 51 of 333 | 3.0 / 10.9 |
| 1 | 1x | now | 16.6 / 16.9 / 25.0 | 1 of 360 | 1.5 / 6.8 |
| 1 | 4x slower | first version | 23.1 / 63.0 / 121.7 | 85 of 258 | 13.7 / 45.6 |
| 1 | 4x slower | now | 21.2 / 48.0 / 93.6 | 64 of 280 | 5.4 / 19.4 |
| 2 | 1x | first version | 40.2 / 68.5 / 85.4 | 146 of 149 | 6.3 / 14.9 |
| 2 | 1x | now | 16.8 / 16.9 / 87.3 | 4 of 356 | 2.0 / 7.3 |
| 2 | 4x slower | first version | 47.4 / 81.3 / 135.1 | 120 of 126 | 30.1 / 77.3 |
| 2 | 4x slower | now | 25.4 / 59.2 / 165.9 | 88 of 232 | 8.0 / 19.9 |

"first version" is how the loader behaved when I first handed it over (every frame rendered into the frame cache and copied to the host canvas, roads and contours stroked live every frame, four tile bakes per frame, high-quality smoothing); "now" is this folder. At DPR 1 the first version was mostly fine (51 of 333 frames over 20 ms, 7 over 34 ms) and "now" has 1 over 20 ms of 360. At DPR 2, the retina case, the first version delivered 40 ms frames (25 fps; 146 of 149 frames over 20 ms) while `draw()` reported 6 ms, and "now" delivers 16.8 ms (4 of 356 frames over 20 ms; the one 87 ms frame is a single stall; in my profiles the worst stalls came at the start of the move, when nothing is baked yet). "4x slower" is Chrome's CPU throttle on the main thread, a stand-in for a phone: it throttles JavaScript, not the GPU. Frames still drop there (64 of 280 at DPR 1, 88 of 232 at DPR 2 over 20 ms) because the main thread is then the limit: the JavaScript takes four times as long and the Studio's own units and popups will want their share of it. No real phone was tested.

Where the time went, found by switching one thing off at a time (`tools/frame-cost.mjs`; the floor is a page that only fills a rectangle of the same size, which this machine does at 60 fps):

| Variant (the same scripted move) | DPR 2: frame interval mean / p95 ms (frames over 20 ms) | DPR 1: mean / p95 ms (frames over 20 ms) |
|---|---|---|
| floor: a page that only fills a rectangle | 16.7 / 16.8 (0 of 235) | 16.6 / 16.8 (0 of 234) |
| first version: frame cache + blit, live vectors, quality high, 4 bakes a frame | 41.0 / 69.8 (143 of 146) | 18.4 / 26.8 (65 of 326) |
| direct paint, live vectors, quality high | 39.8 / 69.1 (147 of 150) | 17.9 / 26.4 (41 of 335) |
| direct paint, live vectors, quality low | 30.5 / 36.9 (194 of 196) | 16.7 / 16.9 (2 of 358) |
| direct paint, live vectors, quality low, no roads | 16.7 / 17.2 (4 of 358) | 16.6 / 16.8 (0 of 360) |
| direct paint, live vectors, quality low, no contours | 23.4 / 27.4 (241 of 256) | 16.9 / 16.9 (3 of 354) |
| direct paint, live vectors, quality low, no roads and no contours | 16.6 / 16.8 (0 of 360) | 16.6 / 17.0 (0 of 361) |
| direct paint, baked vector tiles, quality high | 20.5 / 39.4 (78 of 291) | 16.9 / 18.2 (16 of 353) |
| direct paint, baked vector tiles, quality medium | 20.6 / 38.8 (74 of 290) | 17.0 / 21.4 (18 of 352) |
| now: direct paint, baked vector tiles, quality low | 16.8 / 16.9 (2 of 356) | 16.6 / 16.8 (0 of 360) |

At DPR 2, stroking the road polylines live costs about 14 ms a frame and the contours about 7 ms (it is nearly free at DPR 1, right-hand column, because the stroke rasterisation scales with the pixels and happens on the GPU side after `draw()` has returned, which is why `draw()` never showed it). Image smoothing above bilinear while the picture moves costs 4 to 9 ms and cannot be seen: the moving frame differs from the high-quality resting frame by 0.07 to 0.19 of 255 on average (`verify/direct-test.mjs`). Baking the vector layers into tiles (`src/vtiles.mjs`) pays that cost once per tile instead of once per frame, and with it the frame interval at DPR 2 goes from 41 ms to 16.8 ms. Baking is limited by pixels, not milliseconds: recording a bake takes the main thread under a millisecond, the GPU then needs 10 to 14 ms to rasterise a DPR 2 tile (a micro-benchmark of one tile, run during development, not committed), and four bakes in one frame were a 128 ms stall in my profile; one tile per frame at DPR 2 brought the worst bake frame to about 60 ms. Two further changes helped less than I expected and stay for their own reasons: painting straight into the host canvas (`direct`: it saves the full-frame copy, `draw()` 6.4 to 3.6 ms at DPR 2) and decoding tiles before they count as ready (no frame decodes an AVIF).

**Memory** (after the same scripted move, DPR 1 / DPR 2): baked vector tiles 86 / 144 MB (capped at 160 MB), graded aerial tiles 89 / 105 MB (at most 110 tiles of 520 x 520), and up to 260 decoded tile images (cap 160 aerial + 100 hillshade, about 1 MB each as the browser decodes them): about 0.4 to 0.5 GB in the worst case. I read these counters from the loader, not from the browser's memory profiler. A host on a phone should pass smaller caps (`maxImages`, `maxShade`, `maxBakes`, `vectorTiles: { maxBytes }`).

## 8. What the aerial shows about the data

Put on real ground, the placements show their frame. `docs/pitch/anim/03-data-fuel.md` (fact 11) counts 60 placement rows whose note names Culp's Hill sitting a median 696 m from the Culp's Hill that production serves; 7.3 measures the legacy-frame mark of Culp's Hill at 731 m from the summit and the production mark at 10 m, which is the same finding from the other side. The legacy mark lies 730 m south-south-east (bearing 154 degrees) of the summit, the Little Round Top legacy mark 274 m to the west-north-west (300 degrees), the production one 291 m to the south (172 degrees). Re-registering the placements is not done here; the backdrop only makes the problem visible, and `placeFrame` lets a skin draw the marks in the frame its units were authored in.

## 9. Sources, licences, attribution

| Data | Source (service) | Licence, and the page I read |
|---|---|---|
| Aerial imagery | USDA National Agriculture Imagery Program, via USGS National Map `USGSNAIPPlus` ImageServer, `exportImage` (`imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer`); 0.6 m, USDA-FSA-APFO, flown 2022-04-24, 2022-04-28, 2022-05-10; service text "USGS, USDA, The National Map: Orthoimagery" | Public domain: "Sources/Usage: Public Domain" on https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip, and "USGS-authored or produced data and information are considered to be in the U.S. Public Domain" on https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits (both read 2026-10-07) |
| Elevation | USGS 3D Elevation Program bare-earth DEM, `3DEPElevation` ImageServer (`elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer`), 1 m native pixel; service text "USGS National Map 3D Elevation Program (3DEP)" | Public domain: "Media Sources/Usage: Public Domain" on https://www.usgs.gov/3d-elevation-program/about-3dep-products-services (read 2026-10-07) and the copyright page above |
| Roads, rail, streams, water | US Census Bureau TIGER/Line via TIGERweb (`tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb`), layers Transportation 2, 6, 8, 9 and Hydro 0, 1; service text "Source: U.S. Census Bureau" | US federal government work, public domain; the Census pages I fetched (the TIGER/Line files page and the open-data page) carry no licence sentence I could quote, so this rests on the service's own credit line and on 17 U.S.C. section 105, which I know but did not read in this session |
| Place marks | the Studio's dataset (`terrain.json` of the site), 30 + 3 + 8 | the project's own data |
| Reference coordinates (checks only) | Wikipedia REST summaries (Little Round Top, Big Round Top, Culp's Hill, Schmucker Hall, others in `tools/fetch-wiki.py`) | only coordinates (facts) are used, nothing of the text; Wikipedia text is CC BY-SA |
| Fonts | none shipped: labels use `"Segoe UI", system-ui, sans-serif` | - |
| Run-time code | none: `src/` has no dependency | - |
| Build and test tools (not shipped) | Pillow 12.3.0 (MIT-CMU) with libavif 1.4.2, numpy 2.4.6 (BSD-3-Clause and others), playwright-core 1.63.0 (Apache-2.0), acorn 8.18.0 (MIT) | licence fields of the installed packages |

**Attribution text** (`backdrop.attribution()`; the USGS and Census data are public domain, so this is a courtesy, not a condition): "Imagery: USDA NAIP via USGS National Map (public domain). Elevation: USGS 3DEP (public domain). Roads and water: US Census TIGER/Line (public domain)." And the caption that must stay on any screen showing this ground (`backdrop.caption()`): "Modern ground: USGS NAIP aerial photographed 24 April to 10 May 2022 (24 April over most of the battlefield) and 3DEP hillshade. Not the 1863 landscape."

Politeness: every service was called one request at a time with a descriptive User-Agent and at least 1.5 s between requests, responses cached on disk (re-runs download nothing); the `robots.txt` of the three pages fetched for licences was read first and none of the paths used is disallowed.

## 10. Regenerate

```
bash docs/pitch/anim2/basemap/tools/regenerate.sh          # every step, in order; --from=N resumes
bash docs/pitch/anim2/basemap/verify/run-all.sh            # every check
```

`tools/regenerate.sh` documents each step and what it needs (python 3.11 with numpy and Pillow with AVIF, node 24). It downloads about 450 MB once into `tmp/look-dev/basemap/cache` (NAIP 121 MB, 3DEP 327 MB, TIGER 4 MB), one request at a time with 1.5 s between requests; the cache is what makes every later run offline.

**What a rebuild reproduces (checked 2026-10-07).** I re-ran the pipeline from the cache (about 5 minutes: the AVIF encode and the contours dominate). The plan, the tile ranking, the ground-truth file and every tile file it chose came out byte for byte the same as the committed ones. `data/vectors.mjs` did not: the committed one had been built from contours made with `--sigma 2.0 --eps 2.2`, while the script's defaults were 1.6 and 1.1, and the defaults give 130 KB more vector data, which costs 11 tiles under the 9.7 MB budget. I found the shipped values by regenerating the contours for a grid of settings and comparing, line by line, with the lines decoded from the shipped file: sigma 2.0 with eps 2.2 reproduces all 924 index lines and all 1,613 ten-foot lines exactly, no other pair I tried does (at eps 2.0 and 2.5, 441 and 385 of the 924 match). The script's defaults and the `regenerate.sh` call now say 2.0 and 2.2, and a second rebuild reproduced all 783 files of the previous delivery (776 tiles, `assets/manifest.json`, `data/manifest.mjs`, `data/vectors.mjs`, `data/ground-truth.json`, `plan.json`, `tools/tiers.json`, `verify/results/ground-truth.json`), compared by md5. The place-mark flags (`data/place-checks.json`) were added after that and the rebuilt `vectors.mjs` still leaves the same 776 tiles.

## 11. Extending it

- **A new look** is data: copy a look in `src/looks.mjs` or call `registerLook({ id, label, theme, ground, grade: [...], shade: { op, alpha, invert }, vignette, edge, contours, water, roads, labels })`. `grade` is a list of canvas compositing steps applied once per tile (`{ op: 'multiply', color, alpha }`, `{ self: 'overlay', alpha }`); nothing else changes, and the look's `version` bump invalidates the frame cache and the baked tiles of that look.
- **A new tile source** (say a different year): `configureBackdrop({ manifest, vectors, urlOf })`; the manifest format is `assets/manifest.json` (per layer and level: first tile, columns, rows, a bit-set of the tiles that exist).
- **More ground**: widen `plan.json`, re-run `tools/regenerate.sh`; `tools/build-assets.py --budget-mb` sets how much of it ships.
- **A new vector layer** (the product's 1863 roads and rivers, a unit-path overlay): add a group to `build-vectors.py`'s output and a draw block to `Vectors.draw`; vertices are quantised to the z18 world-pixel grid and projected with two multiplications each.
- **Another host**: the module needs only `{ lng, lat, zoom, w, h }`, a 2D context, and `onchange`.

## 12. Not verified, and limits

- Chrome 155 (headless, system Chrome through playwright-core) on one machine with one GPU is all that was run. AVIF decodes in Chrome 85+, Firefox 93+ and Safari 16.4+ (from memory, not tested). No real phone, no Safari, no Firefox, no other GPU: the frame-interval figures are this machine's.
- The product's map was read in the bundle, never opened (token). I did not compare the Mapbox imagery with NAIP pixel for pixel; the photographs differ in date, sun and processing.
- Landmark readings are by eye on 0.6 m imagery (about 1 m); the Pennsylvania Memorial is a 35 m platform and its centre is a judgement. The Evergreen gatehouse position and the Cemetery Hill crest have no independent coordinate.
- Beyond zoom 17 the photograph is stretched; the finest tiles exist only around the eight hotspots, elsewhere the finest level is z16 or z15.
- Contours and hillshade show the modern ground (quarry cuts, road cuts, the visitor centre's terraces); the 1863 relief differs in places by an amount nobody has measured here.
- The three NAIP flight dates differ by up to 16 days of leaf-out; no colour step is visible at the scene edges in the z13 mosaic, but a date step is possible where scenes meet on the western side.
- While the camera moves, vector line widths come from half levels of zoom and may be up to 19 % off the formula, and a vector tile that is still being baked is shown from its neighbouring half level; neither is visible in the pictures I looked at, and neither survives once the camera rests, but a very fast zoom shows the roads a fraction of a second late.
- The Studio's `syncTheme` does not know the dark looks (section 4), and the backdrop's own labels sit under the unit tiles: both are for the host to decide.
- Not done: re-registering the unit placements on the real ground (section 8), the product's 1863 overlays, any reading of the 1863 landscape.
