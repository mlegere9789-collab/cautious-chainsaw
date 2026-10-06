# pitch-runs: the measurements made for PITCH.md

Everything here was run on 2026-10-06 on one machine (Windows 11, Chrome 155 headless, Node 24.19) and supports numbers in `../PITCH.md` marked "pitch runs", the byte sizes, the URL check and the re-run of the prototype's own tests. Nothing here changes the prototype, the verifier or the product.

## How the runs were made

The independent verifier's scripts (`../07-verify/`) write their results into `../07-verify/results/` and pictures into `../shots/verify/`. To leave those committed results untouched, the runs were made in a **scratch copy** laid out like the repository:

```
<scratch>/baseline/dist/                 copy of baseline/dist
<scratch>/docs/pitch/anim/07-verify/     copy of ../07-verify (results emptied) + scripts/x-*.mjs and scripts/v4-motion-style.mjs (saved there as v4-motion.mjs)
<scratch>/docs/pitch/anim/prototype/     copy of ../prototype
```

(`node_modules` is found by walking up to the repository's, so the scratch tree sat under `tmp/pitch-anim/pitch/` in the repository, which is git-ignored.) Ports 9720 to 9728 on 127.0.0.1; every browser and server was stopped afterwards.

## What each file is

| File | What it does |
|---|---|
| `scripts/v4-motion-style.mjs` | the verifier's `v4-motion.mjs` plus a `--style=` and `--variant=` option (five lines added) |
| `scripts/x-v3-play.mjs`, `x-v4-motion.mjs`, `x-v3b-gaps.mjs` | the verifier's `v3-play`, `v4-motion` and `v3b-gaps` plus a `--set='{"dial":value}'` option that applies engine dials after the style is chosen |
| `scripts/runall.sh` | the three looks (War Room, Field Manual, 1863 Map), default settings: `v3-play` (6 runs of 20 s: The Angle, Rose Woods, Cemetery Hill at 1x and 4x), `v4-motion` (15 s each), `v3b-gaps` (1,200 frames at 60 Hz each) |
| `scripts/exp2.sh` to `exp6.sh` | the dial experiments at The Angle and Rose Woods at 4x: snap, travel limit, straight-line motion, nudge budgets 0, 12 and 24 px, Field Manual "Instrument", visibility rules. **`exp2`'s `wr-notravel` (travelPx 1000) failed at once because that dial's maximum is 120; `exp4` re-ran it with 120 and its logs overwrote the failed ones.** |
| `scripts/compile.py`, `table2.py` | read the result files and print the figures quoted in the pitch (run from the scratch root) |
| `scripts/variants.sh` | builds the prototype minified with different skin sets and `results/bytes.json` holds the sizes of those builds (raw, gzip, brotli, per block) |
| `scripts/url-check.mjs` and `results/url-check.json` | opens `prototype/battle-studio.html` from a `file://` address with every URL the pitch's Appendix A gives (17 cases): skin, variant, compare, tours, tick/zoom/play/speed, tune, metrics, `set=`, `skinset=` |
| `results/v3-play-*`, `v4-motion-*`, `v3b-gaps-*`, `x-v3b-gaps-*` | raw result JSON; the file name carries the look or the experiment (`x-` = with changed dials) |
| `logs/` | console output of each run, the experiment progress logs and `prototype-tests.log` (the prototype's own suite, `node --test "docs/pitch/anim/prototype/test/*.test.mjs"`: 163 tests, 163 pass, 214.8 s) |

## Reading the results

- `framesSolidOverlap` (v3-play) = frames on which two solid items of different tiles touch on painted ink; `framesSolidDimOverlap` = a solid item and a faint (opacity under 0.5) one; `framesUnitDimOnly` = frames with some unit shown only by a faint tile.
- `shareFramesWithGap` (v3b-gaps) = share of frames on which some unit on the field is inside no tile at all (the verifier's own rule: a unit is on the field from the tick of its first keyframe). It is **not meaningful under the `window` and `snapshot` visibility rules**, which deliberately show fewer units, so those rows are not quoted.
- `motion.suddenSolidPerSec`, `maxStepPx` (v4-motion) = steps of at least 8 px and at least 3 times the tile's previous step, between tiles solid in both frames, per second; and the largest one-frame step.
- All runs are single runs: differences of a few points are noise. Frame rates: the witnessed runs (v3-play) and the unwitnessed ones (v4-motion) all held 59.4 to 60 fps in these runs.
- The console error in every v3-play log is the favicon 404 (the verifier's V-13); there were no page errors and no network requests.
