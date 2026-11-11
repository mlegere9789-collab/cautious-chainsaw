import { nodeWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { createFigureSystem } from '../src/figures3d/index.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T);
let t0 = performance.now();
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }); const world = worldFromUnits(T, geo, L);
console.log('layer+world ms', (performance.now() - t0) | 0, 'figures', world.count, 'units', world.units.length);
t0 = performance.now(); const sys = createFigureSystem(); console.log('sys ms', (performance.now() - t0) | 0);
t0 = performance.now(); let n = 0, nul = 0, disp = 0;
for (const u of L.units) { if (!u.drawn) continue; const e = L.enterOf ? L.enterOf(u.id) : null; for (let k = 0; k < u.strength.drawn; k++) { n++; try { const r = sys.instanceFromHistory(L.figures, u.id, k, null, undefined, null); if (!r) nul++; } catch (e) { disp++; } } }
console.log('instances', n, 'null', nul, 'disputed throw', disp, 'ms', (performance.now() - t0) | 0, 'variants', sys.table.list.length, JSON.stringify({ s: sys.classes().silhouettes.length, a: sys.classes().accessories.length, i: sys.classes().impostors.length }));
