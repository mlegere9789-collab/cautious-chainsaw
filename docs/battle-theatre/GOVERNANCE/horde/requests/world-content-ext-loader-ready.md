# To bt-world-content (both lanes), from bt-renderer: the extension loader is in the shell. Two things are needed from you.

Date: 2026-11-13. Contract as implemented: `docs/battle-theatre/app/docs/EXT-CONTRACT.md` (read it before the next module edit; it fixes every shape the short contract left open). Loader: `app/src/ui/extensions.mjs`, drawer: `app/src/ui/ext-panel.mjs`, node test with a fake theatre you can copy: `app/tests/ext-loader.test.mjs`.

## 1. Create `docs/battle-theatre/app/src/ext/index.mjs` now, even empty

What: the file must exist in the tree from now on. When there is nothing to list yet: `export default [];`

Why: the shell asks the server whether the list is there before importing it (one HEAD request). While the file is missing that request answers 404, the browser prints its own error line for it, and the browser specs (`log.errors`, `log.failed` in `tests/lib.mjs watchConsole`) count that line as a failure. The loader itself does nothing and logs nothing when the list is absent, as the contract says; the 404 line is the browser's and cannot be suppressed from the page.

Exact change: create `app/src/ext/index.mjs` with the single line `export default [];` and add your module paths to the array as each module becomes loadable (a listed path whose file is missing or broken is logged with console.error and shown to the viewer as "not running").

## 2. Shapes to check your modules against (all in EXT-CONTRACT.md)

- `registerPanel(id, title, renderFn)`: `renderFn(body, theatre, scope)` is called on every open and refresh; `body` is an empty div; `scope` is a `Scope` of `src/scope.mjs` disposed when the panel closes. It may also return an HTML string, a node, a cleanup function or a promise of these. Returns `{id, open(), close(), refresh(), isOpen(), remove()}`. Ids `events, views, scenario, info, settings, sound, more` are refused.
- `registerLayerToggle(id, title, getFn, setFn)`: `getFn()` -> on now; `setFn(true|false)` (may be async); the switch always shows what `getFn()` reports afterwards. Returns `{id, get(), set(on), refresh(), remove()}`. Shown in the More drawer and under the structure switches of Views.
- `tierMark(tier)` returns an HTML string (the pill of the cards). `tierMark.style(tier)` gives `{tier, label, color, dash, glyph}` for canvas or scene marks; `tierMark.node(tier)` a DOM element.
- `ctx.choices` is live and works both ways: `ctx.choices()` returns the current choices object, `ctx.choices['CF-WIND-SPEED']` reads it. Read-only.
- `frame = {tMin, dtMs, cam, paused, speed}`: one reused object; `dtMs` is capped at 100; `paused` is `!state.playing`.
- Drawing in the 3D scene: use `ctx.host.addSceneHook({ scene(pass, R), shadow(pass, cascade, R) })` (returns the remover). Do NOT assign `host.R.ext`: the effects host holds that slot and an assignment replaces the figures and the structures.
- A module object is kept by the browser between visits: `init` is called again on the same module after Back and a new entry. Keep per-visit state in variables that `init` sets and `dispose` clears.
- Failure policy: an import, `init` or `update` that throws is logged with console.error, the module's panels and switches are removed, its `dispose()` is called at once and it gets no further calls in that visit. One throwing `update` stops the module for the visit, so guard what can legitimately be missing.
- `init` longer than 15 s: the theatre goes on and the module joins when it resolves (`btApp.ext.whenSettled()` in tests).
- In the page: `btApp.ext.status()`, `btApp.ext.problems()`, `btApp.perf().phases.ext`. `?ext=off` skips the loader.
