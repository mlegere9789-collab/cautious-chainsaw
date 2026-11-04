# Deploy guide: release R1e (release id c2afeeda)

Two zips, both with the site files at the top level (no wrapper folder). Each has a checksum file next to it (`.sha256`) and a list of every file inside (`.files.tsv`).

| File | What it is | SHA-256 |
|---|---|---|
| `gettysburg-R1e-c2afeeda-STAGING-noindex.zip` | the test copy: identical, plus a "do not index" header so Google ignores it | `b1177af32f5343d971dae7bc7f70c0713036dcbdd6ee249b5acb282f67248ec5` |
| `gettysburg-R1e-c2afeeda-PRODUCTION.zip` | the real thing | `8b5503b82494cbe46dd0d18600d35ad8ea148a0e43737e43822d0f7227aea075` |

The two zips differ in one file only (`_headers`, one extra line in the test copy). Both hold 2,013 files.

**Netlify screens change names from time to time. Every Netlify label below is from memory and unverified. If a screen looks different, stop and ask.**

**Read this first.** The eight clean checks in a row have NOT been completed on this build, so nothing here says the build is accepted. What was done: the build was rebuilt from scratch and packed with identical results, the earlier releases still rebuild exactly as they were, and one full pass of the eight automatic checks was run on the production zip (2026-10-30). Seven of the eight checks came out clean in that pass; the input-timing check found two slow reactions on the desktop map screen (opening the Virtual Walkthrough and the Monuments button, each one 50 to 70 ms long step against a 50 ms limit; both exist in the previous test build too). Three other slow reactions found earlier (the Immersive sound button, the phone "Sources and licences" link, the phone map swipe and pinch start) were fixed or measured properly in this round. Details in the final report.

## What visitors will notice, compared with the site that is live now (deploy 6abd6d62)
- **Clock and dates.** Times and days are corrected across the site: the clock reads real times of day, July 1, 2 and 3, and the chronology data behind the events, stories and counts was corrected. "Culp's Hill Retaken" in Turning Points now lands on about 7:05 AM on July 2.
- **Monument layer restored.** Monuments show on the map again, and the Virtual Walkthrough and its Monuments tab work as before. Clicking a unit mark that sits on top of a monument dot now selects the unit.
- **New animation layer.** Units, events and stories now move and open cards on the map. The cards never stand on each other or on the controls. The old legend is replaced by one called **"What the marks say"**. Marks are no longer coloured by status; the Filter panel still filters by the eleven states.
- **1863 base map** underneath, with road names that now show reliably.
- **Faster on a phone.** On a simulated slow phone the first screen of the map settles in roughly a quarter of the time of the live site and of the previous test build (about 80 to 130 ms of waiting, against about 390 to 420 ms; the target is 200 ms). The map pages feel the same, only quicker.
- **Corrected casualty rates.** The 107th Pennsylvania now shows 255 men and a 64.7 % loss rate (it showed an impossible 135 %). The 6th US Cavalry shows no rate, with the reason given. The Regiment and Report pages never print a rate above 100 %.
- **Tidier pages.** Larger tap targets, readable text sizes, labelled form fields, and a layout that fits 1024 px screens and phones turned sideways.
- **Updated tutorial PDF (user guide).** Rebuilt for the new screens. The cover says "Updated October 2026".
- Developer pages stay removed, as in the previous test build.

## Before you start (2 minutes)
1. Open your real Netlify site, then **Deploys**. Write down the ID of the deploy marked **Published**. It should start with `6abd6d62`. That deploy is your undo button.
2. Pick a quiet time.

## Step 1: test on a throwaway site (15 minutes)
1. In Netlify, add a **new site by dropping a folder or zip** and drop the **STAGING** zip. Netlify gives it a random address ending in `netlify.app`.
2. The map will be blank on that address. That is expected: the Mapbox key only works on your real domain. This test proves the pages, headers and install, not the map.
3. Check that the pages open (`/regiment`, `/report`, `/turning-points`, `/search`), that the Help screen opens and that the user guide PDF downloads.

## Step 2: publish (5 minutes)
1. On your **real** site open **Deploys** and drop the **PRODUCTION** zip. It goes live immediately.
2. Do not add `netlify.app` to the Mapbox key.

## Step 3: look at it for 15 minutes, on a desktop and on a real phone
1. The map draws, road names appear, and no "Try again" box shows.
2. Press play; jump to Day 2 and Day 3. The dates read July 1, 2 and 3.
3. Click a unit, an event and a story star. The cards open without covering the controls or each other.
4. Open the legend: it reads "What the marks say".
5. Open Turning Points, "Culp's Hill Retaken": it lands on about 7:05 AM, July 2.
6. Open `/regiment` and search "107th Pennsylvania": 255 men, 64.7 %.
7. Open the Virtual Walkthrough and its Monuments tab. They work as before.
8. Open Help and the tutorial PDF. The cover has no release name.
9. On the phone: controls reachable, panels open and close, nothing sits on the map. Tap "Sources and licences" and "Enable Sound & Start" on Immersive and note whether they feel slow.
10. Look at the browser console for red errors.

## Rollback (2 minutes, free)
Deploys, click the deploy ID you wrote down (starts with `6abd6d62`), **Publish deploy**. That puts the site back exactly as it was.

## Honest limits
- Not done: the eight clean acceptance passes in a row. This build has not been through them.
- Known and open: the input-timing check still reports one 50 to 70 ms processing step when the Virtual Walkthrough or the Monuments button is opened for the first time on the desktop map screen (the second map or the monument symbols are drawn for the first time); the phone speed check was clean in the full run on this build, but one map page (`/ground-remembers`) has shown a rare slow load (about one in twenty to thirty loads went over the 200 ms target in earlier runs). Details: `docs/accept/R1E-FINAL-REPORT.md`.
- Never run on a real iPhone or Android phone, in Safari or Firefox, or on a real Netlify deploy.
- Decisions taken for you, with how to reverse each one: `docs/decisions/R1E-PROVISIONAL-DECISIONS-2026-10-22.md` and `docs/decisions/R1D-PROVISIONAL-DECISIONS-2026-10-22.md`.
- Differences from the live site that still wait for your yes (one yes covers all): `docs/accept/R1E-WAIVERS.md`.
- Open for you: the Mapbox credit line on the 1863 base map (a legal question), and the Walkthrough's map failing when the window is resized across 860 px while it is open (this is also true of the live site, and it was left alone on purpose).
