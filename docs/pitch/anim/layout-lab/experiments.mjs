// layout-lab/experiments.mjs - E7: the ideas that were tried for the residual pushes and for purity, measured on the same three 10 s windows (4x speed) so the
// negative results in 06-layout.md section 6.3 are numbers, not anecdotes.    node docs/pitch/anim/layout-lab/experiments.mjs  -> out/e7.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { runWindow } from './lib/dynamic.mjs';
import { runWindowLookahead } from './lib/lookahead.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const all = loadAll(); const spec = SPECS.standard;
const windows = [{ id: 'H1', z: 13, tick: 346 }, { id: 'H2', z: 13, tick: 293 }, { id: 'H3', z: 14, tick: 556 }];
const speed = 8; const rows = [];
const variants = [
  ['default (inertia, sticky aggregates, seniority)', (b) => runWindow(all, 'hybrid', spec, b)],
  ['no seniority', (b) => runWindow(all, 'hybrid', spec, { ...b, opts: { seniority: 0 } })],
  ['easing layer (k 0.3, ghost newcomers 8 frames, snap-back)', (b) => runWindow(all, 'hybrid', spec, { ...b, smoothK: { k: 0.3, ghostFrames: 8 } })],
  ['lookahead layer (W 8)', (b) => runWindowLookahead(all, 'hybrid', spec, { ...b, W: 8 })],
  ['growth ramp (10 frames)', (b) => runWindow(all, 'hybrid', spec, { ...b, opts: { grow: 10 } })],
  ['escalated budget (48 -> 72 px before merging across formations)', (b) => runWindow(all, 'hybrid', spec, { ...b, opts: { dMax2: 72 } })],
  ['zoom tiers (corps below z11.6, division below z12.6, brigade below z14)', (b) => runWindow(all, 'hybrid', spec, { ...b, opts: { tier: [[0, 'corps'], [11.6, 'division'], [12.6, 'brigade'], [14, 'regiment']] } })],
];
for (const w of windows) for (const [name, fn] of variants) {
  const base = { z: w.z, tick0: Math.max(1, w.tick - speed * 5), speed, frames: 600 };
  const r = fn(base); rows.push({ window: w.id, z: w.z, variant: name, acc: r.acc }); console.log(w.id, name.padEnd(62), 'churn/s', r.acc.tileChurnPerSec.toFixed(1), 'pops/s', r.acc.popsPerSec.toFixed(2), 'jerk p99', r.acc.jerkP99.toFixed(3), 'max', r.acc.jerkMax.toFixed(0), 'ov', r.acc.overlapPairsTotal);
}
fs.writeFileSync(path.join(HERE, 'out', 'e7.json'), JSON.stringify({ generated: new Date().toISOString(), speed, rows }, null, 1));
