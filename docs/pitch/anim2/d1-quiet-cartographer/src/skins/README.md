> **FORK NOTE (d1 Quiet Cartographer).** This README is the prototype's. Its three skins (Field Manual, War Room, 1863 Map) are not in this fork; the sections on the files, the kit, the contract, tweaking tokens and adding a skin still describe how the engine works. The skin of this fork is `quiet-cartographer.mjs` with its token file `quiet-cartographer.spec.mjs`; its design is `../../SPEC.md`, how to extend it is SPEC.md section 12, and the one contract addition is the `sizer` (a skin may size each mark by detail level).

# Tile skins: Field Manual, War Room, 1863 Map (+ the 50-line skin)

Three tile designs for the Battle Studio, each a registered module of the engine, each with a colour-blind-safe and a high-contrast variant, a legend generated from the skin itself, a tiny token file a designer can edit, and eased selection, hover and arrival. They draw only what the data research says is true (`../../../03-data-fuel.md`), and the tests prove it. A fourth skin, `minimal.mjs`, is the "add a skin in under 50 lines" demonstration (35 lines).

Open the Studio and pick a skin in the top bar (**Skin:** list), or use the URL: `battle-studio.html?skin=field-manual`, `war-room`, `map-1863`, any of them with `/cvd` (colour-blind safe) or `/contrast` (high contrast), or `minimal`. The default stays `reference` (the engine's own test skin). The About tab (`A`) prints the legend of the skin in use.

Pictures: `docs/pitch/anim/shots/prototype/` (sheets of every state, in-app screenshots, colour-blind simulations, variants, crisp edges at DPR 1/2/3). Regenerate all of them: `bash docs/pitch/anim/prototype/test/skin-shots-all.sh`.

## The three directions and why

| | Field Manual | War Room | 1863 Map |
|---|---|---|---|
| Idea | a modern cartographic symbol: pale plate, side-coloured frame, arm glyph in a tinted cell, segmented gauge | cinematic dark glass lit from the top-left; the side colour is the rim light | a lithographed field-map tablet: parchment, ink rule, blue or red flag carrying the arm, corps badge medallion |
| Grounded in | the APP-6 / NATO grammar (04 R01, R02): frame = side, glyph = arm, X XX XXX = echelon, dashed = not a fresh report; WCAG 3:1 keyline construction (R42); one channel per variable (P5) | the owner's wish for a production feel, with **light** as the one cinematic device the data allows: lit = fresh, unlit and dashed = carried forward; depth = echelon; no trail, weather or casualty glow because the record has none | the only Documented period convention in the research: the seven Union corps badges and the red/white/blue division colours of the circular of 21 March 1863 (03 section 5); blue and red heritage colours (04 R08); ink = firm, pencil = provisional (R06) |
| Side, redundantly | blue frame + square silhouette / red frame + chamfered corners / hatched grey | pale-blue rim + rounded plate / orange rim + four cut corners / hatched grey | blue swallow-tail flag / red pointed flag / hatched grey square |
| Echelon | X, XX, XXX in the glyph cell, II for a battalion | stacked chevrons, and the plate floats higher (1.4 px for a brigade, 2 px for a division or corps) | X marks on the flag |
| Evidence | Modelled marks (gauge, posture) in lighter ink; dashes blend in with fix age | gauge and posture dimmer than the text; rim dims and dashes | strength is a pencilled band with an inked end mark; carried-forward tablets get a dotted pencil rule and greyer parchment |
| Arrival | wipe from the left | light sweep reveals the plate | pencil outline, then parchment, then wash, then ink |
| Selection | ink + amber double ring | four corner brackets lock in | gilt ring |
| Footprint | 26 px tall | 28 px (3 px margin for shadow and lift) | 26 px, wider (13 px side padding for the medallion) |

The Contested side (10 ids whose state code contradicts the prefix) is a hatched neutral grey in every skin and never a side colour. Brigade, division and corps records have no arm in the data, so they are drawn as formations (echelon marks, no arm glyph). The Union corps badge appears only on Union infantry and formation records whose order-of-battle chain documents the corps (174 of the 255 placed Union units; recomputed from the registry designations in `test/skins.test.mjs`); Confederates get the corps as a roman numeral (156 units), never an emblem.

What is NOT drawn, because the tile does not carry it or the research says it would mislead: facing (the display tile has no bearing; bearing matches the real move 47 % of the time), speed, casualty shading, the engaged glow, gun counts, weather, terrain shadows, trails.

## The files

| File | What it is |
|---|---|
| `semantics.mjs` | the honest channel layer: what may be drawn, what each channel is called, its evidence label; the legend text lives here, shared by every skin |
| `glyphs.mjs` | the shared shapes: arm glyphs, posture marks, echelon marks, corps badges, silhouettes |
| `kit.mjs` | `defineSkin`, `defineFamily`, token tables, eased state, pixel snapping, text fitting, the legend generator, live tweaking |
| `field-manual.mjs` `war-room.mjs` `map-1863.mjs` | the three drawings; `*.spec.mjs` next to each is its token file |
| `minimal.mjs` | the 35-line skin |
| `index.mjs` | the list the Studio registers (one import and one array entry per skin) |

## Tweak a design (no code)

Open `<skin>.spec.mjs`: one row per token, `[name, value, what it does, { min, max, unit }]` (about 30 rows, palette, construction, detail by zoom, motion). Edit, run `node docs/pitch/anim/prototype/build.mjs`, reload. Or live, without a build:

- URL: `battle-studio.html?skin=war-room&skinset={"war-room":{"rim.glow":0.6,"color.union":"#3fa0ff"}}` (values are validated against the token's own range; a bad one is reported in the console and ignored);
- console: `__skinKit.setToken('war-room', 'rim.glow', 0.6)`, `__skinKit.exportTokens('war-room')` (paste the result into the spec file).

A variant is the same drawing under another token set (`FM_VARIANTS` etc. at the bottom of the spec file). `test/skins.test.mjs` fails on a token that no drawing code reads, on a token read but not listed, on an out-of-range value, and checks contrast and colour-vision separation of every variant.

## Add a skin

Copy `minimal.mjs` (35 lines): tokens, a footprint, `channels` (which channels the skin draws), `draw.tile(c, t, g)`, and `sample(c, channel, value, g, w, h)` which draws the legend swatches. Then add it to `index.mjs`, `node build.mjs`, and add it to the `MINE` list of `test/skins.test.mjs`: the conformance check (ink inside the footprint), the layout guarantee with your footprint, the legend-is-the-drawing check (a skin must change its ink for every channel it lists and for no channel it does not list), the honesty checks and the token checks then run on it. `g` (see the header of `kit.mjs`) gives you the view model (`g.vm`), eased selection and hover (`g.sel`, `g.hov`), arrival progress (`g.enter`), a level-of-detail fade (`g.at(zoom)`), cross-fades of categorical channels (`g.cat`), device-pixel snapping (`g.cr`, `g.lw`) and text that never overflows (`g.text`).

## What is measured (all reproducible; one machine, Chrome 155, Windows)

- `node --test docs/pitch/anim/prototype/test/skins.test.mjs` (19 tests) and the whole suite (`node --test "docs/pitch/anim/prototype/test/*.test.mjs"`, 104 tests, all passing).
- Layout guarantee with each skin's own footprint: 0 overlapping pairs and 0 unrepresented units over 150 irregular frames on three hard scenes, for the reference, the three families and the minimal skin; the bigger plates simply aggregate more (mean live tiles per frame in the default scene: reference 391, Field Manual 339, War Room 319, 1863 Map 323).
- `node docs/pitch/anim/prototype/test/skin-browser.mjs` (real Chrome): at rest a fractional position renders **the same pixels** as the aligned one at DPR 1, 2 and 3 for 7 skins (0 differing pixels against 506 to 6,772 without the snap); arrival and departure have no step larger than 3.0 times the mean step (2.35 to 3.01), selection moves at most 14 % of its total change in one frame, hover at most 24 %, a posture cross-fade at most 10 %; a real mouse hover eases 0 to about 0.5 to 1 and selection about 0.3 to 1, both back to 0; playback of every skin at 4x for 5 s and of three at 8x on the aggregate-heavy scene: 59 to 60 fps, 0 to 1.7 % of frames over 20 ms (one War Room run showed 6.7 % while the machine was busy; three repeats gave 1.1 to 1.7 %), 0 overlaps, 0 console errors, no network request; the phone viewport (390 x 844, DPR 3) runs clean.
- Colour: the smallest pairwise CIE76 difference between the Union, Confederate and contested colours over normal vision and three simulated deficiencies is 22 to 29 in every variant; Union and Confederate differ by 15 to 21 L\* (so a black-and-white print still separates them, plus the silhouette). The simulation uses the Machado 2009 matrices as the author recalls them (not re-verified against the paper): indicative.
- Draw cost (`test/skin-bench.mjs`, `results/skin-bench-*.json`): `renderer.draw` p50 0.5 ms for the reference and 1.5 to 2.9 ms for the three families (0.5 to 1 ms for the minimal skin), p95 5 to 10 ms, unthrottled; under a 4x CPU throttle p50 11 to 18 ms against 3 to 6 ms for the reference, so on a weak phone the richer tiles will cost frame time (a sprite cache for the static parts is the known remedy and is not built).

## Contract gaps found while building (for the engine)

1. **No hover and no redraw request in the skin contract.** The renderer draws a hard, uneased hover ring itself and tells the skin nothing; the kit therefore listens to pointer events on `#map`, asks `window.__studio.engine.hit()`, and keeps the engine drawing while an ease runs by setting `engine.dirty` through the same test hook. It works (tested in Chrome) but a clean `env.hover`, `env.invalidate()` and a skin-owned hover would remove the bridge.
2. **`skin.fonts` is stored but never measured.** `app.mjs` measures `FONT_SPECS` only, whatever the skin declares, although the engine README says the layout measures the skin's fonts. These skins therefore use the engine's font table for the layout and condense text that renders wider (`g.text`); the 1863 skin's serif relies on that.
3. **The renderer caps the canvas at DPR 2.** A phone at DPR 3 gets a 2x canvas scaled 1.5x. The skins are resolution independent (tested at DPR 3) and would be crisp at 3 if the cap were lifted.
4. **The engine never idles in the default scene.** 2.5 s after the last input 188 of 391 display tiles still have a velocity above the idle threshold (measured with the reference skin too; cause not traced), so `engine.busy()` stays true and the page draws every frame while paused.
5. Data: Union divisions hang under the army, not their corps, in the registry nodes; the corps is in the division and brigade ids and designations, which is what `corpsFacts` reads. The dataset's `arm` of a brigade or division is a default (infantry unless the id says ART or CAV), not a registry value, so the skins draw formations without an arm.
