# Fire event contract (animation to mixer), version 1

Status: designed, and the mixer half of it is implemented and benchmarked (`../mixer-bench/`). The animation half is a specification; nothing in `render/` was changed.

One event stream drives both the picture and the sound, so a flash, a puff, a recoil and a bang cannot disagree about which shot they belong to. The animation owns the battle clock. The mixer owns the flash-to-sound delay.

## 1. The event

| field | type | meaning |
|---|---|---|
| `id` | u32 | unique within the battle; the picture and the sound both key off it |
| `t` | f64 seconds | battle (sim) time of the shot, on the same clock the animation draws with |
| `weapon` | u16 | index into `weapons.json` (0 Springfield M1861 ... 17 24-pounder howitzer) |
| `shooter` | u32 | soldier or gun id (for the fidelity database, recoil rig, crew animation) |
| `x, y, z` | f32 metres | muzzle position, Part F local frame: x east, y up, z north (`render/prototype/data/terrain.json` origin) |
| `heading` | f32 rad | muzzle azimuth h: forward = (sin h, cos h) (the render prototype's convention) |
| `elev` | f32 rad | muzzle elevation (artillery; 0 for small arms) |
| `proj` | u8 | 0 ball/Minie, 1 buck and ball, 2 blank, 3 solid shot, 4 common shell, 5 spherical case, 6 canister, 7 double canister |
| `seed` | u32 | deterministic variant: sample take = bank[seed mod n], pitch and gain jitter come from the same seed, so a replay sounds identical |
| `flags` | u16 | bit 0 misfire/hangfire (cap pops, no report), bit 1 chain-fire, bit 2 first shot of a volley (adds the command voice), others reserved |

Binary form used by the bench (Float64, stride 8): `[t, x, y, z, dirX, dirZ, sampleIndex, gain]` with `dirX = sin heading`, `dirZ = cos heading`, and an aux Float32 row `[pitch, spare]`. The full 40 byte form is the table above; at 4,000 shots/s that is 160 kB/s, and the measured cost of posting it to the audio thread was 85 to 218 ms of main-thread time in total over 30 to 60 s runs (`../mixer-bench/results/*.json`, field `main.postMsTotal`).

Artillery adds two linked events, because the three things a viewer hears (discharge, shell in flight, arrival) happen at three different places and times:

* `shell`: `fireId`, `v0` (m/s), the trajectory (sampled positions at 10 Hz, from the same ballistic solution the animation draws), `fuzeT` for shell and case shot. The mixer plays the in-flight sound as a moving source with listener Doppler (designed, **not benchmarked**, see PLAN.md section 7).
* `impact`: `fireId`, `t`, `x, y, z`, `kind` (shell burst, case-shot airburst, solid-shot strike, canister strike, ricochet), `surface` (earth, wood, stone, iron, man, horse). Same arrival rule as a shot: sound reaches the listener at `t + d/c`.

## 2. Who does what with the clock

1. The animation advances `t_sim`. The mixer is given `t` per event and a listener (`x, y, z, yaw, vx, vy, vz, heightAboveGround`) at 60 Hz.
2. Flash, puff and recoil begin at `t` exactly (light is instantaneous). The mixer starts the voice at the retarded time `t + d/c` (`d` = distance from muzzle to listener, `c` = speed of sound), to the sample. Measured: the start frame is within 0.5 sample (10 microseconds) of `(t + d/343) * 48000` for distances from 3.4 m to 1,500 m (`results/physics-tests.json`).
3. The picture is drawn for the sound being heard, not the sound being computed: the animation reads `AudioContext.getOutputTimestamp()` and sets `t_sim` from the context time that is leaving the speakers now. The Chrome run here showed 40 to 56 ms of output latency (`outputLatency`), so without this the picture would run 40 to 56 ms ahead of the sound.
4. A flash 2 km away is seen at `t` and heard 5.8 s later at 343 m/s (5.7 s at 30 C). Nothing is added by hand; the delay is the geometry.

### Time warp

When the battle clock runs `k` times faster than real time the physics must stay self-consistent in sim time, so the mixer is given `c_eff = c * k`: a 2 km sound delay of 5.8 sim seconds is 5.8 / k wall seconds. Samples always play at their own speed (no chipmunk effect); the shot density per wall second rises by `k`. The individually sounded shots are therefore limited by `k * (shots per sim second) <= capacity` (PLAN.md section 6: about 4,000 shots/s here). Above that the mixer folds the least audible shots into the statistical layer, in the order given in PLAN.md section 6.3, and the page shows that it has done so.

### Seeking

On a seek: `flush`, then send every event with `t` in `[t_seek - d_max/c, t_seek + lookahead]` (`d_max/c` is about 12 s for 4 km). Events whose wavefront has already passed the listener start mid-sample (`late`, counted; `lateDrop` if the whole sample would already be over). Events whose wavefront has not yet arrived stay in flight and arrive on time. This is implemented (`mixer-processor.js`, `startVoice`); the bench only exercised the late path through unit tests, not a scripted seek.

## 3. Visual parameters that must agree with the sound

These are what the animation draws for each weapon at `t`. They are **estimates for the art team to tune**, not measurements; the one hard rule is the timing in section 2.

| weapon class | flash | smoke | recoil |
|---|---|---|---|
| rifle-musket / carbine | short orange-yellow plume from the muzzle, tens of milliseconds, plus a small cap flash at the nipple a few milliseconds earlier | white-grey ball about 1 to 2 m, thick, drifting; powder smoke persists for tens of seconds | shooter's shoulder; rank shifts a little |
| smoothbore, buck and ball | larger, longer plume | larger cloud | stronger |
| field gun | flash several metres long, 50 to 100 ms | ring then a large cloud, 10 m scale | gun rolls back (order of 1 to 3 m), crew resets |
| canister | as field gun plus a fan of dust and debris downrange | | |
| revolver | small flash per chamber | small puffs | wrist |

## 4. What has to be true before this contract is "done"

* The animation emits `FireEvent` rows from its fidelity database (today the render prototype fires every musket on a fixed 5.6 s period, `FIRE_PERIOD = 5.6` in `render/prototype/src/world.mjs`, which is 10.7 shots per minute, three to five times the 2 to 3 aimed rounds per minute that the Springfield page gives; the event database must carry the real cadence or the sound will be four times too dense).
* One more field may be needed: the identity of the firing unit's volley command (to place the shouted order before the volley).
* The shell `trajectory` and `impact` rows must come from the same ballistic code that draws the shell.
