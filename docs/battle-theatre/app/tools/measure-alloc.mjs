// Allocation of the hot update path (one figure update = AnimSystem.sampleFigure: clip selection + sample + blend), measured as TOTAL HEAP GROWTH in bytes over 200,000 updates per workload,
// in a fresh process, after a warm-up, with forced GC before every chunk and at the end (DEC-ANIM-03). The numbers do not depend on how V8 inlines the code, because they count what was allocated, not what a micro-benchmark of one call
// happened to box:
//   * allocatedPerUpdate : sum over 20 chunks of 10,000 updates of (heapUsed after the chunk - heapUsed after a forced GC before it) / 200,000. The new space is sized (--min-semi-space-size=16) so that no scavenge can run inside
//                          a chunk, and a PerformanceObserver counts GC events inside the chunks: gcInside must be 0 or the number is not a total (the test fails).
//   * retainedBytes      : heapUsed after a final forced GC minus heapUsed after the first forced GC, over all workloads (about 1.6 million updates): what the updates leave behind. Must be about 0.
// The workloads are the distinct code paths of the evaluator: a drill march, a march in the speed gap (two clips blended), a halt -> march change of activity (blend of the old clip), fire at will (fire plan lookups and the time warp),
// the artillery crew (gun cycles), the camp states, a falling and a fallen man. The harness itself passes a freshly computed time to every call, which boxes one double (16 bytes) and is counted.
//   node --expose-gc --min-semi-space-size=16 docs/battle-theatre/app/tools/measure-alloc.mjs [--no-turbo-inlining | --no-maglev ...]      prints one JSON line
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { PerformanceObserver } from 'node:perf_hooks';
import { AnimSystem, FirePlan } from '../src/anim3d/index.mjs';
import { qnlerp } from '../src/anim3d/qmath.mjs';
import { sampleClip, blendFrames } from '../src/anim3d/clipdef.mjs';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skeleton = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'figures3d', 'skeleton.json'), 'utf8'));
const gc = globalThis.gc; if (!gc) { console.error('run with --expose-gc'); process.exit(2); }
export const UPDATES = 200000, CHUNK = 10000, WARMUP = 60000;
const S = new AnimSystem({ skeleton }), rig = S.lib.rig, fr = rig.newFrame();
const mk = (id, n, arm = 'infantry', extra = {}) => S.addUnit({ unitId: id, n, arm, crewPerGun: 10, variation: k => (k * 0.37) % 1, ...extra });
const fp = (id, n, mode, opts = {}) => FirePlan.create({ unitId: id, n, seed: 1, mode, startS: 0, endS: Infinity, cycleS: { min: 20, max: 30 }, files: Math.max(1, n / 2), ...opts });
mk('MARCH', 8); S.setSegments('MARCH', [{ t0: 0, activity: 'march', speed: 1.304 }]);
mk('GAP', 8); S.setSegments('GAP', [{ t0: 0, activity: 'march', speed: 1.8 }]);                                              // between quick time and double quick: two clips blended
mk('CHANGE', 8); S.setSegments('CHANGE', [{ t0: 0, activity: 'halt' }, { t0: 100, activity: 'march', speed: 1.304 }]);       // sampled inside the 0.35 s blend of the new activity
mk('FIRE', 8); S.setSegments('FIRE', [{ t0: 0, activity: 'fire', plan: fp('FIRE', 8, 'at_will') }]);
mk('GUNS', 10, 'artillery'); S.setSegments('GUNS', [{ t0: 0, activity: 'serve_guns', plan: FirePlan.create({ unitId: 'GUNS', n: 1, seed: 2, mode: 'by_piece', startS: 0, endS: Infinity, cycleS: { min: 30, max: 60 }, weapon: 'cannon', fireAtFrac: 0.7 }) }]);
mk('CAMP', 8); S.setSegments('CAMP', [{ t0: 0, activity: 'camp', night: false }]);
{ const u = mk('FALL', 8); S.setSegments('FALL', [{ t0: 0, activity: 'march', speed: 1.304 }]); const ft = new Float64Array(8).fill(Infinity); for (let k = 0; k < 8; k += 2) ft[k] = 50; u.setFalls(ft, new Uint8Array(8)); }
// [unit, first time, span of the loop (s), step (s)]
const WORK = { march_drill: ['MARCH', 100, 150, 1 / 60], march_speed_gap_blend: ['GAP', 100, 150, 1 / 60], change_of_activity_blend: ['CHANGE', 99.8, 0.6, 1 / 60], fire_at_will: ['FIRE', 400, 150, 1 / 60], gun_crew_cycle: ['GUNS', 100, 150, 1 / 60], camp: ['CAMP', 100, 150, 1 / 60], falling_and_fallen: ['FALL', 49.8, 40, 1 / 60] };

function run(uid, t0, span, dt, i0, n) { const steps = Math.round(span / dt); for (let j = 0; j < n; j++) { const i = i0 + j; S.sampleFigure(uid, i & 7, t0 + (i % steps) * dt, fr); } }
const obs = new PerformanceObserver(() => { }); obs.observe({ entryTypes: ['gc'] });
// Warm-up of every workload first: V8 compiles and settles in whatever tier it chooses (and the lazily baked clips are baked). One pass is not enough: measured with a forced GC after each pass, the live heap still steps up by
// 30-330 KB when TurboFan/Maglev finish compiling a workload's functions and allocate their feedback, code and deopt data on the heap after the baseline (a one-off, bimodal from run to run, ~0.15 KB per 20,000 updates afterwards, independent of
// load). That is JIT warm-up, not a per-update leak, and it would be booked as "retained". So warm up in passes until the GC'd live heap is stable (growth under 4 KB for two passes in a row; at most 12 passes); the ceiling (128 KB) is unchanged.
{ let stable = 0, prev = -1; for (let pass = 0; pass < 12 && stable < 2; pass++) { for (const [uid, t0, span, dt] of Object.values(WORK)) run(uid, t0, span, dt, 0, WARMUP); gc(); gc(); const h = process.memoryUsage().heapUsed; stable = prev >= 0 && Math.abs(h - prev) < 4096 ? stable + 1 : 0; prev = h; } }
gc(); gc(); const heapStart = process.memoryUsage().heapUsed;
const res = { flags: process.execArgv.join(' '), node: process.version, updatesPerWorkload: UPDATES, chunk: CHUNK, workloads: {} }; let sumAll = 0, worst = 0, gcInside = 0;
for (const [name, [uid, t0, span, dt]] of Object.entries(WORK)) {
  run(uid, t0, span, dt, 0, 20000);
  obs.takeRecords(); let total = 0;
  for (let c = 0; c < UPDATES / CHUNK; c++) { gc(); obs.takeRecords(); const h0 = process.memoryUsage().heapUsed; run(uid, t0, span, dt, c * CHUNK, CHUNK); const h1 = process.memoryUsage().heapUsed; gcInside += obs.takeRecords().length; total += h1 - h0; }
  const per = total / UPDATES; res.workloads[name] = +per.toFixed(2); sumAll += per; if (per > worst) worst = per;
}
gc(); gc(); const retained = process.memoryUsage().heapUsed - heapStart; obs.disconnect();
res.allocatedPerUpdateAverage = +(sumAll / Object.keys(WORK).length).toFixed(2); res.allocatedPerUpdateWorst = +worst.toFixed(2); res.gcInsideChunks = gcInside; res.retainedBytes = retained; res.retainedPerUpdate = +(retained / (UPDATES * Object.keys(WORK).length)).toFixed(6);
// the kernels (what scales with the number of bones): per call, one chunk of 20,000 after a warm-up
{ const clip = S.lib.get('march_quick_time_shoulder'), fr2 = rig.newFrame(), A = new Float32Array(112), Bq = new Float32Array(112), O = new Float32Array(112); for (let k = 0; k < 112; k += 4) { A[k + 3] = 1; Bq[k + 3] = 1; }
  const fns = { qnlerp28: i => { for (let s = 0; s < 28; s++) qnlerp(O, s * 4, A, s * 4, Bq, s * 4, 0.3); }, sampleClip: i => sampleClip(clip, i * 0.016, fr), blendFrames: i => blendFrames(rig, fr, fr, fr2, 0.3) };
  res.kernels = {}; for (const [name, fn] of Object.entries(fns)) { for (let i = 0; i < 100000; i++) fn(i); gc(); const h0 = process.memoryUsage().heapUsed; for (let i = 0; i < 8000; i++) fn(i); res.kernels[name] = +((process.memoryUsage().heapUsed - h0) / 8000).toFixed(2); } }
res.note = 'bytes allocated per figure update (sampleFigure), total heap growth with forced GC before every chunk of ' + CHUNK + ' updates; one boxed double is 16 bytes (the harness passes one per call)';
console.log(JSON.stringify(res));
