# bt-world-content, lane monuments and tour stops (OA01): status

Written 2026-11-13 by the first engineer of this lane, taken over and corrected 2026-11-14 00:10 UTC by the second. Only what was run is reported as run. Notes: `docs/battle-theatre/app/docs/SITE-PLACES-NOTES.md` (sections 1 to 6; section 6 is the record of what was run and what was not).

## What exists
* **The site's data, read-only.** The 512 monuments (`_A`), the 16 tour stops (`d2`) and the nine-row second list (`data/monuments.json`) are literals of the entry bundle of every site tree (`baseline/dist`, `legacy/dist`, `release/R0..R1g/dist`) and one small file; `data-src/` pins the hash of the small file and holds no monument list. Copies: `app/data/site-memorials.json`, `site-tour-stops.json`; reader, writer and drift check: `app/tests/ext-site-source.mjs` (`--check` exits 1 on drift). The shell's own copy for the Views list (`app/data/site-bookmarks.json`) records the same pinned hashes and agrees with the copies in every name, position and viewpoint (a test since 2026-11-14).
* **Later memorials** (`app/src/ext/monuments.mjs`, pure rules in `site-places.mjs`): all 512, off at every entry, flat marks over the picture, never a scene object, labelled post-battle on the switch, the notice, every name and every card; the year an open gap except for 33 memorials whose year a National Park Service inventory prints for the same name (`app/data/site-memorial-years.json`); 77 memorials beyond the loaded ground reached from its edge. Since 2026-11-14: a mark the ground hides from the camera is left out (the picked memorial never is) and a name is not put under a panel (top bar, dock, drawer, left column).
* **Tour stops as camera bookmarks** (`app/src/ext/tour.mjs`): all 16, 14 from the site's own viewpoint (the shell's own arithmetic), 2 from the edge of the ground; a pin labelled "modern tour stop"; the clock is never touched.
* Proposed register entries `proposed-register/ws-world-EG-MON-01..03.md`; delegated decisions DD-WORLD-01..06; gate hooks in `app/docs/GATE-HOOKS.md`; request notes to bt-renderer (Views list, room for added cards, README rows, tutorial text), bt-web (years) and bt-spec-health.

## Finding about the brief
"The theatre shows 77 of 512 monuments and 2 of 16 tour stops" is the wrong way round: the Views list shows all 512 and all 16 and flies to 435 and 14; the 77 and 2 are the ones it disables as outside the loaded ground (the shell's own rule gives exactly 77 and 2). Re-derived on 2026-11-14 from the files: the loaded ground is 6,160 by 6,123 m; 77 memorials beyond it (45 north, 27 east, 1 north-east, 2 north-west, 2 south; the farthest 3,201 m beyond the edge); Tour Stop 2 lies 1,120 m and Tour Stop 3 557 m beyond the north edge.

## Not done, owed
* Nothing was seen on a real GPU or a real phone; no frame time was measured; no WebGPU draw path (the marks draw on a 2D canvas, so there is none).
* The year of 479 memorials (open gap ws-world-EG-MON-01); positions of 503 memorials state no source (EG-MON-03); the loaded ground does not reach 77 places and 2 stops (EG-MON-02).
* The proposed register entries are not in `GOVERNANCE/register/` (the orchestrator files them); no gate was run and no `passes` flag was touched.
* Tutorial text, README rows and the Views change are requests to other owners, not done by this lane.
* The software-GL browser runs on the present sources (modes light, look, units of `app/tests/ext-site-places-browser.mjs`) are queued behind the machine lock: see section 6 of the notes for their result once a line there says they ran.
