# BT-EVENTS: the event interface between ANIMATION, FX and AUDIO (Battle Theatre figures round)

Status: **v1, written first by the ANIMATION agent (2026-10-31)**, as the common brief requires. FX (`src/fx3d`) and AUDIO (`src/audio3d`) read this file; ANIMATION (`src/anim3d`) implements it. If FX or AUDIO need a field that is not here, add it to the end of the matching table in a "REQUESTS" block at the bottom of this file (append only, dated) and ANIMATION will adopt it; do not change an existing field.

Code: `app/src/anim3d/events.mjs` (the bus), `app/src/anim3d/fire-plan.mjs` (the pure shot schedule), `app/src/anim3d/index.mjs` (the façade). Every example below is exercised by `app/tests/anim3d.test.mjs`.

## 1. Conventions

* **Time `t`** is **simulation seconds** on the theatre clock: seconds since 1863-06-01 00:00 local mean time = `minutes * 60` where minutes are the units of `src/clock.mjs` (`minOf`) and of the sim event cache. It is a double. `t` is the instant the thing happens in the world (the flash), not the instant the sound arrives: **AUDIO adds distance / speed of sound** (`audio/model/acoustics.mjs`), FX does not.
* **`unitId`** is the history-layer unit id (`layer.units[i].id`, e.g. `US-I-1-2-20ME`). **`figureIdx`** is the index of the figure inside that unit (0 .. `strength.drawn - 1`), the same index the figure manifest uses (`<unitId>:<index>`, `src/history/figures.mjs: idOf`) and the same `agent` index of the `state` events of the stage. Guns: `figureIdx` is the index of the figure who fires (No. 4 with the lanyard, `drill_artillery.json` ART-FA-44); the gun is in `info.gunIdx`.
* **World frame** = the theatre frame of `src/geo.mjs`/`stage.mjs`: x and z horizontal metres, **y up in metres in the renderer's height frame** (terrain height minus `Y0`). Heading `h` (radians) has forward = `(sin h, cos h)` in `(x, z)` (`render/prototype/src/world.mjs`).
* **Model frame** (rig, clips, props): right-handed, **+Y up, +Z forward, +X = the figure's left** (as `FOOT_RIG` of the prototype), metres.
* **Vectors are `Float32Array(3)` owned by the bus and REUSED between calls.** They are valid only during the callback; copy (`out.set(position)`) if you keep them. This keeps the hot path free of allocation (measured in the tests). A call never mutates your arrays.
* **Order**: for one `emit` window the events come out sorted by `t`, ties by `(unitId, figureIdx)`; the order is a pure function of the inputs (no `Math.random`, no clock).
* **Every figure present fires, whether or not it is drawn.** Events are produced for **all** figures of a unit in a firing state, at every LOD, because the sound of a battle must be audible from anywhere (R06) and smoke must stand over a line that is only a column of dabs. Culling is the consumer's business. (No capping; owner constraint of the Law, clause 1.)
* **Determinism and seek (gate G16/Q12).** The shot times are an analytic function of `(plan, figure, n)`; `FirePlan.shotsBetween(t0, t1, cb)` enumerates exactly the shots in `[t0, t1)` so scrubbing to any `t` and playing forward gives the same events as playing from the start. The live bus (`AnimSystem.advance(t0, t1)`) is a thin wrapper over the same function.
* **Tiers.** `info.tier` is the tier of the *timing and manner* of the event (documented / inferred / plausible-procedural), not of the fact that fire occurred (which is the history layer's). The product marks non-documented content (DEC-006 keeps tier marking).

## 2. Subscribing

```js
import { createAnimBus } from '../anim3d/events.mjs';      // or: anim.bus (the AnimSystem owns one)
const bus = createAnimBus();
bus.on('fire', (unitId, figureIdx, t, weaponKind, position, direction, info) => { /* FX / AUDIO */ });
bus.onFire(fn);                                            // sugar for on('fire', fn)
bus.off('fire', fn);
```

Handlers are called synchronously, in registration order, from `AnimSystem.advance`. A handler must not throw (a throwing handler is isolated, counted in `bus.stats.handlerErrors`, and the remaining handlers still run). `bus.stats` counts events by type.

## 3. Event catalogue

Positional arguments in this order; the last argument `info` is optional for consumers (always passed, a reused object whose fields are listed).

### 3.1 `fire` : `onFire(unitId, figureIdx, t, weaponKind, position, direction, info)`

The first six arguments are the interface fixed by the common brief. `position` = muzzle position (world, metres). `direction` = unit bore direction (world). `weaponKind` is one of:

| `weaponKind` | meaning | source of the kind |
|---|---|---|
| `long_arm` | muzzle-loading shoulder arm (rifle-musket, smoothbore musket, buck and ball) | `kit/weapons.json` category `long_arm` |
| `carbine` | carbine (cavalry; includes the breech-loading Sharps/Burnside/Gallager/Smith/Merrill) | category `carbine` |
| `repeater` | Spencer / Henry | category `repeater` |
| `handgun` | revolver | category `handgun` |
| `cannon` | any field piece | `kit/weapons.json` `artillery.pieces` |

`info` fields: `weaponId` (the kit id, e.g. `m1861_springfield`, `napoleon_12pdr_m1857`; null if the kit says only "unspecified"), `gunIdx` (artillery, else -1), `round` (`ball`, `buck_and_ball`, `blank`; guns: `shot`, `shell`, `case`, `canister`, `double_canister`, `unknown`), `mode` (`volley`, `battalion`, `company`, `wing`, `file`, `rank`, `squad`, `at_will`, `skirmish`, `battery_fire`, `by_piece`), `cycleIndex` (n-th shot of this figure in this fire plan), `cycleS` (the figure's seconds per round for this cycle), `tier` (`inferred`, `plausible-procedural`; see ANIM3D-NOTES), `ranksBack` (0 front rank, 1 rear rank; smoke and noise shaping), `kneeling`/`lying` (0/1). For `cannon`: `recoilM` (peak recoil of the carriage, metres, plausible-procedural range in notes), `muzzleVelocityMs` is **not** provided here (FX/AUDIO read the ordnance tables).

### 3.2 `misfire` : same arguments as `fire`

A flash in the pan or a missed cap (drill procedure documented, `drill_infantry.json` INF-FIRE-06; **no misfire rate is documented in any acquired text**, `DRILL-NOTES.md`). The default misfire probability is **0 and the system never emits `misfire` unless the scenario sets a rate**, in which case `info.tier = 'plausible-procedural'`. Registered as an open gap.

### 3.3 `reload` : `onReload(unitId, figureIdx, t, stepName, stepIndex, durationS, position, info)`

One event at the **start** of each step of the loading drill. Infantry: the nine times of *Load in nine times* (`stepIndex` 1..9: `load`, `handle_cartridge`, `tear_cartridge`, `charge_cartridge`, `draw_rammer`, `ram_cartridge`, `return_rammer`, `prime`, `shoulder`) (Hardee S.S. paras 156-170, Casey paras 163-177). Artillery: `sponge`, `load`, `ram`, `ready` (prick and insert tube), `fire`, `run_up` for the numbers of the detachment (`info.number` = 1..8, 0 for the gunner). `info.drill` is `load9`, `load_at_will`, `ready` (the at-will return) or `gun_serve`. `durationS` is the step length actually used (see ANIM3D-NOTES). The sound-relevant steps: `tear_cartridge` (teeth), `draw_rammer`/`return_rammer` (the ring of the rod in the barrel, Hardee "spring rammer" S26), `ram_cartridge` (rod on the charge), `prime` (cap). `position` = the figure's hand/muzzle area (approximate, metres).

### 3.4 `drill_step` : `onDrillStep(unitId, figureIdx, t, drillId, stepName, stepIndex, position)`

Every other manual-of-arms or movement step that is a *named drill time*: `shoulder_arms`, `order_arms`, `right_shoulder_shift`, `support_arms`, `charge_bayonet`, `trail_arms`, `fix_bayonet`, `unfix_bayonet`, `ready`, `aim`, `recover`, `kneel`, `lie_down`, `rise`, `face_left`, `face_right`, `about_face`, `rest`, `attention`. `drillId` is the drill-file item id where one exists (`HAR-S12`, `INF-FIRE-01`, ...). Emitted once per figure at the start of the step, with the unit-level offset of the order (a command is followed by the men's execution: see 3.6).

### 3.5 `footfall` : `onFootfall(unitId, figureIdx, t, side, position, speedMs, info)` and `unit_march` : `onUnitMarch(unitId, t, nFigures, stepsPerMin, speedMs, centroid, headingRad, gait)`

* `footfall` is produced **per figure for the near set only** (the figures the renderer reports through `AnimSystem.setNearSet(unitId, indices)`; default none) at each foot contact. `side` 0 left, 1 right. `info.surface` is a hint if the renderer provided a surface lookup (`'road'`, `'field'`, `'wood'`, `'stone'`, unknown otherwise).
* `unit_march` is produced **per unit** every `AnimSystem.unitMarchPeriodS` (default 1.0 s) while the unit marches: AUDIO builds the crowd footfall bed from it (cadence, speed, number of men; rhythm is `stepsPerMin`, e.g. 90, 110, 165). `gait` is one of `common_time`, `quick_time`, `route_step`, `double_quick`, `run`, `walk`, `trot`, `canter`, `gallop` (cavalry/horse artillery). Tier `documented` for the three infantry rates (Hardee/Casey), `plausible-procedural` for the run and for horse gaits' cadence figures (see notes).

### 3.6 `command` : `onCommand(unitId, officerIdx, t, kind, text, position, info)`

The **spoken or signalled order** that starts a drill action, produced by the fire plan / unit state machine. `kind` ∈ `caution`, `preparatory`, `execution` (Hardee's three kinds of command, `HAR-ED-04`; execution in the manual of arms is the last syllable), `bugle`, `drum`, `officer_voice` (free voice: "Steady, men"). `text` is the period command in plain ASCII from the manuals ("Fire by file", "Squad", "Ready", "Commence firing", "Aim", "Fire", "Load", "Cease firing", "Charge bayonet", "Forward", "Double quick", "March", "Halt", "Load at will", "Fix bayonet", ...). `officerIdx` is the figure that gives it, or -1 when the manifest has no officer (the command is then attributed to the unit's centre: AUDIO should use `position`). The execution of the men follows the command by the unit's reaction delay (`info.reactionS`, plausible-procedural 0.2-0.8 s, per figure by the variation scalar). Bugle calls use the call names listed in `drill_hardee.json` HAR-L01/L02. **Which commands a real regiment gave at a real minute is not documented per unit** (registered gap G-ANIM-02).

### 3.7 `fall` : `onFall(unitId, figureIdx, t, style, position, info)` and `lie` (same args, when the fall ends)

From the stage's `state` events (killed or wounded). `style` ∈ `back`, `front`, `side_left`, `side_right`, `knee_first`, `spin`, `clutch_wound`, `drop_rifle`, `crumple`, `horse_fall` (the style is a deterministic draw from the figure's variation scalar, plausible-procedural; the fall itself is the history layer's). `info.fate` = `killed` or `wounded`. AUDIO: body fall, cry (documented: none; plausible-procedural). FX: dust puff at the contact.

### 3.8 `gun` events : `onGun(unitId, gunIdx, t, phase, info)`

`phase` ∈ `recoil_start`, `recoil_end`, `run_up_start`, `run_up_end`, `limber`, `unlimber`, `traverse` (handspike). Carries `info.recoilM`, `info.recoilS` (curve duration). The renderer asks `anim.gunRecoil(tSinceFire, params, out)` for the carriage offset (a pure function of time since the shot).

### 3.9 `hoofbeat` : `onHoofbeat(unitId, figureIdx, t, gait, position, speedMs)` (near set) and `unit_march` with a mounted `gait`

### 3.10 `activity` : `onActivity(unitId, t, fromActivity, toActivity, info)`

The unit state machine changed the animation class of the whole unit (e.g. `march` to `fire`); `info.clipset` names the clip family. Useful for AUDIO beds and FX start/stop of sustained smoke.

## 4. Pull API (the pure functions the bus is built on)

```js
import { FirePlan } from '../anim3d/fire-plan.mjs';
const plan = FirePlan.create({ unitId, n, seed, mode: 'file', startS, endS, cycleS: {min, max, basis}, ranks: 2, files: 140, ... });
plan.shotTime(figureIdx, k)            // seconds, pure
plan.shotsBetween(t0, t1, (figureIdx, t, k, ranksBack) => {...})   // exactly the shots with t0 <= t < t1
plan.firstShotIndexAfter(figureIdx, t)
```

`FirePlan.create` is O(n) and allocation-free thereafter. Units that are not firing have no plan. A unit's plan is rebuilt when the history layer's `activity` event changes it; the plan is a pure function of that event, the unit's strength at that time (casualties remove figures: a fallen figure has `fallT` and stops firing at it) and the seed.

## 5. What ANIMATION promises about timing, and what it does not

* **Documented**: the nine commands and their motions; the regulated-motion rate of 1/90 minute per motion except the cartridge, rammer and bayonet motions; the three marching rates (common time 90 steps/min of 28 in., quick time and route step 110 steps/min, double quick 165 steps/min of 33 in., up to 180 under urgent need); the order of the detachment's duties; the training standard of at least three rounds a minute; artillery planning rates (2 shot or 3 canisters a minute; Gibbon 30-40 s for a 6-pdr, 60 s for a 12-pdr; mean about one a minute).
* **Not documented (registered, ranges only)**: the real rate and tempo of fire of any unit at any minute of the battle; officers' actual commands; misfire rates; the recoil distance of a carriage; the length of the exempt motions; the run's cadence; the order in which companies of a real regiment actually fired. These are carried as `cycleS: {min, max, basis}` ranges with tier `inferred` or `plausible-procedural`.

## 6. REQUESTS (append only)

* (none yet)

* **2026-10-31, FX agent (`src/fx3d`)**, requests to ANIMATION, appended, no existing field changed. FX already consumes `fire`, `misfire`, `fall` and `unit_march` as specified above (`fx.attach(bus)`); the following would complete the effect set:
  * **R-FX-1 `impact` event** `onImpact(unitId, figureIdx, t, kind, position, direction, info)` where `unitId, figureIdx` are those of the **firing** figure, `kind` in `shell_burst`, `case_burst`, `solid_strike`, `ricochet` (canister strikes need no event: FX draws the canister dust fan itself from the `canister` round), `position` the burst or strike point (world, y = height), `direction` the unit direction of flight, `info` = `{ fireT (the `t` of the fire event that caused it; required), weaponId, speedMs (impact speed, optional), balls (case: ball count, optional), surface (`earth`, `wood`, `stone`, `iron`, `water`, `man`, `horse`), shotId (optional, the same id as `info.shotId` on the fire event) }`. `t` must be >= `fireT` (FX refuses earlier bursts: nothing exists before its cause). Without this event FX cannot draw shell bursts, case bursts or ground strikes (it cannot know where a shell lands). Time of flight and the fuze length are ANIMATION's ballistic solution (`Bormann fuze maximum 5.5 s`, `drill/ordnance_tables.json ORD-FUZE-FA`; Confederate fuzes burnt long on Jul 3, `kit/weapons.json` fuzes).
  * **R-FX-2 fuze fields on gun `fire` events:** `info.fuze` = `time` or `percussion` (rifled shell is percussion unless a time fuze is documented; Wheeler's 13th NY had only percussion and canister on Jul 2) and `info.fuzeS` (seconds, <= 5.5). FX uses them for the night fuse trail (plan T2-203); without them smoothbore shell and case get a trail of 3 s, rifled shell none.
  * **R-FX-3 `unit_march` optional fields:** `info.surface` (`dirt`, `macadam`, `unknown`; from `app/data/structures3d.json` roads `surface`) and `info.lengthM` (column length, metres). Without them FX assumes a column of fours (4.4 men per metre) on a road of unknown surface (dust factor 0.7).
  * FX timing note for AUDIO: the cap flash is drawn at `t`, the muzzle flash and the smoke start 3 to 8 ms later (percussion arms) so that no effect precedes its cause; the report still belongs at `t + d/c`.

* **2026-10-31, ANIMATION answer to the FX requests (implemented in `src/anim3d`, tested in `tests/anim3d.test.mjs`).**
  * **R-FX-1 implemented** as the `impact` event with exactly the fields requested. It is produced only when a gun plan carries a target: `plan.target = {x, y, z}` and `plan.origin = {x, z}` (world metres), `plan.weaponId`, `plan.round` (`shot`, `shell`, `case`, `canister`). Range -> elevation -> flight time use the PRINTED per-elevation ranges (`drill/ordnance_tables.json`, Napoleon/light 12-pdr, 6-pdr, 12-pdr howitzer); flight time is the flight time of the vacuum trajectory that reproduces the printed range (tier **inferred**, arithmetic; real flight is longer by air drag, so the time is a lower bound by about 10-20 percent; no time of flight is printed in the acquired texts). `info.fireT` is the `t` of the cause; `t > fireT` always. Beyond the printed table (more than the 5 degree range) **no impact is emitted** (nothing invented). Kinds: `shell_burst`, `case_burst`, `solid_strike`; canister gets no event (as you said); `ricochet` is not produced (no bounce model).
  * **R-FX-2 implemented**: gun `fire` events carry `info.fuze` (`time` for shell and case, `none` for shot and canister, `percussion` only if the plan says so) and `info.fuzeS` (the flight time, capped at the Bormann maximum 5.5 s, `ORD-FUZE-FA`; `plan.fuzeErrorS` shifts it for the July 3 long-burning fuzes) and `info.shotId` (the same number on the matching `impact`).
  * **R-FX-3 implemented**: `unit_march` `info.surface` and `info.lengthM` come from the unit's segment (`surface`, `lengthM`); the stage must put them on the segment (default `unknown`, 0).
  * **Positions of gun events.** For a `serve_guns` segment the placement hook is asked for the firing figure (No. 4); the muzzle is taken as 1.55 m ahead of that figure's frame at 1.12 m height (plausible-procedural). Replace by the gun model's `muzzle` socket as soon as the gun rig is placed: pass the gun's position and yaw from `setPlacement` instead of the figure's.
  * **Implemented API names**: `AnimSystem.advance(t0, t1)` emits the window, `setPlacement(fn(unitId, k, t, out{x,y,z,yaw}))` gives world positions (y in the renderer height frame), `setNearSet(unitId, Int32Array)` selects the figures that also get `reload`, `drill_step` and `footfall` / `hoofbeat` events; `unitMarchPeriodS` (1 s); `misfireRate` (0). `ClipSel` is the fixed-shape result record of `clipAt`.
