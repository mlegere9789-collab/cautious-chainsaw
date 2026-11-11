# AUDIO3D: the spatial battle-sound engine (Battle Theatre figures round, part AUDIO)

Written 2026-10-31. Code `app/src/audio3d/`, data `app/data/audio3d/`, tests `app/tests/audio3d.test.mjs` (37 node tests, 2 s), data tool `app/tools/build-audio3d-data.mjs`. Reference plan: `audio/PLAN.md`; event interface: `docs/BT-EVENTS.md`.
No browser, no GPU, no site build was run (the Release 1 timing passes were measuring the machine). Nothing here has been heard by anyone: this session cannot audition audio. Every claim below is either a node test result, a number from a file, or marked ASSUMED / not done. The browser and listening checks are in `BROWSER-VERIFICATION-LIST-AUDIO.md`.

## 1. What exists

| file | what it does | node-tested |
|---|---|---|
| `physics.mjs` | c(T), ISO 9613-1 absorption, ISO 9613-2 ground effect, spreading, exact moving-air travel time, Doppler, Woodworth ITD, ILD, source levels and band spectra (ASSUMED), per-band losses to one gain plus a 1- or 2-stage biquad low-pass fit | yes, equal to `audio/model/acoustics.mjs` (drift test) |
| `terrain.mjs` | heightfield hooks: line of sight, ISO 9613-2 single-edge diffraction (acoustic shadow behind a ridge), echo taps from ridges (specular and diffuse), woods mask hook | yes (synthetic ridges; real DEM smoke) |
| `planner.mjs` | event -> voice plan (arrival time, level, filter, direction, Doppler, echoes, reverb send, priority); shell flights as moving sources; **the voice-budget mixer** (priority, protection, steal, fold into a statistical bed) | yes |
| `atmosphere.mjs` | environment layer -> atmosphere (documented temperature, inferred humidity, wind) and ambient state (insects, birds, rain, wind, thunder claps) | yes |
| `far.mjs` | far-field audibility (the documented hearing reports as expectations), scenarios (shadow zone, downwind duct), constant-drag shell-versus-report crossing, drag trajectories | yes |
| `synth-arms.mjs`, `synth-voice.mjs`, `synth-music.mjs`, `synth-ambient.mjs`, `dsp.mjs` | the procedural synthesis: reports, cannon, shell flight, bursts, impacts, handling, formant voices, crowd shouts, horses, hooves, wheels, feet, bugle, drum, insects, birds, rain, thunder, wind; FFT and measurement tools | yes (finite, deterministic, spectra vs real recordings) |
| `catalog.mjs` | 46 sound ids, weapon -> sound map (all of `kit/weapons.json` small arms and the 13 artillery pieces), provenance families | yes |
| `provenance.mjs` | provenance kinds, **the single DEC-001 flag**, panel builder, credits | yes |
| `bank.mjs`, `loader.mjs` | sample bank (synthesis or registered recording slices), onset slicer, browser recording loader | yes (loader's decode path is browser only) |
| `webaudio.mjs` | the Web Audio graph (HRTF panner tier, stereo panner tier, biquad stages, echo taps, convolution reverb, beds, limiter, clock anchoring, output-latency compensation, flush) | against a **mock** context only |
| `offline.mjs` | stereo offline renderer with the same parameters, for measurements | yes |
| `bus-adapter.mjs`, `index.mjs` | subscribes to the animation bus (`fire`, `reload`, `command`, `unit_march`, `fall`), public API (`createAudio3D`, `onFire`, `onEvent`, `update`, `pump`, `panel`, `badge`, `status`) | yes (fake bus with the BT-EVENTS signatures) |

Data: `sources.json` (ledger, 42 recordings after round 3, 8 blocked or rejected leads and 1 closed), `commands.json`, `calls.json`, `documented-reports.json`, `weapons-sound-map.json` and `measurements.json` (generated), `gaps.json` (13 gaps in register layout).

## 2. DEC-001: provenance and the marking flag (not silently picked)

* Every sound id belongs to a provenance **family** (`catalog.mjs FAMILIES`, 12 rows). A family's kind at run time is decided by what is **loaded**: `real_exact` (none exists), `real_type` (a real recording of the right type of weapon or call), `real_standin` (related real recording), `reconstruction` (table-driven), `synthesized`. The default build loads no recording, so every family reads `synthesized` and the panel says so; calling `audio.setRecordings(map)` (what `loader.loadRecordings` returns) raises the families whose recordings are really present. Tested.
* **One flag**: `provenance.mjs AUDIO_CONFIG.labelMode`, default **`'pdf'`** (the PDF's rule, S.1/Q23/C.10: audio is labelled "modern reconstruction", pure synthesis "Synthesized black-powder audio: modern reconstruction"): a persistent audio badge and a tag on each sound. `'panel-only'` is the owner's chat wish (no label on the sound). In **both** modes `audio.panel()` returns the same rows: family, kind, tier, recordings with licence and ledger id, the gap, the credits, and a fixed disclosure line ("No recording of the 1863 battle exists..."). A test asserts the panel is identical in both modes except the on-sound marks. DEC-001 stays OPEN in the decision log; the default is the PDF's until the owner decides. A viewer can preview the other mode with `?audioLabel=panel-only` (the panel then says "preview override").
* CC BY items need credit lines: `creditLines()` lists them for recordings actually loaded (FS-162628 and FS-18229 are CC BY 4.0). CC BY-SA, NC and ND recordings have `shippable: false` and are never loaded.

## 3. The physics (all in `physics.mjs`; values from `audio/PLAN.md` section 4)

| item | model | tier |
|---|---|---|
| delay | exact moving-air travel time (uniform wind; reduces to `d / c`); `c = 331.3 sqrt(1 + T/273.15)` from the **documented** temperature (Jacobs readings via `Environment.weatherAt().tempF`; 79 F gives 346.4 m/s); with time warp `c * k` | documented input, physics exact |
| spreading | `-20 log10 d` (tests: 6.02 dB per doubling; the planner level equals the analytic chain) | physics |
| air absorption | ISO 9613-1 per octave band at the atmosphere's T, RH, pressure (99.3 kPa from 170 m); test: the standard table values to 3 percent | physics; RH 60 to 85 percent **inferred**, pressure computed |
| ground effect | ISO 9613-2 Table 3, grass G = 1, faded out as the camera rises (zero at 40 m) | physics; G assumed |
| diffraction | ISO 9613-2 single edge (double cap 25 dB) over the DEM profile, applied only when the line of sight is blocked | inferred (modern DEM) |
| directivity | `1 + 0.35 cos` lobe | ASSUMED |
| source levels | 152 dB musket, 150 smoothbore, 176 Napoleon and 3-inch, 180 20-pdr Parrott, ... (dB peak at 1 m) | ASSUMED (PLAN 4.6) |
| spectra | 16 octave-band families used only to weight the band losses | ASSUMED |
| binaural | HRTF `PannerNode` for the near/loud tier; for the rest ITD (Woodworth, 0.66 ms max, tested 25 to 36 samples at 44.1 kHz) and a 8 dB maximum ILD | browser HRTF generic; ILD ASSUMED |
| Doppler | `(c + vl) / (c - vs)` for a moving camera and moving sources (cavalry, units); a camera at 30 m/s gives +8.7 percent | physics |

Filter fit: each voice gets one gain and one biquad low-pass (1 or 2 stages). Worst weighted RMS fit error in the measured table is 8 dB, for a 12-pounder at 1 km where the ground effect carves a mid-band dip that a low-pass cannot follow (PLAN 4.2 says the same); for air alone the error is 0.4 dB at 100 m and 2 to 3.5 dB at 1 to 3 km.

### Weather feeding the engine
`atmosphere.mjs`: temperature documented (interpolated between 07:00, 14:00, 21:00 readings; where the record has none the engine uses 20 C and says "default"), humidity inferred (cosine between 85 percent at dawn and 60 percent mid-afternoon), wind direction S to SSW documented with the midpoint inferred and the speed taken from the chosen scenario (CF-WIND-SPEED), no vertical profile (open gap). Rain from `precip`, thunder claps only inside a storm minute (the documented 18:00 storm of 3 July), insects only when the sun band is 2 to 4, no rain and warm air (chirp rate by Dolbear's law, inferred), birds near dawn and dusk. All ambient beds are marked plausible-procedural; woods without events produce no shot sounds (tested).

## 4. The weapon-sound map (`weapons-sound-map.json`, generated)

* Small arms: 6 sound classes (rifle-musket, smoothbore and buck and ball, carbine, breechloader, repeater, revolver), every long arm, carbine, repeater and handgun of `kit/weapons.json` maps to one (58 rows); edged weapons, bayonets and the barred M1863 have no report. Cap snap a few ms before the report (hangfire jitter), thump, body, crack, tail.
* **Four sounds per artillery round** (PLAN 3.2): report (`gun.*`, six gun classes from the kit's 13 pieces), flight (`flight.smoothbore` rush; `flight.rifled` rush plus a spin whine, a moving-source voice along the animation's trajectory via `planShell`), burst (`burst.*` by projectile: common shell, spherical case, canister, caisson), impact (`impact.*` by surface: earth, wood, stone, iron, water, man, horse, air). The engine needs the ballistic code to emit `shell` and `impact` events (`onEvent`, `planShell`); the animation bus does not carry them yet (hook, not wired).
* Shot versus report: constant-drag arithmetic of `audio/model/numbers.mjs`: the report overtakes a Napoleon round shot between 525 and 940 m, a 3-inch shell between 425 and 705 m; closer than that the shell is heard before the gun (tested; `planShell().shotBeforeReport`).
* Handling (loading drill, from BT-EVENTS `reload`): tear, rammer ring, ram, cap; levels ASSUMED so they fall under the ambient floor at about 30 m; only figures within 60 m of the camera are even planned.
* Volleys: the engine plays whatever times the animation emits, so volley by file, by rank, by company and at-will crackle are the animation's fire plan. The sound of a volley's first shot is the command voice (below) before it.
* Rates of fire are not mine: BT-EVENTS carries `cycleS` ranges; PLAN 6.1 warned that the old prototype fired 3 to 5 times too fast.

### Commands (documented words only), calls, drums
* `commands.json`: 29 distinct words (30 entries: "front" is cited for both infantry and artillery) and 8 phrases ("Fire by squad. Squad. Ready. Aim. Fire. Load.", "Commence firing", "Cease firing", "Fix bayonet", "Charge bayonet", artillery "Load", "Ready, Fire"). Each word cites drill items (`HAR-S29`, `HAR-C03`, `ART-FA-12/13/17`, ...); a test checks the item exists and contains the word and that every phrase word is in the table. The voice is a formant synthesizer (vowel formants are textbook averages, the builder's constants); free speech such as "Steady, men" is **never voiced** (no documented words). Tier: words documented, voice and cadence plausible-procedural, marked reconstruction.
* `calls.json`: the **names and order** of Casey's 26 general bugle calls and 23 skirmisher calls, from the drill extraction (Hardee 1861 lists 25 general and 23 skirmisher calls, 24 and 20 legible in the OCR; "signal of execution" is Casey only; call 5 of the skirmisher list is "The run" in Casey), plus Casey's 15 general drum beats by name. The **notation is not transcribed** (open gap AUD-G02): I tried the archive.org page images; the call pages sit behind 32 interleaved plates (leaf = printed page + 59 only up to the plates), and the bounded attempt found a blank leaf and Plate 32. So the procedural bugle (`synth-music.mjs bugleCall`, natural harmonic series 3 4 5 6 8 over C2) plays nothing until a note table exists; where a modern public-domain recording of the call of the same name is loaded (15 of the 26 have one, matched by exact name only: attention, assembly, to the color, recall, reveille, retreat, tattoo, officers' call, breakfast and dinner via Mess Call, sick, plus fatigue, church, drill and school added in round 3; First Call, To Arms, Fire Call and the Marine "Double Time" are ledgered but mapped to no manual call because their names are not in Casey's list as read), it plays as a `real_standin`, never as "the 1863 call". Taps (Butterfield, July 1862) has two PD recordings. The Internet Archive "Civil War Bugle Calls" by J. Villanueva lists the calls in the same order but carries no licence: not used.
* Drum: a sustained rudimental roll stands in for the long roll (inferred); named beats are not rendered.

## 5. Terrain: shadow and echoes

* Shadow: the profile between source and camera over `T.h(x, z)` (the DEM, 4 m grid); when the line of sight is blocked, ISO single-edge diffraction replaces the ground effect. A 100 m ridge at mid-path costs about 17 dB for a musket at 1.2 km (test); with the ISO meteorological correction the effect of a low ridge at long range is small (a 40 m ridge at 1.2 km is about the same as the ground effect it replaces). On the real DEM, in a 4,000-event random scatter 150 to 2,650 m around the origin, 72 percent of the paths were shadowed and 82 percent carried at least one ridge tap (measured while timing the planner; the DEM is modern bare earth, so the only claim is that the planner runs and the hooks fire).
* Echoes: rays from the source find the first slope that rises 6 m above the ray; the surface normal comes from the gradient; steep faces give a specular tap, rough slopes a weaker diffuse tap (reflectivity 0.35 ASSUMED). Cached by 40 m cells. The plan's 7 to 9 s ridge-to-ridge echo is a geometric inference, not an account.
* **Accounts of echoes (documented, secondary)**, `documented-reports.json`: the 3 July cannonade heard at East Cavalry Field "volleyed and rolled across the intervening hills" (Kidd's address, MI-GB-1889 OCR line 7359); at Culp's Hill "the echoing of the woods increased the appalling roar" (NY-GB-1900 line 4294; also "For seven hours the woods echoed with the crashing musketry", 78th NY). Longstreet's "echo from the Federal side" (BL-3 line 27373) is figurative (answering fire) and is **not** used. No account gives a delay or distance. The woods mask now exists (round 2, `woods.mjs`, `data/audio3d/woods-mask.json`, 276 polygons from the repository 1863 woods layer, a reconstruction from the Warren survey of 1868-69, positional error 30 to 40 m, timber cut in July 1863 unknown). It drives a reverb-send boost only (`woodsReverbBoost` 0.15 at full weight, magnitude ASSUMED, plausible-procedural; source in woods 0.5, listener in woods 0.25, share of the path in woods 0.5, capped at 1); no foliage attenuation is modelled because no source for a number was checked. Planned voices carry `woods` ({fraction, weight, reverbAdd, applied, tier}). `createAudio3D({ woods: false })` switches it off. AUD-G08 stays open for delays and the missing attenuation.
* Reverb: shared convolution reverb (procedural impulse response, RT60 2.4 s ASSUMED) with a send that grows with distance.

## 6. The voice budget (priority mixer) and the honest UI line

`planner.allocate`: voices sorted by arrival (ties by id: deterministic); each lives its sample length (3.2 s guns, 1.2 s shots); at most `maxVoices` (default 160) alive; when full, the lowest-score unprotected voice is stolen or the newcomer folded; **protected** = within 150 m of the camera or among the 20 loudest per 100 ms; the HRTF tier is the first 40 near voices. Folded power is summed per 100 ms into a statistical bed (band-limited noise, direction = power-weighted azimuth, tested: bed power equals folded power) so the level of the battle does not drop. `status().text` says exactly what happened: "Sounding N shots individually; M quieter or farther shots are folded into the crowd of sound (voice budget B)." or "Sounding all N shots individually". A smaller budget folds more (tested). The mixer-bench AudioWorklet (`audio/mixer-bench`, 1,700 voices measured in Chrome 155) is the high-count path if the Web Audio graph proves too heavy; its event row maps from the plan.
Planner cost, node on this machine (below normal priority): 4,000 events plus allocation in 63 ms without terrain (0.016 ms per event), 726 ms with the DEM for scattered random positions (0.18 ms per event; battle lines cluster in the 40 m caches). The real peak is 371 shots per second (PLAN 6.1).

## 7. Heard far away (PLAN 4.8): the documented reports as test expectations

| id | documented | model (homogeneous air, upper bound) | result |
|---|---|---|---|
| DR-HEAR-ROD-4MI, DR-HEAR-OR-4MI-B | Official Records: cannonade heard within 4 miles of Gettysburg on 1 July (OCR lines cited, quotes checked by a test) | 1 gun: 97.7 dB peak, margin 59.7 dB over a 38 dB day floor; delay 18.7 s | consistent |
| DR-HEAR-HARRISBURG | 35 to 40 miles, secondary and weak | 150 guns: 94.5 dB, margin 64.5, only a low rumble left (low-pass 180 Hz) | consistent, **cannot discriminate** |
| DR-HEAR-PITTSBURGH | about 150 miles, contested date | margin +36.7 dB | not excluded; the model ignores turbulence and ground excess so it over-predicts range: neither confirms nor refutes |
| DR-NOHEAR-EWELL | Ewell's party did not hear Longstreet's signal on 2 July (weak) | audible at any plausible distance | **model mismatch, recorded**; only the `shadow_zone` scenario (extra 25 dB) moves toward it; no default is bent |
| DR-DELAY-1500M | 1.5 km at 343 m/s is about 4.4 s (PDF C.6) | 4.37 s at 20 C | pass |

## 8. Gain staging (unlistened)

Digital full scale is 140 dB peak SPL (ASSUMED). Planner gain = `10^((level - 140 + trim)/20)` with `trim = +22 dB` (ASSUMED so a musket at 100 m has a peak near 0.2 and a 12-pounder at 100 m exceeds 1), then a `DynamicsCompressorNode` as limiter (threshold -10 dB, ratio 12, 3 ms attack). PLAN 4.9 found dense mixes passing full scale before the old limiter; the limiter decides the level of dense passages here too. A look-ahead limiter or loudness model and a listening calibration are open (AUD-G09). Reference chain table: `measurements.json propagationChain` (delay, level, low-pass, gain per distance for a musket, a Napoleon and a 3-inch rifle).

## 9. Real recordings: search results (round 2, 2026-10-31)

Ledger `audio/pilot2/LEDGER2.csv` (+ the 22 of round 1 in `audio/pilot/LEDGER.csv`), all sha256 re-verified. New: 11 US Army Bands bugle calls and one USMA cannon-salute item, all "Public domain" on Wikimedia Commons (Assembly, Attention, Recall, Retreat, Reveille, Tattoo, Taps, To the Color, Officers' Call, Mess Call, Sick Call; `01 Salute Cannon Reveille`, author "Unknown": authorship unverified, audition and clearance open). Round 3 (2026-11-04): the eight Commons calls that Wikimedia had refused (HTTP 429) are all on disk: six were fetched later on 2026-10-31 but never ledgered; Fatigue Call and Church Call were fetched on 2026-11-04 at 60 s spacing; sha1 equals the Commons value for all eight and the Commons API re-read gives "Public domain", Copyrighted False (ids WC-DRILLCALL, WC-SCHOOLCALL, WC-FATIGUECALL, WC-CHURCHCALL, WC-FIRSTCALL, WC-TOARMS, WC-FIRECALL, WC-DOUBLETIME; AUD-G11 closed). Not used or blocked: Freesound originals (login), the unlicensed Villanueva calls, NPS "Musket Fire" (no licence text), NCpedia (CC BY-ND), Commons thunder and Sexton gun (CC BY-SA), Internet Archive search (radio and podcasts), LoC (oral histories). No new recording of a period weapon exists in any open source reachable; the per-weapon gap stands (AUD-G01).

## 10. Objective measurements standing in for listening

`measurements.json` (generated): per sound, the same measure used on the real recordings (power-weighted centroid and 95 percent roll-off of the loudest 0.4 s, octave bands). Selected (Hz): rifle-musket 1343 / 5028 against the real musket recordings 854 to 2889 / 2121 to 11871; Napoleon 522 / 2476 against the real cannon recordings 158 to 809 / 820 to 3129 (and deeper than the 3-inch rifle at 694 / 3499, the plan's distinction); smoothbore 931 deeper than carbine 2421; rebel yell 2267 above cheer 1691; shell burst and impacts are low (100 to 500 Hz) by design. These show the synthesis is **in the range of real recordings of the same class**, not that it sounds right.

## 11. ASSUMED values and gaps

ASSUMED: source peak levels, spectra, directivity, ILD, ground porosity, RT60, echo reflectivity, handling levels, ambient bed levels, trim, budget sizes, the shape parameters of every synthesized sound. Gaps: `app/data/audio3d/gaps.json` (AUD-G01 to G13; the register md files are regenerated by `tools/bt/seed_register.py` which deletes them, so the entries are in the register layout there for the register's owner). Decision log: DEC-AUDIO-01.

## 12. Integration notes (not wired: another part owns `main.mjs` and the renderer)

```js
import { createAudio3D, attachAudio } from './audio3d/index.mjs';
const audio = await createAudio3D({ ctx, T, search: location.search });   // T = loadTerrain result (T.h, T.W, T.H)
const bind = attachAudio(audio, anim.bus);                                 // BT-EVENTS bus
// each frame: audio.update({ battleNow: t, warp, listener: { pos, vel, yaw, hAbove }, weather: env.weatherAt(min, choices), sun: env.sample(min), min });
//             audio.pump(30);  // plans and schedules events whose time is within 30 s
// on seek: audio.flush(); then re-emit the events of [t - 12 s, t + lookahead] (FIRE_EVENT.md 'Seeking')
// UI: audio.panel() for the 'What you are seeing' drawer; audio.badge() (null in panel-only mode); audio.status().text for the voice line.
```
Frame: x east, y up, z **south** (`geo.mjs`); `audio/contract/FIRE_EVENT.md` says z north, the app is authoritative. The existing leak tests count AudioContexts (`tests/lib.mjs INSTRUMENT`): the engine creates exactly one context and must be closed with `engine.dispose()` on teardown. An AudioContext starts only after a user gesture (`engine.resume()`).

## 13. Host module and a latent double time-warp (2026-11-11)
`src/audio-host.mjs` (docs/AUDIO-HOST-CONTRACT.md) now drives this engine. Finding: `index.update({ warp })` builds the atmosphere with `timeWarp: warp` (planner delay `d / (c k)`) and then `engine.anchor(battleNow, warp)` divides by `k` again, so at speed k the wall delay would be `d / (c k^2)`. audio3d is unchanged; the host calls `update` with warp 1 and anchors the engine with the real speed itself (tested: 2 km at 8x is `5.8 s / 8` of wall time). The test A9 of the verification list stays valid. The owner of audio3d may fix `update` instead.
