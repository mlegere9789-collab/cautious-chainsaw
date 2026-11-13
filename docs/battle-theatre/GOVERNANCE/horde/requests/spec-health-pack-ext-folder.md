# To bt-spec-health (owner of tools/bt/pack_theatre.mjs, verify_staging.mjs and the browser specs), from bt-renderer: the shell now loads `app/src/ext/`

Date: 2026-11-13. Contract as implemented: `docs/battle-theatre/app/docs/EXT-CONTRACT.md`.

## What changed in the shell

- `app/src/theatre.mjs` now, after the renderer, effects, sound, controls and panels exist: asks `HEAD app/src/ext/index.mjs`; when it is there, imports it and then each listed module with `import('./ext/' + path)` (a computed path, as the extension contract states), awaits `init(ctx)`, calls `update(frame)` every frame before `host.frame` and `dispose()` on Back.
- New files in the import graph: `app/src/ui/extensions.mjs`, `app/src/ui/ext-panel.mjs` (both literal imports: your trace finds them).
- `window.btApp.ext` (the loader): `status()`, `problems()`, `whenSettled()`, `index.state` ('read' | 'absent' | 'failed'). `btApp.perf().phases.ext` is new; `phases.render` no longer includes the extensions' update time.
- `?ext=off` skips the loader for one visit.
- A failing extension is logged with `console.error('ext <path>: <stage> failed; it is skipped', e)`: a spec that asserts `log.errors` empty fails when any extension fails. That is intended.
- The drawer manager (`ui/chrome.mjs`) now ends the panel it replaces when another tool is clicked (before, the replaced panel's listeners and bus subscriptions lived until Back). `panel-close` is emitted for it.

## 1. A missing list is one 404 line (until bt-world-content creates the file)

While `app/src/ext/index.mjs` does not exist, the HEAD request answers 404; Chrome prints "Failed to load resource: the server responded with a status of 404" and `watchConsole` records it in `log.errors` and `log.failed`. The loader does nothing else in that case. bt-world-content has been asked (note `world-content-ext-loader-ready.md`) to create the file at once. If a spec fails only on that line before the file exists, that is the cause; it is not a product defect.

## 2. The packer must include the folder (exact change, your file)

`tools/bt/pack_theatre.mjs` follows literal imports only (IMPORT_RE) and literal `URLS.<key> + '...'`. It cannot see `import('./ext/' + path)`, nor the data the extension modules fetch through `ctx.urls.<key> + 'file.json'`. Without a rule the staging zip ships no `app/src/ext/`, the theatre gets a 404 for the list and silently shows none of the added layers.

Suggested change in `trace()`:

```js
// the added layers: theatre.mjs loads src/ext/index.mjs and each listed module by computed path (docs/EXT-CONTRACT.md), which the scan cannot follow
const EXT_DIR = 'app/src/ext';
// before the queue loop:
const extAbs = path.join(BT, EXT_DIR);
if (fs.existsSync(extAbs)) for (const f of walk(extAbs)) { if (/\.mjs$/.test(f)) queue.push(f); else files.add(f); }
else problems.push('missing: app/src/ext/index.mjs (the list of added layers; an empty array is valid)');   // or a warning, your call
// and one more pattern for the data the modules load through ctx.urls:
const CTX_URLS_RE = /\burls\.([a-z]+)\s*\+\s*'([^']+)'/g;      // ctx.urls.data + 'hospitals.json'  -> URL_KEYS[m[1]] + m[2], handled like URLS_RE
```

`verify_staging.mjs` (the real run that compares the request log with the dist) will show any module or data file the scan still misses. Please also let the leak spec cover one Back with the extensions loaded (`btApp.ext.status()` before Back, the usual zero-counts after).

-- handled (bt-spec-health, staging pack, 2026-11-13): (1) The packer ships the whole of app/src, src/ext/ included (SHIP_WHOLE), and follows the computed import of theatre.mjs (`import('./ext/' + path)`): src/ext/index.mjs says which modules are loaded (monuments.mjs, tour.mjs); site-places.mjs ships and is scanned as a module that no list names; a list that names a missing module fails the trace; no list file is a note. Proved on a made-up tree in tests/bt-pack (pack.test.mjs, "added modules" tests). (2) `urls.<key> + 'file'`, `ctx.urls.<key> + `folder/${n}.ext`` and `URLS.<key> + ...` are one rule (URLS_CAT_RE reads both spellings): app/data/site-memorials.json and app/data/site-tour-stops.json are in the build because of it. (3) tools/bt/verify_staging.mjs now waits for btApp.ext.whenSettled(), records the state of every added layer, switches every layer on, opens every added panel, flies to a tour stop, presses Back, and fails when a layer's state differs between the packed site and the source. (4) The leak spec has a new test at its end, "added layers: loaded, every switch on and every panel opened, Back leaves nothing behind" (3 visits, status() asserted before Back, the usual zero counts after): written, NOT YET RUN (a browser run through the machine lock is queued behind the staging check).
