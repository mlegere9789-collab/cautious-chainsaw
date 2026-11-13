# Request: `docs/battle-theatre/app/tests/run-all.mjs` (not in the bt-spec-health ownership list)

From: bt-spec-health, round 1, 2026-11-13. File to change: `docs/battle-theatre/app/tests/run-all.mjs` (15 lines).

## What is wrong

1. **It stops a file after 20 minutes** (`spawnSync(..., { timeout: 20 * 60 * 1000 })`). On a software renderer one frame of the theatre takes seconds, so most browser specs need longer than that; the runner would kill them and report a failure that is not one. (The specs themselves no longer assume a frame time: every pause and time limit in them goes through the one knob in `tests/lib.mjs`, see `tests/results/SW-STATUS.md`.)
2. **It does not show what was NOT RUN.** On a software renderer the specs report the assertions that need a real GPU (frame time, long tasks, input delay, WebGPU pictures) as skipped tests with the reason `NEEDS_GPU ...`. `run-all.mjs` counts only `pass` and `fail`, prints `ok` for such a file and ends with `all green`. A run with skipped tests is not green: the skipped ones are owed on a real GPU.
3. **It writes `tests/results-summary.json` wherever it runs**, so a software run replaces the summary of the last real-GPU run. The specs now write their own numbers through `outFile()` of `tests/lib.mjs` (the tests folder on a hardware renderer, `tests/results/<BT_OUT or sw-latest>/` on a software one); the summary should follow the same rule.
4. Its file list has 8 of the node test files; the folder has 26 (`ls docs/battle-theatre/app/tests/*.test.mjs`). Whoever owns the list should decide whether it is meant to be complete.

## The exact change asked for

```js
// line 8: no fixed 20-minute stop; BT_FILE_LIMIT_MIN sets one (default: none)
const lim = +process.env.BT_FILE_LIMIT_MIN || 0;
const t0 = Date.now(), r = spawnSync(process.execPath, ['--test', path.join(here, f)], { encoding: 'utf8', maxBuffer: 1 << 26, ...(lim ? { timeout: lim * 60 * 1000 } : {}) });
// line 10: count what was not run
summary.push({ file: f, tests: n('tests'), pass: n('pass'), fail: n('fail'), skipped: n('skipped'), seconds: ... });
// line 11: say it
console.log(`${n('fail') || r.status ? 'FAIL' : n('skipped') ? 'ok, ' + n('skipped') + ' NOT RUN' : 'ok  '} ${f}: ${n('pass')}/${n('tests')} passed ...`);
// line 14: the summary goes where the specs' own results go
const software = /# renderer: .*\(SOFTWARE/.test(allOutput);                     // the line tests/lib.mjs prints at launch
const out = process.env.BT_OUT || software ? path.join(here, 'results', process.env.BT_OUT || 'sw-latest', 'results-summary.json') : path.join(here, 'results-summary.json');
// line 15: a run with NOT RUN tests is not "all green"
const owed = summary.reduce((a, s) => a + s.skipped, 0);
console.log(bad.length ? `${bad.length} file(s) failed` : owed ? `no failure; ${owed} test(s) NOT RUN here (owed on a real GPU)` : 'all green');
```

## Why

Rule 1 of the campaign (never report a gate as passed that was not run) and Law 7 (a visible marked gap, never a concealed one). Until this is changed, use the queue runner of this workstream for software runs (`tests/results/SW-STATUS.md`, "How the specs are run here"), not `run-all.mjs`.
