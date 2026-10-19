# Battle Theatre: real-time rendering feasibility and the film-grade gates (Part F, render track)

Written 2026-10-19 on the build machine. Binding spec: the owner's Part F text (separate page, Rome: Total War style, whole battle from the first shot of Day 1 to the Confederate withdrawal, free-fly camera, every soldier individually animated, 100 percent accurate uniforms, equipment, weapons and commanders including Rufus Dawes, position and orientation of every soldier and unit matching what happened with the target well over 97 percent, Hollywood-studio-grade smooth human-like movement including artillery fire and impact, rendered soldier total equal to the number present, a dedicated roster section). No gate below is lowered. Where today's number misses a gate, the gap is stated with the measurement and the way to close it.

Evidence labels (the site's vocabulary): **Documented** (a source I read, with URL), **Measured** (a command I ran here, results in `results/*.json`), **Computed** (arithmetic on measured or documented numbers, shown), **Modelled** (an assumption or an extrapolation, assumptions stated), **Contested** (sources disagree), **Unknown** (not established). Every number in this file is one of these; the label is in the text or in the section heading.

Files: this plan `PLAN.md`; the prototype `prototype/` (run instructions in `prototype/README.md`); every measurement `results/*.json` (re-run with `prototype/tools/run-all.sh`); screenshots I looked at `shots/*.jpg`.

---

## 0. The answer on one page

1. **The count is feasible. Measured.** One Chrome page draws all 165,000 soldiers every frame, each at its own position, heading, gait phase, rate, scale and tint (153,000 on foot, 12,000 mounted with 12,000 horses, 360 guns in 60 six-gun batteries with 2,880 crew), on the real 3DEP terrain with the NAIP aerial, with a free-fly camera, shadows, PBR shading, musket and gun smoke, muzzle flash, shell impacts with debris, bloom and tone mapping (depth of field and motion blur are on in the film configuration and add 0.0 to 0.3 ms at 1080p). On the **Intel Arc Pro 140T integrated GPU** with **WebGPU**: median **6.2 to 11.0 ms per frame at 1080p** over seven camera positions (91 to 163 fps; GPU 3.6 to 7.8 ms; main-thread CPU 0.6 to 1.2 ms), **12.9 to 26.3 ms at 4K**. On the **NVIDIA RTX PRO 1000** laptop GPU: 2.9 to 5.1 ms at 1080p and 4.6 to 10.9 ms at 4K. With the CPU throttled 4x the CPU side is 2.7 to 6.0 ms and the frame times do not move (GPU-bound). WebGL2 on the same Intel GPU is 1.3 to 2.2 times slower at 1080p (8.2 to 23.1 ms).
2. **Engine: a custom WebGPU renderer (this prototype's architecture) with a WebGL2 fallback tier; three.js and Babylon.js stay out of the runtime** (section 4). Reasons: the work that decides feasibility (unit-driven GPU placement of 165,000 soldiers, baked-animation LODs, impostor flipbooks, stateless particles, per-pass GPU timing) is custom shader work in any engine; the WebGPU path is faster than WebGL2 on the same GPU where the budget is tight (near-LOD triangles cost 0.5 to 0.9 ms per million on the Arc iGPU in WebGPU versus 3.0 to 4.3 ms in WebGL2); the whole WebGPU path is 41.8 KB gzipped (131 KB raw). Licences are not a blocker either way (three.js MIT, Babylon.js Apache-2.0, both read). **I did not benchmark three.js or Babylon.js**: that needs downloading their packages, which needs the owner's one-line yes (section 4.4).
3. **What the benchmark does not yet show is film-grade.** The meshes (2.9k to 19k triangles), clips (hand-written analytic cycles), materials and effects are placeholders. The honest extrapolation from the measured slopes (Computed, section 3.4): film-grade near characters of 50k triangles for 300 to 600 soldiers plus 5,000 mid-LOD soldiers of 3k triangles is 30 to 45 million triangles, which costs **20 to 40 ms on the Arc iGPU** (0.5 to 0.9 ms per million near triangles, 0.84 ms per million mid triangles) and about 15 to 24 ms on the RTX laptop: **over the 60 fps budget on both**. The way through is a rule, not more hardware: **screen-space-error LOD** (triangle count follows projected size, so the character geometry per frame is bound by resolution, about 3.5 to 4.4 million triangles at 1080p for dense scenes, not by soldier count). Not yet built; Modelled in section 3.4, to be measured in the first build step.
4. **Most of the film-grade gates are asset and animation gates, not renderer gates**, and the placeholder fails them by wide margins, which is what the harness is for: foot slip 21 cm per step against a 1 cm gate; instant clip switches jump 24 to 232 mm on average (up to 2,200 times a normal 60 Hz frame step); 1 body mesh, 0 faces, 1 clip per state against the clone gate. The compute budget to close them is measured and small: pose blending plus forward kinematics for 600 soldiers of 60 bones is **0.05 ms** on the Arc GPU, for 20,000 soldiers **5.1 ms**; LOD cull and binning of 165,000 soldiers **0.16 ms**; 1.65 million spring bones **2.0 ms**. Real mocap, IK, blend trees, per-regiment kits and individually modelled commanders are the work (sections 5 and 6).
5. **Cost (Modelled from a measured calibration, section 7):** about 30,000 lines of production code in six work packages; **about 8 million agent tokens (range 5 to 13 million)**; roughly 11 engineer-years if done by hand; plus human or vendor work that tokens do not replace: character, uniform, equipment, horse, gun and commander models (about 3,500 artist-days, Modelled) and a motion-capture programme (about 75 states, 600 clips; vendor quote Unknown). This prototype itself cost about 620,000 tokens and about 1.7 hours of wall time.
6. **Limits of this evidence.** One machine shared with two other pipelines (run-to-run range is reported, medians used); Chrome 155 only (Safari and Firefox not run; WebGPU availability is Contested between sources, section 4.3); the ground is modern, not 1863; positions are placeholders; no real mocap, no real uniforms; volumetric smoke is billboard particles (soft, lit, noise-eroded), not volumetric.

---

## 1. Machine, method, caveats

**Machine (Measured).** Intel Core Ultra 7 265H (16 logical cores), 32 GB RAM, Windows 11 Pro. Two GPUs: **Intel Arc Pro 140T** integrated (the Chrome default here; ANGLE Direct3D11 for WebGL2, WebGPU adapter vendor intel, architecture xe-lpg; this is the machine the brief names) and **NVIDIA RTX PRO 1000 Blackwell Generation Laptop GPU** (selected with Chrome's `--force_high_performance_gpu`; a second data set, `*_nvidia.json`). Chrome 155.0.8059.82. The WebGPU adapter exposes `timestamp-query`, `shader-f16`, `subgroups`, `float32-filterable`, `indirect-first-instance`, `chromium-experimental-multi-draw-indirect` and 2 GiB buffer limits; WebGL2 exposes `EXT_color_buffer_float`, `OES_texture_float_linear`, `EXT_disjoint_timer_query_webgl2`, `KHR_parallel_shader_compile`, 16384 texture size (probe in this session; `tmp/bt/render/probe.mjs`).

**WebGPU and WebGL2 are both available and both measured.** WebGPU needs a secure context (the page is served from `127.0.0.1`).

**Method (Measured).** Playwright drives Chrome (new headless, GPU enabled, frame-rate limit and vsync disabled, `--disable-dawn-features=timestamp_quantization`) at below-normal priority. The page runs its own loop on a `MessageChannel` with at most two frames in flight; **frame time is the interval between GPU-completion events** (`queue.onSubmittedWorkDone`, or a fence sync in WebGL2), i.e. throughput with vsync off. **GPU time** is the sum of per-pass timestamp queries (WebGPU `timestampWrites`, WebGL2 `EXT_disjoint_timer_query_webgl2`): shadow cascade 0, cascade 1, scene, particles, bloom, post. It excludes gaps between passes and presentation: at 4K the frame time is 3 to 6 ms above the pass sum for that reason. **CPU time** is the JavaScript time inside `frame()` (LOD selection, poses, effects, encoding). **4x CPU throttle** is the Chrome DevTools Protocol `Emulation.setCPUThrottlingRate` (main thread only; the GPU is unaffected). Each case is 30 warm-up frames then 120 measured (600 for the fly-through) after replaying 20 s of effects, so smoke and impacts are in their steady state. Camera presets: `overview` (1,900 m up, all 165,000 in view), `wide` (120 m up), `ridge` (55 m up behind a regiment), `ground` (eye height, far), `line` (eye height, 26 m from a firing regiment), `battery` (2 m from the guns, shots and impacts), `cavalry` (following a 96-horse gallop). Ablations freeze simulation time so every configuration sees the same smoke.

**Caveats (read before quoting any number).**
- The machine is shared with two other heavy pipelines. I ran the headline tables three times at 1080p and twice at 4K and at 4x throttle and quote the **median with the [min-max] range**; single runs differ by up to 40 percent (for example `line` at 1080p: 7.5 to 14.4 ms GPU across three runs). Section 3 uses medians.
- Chrome documents that timestamp queries are rounded to 100 microseconds unless developer features are on (Documented: developer.chrome.com/docs/web-platform/webgpu/developer-features); I passed a Dawn flag to disable it and could not confirm it took effect. Per-pass numbers are averages over 100+ frames, so the rounding does not bias them, but differences below about 0.5 ms are noise (the ablation table says so).
- Headless Chrome at a 3840 x 2160 viewport is not a full-screen 4K display path; presentation cost on a real monitor is **Unknown**.
- The GPU memory column is the sum of resources the page created (**Computed**, exact) plus Chrome's per-process "GPU Process Memory" Windows counters (**Measured**); the Intel GPU reports shared memory only.
- Not measured: Safari, Firefox, mobile GPUs, a sustained one-hour soak (thermal throttling), headed fullscreen, real mocap, real assets, volumetric smoke, TAA or upscaling.

---

## 2. What was built, and the design rules the measurements support

**The scene (Measured: `results/*.json`, `world` block).** 165,000 soldiers exactly (92,686 Union, 72,314 Confederate; the split is a placeholder near the historical ratio, not a roster number), 992 units, 12,000 mounted (12,000 horses), 360 guns, 60 batteries, 2,880 gun crew counted inside the 165,000. Placements are **Modelled**: two fronts of lines two ranks deep (frontage 0.55 m per file, 0.9 m between ranks), reserve columns of fours on two roads, cavalry blocks, batteries along both fronts, and a showcase block (two firing regiments, a marching column, a battery, 144 cavalry) at the `line`, `battery` and `cavalry` cameras. Not the 1863 positions. A few percent of the infantry fall during the first three minutes (scripted: 2.5 percent of line infantry, 6 percent in the three showcase regiments, 0.4 percent elsewhere).

**The ground (Measured, public domain).** USGS 3DEP bare-earth DEM (1,536 x 1,536 uint16 samples, 4 m, 6.16 x 6.12 km window, elevation 72 to 240 m) and the USDA NAIP aerial (2048 x 2048, photographed 24 April to 10 May 2022) through `docs/pitch/anim2/basemap`; built by `prototype/tools/build-terrain.py`. It is the modern ground (quarry, roads, houses), not 1863. Chunked terrain (16 x 16 chunks of 385 m, 96, 48 or 24 cells per chunk by distance, with skirts), heights read in the vertex shader.

**Characters (Measured; all generated by `src/characters.mjs`, no third-party asset used or downloaded).** An 18-bone soldier with rifle, haversack, canteen, cartridge box, blanket roll, knapsack, kepi; a 27-bone horse and rider with saber; a field gun with recoiling barrel and 12-spoke wheels. Mesh quality is a parameter: soldier 1,152 triangles (mid), 2,928 (q=1), 8,996 (q=2), 19,384 (q=3); horse and rider 1,364 to 23,712. Seven soldier clips (idle, march, double-quick, load, fire, fall, lie) and three horse clips (idle, walk, gallop), analytic, not mocap.

**Architecture the numbers support (each rule is backed by a measurement in section 3):**

```
 CPU, per frame (0.6 to 1.2 ms)             GPU
 ------------------------------             ---------------------------------------------------------------
 992 unit records (static: path, formation) soldier table 165,000 x 32 B (static)   units table (static)
 unit-level frustum + distance cull         near list (<=1,536)   -> skinned mesh, bone matrices from CPU poses
 soldier-level distance class (only units    mid list (<=60,000)   -> baked-animation mesh (bone matrices or VAT)
   inside the mid radius): ~2-5k soldiers    far list = ALL 165,000 -> impostor quad per soldier, vertex shader
 poses for the near list (1.8 us each)                                   collapses the ones a nearer LOD draws
 effect events (guns, impacts, muskets)     placement, heading, clip, phase, fall: all computed in the vertex
 terrain chunk list                         shader from (unit record, soldier record, time): stateless
```

1. **Stateless GPU placement and animation.** Position, heading, clip and phase of every soldier are a pure function of (soldier record, unit record, time) evaluated in the vertex shader; the CPU never touches 165,000 soldiers per frame. Consequence (Measured): CPU 0.6 to 1.2 ms per frame, 2.7 to 6.0 ms at 4x throttle. It also makes `render(t)` seekable for any t, which the timeline and scrubbing need (gate G16).
2. **Every soldier is drawn every frame.** The far list contains all 165,000; no soldier is dropped by a cap (largest mid list seen: 4,886 of 60,000; near 334 of 1,536). Soldiers more than 7 px tall use a flipbook of 8 views x 8 frames x 7 clips baked at load by a software rasteriser from the mid mesh (0.33 s for all bakes); smaller ones become stochastic coverage dabs with a per-soldier threshold so coverage accumulates correctly.
3. **Mid LOD with baked bone matrices, not per-vertex VAT.** Measured side by side (two back-to-back repeats, bone matrices versus VAT, GPU ms): 4.97 versus 4.92 (`wide`), 8.24 versus 8.38 (`line`), 5.10 versus 5.14 (`cavalry`): equal. Memory (Computed from the bake sizes): soldier VAT 909 vertices x 224 rows x 16 B = **3.26 MB** against bone matrices 54 texels x 224 rows x 16 B = **0.19 MB**, 17 times less, and the gap grows with vertex count (section 5, G15).
4. **Particles are stateless events.** A particle's position at time t is a closed-form function of (event, particle index, age); no simulation state on CPU or GPU. 64 particles per event; 4,096 events live. Soft depth fade, noise erosion, sun-lit shading. In WebGL2 the depth buffer must be copied before the particle pass (the copy is inside the measured cost).
5. **Shadows:** two 2048 x 2048 cascades (45 m and 260 m radii: 4.4 cm and 25 cm per texel), texel-snapped, casters are near, mid and guns. **Post:** HDR rgba16f, bloom (three small passes), 8-tap gather depth of field and camera motion blur from depth reprojection, ACES, vignette, dither. **Shading:** GGX with a material table per team (coat, trousers, hat, skin, boots, wood, steel, canvas, leather, brass, horse, mane, saddle, carriage, bronze, iron).

Screenshots I looked at (`shots/`, 1920 x 1080, HUD hidden, WebGPU, effects at 55 percent opacity): `webgpu-battery-muzzle-flash.jpg` (a muzzle flash 0.06 s after the shot, crew, smoke), `webgpu-battery-impact.jpg` (1.7 s later), `webgpu-line.jpg` (a firing regiment, the whole line in smoke), `webgpu-cavalry.jpg` (96 horses at the gallop, shadows), `webgpu-wide.jpg`, `webgpu-overview.jpg` (all 165,000, the formations read as strokes), `webgpu-ridge.jpg`, `webgpu-ground.jpg`. What I saw and judged: shadows and PBR read correctly; the characters are crude placeholders (no faces, boxy gear, arms in the wrong places in the load and fire clips); the terrain texture is soft at eye height (2.9 m per aerial pixel); the smoke is a convincing placeholder for density and overdraw cost but not for look. **A visible defect:** in `webgpu-wide.jpg` the marching columns (far-LOD dabs) read as flat light-blue bars next to the darker mid-LOD lines, so the LOD hand-over changes colour and shape (gate G4). I looked at the final versions of `battery-muzzle-flash`, `battery-impact`, `line`, `wide`, `ridge` and `overview`; `cavalry` and `ground` I looked at in an earlier iteration of the same code and did not re-view after the last brightness and coverage fixes.

---

## 3. Results (full tables in Appendix A; every row is from `results/*.json`)

### 3.1 Frame time, GPU and CPU (Measured; median [min-max] over repeats)

| Case | WebGPU, Arc iGPU | WebGL2, Arc iGPU | WebGPU, RTX PRO 1000 | WebGL2, RTX PRO 1000 |
|---|---|---|---|---|
| 1080p, 7 shots, frame ms | **6.2 to 11.0** (91 to 163 fps) | 8.2 to 23.1 (43 to 122 fps) | 2.9 to 5.1 (196 to 345 fps) | 5.2 to 9.0 |
| 1080p, GPU pass sum ms | 3.6 to 7.8 | 7.7 to 21.3 | 1.9 to 4.8 | 4.6 to 8.9 |
| 4K, frame ms | **12.9 to 26.3** (38 to 78 fps) | 15.7 to 32.3 | 4.6 to 10.9 (92 to 218 fps) | 6.0 to 15.0 |
| 1080p, 4x CPU throttle, frame ms | 6.1 to 11.3 | 8.9 to 21.2 | n/a | n/a |
| main-thread CPU ms (1080p, no throttle / 4x) | 0.64 to 1.22 / 2.7 to 6.0 | 0.58 to 1.26 / 2.6 to 5.8 | 0.41 to 0.88 | 0.42 to 0.90 |

The two densest shots (`line`, `battery`) set the maxima: at 4K on the Arc GPU they are 26.3 ms (38 fps) and 23.2 ms (43 fps), so **4K at 60 fps is not met on the iGPU with this scene** and is met on the RTX laptop. At 1080p everything on the iGPU is under 16.7 ms. The film configuration (depth of field and motion blur on) adds 0.0 to 0.3 ms at 1080p and 0.1 to 4.0 ms at 4K (Appendix A, table C). `overview`, with all 165,000 soldiers in view as impostors and dabs, is the cheapest shot (6.3 ms, GPU 4.1): **the count itself is not the cost**.

### 3.2 Where the time goes (Measured)

Per pass at 1080p (WebGPU, median, ms): shadows 0.4 to 2.0, scene 1.7 to 2.6, particles 0.2 to 2.7, bloom 0.33, post 0.47 to 0.52. Ablation (all minus without, three repeats, simulation time frozen, noise about 0.5 ms), WebGPU, `line` (9.2 ms GPU): **smoke and effects 4.5 ms (49 percent)**, mid LOD 2.1, shadows 1.8, guns 0.5, terrain 0.4, near LOD 0.25, post 0.2; `battery` (7.5 ms): particles 2.6, mid 1.95, shadows 1.7. WebGL2 `line` (22.0 ms): **mid LOD 10.8**, shadows 7.8, particles 4.6, near 3.6, guns 3.3, terrain 3.1. The empty scene (sky only) costs 0.65 ms, the floor of the pipeline. A stress run with the guns firing six times as often (live events 3,200 to 3,900): WebGPU `battery` 14.4 ms and `line` 18.5 ms, particles 6.8 and 11.2 ms: **smoke overdraw is the first thing to break the budget**, which is why volumetric smoke (G12) is a baked or half-resolution design, not a raymarcher everywhere.

### 3.3 Scaling slopes (Measured, 1080p)

- **Near LOD, WebGPU, Arc GPU:** with the near mesh at 2.9k triangles, going from 0 to 310 near soldiers (0.9 million triangles) adds 0.3 ms (flat within noise); at 9k triangles (315 soldiers, 2.8 M) it adds 1.4 ms (**0.5 ms per million**); at 19k (334 soldiers, 6.5 M) it adds 5.8 ms (**0.9 ms per million**). **RTX PRO 1000:** 0.54 ms per million (19k triangles, 302 near soldiers, +4.9 M triangles for +2.6 ms). **WebGL2, Arc:** 3.0 ms per million at 2.9k and **4.3 ms per million at 19k** (342 near soldiers add 28 ms).
- **Mid LOD, WebGPU:** 0 to 4,062 mid soldiers of 1,152 triangles (4.6 M triangles) adds 3.9 ms: **0.84 ms per million triangles, 0.95 microseconds per soldier**. WebGL2: 3.5 microseconds per soldier.
- **Near-LOD CPU:** pose plus forward kinematics is **1.84 microseconds per soldier** in allocation-heavy placeholder JavaScript (`anim-tests.mjs`), 0.25 to 0.77 ms for 124 to 334 near soldiers in the page.

### 3.4 What this means for film-grade geometry (Computed from 3.3, then Modelled)

At 60 fps the budget is 16.7 ms. Fixed costs on the Arc GPU (sky 0.65, terrain 0.4 to 0.6, post 0.5 to 0.9, bloom 0.3, smoke up to 4.5 ms in dense musketry, margin 3 ms) leave about 7 ms for characters, i.e. about 8 million near-plus-mid triangles at the measured slopes. **Film-grade at fixed radii** costs: 300 near soldiers of 50k triangles (15 M) at 0.5 to 0.9 ms per million = 7.5 to 13.5 ms, plus 5,000 mid soldiers of 3k (15 M) at 0.84 = 12.6 ms: **20 to 26 ms**; with 600 near soldiers (30 M) it is 15 to 27 ms plus 12.6: **27 to 40 ms**. On the RTX laptop (0.54 near; mid assumed the same) 15 to 24 ms. Over budget on both.

**The rule that closes it (Modelled):** choose each soldier's LOD from its projected size so the silhouette error is at most half a pixel and a triangle covers at least 4 square pixels. A 1.8 m soldier is h = 1,683 / d pixels tall at 1080p (60 degree vertical field of view, d in metres: 1.8 x 1,080 / (2 d tan 30 degrees)). Its silhouette is about 0.18 h squared pixels (shoulders 0.5 m, fill factor 0.65), which needs about 0.09 h squared = 255,000 / d squared triangles (front and back): 10,000 at 5 m, 2,500 at 10 m, 640 at 20 m, 160 at 40 m. For a dense formation (1.8 soldiers per m squared) filling a 16:9 view (horizontal width 2.06 d) from 3 m to 120 m the triangle total is the integral of (255,000 / d squared) x 1.8 x 2.06 d dd = 945,000 x ln(120 / 3) = **3.5 million** (4.4 million out to 300 m), with impostors taking over below about 17 pixels tall (about 100 to 120 m). At 4K the heights double and the triangle total quadruples: 14 to 18 million. At the measured slopes that is **3 to 4 ms on the Arc GPU at 1080p** and 7 to 9 ms at 4K on the RTX laptop (0.5 ms per million). This is a design rule and arithmetic, not a measurement: the first build step implements it and measures (section 6, step 3). The floor (the smallest mesh a mid-range soldier may use) matters: 4,400 soldiers at 1,152 triangles already cost 3.9 ms, so the mid mesh must fall to a few hundred triangles at 60 to 100 m.

### 3.5 Pacing, fly-through (Measured; 600 frames over all seven shots, camera moving)

| | mean ms | p95 | p99 | max | frames over 16.7 ms | frames over 1.5 x median |
|---|---|---|---|---|---|---|
| WebGPU, film config | 6.15 | 9.0 | 10.2 | 12.1 | 0 of 600 (max is below 16.7) | 17 |
| WebGPU, 3x camera speed | 6.56 | 9.1 | 11.0 | 12.8 | 0 of 600 | 26 |
| WebGPU, 4x CPU throttle | 7.76 | 11.4 | 13.6 | 22.1 | at least 1 (max 22.1; count not recorded) | 39 |
| WebGL2, film config | 9.96 | 16.0 | 17.7 | 18.0 | more than 1 percent (p99 above 16.7) | 43 |
| WebGL2, 3x camera speed | 12.03 | 21.9 | 26.1 | 47.2 | more than 5 percent (p95 above 16.7) | 106 |

(The last column is relative to each run's own median and counts small jitter; the absolute column is the gate.) WebGPU holds 60 fps through the whole flight with no frame over budget (unthrottled); WebGL2 has frames at 47 ms during fast camera motion. Static-shot standard deviation is small; the large single-run ranges in Appendix A are the shared machine.

### 3.6 Memory, load, bytes (Measured, Computed)

Resources the page creates: **117 MiB at 1080p, 206 MiB at 4K** (shadow maps 32, aerial with mips 21.3, height 9.0, impostor atlases 11.3, soldier tables 5.0, VAT 4.6, poses 1.6, everything else under 1 MiB each). Chrome's counters show **313 MiB (1080p) and 614 MiB (4K) shared GPU memory on the Arc iGPU**, and 223 and 428 MiB dedicated (plus 113 and 255 MiB shared) on the NVIDIA GPU. Load to first frame **0.83 to 1.06 s** over six runs (0.31 to 0.40 s of it baking the VAT, impostor atlases and bone matrices); **5.55 MB** over the wire (terrain heights 4.4 MB gzipped, aerial 1.1 MB, code 42 KB gzipped on the WebGPU path).

### 3.7 GPU compute microbenchmarks (Measured, `prototype/compute.html`, ms per dispatch)

| Kernel | Arc iGPU | RTX PRO 1000 |
|---|---|---|
| LOD cull + 3-class bin, 165,000 soldiers | **0.16** | 0.03 |
| same, 660,000 | 0.60 | 0.10 |
| pose blend (2 clips) + forward kinematics, 600 soldiers x 24 bones | 0.02 | 0.04 |
| same, 600 x 60 bones | **0.05** | 1.22 |
| same, 20,000 x 24 bones | 1.2 | 0.31 |
| same, 20,000 x 60 bones | **5.1** | 7.2 |
| same, 165,000 x 24 bones | 10.6 | 2.5 |
| same, 165,000 x 60 bones | 43.9 | 52.1 |
| spring bones, 6,000 | 0.002 | 0.002 |
| spring bones, 1,650,000 (165,000 x 10) | **2.0** | 0.5 |

Reading: GPU culling and binning of every soldier is nearly free; **pose evaluation on the GPU is negligible at near-LOD scale (0.05 ms for 600 soldiers of 60 bones) and affordable at the top of the mid range (5.1 ms for 20,000), but too expensive for all 165,000 at 60 bones (44 ms)**, so the far LOD must stay on baked flipbooks; secondary motion for every soldier on the GPU is affordable. (The serial-FK kernel is not optimised; the NVIDIA 600 x 60 and 20,000 x 60 numbers show a driver and register-pressure effect I did not investigate: **Unknown**.)

---

## 4. Engine decision: a custom WebGPU renderer

### 4.1 Options and what is known

| | three.js | Babylon.js | custom WebGPU (this prototype) |
|---|---|---|---|
| Licence | MIT, "Copyright 2010-2026 three.js authors" (Documented: raw.githubusercontent.com/mrdoob/three.js/dev/LICENSE) | Apache-2.0 (Documented: raw.githubusercontent.com/BabylonJS/Babylon.js/master/license.md) | ours |
| Version read | 0.186.1 (jsdelivr, 2026-10) | @babylonjs/core 9.31.0 | n/a |
| Size | `build/three.module.js` 662,772 bytes and `build/three.webgpu.js` 2,284,850 bytes **unminified** (Documented: data.jsdelivr.com/v1/package/npm/three@0.186.1/flat); minified and gzipped sizes **Unknown** (not in that listing, not downloaded) | modular ES6 packages; `BakedVertexAnimation/bakedVertexAnimationManager.js` 9,186 bytes; total tree-shaken size **Unknown** | **131 KB raw, 41.8 KB gzip** for the whole WebGPU path (page, world, characters, shaders, renderer); 185 KB raw / 52.2 KB gzip with the WebGL2 path |
| WebGPU | `WebGPURenderer` with automatic WebGL2 fallback, `forceWebGL` (Documented: threejs.org/docs/pages/WebGPURenderer.html); compute and timestamp pages not read | WebGPU implementation "complete", compute shaders listed only as future optimisation (Documented: doc.babylonjs.com/setup/support/webGPU/webGPUStatus) | built; compute microbenchmarks run |
| Many instances | `InstancedMesh`; `BatchedMesh` (per-object frustum culling and sorting; the page says nothing about skinning) | thin instances | built (165,000) |
| Baked animation | no crowd animation system read | `BakedVertexAnimationManager`: per-instance parameters, but **no simultaneous blending of animations and no interpolation between frames** (Documented: doc.babylonjs.com/features/featuresDeepDive/animation/baked_texture_animations) | VAT and bone-matrix bakes with frame interpolation; blend trees to build |

### 4.2 Decision and reasoning

1. **What decides feasibility is custom in any engine.** Unit-driven stateless placement of 165,000 soldiers, three baked-animation LODs, impostor flipbooks with per-soldier stochastic coverage, stateless particles and per-pass GPU timing are shader and buffer work; neither engine ships them, and the 165,000 soldiers could not be scene-graph objects in either, so both would be bypassed for the part that matters. The engines would supply materials, shadows, post and loaders: about one third of this prototype's code (Modelled, by reading the file sizes).
2. **The measured WebGPU advantage is large where the budget is tight.** Near-LOD triangles 0.5 to 0.9 ms per million on WebGPU against 3.0 to 4.3 on WebGL2 on the same GPU; mid LOD 0.95 against 3.5 microseconds per soldier; fly-through p99 10.2 against 17.7 ms and a 47 ms worst frame in WebGL2. Both engines can target WebGPU, so the advantage is not a reason to choose the custom path by itself; it is the reason **WebGPU is the main path** and the WebGL2 tier must carry fewer near-LOD triangles (a hard 2.9k to 5k triangle near mesh on WebGL2).
3. **Size and control.** The custom path is 41.8 KB gzipped against three.module.js at 662,772 bytes unminified (and 2.28 MB for the WebGPU build); that is not like-for-like (the prototype has no loaders, no glTF and no general material system, which a production build will add); Babylon's baked-animation manager lacks the blending and interpolation the "no popping" gate needs, which the custom path already has.
4. **Cost of the choice.** Owning the renderer means owning its bugs and its staffing (section 7 includes it: work package WP1 is 520 KB of code). Mitigation: keep the renderer behind the narrow interface the prototype uses (`create`, `frame(t, camera)`, `resize`), keep all asset formats standard (glTF with meshopt, KTX2), and use three.js (MIT) only in the offline asset pipeline (loaders, exporters, validation) where its size does not ship.

### 4.3 Availability (Contested, Documented)

caniuse (caniuse.com/webgpu, read) shows global usage 87.82 percent, Chrome and Edge from 113, Chrome for Android 155, Safari 26 to 27 (partial), **Firefox not supported in every listed version**. A web.dev article and Khronos (found by search, not opened) say WebGPU is supported in all major browsers and give Firefox 141 on Windows (July 2025). **The two sources disagree on Firefox; treat Firefox as Unknown until tested.** Consequence for the plan: ship a WebGL2 tier (measured here, 1.3 to 2.2 times slower, hard near-LOD cap) and a "device cannot run the theatre" screen with the main map as the fallback.

### 4.4 What I did not do, and the one permission it needs

I did not benchmark three.js `WebGPURenderer` or Babylon.js on this scene. The brief asks to pick and justify; the justification above rests on documented limits and on measured numbers for the custom path, not on a like-for-like run, because the run needs the packages (`three@0.186.1`, `@babylonjs/core@9.31.0` from npm, a few MB each) and downloading is something I may not do without the owner saying so. **Decision gate:** if the owner replies yes, the first task of the build is the same seven-shot benchmark on both engines (about half a day of agent work, about 300k tokens); if either engine comes within 1.3 times of the custom path on `line` and `overview` at 1080p and 4K with the same assets, adopt it and drop WP1's renderer core to roughly 40 percent of its size.

---

## 5. The film-grade gates

For every gate: **how it is measured, the target number, today's number, what real time can do today, what needs offline baking or compute, and the exact path**. Targets are the full spec; nothing is relaxed. Pixel arithmetic used below (Computed): at 1080p with a 60 degree vertical field of view one pixel is 1.07 mm per metre of distance (2.1 mm at 2 m, 5.3 mm at 5 m, 43 mm at 40 m); at 4K half of that.

### Summary

| # | Gate | Target (short) | Today (placeholder, Measured) | Status |
|---|---|---|---|---|
| G1 | Throughput and pacing | 60 fps, p99 <= 16.7 ms, 0.1 percent of frames over, 1080p iGPU and 4K dGPU; CPU <= 8 ms at 4x | 1080p iGPU 6.2 to 11.0 ms, 0 of 600 frames over; 4K iGPU 12.9 to 26.3 ms | Met at 1080p, **not met at 4K iGPU**; assets will be 10x heavier |
| G2 | Count and individuality | rendered = present; each soldier its own position, heading, phase | 165,000 of 165,000 every frame | Met (placeholder numbers) |
| G3 | Mocap fidelity and sampling | optical mocap at 120 Hz or more, joint error <= 0.5 cm, bake error <= 0.5 px at the LOD switch | analytic clips; 32-frame bake: mean 0.3 to 1.0 mm, max 18 to 102 mm | **Not met** (no mocap) |
| G4 | Blend trees, no popping | per-frame vertex step <= 2x the clip's own, LOD swaps <= 0.5 px and 2 L* | instant switches jump 24 to 232 mm mean | **Not met** |
| G5 | Foot planting and terrain | slip <= 1 cm per step; foot-to-ground <= 2 cm p95 up to 30 degrees | slip 21 cm (march); foot error p95 3.9 to 17.7 cm | **Not met** |
| G6 | Pose naturalness | zero joint-limit violations; centre of mass inside support <= 5 cm | not implemented | **Unknown** |
| G7 | Cloth and gear secondary motion | spring bones on gear and coat, 3 to 8 Hz | cost measured: 2.0 ms for 1.65 M springs on the GPU | Cost met; motion not built |
| G8 | Crowd variation | no two neighbours within 10 m identical in body, face, gait, timing | 1 body, 0 faces, 1 clip per state | **Not met** |
| G9 | State coverage | every state on the list, 75 states, 600 clips | 7 soldier clips, 3 horse clips | **Not met** (10 of about 75) |
| G10 | Record conformance | rendered position error <= 0.1 m, heading <= 3 degrees against the timeline | placeholder timeline | Harness only |
| G11 | Lighting, materials, shadows | sun from date, time, place; 2 cm shadow texels at 5 m; per-uniform colour within delta E 3 | GGX, 2 cascades, 4.4 cm texel | Partly |
| G12 | Artillery fire and impact | flash, smoke, debris, ground effect; smoke at most 4 ms | all four present as billboard effects; 4.5 ms in dense musketry | Cost at limit; look not film-grade |
| G13 | Terrain and world | 1 m ground sample and 25 cm colour within 300 m | 4 m and 2.9 m | **Not met** |
| G14 | Horses, riders, commanders | every commander his own mesh, face, kit, animation set | 1 horse mesh, 1 rider | **Not met** |
| G15 | Memory, load, bytes | <= 2 GiB GPU, <= 60 MB first interactive, streamed after | 117 MiB, 5.55 MB | Met today; full-scale Computed in G15 |
| G16 | Determinism and seek | render(t) bit-identical for any t, scrub in <= 100 ms | stateless motion; effects history replayed | Partly |

### G1. Throughput and frame pacing
- **Measure:** `run-bench.mjs base` (7 static shots), `fly` (600 frames moving camera); completion-cadence frame times (mean, p95, p99, max), frames over 16.7 ms, GPU pass sums from timestamp queries, CPU main-thread ms at 4x throttle; 1080p and 4K; reference machines R1 (Arc iGPU laptop, this) and R2 (RTX laptop).
- **Target:** 60 fps with p99 <= 16.7 ms and at most 0.1 percent of frames over 16.7 ms, no frame over 2x the median: 1080p on R1, 4K on R2; CPU <= 8 ms at 4x throttle; 30 fps floor on R1 at 4K.
- **Today (Measured):** R1 1080p 6.2 to 11.0 ms, fly-through p99 10.2 and max 12.1 ms, 0 of 600 over budget; R1 4K 12.9 to 26.3 ms; R2 1080p 2.9 to 5.1, 4K 4.6 to 10.9; CPU 2.7 to 6.0 ms at 4x.
- **Real time today:** yes, with placeholder assets. **Gap:** assets will be about 10x heavier in triangles (section 3.4); 4K on R1 misses today.
- **Path:** (1) screen-space-error LOD (section 3.4) so geometry is resolution-bound; (2) GPU pose evaluation for near and mid lists (G4); (3) smoke at half resolution with baked volumes (G12); (4) temporal upscaling (render 1440p, present 4K) as a resolution lever on R1 only, with the gate's quality bar applied to the output; (5) a frame-time governor that moves LOD radii and resolution scale, never the content (no soldier, gun or event is ever dropped); (6) the gate runs in CI on R1 and R2 before any asset batch merges.

### G2. Count and individuality
- **Measure:** instances submitted per class (`stats.farFoot + farMnt`), a unit test that the sum of unit sizes equals the roster-present number, a GPU readback of an ID buffer from a set of camera positions confirming every un-occluded soldier appears.
- **Target:** rendered total = number present (the roster team's figure replaces 165,000); every soldier has its own position, heading, phase, rate, scale, tint and fall time; zero soldiers dropped by caps.
- **Today:** 165,000 of 165,000 submitted every frame (153,000 foot, 12,000 mounted); every soldier carries its own seed (phase, rate, scale, tint) and its own fall time; largest mid list 4,886 of 60,000, near 334 of 1,536; **the in-frustum drawn count and the ID-buffer test are not built (Unknown)**.
- **Path:** add the ID-buffer visibility test to the harness; raise caps from data.

### G3. Mocap fidelity and sampling
- **Measure:** per clip, round-trip error of runtime joint positions against the source solve (RMS and max, cm); bake interpolation error of VAT or bone matrices against exact evaluation (`anim-tests.mjs`), converted to pixels at the LOD switch distance; source rate and marker set recorded in the clip manifest.
- **Target:** optical motion capture at 120 Hz or more with at least 41 markers solved to a 24-joint-or-more skeleton; runtime error <= 0.5 cm RMS at LOD0; bake error <= 0.5 px at the distance where the LOD hands over (2 cm at 40 m on 1080p).
- **Today (Measured):** the clips are analytic (no mocap). Bake error with linear interpolation of 1-second loops at 16, 32, 64, 128 frames per clip: march mean 1.19, 0.32, 0.08, 0.02 mm and max 24.4, 18.3, 9.2, 3.9 mm; run max 39.5, 29.6, 14.9, 6.4 mm; the 4.2-second load clip (nine pump motions) max 272, 102, 57, 46 mm. At 32 frames the march clip is 0.42 px at 40 m (met) and the load clip 2.4 px (not met).
- **Real time today:** yes for the playback; the source data does not exist yet. The CMU Graphics Lab motion capture database is recorded at 120 Hz (a mirror's summary, found by search; the official page failed a certificate check and was not opened; its licence is therefore **Unknown** here). Mixamo's terms page returned HTTP 403 and was not read.
- **Path:** commission a capture of the state list in G9 with Civil War re-enactors using period weapons (the weapons are the hard part: no public library has loading in nine times); solve to the 24-joint rig; store curves at 120 Hz for LOD0, bake bone-matrix textures at the rate the table above requires (at least 60 frames per second of clip for fast clips, 120 for the load and fire motions) for LOD1; **do not bake VAT for the mid LOD** at this length (G15 numbers).

### G4. Blend trees and no popping
- **Measure:** for every allowed state edge, the mean and max vertex displacement at the transition frame divided by the same clip's largest 60 Hz step (`anim-tests.mjs`); LOD swap error as the silhouette difference in pixels and the mean CIELAB L* difference of the soldier between adjacent LODs at the swap distance, in a rendered diff.
- **Target:** at every transition the per-frame vertex step <= 2x the in-clip maximum; transitions are cross-faded for 0.15 to 0.3 s with foot-phase matching; LOD swaps invisible: <= 0.5 px silhouette and <= 2 L*, with dithered cross-fade and hysteresis.
- **Today (Measured):** instant switches between clips pop by a mean of 24 mm (load to fire) up to 232 mm (load to double-quick) and a maximum of 203 to 962 mm, equal to 5 to 2,200 normal frame steps (idle to march: 0.17 mm normal step, 229 mm jump). LOD brightness mismatch was visible in the first screenshots (impostors about 2.8 times too bright, fixed by a constant) and `webgpu-wide.jpg` still shows far-LOD columns as light-blue bars beside darker mid-LOD lines; there is no cross-fade and no hysteresis yet; **no L* measurement was made (Unknown)**.
- **Real time today:** blending two clips costs one extra fetch and a quaternion nlerp per bone; the GPU kernel for 2-clip blend plus FK is 0.05 ms for 600 soldiers x 60 bones and 5.1 ms for 20,000 x 60 on the Arc GPU (section 3.7).
- **Path:** a per-soldier animation state machine (state, time in state, blend target, blend weight) evaluated in a compute pass for the near and mid lists, written to the pose buffers the near shader already reads; transitions authored as explicit clips where physics demands (fall onset from march, stop from run); LOD cross-fade by alpha-hash dither over 0.3 s with hysteresis of 10 percent in distance; the harness asserts the numbers above for every edge and fails the build on a violation.

### G5. Foot planting, slip, terrain conformance
- **Measure:** world-frame drift of each stance foot over its stance interval (cm per step), at nominal speed and at speed mismatch (`gait-test.mjs`); foot-to-ground height error in stance on the real DEM slopes (p95 and max).
- **Target:** slip <= 1 cm per step at LOD0 and LOD1 (<= 3 cm at the impostor), foot-to-ground <= 2 cm p95 and <= 4 cm max in stance on slopes up to 30 degrees, no foot penetration visible at 2 mm per pixel.
- **Today (Measured, placeholder cycle):** slip 21 cm per step at nominal march speed (10 cm at the best matched speed, 36 cm for the run); foot-to-ground error without IK, soldier walking 60 m along the steepest line within 80 m of the point: p95 3.9 cm (max 4.3) on a 2.3 degree window near the Copse of Trees, **13.3 cm (max 16.1) on a 17.8 degree window at Little Round Top, 17.7 cm (max 20.9) on a 20.3 degree window at Culp's Hill**, and 38 to 85 percent of stance samples more than 2 cm off the ground; 4.7 percent of the battlefield window is steeper than 10 degrees and 0.76 percent steeper than 20 (3DEP, 8 m central difference). The placeholder legs are straight at rest (zero knee headroom): a stance plateau needs hip height to follow a vertical bob of 5.0 cm for a 0.575 m step (Computed: 0.85 - sqrt(0.85 squared - 0.2875 squared) = 5.0 cm).
- **Real time today:** yes: analytic two-bone IK plus a per-foot plant constraint is a few microseconds per soldier on the CPU for the near list (pose plus FK is 1.84 microseconds now) or inside the pose compute pass.
- **Path:** mocap with stance flags (contact detection from foot height and velocity); speed-matched playback (rate = soldier speed / clip speed, clamped 0.85 to 1.15, else blend to the next speed clip); stance foot pinned and the leg solved with two-bone IK against the 3DEP height at the foot (the terrain texture is in the shader already); pelvis height follows; Kovar, Schreiner and Gleicher's footskate-cleanup solver (SCA 2002, Documented: research.cs.wisc.edu/graphics/Gallery/kovar.vol/Cleanup) is the reference method, designed to run online in games; the harness measures slip per step per clip per speed ratio and fails above the gate.

### G6. Pose naturalness (joint limits and balance)
- **Measure:** per frame, every joint rotation within its documented range (knee 0 to 150 degrees flexion, elbow 0 to 145, spine <= 45 forward, neck <= 60, shoulder and hip ranges), zero violations; centre of mass projection inside the support polygon (<= 5 cm outside) during stance; rifle-hand attachment error <= 1 cm.
- **Today:** not implemented. The placeholder authors rotations directly and has no limits; **Unknown**.
- **Path:** a joint-limit table in the rig manifest, a test over all clips at bake time (the same loop that computes G3), and an authoring-time reject; centre of mass from a bone-mass table (De Leva style segment masses; not read in this session). Real mocap satisfies limits by construction; retargeting and IK are where violations appear, so the test runs after IK.

### G7. Cloth and gear secondary motion
- **Measure:** presence of spring or chain bones on every loose item (canteen, cartridge box, haversack, blanket roll, bayonet scabbard, coat skirts, sash, sabre scabbard, tassels, flag cloth) with natural frequencies 3 to 8 Hz and damping 0.3 to 0.6; max excursion within 5 cm of a reference offline simulation; cost.
- **Today (Measured cost):** 6,000 spring bones (600 near soldiers x 10) cost 0.04 ms per frame on the CPU in scalar JavaScript, and 1.65 million (165,000 x 10) cost **2.0 ms on the Arc GPU** (0.5 ms on the RTX). Not built into the characters.
- **Path:** spring bones on the GPU in the pose compute pass for near and mid lists (about 20,000 soldiers x 10 = 0.25 ms by the measured per-spring rate), cloth (flags, coat skirts) as 8 x 8 chain meshes solved in the same pass, flags with baked wind-driven flipbooks for the far LOD. Hero commanders get a full cloth solve.

### G8. Crowd variation (no clones)
- **Measure:** for every pair of neighbours within 10 m, the signature (body mesh, face, uniform kit, gear set, gait clip, phase bucket of 50 ms, scale bucket of 2 cm); the share of identical signatures must be below 0.1 percent; plus a visual repetition test on 100 random crops.
- **Target:** at least 12 body meshes, 24 heads per army and complexion, 8 gait clips per state, per-regiment kits, continuous phase, rate (0.92 to 1.08), scale (0.95 to 1.06) and wear.
- **Today (Measured):** 0.41 percent of adjacent pairs share a coarse signature (23 of 5,591) from the continuous parameters alone, with 1 body mesh, 0 faces, 1 clip per state. Fails by construction.
- **Path:** the kit system (WP4); variation drawn from a per-soldier seed already in the soldier table; the harness computes the signature for every soldier and fails above the gate. Cost of variation in the renderer is texture arrays and a few more mesh variants in the instance buffer: negligible next to G15.

### G9. Animation state coverage (list, from the owner's text)
About 75 states, each needing at least 6 variants (about 600 clips). Marching: route step, quick time, double-quick, wheeling, halting; forming and dressing lines and columns, facing, right and left oblique; the nine motions of loading; firing by file, by rank, by volley, by company, standing and kneeling front rank; bayonet charge, parry and thrust; taking cover (prone, behind a wall, behind a tree); falling when hit (back, front, sideways, knee-first, spin, clutching wound, dropping the rifle); lying wounded, dead, crawling; carrying the wounded (two-man, four-man stretcher, helping a limping man); officers on horseback giving orders (pointing, saber raised, speaking, turning); colour-bearers (carrying, planting, falling with the colours, the colours taken up); artillery crews serving the piece (sponge, load, ram, prime, lanyard, handspike traverse, run-up, ammunition carry); drivers and limbers (mounted driver, limber up and down, team halting); skirmishers (loose, kneel, load, advance by rush); cavalry (walk, trot, gallop, charge, saber cut, pistol, saber fight in pairs); retreating, running, looking back; surrendering (hands up, dropping the rifle); burying; resting, eating, drinking, sitting, smoke clearing.
- **Measure:** the event list from the timeline (every record the history team produces) mapped to states; coverage = events with a state / events.
- **Today:** 7 soldier states and 3 horse states, 10 of about 75.
- **Path:** multi-actor captures (stretcher, saber fights, gun crews) are separate sessions; the state machine of G4 carries the graph; coverage is measured against the history team's event list, 100 percent target.

### G10. Position and orientation conformance (render side)
- **Measure:** the renderer's output position, heading and activity for any soldier at any t compared against the timeline file: position error <= 0.1 m, heading <= 3 degrees, activity equal, over the whole battle (sample every soldier at 10,000 random times).
- **Target:** exact to the timeline within those tolerances; the **fidelity** of the timeline against the record (the owner's 97 percent) is the history and data teams' gate, not the renderer's.
- **Today:** the prototype's timeline is a placeholder; the CPU mirror (`soldierPlace`, `soldierClip`) agrees with the shaders by construction and the page uses it for LOD; the equality of the two implementations is **not yet tested numerically (Unknown)**.
- **Path:** timeline format (per-unit piecewise paths plus per-soldier slot offsets and event keyframes), a CPU reference evaluator and a GPU readback test of the shader against it for 10,000 random (soldier, t) pairs.

### G11. Lighting, materials, shadows
- **Measure:** sun direction computed from date, time and the site's latitude and longitude (Computed, not hand-set); shadow texel size at 5 m; per-uniform albedo against the research team's reference swatches (CIELAB delta E <= 3); energy conservation test (white furnace); no clipped highlights in more than 1 percent of pixels outside the flash.
- **Today:** the sun is a fixed direction; GGX with a per-team material table; cascade 0 texel 4.4 cm at 45 m radius, cascade 1 25 cm at 260 m (Computed: 2R / 2048); shadow cost 0.4 to 2.0 ms.
- **Real time today:** yes, up to 4 cascades at 2 to 4K (cost scales with casters).
- **Path:** four cascades with the near one at 8 m radius and 4096 x 4096 texels (Computed: 2 x 8 m / 4096 = 3.9 mm per texel, inside the 2 cm gate with room for filtering), contact-hardening PCF, screen-space AO, sheen for wool, per-kit albedo from the swatches (the uniform research team's data), sky from a physically based model with the documented sun position.

### G12. Artillery fire and impact
- **Measure:** muzzle flash duration and radius against reference (80 to 150 ms), smoke plume lifetime (15 to 25 s), impact dirt column height (10 to 25 m for a field-gun shell), debris count and ballistic correctness (instanced meshes, not billboards, within 40 m), recoil excursion and run-out of the piece (0.5 to 0.6 m for a 12-pounder Napoleon is a **Modelled** figure; the data comes from the artillery team); GPU cost of effects <= 4 ms at 1080p in the worst shot.
- **Today (Measured):** all four exist as billboard effects with soft depth fade; the flash is HDR (bloom); recoil is an exponential run-out of 0.55 m; the particle pass costs 0.2 to 2.7 ms across the seven shots and 4.5 ms by ablation in dense musketry (up to 11.2 ms with six times the gun rate). The look is placeholder.
- **Real time today:** at the cost limit.
- **Path:** (1) smoke as baked fluid-simulation flipbooks and 3D textures (offline; a Houdini or open-source solver) played back as lit, depth-sorted volumes at half resolution with temporal reprojection; (2) hero shots (a gun within 30 m) get a raymarched volume at quarter resolution, budget 1.5 ms (**Unknown** until built); (3) debris as instanced meshes simulated in a compute pass (a rigid ballistic step, a few thousand chunks, below 0.1 ms by the spring-bone rate); (4) crew animation tied to the gun's firing cycle by event.

### G13. Terrain and world
- **Measure:** ground sample spacing and colour resolution within 300 m of the camera; seam and popping in the terrain LOD; horizon error.
- **Target:** 1 m ground sample and 25 cm colour within 300 m (the DEM is 1 m native: Documented in `docs/pitch/anim2/basemap/README.md`; NAIP best tile 0.459 m per pixel, only where tiles exist).
- **Today:** 4 m heightfield and 2.9 m colour; the terrain is the modern surface (quarry, roads); no trees, fences or buildings of 1863.
- **Path:** clipmap heightfield streamed from tiles, virtual texturing from the z17 NAIP tiles plus detail layers, and the 1863 landscape layers (fields, woods, fences, buildings) from the basemap1863 team as instanced objects; this is mostly data work.

### G14. Horses, riders, commanders
- **Measure:** one mesh, face, kit and animation set per commander in the roster list; share of commanders with an individual model; riders match their mounts' gaits.
- **Target:** every commander built and animated individually, including Rufus Dawes: 100 percent of commanders (the roster team fixes the count; the placeholder world has 592 line and column units, and the brigade, division, corps and army commanders come on top).
- **Today:** one horse mesh in four coat colours and one rider; no commanders.
- **Path:** a commander pipeline: photograph-based head models where photographs exist (many do; the rest from descriptions and kin, labelled), individual kit and gesture sets; about 2 to 4 artist-days each (Modelled), loaded on demand by distance (G15).

### G15. Memory, load, bytes (Computed for the full scale)
- **Measure:** resources the page creates, Chrome GPU process counters, bytes over the wire, load to first frame and to full detail.
- **Target:** <= 2 GiB GPU, <= 60 MB for first interactive, everything else streamed by camera position and battle time.
- **Today (Measured):** 117 MiB, 5.55 MB, 0.8 to 1.1 s.
- **Full-scale estimate (Computed; every line shows its arithmetic):**

| Item | Arithmetic | Size |
|---|---|---|
| Near character bodies | 12 bodies x 40k triangles x 0.55 vertices per triangle x 32 B + indices 12 x 40k x 12 B | 14 MB |
| Equipment and kit meshes | 150 items x 6k triangles x 0.55 x 32 B | 16 MB |
| Commander heads | 800 x 15k triangles x 0.55 x 32 B | 211 MB (stream by distance) |
| Textures, uniform kits | 30 kits x 4096 x 4096 BC7 (1 B per pixel) x 1.33 for mips | 670 MB (2048 squared for most kits: 167 MB) |
| Commander faces | 800 x 512 x 512 BC7 x 1.33 | 280 MB (stream) |
| Bone-matrix animation, 600 clips | 600 x (3 s x 60 Hz = 180 frames) x 60 bones x 3 texels x 8 B (RGBA16F) | **156 MB** |
| The same as per-vertex VAT (mid mesh 3,000 vertices) | 600 x 180 rows x 3,000 x 8 B | **2.6 GB: infeasible** |
| Impostor flipbooks | 8 views x 8 frames x 75 clips x (48 x 64 B at BC7 x 3 maps) per set; 10 sets | 440 MB |
| Terrain | 3DEP 1 m, 6.1 x 6.1 km: 37 M samples x 2 B; NAIP 0.46 m: 13,260 squared px at BC7 x 1.33 | 74 MB + 234 MB |
| Render targets at 4K | HDR 66 + depth 33 + history 66 + bloom 45 | 210 MB |
| Shadows | 4 cascades x 4096 squared x 4 B | 268 MB |
| **Total, everything resident** | 14 + 16 + 211 + 670 + 279 + 156 + 442 + 74 + 234 + 210 + 268 | **2.57 GB** |
| **Resident set with streaming** | 2048-squared kits (-503), 10 percent of heads and faces resident (-441) | **about 1.6 GB** (under the 2 GiB gate) |

So the bone-matrix choice in section 2 is what keeps animation at 156 MB instead of 2.6 GB, and commander heads, faces and kits must stream by distance. Total content on disk about 1.2 GB (meshopt, KTX2); first interactive under 60 MB means terrain at coarse level, one body, one kit per army, and impostors; the rest streams.

### G16. Determinism and seek
- **Measure:** `render(t)` bit-identical (hash of the framebuffer) for the same t reached by playing or by seeking; scrub to any t in <= 100 ms to first correct frame.
- **Today:** soldier motion is stateless (a function of t); effects are event histories: the page's `seek(t)` replays 30 s of events at 0.1 s steps (about 0.3 s). **Bit-identity not tested (Unknown).**
- **Path:** generate effect events from a precomputed schedule so that `events(t0, t1)` is a pure function; keep the smoke state analytic (it is); add the hash test to CI.

---

## 6. Path to the gates: build order

1. **Lock the contracts** (a day or two of agent time plus owner review): timeline format (G10), rig manifest (bones, limits, sockets), clip manifest (source rate, states, stance flags), kit manifest (per-regiment uniform and gear sets), event list to state map (G9). Every later step reads these.
2. **Mocap and asset programme starts at once** (long lead): capture plan for the 75 states, a commander and kit art pipeline, re-enactor and horse sessions. Nothing in the renderer can substitute for these.
3. **Renderer v1** (WP1): screen-space-error LOD and the 4-LOD chain with cross-fade (section 3.4); GPU pose compute and state machine (G4); foot IK (G5); clipmap terrain; baked smoke; frame governor (G1). Measure the same seven shots and the three scaling suites; the gate: G1 holds with film-grade near and mid meshes on R1 at 1080p and R2 at 4K.
4. **Animation system and harness** (WP2, WP6): blend trees, transitions, secondary motion, joint-limit and slip tests in CI.
5. **Content flow** (WP3, WP4): timeline streaming, kit assembly, commander loading.
6. **Roster page** (WP5), **integration and hardening** across Chrome, Edge, Safari, Firefox and the WebGL2 tier.
7. **Soak and device matrix:** one-hour sessions for thermal throttling, a second iGPU, a mid dGPU.

---

## 7. Effort and token estimate (Modelled, with a Measured calibration)

**Calibration (Measured):** this job: about 245 KB of delivered code and tools (src 185 KB, tools and pages 60 KB, 1,854 long lines) for about **620,000 tokens** all-in (design, writing, debugging, running benchmarks, reading about 25 screenshots, research) in about 1.7 hours of wall time: **2.5 thousand tokens per delivered KB**. Production code needs tests, hardening and rework: factor 1.0 (low), 1.6 (likely), 2.5 (high) on top (Modelled).

| WP | Scope | Production code | Tokens, low / likely / high |
|---|---|---|---|
| WP1 | Renderer core: WebGPU main path and WebGL2 tier, SSE LOD with cross-fade, GPU culling and indirect draws, CSM, clipmap terrain with virtual texturing, baked and half-resolution smoke, debris, TAA and upscaling, materials, streaming, UI, timeline scrubber, camera paths, governor | 520 KB | 1.3 M / 2.1 M / 3.3 M |
| WP2 | Animation: state machines, blend trees, GPU pose compute, foot IK, spring bones, falls and wound responses, baking tools | 350 KB | 0.88 / 1.4 / 2.2 M |
| WP3 | Timeline bridge: format, loaders, streaming, formation slot solver, speed matching, collision avoidance, events | 300 KB | 0.75 / 1.2 / 1.9 M |
| WP4 | Asset pipeline: kit assembler, LOD and impostor bakers, texture and mesh compression, validators | 200 KB | 0.5 / 0.8 / 1.25 M |
| WP5 | Roster page: virtualised list and search over about 165,000 plus names, sharded data, links to units | 120 KB | 0.3 / 0.48 / 0.75 M |
| WP6 | Gate harness and CI: slip, pops, clone detection, ID-buffer visibility, record conformance, frame pacing on R1 and R2 | 150 KB | 0.38 / 0.6 / 0.94 M |
| | Sum | about 1,640 KB (about 30,000 lines at 55 bytes per line) | 4.1 / 6.6 / 10.3 M |
| | Integration, review, research overhead (+25 percent) | | **about 5 / 8 / 13 M total** |

Wall time for the agent work (Modelled): 1,640 KB is 6.7 times the code of this job; at this job's throughput (245 KB in 1.7 hours) times the 1.6 production factor and the 25 percent overhead that is about 25 hours of agent time, less with parallel agents. The calendar is dominated by the capture and art programme and by review, not by writing.

**By hand (Modelled):** 30,000 lines at about 12 net lines per engineer-day for tested graphics code is about 2,500 engineer-days, **about 11 engineer-years**.

**Not token work (Modelled, assumptions stated; no vendor quotes):** character bodies 12 x 10 days; 150 equipment items x 2; 25 weapons x 3; 25 guns and vehicles x 7; 12 horses x 15; 800 commander likenesses x 3 = 2,400; textures and per-regiment variants 300: about **3,500 artist-days**. Mocap: about 75 states x 8 variants x 4 s = 40 minutes of cleaned motion plus multi-actor and horse sessions: 3 to 5 capture days; **vendor quote Unknown**. The Union and Confederate uniform, equipment, weapon and commander research that these assets must match is the other tracks' deliverable.

**Largest risks:** (1) the animation gates are asset-bound and depend on a capture programme that does not exist yet; (2) iGPU 4K at 60 fps with film-grade assets is uncertain even with SSE LOD (Modelled 7 to 9 ms for geometry on the RTX laptop at 4K, so the iGPU needs upscaling); (3) WebGPU on Firefox is Contested; (4) smoke look versus cost; (5) streaming 1.2 GB of content with a 60 MB first interactive.

---

## 8. Evidence ledger and reproduction

- **Measured, in this session:** every table in section 3 and Appendix A (`results/*.json`; commands in `prototype/tools/run-all.sh`); the gait and animation harness numbers (`results/gait.json`, `results/anim.json`); compute microbenchmarks (`results/compute*.json`); resource and byte accounting; Chrome and GPU capabilities (`tmp/bt/render/probe.mjs`, not committed); screenshots.
- **Documented (read):** three.js and Babylon.js licences, three.js file sizes at 0.186.1, Babylon.js version 9.31.0 and baked-animation manager limits, three.js WebGPURenderer fallback, BatchedMesh page, Babylon.js WebGPU status page, caniuse WebGPU table, Chrome's timestamp-quantisation note (search result), Kovar et al. footskate cleanup (search result and project page).
- **Computed:** pixel arithmetic, LOD triangle integral, asset budget table, extrapolations in 3.4, texel sizes, the bob amplitude.
- **Modelled:** placeholder placements, the SSE LOD gain, the token and artist-day estimates, the commander count.
- **Contested:** WebGPU on Firefox (caniuse says no; web.dev and Khronos say yes).
- **Unknown (not established here):** three.js and Babylon.js on this scene; Safari and Firefox behaviour; real-monitor 4K presentation cost; one-hour thermal behaviour; the CMU database licence (official page not reachable); Mixamo terms (403); IK and joint-limit runtime cost with production rigs; bit-identical replay; the volumetric smoke cost; why the NVIDIA serial-FK kernel is slower at 600 x 60 bones.
- **Not done by rule:** no downloads of packages, no accounts, no uploads, no product code changed; the only files written are under `docs/battle-theatre/render/` and `tmp/bt/render/`. Port base 10740 only (one port used).

**Reproduce:** `node docs/battle-theatre/render/prototype/tools/serve.mjs docs/battle-theatre/render 10740` in one terminal, then `bash docs/battle-theatre/render/prototype/tools/run-all.sh` (about 40 minutes; nothing else on the GPU), `node docs/battle-theatre/render/prototype/tools/make-tables.mjs` for the tables, `node docs/battle-theatre/render/prototype/tools/shots.mjs webgpu` for the screenshots. To regenerate the terrain: `python -I docs/battle-theatre/render/prototype/tools/build-terrain.py` (reads the cached 3DEP blocks in `tmp/look-dev/basemap/cache` and the aerial tiles of `docs/pitch/anim2/basemap`).

---

# Appendix A. Measured tables (generated by `prototype/tools/make-tables.mjs` from `results/*.json`)

## A. frame time (ms, median [min-max over repeats]) and GPU pass-sum (timestamp queries), full config (no DOF / motion blur)

### 1080p, desktop

| shot | near+mid soldiers drawn in detail | WebGPU frame ms | WebGPU fps (median) | WebGPU GPU ms | WebGPU CPU ms | WebGL2 frame ms | WebGL2 GPU ms | WebGL2 CPU ms |
|---|---|---|---|---|---|---|---|---|
| overview | 0 near + 0 mid | 6.3 [5.8-6.6] | 159.5 | 4.1 [4.0-4.4] | 0.73 | 8.2 [8.2-8.3] | 7.7 [7.6-7.7] | 0.64 |
| wide | 0 near + 1887 mid | 7.1 [6.9-8.4] | 141.2 | 5.1 [5.1-5.2] | 1.05 | 14.9 [14.8-15.0] | 14.2 [14.2-14.3] | 0.91 |
| ridge | 0 near + 376 mid | 6.7 [6.0-6.8] | 150.2 | 4.1 [4.1-4.9] | 0.69 | 8.7 [8.6-8.7] | 8.1 [8.1-8.2] | 0.58 |
| ground | 0 near + 705 mid | 6.2 [5.8-6.9] | 162.6 | 3.6 [3.5-5.0] | 0.64 | 10.1 [9.9-10.2] | 8.7 [8.7-8.8] | 0.72 |
| line | 124 near + 2252 mid | 11.0 [9.3-16.7] | 91.1 | 7.8 [7.5-14.4] | 1.22 | 23.1 [23.0-23.2] | 21.3 [21.0-21.3] | 1.26 |
| battery | 17 near + 2483 mid | 9.0 [8.9-9.6] | 111.5 | 6.7 [6.7-6.8] | 1.06 | 20.2 [19.9-21.9] | 18.6 [18.5-19.7] | 0.99 |
| cavalry | 96 near + 1063 mid | 6.9 [6.6-7.6] | 145.6 | 4.8 [4.8-5.0] | 1.16 | 13.1 [12.7-14.2] | 12.1 [12.1-12.1] | 1.16 |

### 4K, desktop

| shot | near+mid soldiers drawn in detail | WebGPU frame ms | WebGPU fps (median) | WebGPU GPU ms | WebGPU CPU ms | WebGL2 frame ms | WebGL2 GPU ms | WebGL2 CPU ms |
|---|---|---|---|---|---|---|---|---|
| overview | 0 near + 0 mid | 13.8 [13.5-14.1] | 72.6 | 8.4 [8.2-8.6] | 0.93 | 15.7 [14.4-17.0] | 12.6 [12.1-13.1] | 0.84 |
| wide | 0 near + 1887 mid | 17.1 [16.9-17.3] | 58.4 | 10.3 [10.3-10.4] | 1.22 | 23.3 [21.8-24.8] | 20.6 [19.8-21.5] | 1.07 |
| ridge | 0 near + 376 mid | 16.1 [16.0-16.1] | 62.3 | 9.5 [9.5-9.5] | 0.94 | 17.8 [15.6-20.0] | 14.9 [14.0-15.8] | 0.89 |
| ground | 0 near + 705 mid | 12.9 [12.4-13.4] | 77.5 | 7.9 [7.8-8.0] | 0.96 | 16.4 [15.9-16.9] | 14.1 [14.1-14.1] | 0.74 |
| line | 124 near + 2252 mid | 26.3 [25.7-27.0] | 38.0 | 22.6 [22.4-22.8] | 1.44 | 32.3 [32.1-32.5] | 30.7 [30.4-30.9] | 1.35 |
| battery | 17 near + 2497 mid | 23.2 [23.1-23.4] | 43.0 | 17.1 [16.7-17.4] | 1.25 | 32.2 [29.8-34.6] | 29.6 [27.8-31.5] | 1.13 |
| cavalry | 96 near + 276 mid | 15.7 [15.3-16.1] | 63.7 | 9.2 [9.2-9.3] | 1.47 | 16.5 [15.1-17.9] | 13.8 [13.5-14.1] | 1.25 |

### 1080p, 4x CPU throttle

| shot | near+mid soldiers drawn in detail | WebGPU frame ms | WebGPU fps (median) | WebGPU GPU ms | WebGPU CPU ms | WebGL2 frame ms | WebGL2 GPU ms | WebGL2 CPU ms |
|---|---|---|---|---|---|---|---|---|
| overview | 0 near + 0 mid | 6.3 [6.0-6.5] | 160.0 | 4.2 [4.0-4.3] | 3.21 | 8.9 [8.4-9.5] | 7.6 [7.6-7.7] | 2.89 |
| wide | 0 near + 1887 mid | 7.5 [7.1-7.9] | 133.8 | 5.2 [5.1-5.3] | 4.03 | 15.8 [15.2-16.5] | 14.7 [14.4-15.0] | 3.83 |
| ridge | 0 near + 376 mid | 6.1 [5.7-6.5] | 163.7 | 4.4 [3.9-4.8] | 2.73 | 8.9 [8.6-9.1] | 8.1 [8.1-8.1] | 2.64 |
| ground | 0 near + 705 mid | 6.8 [6.6-7.1] | 146.1 | 4.2 [4.1-4.3] | 3.29 | 10.1 [10.1-10.2] | 9.6 [9.5-9.7] | 2.80 |
| line | 124 near + 2252 mid | 11.3 [9.8-12.9] | 88.3 | 9.0 [7.5-10.5] | 6.04 | 21.2 [21.0-21.4] | 20.6 [20.4-20.8] | 5.22 |
| battery | 17 near + 2473 mid | 8.7 [8.6-8.9] | 114.7 | 6.8 [6.5-7.0] | 4.57 | 18.8 [18.4-19.2] | 18.1 [17.8-18.5] | 5.80 |
| cavalry | 96 near + 1119 mid | 8.4 [7.6-9.3] | 118.6 | 5.9 [5.0-6.7] | 5.42 | 12.9 [12.7-13.0] | 12.1 [11.7-12.5] | 5.73 |

### NVIDIA RTX PRO 1000, 1080p

| shot | near+mid soldiers drawn in detail | WebGPU frame ms | WebGPU fps (median) | WebGPU GPU ms | WebGPU CPU ms | WebGL2 frame ms | WebGL2 GPU ms | WebGL2 CPU ms |
|---|---|---|---|---|---|---|---|---|
| overview | 0 near + 0 mid | 3.2 [3.2-3.2] | 316.5 | 1.9 [1.9-1.9] | 0.51 | 5.2 [5.2-5.2] | 4.6 [4.6-4.6] | 0.38 |
| wide | 0 near + 1887 mid | 3.8 [3.8-3.8] | 263.2 | 3.2 [3.2-3.2] | 0.77 | 7.4 [7.4-7.4] | 7.3 [7.3-7.3] | 0.72 |
| ridge | 0 near + 376 mid | 3.3 [3.3-3.3] | 304.0 | 2.8 [2.8-2.8] | 0.44 | 5.6 [5.6-5.6] | 5.3 [5.3-5.3] | 0.42 |
| ground | 0 near + 705 mid | 2.9 [2.9-2.9] | 344.8 | 2.3 [2.3-2.3] | 0.41 | 6.0 [6.0-6.0] | 5.6 [5.6-5.6] | 0.42 |
| line | 124 near + 2252 mid | 5.1 [5.1-5.1] | 196.1 | 4.8 [4.8-4.8] | 0.88 | 9.0 [9.0-9.0] | 8.9 [8.9-8.9] | 0.83 |
| battery | 17 near + 2443 mid | 4.5 [4.5-4.5] | 220.3 | 4.3 [4.3-4.3] | 0.68 | 7.9 [7.9-7.9] | 7.9 [7.9-7.9] | 0.71 |
| cavalry | 96 near + 1335 mid | 3.7 [3.7-3.7] | 268.1 | 3.3 [3.3-3.3] | 0.81 | 6.6 [6.6-6.6] | 6.4 [6.4-6.4] | 0.90 |

### NVIDIA RTX PRO 1000, 4K

| shot | near+mid soldiers drawn in detail | WebGPU frame ms | WebGPU fps (median) | WebGPU GPU ms | WebGPU CPU ms | WebGL2 frame ms | WebGL2 GPU ms | WebGL2 CPU ms |
|---|---|---|---|---|---|---|---|---|
| overview | 0 near + 0 mid | 4.7 [4.7-4.7] | 211.0 | 4.1 [4.1-4.1] | 0.56 | 6.0 [6.0-6.0] | 5.5 [5.5-5.5] | 0.53 |
| wide | 0 near + 1887 mid | 6.0 [6.0-6.0] | 167.5 | 5.5 [5.5-5.5] | 0.90 | 9.3 [9.3-9.3] | 9.1 [9.1-9.1] | 0.74 |
| ridge | 0 near + 376 mid | 6.7 [6.7-6.7] | 149.9 | 6.2 [6.2-6.2] | 0.52 | 7.4 [7.4-7.4] | 7.1 [7.1-7.1] | 0.55 |
| ground | 0 near + 705 mid | 4.6 [4.6-4.6] | 217.9 | 4.0 [4.0-4.0] | 0.73 | 6.9 [6.9-6.9] | 6.5 [6.5-6.5] | 0.46 |
| line | 124 near + 2252 mid | 10.9 [10.9-10.9] | 91.7 | 10.4 [10.4-10.4] | 1.25 | 15.0 [15.0-15.0] | 14.8 [14.8-14.8] | 0.99 |
| battery | 17 near + 2467 mid | 9.0 [9.0-9.0] | 111.7 | 8.5 [8.5-8.5] | 0.81 | 11.4 [11.4-11.4] | 11.2 [11.2-11.2] | 0.90 |
| cavalry | 96 near + 1186 mid | 5.9 [5.9-5.9] | 170.1 | 5.4 [5.4-5.4] | 0.97 | 7.7 [7.7-7.7] | 7.5 [7.5-7.5] | 0.96 |

## B. GPU time per pass, WebGPU 1080p (ms, median of repeats)

| shot | shadow0+1 | scene (sky, terrain, soldiers, guns, impostors) | particles | bloom | post | total |
|---|---|---|---|---|---|---|
| overview | 0.42 | 2.58 | 0.23 | 0.36 | 0.52 | 4.12 |
| wide | 1.43 | 2.50 | 0.35 | 0.33 | 0.47 | 5.14 |
| ridge | 0.66 | 1.71 | 0.90 | 0.33 | 0.47 | 4.06 |
| ground | 0.85 | 1.65 | 0.27 | 0.35 | 0.51 | 3.62 |
| line | 1.96 | 2.37 | 2.68 | 0.34 | 0.49 | 7.83 |
| battery | 1.83 | 2.26 | 1.85 | 0.32 | 0.47 | 6.73 |
| cavalry | 1.27 | 2.14 | 0.66 | 0.34 | 0.50 | 4.83 |

## C. film config (DOF + motion blur on) minus full, WebGPU 1080p GPU ms

| shot | 1080p full | 1080p film | 4K full | 4K film |
|---|---|---|---|---|
| overview | 4.12 | 4.04 | 8.38 | 8.63 |
| wide | 5.14 | 5.25 | 10.35 | 10.77 |
| ridge | 4.06 | 4.19 | 9.52 | 10.52 |
| ground | 3.62 | 3.64 | 7.87 | 8.35 |
| line | 7.83 | 8.12 | 22.57 | 22.70 |
| battery | 6.73 | 6.95 | 17.06 | 21.04 |
| cavalry | 4.83 | 4.80 | 9.23 | 9.30 |

## D. ablation: GPU ms saved by switching a feature off (median over 3 repeats of: all minus without), 1080p, film config (DOF + motion blur on). Differences below about 0.5 ms are noise.

### webgpu

| shot | all (GPU ms) | particles | shadows | far | mid | near | guns | terrain | post | sky only |
|---|---|---|---|---|---|---|---|---|---|---|
| ridge | 3.93 | 0.94 | 0.60 | 0.40 | 0.24 | 0.05 | 0.58 | 0.58 | 0.43 | 0.66 |
| line | 9.23 | 4.50 | 1.82 | 0.10 | 2.06 | 0.25 | 0.52 | 0.44 | 0.18 | 0.65 |
| battery | 7.50 | 2.60 | 1.67 | 0.47 | 1.95 | -0.03 | 0.53 | 0.38 | 0.23 | 0.71 |

### webgl2

| shot | all (GPU ms) | particles | shadows | far | mid | near | guns | terrain | post | sky only |
|---|---|---|---|---|---|---|---|---|---|---|
| ridge | 8.14 | 1.67 | 1.91 | 1.51 | 1.03 | -0.25 | 2.18 | 0.63 | 0.33 | 0.67 |
| line | 22.03 | 4.57 | 7.79 | 1.48 | 10.84 | 3.60 | 3.27 | 3.13 | 1.01 | 0.66 |
| battery | 19.32 | 3.60 | 8.68 | 2.07 | 10.60 | 1.84 | 2.61 | 2.34 | 0.43 | 0.66 |

## E. scaling of the crowd: mid radius and near radius / near mesh quality (1080p)

### mid LOD radius, webgpu

| shot | midR m | mid soldiers | Mtris | frame ms | GPU ms |
|---|---|---|---|---|---|
| ridge | 100 | 0 | 2.1 | 6.01 | 3.76 |
| ridge | 200 | 376 | 2.55 | 6.69 | 4.18 |
| ridge | 300 | 376 | 2.55 | 6.33 | 4.13 |
| ridge | 500 | 376 | 2.55 | 6.49 | 4.23 |
| ridge | 800 | 376 | 2.55 | 7.14 | 4.67 |
| ridge | 1200 | 4886 | 7.75 | 10.63 | 7.87 |
| wide | 100 | 0 | 2.12 | 6.09 | 3.74 |
| wide | 200 | 254 | 2.38 | 6.72 | 4.31 |
| wide | 300 | 1887 | 4.23 | 8.24 | 5.72 |
| wide | 500 | 4062 | 6.72 | 10.23 | 7.6 |
| wide | 800 | 4401 | 7.07 | 10.29 | 7.37 |
| wide | 1200 | 4401 | 7.03 | 8.97 | 7.1 |

### mid LOD radius, webgl2

| shot | midR m | mid soldiers | Mtris | frame ms | GPU ms |
|---|---|---|---|---|---|
| ridge | 100 | 0 | 2.1 | 7.64 | 7.15 |
| ridge | 200 | 375 | 2.55 | 9.21 | 8.7 |
| ridge | 300 | 376 | 2.55 | 9.3 | 8.78 |
| ridge | 500 | 376 | 2.55 | 9.45 | 8.78 |
| ridge | 800 | 376 | 2.55 | 9.34 | 8.88 |
| ridge | 1200 | 4980 | 7.86 | 25.52 | 24.95 |
| wide | 100 | 0 | 2.12 | 7.7 | 7.2 |
| wide | 200 | 254 | 2.37 | 8.6 | 8.09 |
| wide | 300 | 1887 | 4.19 | 14.6 | 14.1 |
| wide | 500 | 4005 | 6.57 | 21.84 | 21.29 |
| wide | 800 | 4401 | 6.97 | 22.78 | 22.29 |
| wide | 1200 | 4416 | 6.92 | 22.88 | 22.38 |

### near radius, near mesh 2.9k tris (q1)

| nearR m | near soldiers | Mtris total | frame ms | GPU ms | CPU pose ms |
|---|---|---|---|---|---|
| 10 | 0 | 4.86 | 10.4 | 8.97 | 0 |
| 20 | 34 | 4.9 | 11 | 9.52 | 0.09 |
| 40 | 124 | 5.04 | 11.06 | 9.29 | 0.35 |
| 60 | 202 | 5.17 | 11.88 | 9.29 | 0.46 |
| 90 | 232 | 5.19 | 12.77 | 9.45 | 0.46 |
| 130 | 310 | 5.32 | 10.93 | 9.24 | 0.6 |

### near radius, near mesh 9k tris (q2)

| nearR m | near soldiers | Mtris total | frame ms | GPU ms | CPU pose ms |
|---|---|---|---|---|---|
| 10 | 0 | 5.79 | 11.12 | 9.48 | 0 |
| 20 | 34 | 6.03 | 11.77 | 10.19 | 0.14 |
| 40 | 124 | 6.68 | 12.78 | 10.19 | 0.27 |
| 60 | 202 | 7.23 | 13.56 | 10.59 | 0.38 |
| 90 | 232 | 7.43 | 13.77 | 10.93 | 0.46 |
| 130 | 315 | 8.07 | 13.96 | 10.92 | 0.62 |

### near radius, near mesh 19k tris (q3)

| nearR m | near soldiers | Mtris total | frame ms | GPU ms | CPU pose ms |
|---|---|---|---|---|---|
| 10 | 0 | 9.1 | 14.52 | 12.15 | 0 |
| 20 | 34 | 9.63 | 15.82 | 12.75 | 0.09 |
| 40 | 124 | 11.09 | 16.99 | 14.16 | 0.25 |
| 60 | 202 | 12.35 | 17.21 | 15.19 | 0.46 |
| 90 | 232 | 12.8 | 21.23 | 16.73 | 0.49 |
| 130 | 334 | 14.61 | 22.12 | 17.99 | 0.77 |

### near radius, WebGL2 near 2.9k

| nearR m | near soldiers | Mtris total | frame ms | GPU ms | CPU pose ms |
|---|---|---|---|---|---|
| 10 | 0 | 4.85 | 20.11 | 19.43 | 0 |
| 20 | 34 | 4.88 | 22.11 | 21.49 | 0.08 |
| 40 | 124 | 5 | 21.9 | 21.17 | 0.25 |
| 60 | 202 | 5.1 | 22.47 | 21.73 | 0.37 |
| 90 | 232 | 5.13 | 23.42 | 22.39 | 0.39 |
| 130 | 342 | 5.36 | 23.15 | 22.45 | 0.73 |

### near radius, WebGL2 near 19k

| nearR m | near soldiers | Mtris total | frame ms | GPU ms | CPU pose ms |
|---|---|---|---|---|---|
| 10 | 0 | 9.07 | 41.64 | 39.7 | 0 |
| 20 | 34 | 9.55 | 47.63 | 44.98 | 0.11 |
| 40 | 124 | 11.01 | 50.36 | 48.89 | 0.21 |
| 60 | 202 | 12.29 | 64.46 | 62.12 | 0.37 |
| 90 | 237 | 12.88 | 65.84 | 63.56 | 0.44 |
| 130 | 342 | 15.63 | 69.95 | 68.12 | 0.64 |

### near radius, NVIDIA WebGPU near 19k

| nearR m | near soldiers | Mtris total | frame ms | GPU ms | CPU pose ms |
|---|---|---|---|---|---|
| 10 | 0 | 9.11 | 8.53 | 8.17 | 0 |
| 20 | 34 | 9.65 | 8.58 | 8.3 | 0.11 |
| 40 | 124 | 11.12 | 9.04 | 8.74 | 0.21 |
| 60 | 202 | 12.38 | 9.61 | 9.29 | 0.39 |
| 90 | 232 | 12.86 | 10.04 | 9.74 | 0.41 |
| 130 | 302 | 14.02 | 11.16 | 10.81 | 0.56 |

## F. pacing along the scripted fly-through (600 frames)

| api | config | mean ms | p95 | p99 | max | hitches (>1.5x median) of 600 | CPU ms |
|---|---|---|---|---|---|---|---|
| WebGPU | fly-through film | 6.15 | 9 | 10.2 | 12.1 | 17 | 0.53 |
| WebGPU | fly-through x3 speed | 6.56 | 9.1 | 11 | 12.8 | 26 | 0.56 |
| WebGPU | fly-through full | 5.55 | 7.8 | 8.8 | 10.4 | 8 | 0.44 |
| WebGL2 | fly-through film | 9.96 | 16 | 17.7 | 18 | 43 | 0.47 |
| WebGL2 | fly-through x3 speed | 12.03 | 21.9 | 26.1 | 47.2 | 106 | 0.62 |
| WebGL2 | fly-through full | 10.98 | 17.9 | 21.2 | 23.4 | 104 | 0.56 |
| WebGPU 4x throttle | fly-through film | 7.76 | 11.4 | 13.6 | 22.1 | 39 | 3.1 |
| WebGPU 4x throttle | fly-through x3 speed | 9.95 | 15.4 | 21.4 | 29.4 | 44 | 4.07 |
| WebGPU 4x throttle | fly-through full | 9.34 | 13.1 | 16.1 | 20.8 | 12 | 3.8 |

## G. memory, load, bytes

- webgpu-base-1080.json: load to first frame 996 ms (page load event 1034 ms; world gen 348 ms incl. fetch; GPU init 629 ms of which character+VAT+impostor bake 332 ms); bytes over the wire 5.55 MB; accounted GPU resources 117 MiB; Chrome GPU-process memory {"dedicatedMiB":0,"sharedMiB":312.7}
- webgl2-base-1080.json: load to first frame 1063 ms (page load event 1120 ms; world gen 331 ms incl. fetch; GPU init 697 ms of which character+VAT+impostor bake 402 ms); bytes over the wire 5.57 MB; accounted GPU resources 124 MiB; Chrome GPU-process memory {"dedicatedMiB":0,"sharedMiB":279.9}
- webgpu-base-4k.json: load to first frame 905 ms (page load event 1031 ms; world gen 300 ms incl. fetch; GPU init 591 ms of which character+VAT+impostor bake 370 ms); bytes over the wire 5.55 MB; accounted GPU resources 206 MiB; Chrome GPU-process memory {"dedicatedMiB":0,"sharedMiB":614.3}
- webgl2-base-4k.json: load to first frame 867 ms (page load event 959 ms; world gen 229 ms incl. fetch; GPU init 594 ms of which character+VAT+impostor bake 339 ms); bytes over the wire 5.57 MB; accounted GPU resources 237 MiB; Chrome GPU-process memory {"dedicatedMiB":0,"sharedMiB":567}
- webgpu-base-1080_nvidia.json: load to first frame 819 ms (page load event 846 ms; world gen 156 ms incl. fetch; GPU init 653 ms of which character+VAT+impostor bake 286 ms); bytes over the wire 5.55 MB; accounted GPU resources 117 MiB; Chrome GPU-process memory {"dedicatedMiB":223.2,"sharedMiB":113.4}

Accounted GPU resources by item (1080p, WebGPU), MiB:

| item | MiB |
|---|---|
| shadow maps 2x | 32.00 |
| aerial srgb+mips | 21.33 |
| height r32f | 9.00 |
| atlas horse | 6.00 |
| atlas foot | 5.25 |
| VAT foot rgba32f | 3.11 |
| soldiers.a | 2.52 |
| soldiers.b | 2.52 |
| VAT horse rgba32f | 1.51 |
| pose.foot | 1.27 |
| far.foot | 0.58 |
| pose.mounted | 0.32 |
| list.midFoot | 0.23 |
| terrain.ib96 | 0.22 |

## H. mid LOD: per-vertex VAT versus baked bone matrices (WebGPU, 1080p, two back-to-back repeats)

| shot | VAT GPU ms | bone-matrix GPU ms | VAT frame ms | bone frame ms |
|---|---|---|---|---|
| wide | 4.92 | 4.97 | 7.06 | 7.51 |
| line | 8.38 | 8.24 | 10.82 | 10.98 |
| cavalry | 5.14 | 5.10 | 7.36 | 6.95 |

## I. stress: 6x gun rate (360 guns firing 6 times as often)

- webgpu battery: frame 14.39 ms, GPU 11.37 ms (particles 6.81), live events 3891
- webgpu line: frame 18.53 ms, GPU 15.89 ms (particles 11.17), live events 3183
- webgl2 battery: frame 25.63 ms, GPU 23.8 ms (particles 7.62), live events 3331
- webgl2 line: frame 25.44 ms, GPU 24.99 ms (particles 8.53), live events 3210

## J. compute microbenchmarks (GPU ms per dispatch)

### compute.json ({"vendor":"intel","arch":"xe-lpg"})

| kernel | size | GPU ms | wall ms |
|---|---|---|---|
| cull+lod-bin | 165000 | 0.1579 | 0.255 |
| cull+lod-bin | 660000 | 0.6048 | 0.695 |
| pose-blend+FK | 600 x 24 bones | 0.0225 | 0.145 |
| pose-blend+FK | 20000 x 24 bones | 1.2281 | 1.33 |
| pose-blend+FK | 165000 x 24 bones | 10.6214 | 10.8 |
| pose-blend+FK | 600 x 60 bones | 0.0475 | 0.14 |
| pose-blend+FK | 20000 x 60 bones | 5.1195 | 5.215 |
| pose-blend+FK | 165000 x 60 bones | 43.8667 | 44.18 |
| spring-bones | 6000 | 0.0017 | 0.19 |
| spring-bones | 1650000 | 2.0179 | 2.11 |

### compute-nvidia.json ({"vendor":"nvidia","arch":"blackwell"})

| kernel | size | GPU ms | wall ms |
|---|---|---|---|
| cull+lod-bin | 165000 | 0.0284 | 0.19 |
| cull+lod-bin | 660000 | 0.1045 | 0.195 |
| pose-blend+FK | 600 x 24 bones | 0.0414 | 0.15 |
| pose-blend+FK | 20000 x 24 bones | 0.3098 | 0.375 |
| pose-blend+FK | 165000 x 24 bones | 2.5005 | 2.68 |
| pose-blend+FK | 600 x 60 bones | 1.2185 | 1.29 |
| pose-blend+FK | 20000 x 60 bones | 7.2298 | 7.345 |
| pose-blend+FK | 165000 x 60 bones | 52.0564 | 52.5 |
| spring-bones | 6000 | 0.0018 | 0.145 |
| spring-bones | 1650000 | 0.4952 | 0.55 |


## K. animation harness (placeholder clips): bake interpolation error, mm (mean / max) by frames per clip

| frames per clip | idle | march | run | load | fire | fall |
|---|---|---|---|---|---|---|
| 8 | 0.26 / 3.18 | 4.86 / 95.71 | 9.62 / 154.03 | 4.89 / 403.79 | 10.54 / 220.5 | 11.65 / 54.38 |
| 16 | 0.07 / 0.81 | 1.19 / 24.36 | 2.41 / 39.52 | 2.8 / 272.52 | 2.95 / 83.87 | 2.63 / 12.59 |
| 32 | 0.02 / 0.2 | 0.32 / 18.25 | 0.64 / 29.6 | 1 / 102.06 | 0.91 / 74.26 | 0.62 / 3.46 |
| 64 | 0 / 0.05 | 0.08 / 9.17 | 0.16 / 14.86 | 0.28 / 57.15 | 0.23 / 29.65 | 0.15 / 0.8 |
| 128 | 0 / 0.01 | 0.02 / 3.94 | 0.04 / 6.4 | 0.08 / 46.26 | 0.06 / 8.52 | 0.04 / 0.2 |

## L. instant clip switches: vertex jump at the switch (mm) against one normal 60 Hz frame step of the source clip

| from | to | mean jump mm | max jump mm | normal step mm | jump in frames |
|---|---|---|---|---|---|
| load | fire | 24.1 | 202.8 | 4.45 | 5.4 |
| fire | load | 28.2 | 202.8 | 1.62 | 17.4 |
| march | fall | 101.3 | 664.5 | 7.8 | 13 |
| march | run | 87.2 | 438.2 | 7.87 | 11.1 |
| run | march | 121.5 | 451.6 | 14.63 | 8.3 |
| idle | march | 229.3 | 939.9 | 0.17 | 1333.4 |
| march | idle | 231.1 | 939.8 | 7.8 | 29.6 |
| fire | march | 215.3 | 962.3 | 7.8 | 27.6 |
| load | run | 232.2 | 873.1 | 0.17 | 1371.7 |
| idle | fall | 218.1 | 890.6 | 0.08 | 2181 |

Spring bones (CPU, scalar JS): 6000 springs, 0.0411 ms per frame. Pose + FK: 1.84 microseconds per soldier (18 bones). Placeholder variation: 0.41 percent of 5591 neighbour pairs share a coarse signature.

## M. foot slip and terrain contact (placeholder gait)

- march: nominal speed 1.15 m/s, clip 1 s; stance slip at nominal speed 21.1 cm per step; best matched root speed 1.564 m/s gives 9.96 cm; at 0.9x speed 24.6 cm, at 1.1x 17.7 cm
- run: nominal speed 2.35 m/s, clip 0.62 s; stance slip at nominal speed 36 cm per step; best matched root speed 5.499 m/s gives 3.16 cm; at 0.9x speed 38.7 cm, at 1.1x 33.4 cm

Terrain slope over the 6.1 x 6.1 km window: mean 3.71 degrees, p95 9.74, 4.72 percent above 10 degrees, 0.76 percent above 20.

| window | slope deg | stance samples | foot-ground error cm (mean / p95 / max) | stance samples over 2 cm |
|---|---|---|---|---|
| Little Round Top (summit from 3DEP, +/- 80 m search) | 17.8 | 2103 | 6.4 / 13.3 / 16.1 | 84.3 percent |
| Culps Hill (summit from 3DEP, +/- 80 m search) | 20.3 | 2103 | 7.3 / 17.7 / 20.9 | 85.3 percent |
| Cemetery Ridge near the Copse of Trees (+/- 80 m search) | 2.3 | 2103 | 1.7 / 3.9 / 4.3 | 37.8 percent |
