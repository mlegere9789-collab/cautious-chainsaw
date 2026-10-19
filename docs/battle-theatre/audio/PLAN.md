# Battle Theatre sound: sources, weapon-sound map, physics model, mixer benchmark

Part F, task "audio". 2026-10-19. Owner folder: `docs/battle-theatre/audio/`. No product code was changed. Every number below comes from a command that was run (the file that holds it is named) or from a page that was read (the page is named). Where something was not done, section 9 says so.

## 0. What is achieved and what is not

The owner's requirement: every soldier's shot is sounded individually with the accurate sound of that weapon, and the overlap of thousands of shots makes the battle's real noise.

**Achieved (built and measured).**

1. **The mixer can sound every shot.** A plain-JavaScript AudioWorklet mixer plays one voice per shot: sample-accurate start at the retarded time `t + d/c`, 1/r distance gain, muzzle directivity, an air-absorption low-pass fitted to ISO 9613-1, the ISO 9613-2 ground effect, interaural time and level difference with head shadow, Doppler for a moving listener, wind, a shared reverb (feedback delay network plus three long echo taps), and voice stealing only when the pool is exhausted. In Chrome 155 on this machine at 48 kHz, on the real output device, it sounded **4,000 shots per second at full quality with no dropout (1,700 concurrent voices, two 30 s runs)** and **6,400 shots per second in the lite tier (2,686 concurrent voices; one of two runs clean, the other had one 10 ms underrun)**; nothing was stolen, dropped or late in any run up to the failure point (section 6.2). The densest realistic moments need far less: about 371 shots/s for the Day 3 assault at the Angle, 500 for the "owner worst case", 1,667 for a Day 2 ceiling (section 6.1). The headroom is 2.4 times over the ceiling and 10.8 times over the Angle peak.
2. **The acoustics are numbers, not adjectives** (section 4): speed of sound and delays, spreading, ISO 9613-1 air absorption (my implementation reproduces the standard's table values I recall to within 1.3 percent), ISO 9613-2 ground effect, wind, Doppler, the shot-versus-report crossing for a shell. Nine physics unit tests of the mixer pass (`mixer-bench/results/physics-tests.json`): arrival to within 0.5 sample, the 1/r law to 0.01 dB, the fitted 4 kHz absorption, the 32-sample interaural delay, the Doppler pitch, voice stealing counted.
3. **A licensed pilot set of 22 recordings** with a ledger (`pilot/LEDGER.csv`: source URL, licence, attribution, how recorded, measured format, SHA-256).
4. **A data contract** between the animation and the mixer (`contract/FIRE_EVENT.md`, `contract/weapons.json`), including how the flash-to-sound delay, output latency, time warp and seeking are handled.
5. **A psychoacoustic boundary with numbers** (section 6.3) and an effort and cost estimate (section 8).

**Not achieved (said plainly).**

1. **The accurate sound of each weapon does not exist as a free recording.** The pilot has no identified recording of a Springfield, an Enfield, a smoothbore with buck and ball, a Sharps, a Spencer, a Henry, a cap-and-ball revolver, a Napoleon, a 3-inch rifle, a Parrott, a Whitworth, a Blakely or a howitzer. It has 5 generic musket recordings and 3 cannon recordings (one of them a real Civil War reenactment cannon) used as **stand-ins**, and the bench maps all 18 weapon ids onto those two banks. So the mixer is proven; the sample library behind it is not period-accurate per weapon, and until it is, "the accurate sound of that weapon" is a design, not a fact. Section 2.3 gives the way to get it (a commissioned reenactor recording session, about $12,000 to $20,000).
2. **Nobody has listened.** This session cannot audition audio. The levels, reverb, echo taps and balance are unevaluated by ear, and the dense scenarios exceed full scale before the limiter (section 6.2), so the master dynamics need a proper design and a listening pass.
3. **Shells in flight (moving sources), the statistical far layer, a WASM tier, terrain-derived echoes, wind and temperature gradients (refraction, acoustic shadow) are designed but not built.**
4. **The "heard 100 miles away" claim is not established** (section 4.8), and the model cannot reproduce it.

## 1. Method and where things are

| what | where |
|---|---|
| this plan | `PLAN.md` |
| pilot recordings (22 files, 15 MB) and ledger | `pilot/`, `pilot/LEDGER.csv`, `pilot/MEASURED.json` |
| physics model (functions, tables) and checks | `model/acoustics.mjs`, `model/check.mjs`, `model/numbers.mjs` |
| the mixer | `mixer-bench/mixer-processor.js` (AudioWorklet), `engine.mjs`, `scenarios.mjs`, `bench.mjs`, `tests.mjs`, `index.html` |
| drivers (Chrome through the DevTools protocol, below-normal priority, port base 10780) | `mixer-bench/tools/*.mjs` |
| results | `mixer-bench/results/*.json` |
| contract | `contract/FIRE_EVENT.md`, `contract/weapons.json` |

To rerun: `node mixer-bench/tools/run-tests.mjs`, `node mixer-bench/tools/run-bench.mjs sweep|scenarios|realtime|device|knee|knee2`, `node mixer-bench/tools/masking.mjs`, `node mixer-bench/tools/summarize.mjs` (prints every table in this file). To listen: serve `docs/battle-theatre/audio` (`node mixer-bench/tools/serve.mjs`) and open `/mixer-bench/index.html`.

Network behaviour, for the record: read-only, one request per several seconds, a descriptive user agent. Freesound's `robots.txt` disallows `/search/` and `/api/`; **one Freesound search page was fetched by the web-fetch tool before I had read that file**, I stopped as soon as I had and used only individual sound pages and web-search results afterwards. Wikimedia's API answered 429 (too many requests) once; I backed off to 6 s and then 60 s spacing. Library of Congress `robots.txt` was read before its JSON search. Freesound's lossless originals need a login and were **not** fetched; the pilot files are the site's public "HQ preview" MP3s (128 kbps), which the measured container headers confirm (`pilot/MEASURED.json`).

## 2. Sources

### 2.1 What was found and what it is worth

Full per-file detail is in `pilot/LEDGER.csv`. Summary by what the recording is:

| recording | licence | recorded how (as stated) | usable? |
|---|---|---|---|
| Civil War reenactment, Oregon 2012, black powder rifles and cannon, 4.5 min, Tascam DR-08, 15 ft to a football field from the action (Freesound 162628, richardemoore) | CC BY 4.0, attribution required | handheld, 128 kbps preview here | best close battle reference; density, fire-by-rank rhythm, cannon |
| Civil War reenactment ca. 1991 Portland OR, distant, DAT, gunfire, cannon, yelling, natural reverb (Freesound 442293, electra) | CC0 | DAT, 90 s | distant battle texture and tail |
| Civil War reenactment cannon, single shot, 2.5 s (Freesound 125348, adeluc4) and battle noise (125346) | CC0 | not stated | the only real reenactment cannon shot in the set; gun type unknown |
| Old musket bangs, France 2009, Schoeps in ORTF, Sound Devices 744T, 48 kHz 16 bit original (Freesound 538795, bruno.auzet) | CC0 | mics next to the musket, mountain reverberation | best-documented musket recording; not a US .58 |
| Four more musket recordings (234869, 347647, 662875, 675623) | CC0 | little or nothing stated | generic stand-ins; 675623 is a vintage film transfer, noise floor -28 dBFS |
| Artillery compilations (182822, 187767, qubodup) | CC0 (extracted from US-government videos) | guns unknown, some modern | stand-in only |
| Civil War reenactment battle video audio, two clips (Commons, Ixfd64) | CC BY-SA 3.0 (ShareAlike on derived audio) | the audio track in the file is 8 kHz mono Vorbis, about 17 kbps | reference only (telephone bandwidth) |
| US Army three-volley salute (Commons) | public domain (US government) | funeral, modern rifles, 22.05 kHz | how a trained volley synchronises; not period |
| Bugle calls: Assembly and Recall (US Marine Band, Commons), Taps (US Army Bands, Internet Archive) | public domain | soprano bugle in G per the Marine Corps manual; 44.1 kHz | pitch and timbre of a bugle; the 1863 Army calls may differ |
| Cavalry-charge bugle, fife and drum, two swords, horse neigh, cannon plus shell whistle (Freesound, various) | CC0, one CC BY | film transfers, reenactment, a voice recorder | illustrative; the shell whistle is film foley |

Measured quality of the pilot (`pilot/MEASURED.json`, FFT of the loudest 0.4 s of the decoded file): the musket and cannon files have a 95 percent spectral roll-off between 0.8 and 12 kHz and noise floors between -28 and -96 dBFS; nearly all are 128 kbps MP3, so the codec removes detail above about 16 kHz and smears transients. That is adequate for a prototype and not for the production library.

### 2.2 What was searched and not found (the negatives matter)

| place | result |
|---|---|
| Freesound (CC0 and CC BY) | no recording identified as a Springfield, Enfield, Lorenz, Sharps, Spencer, Henry, Burnside, cap-and-ball revolver, Napoleon, rifled field gun, Parrott, Whitworth, Blakely or howitzer of the period; a handful of generic "musket", "cannon" and reenactment clips; a Taps recording is CC BY-NC (rejected, non-commercial) |
| Wikimedia Commons | bugle calls (used); a 17th-century field gun (CC BY-SA 2.0 fr), the daily Fort Snelling cannon (CC BY 3.0, 79 MB video, not fetched) and "Cannon Fire 00" (CC BY 3.0) are leads for stand-ins; no 1860s weapon audio |
| Internet Archive | the Army Taps item (used); 78 rpm "GUN SHOTS" and "artillery" sound-effect records of unclear rights (not used); no free Civil War weapon recordings found |
| Library of Congress (JSON search for audio) | oral-history interviews only; nothing usable |
| National Park Service Sound Gallery | one "Musket Fire" item (Minute Man NHP, a drill command and volley); the page offers a transcript and no direct file I could find, and states credit "NPS" with no licence text; not fetched. NPS content is often public domain, but "often" is not a licence; ask the park |
| NCpedia "Firing a Musket" Civil War reenactment video | CC BY-ND (as stated in the search result; the page was not opened): no remixing allowed, so it cannot be cut into a sample bank (rejected) |
| Academic gunshot datasets (Zenodo, Mendeley, arXiv: Florida Tech multi-firearm set, C3GD with 28 firearms, Belize AudioMoth gunshots, SESA) | modern firearms recorded for detection and forensics; none historical or black powder |
| Smithsonian | Folkways releases are commercial; no open-access weapon audio found |
| BBC / other archives | the BBC sound-effects archive is licensed for non-commercial use (from general knowledge; not re-checked) |
| 1938 Gettysburg 75th reunion newsreels with Confederate veterans giving the rebel yell | exist (the Wikipedia "Rebel yell" article links two); rights not checked; **a lead, not a source** |
| Commercial libraries | Sound Ideas "Black Powder Weapons by Sounding Sweet", 855 WAV, 96 kHz 24 bit, $349 USD, "royalty-free" (page read; does not name the weapons or the era); BOOM "Historical Firearms", 17 weapons (muzzle-loaders, muskets, carbines, pistols, cannon, breechloaders), 192 kHz 24 bit, price not on the page I read, "commercial customers only". **Not purchased** (purchases are outside this task). Whether their licences allow serving the files from a public website was not on the pages; a written licence is needed before any use |

### 2.3 The honest options for the gaps, and the plan

* **A. Commission a recording session with reenactors** (the only route to the accurate sound of each weapon). Planning estimate, not a quote: 2 days with an engineer and an assistant ($2,400 plus a prep day $600), rented recorder, 8 to 10 microphones including high-SPL types ($1,000), crews (an infantry company with Springfield, Enfield and smoothbore loads, a battery with a Napoleon, a 3-inch rifle, a Parrott and a howitzer, cavalry with carbines and revolvers, a bugler and a fife and drum: $3,000 to $5,000 in stipends or donations), a private range or a National Park Service permit ($0 to $1,500), travel and insurance ($1,500 to $3,000), then cataloguing and editing 60 to 100 hours ($3,600 to $6,000). **About $12,000 to $20,000 and three to four weeks elapsed.** Capture list: 20 takes per weapon and load at 10, 25, 50, 100, 250, 500 and 1,000 m with synchronised microphones; a chronograph on the rifle-musket (section 3 explains why); volleys by rank, file and company; rolling fire; loading and handling sounds; shouted commands; impacts of balls and bullets on earth, wood, stone and a side of meat; hearing protection and standoff distances for 150 to 180 dB peaks.
* **B. Buy a commercial library** ($349 for the Sound Ideas one). Fast and good for texture; weapon identity and the web-delivery licence unconfirmed; cannot by itself give "the accurate sound of that weapon".
* **C. Procedural layering from related real recordings, clearly labelled.** Pitch, filter and layer the real musket and cannon recordings per weapon class (charge size sets pitch and weight; bore sets the crack). Always labelled "synthesised from related recordings" in the product. This is what the bench does today.

**Plan: A is the answer; C ships in the meantime with the label; B only after a written licence.** Until A is done, the page must not claim per-weapon accuracy.

## 3. The weapon-sound map

"Basis" says how I know: **page** = read on 2026-10-19 (named); **general** = standard background that I have not re-verified in this session, to be sourced from named memoirs and ordnance tables in the next pass. "What makes it distinct" is what the sample library must preserve.

### 3.1 Small arms

| weapon | facts | what makes the sound distinct | basis |
|---|---|---|---|
| Springfield M1861/M1863 rifle-musket, .58 | 2 to 3 aimed rounds per minute; 1,000 to 1,400 ft/s given on the page, the usual ordnance figure being about 950 ft/s | percussion cap snap a few milliseconds before a heavy, low-mid muzzle report; long smoky tail; **whether the bullet cracks depends on the unresolved velocity** (sound speed is 1,125 ft/s: at 950 the bullet is subsonic and there is no crack; at 1,200 it is not). The Minie bullet's passing hum and the "thud" on a hit are separate sounds. A chronograph in section 2.3 settles it | page (rate, caliber, velocity range); general (cap, hum) |
| Enfield P1853, .577 | similar load | report almost indistinguishable from the Springfield at the loudness variation of hand-loaded black powder; model as the same bank with a small pitch and level offset, not a separate library | general |
| Austrian Lorenz, .54 | similar | as above | general |
| M1842 smoothbore, .69, ball or buck and ball (one ball and three buckshot) | heavier charge | deeper, louder report, bigger flash and cloud; at short range the buckshot adds a scatter of lighter impacts | general |
| Sharps carbine/rifle, Burnside carbine | breechloaders, paper or metallic cartridge | sharper, smaller report; breech gas leak; lever and block click; faster reloading cadence (no ramrod) | general |
| Spencer, Henry | repeaters (Spencer in a few cavalry units; Henry a handful privately bought) | rapid successive sharp reports at 7 to 16 per magazine; lighter charges | general |
| Colt Army 1860, Navy 1851, Remington 1858 | cap-and-ball revolvers | small reports in quick chains; cap snaps; chain-fires | general |
| Sabres, bayonets | clash, scrape, thrust | ring of steel on steel (sabres at East Cavalry Field), the click-scrape of fixing a bayonet; thrust and impact on a body are close-range only | general |
| handling | ramrod ring, hammer click, cartridge tear, cap snap | audible only within about 20 to 30 m; mixed by the same events at low priority | general |

### 3.2 Artillery (four distinct sounds per round)

| gun | data | discharge | shell in flight | arrival |
|---|---|---|---|---|
| 12-pounder Napoleon (smoothbore bronze) | 4.62 in, 2.5 lb charge, 12.25 lb shot, 1,485 ft/s (453 m/s, supersonic at the muzzle), 1 round/min, 9 crew; spherical case releases 78 balls; canister 27 balls, effective to 350 yd | the deepest, heaviest report of the field guns (largest charge); strong low-frequency thump and blast felt as pressure | round shot and shell: a rush or whirr (no spin tone); supersonic near the gun | page (M1857 Napoleon) |
| 3-inch ordnance rifle (wrought iron) | 3.0 in, 1.0 lb charge, 9.5 lb shell, 1,215 ft/s (370 m/s), range 1,830 yd at 5 degrees | a sharper, higher, crisper crack from the smaller charge | the rifled shell's scream or tearing-silk rush (spin and driving band); page does not describe it | page (3-inch rifle); sound: general |
| 10-pounder Parrott | 2.9 or 3.0 in, 1.0 lb charge, 10 lb shell | as the 3-inch rifle | reported to scream (general; the page is silent on sound) | page (Parrott rifle: the page gives only the data and a poor reputation for safety, bursts in service) |
| 20-pounder Parrott | 3.67 in, 2.0 lb charge, 19 lb shell | heavier than the 10-pounder | louder scream | page (as above) |
| Whitworth, Blakely | a very few Confederate pieces; presence at Gettysburg not confirmed here | Whitworth bolts and shells are reported to shriek or whistle | | general; check the Official Records |
| 12-pounder howitzer; 24-pounder howitzer | shorter, lighter charge; high trajectory shell and canister | dull, lower report | slow lob: audible rise and fall | general |

Burst and impact sounds (all **general**, to be sourced):

* **Discharge to arrival** is a chain: muzzle blast at `t`, shell in flight, then impact or burst at `t + flight`. A solid shot strikes earth with a dull thud and a spray; ricochets bound; it splinters rail fences and wood; it cracks on stone (the Cemetery Ridge wall); it strikes men and horses with a wet slap. A common shell bursts with a dull "crump" and a fragment hum; **spherical case** bursts in the air with a sharp pop followed by a rush of bullets; **canister** leaves the muzzle as a spreading tearing hiss and rattles on a wall like hail (Cowan's battery fired double canister from five guns simultaneously, page: Pickett's Charge). A **caisson explosion** is one very loud thump with a column of smoke and debris; Union batteries lost caissons on 3 July (general; confirm).
* **Shell versus report.** With a constant-drag round-shot model (4.52 in, 12.25 lb, Cd 0.5 to 0.9) the shot and its report arrive together at about 0.5 to 0.9 km (`model/numbers.mjs`); closer than that the shot arrives first (the viewer hears the whirr before the bang), beyond it the report is first. For a 3-inch rifle shell (Cd 0.3 to 0.5) the crossing is at about 0.4 to 0.7 km. This is a back-of-envelope calculation, not a ballistic solution; the animation's ballistic code must supply the real flight times (contract, section 1).

### 3.3 Signals, voices, animals

| sound | what is documented | basis |
|---|---|---|
| bugle and trumpet calls | each company had two buglers (page: Bugle call); infantry marched to field music, drum and fife, buglers sounded the calls; cavalry sounded calls on the trumpet or bugle; Taps was composed by Butterfield in July 1862 to replace "Extinguish Lights" (general); the 1862 tactical manuals (Casey's infantry tactics; Butterfield's camp-duty manual; Cooke's cavalry tactics, 1861) list the calls, which are **to be transcribed from the primary text** (public-domain scans exist; not read in this session). Calls needed: Assembly, Reveille, Tattoo, Taps, Forward, Halt, Commence Firing, Cease Firing, Rally, Retreat, Charge (cavalry), Trot, Gallop, Recall | page (Bugle call); general |
| drum signals | the "Long Roll" to arms, Assembly, Reveille, Tattoo, drummer's call: rhythms to be transcribed from the manuals | general |
| shouted commands | "Ready, aim, fire", "load at will", "fix bayonets", "forward, double-quick", battery "Load, ready, fire", "limber to the rear": recorded in the session as takes in a period accent and cadence | general |
| rebel yell | high-pitched, shrill; variable by region and regiment; 1938 newsreel recordings of Confederate veterans exist, rendered as "wa-woo-woohoo"; contemporaries compared it to hunting calls; Union accounts mostly record its effect on them (page: Wikipedia, Rebel yell, citing Warren's *The Rebel Yell: A Cultural History* and Waite Rawls) | page |
| Union cheer | **no documented description found** in this session ("hurrah", three cheers; Fredericksburg shouted at the Angle is reported); source from regimental histories | general |
| horses and teams | whinny, snort, hoof beats at walk, trot, gallop (Farnsworth's charge, East Cavalry Field), harness jingle and iron-tyred wheel rattle of limbers and caissons on stony ground | general |
| the cannonade as a mass | 150 to 170 guns (page: Pickett's Charge; Eicher 159, Trudeau 164), beginning about 1 p.m. and lasting 1 to 2 hours; Union counter-battery with about 80 guns, slowed to save ammunition | page |

### 3.4 Coverage of the pilot against the map

| item | in the pilot | status |
|---|---|---|
| rifle-musket, smoothbore, carbines, repeaters, revolvers | generic muskets only | GAP |
| Napoleon / rifled guns / howitzers | one real reenactment cannon shot (type unknown), unknown-type artillery compilations | GAP |
| shell flight, impacts, bursts, canister, caisson | film foley whistle only | GAP |
| bugle, drum and fife | Marine/Army bugle calls (modern), reenactment fife and drum, cavalry-charge film bugle | partial |
| commands, rebel yell, cheer | only inside the reenactment battle beds | GAP |
| horses, sabres | a neigh; two swords | partial |

## 4. The acoustic model (with numbers)

Implemented in `model/acoustics.mjs` and in the mixer. "ASSUMED" marks a model parameter that is not a measurement.

### 4.1 Speed of sound and delay

`c = 331.3 * sqrt(1 + T/273.15)` m/s: 343.2 at 20 C, 346.1 at 25 C, 349.0 at 30 C. Accounts describe the days as hot (not verified here); the model default is 25 C (346.1 m/s); the bench tests used 343 for the arithmetic. Delay in seconds (`model/numbers.mjs`):

| distance | 343 m/s | 30 C |
|---|---|---|
| 100 m | 0.29 | 0.29 |
| 500 m | 1.46 | 1.43 |
| 1,000 m | 2.92 | 2.87 |
| 1,400 m (Seminary to Cemetery Ridge, roughly) | 4.08 | 4.01 |
| 2,000 m | **5.83** | 5.73 |
| 4,000 m | 11.66 | 11.46 |

The 5.8 s of the brief is correct at 343 m/s. The mixer starts each voice at the retarded time, to the sample (test: 5 distances from 3.4 m to 1,500 m, all within 0.46 sample). Wind adds to `c` along the path (test: a 5 m/s tail wind moves a 686 m arrival to `d/(c+5)` within one sample).

### 4.2 Spreading, air absorption, ground

* **Spreading:** `-20 log10(d / 1 m)` dB (6.02 dB per doubling; test: -6.01, -6.02, -6.02).
* **Atmospheric absorption**, ISO 9613-1, dB per km at 25 C, 60 percent RH: 125 Hz 0.3, 250 Hz 1.2, 500 Hz 3.2, 1 kHz 6.0, 2 kHz 10.2, 4 kHz 23.4, 8 kHz 74.4. At 2 km the 4 kHz band loses 47 dB to the air on top of 66 dB of spreading. Verification: my implementation gives, at 20 C and 70 percent, 0.1 0.3 1.1 2.8 5.0 9.0 23.1 77.6 for the octave bands 63 Hz to 8 kHz and, at 15 C and 20 percent, 0.3 0.6 1.2 2.7 8.2 28.3 89.4 203; these agree to within 1.3 percent with the ISO 9613-2 Table 2 values as I remember them (0.1 0.3 1.1 2.8 5.0 9.0 22.9 76.6 and 0.3 0.6 1.2 2.7 8.2 28.2 88.8 202). I did not have the paywalled standard open; treat that as a strong consistency check, not a certificate.
* **Realisation:** two cascaded one-pole low-passes whose coefficient is fitted per distance (10 m steps to 8 km) to minimise the dB error against the ISO curve from 250 Hz to 8 kHz (`fitAirLowpass`). Fit error (RMS dB): 0.05 at 100 m, 0.22 at 500 m, 0.62 at 1 km, 0.59 at 2 km, 0.51 at 3 km; at 4 kHz the fit is within 2 dB of ISO from 100 m to 1 km (the mixer test measures -22.47 dB extra between 100 and 1,000 m against -21.06 dB ISO) and falls short above 4 kHz at long range (the one-pole slope is shallower than the physical f-squared law), which affects only content already 40 dB down.
* **Ground effect**, ISO 9613-2 Table 3 for grass (G = 1), source 1.5 m, receiver 1.6 m: 125 Hz 1.5 to 10.6 dB, 250 Hz 12.0 to 13.9, 500 Hz 8.0 to 9.3, 1 kHz about 1.1, 2 kHz and above 0, for 100 to 3,000 m. A musket report concentrates its energy in 125 to 1,000 Hz (ASSUMED spectral weights 0.1, 0.2, 0.4, 0.3), so the mixer applies the weighted band loss as one broadband gain: -4.1 dB at 100 m and -5.3 dB at 1 km, faded out as the camera rises (zero by 40 m above ground). The mid-frequency dip itself is not shaped; that needs a per-voice filter and is a candidate refinement.
* **Directivity** (ASSUMED): level factor `1 + 0.35 cos(theta)` between the muzzle direction and the direction to the listener, so shots fired toward you are 2.6 dB louder than the average and those fired away 3.7 dB quieter. Real muzzle blast is more directional at high frequencies; to be measured in the recording session.

### 4.3 Binaural placement

Woodworth-style interaural time difference up to 0.66 ms (test: 31 samples = 0.646 ms for a source hard right), equal-power level difference, and a one-pole head-shadow low-pass on the far ear (coefficient 0.55 frontal to 0.15 lateral, roughly 4.5 kHz to 1.2 kHz at 48 kHz). This is a small spherical-head model, not measured HRTFs; front and back are not distinguished and elevation is ignored.

### 4.4 Reverberation and echo

A shared 8-line feedback delay network (delay lengths 22 to 52 ms, mutually prime; RT60 2.4 s, ASSUMED) gives the diffuse tail of woods and valley, and three long echo taps (0.42, 1.15 and 2.7 s, gains 0.20, 0.15, 0.09, ASSUMED) stand for slap-back from nearer woods and the ridges. **None of these is derived from the terrain yet.** The ground truth is geometry: Seminary and Cemetery Ridge are about 1.2 to 1.6 km apart (Pickett's men crossed "nearly three quarters of a mile", page: Pickett's Charge), so a reflection off the far ridge arrives 7 to 9 s behind the direct sound from a nearby shot; the DEM already in `render/prototype/data/` can supply the real delays. Reference recordings with real room tails are in the pilot (the electra clip is noted by its author as good for convolution).

### 4.5 Doppler

* **Moving listener (implemented, tested):** playback rate `1 + v_r/c`; a camera flying at 30 m/s toward a source raises pitch by 8.7 percent (144 cents), measured 1088 Hz against an expected 1087.5 Hz for a 1 kHz tone.
* **Moving source, the shell (designed, not built):** factor `c / (c - v cos)`; a shell at 300 m/s on a collision course would be heard 7.5 times too high on approach and 0.54 on recession, but real passes have a closest-approach distance that smooths this to a glide; the in-flight sound is a trajectory voice per shell (at most a few tens per second).

### 4.6 Source levels (ASSUMED, replace with measurements)

Peak at 1 m on axis, dB re 20 micropascals: rifle-musket 152, smoothbore 150, carbines 148, revolvers 146, 12-pounder howitzer 172, Parrott 10-pounder 174, Napoleon and 3-inch rifle 176, 20-pounder Parrott 180, 24-pounder howitzer 178 (`SOURCE_PEAK_DB_1M`). These are order-of-magnitude values from the hearing-conservation range for firearms; no black-powder primary source was found in this session. The only measured anchor seen is a University of Southampton paper (found as a search snippet, not read in full) giving 161 dB(C) at 0.3 m beside an SA80 rifle. Digital full scale is calibrated to 140 dB peak (ASSUMED); the resulting levels at the listener fall with distance: a rifle-musket is 112, 98 and 88 dB peak at 100, 500 and 1,500 m before air absorption, a Napoleon is 122, 112 and 106 dB at 500 m, 1.5 km and 3 km.

### 4.7 Weather

Uniform temperature and a uniform wind vector only. Real propagation over many kilometres is controlled by vertical gradients of wind and temperature (refraction), which can create audible zones and acoustic shadows. Shadows are documented in the Civil War (Iuka, where a north wind kept Grant from hearing the battle; Seven Pines, Gaines' Mill, Perryville, Five Forks: page: Acoustic shadow); the page does not mention Gettysburg.

### 4.8 The "heard 100 miles away" claim

The 3 July cannonade was enormous: 150 to 170 guns, beginning about 1 p.m. for one to two hours (page: Pickett's Charge; the page quotes a historian calling it possibly the loudest man-made sound on the continent until the Trinity test). **How far it was heard is not established.** What I read: the *Harrisburg Evening Telegraph* of 3 July 1863 reported "severe cannonading heard yesterday" (that is, 2 July) and firing heard "till late at night" in Harrisburg, 35 to 40 miles north (page: Wynn; the distance is the road estimate in the Gratz page); retellings say Pennsylvania from Pittsburgh to Philadelphia heard it, at dozens to over a hundred miles; the Lancaster Online article of 2007 quotes experts who doubt it and say only special atmospheric conditions would carry a muzzle blast that far; a forum check of the *Pittsburgh Gazette* found mentions about 40 miles away and none from Pittsburgh (page: Gratz; the forum and the Lancaster article were not read first-hand). So: about 40 miles is documented for the battle's cannonading on 2 July; for the 3 July bombardment itself I read no first-hand report at any distance, and over 100 miles is unverified. The mixer's physics cannot produce either (it has no gradients); a distant listener is served by the statistical layer, level-set from the sum of all guns and attenuated with ISO absorption (which removes everything above about 500 Hz at that range, leaving a low rumble).

### 4.9 Loudness and gain staging

At the assumed calibration the dense scenarios exceed full scale before the soft limiter: 10,995 samples over 1.0 in the 45 s assault-plus-cannonade run (0.4 percent) and 123,074 in the 40 s, 1,667 shots/s run (5.3 percent). The tanh-type limiter prevents hard clipping but also means the level of a dense mix is decided by the limiter, not by physics. The production master needs a look-ahead limiter or a loudness model (an RMS-tracking gain with a floor), and a listener-comfort calibration; that is a listening task (section 9).

## 5. The mixer

`mixer-bench/mixer-processor.js`, 214 lines, one `AudioWorkletProcessor`, no allocation in `process()`.

* **Scheduling.** Fire events (position, direction, sample index, gain, pitch) are stored in a pool of 131,072 slots with a min-heap keyed on estimated arrival time. Each 128-sample block, events whose wavefront reaches the listener within the block are started at the exact sample offset; the arrival is re-evaluated against the listener's current position (retarded time), and the heap is re-keyed every 8 blocks while the listener moves. Late events start mid-sample and are counted; events that would already be over are counted as late drops.
* **Voices.** Structure-of-arrays state for up to 4,096 (bench: 8,192) voices; per voice and block: linear-interpolated read, two-pole air filter, interaural delay line and head-shadow on the far ear, per-ear gain ramped across the block, reverb send. Voices end when the sample ends (slices are 0.19 to 0.6 s for guns and up to 3.5 s for cannon; the room tail is the shared reverb's job, which is what keeps concurrency low). Stealing (quietest voice) happens only when the pool is empty; **no run in this report stole a voice except the unit test built to force it.**
* **Cull.** A shot is skipped only if its peak at the listener is under 1e-5 of full scale (-100 dBFS, about 40 dB SPL peak at the assumed calibration), below the noise of a quiet field; none was culled in any benchmark run.
* **Two quality tiers.** Full: ITD, head shadow, two-pole air filter. Lite: pan law and a one-pole filter.
* **Timing instrumentation.** The worklet has no `performance.now`, so a helper worker increments a shared counter (about 99 million ticks per second here) which the worklet reads before and after `process()`; that gives microsecond block times and the exact count of blocks that exceeded the 2,667 microsecond budget.

## 6. Benchmark

### 6.1 How many shots per second are there?

Method: engaged strength times rate of fire. The Springfield page gives 2 to 3 rounds per minute (the owner's brief calls them aimed rounds), the Napoleon page 1 per minute. Sources of strength: 12,500 attackers in Pickett's Charge (page; estimates 10,500 to 13,500), the infantry assault lasting under an hour, Webb's brigade at the Angle 940 men (page), Hays' division firing up to four ranks deep from behind 260 yards of wall (page), more than 1,600 artillery rounds fired at Pettigrew's men (page). Union total strength engaged along the ridge is **not** on the pages read; the fidelity database must fix it. The bench therefore brackets it:

| scenario | construction | shots per second |
|---|---|---|
| cannonade, historical | 150 Confederate guns at one round per 90 s, 80 Union at one per 120 s (ASSUMED rates, the page gives 1 round per minute as the Napoleon's rate and says Hunt slowed the Union guns) | 2.3 |
| cannonade, 6 times faster | 15 s and 20 s per gun | 14 |
| assault at the Angle | 6,500 Union men at 2.5/min plus 3,000 attackers at 2/min (ASSUMED strengths) | **371** |
| owner worst case | 10,000 men at 3/min | 500 |
| Day 2 ceiling | 40,000 engaged at 2.5/min (ASSUMED; the order of magnitude of everyone engaged at once on the afternoon of 2 July) | 1,667 |
| stress to find the limit | synthetic stream | 100 to 12,800 |

An important caution from reading the render prototype's code: it fires every musket on a 5.6 s period (10.7 shots per minute), three to five times the real aimed rate; the event database must carry the real cadence (contract, section 4).

### 6.2 Results (Chrome 155.0.8059.82, Intel Core Ultra 7 265H, 16 logical cores, 31 GB, Windows 11, 48 kHz; Chrome at below-normal priority; two other large pipelines were running throughout, so CPU figures are conservative and noisy)

**Physics tests**: 9 of 9 pass (`results/physics-tests.json`).

**Offline renders, the CPU cost** (10 s of audio per run, two seeds, block times after a 25 percent warm-up; `results/sweep-offline.json`; "worklet RTF" is audio-thread CPU time divided by audio time, so 0.5 means half a core):

| quality | shots/s | concurrent voices (mean / max) | block time p50 / p99 / p99.9 (us) | worklet RTF | steals |
|---|---|---|---|---|---|
| full | 400 | 159 / 186 | 165 / 285 / 1,522 | 0.058 | 0 |
| full | 1,600 | 625 / 717 | 594 / 881 / 1,265 | 0.205 | 0 |
| full | 3,200 | 1,240 / 1,357 | 841 / 1,274 / 1,812 | 0.27 to 0.31 | 0 |
| full | 6,400 | 2,478 / 2,684 | 1,850 / 2,817 / 4,184 | 0.60 to 0.63 (49 blocks over the 2,667 us budget) | 0 |
| lite | 3,200 | 1,240 / 1,357 | 519 / 807 / 1,484 | 0.17 | 0 |
| lite | 6,400 | 2,478 / 2,684 | 1,003 / 1,938 / 2,386 | 0.34 | 0 |

Cost is linear in voice-seconds: 0.22 to 0.33 ms of audio-thread CPU per concurrent voice per second of audio (full), 0.14 (lite). The mean voice life here is 0.39 s; so the rate that fits is `R_max = voices_capacity / mean_voice_life`.

**Scenarios, offline** (`results/scenarios-offline.json`): the historical cannonade 4.3 mean voices and RTF 0.004; the assault at the Angle (371/s) 148 mean, 203 max voices, RTF 0.058, p99 278 us; the owner worst case (500/s) 199 / 273, RTF 0.074; the Day 2 ceiling (1,667/s) 657 / 933, RTF 0.167, p99 784 us; assault plus a six-times cannonade 174 / 232, RTF 0.046; the 371/s assault with the camera flying at 30 m/s (retarded-time re-keying and Doppler) RTF 0.047. No NaN, no steals, no late drops in any. Occasional single blocks over 3 ms in the offline runs fall on the first seconds (JIT warm-up) and on garbage collection; real-time use needs a silent warm-up pass at load.

**Real time on the real output device** (headed Chrome, default output, gain 0, 48 kHz, `AudioContext.playbackStats` for underruns; `results/realtime-device.json`, `realtime-knee.json`, `realtime-knee2.json`):

| run | shots/s | quality | concurrent voices (max) | block p50 / p99 / p99.9 (us) | blocks over budget | underruns |
|---|---|---|---|---|---|---|
| assault 371/s + 6x cannonade, 45 s | 371 + 14 | full | 222 | 125 / 275 / 425 | 1 | **0** |
| ceiling, 40 s | 1,667 | full | 933 | 375 / 850 / 1,175 | 0 | **0** |
| musket stream, 30 s (from `realtime-knee2.json`; `realtime-device.json` has a second run: 650 / 1,425 / 2,025, 0 over) | 3,200 | full | 1,374 | 725 / 1,700 / 2,375 | 6 | **0** |
| musket stream, 30 s, run 1 | 4,000 | full | 1,699 | 900 / 1,975 / 2,400 | 5 | **0** |
| musket stream, 30 s, run 2 | 4,000 | full | 1,699 | 900 / 2,000 / 2,550 | 9 | **0** |
| musket stream, 30 s | 4,800 | full | 2,005 | 1,100 / 2,550 / 3,300 | 93 | 4 events (0.04 s) |
| musket stream, 30 s | 6,400 | full | 2,686 | 1,400 / 2,925 / 3,500 | 316 | 11 events (0.11 s) |
| musket stream, 30 s | 4,800 | lite | 2,005 | 675 / 1,475 / 1,925 | 0 | **0** |
| musket stream, 30 s, run 1 | 6,400 | lite | 2,686 | 875 / 1,875 / 2,275 | 2 | **0** |
| musket stream, 30 s, run 2 | 6,400 | lite | 2,686 | 875 / 1,875 / 2,475 | 8 | 1 event (0.01 s) |
| musket stream, 30 s | 9,600 | lite | 3,974 | 1,275 / 2,600 / 3,225 | 115 | 58 events (0.61 s) |
| musket stream, 30 s | 12,800 | lite | 5,246 | 1,700 / 3,050 / 3,900 | 318 | 445 events (4.7 s) |

Every run: 0 steals, 0 late events, 0 dropped events. A "block over budget" is a block whose `process()` took more than 2,667 us; Chrome's output buffer (40 to 56 ms) absorbs a handful of such blocks; Chrome's own underrun counter first went above zero in the runs with about 90 or more over-budget blocks in 30 s (the 6,400 lite run with 8 blocks over also had one 10 ms underrun).

**Maximum shots per second sounded individually without dropouts, on this machine in one audio thread: 4,000 at full quality (1,700 concurrent voices); 4,800 to 6,400 in the lite tier.** First failures: 4,800 full, 6,400 lite (borderline), 9,600 lite (clear). That is 2.4 times the Day 2 ceiling and 10.8 times the Angle peak at full quality.

**Latency.** `baseLatency` 10 ms; output latency 40 to 56 ms (so the picture must be drawn for the audio clock minus this, contract section 2); main-thread to audio-thread message round trip median 0.14 to 0.22 ms, maximum 4.8 to 7.5 ms (22 to 24 ms in two of the overloaded runs); posting 120,000 events took 85 ms of main-thread time in total over 30 s. A live event therefore costs about 3 to 10 ms plus one 2.7 ms block before it is scheduled; events known in advance cost nothing.

**Memory.** Sample pool 10.3 MB (39 gun slices, 48 kHz float32), voice arrays at 4,096 voices about 1.6 MB with the interaural rings, event store 131,072 slots about 11.5 MB, echo and reverb about 1.3 MB: roughly 25 MB in the audio thread. Main-thread JS heap 12.5 to 24 MB in the device runs. The bench's own Chrome (all processes, including GPU) held about 800 MB and grew by at most 40 MB during a run (`realtime-device.json`, per-profile figures; the other result files had a flawed whole-machine figure which I removed).

### 6.3 How it scales, and exactly where individual rendering stops mattering

Capacity is linear: `R_max (shots/s) = 1,700 / mean voice life (s)` at full quality here, about `2,700+` in the lite tier. The mean life of a gun voice is the length of its slice, so the **sample tail is the first lever**: with 1.5 s dry samples instead of 0.39 s, full-quality capacity would fall to about 1,100 shots/s (below the Day 2 ceiling), which is why the design pushes the room tail into the shared reverb. Next levers, not built: WASM SIMD for the voice loop (I would expect 2 to 4 times, unmeasured), a half-rate tier for voices beyond 1 km (already filtered to under 2 kHz), splitting the voice set across two worklets (Chrome allows one thread per context; a second `AudioContext` for far field is possible), and the statistical layer.

**The psychoacoustic boundary** (`mixer-bench/tools/masking.mjs`, `results/masking.json`). For each shot at the listener I compute its arrival power with the mixer's own gain chain (source level, 1/r, directivity, ground effect, 2 kHz air absorption as a loudness proxy) and compare it with the summed power of all other shots arriving within +-25 ms. A shot is "individually distinguishable at margin m" if it is at least m dB relative to that sum. At the Angle geometry (371 shots/s, 30 s window):

| margin | shots per second that stand out | share of shots | energy carried by the rest |
|---|---|---|---|
| -3 dB (partly masked) | 20.2 | 5 percent | 16 percent |
| 0 dB (as loud as all the rest together) | 13.9 | 4 percent | 22 percent |
| +6 dB | 4.7 | 1 percent | 40 percent |
| +12 dB | 2.0 | 1 percent | 59 percent |

For the same stream shape the count that stands out at 0 dB is 14 to 19 per second from 25 up to 200 shots/s, then falls (13 at 371, 11 at 500, 7 at 1,000, 4 at 1,667 shots/s). Window length matters (at 371/s: 43 per second with 20 ms, 14 with 50 ms; `windowSensitivityAngle371`). So about **10 to 20 shots per second are heard as separate events in any dense passage, whether the rate is 100 or 1,000**; the other 95 to 99 percent of shots are heard as texture. This is a power-sum model, not a listening test.

What that means for the design:

1. **Render everything individually while the budget allows** (it does, to 4,000 shots/s here): the 95 percent that are not separable still shape the crackle, the direction of fire and the roar, and each one is the sound of its own soldier's weapon, which is the owner's requirement.
2. **When the budget does not allow** (a slower machine, a time-warp factor k that multiplies the density, a battle moment above the ceiling), demote shots to the statistical layer in this order: lowest margin first, farthest first, but never a shot within 150 m of the camera and never a shot among the top 20 loudest per 100 ms. The statistical layer is a band-limited noise-burst process with the demoted shots' summed level, spectrum (from their distances) and arrival density, at a fixed cost. At the Angle geometry, folding every shot below the -3 dB margin removes 95 percent of the voices and moves 16 percent of the energy into the layer; folding below 0 dB removes 96 percent and moves 22 percent.
3. **Say so.** A visible "N shots folded" indicator in the page when the layer is active.

## 7. Sync with the visuals

Full specification: `contract/FIRE_EVENT.md`. In short: one event per shot (`id`, battle time `t`, weapon id, position, heading, projectile, seed, flags), consumed by both the effects and the mixer. The flash, puff and recoil start at `t`; the mixer starts the sound at `t + d/c`; the animation draws for `AudioContext.getOutputTimestamp()` so the picture matches the sound being heard, not computed; in time warp the mixer is given `c * k`; on a seek, `flush` and re-send the previous `d_max/c` (about 12 s) of events so sounds already in flight arrive. Artillery adds a `shell` (trajectory) and an `impact` (burst kind, surface) event. The mixer half is implemented and tested; the shell half is specified only.

## 8. Effort and cost

Software, remaining work (hours; the prototype and benchmark above are done):

| item | hours |
|---|---|
| master dynamics and gain staging (look-ahead limiter or loudness model), listening and tuning with a panel | 40 to 80 |
| shells: trajectory voices, Doppler, scream, burst and impact events, canister | 40 to 70 |
| statistical far layer and the demotion policy with its indicator | 30 to 50 |
| terrain-derived echo and reverb from the DEM (ray cast to ridges and woods; per-region impulse responses) | 40 to 80 |
| sample pipeline: slicing, loudness matching, per-weapon variants, tails, loading and streaming, memory budget, mobile fallback | 40 to 60 |
| event contract integration with the render and fidelity code (emission, seeking, time warp, latency compensation) | 30 to 50 |
| WASM SIMD voice loop (optional) | 40 to 60 |
| cross-browser and device testing (Safari, Firefox, phones) | 20 to 40 |
| total | about 280 to 490 hours |

For the agent doing it, the work to date cost about 0.4 million tokens; the remaining software is several times that, an estimate of 2 to 4 million tokens.

Sound library: commissioned session about $12,000 to $20,000 and three to four weeks (section 2.3); a commercial library $349 plus licence clearance; the interim procedural bank costs only engineering time.

## 9. Gap list

1. **Per-weapon recordings** for all 18 ids (section 3.4). Blocking for the owner's requirement.
2. **The rifle-musket bullet speed** (supersonic crack or not): settle with a chronograph (section 3.1).
3. **Listening evaluation**: nobody has heard any of this; balance, reverb, echo taps, limiter and loudness are unjudged.
4. **Gain staging**: the dense mixes pass full scale before the limiter (section 4.9).
5. **Source levels, directivity, spectral weights, RT60, echo taps** are ASSUMED (section 4).
6. **Moving sources** (shell flight), **statistical layer**, **terrain echoes**, **wind and temperature gradients** (acoustic shadow, distant hearing), **ground-effect mid-band dip as a filter**, **HRTF with front/back/elevation**: designed, not built.
7. **Signals**: the 1862 bugle and drum calls need transcribing from the manuals (Casey, Butterfield, Cooke), and a bugler to record them; the Union cheer has no documented description yet.
8. **Counts**: the strength engaged along Cemetery Ridge per minute for the real peaks must come from the fidelity database; the render prototype's 5.6 s fire period is 3 to 5 times too fast.
9. **Licences to settle**: CC BY attribution lines for Freesound 162628 and 18229 in the product credits; CC BY-SA obligations on audio derived from the two Commons reenactment clips (keep them out of the shipped bank, or release derived audio under CC BY-SA); a written NPS answer on the Sound Gallery files; the licence of any commercial library for web delivery.
10. **One machine, one browser**: Chrome 155 on one Windows 11 laptop under below-normal priority and competing load. Underruns were read from `playbackStats`, not from the speakers.
11. **Flat geometry**: the synthetic scenes ignore terrain occlusion and elevation differences of 20 to 40 m.
12. **The pilot files are 128 kbps previews** (MP3), not the lossless originals; production needs the originals or a new session.
