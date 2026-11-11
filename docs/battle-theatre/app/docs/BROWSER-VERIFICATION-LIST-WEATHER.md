# Browser verification list: weather3d + fx-host (sky, clouds, stars, mist, wet ground, effects wiring)

What exists: GLSL for the weather pass and the fx3d sprites **compiled and ran on SwiftShader (software WebGL2, Chrome headless, `nice -n 10`, one browser at a time)** through `app/tests/weather3d-shots.mjs`. What nobody has seen: a real GPU. **No real-GPU timing was taken and none is claimed.** Rule 1 of `GOVERNANCE/briefs/bt-visuals-common.md`: an item stays open until it is ticked on the hardware named.

Common set-up: Chrome with `?api=webgl2` and (when the WebGPU port exists) WebGPU; 1920 x 1080 and 390 x 844 emulation; `?history=real`; fx-host installed as in `FX-HOST-CONTRACT.md`; HUD hidden for screenshots; each shot is looked at (Read), and what was seen is written next to it.

## A. Compile and parity on real drivers

| id | check | pass |
|---|---|---|
| W-A1 | `weather-mul`, `weather-add`, `fx3d-sprites` link on Intel Arc, NVIDIA, AMD, Apple (Safari macOS and iOS), Firefox, a mid-range Android; `fxHost.instance().log` empty. | empty log |
| W-A2 | `RGBA32F` (6144 wide), `R32F`, `RG32F` textures with NEAREST and `texelFetch` work on every target above (no incomplete texture: sprites appear). | sprites drawn |
| W-A3 | Un-fog parity: on a flat grey test world with the weather layer set to "no fog, dry, floor only", the output equals the prototype without fx-host to within 1/255 on geometry pixels (the undo of `fogged()` is exact). Read back 1,000 pixels at distances 10 m to 12 km. | max error <= 1/255 (HDR 16-bit tolerance) |
| W-A4 | Depth: soft-particle fade against terrain agrees at 1 m, 100 m, 3 km (linearisation of `uNF`); no halo at the far plane. | no halo |
| W-A5 | The sprite pass reproduces `fx3d` CPU positions: the fx3d parity harness A3 of `BROWSER-VERIFICATION-LIST-FX3D.md`, now through the patched shader (the two type fixes and the wide event texture). | A3 passes |

## B. Looks (screenshots, Q-gates)

| id | check | pass |
|---|---|---|
| W-B1 | Night is never black (Q10): 15-minute steps 26 Jun to 6 Jul at a fixed camera on the field, with units in view; the luminance floor of `sky.floor_radiance` and of the exposure. `tests/sky.spec.mjs` (existing) must still pass with fx-host installed. | luma and contrast thresholds of sky.spec |
| W-B2 | Stars appear only below sun altitude -6, fade out with cloud and a bright moon, rotate with the clock (compare 22:00, 01:00, 04:00 on one night: the field turns about the north celestial pole, altitude 39.83), and are marked plausible-procedural on the tier overlay. | as stated; marked |
| W-B3 | Moon disc: position equals the ephemeris (`weather.sky.moonAz/moonAlt`), phase (illuminated fraction 79 to 99 percent over the battle nights) faces the sun, nothing above the horizon when `moonUp` is false. | as stated |
| W-B4 | Dusk and dawn: warm glow toward the sun's azimuth, no bright-blue distant-terrain band at night (the fog undo), distant ridges melt into the horizon colour. | as stated |
| W-B5 | Jul 2 foggy dawn (04:00 to 07:00): mist thick at first and lifting with the sun; visibility 1 km class; marked plausible-procedural, gap W3D-G02 listed. | as stated |
| W-B6 | Wet ground: Jul 3 12:00 dry, Jul 3 20:00 darker (0.3), Jul 4 14:00 darker with puddles reflecting the sky, men and structures not darkened (ground-pixel test, no speckle on slopes or at the horizon), Jul 5 afternoon drying. | as stated; no speckle |
| W-B7 | Clouds: cover follows the Jacobs readings (Jul 3 14:00 about 0.4, 21:00 0.7); drift direction N-NNE with the wind; no popping at the 256-cell wrap; overcast sheet on 1 and 4 Jul. | as stated |
| W-B8 | Smoke, dust and flashes follow the wind: Jul 3 13:00 to 16:30 calm (smoke hangs), other days drifting N-NE; same wind as the cloud drift direction. | as stated |
| W-B9 | Fires: Sherfy barn flames only inside its window, half intensity and "time uncertain" for date-only windows; no fire before its window (fx3d tests exist; look to be seen). | as stated |
| W-B10 | Flash light brightens the ground and men near a night volley and adds to the floor only; at noon it is negligible. | as stated |

## C. Performance (real hardware only)

| id | check | pass |
|---|---|---|
| W-C1 | GPU time of the weather pass (2 full-screen draws; star loop only on night sky pixels) at 1080p on Intel Arc, NVIDIA, a laptop iGPU, a phone: timer queries around `GLPasses.draw` cannot nest inside the prototype's scene query, so measure with the pass disabled (`drawWeather:false`) versus enabled over 600 frames. | difference reported; within the effects share of the G1 budget (fx3d 4 ms desktop) |
| W-C2 | GPU time of the sprite pass versus `fx3d` cost model (13 to 22 ns per sprite on Arc). Tier caps hold; `info.effects.text` shows the share drawn. | model and measurement agree within 2x, or the model is corrected |
| W-C3 | CPU: `fxHost.update` at the desktop tier with 12,900 live events (node measured 4.5 ms under load); at the 4x CPU throttle of gate G1 use the laptop or phone tier on WebGL2 (the GPU-cull path is WebGPU). | under the 8 ms CPU limit |
| W-C4 | Seek replay: scrub into the middle of the Jul 3 cannonade; one replay of the 300 s window (`driveState: 'replayed'`) completes without a visible hitch, or is spread over frames (open if it is not). | no long frame |
| W-C5 | Memory: three textures (6144 x 17 RGBA32F = 1.6 MB, cum 80 KB, wind 2 KB) and the depth copy; no leak across ten enter/leave cycles (`tests/leak.spec.mjs` with fx-host installed). | flat |

## D. Port and wiring still to do

| id | item |
|---|---|
| W-D1 | WebGPU render path for the weather pass (and the fx3d WGSL sprites) so `host.api === 'webgpu'` draws; EG-W3D-G08. |
| W-D2 | Rain streaks and cloud shadows on the ground (the shell's 2D rain canvas stays until then). |
| W-D3 | The host wiring of `FX-HOST-CONTRACT.md` section 1 and 3 (init, per-frame update, anim placement, near sets, segment surfaces). |
