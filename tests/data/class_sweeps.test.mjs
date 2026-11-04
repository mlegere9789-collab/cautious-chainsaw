// Class sweeps for the data-quality workstream (fixes for RV-01..RV-06 of reverify-data-quality.test.mjs and the wall-clock time bomb).
// The re-verifiers showed that a fix which only covers the probed phrasings leaves the class open. Each test here generates the SPACE the
// defect lives in and checks every member of it:
//   CS-01..03  judging zero rules (library, CLI, every site rule; the site-rule list is derived and honest)
//   CS-04..08  a rule that stops running or is softened (every rule x {deferred, E->W, notApplicable}; a baseline that lost a field; accept/tighten/init flows)
//   CS-09..11  a missing input (U001's halves; every file the validator reads, DISCOVERED by tracing fs; every generated artifact a --check covers)
//   CS-12..13  derived numbers (facts tick counts and the measured column of the report never count what they do not name, and are never typed)
//   CS-14..17  baseline expiry (explicit report, 30-day warning, failure only in the gate, verdict independent of the date, logged renewal)
//   CS-18..19  the specialist comparison (keys, not counts) and the committed reports
// Nothing here reads the wall clock (every date is derived from NOW / the baseline with the pure helpers of lib/expiry.mjs) and nothing writes
// under the real legacy/ or edits a tracked file: every write goes to a throw-away copy under the OS temp dir.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { clone, baseline, NOW, rmrf, makeRepoCopy, fixtureDist, row, placementFile } from './helpers.mjs';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { runRules } from '../../tools/data/lib/runner.mjs';
import { evaluateRatchet, baselineShapeProblems, buildBaseline, tightenBaseline } from '../../tools/data/lib/ratchet.mjs';
import { loadAllRules, catalogueIds, siteRuleIds, ruleStates } from '../../tools/data/rules/index.mjs';
import { defineRule } from '../../tools/data/rules/define.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';
import { generateFacts } from '../../tools/data/facts.mjs';
import { measureSection2 } from '../../tools/data/lib/measure.mjs';
import { buildCrosswalk, buildRegistry } from '../../tools/data/lib/registry.mjs';
import { parseIsoDate, addDays, daysUntil, expiryStatus, expiryReport, EXPIRY_WARN_DAYS, MAX_RENEWAL_DAYS } from '../../tools/data/lib/expiry.mjs';
import { SPECIALIST_DV07, compareKeySets } from '../../tools/data/lib/specialist.mjs';
import { REPO_ROOT } from '../../tools/data/lib/util.mjs';

const node = process.execPath;
const run = (args, opts = {}) => spawnSync(node, args, { encoding: 'utf8', ...opts });
const runAsync = (args, opts = {}) => new Promise((resolve) => {
  const c = spawn(node, args, opts);
  let stdout = '', stderr = '';
  c.stdout.on('data', (d) => { stdout += d; });
  c.stderr.on('data', (d) => { stderr += d; });
  c.on('close', (status) => resolve({ status, stdout, stderr }));
});
const VALIDATE = path.join(REPO_ROOT, 'tools', 'data', 'validate.mjs');
const EXPIRY = path.join(REPO_ROOT, 'tools', 'data', 'expiry.mjs');
const inRepo = (root, ...p) => path.join(root, ...p);

// one real, full run over the frozen tree shared by the in-process sweeps (site inputs on, like the CLI)
let cachedReal = null;
const real = () => (cachedReal ??= (async () => ({ results: (await runValidation({ now: NOW })).results, ids: await catalogueIds(), states: await ruleStates() }))());
const judge = (results, b, { ids, states }, extra = {}) => evaluateRatchet(results, b, { now: NOW, registered: ids, ruleStates: states, fullRun: true, expiry: 'report', ...extra });

function baselineCopy(mutate = (b) => b) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-cs-'));
  const file = path.join(dir, 'baseline.json');
  fs.writeFileSync(file, JSON.stringify(mutate(JSON.parse(JSON.stringify(baseline))), null, 2));
  return { dir, file };
}

/** Edit one rule's source inside a repo copy: `fn` gets the ~600 characters that follow `id: '<ID>'` and returns the edited text. */
function editRule(root, id, fn) {
  const dir = inRepo(root, 'tools', 'data', 'rules');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('_rules.mjs'))) {
    const p = path.join(dir, f);
    const src = fs.readFileSync(p, 'utf8');
    const i = src.indexOf(`id: '${id}'`);
    if (i < 0) continue;
    const seg = src.slice(i, i + 600);
    const out = fn(seg);
    assert.notEqual(out, seg, `${id}: the edit changed nothing`);
    fs.writeFileSync(p, src.slice(0, i) + out + src.slice(i + 600));
    return;
  }
  throw new Error(`rule ${id} not found`);
}

// ---------------------------------------------------------------------------------------------------------------------------------
// CS-01..03: judging zero rules is not a pass
// ---------------------------------------------------------------------------------------------------------------------------------

test('CS-01 an empty or unknown rule selection is an error for every caller, and an empty result set fails the ratchet', async () => {
  const ctx = buildContext({ bundlePath: null, distDir: null });
  await assert.rejects(runRules(ctx, { only: [] }), /zero rules/);
  await assert.rejects(runRules(ctx, { only: ['NOPE99'] }), /unknown rule id NOPE99/);
  await assert.rejects(runRules(ctx, { only: 'S001' }), /zero rules/);
  await assert.rejects(runValidation({ only: [], site: false, now: NOW }), /zero rules/);
  assert.equal((await runRules(ctx, { only: null })).results.size, 68, 'null = every rule');
  const env = await real();
  const v = judge(new Map(), baseline, env);
  assert.equal(v.pass, false);
  assert.ok(v.failures.some((f) => f.type === 'no_rules_judged'));
});

test('CS-02 validate.mjs --rules <id> --no-site: every site rule is refused (exit 2, nothing judged), a mixed selection too, every other rule is judged', async () => {
  const site = await siteRuleIds();
  assert.ok(site.length >= 8);
  for (const id of site) {
    const r = run([VALIDATE, '--rules', id, '--no-site', '--now', NOW]);
    assert.equal(r.status, 2, `${id}: ${r.stdout.slice(-200)}`);
    assert.match(r.stderr, new RegExp(id));
    assert.doesNotMatch(r.stdout, /PASS/, id);
  }
  const mixed = run([VALIDATE, '--rules', `S001,${site[0]}`, '--no-site', '--now', NOW]);
  assert.equal(mixed.status, 2, 'S001 alone would pass; the site rule that was asked for and skipped must not vanish');
  for (const id of ['S001', 'G003', 'D002']) {
    const r = run([VALIDATE, '--rules', id, '--no-site', '--now', NOW]);
    assert.equal(r.status, 0, `${id}: ${r.stdout.slice(-300)}`);
    assert.deepEqual(r.stdout.split('\n').filter((l) => /^[A-Z]\d{3}\s/.test(l)).map((l) => l.slice(0, 4)), [id], 'exactly the requested rule is judged');
  }
  // a whole-baseline rebuild from a subset would silently drop every other rule's entries
  const { dir, file } = baselineCopy();
  try {
    const before = fs.readFileSync(file);
    for (const extra of [['--rules', 'S001'], ['--no-site']]) {
      const r = run([VALIDATE, '--baseline', file, '--init-baseline', '--force', '--now', NOW, ...extra]);
      assert.equal(r.status, 2, extra.join(' '));
      assert.ok(fs.readFileSync(file).equals(before), 'the baseline was not touched');
    }
    assert.equal(run([VALIDATE, '--baseline', file, '--init-baseline', '--now', NOW]).status, 2, 'an existing baseline is not overwritten without --force');
  } finally { rmrf(dir); }
});

test('CS-03 the site-rule list is derived from the rules and honest: a rule whose verdict changes without the deploy tree and bundle is flagged site:true, and so is every rule that is then "not applicable"', async () => {
  const on = (await real()).results;
  const off = (await runValidation({ now: NOW, site: false })).results;
  const rules = await loadAllRules();
  const flagged = new Set(rules.filter((r) => r.site).map((r) => r.id));
  const sig = (r) => JSON.stringify([r.ran, Boolean(r.notApplicable), r.violations.map((v) => v.key)]);
  for (const r of rules) {
    const a = on.get(r.id), b = off.get(r.id);
    if (sig(a) !== sig(b)) assert.ok(flagged.has(r.id), `${r.id} reads the deploy tree or the bundle but is not flagged site:true`);
    if (b.notApplicable) assert.ok(flagged.has(r.id), `${r.id} is "not applicable" without the site inputs but is not flagged site:true`);
    if (!flagged.has(r.id)) assert.ok(b.ran || r.status === 'deferred', `${r.id} did not run without the site inputs`);
  }
  // the list that used to be typed in validate.mjs: it may only change on purpose
  assert.deepEqual([...flagged].sort(), ['F001', 'F002', 'K001', 'L001', 'M001', 'P001', 'R008', 'U001']);
  assert.deepEqual([...(await siteRuleIds())].sort(), [...flagged].sort());
});

// ---------------------------------------------------------------------------------------------------------------------------------
// CS-04..08: a rule that stops running, or is softened, or a baseline that lost a field
// ---------------------------------------------------------------------------------------------------------------------------------

test('CS-04 sweep over the catalogue: deferring a running rule, lowering an E rule to W, or reporting "not applicable" in a full run fails the ratchet, with or without baseline entries and whatever subset is judged', async () => {
  const env = await real();
  const { results, ids, states } = env;
  assert.equal(judge(results, baseline, env).pass, true, 'precondition: the frozen tree passes');
  const deferredAtBaseline = ids.filter((id) => baseline.rule_state[id].status === 'deferred');
  assert.equal(deferredAtBaseline.length, 6);
  const other = ids.find((id) => states[id].status !== 'deferred' && !baseline.rules[id]); // a judged subset that does not include the rule under test
  let flips = 0, lowers = 0, nas = 0;
  for (const id of ids) {
    const rule = results.get(id).rule, s = states[id];
    if (s.status !== 'deferred') {
      const asDeferred = { rule: { ...rule, status: 'deferred', blocked_by: 'x' }, ran: false, violations: [], reason: 'x' };
      const st = { ...states, [id]: { ...s, status: 'deferred' } };
      for (const judged of [new Map([...results]).set(id, asDeferred), new Map([[other, results.get(other)]])]) {
        const v = evaluateRatchet(judged, baseline, { now: NOW, registered: ids, ruleStates: st, fullRun: true, expiry: 'report' });
        assert.ok(v.failures.some((f) => f.rule === id && f.type === 'rule_deferred'), `${id} switched to deferred went unnoticed (${judged.size} judged)`);
      }
      flips++;
      const na = new Map(results).set(id, { rule, ran: false, notApplicable: true, violations: [], reason: 'x' });
      const vna = judge(na, baseline, env);
      assert.ok(vna.failures.some((f) => f.rule === id && (f.type === 'not_applicable_in_full_run' || f.type === 'baselined_rule_not_run')), `${id} reporting "not applicable" in a full run went unnoticed`);
      // the lax mode stays for in-memory callers: a rule without entries may be not applicable there
      if (!baseline.rules[id]) assert.equal(evaluateRatchet(na, baseline, { now: NOW }).failures.filter((f) => f.rule === id).length, 0, id);
      nas++;
    }
    if (s.sev === 'E') {
      const soft = { rule: { ...rule, sev: 'W' }, ran: true, violations: results.get(id).violations };
      const v = judge(new Map(results).set(id, soft), baseline, env, { ruleStates: { ...states, [id]: { ...s, sev: 'W' } } });
      assert.ok(v.failures.some((f) => f.rule === id && f.type === 'severity_lowered'), `${id} lowered from E to W went unnoticed`);
      lowers++;
    }
  }
  assert.equal(flips, ids.length - deferredAtBaseline.length);
  assert.ok(lowers > 40, `${lowers} E rules swept`);
  assert.equal(nas, flips);
  // a rule that was deferred at baseline time stays informational, and may be activated; after --tighten records that, it cannot be deferred again
  const id = deferredAtBaseline[0];
  const active = { ...states, [id]: { ...states[id], status: 'implemented' } };
  const t = tightenBaseline(results, baseline, { registered: ids, ruleStates: active });
  assert.equal(t.baseline.rule_state[id].status, 'implemented');
  assert.ok(judge(results, t.baseline, env, { ruleStates: states }).failures.some((f) => f.rule === id && f.type === 'rule_deferred'), 'deferred again after it was recorded as running');
});

test('CS-04b a deferred rule must say what blocks it: defineRule throws without blocked_by (every spelling of "nothing"), and accepts a reason', () => {
  const meta = (over) => ({ id: 'S999', sev: 'E', family: 'schema', title: 't', status: 'deferred', wp: 'x', run: () => null, ...over });
  for (const blocked_by of [undefined, null, '', '   ', 0, false, [], {}]) assert.throws(() => defineRule(meta({ blocked_by })), /deferred needs blocked_by/, JSON.stringify(blocked_by));
  assert.equal(defineRule(meta({ blocked_by: 'needs the land mask' })).status, 'deferred');
  for (const status of ['implemented', 'partial']) assert.doesNotThrow(() => defineRule(meta({ status })));
  assert.throws(() => defineRule(meta({ status: 'sleeping' })), /bad status/);
  assert.throws(() => defineRule(meta({ sev: 'X' })), /bad severity/);
  // every registered deferred rule carries one, and the runner prints it as the SKIPPED reason
  return loadAllRules().then((rules) => { for (const r of rules.filter((x) => x.status === 'deferred')) assert.ok(r.blocked_by && r.blocked_by.trim(), r.id); });
});

test('CS-05 --tighten only ever records stricter states: sweep over every rule, a rule deferred or lowered in the code is never written into rule_state', async () => {
  const env = await real();
  for (const id of env.ids) {
    const s = env.states[id];
    const weaker = { ...env.states, [id]: { sev: 'W', status: 'deferred' } };
    const t = tightenBaseline(env.results, baseline, { registered: env.ids, ruleStates: weaker });
    assert.deepEqual(t.baseline.rule_state[id], baseline.rule_state[id], `${id}: tighten relaxed the record`);
    assert.deepEqual(t.baseline.catalogue, baseline.catalogue);
    void s;
  }
  // a missing record is never rebuilt from the code
  for (const key of ['catalogue', 'rule_state']) {
    const b = structuredClone(baseline);
    delete b[key];
    assert.throws(() => tightenBaseline(env.results, b, { registered: env.ids, ruleStates: env.states }), new RegExp(key));
  }
  // a new rule is recorded, catalogue and state together
  const t = tightenBaseline(env.results, { ...structuredClone(baseline), catalogue: baseline.catalogue.slice(1), rule_state: Object.fromEntries(Object.entries(baseline.rule_state).slice(1)) }, { registered: env.ids, ruleStates: env.states });
  assert.deepEqual([...t.baseline.catalogue].sort(), [...env.ids].sort());
  assert.deepEqual(baselineShapeProblems(t.baseline), []);
});

test('CS-06 a baseline that lost or corrupted a field it is read for fails as baseline_malformed: sweep over every required field, every entry field, every spelling (library and CLI)', async () => {
  const env = await real();
  assert.deepEqual(baselineShapeProblems(baseline), [], 'precondition: the committed baseline is well formed');
  const swapped = { catalogue: {}, rule_state: [], history: {}, rules: [], schema: 7, generated: 7 };
  const required = ['schema', 'generated', 'catalogue', 'rule_state', 'history', 'rules'];
  const bad = (b, what) => {
    assert.ok(baselineShapeProblems(b).length > 0, `${what}: no shape problem reported`);
    const v = judge(env.results, b, env);
    assert.equal(v.pass, false, what);
    assert.ok(v.failures.some((f) => f.type === 'baseline_malformed'), what);
  };
  for (const k of required) {
    for (const [name, mutate] of [['deleted', (b) => { delete b[k]; }], ['null', (b) => { b[k] = null; }], ['a string', (b) => { b[k] = 'x'; }], ['the wrong container', (b) => { b[k] = swapped[k]; }]]) {
      const b = structuredClone(baseline); mutate(b); bad(b, `${k} ${name}`);
    }
  }
  { const b = structuredClone(baseline); b.catalogue = []; bad(b, 'an empty catalogue'); }
  { const b = structuredClone(baseline); b.generated = '2026-02-30'; bad(b, 'an impossible generated date'); }
  { const b = structuredClone(baseline); b.rule_state.S001.status = 'sleeping'; bad(b, 'an unknown status'); }
  { const b = structuredClone(baseline); b.rule_state.S001.sev = 'X'; bad(b, 'an unknown severity'); }
  { const b = structuredClone(baseline); delete b.rule_state.S001; bad(b, 'a catalogue id without a state'); }
  { const b = structuredClone(baseline); b.rule_state.ZZ999 = { sev: 'E', status: 'implemented' }; bad(b, 'a state for an unlisted id'); }
  { const b = structuredClone(baseline); b.catalogue.push(b.catalogue[0]); bad(b, 'a duplicated catalogue id'); }
  for (const id of Object.keys(baseline.rules)) {
    for (const [name, mutate] of [['no expires', (e) => { delete e.expires; }], ['expires soon', (e) => { e.expires = 'soon'; }], ['expires 2027-02-30', (e) => { e.expires = '2027-02-30'; }], ['expires 20270131', (e) => { e.expires = '20270131'; }], ['no keys', (e) => { delete e.keys; }], ['keys a string', (e) => { e.keys = 'x'; }], ['count a string', (e) => { e.count = '3'; }]]) {
      const b = structuredClone(baseline); mutate(b.rules[id]);
      assert.ok(baselineShapeProblems(b).length > 0, `${id} ${name}`);
    }
  }
  // the CLI: each deleted field is a verdict of FAIL (exit 1, named), never a pass and never a crash
  const lines = [];
  for (const k of required) {
    const { dir, file } = baselineCopy((b) => { delete b[k]; return b; });
    try {
      const r = run([VALIDATE, '--baseline', file, '--rules', 'S001', '--now', NOW]);
      lines.push(`${k}: exit ${r.status}`);
      assert.equal(r.status, 1, `${k} deleted: ${r.stdout.slice(-300)}${r.stderr.slice(0, 200)}`);
      assert.match(r.stdout, /baseline_malformed/, k);
    } finally { rmrf(dir); }
  }
  for (const text of ['[]', 'null', 'not json', '']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-cs-'));
    const file = path.join(dir, 'baseline.json');
    fs.writeFileSync(file, text);
    try { assert.equal(run([VALIDATE, '--baseline', file, '--rules', 'S001', '--now', NOW]).status, 2, JSON.stringify(text)); } finally { rmrf(dir); }
  }
  assert.equal(lines.length, required.length);
});

test('CS-07 --tighten refuses a baseline without catalogue / rule_state (exit 2, file untouched); --retire-rule keeps catalogue and rule_state in step', () => {
  for (const k of ['catalogue', 'rule_state']) {
    const { dir, file } = baselineCopy((b) => { delete b[k]; return b; });
    try {
      const before = fs.readFileSync(file);
      const r = run([VALIDATE, '--baseline', file, '--tighten', '--now', NOW]);
      assert.equal(r.status, 2, k);
      assert.match(r.stderr, new RegExp(k));
      assert.ok(fs.readFileSync(file).equals(before), `${k}: the baseline was rewritten`);
    } finally { rmrf(dir); }
  }
  const { dir, file } = baselineCopy((b) => { b.catalogue.push('S099'); b.rule_state.S099 = { sev: 'E', status: 'implemented' }; b.rules.S099 = { sev: 'E', wp: 'x', expires: '2099-01-01', count: 1, rows: 1, keys: ['a'] }; return b; });
  try {
    assert.equal(run([VALIDATE, '--baseline', file, '--retire-rule', 'S099', '--reason', 'test', '--now', NOW]).status, 0);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(!after.catalogue.includes('S099') && !('S099' in after.rule_state) && !('S099' in after.rules));
    assert.deepEqual(baselineShapeProblems(after), []);
  } finally { rmrf(dir); }
});

test('CS-08 the CLI flow for a deliberate change: flipping a rule fails, --accept-rule-change records it (logged, entries dropped), and it is required for status and for severity', () => {
  const { base, root } = makeRepoCopy('repo', { full: true });
  const validate = (...a) => run([inRepo(root, 'tools', 'data', 'validate.mjs'), '--now', NOW, ...a]);
  try {
    assert.equal(validate('--no-site').status, 0, 'precondition');
    editRule(root, 'S003', (seg) => seg.replace(/status: '(?:implemented|partial)'/, "status: 'deferred', blocked_by: 'because'"));
    editRule(root, 'S004', (seg) => seg.replace(/sev: 'E'/, "sev: 'W'"));
    let r = validate('--no-site');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /\[rule_deferred\] rule S003/);
    assert.match(r.stdout, /\[severity_lowered\] rule S004/);
    assert.equal(validate('--accept-rule-change', 'S003').status, 2, 'a reason is required');
    assert.equal(validate('--accept-rule-change', 'NOPE99', '--reason', 'x').status, 2, 'an unknown rule');
    assert.equal(validate('--accept-rule-change', 'S001', '--reason', 'x').status, 2, 'an unchanged rule has nothing to accept');
    r = validate('--accept-rule-change', 'S003', '--reason', 'blocked on the schema rewrite');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(validate('--no-site').status, 1, 'S004 is still unaccepted');
    assert.equal(validate('--accept-rule-change', 'S004', '--reason', 'softened on purpose').status, 0);
    assert.equal(validate('--no-site').status, 0);
    const b = JSON.parse(fs.readFileSync(inRepo(root, 'tools', 'data', 'baseline.json'), 'utf8'));
    assert.deepEqual(b.rule_state.S003, { sev: 'E', status: 'deferred' });
    assert.deepEqual(b.rule_state.S004, { sev: 'W', status: 'implemented' });
    const logged = b.history.filter((h) => h.action === 'accept-rule-change');
    assert.deepEqual(logged.map((h) => [h.rule, h.before.status, h.after.status, h.reason]), [['S003', 'implemented', 'deferred', 'blocked on the schema rewrite'], ['S004', 'implemented', 'implemented', 'softened on purpose']]);
    assert.equal(logged[0].date, NOW);
    assert.deepEqual(baselineShapeProblems(b), []);
    // accepting a deferral drops the entries the rule can no longer judge
    editRule(root, 'S005', (seg) => seg.replace(/status: '(?:implemented|partial)'/, "status: 'deferred', blocked_by: 'because'"));
    r = validate('--accept-rule-change', 'S005', '--reason', 'x');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /49 baseline fingerprint\(s\) dropped/);
    assert.ok(!('S005' in JSON.parse(fs.readFileSync(inRepo(root, 'tools', 'data', 'baseline.json'), 'utf8')).rules));
  } finally { rmrf(base); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// CS-09..11: a missing input
// ---------------------------------------------------------------------------------------------------------------------------------

const U001_PAGES = ['search.html', 'regiment.html', 'find-ancestor.html', 'historian.html', 'report.html'];

test('CS-09 U001 needs both halves: any missing page (or no deploy tree) is "input not available", never "ok"; a switched-off site is not applicable', async () => {
  const pages = Object.fromEntries(U001_PAGES.map((p) => [p, "fetch('/data/oob/union_artillery.json'); fetch('/data/oob/confederate_artillery.json');"]));
  const judgeU = async (files, ctxOpts = {}) => {
    const dist = files ? fixtureDist(files) : null;
    try {
      const { results } = await runValidation({ data: clone(), site: false, only: ['U001'], now: NOW, ctxOpts: { bundlePath: null, distDir: dist, ...ctxOpts } });
      return results.get('U001');
    } finally { if (dist) rmrf(dist); }
  };
  const full = await judgeU(pages);
  assert.equal(full.ran, true);
  assert.equal(full.violations.length, 0, 'all five pages load both artillery files and the real index is complete');
  for (const missing of U001_PAGES) {
    const { [missing]: _gone, ...rest } = pages;
    const r = await judgeU({ ...rest, 'other.html': 'x' });
    assert.equal(r.ran, false, `${missing} missing`);
    assert.ok(!r.notApplicable, missing);
    assert.equal(evaluateRatchet(new Map([['U001', r]]), { rules: {} }, { now: NOW }).pass, false, `${missing}: a missing page must fail the ratchet`);
  }
  const noTree = await judgeU(null, { distDir: path.join(os.tmpdir(), 'gtbg-cs-no-such-dist') });
  assert.equal(noTree.ran, false);
  assert.ok(!noTree.notApplicable);
  const off = await judgeU(null, { distDir: null });
  assert.equal(off.notApplicable, true);
});

const KNOWN_INPUTS = [
  'data-src/authorities/authorities.json', 'data-src/build/facts.json', 'data-src/build/unit_index.json', 'data-src/build/unit_registry.json', 'data-src/CHANGELOG.md',
  'data-src/data.lock.json', 'data-src/version.json', 'data-src/policy/retired_literals.json', 'data-src/policy/source_tiers.json',
  'data-src/schemas/casualty.schema.json', 'data-src/schemas/chronology.schema.json', 'data-src/schemas/common.schema.json', 'data-src/schemas/monuments_overlay.schema.json',
  'data-src/schemas/oob.schema.json', 'data-src/schemas/placement_doc.schema.json', 'data-src/schemas/placements.schema.json', 'data-src/schemas/terrain.schema.json', 'data-src/schemas/vignettes.schema.json',
  'legacy/analysis/bundle.pretty.js', ...U001_PAGES.map((p) => `legacy/dist/${p}`), 'tools/data/baseline.json',
];
// read by the validator, but not something a verdict can depend on
const INFORMATIONAL_INPUT = (rel) => rel === 'docs/plan/data/time-facts-anchors.csv' /* the warped-clock PROPOSAL: only the report's informational count reads it */
  || rel.startsWith('data-src/time/') /* another workstream's files: F002 scans them for {{facts.*}} tokens like any other text */
  /* Decision R1E-ACC-1 (2026-10-22): the workstreams that came after this test (environment, ledger, sources-v2) put .json files under data-src/. The only reader is
     rule F002 (tools/data/rules/facts_rules.mjs walks data-src/**.{md,html,json,txt} for {{facts.*}} tokens; grep finds no other tool/rule under tools/data that names these
     directories). Like data-src/time/ above, a file that is missing removes no verdict (F002 reports tokens that do not resolve, never a missing file), so none of them can be a
     KNOWN_INPUT. Each directory is named: a new directory under data-src/ the validator starts to read for another reason is still reported as undecided. */
  || rel.startsWith('data-src/environment/') || rel.startsWith('data-src/ledger/') || rel.startsWith('data-src/sources-v2/')
  || /^legacy\/dist\/(?:[^/]+|assets\/[^/]+)$/.test(rel) /* the scanned deploy corpus: a scan of "whatever is there" (the named members are in KNOWN_INPUTS) */
  || rel.startsWith('legacy/dist/data/') /* the data tree itself: D002, the manifest and the lock turn red on a missing file */
  || rel.startsWith('tools/data/') || rel.startsWith('node_modules/');

test('CS-10 the validator reads no input nobody decided about (fs is traced), and deleting any input it depends on turns the run red (sweep over the discovered files, four copies in parallel)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-cs-trace-'));
  const traceFile = path.join(dir, 'reads.txt');
  try {
    const r = run(['--import', pathToFileURL(path.join(REPO_ROOT, 'tests', 'data', 'trace_reads_preload.mjs')).href, VALIDATE, '--now', NOW], { env: { ...process.env, TRACE_OUT: traceFile, TRACE_ROOT: REPO_ROOT } });
    assert.equal(r.status, 0, r.stdout.slice(-300));
    const traced = fs.readFileSync(traceFile, 'utf8').split('\n').filter(Boolean).filter((rel) => { try { return fs.statSync(path.join(REPO_ROOT, rel)).isFile(); } catch { return false; } });
    const undecided = traced.filter((rel) => !KNOWN_INPUTS.includes(rel) && !INFORMATIONAL_INPUT(rel));
    assert.deepEqual(undecided, [], 'the validator reads a file this test has no opinion about: add it to KNOWN_INPUTS (it must turn the run red when missing) or justify it in INFORMATIONAL_INPUT');
    assert.deepEqual(KNOWN_INPUTS.filter((rel) => !traced.includes(rel)), [], 'a file this test lists is no longer read by the validator');
  } finally { rmrf(dir); }
  const workers = 4;
  const copies = Array.from({ length: workers }, () => makeRepoCopy('repo', { full: true }));
  const queue = [...KNOWN_INPUTS];
  const green = [];
  try {
    await Promise.all(copies.map(async ({ root }) => {
      while (queue.length) {
        const rel = queue.shift();
        const p = path.join(root, ...rel.split('/'));
        const bytes = fs.readFileSync(p);
        fs.rmSync(p);
        try {
          const res = await runAsync([path.join(root, 'tools', 'data', 'validate.mjs'), '--now', NOW]);
          if (res.status === 0) green.push(rel);
        } finally { fs.writeFileSync(p, bytes); }
      }
    }));
  } finally { for (const c of copies) rmrf(c.base); }
  assert.deepEqual(green, [], 'these inputs are gone and the validator still says PASS');
});

test('CS-11 every generated artifact a --check covers is reported STALE when it is missing (facts, registry, rights audit, candidate manifest); none is silently skipped', async () => {
  const { base, root } = makeRepoCopy('repo', { full: true });
  const build = (...p) => inRepo(root, 'data-src', 'build', ...p);
  const groups = [
    { cli: 'facts.mjs', args: ['--check'], files: [build('facts.json'), build('unit_aliases.json'), ...['notable_intensity', 'adjudication_register', 'confederate_cavalry_commanders', 'rollups'].map((n) => build('candidates', `${n}.json`))] },
    { cli: 'unit_registry.mjs', args: ['--check'], files: [build('unit_registry.json'), build('id_crosswalk.json'), build('id_collisions.json'), build('unit_index.json'), build('candidates', 'vi_corps_brigades.json'), build('candidates', 'batteries_regiment_shape.json')] },
    { cli: 'rights_audit.mjs', args: ['--check'], files: [build('legacy-rights-audit.csv'), inRepo(root, 'docs', 'data', 'rights-audit.md')] },
    { cli: 'manifest.mjs', args: ['verify'], files: [build('data-manifest.json')] },
  ];
  try {
    for (const g of groups) for (const f of g.files) assert.ok(fs.existsSync(f), `precondition: ${f}`);
    const outcomes = await Promise.all(groups.map(async (g) => {
      const saved = g.files.map((f) => [f, fs.readFileSync(f)]);
      for (const f of g.files) fs.rmSync(f);
      const res = await runAsync([inRepo(root, 'tools', 'data', g.cli), ...g.args]);
      for (const [f, b] of saved) fs.writeFileSync(f, b);
      return { g, res };
    }));
    for (const { g, res } of outcomes) {
      assert.notEqual(res.status, 0, `${g.cli} ${g.args.join(' ')} says OK with every output missing`);
      const said = res.stderr + res.stdout;
      for (const f of g.files) assert.ok(said.includes(path.basename(f)), `${g.cli}: the missing ${path.basename(f)} is not named in: ${said.slice(0, 300)}`);
    }
    // ... and each checker notices one altered byte of EVERY artifact (all of a group's files are altered at once; each one must be named)
    const altered = await Promise.all(groups.map(async (g) => {
      const saved = g.files.map((f) => [f, fs.readFileSync(f)]);
      for (const f of g.files) fs.appendFileSync(f, ' ');
      const res = await runAsync([inRepo(root, 'tools', 'data', g.cli), ...g.args]);
      for (const [f, bytes] of saved) fs.writeFileSync(f, bytes);
      return { g, res };
    }));
    for (const { g, res } of altered) {
      assert.notEqual(res.status, 0, `${g.cli}: altered artifacts go unnoticed`);
      for (const f of g.files) assert.ok((res.stderr + res.stdout).includes(path.basename(f)), `${g.cli}: an appended space in ${path.basename(f)} goes unnoticed: ${(res.stderr + res.stdout).slice(0, 300)}`);
    }
  } finally { rmrf(base); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// CS-12..13: derived numbers count what they name, and the measured column is never typed
// ---------------------------------------------------------------------------------------------------------------------------------

const factsOf = (d) => JSON.parse(generateFacts(buildContext({ data: d, bundlePath: null, distDir: null })));
const rowFiles = (d) => [...d.files].filter(([rel]) => /^(placements_|density_)/.test(rel)).map(([, f]) => f.json.placements);

test('CS-12 facts.placements: a row outside the tick model fills none of its ticks (sweep over odd tick values and over several tick models); with + without = total always', () => {
  const f0 = factsOf(clone());
  assert.equal(f0.placements.ticks_with_rows + f0.placements.ticks_without_rows, f0.ticks.total);
  assert.equal(f0.placements.rows_outside_tick_model, 0);
  for (const tick of [0, -5, 676, 700, 9999, 1e9, 2.5, 0.5, 674.5, '7', '300', null]) {
    const d = clone();
    d.files.get('placements_day3_ticks601_675.json').json.placements.push({ unit_id: 'U-I-1-1', tick, lat: 39.8, lng: -77.2, bearing: 0, disposition: 'Line of Battle', strength: 100 });
    const f = factsOf(d);
    const why = `tick ${JSON.stringify(tick)}`;
    assert.equal(f.placements.ticks_without_rows, f0.placements.ticks_without_rows, why);
    assert.equal(f.placements.ticks_with_rows, f0.placements.ticks_with_rows, why);
    assert.equal(f.placements.rows_outside_tick_model, 1, why);
    assert.equal(f.placements.distinct_row_ticks, f0.placements.distinct_row_ticks + 1, why);
    assert.equal(f.ticks.total, 675, why);
  }
  // in-range rows move with + without = total, for every seam and boundary tick
  for (const ticks of [[1], [2], [225], [226], [450], [451], [674], [675], [1, 225, 226, 450, 451, 675], [3, 4, 5, 6]]) {
    const d = clone();
    ticks.forEach((t, i) => d.files.get('placements_day3_ticks601_675.json').json.placements.push({ unit_id: `U-SWEEP-${i}`, tick: t, lat: 39.8, lng: -77.2, bearing: 0, disposition: 'Line of Battle', strength: 100 }));
    const f = factsOf(d);
    const have = new Set(rowFiles(d).flat().map((r) => r.tick).filter((t) => Number.isInteger(t) && t >= 1 && t <= 675));
    assert.equal(f.placements.ticks_with_rows, have.size, `ticks ${ticks}`);
    assert.equal(f.placements.ticks_with_rows + f.placements.ticks_without_rows, 675, `ticks ${ticks}`);
    assert.equal(f.placements.rows_outside_tick_model, 0);
  }
  // other tick models: every count follows the declared ranges (and the rows outside them are counted apart)
  for (const ranges of [[[1, 100], [101, 300], [301, 700]], [[1, 225], [226, 450], [451, 600]], [[1, 10], [11, 20], [21, 30]], [[5, 50], [51, 60], [61, 70]]]) {
    const d = clone();
    ranges.forEach((r, i) => { d.files.get(`chronology_day${i + 1}.json`).json.metadata[`day${i + 1}_tick_range`] = r; });
    const f = factsOf(d);
    const first = ranges[0][0], last = ranges[2][1];
    const all = rowFiles(d).flat();
    const have = new Set(all.map((r) => r.tick).filter((t) => Number.isInteger(t) && t >= first && t <= last));
    assert.equal(f.ticks.total, last - first + 1, JSON.stringify(ranges));
    assert.equal(f.placements.ticks_with_rows, have.size, JSON.stringify(ranges));
    assert.equal(f.placements.ticks_without_rows, last - first + 1 - have.size, JSON.stringify(ranges));
    assert.equal(f.placements.rows_outside_tick_model, all.filter((r) => !(Number.isInteger(r.tick) && r.tick >= first && r.tick <= last)).length, JSON.stringify(ranges));
  }
  // no tick model (a chronology file without its range): nothing is claimed
  const d = clone();
  delete d.files.get('chronology_day2.json').json.metadata.day2_tick_range;
  const f = factsOf(d);
  assert.deepEqual([f.ticks.total, f.placements.ticks_with_rows, f.placements.ticks_without_rows, f.placements.rows_outside_tick_model], [null, null, null, null]);
  assert.equal(f.placements.distinct_row_ticks, f0.placements.distinct_row_ticks);
});

const MEASURE_ADD_CALLS_MIN = 40;
/** Numeric literals inside the `measured` (4th) argument of every add(...) call of measure.mjs that are not one of the structural 0, 1 or the percent scale 100. */
function typedNumbersInMeasured(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  const found = [];
  let calls = 0;
  walk.simple(ast, {
    CallExpression(node) {
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'add' || node.arguments.length < 5) return;
      calls++;
      const [, fact, , measured] = node.arguments;
      walk.simple(measured, { Literal(l) { if (typeof l.value === 'number' && ![0, 1, 100].includes(l.value)) found.push(`line ${l.loc.start.line} ${src.slice(fact.start, fact.end).slice(0, 60)}: ${l.value}`); } });
    },
  });
  return { found, calls };
}

test('CS-13 the measured column of the baseline report is derived, never typed: no number in a measured expression (static, parsed), and every derived row follows mutations of the data (sweep)', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'tools', 'data', 'lib', 'measure.mjs'), 'utf8');
  const { found, calls } = typedNumbersInMeasured(src);
  assert.ok(calls >= MEASURE_ADD_CALLS_MIN, `only ${calls} add() calls parsed: the checker is not looking at the measurements`);
  assert.deepEqual(found, []);
  // the checker catches the defect it is there for (RV-05's shape) and lets the derived form through
  assert.equal(typedNumbersInMeasured("add('coverage', 'x', 250, 467 - c.regimentsOwn, 'src');").found.length, 1);
  assert.equal(typedNumbersInMeasured("add('coverage', 'x', 250, records - c.regimentsOwn, 'src');").found.length, 0);
  assert.equal(typedNumbersInMeasured("add('a', 'x', 1, [1, 100, 300, 538].map(win).join('/'), 'src');").found.length, 2);

  const measure = (d) => {
    const ctx = buildContext({ data: d, bundlePath: null, distDir: null });
    const crosswalk = buildCrosswalk(ctx);
    const byTarget = new Map();
    for (const e of crosswalk.entries) if (e.proposed && !e.new_record) { if (!byTarget.has(e.proposed)) byTarget.set(e.proposed, []); byTarget.get(e.proposed).push(e); }
    return measureSection2(ctx, { crosswalk, registry: buildRegistry(ctx, byTarget) });
  };
  const get = (rows, rx) => { const r = rows.find((x) => rx.test(x.fact)); assert.ok(r, String(rx)); return r; };
  const base = measure(clone());
  const recs0 = get(base, /^regiment records \(regiment \+ the horse battery/).measured;
  const noOwn0 = get(base, /^regiment records with no own placement/).measured;
  const own0 = get(base, /^regiments with an own placement/);
  const ids0 = get(base, /^distinct OOB ids/).measured;
  assert.equal(own0.fact, 'regiments with an own placement (of 465)', 'the label names the derived total');
  // k extra regiments without a track: records, unplaced records and ids move by exactly k, the label follows the total
  for (const k of [1, 2, 3, 5]) {
    const d = clone();
    const regs = d.files.get('oob/union_regiments_i_ii_corps.json').json.regiments;
    for (let i = 0; i < k; i++) regs.push({ ...structuredClone(regs[0]), regiment_id: `U-99${i}NY`, designation: `99${i}th New York Volunteer Infantry` });
    const m = measure(d);
    assert.equal(get(m, /^regiment records \(regiment \+ the horse battery/).measured, recs0 + k, `k=${k}`);
    assert.equal(get(m, /^regiment records with no own placement/).measured, noOwn0 + k, `k=${k}`);
    assert.equal(get(m, /^distinct OOB ids/).measured, ids0 + k, `k=${k}`);
    assert.equal(get(m, /^regiments with an own placement/).fact, `regiments with an own placement (of ${465 + k})`, `k=${k}`);
    assert.match(get(m, /^regiment records with no own placement/).note, new RegExp(`^the ${noOwn0 + k} counts`));
  }
  // a regiment WITH a track: records +1, own +1, unplaced records unchanged
  {
    const d = clone();
    const regs = d.files.get('oob/union_regiments_i_ii_corps.json').json.regiments;
    regs.push({ ...structuredClone(regs[0]), regiment_id: 'U-99NY', designation: '99th New York Volunteer Infantry' });
    placementFile(d, 'placements_day3_ticks601_675.json').push(row('U-99NY', 610));
    const m = measure(d);
    assert.equal(get(m, /^regiment records \(regiment \+ the horse battery/).measured, recs0 + 1);
    assert.equal(get(m, /^regiment records with no own placement/).measured, noOwn0);
    assert.equal(get(m, /^regiments with an own placement/).measured, own0.measured + 1);
  }
  // rows outside the tick model populate no tick (the same rule as facts.placements.ticks_with_rows)
  {
    const d = clone();
    const a = placementFile(d, 'placements_day3_ticks601_675.json');
    for (let i = 0; i < 120; i++) a.push(row('U-I-1-1', 9999, 39.8, -77.2 - i * 1e-5));
    a.push(row('U-I-1-1', 676), row('U-I-1-1', 0), row('U-I-1-1', 2.5));
    const m = measure(d);
    for (const rx of [/^ticks with at least one row/, /^populated ticks by day/, /^max rows at one tick/, /^median rows per populated tick/]) assert.equal(get(m, rx).measured, get(base, rx).measured, String(rx));
  }
  // day seams come from the tick model, not from typed numbers
  {
    const d = clone();
    [[1, 100], [101, 300], [301, 700]].forEach((r, i) => { d.files.get(`chronology_day${i + 1}.json`).json.metadata[`day${i + 1}_tick_range`] = r; });
    const ctx = buildContext({ data: d, bundlePath: null, distDir: null });
    const byDay = [0, 0, 0];
    for (const t of new Set(ctx.rows.map((r) => r.tick))) byDay[t <= 100 ? 0 : t <= 300 ? 1 : 2]++;
    const m = measure(d);
    assert.equal(get(m, /^populated ticks by day/).measured, byDay.join('/'));
    assert.equal(get(m, /^units whose last keyframe is on Day 1/).measured, [...ctx.merged.values()].filter((l) => l[l.length - 1].tick <= 100).length);
  }
  // no tick model: the rows that need one say so instead of guessing day seams
  {
    const d = clone();
    delete d.files.get('chronology_day3.json').json.metadata.day3_tick_range;
    const m = measure(d);
    assert.equal(get(m, /^populated ticks by day/).measured, 'n/a (no tick model)');
    assert.equal(get(m, /^units whose last keyframe is on Day 1/).measured, 'n/a (no tick model)');
  }
  // thresholds are the named constants of the rules, and the labels say so
  assert.ok(base.some((r) => r.fact === 'stationary (< 30 m)') && base.some((r) => r.fact === 'moving (> 250 m)'));
});

// ---------------------------------------------------------------------------------------------------------------------------------
// CS-14..17: baseline expiry
// ---------------------------------------------------------------------------------------------------------------------------------

const EXPIRIES = [...new Set(Object.values(baseline.rules).map((e) => e.expires))].sort();
const FIRST = EXPIRIES[0], LAST = EXPIRIES.at(-1);

test('CS-14 expiry arithmetic (pure): strict calendar dates, and the ok / warning / expired boundaries are exact for every baseline date (sweep)', () => {
  // every day of eight years round-trips through addDays/parseIsoDate, leap days included
  let d = '2024-01-01';
  const start = parseIsoDate(d);
  for (let i = 0; i < 365 * 8 + 2; i++) { assert.equal(parseIsoDate(d), start + i, d); d = addDays(d, 1); }
  assert.equal(d, '2032-01-01');
  assert.ok(parseIsoDate('2028-02-29') !== null);
  for (const bad of ['2027-02-29', '2027-13-01', '2027-00-10', '2027-1-5', '20270131', '2027-01-31T00:00', ' 2027-01-31', '2027-01-32', '2027-04-31', 'tomorrow', '', null, undefined, 20270131, {}, []]) assert.equal(parseIsoDate(bad), null, JSON.stringify(bad));
  assert.equal(EXPIRY_WARN_DAYS, 30);
  for (const E of EXPIRIES) {
    for (let k = -45; k <= 400; k++) {
      const now = addDays(E, -k);
      assert.equal(daysUntil(E, now), k);
      assert.equal(expiryStatus(E, now), k < 0 ? 'expired' : k <= 30 ? 'warning' : 'ok', `${E} with ${k} days left`);
    }
    assert.equal(expiryStatus(E, addDays(E, -30), 7), 'ok');
    assert.equal(expiryStatus(E, addDays(E, -7), 7), 'warning');
  }
  for (const bad of [null, undefined, '', 'soon', '2027-02-30']) assert.equal(expiryStatus(bad, NOW), 'invalid');
  assert.throws(() => expiryReport(baseline, { now: '2027-02-30' }), /ISO date/);
  // the report only lists what is baselined, soonest first, with the days left
  const rep = expiryReport(baseline, { now: NOW });
  assert.equal(rep.rows.length, Object.keys(baseline.rules).length);
  assert.deepEqual(rep.rows.map((r) => r.days_left), [...rep.rows.map((r) => r.days_left)].sort((a, b) => a - b));
  assert.equal(rep.next.expires, FIRST);
  assert.equal(rep.rows[0].days_left, daysUntil(FIRST, NOW));
});

test('CS-15 tools/data/expiry.mjs: exit 0 with a WARNING from 30 days before a date (the date itself included), exit 1 from the day after, exit 2 on bad input; annotations only under GitHub Actions', () => {
  const cli = (now, ...a) => run([EXPIRY, '--now', now, ...a], { env: { ...process.env, GITHUB_ACTIONS: '' } });
  const before31 = cli(addDays(FIRST, -31));
  assert.equal(before31.status, 0);
  assert.doesNotMatch(before31.stdout, /WARNING:/);
  assert.match(before31.stdout, /no baseline expires within 30 days/);
  for (const k of [30, 29, 10, 1, 0]) {
    const r = cli(addDays(FIRST, -k));
    assert.equal(r.status, 0, `${k} days before: still a pass`);
    assert.match(r.stdout, /WARNING: \w+ baseline expires/, `${k} days before`);
    assert.doesNotMatch(r.stdout, /EXPIRED:/);
    assert.match(r.stdout, /PASS: nothing expired \(\d+ within 30 days/);
  }
  assert.match(cli(FIRST).stdout, /today is the last day/);
  for (const now of [addDays(FIRST, 1), addDays(FIRST, 90), addDays(LAST, 1), '2099-01-01']) {
    const r = cli(now);
    assert.equal(r.status, 1, now);
    assert.match(r.stdout, /EXPIRED: \w+ baseline expired/, now);
    assert.match(r.stdout, /FAIL: \d+ expired/);
  }
  assert.equal(cli(LAST).status, 1, 'the earlier families are already expired on the last date');
  // the window is an option
  assert.doesNotMatch(cli(addDays(FIRST, -5), '--warn-days', '0').stdout, /WARNING:/);
  assert.match(cli(addDays(FIRST, -45), '--warn-days', '60').stdout, /WARNING:/);
  assert.equal(cli(NOW, '--warn-days', '-1').status, 2);
  assert.equal(cli(NOW, '--warn-days', 'x').status, 2);
  // machine form
  const j = JSON.parse(cli(addDays(FIRST, -10), '--json').stdout);
  assert.equal(j.warn_days, 30);
  assert.ok(j.warning.length > 0 && j.expired.length === 0);
  // annotations only under Actions
  assert.match(run([EXPIRY, '--now', addDays(FIRST, -10)], { env: { ...process.env, GITHUB_ACTIONS: 'true' } }).stdout, /^::warning title=baseline expiry::/m);
  assert.doesNotMatch(cli(addDays(FIRST, -10)).stdout, /^::warning/m);
  assert.match(run([EXPIRY, '--now', addDays(FIRST, 5)], { env: { ...process.env, GITHUB_ACTIONS: 'true' } }).stdout, /^::error title=baseline expired::/m);
  // bad input
  for (const now of ['2027-02-30', 'soon', '20270131', '']) assert.equal(run([EXPIRY, '--now', now]).status, 2, JSON.stringify(now));
  assert.equal(run([EXPIRY, '--now', NOW, '--baseline', path.join(os.tmpdir(), 'gtbg-cs-no-such-baseline.json')]).status, 2);
  // an entry without a usable date never comes due: that is a failure of its own
  const { dir, file } = baselineCopy((b) => { delete b.rules.S005.expires; return b; });
  try {
    const r = run([EXPIRY, '--now', NOW, '--baseline', file]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /INVALID: S005/);
  } finally { rmrf(dir); }
});

test('CS-16 the verdict of the ratchet and of validate.mjs does not depend on the date (sweep over four years), and only the explicit gates fail on it', async () => {
  const env = await real();
  let n = 0;
  for (let off = -400; off <= 1500; off += 37) {
    const now = addDays(NOW, off);
    const v = judge(env.results, baseline, env, { now });
    assert.equal(v.pass, true, `${now}: the content verdict moved with the date`);
    assert.deepEqual(v.failures, []);
    const enforced = judge(env.results, baseline, env, { now, expiry: 'enforce' });
    assert.equal(enforced.pass, !Object.values(baseline.rules).some((e) => e.expires < now), `${now}: enforce`);
    assert.equal(v.expiry.now, now);
    n++;
  }
  assert.ok(n > 40);
  for (const now of [addDays(FIRST, -10), addDays(FIRST, 1), addDays(LAST, 400)]) {
    const r = run([VALIDATE, '--no-site', '--now', now]);
    assert.equal(r.status, 0, `${now}: ${r.stdout.slice(-200)}`);
    assert.match(r.stdout, /baseline expiry: clock /);
  }
  assert.match(run([VALIDATE, '--no-site', '--now', addDays(FIRST, -10)]).stdout, /WARNING: baseline expires \d{4}-\d\d-\d\d \(in 10 days\) for \d+ rules \(/);
  const late = run([VALIDATE, '--no-site', '--now', addDays(LAST, 1)]);
  assert.match(late.stdout, /EXPIRED: baseline expired \d{4}-\d\d-\d\d \(\d+ days? ago\) for \d+ rules \(/);
  assert.equal(late.stdout.split('\n').filter((l) => /^EXPIRED:/.test(l)).length, EXPIRIES.length, 'one line per date, not one per rule');
  assert.match(late.stdout, /expiry\.mjs/);
  assert.equal(run([VALIDATE, '--no-site', '--now', addDays(LAST, 1), '--enforce-expiry']).status, 1);
  assert.equal(run([VALIDATE, '--no-site', '--now', addDays(FIRST, -5), '--enforce-expiry']).status, 0);
  for (const now of ['2027-02-30', 'soon']) assert.equal(run([VALIDATE, '--no-site', '--now', now]).status, 2, now);
  assert.equal(run([VALIDATE, '--no-site', '--now']).status, 2, '--now without a value');
  // the machine form carries the expiry report and stays parseable with --no-site (the skip note goes to stderr)
  const json = JSON.parse(run([VALIDATE, '--no-site', '--json', '--now', addDays(FIRST, -10)]).stdout);
  assert.equal(json.pass, true);
  assert.equal(json.expiry.rows.length, Object.keys(baseline.rules).length);
  assert.ok(json.expiry.warning.length > 0 && json.expiry.expired.length === 0);
});

test('CS-16b no rule reads the date (every rule gives the same verdict whatever clock it is given), and the wall clock is read in exactly one place of tools/data', async () => {
  const sig = (res) => JSON.stringify([...res].map(([id, r]) => [id, r.ran, Boolean(r.notApplicable), r.violations.map((v) => v.key)]));
  const base = sig((await real()).results); // the clock is null here
  for (const now of ['1999-12-31', '2099-12-31']) assert.equal(sig((await runValidation({ now })).results), base, `a rule verdict moved with the clock ${now}`);
  const files = [];
  const walkDir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walkDir(f); else if (f.endsWith('.mjs')) files.push(f); } };
  walkDir(path.join(REPO_ROOT, 'tools', 'data'));
  const rel = (f) => path.relative(REPO_ROOT, f).split(path.sep).join('/');
  const reads = [], callers = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    walk.simple(acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }), {
      NewExpression(n) { if (n.callee.type === 'Identifier' && n.callee.name === 'Date' && n.arguments.length === 0) reads.push(rel(f)); },
      CallExpression(n) {
        if (n.callee.type === 'MemberExpression' && n.callee.object.name === 'Date' && n.callee.property.name === 'now') reads.push(rel(f));
        if (n.callee.type === 'Identifier' && (n.callee.name === 'Date' || n.callee.name === 'isoDate')) (n.callee.name === 'Date' ? reads : callers).push(rel(f));
      },
    });
  }
  assert.deepEqual(reads, ['tools/data/lib/util.mjs'], 'the wall clock is read only by the isoDate helper in util.mjs');
  assert.deepEqual(callers.sort(), ['tools/data/expiry.mjs', 'tools/data/validate.mjs'], 'only the two CLIs default their clock to today');
});

test('CS-17 --renew moves one expiry (logged, bounded) and refuses every input that would hide debt; a baseline cannot be created already expired', async () => {
  const E = baseline.rules.S005.expires;
  const ok = addDays(E, 30);
  const cases = [
    { name: 'until equals the current expiry', args: ['--until', E], code: 2 },
    { name: 'until before the current expiry', args: ['--until', addDays(E, -1)], code: 2 },
    { name: 'until in the past', args: ['--until', addDays(NOW, -1)], code: 2 },
    { name: 'until today', args: ['--until', NOW], code: 2 },
    { name: 'until beyond the horizon', args: ['--until', addDays(NOW, MAX_RENEWAL_DAYS + 1)], code: 2 },
    { name: 'until 2099', args: ['--until', '2099-01-01'], code: 2 },
    { name: 'until not a date', args: ['--until', '2027-02-30'], code: 2 },
    { name: 'until garbage', args: ['--until', 'soon'], code: 2 },
    { name: 'no until', args: [], code: 2 },
    { name: 'no reason', args: ['--until', ok], code: 2, noReason: true },
  ];
  for (const c of cases) {
    const { dir, file } = baselineCopy();
    try {
      const before = fs.readFileSync(file);
      const r = run([VALIDATE, '--baseline', file, '--renew', 'S005', ...c.args, ...(c.noReason ? [] : ['--reason', 'test']), '--now', NOW]);
      assert.equal(r.status, c.code, `${c.name}: ${r.stdout}${r.stderr}`);
      assert.ok(fs.readFileSync(file).equals(before), `${c.name}: the baseline was rewritten`);
    } finally { rmrf(dir); }
  }
  for (const id of ['NOPE99', 'S001']) {
    const { dir, file } = baselineCopy();
    try { assert.equal(run([VALIDATE, '--baseline', file, '--renew', id, '--until', ok, '--reason', 'x', '--now', NOW]).status, 2, `${id} has no entries to renew`); } finally { rmrf(dir); }
  }
  // the accepted renewal: exactly one date moves, the history says who/why/when, the rest of the file is untouched
  for (const until of [ok, addDays(NOW, MAX_RENEWAL_DAYS)]) {
    const { dir, file } = baselineCopy();
    try {
      const r = run([VALIDATE, '--baseline', file, '--renew', 'S005', '--until', until, '--reason', 'waiting for the WP-DATA-03 schema', '--now', NOW]);
      assert.equal(r.status, 0, r.stderr);
      const b = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(b.rules.S005.expires, until);
      assert.deepEqual(b.history.at(-1), { date: NOW, action: 'renew', rule: 'S005', from: E, to: until, reason: 'waiting for the WP-DATA-03 schema' });
      const expected = structuredClone(baseline);
      expected.rules.S005.expires = until; expected.history.push(b.history.at(-1)); expected.generated = NOW;
      assert.deepEqual(b, expected);
      assert.deepEqual(baselineShapeProblems(b), []);
      // a renewed entry is out of the warning window
      assert.equal(expiryReport(b, { now: addDays(E, -5) }).rows.find((x) => x.id === 'S005').status, 'ok');
    } finally { rmrf(dir); }
  }
  // born expired: a family default that is already past fails loudly instead of writing a baseline that is red on creation
  const env = await real();
  assert.throws(() => buildBaseline(env.results, { generated: addDays(LAST, 1), dataInfo: {} }), /FAMILY_EXPIRY/);
  assert.doesNotThrow(() => buildBaseline(env.results, { generated: NOW, dataInfo: {} }));
  assert.throws(() => buildBaseline(env.results, { generated: NOW, dataInfo: {}, previous: { ...baseline, rules: Object.fromEntries(Object.entries(baseline.rules).map(([k, v]) => [k, { ...v, expires: 'never' }])) } }), /not a date/);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// CS-18..19: the specialist comparison and the committed reports
// ---------------------------------------------------------------------------------------------------------------------------------

test('CS-18 a specialist figure is reproduced only when the KEYS match: sweep over every subset of the six listed keys, with and without an extra key', () => {
  const theirs = SPECIALIST_DV07.keys;
  assert.equal(theirs.length, 6);
  for (let mask = 0; mask < 64; mask++) {
    const common = theirs.filter((_, i) => (mask >> i) & 1);
    for (const extra of [[], ['X-1|1-2'], ['X-1|1-2', 'X-2|3-4']]) {
      const c = compareKeySets([...common, ...extra], theirs);
      assert.equal(c.matched.length, common.length);
      assert.equal(c.theirs_only.length, 6 - common.length);
      assert.equal(c.ours_only.length, extra.length);
      assert.equal(c.all_match, common.length === 6 && extra.length === 0);
      if (c.all_match) assert.match(c.sentence, /reproduced/);
      else { assert.doesNotMatch(c.sentence, /reproduced/); assert.match(c.sentence, new RegExp(`^${common.length} of the specialist's 6 keys match`)); }
    }
  }
  assert.equal(compareKeySets(['a'], ['a']).all_match, true);
  assert.equal(compareKeySets([], []).all_match, true);
});

test('CS-19 the committed G003 statements say what the data says (5 of the specialist\'s 6 keys), and docs/data + data-quality-report.json are exactly what the generators emit', async () => {
  const { results } = await runValidation({ only: ['G003'], site: false, now: NOW });
  const cmp = compareKeySets(results.get('G003').violations.map((v) => v.key), SPECIALIST_DV07.keys);
  assert.equal(cmp.matched.length, 5, 'the frozen tree: G003 and qa-ci DV-07 share five keys');
  assert.deepEqual(cmp.theirs_only, ['U-8IL|1-3']);
  assert.deepEqual(cmp.ours_only, ['C-I-3-1|548-549']);
  const report = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'data', 'baseline-report.md'), 'utf8');
  const contrib = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'data', 'CONTRIBUTING-DATA.md'), 'utf8');
  assert.match(report, /5 of the specialist's 6 keys match \(this suite finds 6\)/);
  assert.match(report, /only in the specialist's list: U-8IL\\\|1-3; only here: C-I-3-1\\\|548-549/);
  assert.match(report, /\(U-8IL, tick 3\) is stated 2 times with different coordinates/);
  assert.match(report, /\(C-I-3-1, tick 548\) is stated 2 times with different coordinates/);
  for (const [name, text] of [['baseline-report.md', report], ['CONTRIBUTING-DATA.md', contrib]]) {
    assert.doesNotMatch(text, /the specialist quotes 6: reproduced/, name);
    assert.doesNotMatch(text, /the six candidates the specialists quote/, name);
    if (name === 'baseline-report.md') for (const line of text.split('\n').filter((l) => /G003/.test(l))) assert.doesNotMatch(line, /(?<!not )reproduced/, `${name}: a G003 line claims a reproduction: ${line.slice(0, 120)}`);
  }
  assert.match(contrib, /not the same six/);
  assert.match(contrib, /five of the six keys/);
  // the generators reproduce the committed reports byte for byte (a hand edit, or a change that forgot to regenerate, is caught here)
  const { base, root } = makeRepoCopy('repo', { full: true });
  try {
    const r = run([inRepo(root, 'tools', 'data', 'validate.mjs'), '--now', NOW, '--report', inRepo(root, 'docs', 'data', 'baseline-report.md')]);
    assert.equal(r.status, 0, r.stdout.slice(-300));
    for (const rel of ['docs/data/baseline-report.md', 'data-src/build/data-quality-report.json']) {
      assert.equal(fs.readFileSync(inRepo(root, ...rel.split('/')), 'utf8'), fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf8'), `${rel} is stale: run npm run data:report`);
    }
  } finally { rmrf(base); }
});
