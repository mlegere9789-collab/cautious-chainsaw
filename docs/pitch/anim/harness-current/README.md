# harness-current: the measurement scripts behind `01-current-tiles-jitter.md`

Read-only research harness. It changes no product file: it serves `baseline/dist` and `release/R1c/dist` from a local static server, drives real Chrome through `tests/t0/lib.mjs` (used unmodified; Mapbox tiles only through its Referer injection, at most 300 requests per process), and slices the app's own functions out of the beautified bundles to replay them.

## Setup (the scripts expect to run from `tmp/pitch-anim/a1/`, which is git-ignored)

```
mkdir -p tmp/pitch-anim/a1 && cp -r docs/pitch/anim/harness-current/* tmp/pitch-anim/a1/
node tmp/pitch-anim/a1/pretty.mjs          # writes base.pretty.js and r1c.pretty.js (terser beautify, no mangling) from the two bundles
node tmp/pitch-anim/a1/make-widths.mjs     # optional: re-measure label widths in Chrome (text-widths.json is included)
```

Ports: `common.mjs` pins `T0_PORT_BASE=9500` (static servers 9500 baseline, 9501 R1c; Chrome debugging ports 9502 to 9509). Change them if another process owns them.

## Order of the main runs

| Step | Command | Output (in `tmp/pitch-anim/a1/`) |
|---|---|---|
| validation traces | `node run-browser.mjs r1c trace` then `node replay.mjs r1c` | `runs-r1c-trace-desktop.json`; replay must print 0 differences |
| timing | `node run-browser.mjs r1c timing`, `node run-browser.mjs baseline timing`, `node run-phone-timing.mjs r1c` (and baseline) | `runs-*-timing-*.json`, summarised by `timing-summary.mjs` |
| state and input | `node tests-state.mjs <build>`, `node tests-input.mjs <build>`, `node hit-test.mjs <build>`, `node sound-check.mjs <build>`, `node intro-check.mjs <build>` | `state-*.json`, `input-*.json`, `hit-*.json`, `sound-*.json`, `intro-*.json` |
| screenshots | `node shots.mjs <build> <desktop\|phone>`; `node specimen.mjs` | `docs/pitch/anim/shots/current/` |
| overlays | `node popup-rects.mjs <build> <desktop\|phone>`, `node covered-by-ui.mjs` | `popups-*.json`, `covered-by-ui.json` |
| data | `node data-analysis.mjs`, `oob-join.mjs`, `label-calcs.mjs`, `misc-calcs.mjs`, `legend-check.mjs`, `hotspots.mjs`, `scrub-calcs.mjs` | `*.json` |
| overlap | `node overlap.mjs r1c 11,12,13,14,15,16,17` (and `... phone`), `node overlap-summary.mjs` (and `phone`) | `overlap-*.json` |
| motion | `node fast-motion.mjs r1c`, `node analyze-sim.mjs r1c runs-r1c-timing-desktop.json <run label>`, `node camera-motion.mjs`, `node label-flicker.mjs`, `node exemplar-trace.mjs` | `fast-motion.json`, `*.analysis-*.json`, `camera-motion.json`, `label-flicker.json`, `exemplar-trace.json` |
| assemble | `node locate.mjs`, `node env.mjs`, `node build-metrics.mjs`, `node charts.mjs` | `docs/pitch/anim/data/current-metrics.json`, `shots/current/fig-*.svg` |

`model.mjs` is the key piece: it cuts `y1`, `F4`, `z4`, `lS`, `Ed`, `uF`, `dA` out of `base.pretty.js` / `r1c.pretty.js` by text markers and evaluates them in a vm, so nothing is re-implemented. `replay.mjs` feeds it the real rAF timestamps of a browser run and compares per-frame digests with what the page drew.

Evidence labels used throughout: Measured, Computed, Documented, Modelled, Unknown.
