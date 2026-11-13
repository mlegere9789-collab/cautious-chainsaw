# Browser verification list: FX3D (smoke, flash, dust, fire)

Nothing below has been run. Run it when the machine is free (after the Release 1 eight passes). Until an item is ticked, no claim about the look, the shader code or the performance of the effect layer may be made (Section Z checklist, CLAUDE.md). Items marked **GATE** map to the plan's gates (G1, G12, Q10, Q12/G16). Tick = a screenshot or number saved next to this file in `app/tests/shots-fx3d/` with the spec id in the file name.

Common set-up. Chrome (WebGPU) and Chrome with `?api=webgl2`; 1920 x 1080 and a 390 x 844 mobile emulation; `?history=real` unless stated; effects wired as in FX3D-NOTES section 9; HUD hidden for screenshots; each shot is taken after scrubbing to the stated time from 60 s earlier (so smoke has history). Weather scenario = the environment layer's own default (no wind choice made by the checker) unless the item says otherwise.

## A. Shaders compile and agree with the CPU reference

| id | check | pass |
|---|---|---|
| A1 | `GLSL_VERT`/`GLSL_FRAG` compile and link in WebGL2 on Chrome (Intel Arc, NVIDIA), Firefox, Safari (macOS and iOS); no info log. | empty logs |
| A2 | `WGSL_RENDER` and `WGSL_COMPUTE` create their modules in Chrome WebGPU: `getCompilationInfo()` has no errors. Particularly check: dynamic indexing `cam.nfull[k >> 2u][k & 3u]`, `select` argument order, the workgroup scan with barriers, the name `fin` for the fragment input. | no errors |
| A3 | **Parity harness** (a debug page, to be written): a debug uniform makes the vertex shader write `(centre.xyz, size)` to an RGBA32F target at texel = sprite index; read back 4,096 sprites for each event type (musket, gun, ring, fog, case, shell, canister, earth clods, dust, plume, flash, fuse, flame) at ages 0.01, 0.1, 1, 10, 100, 300 s, wind history on; compare with `puffState` + `spriteOffsets` (core.mjs). | max |dx| <= 2e-3 m + 1e-4 relative; sprite count and event lookup identical (`eventOfSprite`) |
| A4 | The shader hash equals `sim/rng.mjs` `hash4` bit for bit (read back `hash4(a,b,c,d)` for 1,000 random tuples). | 0 mismatches |
| A5 | `uCum` as R32F texture, `uEv` as RGBA32F (6 x N) and `uWind` as RG32F upload and `texelFetch` on every target, including iOS Safari and a mid-range Android (WebGL2 float textures without filtering). | renders |
| A6 | `uExtra.x` exposure floor: with the floor set to 0 the night image goes dark, with 0.34 it does not (proves the clamp is live). | differs as stated |

**Evidence for A2 (2026-11-13, software adapter only):** `WGSL_RENDER` (patched for the hardware depth) and `WGSL_COMPUTE` create their modules on Chrome 153's software WebGPU adapter with no compiler message of any kind; the render pipeline builds and draws every event type of the stand-in plan (musket and cannon fire, shell bursts and ground strikes, falls, a marching column, a fire window); smoke, flash light, road dust and flames were picked out in the pictures, bursts, clods and fall dust only sit in the same frames; the compute pipeline did not build under the default limits (`workgroup_size(1024)`, limit 256) and does now (256 threads x 72 events); nothing of this was run on a real GPU, and the compute result is not compared with the CPU cull. Source: `app/tests/weather3d-gpu.mjs`, `WEATHER3D-WEBGPU-NOTES.md`. A2 stays open for the back-end compile of the real GPUs named in the common set-up.

## B. What it must look like (screenshots, Q-gates)

Camera heights 1.7 m (eye), 8 m, 40 m unless stated. Compare to the references named; write what was seen next to the shot.

| id | scene and time | look to confirm |
|---|---|---|
| B1 | A firing line of 300 or more at 25 m, 60 m, 150 m (Jul 1 about 11:00, Cashtown road / McPherson Ridge); sun high, overcast (Jul 1 "very cloudy"). | dense white-grey puffs, 1 to 2 m, drifting **north-north-east**, thinning in 5 to 15 s, merging into a bank along the line; flash visible for one or two frames; no hard disc edges (noise erosion), no visible sprite squares; soft contact with the ground and with soldiers (no cut lines) |
| B2 | Six Napoleons at 40 m (Jul 2 14:00 and Jul 3 13:30). | flash about 4 m long (50 to 150 ms), muzzle ring then cloud of 10 m scale; Jul 2 the cloud is gone from view in about 20 s; **Jul 3 13:30 (near calm) it hangs for about 100 s** and builds a bank (T2-122, B.6.14.2). GATE G12: flash 80 to 150 ms band, plume lifetime 15 to 25 s at the reference wind, record the measured numbers |
| B3 | **Battle fog**: Cemetery Ridge looking west, Jul 3 14:15, camera 1.7 m, then 8 m. | sight lines across the valley are obscured; `fx.visibility()` printed on screen agrees with the picture (a target 40 m away is hidden when it says 35 m); smoke pools in low ground |
| B4 | **Night**: Culp's Hill, Jul 2 21:30; Jul 1-2 night (moon hidden, darkest) near Emmitsburg Road; Jul 3-4 night in the rain. | orange short flashes light men and ground within their radius; smoke is lit from inside by flashes and is **not black** anywhere; mean frame luminance stays above the Q10 floor of the environment layer; record the minimum pixel luminance and the mean |
| B5 | **Fuse trails**: shell and case from smoothbores at 20:00 Jul 2; the same at 13:00. | thin orange spark trails along the flight at night, none at noon; none from solid shot, canister, percussion rifled shell, or any musket (no tracers) |
| B6 | **Dust**: Chambersburg Pike column Jun 29 12:00; same column Jun 26 12:00 (rain), Jul 3 19:00 (mud), Jul 4 12:00 (wet); a macadam road versus a dirt road; a horse string; a wagon train; a fallen man on dry ground. | dust plume downwind of a dry column, lower and wider than smoke, ground-hugging; **none** when wet; less on macadam; hoof and wheel dust; a small puff where men fall |
| B7 | **Fires**: Sherfy barn Jul 3 10:00, 14:00, 20:00 in the default scenario and in `jul2_evening_c026`; Bliss buildings Jul 3 09:00 and 13:15; Rock Creek trestle Jun 26 and Jun 27; rail cars Jun 26. | half-intensity flames **with a visible "time uncertain" marker** inside a date-only window; smouldering ruin (thin smoke, no flame) after it; Bliss out by 13:00; **no fire before the window start** (scrub through midnight); no fire on the McPherson barn, Rogers house, Schmucker Hall at any time; no wheat-field fire |
| B8 | A host-placed carcass fire Jul 4 and a camp fire at a rear camp Jun 30 night. | small fires and thin smoke; camp fire not near a firing line; carcass fire refused before Jul 4 (console message) |
| B9 | Shell burst, case burst, ground strike and ricochet, **if ANIMATION has added `impact` events** (BT-EVENTS request R-FX-1). | case/shell airburst puff and orange flash at the burst point, dust column 10 to 25 m with clods, hops on dry ground, none on Jul 4 |
| B10 | Scrub test (GATE G16/Q12): scrub Jul 3 12:50 -> 13:40 -> 12:50 -> 13:40, screenshot at 13:20 each time. | the two 13:20 images are identical (pixel difference 0 apart from dither); after `fx.seek` the replayed window gives the same smoke |
| B11 | LOD popping: dolly the camera from 15 m to 600 m past a firing line and a battery in 10 s; record video, compute frame differences at the band edges 30/120/400/1200 m. | no visible pop at the band edges; far puffs fade into the fog map |
| B12 | The near/far route: stand 140 to 170 m from a line (the 150 m +/- 20 percent hysteresis zone). | no flicker between per-shot puffs and aggregated fog |
| B13 | Product marking. | the effects panel states the share of particles drawn when capped; the tier overlay lists effect parameters as plausible-procedural; uncertain-time fires carry the marker; the label "reviewed by automated subagents" is **not** present (DEC-006) |

## C. Performance (GATE G1, G12)

Use `render/prototype` bench method (Playwright, below-normal priority, timestamp queries, 3 repeats, medians).

| id | check | pass |
|---|---|---|
| C1 | Effect pass GPU ms, desktop tier, the `line`, `battery`, `ridge` and B3 shots, 1080p, WebGPU and WebGL2 on Intel Arc and the RTX laptop. | <= 4.0 ms (G12); record sprites drawn; compare with the model (`costMs`: 13 to 22 ns/sprite) |
| C2 | Same on a mid-range phone and a tablet (tiers `phone`, `tablet`). The model's factors 2 and 3 are **assumptions**. | <= tier ms; record the real ns/sprite and correct `budget.ns_per_particle_arc` / `mobile_factor` in `fx3d-params.mjs` |
| C3 | Whole frame (G1): 60 fps, p99 <= 16.7 ms, 0.1 percent over, with all 165,000 soldiers and the effects on, 1080p R1 and 4K R2, fly-through of 600 frames through a sustained fight. | G1 target |
| C4 | CPU: `fx.update` + `onFire` on the main thread at 4x throttle: desktop tier with 12,900 live events was 4.5 ms in node (unthrottled, busy machine). | <= 8 ms total CPU at 4x (G1); otherwise enable `{gpuCull:true}` or lower the tier |
| C5 | `gpuCull:true` WebGPU path: sprite counts and the resulting image versus the CPU path (+/- 5 percent in count, no visible difference); the two indirect draws match `cum[split]` and `cum[nev]`. | agrees |
| C6 | Draw calls (target <= 3 for effects), bytes uploaded per frame (events 96 B each: 12,900 events = 1.2 MB), GPU memory. | recorded |
| C7 | The governor: throttle the GPU 3x; `fx.govern(measuredMs)` once a second brings the pass under the tier budget within 5 s; the UI sentence updates; soldiers: all drawn (instance counts unchanged, G2). | converges; soldiers unchanged |
| C8 | Memory over a 10-minute dense fight: no growth of the typed arrays; `stats().evicted` stays 0; `merged` grows. | flat |

## D. Regression

| id | check |
|---|---|
| D1 | `node --test docs/battle-theatre/app/tests/*.test.mjs` all pass (also run before this list was written, see FX3D-NOTES). |
| D2 | `?history=stub`, `?api=webgl2`, the Playwright specs of `tests/run-all.mjs` pass with the effects wired. |
| D3 | The Virtual Walkthrough and Monuments sections are unchanged (first-click timings of acceptance check 4 still under 50 ms). |
| D4 | The copy audit of FINAL-ACCEPTANCE.md: no shipped file or metadata mentions AI, Claude, Anthropic or how the site was built (grep of `src/fx3d`, `data/fx3d` was clean on 2026-10-31). |

## E. Open items this list cannot close

Source evidence for any plausible-procedural number (smoke yield, extinction, plume rise, flame length, dust yield, fire durations) would replace a look parameter; see `data/fx3d/GAPS.json`. The owner's choices pending: the wind-speed scenario (CF-WIND-SPEED) and the Sherfy and Bliss fire timing (PD-01, B.8.2).
