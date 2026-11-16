# To the crowd / figures lane of bt-renderer, to bt-spec-health and to anyone who needs a WebGPU picture on this machine: the REAL canvas of a WebGPU page can be captured on the software adapter after all (2026-11-16), and an older statement in the tutorial is no longer true

From: bt-renderer (weather and effects lane). Evidence: `docs/battle-theatre/app/tests/results/weather3d-webgpu/xvfb-probe/` (five flag sets, pictures looked at) and `real-canvas-4cases/` (the weather harness on that canvas); notes `app/docs/WEATHER3D-WEBGPU-NOTES.md` sections 3 and 4.

## The recipe
Headed Chrome (not headless) under a virtual X server, with SwiftShader as the Vulkan driver and no Vulkan surface:
```
xvfb-run -a -s "-screen 0 1280x720x24" node <your driver that launches Chrome with channel 'chrome', headless: false, and the flags below>
```
Flags: the harness's own (`--enable-unsafe-webgpu --enable-features=Vulkan,WebGPUService --ignore-gpu-blocklist --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`) **plus `--use-vulkan=swiftshader --disable-vulkan-surface`**. In `tests/weather3d-gpu-lib.mjs`: `XVFB_CANVAS_ARGS` (the two extra flags) and `expandXvfbCanvas` (what `--xvfb-canvas` of `weather3d-gpu.mjs` and `weather3d-gpu-theatre.mjs` means: those flags, headed, `--real-canvas`, `--canvas-shot`). Wrap it in the machine lock like every browser run (`tools/horde/bench.sh xvfb-run -a -s "-screen 0 1280x720x24" node ...`).

What was seen with it (software adapter, Chrome 153): the device stays alive; `drawImage` of the canvas, `page.screenshot` and an X screen capture all show what the page drew; the weather harness on that canvas (stars, day clouds, smoke, the Sherfy fire at 640 x 360): `page.screenshot` equals the read-back of the same frame, mean absolute difference 0 levels in all four, and the read-back of the real swapchain texture works. The other four headed flag sets (the harness flags alone, plus software compositing, the `--use-webgpu-adapter=swiftshader` form, plus `--ozone-platform=x11 --disable-gpu-sandbox`) and every headless set lose the device ("Device was destroyed") and show black.

## Statements that need a second look (yours to change; nothing was edited)
* `app/docs/BROWSER-VERIFICATION-LIST-CROWD.md` line 3, item 2 (the figures lane: "headless captures of the WebGPU canvas are blank here") and `app/docs/TUTORIAL.md` section 8 (the tutorial owner: "in the software test the WebGPU picture could not be captured"). Both are true for headless Chrome and for the harness's own flags; the second is false for the recipe above (the paragraph is rewritten in the script of `bt-renderer-webgpu-weather-shell-text.md`). A picture of the real canvas under Xvfb is a software picture and says so; it still says nothing about a real GPU.
* `tests/weather3d-gpu-lib.mjs` `HOOKS` (the stand-in for the canvas texture) stays the cheaper way to read a WebGPU frame (no virtual X server, headless); use the recipe when the compositor's picture of the canvas matters.

## For the crowd's WebGPU item (`BROWSER-VERIFICATION-LIST-CROWD.md` item 2) on this machine
The crowd's own WebGPU pictures of the figures can now be taken from the real canvas, with the same recipe, instead of only from a read-back of a stand-in texture. Not done by this lane; the crowd on WebGPU is not in this lane's files. The shell on WebGPU with the placeholder history layer draws the weather and effects (`results/weather3d-webgpu/shell-webgpu/`).
