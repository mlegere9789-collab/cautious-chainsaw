# Skins of the d3 fork

| file | what it is |
|---|---|
| `d3.mjs` | the Precision Field Manual: `layoutOf()` (the geometry, and so the footprint), `paintMark()` (the one drawing of a mark, used by the tiles and by the legend), `pin`, `leader`, `hull`, `sample` (the legend), `makeD3Skins(json)` (builds the family d3, d3/day, d3/cvd, d3/contrast from `tokens/d3.skin.tokens.json`) |
| `kit.mjs` | the prototype's skin kit (eased hover and selection, arrival progress, pixel snapping, the legend generator, live token tweaking); the fork changed three things, listed in `FORK.md` |
| `semantics.mjs`, `glyphs.mjs` | the honest channel layer (what may be drawn, with its evidence label) and the arm symbols; the fork reworded the legend sentences that described the old designs |
| `contract.mjs` | the skin contract and the conformance check (ink inside the footprint); `reference.mjs` is the engine's own test skin, `production.mjs` the reproduction of the shipped tiles for the Before view |
| `_template.mjs` | the smallest conforming skin |

A designer changes `tokens/d3.skin.tokens.json` (colours, sizes, motion, the zoom of the name form), runs `node build.mjs`, and reloads. See `../../SPEC.md`, section 11.
