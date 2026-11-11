# AUDIO-HOST-CONTRACT: how the theatre page drives the sound (src/audio-host.mjs)

Written 2026-11-11. Code: `app/src/audio-host.mjs`, panel `app/src/ui/sound-panel.mjs`, tests `app/tests/audio-host.test.mjs` (node, 18 tests) and the sound test in `app/tests/leak.spec.mjs` (browser, not run here). The engine is `src/audio3d` (unchanged); this module adds the mixer, the causal clock, the node registry and the DEC-001 setting. Nothing here has been heard by anyone (BROWSER-VERIFICATION-LIST-AUDIO.md, part D).

## 1. Calls (module singleton; `AudioHost` class for tests)

```js
import * as AudioHost from './audio-host.mjs';
const A = AudioHost.init(host);   // once per theatre visit; sync; NO AudioContext, NO fetch, NO timer. Replaces and disposes a previous host.
AudioHost.update(frame);          // every frame of the theatre loop, after the time and camera of the frame are final (cheap; returns the silent reason, '' when sound runs)
AudioHost.dispose();              // Back / teardown (also runs when host.scope is disposed). Idempotent.
AudioHost.getCurrent();           // the host (the sound panel uses it when th.audio is not set); AudioHost.stats() -> { contextsOpened, contextsClosed, liveContexts, liveNodes, hasHost }
```
`A.start()` (from a click or key handler: browsers need the gesture) creates the single AudioContext and the engine and resolves `true`; `A.stop()` releases everything again (settings stay). Sound is **off** after `init`.

## 2. The `host` object passed to `init(host)` (all fields optional)

| field | meaning |
|---|---|
| `scope` | the theatre `Scope` (`add`, `on`): `dispose()` is registered as a cleanup, so Back closes the AudioContext and leaves 0 live nodes; `visibilitychange` suspends/resumes the context |
| `bus` | the animation event bus (`anim.bus`, BT-EVENTS.md): `fire`, `reload`, `command`, `unit_march`, `fall` are subscribed through `attachAudio` after `start()` and unsubscribed at `stop()`/`dispose()`. Drill commands and signals (`command` kinds `bugle`, `drum`, voice) reach the engine here |
| `replay(t0Sec, t1Sec)` | re-emit through `bus` every event of `[t0, t1)` (theatre seconds), exactly as the normal advance would have. Called with `[now - 12, now)` each time sound becomes active (play after pause, after a seek or scrub, speed change). The caller must continue its normal advance **from `now`** (no overlap, no gap). Without it, after a jump sound resumes with new events only and the panel does not claim otherwise |
| `T` | terrain (`T.h(x,z)`, `T.xz(lng,lat)`, `T.W`, `T.H`): ridge shadow, echoes, woods, camera height above ground |
| `search` | `location.search` (`?audioLabel=pdf|panel-only` is a preview of the DEC-001 option; a viewer's saved choice wins) |
| `storage` | object with `getItem/setItem` (default `localStorage`, wrapped in try/catch; `null` disables). Only levels, mute and the label choice are saved; **`started` never is** |
| `createContext()` / `AudioContext` | context factory / constructor (tests, mocks) |
| `planOnly` | no AudioContext: plans only (node tests; `A.renderOffline()` renders them) |
| `recordPlans` | keep every voice plan (`A.plans`) for `A.renderOffline()` |
| `audioData`, `audioBaseUrl`, `woods`, `budget` | pass-through to `createAudio3D` |

## 3. The `frame` object of `update(frame)`

```js
{ t,                 // theatre clock in MINUTES (state.t of clock.mjs); battle seconds = t * 60
  playing, speed,    // st.playing, st.speed (1 = real time; SPEEDS go to 60). Optional rate (the eased rate): sound is silent while rate <= 0.01
  dt,                // wall seconds of this frame (the loop's capped dt); default 0.1
  seeked,            // true on the frame after setTime / jumpEvent / a scenario change (th.needSeek); backward time and a forward step larger than 0.5 s + 4 dt speed are detected anyway
  scrubbing,         // true while the time slider is dragged (dock.mjs scrubbing)
  cam: { x, y, z, yaw, hAbove? },   // camera in the theatre frame (x east, y up, z SOUTH). yaw: forward = (sin yaw, cos yaw) in (x, z) as camera.mjs/BT-EVENTS. hAbove defaults to cam.y - T.h(x, z)
  weather, sun,      // env.weatherAt(t, choices) (th.wx) and env.sample (th.sample): temperature (documented) drives c, rain / wind / insects / birds beds, storm thunder
  weatherChanged }   // optional: force an atmosphere refresh (it is refreshed every 0.25 minute otherwise)
```
Listener yaw for the planner is `pi - cam.yaw` (`listenerYaw`, tested against `directionFromListener`).

## 4. Time rules (causality)

* The planner receives warp 1 (arrival times stay `t + distance / c(T)` in battle seconds); the engine converts battle seconds to wall seconds with the real speed once (`anchor(t, speed)`). audio3d's own `update({warp})` would compress the flight twice (planner `c*k`, then the engine's `/ k`); see the note in AUDIO3D-NOTES.md.
* An event is accepted only if `t <= now + 2 s` (frame-ordering slack) and `t >= now - 40 s`; later events are dropped and counted (`droppedFuture`), never queued. The engine wrapper refuses a voice whose event is after the clock (`causalityViolations`, expected 0).
* **Any jump** (seek, scrub, backward time, pause, speed change, speed above `AUDIO_MAX_WARP` = 8) flushes the queue, stops every voice **and every echo tap** (all sources are tracked), fades the beds and the folded-shot bed. Sound resumes only through `replay`, so nothing from the old future can sound.
* Silent reasons (shown in the panel in words, never hidden): `off`, `starting`, `paused`, `scrubbing`, `speed` (above 8x events pass faster than they can be heard: silent, not removed).
* Thunder claps of a storm minute (`thunderClaps`, plausible-procedural; the storm is documented) enter through the same guard.

## 5. Mixer and settings

`engine.limiter -> master -> mute -> destination`; channel buses `music` (bugle and drum signals only: no period music exists and none is invented), `effects` (weapons, shells, handling, marching, horses, wheels, weather) and `voices` (documented drill words, cheers, shouting) feed the engine's dry bus, so the reverb send follows the level. Slider 0..1 maps to gain `x^2`. `A.setLevel('master'|'music'|'effects'|'voices', v)`, `A.setMuted(bool)`. Offline: `channelGain(settings, channel)` is the same scalar `A.renderOffline()` applies.

**DEC-001 (still OPEN, not picked):** `A.labelSetting()` always lists both options (`pdf`: PDF rule, badge and per-sound tags; `panel-only`: owner's chat wish, nothing on the sound); `A.setLabelMode(id)`, `A.badge()`. The shipped default is `AUDIO_CONFIG.labelMode` of `audio3d/provenance.mjs` (`'pdf'`); a viewer's choice is remembered in that browser only. The 'what is in this build' list (`A.panel()`, needs no AudioContext: `A.ensureCatalog()`) is identical in both options.

## 6. Resources and teardown

All Web Audio nodes are created through a tracking proxy of the context: a voice's nodes are released when its sources end; `stop()`/`dispose()` stop every source, disconnect everything, `close()` the context, drop the bus handlers. After Back: `AudioHost.stats().liveNodes === 0`, `liveContexts === 0`, the page's AudioContext count 0 (leak.spec sound test).

## 7. Wiring the theatre owner does (not done here: theatre.mjs, render-host.mjs, stage.mjs and world-from-units.mjs belong to another agent)

1. After the animation system and the bus exist: `this.audio = AudioHost.init({ scope: this.scope, bus: anim.bus, replay: (a, b) => anim.replayEvents(a, b), T: this.T, search: location.search })`; expose `window.btApp.audio = this.audio` if wanted.
2. In `loop()`, after the camera and `state.t` are final: `AudioHost.update({ t: st.t, playing: st.playing, speed: st.speed, rate: st.rate, dt, seeked: <needSeek was set this frame>, scrubbing: <dock scrubbing>, cam: this.cam, weather: this.wx, sun: this.sample })`.
3. Optional: `mountSoundBadge(this)` from `ui/sound-panel.mjs` for the persistent PDF marking, and a toolbar button `data-panel="sound"` (the panel is also drawn at the end of Settings, wired already in `ui/panels.mjs`).
