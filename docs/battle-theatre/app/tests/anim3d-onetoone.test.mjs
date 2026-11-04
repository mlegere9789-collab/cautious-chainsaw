// OA02 / plan G2 / DEC "no capping": every figure of a unit is animated individually. Node only (no browser).
//   node --test docs/battle-theatre/app/tests/anim3d-onetoone.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { AnimSystem, ClipSel, FirePlan } from '../src/anim3d/index.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..');
const skeleton = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'figures3d', 'skeleton.json'), 'utf8'));
const N = 4000, varFn = k => (k * 0.6180339887) % 1;

test('one-to-one: a unit of 4,000 men marching gives every man a selection; the drilled march keeps ONE clip family but at least 97 percent of the men have distinct clip times (phase), none is dropped', () => {
  const A = new AnimSystem({ skeleton }); const u = A.addUnit({ unitId: 'U-MARCH', n: N, arm: 'infantry', variation: varFn }); u.setSegments([{ t0: 0, activity: 'march', speed: 1.304 }]);
  const o = new ClipSel(), phases = new Set(); let answered = 0; for (let k = 0; k < N; k++) { u.clipAt(k, 100, o); assert.ok(o.a >= 0, 'figure ' + k + ' has a clip'); answered++; phases.add(Math.round(o.ta * 1e6)); }
  assert.equal(answered, N); assert.ok(phases.size > 0.97 * N, 'distinct clip times ' + phases.size + ' of ' + N);
});
test('one-to-one: a firing unit of 4,000 men emits shots from every man (the fire plan has no sampling); every figure index appears and every shot lies inside the plan window', () => {
  const A = new AnimSystem({ skeleton }); A.addUnit({ unitId: 'U-FIRE', n: N, arm: 'infantry', variation: varFn });
  const plan = FirePlan.create({ unitId: 'U-FIRE', n: N, seed: 5, mode: 'at_will', startS: 0, endS: 600, cycleS: { min: 20, max: 30 }, files: 2000, ranks: 2 }); plan.weaponId = 'm1861_springfield'; plan.weaponKind = 'long_arm'; plan.round = 'ball';
  A.setSegments('U-FIRE', [{ t0: 0, activity: 'fire', plan }]);
  const who = new Uint8Array(N); let shots = 0, bad = 0; A.bus.onFire((u, k, t) => { who[k] = 1; shots++; if (t < 0 || t >= 600) bad++; });
  A.advance(0, 60); let men = 0; for (let k = 0; k < N; k++) men += who[k];
  assert.equal(bad, 0); assert.equal(men, N, 'men who fired in the first minute: ' + men + ' of ' + N); assert.ok(shots >= N, 'at least one shot per man, got ' + shots);
});
test('one-to-one: nothing in src/anim3d or src/figures3d caps the figure count (no MAX_FIGURES, no figure budget constants); the cap would be an owner decision', () => {
  for (const dir of ['anim3d', 'figures3d']) for (const f of fs.readdirSync(path.join(APP, 'src', dir))) { const s = fs.readFileSync(path.join(APP, 'src', dir, f), 'utf8'); assert.ok(!/MAX_FIGURES|MAX_SOLDIERS|figureCap|soldierCap|maxInstances/i.test(s), dir + '/' + f + ' contains a figure cap'); }
});
