# Release log (one row per production deploy, rollback or kill-switch deploy)

Written by the owner (or by the AI at the owner's request) **the same day** as each production change. `tests/t0/prod-probe.mjs` reads the LAST row of the table to decide
which train's expectations apply (`--train auto`) and which release id `/version.json` must report. The plan calls this file `docs/releases.md`
(chapter 02 WP-T0-19); it lives in `ops/` next to the runbook that uses it.

How to fill a row (details: `ops/RELEASE-RUNBOOK.md` section 9):

| Column | What goes in it |
|---|---|
| `#` | 1, 2, 3 ... (no gaps; a rollback is its own row) |
| Date (ET) | date and local time of the change, e.g. `2026-10-13 10:40` |
| Action | `deploy`, `rollback` or `kill` |
| Train | the train whose bytes are LIVE after this row: `R0`, `R1a`, `R1b`, `R1c`, `R1d`, or `legacy` after a rollback all the way back |
| rid | the 8-character release id from `release/<train>/dist/version.json` (`release`), or the rid of the deploy you rolled back to |
| Git SHA | `git rev-parse --short HEAD` at build time |
| Method | `cli` or `drag-drop` |
| Netlify deploy ID | from the Deploys list: click the deploy, the last part of its address, or the CLI output |
| Rollback target | the Netlify deploy ID that was live BEFORE this change (what "Publish deploy" would restore). Before R0 that is **`6abd6d62...`** (the deploy production serves since the drift found on 2026-09-30, `docs/baseline-drift.md`), not the downloaded `6aa16d61` |
| Soak (h) | hours the same tree sat on gbg-staging first |
| Notes | credits used, probe verdict, the last line of `python tools/t0/baseline.py verify-live` run right before the deploy (`IDENTICAL ... live deploy <id>`), anything odd |

A row whose rid is not exactly 8 lowercase hex characters (like the empty example below) is ignored by the probe.

| # | Date (ET) | Action | Train | rid | Git SHA | Method | Netlify deploy ID | Rollback target | Soak (h) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | (example) | deploy | R0 | xxxxxxxx | abc1234 | cli | (id) | 6abd6d62... (live on 2026-09-30) | 48 | not a real row: replace this line with row 1 |

<!-- Real rows go below the example row. Keep the first columns exactly as above. -->
