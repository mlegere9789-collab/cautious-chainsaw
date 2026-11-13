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
