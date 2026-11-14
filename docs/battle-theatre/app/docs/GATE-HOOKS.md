# GATE-HOOKS: exported pure check functions for the gate runner

One row per function: module path (under docs/battle-theatre/), function, inputs, output. Append rows with a single shell `>>`; never rewrite the file. A hook has no DOM, no network and no wall clock: it runs under node.

| module path | function | inputs | output |
|---|---|---|---|
| app/src/ui/extensions.mjs | `tierName(tier)` | a tier statement (string; a longer statement such as "hats documented; leggings open" is allowed) | `documented`, `inferred`, `plausible-procedural` or `open gap` (the weakest tier the statement names; "not documented" does not count as documented), or `null` when no tier is stated. Gate Q23: a `null` on content the viewer sees is an unmarked item. |
| app/src/ui/extensions.mjs | `tierMark(tier)` | a tier statement | the marking as an HTML string: the pill of the unit and object cards (glyph and label), with the whole statement beside it when it says more than the tier name; `data-tier="none"` and the text "Tier not stated" when no tier is stated. Gate Q23. |
| app/src/ui/extensions.mjs | `tierMark.style(tier)` | a tier statement | `{ tier, label, color, dash, glyph }` for marks drawn on a canvas or in the scene; the four tiers differ in glyph and dash, so a tier never depends on colour alone. Gate Q23. |
| app/src/ui/extensions.mjs | `badPath(p)` | one entry of the array exported by `src/ext/index.mjs` | `null` when the entry is a path inside `src/ext/`, otherwise the reason the loader refuses it (not a string, empty, absolute or with a scheme, contains `..`, names the list itself). |
| app/src/ui/extensions.mjs | `new Extensions(theatreLike, { importer }).load()`, then `.status()` and `.problems()` | a stand-in theatre object (`host, state, env, layer, structs, bus, PANELS`) and an importer that returns the module objects | `status()`: one `{ path, state, stage, error, late, initMs, updates, panels, toggles }` per listed module (`state` is `running`, `failed`, `stopped` or `loading`); `problems()`: the lines the viewer reads under "Not running in this visit". Loader health check: every listed module `running`, `problems()` empty. Example: `tests/ext-loader.test.mjs`. |

## src/ext/site-places.mjs (bt-world-content: the site's monuments and tour stops)

| function | inputs | output | gate it serves |
|---|---|---|---|
| `checkLaterMemorials(mem, T?)` | `mem`: the parsed `data/site-memorials.json`; `T`: optional terrain `{W, H, h(x,z), xz(lng,lat)}` (the prototype's, from `render/prototype/src/world.mjs loadTerrain`) | `{ok, problems, facts}`; facts: `memorials` (512), `defaultOn` (false), `sceneObjects` (0), `marksWhenOff` (0), `marksWhenOn` (512), `tier`, `withoutLabel` (0), `yearClaimed` (0), `yearOpenGap`, and with `T` `onLoadedGround` (435), `beyondLoadedGround` (77), `positionsWithNoStatedSource`, `twoPositions` | Q03 (no modern object in the 1863 scene: the layer is off by default and adds nothing to the scene at any minute), Q23 (every mark says "later memorial" and carries its tier) |
| `checkTourBookmarks(tour, T)` | `tour`: the parsed `data/site-tour-stops.json`; `T`: the terrain | `{ok, problems, facts}`; facts: `stops` (16), `onLoadedGround` (14), `beyondLoadedGround` (2), `fromTheSitesViewpoint` (14) | OA01 (the 16 tour stops as camera bookmarks); a stop beyond the ground is said to be beyond it |
| `sceneObjectsAt(tMin)` | minute on the theatre clock | `[]` for every minute (the memorial layer adds nothing to the scene) | Q03 |
| `validateMemorials(mem)`, `validateTour(tour)` | the parsed data files | list of sentences; empty means fit | OA01 |
| `marksFor(index, {on, selected})` with `buildIndex(mem, T)` | the index of the memorials, the layer state | marks `{no, label, tier, postBattle, scene}`; none when off | Q23 |

## tests/ext-site-source.mjs (bt-world-content: drift of the copies of the site's data)

| function | inputs | output | gate it serves |
|---|---|---|---|
| `drift(trees?, files?, pins?)` | the site trees to read (default: every tree of the checkout that carries an entry bundle), the two copies, the pinned hashes | list of sentences; empty means the copies equal the site's data in every tree and carry the hashes the site's own guard pins. Command line: `node docs/battle-theatre/app/tests/ext-site-source.mjs --check` exits 1 on drift, `--write` rewrites the copies from the site (refused when the trees or the pins disagree) | OA01 (read-only reuse of the site's data); the site's data is never written |

## src/ext/site-places.mjs, years of the later memorials (bt-world-content, 2026-11-13)

| function | inputs | output | gate it serves |
|---|---|---|---|
| `checkLaterMemorials(mem, T?, years?)` | as above, and `years`: the parsed `data/site-memorial-years.json` | as above; with `years` the facts add `yearDocumented` (32), `yearInferred` (1) and `yearOpenGap` (479); a year without its quotation, report, page or with a name that is not the list's is a problem; a year inside the memorial list itself (`year`, `dedicated`, `erected` on a record) is a problem | Q23 (a year is shown only with its tier and its source; the rest is an open gap), Q03 |
| `validateYears(yf, mem)` | the parsed years file, the memorial list | list of sentences; empty means fit (names equal the list's, years after the battle, quotation holds name and year, tier documented or inferred, a hedged year is inferred, every source described) | Q23 |

`tests/ext-site-years.mjs --check` (node): exits 1 when the years file differs from what the saved National Park Service report texts give (`tmp/library/web/nps`; says NOT RUN and checks fitness only when the texts are not in the checkout).

## app/src/weather3d/gpu.mjs and tests/weather3d-gpu*.mjs (bt-renderer, weather and effects lane: the WebGPU path)

Pure functions (node, no DOM, no network, no clock):

| function | inputs | output | gate it serves |
|---|---|---|---|
| `packWeather(out, W, fr)` in app/src/weather3d/gpu.mjs | `out`: `Float32Array(WU_FLOATS)`; `W`: the state of `WeatherTimeline.at(tSec)`; `fr`: the fx3d frame (lights) or null | `out` filled with the uniform block the WebGPU weather pass uploads for that state: sun and moon directions, palette, cloud, star, fog, wet-ground and light values, and the night floor at `out[WU.floor ..]`. By test it equals, value for value, what the WebGL2 path sends to its program. Pure: the same `W` gives the same block. | Q22 (what the GPU is given equals the timeline's weather at every minute), Q10 (the floor travels with every frame) |
| `packFx(out, fr, cam, vp)` in the same file | `out`: `Float32Array(FXU_FLOATS)`; the fx3d frame; the prototype camera; its WebGPU view-projection | the sprite uniform block (camera, sun, lighting, kappa, near and far, now, event count) | Q22 (the effects see the same wind and lighting state) |
| `weatherWgsl('mul' \| 'add')`, `patchFxWgsl(src)` in app/src/weather3d/shaders-wgsl.mjs | the mode; the fx3d WGSL | the WGSL text of the pass; the sprite WGSL with the scene-depth read patched to the hardware depth (throws when the source changed) | Q10 (the luminance clamp `max(c, W.floorC.xyz)` is in the text, pinned by `tests/weather3d-gpu.test.mjs`) |

Commands (they need a browser: run them through `tools/horde/bench.sh`; software adapter on a machine without a GPU, `--real-canvas` on one with a GPU):

| command | inputs | output | gate it serves |
|---|---|---|---|
| `node app/tests/weather3d-gpu.mjs <outDir> <webgpu\|webgl2> [case,...] [--extra] [--fx=off] [--real-canvas] [--real-gpu [--headed]]` | output directory, the API, optional case names of `tests/weather3d-gpu-cases.mjs` (`CASES`: the 16 default cases; `EXTRA_CASES`: six close views of one effect each, run with `--extra`; named cases are looked up in both); `--real-gpu`: a run on a machine with a GPU (Chrome without the software-rasteriser flags, the real canvas; `checkRun` fails the run when its recorded adapter is a software one) | `<outDir>/<api>/summary.json`: per case `validation` (a WebGPU validation error text or null), `pixels.{all,top,bottom}.{mean,min,p1,p50,p99,max,blackShare}` (luminance of the read-back frame, 8-bit display values), `effects.nSprites`, `gpuStats` or `glStats`; `diagInit.gpu`, `diagEnd.gpuErrors` (uncaptured errors, device loss), `diagEnd.wgsl` (compiler messages), `pure` (the same time and camera give identical pixels), `computeCheck`, `swapchain`; a PNG, the raw RGBA and a JSON per case | Q10 (minimum luminance and black share at the night cases, on both APIs), Q22, Q24 (a picture per case) |
| `node app/tests/weather3d-gpu-compare.mjs <outDir> [limit] [--strict]` | the output directory holding `webgl2/` and `webgpu/` | `<outDir>/compare/summary.json` and a montage per case (WebGL2, WebGPU, difference x4): mean absolute difference, rmse, p99, shares over 8 and over 24 levels, luminance and sprite counts of both | Q24 |
| `node app/tests/weather3d-gpu-theatre.mjs <outDir> [webgpu\|webgl2] [--real] [--real-gpu [--headed]]` | as above, the shell itself | `<outDir>/theatre-<api>/summary.json` (same fields), the ribbon text, the layer's counters | Q24 |
| `node app/tests/weather3d-gpu-capture.mjs <outDir> [case,...] [--all]` | output directory, optional case names (default: twelve of the 16 cases) | per case: everything the weather and effects pass of that frame reads (frame block, the layer's two uniform blocks, effect events with cumulative counts, wind history, scene depth) and the colour target (rgba16float) before and after the pass, as bytes, plus the layer's WGSL text; WebGPU, software adapter only | Q24 |
| `python3 -I app/tests/weather3d-gpu-replay.py --wgpu-path <dir> --capture <outDir> [--out report.json] [--selftest]` | the capture directory; the `wgpu` Python package (`pip install --target <dir> wgpu`, not vendored) and a Vulkan ICD (SwiftShader's) | the layer's WGSL compiled and its pipelines built on a second WebGPU implementation (wgpu-native: the naga compiler and wgpu-core's validation), four negative controls and the usage-scope control refused, each captured pass replayed and compared with Chrome's output (maximum and mean difference in HDR units, share over 1/256, share bit-identical, share of the picture the pass changed); exit code 1 on a problem; software only, not a GPU result | Q24 |

## Vegetation of July 1863 (bt-world-content, 2026-11-13)
| Module | Function | Inputs | Output | Gate |
|---|---|---|---|---|
| `docs/battle-theatre/app/src/ext/vegetation/model.mjs` | `checkVegetation(model, opts)` | `model = new VegModel(JSON.parse(data/vegetation.json))`; `opts.times` (minutes of the theatre clock, default: every day of 26 Jun - 15 Jul at 06:00, 12:00 and 18:00, every event boundary, 19 Nov noon), `opts.choicesList` (default: six sets of the three vegetation conflicts) | `{ gate: "Q21", ok, checked, failures[{unit, t, iso, why}], notRun[], summary }`: every unit at every date lies inside the documented-or-ranged schedule (colour, height, cut share, leaf cover), no damage before its event, trampling never falls with time, the same state in any order of asking, every cited claim exists with quote, tier and place in its source | Q21 |
| `docs/battle-theatre/app/src/ext/vegetation/model.mjs` | `stateAt(model, unit, tMin, choices)` | a unit (or its id), a minute, the viewer's choices (`CF-VEG-LRT`, `CF-VEG-RAIN`, `CF-VEG-HARVEST`) | `{ ground{crop, stage, color, h, cut, trample, lodging}, trees{leaf, strip, perHa}, fruit, tiers{}, tier, claims[], events[] }`, pure | Q21 |

Checks of the harness output (pure, node; app/tests/weather3d-gpu-check.mjs, also `node app/tests/weather3d-gpu-check.mjs <outDir> [--api=webgpu|webgl2] [--limit=6]`, exit code 1 on a problem):

| function | inputs | output | gate it serves |
|---|---|---|---|
| `checkRun(summary, { cases })` | the parsed `<outDir>/<api>/summary.json` of `weather3d-gpu.mjs`; optionally the number of cases asked for | `{ ok, problems, facts }`; the problems name every WebGPU validation error, uncaptured error or device loss (the harness's own final destroy excepted), WGSL compiler error or warning, pipeline of the layer that did not build, layer that stopped, case with no weather draw, blank picture, scrub-purity repeat that is not byte-identical, resize defect, optional compute pipeline that did not build, or run that did not finish; a run started with `--real-gpu` whose adapter is a software one (or not recorded) is a problem; `facts` count cases, compiler messages, modules, purity checks and give the adapter | Q22, Q24 (and Q10 for the luminance numbers it leaves in `summary.json`) |
| `checkCompare(compareSummary, limit)` | the parsed `<outDir>/compare/summary.json`; the mean absolute difference per channel, in 8-bit levels, that a case may not exceed (default 6: a harness value, not a project gate) | `{ ok, problems, facts }`: a case over the limit or with different effect sprite counts on the two APIs is a problem; `facts` give the smallest and largest mean difference and the largest share of pixels over 24 levels | Q24 |

## Added layers: tier reading and the list step (bt-renderer, 2026-11-13)
| module path | function | inputs | output |
|---|---|---|---|
| app/src/ui/extensions.mjs | `tierReading(statement)` | a tier statement (any value; text is made of it without throwing) | `[{ word, rank, how }]` per tier word of the statement, in order: `rank` 0..3 (documented, inferred, plausible-procedural, open gap) and `how` `plain`, `hedged` or `negated`. `tierName` is the answer drawn from it: the weakest plain word, lowered by a hedged documented or inferred, `null` when no word is plain. Gate Q23. |
| app/src/ui/extensions.mjs | `TIER_WORDS` | none | the frozen word lists the reading knows: `negations`, `hedges`, `modals` (hedge only before "be"), `joined` (prefixes that hedge when written against the word), `afters` (phrases that hedge the word they follow). A test can walk them: every word of them keeps `tierName` from returning a tier it does not plainly name. |
| app/src/ui/extensions.mjs | `new Extensions(theatreLike, { importer, exists, waitMs, now, setTimeout, clearTimeout }).load()` | as above; `waitMs` is the wait of the list step in all (the check has a third of it) and of each module start; `now`, `setTimeout` and `clearTimeout` replace the clock and the timers, so that a test moves time itself | the list step ends within `waitMs` in all, whatever stalls; `dispose()` ends every wait at once and leaves no timer. Example: `tests/ext-loader.test.mjs`. |
