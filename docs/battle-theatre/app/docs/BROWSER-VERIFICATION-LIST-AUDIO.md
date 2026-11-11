# BROWSER-VERIFICATION-LIST: AUDIO (to run when the machine is free; nothing below has been run)

Written 2026-10-31. The AUDIO part was built with node only (Release 1 timing passes were measuring the machine). This list is what is deferred. Part A are automated browser specs (Playwright style of `app/tests/*.spec.mjs`, headless Chrome with `--autoplay-policy=no-user-gesture-required`); part B are the listening checks that only the owner can do, each with the objective measurement that stands in for it (from `app/data/audio3d/measurements.json`, regenerate with `node app/tools/build-audio3d-data.mjs`). Claude cannot hear anything: a "pass" in part B is the owner's.

## A. Automated browser checks (specs to write and run)

| # | check | how | pass criterion |
|---|---|---|---|
| A1 | graph builds in Chrome, Firefox, Safari (WebKit), no console error | `createAudio3D({ ctx })` on a user gesture; schedule 200 events; read console | no error; `engine.voiceCount <= budget.maxVoices` at all times |
| A2 | arrival time equals physics in the real clock | `OfflineAudioContext` (44.1 kHz, 20 s): build the engine on it with `anchor(0, 1)`, schedule a Napoleon at 700, 1,400 and 2,800 m, render, find the first sample above 1e-5 per event | onset = `d / c(T)` within 2 ms (c from the weather temperature); same onsets as `offline.mjs renderOffline` within 1 ms |
| A3 | offline render equals the node renderer | the same scene through `OfflineAudioContext` and through `renderOffline`; compare RMS per 100 ms and the spectra (centroid) | RMS within 2 dB per window; centroid within 15 percent (HRTF voices differ in the high bands, compare basic-tier voices) |
| A4 | HRTF and ITD | one source hard right, 300 m, basic tier and HRTF tier | basic: right channel leads by 25 to 36 samples at 44.1 kHz; HRTF: right louder and leading |
| A5 | voice cap and honest line | 4,000 shots in 2 s of battle time, `budget.maxVoices = 160` | `engine.voiceCount <= 160`; `audio.status().text` names folded shots; the page shows it |
| A6 | no underruns | real-time context, 371 shots/s (the Angle peak) plus a 6x cannonade for 45 s, then 1,667 shots/s for 40 s; read `AudioContext.playbackStats` | zero underrun events at 371/s; report the figure at 1,667/s (PLAN 6.2 measured the worklet path: 0 at 1,667/s) |
| A7 | planner CPU on the main thread | `performance.now()` around `pump()` at 371 and 1,667 events/s on desktop and a phone profile | under 2 ms per frame at 371/s (node: 0.016 ms per event without terrain, 0.18 ms with the DEM); report phones |
| A8 | clock sync | seek, play, change speed 1x to 60x with `anchor`; compare `engine.battleHeard()` with the animation clock | within the output latency (40 to 56 ms measured in PLAN 6.2); after a seek no sound from the old time |
| A9 | time warp | speed 8x: a 2 km shot | wall delay = 5.8 s / 8 (cEff = c k), pitch unchanged |
| A10 | seek and flush | `flush()`, re-emit `[t - 12 s, t + 30 s]` | sounds in flight arrive on time; none start twice |
| A11 | listener leak spec | run `leak.spec.mjs` with the engine on | one AudioContext, closed by `dispose()`; no growth of nodes over 5 minutes |
| A12 | recordings load | `loadRecordings` with the shippable ledger ids (FS-347647, FS-125348, IA-TAPS, ...); then `audio.panel()` | the panel rows flip from `synthesized` to `real_type` / `real_standin` for exactly the loaded families; credits list FS-162628 and FS-18229 if loaded |
| A13 | DEC-001 flag in the page | load with and without `?audioLabel=panel-only` | pdf: badge visible and per-sound tags; panel-only: no badge, no tags; the panel lists the same rows in both; screenshot both |
| A14 | mobile budget | phone profile: `maxVoices` 160, 40 HRTF | no dropouts at 371/s; if there are, lower the budget and record the figure (`DEFAULT_BUDGET` in `planner.mjs`) |
| A15 | autoplay policy | page load without a gesture | context stays suspended and nothing throws; `resume()` on the first click starts sound |

## B. Listening checks for the owner (what to listen for, and the number that stands in)

Use headphones for B1 to B5. Defaults: the Web Audio graph at trim +22 dB; reduce the master trim if loud (`engine.setMasterTrimDb`).

| # | listen for | objective stand-in (not a substitute) |
|---|---|---|
| B1 | **Delay**: stand 1 km from a battery; the flash and smoke come about 2.9 s before the boom (2.89 s at 79 F); at 2 km 5.8 s | delays in `measurements.json propagationChain`; analytic test; offline onset check A2 |
| B2 | **Distance muffling**: a musket volley at 100 m is a crack; at 1 km a dull thud; at 2 km a low mutter | low-pass 5.8 kHz / 2.4 kHz / 1.7 kHz (musket, 100 m / 1 km / 2 km) and level 105 / 79 / 70 dB peak |
| B3 | **Musket versus cannon**: the report of a musket is a sharp crack with a short tail; a Napoleon a deep thump with a long rumble; a 3-inch rifle sharper and higher than the Napoleon; a howitzer duller | spectral centroid musket 1343 Hz, smoothbore 931, carbine 2421; Napoleon 522, 3-inch 694, howitzer 417 (real recordings: musket 854 to 2889, cannon 158 to 809) |
| B4 | **Four sounds of a round**: gun report, a rush (smoothbore) or a whine (rifled) overhead with pitch falling after it passes, a burst or a strike, in the right order; close to the gun the shell is heard before the report only inside about 0.5 to 0.9 km of the target | `planShell` segments (Doppler rate falls through 1.0 at closest approach); crossing ranges 525 to 940 m (Napoleon), 425 to 705 m (3-inch) |
| B5 | **Direction**: fire on the left of the camera sounds left, behind sounds behind; turning the camera moves the sound | A4 numbers; HRTF generic (not personalized: front/back confusion is expected) |
| B6 | **Ridge shadow and echo**: stand behind Cemetery Ridge while Seminary Ridge fires: duller than the same distance in the open; after a big gun a faint late repeat from the hills (3 to 9 s depending on the ridge); woods on Culp's Hill should roar (not wired: no woods mask) | shadow loss up to 17 dB in the synthetic 100 m ridge test; taps from the DEM (documented accounts: DR-ECHO-HILLS-KIDD, DR-ECHO-WOODS-CULPS) |
| B7 | **Volley versus at-will**: a volley by company is a ripple of cracks with a command before it; at will is a continuous crackle; 300 men firing at will become a roar, not 300 separate shots | allocate(): protected near voices plus the statistical bed; the line "N shots folded" |
| B8 | **Commands**: the words "Ready, Aim, Fire, Load" are recognisable, shouted, with the pauses of drill; nothing else is spoken | formant words are finite and deterministic (tests); an intelligibility judgement is the owner's; if unintelligible, tune `WORD_PHONES` and the formant table in `synth-voice.mjs` |
| B9 | **Bugle calls**: where a recording is loaded the call is a modern Army or Marine call of that name; the engine plays nothing for calls without a recording; none is the 1863 call as played | `calls.json`: 11 of 26 names have a stand-in; notation gap AUD-G02 |
| B10 | **Cheer and rebel yell**: the yell is higher, shriller and broken; the cheer is a lower two-syllable "hurrah"; both read as crowds, not as one voice | centroid yell 2267 Hz, cheer 1691 Hz; no recording of either exists to compare with (AUD-G03) |
| B11 | **Hooves, wheels, marching**: a column at quick time 110 steps a minute (a steady thud), double quick faster, a gallop four-beat, wheels rumble with clanks | unit_march variants 90, 110, 165; gait timings inferred |
| B12 | **Night and quiet**: at 02:00 on 3 July with no firing nearby, crickets (quieter and slower in cool air), no shots, no black silence; at dawn, birds; in the evening storm of 3 July, rain and thunder claps; on 4 July rain | `ambientState` levels 44 dB insects, 40 to 46 dB birds, 40 to 68 dB rain |
| B13 | **Loudness**: the Day 3 cannonade must be overwhelming but not painful or clipped; quiet moments must be audible; no pumping from the limiter | trim +22 dB and limiter settings are unlistened (AUD-G09); record the master trim you settle on and put it in `provenance`-style config |
| B14 | **Honesty**: open the sound panel (`audio.panel()`): every family lists its kind, licence, ledger id and gap; in pdf mode a badge and tags read "modern reconstruction"; in panel-only mode nothing on the sound but the panel is identical | tests A13 and the node panel test |
| B15 | **The Gettysburg far field**: the 3 July cannonade from 6 km: a low rumble 18 s after the flash; from 56 km (Harrisburg) a faint rumble 2 min 44 s later (an upper bound, see section 7 of the notes) | `farField` in `measurements.json` |

## C. Things to decide after listening

1. The default of the DEC-001 flag (`AUDIO_CONFIG.labelMode`) is the owner's; nothing else depends on it.
2. Master trim, limiter and reverb time (RT60 2.4 s is a guess).
3. Whether to ship recordings (and which: the packaging, and the CC BY credit lines) or synthesis only.
4. Whether to ask Jari Villanueva for permission to use his Civil War calls (an owner act) or to transcribe the notation from the Casey page images (a Claude task: locate the leaves behind the 32 plates of vol. 1).

## D. Audio host and sound panel (added 2026-11-11; `src/audio-host.mjs`, `src/ui/sound-panel.mjs`; nothing below has been run or heard)

| # | check | how | pass criterion |
|---|---|---|---|
| D1 | sound off on entry | enter the theatre, no click | `__instSnapshot().audio === 0`; `AudioHost.stats().liveContexts === 0`; the panel says "Sound is off" |
| D2 | start needs the gesture | click Start sound in Settings (or the Sound drawer) | one AudioContext, state running; Chrome, Firefox, Safari; no console error |
| D3 | leak: Back | `leak.spec.mjs` sound test (5 cycles) | audio 0, `stats().liveNodes === 0`, `liveContexts === 0` after each Back; timers/listeners equal the baseline |
| D4 | mixer | move master, music, effects, voices, mute while a Day 2 volley and a bugle call play | each slider changes only its channel; mute is silent with no click; the levels are remembered after reload |
| D5 | scrub is silent and causal | play at 1x in a battle, drag the time bar back 30 s then release | silent while dragging; on release only shots fired in the previous 12 s and still in the air are heard; no shot of the old future |
| D6 | pause, speed | pause; set 15x, 30x, 60x; set 8x | paused and above 8x: silent with the panel line; 8x: a 2 km shot is heard after 5.8 s / 8 |
| D7 | seek by event jump | press `]` several times during a cannonade | no sound from the future after each jump (voice count falls to 0 at the jump) |
| D8 | DEC-001 setting | switch both options in the panel; screenshot each | pdf: badge and tags; panel-only: none; the "what is in this build" list identical; the choice survives reload; default is pdf until the owner decides |
| D9 | tab hidden | switch tab and back | context suspends and resumes, no burst of queued sound |
| D10 | listening | headphones, listening part B again with the mixer in the path | levels as in B13; the owner's judgement; **no claim about sound quality is made by the node tests** |
| D11 | camera yaw and Doppler | turn the camera in place; fly at 30 m/s past a battery | a source ahead is centred and one to the camera's right is on the right; pitch shifts while flying |
