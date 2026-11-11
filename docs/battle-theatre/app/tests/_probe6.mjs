import fs from 'node:fs';
import { ClipLibrary } from '../src/anim3d/library.mjs';
import { CORE } from '../src/crowd/clips.mjs';
const lib = new ClipLibrary(JSON.parse(fs.readFileSync('data/figures3d/skeleton.json', 'utf8')));
let tot = 0; const rows = [];
for (const id of CORE) { if (!lib.has(id)) { console.log('missing', id); continue; } const d = lib.def(id); const n = d.loop ? Math.round(d.dur * 30) : Math.round(d.dur * 30) + 1; if ((d.rig || 'human') === 'human') tot += n; rows.push([id, d.dur.toFixed(2), n, d.loop ? 'L' : '', d.rig || 'human']); }
console.log('human frames @30', tot); console.log(rows.sort((a, b) => b[2] - a[2]).slice(0, 14).map(r => r.join(' ')).join('\n'));
