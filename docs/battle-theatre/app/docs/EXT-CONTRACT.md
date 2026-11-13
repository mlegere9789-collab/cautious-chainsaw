# EXT-CONTRACT: added layers and panels (`src/ext/`)

Code: `app/src/ui/extensions.mjs` (the loader, the two registries, `tierMark`, the live `choices`), `app/src/ui/ext-panel.mjs` (the More tool and drawer, the switches, the frame of an added panel), wired in `app/src/theatre.mjs` (start, frame loop, Back), `app/src/ui/chrome.mjs` (the drawer opens added panels), `app/src/ui/panels.mjs` (the switches under the structure switches of Views), `app/src/render-host.mjs` (`addSceneHook`), `app/index.html` (the More tool), `app/styles.css`. Tests: `app/tests/ext-loader.test.mjs` (node), `app/tests/ext-loader-browser.mjs` (browser harness, software GL). What was run and what was not: section 12.

## 1. The contract

`src/ext/index.mjs` default-exports an array of module paths relative to `src/ext/`. After the render host, the effects host and the audio host exist, `theatre.mjs` does for each path, inside try/catch (a failing module is logged to the console and skipped, never fatal):

```js
const m = await import('./ext/' + path);
await m.init(ctx);            // when present
```

Every frame, before `host.frame`, it calls `m.update(frame)` when present, with `frame = {tMin, dtMs, cam, paused, speed}`. On Back it calls `m.dispose()`.

`ctx = {theatre, host, state, env, history, structures, urls, choices, registerPanel(id, title, renderFn), registerLayerToggle(id, title, getFn, setFn), tierMark(tier)}`.

When `src/ext/index.mjs` does not exist the loader does nothing. The loader and the two register functions are the shell's (`theatre.mjs` and `src/ui`); the modules and `src/ext/index.mjs` are the content side's. Exported pure check functions for the gate runner are listed in `docs/GATE-HOOKS.md` (module path, function, inputs, output).

Everything below says how the shell reads each word of that paragraph. Nothing below adds a duty for a module beyond it, except the rules of section 9, which are the project's own.

## 2. The list: `src/ext/index.mjs`

```js
export default ['monuments.mjs', 'vegetation/index.mjs'];
```

* A path is a string relative to `src/ext/` (a leading `./` is dropped; sub-folders are fine). An entry that is not a string, is empty, is absolute, has a scheme, contains `..` or names `index.mjs` itself is refused: logged, listed as not running, and the rest of the list goes on. A path listed twice is started once (a warning is logged).
* The order of the list is the order of `init`, of `update` within a frame, and of the panels and switches in the drawer. `dispose` runs in the reverse order.
* A default export that is not an array, or a list file that does not parse, is logged (`console.error`), shown in the More drawer as "The list of added layers could not be read", and nothing is added. A list that does not answer within 15 s (`INIT_WAIT_MS`) counts as failed in the same way, so a stalled request never holds the loading card; a check for the list (the `HEAD` request below) that does not answer in that time is passed over and the import decides.
* **No list file: nothing happens.** The shell asks the server whether the file is there before importing it (one `HEAD` request), so a missing list is told from a broken one. A browser prints its own "404" line for that request, and the browser specs count such a line as an error: **keep the file in the tree, with an empty array when there is nothing to add**.
* The address `?ext=off` skips the loader for one visit (like `?fx=off`, `?structures=off`, `?crowd=off`).
* The staging packer follows literal imports only. It does not see `import('./ext/' + path)`: `app/src/ext/**` and the data the modules load must be on its include list, and its real-run check shows whatever is still missing.

## 3. A module

```js
// src/ext/example.mjs
let ctx = null, on = false, off = null;
export async function init(c) {            // once per visit; awaited
  ctx = c;
  const data = await (await fetch(c.urls.data + 'example.json')).json();
  c.registerLayerToggle('example', 'Example marks', () => on, v => { on = v; });
  c.registerPanel('example', 'Example', (body, theatre, scope) => { body.innerHTML = `<p>${data.rows.length} rows ${c.tierMark('inferred')}</p>`; });
  off = c.host.addSceneHook({ scene(pass, R) { if (on) { /* draw */ } } });
}
export function update(frame) { /* frame.tMin, frame.dtMs, frame.cam, frame.paused, frame.speed */ }
export function dispose() { if (off) off(); off = null; ctx = null; on = false; }
```

All three exports are optional. A module that has none of them as named exports may instead default-export an object that has them.

**Life of a module in one visit**

1. `import('./ext/' + path)`. An import that fails (file missing, syntax error, a broken import inside it) is logged and the module is skipped.
2. `await init(ctx)`. The modules start one after another, in list order, after the renderer, the effects, the sound, the controls, the 2D overlay and the panels exist, and before the theatre reports ready (the loading card reads "Starting the added layers (2 of 5)"). An `init` that throws or rejects: logged, skipped.
3. `update(frame)` once per drawn frame, after the stage, the structures, the effects and the sound have been brought to the frame's time and before `host.frame` draws. Never before `init` has resolved, never after `dispose`. An `update` that throws (or returns a promise that rejects): logged, and the module is stopped for the rest of the visit.
4. `dispose()` on Back (also when the page is left by the browser's Back), before the page scope, the effects, the sound and the renderer are torn down: the canvas, the GL context, the bus and the page are still there. It is called once. It must be synchronous: a returned promise is not awaited (a rejection is logged). After it the module must hold nothing: no listener, timer, animation frame, worker, GPU object, DOM node or reference to `ctx`.

**A module is one object for the whole page, not for one visit.** The browser keeps an imported module, so leaving and entering the theatre again calls `init` again on the same module: put the state of a visit in variables that `init` sets and `dispose` clears.

**What "skipped" means.** A failing module is logged with `console.error('ext <path>: <import|init|update> failed; it is skipped', error)`, every panel and switch it registered is removed, its `dispose()` is called at once when its `init` had been entered (so that it takes away what it drew; a `dispose` that throws is logged as a warning), it gets no further calls, and the More tool shows a dot (its accessible name says it too: "More, 1 part of the page not running") and lists it under "Not running in this visit" with the reason. The theatre goes on. The viewer is told that something is missing; nothing is concealed.

**A slow start.** The theatre waits 15 s (`INIT_WAIT_MS`) for one module's `init`. After that it goes on without waiting (a warning is logged, the drawer lists the module as "still starting"), and the module joins when its `init` resolves: its `update` calls begin then. If the visit ends first, `dispose()` is called as soon as that `init` settles. Tests that need every module can `await btApp.ext.whenSettled()`.

## 4. `ctx`

One frozen object per module with exactly these keys. The values are the theatre's own live objects.

| key | what it is |
|---|---|
| `theatre` | the `Theatre` of this visit (`src/theatre.mjs`). Section 10 lists the members that are useful to a module today. |
| `host` | the `RenderHost` (`src/render-host.mjs`): `host.api` (`'webgl2'`, the default, or `'webgpu'`), `host.R` (the renderer), `host.world`, `host.canvas`, `host.crowd`, `host.addSceneHook(hook)` (section 8). |
| `state` | `theatre.state`: `t` (minutes on the theatre clock), `chapter`, `playing`, `speed`, `rate`, `scenario`, `overlay`, `selected`, `selectedObj`, `layers`, `settings`, `panel`, `structPD`. Read it; change time, play and speed through `theatre.setTime / setPlaying / setSpeed`. |
| `env` | the `Environment` (`src/environment.mjs`): `sample(tMin)`, `weatherAt(tMin, choices)`, `sunEvents(tMin)`, `light(...)`. |
| `history` | the history layer (`theatre.layer`, contract in `data-contract.md`): `units`, `objects`, `figures`, `meta` (`meta.stub` is true on the placeholder layer of `?history=stub`), `counts`. |
| `structures` | the `Structures` of `src/structures/index.mjs`, or `null` when they are off (`?structures=off`) or failed to load. |
| `urls` | a frozen copy of `URLS` (`src/config.mjs`): `app`, `proto`, `gov`, `env`, `data`, `hist`, `structures`, `kit`. Each ends in `/`. Load data with `urls.data + 'file.json'`. |
| `choices` | the viewer's choices on the source conflicts, **live**. It can be called (`choices()` returns the current object, conflict id to option key) and read like that object (`choices['CF-WIND-SPEED']`, `'C-004' in choices`, `Object.keys(choices)`, `{...choices}`). Both always show the choices in effect now. It cannot be written to. When a choice changes the theatre emits `'scenario'` on `theatre.bus`. |
| `registerPanel(id, title, renderFn)` | section 5 |
| `registerLayerToggle(id, title, getFn, setFn)` | section 6 |
| `tierMark(tier)` | section 7 |

## 5. `registerPanel(id, title, renderFn)`

Adds a panel to the drawer. The viewer reaches it through the **More** tool of the top bar, which appears as soon as a panel or a switch is registered; `theatre.openPanel(id)` opens it from code (a second call closes it, as for the shell's own panels).

* `id`: a non-empty string, unique among the added panels. The names of the shell's own panels (`events`, `views`, `scenario`, `info`, `settings`, `sound`) and `more` are refused. Registering an id another module holds throws; registering your own id again replaces the title and the function (an open panel is redrawn).
* `title`: the heading of the drawer and the label in the list.
* `renderFn(body, theatre, scope)` is called each time the panel is opened or refreshed. `body` is an empty `<div>` inside the drawer; `scope` is a `Scope` (`src/scope.mjs`: `scope.on(target, type, fn)`, `scope.add(cleanupFn)`, `scope.timeout`, `scope.interval`, `scope.raf`) that is disposed when the panel closes, is refreshed or is replaced by another panel, so listeners registered through it need no cleanup. Use `theatre.bus.on(name, fn, scope)` for bus subscriptions.
* It may draw into `body` and return nothing, or return an HTML string (it replaces the content of `body`), a DOM node (appended), a cleanup function, an object with `dispose()`, or a promise of one of these. An element with the attribute `data-autofocus` receives the focus.
* A returned cleanup (and everything put on `scope`) runs when the panel closes, is refreshed or is replaced by another panel. A result that arrives after that, from a promise, is not drawn, but a cleanup it carries is still called at once, so nothing the module made for that drawing is left behind. A promise that rejects after that is logged with `console.error` and shown nowhere.
* A `renderFn` that throws or rejects is logged and the panel shows "This panel could not be drawn" with the message; the theatre goes on and the module stays running.
* The call returns `{ id, open(), close(), refresh(), isOpen(), remove() }`.
* Above the module's drawing the drawer shows a button back to the list of added layers and panels. Escape closes the drawer and returns the focus to the More tool.

A registration made outside `init` (later, from an event) works the same way. A registration from a module that is not running, or after Back, throws.

## 6. `registerLayerToggle(id, title, getFn, setFn)`

Adds a labelled switch (a checkbox). It is shown in the More drawer under "Layers" and in the Views drawer under the structure switches ("More layers").

* `getFn()` returns whether the layer is on **now**; it is called when the list is drawn and after every change. Anything truthy is on. A `getFn` that throws is logged once and read as off.
* `setFn(on)` is called with `true` or `false` when the viewer switches it; it may return a promise, which is awaited. Afterwards the switch shows what `getFn()` reports, so a module that refuses a change simply keeps reporting the old state. A `setFn` that throws or rejects is logged; the viewer hears "could not be switched".
* The theatre announces "`<title>` shown." or "`<title>` hidden." to screen readers and emits `'layer'` (`id`, state) and `'ext-toggle'` (`id`) on `theatre.bus`.
* A layer that is off by default is simply one whose `getFn` returns false after `init`.
* The call returns `{ id, get(), set(on), refresh(), remove() }`: `set` switches as the viewer does; call `refresh()` when the state changed for another reason, so that an open drawer follows.
* Ids are unique among the switches, with the same rules as for panels (a panel and a switch may share an id).

## 7. `tierMark(tier)`

Returns the tier marking as an HTML string: the pill the unit and object cards use (glyph and label, so the tier never depends on colour alone), `<span class="pill" data-tier="inferred">…Inferred</span>`. Use it for everything that is not documented, and for documented content where the tier is shown.

* The four tiers are `documented`, `inferred`, `plausible-procedural`, `open gap` (`tierMark.tiers`). The spellings `open`, `gap`, `open_gap`, `plausible_procedural` map to them.
* A longer statement (`'documented (secondary)'`, `'hats documented; leggings open; rest plausible-procedural'`) is marked with the **weakest** tier it names and the whole statement stays visible beside the pill; "not documented" does not count as documented. A mark never says more than the statement.
* Anything else (empty, a status word such as `seeded_unverified`, not a string) gives a dashed pill "Tier not stated: …". It never throws and it escapes the text.
* `tierMark.tier(tier)` gives the tier name or `null`; `tierMark.label(tier)` the label; `tierMark.style(tier)` gives `{ tier, label, color, dash, glyph }` for marks drawn on a canvas or in the scene (use the dash pattern and the glyph, not colour alone); `tierMark.node(tier)` gives a DOM element (browser only).

## 8. `frame`, and drawing in the picture

`update(frame)` receives one object with exactly five fields:

| field | meaning |
|---|---|
| `tMin` | the theatre clock in minutes (`state.t`, `src/clock.mjs`); seconds = `tMin * 60`. The stage, the structures, the effects and the sound are already at this time. |
| `dtMs` | wall milliseconds since the previous drawn frame, capped at 100 (the cap the shell's own step uses). For easing only: what is drawn must be a function of `tMin` and `cam`. |
| `cam` | the camera (`render/prototype/src/camera.mjs`): `x, y, z` (x east, y up, z south, metres), `yaw`, `pitch`, `fov` (radians), `near`, `far`, `fwd`, `right()`, `up()`. The same object the renderer is given. |
| `paused` | `true` while play is off (`!state.playing`). Time can still move by scrubbing or a jump. |
| `speed` | the chosen speed (1 = real time; 0.25 to 60). |

The object is reused from frame to frame and filled again for each module: read it, do not keep it.

**Geometry in the scene.** The renderer has one slot (`R.ext`) which the figures, the structures and the effects already share. **Never assign `host.R.ext`**: that removes the structures or the figures from the picture. Use

```js
const remove = ctx.host.addSceneHook({ scene(pass, R) { … }, shadow(pass, cascade, R) { … } });   // either function may be left out
```

`scene` is called inside the scene pass (HDR target with depth, the frame uniform block bound at point 0), after the figures and the structures and before the weather and the smoke are laid over the picture, so hooked geometry is fogged, lit and covered by smoke like everything else; `shadow` is called inside each of the two shadow passes. `pass` is the `WebGL2RenderingContext` when `host.api === 'webgl2'` and the `GPURenderPassEncoder` when it is `'webgpu'`; `R` is the renderer (`render/prototype/src/webgl2.mjs` or `webgpu.mjs`). On WebGL2 restore the state you change (program, VAO, textures of the units you use, blend, cull, depth mask). `src/structures/gpu.mjs` and `src/crowd/gl.mjs` are working examples of both functions. A hook that throws is removed and logged, and the frame goes on. Call `remove()` in `dispose()`; the renderer drops every hook when it is destroyed. WebGL2 is the default renderer; a module that draws on WebGL2 only must say so in its notes and draw nothing on WebGPU.

**2D marks.** `theatre.overlay.project(X, Y, Z, out)` writes the screen position in CSS pixels of the stage into `out[0]`, `out[1]` (and the depth into `out[2]`) and returns false for a point behind the camera; use it for marks on a module's own element. `theatre.root` is the page of the visit (append to it, remove in `dispose`).

## 9. Rules a module keeps

* **Tier marking.** Everything that is not documented carries its tier (`tierMark`) where the viewer sees it; a gap is shown as a gap, never hidden; a source conflict stays selectable, and the module follows `ctx.choices`.
* **Nothing before its time.** Nothing appears before its earliest documented time; what existed before the battle is never given a construction animation; a later memorial is never drawn as an 1863 object.
* **Same time and camera, same pixels.** Draw as a pure function of `frame.tMin`, `frame.cam`, the choices and the layer switches. No `Math.random`, no wall clock in what is drawn; variation comes from seeded data.
* **No capping.** A module never reduces the number of soldiers drawn.
* **Clean console.** The browser specs fail on any `console.error`, on unexpected warnings and on any failed request. Do not request files that may be missing.
* **Leave nothing behind** (section 3, `dispose`). No global variable, no listener on `window` or `document` outside `theatre.scope` or a panel `scope`.
* **Wording.** No text in a module, its data or its panel says how the page was produced, and the words the copy check of `tests/real.spec.mjs` lists stay out of the page.

## 10. Useful members of the theatre today

Not part of the contract; they are what the shell's own panels use. `theatre.bus.on(name, fn, scope)` with the events `'time'`, `'tick'`, `'frame'` (argument: seconds), `'scenario'`, `'select'` (unit index or -1), `'select-obj'`, `'event'`, `'play'`, `'speed'`, `'camera-settled'`, `'resize'`, `'panel-open'`, `'panel-close'`, `'layer'`, `'ext'` (a registration changed); `theatre.scope` (ends with the visit); `theatre.announce(text)` (screen readers); `theatre.setTime(min, {say})`, `setPlaying`, `setSpeed`, `jumpEvent(row)`; `theatre.geo.xz(lng, lat)` and `geo.inside(x, z, margin)`; `theatre.T.h(x, z)` (ground height); `theatre.flyToLngLat(lng, lat, {dist, height})`, `theatre.controls.flyTo(view)`; `theatre.select(unitIndex)`, `theatre.selectObject(oid)`; `theatre.timeline`, `theatre.conflicts`, `theatre.bookmarks`; `theatre.stage` (per-frame unit table); `theatre.openPanel(id)`, `theatre.closePanel(restoreFocus)`; `theatre.reduceMotion`.

## 11. Checking a module

* **Node, with a fake ctx.** A module that keeps DOM and GPU calls inside functions can be imported in node. `tests/ext-loader.test.mjs` shows a fake theatre (`{host, state, env, layer, structs, bus, PANELS, …}`) and runs real module files through the real loader: `new Extensions(fakeTheatre, { importer: p => import(base + p) })`, then `load()`, `update(tMin, dtMs, cam, paused, speed)`, `dispose()`, `status()`, `problems()`. `drawAdded(p, box, th, fail, drawn)` of `src/ui/ext-panel.mjs` is one drawing of an added panel with no page needed: the test hands it a stand-in box and checks every form a panel function may return (section 5).
* **In the page.** `btApp.ext.status()` lists every module: `{ path, state ('loading' | 'running' | 'failed' | 'stopped'), stage, error, late, initMs, updateMs, updateMaxMs, updates, panels, toggles }`; `btApp.ext.problems()` is what the drawer shows; `btApp.ext.index.state` is `'read'`, `'absent'` or `'failed'`; `btApp.perf().phases.ext` is the longest time one frame spent in all `update` calls together.
* **Browser harness.** `node app/tests/ext-loader-browser.mjs [outDir] [light|full]` serves the shell, answers `src/ext/index.mjs` and two stand-in modules from memory (nothing is written into `src/ext/`, and whatever is there is not loaded by this run), and checks: no list, `?ext=off`, the tool and its name, the switches, a panel, every form a panel function may return, a failing module, the Views block, `update`, the scene hook, Back and a second entry. `light` (default) turns off the figures, the structures and the effects; `full` is the shell as a viewer gets it and walks only the stand-in visit and the second entry. One browser at a time on a shared machine.

## 12. Status

See the end of this file's history in `GOVERNANCE/progress.md` for the dated record. As of the last edit of this file:

* Node: `tests/ext-loader.test.mjs` covers the list, the three calls and their order, failure isolation, the slow start, Back during a start, both registries, `tierMark`, `choices`, the drawer HTML and the wiring order in `theatre.mjs`.
* Browser: `tests/ext-loader-browser.mjs` on software GL (WebGL2). Nothing here has run on a real GPU, and no timing is claimed.
* Not built: a persistent on/off state of the switches between visits; picking of objects a module draws (a module does its own); a retry of a failed module without leaving the theatre.
