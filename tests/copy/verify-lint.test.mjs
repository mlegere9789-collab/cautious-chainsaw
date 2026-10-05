// Adversarial verifier tests for the copy_lint stream (tmp/verify-copy/ holds the evidence). These tests FAIL today on purpose: each one
// pins a defect found by an independent run, and goes green when the defect is fixed.
//   node --test "tests/copy/verify-*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, lintSource, REPO } from '../../tools/copy/lib/lint.mjs';
import { main as lintMain } from '../../tools/copy/copy_lint.mjs';

const env = makeEnv({ root: REPO });
const run = (html) => lintSource('page.html', `<p>${html}</p>`, env).findings;
const quiet = () => { const out = []; return { out, log: (s) => out.push(s), err: (s) => out.push('ERR ' + s) }; };

test('VER-LINT-01: STYLEGUIDE section 2 says a clock is never written 16:30 and names rule TIMEFMT; the rule must flag a 24-hour clock', () => {
  const hits = run('The attack began at 16:30 on July 3.').filter((f) => f.rule === 'TIMEFMT');
  assert.ok(hits.length >= 1, 'TIMEFMT did not flag "16:30"');
});

test('VER-LINT-02: one non-standard clock is one finding (the ratchet counts findings, so "4:30pm" must not count twice)', () => {
  for (const clock of ['At 4:30pm the attack began.', 'At 7:30 a.m. they rose.', 'At 4:30 p.m. it ended.']) {
    const hits = run(clock).filter((f) => f.rule === 'TIMEFMT');
    assert.equal(hits.length, 1, `${clock} -> ${JSON.stringify(hits.map((h) => h.match))}`);
  }
});

test('VER-LINT-03: the documented strict command for the candidate folders ("copy_lint DIR --no-baseline", STYLEGUIDE section 16) passes on the committed candidates', () => {
  for (const dir of ['candidates/trust-pages', 'candidates/user-guide']) {
    const c = quiet();
    const code = lintMain([dir, '--no-baseline', '--strict'], c);
    assert.equal(code, 0, `${dir}: exit ${code}\n${c.out.filter((l) => /FAIL|total/.test(l)).join('\n')}\n(the findings are in non-visitor files: trust-manifest.json, guide-manifest.json, README.md; exclude them in scan-config.json or fix the command)`);
  }
});

test('VER-LINT-04: a proper name that contains "Our" ("Our Lady of Sorrows") is not first-person plural copy', () => {
  const hits = run('Services are held at Our Lady of Sorrows.').filter((f) => f.rule === 'WE');
  assert.deepEqual(hits.map((h) => h.match), [], 'WE flagged a proper name');
});
