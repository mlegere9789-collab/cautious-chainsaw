import test from 'node:test';
import assert from 'node:assert/strict';
import { rand, randn } from '../rng.mjs';
import { layout, frontageM } from '../formation.mjs';
import { solveLosses, countsAt, pickCount } from '../loss_solver.mjs';
import { EventCache, scrubTest, hashState } from '../cache.mjs';

test('rng deterministic and well spread', () => {
  assert.equal(rand(1, 2, 3, 4), rand(1, 2, 3, 4));
  assert.notEqual(rand(1, 2, 3, 4), rand(1, 2, 3, 5));
  let s = 0, s2 = 0; const N = 20000; for (let i = 0; i < N; i++) { const r = rand(7, i, 0); s += r; s2 += r * r; }
  assert.ok(Math.abs(s / N - 0.5) < 0.01); assert.ok(Math.abs(s2 / N - 1 / 3) < 0.01);
  let m = 0, v = 0; for (let i = 0; i < N; i++) { const g = randn(9, i, 0); m += g; v += g * g; }
  assert.ok(Math.abs(m / N) < 0.03); assert.ok(Math.abs(v / N - 1) < 0.05);
});
test('formation: size, facing, reproducible, frontage', () => {
  const a = layout({ unitId: '20ME', n: 358, cx: 100, cz: 200, facingDeg: 90, formation: 'line', seed: 5 });
  const b = layout({ unitId: '20ME', n: 358, cx: 100, cz: 200, facingDeg: 90, formation: 'line', seed: 5 });
  assert.deepEqual(Array.from(a.x), Array.from(b.x));
  assert.equal(a.x.length, 358);
  const zs = Array.from(a.z), xs = Array.from(a.x); // facing east: line runs north-south, ranks east-west
  assert.ok(Math.max(...zs) - Math.min(...zs) > 90 && Math.max(...xs) - Math.min(...xs) < 3);
  assert.ok(Math.abs(frontageM(358, 'line') - 100.24) < 1);
  assert.equal(layout({ unitId: 'x', n: 400, cx: 0, cz: 0, facingDeg: 0, formation: 'column_fours', seed: 1 }).cols, 4);
});
test('loss solver: exact totals, pinned honored, deterministic, windows respected', () => {
  const windows = [{ t0: 1000, t1: 1900, w: 1 }, { t0: 1900, t1: 2500, w: 3 }];
  const pin = [{ agent: 0, fate: 'killed', t: 2000 }];
  const args = { unitId: '20ME', strength: 385, killed: 29, wounded: 91, missing: 5, windows, pinned: pin, seed: 3 };
  const ev = solveLosses(args);
  assert.equal(ev.length, 125);
  assert.deepEqual(countsAt(ev, 1e9), { killed: 29, wounded: 91, missing: 5 });
  assert.equal(new Set(ev.map(e => e.agent)).size, 125, 'no agent hit twice');
  assert.ok(ev.every(e => e.t >= 1000 && e.t <= 2500));
  assert.ok(ev.find(e => e.agent === 0 && e.pinned));
  assert.deepEqual(ev, solveLosses(args));
  assert.ok(ev.filter(e => e.t > 1900).length > 125 * 0.5, 'intensity weighting');
  assert.throws(() => solveLosses({ unitId: 'a', strength: 10, killed: 11, wounded: 0, windows }));
  assert.throws(() => solveLosses({ unitId: 'a', strength: 10, killed: 1, wounded: 0, windows: [] }), /open gap/);
  assert.equal(pickCount([22709, 28063], 'low'), 22709);
});
function mk(seed) {
  const init = () => ({ units: {} });
  const reducer = (s, e) => {
    const u = s.units[e.unit] || { pos: [0, 0], casualties: 0, act: 'rest' }; const n = { ...u };
    if (e.type === 'move') n.pos = e.pos; if (e.type === 'casualty') n.casualties = u.casualties + 1; if (e.type === 'activity') n.act = e.act;
    return { units: { ...s.units, [e.unit]: n } };
  };
  const c = new EventCache({ init, reducer, snapshotEvery: 500, seed, presence: { PICKETT: { from: 20000, to: null }, HUEY: { from: Infinity, to: null } } });
  let k = 1;
  for (let t = 0; t < 30000; t += 37) {
    c.add({ t, unit: 'A', type: 'move', pos: [t % 97, t % 53] }); c.add({ t: t + 5, unit: 'B', type: 'casualty' });
    if (t % 111 === 0) c.add({ t, unit: 'B', type: 'activity', act: 'a' + (k++ % 5) });
  }
  return c;
}
test('Q04 presence gating rejects early entities', () => {
  const c = mk(1); const before = c.rejected.length;
  assert.equal(c.add({ t: 100, unit: 'PICKETT', type: 'move', pos: [1, 1] }), false);
  assert.equal(c.add({ t: 25000, unit: 'PICKETT', type: 'move', pos: [1, 1] }), true);
  assert.equal(c.add({ t: 5, unit: 'HUEY', type: 'move', pos: [1, 1] }), false);
  assert.equal(c.rejected.length, before + 2);
});
test('Q12 scrub: random seeks, backward and forward identical', () => {
  let r = 12345; const rnd = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  const c = mk(1); const res = scrubTest(c, 0, 29900, 400, rnd);
  assert.deepEqual(res.mismatches, []);
  const fwd = hashState(c.at(20000)); c.at(29000); c.at(100); assert.equal(hashState(c.at(20000)), fwd);
  assert.equal(mk(1).header().inputHash, c.header().inputHash);
});
test('late insertion invalidates only later snapshots', () => {
  const c = mk(1); c.build(29000); const n = c.snaps.length; c.add({ t: 20000.5, unit: 'A', type: 'move', pos: [9, 9] }); c._sort();
  assert.ok(c.snaps.length < n && c.snaps.every(s => s.t < 20000.5));
  assert.deepEqual(c.at(20001).units.A.pos, [9, 9]);
});
