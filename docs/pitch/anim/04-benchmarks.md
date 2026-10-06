# 04 - External benchmarks and craft

### What best-in-class looks like for unit tiles, battle animation and map pop-ups, and twelve principles for this map

*Research report for the animation pitch. Nothing here has been built and no product code was touched. Prepared 2026-10-05 by the benchmarks workstream. Own files only: this document, the scripts and logs in `docs/pitch/anim/04-benchmarks-evidence/`, and scratch in `tmp/pitch-anim/benchmarks/` (git-ignored). No servers were started, no Mapbox tiles were requested, headless Chrome was launched in about ten short sessions for a clock test, each closed and its profile deleted.*

---

## 0. How to read the evidence tags

Every claim carries a tag so that nobody has to guess how it is known.

| Tag | Meaning |
|---|---|
| **[R]** | I fetched and read this page or paper in this session (URL given). Summaries are mine; no passage is reproduced. |
| **[P]** | Partly read: the page was thin, truncated, or I read only an abstract or an HTML mirror. |
| **[S]** | Web-search snippet only. I did not read the page. Treat as a lead, not a finding. |
| **[U]** | I could not read it (HTTP 403/402/404, bot block, certificate error). Listed so nobody assumes it was checked. I did not try to get around any block. |
| **[M]** | Measured or computed by me with a script in `docs/pitch/anim/04-benchmarks-evidence/`. Reproduce with `bash docs/pitch/anim/04-benchmarks-evidence/04-run-all.sh` from the repo root; the log of my run is `04-RESULTS.txt`. |
| **[V]** | Verified by me in the production bundle `baseline/dist/assets/index-Cg8FAMXN.js` (what the live site serves). |
| **[D]** | Taken from an earlier repo document (path and section given). I did not re-measure it unless it also carries [M] or [V]. |
| **[I]** | My inference or design judgement. A proposal, not a finding. Thresholds marked [I] are starting points to be tuned. |

The site's own evidence vocabulary (Documented / Measured / Computed / Modelled / Contested / Unknown) appears below only where I say what a mark shown on screen should be labelled. I do not assign those labels to historical facts here.

---

## 1. Summary

**What the field has already solved.** Across military symbology, historic and modern map craft, strategy-game interfaces, cartographic label placement, motion design, accessibility, rendering and design-system practice, the same small set of problems keeps appearing, each with a published solution or an open-licensed implementation: separate the story clock from the render clock and interpolate (Fiedler, Nystrom); make followers velocity-continuous (Holden's critically damped springs); keep object identity through every change (Bostock, Heer and Robertson); solve label layout ahead of time and keep it consistent (Been, Daiches and Yap; Christensen, Marks and Shieber; Barth et al.); build symbols from layers where each channel carries one variable and colour is never alone (APP-6, Okabe and Ito); declare motion and symbology as data with goldens (design tokens, Playwright). None of it needs invention. The craft is in applying it with discipline to this particular dataset.

**Four things the site's own data says, which shape every recommendation below** [M unless stated]:

1. **"Tiles never obscure each other" cannot be met by zoom, and cannot be met by collision-hiding.** With a 24 x 16 CSS-px frame at true positions, at least one pair of tiles overlaps on 675 of 675 ticks at zoom 12 to 14, on 674 at zoom 15, 658 at zoom 16 and still 652 at zoom 17 (the app's maximum is 18 [V]). At tick 548, 91 of 451 units on the field have another unit within 1 metre; the data sits on a 4-decimal grid (about 11 m north-south, 8.6 m east-west). Mapbox's own symbol engine resolves overlaps by hiding the loser [R], which would hide vital information. The requirement therefore forces a deliberate, visible declutter ladder (aggregate along the order of battle, fan out with leader lines to the true anchor, page on phones), not a trick.
2. **The jitter has three data-grounded causes, none of which is "the browser being slow".** (a) Production interpolates a unit only between two *adjacent* ticks, but fixes are sparse: median gap between a unit's consecutive fixes is 17 ticks, so for a unit whose next fix is not on the next tick the code holds the old fix and then jumps to the new one when its tick arrives: a median 420 m, which is 115 px at zoom 14 and 229 px at zoom 15 [V by reading the function; M for the distances; I did not film the live app]. (b) The few places where it does glide are 93 of 1,209 pairs (49 units, longest run 6 consecutive ticks): each glide lasts one tick (500 ms at 1x) with its own ease (ease-in t-squared for a charging line, ease-out for retreat, ease-in-out otherwise), so those sequences surge or stall at every tick boundary [V][M]; this is real but minor beside (a). (c) Motion per frame is tiny where it does move: 77% of moving segments travel under 1 CSS px per 60 Hz frame at zoom 14 and 1x, so integer pixel rounding or an uneven frame cadence reads as crawling and stutter [M]. Add the whole-viewport canvas redraw that the performance specialist measured as the frame-rate limiter [D].
3. **Truth needs visible states.** At tick 548 under the app's hold-forward rule, 81% of units stand on a fix older than 50 ticks (median age 258 ticks) [M][V]. 65 (unit, tick) keys appear twice in the placement files with positions a median 300 m apart (maximum 2,572 m) [M]. 592 of 1,209 consecutive fix pairs change posture between the two fixes, so what happens in between is modelled, not documented [M]. Military practice has had a grammar for exactly this for decades: dashed frame for not-yet-there, a question mark for unconfirmed, and a source number on every plotted symbol [R].
4. **The speed problem is not the number of units.** There are at most 478 units and at most 85 fixes arrive on any tick [M]; the lab evidence says the cost is raster and composite of a full-viewport canvas, not drawing [D]. So the rendering choice is about integration (hit-testing, camera sync, pixel ratio, collision, extensibility), and the library sizes matter: deck.gl would add about 92% to the current 627 kB (gzip) of production JavaScript and PixiJS about 38% [M]. Under the owner's rule that a pipeline split which possibly raises error risk should not be made, the single-frame options (Mapbox layers, `updateData`, a custom layer) pass and an OffscreenCanvas worker or a second canvas do not (section 6).

**Output of this report:** 52 numbered references (section 5), each with what to steal as a principle and what to avoid; twelve design principles for this map with tests (section 3); a pop-up-by-pop-up note on how to improve everything that appears, removing nothing (section 4); a rendering and a design-system comparison with sizes and licences (sections 6 to 8); and an explicit list of what I could not verify (section 9).

---

## 2. Site facts used

Everything in this table that carries [M] is produced by the scripts in the evidence folder from `baseline/dist/data` (the data production serves). Model assumptions: a unit appears at its first fix, holds its last fix forever (this is what the app's module-level forward-fill does [V][D]), and is linearly interpolated between fixes for the geometry statistics; positions are the true recorded positions (no displacement); zoom is Mapbox GL zoom with 512-px tiles at latitude 39.82; pixel sizes are CSS px at pixel ratio 1; tile sizes of 24 x 16 (frame) and 96 x 18 (frame plus label) are illustrative, the 24 x 16 frame being the size proposed in `docs/plan/specialists/app-design.md` section 9.2 [D].

| # | Fact | Value | Tag and script |
|---|---|---|---|
| F1 | Placement rows / distinct (unit, tick) keys / ticks with a fix / units | 1,804 rows in 47 files / 1,687 / 188 of 675 / 478 (265 `U-` and 213 `C-` ids); median 2 fixes per unit | [M] `04-stats.mjs` |
| F2 | Fixes arriving per occupied tick | distinct (unit, tick) keys: median 6, p90 18, max 85; raw rows: median 7, p90 18, max 87 (the raw figures equal the performance specialist's 7 / 18 / 87 [D]) | [M] `04-stats.mjs` |
| F3 | Consecutive-fix pairs per unit / pairs only 1 tick apart / median gap / p90 gap / max gap | 1,209 / 93 (49 units, longest run of consecutive-tick fixes 6, 20 runs of three or more, none after tick 568) / 17 ticks / 138 / 658 | [M] `04-stats.mjs`, `04-consecutive.mjs` |
| F4 | What production does between fixes | `y1` takes tick f and tick f+1 only; `F4` eases by posture (the next fix's posture when it changes): Charging Line t-squared, Chaotic Retreat 1-(1-t)-squared, Line of March linear, everything else ease-in-out quadratic; snaps if the sum of absolute lat and lng difference exceeds 0.05 degree; strength is rounded; posture flips at 0.5; `i2` is a module-level forward-fill | [V] `index-Cg8FAMXN.js` functions `F4`, `y1`, `z4`, `B4`, `L4`, `rA` |
| F5 | Jump when a unit holds its old fix and then takes the next one (what `y1` does when the next fix is not on the next tick), among moving pairs with gap > 1 | median 420 m, p90 1,943 m, max 5,687 m; on screen at zoom 14: median 115 px, p90 530 px; at zoom 15: 229 px and 1,059 px | [M] `04-speed.mjs` (consistent with app-time section 7.1 [D]; I did not film the live app) |
| F6 | Share of moving segments under 1 CSS px per 60 Hz frame at 1x (2 ticks per second [D]) | 89% at zoom 13, 77% at 14, 59% at 15, 46% at 16; at 8x: 46%, 36%, 26%, 16% | [M] `04-speed.mjs` |
| F7 | Speed step at interior fixes under piecewise-linear motion (zoom 15, 1x, 60 Hz) | 378 of 904 interior fixes (42%) step by more than 1 px per frame, 167 (18%) by more than 3, max 48 | [M] `04-kinks.mjs` |
| F8 | Heading change at interior fixes where both neighbouring segments move | median 79 degrees, p90 174; 63% turn more than 45 degrees, 44% more than 90 degrees (so fixes are mostly waypoints where the unit changes direction, not points on a straight run); scalar speed step at those fixes: median 0.39 px per frame, 33% above 1 | [M] `04-turns.mjs` |
| F9 | Units on the field per tick (model above) | min 71, median 384, max 478 | [M] `04-overlap.mjs` |
| F10 | Ticks (of 675) with at least one overlapping pair of 24 x 16 frames at true positions | 675 at zoom 12, 13 and 14; 674 at 15; 658 at 16; 652 at 17. Mean units inside an overlapping pair per tick: 321, 275, 196, 93, 61, 54 for zoom 12 to 17 | [M] `04-overlap.mjs` |
| F11 | Overlap clusters at tick 548 (connected groups of two or more): frame only / frame plus 96 x 18 label | zoom 14: 71 clusters, 281 of 451 units, largest 17 / 64, 372, largest 37. Zoom 15: 64, 150, largest 6 / 84, 267, largest 9. Zoom 16: 45, 97, largest 3 / 68, 189, largest 7. Zoom 17: 43, 93, largest 3 / 56, 133, largest 6. Ticks 330 and 653 in the log are similar | [M] `04-clusters.mjs` |
| F12 | Coincident units | at tick 548, 91 of 451 units have another unit within 1 m (35 pairs and 7 triples at identical rounded positions); every one of 1,783 lat/lng pairs my pattern parsed has exactly 4 decimals (1 degree-e-4 is 11.1 m north-south and 8.6 m east-west) | [M] `04-coincident.mjs`, `04-pairs.mjs`, `04-prec.mjs` |
| F13 | Fix age under hold-forward | at tick 548: 328 of 451 units sit on a fix older than 100 ticks, median age 258 ticks, 81% older than 50 ticks; at tick 100: median 40, 32% older than 50; at tick 653: median 352, 87% | [M] `04-pairs.mjs`, `04-clusters.mjs` |
| F14 | Duplicate rows | 103 (unit, tick) keys have more than one row (220 rows); 35 are identical, 65 differ in position (median 300 m, p90 1,308 m, max 2,572 m), 28 in posture, 38 in strength. `y1` keeps the last row per unit in its object maps [V]; the order of rows within a tick depends on how files are concatenated, which I did not check | [M] `04-dups.mjs` |
| F15 | Posture and strength between fixes | 592 of 1,209 pairs change posture; 584 change strength (474 are drops); bearing changes by more than 90 degrees in 11% | [M] `04-speed.mjs` |
| F16 | Posture mix (distinct fixes) | Line of Battle 732, Charging Line 239, Chaotic Retreat 158, Line of March 131, Bivouac 129, Deployed Artillery 125, Skirmish Line 63, Reserve 54, Mounted Cavalry 26, Limbered Artillery 17, Dismounted Cavalry 13 | [M] `04-stats.mjs` |
| F17 | Strength and notes | strength min 15, median 497, max 15,000; 1,139 of 1,687 distinct fixes carry a free-text `notes` field (a possible source for per-fix hover text, subject to historian review; the field has no evidence label) | [M] `04-stats.mjs` |
| F18 | Base map and zoom | `mapbox://styles/mapbox/satellite-v9`, minZoom 11, maxZoom 18, maxBounds [[-77.36,39.72],[-77.12,39.91]] on the desktop map; Mapbox GL JS 3.24.1 | [V] |
| F19 | Production JS | `index-Cg8FAMXN.js`: 2,280,438 B raw, 626,977 B gzip-9 (includes mapbox-gl) | [M] `04-run-all.sh` |
| F20 | Today's unit tile | width = strength / 4 px clamped to 10..120 (height 8, cavalry 4), constant at every zoom; an 8-pass relaxation moves tiles off their true positions; labels 8 to 10 px bold on translucent plates; canvas is not pixel-ratio aware; 11 posture hues of which several pairs collapse for deutan viewers (charging vs retreat delta-E 7.8) | [D] `app-design.md` K-1 to K-5, 2.4, 9.5 |
| F21 | Pop-ups in the product today | command-change toasts (top right, 4.5 s, at most 4); commander-succession card (top left); event card with severity and time (bottom centre); story or vignette panel (right, paged); unit hover popup (260 px) and unit panel; monument tooltip (280 px); legend (Disposition / Sides / Size); overview minimap with unit count and tick; speed HUD (also shows an "fps" readout in the screenshot); engaged glow, strength-drop flash, trails; cannon audio; day/night tint | [D] `app-design.md` 5.10 and 5.11, `app-bugs.md`, `app-time.md` 7.3; I also looked at `docs/pitch/anim/shots/popups/d03-cards-tick553.png` and `d05-toasts-playing-tick550.png` made by another workstream |
| F22 | Fonts today | system-ui sans and Georgia serif, no web font | [V] `baseline/dist/index.html` |
| F23 | Test tooling already in the repo | Playwright 1.63.0; harness drives system Chrome over CDP with Mapbox Referer injection and a tile cap [D `tools/t0/README.md`] | [M] `node_modules/playwright/package.json` |

---

## 3. The twelve principles

Each principle is stated as a rule, grounded in references (R-numbers, section 5) and in the numbers above (F-numbers), and closed with a test that can fail. Thresholds marked [I] are proposals.

### P1. One tile, one identity, from first appearance to last

**Rule.** Every unit has exactly one persistent visual object keyed by `unit_id`. It is never rebuilt on a tick, a filter change or a zoom-tier change. It enters and leaves only by a cross-fade (about 300 ms, the length Mapbox itself uses for label fades) with a stated cause. A seek or scrub of more than a few ticks is a cross-fade of the whole layer, not a flight of 400 tiles. A fix pair whose implied speed is implausible is shown as a relocation (cross-fade plus a visible "relocated" note), never as a glide that implies a charge of 2 km in one tick.

**Why.** Bostock: the key function is what lets the eye follow things; unrelated states get a cross-fade (R14). Heer and Robertson: animation helps correspondence, tracking error rises with the number of objects, and animation that misrepresents the data is "temporal chart junk" (R15). Been et al.: nothing vanishes or appears except by sliding in or out (R29). Data: 478 units, 188 occupied ticks (F1); the performance and time specialists list pairs that exceed plausible speeds even at a uniform 5 min per tick, for example 2,374 m in one tick [D `app-time.md` 7.1], and the data has moves up to 5,687 m between fixes (F5).

**Test.** Object-creation count equals 478 per session and does not change during a full 675-tick playback; no non-seek frame moves any tile more than a bound derived from the plausibility cap [I]; every relocation has a registry entry with an evidence label (P10).

### P2. Two clocks: a story clock you can scrub, a render clock that never judders

**Rule.** Battle state is a pure function `stateAt(tickFloat)` with no hidden module state (seek-safe). The render loop reads the wall clock once per frame, clamps the step, advances the story clock, and draws interpolated state; cadence is kept even (frame pacing), not merely fast; returning from a hidden tab clamps instead of jumping a hundred ticks. Work per frame has a budget.

**Why.** Fiedler: accumulator, interpolation by the remainder, clamp the frame time (R37). Nystrom: same, and a wrong extrapolation is a smaller evil than stutter (R38). Android's frame-pacing guide: average frames per second is not consistent delivery, and uneven intervals read as stutter even at a high mean (R40). web.dev: about 16.7 ms per frame at 60 Hz, roughly 10 ms of your own work (R40). Production today: no clamp on `dt`, a tick committed every 500/speed ms, a module-level forward-fill that breaks seeks, a full-viewport canvas redraw: in the lab at 8x playback with 4x CPU throttling the baseline was 11.4 fps, 17.8 fps after the blur and blend overlays were removed, and 59.3 fps when the unit canvas draw was also skipped [D `perf-runtime.md` findings 3.2, 10, 14; `app-time.md` 7.1; V for `i2`].

**Test.** Identical unit positions at identical virtual times at 30, 60 and 120 Hz, using Playwright's paused clock (R51): my check gave the same 95 callbacks and the same final timestamp in 3 of 3 runs with `pauseAt` plus `runFor`, while install-only gave 94 and 93 in two earlier runs and 93 and 93 in two later ones [M `04-clock-check.mjs`], so tests must use `pauseAt`. Frame-time distribution: p99 interval at most 1.5 times the refresh interval and no frame over 100 ms at 8x with 4x CPU throttling (the performance specialist's acceptance numbers are at least 30 fps p95 and zero frames over 100 ms [D `perf-runtime.md` finding 10]).

### P3. Smooth the clock, never the geography

**Rule.** Between two documented fixes a tile travels on the straight chord. No spline path is invented through sparse waypoints. Instead the speed along the chord is eased so that velocity is continuous at every fix: through a straight run the speed carries over, through a sharp turn it slows toward rest, a stationary fix is a true stop, and the unit arrives at each fix on the fix's tick. If the design wants rounded corners, the rounding radius must stay inside the data's own quantisation (about 11 m, F12).

**Why.** F5: holding and then jumping covers a median 420 m between fixes. F3 and F4: where production does glide (93 pairs) it restarts an ease every tick, so velocity is discontinuous every 500 ms at 1x. F7: under piecewise-linear motion 42% of interior fixes have a speed step above 1 px per frame at zoom 15. F8: 44% of the moving waypoints (those where both neighbouring segments move) turn more than 90 degrees, so a smooth spline through them would curve units through places the record never put them; the data supports corners, so slow into them. R41: d3's monotone curve avoids overshoot and centripetal Catmull-Rom avoids loops and cusps inside a segment (it is not documented as overshoot-free), good for the camera, not for units. R39: a critically damped spring keeps velocity continuous when a target moves. R36 and R15: slow-in and slow-out, and motion that violates the data's meaning misleads.

**Test.** Maximum deviation of any frame's position from the recorded chord is zero (or at most 11 m if corners are rounded); second difference of on-screen position at every fix is below a threshold [I: 0.25 px per frame squared at zoom 15, 1x]; arrival within one frame of the fix's tick; no unit pauses at a straight-through waypoint.

### P4. Pixels: sub-pixel in motion, crisp at rest, pixel-ratio aware

**Rule.** Draw in device pixels. Moving tiles keep fractional positions; a tile that has come to rest settles onto the device-pixel grid so edges stay sharp. No `shadowBlur` or per-frame text measurement; sprites are pre-rendered per side, branch, posture and size bucket.

**Why.** F6: most movement is below one pixel per frame at 1x, so rounding to integers produces visible stair-stepping. MDN's canvas guide recommends integer coordinates and pre-rendered sprites for speed and avoiding `shadowBlur` (R47): take the sprites and the blur advice, reject integer snapping while moving. The canvas is not pixel-ratio aware, so every 2x or 3x screen is blurry [D K-3].

**Test.** A tile moving 0.3 px per frame for 60 frames has monotone, non-repeating sub-pixel positions; a resting tile's edges are pixel-aligned in the golden image; no `shadowBlur`, `measureText` or `getImageData` in a 10-second trace [D `perf-runtime.md` finding 17].

### P5. A tile is a symbol, not a bar: fixed geometry, layered channels, redundant coding

**Rule.** Frame carries side; an inner glyph carries branch (infantry, cavalry, artillery); an echelon mark carries size of formation; posture is a line style or a small mark, not one of eleven hues; strength is a short bar plus a number, not the tile's width; a status mark carries the evidence state (P10). Each channel carries one variable. The word for the side appears in labels and legend. A light outline plus a dark inner stroke is the proposed way to hold 3:1 against satellite imagery [I; to be measured on sampled imagery]. At the closest zoom a period-style frontage bar (blue Union, red Confederate, length in metres, not strength) can appear as a footprint.

**Why.** APP-6 and MIL-STD-2525 build symbols from frame, fill, icon and modifiers (R01); the Canadian instruction package puts echelon marks on top of the frame and a capability percentage under it (R02); Civilization VI relies on silhouette first and colour second (R22); Okabe and Ito say never rely on colour alone and add shape, line style and direct labels (R44); pre-attentive vision gives one fast channel per question and cannot search conjunctions (R45); WCAG 1.4.11 asks 3:1 for graphical objects needed to understand content (R42); period maps used blue and red bars for lines of battle (R08). Data: strength spans 15 to 15,000 with median 497 (F17), so a width scale either makes tiles huge or tiny; today's width scale clamps 10 to 120 px and overprints (F20).

**Test.** Greyscale and colour-vision-deficiency simulations of the same frame keep side, branch and posture distinguishable (use the specialist's delta-E method [D `app-design.md` 9.5]); the legend is drawn by the same function as the map; contrast of the tile outline against sampled imagery is at least 3:1.

### P6. Zero overlap by construction, never by hiding, never by silent displacement

**Rule.** An ordered ladder, cheapest to truth first. (1) Aggregate along the order of battle by zoom tier (corps, division, brigade, regiment), never mixing sides, with a visible count and the worst evidence state of the members. (2) Fan out near or coincident units into a visible arrangement, each tile tied by a leader line to a small anchor dot at its true position; the symbol's anchor, not its centre, is the location. (3) On phones, page or stack the remainder with leaders. No tile is ever hidden because of a collision. Vital information (side, designation, posture, strength of selected and engaged units) is never removed. Offsets are shown as offsets. Overlap is tested on the rectangles actually drawn, labels and leader elbows included.

**Why.** F10 to F12: even at zoom 17 about 650 of 675 ticks have an overlapping pair. Across the three sampled ticks (330, 548, 653) the largest overlap cluster is 17 to 22 frames at zoom 14 (20 to 37 with labels), 5 to 8 at zoom 15 (9 to 13 with labels), and 3 to 4 at zoom 16 and 17 (7 at zoom 16 and 4 to 6 at zoom 17 with labels); the number of coincident units is 71, 91 and 117 at those ticks. So aggregation is needed at zoom 14 and below, small fans work from zoom 15, and no zoom separates coincident units. Mapbox's engine hides the lower-priority symbol (R33); today's relaxation silently displaces tiles [D K-2]. Literature: label placement is NP-hard and heuristics are fine (R27); fast greedy grids exist (R28); leader-line external labelling keeps context on small screens (R31); excentric labelling spreads a cursor neighbourhood into an aligned list with leaders (R32); hierarchical clustering with an expansion zoom (R34); the Canadian package defines the exact location as the symbol's anchor (R02).

**Test.** For 675 ticks by zoom tiers {13, 14, 15, 16, 17} by viewports {1440 x 900, 390 x 844}: zero intersecting pairs among all drawn tiles, labels and leader elbows; zero hidden units (each unit is drawn, inside a visible aggregate with a count and one-step expansion, or in a fan); every displaced tile has a leader and an anchor dot; WCAG 2.5.8 spacing (24 px circles around targets do not intersect) holds for hit areas (R42).

### P7. Solve layout offline, play it back online

**Rule.** The battle is a known script, so the expensive optimisation runs at build time. For each integer tick and zoom tier, compute tile offsets, leader routes and label slots with an annealing optimiser under the consistency rules; ship them as data; at runtime interpolate offsets with the same easing as positions, and fade label slots in or out over their activity interval. Runtime keeps a cheap deterministic fix-up only for user filters and selection.

**Why.** Christensen et al.: annealing gives the best quality when quality matters and its schedule can be shortened when it does not (R27). Mote: runtime trellis labelling places 3,605 labels in 0.11 s but breaks the consistency rules when it relabels each view; he proposes per-zoom preprocessing to fix that (R28). Been et al.: selection and placement as a function of map state, no popping, achieved by preprocessing (R29). Barth et al.: schedule labels as activity intervals so moving objects do not flicker (R30). Mapbox fades label changes over 300 ms by default (R19). Size of the job, a rough bound [I]: 675 ticks x 5 tiers x 478 units is 1,613,250 placements at most, far fewer in practice because only about 6 fixes change per occupied tick (F2).

**The owner's rule on splitting applies here.** The owner asked that anything which possibly raises bug or error risk by splitting a pipeline should not be split. This principle is a split (a build-time solver and a run-time player), so it is acceptable only if (a) one shared module computes layouts both offline and in the browser, (b) CI replays the shipped layout through the same run-time overlap test, and (c) a missing or stale layout falls back to the run-time placer instead of to nothing. If that cannot be guaranteed, drop the offline half and run the grid placer of R28 at run time with sticky state [I].

**Test.** In CI, sweep 675 ticks with four sub-tick samples each: zero overlaps; no label toggles more than once per N ticks [I: N = 3]; a label shown at zoom z is still shown at z+1 (monotone zoom, Been's first rule).

### P8. Pop-ups are staged, anchored and never cover their subject

**Rule.** Nothing is removed: every pop-up in F21 stays and gets better. At most one primary pop-up (event card or story panel) at a time; toasts are capped and queued by priority; each pop-up is tied to its subject by a connector; when an event opens, the camera moves the subject into the free part of the screen using the map's `padding` option so no card covers its own subject or the other tiles of that event; pop-ups fire on crossing a tick, not on equality, so none are skipped at 8x or after a long frame; auto-dismissing items pause on hover and focus; each has a reduced-motion form.

**Why.** Disney's staging and Zongker and Salesin's advice to do one thing at a time (R36, R15); Heer and Robertson's staged animation was preferred and often more accurate, but multi-stage value changes raised tracking error (R15); Mapbox storytelling: one idea per chapter, camera and layers change together (R11); Esri guided tours keep the map and the media in two switchable layouts (R13); Mapbox `padding` exists to shift the view when panels cover the map (R17); WCAG 2.2.2 requires a way to pause, stop or hide auto-updating content (R42). Today: the screenshot at tick 547 shows four stacked toasts, an event card, the legend and the minimap at once, with panels sitting over units [seen, `d05`]; event cards match the tick exactly and can be skipped at 8x or on a janky frame [D `app-time.md` 7.3]; the toast slide-in animation names a keyframe that does not exist [D `app-design.md` 5.10].

**Test.** For every chronology event and vignette, at 1x, 4x and 8x: pop-up rectangle and subject-tile rectangle do not intersect; at most one primary plus three toasts visible; every event whose tick falls in (previous, current] is shown or queued, including after a 150 ms frame; a pop-up never covers a tile that is part of the same event.

### P9. One motion language, declared as tokens

**Rule.** All motion comes from a small token set: durations, easings (decelerate for arrivals, accelerate for departures, standard for state changes), spring half-lives for followers (selection halo, camera follow, label offsets), and named choreographies (arrival, departure, engagement, retreat, selection). Each motion means something, fires once per cause, and has a reduced-motion variant; no infinite loops. Members of one formation start and stop together with the same easing so common motion groups them; arrivals are never staggered for style. "Engaged" comes from data, not from a 40 px screen-distance guess.

**Why.** Chevalier et al.: staggering has a negligible or negative effect on tracking and costs the common-motion grouping cue and predictability (R16). Holden: half-life parameterised, framerate-independent, interruptible springs (R39). Healey: motion and flicker are pre-attentive, so many pulsing tiles steal attention from the one thing that matters (R45). WCAG 2.2.2 and 2.3.3, MDN reduced motion, and Mapbox's `respectPrefersReducedMotion` defaulting to true for the camera (R42, R43, R19). Today: the engaged glow pulses forever, is defined by two opposing units within 40 screen pixels so almost every unit is "engaged" when zoomed out, and the app UI has no reduced-motion handling [D `app-design.md` K-5, 27].

**Test.** `document.getAnimations()` is empty on a resting scene; under reduced motion no tile glides, state changes are steps or cross-fades and trails are static; every duration and easing in code references a token; data-driven examples to keep honest: arrival pulse on the first fix, posture morph on the 592 posture changes (F15), a one-shot strength-bar flash on the 474 drops (F15), engaged ring on the postures the specialist already flags as engaged [D `app-design.md` 9.2].

### P10. Truth is a visual state: every mark says how it is known

**Rule.** Each tile and each effect carries an evidence state in the site's vocabulary, drawn through channels military practice already uses: solid frame for a documented fix at this time, dashed frame for a modelled position (carried or interpolated), a question mark for contested or unconfirmed, a dimming or ring that grows with fix age, and a per-symbol source handle that opens the citation. Effects that are not in the record (smoke, muzzle flash, casualty sparks) are either left out or labelled "illustrative" and gated on data fields (for example only for Deployed Artillery postures, only inside an event window); no effect implies an event the record lacks. Interpolated posture changes between fixes are shown as modelled.

**Why.** The Canadian package: dashed frame for planned or future position, "?" for unconfirmed, and a circled log number on every plotted symbol so the source can be retrieved (R02). The Ukraine map-design post: symbols and fills carry claims, and shaded control areas overstated what was known (R10). Warren versus Bachelder: a measured base map and an interpretive overlay of troop positions from interviews, kept apart and criticised apart (R06). Heer and Robertson: animation can mislead (R15). Data: F13 (81% of units on a fix older than 50 ticks at tick 548), F14 (65 keys with conflicting duplicate positions), F12 (11 m grid), F15 (592 modelled posture changes).

**Test.** Every drawn element and effect resolves to a registry entry with `evidence` and `source` fields; the build fails otherwise; a unit whose fix is older than the threshold shows the stale cue in the golden image; the legend lists every state; nothing is conveyed by colour alone.

### P11. Reach: keyboard, touch, reduced motion, colour-blind viewers, low-end phones

**Rule.** Tiles are reachable by keyboard in order-of-battle order; hit areas are at least 24 x 24 CSS px (WCAG 2.5.8 AA) and 44 px for coarse pointers [I from the site's own plan]; autoplay can be paused; reduced motion is a first-class mode with equal information (stepped playback by tick, static trails); labels are at least 12 px; a capped frame rate has an even cadence; nothing is carried by motion alone.

**Why.** R42, R43, R44, R45. Today: no keyboard path to any unit; a pick radius of 0.002 degree whatever the zoom; the unit canvas once swallowed all pointer input [D `app-design.md` K-6, K-14; `perf-runtime.md` finding 1]. A 30 fps even cadence beats an irregular 45 (R40), and today the app skips frames below 500 px width [D `perf-runtime.md`].

**Test.** Axe plus keyboard-only traversal of all tiles; the 24 px spacing test shared with P6; a reduced-motion golden run in which the sequence is still understandable; coarse-pointer hit-area test at 44 px.

### P12. Everything tunable lives in data, with a lab and goldens

**Rule.** Tokens (colour, motion), the symbology spec, the choreography and effect registry, and the layout-solver parameters live in versioned JSON with schemas. A developer-only lab edits them live and exports JSON. Every change passes deterministic golden frames and numeric motion assertions. Adding an effect means adding one registry entry, one golden and one budget. Skins (daylight, dusk, print, high contrast, reduced motion) are alternative token files.

**Why.** Design Tokens format and Style Dictionary (R48, R49), Vega-Lite's encoding grammar (R21), deck.gl's accessor and transition props (R18), Tweakpane and lil-gui (R50), Playwright's clock and screenshots with pixelmatch (R51). Today the legend and the canvas disagree on posture colours in 8 of 11 rows [D `app-design.md` 2.4], which is what a single source of truth prevents. My clock test shows stepped frames are reproducible in the repo's own stack (F23).

**Test.** The legend is generated from the same spec as the renderer; a token-only change produces a golden diff in exactly the intended pixels; build fails on an unreferenced token or an effect without evidence and budget fields.

---

## 4. The pop-ups: keep every one, improve each

The owner loves what appears during the animation and wants it improved, not removed. Nothing below removes anything; the list is the inventory in F21 with the benchmark that applies and the improvement direction. Sources for the facts: [D] `app-design.md` 5.10, 5.11, 9.1; `app-bugs.md`; `app-time.md` 7.3; screenshots above.

| Pop-up today | Benchmarks that apply | Improve (keep, never remove) | Check |
|---|---|---|---|
| Command-change toasts (top right, 4.5 s, up to 4) | R36 staging; R42 2.2.2; R15 | Queue with priority and flood control (suppress on seeks, batch "3 commanders changed"); pause on hover and focus; show clock time, not tick; real entrance keyframe; reduced-motion form; tie to the unit by a connector | After a day jump 0 toasts; burst of 3 leaves at most 3 |
| Commander-succession card (top left) | R36; R16 | Same queue; the card's unit tile pulses once in sync (common motion); evidence label on the succession | Never overlaps the speed HUD or a docked panel |
| Event card ("CRITICAL" / "HIGH", time, text) | R11 one idea per chapter; R17 padding; R15 | Fire on crossing, not equality; camera moves the subject into the free area; leader to the subject; severity by icon and word, not colour alone; keeps its text | Never covers its own subject; none skipped at 8x |
| Story or vignette panel (right, paged, "2 min read", jump-to-tick) | R11, R13 two layouts; R36 | Anchor to the event location; collapse to a strip while the action plays; paging keyboard-reachable; jump button shows clock time | Subject tile visible beside the panel at 1440 and 390 widths |
| Unit hover popup (260 px) and unit panel | R32 excentric labelling; R02 symbol anchor and source number; R10 | Hover or long-press on a cluster fans members out (temporarily) with leaders; popup shows evidence state, fix age, source handle, and the `notes` text where the historian approves it (F17) | Popup never hides another tile it names |
| Monument tooltip (280 px) | R36; R45 | Edge-flipping single tooltip component; one-shot arrival, no loop | No overlap with tiles being described |
| Legend (Disposition / Sides / Size) | R01; R44; R22 lenses | Generated from the symbology spec; hover a row dims non-matching tiles (a lens); collapsed to a key button by default | Legend swatches equal map pixels |
| Overview minimap ("N units, tick T") | R40 pacing; R14 | Counts units on the field, shows clock time; viewport rectangle follows the camera with a spring | Count equals `stateAt` length |
| Speed HUD ("1x (base speed)") | R37 and R38; R40 | Shows battle minutes per second as well [D `app-time.md` 7.2]; the diagnostic "fps" text moves behind a debug flag [D `perf-runtime.md`] | No fps text in production |
| Engaged glow, strength-drop flash, trails | R45; R42 2.2.2; R18 TripsLayer; R39 | Engaged ring from data flags; one-shot flash on real strength drops; fading trails whose length is tokenised and which are static under reduced motion | Resting scene runs no animations |
| Cannon audio | R36 timing; [D `app-time.md` 7.4] | Drive cadence by data intensity per battle-minute, not by screen proximity; mute and reduced-motion respected | Same cadence at any zoom |
| Day/night tint | R37 and R38; R41 | Drive from solar position per frame, not an 8 s CSS transition [D `app-time.md` 7.5] | Matches sun table at sampled ticks |

---

## 5. Reference catalogue

Fifty-two entries (R01 to R52). Each gives the URL, how it was read, what to steal as a principle, and what to avoid. Licence notes appear where an asset or library could be adopted; none of these entries recommends copying anyone's artwork.

### A. Military symbology and period map craft

**R01 - NATO APP-6 and MIL-STD-2525 symbol grammar** [R, secondary]. https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology and https://en.wikipedia.org/wiki/MIL-STD-2525. The official 2525D PDF at jcs.mil returned 403 [U].
What I read: a symbol is four layers (frame, fill, icon, modifiers); frame shape encodes affiliation (blue rectangle friendly, red diamond hostile, green square neutral, yellow quatrefoil unknown); fill duplicates affiliation; icons are built from elementary glyphs inside a bounded region; a solid frame means present, a dashed frame means planned or anticipated; APP-6 is the NATO counterpart of 2525, with versions A to E.
Steal: a layered grammar where each channel carries one variable, with colour redundant to shape; present versus planned as solid versus dashed becomes our documented versus modelled.
Avoid: importing the full frame set (the hostile diamond reads as a modern ops room and clashes with a two-sided historical map); cloning official glyph geometry (we do not need conformance, and a "wrong symbol" critique costs more than it earns); modifier detail that is unreadable at 16 to 24 px.
Licence: the standards are public documents; draw our own glyphs.

**R02 - Canadian Forces School of Military Intelligence, "NATO Map Symbol (Canadian) Programmed Instruction Package", January 2000** [R, full text via PDF]. https://army.ca/wiki/images/8/80/NATO_Map_Symbol_(Canadian)_Programmed_Instruction_Package_Jan_2000.pdf (marked UNCLASSIFIED); also https://www.historyofwar.org/articles/concepts_natomap.html (a general article, [R]).
What I read: size indicators sit at the top centre of the frame (bars for company, battalion, regiment; X, XX, XXX, XXXX for brigade, division, corps, army); the exact location of a symbol is its centre (a headquarters' mast bottom); dashed lines mean a planned or future position; a question mark at top right marks an unconfirmed or possible report; a percentage under the reinforced or detached mark shows capability; each plotted symbol should carry a circled log number so the source can be retrieved; higher echelons are written after the designation separated by slashes (the general article adds designation on the left, higher formation on the right, monochrome single-line friendly versus double-line hostile, and solid lines for current versus broken lines for future positions).
Steal: a source handle on every symbol (our evidence label plus a link); "?" and dashed as the unconfirmed and modelled marks (P10); the anchor-is-the-location convention that justifies a displaced tile with a leader (P6); echelon marks as the zoom ladder (P5, P6); capability percent as the strength number.
Avoid: planner-density amplifiers on a consumer map; treating a 2000-era teaching package as the current standard.
Licence: unstated; read only, nothing copied.

**R03 - milsymbol (JavaScript library)** [R]. https://github.com/spatialillusions/milsymbol. Licence verified through the GitHub licence API: MIT [M].
What I read: supports MIL-STD-2525 C, D, E, FM 1-02.2 and APP-6 B, D, E; SVG and canvas output; options for size, stroke, fill, outline, monochrome, text fields; README claims 1,000 symbols in under 20 ms (SVG), not tested by me. The CDN `dist/milsymbol.js` of 3.0.4 is 861,713 B raw and 196,793 B gzip-9, 31% of today's gzip JS [M].
Steal: a reference implementation to compare our own glyphs against for echelon and status conventions; a candidate for an optional "NATO view" for educators, low priority.
Avoid: shipping 197 kB gzip for a handful of 1863 symbols; modern equipment icons that mean nothing here; a standards-perfect look that reads 2025, not 1863.

**R04 - Board-wargame counters** [P]. https://en.wikipedia.org/wiki/Counter_(board_wargames). The article is thin: counters carry attack, defence and movement numbers, are often simplified APP-6a symbols, and vary in shape (rectangles where facing matters).
Steal: a counter is a symbol plus two or three numbers readable at a glance (symbol, strength number, designation).
Avoid: relying on this page for stacking conventions: it does not document them. Further reading (not done): published Gettysburg board-game counter sheets.

**R05 - American Battlefield Trust animated battle maps** [P]. https://www.battlefields.org/learn/maps/animated-battle-maps, https://battlefields.org/learn/maps/gettysburg-animated-map, https://www.battlefields.org/news/gettysburg-150th-civil-war-trust-unveils-suite-educational-multimedia-offerings, and a secondary description at https://www.wearethemighty.com/mighty-history/this-animated-map-shows-gettysburg-in-a-whole-new-way/.
What I read: narrated video maps with troop-movement animation and reenactment footage, produced by Wide Awake Films with historians and the National Park Service; the Gettysburg map was announced 27 June 2013 with an "Explore" mode for landmarks; full-battle videos run about 15 to 20 minutes; a student question sheet accompanies it. I did not see the frames (video), so I make no claim about their symbols, colours or motion [U for visuals].
Steal: two modes, watch and explore, with narration as the spine; a teaching companion.
Avoid: baked video cannot be interrogated, so nothing carries an evidence label; reenactment inserts mix illustration and record, which the owner's truth rule forbids on the map layer.

**R06 - Warren, Bachelder, and the base-versus-overlay split** [R]. https://unwritten-record.blogs.archives.gov/?p=20249, https://www.docsteach.org/documents/document/battle-field-gettysburg, https://en.wikipedia.org/wiki/John_B._Bachelder, https://en.wikipedia.org/wiki/Hachure_map.
What I read: Warren (Corps of Engineers) directed a survey in 1868 to 1869, revised 1873, at 200 feet to 1 inch in several sheets; it did not show troop positions; Bachelder's published maps show the locations of regiments and other organisations (a search snippet says his map used Warren's survey as its base [S]), positions he gathered by interviewing veterans and marking points on the field (Wikipedia); Warren criticised Bachelder's treatment of perspective and terrain; the DocsTeach record lists the Warren proof as public domain (Records of the Office of the Chief of Engineers). Hachures encode slope by stroke thickness and density, standardised by Lehmann in 1799 and common on 19th-century military maps.
Steal: keep the measured base and the interpretive overlay visibly separate and credit the overlay's provenance (P10); relief that carries slope without colour.
Avoid: giving interview-derived positions the authority of the survey; perspective drawing that distorts ground; hachure overlays on satellite imagery (our base is satellite [V]), where tile outlines matter more.

**R07 - Hotchkiss maps** [P]. https://unwritten-record.blogs.archives.gov/?p=19757 (National Archives blog). The Library of Congress collection pages returned 403 [U].
What I read: Hotchkiss was self-taught, drew topography, roads, waterways, towns and battle lines for Jackson. The blog gives no technique detail.
Steal: nothing verified beyond the principle that a field engineer's map puts ground first. I could not confirm cartographic technique from what I read; treat as "look at the images in person before deciding the base style".
Avoid: copying (the images carry their own rights status; check each item).

**R08 - Period blue and red bars** [R]. https://digital.library.in.gov/Record/WV3_vchs-5230. A hand-drawn 1862 Shiloh map: blue bars for Union positions, red bars for Confederate. A search snippet says Official Records atlas Gettysburg sheets use blue and red with hachures [S].
Steal: heritage continuity: Union blue and Confederate red bars for lines of battle; a bar's length is the line's frontage in metres, kept for the closest zoom (P5).
Avoid: letting bar length mean manpower (today's width is strength divided by 4 [D]).

**R09 - Gottfried, The Maps of Gettysburg (2010)** [P]. https://shop.mdhistory.org/savas-beatie-the-maps-of-gettysburg.html (retailer page): 144 full-page colour maps in thirty action-sections at regiment and battery level, each with facing text, quotations and an order of battle.
Steal: organise by action with explanation beside the map (our events and vignettes); experts will compare our tiles with such an atlas, so provenance must hold up.
Avoid: static-panel assumptions; any copying (copyright).

**R10 - The Maproom, "The Design Choices Behind Maps of the Russian Invasion of Ukraine" (8 April 2022)** [R]. https://www.maproomblog.com/category/conflicts/page/2/. Roundup #3 only points to a thread on how the New York Times changed its symbology; I could not read the thread [U].
What I read: colour, layout, lettering and symbology shape perception; coloured areas suggested broad control when forces held mainly roads.
Steal: every symbol makes a claim; use a tile at a point when only a point is known, show uncertainty (P10).
Avoid: territory fills and big arrows that outrun the record.

### B. Modern animated-map and data-story craft

**R11 - Mapbox storytelling** [R]. https://www.mapbox.com/blog/how-to-build-a-scrollytelling-map and https://www.mapbox.com/blog/8-compelling-stories-told-with-the-storytelling-solution.
What I read: chapters trigger `flyTo` (centre, zoom, bearing, pitch) and layer opacity changes; "one idea per chapter"; reveals are sequenced to avoid overload; specific traceable journeys beat abstraction.
Steal: a vignette is a chapter: camera, layers and text change together and one at a time (P8); trace a regiment's path as a story.
Avoid: coupling to scroll (our clock is the timeline). The Washington Post 1968 riots write-up returned 403 [U].

**R12 - New York Times graphics, as far as can be verified** [P]. https://www.mapbox.com/showcase/the-new-york-times and https://www.felt.com/blog/tim-wallace-nytimes.
What I read: the NYT builds interactive maps with Mapbox GL JS; a NYT map editor interviewed by Felt describes a toolchain of GDAL, Python, Illustrator, Bash and Blender and a preference for not depending on one technology. Neither page describes motion or symbology decisions.
Steal: offline data preparation plus design-tool polish in the pipeline (P7); a pipeline that is not locked to one tool.
Avoid: citing the NYT for motion craft: the pages I read do not support it.

**R13 - Esri ArcGIS StoryMaps guided tours** [P]. https://maps.phoenix.gov/pub/help/en/storymaps/author-and-share/add-guided-tours.htm (an Esri help page hosted by a city government's ArcGIS server). Two switchable layouts, map-focused and media-focused; each stop has its own zoom; stops are numbered and can be renumbered; up to five media items per stop.
Steal: two layouts for the same content so a pop-up never has to cover the map (P8); numbered stops.
Avoid: media-heavy panels floating over the ground.

**R14 - Bostock, "Object Constancy"** [R]. https://bost.ocks.org/mike/constancy/. Key function gives a stable identity; update, enter and exit selections get transitions; animation only when it aids understanding; unrelated datasets get a cross-fade.
Steal: `unit_id` is the key; arrivals and departures fade; seeks cross-fade (P1).
Avoid: tweening across unrelated states, which is what a day jump is.

**R15 - Heer and Robertson, "Animated Transitions in Statistical Data Graphics" (IEEE InfoVis 2007)** [R, full text]. https://idl.cs.washington.edu/files/2007-AnimatedTransitions-InfoVis.pdf.
What I read: two controlled experiments; animated transitions (1.25 s in the first) significantly beat static ones; staged animation was preferred and often more accurate, but staged value changes in scatter plots raised tracking error; error rose with the number of elements; slow-in slow-out used throughout; animation can be "temporal chart junk" or mislead if it breaks the data's semantics.
Steal: animate few things at once; stage complex changes; slow-in slow-out; do not animate what the data does not say (P1, P3, P8, P10).
Avoid: multi-stage choreography for value changes.

**R16 - Chevalier, Dragicevic and Franconeri, "The Not-so-Staggering Effect of Staggered Animated Transitions on Visual Tracking" (IEEE TVCG 2014)** [R, full text]. http://visualthinking.psych.northwestern.edu/publications/ChevalierDragicevicFranconeri2014.pdf (the HAL copy was blocked by a bot wall [U]).
What I read: staggering can reduce crowding in simulation but has a negligible or negative effect on multiple-object tracking, and loses the common-motion cue and predictability.
Steal: formation members move together; reduce crowding by layout, not by timing (P9, P6).
Avoid: staggered entrances "for style".

**R17 - van Wijk and Nuij, "Smooth and efficient zooming and panning" (InfoVis 2003) through d3 and Mapbox documentation** [R for the docs; I did not read the paper]. https://d3js.org/d3-interpolate/zoom and https://docs.mapbox.com/mapbox-gl-js/api/properties/.
What I read: d3's `interpolateZoom` implements the paper with default rho of the square root of 2; Mapbox's camera `curve` default 1.42 is described as the average from user studies; camera options include `padding`, which shifts the vanishing point when panels cover the map, and `essential`, which opts an animation out of reduced motion.
Steal: camera flights between events use the perceptually tuned path and `padding` so the subject sits in the free area (P8).
Avoid: linear camera easing over long distances; setting `essential: true` casually.

**R18 - deck.gl** [R]. https://deck.gl/docs/api-reference/core/layer, https://deck.gl/docs/api-reference/mapbox/mapbox-overlay, https://deck.gl/docs/api-reference/extensions/collision-filter-extension, https://deck.gl/docs/api-reference/geo-layers/trips-layer, https://github.com/visgl/deck.gl. Licence MIT [R], 9.4.0 on npm [M].
What I read: a `transitions` prop per accessor, either interpolation (duration, easing, `enter`) or spring (stiffness default 0.05, damping default 0.5) with `onStart`, `onEnd`, `onInterrupt`; `updateTriggers`; TripsLayer with `trailLength` and `fadeTrail`; a GPU `CollisionFilterExtension` that hides colliding items by priority within a collision group (which is hiding, again); `MapboxOverlay` can interleave layers into Mapbox's WebGL2 context (the base map's context is created without antialiasing; extensions work only between layers with the same `beforeId` or `slot`).
Steal: the model of declarative layers with accessors, update triggers and interruptible transitions as the shape of our own small unit-layer API (P12).
Avoid: the whole bundle: the CDN build is 2,073,497 B raw and 575,140 B gzip-9, about 92% of today's 626,977 B gzip JS [M]; a tree-shaken build was not measured. Avoid its collision filter for vital tiles (P6).

**R19 - Mapbox GL JS licence, API and label controls** [R]. https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.txt, https://docs.mapbox.com/mapbox-gl-js/api/map/, https://docs.mapbox.com/mapbox-gl-js/api/properties/ (CustomLayerInterface), https://docs.mapbox.com/mapbox-gl-js/api/sources/ (GeoJSONSource).
What I read: version 2.0 onward is proprietary under the Mapbox Terms of Service and needs an active account (version 1.13 and earlier were BSD-3); the npm licence field is "see licence file" and the latest npm version is 3.32.0, while production runs 3.24.1 [M][V]; the map option `fadeDuration` defaults to 300 ms and controls label-collision fades; `respectPrefersReducedMotion` defaults to true; `CustomLayerInterface` draws into the map's own GL context (`render(gl, matrix)`, `triggerRepaint`); `GeoJSONSource#updateData` merges features by id and requires `dynamic: true`.
Steal: draw units inside the map's frame (custom layer or `updateData`) so camera sync, pixel ratio and hit-testing come for free; use the 300 ms fade as the standard label fade.
Avoid: assuming open-source freedom (use is tied to Mapbox services); relying on the collision engine for vital tiles.

**R20 - Washington Post 1968 riots, via Mapbox** [U]. https://blog.mapbox.com/revisiting-the-1968-d-c-riots-with-maps-4ce3c56f1c8d returned 403. A search snippet said it used animated markers by changing circle radius and `flyTo` chapters [S]. Recorded so nobody cites it as read.

**R21 - Vega-Lite** [R]. https://vega.github.io/vega-lite/ and https://github.com/vega/vega-lite. BSD-3-Clause [R].
What I read: a concise declarative JSON grammar of marks, encodings, transforms and selections, compiled to lower-level Vega.
Steal: the unit tile as a declarative encoding spec (side to frame, posture to line style, strength to bar, evidence to status mark) from which renderer, legend and docs all derive (P5, P12).
Avoid: running Vega at runtime: heavy and not map-native.

### C. Strategy-game interfaces

**R22 - Civilization VI** [R for art direction, P for lenses]. https://www.gamedeveloper.com/art/making-i-civilization-vi-i-both-playable-and-beautiful and https://en.wikipedia.org/wiki/Civilization_VI; lenses from a community thread, https://forums.civfanatics.com/threads/more-lenses.606150, whose vanilla-game detail is thin.
What I read: the art director says readability at a distance comes from shape and silhouette plus colour coding, with the map treated as a painting; Wikipedia says the style draws on Age-of-Exploration maps and the fog of war is cross-hatched like an old map, and units are recognisable from a distance without tooltips.
Steal: silhouette first, colour second (P5); one art direction for map and UI (a period-cartography skin); a "lens" as a temporary global mode that highlights one category and dims the rest, which suits focus on one corps, artillery or engaged units.
Avoid: cartoon stylisation on a documentary map; I could not verify unit-flag behaviour.

**R23 - Total War** [P]. https://www.feralinteractive.com/en/news/unit-battle-status-gives-you-the-upper-hand-in-rome-total-war-for-iphone/. Status boxes appear over engaged units with a type icon, health, morale and ammunition bars, a border colour for allegiance, and a white flag for retreat. The fan-wiki description of unit cards [S] was not read.
Steal: detail that appears only for engaged units (state-triggered), with icon, bar and one status glyph (a retreat flag mirrors our Chaotic Retreat) (P5, P9).
Avoid: allegiance colours relative to the player (ours are fixed Union and Confederate); banners that crowd (community complaints are snippet-level [S]).

**R24 - Hearts of Iron IV** [P]. https://hoi4.paradoxwikis.com/Hotkeys. Keys toggle all counters versus own counters only, switch allied counters between country colours and friend/neutral/enemy colours, toggle battle plans, and toggle a day/night overlay. Zoom-dependent grouping of counters is from a search snippet only [S].
Steal: persistent user declutter presets and shortcuts as a safety valve (P6, P11).
Avoid: using toggles to rescue a cluttered default; the default must pass on its own.

**R25 - Wargame series (IrisZoom)** [P/S]. https://en.wikipedia.org/wiki/Wargame:_European_Escalation names the engine (IrisZoom v2) but describes no zoom behaviour; the seamless zoom from units to strategic icons is from search snippets [S].
Steal: a continuous zoom where the representation changes (model, then symbol, then aggregate) is the idea behind our zoom ladder (P6).
Avoid: citing specifics: I could not verify them.

**R26 - Command Ops 2** [P]. https://store.steampowered.com/app/521800/Command_Ops_2/ (marketing). Continuous time and space with no hexes or turns, a recording system for replay, map and scenario editors.
Steal: a continuous time model matches ours; a deterministic replay recording is the idea behind our golden frame sequences (P12).
Avoid: treating marketing copy as UI evidence: I read no interface detail.

### D. Label placement and declutter literature

**R27 - Christensen, Marks and Shieber, "An Empirical Study of Algorithms for Point-Feature Label Placement" (ACM TOG 14(3), 1995)** [R, full text]. https://www.merl.com/publications/docs/TR94-12.pdf.
What I read: basic point-feature label placement is NP-hard; eight candidate positions are typical, four equally favoured positions were used in experiments; the authors add discrete gradient descent and simulated annealing; annealing is the choice when overall quality matters and its schedule can be shortened when time is short; they cite hand placement at 20 to 30 labels per hour.
Steal: offline annealing per zoom tier, 4 to 8 candidate positions plus a leader fallback (P7).
Avoid: running it per frame.

**R28 - Mote, "Fast Point-Feature Label Placement for Dynamic Visualizations" (thesis, 2007)** [R]. https://arxiv.org/pdf/1209.5766.
What I read: a "trellis" de-confliction that labels tens of thousands of nodes at several frames per second; one figure places 3,605 labels from 11,000 points in 0.11 s (hardware not stated in what I read); the author notes it breaks the consistency rules by relabelling each view and proposes multi-level preprocessing.
Steal: a grid-based runtime fix-up for filters and selection (P7).
Avoid: per-frame relabelling.

**R29 - Been, Daiches and Yap, "Dynamic Map Labeling" (IEEE TVCG 12(5), 2006)** [R, full text]. https://cs.nyu.edu/visual/home/pub/infovis06.pdf.
What I read: four consistency rules (a label does not vanish when zooming in or appear when zooming out; while visible its position and size change continuously; no pop except sliding in or out of view; placement and selection depend on the current map state, not history); achieved by moving selection and placement into preprocessing; their US map has more than 12 million labels.
Steal: precompute; priorities; monotone zoom ladder (P6, P7).
Avoid: assuming static features: ours move (R30).

**R30 - Barth, Niedermann, Nöllenburg and Strash, "Temporal Map Labeling: A New Unified Framework with Experiments" (2016)** [P]. https://arxiv.org/abs/1609.06327 (abstract) and an HTML mirror summary.
What I read: labels are scheduled by presence, conflict and activity intervals; the framework supports moving objects such as vehicles; simple fast algorithms reach near-optimal results on trajectory data.
Steal: schedule label slots as activity intervals over ticks so labels do not flicker (P7).
Avoid: quoting optimality figures: I read only the abstract and a mirror summary.

**R31 - Gedicke, Bonerath, Niedermann and Haunert, "Zoomless Maps: External Labeling Methods for the Interactive Exploration of Dense Point Sets at a Fixed Map Scale" (2020)** [R, full text]. https://arxiv.org/pdf/2008.13556.
What I read: labels sit at the map boundary with leader lines; three browsing methods (multi-page, sliding, stacking); designed for small screens; optimises label rank, leader length and spacing between leaders.
Steal: paged or stacked boundary lists for the densest clusters on phones (P6, P11).
Avoid: boundary labels for everything on desktop, where a local leader ladder is shorter and keeps association.

**R32 - Fekete and Plaisant, "Excentric Labeling" (CHI 1999)** [P]. Abstract at https://drum.lib.umd.edu/items/13064c68-5887-47c3-9035-acd4b89b7dcb; the dwell-time and circle details come from a search snippet of https://lccd.umiacs.umd.edu/node/16174 [S].
What I read: labels for the neighbourhood around the cursor are shown without overlap, with leader lines; a small pilot showed a speed benefit over zooming.
Steal: hover or long-press fans a cluster out temporarily, preserving true locations (P6, section 4).
Avoid: making the fan permanent.

**R33 - Mapbox label placement guidance** [R]. https://docs.mapbox.com/help/dive-deeper/optimize-map-label-placement.md.
What I read: overlaps are resolved by hiding unless `allow-overlap` is set (default false); `symbol-sort-key` sets priority; `text-variable-anchor` tries anchors in order with `text-radial-offset`.
Steal: priority order and variable anchors as the runtime primitives; the 300 ms fade (R19).
Avoid: collision-hide for anything vital: a hidden symbol is hidden information. Symbol layers have no leader lines or stacks.

**R34 - Supercluster** [R]. https://github.com/mapbox/supercluster. ISC [R, npm][M]. Hierarchical greedy clustering with a KD-tree, `getClusters`, `getLeaves`, `getClusterExpansionZoom`; default radius 40 px, max zoom 16; built for Mapbox clustering; 9,988 B raw, 4,104 B gzip-9 [M].
Steal: an aggregate knows the zoom at which it expands (P6).
Avoid: clustering by proximity alone: our hierarchy is the order of battle, and an aggregate must never merge Union with Confederate.

**R35 - d3-force `forceCollide` and D3-Labeler** [R]. https://d3js.org/d3-force/collide and https://github.com/tinker10/D3-Labeler. d3-force: ISC, 8,300 B raw [M]; D3-Labeler: MIT (licence file read through the GitHub API [M]).
What I read: `forceCollide` treats nodes as circles and relaxes overlaps softly (strength 0 to 1, iterations); D3-Labeler uses simulated annealing with a customisable energy and cooling schedule, default 1000 sweeps.
Steal: `forceCollide` as a cheap runtime relaxation for temporary fans with anchors pinned; D3-Labeler as an offline reference to compare our own annealer against (P7).
Avoid: soft relaxation as the only guarantee: it can leave overlaps and, unseeded, differs run to run; silently displacing positions is what the app does today [D K-2].

### E. Motion design and timing

**R36 - The twelve principles of animation (Thomas and Johnston, The Illusion of Life, 1981)** [R, secondary]. https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation.
Steal: staging, anticipation (a real pre-roll from data, such as Line of March before Charging Line), slow-in and slow-out, follow-through, timing (P8, P9).
Avoid: squash and stretch and exaggeration on tiles: Zongker and Salesin, as summarised by Heer and Robertson, advise against principles that promote the object's agency over the data's meaning (R15).

**R37 - Fiedler, "Fix Your Timestep!" (2004)** [R]. https://gafferongames.com/post/fix_your_timestep/. Accumulator, fixed step, render by interpolating between previous and current state by the remainder fraction, clamp the frame time (0.25 s in the example).
Steal: separate simulation from render; clamp; interpolate (P2).
Avoid: physics-style stepping of a battle clock that has a closed form.

**R38 - Nystrom, "Game Loop" (Game Programming Patterns)** [R]. https://gameprogrammingpatterns.com/game-loop.html. Variable versus fixed step, lag accumulation, render interpolation, and the admission that extrapolation may be wrong.
Steal: same as R37, with a second authority and plain wording for the team.
Avoid: extrapolating past known fixes.

**R39 - Holden, "Spring-It-On: The Game Developer's Spring-Roll-Call"** [R]. https://theorangeduck.com/page/spring-roll-call. Exact, frame-rate-independent dampers parameterised by half-life; the critical spring damper keeps velocity continuous when the goal changes. The article points to code on GitHub; I did not see a licence statement [P].
Steal: critically damped followers for halos, camera follow, popup anchors and label offsets: interruptible, stable at any step, one human-readable half-life per effect (P3, P9). The closed form is short enough to reimplement.
Avoid: underdamped springs on tiles: overshoot moves a tile past a place the data never put it.

**R40 - Frame pacing and rendering performance** [R]. https://developer.android.com/games/sdk/frame-pacing and https://web.dev/articles/rendering-performance.
What I read: average frame rate is not consistent delivery (the example intervals are 49, 16 and 33 ms); frames should present at predictable intervals; the web budget is about 16.7 ms per frame at 60 Hz with roughly 10 ms of your own work; compositor-only changes are cheapest.
Steal: measure variance and long frames, not mean fps; an even cadence at a lower rate beats an uneven higher one (P2, P11).
Avoid: ad hoc frame skipping.

**R41 - Curves: d3-shape and the centripetal Catmull-Rom spline** [R]. https://d3js.org/d3-shape/curve and https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline.
What I read: `curveMonotoneX` preserves monotonicity without overshoot; `curveCatmullRom` has an alpha parameter with 0.5 recommended; Wikipedia says the centripetal form has no loops or cusps within a segment (and does not claim overshoot-freedom).
Steal: a monotone Hermite for the speed profile along a chord; centripetal Catmull-Rom for the camera path (P3).
Avoid: spline paths for units: the median unit has 2 fixes and 44% of the moving waypoints turn over 90 degrees (F8), so a spline invents space.

### F. Perception and accessibility

**R42 - WCAG 2.2 success criteria** [R]. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, .../animation-from-interactions.html, .../pause-stop-hide.html, .../non-text-contrast.html.
What I read: 2.5.8 (AA) targets at least 24 x 24 CSS px with exceptions (spacing so that 24 px circles do not intersect, equivalent control, inline, user agent, essential, with map pins named as an essential example); 2.3.3 (AAA) non-essential interaction-triggered motion can be disabled; 2.2.2 (A) moving or auto-updating content that starts automatically and lasts over 5 seconds needs pause, stop or hide; 1.4.11 (AA) 3:1 contrast for interface components and graphical objects needed to understand content.
Steal: concrete hit-area, spacing and contrast numbers; a pause control for autoplay; no endless loops (P6, P9, P11).
Avoid: relying on the "essential" exception for map pins to excuse small targets.

**R43 - prefers-reduced-motion** [R]. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion. Values `reduce` and `no-preference`; `matchMedia` with a change listener; scaling and panning are the vestibular risks; substitute opacity changes. Together with Mapbox's default-on `respectPrefersReducedMotion` for the camera (R19).
Steal: reduced motion as another channel for the same information: steps, cross-fades, static trails (P9, P11).
Avoid: removing informational motion without an equivalent.

**R44 - Okabe and Ito, Color Universal Design; ColorBrewer** [R; P]. https://jfly.uni-koeln.de/color/ and https://colorbrewer2.org/ (licence verified through the GitHub API on `axismaps/colorbrewer`: Apache-2.0 [M]).
What I read: an eight-colour palette (vermilion, orange, yellow, bluish green, sky blue, blue, reddish purple, black); avoid red-green pairs, vary brightness, and add shape, line style, hatching and direct labels instead of relying on colour.
Steal: side colour plus a second non-colour channel (P5); direct labels instead of legend look-up.
Avoid: eleven posture hues (several pairs collapse for deutan viewers [D `app-design.md` 9.5]).

**R45 - Healey, "Perception in Visualization" (preattentive processing)** [R]. https://www.csc2.ncsu.edu/faculty/healey/PP/. Hue, shape, size, orientation, motion and flicker are processed in under about 200 to 250 ms; targets defined by a conjunction of features are not found pre-attentively; colour dominates shape in boundary tasks and luminance interferes with hue.
Steal: one pop-out channel per question (hue for side, one motion cue for "engaged"); never ask the eye to search a conjunction (P5, P9).
Avoid: ambient flicker on many tiles.

### G. Rendering technology

**R46 - PixiJS v8** [R]. https://pixijs.com/8.x/guides/concepts/performance-tips. Sprites batch best (up to 16 textures), spritesheets reduce textures, culling is off by default, bitmap text suits changing text, `hitArea` avoids event traversal. MIT [M npm]. CDN build 840,663 B raw and 236,841 B gzip-9, about 38% of today's gzip JS [M].
Steal: sprite-atlas batching and bitmap text for numbers.
Avoid: a second WebGL context stacked over Mapbox with its own camera sync.

**R47 - MDN canvas optimisation and OffscreenCanvas** [R]. https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas and https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas. Pre-render to an offscreen canvas, avoid scaling in `drawImage`, layer canvases, `alpha: false`, avoid `shadowBlur`, use `requestAnimationFrame`; OffscreenCanvas allows worker rendering and is widely available since March 2023.
Steal: pre-rendered sprites and layered canvases (P4); a worker is possible but the performance specialist notes it is valid only for pitch 0 and bearing 0 [D `perf-runtime.md` finding 10].
Avoid: the integer-coordinate tip for moving sprites (P4).

### H. Extensibility and regression

**R48 - W3C Design Tokens Community Group format** [R]. https://www.designtokens.org/TR/drafts/format/. JSON tokens with `$value`, `$type`, `$description`, `$extensions`, `$deprecated`; types include color, dimension, duration, cubicBezier, number and composites (shadow, transition); aliases like `{group.token}`; groups with type inheritance. The preview I read carries a banner telling readers not to implement that version.
Steal: duration and cubicBezier tokens next to colour tokens, in one file, with `$description` stating the meaning of each motion (P9, P12).
Avoid: implementing the draft literally.

**R49 - Style Dictionary** [R]. https://github.com/amzn/style-dictionary. Apache-2.0 [R]; 5.6.0 on npm [M]. Transforms token JSON into platform outputs (CSS variables, JS constants).
Steal: one token source emits both CSS custom properties and the canvas renderer's constants.
Avoid: a build dependency for about a hundred tokens when a short script would do [I].

**R50 - Tweakpane and lil-gui** [P]. https://tweakpane.github.io/docs/ (licence not on the page; MIT verified through the GitHub API on `cocopon/tweakpane` [M]). Tweakpane 4.0.5: bindings, folders, tabs, monitors and graphs, import and export of state; CDN build 152,084 B raw and 30,812 B gzip-9. lil-gui 0.21.0 (MIT per npm): 29,668 B raw and 7,959 B gzip-9 [M].
Steal: a developer-only motion lab (`?lab=1`) that edits tokens live, shows frame-time graphs and exports JSON (P12).
Avoid: shipping it to production; letting panel state bypass the schema.

**R51 - Playwright clock and visual comparisons; pixelmatch** [R]. https://playwright.dev/docs/clock, https://playwright.dev/docs/test-snapshots. The clock controls `Date`, timers, `requestAnimationFrame` and `performance`; `install` must come before other clock calls; `pauseAt`, `runFor`, `fastForward`; `toHaveScreenshot` goldens are per browser and per operating system and must be generated where they run, with `maxDiffPixels` through pixelmatch (ISC per npm [M]).
Measured by me in the repo's stack (system Chrome 155.0.8059.27, Playwright 1.63.0): install plus `runFor` gave frame deltas of exactly 16 ms but a callback count of 94, 93, 93 and 93 over two earlier and two later 1,500 ms runs; `pauseAt` plus `runFor` gave 95 callbacks and an identical last timestamp (2496) in 3 of 3 runs [M `04-clock-check.mjs`].
Steal: golden frame sequences at fixed virtual times and numeric motion assertions (second difference, overlap count), which catch jitter that an image diff misses (P2, P12).
Avoid: pixel-diffing satellite imagery (tiles stream; non-deterministic): test the unit layer on a stub background or mask the map.

**R52 - Game-loop and type-object patterns for data-driven registries** [P]. The Game Loop chapter was read (R38); the Type Object and Component chapters of the same book were not. Recorded as the next reading for the effect registry (P12).

---

## 6. Rendering technology options

Sizes are CDN `dist` builds I downloaded and discarded, measured raw and gzip-9 (`04-sizes.sh`); none is tree-shaken, so real app builds would be smaller [M]. For comparison, today's production JS is 626,977 B gzip-9 [M].

| Option | Added JS (gzip-9) | Licence | What it gives | Risks and costs | Fit here |
|---|---|---|---|---|---|
| Canvas 2D with a pre-rendered sprite atlas, pixel-ratio aware (the current approach, hardened) | 0 | platform | Simple; no new dependency; layered canvases; DPR-aware drawing | A full-viewport overlay must forward pointer events; own hit-testing; own camera sync; raster and composite of a large layer was the lab's frame-rate limiter [D] | Viable if kept small and dirty-flagged; weakest for collision and leaders |
| Mapbox symbol and circle layers fed by `GeoJSONSource#updateData` (`dynamic: true`) | 0 | Mapbox ToS | Inside the map frame; sprites via `addImage` (png, jpg, webp); collision engine; label fade 300 ms; `feature-state` | The collision engine hides losers (R33); no leader lines or stacks; per-frame updates cost, so the performance specialist suggests at most 15 Hz for interpolated subsets [D] | Good for the base tier; needs our own fan-out layer for P6 |
| Mapbox `CustomLayerInterface` with instanced sprites | 0 library, own WebGL code | Mapbox ToS | Per-frame GPU positions; draws in the map's own context; no second canvas | Writing and testing WebGL; context-loss handling; text needs an atlas | Strongest for smooth motion and zero camera drift |
| deck.gl through `MapboxOverlay` (interleaved) | about 575 kB (92% of current) for the full CDN bundle | MIT | Declarative layers; accessor transitions with springs; TripsLayer; GPU collision filter | Size; WebGL2; base map's context has no antialiasing; extensions work only between layers with the same `beforeId` or `slot` | Good model, heavy dependency; take the ideas, not the bundle, unless tree-shaking proves small |
| PixiJS 8 overlay canvas | about 237 kB (38%) | MIT | Sprite batching, bitmap text, scene graph | A second WebGL context over Mapbox; own camera sync and picking | Better engine than needed; integration cost outweighs gain |
| OffscreenCanvas worker with Canvas 2D | 0 | platform | Main thread relief | Camera state must be messaged; valid only at pitch 0 and bearing 0 [D]; complexity | Optional later optimisation |
| HTML or SVG markers per unit | 0 | n/a | Easy styling | Excluded: the existing monument markers already show the cost: one DOM node per marker updated by a requestAnimationFrame loop with state writes every frame [D `app-design.md` K-10] | Not for 478 moving units |

The "Fit here" column and the two paragraphs below are my judgement [I]. What my numbers imply: with at most 478 units and a median of 6 fixes per occupied tick (F1, F2, F9), drawing is not the bottleneck on any option; the choice is about integration and extensibility. A custom layer or the symbol-layer path avoids a second canvas and the camera drift it brings; the declutter ladder in P6 needs custom geometry (leaders, fans, aggregates) on top of whichever is chosen.

**Applying the owner's rule on splitting [I].** Every option that splits the pipeline adds a synchronisation seam where a frame can show tiles and map out of step, which is the class of bug the current overlay already has: an OffscreenCanvas worker needs the camera state messaged to it and is valid only at pitch 0 and bearing 0 [D]; a PixiJS or other second canvas needs its own context, camera sync and picking; DOM markers plus a canvas split drawing across two systems. The options that keep one frame and one loop are the Mapbox layers, `updateData` and the custom layer. On the owner's rule, only those pass; the worker and the second canvas do not, unless a later measurement shows the single-loop options cannot meet the frame budget.

---

## 7. Extensibility patterns (what to borrow, how to keep it small)

| Pattern | Evidence | Adopt as | Keep small by |
|---|---|---|---|
| Design tokens | R48, R49 | `tokens/color.json` and `tokens/motion.json` (duration, cubicBezier, spring half-life), each token with `$description`; build emits CSS variables and a JS module the renderer imports | A 30-line script before a dependency |
| Declarative symbology | R21, R01, [D `app-design.md` 9.2] | One spec file for side, branch, echelon, posture, strength and evidence, read by renderer, legend, tour copy and print | Spec has a JSON schema; unknown keys fail the build |
| Effect registry | R18 (layers, accessors, transitions), R52 | Each effect is a registry entry: `id`, `trigger` (a data predicate), `evidence`, `source`, `duration` token, `easing` token, `reducedMotion` form, `budgetMs`, `zOrder`, `golden` | A lint that rejects an entry missing evidence, source or golden (P10, P12) |
| Skins | R48, R22 | Daylight, dusk, print, high contrast, reduced motion as alternative token files over the same spec | No skin may change a channel's meaning |
| Tuning lab | R50 | Developer-only panel binding tokens and registry parameters, with frame-time graph and JSON export | Never in the production bundle |
| Golden frames and motion assertions | R51 | Playwright clock `install`, `pauseAt`, `runFor`; golden crops of the unit layer on a stub background; numeric assertions on overlap count, second difference and arrival tick | Few, meaningful ticks (for example 28, 316, 548, 553) rather than hundreds |

A registry entry could look like this (a design sketch [I], not a final schema):

```json
{
  "id": "strength-drop-flash",
  "trigger": "keyframe.strength < previous.strength",
  "evidence": "Documented",
  "source": "placements: unit_id, tick of the later fix",
  "duration": "motion.fast",
  "easing": "motion.standard",
  "reducedMotion": "static-bar-outline",
  "budgetMs": 0.2,
  "golden": "goldens/strength-drop-flash.png"
}
```

---

## 8. Licences and assets (open only; nothing copied)

Licences were read from the licence file through the GitHub API where noted, from npm metadata, or from the project README. This is not legal advice; anything shipped needs the owner's counsel as the earlier plan already says.

| Item | Licence | How I know |
|---|---|---|
| milsymbol 3.0.4 | MIT | GitHub licence API [M] |
| deck.gl 9.4.0 | MIT | README page [R], npm [M] |
| PixiJS 8.22.0 | MIT | npm [M] |
| Tweakpane 4.0.5, lil-gui 0.21.0 | MIT | GitHub licence API (Tweakpane) [M]; npm (both) [M] |
| Supercluster 9.1.0, d3-force 3.0.0, pixelmatch 7.2.0, kdbush 4.1.0 | ISC | npm [M] |
| D3-Labeler | MIT | licence file through the GitHub API [M] |
| Style Dictionary 5.6.0 | Apache-2.0 | README [R], npm [M] |
| Vega-Lite | BSD-3-Clause | repository page [R] |
| MapLibre GL JS 6.12.0 (the open fork, not proposed) | BSD-3-Clause | npm [M] |
| Mapbox GL JS 2.0 and later (production runs 3.24.1 [V]) | Proprietary, Mapbox Terms of Service, active account required; 1.13 and earlier were BSD-3 | LICENSE.txt [R]; npm field "see licence file" [M] |
| ColorBrewer colours | Apache-2.0 | licence file through the GitHub API [M] |
| Okabe and Ito palette | a published recommendation, not a licensed asset; eight named hues | [R] |
| Atkinson Hyperlegible Next | SIL OFL 1.1 | README [R]; also in `google/fonts/ofl` [M] |
| Inter | SIL OFL 1.1 (variable, tabular figures) | README [R]; `google/fonts/ofl` [M] |
| IBM Plex Sans, Mono, Condensed | SIL OFL 1.1 | README [R]; `google/fonts/ofl` [M] |
| Barlow and Barlow Condensed, IM Fell Double Pica and English, EB Garamond, Source Sans 3 | listed under `google/fonts/ofl` with an OFL.txt (GitHub contents API, HTTP 200) | [M]; I read none of the individual licence texts |

Font suggestions [I], not tested: a condensed face such as Barlow Condensed or IBM Plex Sans Condensed saves horizontal space at 12 px for designations, with tabular figures from Inter or Plex for strength numbers; Atkinson Hyperlegible Next for the pop-up body text; a period face such as IM Fell for headings only if the owner wants an 1860s voice. The site uses system-ui and Georgia today [V]; any web font adds weight and a load-order decision.

Do not copy (rights reserved or unknown): Hal Jespersen's Civil War maps (his site states all rights reserved [R: https://www.posix.com/CW/]); American Battlefield Trust animations; any game's banners, unit cards or flags (principles only); the Library of Congress images (rights unread [U]); figures from the NATO and 2525 documents. The Warren map proof is listed as public domain by DocsTeach [R] but is not proposed as an asset.

---

## 9. What I could not verify, and what I flag for other workstreams

**Blocked or unreadable (not bypassed):** Library of Congress collection pages (403); jcs.mil MIL-STD-2525D PDF (403); HAL copy of the staggering paper (bot wall; I used the Northwestern copy); several `docs.mapbox.com` pages (the style specification page and the markers guide, 403; the properties, map and sources pages worked); Mapbox blog post on the 1968 riots and a Medium NYT post (403); DPLA record (403); Fandom wikis (402); i2 documentation (login redirect); `hint.fm/wind` (certificate error); Material 3 motion page (rendered by script, empty); the DASH copy of the label-placement paper (405; I used the MERL copy).

**Snippet only [S]:** Total War unit-card behaviour, HoI4 zoom grouping, Wargame IrisZoom zoom behaviour, Civ VI vanilla lens behaviour, the van Wijk and Nuij paper itself, Excentric Labeling details beyond the abstract, the NYT symbology thread, Washington Post 1968 riots.

**Not looked at at all:** any game footage or screenshots; American Battlefield Trust frames; the look of Hotchkiss or Jespersen maps; GDC talks; Observable notebooks; Esri beyond one help page; any Total War, Civ VI, HoI4, Wargame or Command Ops interface in motion. The game-UI entries therefore rest on one or two pages each and are the weakest part of this report.

**Limits of my numbers:** the geometry statistics use my hold-forward and linear-interpolation model, true positions and CSS pixels, not the app's relaxation, easing or layout; the 24 x 16 and 96 x 18 tile sizes are illustrative; I measured no live frame times (the `05-bench` workstream's job); CDN sizes are full builds, not tree-shaken; maplibre and `@react-spring/web` CDN paths returned 404 so are unmeasured; the milsymbol speed claim is the README's, not mine; the jitter causes are identified from code and data, not from a frame trace, so their relative weights are unknown.

**Flags for other workstreams (not acted on):**
1. **Duplicate placement rows with conflicting positions** (F14): 65 (unit, tick) keys, median 300 m apart, for example `U-3IN-CAV` at tick 3 between `density_cavalry_detail.json` and `density_skirmishers.json`. Which row the renderer shows depends on array order; a data-integrity decision is needed before any tile can claim to be Documented.
2. **Fix age** (F13): under hold-forward most units at late ticks stand on very old fixes. Whether "held" means "documented as still there" or "modelled" is a historian decision; the visual states in P10 need that decision.
3. **Coincident positions** (F12): 91 units within 1 m of another at tick 548, some of them units whose last fix is hundreds of ticks old sitting on another unit's position (for example a Union regiment last placed at tick 128 shares a point with Confederate artillery at tick 548). The cause is not established: data entry, the 4-decimal grid, or the hold-forward rule.
4. **Diagnostic "fps" text** appears in the live screenshot and is flagged for removal in the earlier plan [D].
5. The live site's footer in the screenshots carries a contact line; I have not reproduced it anywhere in these files.

---

## 10. What a credible pitch must show against these benchmarks

A pitch that claims "AAA" should carry numbers for each of these before any build [I]: (1) the overlap test result per tick, zoom and viewport (P6), including the count of fanned and aggregated units; (2) a before and after on the three jitter causes: jump size at fixes, speed step at fixes, and frame-time variance (P2, P3); (3) the evidence-state legend and how stale and duplicate fixes will be shown (P10); (4) the pop-up inventory of section 4 with the staging and anchoring change for each, and confirmation that none was removed; (5) the token files, the registry entry format and the golden-frame list (P12); (6) a reduced-motion run that keeps the story understandable (P9, P11); (7) the licence and size line for every dependency (sections 6 and 8).

---

## 11. Reproduction

From the repo root (Windows, Git Bash, Node 24):

```
bash docs/pitch/anim/04-benchmarks-evidence/04-run-all.sh          # all [M] statistics and CDN sizes (network: public CDN, bodies discarded)
node docs/pitch/anim/04-benchmarks-evidence/04-clock-check.mjs     # headless Chrome with its own profile under tmp/pitch-anim/benchmarks, deleted afterwards
```

`04-RESULTS.txt` holds the output of my run on 2026-10-05. The PDFs I read locally (Heer and Robertson, Chevalier et al., Been et al., Mote, Gedicke et al., Christensen et al., the Canadian package) were converted to text under `tmp/pitch-anim/benchmarks/` for reading only and deleted afterwards; nothing from them is committed (the fetch tool also keeps its own copies in its results folder outside the repository).
