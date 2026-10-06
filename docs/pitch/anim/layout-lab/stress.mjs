// layout-lab/stress.mjs - E6: failure / stress cases outside the 1,804 keyframes: real units, invented anchors (identical coordinates, lines, grids, gaussian piles)
//   node docs/pitch/anim/layout-lab/stress.mjs       -> out/e6.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { solve, newState } from './lib/engine.mjs';
import { synthLeaves } from './lib/synth.mjs';
import { measure } from './lib/metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const all = loadAll(); const rows = [];
for (const specName of ['standard']) {
  const spec = SPECS[specName];
  for (const [pattern, spread] of [['point', 0], ['twoPoints', 40], ['line', 400], ['grid', 400], ['gauss', 300], ['uniform', 800]]) for (const n of [10, 30, 100, 478]) {
    const leaves = synthLeaves(all, spec, { n, pattern, spread, seed: 7 });
    for (const mode of ['hybrid', 'displaceOnly']) {
      const cfg = { spec, z: 14, dMax: spec.dMax, aggregate: mode === 'hybrid', pinProtect: true, inertia: true, sticky: true, labels: true, static: true, seniority: 1e7 };
      const r = solve(all, leaves, cfg, newState()); const m = measure(r, leaves, 14, spec);
      rows.push({ pattern, spread, n: leaves.length, mode, tiles: m.tiles, aggTiles: m.aggTiles, unitsInAggs: m.unitsInAggs, maxAggN: m.maxAggN, hiddenUnits: m.dropped, overlaps: m.overlaps, unrepresented: m.unrepresented, displacedTiles: m.displacedTiles, maxDispPx: m.maxDispPx, rounds: m.rounds, ms: m.ms, certRounds: r.stats.certRounds });
    }
  }
}
fs.writeFileSync(path.join(HERE, 'out', 'e6.json'), JSON.stringify({ generated: new Date().toISOString(), rows }, null, 1));
for (const r of rows) console.log(`${r.pattern.padEnd(9)} spread ${String(r.spread).padStart(4)} n ${String(r.n).padStart(3)} ${r.mode.padEnd(12)} tiles ${String(r.tiles).padStart(3)} agg ${String(r.aggTiles).padStart(3)} (${String(r.unitsInAggs).padStart(3)}u, max ${r.maxAggN}) hidden ${String(r.hiddenUnits).padStart(3)} ov ${r.overlaps} unrep ${r.unrepresented} maxD ${r.maxDispPx.toFixed(0)} rounds ${r.rounds} cert ${r.certRounds} ${r.ms.toFixed(0)} ms`);
