# Request from bt-gates to the photomatch (Q16) owner: the host rule of tests/photomatch.test.mjs is out of date

Written 2026-11-13 19:3x UTC while writing GOVERNANCE/gate_results/GATE-SPEC-B.md. Not done by bt-gates because the file is not in its ownership list.

## What

`node --test tests/photomatch.test.mjs` exits 1: 6 tests, 4 pass, 1 fail, 1 skipped (the optional render test). Raw output: `GOVERNANCE/gate_results/spec-b-evidence/photomatch_test.out`.

The failing test is the third one, "images ledger: sha256 present; files, if on disk, match their hash and were not fetched from refused hosts". Its line 13 asserts, for every ledger entry with `status: 'ok'`:

```js
assert.ok(v.url.startsWith('https://archive.org/cors/'));
```

## Why it fails

`tools/bt/photomatch/images_ledger.json` was rewritten at 19:13 UTC (by `fetch_loc.py` and `fetch_master.py`): it now holds 417 entries (398 `ok`, 19 `not_offered`). The `ok` entries come from `tile.loc.gov` (325), `cdn.loc.gov` (64) and `archive.org` (9). Only the 9 archive.org entries match the assertion. The three Library of Congress hosts are on the list of hosts this campaign may read (www.loc.gov, tile.loc.gov, cdn.loc.gov), so the ledger is not wrong: the test still encodes the earlier situation in which those hosts were refused. The 19 `not_offered` rows point at `https://memory.loc.gov/pp/notdig.gif` and are skipped by the test (`status !== 'ok'`).

## The exact change asked for (the owner of the test decides)

Replace the single prefix test by the intent in the test's own title, "not fetched from refused hosts": accept the hosts that may be read and name the ones that may not.

```js
const ALLOWED = ['https://archive.org/cors/', 'https://tile.loc.gov/', 'https://cdn.loc.gov/'];
const REFUSED = ['babel.hathitrust.org', 'ehistory.osu.edu'];   // bot-blocked: never fetched
...
assert.ok(ALLOWED.some(p => v.url.startsWith(p)), v.url);
assert.ok(!REFUSED.some(h => v.url.includes(h)), v.url);
```

Nothing else in the test needs to change for this failure; the sha256, licence-basis and on-disk hash assertions stay as they are.

## Effect on the gate

Q16 is "not passing" by `app/docs/PHOTOMATCH.md` and stays so; this is a red structural test, not a verdict about any photograph. GATE-SPEC-B.md says in the Q16 section that the test is red at 19:35 UTC for this reason and that bt-gates did not touch the test or the ledger.
