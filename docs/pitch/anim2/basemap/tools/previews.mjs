// tools/previews.mjs - the preview PNGs: three hotspots (The Angle, the Wheatfield / Rose Woods, Cemetery Hill) at camera zoom 13.5, 15 and 16.5, 1440x900, in real Chrome.
// node tools/previews.mjs [--looks=dim,natural,slate,paper] [--out=previews] [--zooms=13.5,15,16.5] [--spots=angle,wheatfield,cemhill] [--dpr=1]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shoot, SPOTS } from './shoot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const looks = arg('looks', 'dim,natural,slate,paper').split(',');
const zooms = arg('zooms', '13.5,15,16.5').split(',').map(Number);
const spots = arg('spots', 'angle,wheatfield,cemhill').split(',');
const dpr = +arg('dpr', 1);
const out = path.resolve(HERE, '..', arg('out', 'previews'));
const shots = [];
for (const look of looks) for (const sp of spots) for (const z of zooms) {
  shots.push({ name: `${sp}-z${z}-${look}${dpr > 1 ? '@' + dpr + 'x' : ''}`, lng: SPOTS[sp][0], lat: SPOTS[sp][1], z, look, dpr, w: 1440, h: 900 });
}
await shoot(shots, { outDir: out });
