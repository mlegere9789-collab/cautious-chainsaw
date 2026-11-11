import fs from 'node:fs';
import { ClipLibrary } from '../src/anim3d/library.mjs';
const sk = JSON.parse(fs.readFileSync('data/figures3d/skeleton.json', 'utf8'));
let t0 = performance.now(); const lib = new ClipLibrary(sk); console.log('lib ms', (performance.now() - t0) | 0, 'clips', lib.order.length);
let human = 0, horse = 0, gun = 0, fh = 0, fo = 0; const fam = {};
for (const id of lib.order) { const d = lib.def(id); const fps = 30; const n = d.loop ? Math.max(1, Math.round(d.dur * fps)) : Math.round(d.dur * fps) + 1; const r = d.rig || 'human'; if (r === 'human') { human += n; } else if (r === 'horse') horse += n; else gun += n; fam[d.family] = (fam[d.family] || 0) + 1; }
console.log('frames@30 human', human, 'horse', horse, 'gun', gun, 'MB f32 human mid', (human * 108 * 16 / 1e6).toFixed(1), 'f16', (human * 108 * 8 / 1e6).toFixed(1));
const base = lib.order.filter(id => !lib.variantsOf || true).length; console.log(JSON.stringify(fam));
t0 = performance.now(); let k = 0; for (const id of lib.order.slice(0, 40)) { lib.get(id); k++; } console.log('bake 40 clips ms', (performance.now() - t0) | 0);
t0 = performance.now(); lib.bakeAll(); console.log('bakeAll ms', (performance.now() - t0) | 0);
console.log('mid bones', lib.rig.lod.mid.bones.length, 'horse bones', lib.horseRig.n, 'horse clips', lib.order.filter(i => lib.def(i).rig === 'horse').join(','));
