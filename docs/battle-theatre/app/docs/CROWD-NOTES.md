# CROWD: the figures in the Battle Theatre shell (workstream 3)

Code: `app/src/crowd/` (`crowd.mjs` core, `data.mjs`, `anim.mjs`, `clips.mjs`, `meshes.mjs`, `tables.mjs`, `gl.mjs` + `shaders-gl.mjs`, `gpu.mjs` + `shaders-wgsl.mjs`), wired by `render-host.mjs` (`attachCrowd`, the R.ext composite, `frame`), `stage.mjs` (`unitSegments`, `fallInfo`, `tNow`, turn time) and `theatre.mjs`. Tests: `tests/crowd.test.mjs` (10, node). Nothing here has run on a real GPU.

## What is drawn
Every drawn figure (127,572 in the real layer), one-to-one, from its own kit manifest: `instanceFromHistory` per figure (no `Math.random`; the variation scalar `sold1.w` still comes from the manifest). The prototype's near / mid / far soldier passes are switched off (`R.o.flags`), guns, terrain, structures and the effects stay.

| LOD | distance (1080p, 60 deg; scaled by pixels and fov; the two Settings sliders move them) | what | skeleton / pose |
|---|---|---|---|
| 0 | < 10 m (budget 96 men, nearest first, the rest drawn at LOD1) | the parts of the man's kit (head, hair, hands, coat, trousers, shoes, hat, accoutrements, arm ...), about 43,500 triangles | 61 bones, CPU pose from anim3d `sampleFigure` with the foot-planting pass on the real ground, palette texture / storage buffer |
| 1 | 10 - 13 m | merged class mesh + accessory mesh (about 1,900 + 150) | 36 bones, bone-matrix texture, two clips x two frames blended in the vertex shader |
| 2 | 13 - 75 m | low class mesh + accessory mesh (about 620) | same |
| far | beyond 75 m: every figure, one instanced draw over the whole world | baked 8-view impostors (material ids; colours from the outfit variant), small dab below 7 px | rest pose |
Mounted men: the rider with the rider clips and the horse (LOD0 / 1 / 2 meshes, horse bone texture). Gun crews: the stage's crew units with the artillery detachment clips and a by-piece fire plan. Structures draw lists (workstream 6): train guns, limbers, caissons, wagons, forge, draught horses and drivers, and the works (draped mesh plus crews), drawn rigid from an identity frame of the horse bank.
Animation: `UnitAnimator.clipAt` (activity timeline from the stage's admitted events + fire plan + falls + per-figure phase / rate / fall style) evaluated on the CPU for every figure inside 75 m, a pure function of simulation time; DD-10: Wheeler 1863 gaits for cavalry, the 1863 field artillery manual for horse artillery (`modern_range` stays selectable in anim3d).
Colour: variant slots, skin / lip / hair / iris from the man's identity, wear and dye lot on cloth (the shader port of `resolveColours`), flag cloth in the mean colour of its pattern.

## Choices that are ours (plausible-procedural, to be decided or confirmed by the owner)
* Fire: `at_will`, 20 to 30 s per round per man (ANIM3D-NOTES 2.3); guns by piece, 30 to 60 s. The record has neither (G-ANIM-01, 02).
* The 140th New York, whose dress is disputed: drawn in the army's generic infantry dress with the gap flag, no reading chosen (the card still says both are carried).
* Night for the camp clips: 19:30 to 04:30 local time.
* A turn of a block takes max(25 s, angle x extent / 4.4 m/s): a rigid train no longer swings its far end at 30 m/s.
* Animation time is simulation time. Above 2x playback the legs run at the playback rate (the prototype's slowed animation clock is not used).

## Not done (listed, not dropped)
Cross-fade and hysteresis between LODs (G4 not met); material texture maps, body shape keys, flag pattern textures, hair-card alpha (stochastic coverage stands in), terrain conformance at LOD1/2, animated impostors, variant clips at LOD1/2 (base clip with the figure's phase), the adaptive LOD bias, ANV 13-star flag default (figures3d, DD-01: the flag is drawn in a mean colour here), per-figure instance records by date (dress is fixed at the unit's arrival date), a precomputed instance table (entry builds 127,572 records in about 12 s, time-sliced; kept for the next visit).

## Cost model on paper (mobile G1, 125,000 figures; modelled from `figures3d/cost-model.json`, NOT measured)
* Triangles: LOD0 median 43,512 per man (x 96 budget = 4.2 M; a phone budget of 16 men = 0.7 M), LOD1 about 2,050, LOD2 about 770 with accessories, far 2 (a quad), horse 768 / 330, gun carriage + tube + limber + caisson a few thousand per piece. Dense view from 3 m (cost model): 10 k men at LOD2 = 7.7 M triangles; on the Arc iGPU model 4.5 ms per M triangles on WebGL2 that is over the 7 ms allowance, so the LOD2 radius (75 m) is the lever (the plan's bias b: radii x b, never the count).
* Draw calls: LOD0 one per distinct part in view (30 to 100), LOD1 / LOD2 one per outfit class in view plus one per accessory class (at most 312 + 15 each), horses 3, train 8, works 2, far 1. Measured in the browser (SwiftShader, 3 Jul 13:30, 30 m from a battery): 37 draws, 507 k triangles, 1,314 instance records.
* Bytes: instance table 2.0 MB (16 B x 127,572), variant info + palette 2.6 MB (about 40 k variants), impostors 13 MB (133 classes x 384 x 64 x 4), mesh store 20 MB vertices + 10 MB indices (measured 726 k vertices, 2.6 M indices with a few LOD0 parts; LOD0 parts stream in on first use, up to about 45 MB), bone banks 14 MB human (16,384 frames at 30 Hz or less) + 2 MB horse, LOD0 pose palettes 0.3 MB, per frame upload 48 B per listed figure.
* CPU per frame: selection (units in range x figures) 0.3 to 10 ms measured under SwiftShader, `clipAt` about 1 to 6 microseconds per figure (units built lazily), LOD0 pose 5 microseconds per man with foot planting.
Real-GPU frame timing was NOT measured here: see BROWSER-VERIFICATION-LIST-CROWD.md.

## Cavalry, horses and dismounted cavalry (workstream ws10)
Code: `src/history/cavalry.mjs` (pure model, every number with its tier), `src/anim3d/unit-anim.mjs` (`dismount` segments, `_mountHorse`, `ClipSel.m` and `d[SEL_HX|HZ|MZ]`), `src/crowd/anim.mjs` (`_dismounts`), `src/crowd/crowd.mjs` (horse and holder offsets, draught-horse falls), card section `horseSection` (`src/ui/card-sections.mjs`), data `data/cavalry-horses.json` (generator `tools/build-cavalry-horses.mjs`), tests `tests/cavalry-ws10.test.mjs`, proposed register `GOVERNANCE/horde/ws10-cavalry/proposed-register/`.
* Riders and horses: one figure per drawn trooper and one horse per rider (the point); the card shows the range 0.47-1.0 horses per man from three weak observations (10th NY 303 of 460, an 8th NY company 43 of 56, 6th US about 500 of 1,072), plausible-procedural, EG-CAV-01. 21 cavalry units are drawn by the layer, 34 are not (EG-CAV-07, the layer's open gap).
* Horse casualties: the horse of a fallen mounted trooper goes down at the instant of his fall (`horse_fall`, a non-looping clip that holds its last frame). Ratio from the one regimental figure in the ledgers (6th US, 292 horses with 290 men, OCR digits), capped at 1; bounds 0 to 1.007 on the card; selectable through the animator option `horseWithRider`. Riderless horse losses and horses of missing men are not drawn (EG-CAV-02).
* Dismounted fights: where the OR (or two regimental histories) print that part of a regiment fought afoot and the unit has an engagement window in that range, the standing segment becomes a dismounted one: the printed share dismounts (Gamble's three regiments one half, OR27-1-R338 p.934), one man in four holds horses (the plan, plausible-procedural), the horses are led 12 m behind the line in 7 s and led forward again before the men mount (model parameters, EG-CAV-03). No window, no printed fraction, no dismount (EG-CAV-04). Today only the 3rd Pennsylvania (July 3, 13:30-13:45) is both drawn and documented; the others appear when the layer draws them.
* Draught horses of batteries: printed horse losses of five drawn batteries (kit `losses`) fall inside the battery's windows by the counter-based RNG, exactly the printed number (EG-CAV-08).
* Not done, registered: spare, remount and officers' horses (EG-CAV-05, no source); the charge path (the layer's charge clauses have no path; the Wheeler schedule is data in gaits.mjs, EG-CAV-06); road columns of vehicles (ws6-EG-04); the horse-artillery reserve caissons and mounted cannoneers in the train (ws6-EG-05).
