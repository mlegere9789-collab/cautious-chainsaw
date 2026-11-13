// The inputs and the outputs of the realization harness: the digest of the inputs, the merge of a partial run, the gazetteer's unknown names, the author tools, and the documents that state facts about the
// harness. Node only (a scratch copy of the tree under tmp/ for the digest tests, tools/bt/realize/tree.mjs; it never writes into the real tree).
//   node --test tests/governance/realize-inputs.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
import { P, TL, clone, ex, examples } from './realize-lib.mjs';
import { ROOT, REAL, GOV, readJSON, readJSONL, readText, noteRead, trackedReads } from '../../tools/bt/realize/lib.mjs';
import { makeTree, removeTree } from '../../tools/bt/realize/tree.mjs';
import { summarize, q17Of, registerCoverage, epilogueRows } from '../../tools/bt/realize/check.mjs';
import { occurrencesOf, classifyNames, buildLexicon } from '../../tools/bt/realize/names.mjs';

const node = (root, args, opt = {}) => spawnSync('node', [path.join(root, 'tools/bt/realize', args[0]), ...args.slice(1)], { encoding: 'utf8', cwd: root, maxBuffer: 1 << 28, env: { ...process.env, BT_REALIZE_REAL_ROOT: ROOT }, ...opt });
const digests = root => { const o = node(root, ['check.mjs', '--digests']); assert.equal(o.status, 0, o.stderr); return JSON.parse(o.stdout); };

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the digest of the inputs covers every file the answer depends on, not only the files the shell fetches (check.mjs inputsDigest; the defect: tl-01.jsonl changed and the digest did not)', () => {
  const scratch = 'tmp/realize/scratch-digest', base = (() => { const root = makeTree(scratch); const d = digests(root); const again = digests(root); assert.deepEqual(again, d, 'the digest is deterministic'); return { root, d }; })();
  const real = digests(ROOT); assert.deepEqual(base.d.inputs_parts, real.inputs_parts, 'a scratch copy of the tree has the digest of the tree');
  try {
    const bump = t => t + (t.endsWith('\n') ? '' : '\n') + '\n';
    const cases = [
      ['docs/battle-theatre/GOVERNANCE/timeline_seed.jsonl', 'governance', bump], ['docs/battle-theatre/GOVERNANCE/timeline_verified.jsonl', 'governance', bump], ['docs/battle-theatre/GOVERNANCE/timeline_windows.jsonl', 'governance', bump],
      ['docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-01.jsonl', 'governance', bump], ['docs/battle-theatre/GOVERNANCE/register_index.json', 'governance', t => t + ' '], ['docs/battle-theatre/GOVERNANCE/requirements.json', 'governance', t => t + ' '],
      ['docs/battle-theatre/GOVERNANCE/epilogue_seed.jsonl', 'governance', bump],
      ['docs/battle-theatre/GOVERNANCE/realizations/EXAMPLES.jsonl', 'records', t => t.replace('"harness": "bt-realize-1"', '"harness": "bt-realize-1", "note0": "x"')],
      ['docs/battle-theatre/app/src/clock.mjs', 'app_src', t => t + '\n// a changed line of the shell\n'],
      ['docs/battle-theatre/render/prototype/data/terrain.json', 'data', t => t + ' '], ['docs/battle-theatre/app/data/fx3d/params.json', 'data', t => t + ' '],
    ];
    for (const [file, part, edit] of cases) {
      const root = makeTree(scratch + '-edit', { files: { [file]: edit } }), d = digests(root);
      assert.notEqual(d.inputs_digest, base.d.inputs_digest, `${file}: the inputs digest must change`);
      for (const k of Object.keys(base.d.inputs_parts)) assert.equal(d.inputs_parts[k] !== base.d.inputs_parts[k], k === part, `${file}: only the part "${part}" changes (${k})`);
      removeTree(scratch + '-edit');
    }
    // what is NOT an input: the reports the harness writes
    const root = makeTree(scratch + '-edit', { files: { 'docs/battle-theatre/GOVERNANCE/realizations/RESULTS.json': t => t + ' ', 'docs/battle-theatre/GOVERNANCE/realizations/gazetteer.json': t => t + ' ' } });
    assert.equal(digests(root).inputs_digest, base.d.inputs_digest, 'RESULTS.json and gazetteer.json are outputs, not inputs'); removeTree(scratch + '-edit');
    // the written-back "result" of a record is not an input either (check.mjs --update writes it, and must not change the digest it was computed under)
    const root2 = makeTree(scratch + '-edit', { files: { 'docs/battle-theatre/GOVERNANCE/realizations/EXAMPLES.jsonl': t => { const L = t.split('\n'); const r = JSON.parse(L[2]); r.result = { realized: true, why: 'x', digest: 'y' }; L[2] = JSON.stringify(r); return L.join('\n'); } } });
    assert.equal(digests(root2).inputs_digest, base.d.inputs_digest, 'a "result" written into a record does not change the digest'); removeTree(scratch + '-edit');
    // a change of the harness changes the harness digest, not the inputs
    const root3 = makeTree(scratch + '-edit', { files: { 'tools/bt/realize/tolerances.json': t => t.replace('"clock_tolerance_min": 20', '"clock_tolerance_min": 21') } }), d3 = digests(root3);
    assert.notEqual(d3.harness_digest, base.d.harness_digest); removeTree(scratch + '-edit');
  } finally { removeTree(scratch); removeTree(scratch + '-edit'); }
});
test('every file the shell fetches and every file the harness reads is noted, and the noted files are hashed (lib.mjs noteRead, query.mjs inputsParts)', () => {
  const reads = trackedReads(); for (const f of ['docs/battle-theatre/GOVERNANCE/timeline_seed.jsonl', 'docs/battle-theatre/GOVERNANCE/timeline_verified.jsonl', 'docs/battle-theatre/GOVERNANCE/timeline_windows.jsonl']) assert.ok(reads.includes(f), `${f} is read by the harness and noted`);
  assert.ok(reads.some(f => /^docs\/battle-theatre\/app\/data\//.test(f)), 'files the shell fetches are noted'); assert.ok(reads.some(f => /^docs\/basemap1863\//.test(f)), 'the base-map layers of the gazetteer are noted');
  const probe = path.join(ROOT, 'tmp/realize/probe-read.txt'); fs.mkdirSync(path.dirname(probe), { recursive: true }); fs.writeFileSync(probe, 'one'); noteRead(probe);
  const a = P.inputsParts(true); assert.ok('tmp/realize/probe-read.txt' in a.detail.data, 'a noted file is in the manifest'); fs.writeFileSync(probe, 'two'); const b = P.inputsParts(true);
  assert.notEqual(a.digests.data, b.digests.data, 'and its change changes the part'); fs.rmSync(probe);
  assert.ok(Object.keys(a.detail.app_src).length > 100, 'the whole source tree of the shell is an input'); assert.ok(Object.keys(a.detail.governance).length >= 8);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('a partial run written over the earlier file recomputes the totals, q17 and scope from the merged rows (check.mjs main; the defect: q17.realized stayed 4 after T1-003 failed)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rz-merge-')), out = path.join(dir, 'RESULTS.json'), chk = (...a) => node(ROOT, ['check.mjs', ...a]);
  try {
    const full = chk('--out', out, '--quiet'); assert.equal(full.status, 0, full.stderr); const d0 = readJSON(out); assert.equal(d0.q17.complete, true); assert.equal(d0.q17.realized, 4); assert.equal(d0.totals.timeline.realized, 4); assert.equal(Object.keys(d0.rows).length, 691);
    // the same inputs, one shard written over the file: nothing carried over is stale, everything derived is the same
    const same = chk('--shard', 'tl-01', '--write', '--out', out, '--quiet'); assert.equal(same.status, 0, same.stderr); const d1 = readJSON(out);
    assert.equal(d1.rows_from_other_digests, undefined); assert.deepEqual(d1.totals, d0.totals); assert.deepEqual(d1.q17, d0.q17); assert.equal(d1.scope.partial, false); assert.equal(d1.scope.merged_over_earlier_file, true); assert.equal(Object.keys(d1.rows).length, 691);
    // T1-003 made to fail: the row and every number derived from it change
    const recs = readJSONL(path.join(REAL, 'EXAMPLES.jsonl')), bad = clone(recs.find(r => r.id === 'T1-003')); bad.checks[0].precip_kind_in = ['snow']; const f = path.join(dir, 'T1-003-fails.jsonl'); fs.writeFileSync(f, JSON.stringify(bad) + '\n');
    const part = chk('--file', f, '--write', '--out', out, '--quiet'); assert.equal(part.status, 0, part.stderr); const d2 = readJSON(out);
    assert.equal(d2.rows['T1-003'].realized, false); const realized = Object.values(d2.rows).filter(e => e.realized).length;
    assert.equal(realized, 3, 'three rows are realized now'); assert.equal(d2.q17.realized, realized, 'q17.realized follows the rows'); assert.equal(d2.totals.timeline.realized, realized); assert.equal(d2.totals.timeline.realized_by_scene, Object.values(d2.rows).filter(e => e.realization_class === 'scene').length);
    assert.equal(d2.q17.ok_strict, false); assert.equal(d2.q17.ok, false);
    assert.deepEqual(d2.totals, summarize(d2.rows, d2.epilogue), 'the totals of the file are the totals of its rows'); const again = q17Of(d2.totals, { problems: d2.record_file_problems, timelineRows: 691, epilogueRows: 14 }); assert.equal(again.realized, d2.q17.realized);
    assert.ok(d2.rows_from_other_digests && d2.rows_from_other_digests.ids.length > 600, 'the rows of the earlier run are marked: they were computed under other inputs (the extra record file)'); assert.equal(d2.q17.ok, false, 'and the verdict is false until a full run');
    assert.match(d2.q17.note || '', /earlier run/);
    // a partial run that covers only some rows, with no earlier file, is not a verdict
    const solo = path.join(dir, 'solo.json'), s = chk('--row', 'T1-003', '--write', '--out', solo, '--quiet'); assert.equal(s.status, 0, s.stderr); const d3 = readJSON(solo);
    assert.equal(d3.q17.complete, false); assert.equal(d3.q17.ok, false, 'one realized row is not the Q17 verdict'); assert.equal(d3.q17.ok_strict, false); assert.equal(d3.scope.partial, true); assert.equal(d3.totals.timeline.rows, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('the committed RESULTS.json is consistent with itself: totals and q17 are those of its rows, scenarios and clock are reported (check.mjs)', () => {
  const p = path.join(REAL, 'RESULTS.json'); assert.ok(fs.existsSync(p), 'RESULTS.json is written by the full run'); const d = readJSON(p);
  assert.equal(Object.keys(d.rows).length, 691); assert.equal(Object.keys(d.epilogue).length, 14); assert.deepEqual(d.totals, summarize(d.rows, d.epilogue));
  const q = q17Of(d.totals, { problems: d.record_file_problems, timelineRows: 691, epilogueRows: 14 }); for (const k of Object.keys(q)) if (k !== '_doc') assert.deepEqual(d.q17[k], q[k], 'q17.' + k);
  assert.ok(d.inputs_parts && d.inputs_parts.governance && d.inputs_parts.app_src && d.inputs_parts.data && d.inputs_parts.records); assert.ok(d.inputs_files.app_src > 100);
  const ids = d.totals.outside_clock; assert.deepEqual(ids, TL.outside_clock, 'RESULTS lists the rows that lie outside the theatre clock, computed from the time cells'); assert.equal(ids.length, new Set(ids).size);
  for (const id of ['T1-001', 'T1-002']) assert.ok(ids.includes(id)); for (const [id, e] of Object.entries(d.rows)) { assert.equal(e.in_clock, !ids.includes(id), id); for (const a of e.assertions || []) assert.ok(a.scenario, `${id}: every result names its scenario`); }
  assert.deepEqual(d.rows['T1-015'].scenarios, ['default', 'rr-bridge-jun26']); assert.deepEqual(d.rows['T1-015'].excluded_scenarios.map(x => x.id), ['rr-bridge-jun27']); assert.deepEqual(d.rows['T1-015'].assertions.map(a => a.scenario), ['default', 'rr-bridge-jun26']);
  assert.equal(d.rows['T1-015'].partial, true); assert.equal(d.rows['T1-015'].q17_covered_strict, false);
});
test('the register half of the gate agrees with tools/bt/check_coverage.py, which is run here and not recomputed (the defect: the test never read the script)', () => {
  const py = spawnSync('python3', ['-I', path.join(ROOT, 'tools/bt/check_coverage.py')], { encoding: 'utf8', cwd: ROOT }); assert.equal(py.stderr.trim(), '', py.stderr); const c = JSON.parse(py.stdout).Q17;
  const reg = registerCoverage(), rows = TL.rows.map(r => r.id), covered = rows.filter(id => (reg.get(id) || { open: [] }).open.length > 0), uncovered = rows.filter(id => !covered.includes(id));
  assert.equal(c.rows, 691); assert.equal(c.covered_by_open_register_entry, covered.length, 'the python rule and the harness rule cover the same number of rows'); assert.equal(c.uncovered, uncovered.length);
  assert.deepEqual(c.uncovered_sample, uncovered.slice(0, c.uncovered_sample.length), 'and the first uncovered rows are the same ones');
  const d = readJSON(path.join(REAL, 'RESULTS.json'));
  for (const [id, e] of Object.entries(d.rows)) assert.deepEqual(e.register_open, (reg.get(id) || { open: [] }).open, id);
  assert.equal(c.ok, false, 'check_coverage.py counts no visual realization (it has none), so Q17 is red there while rows are uncovered');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the gazetteer lists every name with evidence of being a place that no repository file carries: the towns too (names.mjs; the defect: Taneytown, Williamsport, Falling Waters, Hagerstown, Hanover, Westminster, Greenwood were not listed)', () => {
  const rows = [...TL.rows, ...epilogueRows(TL)], lex = buildLexicon(P, rows), occ = rows.flatMap(r => occurrencesOf(r, lex, P.places)), cls = classifyNames(occ, lex, P.places), by = new Map(cls.names.map(n => [n.name, n]));
  for (const n of ['Taneytown', 'Williamsport', 'Falling Waters', 'Hagerstown', 'Hanover', 'Westminster', 'Greenwood', 'Emmitsburg', 'Chambersburg', 'Littlestown', 'Frederick', 'Dover', 'Manchester', 'Middletown', 'Carlisle', 'York', 'Harrisburg', 'Fairfield', 'Cashtown Pike', 'Bunker Hill', 'Great Round Top']) { const e = by.get(n); assert.ok(e && (e.class === 'unknown' || (n === 'Fairfield' && e.class === 'unclassified') || e.class === 'unclassified'), `${n} is listed (unknown or unclassified), found ${e && e.class}`); }
  for (const n of ['Taneytown', 'Williamsport', 'Falling Waters', 'Hagerstown', 'Hanover', 'Westminster', 'Greenwood']) { const e = by.get(n); assert.equal(e.class, 'unknown', n); assert.ok(e.evidence.length > 0 && e.rows.length > 0, `${n}: the evidence and the rows are stated`); }
  assert.ok(by.get('Taneytown').rows_in_claim.includes('T1-038') && by.get('Greenwood').rows_in_claim.includes('T1-004'), 'Greenwood comes from the corrected claim of T1-004');
  for (const u of cls.names) { assert.ok(['unknown', 'unclassified'].includes(u.class)); assert.ok(u.rows.length > 0); assert.ok(!('center' in u) && !('lng' in u) && !('lat' in u), `${u.name}: an unknown place is never given coordinates`); if (u.class === 'unknown') assert.ok(u.evidence.length > 0 && ['structural', 'cue'].includes(u.strength), u.name); }
  for (const n of cls.names) assert.equal(P.places.resolve(n.name).status === 'resolved', false, `${n.name} is resolved by the gazetteer and must not be listed`);
  assert.ok(cls.counts.unknown >= 100 && cls.counts.person_or_unit > 100 && cls.counts.excluded > 20, JSON.stringify(cls.counts));
  assert.equal(P.places.resolve('Taneytown').status, 'unknown'); assert.equal(P.places.resolve('Taneytown Road').status, 'resolved', 'the road is known, the town is not');
  const g = path.join(REAL, 'gazetteer.json'); assert.ok(fs.existsSync(g)); const f = readJSON(g), listed = new Set(f.unknown.map(u => u.name));
  for (const n of ['Taneytown', 'Williamsport', 'Falling Waters', 'Hagerstown', 'Hanover', 'Westminster', 'Greenwood']) assert.ok(listed.has(n), `gazetteer.json lists ${n}`);
  assert.ok(f.unknown.every(u => u.evidence.length && !u.center && /not guessed/.test(u.status)) && f.unclassified.every(u => !u.center && /not claimed to be a place/.test(u.status)));
  assert.ok(f.places.every(x => x.tolerance_m > 0 && x.center && Number.isFinite(x.center.lng)));
  assert.deepEqual(Object.keys(f.tolerance_by_kind_m).sort(), Object.keys(readJSON(path.join(ROOT, 'tools/bt/realize/tolerances.json')).distance.floor_m_by_kind).sort());
  for (const n of f.first_report_names_not_carried_over.names) assert.ok(!listed.has(n), `${n} is an artefact of the first report's pattern and is not listed`);
});
test('the author tools: row names the places that are unknown, cas expands a formation to its leaf units (q.mjs; the defect: cas of a brigade printed zeros)', () => {
  const q = (...a) => node(ROOT, ['q.mjs', ...a]); const row = q('row', 'T1-004'); assert.equal(row.status, 0, row.stderr);
  assert.match(row.stdout, /unknown, never guessed\): [^\n]*Greenwood/, 'the place of the corrected claim that no file carries'); assert.match(row.stdout, /Cashtown Pike \[structural/);
  const brig = JSON.parse(q('cas', '1863-07-01T10:00', '1863-07-01T16:00', 'us-1c-1d-meredith').stdout), leaf = JSON.parse(q('cas', '1863-07-01T10:00', '1863-07-01T16:00', 'us-1c-1d-meredith-6wi').stdout);
  assert.ok(brig.events > 0 && brig.killed > 0, 'the brigade has losses: a formation id is expanded'); assert.ok(brig.events > leaf.events && brig.leaves >= 2 && leaf.leaves === 1);
  const sum = P.leaves('us-1c-1d-meredith').map(l => P.scene().casualties(toMinT('1863-07-01T10:00'), toMinT('1863-07-01T16:00'), l).events).reduce((a, b) => a + b, 0); assert.equal(brig.events, sum, 'the sum of its leaves, as the casualty check counts them');
  assert.match(q('cas', '1863-07-01T10:00', '1863-07-01T16:00', 'no-such-unit').stdout, /no unit no-such-unit/);
  assert.equal(JSON.parse(q('cas', '1863-06-26T00:00', '1863-06-30T00:00').stdout).events, 0, 'no man falls before the battle');
});
const toMinT = s => { const m = /^1863-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(s); const d = { 6: 0, 7: 30 }[+m[1]]; return (d + +m[2] - 1) * 1440 + +m[3] * 60 + +m[4]; };

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the documents state facts about the harness that are true (README.md; the defect: it said 9 rows lie outside the theatre clock, the time cells give 10)', () => {
  const readme = readText(path.join(ROOT, 'tools/bt/realize/README.md')), out = TL.outside_clock;
  assert.deepEqual(out, ['T1-001', 'T1-002', 'T3-209', 'T3-210', 'T3-211', 'T3-212', 'T3-214', 'T3-215', 'T3-216', 'T3-217'], 'the rows whose whole allowed window is outside the theatre clock');
  for (const m of readme.matchAll(/\b(\d+|nine|ten|eleven)\b[^.\n]{0,40}\brows?\b[^.\n]{0,60}outside the theatre clock/gi)) { const n = { nine: 9, ten: 10, eleven: 11 }[m[1].toLowerCase()] ?? +m[1]; assert.equal(n, out.length, `the README says ${m[0]}`); }
  assert.match(readme, /totals\.outside_clock/, 'the README says where the list is');
  assert.ok(!/structure_scenario/.test(readme.replace(/`structure_scenario` (?:is )?(?:gone|removed|replaced)[^\n]*/g, '')), 'the removed field is not documented as a field');
  for (const f of fs.readdirSync(path.join(ROOT, 'tools/bt/realize')).filter(f => /\.mjs$/.test(f))) assert.ok(readme.includes(f), `the README names its file ${f}`);
});
test('the worked example T1-001 is a record of the scene (GATE-SPEC 6.2 names the row: two wagons a brigade shown as the train of each brigade), with the card beside it', async () => {
  const r = ex('T1-001'); assert.equal(r.kind, 'not_realized'); assert.ok(['unit_activity', 'unit_motion', 'arrival', 'artillery'].includes(r.intended_kind), 'a scene kind, not event_card: ' + r.intended_kind);
  assert.ok(r.checks.some(c => c.type === 'unit_in_layer'), 'the probe is the scene'); assert.ok(r.checks.some(c => c.type === 'card_shown') && r.entities.cards.includes('T1-001'), 'the card is listed beside it');
  assert.ok(r.missing.some(m => m.code === 'unit_not_in_layer') && !r.missing.some(m => m.code === 'adapter_missing'), 'the declared reasons are those of the scene');
  const note = path.join(GOV, 'horde/requests/bt-realizations-t1-001-scene-class.md'); assert.ok(fs.existsSync(note), 'the change from the first mapping is recorded in a request note'); assert.match(readText(note), /GATE-SPEC/);
  const spec = readText(path.join(GOV, 'gate_results/GATE-SPEC.md')); assert.match(spec, /T1-001: two wagons per brigade shows as the train of each brigade/);
});
test('the numbers in the worked examples are the numbers the checks report (T1-006 Cashtown, T1-011 Hunterstown, T1-009 Marsh Creek; the defect: "about 9 km west of its edge" had no support)', async () => {
  const { outsideGround } = await import('../../tools/bt/realize/gazetteer.mjs'), at = n => outsideGround(P.places.resolve(n).place, P.places.box);
  const c = at('Cashtown'), h = at('Hunterstown'), m = at('Marsh Creek');
  assert.match(c.text, /^9\.1 km from the nearest point of the ground \(7\.5 km west and 5\.2 km north/); assert.match(h.text, /^6\.0 km .*3\.4 km east and 4\.9 km north/); assert.ok(m.d_m < 300 && m.d_m > 100, 'Marsh Creek lies just outside: ' + m.text);
  const detail = (id, code) => ex(id).missing.find(x => x.code === code).detail;
  assert.ok(detail('T1-006', 'place_off_ground').includes('9.1 km') && detail('T1-006', 'place_off_ground').includes('7.5 km west and 5.2 km north'));
  for (const id of ['T1-011', 'T1-012']) assert.ok(detail(id, 'place_off_ground').includes('6.0 km') && detail(id, 'place_off_ground').includes('3.4 km east and 4.9 km north'), id);
  assert.ok(detail('T1-009', 'place_off_ground').includes('0.2 km'));
  for (const id of ['T1-006', 'T1-009', 'T1-011', 'T1-012']) assert.ok(!/about 9 km west|lies north of the loaded ground/.test(JSON.stringify(ex(id))), id + ': no loose direction or distance left');
  const S = P.scene(), first = id => Math.min(...P.leaves(id, { onField: false }).filter(l => P.unit(l).drawn).map(l => S.stage.presence[l].from)) / 60;
  assert.equal(isoOfT(first('cs-2c-early')), '1863-07-01T15:00'); assert.equal(isoOfT(first('cs-cav-hampton')), '1863-07-02T19:32');
  assert.ok(detail('T1-004', 'unit_not_on_field').includes('1 Jul 15:00') && detail('T1-002', 'unit_not_on_field').includes('2 Jul 19:32'));
});
const isoOfT = m => { const d = Math.floor(m / 1440), t = Math.round(m - d * 1440), mo = d < 30 ? 6 : 7, dd = d < 30 ? d + 1 : d - 29, p = n => String(n).padStart(2, '0'); return `1863-${p(mo)}-${p(dd)}T${p(Math.floor(t / 60))}:${p(t % 60)}`; };
