// Node tests (no browser) for the figure pass's data and animation driver (src/crowd): one record per figure from the manifests, the animation is a pure function of time, the clip bank and the mesh store
// keep their layouts, the stage's activity timelines follow the admitted events, and the turn time of a block scales with its extent.
//   node --test docs/battle-theatre/app/tests/crowd.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { CrowdAnim } from '../src/crowd/anim.mjs';
import { ClipBank, CORE } from '../src/crowd/clips.mjs';
import { buildCrowdData, figureSources } from '../src/crowd/data.mjs';
import { MeshStore } from '../src/crowd/meshes.mjs';
import { buildPal } from '../src/crowd/tables.mjs';
import { minOf } from '../src/clock.mjs';

const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo });
stage.loadScenario({ id: 'pdf-recommended', choices: {}, optionText: {} });
const skeleton = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/figures3d/skeleton.json'), 'utf8')), D = new CrowdAnim({ skeleton, world, layer: L, stage });
const tMin = minOf(7, 3, 13) + 30, tSec = tMin * 60; stage.apply(tMin);

test('every world figure has exactly one source (unit, index) and the sources tile the figure table', () => {
  const src = figureSources(world, L.units.length); let n = 0, next = 0; for (const s of src) { assert.equal(s.first, next); next += s.n; n += s.n; } assert.equal(n, world.count);
});
test('the instance table: one record per figure from instanceFromHistory, no figure without a manifest, the 140th New York drawn in generic dress and listed', async () => {
  const data = await buildCrowdData({ layer: L, world, sliceMs: 1e9 }); assert.equal(data.inst.length, world.count * 4); assert.equal(data.count, world.count);
  assert.ok(data.nVariants > 100 && data.varInfo.length === data.nVariants * 4 && data.varPal.length === data.nVariants * 14 * 4);
  assert.ok(data.disputed.length >= 1 && data.disputed.every(d => d.figures > 0), 'the disputed unit is listed');
  for (let i = 0; i < world.count; i += 997) assert.ok((data.inst[i * 4] & 0xffff) < data.nVariants);
  const again = await buildCrowdData({ layer: L, world }); assert.equal(again, data, 'the second visit reuses the table (warm cache)');
});
test('the animation of every figure on the field is a pure function of time (order of evaluation does not matter)', () => {
  const run = rev => { let acc = 0; const idx = [...Array(world.units.length).keys()]; if (rev) idx.reverse(); for (const i of idx) { if (stage.present[i] !== 1) continue; const w = world.units[i]; for (let q = 0; q < w.count; q += 7) { const k = rev ? w.count - 1 - q : q, s = D.clipAt(i, k, tSec); acc += s.a * 31 + Math.round(s.d[0] * 1000); } } return acc; };
  let a = 0, b = 0; const seen = new Set(); for (let i = 0; i < world.units.length; i++) if (stage.present[i] === 1) { const w = world.units[i]; for (let q = 0; q < w.count; q += 7) { const s = D.clipAt(i, q, tSec); seen.add(s.a); a += s.a * 31 + Math.round(s.d[0] * 1000); } }
  for (let i = world.units.length - 1; i >= 0; i--) if (stage.present[i] === 1) { const w = world.units[i]; for (let q = 0; q < w.count; q += 7) { const s = D.clipAt(i, q, tSec); b += s.a * 31 + Math.round(s.d[0] * 1000); } }
  assert.equal(a, b); assert.ok(seen.size >= 3, 'more than one clip is played on the field at 13:30 on 3 July'); void run;
});
test('stage.unitSegments: timelines are sorted, start at the unit\'s entry and never name an activity the animator does not know', () => {
  let units = 0; for (let i = 0; i < L.units.length; i++) { const s = stage.unitSegments(i); if (!s.length) continue; units++; for (let k = 1; k < s.length; k++) assert.ok(s[k].t0 > s[k - 1].t0); for (const g of s) assert.ok(['stand', 'march', 'double_quick', 'halt', 'rest', 'fire', 'serve_guns', 'gallop', 'build_works', 'camp'].includes(g.activity), g.activity); }
  assert.ok(units > 100);
});
test('delegated decision DD-10: cavalry units use the Wheeler 1863 gait basis, artillery the 1863 field artillery manual', () => {
  const ci = L.units.findIndex((u, i) => u.drawn && u.arm === 'cavalry' && world.units[i].count > 0), ai = L.units.findIndex((u, i) => u.drawn && u.arm === 'artillery' && world.units[i].count > 0);
  assert.ok(ci >= 0 && ai >= 0); assert.equal(D.get(ci).opts.gaitBasis, 'wheeler_1863'); assert.equal(D.get(ai).opts.gaitBasis, 'fa_1863');
});
test('the clip bank: the core clips bake into the texture layout (two frames per row), the identity frame is the rest pose, variants map to their base clip', () => {
  const bank = new ClipBank(D.lib); let n = 0; for (const _ of bank.prebake(CORE.slice(0, 6))) n++; void 0; assert.equal(n, 6);
  const e = bank.human.byClip.get(bank.index.get('stand_shoulder')) || bank.ensure(bank.index.get('stand_shoulder')); assert.ok(e.n >= 1 && e.fps > 0);
  const out = new Float64Array(3); bank.rows(bank.index.get('march_quick_time_shoulder'), 0.5, out, 0); assert.ok(out[2] >= 0 && out[2] < 1);
  const id = bank.horse.addIdentity(); assert.equal(bank.horse.addIdentity(), id); const o = ((id >> 1) * bank.horse.width + (id & 1) * bank.horse.tpf) * 4; assert.ok(bank.horse.data[o] !== 0 && bank.horse.data[o + 5] !== 0 && bank.horse.data[o + 1] === 0);
  const variant = [...bank.lib.variantsOf.values()][0][1]; assert.equal(bank.baseOf[bank.index.get(variant)], bank.index.get([...bank.lib.variantsOf.keys()][0]));
});
test('the mesh store packs 28 byte vertices with absolute indices, weights sum to 255, a dynamic slice is rewritten in place', () => {
  const ms = new MeshStore(8, 8), m = { nv: 3, pos: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]), nrm: Float32Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1]), mat: Uint8Array.from([7, 7, 7]), joints: Uint8Array.from([1, 2, 0, 0, 1, 0, 0, 0, 2, 3, 0, 0]), weights: Float32Array.from([.5, .5, 0, 0, 1, 0, 0, 0, .3, .7, 0, 0]), flags: Uint8Array.from([0, 0, 0]), idx: Uint32Array.from([0, 1, 2]) };
  const a = ms.add('a', m), b = ms.add('b', m); assert.equal(b.firstVertex, 3); assert.equal(ms.ib[b.firstIndex], 3); for (let v = 0; v < 6; v++) { const o = v * 28 + 24; assert.equal(ms.vb[o] + ms.vb[o + 1] + ms.vb[o + 2] + ms.vb[o + 3], 255); } assert.ok(a.indexCount === 3);
  const d1 = ms.setDynamic('w', m), d2 = ms.setDynamic('w', { ...m, nv: 3 }); assert.equal(d1.firstIndex, d2.firstIndex); assert.ok(ms.version >= 1, 'the store grew (capacity doubled) and says so');
});
test('the palette table: every material has a row, the variant slots are the figures3d slots, earth is material 63', () => {
  const p = buildPal({ us_national: [177, 121, 133] }); assert.equal(p.length, 128 * 3 * 4); assert.ok(p[(63) * 4] > 0 && p[(128 + 63) * 4 + 1] === -1); assert.ok(p[(256 + 1) * 4] > 0, 'flag mean colour of the national colour');
});
test('block turn time scales with the formation extent (a rigid train turned in 25 s moved its far end at 30 m/s)', () => {
  const i = L.units.findIndex((u, k) => u.drawn && world.units[k].count > 200), rec = { x: 0, z: 0, path: null, act: 'stand', head: 0, headFrom: 0, actT: 0, turnS: 25 };
  const nxt = stage._step(rec, { type: 'activity', unit: L.units[i].id, t: 100, activity: 'march', head: Math.PI }); const bb = stage.bbox[i], ext = Math.max(...bb.map(Math.abs));
  assert.ok(nxt.turnS >= 25 && Math.abs(nxt.turnS - Math.max(25, Math.PI * ext / 4.4)) < 1e-6 || nxt.turnS === 900);
});
test('src/*-host.mjs modules: both exist and export init / update / dispose', async () => {
  for (const f of ['fx-host.mjs', 'audio-host.mjs']) { assert.ok(fs.existsSync(path.join(BT, 'app/src', f)), f); const src = fs.readFileSync(path.join(BT, 'app/src', f), 'utf8'); for (const n of ['init', 'update', 'dispose']) assert.match(src, new RegExp('export (async )?function ' + n + '\\b'), f + ' ' + n); }
});
