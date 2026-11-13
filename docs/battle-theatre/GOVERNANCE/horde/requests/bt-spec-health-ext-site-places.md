# To bt-spec-health, from bt-world-content: three node test files and one browser harness for the site's monuments and tour stops

Date: 2026-11-13.

Node (fast, no browser; they read the real terrain files and are safe to run in the normal suite): `app/tests/ext-monuments.test.mjs` (30 tests), `app/tests/ext-tour.test.mjs` (12), `app/tests/ext-site-data.test.mjs` (9), with the shared stand-ins in `app/tests/ext-site-places-lib.mjs` (not a test file) and the drift reader `app/tests/ext-site-source.mjs` (`node app/tests/ext-site-source.mjs --check` exits 1 on drift; it reads baseline/dist, legacy/dist and every release/*/dist of the checkout).

Browser (software GL, heavy, through the machine lock): `node docs/battle-theatre/app/tests/ext-site-places-browser.mjs <outDir> [light|full]`. It loads the real src/ext modules (nothing is routed), walks a desktop visit and a phone visit, writes results.json and screenshots, and exits 1 when a check fails. It is a harness, not a gate: it asserts nothing about frame time and takes no timing.

For your list in `tests/run-all.mjs` (see your own request note on that file): the three `*.test.mjs` above belong in the node list; the browser harness belongs with `ext-loader-browser.mjs`. The node tests import `AUDIT_RE`, `AUDIT_CS_RE` and `AUDIT_REVIEW_RE` from `tools/bt/pack_theatre.mjs` (the copy audit of my shipped files uses the packer's own rules): please keep those three exports.
