# Walkthrough guard: how to run it, what it proves, what it found

Files: `tests/t0/walkthrough-guard.spec.mjs` (the guard), `tests/t0/walkthrough-guard.mutants.mjs` (the proof that the guard can fail), this file.
Owner decision it serves (`docs/decisions/OWNER-DECISIONS-2026-10-04.md`, item 3): **do not break the Virtual Walkthrough or the Monuments section; the guard must pass on `baseline/dist` and on every train.**

## In plain words

Think of the Walkthrough as a little museum room inside the app. You walk in through a door (the toolbar button on a computer, the Tools tile on a phone). Inside there are 16 numbered stops. Each stop has a story, a picture of the place from Google Street View, a link to a video and a map that glides to the spot. There is a second room next door, "Monuments", with a list of 512 monuments you can search and filter. When you press Back you are in the main map again, and it must still work.

The guard is a robot visitor. It walks through every room the way a person does, with a real mouse, real fingers on a phone-sized screen and the keyboard. At every step it checks what it sees against a list that was taken from the site as it is live today. It also checks the book the museum keeps behind the counter: the 16 stops and 512 monuments are stored as data, and the guard compares that data with the original, letter by letter, so nobody can change a stop without the guard noticing.

Then it does this for the live copy, for the original download, and for the four release candidates (R0, R1a, R1b, R1c). Where a candidate is different on purpose (for example: on a phone the candidate R1b adds a Walkthrough button that the live site does not have) the guard knows that difference by name and checks that it is exactly the intended one. Anything else that is different fails, and the guard says which step broke.

To be sure the robot is not just nodding yes to everything, there is a second script that breaks the museum on purpose in 17 ways (one stop moved by 55 metres, the Back button dead, the list cut to 50, a leak when you leave, ...). The robot has to shout every time.

What the robot found, in one breath: **no candidate breaks the Walkthrough or the Monuments tab.** The one thing that is gone everywhere except in the original download is the little star markers that the Monuments toolbar button drew on the map. That is the known loss (production removed them by accident, the owner wants them back), and the guard has three tests (`T0-WG-13..15`) that check the restored version. They were already run against the other agent's scratch build of group MON (below) and pass there.

## How to run it

Everything runs from the repository root. It never writes into `legacy/`, `baseline/` or `release/`.

```
node tests/t0/walkthrough-guard.spec.mjs --dist baseline/dist            what production serves today (reconstructed source of live deploy 6abd6d62)
node tests/t0/walkthrough-guard.spec.mjs --dist legacy/dist              the downloaded deploy 6aa16d61 (the star overlay is still in its index.html)
node tests/t0/walkthrough-guard.spec.mjs --dist release/R0/dist          a built train: R0, R1a, R1b, R1c (python tools/t0/build.py --train R1c first)
node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --filter 'WG-0[3-6]'     some tests (regex on the id)
node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --stars require   the Monuments toolbar button MUST draw markers (automatic when version.json lists group MON)
node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --no-real-google  skip the one run that loads the real Google Street View frame (offline machines)
node tests/t0/walkthrough-guard.spec.mjs --dist <tree> --shots           screenshots and the visible text into tmp/walkthrough-guard/shots/<tree>/
node tests/t0/walkthrough-guard.mutants.mjs [--only M04,M06] [--list]    the red-first proof (about 8 minutes)
```

* Ports: `T0_PORT_BASE` (default **8920**; the server takes the base, Chrome the next nine). Scratch folder / Chrome profiles: `T0_AGENT` (default `walkthrough-guard`, so `tmp/walkthrough-guard/`). Both can be overridden for a parallel run: `T0_PORT_BASE=8800 T0_AGENT=my-run node ...`.
* Chrome: system Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`, `T0_CHROME` to change), headless, run with Chrome 155.0.8059.27.
* Mapbox: tiles go through the harness (owner token with the production Referer, `tests/t0/lib.mjs`). One process uses **147 to 173 of the 300-request cap** (the animated map loads once with real tiles, the Walkthrough map loads with real tiles for its first open, everything else runs with tiles blocked). Do not run two copies against the same cap at the same time of day without need.
* Google: the Street View frame is answered by a local stub in every test except `T0-WG-12`, which loads the real embed (4 Street View frame loads: stops 1, 2, 8, 16) and checks the console.
* Servers: `tools/t0/serve.mjs` (Netlify-like caching) for every tree; for a tree that has `_headers`, `_redirects` and `netlify.toml` (R1c) the generated-config emulator `tools/t0/config/emulate.mjs`, so R1c is served with the `Permissions-Policy` it ships with. That is an emulation of Netlify's documented rules, not Netlify itself.
* Time: 80 to 140 seconds of test time per tree (roughly 3 to 4 minutes wall clock with browser start-up and the 16-stop fly-through).
* Exit code 0 when no test failed (skips are not failures), 1 otherwise. Result file: `tmp/<T0_AGENT>/test-walkthrough-guard-<tree>.json` (or `--out <file>`); the spec never writes into `release/`, `baseline/` or `legacy/`, so it can run against `release/<train>/dist` while the integrator is working.
* If a train may be rebuilt while the guard runs, run it on a copy: `cp -r release/R1c/dist tmp/walkthrough-guard/trains/R1c/dist` and pass that path. The matrix below was taken from copies of the trains built at 18:25-18:26 on 2026-10-04 (release ids R0 `54e21b2e`, R1a `a267d0ed`, R1b `3a00b7d6`, R1c `2531699e`; `release/` still held the same ids when the runs ended).

## What each test checks

| id | what it checks | needs |
|---|---|---|
| `T0-WG-01` | **Fingerprint.** `d2` (the 16 tour stops) and `_A` (the 512 monuments) are read out of the entry bundle with the acorn parser and compared with legacy's: count, ids 1..16, names in order, coordinates, Street View pano/location/heading, NPS video links, every narration paragraph; sha256 of the canonical JSON pinned (`31149cea...` tour, `0204397d...` monuments); 457 Union / 40 Confederate / 15 Other, 24 groups. A patch that touches the data trips it. | no browser |
| `T0-WG-02` | The Walkthrough code is in the bundle (container id `gtbg-wt-map`, sources `wt-stops` / `wt-mons`, layers `wt-stops-circle` / `wt-stops-num` / `wt-mons-dots`, `satellite-v9`, the embed URL, labels, the two `flyTo` calls, the toolbar `title:"Monuments"`); `data/monuments.json` (the star data, 9 entries, 8 on screen at 1440x900) equals legacy's. | no browser |
| `T0-WG-03` | Toolbar button opens it (and is not covered, `elementFromPoint`): header, 16 stops in order, stop 1 highlighted, tabs, "Tour Stop 1 / July 1, 1863 / McPherson Ridge", the 3 narration paragraphs, the Street View iframe (host and path, `pano` / `heading=343` / `pitch=0` / `fov=90`, `title`, `allowfullscreen`, **`allow`**), "Open in Google Maps" (href, `_blank`, `noopener noreferrer`), the NPS video link; floating layers over the Walkthrough; every control hit-testable. | Chrome |
| `T0-WG-04` | The tour map: two maps in the DOM, container id, the three layers, 16 stop features whose ids, names and `[lng, lat]` equal the dataset, 512 monument dots, opening camera `[-77.235, 39.812] z13`, **14 stop markers drawn** at 1440x900 (rule: 11 to 16, via `queryRenderedFeatures`), the attribution control, the two checkboxes toggle the layers. | Chrome, tiles |
| `T0-WG-05` | **All 16 stops**, starting from 16 and counting down: highlighted chip, label, day badge, first narration paragraph, Street View query, iframe title, both links change; the map flies there (centre within 25 m, zoom 14) and the stop's own marker is drawn under the centre. | Chrome |
| `T0-WG-06` | **Monuments tab (desktop).** "SHOWING 100 OF 512 MONUMENTS", the cap message "(412 hidden)", the first 100 cards in dataset order, 100 "View on map" links; search for Alabama (2), Vermont (8), 20th Maine (2), CSA and "last surviving Union veteran" (honors-only text), a no-match string, case-insensitive; chips Union 457 / Confederate 40 / Other 15 with the right chip active; Union + "Maine"; group select (25 options; Vermont, Confederate States, Other Monuments); the link opens `google.com/maps/search/?api=1&query=lat,lon` in a new tab with `noopener noreferrer` and does **not** fire the card click; clicking a card flies the Walkthrough map to the monument at zoom 16; the Tour Stops tab remembers the stop. | Chrome |
| `T0-WG-07` | **Back, no leaks.** Three open/close cycles: after each there is one `.mapboxgl-map`, the same number of canvases, the same number of **live and connected WebGL contexts** (a page-side `getContext` tracker; `isContextLost()`), the animated map keeps its camera and still answers (real drag and wheel where the tree lets the map receive them, always `jumpTo`). | Chrome, tiles |
| `T0-WG-08` | **Keyboard.** Enter on the toolbar button opens it; from Back the Tab order is Back, two checkboxes, the map, Mapbox link, Tour Stops, Monuments, stops 1..16, Google Maps link, NPS link; Enter on stop 5 selects it; Esc closes it. With group AX: focus moves into the dialog, 44 Tabs never leave it, Shift+Tab from Back stays inside, focus returns to the opener after Esc. | Chrome |
| `T0-WG-17` | **Narrowing the window while it is open.** Desktop session: open, select stop 3, shrink the window to 700 wide (the Walkthrough swaps to its phone layout), widen it again to 1440. Must hold everywhere: it stays open, the stop, the stop list and the narration stay, no error; Back leaves one map and the same live WebGL contexts; opening it again gives a live map. Not held anywhere today: the tour map itself is dead after the swap (0x0 on a removed container, it does not come back when the window is widened). Reported as a SKIP naming the defect; `--strict-resize` makes it a FAIL. | Chrome, tiles |
| `T0-WG-16` | **Visible text.** `innerText` of the Walkthrough root for stop 1, stop 16, Monuments default, a search and a chip + group is hashed and equals legacy's word for word (the back link is replaced by a token first). | Chrome |
| `T0-WG-09` | **Phone 375x812.** Tools sheet, "Virtual Walkthrough" tile by real touch, the phone branch (title, back label, 16 stops, map in a 38vh box with its container id, stop markers drawn), stops 1, 2, 9, 16 fly the map, Monuments tab (`N monuments`, `+ 412 more. Refine your search.`, no group select, Vermont 8, Confederate 40, Union 457 / 357 more), Back leaves one map and the same live contexts, no horizontal scroll. Trees without group C have no tile: SKIP naming the tiles they do have. | Chrome, touch |
| `T0-WG-10` | The same at 812x375 (landscape phone; stops 1 and 16). | Chrome, touch |
| `T0-WG-11` | **Layout at 320x568, 375x812, 768x1024, 1440x900:** no horizontal scroll, root not wider than its box, no text outside the window, no truncated button or heading, Back / tabs / stops inside the window, Street View frame not wider than the window, stop 16 reachable by scrolling and selectable, and (SHELL) no control covered by another element. Trees without C reach the Walkthrough through the desktop layout (programmatic click when the toolbar crowds the button; recorded). | Chrome |
| `T0-WG-12` | **Console with the real Google embed and real tiles.** Opens, waits for the real frame to load, visits stops 2, 8, 16, the Monuments tab, a search, Back. Fails on any first-party `pageerror` / `console.error` and on a first-party response >= 400. Google's own messages are listed with counts, not ignored silently (below). With CP and the generated `Permissions-Policy` Google must log **nothing**. | Chrome, tiles, network |
| `T0-WG-13` | **The Monuments toolbar button.** The 🗿 button shows markers on the animated map, a second click hides them, a third shows them again. Legacy's own mechanism: exactly the 8 stars (Pennsylvania, New York, Indiana, Soldiers' National, Virginia, North Carolina, Louisiana, Georgia) at 1440x900. Any other implementation: at least 1. No markers: SKIP with the known-regression text (FAIL with `--stars require`, with legacy, or when group MON is in `version.json`). | Chrome |
| `T0-WG-14` | **Markers follow the map.** Coordinate-agnostic: after a pure pan every marker that stays in view moved by the vector the map moved, after a zoom by the scale about the canvas centre (3 px tolerance), for a DOM overlay, Mapbox markers, SVG stars or a map layer alike. SKIP on `legacy/dist` (its overlay is screen-fixed by design). | Chrome |
| `T0-WG-15` | **Markers and Walkthrough.** With markers on: Back and the stops are not covered, nothing of the markers is drawn over the open Walkthrough (`elementFromPoint`), a window resize while it is open (1440x900 -> 1300x860 -> 1440x900) displaces nothing, Back shows the same markers. | Chrome |
| `T0-WG-X` | The shared desktop session ended with 0 uncaught exceptions and 0 first-party `console.error`. | |

## The rule for intended differences

Every assertion holds on every tree except the differences below, which a patch group introduces on purpose. They live in one object (`CAP`, from `version.json` `groups`) and each test asserts the exact intended state for the tree it runs on, so a train that has the group must show the change and a train without it must not. A difference that is not in this table fails the guard.

| capability | what differs | trees | patches (`tools/t0/patches/`) | classification |
|---|---|---|---|---|
| A | the Walkthrough map has Mapbox's attribution control (legacy: none, against the Mapbox terms) | R1a, R1b, R1c | `A:A-wt-attribution` | intended |
| A | the animated map can be panned and wheel-zoomed (legacy, baseline, R0: the z-index 10 unit canvas swallows pointer events; not a Walkthrough defect, but `T0-WG-07` would otherwise test legacy's own bug) | R1a, R1b, R1c | group A | intended (verifier finding) |
| C | phone Tools sheet: "Virtual Walkthrough" tile instead of "NPS Auto Tour"; the dead "Monuments" tile is gone; the phone Walkthrough gets its map (container id) | R1b, R1c | `mob:HF-5c`, `HF-6a`, `HF-6b`, `HF-6m` | intended |
| AX | Walkthrough is a named modal dialog; focus moves in, Tab trapped, focus returns to the opener; search fields have aria-labels; higher contrast of chip number, day badge, star swatch | R1b, R1c | `AX-walkthrough-*`, `a11:H-mon-search-*` | intended |
| CP | back link "← Back to the map" (was "← Back to Animated Map" / "← Animated Map"); Street View iframe `allow="accelerometer; gyroscope"`; with the generated `Permissions-Policy` Google no longer logs its accelerometer error | R1c | `cp:b13`, `cp:b14`, `cp:walkthrough-streetview-allow`, `tools/t0/config/gen.mjs` | intended |
| SHELL | the Extra Features and Ask the Historian pills no longer float over the narration text (and, on a narrow window, over the tabs) | R1b, R1c | group SHELL | intended |
| (none) | **monument star markers on the Monuments toolbar button: only `legacy/dist` has them** | baseline, R0, R1a, R1b, R1c lack them | production's `index.html` of deploy 6abd6d62 | **REGRESSION against legacy, already known; owner decision 1: unintentional, restore (group MON)** |

## Results matrix (2026-10-04, headless Chrome 155.0.8059.27, Windows 11)

`pass` / `skip` / `FAIL`. Skips are by design and say why in the result file.

| test | legacy | baseline | R0 | R1a | R1b | R1c |
|---|---|---|---|---|---|---|
| T0-WG-01 dataset fingerprint | pass | pass | pass | pass | pass | pass |
| T0-WG-02 code and star data in the bundle | pass | pass | pass | pass | pass | pass |
| T0-WG-03 desktop open | pass | pass | pass | pass | pass | pass |
| T0-WG-04 tour map and markers | pass | pass | pass | pass | pass | pass |
| T0-WG-05 all 16 stops fly | pass | pass | pass | pass | pass | pass |
| T0-WG-06 Monuments tab | pass | pass | pass | pass | pass | pass |
| T0-WG-07 Back, no leaked map | pass | pass | pass | pass | pass | pass |
| T0-WG-17 resize across 860 px while open | skip (known defect, below) | skip | skip | skip | skip | skip |
| T0-WG-08 keyboard | pass | pass | pass | pass | pass | pass |
| T0-WG-16 visible text identical | pass | pass | pass | pass | pass | pass |
| T0-WG-09 phone 375x812 | skip (no phone entry) | skip | skip | skip | pass | pass |
| T0-WG-10 phone landscape | skip (no phone entry) | skip | skip | skip | pass | pass |
| T0-WG-11 layout 320/375/768/1440 | pass | pass | pass | pass | pass | pass |
| T0-WG-12 real Google embed, console | pass | pass | pass | pass | pass | pass |
| T0-WG-13 Monuments button markers | pass (8 stars) | skip (none) | skip (none) | skip (none) | skip (none) | skip (none) |
| T0-WG-14 markers follow the map | skip (screen-fixed by design) | skip (no markers) | skip | skip | skip | skip |
| T0-WG-15 markers vs Walkthrough | skip (legacy defect, below) | skip (no markers) | skip | skip | skip | skip |
| T0-WG-X console of the session | pass | pass | pass | pass | pass | pass |
| total | 13 pass / 5 skip | 12 pass / 6 skip | 12 pass / 6 skip | 12 pass / 6 skip | 14 pass / 4 skip | 14 pass / 4 skip |
| Mapbox requests of 300 | 148 | 148 | 147 | 150 | 171 | 173 |

Observed differences between the columns, all classified (nothing outside the intended table above):

* Walkthrough map attribution control: absent legacy..R0, present R1a..R1c (A, intended).
* Real drag moves the animated map: 0 m on legacy, baseline, R0; about 870 m on R1a..R1c (A, intended).
* Pills over the Walkthrough at 1440x900: `div#extra-features` (Ask the Historian + Extra Features, z 999999, 403x39 at 1023,431) sits on the narration text on legacy..R1a; none on R1b, R1c (SHELL, intended). At 320x568 on legacy..R1a the same pills cover the **Tour Stops and the Monuments tab** (hit test: the tab centres are not on top; also visible in `--shots`); R1b and R1c hide the pills while the Walkthrough is open. In the desktop layout on a 375 or 320 wide window (the only way to reach the Walkthrough on a phone before group C) the toolbar button is covered by another button or off screen, so a visitor cannot click it there.
* Focus: after opening, focus stays on the toolbar button behind the overlay (legacy..R1a) or moves into the dialog (R1b, R1c); 20 of 44 Tab presses leave the Walkthrough on legacy..R1a, 0 on R1b, R1c; after Esc focus falls to `body` (legacy..R1a) or returns to the opener (R1b, R1c) (AX, intended).
* Phone Tools sheet: legacy..R1a list "Monuments" (a dead tile; by code reading its action is `pi(!An)`, which toggles the onboarding modal, not exercised in a run) and "NPS Auto Tour" and have no Walkthrough tile; R1b, R1c have the Walkthrough tile and "Ask the Historian", and neither "Monuments" nor "NPS Auto Tour" (C, intended; the owner's decision 1 asks for a phone Tools tile for the restored Monuments feature).
* Console with the real Google frame: legacy..R1b log Google's own `Permissions policy violation: accelerometer is not allowed in this document` (maps.googleapis.com; 11 messages in the run; Chrome also prints a `deviceorientation` warning, which the harness does not collect); R1c served with its generated headers logs none (CP + `Permissions-Policy`).
* Back label: "Back to Animated Map" / "Animated Map" until R1b, "Back to the map" on R1c (CP, intended).

No test failed on any tree. No train breaks the Walkthrough or the Monuments tab as far as the checks above can see.

### Findings the owner should know about (none is caused by a train)

1. **The monument stars are gone on every tree except `legacy/dist`.** Clicking the 🗿 button on the live site does nothing visible. This is the known loss (`docs/baseline-drift.md` section 5, owner decision 1). `T0-WG-13` reports it as a SKIP on every baseline-built tree with the text "KNOWN REGRESSION against legacy"; it turns into a FAIL with `--stars require`, and automatically when `version.json` lists group `MON`.
2. **Legacy's overlay would break after a resize while the Walkthrough is open.** `renderMarkers()` measures `document.querySelector('.mapboxgl-map')`, which is the Walkthrough's map while it is open, so the 8 stars come back displaced by 370 px (verified on legacy and on a scratch copy of the baseline with legacy's script, prototype S1). `T0-WG-15` skips this on `legacy/dist` and fails on any other tree that shows it: the restored version must not have the defect.
3. **Narrowing the window below 860 px while the Walkthrough is open kills its map, on every tree including `legacy/dist`** (`T0-WG-17`, measured: the map container is detached and 0x0 afterwards and widening the window does not bring it back; closing and reopening the Walkthrough gives a live map; no error, no leaked WebGL context). By code reading the component picks its desktop or phone layout from `window.innerWidth <= 860` on every resize but creates the map only once. A desktop visitor who drags the window narrow, or a tablet that rotates across 860 px, meets it. Not caused by any train; not fixed by any train; group C only gives the phone layout its container id. Candidate for a later train (create the map in an effect that depends on the layout).
4. Pre-existing defects of production that the guard sees and that a train fixes (so they are not regressions): pills over the narration (SHELL), no focus management or Back/Esc focus return (AX), the phone branch of the Walkthrough never creates its map on a tree without group C, the phone shell has no Walkthrough entry before R1b, the animated map cannot be panned before R1a.

### Honest limits (not verified)

* Chrome 155 headless on Windows only. No real phone, no iOS Safari, no Firefox, no Android Chrome, no screen reader. Phone runs are Chrome's touch and device emulation with real CDP touch events.
* Google is stubbed in every run except `T0-WG-12`; that run is one machine, one network, 4 frame loads, from `127.0.0.1` (the embed key accepted it; it is not the production origin). Google's Street View tile server (`streetviewpixels-pa.googleapis.com`) answered 503 to a tile request in one R1c run (listed in its result as third-party noise; the rerun was clean), and a `Failed to load resource ... 503` of unrecorded URL appeared once earlier in a legacy run. The guard treats 429/5xx from Google hosts as third-party noise and prints the URL of every other error, so a first-party 4xx/5xx still fails and is traceable. The check that R1c logs no sensor policy message counts only `Permissions policy violation` messages, not these 503s.
* Mapbox runs with the owner's token and the production Referer through the harness; styles and tiles are Mapbox's. With tiles blocked (most tests) the animated map's style never loads, so those tests do not exercise it; the one test that needs the animated map (`T0-WG-07`) and `T0-WG-13..15` use the shared session whose map loaded with real tiles.
* The R1c column used the generated-config emulator, not Netlify: it models the documented header rules and nothing else (see the honesty block of `tools/t0/config/emulate.mjs`). Whether Netlify applies the same `Permissions-Policy` to `/` is only provable on a real deploy or on staging (`ops/staging-verify.mjs`).
* The visible-text pin (`T0-WG-16`) and the dataset pins are taken from `legacy/dist`; the pins of the fingerprint test would have to move if the owner decides to change a stop or a monument on purpose.
* `T0-WG-14` and `T0-WG-15` have been proven on scratch prototypes (legacy's script, a tracking DOM overlay, a Mapbox circle layer) and on the monuments agent's scratch build of group MON, which is not registered in `trains.json` and not in `release/`; they have not run on a built, registered train because none contains MON yet.
* The test cannot see what a visitor cannot see: for example Street View's own content inside the Google frame.
* Not covered: rotating a real phone while the Walkthrough is open (the 860 px swap is covered by `T0-WG-17` on a desktop window only), the NPS video page itself, the browser's own back/forward buttons, very long sessions, and screen-reader output.

## Red-first proof (`walkthrough-guard.mutants.mjs`)

Each mutant is a scratch copy of `baseline/dist` (or of the R1c snapshot) with ONE defect; the listed tests must fail on it. The unmutated trees pass the same filters (the matrix above).

| id | the defect injected | must fail | failed | must pass | result |
|---|---|---|---|---|---|
| M01 | stop 8 (Little Round Top) moved 55 m | 01, 04, 05 | 01, 04, 05 | - | red as required |
| M02 | stop 3 renamed "Oak Hill" | 01, 03 | 01, 03 | - | red as required |
| M03 | the stop list shows 15 stops instead of 16 (desktop and phone branch) | 03 | 03 | - | red as required |
| M04 | the Monuments list is capped at 50 instead of 100 (desktop) | 06 | 06 | - | red as required |
| M05 | the monument search looks at names only (not "honors") | 06 | 06 | - | red as required |
| M06 | the Walkthrough map is not removed when it closes (leaked WebGL context) | 07 | 07 | - | red as required |
| M07 | the Back button does nothing | 07 | 07 | - | red as required |
| M08 | selecting a stop no longer flies the map | 05 | 05 | - | red as required |
| M09 | the Street View iframe points to /maps/embed/v1/place | 02, 03 | 02, 03 | - | red as required |
| M10 | a fixed layer covers the Back button (like a pill that floats over the page) | 03 | 03 | - | red as required |
| M11 | data/monuments.json (the star data) loses a coordinate digit | 02 | 02 | - | red as required |
| M12 | monument 1 renamed "Alabama State Memorial" | 01, 06 | 01, 06 | - | red as required |
| M13 | a console.error is logged whenever the Walkthrough opens | 03 | 03 | - | red as required |
| M14 | the visible narration of stop 1 loses a word | 01, 03, 16 | 01, 03, 16 | - | red as required |
| S1 | legacy's screen-fixed star script put back on the baseline (the stars appear, but they do not follow the map and a resize with the Walkthrough open displaces them) | 14, 15 | 14, 15 | 13 | red as required |
| R01 | R1c: the phone Tools tile "Virtual Walkthrough" is gone | 09 | 09 | - | red as required |
| R02 | R1c: the Street View iframe lost its allow attribute | 03 | 03 | - | red as required |

**17 of 17 mutants turned the guard red as required** (run of 2026-10-04, `tmp/walkthrough-guard/mutants/summary.json`).

S1 is in the harness and proves the star tests can fail: legacy's own script on the baseline draws the 8 stars (`T0-WG-13` passes) but they do not follow the map (`T0-WG-14` FAIL, 8 of 8 markers did not move with the map) and a resize with the Walkthrough open displaces them by 370 px (`T0-WG-15` FAIL). The green path of `T0-WG-13..15` was proven on two scratch prototypes that are not committed (`tmp/walkthrough-guard/proto/S2` and `S3`, built from `baseline/dist` by throw-away scripts, test-only code and not a patch group; they were written before the real group MON was available): **S2** a tracking DOM overlay and **S3** a Mapbox circle layer `gt-monuments-dots` on the animated map (kind `map-layer`); `T0-WG-13`, `14` and `15` all pass on both.

### The guard on the scratch build of group MON (not part of the matrix)

The monuments agent's scratch build `tmp/monuments-restore/mon-R1c` (release `2d5e740d`, R1c + group MON: `gtmon-dots`, `gtmon-glow`, `gtmon-ring`, `gtmon-stars` layers on the animated map, a phone "Monuments" Tools tile) was copied and run through the guard: **17 pass / 1 skip / 0 FAIL** (`T0-WG-17` is the known pre-existing defect that every tree has). The 🗿 button shows 415 features in 4 layers at the opening view (410 on screen), they stay where the map moves them after a pan (392 of 392), a zoom in (247 of 247) and a zoom out (410 of 410), nothing of them is drawn over the open Walkthrough, a resize with the Walkthrough open displaces nothing, and every Walkthrough test passes: the Walkthrough, its 512-monument tab and its text are untouched by group MON. The phone Tools sheet there lists both "Monuments" and "Virtual Walkthrough". An earlier run of `T0-WG-15` on this build failed on ONE marker; that was an artefact of the test (a marker exactly on the window edge, where `elementFromPoint` answers null), fixed in the spec, not a defect of MON.

## Wiring into the runner (proposal, not done here: `tools/t0/run_suites.mjs` belongs to the integrator)

```js
const WGD = 'tests/t0/walkthrough-guard.spec.mjs';
add('walkguard.baseline', 'Walkthrough + Monuments guard on baseline/dist (what production serves)', NODE, [WGD, '--dist', 'baseline/dist']);
add('walkguard.legacy', 'Walkthrough + Monuments guard on legacy/dist', NODE, [WGD, '--dist', 'legacy/dist']);
for (const t of ['R0', 'R1a', 'R1b', 'R1c']) add(`walkguard.${t}`, `Walkthrough + Monuments guard on ${t}`, NODE, [WGD, '--dist', D(t)]);
add('walkguard.mutants', 'the guard turns red on 17 deliberately broken copies', NODE, ['tests/t0/walkthrough-guard.mutants.mjs'], { kind: 'check' });
```

Each tree uses 147-173 of its own 300-request Mapbox cap; give the runner its own `--port-base` (the guard takes the base and the nine ports after it).

## For the author of group MON

* `T0-WG-13..15` do not care how the markers are drawn (DOM overlay inside the animated map's container, Mapbox markers, SVG stars, or a layer of the animated map whose id contains `monument`, `star` or `gtmon`). They only look at what is on screen, at the 🗿 button (`button[title="Monuments"]`) and at the animated map's camera.
* They expect: first click shows at least one marker on screen at the opening view, second click hides all of them, third shows them again; markers follow pan and zoom; no marker is drawn above the open Walkthrough; a resize while the Walkthrough is open displaces nothing.
* The Walkthrough's own layers (`wt-stops-*`, `wt-mons-dots`) and map are excluded from the search for markers.
* When `version.json` lists `MON` the guard runs with `--stars require` by itself. `T0-WG-01`, `-02`, `-06`, `-16` pin the Walkthrough's data and text: if MON adds the 20 story markers to the Monuments **tab** instead of only to the map, those pins must be moved on purpose.
* The phone Tools sheet is only asserted to have the Walkthrough tile (group C); a restored Monuments tile does not trip anything.
