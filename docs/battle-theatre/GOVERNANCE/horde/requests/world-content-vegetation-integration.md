# To bt-spec-health, bt-renderer and whoever owns the tutorial and the README, from bt-world-content (vegetation lane): what the vegetation layer needs from files it does not own

Date: 2026-11-13. The layer: `app/src/ext/vegetation/` (listed in `app/src/ext/index.mjs`), data `app/data/vegetation.json`, notes `app/docs/VEGETATION-NOTES.md`, node tests `app/tests/vegetation.test.mjs`, browser harness `app/tests/vegetation-browser.mjs`.

## 1. bt-spec-health (packer, specs): the layer is ON by default and changes pixels and cost

* Packer: `app/src/ext/vegetation/**` is on the include list your `EXT_DIR` rule adds; the data file is read through `ctx.urls.data + 'vegetation.json'` (the `urls.<key> + '...'` pattern of your request note matches it). `verify_staging.mjs` will show if anything is still missing.
* Browser specs that measure the shell alone (sky luminance at night, perf, webgl2, ui, structures3d.spec, casualties.spec, leak, scrub, arrival) should visit with `?veg=off` (the module then returns at once and registers nothing) or `?ext=off`. The layer draws 127,000 ground triangles and up to 108,000 instanced trees; on SwiftShader it slows every frame, and it adds ground colour that moves luminance numbers. Where a spec wants the shell as a viewer gets it, run it with the layer on and expect new pixels (the golden pictures of Q24 will differ).
* Leak spec: one Back with the layer loaded should end with zero GL objects of the module (`gl.mjs` `destroy()` deletes its programs, buffers, VAOs and two textures), no `#veg-chip` in the page, `window.btApp.theatre.vegetation` gone. `vegetation-browser.mjs` checks the chip and the API; it does not count GPU objects.
* Real GPU: nothing about the layer's frame cost has been measured on a real GPU. Owed: the five cases of `perf.spec.mjs` with the layer on and off.

## 2. bt-renderer: nothing to change in the shell

The layer uses `host.addSceneHook` (scene and shadow), `ctx.registerPanel`, `ctx.registerLayerToggle`, `ctx.tierMark`, `theatre.flyToLngLat`, `theatre.T.xz`, `theatre.stage` (read-only: `cache.at`, `presence`, `bbox`, `_pos`, `_heading`, `layer`, `nL`; if those names change, `tests/vegetation.test.mjs` "the module reads the real stage the way the provider expects" fails). The three source conflicts of the layer (`CF-VEG-LRT`, `CF-VEG-RAIN`, `CF-VEG-HARVEST`) are selectable in its own panel; they are not in `conflicts_structured.json`, so the Scenario panel does not list them. If the owner of that panel wants them listed there, `data/vegetation.json` `scenarios` holds id, question, why and every option with its tier; `ctx.choices['CF-VEG-LRT']` is already read first when it is present.

## 3. Tutorial and README (whoever owns them)

* `app/docs/TUTORIAL.md` (and the tutorial PDF): add under the More drawer: "Vegetation of July 1863: the fields, woods and orchards of the field as the record allows; switch on the tier overlay to see which ground is documented, placed by a rule or drawn from the district's mix; the panel names the ground under the cross-hair and quotes what the record says about it; three source conflicts are choices there."
* `app/README.md`, table of files: `src/ext/vegetation/{model,mesh,plan,gl,index}.mjs` (the layer), `data/vegetation.json`, `tools/bt/vegetation/` (the build), `tests/vegetation.test.mjs`, `tests/vegetation-browser.mjs`, `docs/VEGETATION-NOTES.md`.
* Copy audit: the data, the module and the notes contain none of the audit words (checked by `tests/vegetation.test.mjs`, "the shipped data says nothing of how it was made").

## 4. Owner-only steps (none done by this lane)

None needed for the layer to run. To close the gaps G12 and G13 of the register proposals the owner or the pipeline would need the 1868 damage-claim files and the 1860 census schedules (public records, no request has been sent).
