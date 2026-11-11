import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { createFigureSystem } from '../src/figures3d/index.mjs';
const raw = loadRawFromDisk(), TM = terrainMeta();
const L = createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }); const sys = createFigureSystem();
// one sample per 40th figure to get classes cheaply
let n = 0; for (const u of L.units) { if (!u.drawn) continue; for (let k = 0; k < u.strength.drawn; k += 25) { try { sys.instanceFromHistory(L.figures, u.id, k, null, undefined, null); n++; } catch {} } }
const C = sys.classes(); console.log('sample', n, 'classes', C.silhouettes.length, C.accessories.length, C.impostors.length);
let t0 = performance.now(); let tri1 = 0, v1 = 0; for (const s of C.silhouettes) { const m = sys.midMesh(s.key); tri1 += m.nt; v1 += m.nv; } console.log('mid composes ms', (performance.now() - t0) | 0, 'tris', tri1, 'verts', v1);
t0 = performance.now(); let tri2 = 0, v2 = 0; for (const s of C.silhouettes) { const m = sys.lowMesh(s.key); tri2 += m.nt; v2 += m.nv; } console.log('low composes ms', (performance.now() - t0) | 0, 'tris', tri2, 'verts', v2);
t0 = performance.now(); for (const s of C.accessories) { sys.accessoryMesh(s.key, s.key.split('|')[1], 1); } console.log('acc ms', (performance.now() - t0) | 0);
t0 = performance.now(); let k = 0; for (const s of C.impostors.slice(0, 8)) { const a = sys.impostor(s.key); k++; if (k === 1) console.log(Object.keys(a), a.W, a.H); } console.log('8 impostors ms', (performance.now() - t0) | 0);
t0 = performance.now(); const hp = sys.horse(1), hl = sys.horse(2); console.log('horse', hp.nt, hl.nt, (performance.now() - t0) | 0);
