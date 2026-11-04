// Node tests (no browser) for contract 1.3: casualties (shares, fate ranges, printed windows, the solver's plan, the stage's fall tables), guns, formation change.
//   node --test docs/battle-theatre/app/tests/casualties.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits, CREW_POSTS, GUN_PERIOD_S } from '../src/world-from-units.mjs';
import { Stage, FALL_NEVER, HIDDEN } from '../src/stage.mjs';
import { fateModel, describeLoss, largestRemainder, solvePlan, windowsOf, windowIndex, runningState, FATES, CAS_TIER } from '../src/history/casualties.mjs';
import { validateEvents, validateUnits, validateCasualties, validateGuns, FORMATION_SECONDS } from '../src/history/contract.mjs';
import { soldierPlace, soldierClip } from '../../render/prototype/src/world.mjs';
import { build as buildEngagements } from '../tools/build-engagements.mjs';
import { build as buildGuns } from '../tools/build-guns.mjs';
import { CLAUSES } from '../tools/engagement-clauses.mjs';
import { minOf } from '../src/clock.mjs';
import { rand } from '../../sim/rng.mjs';
import { gunsRows, lossSection, lossLive } from '../src/ui/card-sections.mjs';
import { report as buildReport } from '../tools/history-report.mjs';

const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), helpers = { civilDawn: m => m + 4 * 60 + 3 };
const mk = (r = raw) => { const L = createRealHistory({ raw: r, T: TM, helpers }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo }); stage.loadScenario({}); return { L, world, stage }; };
const { L, world, stage } = mk(), ids = new Set(L.units.map(u => u.id)), idx = new Map(L.units.map((u, i) => [u.id, i]));
const ev = L.both({}).events, rep = L.report({}), strip = e => { const { _o, ...r } = e; return r; };
const T0 = (d, h, m = 0) => minOf(7, d, h, m);

test('sources: every figure of casualty-sources.json is in the PDF text (B.1) or the OR27 claim check; the fractions and the spread are computed from them', () => {
  const src = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/casualty-sources.json'), 'utf8')), pdf = fs.readFileSync(path.join(BT, 'BIBLE/plan-clean.txt'), 'utf8').replace(/\s+/g, ' ');
  for (const s of src.pdf_text_checks) assert.ok(pdf.includes(s), 'PDF text lacks: ' + s);
  const claims = JSON.parse(fs.readFileSync(path.join(BT, 'library/or27_claim_checks.json'), 'utf8')), txt = JSON.stringify(claims);
  assert.ok(txt.includes('14,193') && txt.includes('23,049'), 'the OR27 claim check carries Letterman 14,193 and the return total 23,049');
  const fm = fateModel(src);
  assert.ok(Math.abs(fm.union.fraction.killed[0] - 3155 / 23055) < 1e-12 && Math.abs(fm.union.fraction.wounded[0] - 14193 / 23049) < 1e-12 && Math.abs(fm.union.fraction.wounded[1] - 14529 / 23049) < 1e-12);
  assert.ok(Math.abs(fm.confederate.fraction.killed[1] - 4708 / 23231) < 1e-12 && Math.abs(fm.confederate.fraction.killed[0] - 3903 / 28063) < 1e-12 && Math.abs(fm.confederate.ratio_max - 28063 / 22709) < 1e-12);
  for (const a of ['union', 'confederate']) { const mid = FATES.reduce((s, f) => s + fm[a].mid[f], 0); assert.ok(Math.abs(mid - 1) < 1e-12, 'the middle fractions are normalised'); }
  for (const a of Object.values(src.armies)) for (const s of a.fate_sources) assert.ok(!s.total || (s.killed ?? 0) + (s.wounded ?? 0) + (s.missing ?? 0) <= s.total + 1e-9 || s.partial);
});

test('describeLoss and largestRemainder: the split adds up to the total exactly, every range holds its point, the total range starts at the printed figure', () => {
  assert.deepEqual(largestRemainder(10, [1, 1, 1]), [4, 3, 3]); assert.deepEqual(largestRemainder(0, [1, 2]), [0, 0]);
  for (const army of ['union', 'confederate']) for (const Lt of [0, 1, 2, 5, 13, 99, 130, 230, 745, 1150, 6044, 8172]) {
    const d = describeLoss(Lt, L.fateModel[army]), sum = FATES.reduce((s, f) => s + d.fates[f].point, 0);
    assert.equal(sum, Lt); assert.equal(d.total.min, Lt); assert.ok(d.total.max >= Lt); assert.deepEqual(validateCasualties({ kind: 'printed', basis: 'x', tier: CAS_TIER, weak_source: true, ...d }), [], `${army} ${Lt}`);
    for (const f of FATES) assert.ok(d.fates[f].min <= d.fates[f].point && d.fates[f].point <= d.fates[f].max);
  }
});

test('shares: the printed figures are kept, every pool is shared exactly, no share exceeds the strength share, the unit validators accept them', () => {
  const printed = L.units.filter(u => u.casualties.kind === 'printed'); assert.equal(printed.length, 21);
  for (const u of printed) { const raw0 = raw.units.units.find(x => x.id === u.id); assert.equal(u.casualties.total.printed, raw0.strength.lost); assert.equal(u.casualties.tier, CAS_TIER); assert.equal(u.casualties.weak_source, true); }
  assert.deepEqual(validateUnits(L.units), []);
  const members = new Map(); for (const u of L.units) if (u.casualties.kind === 'procedural') { const k = u.casualties.pool_owner; if (!members.has(k)) members.set(k, []); members.get(k).push(u); }
  assert.equal(members.size, L.lossPools.length);
  for (const p of L.lossPools) {
    const ms = members.get(p.owner) || []; assert.equal(ms.length, p.leaves_on_field); assert.equal(ms.reduce((s, u) => s + u.casualties.total.printed, 0), p.pool_lost, `${p.owner}: the shares add up to the pool`);
    assert.ok(p.pool_lost <= p.pool_strength, `${p.owner}: loss rate at most 100%`); for (const u of ms) assert.ok(u.casualties.total.printed <= u.strength.share, `${u.id}: loss share <= strength share`);
  }
  const I = L.lossPools.find(p => p.owner === 'us-1c'); assert.equal(I.pool_lost, 6044 - 1150 - 1000 - 1030);
  for (const u of L.units) { if (u.casualties.kind === 'none') { assert.equal(u.casualties.total, null); assert.ok(u.casualties.basis.length > 10); } else assert.match(u.casualties.basis, /^(single loss figure printed|plausible-procedural)/); }
});

test('engagements: built from the clause table and the PDF rows, reproducible, refuses a phrase that is not in the row, an unknown unit, a point row without a printed duration, a row with no window', () => {
  const file = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/engagements.json'), 'utf8')); assert.deepEqual(buildEngagements(), file, 'run node tools/build-engagements.mjs');
  const bad = c => assert.throws(() => buildEngagements([{ ...CLAUSES[0], ...c }]), /does not hold/);
  bad({ phrases: ['this sentence is not in the row'] }); bad({ units: ['no-such-unit'] }); bad({ row: 'T1-099' }); bad({ row: 'T1-093', phrases: [] }); bad({ row: 'T1-108', duration: { phrase: 'under 99 min', minutes: 99 } });
  const seed = new Map(fs.readFileSync(path.join(BT, 'GOVERNANCE/timeline_windows.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l)).map(r => [r.id, r]));
  for (const c of file.clauses) { const w = seed.get(c.row); if (c.window.basis === 'timeline_window') { assert.equal(w.parse_status, 'range'); assert.equal(c.window.from, w.earliest); assert.equal(c.window.to, w.latest); } else { assert.equal(w.parse_status, 'point'); assert.equal(c.window.from, w.default); assert.equal(c.window.to - c.window.from, 30); } assert.notEqual(c.tier, 'documented'); assert.equal(c.row_status, 'seeded_unverified'); }
  assert.ok(!/"(killed|wounded|missing|casualt|lost)[a-z_]*"\s*:/i.test(JSON.stringify(file)), 'the file holds no casualty number');
  const by = new Map(raw.units.units.map(u => [u.id, u])), idx2 = windowIndex(file), w = windowsOf('us-1c-1d-meredith-2wi', by, idx2);
  assert.ok(w.clauses.includes('EN-001') && w.clauses.includes('EN-009'), 'a regiment takes its brigade’s windows'); for (let i = 1; i < w.windows.length; i++) assert.ok(w.windows[i - 1].to < w.windows[i].from, 'merged windows are disjoint');
  assert.equal(windowsOf('us-1c-art-2me', by, idx2).windows.length, 0, 'a battery named by no row has no window');
});

test('the solver’s plan of every drawn unit: totals equal the fate split exactly, each man falls once, inside the printed windows, scenario independent, a pure function of the seed', () => {
  let n = 0;
  for (const u of L.units.filter(x => x.drawn && x.casualties.kind !== 'none' && x.casualties.engaged)) {
    const p = L.planOf(u.id), c = u.casualties; n++; assert.equal(p.length, c.total.printed); assert.ok(p.length <= u.strength.drawn);
    for (const f of FATES) assert.equal(p.filter(e => e.fate === f).length, c.fates[f].point, `${u.id} ${f}`);
    assert.equal(new Set(p.map(e => e.agent)).size, p.length); assert.ok(p.every(e => e.agent >= 0 && e.agent < u.strength.drawn));
    for (let i = 1; i < p.length; i++) assert.ok(p[i - 1].t <= p[i].t, 'monotone in time');
    assert.ok(p.every(e => c.windows.some(w => e.t >= w.from - 1e-9 && e.t <= w.to + 1e-9)), `${u.id}: every fall is inside a printed window`);
    const again = solvePlan({ unitId: u.id, strength: u.strength.drawn, point: { killed: c.fates.killed.point, wounded: c.fates.wounded.point, missing: c.fates.missing.point }, windows: c.windows, seed: 1863 }); assert.deepEqual(again, p);
    if (p.length > 5) assert.notDeepEqual(solvePlan({ unitId: u.id, strength: u.strength.drawn, point: { killed: c.fates.killed.point, wounded: c.fates.wounded.point, missing: c.fates.missing.point }, windows: c.windows, seed: 1864 }).map(e => e.t), p.map(e => e.t), 'another seed gives other times');
  }
  assert.equal(n, rep.casualties.length); assert.ok(n >= 30, 'drawn units with a plan: ' + n);
  const other = L.both({ choices: { 'C-004': 'v1' }, optionText: { 'C-004': 'at dawn' } }).events.filter(e => e.type === 'state' && e.unit === 'us-1c-2d-baxter-12ma').length; assert.equal(other, ev.filter(e => e.type === 'state' && e.unit === 'us-1c-2d-baxter-12ma').length);
  assert.throws(() => solvePlan({ unitId: 'x', strength: 10, point: { killed: 20, wounded: 0, missing: 0 }, windows: [{ from: 0, to: 10 }], seed: 1 }), /exceed strength/);
  assert.deepEqual(solvePlan({ unitId: 'x', strength: 10, point: { killed: 2, wounded: 0, missing: 0 }, windows: [], seed: 1 }), [], 'no window: nothing is invented');
});

test('state events: valid, placed only after the unit entered and while it stands, running ranges monotone, never before the gate (Q04); shown + not shown = the plan', () => {
  assert.deepEqual(validateEvents(ev, ids), []); const st = ev.filter(e => e.type === 'state'); assert.ok(st.length > 3000);
  const gate = new Map(L.arrivals({}).map(a => [a.unit, a])), last = new Map(), seen = new Map(), legs = new Map(); for (const e of ev) if (e.type === 'path') { if (!legs.has(e.unit)) legs.set(e.unit, []); legs.get(e.unit).push([e.wp[0].t, e.wp.at(-1).t]); }
  for (const e of ev) {
    if (e.type === 'activity') last.set(e.unit, e.activity);
    if (e.type !== 'state') continue;
    assert.ok(e.t >= gate.get(e.unit).earliest, `${e.unit}: a fall before the gate`); assert.ok(e.t >= gate.get(e.unit).default, `${e.unit}: a fall before the unit enters`);
    assert.ok(!(legs.get(e.unit) || []).some(([a, b]) => e.t > a && e.t < b), `${e.unit}: a fall while marching`);
    assert.ok((legs.get(e.unit) || []).some(([a, b]) => b <= e.t), `${e.unit}: a fall before the unit has reached a place (last activity ${last.get(e.unit)})`);      // an activity clause (an attack: double_quick) can run while the unit stands at its place; a leg of a path is a march
    assert.equal(e.tier, CAS_TIER); assert.equal(e.weak_source, true); assert.ok(e.strength_now.max <= L.units[idx.get(e.unit)].strength.drawn);
    const p = seen.get(e.unit); if (p) { assert.ok(e.down >= p.down); assert.ok(e.strength_now.max <= p.strength_now.max && e.strength_now.min <= p.strength_now.min); assert.ok(e.killed.min >= p.killed.min && e.missing.max >= p.missing.max); } seen.set(e.unit, e);
  }
  for (const c of rep.casualties) { assert.equal(c.shown + c.not_shown, c.plan_events); assert.equal(c.killed + c.wounded + c.missing, c.shown); assert.equal(st.filter(e => e.unit === c.unit).length, c.shown); }
  assert.ok(rep.casualties.some(c => c.not_shown > 0) && rep.casualties.some(c => c.shown > 0));
  const end = st.filter(e => e.unit === 'us-1c-2d-baxter-12ma').at(-1), c0 = L.units[idx.get('us-1c-2d-baxter-12ma')].casualties; assert.equal(end.down, c0.fates.killed.point + c0.fates.wounded.point); assert.ok(end.killed.min <= c0.fates.killed.point && end.killed.max >= c0.fates.killed.point);
  assert.deepEqual(runningState({ strength: 100, loss: c0, done: 0, counts: { killed: 0, wounded: 0, missing: 0 } }).strength_now, { min: 100, max: 100 });
});

test('the stage: a man who falls lies where he fell while his unit marches away; he does not fall before his time; scrubbing back stands him up', () => {
  const uid = 'us-1c-1d-meredith-19in', i = idx.get(uid), w = world.units[i], f = ev.find(e => e.type === 'state' && e.unit === uid && e.fate !== 'missing' && e.t > T0(1, 15, 5) && e.t < T0(1, 15, 30));
  assert.ok(f, 'a man falls at Seminary Ridge in the printed window'); const g = w.first + f.agent, o = [0, 0, 0], o2 = [0, 0, 0];
  stage.apply(f.t - 5); assert.equal(world.sold1[g * 4], FALL_NEVER); const before = [world.sold[g * 4], world.sold[g * 4 + 1]];
  stage.apply(f.t + 5); assert.ok(world.sold1[g * 4] < FALL_NEVER / 2); soldierPlace(world, g, 0, o); const ux = stage.cx[i], uz = stage.cz[i];
  stage.apply(T0(1, 16, 40)); soldierPlace(world, g, 0, o2); const moved = Math.hypot(stage.cx[i] - ux, stage.cz[i] - uz);
  assert.ok(moved > 150, `the unit marched away from where he fell: ${moved.toFixed(0)} m`); assert.ok(Math.hypot(o[0] - o2[0], o[1] - o2[1]) < 0.03, 'the fallen man did not move with the unit');
  let walked = 0, k = 0; for (let a = 0; a < w.count && k < 20; a++) { const gg = w.first + a; if (world.sold1[gg * 4] >= FALL_NEVER / 2) { soldierPlace(world, gg, 0, o); stage.apply(T0(1, 15, 40)); soldierPlace(world, gg, 0, o2); stage.apply(T0(1, 16, 40)); walked += Math.hypot(o[0] - o2[0], o[1] - o2[1]); k++; } }
  assert.ok(walked / Math.max(1, k) > 100, 'a man still standing marches with the unit');
  stage.apply(f.t - 5); assert.equal(world.sold1[g * 4], FALL_NEVER); assert.ok(Math.abs(world.sold[g * 4] - before[0]) < 1e-6 && Math.abs(world.sold[g * 4 + 1] - before[1]) < 1e-6, 'standing again: the slot is restored');
  stage.apply(T0(1, 9)); for (let a = 0; a < w.count; a++) assert.equal(world.sold[(w.first + a) * 4], stage.sold0[(w.first + a) * 4]);
  assert.equal(world.units[i].radius >= world.units[i].r0, true);
});

test('the stage: the fall clip plays once then the man lies; a missing man is counted but not animated; the renderer’s clock is a function of the shell’s', () => {
  const uid = 'us-1c-2d-baxter-12ma', i = idx.get(uid), w = world.units[i], fall = ev.find(e => e.type === 'state' && e.unit === uid && e.fate !== 'missing'), miss = ev.find(e => e.type === 'state' && e.unit === uid && e.fate === 'missing');
  const g = w.first + fall.agent, gm = w.first + miss.agent, out = [0, 0, 0]; stage.rebase();
  stage.apply(fall.t - 1 / 60, 500); assert.equal(world.sold1[g * 4], FALL_NEVER); stage.apply(fall.t + 1 / 60, 502); soldierClip(world, g, 502, out); assert.equal(out[0], 5, 'falling'); assert.ok(out[1] > 0 && out[1] < 1);
  stage.apply(fall.t + 4 / 60, 505); soldierClip(world, g, 505, out); assert.equal(out[0], 6, 'lying'); assert.equal(out[1], 1);
  stage.apply(T0(1, 18), 700); soldierClip(world, g, 700, out); assert.equal(out[0], 6, 'still lying hours later');
  stage.apply(miss.t + 10, 800); assert.equal(world.sold1[gm * 4], FALL_NEVER, 'a missing man is not animated'); const l = stage.lossAt(i, miss.t + 10); assert.ok(l.missing.max >= 1 && l.down >= 0);
  stage.rebase(); stage.apply(T0(1, 18), 700);                                              // a seek recomputes against the new clock
  soldierClip(world, g, 700, out); assert.equal(out[0], 6);
});

test('the stage is pure in time: shuffled seeks give the same live tables, state hash and soldier tables as sequential playback, forward and back', () => {
  const times = []; for (let k = 0; k < 40; k++) times.push(T0(1, 9) + Math.floor(rand(5, 1, k, 1) * 2 * 1440 * 1.2)); const sorted = [...times].sort((a, b) => a - b);
  const snap = () => { const s = world.sold, s1 = world.sold1; let h = 0; for (let k = 0; k < s.length; k++) h = (h * 31 + Math.round(s[k] * 1000)) | 0; for (let k = 0; k < s1.length; k += 4) h = (h * 31 + (s1[k] > FALL_NEVER / 2 ? 1 : 2)) | 0; return h; };
  const seq = new Map(); for (const t of sorted) { stage.apply(t); seq.set(t, [stage.liveHash(), stage.stateHash(t), snap()]); }
  const order = [...times].sort((a, b) => rand(6, 2, a | 0, 3) - rand(6, 2, b | 0, 3)); for (const t of order) { stage.apply(t); assert.deepEqual([stage.liveHash(), stage.stateHash(t), snap()], seq.get(t), `t=${t}`); }
  assert.ok(new Set([...seq.values()].map(v => v[0])).size > 5, 'the hash is not constant');
});

test('guns: a gun is drawn only where the kit states a count for a battery that is drawn (the real layer: one battery, 6 pieces); a stated count draws that many pieces with nine-man detachments out of the same figures', () => {
  const dg = L.units.filter(u => u.guns.status === 'drawn'), G0 = dg.reduce((a, u) => a + u.guns.count, 0); assert.ok(dg.every(u => u.drawn && u.guns.count > 0 && u.guns.sources.includes('KIT-GUNS')), 'a drawn gun has a stated count and a drawn battery'); assert.equal(world.extra.length, G0); assert.equal(world.guns.length, Math.max(1, G0)); if (!G0) assert.ok(world.gunF[0] >= HIDDEN / 2);
  for (const u of L.units.filter(x => x.arm === 'artillery' && !x.children.length)) { assert.deepEqual(validateGuns(u.guns), []); if (u.guns.status === 'drawn') { assert.ok(u.drawn && u.guns.count > 0); continue; } assert.equal(u.guns.status, 'not_drawn'); assert.match(u.guns.reason, /no stated gun count|stated|combines|joins/); }
  assert.match(gunsRows(L.units[idx.get('us-1c-art-2me')]), /not drawn: no stated gun count/);
  const bg = buildGuns(), file = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/battery-guns.json'), 'utf8')); assert.deepEqual(bg, file, 'run node tools/build-guns.mjs');
  assert.equal(bg.kit_counts.with_stated_guns, 29); assert.equal(bg.matched.length + bg.combined.length + bg.unmatched.length, 29);
  assert.ok(bg.combined.some(c => c.kit === 'US.ART.3rd_US_F_K' && c.history.length === 2), 'a combined entry is not split'); for (const c of bg.combined) assert.ok(!bg.matched.some(m => c.history.includes(m.history)), 'no battery takes a combined count');
  // a counterfactual fixture (TEST ONLY, not data): the stated record of one real kit battery is pointed at a drawn battery to exercise the mechanism
  const real = bg.matched.find(m => m.kit === 'US.ART.1st_US_H'), r3 = structuredClone(raw); r3.batteryGuns.matched.push({ ...real, history: 'us-1c-art-2me', history_name: '2nd ME', note: 'TEST FIXTURE' });
  const X = mk(r3), u3 = X.L.units[idx.get('us-1c-art-2me')]; assert.equal(u3.guns.status, 'drawn'); assert.equal(u3.guns.count, 6); assert.equal(u3.guns.crew_per_gun, 9); assert.deepEqual(validateUnits(X.L.units), []);
  assert.equal(X.world.guns.length, G0 + 6); assert.equal(X.world.extra.length, G0 + 6); assert.equal(X.world.units.length, 726 + G0 + 6); assert.equal(X.world.count, X.L.units.filter(u => u.drawn).reduce((a, u) => a + u.strength.drawn, 0), 'one soldier per figure: the crew come out of the battery’s own figures');
  assert.equal(X.world.units[idx.get('us-1c-art-2me')].count, 308 - 54); for (const e of X.world.extra) assert.equal(X.world.units[726 + X.world.extra.indexOf(e)].count, CREW_POSTS.length);
  X.stage.apply(T0(1, 9, 0)); for (let k = 0; k < 6; k++) assert.ok(X.world.gunF[k * 8] >= HIDDEN / 2, 'hidden before the battery arrives');
  const en = X.L.both({}).events.find(e => e.unit === 'us-1c-art-2me' && e.type === 'activity' && e.activity === 'stand'); X.stage.apply(en.t + 5); const bi = idx.get('us-1c-art-2me');
  for (let k = 0; k < 6; k++) { assert.ok(X.world.gunF[k * 8] < HIDDEN / 2); assert.ok(Math.hypot(X.world.gunF[k * 8] - X.stage.cx[bi], X.world.gunF[k * 8 + 1] - X.stage.cz[bi]) < 120); const ci = 726 + k; assert.equal(X.stage.present[ci], 1); assert.ok(Math.hypot(X.stage.cx[ci] - X.world.gunF[k * 8], X.stage.cz[ci] - X.world.gunF[k * 8 + 1]) < 1); }
  assert.ok(X.stage.gun0[4] >= GUN_PERIOD_S * 0.9 - 1e-3 && X.stage.gun0[4] <= GUN_PERIOD_S * 1.1 + 1e-3, 'the piece cadence is the model value');
  assert.match(gunsRows(u3), /6 drawn \(6 Napoleons\), each with a detachment of 9/); assert.equal(X.L.report({}).casualties.length, rep.casualties.length);
});

test('formation change: a printed “deploys” clause moves every drawn unit under it from column to line over a smoothstep, no snap; unsupported formations are listed, not dropped', () => {
  const fev0 = ev.filter(e => e.type === 'formation'); assert.ok(fev0.length > 0 && fev0.every(e => ['CL-231', 'CL-306'].includes(e.clause)), 'only the two printed clauses (McLaws deploys, Rodes line) have drawn units under them (since v5: Kershaw’s brigade and Rodes’ division are drawn)');
  const clause = r => r.placement.clauses.find(c => c.id === 'CL-231'), r4 = structuredClone(raw); clause(r4).units = ['us-1c-1d-meredith'];
  const Y = mk(r4), fe = Y.L.both({}).events.filter(e => e.type === 'formation' && e.clause === 'CL-231'); assert.equal(fe.length, 5); assert.deepEqual(validateEvents(Y.L.both({}).events, ids), []);
  for (const e of fe) { assert.equal(e.formation, 'line'); assert.equal(e.duration_s, FORMATION_SECONDS); assert.equal(e.t, T0(2, 15, 0)); assert.equal(e.clause, 'CL-231'); }
  const uid = 'us-1c-1d-meredith-2wi', i = idx.get(uid), w = Y.world.units[i]; assert.ok(w.alt && w.baseFormation === 'column_fours' && w.altFormation === 'line');
  assert.deepEqual(Y.L.units[i].formation.changes.map(c => c.to), ['line']); assert.equal(Y.stage.unsupported.length, 0);
  const t0 = T0(2, 15, 0), tm = t => t0 + t / 60, lock = a => { const j = Y.stage.dt[i].loss ? Y.stage.dt[i].loss.jOf[a] : -1; return j >= 0; };
  const slots = () => { const o = []; for (let a = 0; a < w.count; a++) o.push([Y.world.sold[(w.first + a) * 4], Y.world.sold[(w.first + a) * 4 + 1]]); return o; };
  Y.stage.apply(tm(-10)); const A = slots(); for (let a = 0; a < w.count; a++) if (!lock(a)) assert.equal(A[a][0], Y.stage.sold0[(w.first + a) * 4]);
  const frames = []; for (let s = -10; s <= 100; s += 2) { Y.stage.apply(tm(s)); frames.push(slots()); }
  Y.stage.apply(tm(100)); const B = slots(); let moved = 0, free = 0;
  for (let a = 0; a < w.count; a++) { if (lock(a)) continue; free++; assert.ok(Math.abs(B[a][0] - w.alt[a * 2]) < 1e-4 && Math.abs(B[a][1] - w.alt[a * 2 + 1]) < 1e-4, 'the line layout is reached'); moved = Math.max(moved, Math.hypot(w.alt[a * 2] - A[a][0], w.alt[a * 2 + 1] - A[a][1])); }
  assert.ok(free > 100 && moved > 20, `figures travel up to ${moved.toFixed(0)} m`);
  let maxStep = 0; for (let k = 1; k < frames.length; k++) for (let a = 0; a < w.count; a++) { if (lock(a)) continue; const d = Math.hypot(frames[k][a][0] - frames[k - 1][a][0], frames[k][a][1] - frames[k - 1][a][1]), total = Math.hypot(w.alt[a * 2] - A[a][0], w.alt[a * 2 + 1] - A[a][1]); if (total > 1) maxStep = Math.max(maxStep, d / total); }
  assert.ok(maxStep < 0.06, `no snap: the largest step in 2 s is ${(maxStep * 100).toFixed(1)}% of the figure’s whole move (a smoothstep over ${FORMATION_SECONDS} s allows 3.3%)`);
  assert.ok(Math.abs(Y.stage.dt[i].sig[1] - 1) < 1e-9, 'blend 1');
  const r5 = structuredClone(raw); clause(r5).units = ['us-1c-1d-meredith']; clause(r5).formation = 'column_mass'; const Z = mk(r5); assert.equal(Z.stage.unsupported.length, 5); assert.match(Z.stage.unsupported[0].reason, /layouts column_fours and line only/);
  const r6 = structuredClone(raw); clause(r6).units = ['us-cav-1d-merritt-6pa']; const V = mk(r6); assert.equal(V.L.both({}).events.filter(e => e.type === 'formation' && e.clause === 'CL-231').length, 0, 'a unit that is not on the map at the clause time gets no event');
});

test('contract 1.3 validators reject what they must; the card sections render for every kind of unit', () => {
  const u = L.units.find(x => x.drawn);
  assert.match(validateEvents([{ type: 'state', t: 1, unit: u.id, agent: -1, fate: 'x', strength_now: { min: 2, max: 1 } }], ids).join(' '), /integer index[\s\S]*fate[\s\S]*range/);
  assert.match(validateEvents([{ type: 'formation', t: 1, unit: u.id, formation: 'wedge' }], ids).join(' '), /formation wedge/); assert.match(validateEvents([{ type: 'formation', t: 1, unit: u.id, formation: 'line', duration_s: -1 }], ids).join(' '), /duration_s/);
  assert.match(validateCasualties({ ...u.casualties, tier: 'documented' }).join(' '), /cannot be documented/); assert.match(validateCasualties({ ...u.casualties, weak_source: false }).join(' '), /weak_source/);
  assert.match(validateCasualties({ ...u.casualties, fates: { ...u.casualties.fates, killed: { point: 99999, min: 0, max: 1 } } }).join(' '), /killed/); assert.match(validateGuns({ status: 'drawn', count: null }).join(' '), /stated gun count/); assert.match(validateGuns({ status: 'not_drawn' }).join(' '), /reason/);
  const th = { layer: L, stage, state: { scenario: {}, t: T0(1, 15, 20) }, world };
  for (const x of [u, L.units.find(y => y.casualties.kind === 'printed'), L.units.find(y => y.casualties.kind === 'none'), L.units.find(y => y.render.status === 'not_drawn')]) { assert.ok(typeof lossSection(th, x) === 'string'); assert.ok(typeof lossLive(th, idx.get(x.id), th.state.t) === 'string'); }
  assert.match(lossSection(th, u), /Engagement windows/); assert.match(lossSection(th, L.units.find(y => y.id === 'us-1c-art-2me')), /No printed engagement window/);
});

test('CASUALTIES-NOTES.md quotes the numbers the layer computes now (it cannot drift)', () => {
  const notes = fs.readFileSync(path.join(BT, 'app/CASUALTIES-NOTES.md'), 'utf8'), k = buildReport(raw).contract13, c = k.casualties, nf = n => Number(n).toLocaleString('en-US');
  for (const x of [`${c.units_with_a_number} units carry a number: ${c.printed} printed, ${c.procedural} procedural`, `${c.drawn_with_plan} of the ${k.figures.drawn_units} drawn units have a printed window`, `places ${nf(c.plan_events)} men`, `${nf(c.shown)} fall where their unit stands (killed ${nf(c.shown_by_fate.killed)}, wounded ${nf(c.shown_by_fate.wounded)}, missing ${nf(c.shown_by_fate.missing)}`, `${nf(c.not_shown)} fall while it is marching in`, `${c.engaged_leaf_units} leaf units on the field take a window`, `${nf(k.figures.figures)} drawn figures has a manifest`, `${nf(k.figures.validation.flag)} flagged`, `Union 23,055 / 22,822 = ${(23055 / 22822).toFixed(4)}`, `Confederate 28,063 / 22,709 = ${(28063 / 22709).toFixed(4)}`])
    assert.ok(notes.includes(x) || notes.replace(/\*\*/g, '').includes(x), 'CASUALTIES-NOTES.md should say: ' + x);
  assert.equal(k.guns.guns_drawn, L.units.filter(u => u.guns.status === 'drawn').reduce((n, u) => n + u.guns.count, 0)); assert.ok(notes.includes('4th New York Battery') && notes.includes('its six guns are drawn'), 'the notes say which battery has guns'); assert.equal(c.verdicts.CONTRADICTED_BY_OR, 1); assert.equal(Object.values(k.figures.by_how).reduce((a, b) => a + b, 0), L.counts.drawn);
});
