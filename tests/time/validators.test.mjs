// TM-V1..V21 against the frozen legacy tree: the "today" numbers, and mutation tests proving the rules turn red (TX-15).
// CANDIDATE tooling (WP-TIME-20). The legacy tree is only READ; mutations happen in copies under the OS temp dir.
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { P, LEGACY, readJson } from '../../tools/time/lib.mjs';
import { buildContext, runAll, kinematics } from '../../tools/time/rules.mjs';
import { makeTimeModel } from '../../src/lib/time/index.js';
import { doc, model } from './helpers.mjs';

const ctx = buildContext(model, doc);
const res = Object.fromEntries(runAll(ctx).map((r) => [r.id, r]));

// a mutable copy of the legacy tree (pages, chunks, data; no images)
let tmp; const mk = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-mut-'));
  fs.cpSync(LEGACY, d, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) });
  return d;
};
const runOn = (tree, opts = {}) => Object.fromEntries(runAll(buildContext(opts.model || model, opts.doc || doc, { tree, decisions: opts.decisions })).map((r) => [r.id, r]));
before(() => { tmp = []; });
after(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });
const tree = () => { const d = mk(); tmp.push(d); return d; };
const edit = (d, rel, f) => { const p = path.join(d, rel); fs.writeFileSync(p, f(fs.readFileSync(p, 'utf8'))); };

describe('today: what the frozen legacy site measures', () => {
  test('TM-V1 passes with warnings only; V11 and V12 pass', () => {
    assert.notEqual(res['TM-V1'].status, 'fail'); assert.equal(res['TM-V1'].data.warnings, 5);
    assert.equal(res['TM-V11'].status, 'pass'); assert.equal(res['TM-V12'].status, 'pass');
  });
  test('TM-V2: 8 pages and 16 sites in the JS chunks hard-code tab boundaries, none disagrees with tab_days', () => {
    assert.equal(res['TM-V2'].data.pages, 8); assert.equal(res['TM-V2'].data.bundleSites, 16); assert.equal(res['TM-V2'].data.wrong, 0);
  });
  test('TM-V4: 94 of 137 labels differ from the file\'s own tick_formula, 46 by more than 30 min (data-integrity DI-11)', () => {
    assert.equal(res['TM-V4'].data.total, 137); assert.equal(res['TM-V4'].data.ownDiff, 94); assert.equal(res['TM-V4'].data.own30, 46);
  });
  test('TM-V5: ten moment groups exceed 2 ticks; Armistead (551/552) passes', () => {
    const g = Object.fromEntries(res['TM-V5'].data.groups.map((x) => [x.id, x]));
    assert.equal(res['TM-V5'].count, 10);
    assert.deepEqual(g['first-shot'].ticks, [12, 17]); assert.deepEqual(g['ewell-order'].ticks, [75, 175]); assert.deepEqual(g['hancock-wounded'].ticks, [550, 554]);
    assert.deepEqual(g['cushing-killed'].ticks, [548, 549, 552, 553]); assert.deepEqual(g['hood-wounded'].ticks, [258, 262, 278]); assert.deepEqual(g['vincent-wounded'].ticks, [270, 290]);
    assert.deepEqual(g['first-minnesota'].ticks, [295, 302]); assert.deepEqual(g['iron-brigade-herbst'].ticks, [20, 27, 29]); assert.deepEqual(g['26th-nc'].ticks, [16, 28]);
    assert.equal(g['armistead'].ok, true); assert.deepEqual(g['armistead'].ticks, [551, 552]);
  });
  test('TM-V6: an independent weighted-chain check finds inversions and agrees with the specialist on most of the WRONG-DAY rows', () => {
    assert.ok(res['TM-V6'].count >= 16); for (const t of [8, 360, 380, 420]) assert.ok(res['TM-V6'].data.inversions.includes(t) || res['TM-V6'].data.onlySpec.includes(t), `t${t}`);
    assert.ok(res['TM-V6'].data.both.length >= 8);
  });
  test('TM-V7 reproduces the specialist: 1,209 pairs, 803 moving >=100 m, 6 over the cap at 5 min/tick, 19 under the proposal (1 a day seam), 5 seams', () => {
    const k = kinematics(ctx);
    assert.equal(k.pairs, 1209); assert.equal(k.ge100, 803); assert.equal(k.uniform.length, 6); assert.equal(k.proposed.length, 19); assert.equal(k.proposed.filter((x) => x.seam).length, 1); assert.equal(k.seams.length, 5);
    assert.deepEqual(k.seams.map((s) => `${s.id}:${s.from}-${s.to}`).sort(), ['C-I-3-3:225-226', 'C-I-3-3:450-451', 'U-1MN:450-451', 'U-20ME:225-226', 'U-XII-2-3:450-451']);
  });
  test('TM-V9: three "July ${..+2}" date sites in the bundle (plus the ledger tab-index date and the dashboard day-name table), 5 typed 4/5/6*60 constants, the visitor\'s wall clock allow-listed, 36 typed clock strings', () => {
    const h = res['TM-V9'].data; assert.equal(h.date.filter((x) => x.startsWith('assets/')).length, 3); assert.equal(h.date.length, 5); assert.equal(h.date.filter((x) => x.startsWith('dashboard.html')).length, 1);
    assert.equal(h.minutes.length, 5); assert.equal(h.tick5.length, 8); assert.equal(h.locale.length, 1); assert.match(h.locale[0], /^sandbox\.html/); assert.equal(h.ampm.length, 13); assert.equal(h.clocktext.length, 36);
  });
  test('TM-V13: placement_schema says 430,000 records and the per-day real_time strings; record_count 4,890 vs the 100 rows', () => {
    const d = res['TM-V13'].details.join('\n'); assert.match(d, /record_count 4890 but 100 records/); assert.match(d, /430/); assert.match(d, /ticks_per_day|day1\.real_time/);
  });
  test('TM-V14: 487 ticks without a placement record; the event-free run t101-225 (125 ticks) is night', () => {
    assert.equal(res['TM-V14'].data.empty, 487); assert.ok(res['TM-V14'].data.longRuns.some(([a, b]) => a === 101 && b === 225));
    assert.equal(model.dayPart(150), 'night');
  });
  test('TM-V15: the permalink fixtures resolve (26 lines)', () => { assert.equal(res['TM-V15'].status, 'pass'); assert.match(res['TM-V15'].headline, /^26 fixtures/); });
  test('TM-V16/V17: the mobile header and the toolbar print a tab number as a date (and the dashboard indexes a typed date table by the day); 13 typed AM/PM formatters plus 29 unhedged typed clock strings, none with "about"', () => {
    assert.ok(res['TM-V16'].data.sites.some((s) => s.ident === 'di')); assert.ok(res['TM-V16'].data.sites.some((s) => s.ident === 'va')); assert.ok(res['TM-V16'].data.sites.some((s) => s.kind === 'table' && s.at.startsWith('dashboard.html')));
    assert.equal(res['TM-V16'].count, 8); assert.equal(res['TM-V17'].count, 42);
  });
  test('TM-V18 is clean today, V19/V20 are honestly skipped, V21 finds the two unverified quotations', () => {
    assert.equal(res['TM-V18'].status, 'pass'); assert.equal(res['TM-V19'].status, 'skip'); assert.equal(res['TM-V20'].status, 'skip');
    assert.ok(res['TM-V21'].data.total > 40); assert.deepEqual(res['TM-V21'].data.unverified, [525, 530]);
  });
  test('the committed baseline equals a fresh run (regression detector) and --check exits 0', () => {
    const r = spawnSync(process.execPath, [P('tools', 'time', 'validate.mjs'), '--check'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /no regression/);
  });
});

describe('mutation tests: the rules turn red when a defect is injected (TX-15)', () => {
  test('a "+ 2" date template in a page is caught by TM-V9 and TM-V16', () => {
    const d = tree(); const base = res['TM-V9'].data.date.length;
    edit(d, 'compare.html', (t) => t.replace('</body>', '<script>const l = 1; const x = `July ${l + 2}, 1863`;</script></body>'));
    const r = runOn(d); assert.equal(r['TM-V9'].data.date.length, base + 1); assert.ok(r['TM-V9'].count > res['TM-V9'].count);
  });
  test('a hand-typed clock formatter (AM/PM) and a tick*5 formula are caught by TM-V9 / TM-V17', () => {
    const d = tree();
    edit(d, 'camera.html', (t) => t.replace('</body>', '<script>function lbl(tick){ const m = (tick - 1) * 5; return (m/60|0) + (m > 720 ? "PM" : "AM"); }</script></body>'));
    const r = runOn(d); assert.equal(r['TM-V9'].data.tick5.length, res['TM-V9'].data.tick5.length + 1); assert.equal(r['TM-V9'].data.ampm.length, res['TM-V9'].data.ampm.length + 2); assert.ok(r['TM-V17'].count > res['TM-V17'].count);
  });
  test('"accurate to the minute" copy without a signed decision fails TM-V18; a signed decision on file clears it', () => {
    const d = tree();
    edit(d, 'index.html', (t) => t.replace('</body>', '<p>Every time on this map is accurate to the minute.</p></body>'));
    assert.equal(runOn(d)['TM-V18'].status, 'fail'); assert.equal(runOn(d)['TM-V18'].count, 1);
    const dec = path.join(d, 'decisions.jsonl'); fs.writeFileSync(dec, JSON.stringify({ id: 'D-0001', subject: 'all', state: 'signed' }) + '\n');
    assert.equal(runOn(d, { decisions: dec })['TM-V18'].status, 'pass');
  });
  test('an out-of-range tick link is caught by TM-V8', () => {
    const d = tree(); edit(d, 'documentary.html', (t) => t.replace('</body>', '<a href="/index.html?tick=999&vignette=V-001">x</a></body>'));
    const r = runOn(d); assert.ok(r['TM-V8'].details.some((x) => /tick=999 out of range/.test(x)));
  });
  test('a hard-coded tab boundary in a new page is caught by TM-V2; a label regenerated from the model is credited by TM-V4', () => {
    const d = tree();
    edit(d, 'regiment.html', (t) => t.replace('</body>', '<script>const day = t => t <= 225 ? 1 : (t <= 450 ? 2 : 3);</script></body>'));
    assert.equal(runOn(d)['TM-V2'].count, res['TM-V2'].count + 1);
    const f = path.join(d, 'data', 'chronology_day1.json'); const j = readJson(f); const e = j.events.find((x) => x.tick === 12); assert.notEqual(e.time, '7:30am'); e.time = '7:30am'; fs.writeFileSync(f, JSON.stringify(j));
    assert.equal(runOn(d)['TM-V4'].data.modelBad, res['TM-V4'].data.modelBad - 1);
  });
  test('moving a moment out of line is caught by TM-V5: re-ticking the Armistead vignette from 551 to 560 breaks a passing group', () => {
    const d = tree(); const f = path.join(d, 'data', 'vignettes_part2.json'); const j = readJson(f); const v = j.vignettes.find((x) => x.vignette_id === 'V-016'); assert.equal(v.trigger_tick, 551); v.trigger_tick = 560; fs.writeFileSync(f, JSON.stringify(j));
    const r = runOn(d)['TM-V5']; assert.equal(r.count, res['TM-V5'].count + 1); assert.equal(r.data.groups.find((x) => x.id === 'armistead').ok, false);
  });
  test('editing an anchor without regenerating the golden fails TM-V11 and the generated-module check in TM-V1', () => {
    const d2 = JSON.parse(JSON.stringify(doc)); d2.anchors.find((a) => a.tick === 538).t = '1863-07-03T14:45';
    const r = Object.fromEntries(runAll(buildContext(makeTimeModel(d2), d2)).map((x) => [x.id, x]));
    assert.equal(r['TM-V11'].status, 'fail'); assert.equal(r['TM-V1'].status, 'fail'); assert.match(r['TM-V1'].details.join('\n'), /anchors\.generated\.js is stale/);
  });
  test('an invalid anchor set (missing tab start, non-monotone) fails TM-V1', () => {
    const d2 = JSON.parse(JSON.stringify(doc)); d2.anchors = d2.anchors.filter((a) => a.tick !== 226);
    assert.equal(validateOnly(d2), 'fail');
  });
  test('a quotation without a source is counted by TM-V21 and a new clock beside a tick by TM-V3', () => {
    const d = tree(); const f = path.join(d, 'data', 'chronology_day2.json'); const j = readJson(f);
    j.events.push({ tick: 300, time: '9:00am', event: 'Someone said: "We shall hold this hill at 6:00am, come what may." and left.', significance: 'low' }); fs.writeFileSync(f, JSON.stringify(j));
    const r = runOn(d); assert.equal(r['TM-V21'].data.total, res['TM-V21'].data.total + 1); assert.equal(r['TM-V3'].data.pairs, res['TM-V3'].data.pairs + 1);
  });
});

function validateOnly(d2) { try { const m = makeTimeModel(d2); return runAll(buildContext(m, d2)).find((x) => x.id === 'TM-V1').status; } catch { return 'fail'; } }
