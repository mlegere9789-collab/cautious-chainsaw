// headless.mjs - build the engine core in node on the REAL data of a tree (release/R1c/dist by default: the data files as the app loads them, merged as its store merges them, turned into the engine's dataset
// by the same host/dataset.mjs the browser runs) and step it.  Node and the browser run the identical core.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createCore } from '../src/engine/core.mjs';
import { STANDARDS } from '../src/engine/skins/standards.mjs';
import { MINIMAL } from '../src/engine/skins/minimal.mjs';
import { buildDataset } from '../src/host/dataset.mjs';
import { loadData } from './data-load.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..', '..');
export const tokens = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'tokens', 'anim.tokens.json'), 'utf8'));
export const textTable = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'text-widths.json'), 'utf8'));
let cache = null;
export function dataset(dist = path.join(REPO, 'release', 'R1c', 'dist')) { if (!cache || cache.dist !== dist) { const d = loadData(dist); cache = { dist, d, ds: buildDataset(d.oob, d.pbt) }; } return cache; }
export function make(settings = {}, o = {}) { const { ds } = dataset(o.dist); return createCore({ dataset: ds, tokens, textTable, skins: [...STANDARDS, MINIMAL], settings: { 'skin.id': 'standards', ...settings }, autoQuality: !!o.autoQuality }); }
/** the opening camera of the app (-77.235, 39.812, zoom 13.5) or a given one, on a 1440 x 800 map */
export const camera = (z = 13.5, lat = 39.812, lng = -77.235, w = 1440, h = 800) => ({ lng, lat, zoom: z, w, h });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const zoom = +(process.argv[2] || 13.5); const tick0 = +(process.argv[3] || 295); const speed = +(process.argv[4] || 4); const sec = +(process.argv[5] || 10);
  const E = make(); const cam = camera(zoom); let tau = tick0; const dt = 1000 / 60; const t0 = performance.now();
  for (let i = 0; i < sec * 60; i++) { tau += speed * 2 * dt / 1000; E.step({ dtMs: dt, tau, cam }); }
  console.log('wall ms', (performance.now() - t0).toFixed(0), JSON.stringify(E.metrics.summary(), null, 1));
}
