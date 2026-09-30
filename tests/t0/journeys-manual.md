# Journeys by hand: what a person must check that no automated test can

For the site owner (and anyone helping test). WP-T0-18 documentation. The automated twins of Part A are the journeys `T0-J1..J8` in `tests/t0/journeys-desktop.spec.mjs` (real Chrome, real CDP mouse and touch events); this file is the by-hand mirror, plus the checks that need a real mouse, a real phone or a real Mapbox account. Chapter 02 sections 2 (X1-X5), 8.1 and 12 define them.

**Ground rules**
* Test the live site only in a Chrome profile with the RUM block on (`ops/RUM-hygiene.md` section 3). Staging never feeds RUM.
* **On staging (`*.netlify.app`) the Mapbox tiles answer 403, so the map background is blank.** That is expected. Judge map movement by the unit markers and the tick/zoom read-outs, not by imagery.
* Write results in the tables at the bottom of each part; send screenshots or a short screen recording for every "no". Say the browser and version (`chrome://version`) and the exact site address you tested.
* If a step needs a key: `?` opens Help, `Space` toggles play, `Esc` closes panels (from R1a), `2` and `3` jump to day 2 and 3 (from R1a).

---

## Part A: the smoke list (15 minutes per train, on staging and again on production after the deploy)

Open a **fresh Chrome profile or an Incognito window**, open DevTools (`F12`) > **Network**, set the filter to **Doc**, then load the address. Keep the **Console** tab visible (or reopen it after the load and look for red entries).

| # | Journey (automated twin) | Steps | What you should see, by train |
|---|---|---|---|
| A1 | **J1 load** (`T0-J1`, `T0-R0-01/02`) | Load the address once. Count the entries in the Network **Doc** filter for `/`. Watch the screen for 20 seconds. | **Today (legacy):** two Documents (the page reloads itself once) and an intro of about 3.5 seconds, then a "Choose your experience" box. **R0 and later:** ONE Document, no self-reload, no intro (the map shell appears first, the app after), no white flash, no "Try again" box, Console shows no red errors. The layout chooser still appears until R1b; from R1b phones get the mobile shell automatically. |
| A2 | **J2 play** (`T0-J2`, `T0-SND-01`, `T0-KEY-04`) | Pick Desktop if asked. Press Play, choose the fastest speed, watch 30 ticks go by, then press Pause; press Play then `Space`. | Tick number advances, units move, Pause stops it. **Today:** a sound control exists and freezes playback when used. **R1a and later:** no sound control anywhere; `Space` after clicking Play pauses once. |
| A3 | **J3 pan/zoom** (`T0-J3`, `T0-IN-01/02`) | Drag the map with the mouse; roll the wheel; (touch screens) pinch. | **Today:** unknown on a real mouse (Part B decides). **R1a and later:** dragging pans (unit markers slide), the wheel zooms both ways; on a phone (R1b) one-finger drag pans and pinch zooms. |
| A4 | **J4 select** (`T0-J4`, `T0-IN-03`) | Click a unit marker. Then press `Esc`. Then click empty ground. | Panel opens for that unit; `Esc` closes it and clears the selection (from R1a); empty ground clears. **Today on phones:** tapping a unit throws an error (fixed in R1a/R1b). |
| A5 | **J5 search** (`T0-J5`, `T0-KEY-01`) | Open Search (toolbar). Type `20th Maine`. Pick the result. Press `Esc`. | The unit panel opens for the 20th Maine; `Esc` inside the search box closes the search; typing a space or digits in the box does not start playback (R1a). |
| A6 | **J6 Help and Tools** (`T0-J6`, `T0-R0-05`) | Press `?` (Help). Close it. Open the Bookmarks panel. Open each Tools button in turn. | Help and Bookmarks open **without the page going blank or reloading** (R0's renamed chunks). On phones (R1b): all 14 Tools tiles respond, none is dead. |
| A7 | **J7 day jump** (`T0-J7`, `T0-CLK-01`, `T0-DATA-01/02`) | Press day tab 2, then 3 (and keys `2`, `3` from R1a). Then load `?tick=451` in a new tab. Note the date printed in the HUD and toolbar at ticks 1, 226, 451, 675. | **R1c and later:** data loads within about 2 seconds, units are drawn after every jump, dates read **July 1, July 2, July 3, July 3** at ticks 1/226/451/675 and never July 4-9. **Before R1c:** the date is two days ahead of the day tab and jumps can show an empty or stale map. After R0 alone, tick 1 shows 70-71 units (no longer the intro's accidental extra units): that is expected. |
| A8 | **J8 deep links** (`T0-J8`; the chapter also plans `T0-DL-01..05`, not present in the repo yet) | Load `/?ancestor=U-20ME`. Then `/?t=538&u=U-20ME&z=15.5&ll=39.7918,-77.2359`. Then `/?tick=9999` and `/?tick=abc`. | **Today:** `?ancestor=` can leave a white screen and other links land on tick 1. **R1a:** `?ancestor=` opens the Follow panel without a crash. **R1c:** the second link shows July 3 and the 20th Maine panel; the junk links stay at tick 1 with no error. |
| A9 | version and service worker (`T0-R0-08`) | Open `/version.json` in a tab. In DevTools > **Application** > **Service Workers** look at `/sw.js`. | **R0 and later:** `version.json` shows the release id you expect; one active worker; no "waiting" worker on a fresh profile. **Today:** `/version.json` is a 404. |
| A10 | headers (only if the probe was not run) | `node tests/t0/prod-probe.mjs --base <address> --train <train> [--staging]` | see `ops/RELEASE-RUNBOOK.md` section 12. |

Record:

| Date | Address | Train / rid | Browser + version | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | Notes / files |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | |

---

## Part B: the headed real-mouse test on the live site (register action 12a; also required before R1a, on the R0 site)

**Why:** automated browsers report that **0 mouse and wheel events reach the map** on the deployed site (a full-size canvas above the map has `pointer-events:auto`). That has only been measured headlessly. **A real mouse on the real site has not been tried.** If real dragging or wheel zoom fails, it outranks C1 (phones) as the first fix; if it works, the plan order stands.

Conditions: a normal desktop Chrome window (not remote desktop, not a device emulator), a **real mouse**, the RUM-blocked test profile (`ops/owner-console-actions.md` action 12b), address `https://gettysburginteractivemap.com/`, a screen of at least 1280 x 720, pointer over the map.

1. Load the page. If a box asks which experience, choose **Desktop**. Wait until the map has finished loading. A blank background is not a failure: the test is whether the map **moves**.
2. **Drag:** press and hold the left button on empty ground, move about 200 pixels, release. Did the map pan? Did the unit markers slide with it?
3. **Wheel:** put the pointer over the map and roll the wheel forward three notches, then back three. Did the zoom change each time?
4. **Click:** click one unit marker. Did a unit panel open?
5. **Right-drag or Ctrl-drag** (Mapbox rotate/tilt), optional: did anything change?
6. Press `?`: does Help open?
7. Screen-record steps 2 to 4 (Windows: `Win+G` Game Bar) or take before/after screenshots (`Win+Shift+S`).

| Step | Result (yes/no) | Evidence file | Browser + version | Date/time |
|---|---|---|---|---|
| 2 drag pans | | | | |
| 3 wheel zooms | | | | |
| 4 click selects | | | | |
| 6 Help opens | | | | |

Send the table to the AI. Repeat the same steps on the R0 site once R0 is live and again after R1a (the R1a ship gate: drag and wheel must be yes).

---

## Part C: real phones (R0 first-visit check; R1b device matrix; owner decision O-T0-9: who runs which phone and when, by 2026-10-24)

Devices named in the plan: **an iPhone SE-class iPhone (Safari)**, **one mid-range Android (Chrome)**, **Samsung Internet** (on a Samsung phone or any Android with it installed). Test on real mobile data and on Wi-Fi if you can. Clear the site's data before a first-visit check (Chrome: `chrome://settings/content/all` > search the site > delete; Safari: Settings > Safari > Advanced > Website Data > search > delete).

**C-R0 (before R0 ships; on staging and again on production): first visit**
1. Open the address. Time to first content with a stopwatch (from tap to text on screen).
2. Did the page **reload itself** (a flash, then the page again)? It must not. Did a white screen show before content? It must not.
3. Wait 30 seconds. Any "Try again" box? There must not be.
4. Pass = one load, no white flash, content on screen quickly (the lab target is first paint about 1 second; note your measured time; do not fail on the exact number).

**C-R1b (before R1b ships): mobile shell**, in portrait and landscape, on each device:
| # | Check | Pass if |
|---|---|---|
| C1 | Layout | the mobile shell is chosen automatically (no "Choose your experience" box); the map fills the screen; a transport dock with four buttons (play/pause, back, forward, speed) and a Tools button is visible |
| C2 | Touch | one-finger drag pans the map; two-finger pinch zooms; a tap on a unit selects it (panel visible, not hidden under another panel) |
| C3 | Tools | the Tools sheet opens; all 14 tiles respond (Help, Bookmarks, Map Layers, Virtual Walkthrough among them); the close button is easy to hit |
| C4 | Panels | Search, Filter, story, event and unit panels are visible and readable; the keyboard does not hide the search box (open Search, type) |
| C5 | Safe areas (iOS) | nothing hides under the notch, the home indicator or Safari's bottom bar (`dvh`, `env(safe-area-inset-*)`); rotate to landscape and back: the layout re-evaluates |
| C6 | Back-swipe | Safari edge-swipe back / Android back does not leave a broken state |
| C7 | Sizes | controls are at least about 44 px; text is readable (the smallest screens are 320 x 568 and 375 x 812) |

Record per device: model, OS version, browser and version, orientation, each check pass/fail, and a photo or short video for every fail and one for each pass of C1 and C3.

| Device | OS / browser | C1 | C2 | C3 | C4 | C5 | C6 | C7 | Evidence files |
|---|---|---|---|---|---|---|---|---|---|
| iPhone SE-class | | | | | | | | | |
| Mid-range Android | | | | | | | | | |
| Samsung Internet | | | | | | | | | |

---

## Part D: not covered by anything in the repository (known gaps)

Firefox and WebKit runs of the R0 suite (the plan lists them; nothing has run them); iOS service-worker upgrade (waiting worker after all tabs close) and the paint-observer fallback on Safari; screen-reader passes; real Mapbox tiles at scale; Lighthouse with production-Referer tiles (no runner in the repo yet); 30 days of RUM.
