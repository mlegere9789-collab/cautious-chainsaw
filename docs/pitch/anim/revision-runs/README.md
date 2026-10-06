# revision-runs: the measurements made for the revision of PITCH.md

Everything here was run on 2026-10-06 on one machine (Windows 11, Chrome 155 headless, Node 24.19) to answer `../PITCH-REVIEW.md`. It supports the numbers in `../PITCH.md` marked "revision" or described in sections 4, 5 and 10. **Nothing here changes the committed prototype (`../prototype/battle-studio.html`, sha256 `5f6be41a57d21043...`), the verifier, or the product.**

## How the runs were made

Two things are different from the pitch runs.

1. **Re-runs** of the reviewer's probes (`../review-runs/scripts/r-*.mjs`, run unchanged) and the committed pitch-run result files, recomputed. All reproduced the reviewer's numbers.
2. **New experiments** that need a few lines the committed prototype does not have. They were run in a **scratch copy** of the prototype (laid out like the repository, under `tmp/pitch-anim/revise/scratch/`, git-ignored), built with `node build.mjs`. The diff between the committed prototype and the scratch copy is in `scratch-patch/` (about twenty lines of display layer for the `strict` and `strict-push` modes, one footprint switch `noText` in `layout/spec.mjs`, a 40-line sketch skin `mark-sketch`, one style entry). The built scratch page is **`battle-studio-experiments.html`** in this folder (sha256 `9bf8ce54a18fe668...`), so anyone can open it. A second scratch tree, `scratch2/`, built the same code with only the `strict-push` mode added to check it before it was folded into the first; the two builds are byte-identical (same sha256).

Ports 9760 to 9778 on 127.0.0.1; every browser and server was stopped afterwards. The independent verifier's scripts (`../07-verify/`) were copied into the scratch tree with the pitch runs' `x-*.mjs` variants (a `--style=` and a `--set=` option) and the new scripts below; their results are written into the scratch tree and copied here.

**One lesson about method:** the first strict-glide series was run while other probes shared the machine, and twice a driver was started twice, so those runs were discarded. The `q-*` results (the real-time series) were run one at a time on a quiet machine, 59.4 to 60 fps in every run except two (58.5 and 57.9 fps, both strict glide without nudging at The Angle at 4x, which I did not investigate). The refresh-rate probe was first run with several configurations in one page, which carried state from one run to the next and gave wrong rows for the strict mode; it was rewritten to use a fresh page for every run.

## What each file is

| File | What it does |
|---|---|
| `scripts/tables.py` | recomputes from `../pitch-runs/results/` every playback figure PITCH.md quotes for the three looks (solid and faint overlaps, no-live-tile frames, jumps, steps, gaps); output `results/tables-pitch-runs.txt` |
| `scripts/agg-summary.py` | summarises `results/r-agg.json` (units inside counted tiles by setting and zoom; how counted tiles are named); output `results/agg-summary-repro.txt` |
| `scripts/rev-agg2.mjs` | units inside counted tiles at zoom 13.5 for nudge budgets 0, 12, 24, 48, 96, 120 px (`--only=dmax`) and for compact marks of 8, 10, 12, 14, 18 px at zoom 13 to 15 with and without nudging (`--only=marks`) |
| `scripts/rev-m63.mjs`, `scripts/rev-places-m63.mjs` | the same counts and the place-name probe for 1863 Map, which the review did not run |
| `scripts/rev-places.mjs` | place names covered by tiles (the 30 named places, from zoom 14.5 also the 3 features and 8 structures), against every solid tile |
| `scripts/rev-ellipsis.mjs` | name labels painted with an ellipsis, three looks, zoom 14 to 16 |
| `scripts/rev-zoom.mjs` | the reviewer's camera-zoom probe with the display modes added (engine-level pops, births, deaths, faint share) |
| `scripts/rev-zoom-play.mjs` | the **independent instrument** (witness and recorder, real time) during a camera zoom |
| `scripts/rev-hz.mjs` | the same 20 s of playback stepped at 30, 60, 144 and 240 frames a second in virtual time, a fresh page per run |
| `scripts/rev-hops.mjs` | what causes the hops of the strict mode (the display layer's own counters per second) |
| `scripts/rev-shots.mjs` | the pictures at the product's start zoom (13.5) and the compact-mark sketch |
| `scripts/rev-strict.sh` | the first strict-glide series (discarded for the reason above; kept as the recipe) |
| `scripts/rev-rt.sh`, `rev-pers.sh`, `scratch2` `rev-push.sh` | the quiet, one-at-a-time real-time series: `v3-play`, `v4-motion` and `v3b-gaps` for each configuration at The Angle and Rose Woods |
| `scripts/make-table-10-2.py`, `make-table-10-4.py`, `strict-table.py` | print the tables of PITCH.md sections 10.2 and 10.4 from the result files |
| `scripts/url-check-presets.mjs`, `url-check-experiments.mjs` | open the three motion-personality addresses on the committed prototype, and the experiment addresses on the experiments build, from `file://` |
| `scripts/probe-*.mjs` | small diagnostics used while building the experiments |
| `results/` | raw JSON of every run and the printed tables |
| `logs/` | console output of each run |
| `scratch-patch/` | the diff and the added skin file of the scratch build |
| `battle-studio-experiments.html` | the scratch build, openable by double-click: `?mode=strict`, `?mode=strict-push`, `?style=mark-sketch` |

## Reading the results

- Configuration tags: `q-wr-default` War Room with the engine's defaults; `q-wr-strict` the strict display mode; `-d0` and `-d12` add `layout.dMaxPx` 0 and 12; `-nl` adds `motion.labelFadeMs` 0; `q-fm-strict-instr` Field Manual with straight chords, never nudged, strict; `q-mk-*` the 12 px mark sketch; `q-*-strictpush` strict with the default mode's pushing; `q-pers-wr`, `-fm`, `-m63` the three motion personalities.
- `v3-play` fields are those of `../pitch-runs/README.md`: `framesSolidOverlap` (two solid tiles touching on painted ink), `framesSolidDimOverlap` (a solid and a faint one), `framesMissingUnits` (a unit with no **live** tile of its own); `v3b-gaps` `shareFramesWithGap` (a unit with no tile of **any** kind, 60 Hz virtual time, popups off); `v4-motion` `suddenSolidPerSec` and `maxStepPx`.
- Every run is a single run: differences of a few points are noise. The quiet re-run of the default War Room gave 23.8% and 15.1% faint-over-solid at The Angle and Rose Woods where the pitch run gave 29.0% and 15.5%.
- The mark sketch models a footprint, not a design: no text on the mark, a 12 px square, an arm cut, drawn on the dark ground. It is not one of the three pitches.
