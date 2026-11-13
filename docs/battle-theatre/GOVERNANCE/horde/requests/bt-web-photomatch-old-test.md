# Request: replace tests/photomatch.test.mjs (workstream bt-web, task photomatch, 2026-11-13)

What: `tests/photomatch.test.mjs` (repository root `tests/`, not owned by the photomatch task) was written for the first-run data and now fails on purpose-built facts, not on a defect:

1. "images ledger" asserts `v.url.startsWith('https://archive.org/cors/')` for every `status: ok` entry. The ledger now also holds 430 Library of Congress derivatives whose urls are on `cdn.loc.gov` / `tile.loc.gov` (both reachable since 2026-11-13).
2. "poses" asserts that every `position.anchor` is a gazetteer id; poses.json is now schema 2 (anchors may be `STR-...` building ids and `MON-...` monument numbers; `position.relative`; `photo.file`).
3. "verdicts" reads `ver.verdicts`; the file is now `{pose_verdicts, gate_q16, ...}`.

Why this is safe: the same checks, extended, live in `docs/battle-theatre/app/tests/photomatch-q16.test.mjs` (owned by the photomatch task): ledger hashes and declared sizes, statement quotes and hashes, pose tiers, verdict vocabulary and the rule that a fitted pose cannot be called a match, the registry (one entry per catalogued record), and that gate Q16 is not marked passing.

The exact change: delete `tests/photomatch.test.mjs`, or reduce it to its first two tests (catalogue and staged flags, which still hold) and drop the ledger, poses, verdicts and determinism tests. The determinism check (`PHOTOMATCH_RENDER=1`) is kept in the new test file.
