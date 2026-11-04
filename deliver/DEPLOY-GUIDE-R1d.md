# Deploy guide: release R1d (release id 753e318f)

Two zips, both with the site files at the top level (no wrapper folder):

| File | What it is | SHA-256 |
|---|---|---|
| `gettysburg-R1d-753e318f-STAGING-noindex.zip` | the test copy: identical, plus a "do not index" header so Google ignores it | `b1a1f3d7932273aedfddecbec0b8cc6d7bf1c2a807c7872a7fc1e4d8ecbf7f02` |
| `gettysburg-R1d-753e318f-PRODUCTION.zip` | the real thing | `61a12f34cc1d33cc948611586f4832c09fc4d8e5921b183d308225634573cec0` |

**Netlify screens change names from time to time. Every Netlify label below is from memory and unverified. If a screen looks different, stop and ask.**

**Read this first.** This build did not reach the eight clean checks in a row. The one measured failure is that on a slow phone the first page (the map) is slower to settle than the 200 ms target (the published site is also over it). Everything else I could test passed on the final zip, but it was tested in Chrome on one Windows machine only. You decide whether that is good enough to publish.

## Before you start (2 minutes)
1. Open your real Netlify site, then **Deploys**. Write down the ID of the deploy marked **Published**. It should start with `6abd6d62`. That deploy is your undo button.
2. Pick a quiet time.

## Step 1: test on a throwaway site (15 minutes)
1. In Netlify, add a **new site by dropping a folder or zip** and drop the **STAGING** zip. Netlify gives it a random address ending in `netlify.app`.
2. The map will be blank on that address. That is expected: the Mapbox key only works on your real domain. This test proves the pages, headers and install, not the map.

## Step 2: publish (5 minutes)
1. On your **real** site open **Deploys** and drop the **PRODUCTION** zip. It goes live immediately.
2. Do not add `netlify.app` to the Mapbox key.

## Step 3: look at it for 15 minutes, on a desktop and on a real phone
1. The map draws and no "Try again" box appears.
2. Press play; jump to Day 2 and Day 3. The dates read July 1, 2 and 3.
3. Click a unit, an event and a story star. The cards open without covering the controls.
4. Open Turning Points, "Culp's Hill Retaken": it lands on about 7:05 AM, July 2.
5. Open the Virtual Walkthrough and its Monuments tab. They work as before.
6. Open Help and the tutorial PDF. The cover has no release name.
7. On the phone: controls reachable, panels open and close, nothing sits on the map.
8. Look at the browser console for red errors.

## Rollback (2 minutes, free)
Deploys, click the deploy ID you wrote down, **Publish deploy**.

## Honest limits
- Not met: the phone blocking-time target on the first page, and eight clean acceptance passes in a row. Details: `docs/accept/R1-FINAL-REPORT.md`.
- Never run on real iPhone or Android, Safari, Firefox, or a real Netlify deploy.
- Some data-only checks owned by other workstreams are red and do not depend on these bytes.
- Decisions I took for you and how to reverse them: `docs/decisions/R1D-PROVISIONAL-DECISIONS-2026-10-22.md`.
