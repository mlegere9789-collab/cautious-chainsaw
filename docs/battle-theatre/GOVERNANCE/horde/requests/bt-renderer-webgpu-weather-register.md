# To the registrar (owner of GOVERNANCE/register/), from bt-renderer (weather and effects lane): update EG-W3D-G08 and EG-FX-G16

Date: 2026-11-13. Evidence: `docs/battle-theatre/app/docs/WEATHER3D-WEBGPU-NOTES.md` (sections 3 to 5), `docs/battle-theatre/app/tests/results/weather3d-webgpu/`. Both entries stay **open**: the work is software-adapter evidence only, nothing has run on a real GPU. No tier is promoted, nothing is closed, nothing is narrowed. The fx3d copy of FX-G16 (`app/data/fx3d/GAPS.json`) is already updated; the register file is yours.

## EG-W3D-G08: WebGPU draw path and real-GPU cost (replace these fields; keep the others)

| Field | New content |
|---|---|
| Description | The weather and effect passes are implemented for WebGL2 (`weather3d/gl.mjs`) and for WebGPU (`weather3d/gpu.mjs`, `shaders-wgsl.mjs`; the WGSL is a port of the GLSL with the same constants). Both compile and draw on software adapters (SwiftShader). On WebGPU: no validation error and no compiler message in the three modules, the pictures were looked at, and they agree with the WebGL2 pictures to 0.33 to 0.46 of 255 (mean absolute difference per channel, 16 cases, 640 x 360) with identical effect sprite counts. Not seen: any real GPU, any real-GPU timing, the canvas presentation (on this machine's software adapter the real canvas cannot be drawn into or read, so the pictures were read from a texture standing in for it). |
| Why literal 100% is not possible or blocked | Work item and environment limit, not an evidence gap: this machine has no GPU. |
| Evidence searched | `app/tests/weather3d-gpu.mjs`, `weather3d-gpu-compare.mjs`, `weather3d-gpu-theatre.mjs` runs of 2026-11-13 (headless Chrome 153, adapter google / swiftshader); `app/tests/weather3d-gpu.test.mjs` (28 node tests); `app/docs/WEATHER3D-WEBGPU-NOTES.md`. |
| Autonomous substitute applied | Both paths draw. The default API of the shell stays WebGL2 (DD-27) until the real-GPU checks pass; the ribbon names what was seen. |
| Strongest evidence-based reconstruction | The WebGL2 path (verified on software) and the WebGPU path (verified on software, same inputs and blend states, pixel parity measured). |
| Product marking | The effects panel states what is drawn; on WebGPU the ribbon says the passes were seen only on a software adapter (request `bt-renderer-webgpu-weather-shell-text.md`). |
| Visual and audio impact | Weather and effects on WebGPU; every timing gate |
| Review status | internal review only (DEC-006: no public review label); software adapter only, no real GPU (EG-W3D-G08) |
| Agent recommendation | Run `BROWSER-VERIFICATION-LIST-WEATHER.md` section E on real hardware (Intel Arc, NVIDIA, AMD, Apple, a phone); then consider closing and flipping the default (DD-27). |
| Status | open |

History line to append: "2026-11-13 WebGPU passes built and validated on a software adapter (0 validation errors, pictures seen, parity with WebGL2 measured); real GPU, real-GPU timing and canvas presentation not seen. Not closed."

## EG-FX-G16: Nothing seen (replace the Description; the Review status clause "nothing seen in a browser yet" is no longer true)

Description: "Software rendering only (SwiftShader, this machine has no GPU). The WebGL2 and WebGPU shader code compiles and draws on the software adapters, with no compiler message or validation error on WebGPU, the two APIs agree to within 0.46 of 255 (mean absolute), and the pictures were looked at (2026-11-13, app/docs/WEATHER3D-WEBGPU-NOTES.md). The look, the performance and the lighting on a real GPU are unverified, and the GPU-cull compute shader is not wired or compared with the CPU cull."
Review status: "internal review only (DEC-006: no public review label); seen on software adapters only, no real GPU (EG-FX-G16, EG-W3D-G08)".

## A new finding to record somewhere (your call where)

On this machine's software WebGPU adapter the canvas cannot be used by a test: drawing into the canvas texture for a while destroys the device, copying out of it ends in "A valid external Instance reference no longer exists", and `page.screenshot` times out. The earlier statement "WebGPU captures are blank" (CROWD-NOTES, TUTORIAL section 8) is this. Rendering to an own texture and reading it back works; `tests/weather3d-gpu-lib.mjs HOOKS` does that for the canvas. A real-hardware browser run is the only way to see the canvas path itself (WEATHER3D-WEBGPU-NOTES section 4).

## Addendum 2026-11-14 (bt-renderer, weather and effects lane): new evidence for EG-W3D-G08 and EG-FX-G16 (both stay open; nothing closed, no tier promoted)
* The six close views (shell burst, ground strike, fresh volley, dust at falls, the barn fire close and at night) ran on WebGPU on the software adapter: 0 validation errors, 0 compiler messages in 15 modules, byte-identical repeats and resize (`app/tests/results/weather3d-webgpu/close-webgpu-summary.json`, pictures looked at). Their WebGL2 run and comparison, and the shell with the real crowd on both APIs, are queued behind the machine lock and are NOT run (do not cite them).
* A second WebGPU implementation (wgpu-native 0.33: naga and wgpu-core validation, on SwiftShader's Vulkan, software only) built the three modules, the compute module and the four pipelines with the prototype's real group 0, refused five negative controls, accepted the read-only-depth pass, and compiled the other 13 WGSL modules of the renderer (`second-implementation-build.json`). Not a GPU, not Firefox.
* Still not seen: any real GPU, real-GPU timing, the canvas presentation (the real canvas cannot be used on the software adapter: notes section 4). History line to append: "2026-11-14 close views on WebGPU (software); second WebGPU implementation builds and validates the pass (software). Not closed."
