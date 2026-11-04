// Node tests of the mounted-gait data and selection (src/anim3d/gaits.mjs, data/anim3d/gait-sources.json). No browser, no GPU.
//   node --test docs/battle-theatre/app/tests/anim3d-gaits.test.mjs
// Covers: every printed figure and its arithmetic (mph and yards-per-minute to m/s), the default basis keeps the behaviour that existed before the module, each basis is monotone and selects the
// documented gait, the cadence factor makes the clip's stance hoof meet the ground at the unit's speed (within the clamp), the AnimSystem option, the hoofbeat event names and spacing, determinism,
// the data file equals the generator, the squadron charge schedule, and the register tiers (nothing plausible-procedural is called documented).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { AnimSystem, ClipSel, GAIT_NAMES, GAIT_BASES, GAIT_SOURCES, CHARGE_SCHEDULE, gaitBasis, gaitTable } from '../src/anim3d/index.mjs';
import { mountedGait, mountedRate, GALLOP_MARGIN, CADENCE_CLAMP, MILE_M, YARD_M } from '../src/anim3d/gaits.mjs';
import { HORSE_GAITS } from '../src/anim3d/clips-cavalry.mjs';
import { GAPS } from '../src/anim3d/drill-tables.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..');
const skeleton = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'figures3d', 'skeleton.json'), 'utf8'));
const MPH = MILE_M / 3600, near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('gaits: the unit constants are exact (1 mile = 1609.344 m, 1 yard = 0.9144 m)', () => { assert.equal(MILE_M, 1609.344); assert.equal(YARD_M, 0.9144); });

test('gaits: the printed figures of each source are internally consistent (Wheeler 10 mph = a mile in 6 min; 3.75 mph = 16 min; the half mile of the Basis of Instruction)', () => {
  const W = GAIT_SOURCES.find(s => s.id === 'GS-WHEELER-1863'), basis = W.items[0], para = W.items[1];
  assert.deepEqual([basis.walk_mph, basis.trot_mph, basis.gallop_mph], [3.75, 7.5, 10]);
  // para 333: the mile in 16 / 8 / 6 minutes is 3.75 / 7.5 / 10 mph
  for (const [g, mph] of [['walk', 3.75], ['trot', 7.5], ['gallop', 10]]) assert.ok(near(60 / para.mile_min[g], mph, 1e-12), 'para 333 ' + g);
  // the half mile in 8 / 4 / 3 minutes is 3.75 / 7.5 / 10 mph
  for (const [min, mph] of [[8, 3.75], [4, 7.5], [3, 10]]) assert.ok(near(0.5 / (min / 60), mph, 1e-12), 'half mile in ' + min);
  const FA = GAIT_SOURCES.find(s => s.id === 'GS-FA-1863'); assert.deepEqual(FA.items[1].yd400_min, { walk: 4.5, trot: 2, gallop: 1 });
  // p. 42: 400 + 400 + 200 yards in 4.5 + 2 + 0.5 minutes = 7 minutes ("about seven minutes in all")
  const ph = FA.items[0].yards_per_phase; assert.equal(ph.reduce((a, p) => a + p.yd, 0), 1000); assert.equal(ph.reduce((a, p) => a + p.min, 0), 7);
  const C = GAIT_SOURCES.find(s => s.id === 'GS-COOPER-1861').items[0]; assert.deepEqual([C.walk_mph, C.trot_mph, C.gallop_mph], [[3.5, 4], 8.5, 11]);
});

test('gaits: every source carries a work, an archive reference, a page reference and an exact passage for each item, and a tier; the 1841 text is corroboration only', () => {
  assert.ok(GAIT_SOURCES.length >= 4);
  for (const s of GAIT_SOURCES) { assert.ok(s.work && s.archive && s.tier && s.items.length > 0, s.id); assert.ok(['documented', 'inferred'].includes(s.tier), s.id + ' tier');
    for (const it of s.items) { assert.match(it.ref, /p\. \d+/, s.id + ' page'); assert.ok(it.passage && it.passage.length > 20, s.id + ' passage'); } }
  const used = new Set(Object.values(GAIT_BASES).flatMap(b => b.src)); assert.ok(!used.has('GS-CAV-1841'), 'an inferred, OCR-damaged older edition is not a basis');
  assert.equal(GAIT_SOURCES.find(s => s.id === 'GS-CAV-1841').tier, 'inferred');
});

test('gaits: speeds of each basis are the printed figures converted to m/s; the walk of Cooper is the middle of 3.5 to 4 mph (stated in its label)', () => {
  const W = GAIT_BASES.wheeler_1863.speeds, C = GAIT_BASES.cooper_1861.speeds, F = GAIT_BASES.fa_1863.speeds;
  assert.ok(near(W.walk, 3.75 * MPH) && near(W.trot, 7.5 * MPH) && near(W.gallop, 10 * MPH));
  assert.ok(near(C.walk, 3.75 * MPH) && near(C.trot, 8.5 * MPH) && near(C.gallop, 11 * MPH)); assert.match(GAIT_BASES.cooper_1861.label, /middle of 3\.5 to 4/);
  assert.ok(near(F.walk, 400 * YARD_M / 270) && near(F.trot, 400 * YARD_M / 120) && near(F.gallop, 400 * YARD_M / 60));
  // the figures in m/s (rounded) so that a wrong unit conversion cannot pass unnoticed
  assert.deepEqual([W.walk, W.trot, W.gallop].map(v => +v.toFixed(3)), [1.676, 3.353, 4.470]);
  assert.deepEqual([C.trot, C.gallop].map(v => +v.toFixed(3)), [3.800, 4.917]);
  assert.deepEqual([F.walk, F.trot, F.gallop].map(v => +v.toFixed(3)), [1.355, 3.048, 6.096]);
  for (const id of ['wheeler_1863', 'cooper_1861', 'fa_1863']) { const s = GAIT_BASES[id].speeds; assert.ok(s.walk < s.trot && s.trot < s.gallop, id + ' increasing'); assert.equal(GAIT_BASES[id].tier, 'documented'); assert.ok(GAIT_BASES[id].src.length >= 1); }
  // the three sources disagree on the gallop (Law: carried as scenarios, not resolved here)
  const g = [W.gallop, C.gallop, F.gallop]; assert.ok(Math.max(...g) / Math.min(...g) > 1.3, 'the sources do disagree on the gallop');
});

test('gaits: the default basis is the one that existed before the module (2.4 / 4.6 / 7.0 m/s thresholds, clip at its own cadence); nothing is chosen silently', () => {
  const b = gaitBasis(), m = gaitBasis('modern_range'); assert.equal(b, m); assert.equal(GAIT_BASES.modern_range.tier, 'plausible-procedural');
  assert.deepEqual([b.b0, b.b1, b.b2], [2.4, 4.6, 7.0]); assert.equal(b.scale, false);
  // the exact old rule: sp < 2.4 walk, < 4.6 trot, < 7.0 canter, else gallop
  const old = sp => sp < 2.4 ? 'walk' : sp < 4.6 ? 'trot' : sp < 7.0 ? 'canter' : 'gallop';
  for (let sp = 0; sp < 12; sp += 0.01) { assert.equal(GAIT_NAMES[mountedGait(b, sp)], old(sp), 'speed ' + sp); assert.equal(mountedRate(b, mountedGait(b, sp), sp), 1); }
  assert.equal(gaitTable().default, 'modern_range');
});

test('gaits: for each documented basis the manual walk, trot and gallop select the walk, trot and canter clip and the stance hoof meets the ground at the manual speed', () => {
  for (const id of ['wheeler_1863', 'cooper_1861', 'fa_1863']) { const b = gaitBasis(id), S = GAIT_BASES[id].speeds;
    assert.ok(b.b0 < b.b1 && b.b1 < b.b2, id + ' bounds'); assert.equal(b.scale, true);
    assert.equal(GAIT_NAMES[mountedGait(b, S.walk)], 'walk', id); assert.equal(GAIT_NAMES[mountedGait(b, S.trot)], 'trot', id); assert.equal(GAIT_NAMES[mountedGait(b, S.gallop)], 'canter', id + ' manual gallop plays the nearest clip');
    assert.equal(GAIT_NAMES[mountedGait(b, S.gallop * GALLOP_MARGIN + 0.01)], 'gallop', id + ' full speed charge plays the gallop clip');
    for (const [gi, sp] of [[0, S.walk], [1, S.trot], [2, S.gallop]]) { const r = mountedRate(b, gi, sp), want = sp / HORSE_GAITS[GAIT_NAMES[gi]].speed, lo = CADENCE_CLAMP[0], hi = CADENCE_CLAMP[1];
      assert.ok(r >= lo && r <= hi, id + ' clamp'); if (want >= lo && want <= hi) assert.ok(near(r * HORSE_GAITS[GAIT_NAMES[gi]].speed, sp, 1e-9), `${id} ${GAIT_NAMES[gi]}: hoof speed ${r * HORSE_GAITS[GAIT_NAMES[gi]].speed} vs manual ${sp}`);
      else assert.ok(r === lo || r === hi, id + ' clamped'); } } });

test('gaits: the cadence factor is monotone in speed, bounded, and the selection never decreases with speed under any basis', () => {
  for (const id of Object.keys(GAIT_BASES)) { const b = gaitBasis(id); let last = -1;
    for (let sp = 0; sp <= 14; sp += 0.02) { const gi = mountedGait(b, sp); assert.ok(gi >= last, id + ' gait non-decreasing at ' + sp); last = gi; const r = mountedRate(b, gi, sp); assert.ok(r >= 0.7 && r <= 1.35 && Number.isFinite(r)); }
    // within one gait the rate does not fall as speed rises
    for (let gi = 0; gi < 4; gi++) { let lr = 0; for (let sp = 0; sp <= 14; sp += 0.02) if (mountedGait(b, sp) === gi) { const r = mountedRate(b, gi, sp); assert.ok(r >= lr - 1e-12, id + ' rate monotone'); lr = r; } } }
  assert.throws(() => gaitBasis('no_such_basis'), /unknown gait basis/);
});

test('gaits: the data file equals the generator and records the PENDING OWNER default, the mapping rule, the sources and the charge schedule', () => {
  const file = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'anim3d', 'gait-sources.json'), 'utf8')); const r6 = o => typeof o === 'number' ? Math.round(o * 1e6) / 1e6 : Array.isArray(o) ? o.map(r6) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r6(v)])) : o;   // build-anim3d.mjs writes 6 decimals
  assert.deepEqual(r6(file), r6(JSON.parse(JSON.stringify(gaitTable()))));
  assert.equal(file.schema, 'anim3d-gait-sources-1'); assert.match(file.note, /PENDING OWNER/); assert.deepEqual(Object.keys(file.bases), ['modern_range', 'wheeler_1863', 'cooper_1861', 'fa_1863']);
  assert.equal(file.sources.length, GAIT_SOURCES.length); for (const id of Object.keys(file.bases)) { const c = file.bases[id].clips; assert.deepEqual(Object.keys(c), GAIT_NAMES); }
});

test('gaits: the squadron charge of the manual is 20 paces walk, 60 trot, 80 gallop, 60 charge = 220 yards (Wheeler paras 292, 410-411); the speed of the charge is NOT printed', () => {
  const p = CHARGE_SCHEDULE.phases; assert.deepEqual(p.map(x => x.gait), ['walk', 'trot', 'gallop', 'charge']); assert.deepEqual(p.map(x => x.paces), [20, 60, 80, 60]);
  assert.equal(CHARGE_SCHEDULE.totalPaces, 220); assert.ok(near(CHARGE_SCHEDULE.totalM, 220 * 0.9144)); assert.equal(CHARGE_SCHEDULE.tier, 'documented'); assert.match(CHARGE_SCHEDULE.note, /no printed speed/);
  assert.ok(!('speed' in CHARGE_SCHEDULE) && p.every(x => !('speed' in x)), 'no invented charge speed');
});

test('gaits: the register keeps G-ANIM-07 open and plausible-procedural where the record is silent (charge speed, clip mapping, horse-artillery rate)', () => {
  const g = GAPS.find(x => x.id === 'G-ANIM-07'); assert.ok(g); assert.equal(g.tier, 'plausible-procedural'); assert.match(g.text, /NARROWED/); assert.match(g.text, /full-speed charge/);
  assert.match(g.text, /horse-artillery/);
});

function mountedRun(basis, speed, n = 6) {
  const S = new AnimSystem({ skeleton, gaitBasis: basis }); S.addUnit({ unitId: 'US-CAV', n, arm: 'cavalry', variation: k => k / n });
  S.setSegments('US-CAV', [{ t0: 0, activity: 'halt' }, { t0: 10, activity: 'gallop', speed }, { t0: 200, activity: 'halt' }]); S.setNearSet('US-CAV', Int32Array.from([0, 1, 2]));
  S.setPlacement((id, k, t, o) => { o.x = 500 + t * speed; o.y = 10; o.z = 800 + (k >= 0 ? k * 2 : 0); o.yaw = 0; return true; });
  const ev = [], gaits = new Set(); S.bus.onHoofbeat((u, k, t, gait, pos, sp) => { ev.push({ k, t, gait, sp, beats: 0 }); gaits.add(gait); });
  for (let t = 5; t < 40; t += 1 / 30) S.advance(t, t + 1 / 30); return { S, ev, gaits };
}

test('gaits: AnimSystem with the default option plays the modern gait names; the option reaches the unit; an unknown basis is refused', () => {
  const d = mountedRun(undefined, 3.6); assert.equal(d.S.gaitBasis, 'modern_range'); assert.deepEqual([...d.gaits], ['trot']); assert.ok(d.ev.length > 50, 'hoofbeats ' + d.ev.length);
  const w = mountedRun('wheeler_1863', 4.47); assert.equal(w.S.gaitBasis, 'wheeler_1863'); assert.equal(w.S.units.get('US-CAV').gb.id, 'wheeler_1863'); assert.deepEqual([...w.gaits], ['canter'], 'manual gallop 10 mph plays the canter clip');
  assert.throws(() => new AnimSystem({ skeleton, gaitBasis: 'nope' }), /unknown gait basis/);
});

test('gaits: hoofbeat spacing follows the cadence: with Wheeler (walk 3.75 mph) the walk clip is slowed to the manual speed, with the modern basis it plays at its own cadence', () => {
  const spacing = r => { const k0 = r.ev.filter(e => e.k === 0).map(e => e.t); const dt = []; for (let i = 1; i < k0.length; i++) dt.push(k0[i] - k0[i - 1]); return dt.reduce((a, b) => a + b, 0) / dt.length; };
  const sp = 3.75 * MPH, mod = mountedRun('modern_range', sp), wh = mountedRun('wheeler_1863', sp);
  assert.deepEqual([...mod.gaits], ['walk']); assert.deepEqual([...wh.gaits], ['walk']);
  // walk clip: T 1.10 s, 4 beats; per figure phase factor 0.97 + 0.06 * vphase. Wheeler cadence = 1.676 / 1.55 = 1.0814 (inside the clamp), so the spacing shrinks by exactly that factor.
  const r = sp / HORSE_GAITS.walk.speed; assert.ok(r > CADENCE_CLAMP[0] && r < CADENCE_CLAMP[1]);
  assert.ok(near(spacing(mod) / spacing(wh), r, 0.02), `spacing ratio ${spacing(mod) / spacing(wh)} vs ${r}`);
  // modern basis: 1.10 / 4 / (0.97 + 0.06 v) within the range of the per-figure factor
  const lo = 1.10 / 4 / 1.03, hi = 1.10 / 4 / 0.97; assert.ok(spacing(mod) >= lo * 0.99 && spacing(mod) <= hi * 1.01, 'modern spacing ' + spacing(mod));
});

test('gaits: events are deterministic (two runs identical) and a seek returns the same hoofbeats as sequential play', () => {
  const a = mountedRun('fa_1863', 6.0), b = mountedRun('fa_1863', 6.0); assert.equal(a.ev.length, b.ev.length); for (let i = 0; i < a.ev.length; i++) assert.deepEqual(a.ev[i], b.ev[i]);
  const S = new AnimSystem({ skeleton, gaitBasis: 'fa_1863' }); S.addUnit({ unitId: 'US-CAV', n: 6, arm: 'cavalry', variation: k => k / 6 });
  S.setSegments('US-CAV', [{ t0: 0, activity: 'halt' }, { t0: 10, activity: 'gallop', speed: 6.0 }, { t0: 200, activity: 'halt' }]); S.setNearSet('US-CAV', Int32Array.from([0, 1, 2]));
  S.setPlacement((id, k, t, o) => { o.x = 500 + t * 6; o.y = 10; o.z = 800 + (k >= 0 ? k * 2 : 0); o.yaw = 0; return true; });
  const ev = []; S.bus.onHoofbeat((u, k, t, gait) => ev.push({ k, t, gait })); S.advance(17.3, 29.9);
  const seq = a.ev.filter(e => e.t >= 17.3 && e.t < 29.9); assert.equal(ev.length, seq.length); for (let i = 0; i < ev.length; i++) { assert.equal(ev[i].k, seq[i].k); assert.ok(near(ev[i].t, seq[i].t, 1e-9)); assert.equal(ev[i].gait, seq[i].gait); }
});

test('gaits: the rider and horse clips follow the same gait and cadence for a figure (the pair stays in phase) under a documented basis', () => {
  const S = new AnimSystem({ skeleton, gaitBasis: 'wheeler_1863' }); const U = S.addUnit({ unitId: 'C2', n: 4, arm: 'cavalry', variation: k => k / 4 }); const out = new ClipSel();
  const sp = 7.5 * MPH; U.setSegments([{ t0: -10, activity: 'halt' }, { t0: 0, activity: 'gallop', speed: sp }]);
  const T = HORSE_GAITS.trot.T, mr = mountedRate(gaitBasis('wheeler_1863'), 1, sp), want = 0.1 * mr * (0.97 + 0.06 * U.vphase[1]);
  U.clipAt(1, 5.0, out); const a = out.ta, h = out.th; assert.ok(out.h >= 0 && a >= 0 && a < T); U.clipAt(1, 5.1, out); const da = ((out.ta - a) % T + T) % T, dh = ((out.th - h) % T + T) % T;
  assert.ok(near(da, dh, 1e-9), `rider ${da} and horse ${dh} advance together`); assert.ok(near(da, want % T, 1e-9), `advance ${da} vs ${want}`);
});
