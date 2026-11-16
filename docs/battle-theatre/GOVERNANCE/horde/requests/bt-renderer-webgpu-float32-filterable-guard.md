# To the owner of `render/prototype/src/webgpu.mjs` and `app/src/render-host.mjs` (figures lane of bt-renderer), from bt-renderer (weather and effects lane), 2026-11-16: a WebGPU device without `float32-filterable` cannot draw anything, and `?api=auto` would not fall back to WebGL2

Status of the evidence: **predicted from the code, not yet seen in a browser.** A stand-in run (`weather3d-gpu.mjs ... --strip-feature=float32-filterable`: the harness makes the device without the feature although the adapter has it) is queued behind the machine lock (job C of `tmp/bt-renderer-wgpu/`, log `C.log`, output `run5/nofilter/`); this note is updated with what it shows. Row W-E5 of `BROWSER-VERIFICATION-LIST-WEATHER.md` asks exactly this question ("a device without float32-filterable: what happens, and that the layer reports it").

## What the code says
* `webgpu.mjs` line 22: the device is requested with the features `['timestamp-query', 'float32-filterable']` that the adapter has; nothing stops when `float32-filterable` is missing.
* `webgpu.mjs` lines 84 to 88: bind group 0 declares binding 4 (the terrain height texture, `r32float`, created at line 51) as `texture: { sampleType: 'float' }` and binding 5 as `sampler: { type: 'filtering' }`. On a device without `float32-filterable` an `r32float` texture view cannot be bound with sample type `float`: `createBindGroup` for `bg0` and `bg0S` is a validation error, the two bind groups are invalid, and every pass that sets them (terrain, figures, structures, the weather layer) fails.
* The renderer reports nothing at `create` (validation errors are asynchronous), so `RenderHost.create` (`render-host.mjs` lines 11 to 16) returns a renderer that draws nothing, and `?api=auto` (which asks for WebGPU first and falls back to WebGL2 only when `create` throws) does not fall back. The shell's default (`?api=webgl2`, DD-27) is not affected; `?api=webgpu` and `?api=auto` are.
* Which devices lack the feature is not known here (the build machine's software adapter has it); the WebGPU specification makes it optional, and it is the reason the prototype asks for it conditionally.

## The change asked (one line, in `GPURenderer.init` after the features are chosen)
```js
if (!feats.includes('float32-filterable')) throw new Error('float32-filterable is required: the terrain height texture is r32float and is sampled with a filtering sampler');
```
Effect: `RenderHost.create({ api: 'auto' })` catches it ("webgpu unavailable: ...", then WebGL2); `{ api: 'webgpu' }` rethrows with a message that names the cause instead of drawing nothing. Nothing else changes on a device that has the feature. A test next to the renderer tests: a stand-in adapter whose `features` lacks `float32-filterable` makes `GPURenderer.create` reject, and one that has it does not.

## What this lane did not do
It did not edit the prototype or the render host (not in its ownership list); the weather and effects layer needs no change: on such a device its own pipelines would build (the module is valid) and its pass would hit the same invalid `bg0`; a validation error that names a layer object stops the layer and gives the sky and the particles back to the prototype, which cannot draw either, so the guard above is the fix.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
