// tools/probes/engine-ms.mjs - mean engine milliseconds per frame (layout solve + display layer + metrics; no drawing) for this fork and, with --compare, for the prototype's War Room, same scenes, same node process, 600 frames of playback at 4x each.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { makeEngine as mineMake, loadDocs as mineDocs, PROTO } from '../../src/headless.mjs';
import { SKINS as MINE } from '../../src/skins/index.mjs';
const args = new Set(process.argv.slice(2)); const ROWS = [];
async function run(label, make, docs, SK, skin, scene, tick, zoom) {
  const { dataset } = docs(); const sc = dataset.scenes.find((x) => x.id === scene); const e = make({ start: { tick, lat: sc.lat, lng: sc.lng, zoom }, settings: { 'camera.zoom': zoom, 'popup.enabled': false } }); e.setViewport(1440, 900);
  for (const s of SK) e.kernel.skins.register(s.id, s, { replace: true }); e.tuning.set('skin.id', skin); e.transport.setSpeed(4); e.transport.play();
  for (let i = 0; i < 120; i++) e.step(1000 / 60); let t = 0; let solve = 0; let n = 0; let tiles = 0;
  for (let i = 0; i < 600; i++) { const t0 = performance.now(); const f = e.step(1000 / 60); t += performance.now() - t0; solve += f.solverMs || 0; tiles += f.tiles.length; n++; }
  ROWS.push({ label, scene, tick, zoom, engineMs: +(t / n).toFixed(2), solveMs: +(solve / n).toFixed(2), tiles: Math.round(tiles / n) });
  console.log(label.padEnd(34), scene, 'z' + zoom, 'engine ms/frame', (t / n).toFixed(2), '| of which solve', (solve / n).toFixed(2), '| tiles', Math.round(tiles / n), '| solveEvery', e.autoEvery());
}
const SC = [['fresh2', 548, 14], ['fresh2', 556, 15], ['field', 620, 13.5], ['carry1', 295, 14]];
for (const [s, t, z] of SC) await run('Quiet Cartographer', mineMake, mineDocs, MINE, 'quiet-cartographer', s, t, z);
if (args.has('--compare')) {
  const mod = (p) => import(pathToFileURL(path.join(PROTO, '..', '..', 'anim', 'prototype', p)).href); const H = await mod('src/headless.mjs'); const K = await mod('src/skins/index.mjs');
  for (const [s, t, z] of SC) await run('prototype War Room', H.makeEngine, H.loadDocs, K.SKINS, 'war-room', s, t, z);
}
import fs from 'node:fs';
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..', 'results', 'engine-ms.json'); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), node: process.version, rows: ROWS }, null, 1)); console.log('->', OUT);
