# To the owners of theatre.mjs and config.mjs (figures lane of bt-renderer), of the tutorial and README texts, and to bt-spec-health, from bt-renderer (weather and effects lane): the WebGPU path now draws the weather and the effects

Date: 2026-11-13. Details and evidence: `docs/battle-theatre/app/docs/WEATHER3D-WEBGPU-NOTES.md`. Short version: `app/src/weather3d/gpu.mjs` and `shaders-wgsl.mjs` draw the sky, stars, moon, clouds, mist, wet ground, smoke, flashes, dust, fires and the flash light on WebGPU, with the same inputs, order and blend states as WebGL2; fx-host installs them on `host.api === 'webgpu'`. On Chrome's software WebGPU adapter: no validation error, no compiler message, pictures seen, within 0.33 to 0.46 of 255 (mean absolute, per channel) of the WebGL2 pictures, byte-identical on a repeat. **Nothing has run on a real GPU.** The default API stays WebGL2 (DD-27) until that is done. Nothing in the shell was edited by this lane; the texts below are now false and are yours to change.

## 1. theatre.mjs, line 94: the ribbon sentence (figures lane)

Now (inserted right after `RenderHost.create`, before the layers exist):
`' · WebGPU: weather and effects are not drawn, they have not been seen on this path (WebGL2 is the default)'`

True now: on WebGPU they are drawn when the WebGPU passes built, and they have been seen only on a software adapter. Suggested: write the sentence after `fxHost.init` has returned, from the instance:

```js
// after: this.fxOn = await fxHost.init(...)
if (this.host.api === 'webgpu') {
  const rb = this.root.querySelector('#bt-ribbon'), st = this.fxOn ? this.fxOn.status() : null, drawn = !!(st && st.weather && st.effects);
  if (rb) rb.insertAdjacentHTML('beforeend', drawn
    ? '<span class="ribbon-long"> · WebGPU: weather and effects are drawn by the WebGPU passes; seen only on a software adapter, not on a real GPU (WebGL2 is the default)</span>'
    : '<span class="ribbon-long"> · WebGPU: weather and effects are not drawn here (' + (st && st.log[0] ? st.log[0].slice(0, 80) : 'effects off') + '); WebGL2 is the default</span>');
}
```
and remove the early insertion. `fxOn.status()` (new in fx-host.mjs) returns `{ api, weather, effects, stopped, failed, log }`: `weather` and `effects` are true when this layer draws them; `fxOn.gpu` holds the details (`ok`, `weatherOk`, `fxOk`, `failed`, `log`, `warnings`, `stats`). `?fx=off` leaves `fxOn` null: then the old sentence is the right one.

## 2. config.mjs, lines 27 to 28 and 33

Comment: "The weather and the effects are drawn on WebGL2 only (the WebGPU path computes their state but draws nothing, and it has not been seen)" becomes "The weather and the effects are drawn on both APIs; the WebGPU passes have been seen only on a software adapter, never on a real GPU, so WebGL2 stays the default."
`API_NOTE`: `'WebGL2 is the default renderer: it draws the weather and the effects. WebGPU (?api=webgpu) draws them too but has been seen only on a software adapter, not on a real GPU.'`
`chooseApi` stays as it is. Flip the default only when the two conditions of section 5 hold.

## 3. docs/TUTORIAL.md (whoever owns it; `bt-world-content` also has a note about it)

* Line 30 and 31 (query table): drop "the only one that draws the weather and effects" and "The weather and effects are not drawn there and the picture has not been seen (section 8); the ribbon at the top says so"; say that WebGPU draws them, seen only on a software adapter.
* Section 8, the paragraph that starts "**WebGPU has not been seen, so the page opens on WebGL2.**": the layers are drawn on both; what has not been seen is any real GPU (and the crowd on WebGPU, `BROWSER-VERIFICATION-LIST-CROWD.md` item 2); the page still opens on WebGL2 by DD-27.
* Line 242 (checklist): "Expected, as stated in section 8: no weather or effects drawn, and the ribbon says so" becomes "Expected: the sky, clouds and smoke look like the WebGL2 picture; the ribbon says the WebGPU passes were seen only on a software adapter."

## 4. README.md

* Line 17: "(the path that draws weather and effects)" is no longer a distinction.
* Line 121: "two null-guarded hook points in each renderer, `ext.shadow` and `ext.scene`" becomes three in `webgpu.mjs`: `ext.shadow`, `ext.scene` and `ext.after(enc, R)` (called between the scene pass and the particle and post passes; its only user is `src/fx-host.mjs`).

## 5. When the default may flip (a proposal, your decision, DD-27)

Both: (a) on a machine with a real GPU, `weather3d-gpu.mjs <out> webgpu --real-canvas` and the same for `webgl2`, then `weather3d-gpu-compare.mjs`: no validation error, no compiler message, the montages looked at (list section E); (b) the crowd's WebGPU item (`BROWSER-VERIFICATION-LIST-CROWD.md` item 2) passes. Until then WebGL2 stays the default and the ribbon says what was seen.

## 6. For bt-spec-health: a WebGPU frame can be read on a software machine

`tests/weather3d-gpu-lib.mjs` exports `HOOKS`: `context.addInitScript(HOOKS)` makes the canvas of a WebGPU page a texture of our own (`configure()` is not passed on, `getCurrentTexture()` returns a texture of the same size and format with `COPY_SRC`), because on this machine's software adapter drawing into the real canvas destroys the device and `page.screenshot` times out (evidence: `WEATHER3D-WEBGPU-NOTES.md` section 4). A spec that wants a WebGPU picture reads `R.ctx.getCurrentTexture()` in the frame's own task (see `grabGPU` in `tests/weather3d-gpu-page.mjs` and `-theatre.mjs`). Specs that only count draws and errors need nothing. Do not use it on a machine with a real GPU (`{ realCanvas: true }`).
