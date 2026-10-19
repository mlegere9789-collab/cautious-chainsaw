# Deploy guide: checkpoint zip R1c (release id 2531699e)

Two zips, both with the site files at the top level (no wrapper folder):

| File | What it is | SHA-256 |
|---|---|---|
| `gettysburg-R1c-2531699e-STAGING-noindex.zip` | the test copy: identical, plus a "do not index" header so Google ignores it | `2608766613794acaa337fd7c293ae4245e3a4ed5d763cd0c5841f931c357349f` |
| `gettysburg-R1c-2531699e-PRODUCTION.zip` | the real thing | `4b6799863d7f242edc4a2bea98be0028c2dbab214e66c621eb971e8e876d9452` |

**Netlify screens change names from time to time. Every Netlify label below is from memory and unverified. If a screen looks different, stop and tell me.**

## Before you start (2 minutes)
1. Open your real Netlify site, then **Deploys**. Write down the ID of the deploy marked **Published**. It should start with `6abd6d62`. That deploy is your undo button.
2. Pick a quiet time, Tuesday to Thursday morning US Eastern.

## Step 1: test on a throwaway site (15 minutes)
1. In Netlify, add a **new site by dropping a folder or zip** and drop the **STAGING** zip. Netlify gives it a random address ending in `netlify.app`.
2. Send me that address. I run the automatic checks (pages, headers, install).
3. **The map will be blank on that address. That is expected.** The Mapbox key only works on your real domain. So this test proves the pages, headers and install, not the map.

## Step 2: publish (5 minutes)
1. On your **real** site open **Deploys** and drop the **PRODUCTION** zip. It goes live immediately.
2. Do not run any Netlify command-line tools, and never add `netlify.app` to the Mapbox key.

## Step 3: look at it for 15 minutes, on a desktop and on a real phone
1. The page loads with no "Try again" box and the map draws.
2. Drag and scroll-zoom the map (this works now; it did not before).
3. Press play, then jump to Day 2 and Day 3. The dates read July 1, 2 and 3, never July 4–9.
4. Open a link like `…/?ancestor=…`, or a Turning Points link. It lands on the right moment.
5. On the phone: the controls are reachable, panels open and close, nothing sits on top of the map.
6. Press Tab on the desktop. You can reach the controls.
7. Open the Virtual Walkthrough, then its Monuments tab. They work as before.
8. Open Search and Help.
9. Open the Ask the Historian page and one other page.
10. Look at the browser console for red errors.

## Rollback (2 minutes, free)
Deploys, click the deploy ID you wrote down, **Publish deploy**. Then tell me.

## Honest limits
- **Not in this zip:** the restored monument markers (the Monuments button still does nothing, exactly as on the live site today), the corrected clock beyond the date fix, smoother animation, new trust pages, the new Historian data.
- **Never run on real devices or other browsers:** all testing was in Chrome on one Windows machine. Not tested: real iPhone or Android, Safari, Firefox, a real Netlify deploy.
- **Test suite:** 75 of 79 suite rows passed on this exact build. The four that did not run are the "red-first" proofs, which show the tests catch the old bugs. They do not test this build's behaviour.
- **Live check:** production was confirmed identical to what this build was made from (checked just before packing), so deploying does not undo any live change.
