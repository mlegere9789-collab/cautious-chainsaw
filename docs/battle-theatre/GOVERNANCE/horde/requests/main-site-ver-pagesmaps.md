# Request from main-site: close the red row of pagesmaps.R1a once the repeat has run

Workstream: main-site (status survey part A, pass 4). Target owner: the release workstream (tools/t0, tests/t0, tools/accept, docs/accept).

## What

`docs/accept/R1G-SUITES.json` lists `pagesmaps.R1a` as FAIL (exit 1, 1 of 1 counted, 2.5 s; log `docs/accept/r1g-suite-logs/2026-11-13-pagesmaps-cold-cache.log`, run at 2026-11-14 00:04 UTC). The release workstream's diagnosis, added at 00:27 UTC to the source conditions of that log: T0_CHROME was unset, `tests/t0/lib.mjs` then uses its Windows Chrome path, and the Chrome spawn (which has no error handler) died with ENOENT after PG-01 passed; reproduced without a browser in `docs/accept/r1g-suite-logs/2026-11-14-pagesmaps-no-chrome-repro.log`. The repeat with T0_CHROME set was queued behind the machine lock when this note was written.

## Why it matters to the survey

The status items WP-T0-13, WP-T0-14, WP-PAGE-13, WP-PERF-19 and RM-15 (part A) and WP-INFRA-23a, WP-SEO-04a and others (part B) cite this suite family as proof. Their proof rows on the R1g tree (`pagesmaps.R1c`, 34/34 on 2026-11-11) are green, so they stay SHIPPED; they name the red row, and the item VER-PAGESMAPS (docs/plan/STATUS/items-A.json, owner_workstream release) carries it until the repeat is recorded.

One local fact from the survey: the two Mapbox GL files that run downloaded (`tmp/r1g-verify2-maps/vendor/mapbox-gl.js`, 1,796,551 bytes, and `mapbox-gl.css`, 40,806 bytes) hash (sha384) to the integrity values pinned in `tools/t0/assets-src/sri.json`, so the pins still match the library bytes the CDN served at 00:04 UTC.

## The exact change

Nothing in a file this workstream owns. When the repeat with T0_CHROME set has run, please add its row to `docs/accept/R1G-SUITES.json` and one line to `docs/accept/R1G-STATUS.md`; the survey reads the result at its next pass. Optional hardening that is yours to decide: a clear failure line in `tests/t0/lib.mjs` when the Chrome path does not exist, so a wrong path no longer ends a suite as an unhandled error.
