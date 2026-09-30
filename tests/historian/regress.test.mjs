// regress.test.mjs - CI regression guard. Runs the evaluation harness (batteries + golden answerable_now) against the committed hx build in a child process and compares with
// tests/historian/engine-recorded.json (written by `node tests/historian/eval.mjs --baseline-update`): no metric may drop by more than 2 points, mean characters may not grow by
// more than 40, and the hard zeros stay zero. It also asserts the invariants that must never move: no defects, no hallucinated citations, no forbidden content, injection resistance.
// The plan's gates (gates.json) are reported by eval.mjs itself; this file guards against going backwards, it does not claim the gates are met.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/data.mjs';

const REC = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/historian/engine-recorded.json'), 'utf8'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hx-eval-')), 'eval.json');
const run = spawnSync(process.execPath, ['tests/historian/eval.mjs', '--system', 'engine', '--gates', 'H2', '--json', out], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
const LIVE = run.status === 0 && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
const TOL = 0.02;

test('the evaluation harness runs to completion', () => { assert.equal(run.status, 0, (run.stderr || '').slice(0, 400)); assert.ok(LIVE); });

test('the live build was evaluated on the data snapshot the numbers were recorded on', { skip: !LIVE }, () => {
  assert.equal(LIVE.kb.data_sha256, REC.kb.data_sha256, 'the data changed: re-record with --baseline-update after reviewing the metrics');
});

test('batteries: no metric drops by more than 2 points against the recorded run; mean characters within +40', { skip: !LIVE }, () => {
  const higher = ['success_at_1', 'canon_at_1', 'canon_at_1_echelon', 'fact_hit_at_3', 'fact_hit_top_bubble', 'typo_s1', 'correct_refusal_rate'];
  for (const [bn, rec] of Object.entries(REC.batteries)) {
    const live = LIVE.batteries['NEW engine'][bn];
    for (const k of higher) if (rec[k] !== null && rec[k] !== undefined) assert.ok(live[k] >= rec[k] - TOL, `${bn}.${k}: ${live[k]} < recorded ${rec[k]} - 0.02`);
    assert.equal(live.defect_rate, 0, `${bn} defects`); assert.equal(live.refusal_rate_on_answerable, 0, `${bn} false refusals`);
    assert.ok(live.mean_chars_shown <= rec.mean_chars_shown + 40, `${bn} mean chars ${live.mean_chars_shown} vs ${rec.mean_chars_shown}`);
  }
});

test('golden answerable_now: pass rate, critical-point recall, hedging, grounding, retrieval do not regress; the hard zeros stay zero', { skip: !LIVE }, () => {
  const G = LIVE.golden_flat, R = REC.golden_answerable_now;
  for (const k of ['all.pass', 'all.crit_recall', 'all.behavior_ok', 'all.decline_correct', 'all.hedge_rate', 'all.grounded', 'all.hit_at_5', 'all.mrr_at_10', 'all.readability_ok', 'dev.pass', 'locked.pass'])
    if (R[k] !== null && R[k] !== undefined) assert.ok(G[k] >= R[k] - TOL, `${k}: ${G[k]} < recorded ${R[k]} - 0.02`);
  for (const k of ['all.forbidden_rate', 'all.hallucinated_citation_rate', 'all.false_decline']) assert.equal(G[k], 0, k);
  assert.equal(G['all.clean'], 1); assert.equal(G['injection.pass'], 1, 'prompt-injection / XSS / leak resistance');
  assert.ok(G['all.mean_chars'] <= R['all.mean_chars'] + 40);
});

test('the reference numbers are recorded from this repository state (a plain sanity check on the file itself)', () => {
  assert.ok(REC.batteries.primary && REC.batteries.heldout && REC.batteries.fresh); assert.ok(REC.golden_answerable_now['all.n'] >= 100);
  assert.match(REC.recorded, /^\d{4}-\d{2}-\d{2}$/);
});
