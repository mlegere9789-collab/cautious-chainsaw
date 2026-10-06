// layout-lab/measure.mjs - the measurement orchestrator.  Every number in docs/pitch/anim/06-layout.md comes out of this script.
//   node docs/pitch/anim/layout-lab/measure.mjs e1 [--conc 5]      static grid: 8 strategies x zoom 11..17 x ticks 1..675 x visibility rules A, B, C  -> out/e1.json
//   node docs/pitch/anim/layout-lab/measure.mjs e2 [--conc 5]      60 fps playback windows at the three hotspots: flicker, pops, jerk, overlap per frame  -> out/e2.json
//   node docs/pitch/anim/layout-lab/measure.mjs e4 [--conc 5]      sensitivity: budget dMax, footprint, visibility rule, kCap, pin protection        -> out/e4.json
//   node docs/pitch/anim/layout-lab/measure.mjs merge              out/*.json -> docs/pitch/anim/data/layout-results.json (+ layout-per-tick.json)
// (timing and the three hotspots are separate scripts: timing.mjs, hotspots.mjs - they must run serially / need a quiet machine.)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const argv = process.argv.slice(2); const cmd = argv[0];
const conc = Number(argv[argv.indexOf('--conc') + 1]) || 5;
const t00 = Date.now();

function runJob(job) {
  return new Promise((resolve, reject) => {
    const w = new Worker(path.join(HERE, 'job-worker.mjs'), { workerData: job });
    w.once('message', (m) => resolve(m)); w.once('error', reject);
    w.once('exit', (c) => { if (c !== 0) reject(new Error('worker exit ' + c)); });
  });
}
async function pool(jobs, label) {
  const results = new Array(jobs.length); let next = 0; let done = 0;
  async function lane() { for (;;) { const i = next++; if (i >= jobs.length) return; results[i] = await runJob(jobs[i]); done++; console.log(`[${((Date.now() - t00) / 1000).toFixed(0)}s] ${label} ${done}/${jobs.length} ${jobs[i].tag || ''}`); } }
  await Promise.all(Array.from({ length: Math.min(conc, jobs.length) }, lane));
  return results;
}

export const HOTSPOTS = [
  { id: 'H1', tick: 346, lat: 39.8189, lng: -77.2262, note: 'Cemetery Hill / Evergreen Cemetery (Day 2)' },
  { id: 'H2', tick: 293, lat: 39.7994, lng: -77.2417, note: 'Rose Woods / Plum Run (Day 2)' },
  { id: 'H3', tick: 556, lat: 39.8117, lng: -77.2347, note: 'Copse of Trees / The Angle (Day 3)' },
];
const ZOOMS = [11, 12, 13, 14, 15, 16, 17];

if (cmd === 'e1') {
  const jobs = [];
  for (const rule of ['A', 'B', 'C']) for (const z of ZOOMS) jobs.push({ kind: 'e1', tag: `rule ${rule} z${z}`, args: { z, rule, window: rule === 'C' ? 24 : null, specName: 'standard', strategies: ['raw', 'disclose', 'displace', 'aggregate', 'aggregateTier', 'fanout', 'hybrid'], legacy: true, keepSeries: rule === 'A' } });
  // heaviest first (rule A, low zoom) so the pool stays balanced
  const order = jobs.map((j, i) => i).sort((a, b) => (jobs[a].args.rule === 'A' ? 0 : 1) - (jobs[b].args.rule === 'A' ? 0 : 1) || jobs[a].args.z - jobs[b].args.z);
  const res = await pool(order.map((i) => jobs[i]), 'e1');
  const out = { generated: new Date().toISOString(), node: process.version, rules: {}, perTick: {} };
  order.forEach((ji, k) => { const j = jobs[ji]; const r = res[k]; (out.rules[j.args.rule] ||= {})[j.args.z] = r.summary; if (r.series) { (out.perTick[j.args.rule] ||= {})[j.args.z] = { series: r.series, legacy: r.legacySeries }; } });
  fs.writeFileSync(path.join(OUT, 'e1.json'), JSON.stringify(out));
  console.log('wrote out/e1.json', ((Date.now() - t00) / 1000).toFixed(0) + 's');
}

if (cmd === 'e2') {
  const jobs = []; const speeds = [{ label: '1x', tps: 2 }, { label: '4x', tps: 8 }, { label: '16x', tps: 32 }];
  for (const h of HOTSPOTS) for (const z of [13, 14, 15]) for (const sp of speeds) {
    const tick0 = Math.max(1, Math.round(h.tick - sp.tps * 5)); const run = { z, tick0, speed: sp.tps, frames: 600 };
    const tag = `${h.id} z${z} ${sp.label}`;
    jobs.push({ kind: 'dyn', tag: tag + ' legacy-hold', args: { legacy: true, run: { ...run, mode: 'hold' } }, meta: { h: h.id, z, speed: sp.label, variant: 'legacy-shipped' } });
    jobs.push({ kind: 'dyn', tag: tag + ' legacy-smooth', args: { legacy: true, run: { ...run, mode: 'smooth' } }, meta: { h: h.id, z, speed: sp.label, variant: 'legacy-smooth-data' } });
    jobs.push({ kind: 'dyn', tag: tag + ' hybrid', args: { strategy: 'hybrid', run }, meta: { h: h.id, z, speed: sp.label, variant: 'hybrid' } });
    jobs.push({ kind: 'dyn', tag: tag + ' hybrid-stateless', args: { strategy: 'hybrid', run: { ...run, opts: { inertia: false, sticky: false, seniority: 0 } } }, meta: { h: h.id, z, speed: sp.label, variant: 'hybrid-no-hysteresis' } });
    jobs.push({ kind: 'dyn', tag: tag + ' displace', args: { strategy: 'displace', run }, meta: { h: h.id, z, speed: sp.label, variant: 'displace' } });
    jobs.push({ kind: 'dyn', tag: tag + ' aggregate', args: { strategy: 'aggregate', run }, meta: { h: h.id, z, speed: sp.label, variant: 'aggregate' } });
    jobs.push({ kind: 'dyn', tag: tag + ' aggregateTier', args: { strategy: 'aggregateTier', run }, meta: { h: h.id, z, speed: sp.label, variant: 'aggregateTier' } });
  }
  const res = await pool(jobs, 'e2');
  fs.writeFileSync(path.join(OUT, 'e2.json'), JSON.stringify({ generated: new Date().toISOString(), runs: jobs.map((j, i) => ({ ...j.meta, acc: res[i].acc })) }));
  console.log('wrote out/e2.json', ((Date.now() - t00) / 1000).toFixed(0) + 's');
}

if (cmd === 'e4') {
  const ticks = Array.from({ length: 135 }, (_, i) => 5 * (i + 1));            // every 5th tick
  const jobs = [];
  const add = (tag, z, o) => jobs.push({ kind: 'e1', tag, args: { z, ticks, specName: 'standard', strategies: ['hybrid'], legacy: false, rule: 'A', ...o }, meta: { tag, z, ...(o.meta || {}) } });
  for (const z of [12, 13, 14, 15]) {
    for (const dMax of [0, 16, 32, 48, 64, 96]) add(`dMax ${dMax} z${z}`, z, { opts: { hybrid: { dMax } }, meta: { dial: 'dMax', value: dMax } });
    add(`compact z${z}`, z, { specName: 'compact', opts: { hybrid: { dMax: 40 } }, meta: { dial: 'footprint', value: 'compact' } });
    add(`standard z${z}`, z, { opts: {}, meta: { dial: 'footprint', value: 'standard' } });
    add(`no pin protection z${z}`, z, { opts: { hybrid: { pinProtect: false } }, meta: { dial: 'pinProtect', value: false } });
    add(`kCap 24 z${z}`, z, { opts: { hybrid: { kCap: 24 } }, meta: { dial: 'kCap', value: 24 } });
    add(`kCap inf z${z}`, z, { opts: { hybrid: { kCap: 1e9 } }, meta: { dial: 'kCap', value: 'inf' } });
    add(`tier z${z}`, z, { opts: { hybrid: { tier: [[0, 'corps'], [11.6, 'division'], [12.6, 'brigade'], [14, 'regiment']] } }, meta: { dial: 'tier', value: 'zoom' } });
    add(`escalate 72 z${z}`, z, { opts: { hybrid: { dMax2: 72 } }, meta: { dial: 'dMax2', value: 72 } });
    for (const rule of ['B', 'C']) add(`rule ${rule} z${z}`, z, { rule, window: rule === 'C' ? 24 : null, opts: {}, meta: { dial: 'rule', value: rule } });
  }
  const res = await pool(jobs, 'e4');
  fs.writeFileSync(path.join(OUT, 'e4.json'), JSON.stringify({ generated: new Date().toISOString(), ticksSampled: ticks.length, runs: jobs.map((j, i) => ({ ...j.meta, summary: res[i].summary.strategies.hybrid })) }));
  console.log('wrote out/e4.json', ((Date.now() - t00) / 1000).toFixed(0) + 's');
}
