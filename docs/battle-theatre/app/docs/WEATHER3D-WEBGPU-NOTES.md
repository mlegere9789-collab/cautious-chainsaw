# WebGPU path of the weather and effects layers

Written 2026-11-13. Code: `app/src/weather3d/gpu.mjs`, `app/src/weather3d/shaders-wgsl.mjs`, the host side in `app/src/fx-host.mjs`, one hook in `render/prototype/src/webgpu.mjs`. Register entry EG-W3D-G08 (the path used to compute state and draw nothing). **Everything below was run on Chrome's software WebGPU adapter (SwiftShader). Nothing has run on a real GPU, no real-GPU timing was taken, and none is claimed.** Real-hardware checks are listed in `BROWSER-VERIFICATION-LIST-WEATHER.md` section E.

## 1. What it draws

The same layers as the WebGL2 path (`weather3d/gl.mjs`), from the same inputs (the `WeatherTimeline` state, the fx3d frame, the prototype `Camera`), in the same order with the same blend states:

| Layer | WebGL2 | WebGPU |
|---|---|---|
| sky gradient, sun glow, twilight glow, stars, moon with phase, cloud layer, night floor on the sky | `WEATHER_FS` (GLSL), draw MUL then ADD | `WEATHER_WGSL` (WGSL), pipelines `weather3d-mul` and `weather3d-add` |
| undo of the prototype's baked fog, this layer's fog, wet ground and puddles, light of flashes and fires | same fragment code | same |
| smoke, muzzle flash, shell bursts, clods, dust, fire flames, fuse sparks, soft particles against the scene depth | `GLSL_VERT/FRAG` of fx3d, one instanced draw | `WGSL_RENDER` of fx3d (depth read patched), pipeline `fx3d-sprites`, one instanced draw |

The WGSL is a port statement for statement; it differs only where the API does (WebGPU depth is 0..1 so there is no `* 2 - 1`; the frame block is the prototype's bind group 0; the mode is a module constant, two modules; the hash is one function). `tests/weather3d-gpu.test.mjs` pins this: every numeric constant of the GLSL is in the WGSL and the other way round (the count differences are exactly the hash refactor and the clip conversion), the uniform block has the member order and offsets the packer writes, and `packWeather` writes exactly the values `gl.mjs` sends to the WebGL2 program (the real `gl.mjs` code runs against a recording stand-in for the GL context), for five scenes and 0, 3, 16 and 20 lights.

## 2. How it is wired

* `render/prototype/src/webgpu.mjs` calls `this.ext.after(enc, this)` between its scene pass and its particle and post passes (one line, null-guarded, absent from the prototype's own use; the WebGL2 renderer needs no such hook because its `ext.scene` runs inside the scene pass).
* `fx-host.mjs` chains `after` after whatever hook the renderer holds (the figures and structures use `scene` and `shadow`; they keep working in either order of attachment), switches the prototype's own sky and particle passes off (`R.o.flags.sky`, `R.o.flags.particles`) **only when the new pipelines built**, and restores them in `dispose()` or when a validation error names this layer (`gpu.failed`; the state is still computed).
* `GPUPasses.draw(enc, W, fr, cam, flags)` encodes ONE render pass: colour = the HDR target, `loadOp: 'load'`; depth = the scene depth attached read-only (`depthReadOnly: true`) and sampled in the same pass (a read-only attachment and a sampled binding are both read-only usages), so no depth copy is needed (WebGL2 blits the depth to a copy). Inside: group 0 = the prototype's frame block (dynamic offset 0), group 1 = this pass's uniforms and the depth view; two full-screen triangles (multiply: `dst * D`, add: `dst + A`, so `dst_final = dst * D + A` per channel, as on WebGL2), then one `draw(4, nSprites)` of the sprites (triangle strips, `depthCompare: 'less'`, no depth write).
* Bytes held (laptop tier, 12,288 event slots): about 1.24 MB (event storage 1.19 MB, cumulative counts 49 KB, wind history 2 KB, two uniform blocks). Resize: the bind groups hold the renderer's depth view and are rebuilt when it changes. `stats.passMs` carries a timestamp-query time of the pass where the device has the feature (software value here: not a GPU figure).
* Same inputs, same pixels: no `Math.random`, no clock in the path; the uploaded values are pure functions of (simulation time, camera, scenario choices).

## 3. Evidence, and what kind it is

All of it from `app/tests/weather3d-gpu.mjs` (headless Chrome 153, software WebGPU adapter `google / swiftshader`, 640 x 360, a 12,000-soldier placeholder world, tier `laptop`, 16 cases of `weather3d-gpu-cases.mjs`), `weather3d-gpu-compare.mjs` and `weather3d-gpu-theatre.mjs`. Raw output: `app/tests/results/weather3d-webgpu/`.

* **No WebGPU validation errors.** The three modules (`weather3d-mul`, `weather3d-add`, `fx3d-sprites`) and the optional compute module compile with no compiler message (not even a warning), as do the prototype's own eleven; the three render pipelines build; `uncapturederror` never fires; every frame ran inside a validation error scope and none popped an error; the device was never lost; 16 cases, three scrub-purity repeats.
* **Pictures seen.** Read back from the frame's last target (section 4) and looked at: night sky with stars and cloud, the moon disc at 7 degrees of view with stars and cloud, dusk glow, dawn mist with the sun glow on the horizon, daytime clouds, wet ground with puddles reflecting the sky, men on wet ground, musketry and cannon smoke by day and night (the same frames carry the plan's shell bursts and ground strikes), flash light on the ground and the men at night, the Sherfy barn fire (inside its date window, drawn at the half intensity of a time-uncertain fire), road dust of a marching column (the same frame carries the dust of falls). Bursts, clods and fall dust were not picked out one by one.
* **Parity with WebGL2** (same time, same camera, both software): mean absolute difference per channel 0.33 to 0.46 of 255 over the 16 cases (p99 of the largest channel difference 1 to 2; at most 0.45 percent of pixels differ by more than 8 levels, 0.19 percent by more than 24, all along the far horizon where thin geometry rasterises differently). The prototype alone (`--fx=off`: its own sky and particles, no layer) differs between the two APIs by 0.36 to 0.43 in the four cases measured, so the layer adds no measurable difference of its own. Sprite counts are identical in every case (the same fx3d frame feeds both). Mean luminance of the frame agrees to 0.03 percent.
* **Scrub purity.** The same time and camera give byte-identical pictures: the case, the same case again at once, another case, the first case again (WebGPU and WebGL2).
* **The optional GPU-cull compute shader** (`WGSL_COMPUTE`, not wired: both APIs draw the CPU-culled frame) compiled but did not build a pipeline under the default limits (`workgroup_size(1024)` against a limit of 256). It is now one workgroup of 256 threads with 72 events each (capacity 18,432, more than the largest budget's 16,384 + 64 flame slots) and builds; `fx3d.test.mjs` pins the capacity. Its results have not been compared with the CPU cull: open, see section 5.

## 4. Why the pictures are read back from a texture of our own

On this machine's software adapter the real canvas cannot be used. Probed one operation per page load (`weather3d-gpu-swapchain.html`, summary `swapchain`): rendering to an own texture and reading it back works; configuring the canvas leaves the device alive; `page.screenshot` times out after 20 s in all of these page loads, with a canvas or without one, and returns a white page only after the device was lost; drawing into the canvas texture for a while destroys the device (`lost: destroyed`); copying out of the canvas texture ends with "A valid external Instance reference no longer exists". So the harness installs `HOOKS` (`weather3d-gpu-lib.mjs`) before any page script: `configure()` is not passed on and `getCurrentTexture()` returns an ordinary texture of the same size and format with `COPY_SRC`. The renderer records exactly the commands it records for a canvas; only the target of its last pass is not the canvas. What this cannot show: presentation of the canvas, the page compositor, colour management of the canvas, and anything about a real swapchain. `--real-canvas` uses the real canvas and only adds `COPY_SRC` to its configuration, for a machine with a GPU (not run here). Specs that want a WebGPU frame on a software machine can use `HOOKS` and read `R.ctx.getCurrentTexture()` in the frame's own task.

## 5. What is not done or not known (nothing hidden)

* **Any real GPU.** Intel Arc, NVIDIA, AMD, Apple (Chrome, Safari), a phone: compile of the back-end, the picture, the cost (section E of the verification list). The read-only depth attachment that is also sampled, the `r32float` height texture sampled with a filtering sampler (needs `float32-filterable`, which the prototype requests when the adapter has it; the prototype's own bind group 0 declares the same texture and sampler, so its passes depend on the same feature), `rgba16float` blending: all standard WebGPU, none seen on hardware.
* **Cost.** `stats.passMs` exists; the number measured here is a software figure. The `fx3d` governor is not fed from it (the pass time includes the weather draws; feeding the sprite governor with it would mix the two).
* **GPU cull.** `WGSL_COMPUTE` builds but is not wired (indirect draws, the events with their full-LOD counts, a camera block per frame) and has not been compared with the CPU cull; the CPU cull stays the path on both APIs, so no capability is missing relative to WebGL2.
* **Not in either path:** cloud shadows on the ground, rain streaks (the shell's 2D rain canvas remains), shadows of flash lights (W-D2 of the list).
* **The shell** (theatre.mjs ribbon, config.mjs note, the tutorial, the README line about the hook points) still says the weather and effects are not drawn on WebGPU: request note `GOVERNANCE/horde/requests/bt-renderer-webgpu-weather-shell-text.md`. The default API stays WebGL2 (DD-27) until the real-GPU checks and the crowd's WebGPU item pass.

## 6. Commands

```
node --test docs/battle-theatre/app/tests/weather3d-gpu.test.mjs                                   # 22 node tests, no browser
tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu.mjs <out> webgpu             # the cases, errors, purity, compute check, swapchain probe
tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu.mjs <out> webgl2
node docs/battle-theatre/app/tests/weather3d-gpu-compare.mjs <out>                                 # montages and numbers (WebGL2 | WebGPU | difference x4)
tools/horde/bench.sh node docs/battle-theatre/app/tests/weather3d-gpu-theatre.mjs <out> webgpu      # the shell itself on WebGPU (add --real for the real layer)
```
Options: `--fx=off` (the prototype alone), `--real-canvas` (hardware), `--no-repeat`, `--no-screenshot`, `--w`, `--h`, `--soldiers`, `--tier`. On a machine with a real GPU run the first two with `--real-canvas` and compare.
