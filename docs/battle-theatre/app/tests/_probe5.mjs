import { nodeWorld } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { CrowdAnim } from '../src/crowd/anim.mjs';
import { figureSources } from '../src/crowd/data.mjs';
import { minOf } from '../src/clock.mjs';
import fs from 'node:fs';
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }); const world = worldFromUnits(T, geo, L);
const stage = new Stage({ layer: L, world, T, geo }); stage.loadScenario({ id: 'pdf-recommended', choices: {}, optionText: {} });
const sk = JSON.parse(fs.readFileSync('data/figures3d/skeleton.json', 'utf8'));
let t0 = performance.now(); const D = new CrowdAnim({ skeleton: sk, world, layer: L, stage }); console.log('driver ms', (performance.now() - t0) | 0);
figureSources(world, L.units.length);
const tMin = minOf(7, 1, 12); stage.apply(tMin); const tSec = tMin * 60;
let present = 0, segsN = 0, kinds = {}; for (let i = 0; i < world.units.length; i++) if (stage.present[i]) { present++; const ss = i < L.units.length ? stage.unitSegments(i) : []; segsN += ss.length; const a = ss.filter(s => s.t0 <= tSec).pop(); if (a) kinds[a.activity] = (kinds[a.activity] || 0) + 1; }
console.log('present', present, 'segs', segsN, JSON.stringify(kinds));
// evaluate every figure of every present unit once
t0 = performance.now(); let n = 0, acc = 0; const clips = new Map();
for (let i = 0; i < world.units.length; i++) { if (!stage.present[i]) continue; const w = world.units[i]; for (let k = 0; k < w.count; k++) { const s = D.clipAt(i, k, tSec); n++; acc += s.a; const id = D.lib.order[s.a]; clips.set(id, (clips.get(id) || 0) + 1); } }
const ms = performance.now() - t0; console.log('eval', n, 'figures', ms | 0, 'ms', (ms * 1000 / n).toFixed(2), 'us/fig', 'units built', D.built);
console.log([...clips].sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x.join(':')).join(' '));
// purity: reverse order and again
let acc2 = 0; for (let i = world.units.length - 1; i >= 0; i--) { if (!stage.present[i]) continue; const w = world.units[i]; for (let k = w.count - 1; k >= 0; k--) acc2 += D.clipAt(i, k, tSec).a; } console.log('pure', acc === acc2);
