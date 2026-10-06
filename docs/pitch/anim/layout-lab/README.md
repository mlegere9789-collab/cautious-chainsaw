# layout-lab

Research prototype for `docs/pitch/anim/06-layout.md` (collision-free unit-tile layout). It reads the real data files under `baseline/dist/data` (read-only),
changes no product file, and every number in the document comes from a script in this folder. Node 24, Windows or POSIX. Chrome only for the screenshots and the
browser checks.

```
node docs/pitch/anim/layout-lab/selftest.mjs            # the lab proves itself: verifier == brute force, nearestFree == brute-force optimum, the zero-overlap guarantee
                                                        # on 1,200 adversarial scenes and across the policy-dial space, negative control, 3 mutation tests (about 1 minute)
node docs/pitch/anim/layout-lab/measure-text.mjs        # glyph advances measured in real Chrome -> out/text-widths.json (tile text widths are measured, not guessed)
node docs/pitch/anim/layout-lab/measure.mjs e1          # 8 strategies x zoom 11-17 x 675 ticks x visibility rules A/B/C        -> out/e1.json   (about 3 minutes, 6 workers)
node docs/pitch/anim/layout-lab/measure.mjs e2          # 60 fps playback at three hotspots: flicker, pops, jerk, overlap per frame -> out/e2.json
node docs/pitch/anim/layout-lab/measure.mjs e4          # sensitivity of the dials (budget, footprint, rule, kCap, pin protection)  -> out/e4.json
node docs/pitch/anim/layout-lab/hotspots.mjs --find     # the three densest hotspots, per-strategy metrics and figures           -> out/e3.json, out/figs/
node docs/pitch/anim/layout-lab/stress.mjs              # failure / stress cases (identical anchors, lines, grids, piles)         -> out/e6.json
node docs/pitch/anim/layout-lab/timing.mjs              # time per solve, densest tick, serial (run it on a quiet machine)         -> out/e5.json
node docs/pitch/anim/layout-lab/validate-legacy.mjs     # real Chrome + R1c: does the port of the shipped renderer reproduce the app's glyph positions? (ports 9601, 9602)
node docs/pitch/anim/layout-lab/serve-lab.mjs 9600      # the interactive lab: http://127.0.0.1:9600/lab/lab.html (the same lib/*.mjs in the browser)
node docs/pitch/anim/layout-lab/shot-lab.mjs            # drives the lab page in Chrome: overlap counts, representation, solve times in V8, screenshots -> out/browser.json
node docs/pitch/anim/layout-lab/figs.mjs                # composite figures and charts                                              -> out/figs/
node docs/pitch/anim/layout-lab/merge.mjs               # out/*.json -> docs/pitch/anim/data/layout-results.json
node docs/pitch/anim/layout-lab/analyze.mjs e1 A        # print the tables of the document from out/*.json
```

## Layout of `lib/` (every file is small and does one thing)

| file | role |
|---|---|
| `data-core.mjs` | pure loader (node and browser): placements, order of battle, parent chains, short codes, visibility rules A/B/C, interpolation, Mercator projection |
| `data.mjs` | node wrapper (reads the files from disk, loads the measured text table) |
| `spec.mjs` | THE TILE SPEC: every footprint number and every budget (`standard`, `compact`); text widths from the measured table |
| `tiles.mjs` | leaf tiles, aggregate tiles (naming policy, anchor), hierarchy helpers |
| `engine.mjs` | the placement engine: `nearestFree` (exact minimum-displacement search among rectangles), the certified solve loop, labels |
| `strategies.mjs` | the strategies under test (`raw`, `disclose`, `displace`, `aggregate`, `aggregateTier`, `fanout`, `hybrid`) behind one interface; add yours here |
| `legacy.mjs` | source-level port of the shipped canvas renderer (validated against the real app by `validate-legacy.mjs`) |
| `geom.mjs` | rectangles, spatial hash, and the INDEPENDENT overlap verifier |
| `metrics.mjs` | everything that is measured about a solved frame |
| `dynamic.mjs` | frame-by-frame playback accounting (flicker, pops, jerk, overlap per frame) |
| `expand.mjs` | the expandable list (an aggregate opened into a fixed-slot roster) |
| `render.mjs` | SVG rendering of a solved frame (node and browser) |
| `smooth.mjs`, `lookahead.mjs` | motion-layer experiments (negative results, kept for the record) |
| `synth.mjs` | adversarial scenes built from real units with invented positions |

`out/` holds regenerable intermediate results and figures; `docs/pitch/anim/data/layout-results.json` is the merged, committed result.
