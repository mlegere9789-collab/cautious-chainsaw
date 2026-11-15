// Node test of the second check of gate Q21, "scene equals schedule" (src/ext/vegetation/scene-check.mjs): the state texture the layer writes equals the schedule at every sampled minute and
// every set of choices; the scene draws crops and trees at all; the trees placed are about the density of the data; the readings of Little Round Top draw the share of trees they keep.
// The test can fail: a model whose density differs from the trees that were placed is reported.
//   node --test docs/battle-theatre/app/tests/vegetation-scene.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { VegModel, sampleTimes, isoMin } from '../src/ext/vegetation/model.mjs';
import { checkScene, SCENE_HOOK } from '../src/ext/vegetation/scene-check.mjs';
import { buildTrees, buildDecals } from '../src/ext/vegetation/mesh.mjs';
import { nodeWorld } from './node-world.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'vegetation.json'), 'utf8'));
const M = new VegModel(structuredClone(DATA));
const { T: TER } = await nodeWorld(), FLAT = (lng, lat) => TER.xz(lng, lat), GROUND = { W: TER.W, H: TER.H };
const trees = buildTrees(M, FLAT, GROUND), decals = buildDecals(M, FLAT, { maxEdge: 34 });

test('scene equals schedule: the state texture, the trees placed, the ground cover and the readings of Little Round Top', () => {
  const times = sampleTimes(M).filter((_, i) => i % 6 === 0).concat([isoMin('1863-07-02T16:30'), isoMin('1863-07-02T20:30'), isoMin('1863-11-19T12:00')]);
  const r = checkScene(M, { project: FLAT, ground: GROUND, times, trees, decals });
  assert.equal(r.gate, 'Q21'); assert.deepEqual(r.failures, [], JSON.stringify(r.failures.slice(0, 3))); assert.ok(r.ok);
  assert.ok(r.facts.trees > 60000 && r.facts.decalTriangles > 50000 && r.facts.densityChecked > 100, JSON.stringify(r.facts));
  assert.ok(r.checked > 927 * 5 * 8, 'units x sampled minutes x choice sets: ' + r.checked);
  assert.ok(r.notRun.some(s => /shaders/.test(s)) && r.notRun.some(s => /GPU/.test(s)), 'it says what it does not look at');
  const lrt = Object.entries(r.facts.lrt).filter(([k]) => /wiki_unwooded/.test(k)); assert.ok(lrt.length >= 2 && lrt.every(([, v]) => v[1] === 0), 'unwooded: no tree of the hill is drawn');
  const u = r.facts.understory; assert.deepEqual(Object.keys(u).sort(), ['as_classed', 'dense', 'open_grown']); assert.ok(u.as_classed.woodsChecked > 100 && u.dense.woodsChecked > 100, JSON.stringify(u));
  assert.ok(u.dense.trees > u.as_classed.trees + 30000 && u.as_classed.trees > u.open_grown.trees, 'the readings place different numbers of shrubs: ' + JSON.stringify(u));
  const hk = Object.entries(r.facts.houck).filter(([k, v]) => /clear_cut/.test(k) && v[0] >= 20); assert.ok(hk.length >= 1 && hk.every(([, v]) => v[1] === 0), "Houck's land read as clear-cut: no tree of its woods is drawn: " + JSON.stringify(hk));
  const hk0 = Object.entries(r.facts.houck).filter(([k, v]) => !/clear_cut/.test(k) && v[0] >= 20); assert.ok(hk0.length >= 1 && hk0.every(([, v]) => v[1] === v[0]), 'otherwise all are drawn');
  const half = Object.entries(r.facts.lrt).filter(([k, v]) => /wiki_light_summit/.test(k) && v[0] >= 20); assert.ok(half.length >= 1 && half.every(([, v]) => Math.abs(v[1] / v[0] - 0.5) < 0.2), 'lightly wooded: about half of the trees');
});

test('scene equals schedule can fail: a density that is not the one the trees were placed at, and a model with a species of a later age', () => {
  const bad = new VegModel(structuredClone(DATA)), w = bad.units.find(u => u.woods && u.area_ac > 5 && u.woods.class !== 'scatter'); w.woods.per_ha *= 2;
  const r = checkScene(bad, { project: FLAT, ground: GROUND, times: [isoMin('1863-07-02T12:00')], choicesList: [{}], trees, decals });
  assert.ok(!r.ok && r.failures.some(f => f.unit === w.id && /trees placed/.test(f.why)), JSON.stringify(r.failures.slice(0, 2)));
  // trees placed with a table of shrub densities the schedule does not have: the scene does not equal the schedule
  const spoiled = new VegModel(structuredClone(DATA)); spoiled.cal.understory_per_ha.moderate = 120; const badTrees = buildTrees(spoiled, FLAT, GROUND);
  const r2 = checkScene(M, { project: FLAT, ground: GROUND, times: [isoMin('1863-07-02T12:00')], choicesList: [{}], trees: badTrees, decals }); assert.ok(!r2.ok && r2.failures.some(f => /placed under the reading as_classed/.test(f.why)), JSON.stringify(r2.failures.slice(0, 2)));
  // a claim's heights that the trees do not keep
  const r3 = checkScene(M, { project: FLAT, ground: GROUND, times: [isoMin('1863-07-02T12:00')], choicesList: [{}], trees: (() => { const t = buildTrees(M, FLAT, GROUND), i = M.units.findIndex(x => x.lc === 'LC-TREES-0039'); for (let o = 0; o < t.n * 9; o += 9) if (t.data[o + 8] === i) t.data[o + 2] = 18; return t; })(), decals });
  assert.ok(!r3.ok && r3.failures.some(f => /where the claim gives/.test(f.why)), 'a Copse oak of 18 m is caught: ' + JSON.stringify(r3.failures.slice(0, 2)));
  const noProj = checkScene(M, { times: [isoMin('1863-07-02T12:00')], choicesList: [{}] }); assert.ok(noProj.ok && noProj.notRun.some(s => /no projection/.test(s)), 'without a projection the trees and the mesh are reported as not looked at');
});

test('the hook is stated', () => {
  assert.equal(SCENE_HOOK.gate, 'Q21'); assert.match(SCENE_HOOK.fn, /checkScene/);
  const hooks = fs.readFileSync(path.join(APP, 'docs', 'GATE-HOOKS.md'), 'utf8'); assert.match(hooks, /scene-check\.mjs/, 'GATE-HOOKS.md lists the function');
});
