// Seeded-defect proof of the ratchet: for each rule, the untouched legacy data judged against baseline.json passes, and ONE seeded
// defect makes that rule report a NEW violation (E rules: failure; W rules: warning). "Fix without deleting the entry" fails as STALE.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { clone, judge, oobRaw, placementFile, row, tmpCopyOfData, fixtureDist, rmrf, legacy, baseline, baselineFor, NOW } from './helpers.mjs';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { evaluateRatchet, tightenBaseline } from '../../tools/data/lib/ratchet.mjs';
import { loadAllRules } from '../../tools/data/rules/index.mjs';

const P1 = 'placements_day1_ticks1_50.json';
const P2 = 'placements_day2_ticks226_300.json';
const P3 = 'placements_day3_ticks601_675.json';
const CH1 = 'chronology_day1.json';
const V1 = 'vignettes_part1.json';

// each case: seed(data) mutates a clone; optional ctxOpts/dataDir/dist for site-level rules
const CASES = [
  { rule: 'S001', seed: (d) => { d.files.get('terrain.json').error = 'seeded parse error'; } },
  { rule: 'S002', seed: (d) => { delete placementFile(d, P1)[0].strength; } },
  { rule: 'S003', seed: (d) => { placementFile(d, P2)[0].tick = 9999; } },
  { rule: 'S004', seed: (d) => { placementFile(d, P2)[1].disposition = 'Flying'; } },
  { rule: 'S005', seed: (d) => { placementFile(d, P2)[3].lat = 41.5; } },
  { rule: 'S006', seed: (d) => { placementFile(d, P2)[2].extra_key = 1; } },
  { rule: 'S007', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-3NC', 5, 39.8, -77.24)); a.push(row('C-3NC', 5, 39.9, -77.24)); } },
  { rule: 'S008', seed: (d) => { d.files.get(P2).json.metadata.record_count = 5; } },
  { rule: 'R001', seed: (d) => { placementFile(d, P3).push(row('U-NOSUCH-9', 630)); } },
  { rule: 'R002', seed: (d) => { placementFile(d, P3).push(row('U-2MS', 630)); } },
  { rule: 'R003', seed: (d) => { oobRaw(d, 'U-20ME').parent_brigade_id = 'U-I-9-9'; } },
  { rule: 'R004', seed: (d) => { const b = oobRaw(d, 'U-I-1-1'); b.regiment_ids = b.regiment_ids.slice(1); } },
  { rule: 'R005', seed: (d) => { const rec = structuredClone(oobRaw(d, 'U-19IN')); d.files.get('oob/union_regiments_iii_v_corps.json').json.regiments.push(rec); } },
  { rule: 'R006', seed: (d) => { oobRaw(d, 'U-19IN').alias_for = 'U-20ME'; } },
  { rule: 'R007', seed: (d) => { placementFile(d, P3).push(row('U-99-99-99-99', 630)); } },
  { rule: 'R009', seed: (d) => { d.files.get(V1).json.vignettes[1].trigger_tick = d.files.get(V1).json.vignettes[0].trigger_tick; } },
  { rule: 'R010', seed: (d) => { d.files.get(V1).json.vignettes[1].trigger_tick = 660; } },
  { rule: 'R011', seed: (d) => { placementFile(d, P3).push(row('U-V-1-1', 630, 39.81, -77.24, { notes: "Webb's brigade holds the wall" })); } },
  { rule: 'C001', seed: (d) => { placementFile(d, P3).push(row('C-3NC', 10)); } },
  { rule: 'C002', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-3NC', 10, 39.81, -77.24)); a.push(row('C-3NC', 200, 39.83, -77.24)); } },
  { rule: 'C003', seed: (d) => { for (const [rel, f] of d.files) if (f.json?.placements) f.json.placements = f.json.placements.filter((r) => r.tick !== 1); } },
  { rule: 'C004', seed: (d) => { for (const [rel, f] of d.files) if (f.json?.placements) f.json.placements = f.json.placements.filter((r) => r.unit_id !== 'U-20ME'); } },
  { rule: 'G002', seed: (d) => { placementFile(d, P3).push(row('C-3NC', 630, 39.8, -77.24)); } },
  { rule: 'G003', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-3NC', 20, 39.80, -77.24, { disposition: 'Line of March' })); a.push(row('C-3NC', 21, 39.845, -77.24, { disposition: 'Line of March' })); } },
  { rule: 'G004', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-3NC', 30, 39.81234, -77.23456)); a.push(row('C-4NC', 30, 39.81234, -77.23456)); } },
  { rule: 'G005', seed: (d) => { const a = placementFile(d, P3); a.push(row('U-I-1-1', 200, 39.80, -77.25)); a.push(row('U-2WI', 200, 39.835, -77.25)); } },
  { rule: 'G006', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-3NC', 50, 39.83, -77.24, { disposition: 'Line of March', bearing: 0 })); a.push(row('C-3NC', 60, 39.82, -77.24, { disposition: 'Line of March', bearing: 0 })); } },
  { rule: 'G007', seed: (d) => { placementFile(d, P3).push(row('C-3NC', 40, 39.835, -77.23, { notes: 'holding Little Round Top against the assault' })); } },
  { rule: 'G008', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-4NC', 70, 39.81, -77.24, { disposition: 'Bivouac' })); a.push(row('C-4NC', 71, 39.81, -77.24, { disposition: 'Charging Line' })); } },
  { rule: 'N001', seed: (d) => { placementFile(d, P3).push(row('C-3NC', 630, 39.81, -77.24, { strength: 99999 })); } },
  { rule: 'N002', seed: (d) => { const a = placementFile(d, P3); a.push(row('C-3NC', 80, 39.81, -77.24, { strength: 300 })); a.push(row('C-3NC', 90, 39.81, -77.24, { strength: 400 })); } },
  { rule: 'N003', seed: (d) => { oobRaw(d, 'U-20ME').casualty_percentage = 1.0; } },
  { rule: 'N004', seed: (d) => { placementFile(d, P3).push(row('C-3NC', 675, 39.81, -77.24, { strength: 12 })); } },
  { rule: 'N005', seed: (d) => {
    // a brigade whose strength currently agrees with its regiments gets +60 %
    const f = d.files.get('oob/union_oob_brigades.json').json;
    const ok = f.brigades.find((b) => !baseline.rules.N005.keys.includes(`brigade|${b.brigade_id}|strength`) && b.regiment_ids.length > 2 && (baseline.rules.N005.keys.indexOf(`brigade|${b.brigade_id}|strength`) < 0));
    ok.strength = Math.round(ok.strength * 1.6);
  } },
  { rule: 'N006', seed: (d) => { d.files.get('casualty_apportionment.json').json.union_corps[1].engagement_periods[0].casualties += 500; } },
  { rule: 'N007', seed: (d) => { d.files.get('oob/union_oob_corps_division.json').json.metadata.total_casualties = 40000; } },
  { rule: 'N009', seed: (d) => { d.files.get('casualty_apportionment.json').json.notable_intensity_notes.highest_single_regiment_rate.union.unit = 'U-2WI'; } },
  { rule: 'N010', seed: (d) => { d.files.get('oob/union_artillery.json').json.metadata.total_guns = 999; } },
  { rule: 'T001', seed: (d) => { d.files.get(CH1).json.events[0].time = '11:59pm'; } },
  { rule: 'T002', seed: (d) => { d.files.get('oob/commander_successions.json').json.union_successions[0].approx_tick = 600; } },
  { rule: 'T003', seed: (d) => { const v = d.files.get('vignettes_part2.json').json.vignettes[3]; v.panel_summary += ' It was 11:45 pm.'; } },
  { rule: 'T004', seed: (d) => { d.files.get(P1).json.metadata.day = 3; } },
  { rule: 'T005', seed: (d) => { const e = d.files.get(CH1).json.events; [e[0], e[1]] = [e[1], e[0]]; } },
  { rule: 'X001', seed: (d) => { oobRaw(d, 'U-19IN').key_action += ' -- and another dash -- here'; } },
  { rule: 'X002', seed: (d) => { placementFile(d, P3)[0].notes = 'U-20ME rallies at the wall'; } },
  { rule: 'X003', seed: (d) => { placementFile(d, P3)[1].notes = 'TODO fix this position'; } },
  { rule: 'X004', seed: (d) => { placementFile(d, P3)[2].notes = 'the 3th Maine advances'; } },
  { rule: 'X005', seed: (d) => { placementFile(d, P3)[3].notes = 'Krzyznowski leads the brigade'; } },
  { rule: 'X006', seed: (d) => { oobRaw(d, 'U-I-1-1').key_action = 'Short.'; } },
  { rule: 'X007', seed: (d) => { d.files.get(V1).json.vignettes.push({ vignette_id: 'V-099', title: 'Seeded', trigger_tick: 100, trigger_location: 'x', trigger_lat: 39.8, trigger_lng: -77.2, units_featured: [], panel_summary: 'A seeded vignette summary that is long enough to pass.', full_script: 'First paragraph.\n\nSecond paragraph.' }); } },
  { rule: 'P002', seed: (d) => { d.files.get('terrain.json').json.metadata.sources.push('Seeded, Author -- A New Citation (Nowhere Press, 2099)'); } },
  { rule: 'L001', seed: (d) => { d.files.get('monuments.json').json.monuments.push({ id: 'seeded-fag', name: 'Seeded Monument', side: 'union', lat: 39.8, lng: -77.2, source: 'Find a Grave memorial 12345' }); } },
  { rule: 'M001', seed: (d) => d, ctxOpts: () => ({ embedded: { monuments: [{ no: 1, name: 'A', honors: '', loc: '', lat: 39.8, lon: -77.24, mn: 'MN 1', side: 'Union', group: 'g', src: '' }, { no: 1, name: 'B', honors: '', loc: '', lat: 39.8, lon: -77.24, mn: 'MN 1', side: 'Union', group: 'g', src: '' }], story: [], tour: [], monumentsLoc: null, warnings: [] } }) },
  { rule: 'D001', dataDir: true },
  { rule: 'D002', dataDir: true },
];

test('the rule catalogue has 60 core + 8 v2 rules and every seeded case names a real rule', async () => {
  const rules = await loadAllRules();
  assert.equal(rules.filter((r) => r.tier === 'core').length, 60);
  assert.equal(rules.filter((r) => r.tier === 'v2').length, 8);
  const ids = new Set(rules.map((r) => r.id));
  for (const c of CASES) assert.ok(ids.has(c.rule), c.rule);
});

test('untouched legacy data passes the ratchet for every rule that runs', async () => {
  const { results } = await runValidation({ data: legacy, site: false, now: NOW });
  const verdict = evaluateRatchet(new Map([...results].filter(([id]) => !['R008', 'F001', 'F002', 'K001', 'U001', 'M001'].includes(id))), baseline, { now: NOW });
  // site-scan rules need the deploy tree and are covered by the CLI run; rules that were baselined with site inputs are excluded above
  const relevant = verdict.failures.filter((f) => !['R008', 'F001', 'F002', 'K001', 'U001', 'M001', 'L001', 'P001'].includes(f.rule));
  assert.deepEqual(relevant, []);
});

for (const c of CASES) {
  test(`seeded defect turns ${c.rule} red (new violation)`, async () => {
    let dataDir = null;
    if (c.dataDir) {
      dataDir = tmpCopyOfData();
      const f = path.join(dataDir, 'terrain.json');
      fs.appendFileSync(f, ' '); // a silent byte change
    }
    try {
      const d = c.dataDir ? null : clone();
      if (!c.dataDir) c.seed(d);
      const ctxOpts = c.ctxOpts ? c.ctxOpts() : {};
      const { r, verdict } = await judge(c.rule, d, { ctxOpts, dataDir });
      assert.ok(r.ran, `${c.rule} did not run: ${r.reason || r.error}`);
      const news = [...verdict.failures, ...verdict.warnings].filter((f) => f.rule === c.rule && (f.type === 'new' || f.type === 'worse'));
      assert.ok(news.length >= 1, `${c.rule}: seeded defect produced no NEW violation (violations: ${r.violations.length}, baseline: ${baseline.rules[c.rule]?.count ?? 0})`);
      if (r.rule.sev === 'E') assert.equal(verdict.pass, false, `${c.rule} is an E rule: CI must fail`);
    } finally {
      if (dataDir) rmrf(dataDir);
    }
  });
}

test('W rules warn instead of failing on a new violation, and --strict makes them fail', async () => {
  const d = clone();
  const a = placementFile(d, P3);
  a.push(row('C-3NC', 20, 39.80, -77.24, { disposition: 'Line of March' }));
  a.push(row('C-3NC', 21, 39.845, -77.24, { disposition: 'Line of March' }));
  const { results } = await runValidation({ data: d, only: ['G003'], site: false, now: NOW });
  const v = evaluateRatchet(results, baselineFor('G003'), { now: NOW });
  assert.equal(v.pass, true);
  assert.ok(v.warnings.some((w) => w.type === 'new' && w.rule === 'G003'));
  const strict = evaluateRatchet(results, baselineFor('G003'), { now: NOW, strict: true });
  assert.equal(strict.pass, false);
});

test('fixing a violation without deleting its baseline entry fails as STALE', async () => {
  const d = clone();
  // move the first out-of-extent row back inside the extent
  let done = false;
  for (const [rel, f] of d.files) {
    if (done || !f.json?.placements) continue;
    for (const r of f.json.placements) if (r.lng < -77.29) { r.lng = -77.25; done = true; break; }
  }
  const { results } = await runValidation({ data: d, only: ['S005'], site: false, now: NOW });
  const v = evaluateRatchet(results, baselineFor('S005'), { now: NOW });
  assert.equal(v.pass, false);
  assert.ok(v.failures.some((f) => f.type === 'stale'));
  // --tighten deletes exactly that entry and the ratchet is green again
  const { baseline: tightened, removed } = tightenBaseline(results, { ...baseline, rules: { S005: baseline.rules.S005 } });
  assert.equal(removed, 1);
  const v2 = evaluateRatchet(results, tightened, { now: NOW });
  assert.equal(v2.pass, true);
  assert.equal(tightened.rules.S005.count, baseline.rules.S005.count - 1);
});

test('an expired baseline fails while violations remain, and passes before its expiry', async () => {
  const { results } = await runValidation({ data: legacy, only: ['S005'], site: false, now: NOW });
  // the dates come from the baseline itself: an entry expires the day AFTER its `expires`, so renewing it never breaks this test
  const expires = baselineFor('S005').rules.S005.expires;
  assert.match(expires, /^\d{4}-\d{2}-\d{2}$/);
  const before = evaluateRatchet(results, baselineFor('S005'), { now: expires });
  assert.equal(before.pass, true);
  const after = evaluateRatchet(results, baselineFor('S005'), { now: '9999-12-31' });
  assert.equal(after.pass, false);
  assert.ok(after.failures.some((f) => f.type === 'expired'));
});

test('a metric entry (P001) that gets worse fails, and one that improves must be tightened', async () => {
  const { results } = await runValidation({ data: legacy, only: ['P001'], site: false, now: NOW });
  const r = results.get('P001');
  const succ = r.violations.find((v) => v.key === 'class|successions');
  // successions are 100 % sourced today so they are not a violation; use a class that is: regiments (0 %)
  assert.equal(succ, undefined);
  const reg = r.violations.find((v) => v.key === 'class|regiments');
  assert.ok(reg && reg.metric);
  const worseBase = structuredClone(baselineFor('P001'));
  worseBase.rules.P001.values['class|regiments'] = 50; // pretend the baseline recorded 50 %: today's 0 % is worse
  const w = evaluateRatchet(results, worseBase, { now: NOW, strict: true });
  assert.ok(w.failures.some((f) => f.type === 'worse'));
  const betterBase = structuredClone(baselineFor('P001'));
  betterBase.rules.P001.values['class|regiments'] = -1; // today's 0 % is better than the recorded value
  const b = evaluateRatchet(results, betterBase, { now: NOW });
  assert.ok(b.failures.some((f) => f.type === 'stale'));
});

test('unknown-rule baseline entries fail', async () => {
  const { results } = await runValidation({ data: legacy, only: ['S001'], site: false, now: NOW });
  const b = structuredClone(baseline);
  b.rules.ZZZ99 = { sev: 'E', wp: 'x', expires: '2099-01-01', count: 1, rows: 1, keys: ['a'] };
  const v = evaluateRatchet(results, b, { now: NOW });
  assert.ok(v.failures.some((f) => f.type === 'unknown_rule'));
});

test('site-level rules: F001, F002, K001, R008 and U001 flag seeded deploy fixtures', async () => {
  const dist = fixtureDist({
    'zzz.html': '<html><body><a href="/index.html?unit=U-20ME">x</a> 467 regiments and batteries {{facts.nope.x}}</body></html>',
    'index.html': '<script>const q=new URLSearchParams(location.search).get("ancestor")</script>',
    'k.html': '<script>for (const v of (d.vignettes || [])) { use(v.headline); }</script>',
  });
  try {
    const { results } = await runValidation({ data: clone(), site: false, ctxOpts: { distDir: dist, bundlePath: null }, now: NOW,
      only: ['F001', 'F002', 'K001', 'R008'] });
    const news = (id) => evaluateRatchet(results, baselineFor(id), { now: NOW }).failures.filter((f) => f.type === 'new' && f.rule === id);
    assert.ok(news('F001').length >= 2, 'F001 (467 count + phrase)');
    assert.ok(news('F002').length >= 1, 'F002 unresolved token');
    assert.ok(news('K001').length >= 1, 'K001 reads v.headline from vignettes');
    assert.ok(news('R008').length >= 1, 'R008 emitter without reader');
  } finally { rmrf(dist); }
});

test('U001: a page that starts loading the artillery files makes its baseline entry stale', async () => {
  // the five pages U001 names must all be in the deploy tree (a missing page is "input not available", not a skipped check)
  const dist = fixtureDist({ 'search.html': "fetch('/data/oob/union_artillery.json'); fetch('/data/oob/confederate_artillery.json');", 'regiment.html': 'x', 'find-ancestor.html': 'x', 'historian.html': 'x', 'report.html': 'x' });
  try {
    const { results } = await runValidation({ data: clone(), site: false, ctxOpts: { distDir: dist, bundlePath: null }, now: NOW, only: ['U001'] });
    const v = evaluateRatchet(results, baselineFor('U001'), { now: NOW });
    assert.ok(v.failures.some((f) => f.type === 'stale' && f.key === 'page|search.html'));
  } finally { rmrf(dist); }
});

test('P003 is measure-only: improving it (rows gaining a basis) must be tightened', async () => {
  const d = clone();
  for (const r of placementFile(d, P3).slice(0, 10)) r.basis = 'reconstructed';
  const { results } = await runValidation({ data: d, only: ['P003'], site: false, now: NOW });
  const v = evaluateRatchet(results, baselineFor('P003'), { now: NOW });
  assert.equal(v.pass, false);
  assert.ok(v.failures.some((f) => f.type === 'stale' && f.rule === 'P003'));
});

test('coverage: every rule that can run has a seeded fixture in this suite', async () => {
  const rules = await loadAllRules();
  const covered = new Set([...CASES.map((c) => c.rule), 'P001', 'P003', 'F001', 'F002', 'K001', 'R008', 'U001']);
  const missing = rules.filter((r) => r.status !== 'deferred' && !covered.has(r.id)).map((r) => r.id);
  assert.deepEqual(missing, []);
  const deferred = rules.filter((r) => r.status === 'deferred').map((r) => r.id).sort();
  assert.deepEqual(deferred, ['C005', 'E001', 'G001', 'H001', 'N008', 'P004']);
});

test('end to end: the CLI exits 1 on a seeded defect in a copy of the data and 0 on the frozen tree', async () => {
  const { spawnSync } = await import('node:child_process');
  const { REPO_ROOT } = await import('../../tools/data/lib/util.mjs');
  const cli = path.join(REPO_ROOT, 'tools', 'data', 'validate.mjs');
  // --now pins the clock: without it the baseline expiry dates make this test start failing on 2027-01-31 whatever the code does
  const ok = spawnSync(process.execPath, [cli, '--no-site', '--now', NOW], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout.slice(-400));
  const dir = tmpCopyOfData();
  try {
    const f = path.join(dir, P3);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.placements.push(row('U-NOSUCH-9', 630));
    fs.writeFileSync(f, JSON.stringify(j));
    const bad = spawnSync(process.execPath, [cli, '--data-dir', dir, '--now', NOW], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /R001/);
    assert.match(bad.stdout, /\[new\] placements: unresolved id U-NOSUCH-9/);
    assert.match(bad.stdout, /FAIL/);
  } finally { rmrf(dir); }
});
