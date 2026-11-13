# SITE-PLACES-NOTES: the site's monuments and tour stops in the theatre (OA01)

Owner addition OA01: "read-only reuse of the 16 tour stops and 512 monuments as camera bookmarks". This note says where the site's data is, what the theatre did with it before, what the two added modules do, what rests on what evidence, what was run and what was not.

Files (all under `docs/battle-theatre/app`): `src/ext/monuments.mjs` (later memorials: the layer, the panel, the card), `src/ext/tour.mjs` (the 16 tour stops as camera bookmarks), `src/ext/site-places.mjs` (pure rules, words and checks; runs under node), `src/ext/index.mjs` (the list the shell loads; the other lane of the workstream adds its own entries), `data/site-memorials.json`, `data/site-tour-stops.json` (read-only copies of the site's data), `tests/ext-site-source.mjs` (reads the site, writes the two copies, detects drift), tests `ext-monuments.test.mjs`, `ext-tour.test.mjs`, `ext-site-data.test.mjs` (stand-ins in `ext-site-places-lib.mjs`), and the browser harness `ext-site-places-browser.mjs`. Gate hooks: `docs/GATE-HOOKS.md`. Proposed register entries: `GOVERNANCE/horde/ws-world/proposed-register/ws-world-EG-MON-01..03.md`. Delegated decisions: DD-WORLD-01..04 in `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md`.

## 1. Where the site's data is, and why the theatre "showed" 77 of 512 and 2 of 16

The main site keeps its data as literals inside its entry bundle and in one small file; nothing is in `data-src/` as a separate monument file (`data-src/legacy-manifest.tsv` and `data-src/build/data-manifest.json` only pin the hash of the one file that is).

| data | where | count | hash |
|---|---|---|---|
| tour stops | literal `d2` in `assets/index-*.js` of every site tree (`baseline/dist`, `legacy/dist`, every `release/*/dist`, R1g included) | 16 | canonical JSON sha256 `31149ceaa519…` (pinned by `tests/t0/walkthrough-guard.spec.mjs`) |
| monuments, memorials, markers, tablets | literal `_A` in the same bundle | 512 | `0204397d5ccc…` (same guard) |
| second list of state memorials | `data/monuments.json` of every tree | 9 | `c23ef400f626…` (pinned in `data-src/legacy-manifest.tsv` and `data-src/build/data-manifest.json`) |

All ten trees of this checkout hold the same three datasets (checked by `node app/tests/ext-site-source.mjs`). The shell already read them before this work: `data/site-bookmarks.json` (written by `app/tools/extract-site-bookmarks.mjs`) feeds the Views panel.

**The premise "the theatre shows 77 of 512 monuments and 2 of 16 tour stops" is the wrong way round.** The Views panel lists all 512 and all 16, and flies to 435 monuments and 14 stops. The 77 and 2 are the ones it disables as "outside the loaded ground": the loaded ground is 6,160 by 6,123 m, and the shell's rule `geo.inside(x, z, 0)` gives exactly 77 monuments and 2 stops (Tour Stop 2, Eternal Light Peace Memorial, 1,120 m beyond the north edge, and Tour Stop 3, Oak Ridge, 557 m beyond it). 27 of the 77 lie east (East Cavalry Field, the farthest 3,201 m), 45 north, 5 elsewhere. Nothing in the shell drops them for another reason. The new modules offer all of them; the 77 and 2 from the edge of the ground (section 4, DD-WORLD-02, gap ws-world-EG-MON-02). A request note to the Views owner asks that its own list use them too (`GOVERNANCE/horde/requests/world-content-views-beyond-ground.md`).

## 2. Read-only reuse and the drift check

`tests/ext-site-source.mjs` finds the two literals with the JavaScript parser (never by pattern over the data), projects each record to the fields a mark, a row or a bookmark needs, and writes `data/site-memorials.json` and `data/site-tour-stops.json`. Each file records the hash of the site's data it was read from (`source`), the pin it must equal, and the hash of its own contents (`copy`). What is left in the site: for a tour stop the walkthrough narration, the video link and the street-level image id and key; for the state memorials the note at the head of the file. A field of a monument the copy does not know stops the copy (a new field is a decision, not a silent loss).

* `node docs/battle-theatre/app/tests/ext-site-source.mjs` reports every tree, its hashes and whether the copies are current.
* `... --check` exits 1 when a copy differs from the site's data in any tree, when a tree differs from the guard's pin, or when the copy's own hash no longer matches its contents; each difference is a sentence.
* `... --write` rewrites the two copies from `baseline/dist` (refused when the trees disagree among themselves or with the pins). Nothing under `baseline/`, `legacy/`, `release/`, `data-src/` or `tests/t0/` is ever written: the only write calls of the file go to the two copies (a test reads the source to prove it).
* The pages also check, at start, that each file still holds the hash recorded with it (`crypto.subtle`; where an address gives no crypto the check is left out and the panel says so). A file that fails is not shown and the shell logs why.

## 3. The later memorials (`monuments.mjs`)

* **Off at every entry.** No canvas exists until the viewer switches the layer on or picks a memorial from the list; nothing is remembered between visits (no storage). The switch is titled "Later memorials (post-battle; not part of the 1863 scene)" (More drawer and under the structure switches of Views); the panel is "Later memorials" (More, then Later memorials).
* **Never part of the 1863 scene.** A memorial is a flat mark on the module's own 2D canvas over the picture (right under the shell's own overlay), never a scene object: no scene hook is registered (checked in the page: `host._hooks.length` stays 0), nothing changes at any minute of the scrubber (`sceneObjectsAt(t)` is `[]`; gate Q03). The camera never moves the clock.
* **Labelled.** While the layer is on, a notice stays on the picture ("Later memorials shown ... Put up after the battle: not part of the 1863 scene", with About and Hide). On a phone the shell hides its own legend and lays the left column out loose, so the notice is placed under the clock face (its height is read) and is never hidden while the layer is on. Every named mark reads "<name> · later memorial", the picked one adds "· N m beyond the loaded ground" when it is. The card says "Later memorial", carries the layer's tier pill (inferred), a "Post-battle" pill, and the year as an open-gap pill (Q23). The tier of a mark is the dashed outline and the shape beside every name, so it never depends on colour alone; the fill is the side the site's list gives; a memorial beyond the loaded ground is hollow.
* **All 512 can be found.** The panel searches name, honouree, place line, group and park number, filters by side, group and ground (all, on the loaded ground, beyond it), and lists in the site's order; a row flies there and opens the card. A tap on a mark picks it (the shell's own pick comes first and wins; a drag or a long press is not a tap); Escape puts the card away.
* **Positions.** The site's Monuments list for all 512; for the nine state memorials the site also lists in `data/monuments.json` (1 to 24 m apart), a choice in the panel (DD-WORLD-01). The year of dedication is not in the site's data: open gap ws-world-EG-MON-01.
* **Cost.** Off: nothing runs. On: one loop over the 512 positions when the camera moves (same camera, same marks: nothing is redrawn), a layout without allocation, a few canvas fills however many marks are in view, at most 12 names.

## 4. The tour stops (`tour.mjs`)

Each of the 16 stops is a camera bookmark in the panel "Tour stops". For the 14 stops on the loaded ground the camera stands at the viewpoint the site's walkthrough uses for the stop, 30 m up, and looks at the stop (the arithmetic of the shell's own `flyToLngLat`, tested equal for all 14, so the Views list and this panel never disagree); where the viewpoint and the stop are one place it looks along the walkthrough's heading. For the 2 beyond the ground the camera stands 60 m inside the edge, 220 m back from the nearest point of it and 140 m up, looks toward the stop, and the pin, the row and the announcement say how far beyond which edge it is. The only mark is one pin ("Tour Stop 8 · Little Round Top · modern tour stop"), shown while the stop is in view, with a close button. A stop is a stop of a modern tour: it is not an 1863 feature, nothing is drawn for it, and choosing it moves the camera only, never the clock (DD-WORLD-04); the day the site gives it is shown beside it.

## 5. Evidence and gaps

| what | basis | tier |
|---|---|---|
| names, honourees, place lines, positions of the 512 | the site's Monuments list as it stands, nothing corrected | inferred (503 of 512 positions state no source; 9 name a web listing) |
| every entry is later than July 1863 | what a monument, memorial, marker or tablet is (every name carries one of those words: checked) and Bachelder, Gettysburg: What to See, and How to See It (1889), pp. 21-22: "no material changes had been made on the field" when the first edition was compiled; "the position of each command is being marked by monuments" (quotations matched word for word in `tmp/library/ws9`, BACH-WHATTOSEE-1889, by a test) | inferred |
| the year each was put up | not in the site's data | open gap ws-world-EG-MON-01. The NPS Cultural Landscapes Inventories in `tmp/library/web/nps` print years for many named memorials (for example North Carolina State Monument 1929, Virginia Monument 1912-1917, 14th Connecticut position markers 1884); they are not yet matched to the 512 names (request note `ws-world-memorial-years-for-web.md`); a name that does not match exactly stays a gap |
| 77 memorials and 2 stops beyond the loaded ground | counts from the data against the terrain | ws-world-EG-MON-02 |
| the two lists of nine | both carried, the Monuments list first | ws-world-EG-MON-03 |
| tour stop positions and viewpoints | the site's list as it stands | inferred; the stop is a modern tour stop, not an 1863 feature |

## 6. What was run

See section 7 (written at the end of the work, with the numbers of that run).
