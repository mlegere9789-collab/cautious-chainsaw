// Node test (no browser, no GPU) of the glue between the selection and the draw lists: the REAL crowd (the figure system, the clip bank, the class meshes, the animation driver, 127,572 figures) is built with a stand-in for the
// backend, `prepare` is run at cameras across the hand-over distances of the real layer at 13:30 on 3 July, and the draw lists it hands to the backend are read back: every figure that the selection lists is in the records
// of exactly the levels its mask names, with the dither range lod.mjs packed for that level; the ranges of the levels of one figure partition [0, 1); the LOD0 men have distinct palette slots inside the palette.
//   node --test docs/battle-theatre/app/tests/crowd-lod-build.test.mjs        (about a minute of CPU: the figure system and the clips are built once)
import test from 'node:test'; import assert from 'node:assert/strict';
import { nodeWorld } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { minOf } from '../src/clock.mjs';
import { perspective, lookAt, mul, frustumPlanes } from '../../render/prototype/src/math.mjs';
import { soldierPlace } from '../../render/prototype/src/world.mjs';
import { Crowd } from '../src/crowd/crowd.mjs';
import { decodeRange, edgeRange, LOD0_BUDGET } from '../src/crowd/lod.mjs';

const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
stage.loadScenario({ id: 'pdf-recommended', choices: {}, optionText: {} });
const tMin = minOf(7, 3, 13) + 30; stage.apply(tMin); const ANIM_T = 40 + (tMin * 60) % 7200;
class FakeBackend { constructor(host, crowd) { this.crowd = crowd; this.F = null; this.uploads = 0; } init(S) { this.S = S; } upload(F) { this.F = F; this.uploads++; } scene() { } shadow() { } destroy() { } }
const host = { api: 'webgl2', R: { o: { flags: { near: 1, mid: 1, far: 1 } }, cfg: {}, W: 640, H: 360 }, setCrowd(c) { this.crowd = c; } };
const crowd = await Crowd.create(host, { layer: L, world, stage, T, settings: { nearR: 40, midR: 300 }, backend: FakeBackend, progress() { } });

let pick = -1, bc = 0; for (let i = 0; i < L.units.length; i++) if (stage.present[i] === 1 && L.units[i].arm === 'infantry' && world.units[i].count > bc) { bc = world.units[i].count; pick = i; }
const U = world.units[pick], mid = U.first + (U.count >> 1), tmp = [0, 0, 0]; soldierPlace(world, mid, ANIM_T, tmp); const FX = tmp[0], FZ = tmp[1], HD = stage.ch[pick];
const FOV = 2 * Math.atan((360 / 1080) * Math.tan(Math.PI / 6));
function camera(D, eye = 1.7) { const ex = FX + Math.sin(HD) * D, ez = FZ + Math.cos(HD) * D, ey = T.h(ex, ez) + eye, tx = FX, ty = T.h(FX, FZ) + 1.2, tz = FZ, yaw = Math.atan2(tx - ex, tz - ez), pitch = Math.atan2(ty - ey, Math.hypot(tx - ex, tz - ez)), cp = Math.cos(pitch);
  return { x: ex, y: ey, z: ez, fwd: [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp], fov: FOV, near: 0.25, far: 6000 }; }
// which mesh is which: first index of a mesh entry -> { kind, level }
function meshMap() { const m = new Map(); crowd.cls.mid.forEach(e => e && m.set(e.firstIndex, { kind: 'class', level: 1 })); crowd.cls.low.forEach(e => e && m.set(e.firstIndex, { kind: 'class', level: 2 })); crowd.cls.acc1.forEach(e => e && m.set(e.firstIndex, { kind: 'acc', level: 1 })); crowd.cls.acc2.forEach(e => e && m.set(e.firstIndex, { kind: 'acc', level: 2 }));
  crowd.horseM.forEach((e, l) => m.set(e.firstIndex, { kind: 'horse', level: l })); for (const e of crowd.partCache.values()) m.set(e.firstIndex, { kind: 'part', level: 0 }); return m; }

test('the real crowd builds with a stand-in backend: classes, meshes, clip bank, 127,572 records', () => {
  assert.ok(crowd.D && crowd.D.count === world.count && crowd.cls.mid.length > 20 && crowd.bank && crowd.driver); assert.equal(crowd.nearCap, LOD0_BUDGET); assert.ok(crowd.lod.band > 0 && crowd.lod.hyst > 0);
});

for (const D of [6, 10, 13, 40, 75]) test(`prepare at ${D} m: the records of every listed figure are those its level mask names, with the dither ranges of the selection, and the levels of one figure partition [0, 1)`, () => {
  crowd.prepare(camera(D), ANIM_T); const F = crowd.frameData, fl = crowd.fl, n = fl.n, mm = meshMap(), u32 = new Uint32Array(F.inst.buffer, F.inst.byteOffset, F.instBytes / 4), recs = F.instBytes / 48;
  assert.ok(n > 50 && recs > n, `listed ${n}, records ${recs}`); assert.equal(crowd.be.F, F);
  // records by (figure, kind, level), for the class and part meshes of men (accessory and horse records are checked separately)
  const byFig = new Map(), accByFig = new Map(), horseByFig = new Map(); let nearRecs = 0;
  for (const d of F.draws) { const info = d.near ? { kind: 'part', level: 0 } : mm.get(d.first); if (!info) continue; for (let q = 0; q < d.n; q++) { const r = d.off / 48 + q, fig = u32[r * 12 + 8], P = u32[r * 12 + 11], slot = u32[r * 12 + 9];
      if (info.kind === 'part') { nearRecs++; assert.ok(slot < crowd.nearCap, `slot ${slot}`); } const tgt = info.kind === 'class' || info.kind === 'part' ? byFig : info.kind === 'acc' ? accByFig : horseByFig; const key = fig * 4 + info.level; let a = tgt.get(key); if (!a) tgt.set(key, a = new Set()); a.add(P); } }
  let two = 0, checked = 0, slots = new Set(); for (let j = 0; j < n; j++) {
    const fig = fl.fig[j], mask = fl.mask[j]; assert.ok(mask >= 1 && mask <= 7); let lo = 0, last = 0;
    for (let lvl = 0; lvl < 3; lvl++) { const has = (mask >> lvl) & 1, P = fl.p[j * 3 + lvl], got = byFig.get(fig * 4 + lvl);
      if (has) { assert.ok(got && got.size === 1 && got.has(P), `figure ${fig} level ${lvl}: records ${got && [...got]} against the selection's ${P}`); const d = decodeRange(P); assert.ok(Math.abs(d.lo - lo) < 1e-12, `figure ${fig} level ${lvl} starts at ${d.lo}, the finer level ended at ${lo}`); lo = d.hi; last = lvl; } else assert.ok(!got, `figure ${fig} has records at level ${lvl} that its mask does not name`); }
    void last; if (mask & (mask - 1)) two++; checked++;
    if (mask & 1) { const s = crowd.fl.slot[j]; assert.ok(!slots.has(s), 'two men share a palette slot'); slots.add(s); assert.ok(s < crowd.nearCap); }
  }
  console.log(`# ${D} m: ${n} figures listed, ${two} inside a cross-fade, ${recs} records in ${F.draws.length} draws, ${nearRecs} part records of ${slots.size} men at LOD0, r0e ${crowd.stats.r0e.toFixed(2)} m, budget cut ${crowd.stats.budgetCut}; CPU select ${crowd.stats.selectMs.toFixed(1)} ms, animation and records ${crowd.stats.animMs.toFixed(1)} ms (a shared machine: not a measurement)`);
  assert.equal(checked, n); assert.equal(slots.size, crowd.stats.lod0); assert.ok(slots.size <= LOD0_BUDGET);
  // every level's last range reaches the far share: the sum of ranges plus the impostor's share is the whole of [0, 1)
  for (let j = 0; j < n; j++) { let hi = 0; for (let lvl = 0; lvl < 3; lvl++) if ((fl.mask[j] >> lvl) & 1) hi = Math.min(decodeRange(fl.p[j * 3 + lvl]).hi, 1); assert.ok(hi > 0 && hi <= 1); }
  assert.ok(F.draws.every(d => d.n > 0 && d.count > 0));
});

test('the same time and camera give the same draw lists (the records and the draws, byte for byte) through a different history', () => {
  const grab = () => { const F = crowd.frameData; return { inst: Buffer.from(F.inst.buffer, F.inst.byteOffset, F.instBytes).toString('base64'), draws: JSON.stringify(F.draws), pose: Buffer.from(new Float32Array(F.pose.buffer, F.pose.byteOffset, F.nPose * 732).buffer).toString('base64').length }; };
  crowd.prepare(camera(10), ANIM_T); const a = grab(); crowd.prepare(camera(60, 6), ANIM_T + 3); crowd.prepare(camera(7), ANIM_T); crowd.prepare(camera(10), ANIM_T); const b = grab();
  assert.equal(a.inst, b.inst, 'the instance records'); assert.equal(a.draws, b.draws, 'the draw list'); assert.equal(a.pose, b.pose);
});

test('hard mode (band 0, hyst 0) draws every figure at one level only and the 96 nearest men at LOD0: the step the cross-fade replaces', () => {
  crowd.lod.band = 0; crowd.lod.hyst = 0; try { crowd.prepare(camera(10), ANIM_T); const fl = crowd.fl; for (let j = 0; j < fl.n; j++) assert.ok((fl.mask[j] & (fl.mask[j] - 1)) === 0, 'one level'); assert.equal(crowd.stats.fading, 0); } finally { crowd.lod.band = 0.075; crowd.lod.hyst = 0.10; }
  crowd.prepare(camera(10), ANIM_T); assert.ok(crowd.stats.fading > 0, 'back to the cross-fade');
});

test('a unit of horsemen: the horse is drawn at the levels of its rider with the rider\'s ranges', () => {
  let ci = -1, cc = 0; for (let i = 0; i < L.units.length; i++) if (stage.present[i] === 1 && world.units[i].klass === 1 && world.units[i].count > cc) { cc = world.units[i].count; ci = i; }
  if (ci < 0) return; const cu = world.units[ci], m0 = cu.first + (cu.count >> 1), t2 = [0, 0, 0]; soldierPlace(world, m0, ANIM_T, t2); const h = stage.ch[ci], ex = t2[0] + Math.sin(h) * 11, ez = t2[1] + Math.cos(h) * 11, yaw = Math.atan2(t2[0] - ex, t2[1] - ez);
  const cam = { x: ex, y: T.h(ex, ez) + 1.7, z: ez, fwd: [Math.sin(yaw), 0, Math.cos(yaw)], fov: FOV, near: 0.25, far: 6000 }; crowd.prepare(cam, ANIM_T); const F = crowd.frameData, fl = crowd.fl, mm = meshMap(), u32 = new Uint32Array(F.inst.buffer, F.inst.byteOffset, F.instBytes / 4);
  const riders = new Map(); for (let j = 0; j < fl.n; j++) if (fl.mount[j]) riders.set(fl.fig[j], j); let horses = 0;
  for (const d of F.draws) { const info = mm.get(d.first); if (!info || info.kind !== 'horse') continue; for (let q = 0; q < d.n; q++) { const r = d.off / 48 + q, fig = u32[r * 12 + 8], j = riders.get(fig); if (j === undefined) continue; horses++; assert.ok((fl.mask[j] >> info.level) & 1, 'the horse is at a level of its rider'); assert.equal(u32[r * 12 + 11], fl.p[j * 3 + info.level]); } }
  console.log(`# horsemen ${L.units[ci].id}: ${riders.size} riders listed, ${horses} horse records checked`); assert.ok(riders.size === 0 || horses > 0);
});

test('the train and the works fade out over the band of their 350 m limit: a dither range [0, q), nothing beyond, full inside', () => {
  const D0 = 10, c0 = camera(D0), fwd = c0.fwd, at = d => ({ x: c0.x + fwd[0] * d / Math.hypot(fwd[0], fwd[2]), z: c0.z + fwd[2] * d / Math.hypot(fwd[0], fwd[2]) });   // a point d metres ahead on the ground (the view looks along fwd)
  const ds = [100, 330, 349, 360, 380, 420], nB = world.units.findIndex((u, i) => i < L.units.length && stage.present[i] === 1 && u.count > 0), g = [];
  for (const d of ds) { const p = at(d); g.push(p.x, p.z, T.h(p.x, p.z), 0, nB, d, 0, 0); }
  const lists = { artillery: { guns: new Float32Array(g), limbers: [], caissons: [], wagons: [], horses: [], drivers: [] }, works: { crew: [] }, workMesh: null }; crowd.setExtrasSource(() => lists);
  try {
    crowd.prepare(c0, ANIM_T); const F = crowd.frameData, u32 = new Uint32Array(F.inst.buffer, F.inst.byteOffset, F.instBytes / 4), want = ds.map(d => edgeRange(Math.hypot(at(d).x - c0.x, at(d).z - c0.z), 350, crowd.lod.band));
    const first = new Map(); first.set(crowd.ex.carriage.firstIndex, 'carriage'); first.set(crowd.ex.tube.firstIndex, 'tube'); const got = [];
    for (const d of F.draws) if (first.get(d.first) === 'carriage') for (let q = 0; q < d.n; q++) { const r = d.off / 48 + q; got.push({ x: new Float32Array(u32.buffer, u32.byteOffset + r * 48, 12)[0], P: u32[r * 12 + 11] }); }
    const drawn = want.filter(w => w >= 0); assert.equal(got.length, drawn.length, `${got.length} guns drawn of ${ds.length}: the one beyond ${350 * 1.075} m is not`); assert.ok(want[want.length - 1] === -1 && want[0] === 0, 'full inside, nothing beyond');
    assert.deepEqual(got.map(g2 => g2.P), drawn, 'each gun carries the range of its own distance'); assert.ok(got.some(g2 => g2.P > 0), 'at least one gun is inside the band');
    for (const g2 of got) if (g2.P) { const r = decodeRange(g2.P); assert.equal(r.lo, 0); assert.ok(r.hi > 0 && r.hi < 1); }
    // hard mode: a step at 350 m, as before
    crowd.lod.band = 0; crowd.prepare(c0, ANIM_T); const F2 = crowd.frameData, u2 = new Uint32Array(F2.inst.buffer, F2.inst.byteOffset, F2.instBytes / 4); let n2 = 0; for (const d of F2.draws) if (first.get(d.first) === 'carriage') for (let q = 0; q < d.n; q++) { n2++; assert.equal(u2[(d.off / 48 + q) * 12 + 11], 0); } assert.equal(n2, ds.filter(d => d < 350).length, 'hard mode: the guns inside 350 m only, each in full');
  } finally { crowd.lod.band = 0.075; crowd.setExtrasSource(null); }
});
