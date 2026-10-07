# D2 Strategy Premium

Art direction 2 for the Gettysburg Battle Studio: unit marks and every popup redesigned as a campaign-map language (a unit is one small standard; a crowd is a gilt-counted stack of standards; light from the north-west; ink-navy glass cards with gilt hairlines), running on the real aerial ground.

**Read first:** [`SPEC.md`](SPEC.md) (the language: principles, grid, type, colour with contrast tests, anatomy, states, formation marks, motion, popups, evidence labels per encoding, extensibility, limits) and [`ITERATIONS.md`](ITERATIONS.md) (six rounds of render, look, list what is ugly, fix, re-render).

## Look at it

| What | File |
| --- | --- |
| The pictures of the brief S1 to S8 (DPR 2) with a 100 percent crop of the busiest 600x400 area of each map scene | `shots/s1a-*.png` ... `shots/s8-*.png`, `*-crop-busiest-600x400.png` (390x300 for the phone scene) |
| Extra scenes: day banner and clock, narration, tour, chronicle (JPEG) | `shots/s9-*.jpg` ... `shots/s12-*.jpg` |
| Eight consecutive frames of a march and of an arrival | `shots/motion-strip.png` |
| The specimen sheet of the language on three grounds and three palettes (JPEG) | `shots/specimen/` (and `dist/specimen.html`) |
| The language on other grounds and in the other palettes (JPEG) | `shots/variants/` |
| Iteration pictures | `shots/iterations/` |
| The working page | `dist/battle-studio-premium.html` (see below) |

## Run it

The page needs the basemap's tile files, which it finds at `../../basemap/assets/` relative to the page, so serve the `anim2` folder, not the `dist` folder:

```
node tools/serve.mjs            # serves docs/pitch/anim2 on 127.0.0.1:9860 (Ctrl+C stops it)
```

Then open `http://127.0.0.1:9860/d2-strategy-premium/dist/battle-studio-premium.html`.  The page makes no network request of its own (the fonts are inlined, the tiles are local).  Add `?lab=1` for the research controls, `?style=premium&variant=cvd` or `contrast` for the other palettes, `?backdrop=real-paper|real-natural|real-slate|real-dim` for the other grounds.

## Build it

```
node studio/build.mjs            # tokens -> skin tokens, bundle, dist/battle-studio-premium.html and dist/specimen.html
node studio/build.mjs --check    # is dist up to date?
node tools/make-skin-tokens.mjs --check
```

The bundler is strict (no default exports, no cycles, no `fetch`, no URLs): the page is one HTML file.

## Change the look

Edit a `$value` in `design/premium.tokens.json`, run `node studio/build.mjs`, reload.  Or open the Tune panel (the sliders button), change a token live, and press "Copy changes" to get the changed tokens as a variant file (`design/variants/*.json` shows the shape).

## Check it

All commands run from this folder.  Each writes a file in `results/`.

| Command | Checks | Result file |
| --- | --- | --- |
| `node --test studio/test/*.test.mjs` | The engine, layout, display layer, popups, tours, skin contract and the Showcase | `results/node-tests.txt` |
| `node tools/ink.mjs` | A mark paints nothing outside the box the layout reserved (four states, two pixel ratios) | `results/ink.json` |
| `node tools/sweep.mjs --vp=desktop` / `--vp=phone` | Zero overlaps in the drawn page, by an independent routine, over zoom x tick x place | `results/sweep-*.json` |
| `node tools/legibility.mjs` | Type contrast on rendered pixels, every state, every palette | `results/legibility.json` |
| `node tools/colour-tests.mjs` | Side colours under colour-vision deficiency and in greyscale | `results/colour-tests.json` |
| `node tools/motion.mjs` | Frame rate, pops, teleports, jumps, overlaps in playback, zoom and selection | `results/motion.json` |
| `node tools/shots.mjs` | The pictures, with the overlap check, the chrome coverage and the rendered type audit on every scene | `shots/`, `results/shots.json` |
| `node tools/strip.mjs`, `python tools/strip-compose.py` | The motion strip | `shots/motion-strip.png` |
| `node tools/specimen.mjs` | The specimen sheets | `shots/specimen/` |
| `node tools/spec-tables.mjs --check` | The tables of SPEC.md are the numbers of `results/` | |

<!--T:tests-->
`node --test studio/test/*.test.mjs`: 157 tests, 157 pass, 0 fail (full log: `results/node-tests.txt`).
<!--/T:tests-->

## What is here

| Folder | Content |
| --- | --- |
| `design/` | `premium.tokens.json` (the whole look, 65 tokens) and `variants/` (colour-blind safe, high contrast) |
| `studio/` | The forked engine and the page: `src/skins/premium.mjs` (the skin), `src/ui/` (chrome and popup styles), `src/popups/`, `build.mjs`, `test/` |
| `fonts/` | Barlow Semi Condensed 500/600/700 and Source Serif 4 400/400 italic/600 (latin subsets, woff2) with their SIL OFL 1.1 licence texts; source: the fontsource packages 5.3.0 via jsDelivr |
| `dist/` | The built page and the specimen |
| `tools/` | Every check and picture tool above, and the spec-table generator |
| `results/` | Every measurement as JSON |
| `shots/` | Every picture |

## Provenance and licences

- Engine: forked from `docs/pitch/anim/prototype` (this repo); the prototype and the product are untouched.  The fork keeps its provenance notes in the file headers.
- Ground: `docs/pitch/anim2/basemap` (USGS NAIP aerial, 3DEP hillshade and contours, Census TIGER; see its README for the sources and terms).  It is 2022 imagery, a backdrop and not a claim about 1863.
- Fonts: SIL Open Font License 1.1 (texts in `fonts/`).
- Symbols are drawn in code (`skins/premium-art.mjs`); no image assets, no icon font, nothing else is loaded.
