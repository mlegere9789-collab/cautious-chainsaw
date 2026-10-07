# d3-field-manual: Precision Field Manual (art direction 3)

One flat mark per Gettysburg unit on the real aerial ground, a certified no-overlap layout, every popup restyled in one language. A fork of the Battle Studio prototype (`docs/pitch/anim/prototype`, not edited) plus the open-data backdrop (`docs/pitch/anim2/basemap`, not edited). Design language, measurements and decisions: **`SPEC.md`**. What each of four iterations saw and changed: **`ITERATIONS.md`**. Every change to the prototype's engine: **`FORK.md`**. Pictures: **`shots/`**.

## Run it

```
node tools/serve.mjs                     # a static server on 9880 (root docs/pitch/anim2, so the tiles at ../../basemap/assets resolve)
# open http://127.0.0.1:9880/d3-field-manual/dist/field-manual.html
#   ?scene=fresh2&zoom=15  ?tick=551  ?style=field-manual&variant=day|cvd|contrast  ?tune=1  ?tour=showcase  ?manual=1 (only studio.step() advances: for tests)
```

`dist/field-manual.html` (2.1 MB, readable source) also opens from `file://`: the fonts, the data and the engine are inside it, the aerial tiles load as files from `../../basemap/assets/` (override with `?tiles=`). No request ever leaves the machine (every driver here records requests and reports any that is not local: 0 in every run). Chrome, Edge or Firefox; the basemap's tiles are AVIF (Chrome 85+, Firefox 93+, Safari 16.4+ from memory; only Chrome was run).

Keys as in the prototype: Space play, arrows step, `[` `]` speed, wheel zoom, drag pan, click selects, `T` Tuning Studio, `I` Inspector, `A` About and legend, `M` metrics, `B` before / after, `W` showcase, `C` Chronicle, `?` help.

## Build and regenerate

```
node build.mjs                           # tokens/make-schema.mjs, then engine/ + data + tokens + fonts -> dist/field-manual.html   (--check, --min)
node tools/run-all.mjs                   # everything below, in order (about 12 minutes; --quick skips the sweeps and the performance run)
```

| script | writes | what |
|---|---|---|
| `tools/make-fonts.py` | `fonts/*.woff`, `fonts/fonts.json` | subset and rename the five OFL fonts from the installed originals (no download) |
| `tools/patch-tokens.mjs` | `tokens/tokens.json` | the fork's changes to the engine's dials, each with its reason (idempotent) |
| `tools/contrast.mjs` | `results/contrast.json` | 140 colour checks in every variant, from the token files and the stylesheet |
| `tools/shoot.mjs` | `shots/S*.png`, `V*.png`, `results/scenes.json` | the scenes of the brief at DPR 2, each with its 100-percent crop of the busiest 600 x 400 area, and the independent overlap check of every frame |
| `tools/shrink-variants.py` | `shots/V*.jpg` | keeps the three variant frames as JPEG (extras), their crops stay PNG |
| `tools/popups-shots.mjs` | `shots/P*.png` | every other popup |
| `tools/strips.mjs`, `strips-compose.py` | `shots/M*.png`, `results/motion.json` | the eight-frame strips |
| `tools/cvd-sheet.py` | `shots/cvd-simulation.png` | the colour-vision simulation |
| `tools/type-audit.mjs` | `results/type-audit.json` | every size and family the page renders (DOM and canvas) |
| `tools/zoom-test.mjs` | `results/zoom-test.json` | a camera glide across the name-form zoom, against a control |
| `tools/marks-stats.mjs`, `gap-experiment.mjs` | `results/marks.json`, `gap-experiment.json` | footprints, how many units stand as themselves, what the 2 px clearance costs |
| `tools/sweep.mjs` | `results/sweep-*.json` | zooms x ticks, desktop, phone, real ground |
| `tools/perf.mjs` | `results/perf.json` | real-time frame pacing |
| `tools/spec-tables.mjs` | `SPEC.md` | rewrites the measured tables of the spec from `results/` |
| `tools/archive-iteration.py` | `shots/iterations/` | keeps an iteration's pictures as small JPEGs |

Needs node 20+ (24.19 used), the repository's `node_modules` (`acorn`, `playwright-core`, `terser`), Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (override `T0_CHROME`), Python 3 with Pillow and numpy (sheets) and fontTools (fonts). Ports 9880 to 9889 (`D3_PORT`); the Chrome profiles are under `tmp/look-dev/d3-field-manual/`.

## What is where

```
SPEC.md ITERATIONS.md FORK.md README.md      the documents
build.mjs                                    the bundler (a fork of the prototype's, strict by design: no default exports, no cycles, no URLs, no fetch)
engine/                                      the fork of docs/pitch/anim/prototype/src (FORK.md lists what changed)
  skins/d3.mjs                               the skin: geometry (layoutOf), the one drawing (paintMark), legend swatches, the family d3, d3/day, d3/cvd, d3/contrast
  ui/fm.css                                  the stylesheet of every popup and of the chrome
  fx/places.mjs                              place names that never lie under a mark
tokens/d3.skin.tokens.json                   the look as data (designer-facing)      tokens/tokens.json   the engine's dials, 178
data/                                        the real data (copied verbatim, hashes in SOURCE.json)
fonts/                                       FM Sans and FM Serif (subsets of OFL fonts) and OFL.txt
tools/ results/ shots/ dist/                 scripts, every number, every picture, the built page
```

## Dependencies on other folders (read only)

* `docs/pitch/anim2/basemap`: `src/*.mjs` and `data/{manifest,vectors}.mjs` are bundled; `assets/` (776 AVIF tiles, 9.2 MB) is loaded at run time. Its README is the authority on the ground.
* `docs/pitch/anim2/symbology/src/colour.mjs`: the colour maths used by `tools/contrast.mjs` (not shipped).
* `docs/pitch/anim/prototype`: the source of the fork and of `data/` (hashes in `data/SOURCE.json`).
