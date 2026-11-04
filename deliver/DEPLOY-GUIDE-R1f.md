# Deploy guide: release R1f (release id 5f898a66)

Two zips, both with the site files at the top level (no wrapper folder). Each has a checksum file next to it (`.sha256`) and a list of every file inside (`.files.tsv`).

| File | What it is | SHA-256 |
|---|---|---|
| `gettysburg-R1f-5f898a66-STAGING-noindex.zip` | the test copy: identical, plus a "do not index" header so Google ignores it | `2aa0a1e028fb928d6901f4a4327603453c00444e76ac4892949eacf89c575122` |
| `gettysburg-R1f-5f898a66-PRODUCTION.zip` | the real thing | `a36f288381bd8e40f328ab4a1d1787355f378cfa54c10897ba8f7a86606e368c` |

The two zips differ in one file only (`_headers`, one extra line in the test copy). Both hold 2,013 files. Zips from earlier tries of this round carry the same file names but other checksums: use the checksums above.

**Netlify screens change names from time to time. Every Netlify label below is from memory and unverified. If a screen looks different, stop and ask.**

**Read this first.** The eight clean checks in a row have NOT been completed on this build, so nothing here says the build is accepted. The best run had one full clean pass (all eight automatic checks, zero problems) and then a second pass with one problem: a 51 ms step (limit 50 ms) when the 3D Terrain button on the Compare page is pressed with the keyboard. In the runs before it, single steps of 50 to 53 ms or one unusually slow page load stopped the passes, one at a time. Details and the list of what was fixed are in `docs/accept/R1F-FINAL-REPORT.md`.

## What visitors will notice, compared with the site that is live now (deploy 6abd6d62)
Everything in the R1e guide still applies (corrected clock and dates, restored monument layer, new animation layer with the legend "What the marks say", the 1863 base map with road names, much faster phone loading, corrected casualty rates, tidier pages, the updated tutorial PDF). On top of that, R1f adds:
- **Smoother first click on the Virtual Walkthrough and on Monuments** (desktop). The Walkthrough overlay appears first and its map a moment later; the Monuments dots appear first and the stars a moment after. The finished picture is identical to the previous build.
- **Smoother animation on a slow phone or computer.** The next frame of the unit marks is prepared in its own step instead of in the same step as the map drawing.
- **Watch Together:** pressing Host or Join twice quickly no longer leaves an error line in the browser console.
- `/ground-remembers`: its heat layer is added a moment after the map is ready (a little less waiting on a phone; the rare slow load is not removed).

## Before you start (2 minutes)
1. Open your real Netlify site, then **Deploys**. Write down the ID of the deploy marked **Published**. It should start with `6abd6d62`. That deploy is your undo button.
2. Pick a quiet time.

## Step 1: test on a throwaway site (15 minutes)
1. In Netlify, add a **new site by dropping a folder or zip** and drop the **STAGING** zip. Netlify gives it a random address ending in `netlify.app`.
2. The map will be blank on that address. That is expected: the Mapbox key only works on your real domain. This test proves the pages, headers and install, not the map.
3. Check that the pages open (`/regiment`, `/report`, `/turning-points`, `/search`, `/compare`, `/watch-together`), that the Help screen opens and that the user guide PDF downloads.

## Step 2: publish (5 minutes)
1. On your **real** site open **Deploys** and drop the **PRODUCTION** zip. It goes live immediately.
2. Do not add `netlify.app` to the Mapbox key.

## Step 3: look at it for 15 minutes, on a desktop and on a real phone
1. The map draws, road names appear, and no "Try again" box shows.
2. Press play; jump to Day 2 and Day 3. The dates read July 1, 2 and 3. Playback stays smooth, also at the fastest speed.
3. Click a unit, an event and a story star. The cards open without covering the controls or each other.
4. Open the Virtual Walkthrough (first click), then its Monuments tab and Back. Press the Monuments button on the map. Note whether the first click feels slow.
5. Open the Unit Roster. Note whether it opens at once.
6. Open the legend: it reads "What the marks say".
7. Open Turning Points, "Culp's Hill Retaken": it lands on about 7:05 AM, July 2.
8. Open `/regiment` and search "107th Pennsylvania": 255 men, 64.7 %.
9. Open Compare and press 3D Terrain on and off (mouse and keyboard).
10. On the phone: controls reachable, panels open and close, nothing sits on the map, `/ground-remembers` loads without a long pause.
11. Look at the browser console for red errors.

## Rollback (2 minutes, free)
Deploys, click the deploy ID you wrote down (starts with `6abd6d62`), **Publish deploy**. That puts the site back exactly as it was.

## Honest limits
- Not done: the eight clean acceptance passes in a row (best streak in this round: 1; count at the end: 0 of 8).
- Known and open: the Unit Roster's first opening and the Compare page's 3D Terrain switch each cost 35 to 51 ms in one step on this machine, which sometimes crosses the 50 ms limit by 1 to 3 ms; the rare slow load of `/ground-remembers` and, once in a while, of any map page on a busy machine. The ways forward are owner decisions listed in `docs/decisions/R1F-PROVISIONAL-DECISIONS-2026-10-31.md` (PK6, F7, A6).
- Never run on a real iPhone or Android phone, in Safari or Firefox, or on a real Netlify deploy.
- Decisions taken for you, with how to reverse each one: `docs/decisions/R1F-PROVISIONAL-DECISIONS-2026-10-31.md`, `docs/decisions/R1E-PROVISIONAL-DECISIONS-2026-10-22.md` and `docs/decisions/R1D-PROVISIONAL-DECISIONS-2026-10-22.md`.
- Differences from the live site that still wait for your yes (one yes covers all): `docs/accept/R1E-WAIVERS.md`.
- Held back for your decision: the search-engine markup round (`tools/t0/patches-next/PG-zseo.json`, 22 pages) is not part of this build.
- Open for you: the Mapbox credit line on the 1863 base map (a legal question), and the Walkthrough's map failing when the window is resized across 860 px while it is open (also true of the live site, left alone on purpose).
