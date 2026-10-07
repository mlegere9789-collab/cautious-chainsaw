# FORK.md: what changed in the engine

`engine/` is `docs/pitch/anim/prototype/src` as committed in this repository on 2026-10-07 (HEAD aa9077b), copied and changed as listed here (`diff -rq docs/pitch/anim/prototype/src docs/pitch/anim2/d3-field-manual/engine` gives exactly this list). **Not changed**: the certified layout (`layout/engine.mjs`, `geom.mjs`, `strategies.mjs`, `production.mjs`), the display dynamics (`scene/display.mjs` except one field), the interpolation, the clock, the metrics, the Overlay Director and every popup module except the legend, the tuning, the kernel, the tours' mechanics. Their guarantees were therefore re-measured on the new skin rather than assumed (SPEC.md, section 12).

| file | change | why |
|---|---|---|
| `skins/d3.mjs` (new) | the Precision Field Manual | the design |
| `ui/fm.css` (new) | one stylesheet for the chrome and every popup | replaces `studio.css` and `popups.css` (deleted from the fork) |
| `fx/places.mjs` (new), `fx/index.mjs` | place names laid out every frame against the marks of the frame | the basemap's own labels were placed without knowing where the marks are and could lie under them |
| `layout/spec.mjs` | `sizeOf(spec, info)` (a skin may size its own marks), `namedAt(spec, z)` (the name form with hysteresis), `makeSpec(..., skin)` | marks differ in height and width by echelon, tab, stack and form; the prototype assumed one chip height |
| `layout/tiles.mjs` | leaf and aggregate sizes through `sizeOf`; `named` on the tile; a memo of aggregate sizes | the same |
| `layout/text.mjs` | `FONT_STACK` starts with FM Sans; `FONT_SPECS` has six entries (11 and 13 px, bold and regular); a wider character set | the fonts of the language; text widths decide footprints |
| `scene/display.mjs` | `named` carried from the layout tile to the display tile | the skin draws the grown form from it |
| `scene/engine.mjs` | `makeSpec(..., skin)` | the skin's `measure` and `forms` reach the spec |
| `skins/kit.mjs` | the skin definition passes `measure`, `ownsHover`, `forms` through; legend swatches are 124 x 40 (were 18 x 12); a failing swatch is reported once instead of swallowed | true-size legend; a swallowed exception had emptied the legend |
| `skins/contract.mjs` | the recording context finds a font's key by the exact string of `FONT_SPECS` | the prototype guessed it from the size; 13 px bold would have been measured as 11 |
| `skins/semantics.mjs` | the legend sentences for echelon, strength, fix age, identity, aggregate describe this design; `aggregate` has a second value (`lead`) | the old sentences described dotted plates and a count pill |
| `skins/index.mjs` | `makeSkins(json)` builds the family from the token file | the tokens are data, read at start-up |
| `styles/index.mjs` | one style, four variants (night, day, colour-blind safe, high contrast) with their grounds | |
| `render/canvas.mjs` | the renderer's hard hover ring is skipped when the skin `ownsHover` | the skin eases its own |
| `builtins.mjs` | registers the real ground (basemap), the looks `fm` and `fmday` (the ground annotated in FM Serif, water names in the true italic) | |
| `app.mjs` | fonts loaded before boot; the text table measured at start-up (the prototype's static table is not copied); skin tokens read from the page; `?tiles=`; the theme follows the look; test hooks `window.__fm`; the welcome text no longer claims "no network request" | |
| `popups/legend.mjs` | the legend is a pill that opens in the reading rail | 23 true-size marks do not fit on free ground |
| `popups/fxdraw.mjs` | leaders, rings and arrows are hairlines over a dark underlay; no dash, no white halo | the quiet rule |
| `ui/popup-layer.mjs` | the Chronicle strip is inserted into the transport row | one row fewer in the dock |
| `ui/studio.mjs` | the scrubber is drawn in the language's ink (labels clear of the ticks); the honesty row says what the ground is; the About tab prints the ground's caption and attribution and the true limits of the placements | the old texts called the ground a grid |
| `ui/shell.html` | the skin JSON, a title, an empty favicon, the splash text | |
| `tours/library.mjs` | style ids and the showcase's wording | one style; the ground is a photograph |
| deleted | `skins/{field-manual,war-room,map-1863,minimal}*.mjs`, `headless.mjs`, `ui/{studio,popups}.css` | superseded or dependent on the prototype's tests |

**Tokens** (`tokens/tokens.json`): `tools/patch-tokens.mjs` lists every change to the engine's 177 dials (and the one added, `backdrop.placeLabels`), each with its reason: the skin and ground, labels off, hulls on hover only, birth scale 0.88, camera zoom 13.5, the popup palette `manual`, radius 3 px, no blur, no shadow, shorter card motion.

**Build** (`build.mjs`): the prototype's bundler with its rules (no default exports, no re-exports, no cycles, no `import.meta`, no URL, no network call) and these differences: the sources are `engine/`, the shell takes the skin JSON and the fonts, the CSS is `fm.css`, an empty `data:` favicon is allowed, the output is `dist/field-manual.html`.

**Data**: `data/dataset.json` and `data/popup-data.json` are byte-identical to the prototype's (`data/SOURCE.json`).

**Tests**: the prototype's 163 tests were not copied and not run on the fork; the checks of the fork are the scripts in `tools/` (README.md), run in real Chrome.
