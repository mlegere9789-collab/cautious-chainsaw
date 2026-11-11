import { nodeWorld } from './node-world.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { createFigureSystem } from '../src/figures3d/index.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta();
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }); const sys = createFigureSystem();
const units = L.units.filter(u => u.drawn).slice(0, 60); let n = 0, tm = 0, ti = 0;
for (const u of units) for (let k = 0; k < u.strength.drawn; k++) { let t0 = performance.now(); let m; try { m = L.figures.manifest(u.id, k, null, undefined); } catch (e) { continue; } tm += performance.now() - t0; if (!m) continue; if (m.disputed) continue; t0 = performance.now(); sys.instance(m); ti += performance.now() - t0; n++; }
console.log(n, 'manifest ms/fig', (tm / n).toFixed(4), 'instance ms/fig', (ti / n).toFixed(4));
