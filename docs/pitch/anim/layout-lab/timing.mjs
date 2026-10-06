// layout-lab/timing.mjs - E5: time per solve for the densest tick, serial, on a quiet machine (run it when no other job is running).
//   node docs/pitch/anim/layout-lab/timing.mjs        -> out/e5.json
//   cold = a fresh solver (what a seek, a zoom jump or the first frame costs); warm = the per-frame cost during playback (inertia, sticky aggregates)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { makeStrategy } from './lib/strategies.mjs';
import { frameLeaves, pct } from './lib/metrics.mjs';
import { runWindow } from './lib/dynamic.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const all = loadAll(); const spec = SPECS.standard;
const stat = (a) => ({ n: a.length, min: Math.min(...a), p50: pct(a, 0.5), p95: pct(a, 0.95), p99: pct(a, 0.99), max: Math.max(...a), mean: a.reduce((x, y) => x + y, 0) / a.length });
const out = { generated: new Date().toISOString(), machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, node: process.version, platform: process.platform }, densestTick: null, cold: {}, warm: {}, allTicksCold: {} };
// densest tick = most units on the field under rule A
let dt = 1; let dn = 0; for (let t = 1; t <= 675; t++) { const n = frameLeaves(all, t, 13, spec).leaves.length; if (n > dn) { dn = n; dt = t; } }
out.densestTick = { tick: dt, units: dn };
console.log('densest tick', dt, dn);
for (const z of [11, 12, 13, 14, 15, 16, 17]) {
  const { leaves } = frameLeaves(all, dt, z, spec); out.cold[z] = {};
  for (const name of ['raw', 'displace', 'aggregate', 'aggregateTier', 'fanout', 'hybrid']) {
    const ms = []; for (let i = 0; i < 31; i++) { const s = makeStrategy(name, all, spec); const r = s.step(leaves, { z, dt: 1, static: true }); if (i > 0) ms.push(r.ms); }   // first run = JIT warm-up, dropped
    out.cold[z][name] = stat(ms);
  }
  console.log('cold z' + z, 'hybrid p50', out.cold[z].hybrid.p50.toFixed(1), 'p95', out.cold[z].hybrid.p95.toFixed(1), 'max', out.cold[z].hybrid.max.toFixed(1));
}
// warm: 10 s of playback around the densest tick at three speeds
for (const z of [12, 13, 14, 15]) { out.warm[z] = {}; for (const [label, tps] of [['1x', 2], ['4x', 8], ['16x', 32]]) { const r = runWindow(all, 'hybrid', spec, { z, tick0: Math.max(1, dt - tps * 5), speed: tps, frames: 600 }); out.warm[z][label] = { ms: { mean: r.acc.msMean, p50: r.acc.msP50, p95: r.acc.msP95, p99: r.acc.msP99, max: r.acc.msMax }, avgTiles: r.acc.avgTiles, avgVisible: r.acc.avgVisible, framesWithOverlap: r.acc.framesWithOverlap }; console.log('warm z' + z, label, 'mean', r.acc.msMean.toFixed(2), 'p95', r.acc.msP95.toFixed(2), 'p99', r.acc.msP99.toFixed(2), 'max', r.acc.msMax.toFixed(1)); } }
// every tick, cold, hybrid, z13 and z14: the distribution of the cost of a seek
for (const z of [13, 14]) { const ms = []; for (let t = 1; t <= 675; t += 1) { const { leaves } = frameLeaves(all, t, z, spec); const s = makeStrategy('hybrid', all, spec); ms.push(s.step(leaves, { z, dt: 1, static: true }).ms); } out.allTicksCold[z] = stat(ms); console.log('all ticks cold z' + z, JSON.stringify(out.allTicksCold[z])); }
fs.writeFileSync(path.join(HERE, 'out', 'e5.json'), JSON.stringify(out, null, 1)); console.log('wrote out/e5.json');
