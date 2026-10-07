// verify/verify-render.mjs - step 1 of the end-to-end georeferencing check: render every site of sites.json through the real loader in real Chrome (raw look: no grade, no shade, no vectors),
// at camera zooms 13.5, 15 and 16.5, 384x384 CSS px at DPR 1 and 2x1 (DPR 2 is rendered at 192x192 CSS px so the ground window is the same size), centred on the site.
// Output: tmp/look-dev/basemap/verify/<site>_z<zoom>_dpr<dpr>.png ; verify-georef.py then fetches the same windows from the NAIP service and measures the shift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shoot } from '../tools/shoot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const sites = JSON.parse(fs.readFileSync(path.join(HERE, 'sites.json'), 'utf8')).sites;
const out = path.join(REPO, 'tmp', 'look-dev', 'basemap', 'verify');
const q = { places: 0, roads: 0, contours: 0, labels: 0, vignette: 0, fade: 0 };
const shots = [];
for (const s of sites) {
  for (const z of [13.5, 15, 16.5]) {
    shots.push({ name: `${s.id}_z${z}_dpr1`, lng: s.lng, lat: s.lat, z, look: 'raw', w: 384, h: 384, dpr: 1, q });
    shots.push({ name: `${s.id}_z${z}_dpr2`, lng: s.lng, lat: s.lat, z, look: 'raw', w: 192, h: 192, dpr: 2, q });
  }
}
await shoot(shots, { outDir: out });
