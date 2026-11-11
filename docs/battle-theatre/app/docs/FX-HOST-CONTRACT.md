# FX-HOST-CONTRACT: what the render-host owner must provide and call

Code: `app/src/fx-host.mjs` (this file's subject), `app/src/weather3d/{params,timeline,shaders,gl}.mjs`. Tests: `app/tests/weather3d.test.mjs` (node, 16 tests), `app/tests/weather3d-shots.mjs` (browser harness, SwiftShader). Nothing in `render-host.mjs`, `stage.mjs` or `world-from-units.mjs` was edited. Status 2026-11-11: **shaders compile and run on SwiftShader (software WebGL2); nothing has run on a real GPU** (BROWSER-VERIFICATION-LIST-WEATHER.md).

## 1. The three calls

```js
import * as fxHost from './fx-host.mjs';
// once, after RenderHost.create(), after the structures layer is attached or not (either order works, see 4)
const fx = await fxHost.init(host, { environment, anim, choices: () => scenario.choices, nightFloor: settings.nightFloor });
// every frame, BEFORE host.frame(t, cam)
const info = fxHost.update({ tMin: state.t, cam });
// before host.destroy()
fxHost.dispose();
```

`init(host, opts)` returns a promise of the `FxHost`; `update` and `dispose` act on the one current instance (a second `init` disposes the first).

| `init` option | required | meaning |
|---|---|---|
| `environment` | yes (or `host.environment`) | the `Environment` of `src/environment.mjs` (the theatre's `this.env`). |
| `anim` | for smoke | the `AnimSystem` of `src/anim3d` (needs `.bus` and `.advance(t0, t1)`). Without it only weather draws (and `fx.onFire` etc. can be called by hand). |
| `choices` | no | object or function returning the scenario choices (`state.scenario.choices`: `CF-WIND-SPEED`, `CF-JUL2-SKY`, `CF-JUL4-RAIN-TIMING`, ...). A change re-seeds the effects and replays. |
| `nightFloor` | no | `settings.nightFloor` (0.34 default). The sky floor radiance is independent of it, so a floor of 0 still gives a lit sky. |
| `data` / `dataUrl` | no | the three fx3d JSON files as `{params, weapons, fires}`; default fetched from `URLS.data + 'fx3d/'`. |
| `tier` | no | `'desktop'` (default), `'laptop'`, `'tablet'`, `'phone'` (fx3d budget tiers). |
| `groundAt`, `geo`, `soldiers`, `fireScenario`, `contact` | no | defaults: `host.world.T.h`, `host.geo`, `host.world.count`, `{}`, `() => false`. |
| `driveAnim` | no (true) | true: fx-host calls `anim.advance(prevT, t)` each frame. False: **you** call `anim.advance` yourself (then the effects still receive the events through the bus) and fx-host only handles seeks. |
| `maxWindowS` | no (30) | a time step longer than this (or backwards) counts as a seek. |

`update(frame)`: `frame.tMin` (minutes, the theatre's `state.t`) **or** `frame.tSec`; `frame.cam` = the prototype `Camera` (fields `x y z fov near far`, `fwd`, `right()`, `up()`, the same object you pass to `host.frame`); optional `frame.choices`, `aspect`, `heightPx`. It returns (or `null` after a failed draw):

`{ t, driveState ('live' | 'replayed' | 'suspended' | 'no-anim'), weather, statement, effects: {text, tier, nEvents, nSprites, liveEvents, pending, uncertainFires, fires}, temp, wind, replayWindow, stats, log }`.

* `info.effects.text` is the sentence for the effects panel ("Smoke, flash and dust effects are drawn at N percent of full density ... Soldiers are not reduced"). `info.effects.uncertainFires` = ids of fires drawn at half intensity, to be shown as "time uncertain".
* `info.statement` is the weather sentence (which parts are inferred / plausible-procedural and which gaps are open); `info.weather.marks[]` is the per-field tier list `{field, tier, basis, gap}` for the tier overlay; `info.weather.gaps[]` the open gap ids (EG-W3D-G01..G08).
* `info.temp` = `{tempF, tempC, speedOfSoundMs, tier, basis}`: the **Q13 input for AUDIO** (c = 331.3 sqrt(1 + T/273.15), identical to `audio3d/physics.mjs`; null with tier `open gap` where no reading is within 14 h). This layer delays nothing.
* Optional once a second: `fxHost.instance().govern(effectMs)` with the measured effect cost: the governor then reduces sprites per effect (never soldiers).

## 2. What fx-host does to the renderer (WebGL2 only)

* Takes over `R.ext` with a chaining accessor: the **inner hook** is whatever is assigned to `R.ext` (the structures layer's `StructuresGPU.create` does `host.R.ext = s`, before or after our `init`); our `scene` runs after the inner `scene`, inside the prototype's scene pass (HDR target, depth attached), before bloom and post. `dispose()` puts `R.ext` back as a plain property holding the inner hook.
* Sets `R.o.flags.sky = false` and `R.o.flags.particles = false` (the prototype's own sky and particle passes would double the sky and the smoke); `dispose()` restores both. If any of our three programs fails to build, nothing is switched off and `info.log` says why.
* In `ext.scene`: blit the scene depth to `R.fbDepthCopy`, then (1) two full-screen draws (weather: multiply then add), (2) one instanced sprite draw of the fx3d effects. It saves and restores program, VAO, framebuffer, active texture, bindings of units 0 and 12 to 15, blend, depth test and mask, cull, viewport.
* Reads from the renderer: `R.gl`, `R.W`, `R.H`, `R.glVp` (GL-clip view-projection of this frame), `R.t.height`, `R.t.depthCopy`, `R.fbScene`, `R.fbDepthCopy`, the `FU` uniform block bound at point 0 (`cam`, `sun`, `invVp`, `terr`), `R.o.flags`. These are the names in `render/prototype/src/webgl2.mjs`; renaming them breaks fx-host.
* WebGPU (`host.api === 'webgpu'`): state, events and the returned info are computed, **nothing is drawn** (gap EG-W3D-G08). The prototype's own sky and particles stay on.

## 3. What the host must do so the effects are right

1. Call `fxHost.update` once per frame **before** `host.frame` (the draw happens inside `host.frame`). Do not call `host.replayFx` for fx-host's sake: the prototype's own effects are off; fx-host replays through the anim plan by itself.
2. Give `AnimSystem` a placement hook (`anim.setPlacement(fn)`) so fire events carry world positions in the renderer height frame, and set `AnimSystem.setNearSet` / unit segments with `surface` and `lengthM` for road dust (BT-EVENTS R-FX-3). Without segments there are no events, hence no smoke.
3. Subscribe AUDIO to the same `anim.bus` as usual. fx-host's seek **replay** re-emits the plan only into its own handlers (it swaps `bus.h` for the duration and restores it in a `finally`); AUDIO never hears a replay. During normal play the live window `advance(prevT, t)` reaches every subscriber.
4. On a seek (any time change that is backwards or longer than 30 s): fx-host clears the effects, waits until the clock is quiet (a slider drag does not replay on every move), then replays the 300 s before `t` once (`driveState: 'replayed'`). While waiting `driveState` is `'suspended'`. If you drive `advance` yourself (`driveAnim:false`) the replay is skipped: handle `info.replayWindow` (`{from, to}`) yourself, feeding `FirePlan.shotsBetween(from, to, ...)` into the bus.
5. Resize needs nothing (it reads `R.W`, `R.H` each frame). `dispose()` must run before `host.destroy()`; it unsubscribes from the bus and deletes its programs and textures.
6. The grade overlay (`applyGrade`, the CSS tint) and the 2D rain canvas stay as they are; they are in the host, not here. The prototype draws no wet ground, mist or stars: those come from this layer.

## 4. Order independence with the structures layer

`R.ext` is an accessor while fx-host is installed. `StructuresGPU.create` (`host.R.ext = s`) lands in the setter and becomes the inner hook; its `destroy` (`R.ext = null`) clears the inner hook. Tested with a fake renderer in `weather3d.test.mjs` and in the browser (harness: structures on, fx-host installed afterwards).

## 5. Time, weather and the luminance floor

* One clock: `tMin * 60` seconds, as BT-EVENTS. Effects are pure functions of (event, age): scrubbing is exact.
* Weather (`weather3d/timeline.mjs`) is a pure function of `t` and the scenario choices: cloud cover from the Jacobs readings (or 0.3, marked a gap), precipitation and wetness (0 / about 0.3 / 1.0 schedule of PDF B.10.6, then a 21 h drying model), mist from fx3d air dampness and rain, wind = the **fx3d wind** (S to SSW, the 2/12 mph choice, Charge-hour calm), temperature for AUDIO.
* Smoke and dust follow that wind (fx3d `Wind`); clouds drift with the same wind direction times a look factor (2.5).
* **Night is never black (Q10).** Sky, cloud and fog radiance are clamped to `sky.floor_radiance` in the shader and in `skyPalette()`; tested at every 15 minutes of 26 Jun to 6 Jul under four scenario sets (`weather3d.test.mjs`). The global exposure floor of the environment layer multiplies it. Lights (flashes, fires) only multiply by at least 1; smoke keeps fx3d's own floor. The PDF gives no numeric Q10 threshold; the floor is a look value, owner-adjustable, and no gate was marked passed.
* Stars exist only when the sun is below -6 degrees, fade with cloud, mist and a bright moon, and **are a procedural field, not the 1863 sky** (no catalogue in the repository, EG-W3D-G03): tier plausible-procedural, shown on the tier overlay.
* The prototype's terrain/soldier/structure shaders fog their pixels toward a fixed daylight sky colour. The weather pass undoes that mix exactly (the function and inputs are known) and re-fogs in the sky's own horizon colour, so a night horizon is not a bright blue band.

## 6. Tier marking (what the host shows)

Every weather field carries a tier and basis (`weather.marks`): sun and moon documented (computed ephemeris); readings from the weather file `inferred` (secondary source, original sheets not read; the file's own tier is in `weather.sourceTier`); cloud shape, mist, stars, puddles, unrecorded sky `plausible-procedural`; open gaps `W3D-G01..G08` with register files `GOVERNANCE/register/EG-W3D-G0x.md`. Effects: `app/data/fx3d/TIERS.json`.

## 7. Findings for other owners

* **fx3d GLSL type errors: fixed at the source** (`fx3d/shaders.mjs`, the smoke and blast-ring `vec3 lit` lines now wrap the float in `vec3(...)`). The load-time patch is removed; `weather3d/gl.mjs patchFxVertex` only re-addresses the event texels. Verified on SwiftShader webgl2 with `tests/weather3d-shots.mjs` (smoke day and night, `fxDraws` > 0, no GL log), and by a test on the unpatched source.
* fx3d's vertex shader addresses event `e` at texel `(k, e)`, which caps events at `MAX_TEXTURE_SIZE` rows (16,384 desktop budget + 64 exceeds it on common GPUs). fx-host re-addresses it as `((e & 1023) * 6 + k, e >> 10)` in a 6144-wide texture (patch + test of one-to-one addressing).
* `fx3d` `Wind._grow` integrates from 25 Jun at 10 s nodes the first time a late date is asked: jumping straight to 19 Nov builds about 1 million nodes once (seconds). The weather pass avoids it for clouds (15 minute table); the effects' wind history does not.
* The prototype GL renderer applies `fogged()` to every geometry class, including structures: the weather pass's fog undo is therefore valid for all of them. Any new geometry that skips `fogged()` would come out too bright at distance.

## 8. Not done / open (nothing hidden)

WebGPU draw path; real-GPU cost of the two passes (the weather pass is 2 full-screen draws plus a 27-cell star loop on sky pixels at night; the extra depth blit is the prototype's own cost class); cloud shadows on the ground; rain streaks (the shell's 2D rain canvas remains); flash lights do not cast shadows; the fx3d `govern` input needs a measured effect time that the prototype's timer queries do not isolate (a nested TIME_ELAPSED query is illegal inside its scene query).
