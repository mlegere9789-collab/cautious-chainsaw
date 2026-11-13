# WebGPU weather and effects: evidence of 2026-11-13 (software adapter only)

Output of `app/tests/weather3d-gpu.mjs`, `weather3d-gpu-compare.mjs` and `weather3d-gpu-theatre.mjs`, run in headless Chrome 153 on a machine **without a GPU**: WebGPU on Chrome's software adapter (`google / swiftshader`), WebGL2 on SwiftShader through ANGLE; 640 x 360, a 12,000-soldier placeholder world, effects tier `laptop`, the 16 cases of `weather3d-gpu-cases.mjs`. **Nothing here is a real-GPU result**; the real-hardware checks are `BROWSER-VERIFICATION-LIST-WEATHER.md` section E. The notes are `app/docs/WEATHER3D-WEBGPU-NOTES.md`.

| File | What it is |
|---|---|
| `webgpu-summary.json`, `webgl2-summary.json` | one run per API: per case the validation error text (null when none), the luminance statistics of the read-back picture (whole frame, top and bottom 35 percent, 8-bit display values), the effect sprite counts, the layer's counters; `diagInit` (what built), `diagEnd` (uncaptured errors, device loss, the compiler messages of every shader module), `pure` (the same time and camera give identical pixels), `computeCheck` (the optional compute pipeline), `swapchain` (what the software adapter survives on the real canvas: why the pictures are read back from a texture standing in for it) |
| `compare-summary.json` | WebGL2 against WebGPU for each case: mean absolute difference per channel, rmse, p99, the shares of pixels over 8 and over 24 levels, luminance, sprite counts |
| `base-compare-summary.json`, `base-webgpu-summary.json`, `base-webgl2-summary.json` | the prototype alone (`--fx=off`: its own sky and particles, no weather or effects layer) on both APIs, four cases: how far the two renderers are apart without this layer |
| `tier-phone-webgpu-summary.json`, `tier-desktop-webgpu-summary.json` | four effect cases on WebGPU at the `phone` (4,096 event slots) and `desktop` (16,384) budget tiers |
| `webgpu/*.png` | the 16 WebGPU pictures (each was looked at; what was seen is in the notes, section 3) |

Check a run: `node app/tests/weather3d-gpu-check.mjs <dir>` on a folder with `webgpu/summary.json`, `webgl2/summary.json` and `compare/summary.json` (the layout the harness writes); `checkRun` and `checkCompare` are the functions (`GATE-HOOKS.md`). A node test (`weather3d-gpu.test.mjs`, last test) reads these stored files and pins the figures the notes state.
