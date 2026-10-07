# D4 · Dispatch: the Editorial Annotation fork of the Battle Studio

Art direction 4 of the second round of the Battle Studio's look. The brief, in the owner's words after the first prototype: *"all 4 look like dogshit"*; the bar: calm, confident, legible, a clear hierarchy, every pixel intentional. This direction answers with the most radical simplification: **a unit is one small bold mark and its haloed code, the name grows out of the same mark, a formation is a soft hull that appears when you touch it, a card is an annotation with a thin leader, and the map (a real aerial photograph of the real ground) is the hero.**

**Open the page**: build it with `node docs/pitch/anim2/d4-editorial/studio/build.mjs`, serve `docs/pitch/anim2/` (any static server: `node docs/pitch/anim2/d4-editorial/tools/serve.mjs 9900`) and open `http://127.0.0.1:9900/d4-editorial/dist/battle-studio.html`. The page finds the aerial tiles in `../../basemap/assets/` (or pass `?assets=<folder url>`); `node studio/build.mjs --pack` is **not** implemented here (the basemap's `tools/build-pack.mjs` makes a data-URI pack; see "Limits"). Nothing is requested from any other site.

**Read** `SPEC.md` (the design language: principles, grid, type, colour and its tests, anatomy, states, motion, popups, what is Documented and what is Modelled in every encoding, how to extend it) and `ITERATIONS.md` (what a hostile creative director saw in each of six passes, and what changed). **Look** at `shots/`.

## What is in the folder

```
SPEC.md  ITERATIONS.md  README.md
studio/                       the working fork of the first prototype's engine (docs/pitch/anim/prototype), not edited in place
  src/skins/editorial.mjs     THE SKIN: the drawing (sprites, rings, hull, place names, legend swatches)
  src/skins/editorial.spec.mjs THE TOKENS of the skin (about 70 rows: colour, metrics, motion) and its variants
  src/ui/editorial.css        the interface and every popup, restyled
  src/popups/fxdraw.mjs  legend.mjs   the map-side ink of the cards (highlighter, thin leader), the legend in the reading rail
  src/basemap/                the real ground (a copy of docs/pitch/anim2/basemap/src and data; the tile files are read from there)
  tokens/tokens.json          the engine's dials, derived from the first prototype's by tools/derive-tokens.mjs
  build.mjs                   the bundler (one HTML file) and the font embedding
  test/editorial.test.mjs     the tests of this language; the other test files are the first prototype's engine tests, adapted
fonts/                        Inter and Source Serif 4 (SIL OFL 1.1), their licences and sources (SOURCES.md)
dist/battle-studio.html       the built page (2.3 MB, readable source)
shots/                        the pictures of the brief at 2x: S1 to S8 and their 100-percent crops (PNG), the aerial variants, the 11 popup pictures and the specimen sheets (JPEG), the three motion strips (PNG)
iterations/                   the pictures of each pass (JPEG), cited by ITERATIONS.md
results/                      every number, as JSON: scenes, colour tests, ground bands, pixel check, tests
tools/                        build helpers, the drivers of every picture and check, the report
```

## Commands

```
node tools/derive-tokens.mjs                 studio/tokens/tokens.json from the first prototype's tokens
node studio/build.mjs                        -> dist/battle-studio.html
node tools/serve.mjs 9900                    a static server over docs/pitch/anim2 (the page needs ../../basemap/assets/)
node tools/run-tests.mjs [--quick]           the node tests (editorial, engine, fuzz, popups, assembled tours) and the colour tests -> results/tests.json
node tools/ground-bands.mjs                  the real backdrop's colours, for the colour tests (needs Chrome)
node tools/contrast-tests.mjs                every colour pair of the language -> results/contrast-tests.json
node tools/skin-ink.mjs                      every tile drawn alone, its pixels against its box -> results/skin-ink.json (needs Chrome)
node tools/shots.mjs --set=final --dpr=2     S1 to S8 (+ crops) -> shots/, the counts -> results/scenes-final.json
node tools/popups-shots.mjs --set=final      every popup in situ -> shots/popups-*
node tools/strips.mjs && python tools/strips-compose.py     the three motion strips -> shots/motion-*
node tools/specimen.mjs                      the specimen sheets -> shots/specimen-*
node tools/pacing.mjs [--dpr=2] [--cpu=4]      real-time frame pacing and the sudden steps of solid marks (needs Chrome) -> results/pacing-*.json
node tools/jitter-probe.mjs "scene=carry1&tick=285&zoom=15" 4 600 [set-json]   names every sudden step (virtual clock)
node tools/chrome-cover.mjs                  how many marks lie under the dock or the top bar -> results/chrome-cover.json
node tools/report.mjs                        rewrites the measured tables of SPEC.md and of this file
node tools/measure-text.mjs                  the advance widths of the mark fonts -> studio/data/text-widths.json
```

Ports used: 9900 to 9909 (the drivers take `D4_PORT`); Chrome profiles live under `tmp/look-dev/d4-editorial/`. Needs node 24, Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`), python 3 with Pillow, and the repo's `playwright-core` and `acorn`.

## Tweaking and adding

* A value: `studio/src/skins/editorial.spec.mjs`, or live `?skinset={"dispatch-paper":{"mark.r":8.5,"hull.alpha":0.2,"text.haloWidth":3}}`.
* A palette variant: one entry in `DP_VARIANTS` or `DA_VARIANTS`; `node tools/contrast-tests.mjs` tests it.
* A new look: copy `editorial.mjs`, change the drawing, list it in `skins/index.mjs` and `styles/index.mjs`; the contract and the hooks are in `skins/contract.mjs` and SPEC.md section 11.
* A popup: `src/popups/_template.mjs`; the stylesheet gives it the language.

## Measured

<!--SCENES-->
### Scene checks (real Chrome, 2x, 1440x900 and 390x844; the independent frame check of `tools/frame-check.mjs`, which shares no code with the engine's verifier)

| Scene | Tick / zoom | Marks on screen | Units on the field | Core overlaps | Pins covered | Name overlaps | Unrepresented units | Smallest gap between two boxes (px) | Names grown | Cards over a mark (frames) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S1a-field-z13.5-t551 | 551 / 13.5 | 137 (61 crowds for 375 records) | 451 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S1b-field-z13.5-t556-assault | 556 / 13.5 | 141 (68 crowds for 383 records) | 456 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |
| S2-wheatfield-rosewoods-z15-t295 | 295 / 15 | 276 (28 crowds for 96 records) | 344 | **0** | **0** | **0** | **0** | 2 | 125 | 0 |
| S3-cemetery-hill-z15.5-t346 | 346 / 15.5 | 341 (18 crowds for 62 records) | 385 | **0** | **0** | **0** | **0** | 2 | 183 | 0 |
| S4-selected-z16.5-t556 | 556 / 16.5 | 450 (4 crowds for 10 records) | 456 | **0** | **0** | **0** | **0** | 2 | 249 | 0 |
| S6-event-and-story-in-situ-z15.5-t551 | 551 / 15.5 | 389 (26 crowds for 88 records) | 451 | **0** | **0** | **0** | **0** | 2 | 181 | 0 |
| S7-legend-z15.5-t551 | 551 / 15.5 | 389 (26 crowds for 88 records) | 451 | **0** | **0** | **0** | **0** | 2 | 181 | 0 |
| S8-hover-tooltip-z16.5-t556 | 556 / 16.5 | 450 (4 crowds for 10 records) | 456 | **0** | **0** | **0** | **0** | 2 | 249 | 0 |
| S5-phone-z14.5-t556 | 556 / 14.5 | 276 (49 crowds for 229 records) | 456 | **0** | **0** | **0** | **0** | 2 | 0 | 0 |

**Over the 9 scenes: 0 overlapping vital cores, 0 covered true positions, 0 overlapping names, 0 unrepresented units; the engine's own verifier reports 0 overlapping pairs on the same frames.** A *core* is the box of a mark (the glyph and its code, one object); a *crowd* is a standard that stands for several records, so every unit is represented. Console errors: 0; requests that left the machine: 0.
<!--/SCENES-->

<!--TESTS-->
### The ink stays in its box (`tools/skin-ink.mjs`, pixels, DPR 2)

777 real tiles of 5 scenes were drawn alone in 3108 states (rest, hover, selected, arriving): **0 of them paint more than 0.5 px outside the box the layout reserved**; 306 grown names: **0** outside their tile's box plus label rectangle; 309 pins: **0** outside the pin box. The worst overrun is 0.50 px (anti-aliasing).

### Tests

* editorial (this language: sizing, anchors, layout and played frames with its footprint, names, hull, legend, colour): **11 of 11 pass** (13 s)
* engine: layout, display, interpolation, time, data, tuning, extension, production reproduction, build: **88 of 88 pass** (66 s)
* engine: fuzz (random actions on every API, three seeds), popups, assembled tours: **56 of 56 pass** (174 s)
* colour tests (tools/contrast-tests.mjs): **134 of 134 pass** (0 s)
<!--/TESTS-->

<!--PACING-->
### Real-time frame pacing and jitter (the page's own animation loop in real Chrome 155, 8 s per row after 2 s of warm-up; `tools/pacing.mjs`)

| Condition | Scene | Speed | fps | Frame p95 (ms) | Frames over 20 ms (%) | Engine (ms/frame) | Skin draw, median (ms) | Largest step of a solid mark (px) | Sudden steps of solid marks per s | Frames with overlaps |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| DPR 2, no slowdown | The Angle, z15.5 | 1x | 60 | 16.8 | 0 | 6.45 | 0.6 | 10.3 | 0.25 | 0 |
| DPR 2, no slowdown | The Angle, z15.5 | 4x | 60 | 16.8 | 0 | 6.13 | 0.6 | 11.1 | 0.13 | 0 |
| DPR 2, no slowdown | Wheatfield, z15 | 1x | 60 | 16.8 | 0 | 4.33 | 0.8 | 5.4 | 0 | 0 |
| DPR 2, no slowdown | Wheatfield, z15 | 4x | 60 | 16.8 | 0 | 5.08 | 0.8 | 28.2 | 0.13 | 0 |
| DPR 2, no slowdown | whole field, z13.5 | 1x | 60 | 16.8 | 0 | 2.97 | 1.2 | 18.3 | 0.25 | 0 |
| DPR 2, no slowdown | whole field, z13.5 | 4x | 60 | 16.8 | 0 | 2.72 | 1.1 | 13.4 | 0.25 | 0 |
| DPR 1, no slowdown | The Angle, z15.5 | 1x | 60 | 16.8 | 0 | 6.94 | 0.7 | 10.3 | 0.25 | 0 |
| DPR 1, no slowdown | The Angle, z15.5 | 4x | 60 | 16.8 | 0 | 6.34 | 0.7 | 11.1 | 0.13 | 0 |
| DPR 1, no slowdown | Wheatfield, z15 | 1x | 60 | 16.8 | 0 | 4.6 | 0.8 | 7.6 | 0 | 0 |
| DPR 1, no slowdown | Wheatfield, z15 | 4x | 60 | 16.8 | 0 | 4.55 | 0.8 | 28.2 | 0.25 | 0 |
| DPR 1, no slowdown | whole field, z13.5 | 1x | 60 | 16.8 | 0 | 3.82 | 1.2 | 25.5 | 0.25 | 0 |
| DPR 1, no slowdown | whole field, z13.5 | 4x | 60 | 16.8 | 0 | 3.78 | 1 | 13.4 | 0.25 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | The Angle, z15.5 | 1x | 26.3 | 66.7 | 73 | 25.68 | 4.2 | 14.9 | 2.13 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | The Angle, z15.5 | 4x | 26.9 | 66.7 | 74.1 | 23.96 | 4.1 | 31 | 4 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | Wheatfield, z15 | 1x | 31 | 66.6 | 59.4 | 18.26 | 5.2 | 14.5 | 0.63 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | Wheatfield, z15 | 4x | 29.9 | 66.6 | 70.8 | 18.4 | 5.9 | 14.6 | 1.75 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | whole field, z13.5 | 1x | 32.3 | 66.6 | 52.9 | 15.32 | 6.8 | 18.6 | 0.25 | 0 |
| DPR 2, main thread 4x slower (a harsh stand-in for a phone, not a phone) | whole field, z13.5 | 4x | 31.7 | 66.6 | 58.7 | 14.1 | 7.7 | 15 | 0.25 | 0 |

*Largest step of a solid mark* and *sudden steps* come from an instrument of the driver's own (every tile that is solid in two consecutive frames; a step of 8 px or more that is at least 3 times the step before it is sudden), independent of the engine's recorder; the recorder also counts dimmed travelling marks, which can step farther (it reported up to 161 px at The Angle at 1x) and are not solid.
<!--/PACING-->

## Decisions that are the owner's

1. **Which ground by default**: *paper* (a survey print: warm, calm, the marks stand out as ink) or *aerial* (the dimmed photograph: more cinematic). Both are built, both are tested; the pictures in `shots/` are paper, with `-aerial` versions of S1, S2 and S4.
2. **How much text on the map at once**: names grow out of every mark that has room from zoom 15 (`layout.labelMinZoom`); raise it for a quieter map, lower it for a wordier one. The hovered unit always grows its name.
3. **Posture on the mark**: not drawn (the data's posture is hand-authored per keyframe with no honest heading); it is on the unit card. If the owner wants it on the map it belongs in the grown name line, not in a badge.
4. **Echelon as shape**: a brigade, division, corps record is a standard with 1, 2, 3 pips. If the owner would rather every unit were a disc and echelon were only the name, `flag.*` tokens and `frameOf()` are the place.
5. **The Before / After switch** moved into the Showcase menu (key `B` still toggles): it is a research view, and it was the busiest control of the bar.

## Limits (what was not verified)

* One machine, one Chrome (155, headless, an Intel Arc GPU), 1440x900 and 390x844 at DPR 2; **no real phone, no Safari, no Firefox**. Under a 4x main-thread slowdown (a stand-in for a phone, which is harsher on JavaScript than on a phone's GPU) the page runs at 26 to 32 fps in the dense scenes (1x and 4x), as the first prototype did under the same throttle: the engine's solve and display layer (14 to 26 ms there) is the cost, not the skin's drawing (0.6 to 1.2 ms a frame unthrottled).
* **The dock and the top bar lie over marks** (`tools/chrome-cover.mjs`, SPEC section 12: 6 to 12 percent of the marks on screen in the scenes, 14 of 117 in S1b). The layout and the popup director treat them as part of the map; the remedy (a camera safe-area, or a canvas that ends above the dock) changes the framing of every direction and was not made here.
* **Jitter is reduced, not gone**: in real time at 60 fps a solid mark still takes a sudden step of 8 px or more 0 to 0.25 times a second (the largest 28 px, at 4x); `tools/jitter-probe.mjs` names the tile of each step; the cause of the run-to-run variation of the count is not known.
* **No designer and no historian reviewed this.** The language was looked at by its author in every iteration; whether it meets the owner's bar is the owner's call.
* The photograph is modern (April to May 2022, leaf-off), not the 1863 landscape; the unit placements and the place names of the ground sit in two frames that disagree by up to 733 m for 8 places; the legend, the About tab and the caption in the dock say so.
* The page needs the folder `docs/pitch/anim2/basemap/assets/` beside it (9 MB of AVIF tiles). It is not a single file; the data-URI pack of the basemap (12 MB) was not wired into this build.
* The colour-vision results are a simulation; the ring and text contrast are tested against percentile colours of the real backdrop, not every pixel.
* The Latin subset of the fonts lacks a few typographic marks (the arrow of the cross-out card falls back to a system font).
* The first prototype's engine tests that still apply were adapted (paths, the two looks instead of three styles) and pass; the ones that only concern the old skins and the old schematic backdrop were dropped.
* Evidence labels on the legend rows come from the first prototype's channel registry; one label (**Design**) is the prototype's addition for interface-only elements.
