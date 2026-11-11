# Battle Theatre: owner tutorial

Staging build 0d365128 · Gettysburg, 26 June to 14 July 1863 · written 11 November 2026

This guide is for you, the owner. It assumes no programming. It says what the Battle Theatre is, how to open the test copy, what every control does, what the marks mean, what this build does not do yet, how to put it on Netlify by drag and drop, and what to check afterwards. Where something is built but not yet seen working on real hardware, the guide says so in plain words.

## 1. What it is

The Battle Theatre is a separate page, apart from the Gettysburg Interactive Map. You fly a free camera over a model of the ground at Gettysburg and move through time, minute by minute, from 26 June to 14 July 1863. There is also an epilogue chapter for 19 November 1863. Figures stand for soldiers, horses and guns. Units arrive by marching in along a road; none appears before the earliest time the record allows. Every mark says how well the record supports it, and where the sources disagree you choose which account to follow.

Three things to hold on to:

- **Nothing is hidden.** What the record does not give is shown as an open gap, not guessed.
- **The ground is modern.** It is a 2022 aerial photograph on 3D Elevation Program terrain, not the 1863 landscape. The page says so.
- **The map site is untouched.** The Virtual Walkthrough and Monuments sections are used only as places to fly to. Nothing in them is changed.

## 2. Opening the test copy (staging site)

1. Deploy the zip to a new throwaway Netlify site (section 9). Netlify gives you an address ending in `netlify.app`.
2. Open that address. The root page forwards to `/app/index.html`.
3. Press **Enter the Battle Theatre**. The first visit takes a while while the figures are built (about 12 seconds on the machine it was developed on, time-sliced so the page stays responsive; your machine may differ).
4. The lower-left corner shows "Battle Theatre staging build" and an 8-character id. It must match the id in the zip file name. This tells you which build you are looking at.
5. **Return to the map** (landing page) and **Back** (top bar) leave the theatre.

Useful additions to the address:

| Add this | What it does |
|---|---|
| `#theatre` | opens straight into the theatre |
| `?api=webgl2` | the WebGL2 renderer. **This is the default**: it is the only one that draws the weather and effects (see section 8), so the page opens on it without this addition |
| `?api=webgpu` | asks for the WebGPU renderer instead. The weather and effects are not drawn there and the picture has not been seen (section 8); the ribbon at the top says so |
| `?api=auto` | WebGPU first, WebGL2 if WebGPU is not available |
| `?audioLabel=pdf` or `?audioLabel=panel-only` | previews either sound-marking option; the default is `panel-only` (section 6) |
| `?history=stub` | the older placeholder layer: 992 stand-in units, every one labelled "Modelled placeholder". For comparison only |

Use a desktop browser, Chrome preferred. The page works on a phone (a touch pad appears), but it has been checked only in software rendering and emulation.

## 3. The screen

- **Top bar.** Back, the title, a ribbon (it reads "Version 0 of the record" in the real layer), and six tools: Events, Views, Sources, Evidence, About, Settings.
- **Clock face, upper left.** Date, time (local mean time; no standard time existed in 1863), the conditions chips (sun, moon, sky, rain, temperature) and a count line: how many figures in how many placed units are on the field now, and how many units have no place in the record.
- **Time dock, bottom.** Play and pause, previous and next event, slower and faster, the speed readout, the scrubber with its day-and-night strip, and the "Latest event" line.
- **Card, left.** Appears when you click a unit or a structure.
- **Drawer, right.** Opens when you press a tool. One drawer at a time; Esc closes it.

## 4. Controls

### Moving the camera

| Input | Action |
|---|---|
| W A S D | fly |
| Q and E | down and up |
| arrow keys, or drag with the mouse | look |
| Shift | faster |
| mouse wheel | move forward or back |
| Home | back to the whole field |
| touch | a round pad (move) and two buttons (rise, sink) |
| click or tap a unit or structure | opens its card; Esc clears it |

### Time

| Control | Action |
|---|---|
| Scrubber | drag, or use the arrow keys, to any minute from 26 June to 14 July. While you drag, the picture follows; releasing replays the effects for that minute |
| Play or pause | button, or the Space bar |
| , and . | 10 minutes back or forward (with Shift, one hour) |
| [ and ] , or the previous and next buttons | jump to the previous or next timeline event |
| Speed | slower and faster buttons, or the - and + keys. Steps: 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60 times real time. Seconds show on the clock only at 1x or slower, or when paused |
| Epilogue button | at the right of the dock; goes to 19 November 1863 and back to the night of 4 July. The timeline file records no time of day and no events for the epilogue, so it opens at midnight and says so |

The strip behind the scrubber shades day and night, draws the moon, and marks each timeline event with a tick in its tier colour. Selecting an event shows its window as a pale band.

### Events (drawer)

Lists all timeline rows. Search by words or id, filter by tier, pick a day, or show timed rows only. Click a row to jump to its time. A row with no clock time shows "Time not recorded" with the printed phrase, and is not placed on the minute scale. The selected event shows its text, the time as printed, its window, other times given, the plan page, and a link to its evidence-gap entry if it has one. Every row is marked "Seeded, unverified" until checked against a primary source.

### Views (drawer)

Four tabs: **Tour stops** (16, from the site's Virtual Walkthrough), **Monuments** (512, with search and a Union, Confederate or Other filter), **Units** (search the units on the field right now; a unit is listed only while it is present) and **Saved** (save the current camera; saved views stay in this browser only). Places outside the loaded ground are greyed out.

At the top of Views is **Structures (reconstruction)**: switches for roads and rail, fences and walls, buildings, borough masses, labelled poles (places known only as a point) and works, with counts, and a folded list of what is not drawn and why. A pole is never a building.

### Evidence (button, or the O key)

Outlines every unit by tier and shows a legend. Click a mark for its sources and its evidence-gap entry. Colour is never the only signal: each tier also has its own shape and line pattern.

### About (button, or ? or H)

Explains what you are seeing, how a unit comes to be placed, the tier definitions, the key list, and a data table: source of units, events accepted and refused by the arrival rule, seed, input hash, current source choices and the renderer in use.

### Settings (drawer)

| Setting | Meaning |
|---|---|
| Night floor | the darkest the picture may get (15 to 60 percent; default 34). Night is dimmed, never black |
| Resolution | 50 to 100 percent of the screen size. Lower it on a slow machine |
| Close-up and mid detail distance | how far from the camera the detailed and middle-detail soldier drawings reach |
| Show works | fences and earthworks on or off |
| Reduce motion | no flights, no rain streaks; follows your system setting until you change it |
| Sound | the whole sound panel is repeated at the foot of Settings (section 6) |

## 5. Where the sources disagree (47 conflicts)

Open **Sources**. There is one entry for each of the 47 conflicts C-001 to C-047 in the plan, plus the weather conflicts (five), and a block of readings for how the structures follow them. Each entry shows the values as printed, the value the plan recommends, and a drop-down.

- **Every entry opens on a default chosen under delegated authority, reversible by you.** On 11 November 2026 the pending decisions were delegated, and the 47 defaults are recorded in `GOVERNANCE/decisions/conflict_defaults.json` and in the delegated-decisions file. For most conflicts the default follows the Official Records value; where no source supports any value, the plan's value stays first and is marked plausible-procedural with its gap. Each entry shows its tier mark and the words "Default chosen under delegated authority, reversible by the owner", with the reason under "Why this default". These are not your decisions; you can overrule any of them.
- **Nothing is removed.** The plan's recommended value, every printed value and the values added from the record stay in the drop-down. The weather conflicts, which have no delegated default, still open on the plan's value.
- **To see the plan's values instead:** press **Switch to the PDF's recommended values** (every entry at once, 47 of them), or "Use the PDF's recommended value" under one entry.
- **To switch the view:** pick another value in the drop-down. The label at the top shows how many choices differ from the delegated defaults. The theatre follows the choice where it can: entries marked "Used in this preview" change what you see (they move the arrival gates linked to them, by a clock the value prints or a labelled convention). The rest are carried and listed but do not yet change the picture. A value with no clock, such as "mid-afternoon", leaves the gate where it is and the card says so.
- **To go back:** **Back to the delegated defaults** returns every entry to its default ("Use the delegated default" does one entry). Search the list by id or topic.
- **Your choices are not remembered.** They last for the visit. There is no button yet that makes a new default for everyone.
- **A default can move the picture.** Where a default prints a clock (for example II Corps at 06:30 on 2 July, Humphreys at 01:00), the units linked to that conflict arrive by it, never earlier than the record allows; a default with no clock leaves the arrival gate where it is, and the card says so. Switching to the plan's values moves them back.
- **Other delegated defaults.** Gait basis (Wheeler 1863 for cavalry, the 1863 artillery manual for horse artillery), the Confederate battle flag with 13 stars (12 stays selectable), the works defaults of DD-02 to DD-05 (breastworks built on screen in the Official Records window; walls that already existed get no construction), and the sound marking (section 6) are likewise delegated and reversible.

## 6. Sound

Open **Settings**, then scroll to **Sound**. (There is no separate toolbar button.)

- **Sound is off until you start it.** Press **Start sound** (browsers require a click). **Stop sound** releases it again. **Mute** is a tick box.
- **Levels:** Master, Music (bugle and drum signals), Effects, Voices.
- **When it is silent on purpose:** while time is paused, while you drag the scrubber (nothing from the future is played), and above 8x speed. Slow down to hear it. After a jump in time, sounds already in the air arrive on schedule. Sound travels at the speed of sound: a gun 2 km away is heard about 5.8 seconds after the flash at normal speed.
- **Marking of the sound.** The panel offers two options, always both:
  1. *PDF rule:* audio is labelled as modern reconstruction. A one-line badge reads "Audio: modern reconstruction. No recording of 1863 exists." and each sound carries a tag.
  2. *Disclosure in the panel:* nothing is printed on the sound; it is disclosed in the panel list and the evidence overlay only.

  The list "What is in this build" is identical in both options: every sound family, whether it is a real recording, a reconstruction or synthesised, its tier, licence and gap. Only the badge and the tags change. Your pick is remembered in this browser only. **Shipped default in this build: option 2, disclosure in the panel** (a delegated decision, DEC-001 option a, reversible by you). Modern recordings are never called period sound, and the tier marks on non-documented content stay. The PDF rule is one choice away in the panel (or `?audioLabel=pdf`); changing the shipped default back is a one-line change.

## 7. What the marks mean

| Mark | Meaning |
|---|---|
| Documented (green circle) | a source that is not just a lead supports exactly this claim |
| Inferred (amber diamond) | reasoned from sources; not stated outright |
| Plausible-procedural (purple triangle) | filled in where the record is silent, and marked so |
| Open gap (red square) | no source found; shown as a gap, never hidden |

Worked examples from this build:

- **Arrival windows** come from the plan's arrival ledger. A regiment's own arrival inherits its division's or corps' window where the plan gives none, and is marked inferred.
- **Strengths.** Printed figures exist for 13 corps rows and 8 brigades. Everything below is a procedural share, marked plausible-procedural. Strengths and casualties are ranges with a stated basis, never a single invented number.
- **Placement.** 439 units are drawn, 418 of them placed by a road of approach and a dated place; 108 regiments, battalions and batteries have no road in the record and are listed as open gaps. 213 are drawn by an inferred approach and 226 by a plausible-procedural one. A unit enters along its road at its gate and marches in; its arrival is never a spawn.
- **Modelled approaches.** Some units' reports name no road. Their road is the one every documented sibling formation of the same corps names. Their cards say "Modelled approach" and list the siblings.
- **Casualties** appear on a unit's card under **Losses**: procedural shares of printed losses, placed only inside printed fight windows (31 timeline rows print a window). Men who fall lie where they fell. No regimental casualty number exists in what has been read.
- **Structures** are drawn from the 1863 base-map layers: 30 fence and wall lines confirmed by the 1868-69 survey, 40 building footprints, 229 borough masses, 117 poles. Each has a card with its geometry source, error and tier. No footprint or dimension is invented. Earthworks are built on screen in their sourced window; walls that already existed (the Angle wall, for example) never get a construction animation.
- **Weather** follows the weather record loaded with the page, with the sky, clouds, mist, stars and wet ground derived from it. Readings are secondary sources (marked inferred); stars, cloud shape, mist and puddles are plausible-procedural. The record has clouds only from 1 July 21:00 to 3 July 21:00; elsewhere the chip says "No weather record" or "Sky not recorded".

## 8. What is NOT in this build

Please read this section. The build is a staging copy for your test, and it has not been accepted.

**Nothing has been timed or seen on a real graphics card.** Everything was run in software rendering or in code tests. There is no real-GPU frame timing. The performance targets (smooth frames with all 127,572 figures at 1080p and 4K, phone budgets) are modelled on paper and unmeasured. Your first run on your own machine is the first real measurement.

**WebGPU has not been seen, so the page opens on WebGL2.** The weather and effects layers (sky, clouds, stars, mist, wet ground, smoke, flashes, dust, fires) are drawn only on WebGL2; on WebGPU their state is computed but nothing is drawn, and in the software test the WebGPU picture could not be captured, so nobody has looked at it. By a delegated decision (DD-27, reversible) the page therefore uses WebGL2 unless the address says `?api=webgpu` (or `?api=auto`). The About panel and, on WebGPU, the ribbon at the top say which renderer is running and that the weather and effects are not drawn on WebGPU.

**The modded ACW meshes are not used.** Every soldier, officer, flag, gun and horse is a procedural figure. The mod's meshes carry base-game parts or have no ownership record, so none could be cleared. Only 24 texture sheets (Confederate shell-jacket colours) are cleared and held as lead swatches; the viewer does not use them by default. The rights rest on the mod author's verbal permission, with no written text on file. Pending: a short written statement from the author of which files are his own work.

**Figures:**
- Cross-fade between levels of detail is not done, so figures can pop at the hand-over distances.
- Material texture maps, body shape keys, flag pattern textures and hair alpha are not done. Flags are drawn in the mean colour of their pattern.
- The 140th New York, whose dress is disputed, is drawn in the generic infantry dress with the gap flag; neither reading is chosen.
- The rate of fire and the exact moment each soldier fires are not in the record. The viewer uses a stated tempo (20 to 30 seconds per round per man, guns 30 to 60 seconds). That is a choice, marked plausible-procedural.
- Dress is fixed at the unit's arrival date.
- The first-visit build of the figure table takes seconds and is not yet cached.

**Sound has not been heard by anyone.** The engine passes its tests, but no listening check has been done. No licensed recordings are loaded unless the panel list says "(loaded)". Most families are synthesised, and the panel says so. The sound data files (`app/data/audio3d`) and the animation data (`app/data/anim3d`) are in the zip: the packing tool now follows those loads, and a real run of the packed site (figures on, sound started, the scene run for some frames, the browser's request log compared with the zip) found no missing file. Please report what the "What is in this build" list shows.

**Places and units not in the picture:**
- 108 leaf units have no road of approach and are not drawn (open gaps; reasons on their cards and in `HISTORY-LAYER-NOTES.md`).
- The 84th Pennsylvania is documented absent (with the supply train at Taneytown): not drawn and not counted.
- 12 place names printed in the ledger and 20 others are not in the repository's files (for example Moritz's Tavern, Goulden Road, Taneytown, Westminster) and stay unresolved. Seminary Ridge and Herr Ridge are proxies, marked.
- Works with no mapped line stay rings at the place named.

**Evidence status of the Official Records.** Volume 27 parts 1 to 3 are read. Four position ledgers hold 3,503 claims; only claims whose quote was re-checked against the text and whose fidelity check passed are used, and each card lists the report, printed page, quoted words, tier and checks. State regimental volumes (ledger E) are admitted by the same rules. Where reports disagree the card lists them without choosing. Not read: the Official Records Atlas is only partly read; Busey and Martin (print only) was not read, so there are no regimental casualty numbers; the hour-labelled sheets of the 1886 troop map are blocked (the originals' location is not established; a purchase of the reprint would be your decision). The Bachelder 1876 map day-positions (484 claims) place a unit for the day, with the time modelled. About 500 evidence-gap entries are registered; they are the honest list of what is missing.

**The timeline** rows are each "seeded, unverified" until checked against a primary source. Tier changes recorded for some rows are in the decision log.

**Smaller items:** the per-minute sky table ends on 6 July (the page computes the sun and moon beyond it); the ground is the modern landscape; the 1886 hourly sheets are missing; the final eight-clean-passes acceptance run has not been done on this build.

## 9. Deploying by drag and drop to Netlify

Netlify screens change names from time to time. **Every Netlify label below is from memory and unverified. If a screen looks different, stop and ask.** Only you publish.

**Do not drop this zip onto your real site.** The theatre is a separate site and has not passed final acceptance.

1. In `deliver/`, find the newest `gettysburg-BT-staging-<id>.zip`. The id at the time of writing is `0d365128`. Its checksum file sits beside it. SHA-256 of that zip:
   `706378f1b394d31273dd171789a247f8a865fe27d547420317b275f75ff9af2f`
   (205 files, about 7.3 MB zipped, 15 MB unzipped.) To check on Windows, open a command window in `deliver` and run `certutil -hashfile gettysburg-BT-staging-0d365128.zip SHA256`; it must equal the line above and the `.sha256` file.
2. In Netlify, add a **new site by dropping a folder or zip**. Drop the zip, or the unzipped `dist` folder from `deliver/bt-staging`. Netlify gives a random `netlify.app` address.
3. Open it and follow the checklist in section 10.
4. Send the address back so the same checks can be run against it.
5. When done, delete the throwaway site. There is nothing to roll back, because your real site was never touched. (Your real site's undo, as in earlier guides, is Deploys, the deploy that begins `6abd6d62`, Publish deploy.)

What the zip contains: the page (`app/`), the renderers, the data it loads (history, structures, kit, environment, figures, effects) and `_headers` and `netlify.toml`. Left out: tests, screenshots, notes and tools. No headers for cross-origin isolation are needed. The site sends `X-Robots-Tag: noindex, nofollow` and a robots meta tag, so search engines ignore it, and `Referrer-Policy: no-referrer`. "Return to the map" goes to the staging root, not your main map.

## 10. What to test, and what you should see

Tick each line. If a result differs, note the line number, the date and time shown on the clock, and a screenshot.

**Start**

- [ ] The address opens the landing page: "Battle Theatre", the three facts (Ground, Figures, Time) and two buttons. *Expected: no error text.*
- [ ] The lower-left stamp shows the same id as the zip. *Expected: `0d365128`.*
- [ ] Press **Enter the Battle Theatre**. *Expected: a status line while loading, then the landscape with the top bar, clock face and dock. A first visit can take many seconds.*
- [ ] Open the browser's console (F12). *Expected: no red errors. Warnings about effects or sound not started are worth reporting.*

**Time**

- [ ] Press Space. *Expected: the clock runs; the readout changes; units move.*
- [ ] Drag the scrubber to the middle and release. *Expected: the date and time follow; the picture changes at once.*
- [ ] Press , then . *Expected: 10 minutes back, then forward.*
- [ ] Press **faster** until 60x. *Expected: speeds 2, 4, 8, 15, 30, 60; the faster button greys out at 60x; seconds disappear from the clock above 1x.*
- [ ] Press **Epilogue**. *Expected: 19 November 1863, 00:00, readout "Epilogue: the timeline file lists no events for November 1863". Press again to return to the night of 4 July.*
- [ ] Press ] repeatedly. *Expected: the clock jumps to successive timeline events.*

**Arrival rule**

- [ ] Scrub to 26 June. *Expected: the count line says no placed unit is on the field.*
- [ ] Open Events, pick a day, press a row. *Expected: the clock jumps and the selected event's details show.*
- [ ] Watch a unit arrive at 1x. *Expected: it enters along a road at the edge of the loaded ground and moves in; it does not appear in the middle.*

**Marks and cards**

- [ ] Press **Evidence** (or O). *Expected: outlines in four tier styles and a legend.*
- [ ] Click a unit. *Expected: a card with evidence, tier, strength, losses, figure manifest; the report, page and quoted words for units placed from the Official Records.*
- [ ] Click a structure. *Expected: a card with geometry source, error, tier and "Where the record disagrees"/"Open gaps" where they apply.*
- [ ] Views: toggle fences off. *Expected: the fence panels disappear; the card closes if it was a fence.*

**Sources**

- [ ] Open Sources. *Expected: 47 conflicts plus the weather ones; the label reads "Delegated defaults (reversible by the owner)"; each of the 47 shows a tier mark and "Default chosen under delegated authority, reversible by the owner"; "Back to the delegated defaults" is greyed.*
- [ ] Change one entry marked "Used in this preview". *Expected: the label reads "Custom: 1 choice differs from the delegated defaults"; the count of events refused by the arrival rule in About may change; the button becomes active.*
- [ ] Press **Switch to the PDF's recommended values**. *Expected: every one of the 47 reads "PDF recommended, pending owner"; the label reads "PDF recommended values, pending owner".*
- [ ] Press **Back to the delegated defaults**. *Expected: back to the defaults.*

**Weather** (the default WebGL2 address; the About panel's Renderer row reads webgl2)

- [ ] Go to 3 July 14:00. *Expected: a partly cloudy sky; the chip shows the temperature as "about" a figure.*
- [ ] Go to a night hour. *Expected: stars and a moon disc; the picture is dim but never black.*
- [ ] Settings: lower **Night floor** to its minimum. *Expected: darker, still not black.*
- [ ] Go to 4 July afternoon. *Expected: a rain or storm chip and rain streaks unless Reduce motion is on. (The timing of the 4 July rain is itself one of the conflicts in Sources, so the choice there moves it.)*
- [ ] Open the same time on the `?api=webgpu` address. *Expected, as stated in section 8: no weather or effects drawn, and the ribbon says so.*

**Sound**

- [ ] Settings, Sound: press **Start sound**, press Play near a battery on 3 July afternoon. *Expected: the state line says sound is running; guns are heard late in proportion to their distance.*
- [ ] Drag the scrubber. *Expected: silence while dragging.*
- [ ] Choose each marking option. *Expected: no badge on the default (disclosure in the panel); the badge appears with the PDF rule; the list of sounds is the same.*
- [ ] Reload and open Settings. *Expected: your level, mute and marking choice are remembered; sound itself is off.*

**Settings and phone**

- [ ] Lower Resolution to 50 percent. *Expected: a coarser picture, smoother frames.*
- [ ] Save a view in Views, reload, open Saved. *Expected: it is still listed.*
- [ ] On a phone: *Expected: the touch pad flies, the drawers open and close, nothing covers the dock.*

**Performance (the first real measurement)**

- [ ] Fly low over a line of infantry on 1 or 3 July. *Expected: report how it feels (smooth, juddering) and the machine's graphics card. This is the number the build is missing.*

## 11. Privacy and credits

- **No accounts, no sign-in, no tracking.** The page loads only its own files and asks for no personal details; no call to another site is made by its code.
- **What stays in your browser:** saved views, and the sound levels, mute and marking choice. Nothing else is stored, and none of it leaves your browser.
- **The staging copy is not indexed** and carries no referrer. Delete the throwaway site when you are done.
- **Ground:** 2022 aerial photograph and the 3D Elevation Program elevation.
- **Maps and records:** the Hopkins 1858 map, the Warren 1868-69 survey, Bachelder's 1876 maps, and the Official Records, volume 27, with the printed page and quotation on each card. Every source is listed where it is used.
- **Sound recordings:** credits for any recording loaded appear in the Sound panel.
- **ACW mod:** if a cleared mod file is ever in use, the credit line "ACWII mod by ACW_Primergy and team (used with the author's permission)" appears once, with its tier mark. In this build the figures are procedural and the line should not show.
- **Product marking:** non-documented content carries its tier mark. There is no other label about how the content was prepared.

## 12. Where to find more

Plain-language notes sit beside the page in `docs/battle-theatre/app/`: `README.md` (what is real and what is not), `HISTORY-LAYER-NOTES.md` (every open gap), `CASUALTIES-NOTES.md`, `STRUCTURES-3D-NOTES.md`, and in `docs/` the `BROWSER-VERIFICATION-LIST-*` files, the lists of checks that still need a real graphics card or ears.
