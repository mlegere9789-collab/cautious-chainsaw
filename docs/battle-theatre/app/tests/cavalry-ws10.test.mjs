// Node tests (no browser) of the cavalry workstream: riders and horses as ranges with a basis, the horse that goes down with its rider, the dismounted fight with led horses and horse-holders, the draught horses
// a battery loses, arrival as a march, scrub purity, one figure and one horse per drawn trooper, the data file equals its generator, every claim cited exists in the position ledgers, the gaps are registered.
//   node --test docs/battle-theatre/app/tests/cavalry-ws10.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { CrowdAnim } from '../src/crowd/anim.mjs';
import { minOf } from '../src/clock.mjs';
import * as C from '../src/history/cavalry.mjs';
import { build } from '../tools/build-cavalry-horses.mjs';
import { UnitAnimator, ClipSel, SEL_HZ, SEL_MZ, SEL_TH } from '../src/anim3d/unit-anim.mjs';
import { ClipLibrary } from '../src/anim3d/library.mjs';

const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
stage.loadScenario({ id: 'pdf-recommended', choices: {}, optionText: {} });
const skeleton = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/figures3d/skeleton.json'), 'utf8')), D = new CrowdAnim({ skeleton, world, layer: L, stage });
const ID = 'us-cav-2d-mcintosh-3pa', ui = L.units.findIndex(u => u.id === ID), W = 46890 * 60, WE = 46905 * 60;       // the 3rd Pennsylvania: the dismounted fight of July 3 13:30-13:45 (record DM-MCINTOSH-3PA-JUL3, the engagement clause)
stage.apply(minOf(7, 3, 13, 35));
const names = i => D.lib.order[i];

test('horses: one horse per drawn trooper (the point), the range and its basis come from the three observations, the tier is never above plausible-procedural', () => {
  for (const n of [1, 20, 306, 380, 1000]) { const r = C.horseRange(n); assert.equal(r.horses.point, n); assert.equal(r.horses.max, n); assert.ok(r.horses.min <= r.horses.point && r.horses.min >= Math.floor(n * 0.46)); assert.equal(r.tier, 'plausible-procedural'); assert.match(r.basis, /three observed shares/); }
  assert.ok(Math.abs(C.MOUNTED_SHARE.min - 500 / 1072) < 1e-12); assert.ok(Math.abs(C.MOUNTED_SHARE.observed_max - 43 / 56) < 1e-12);
  for (const o of C.HORSE_OBSERVATIONS) assert.ok(['inferred', 'documented'].includes(o.tier) && o.source_keys.length);
});
test('every drawn cavalry figure has a horse in the crowd tables: the world counts mounted men and horses as one', () => {
  const cav = L.units.map((u, i) => [u, i]).filter(([u]) => u.arm === 'cavalry'); let n = 0; for (const [u, i] of cav) { assert.equal(world.units[i].klass, 1); assert.equal(world.units[i].count, u.strength.drawn); n += world.units[i].count; } assert.ok(n > 5000);
  assert.equal(world.comp.horses, world.comp.mounted);
});

test('roles: D men afoot, every fourth of them holds the horses, the rest of the regiment stays mounted; deterministic; the same men for the same unit', () => {
  for (const [n, sh] of [[380, 0.5], [380, 1], [306, 0.8], [57, 1 / 3], [3, 1]]) {
    const c = C.dismountCounts(n, sh), r = C.mountRoles('x-unit', n, sh), cnt = [0, 0, 0]; r.forEach(v => cnt[v]++);
    assert.deepEqual(cnt, [c.mounted, c.fighters, c.holders]); assert.equal(c.holders, Math.floor(c.dismounted / 4)); assert.deepEqual(Array.from(C.mountRoles('x-unit', n, sh)), Array.from(r));
  }
  assert.notDeepEqual(Array.from(C.mountRoles('x-unit', 100, 0.5)), Array.from(C.mountRoles('y-unit', 100, 0.5)));
  assert.ok(!/Math\.random/.test(fs.readFileSync(path.join(BT, 'app/src/history/cavalry.mjs'), 'utf8')));
});
test('shares: a printed half is 0.5; a squadron of a six-company regiment is a third; all but a squadron of ten companies is 0.8; no fraction printed means null (no unit is drawn dismounted on it)', () => {
  assert.equal(C.dismountShare(C.dismountRecord('us-cav-1d-gamble-8ny')), 0.5); assert.ok(Math.abs(C.dismountShare(C.dismountRecord('us-cav-1d-devin-6ny')) - 1 / 3) < 1e-12);
  assert.ok(Math.abs(C.dismountShare(C.dismountRecord('us-cav-3d-custer-7mi')) - 0.8) < 1e-12);
  for (const id of ['us-cav-1d-devin-9ny', 'us-cav-3d-custer-6mi', 'us-cav-3d-farnsworth-1vt']) assert.equal(C.dismountShare(C.dismountRecord(id)), null, id);
  assert.equal(C.dismountRecord('us-cav-1d-merritt-6us'), null); assert.equal(C.dismountShare(C.dismountRecord('cs-cav-jenkins-34vabn')), 1);
});

test('every claim a record cites exists in the position ledgers, names a unit the record covers, and is documented; the observation of the horse loss is in the ledger note', () => {
  const claims = new Map(); const dir = path.join(BT, 'history/positions');
  for (const f of fs.readdirSync(dir).filter(x => /^positions_[A-E]\.jsonl$/.test(x))) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l); claims.set(r.claim_id, r); }
  for (const rec of C.DISMOUNTS) for (const id of rec.claims) { const c = claims.get(id); assert.ok(c, `${rec.id}: claim ${id} not in the ledgers`); assert.ok(['documented', 'inferred'].includes(c.tier), id); assert.ok(rec.units.some(p => C.matches(p, c.unit_id) || c.unit_id.startsWith(p) || p.startsWith(c.unit_id)), `${rec.id}: ${id} is for ${c.unit_id}`); assert.match(c.activity + (c.note || ''), /dismount/i, id); }
  for (const rec of C.DISMOUNTS) assert.ok(rec.claims.some(id => claims.get(id).tier === 'documented'), rec.id + ' has a documented claim');
  const o = claims.get('POS-A-CV1-033'); assert.match(o.note, /292 horses/); assert.equal(o.unit_id, C.HORSE_LOSS.observation.unit); assert.equal(C.HORSE_LOSS.observation.horses, 292); assert.ok(C.HORSE_LOSS.observation.ocr_uncertain);
});

test('dismounted fight: before the window every man rides and every horse stands with its man; inside it the horses are led 12 m back over 7 s, a holder stands with them, and the men mount again when the horses return; arrival is a march', () => {
  const sel = D.sel, ua = D.get(ui), segs = ua.segs, dm = segs.filter(s => s.kind === 'dismount'); assert.equal(dm.length, 1); assert.equal(dm[0].t0, W); assert.equal(dm[0].dm, 1);
  const n = world.units[ui].count, cnt = t => { const c = [0, 0, 0]; let minHz = 0; for (let k = 0; k < n; k++) { D.clipAt(ui, k, t); c[sel.m]++; minHz = Math.min(minHz, sel.x[SEL_HZ]); } return { c, minHz }; };
  const before = cnt(W - 30); assert.deepEqual(before.c, [n, 0, 0]); assert.equal(before.minHz, 0);
  const mid = cnt(W + 3.5); assert.equal(mid.c[0], 0); assert.ok(mid.minHz < -1 && mid.minHz > -C.LED.back_m, 'led back: ' + mid.minHz);
  const at = cnt(W + 60), cc = C.dismountCounts(n, 1); assert.deepEqual(at.c, [cc.mounted, cc.fighters, cc.holders]); assert.equal(at.minHz, -C.LED.back_m);
  const fi = stage.fallInfo(ui), down = new Set(); for (let j = 0; j < fi.t.length; j++) if (fi.anim[j] && fi.t[j] <= W + 60) down.add(fi.agent[j]);
  for (let k = 0; k < n; k++) { D.clipAt(ui, k, W + 60); const role = sel.m; if (down.has(k)) continue; if (role === 2) { assert.equal(sel.x[SEL_MZ], -C.LED.back_m); assert.equal(names(sel.a).replace(/~.*/, ''), 'horse_holder'); } else assert.equal(sel.x[SEL_MZ], 0); assert.equal(names(sel.h), 'horse_idle'); }
  D.clipAt(ui, 0, W + 3.5); const walkers = names(sel.h); assert.equal(walkers, 'horse_walk');
  const back = cnt(WE + 3.5); assert.equal(back.c[1] + back.c[2], n); assert.ok(back.minHz < 0 && back.minHz > -C.LED.back_m, 'horses coming forward');
  const after = cnt(WE + C.LED.led_s + 1); assert.deepEqual(after.c, [n, 0, 0]); assert.equal(after.minHz, 0);
});

test('scrub purity: the clip selection of a figure at t is the same whatever was evaluated before (seek equals play), for riders, men afoot, holders and the falling', () => {
  const a = new ClipSel(), b = new ClipSel(), ts = [W - 600, W + 1, W + 3, W + 100, WE + 2, WE + 60, 45700 * 60, 45661 * 60], snap = s => JSON.stringify([s.a, s.b, s.h, s.m, Array.from(s.d), Array.from(s.x)]);
  for (const k of [0, 3, 7, 11, 19, 120, 379]) { const fwd = ts.map(t => (D.get(ui).clipAt(k, t, a), snap(a))); const rev = ts.slice().reverse().map(t => (D.get(ui).clipAt(k, t, b), snap(b))).reverse(); assert.deepEqual(fwd, rev, 'figure ' + k); }
});

test('horse casualties: with every fallen mounted trooper his horse goes down at the same instant and stays down (the p of the model, point 1); a horse of a man who fell afoot stands led; the count of horses down is the count of fallen riders', () => {
  const fi = stage.fallInfo(ui), sel = D.sel, n = world.units[ui].count, tAfter = 46000 * 60;      // after the July 2 losses, before the July 3 fight
  const fell = []; for (let j = 0; j < fi.t.length; j++) if (fi.anim[j] && fi.agent[j] < n && fi.t[j] < tAfter) fell.push([fi.agent[j], fi.t[j]]); assert.ok(fell.length >= 10, 'the unit loses men in the July 2 window: ' + fell.length);
  let down = 0; for (let k = 0; k < n; k++) { D.clipAt(ui, k, tAfter); if (names(sel.h) === 'horse_fall') down++; } assert.equal(down, fell.length);
  const [k0, t0] = fell[0]; D.clipAt(ui, k0, t0 - 1); assert.notEqual(names(sel.h), 'horse_fall'); D.clipAt(ui, k0, t0 + 0.5); assert.equal(names(sel.h), 'horse_fall'); assert.ok(Math.abs(sel.d[SEL_TH] - 0.5) < 1e-9);
  D.clipAt(ui, k0, t0 + 3600); assert.equal(names(sel.h), 'horse_fall'); assert.ok(sel.d[SEL_TH] > 3000, 'the clip holds its last frame (a non-looping clip clamps in the bank)');
  const r = C.horseLossRange({ min: 10, max: 20, point: 15 }); assert.equal(r.point, 15); assert.equal(r.min, 0); assert.ok(r.max >= 20); assert.equal(r.gap, 'EG-CAV-02');
  // p = 0 (a scenario): no horse goes down
  const ua = new UnitAnimator(D.lib, { unitId: 'p0', n: 4, arm: 'cavalry', horseWithRider: 0 }); ua.setSegments([{ t0: 0, activity: 'halt_mounted', speed: 0 }]).setFalls(Float64Array.from([10, Infinity, Infinity, Infinity]), Uint8Array.from([0, 0, 0, 0])); ua.clipAt(0, 20, sel); assert.equal(names(sel.h), 'horse_idle');
});
test('a man afoot who falls leaves his led horse standing behind the line; a fallen holder leaves the horses', () => {
  const n = 40, ua = new UnitAnimator(D.lib, { unitId: 'dm-test', n, arm: 'cavalry' }), roles = C.mountRoles('dm-test', n, 1), sel = new ClipSel(), fall = new Float64Array(n).fill(Infinity), ks = [roles.indexOf(1), roles.indexOf(2)];
  fall[ks[0]] = 100; fall[ks[1]] = 100; ua.setSegments([{ t0: 0, activity: 'halt_mounted' }, { t0: 50, activity: 'fire', dm: 1, mode: 'at_will' }, { t0: 400, activity: 'halt_mounted' }]).setFalls(fall, new Uint8Array(n));
  for (const k of ks) { ua.clipAt(k, 200, sel); assert.equal(names(sel.h), 'horse_idle'); assert.equal(sel.x[SEL_HZ], -C.LED.back_m); assert.ok(/^(fall|lie)_/.test(names(sel.a).replace(/~.*/, '')), names(sel.a)); }
});

test('draught horses of a battery: exactly the printed number go down, each inside the battery\'s windows, the same horses and times on every call, none without a window', () => {
  const ser = Array.from({ length: 72 }, (_, i) => i), wins = [[100, 400], [900, 1000]], a = C.batteryHorseFalls('us-2c-art-1rib', ser, wins), b = C.batteryHorseFalls('us-2c-art-1rib', ser.slice().reverse(), wins);
  assert.equal(a.size, 30); assert.equal(C.BATTERY_HORSE_LOSSES['us-2c-art-1rib'].down, 24 + 6); for (const [s, t] of a) { assert.ok((t >= 100 && t < 400) || (t >= 900 && t < 1000)); assert.equal(b.get(s), t); }
  assert.equal(C.batteryHorseFalls('us-2c-art-1rib', ser, []).size, 0); assert.equal(C.batteryHorseFalls('us-nobody', ser, wins).size, 0); assert.equal(C.batteryHorseFalls('us-3c-art-4ny', ser.slice(0, 5), wins).size, 5);
  const kit = JSON.parse(fs.readFileSync(path.join(BT, 'kit/artillery_batteries.json'), 'utf8')).batteries;
  for (const [id, l] of Object.entries(C.BATTERY_HORSE_LOSSES)) { const lo = kit[l.kit].details.losses; assert.equal((lo.horses_killed || 0) + (lo.horses_disabled || 0) + (lo.horses_killed_or_wounded || 0), l.down, id); assert.ok(L.units.some(u => u.id === id), id + ' is a layer unit'); }
});

test('arrival is a march: no cavalry unit stands on the field before its earliest arrival, and the first moments of every drawn cavalry unit are an entry march or a halt (never a spawn in a fight)', () => {
  stage.apply(minOf(6, 28, 12)); for (let i = 0; i < L.units.length; i++) if (L.units[i].arm === 'cavalry') assert.equal(stage.present[i], 0, L.units[i].id);
  stage.apply(minOf(7, 3, 13, 35));
  for (let i = 0; i < L.units.length; i++) if (L.units[i].arm === 'cavalry' && world.units[i].count) { const sg = D.get(i).segs; assert.ok(sg.length && sg[0].dm === 0 && sg[0].kind !== 'dismount', L.units[i].id); }
});

test('the data file equals its generator, carries every number with a tier, and lists 21 drawn and 34 undrawn cavalry units (the undrawn ones are the layer\'s open gap, not narrowed here)', async () => {
  const d = await build(), f = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/cavalry-horses.json'), 'utf8')); assert.deepEqual(JSON.parse(JSON.stringify(d)), f);
  assert.equal(Object.keys(f.units).length, 21); assert.equal(f.undrawn_cavalry_units.length, 34); for (const u of Object.values(f.units)) { assert.equal(u.tier, 'plausible-procedural'); assert.equal(u.horses.point, u.riders); }
  assert.equal(f.units[ID].dismount.counts.holders, 95);
});
test('every gap is registered under horde/ws10-cavalry/proposed-register and no shipped file names the tool or the builder', () => {
  for (const g of C.GAPS) { const p = path.join(BT, 'GOVERNANCE/horde/ws10-cavalry/proposed-register', `ws10-${g.id}.md`); assert.ok(fs.existsSync(p), p); assert.match(fs.readFileSync(p, 'utf8'), new RegExp(g.tier.replace('-', '.'))); }
  for (const f of ['app/src/history/cavalry.mjs', 'app/data/cavalry-horses.json', 'app/src/ui/card-sections.mjs', 'app/src/crowd/anim.mjs']) assert.doesNotMatch(fs.readFileSync(path.join(BT, f), 'utf8'), /Claude|Anthropic|CLAUDE\.md|\bAI\b/, f);
  void ClipLibrary;
});
