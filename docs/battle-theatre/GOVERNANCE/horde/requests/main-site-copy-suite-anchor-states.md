# Request from main-site: the copy test suite asserts a state the time anchors no longer have

Workstream: main-site (status survey part B). Target owner: the copy and guide workstream (tools/copy, tools/guide, tests/copy).

## What

`node --test tests/copy/*.test.mjs` (run 2026-11-13, Node 22 and Node 24 alike) fails 17 tests: `guide.test.mjs` and `trust-pages.test.mjs` stop at start, and `verify-claims` VER-CLAIM-01..11 and `verify-lint` VER-LINT-01..04 fail with them.

## Why

Two generators assert that every time anchor is in state `proposed`:

- `tools/copy/trust/inputs.mjs` line 90: `claim('no-anchor-is-reviewed', 'every one of the time anchors is in state proposed ...', timeInfo.proposed === timeInfo.total, ...)` throws `claim no-anchor-is-reviewed failed`.
- `tools/guide/build-guide.mjs` lines 42 and 43: `if (anchors.proposed !== anchors.total) throw new Error('a time anchor is no longer in state proposed ...')`.

`data-src/time/time_anchors.json` (version 2026-10-18.1) now holds reviewed 25 (adjudication decision ADJ-2026-10-18: two independent evidence passes and an adjudicator, docs/time/ANCHORS-FINAL.md), contested 4, proposed 4, signed 0. Its own notice says none is signed and no human historian has signed. So the pages and the guide are not wrong in substance (no historian has checked the anchors), but their assertion is stale and hides real regressions.

## The exact change

Replace the equality with the claim that matters: no anchor is `signed` and none carries a decision by a named human reviewer (decision ids of the form `ADJ-*` are the toolchain's adjudication). In `inputs.mjs` rename the claim to `no-anchor-is-signed`, test `states.signed === 0 && no decision names a person`; in `build-guide.mjs` throw only when an anchor is `signed`. Keep the page wording "unreviewed: no historian has checked them yet" and build the counts from the states instead of `proposed`/`total` (the text may say how many are adjudicated and how many contested). Then re-run `tests/copy` under both Node versions and regenerate `candidates/trust-pages` and `candidates/user-guide`.

Do not loosen the rule that nothing may be shown as reviewed or signed by a human without a decision on file (TM-V18; DEC-006 keeps tier marking of non-documented content).
