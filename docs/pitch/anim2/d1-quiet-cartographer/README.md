# d1 Quiet Cartographer

A redesign of how the Battle Studio draws a battle: one small mark per unit, a standard for each formation or crowd, haloed lettering instead of boxes, on the real aerial ground. The design language is `SPEC.md`; the log of what was seen and changed is `ITERATIONS.md`.

**Look first.** `shots/compare-first-prototype-vs-quiet.png` (before and after, same tick and camera), `shots/specimen-night.png` and `specimen-day.png` (every mark and state), then `shots/s1a` to `s8` (the eight scenes of the brief at DPR 2, each with a `-crop` of its busiest 600 x 400 area at 100 %), `shots/strip-*.png` (eight consecutive frames of a march, a selection and a deployment), `shots/popups/` (every popup and panel), `shots/cvd-night.png` (colour-vision simulation), `shots/iterations/` (pictures from the rounds of the log).

**Run it.**

```
node tools/serve.mjs                                  # serves docs/pitch/anim2 on 127.0.0.1:9840 (the page and the basemap's tiles)
# open http://127.0.0.1:9840/d1-quiet-cartographer/quiet-cartographer.html
#   ?style=day            the day atlas ground       ?variant=cvd | contrast
#   ?skinset={"quiet-cartographer":{"pip.size":12}}   a token, live      ?tune=1   every dial of the engine
node build.mjs                                        # regenerate quiet-cartographer.html (2.2 MB, readable) and tokens/tokens.schema.json
```

The page needs the basemap's tile files (`../basemap/assets/`, 9 MB, public-domain NAIP and 3DEP: see `../basemap/README.md`); it makes no other request. `?tiles=<folder>` points elsewhere.

**What is here.**

| Path | What |
|---|---|
| `quiet-cartographer.html` | the built page (engine, data, fonts, skin, popups, ground code) |
| `src/skins/quiet-cartographer.mjs`, `.spec.mjs` | THE SKIN (drawing) and ITS TOKEN FILE (60 rows, every colour and size; the file is the source, `tokens/tokens.json` is edited by hand) |
| `src/ui/quiet.css` | the interface and all popups restyled (loaded after the prototype's two stylesheets, only overrides) |
| `src/ground.mjs`, `src/render/places.mjs` | the basemap as two grounds (`qc-night`, `qc-day`) and place names set around the marks |
| `src/layout/*`, `src/scene/*`, `src/interp/*`, `src/popups/*`, `src/ui/*` | the engine of `docs/pitch/anim/prototype`, forked; the changes are listed below |
| `tokens/tokens.json` | the dials of the engine (176), with this skin's defaults |
| `assets/fonts/` | QC Sans (subset of Liberation Sans, SIL OFL) and its licence |
| `tools/` | `scenes`, `gallery`, `specimen`, `strips`, `compose-compare.py`, `sweep`, `pacing`, `contrast`, `audit-dom`, `textfit`, `curves`, `spec-fill`, `run-tests`; `probes/` for the diagnostics (rest times, selection motion, engine milliseconds, the cadence of the solver, the differential check of the placement search, a CPU profile of the whole field) |
| `test/` | the engine's node tests that apply to the fork, plus `skin-d1.test.mjs` and `rest.test.mjs` |
| `results/` | every number quoted in SPEC.md, as JSON |

**What changed in the engine** (everything else is the prototype's, as it was):

1. `layout/spec.mjs`, `layout/tiles.mjs`, `scene/engine.mjs`, `skins/kit.mjs`: a skin may supply a **sizer** so the layout reserves the footprint it will draw at the current zoom and selection (the prototype sized every chip by one fixed formula).
2. `layout/tiles.mjs` `aggregateName`: a crowd says "Both sides", its formation, or the corps its members belong to, with the plain count (the prototype said "Contact", "lead + k" and "x n").
3. `scene/display.mjs` 8b: a mark that has not moved for 24 frames while its target has not changed no longer keeps the engine busy (settle by stagnation).
4. `layout/text.mjs`: the lettering cuts are QC Sans (two sizes on the map); `data/text-widths.json` is measured with it.
5. `popups/legend.mjs`: the legend opens in the reading rail (it never found free ground as a floating card). `popups/fxdraw.mjs`: leaders, place rings and subject rings in hairlines.
6. `render/canvas.mjs`: place names around the marks, no hard hover ring (the skin draws its own); `ui/studio.mjs`, `tours/library.mjs`, `app.mjs`: the words (marks, not tiles; the ground is a 2022 aerial) and the two styles.
7. `skins/semantics.mjs`: legend sentences shortened to at most 84 characters; `skins/index.mjs`, `styles/index.mjs`: this skin and two styles (night, day). The prototype's three skins are not in this fork.
8. Dials: `layout.labels` off, `layout.gapPx` 1, `layout.dMaxPx` 56, `motion.fadeMs` 280, `motion.birthScale` 0.86, default skin and ground.
9. `layout/engine.mjs` `nearestFree` and `components`: the same exact search, 40 % cheaper at the whole-field view (the forbidden rectangles are filtered once per column, the 1e-5 de-duplication uses a scratch set, the candidates come from a lazy heap, the components test squared distances). Identical to the prototype's original on 40,000 random scenes with ties (`tools/probes/nf-diff.mjs`, and a 4,000-scene test in `test/layout.test.mjs`).
10. `layout/tiles.mjs` and the skin's `sizer.selects(z)`: below the zoom where selecting changes what must be reserved (15, and never on a narrow window) the selected unit gets no priority boost, so a click draws a ring and moves nothing (the prototype re-ordered the placement and reflowed the crowd).
11. `scene/engine.mjs` `governorStep`: a window of the solve-cadence governor is 45 frames or 0.8 s of slow ones (at 15 fps it took 3 s per step).
12. `ui/quiet.css`: the last 4 px radii are on the 6 / 10 px scale.

Nothing outside `docs/pitch/anim2/d1-quiet-cartographer/` and `tmp/look-dev/d1-quiet-cartographer/` was written. No product code was touched.
